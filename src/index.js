import EventEmitter from 'events'
import { promises as fs } from 'fs'
import assert from 'assert'

import uws from 'uWebSockets.js'
import ipaddr from 'ipaddr.js'
import tempy from 'tempy'

import { ERR_ADDRINUSE, ERR_UPGRADE } from './errors.js'
import { HTTPSocket } from './http-socket.js'
import { Request } from './request.js'
import { Response } from './response.js'
import {
  kHttps,
  kDisableRemoteAddress,
  kHandler,
  kAddress,
  kListenSocket,
  kListen,
  kApp,
  kClosed,
  kWs
} from './symbols.js'

async function createApp (https) {
  if (!https) return uws.App()
  const keyFile = tempy.file()
  await fs.writeFile(keyFile, https.key)
  const certFile = tempy.file()
  await fs.writeFile(certFile, https.cert)
  return uws.SSLApp({
    key_file_name: keyFile,
    cert_file_name: certFile,
    passphrase: https.passphrase
  })
}

const mainServer = {}
export class Server extends EventEmitter {
  constructor (handler, opts = {}) {
    super()

    const { connectionTimeout = 0, disableRemoteAddress = false, https = false } = opts

    assert(!https || (typeof https === 'object' && typeof https.key === 'string' && typeof https.cert === 'string'),
      'https must be a valid object { key: string, cert: string }')

    this[kHandler] = handler
    this.timeout = connectionTimeout
    this[kDisableRemoteAddress] = disableRemoteAddress
    this[kHttps] = https
    this[kWs] = null
    this[kAddress] = null
    this[kListenSocket] = null
    this[kApp] = null
    this[kClosed] = false
  }

  get encrypted () {
    return !!this[kHttps]
  }

  setTimeout (timeout) {
    this.timeout = timeout
  }

  address () {
    return this[kAddress]
  }

  listen (listenOptions, cb) {
    this[kListen](listenOptions)
      .then(() => cb && cb())
      .catch(err => {
        this[kAddress] = null
        process.nextTick(() => this.emit('error', err))
      })
  }

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
    setTimeout(() => {
      this.emit('close')
      cb()
    }, 1)
  }

  ref () {}

  unref () {}

  async [kListen] ({ port, host }) {
    assert(port === undefined || port === null || !Number.isNaN(Number(port)), `options.port should be >= 0 and < 65536. Received ${port}.`)

    port = (port === undefined || port === null) ? 0 : Number(port)

    this[kAddress] = {
      address: host === 'localhost' ? '127.0.0.1' : host,
      port
    }

    let longAddress = this[kAddress].address
    if (longAddress.startsWith('[')) {
      longAddress = longAddress.slice(1, longAddress.length - 2)
    }

    const parsedAddress = ipaddr.parse(longAddress)
    this[kAddress].family = parsedAddress.kind() === 'ipv6' ? 'IPv6' : 'IPv4'
    longAddress = parsedAddress.toNormalizedString()

    const app = this[kApp] = await createApp(this[kHttps])

    const onRequest = method => (res, req) => {
      const socket = new HTTPSocket(this, res, method === 'GET' || method === 'HEAD')
      const request = new Request(req, socket, method)
      const response = new Response(socket)
      if (req.getHeader('upgrade') !== '') {
        this.emit('upgrade', request, socket)
        if (!this[kWs]) {
          process.nextTick(() => socket.destroy(new ERR_UPGRADE(socket.address())))
        }
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

export const serverFactory = (handler, opts) => new Server(handler, opts)

export { default as fastifyUws } from './plugin.js'

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
