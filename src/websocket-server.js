/**
 * @template T
 * @typedef {import('uWebSockets.js').WebSocket<T>} UWebSocket
 */

/**
 * @typedef {import('uWebSockets.js').TemplatedApp} TemplatedApp
 */

/**
 * @typedef {import('uWebSockets.js').RecognizedString} RecognizedString
 */

/**
 * @typedef {{ req: Request, handler: (ws: UWebSocket<UserData>) => void }} UserData
 */

/**
 * @typedef {UWebSocket<UserData> & { req: Request, websocket: WebSocket }} UWSocket
 */

/**
 * @typedef {{
 *   closeOnBackpressureLimit?: boolean;
 *   compression?: number;
 *   idleTimeout?: number;
 *   maxBackpressure?: number;
 *   maxLifetime?: number;
 *   maxPayloadLength?: number;
 *   sendPingsAutomatically?: boolean;
 * }} WSOptions
 */

/**
 * @typedef {{
 *  close: (code: number, message: ArrayBuffer) => void
 *  drain: () => void
 *  message: (message: ArrayBuffer, isBinary: boolean) => void
 *  ping: (message: ArrayBuffer) => void
 *  pong: (message: ArrayBuffer) => void
 * }} WebsocketEvent
 */

/**
 * @typedef {{
 *  open: (ws: UWSocket) => void
 *  close: (ws: UWSocket,code: number, message: ArrayBuffer) => void
 *  drain: (ws: UWSocket) => void
 *  message: (ws: UWSocket, message: ArrayBuffer, isBinary: boolean) => void
 *  ping: (ws: UWSocket, message: ArrayBuffer) => void
 *  pong: (ws: UWSocket, message: ArrayBuffer) => void
 * }} WebsocketServerEvent
 */

import { EventEmitter } from 'eventemitter3'
import { Duplex } from 'streamx'
import uws from 'uWebSockets.js'

import { HTTPSocket } from './http-socket.js'
import { Request } from './request.js'
import { Response } from './response.js'
import { kApp, kEnded, kHandler, kTopic, kWs } from './symbols.js'

const defaultWebSocketConfig = {
  compression: uws.SHARED_COMPRESSOR,
  maxPayloadLength: 16 * 1024 * 1024,
  idleTimeout: 16,
}

const SEP = '!'
const SEP_BUFFER = Buffer.from(SEP)

/**
 * @extends {EventEmitter<keyof WebsocketEvent, WebsocketEvent[keyof WebsocketEvent]>}
 */
export class WebSocket extends EventEmitter {
  /**
   * @param {Buffer} namespace
   * @param {Buffer | string} topic
   * @returns {Buffer}
   */
  static allocTopic(namespace, topic) {
    if (topic[kTopic]) return /** @type {Buffer} */ (topic)

    const buf = Buffer.concat([
      namespace,
      SEP_BUFFER,
      Buffer.isBuffer(topic) ? topic : Buffer.from(topic),
    ])

    buf[kTopic] = true
    return buf
  }

  constructor(namespace, connection, topics = {}) {
    super()

    /** @type {Buffer} */
    this.namespace = namespace
    /** @type {UWebSocket<any>} */
    this.connection = connection
    connection.websocket = this
    this.topics = topics // we maintain a cache of buffer topics
    this[kEnded] = false
  }

  get uws() {
    return true
  }

  /**
   * @param {Buffer | string} topic
   * @returns {Buffer}
   */
  allocTopic(topic) {
    if (this.topics[topic]) return this.topics[topic]
    return WebSocket.allocTopic(this.namespace, topic)
  }

  /**
   * @param {RecognizedString} message
   * @param {boolean} [isBinary]
   * @param {boolean} [compress]
   */
  send(message, isBinary, compress) {
    if (this[kEnded]) return
    return this.connection.send(message, isBinary, compress)
  }

  /**
   * @param {Buffer | string} topic
   * @param {RecognizedString} message
   * @param {boolean} [isBinary]
   * @param {boolean} [compress]
   */
  publish(topic, message, isBinary, compress) {
    if (this[kEnded]) return
    return this.connection.publish(
      this.allocTopic(topic),
      message,
      isBinary,
      compress
    )
  }

  /**
   * @param {Buffer | string} topic
   */
  subscribe(topic) {
    if (this[kEnded]) return
    return this.connection.subscribe(this.allocTopic(topic))
  }

  /**
   * @param {Buffer | string} topic
   */
  unsubscribe(topic) {
    if (this[kEnded]) return
    return this.connection.unsubscribe(this.allocTopic(topic))
  }

  /**
   * @param {Buffer | string} topic
   */
  isSubscribed(topic) {
    if (this[kEnded]) return false
    return this.connection.isSubscribed(this.allocTopic(topic))
  }

  getTopics() {
    if (this[kEnded]) return []
    return this.connection
      .getTopics()
      .map(topic => topic.slice(topic.indexOf(SEP) + 1))
  }

  close() {
    if (this[kEnded]) return
    this[kEnded] = true
    return this.connection.close()
  }

  /**
   * @param {number} [code]
   * @param {RecognizedString} [shortMessage]
   */
  end(code, shortMessage) {
    if (this[kEnded]) return
    this[kEnded] = true
    return this.connection.end(code, shortMessage)
  }

  /**
   * @param {() => void} cb
   */
  cork(cb) {
    if (this[kEnded]) return
    return this.connection.cork(cb)
  }

  getBufferedAmount() {
    if (this[kEnded]) return 0
    return this.connection.getBufferedAmount()
  }

  /**
   * @param {RecognizedString} message
   */
  ping(message) {
    if (this[kEnded]) return
    return this.connection.ping(message)
  }
}

export class WebSocketStream extends Duplex {
  /**
   *
   * @param {WebSocket} socket
   * @param {{
   *  compress?: boolean | false
   *  highWaterMark?: number | 16384
   *  mapReadable?: (packet: { data: any, isBinary: boolean }) => any // optional function to map input data
   *  byteLengthReadable?: (packet: { data: any, isBinary: boolean }) => number | 1024 // optional function that calculates the byte size of input data,
   *  mapWritable?: (data: any) => { data: any, isBinary: boolean, compress: boolean } // optional function to map input data
   *  byteLengthWritable?: (packet: { data: any, isBinary: boolean, compress: boolean }) => number | 1024 // optional function that calculates the byte size of input data
   * }} opts
   */
  constructor(socket, opts = {}) {
    const { compress = false } = opts

    super({
      highWaterMark: opts.highWaterMark,
      mapReadable: (packet) => {
        if (opts.mapReadable) return opts.mapReadable(packet)
        return packet.data
      },
      byteLengthReadable: (packet) => {
        if (opts.byteLengthReadable) return opts.byteLengthReadable(packet)
        return packet.isBinary ? packet.data.byteLength : 1024
      },
      mapWritable: (data) => {
        if (opts.mapWritable) return opts.mapWritable(data)
        return { data, isBinary: Buffer.isBuffer(data), compress }
      },
      byteLengthWritable: (packet) => {
        if (opts.byteLengthWritable) return opts.byteLengthWritable(packet)
        return packet.isBinary ? packet.data.byteLength : 1024
      },
    })

    /** @type {WebSocket} */
    this.socket = socket
    this._onMessage = this._onMessage.bind(this)
  }

  _open(cb) {
    this.socket.on('message', this._onMessage)
    cb()
  }

  _close(cb) {
    this.socket.off('message', this._onMessage)
    this.socket.close()
    cb()
  }

  _onMessage(data, isBinary) {
    this.push({ data, isBinary })
  }

  _write(packet, cb) {
    this.socket.send(packet.data, packet.isBinary, packet.compress)
    cb()
  }
}

/**
 * @extends {EventEmitter<keyof WebsocketServerEvent, WebsocketServerEvent[keyof WebsocketServerEvent]>}
 */
export class WebSocketServer extends EventEmitter {
  /**
   * @param {WSOptions} options
   */
  constructor(options = {}) {
    super()
    this.options = { ...options, ...defaultWebSocketConfig }
    this.connections = new Set()
  }

  /**
   * @param {import('./server.js').Server} server
   */
  addServer(server) {
    const { options } = this
    /** @type {TemplatedApp} */
    const app = server[kApp]
    const listenerHandler = server[kHandler]

    app.ws('/*', {
      upgrade: async (res, req, context) => {
        const method = req.getMethod().toUpperCase()
        const socket = new HTTPSocket(
          server,
          res,
          method === 'GET' || method === 'HEAD'
        )
        const request = new Request(req, socket, method)
        const response = new Response(socket)
        request[kWs] = context
        server.emit('upgrade', request, socket)
        listenerHandler(request, response)
      },
      /**
       * @param {UWSocket} ws
       */
      open: (ws) => {
        this.connections.add(ws)
        // @ts-ignore
        ws.handler(ws)
        this.emit('open', ws)
      },
      /**
       *
       * @param {UWSocket} ws
       * @param {number} code
       * @param {ArrayBuffer} message
       */
      close: (ws, code, message) => {
        this.connections.delete(ws)
        ws.websocket[kEnded] = true
        ws.req.socket.destroy()
        ws.websocket.emit('close', code, message)
        this.emit('close', ws, code, message)
      },
      /**
       * @param {UWSocket} ws
       */
      drain: (ws) => {
        ws.websocket.emit('drain')
        this.emit('drain', ws)
      },
      /**
       * @param {UWSocket} ws
       * @param {ArrayBuffer} message
       * @param {boolean} isBinary
       */
      message: (ws, message, isBinary) => {
        ws.websocket.emit('message', message, isBinary)
        this.emit('message', ws, message, isBinary)
      },
      /**
       * @param {UWSocket} ws
       * @param {ArrayBuffer} message
       */
      ping: (ws, message) => {
        ws.websocket.emit('ping', message)
        this.emit('ping', ws, message)
      },
      /**
       * @param {UWSocket} ws
       * @param {ArrayBuffer} message
       */
      pong: (ws, message) => {
        ws.websocket.emit('pong', message)
        this.emit('pong', ws, message)
      },
      ...options,
    })
  }
}
