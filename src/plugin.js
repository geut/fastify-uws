import fp from 'fastify-plugin'

import { WebSocketServer, WebSocket } from './websocket-server.js'

import {
  kWs,
  kRes
} from './symbols.js'

function fastifyUws (fastify, opts = {}, next) {
  const { server } = fastify

  const websocketServer = server[kWs] = new WebSocketServer(opts.options)

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
            handler.call(this, request, new WebSocket(namespace, ws, topics))
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
