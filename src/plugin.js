/**
 * @template T
  @typedef {import('fastify').FastifyPluginCallback<T>} FastifyPluginCallback */

/** @typedef {import('./websocket-server.js').WSOptions} WSOptions */

/** @typedef {import('./request.js').Request} Request */

import fp from 'fastify-plugin'

import { kRes, kWs } from './symbols.js'
import { WebSocket, WebSocketServer } from './websocket-server.js'

/**
 * @this {import('fastify').FastifyInstance}
 * @param {Error} err
 * @param {WebSocket} conn
 * @param {import('fastify').FastifyRequest} request
 */
function defaultErrorHandler(err, conn, request) {
  request.log.error(err)
  request.raw.destroy(err)
}

/** @type {FastifyPluginCallback<{ errorHandler?: typeof defaultErrorHandler } & WSOptions>} */
function fastifyUws(fastify, opts, next) {
  const { server } = fastify
  const { errorHandler = defaultErrorHandler, ...options } = opts || {}

  if (errorHandler && typeof errorHandler !== 'function') {
    return next(new Error('invalid errorHandler function'))
  }

  const websocketServer = new WebSocketServer(options)
  server[kWs] = websocketServer

  fastify.decorate('websocketServer', websocketServer)

  fastify.addHook('onRoute', (routeOptions) => {
    const isWebSocket = !!routeOptions.uws || routeOptions.uwsHandler
    if (!isWebSocket || routeOptions.method !== 'GET') return

    const wsOptions =
      typeof routeOptions.uws === 'object' ? routeOptions.uws : {}

    let httpHandler
    let uwsHandler
    if (routeOptions.uwsHandler) {
      httpHandler = routeOptions.handler
      uwsHandler = routeOptions.uwsHandler
    } else {
      uwsHandler = routeOptions.handler
    }

    const namespace = Buffer.from(routeOptions.url)

    const topics = {}
    if (wsOptions.topics) {
      wsOptions.topics.forEach((topic) => {
        topics[topic] = WebSocket.allocTopic(namespace, topic)
      })
    }

    routeOptions.handler = function (request, reply) {
      const requestRaw = /** @type {Request} */ (
        /** @type {unknown} */ (request.raw)
      )
      if (requestRaw[kWs]) {
        reply.hijack()
        const uRes = requestRaw.socket[kRes]
        requestRaw.socket[kWs] = true
        if (requestRaw.socket.aborted || requestRaw.socket.destroyed) return
        uRes.upgrade(
          {
            req: requestRaw,
            handler: (ws) => {
              request.uws = true

              const conn = new WebSocket(namespace, ws, topics)
              let result
              try {
                request.log.info('fastify-uws: websocket connection opened')
                conn.once('close', () => {
                  request.log.info('fastify-uws: websocket connection closed')
                })

                requestRaw.once('error', () => {
                  conn.close()
                })

                requestRaw.once('close', () => {
                  conn.end()
                })

                result = uwsHandler.call(this, conn, request)
              } catch (err) {
                return errorHandler.call(this, err, conn, request)
              }

              if (result && typeof result.catch === 'function') {
                result.catch(err =>
                  errorHandler.call(this, err, conn, request)
                )
              }
            },
          },
          requestRaw.headers['sec-websocket-key'],
          requestRaw.headers['sec-websocket-protocol'],
          requestRaw.headers['sec-websocket-extensions'],
          requestRaw[kWs]
        )
      } else {
        return httpHandler.call(this, request, reply)
      }
    }
  })

  next()
}

/** @type {typeof fastifyUws} */
export default fp(fastifyUws, {
  fastify: '>= 4.0.0',
  name: 'fastify-uws',
})
