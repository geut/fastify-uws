/**
 * @typedef {{
*  connectionTimeout?: number
*  https?: { key: string, cert: string } | Parameters<typeof uws.SSLApp>[0]
* }} ServerOptions
*/

import EventEmitter from 'events'
import { writeFileSync } from 'fs'
import assert from 'assert'

import uws from 'uWebSockets.js'
import ipaddr from 'ipaddr.js'
import tempy from 'tempy'

import { ERR_ADDRINUSE, ERR_UWS_APP_NOT_FOUND, ERR_ENOTFOUND, ERR_SOCKET_BAD_PORT } from './errors.js'
import { HTTPSocket } from './http-socket.js'
import { Request } from './request.js'
import { Response } from './response.js'
import {
  kHttps,
  kHandler,
  kAddress,
  kListenSocket,
  kListen,
  kApp,
  kClosed,
  kWs
} from './symbols.js'

function createApp (https) {
  if (!https) return uws.App()
  if (!https.key) return uws.SSLApp(https)
  const keyFile = tempy.file()
  writeFileSync(keyFile, https.key)
  const certFile = tempy.file()
  writeFileSync(certFile, https.cert)
  return uws.SSLApp({
    key_file_name: keyFile,
    cert_file_name: certFile,
    passphrase: https.passphrase
  })
}

const mainServer = {}

export class Server extends EventEmitter {
  /**
   * @param {(req: Request, res: Response) => void} handler
   * @param {ServerOptions} opts
   */
  constructor (handler, opts = {}) {
    super()

    const { connectionTimeout = 0, https = false } = opts

    assert(!https || typeof https === 'object', 'https must be a valid object { key: string, cert: string } or follow the uws.AppOptions')

    this[kHandler] = handler
    this.timeout = connectionTimeout
    this[kHttps] = https
    /** @type {import('./websocket-server.js').WebSocketServer} */
    this[kWs] = null
    this[kAddress] = null
    this[kListenSocket] = null
    this[kApp] = createApp(this[kHttps])
    this[kClosed] = false
  }

  /** @type {boolean} */
  get encrypted () {
    return !!this[kHttps]
  }

  /**
   * @param {number} timeout
   */
  setTimeout (timeout) {
    this.timeout = timeout
  }

  /**
   * @returns {{ address: string, port: number }}
   */
  address () {
    return this[kAddress]
  }

  /**
   *
   * @param {{ host: string, port: number }} listenOptions
   * @param {() => void} cb
   */
  listen (listenOptions, cb) {
    this[kListen](listenOptions)
      .then(() => cb && cb())
      .catch(err => {
        this[kAddress] = null
        process.nextTick(() => this.emit('error', err))
      })
  }

  /**
   * @param {() => void} [cb]
   */
  close (cb = () => {}) {
    if (this[kClosed]) return cb()
    const port = this[kAddress]?.port
    if (port !== undefined && mainServer[port] === this) {
      delete mainServer[port]
    }
    this[kAddress] = null
    this[kClosed] = true
    if (this[kListenSocket]) {
      uws.us_listen_socket_close(this[kListenSocket])
      this[kListenSocket] = null
    }
    if (this[kWs]) {
      this[kWs].connections.forEach(conn => conn.close())
    }
    setTimeout(() => {
      this.emit('close')
      cb()
    }, 1)
  }

  ref () {}
  unref () {}

  async [kListen] ({ port, host }) {
    if (port !== undefined && port !== null && Number.isNaN(Number(port))) {
      throw new ERR_SOCKET_BAD_PORT(port)
    }

    port = (port === undefined || port === null) ? 0 : Number(port)

    this[kAddress] = {
      address: host === 'localhost' ? '::1' : host,
      port
    }

    if (this[kAddress].address.startsWith('[')) throw new ERR_ENOTFOUND(this[kAddress].address)

    const parsedAddress = ipaddr.parse(this[kAddress].address)
    this[kAddress].family = parsedAddress.kind() === 'ipv6' ? 'IPv6' : 'IPv4'
    const longAddress = parsedAddress.toNormalizedString()

    const app = this[kApp]

    const onRequest = method => (res, req) => {
      const socket = new HTTPSocket(this, res, method === 'GET' || method === 'HEAD')
      const request = new Request(req, socket, method)
      const response = new Response(socket)
      if (request.headers.upgrade) {
        this.emit('upgrade', request, socket)
      }
      this[kHandler](request, response)
    }

    app
      .connect('/*', onRequest('CONNECT'))
      .del('/*', onRequest('DELETE'))
      .get('/*', onRequest('GET'))
      .head('/*', onRequest('HEAD'))
      .options('/*', onRequest('OPTIONS'))
      .patch('/*', onRequest('PATCH'))
      .post('/*', onRequest('POST'))
      .put('/*', onRequest('PUT'))
      .trace('/*', onRequest('TRACE'))

    if (port !== 0 && mainServer[port]) {
      this[kWs] = mainServer[port][kWs]
    }

    if (this[kWs]) {
      this[kWs].addServer(this)
    }

    return new Promise((resolve, reject) => {
      app.listen(longAddress, port, (listenSocket) => {
        if (!listenSocket) return reject(new ERR_ADDRINUSE(this[kAddress].address, port))
        this[kListenSocket] = listenSocket
        port = this[kAddress].port = uws.us_socket_local_port(listenSocket)
        if (!mainServer[port]) {
          mainServer[port] = this
        }
        resolve()
      })
    })
  }
}

/**
 *
 * @param {(req: Request, res: Response) => void} handler
 * @param {ServerOptions} opts
 * @returns
 */
export const serverFactory = (handler, opts) => new Server(handler, opts)

/**
 *
 * @param {import('fastify').FastifyInstance} fastify
 * @returns {uws.TemplatedApp}
 */
export const getUws = (fastify) => {
  const { server } = fastify
  if (!server[kApp]) throw new ERR_UWS_APP_NOT_FOUND()
  return server[kApp]
}

export { WebSocketStream } from './websocket-server.js'

export {
  DEDICATED_COMPRESSOR_128KB,
  DEDICATED_COMPRESSOR_16KB,
  DEDICATED_COMPRESSOR_256KB,
  DEDICATED_COMPRESSOR_32KB,
  DEDICATED_COMPRESSOR_3KB,
  DEDICATED_COMPRESSOR_4KB,
  DEDICATED_COMPRESSOR_64KB,
  DEDICATED_COMPRESSOR_8KB,
  DEDICATED_DECOMPRESSOR,
  DEDICATED_DECOMPRESSOR_16KB,
  DEDICATED_DECOMPRESSOR_1KB,
  DEDICATED_DECOMPRESSOR_2KB,
  DEDICATED_DECOMPRESSOR_32KB,
  DEDICATED_DECOMPRESSOR_4KB,
  DEDICATED_DECOMPRESSOR_512B,
  DEDICATED_DECOMPRESSOR_8KB,
  DISABLED,
  SHARED_COMPRESSOR,
  SHARED_DECOMPRESSOR
} from 'uWebSockets.js'
