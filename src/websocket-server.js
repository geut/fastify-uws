import EventEmitter from 'events'
import uws from 'uWebSockets.js'

import { HTTPSocket } from './http-socket.js'
import { Request } from './request.js'
import { Response } from './response.js'
import {
  kApp,
  kWs,
  kHandler,
  kTopic,
  kEnded
} from './symbols.js'

const defaultWebSocketConfig = {
  compression: uws.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 16
}

const SEP = '!'
const SEP_BUFFER = Buffer.from(SEP)

export class WebSocket extends EventEmitter {
  static allocTopic (namespace, topic) {
    if (topic[kTopic]) return topic

    const buf = Buffer.concat([
      namespace,
      SEP_BUFFER,
      Buffer.isBuffer(topic) ? topic : Buffer.from(topic)
    ])

    buf[kTopic] = true
    return buf
  }

  constructor (namespace, connection, topics = {}) {
    super()

    this.namespace = namespace
    this.connection = connection
    connection.websocket = this
    this.topics = topics // we maintain a cache of buffer topics
    this[kEnded] = false
  }

  get ws () {
    return true
  }

  allocTopic (topic) {
    if (this.topics[topic]) return this.topics[topic]
    return WebSocket.allocTopic(this.namespace, topic)
  }

  send (message, isBinary, compress) {
    if (this[kEnded]) return
    return this.connection.send(message, isBinary, compress)
  }

  publish (topic, message, isBinary, compress) {
    if (this[kEnded]) return
    return this.connection.publish(this.allocTopic(topic), message, isBinary, compress)
  }

  subscribe (topic) {
    if (this[kEnded]) return
    return this.connection.subscribe(this.allocTopic(topic))
  }

  unsubscribe (topic) {
    if (this[kEnded]) return
    return this.connection.unsubscribe(this.allocTopic(topic))
  }

  isSubscribed (topic) {
    if (this[kEnded]) return false
    return this.connection.isSubscribed(this.allocTopic(topic))
  }

  getTopics () {
    if (this[kEnded]) return []
    return this.connection.getTopics().map(topic => topic.slice(topic.indexOf(SEP) + 1))
  }

  close () {
    if (this[kEnded]) return
    this[kEnded] = true
    return this.connection.close()
  }

  end () {
    if (this[kEnded]) return
    this[kEnded] = true
    return this.connection.end()
  }

  cork (cb) {
    if (this[kEnded]) return
    return this.connection.cork(cb)
  }

  getBufferedAmount () {
    if (this[kEnded]) return 0
    return this.connection.getBufferedAmount()
  }

  ping (message) {
    if (this[kEnded]) return
    return this.connection.ping(message)
  }
}

export class WebSocketServer extends EventEmitter {
  constructor (options = {}) {
    super()
    this.options = options && (options === true ? defaultWebSocketConfig : { ...options, ...defaultWebSocketConfig })
    this.connections = new Set()
  }

  addServer (server) {
    const { options } = this
    const app = server[kApp]
    const listenerHandler = server[kHandler]

    app.ws('/*', {
      compression: options.compression,
      idleTimeout: options.idleTimeout,
      maxBackpressure: options.maxBackpressure,
      maxPayloadLength: options.maxPayloadLength,
      sendPingsAutomatically: options.sendPingsAutomatically,
      upgrade: async (res, req, context) => {
        const method = req.getMethod().toUpperCase()
        const socket = new HTTPSocket(server, res, method === 'GET' || method === 'HEAD')
        const request = new Request(req, socket, method)
        const response = new Response(socket)
        request[kWs] = context
        server.emit('upgrade', request, socket)
        listenerHandler(request, response)
      },
      open: ws => {
        this.connections.add(ws)
        ws.handler(ws)
        this.emit('open', ws)
      },
      close: (ws, code, message) => {
        this.connections.delete(ws)
        ws.websocket[kEnded] = true
        ws.req.socket.destroy()
        ws.websocket.emit('close', code, message)
        this.emit('close', ws, code, message)
      },
      drain: (ws) => {
        ws.websocket.emit('drain')
        this.emit('drain', ws)
      },
      message: (ws, message, isBinary) => {
        ws.websocket.emit('message', message, isBinary)
        this.emit('message', ws, message, isBinary)
      },
      ping: (ws, message) => {
        ws.websocket.emit('ping', message)
        this.emit('ping', ws, message)
      },
      pong: (ws, message) => {
        ws.websocket.emit('pong', message)
        this.emit('pong', ws, message)
      }
    })
  }
}
