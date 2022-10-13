// this plugin is inspired by https://github.com/fastify/fastify-websocket

import fp from 'fastify-plugin'

import { WebSocketServer, WebSocket } from './websocket-server.js'

import {
  kWs,
  kRes
} from './symbols.js'

function defaultErrorHandler (err, request) {
  request.log.error(err)
  request.raw.destroy(err)
}

function fastifyUws (fastify, opts = {}, next) {
  const { server } = fastify
  const { errorHandler = defaultErrorHandler, options } = opts

  if (errorHandler && typeof errorHandler !== 'function') {
    return next(new Error('invalid errorHandler function'))
  }

  const websocketServer = server[kWs] = new WebSocketServer(options)

  fastify.decorate('websocketServer', websocketServer)

  fastify.addHook('onRoute', routeOptions => {
    const isWebSocket = !!routeOptions.ws
    if (!isWebSocket || routeOptions.method === 'HEAD' || routeOptions.method === 'OPTIONS') return

    const wsOptions = typeof routeOptions.ws === 'object' ? routeOptions.ws : {}
    const handler = routeOptions.handler
    const namespace = Buffer.from(routeOptions.url)

    const topics = {}
    if (wsOptions.topics) {
      wsOptions.topics.forEach(topic => {
        topics[topic] = WebSocket.allocTopic(namespace, topic)
      })
    }

    routeOptions.handler = function (request, reply) {
      const requestRaw = request.raw
      if (requestRaw[kWs]) {
        reply.hijack()
        const uRes = requestRaw.socket[kRes]
        requestRaw.socket[kWs] = true
        if (requestRaw.socket.aborted || requestRaw.socket.destroyed) return
        uRes.upgrade({
          req: requestRaw,
          handler: (ws) => {
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

              result = handler.call(this, request, conn)
            } catch (err) {
              return errorHandler.call(this, err, request, conn)
            }

            if (result && typeof result.catch === 'function') {
              result.catch(err => errorHandler.call(this, err, request, conn))
            }
          }
        },
        requestRaw.headers['sec-websocket-key'],
        requestRaw.headers['sec-websocket-protocol'],
        requestRaw.headers['sec-websocket-extensions'],
        requestRaw[kWs])
      } else {
        return handler.call(this, request, reply)
      }
    }
  })

  next()
}

export default fp(fastifyUws, {
  fastify: '>= 4.0.0',
  name: '@fastify/websocket'
})
