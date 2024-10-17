/**
 * @typedef {import('uWebSockets.js').TemplatedApp} TemplatedApp
 */

/**
 * @typedef {import('uWebSockets.js').SSLApp} SSLApp
 */

/**
 * @typedef {{
 *  connectionTimeout?: number
 *  https?: { key: string, cert: string } | Parameters<SSLApp>[0]
 * }} ServerOptions
 */

import assert from 'node:assert'
import dns from 'node:dns/promises'
import { writeFileSync } from 'node:fs'
/**
 * @typedef {import('fastify').FastifyServerFactory} FastifyServerFactory
 */
import { METHODS } from 'node:http'

import { EventEmitter } from 'eventemitter3'
import ipaddr from 'ipaddr.js'
import { temporaryFile } from 'tempy'
import uws from 'uWebSockets.js'

import {
  ERR_ADDRINUSE,
  ERR_ENOTFOUND,
  ERR_INVALID_METHOD,
  ERR_SERVER_DESTROYED,
  ERR_SOCKET_BAD_PORT,
  ERR_UWS_APP_NOT_FOUND,
} from './errors.js'
import { HTTPSocket } from './http-socket.js'
import { Request } from './request.js'
import { Response } from './response.js'
import {
  kAddress,
  kApp,
  kClientError,
  kClosed,
  kHandler,
  kHttps,
  kListen,
  kListenAll,
  kListening,
  kListenSocket,
  kWs,
} from './symbols.js'

const noop = () => {}

function createApp(https) {
  if (!https) return uws.App()
  if (!https.key) return uws.SSLApp(https)
  const keyFile = temporaryFile()
  writeFileSync(keyFile, https.key)
  const certFile = temporaryFile()
  writeFileSync(certFile, https.cert)
  return uws.SSLApp({
    key_file_name: keyFile,
    cert_file_name: certFile,
    passphrase: https.passphrase,
  })
}

const VALID_METHODS = new Map(METHODS.map(method => [method.toLowerCase(), method]))

const mainServer = {}

export class Server extends EventEmitter {
  /**
   * @param {(req: Request, res: Response) => void} handler
   * @param {ServerOptions} opts
   */
  constructor(handler, opts = {}) {
    super()

    const { connectionTimeout = 0, https = false } = opts

    assert(
      !https || typeof https === 'object',
      'https must be a valid object { key: string, cert: string } or follow the uws.AppOptions'
    )

    this[kHandler] = handler
    this.timeout = connectionTimeout
    this[kHttps] = https
    /** @type {import('./websocket-server.js').WebSocketServer} */
    this[kWs] = null
    this[kAddress] = null
    this[kListenSocket] = null
    this[kApp] = createApp(this[kHttps])
    this[kClosed] = false
    this[kListenAll] = false
    this[kListening] = false
  }

  /** @type {boolean} */
  get encrypted() {
    return !!this[kHttps]
  }

  /** @type {boolean} */
  get listening() {
    return this[kListening]
  }

  /**
   * @param {number} timeout
   */
  setTimeout(timeout) {
    this.timeout = timeout
  }

  /**
   * @returns {{ address: string, port: number }}
   */
  address() {
    return this[kAddress]
  }

  /**
   *
   * @param {{
   *   host: string
   *   port: number
   *   signal: AbortSignal
   * }} listenOptions
   */
  listen(listenOptions) {
    if (listenOptions?.signal) {
      listenOptions.signal.addEventListener('abort', () => {
        this.close()
      })
    }

    this[kListen](listenOptions)
      .then(() => {
        this[kListening] = true
        this.emit('listening')
      })
      .catch((err) => {
        this[kAddress] = null
        process.nextTick(() => this.emit('error', err))
      })
  }

  closeIdleConnections() {
    this.close()
  }

  /**
   * @param {() => void} [cb]
   */
  close(cb = noop) {
    this[kAddress] = null
    this[kListening] = false
    if (this[kClosed]) return cb()
    const port = this[kAddress]?.port
    if (port !== undefined && mainServer[port] === this) {
      delete mainServer[port]
    }
    this[kClosed] = true
    if (this[kListenSocket]) {
      uws.us_listen_socket_close(this[kListenSocket])
      this[kListenSocket] = null
    }
    if (this[kWs]) {
      this[kWs].connections.forEach(conn => conn.close())
    }
    process.nextTick(() => {
      this.emit('close')
      cb()
    })
  }

  ref = noop
  unref = noop

  async [kListen]({ port, host }) {
    if (this[kClosed]) throw new ERR_SERVER_DESTROYED()

    if (port !== undefined && port !== null && Number.isNaN(Number(port))) {
      throw new ERR_SOCKET_BAD_PORT(port)
    }

    port = port === undefined || port === null ? 0 : Number(port)

    const lookupAddress = await dns.lookup(host)

    this[kAddress] = {
      ...lookupAddress,
      port,
    }

    if (this[kAddress].family === 4) {
      this[kAddress].family = 'IPv4'
    }

    if (this[kAddress].family === 6) {
      this[kAddress].family = 'IPv6'
    }

    if (this[kAddress].address.startsWith('[')) {
      throw new ERR_ENOTFOUND(this[kAddress].address)
    }
    if (mainServer[port] && host !== 'localhost' && mainServer[port][kListenAll]) return

    const parsedAddress = ipaddr.parse(this[kAddress].address)
    const longAddress = parsedAddress.toNormalizedString()

    const app = this[kApp]

    const onRequest = (res, req) => {
      const method = VALID_METHODS.get(req.getMethod())
      const socket = new HTTPSocket(
        this,
        res,
        method === 'GET' || method === 'HEAD'
      )

      if (!method) {
        socket[kClientError] = true
        this.emit('clientError', new ERR_INVALID_METHOD(), socket)
        return
      }

      const request = new Request(req, socket, method)
      const response = new Response(socket)
      if (request.headers.upgrade) {
        if (this[kWs]) return
        this.emit('upgrade', request, socket)
        return
      }
      this[kHandler](request, response)
    }

    app.any('/*', onRequest)

    if (port !== 0 && mainServer[port]) {
      this[kWs] = mainServer[port][kWs]
    }

    if (this[kWs]) {
      this[kWs].addServer(this)
    }

    return new Promise((resolve, reject) => {
      const onListen = (listenSocket) => {
        if (!listenSocket) {
          return reject(new ERR_ADDRINUSE(this[kAddress].address, port))
        }
        this[kListenSocket] = listenSocket
        port = this[kAddress].port = uws.us_socket_local_port(listenSocket)
        if (!mainServer[port]) {
          mainServer[port] = this
        }
        resolve()
      }

      this[kListenAll] = host === 'localhost'
      if (this[kListenAll]) {
        app.listen(port, onListen)
      } else {
        app.listen(longAddress, port, onListen)
      }
    })
  }
}

/** @type {FastifyServerFactory} */
export const serverFactory = (handler, opts) => {
  // @ts-ignore

  return new Server(handler, opts)
}

/**
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @returns {TemplatedApp}
 */
export const getUws = (fastify) => {
  const { server } = fastify
  if (!server[kApp]) throw new ERR_UWS_APP_NOT_FOUND()
  return server[kApp]
}

export { WebSocketStream } from './websocket-server.js'

export {
  DEDICATED_COMPRESSOR_3KB,
  DEDICATED_COMPRESSOR_4KB,
  DEDICATED_COMPRESSOR_8KB,
  DEDICATED_COMPRESSOR_16KB,
  DEDICATED_COMPRESSOR_32KB,
  DEDICATED_COMPRESSOR_64KB,
  DEDICATED_COMPRESSOR_128KB,
  DEDICATED_COMPRESSOR_256KB,
  DEDICATED_DECOMPRESSOR,
  DEDICATED_DECOMPRESSOR_1KB,
  DEDICATED_DECOMPRESSOR_2KB,
  DEDICATED_DECOMPRESSOR_4KB,
  DEDICATED_DECOMPRESSOR_8KB,
  DEDICATED_DECOMPRESSOR_16KB,
  DEDICATED_DECOMPRESSOR_32KB,
  DEDICATED_DECOMPRESSOR_512B,
  DISABLED,
  SHARED_COMPRESSOR,
  SHARED_DECOMPRESSOR,
} from 'uWebSockets.js'
