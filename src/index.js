import EventEmitter from 'node:events'
import net from 'node:net'
import { promises as fs } from 'node:fs'
import assert from 'node:assert'

import uws from 'uWebSockets.js'
import ipaddr from 'ipaddr.js'
import tempy from 'tempy'

import { Socket } from './socket.js'
import { Request } from './request.js'
import { Response } from './response.js'
import { kHttps, kDisableRemoteAddress } from './symbols.js'

const kHandler = Symbol('handler')
const kAddress = Symbol('address')
const kListenSocket = Symbol('listenSocket')
const kListen = Symbol('listen')
const kApp = Symbol('app')
const kClosed = Symbol('closed')
const kOnServerUnref = Symbol('onServerUnref')

function checkBinding (port, address) {
  return new Promise((resolve, reject) => {
    const checkBinding = net.createServer(() => {})
    checkBinding.on('error', err => reject(err))
    checkBinding.listen(port, address, () => {
      checkBinding.close(() => resolve())
    })
  })
}

async function createApp (https) {
  if (!https) return uws.App()

  assert(typeof https === 'object')
  assert(https.key)
  assert(https.cert)

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

class ServerRef extends EventEmitter {
  constructor () {
    super()

    this.refs = new Set()
  }

  ref (server) {
    this.refs.add(server)
  }

  unref (server) {
    if (this.refs.delete(server)) {
      this.emit('unref', this.refs.size)
    }
  }
}

const refs = new ServerRef()

export class Server extends EventEmitter {
  constructor (handler, opts = {}) {
    super()

    const { connectionTimeout = 0, disableRemoteAddress = false, https = false } = opts

    this[kHandler] = handler
    this.timeout = connectionTimeout
    this[kDisableRemoteAddress] = disableRemoteAddress
    this[kHttps] = https

    this[kAddress] = null
    this[kListenSocket] = null
    this[kApp] = null
    this[kClosed] = false
    this[kOnServerUnref] = this[kOnServerUnref].bind(this)
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

  listen ({ port, host }, cb) {
    this[kListen]({ port, host })
      .then(() => cb && cb())
      .catch(err => {
        this[kAddress] = null
        process.nextTick(() => this.emit('error', err))
      })
  }

  close (cb = () => {}) {
    if (this[kClosed]) return cb()
    this[kAddress] = null
    refs.unref(this)
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

  ref () {
    refs.off('unref', this[kOnServerUnref])
  }

  unref () {
    refs.on('unref', this[kOnServerUnref])
  }

  async [kListen] ({ port, host = 'localhost' }) {
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

    await checkBinding(port, longAddress)

    const app = this[kApp] = await createApp(this[kHttps])

    app.get('/*', (res, req) => {
      const socket = new Socket(this, res)
      const request = new Request(this, req, res, socket)
      const response = new Response(this, res, request, socket)
      this[kHandler](request, response)
    })

    return new Promise((resolve, reject) => {
      app.listen(longAddress, port, (listenSocket) => {
        if (!listenSocket) return reject(new Error('internal listen socket error'))
        refs.ref(this)
        this[kListenSocket] = listenSocket
        this[kAddress].port = uws.us_socket_local_port(listenSocket)
        resolve()
      })
    })
  }

  [kOnServerUnref] (size) {
    if (size === 1) {
      process.nextTick(() => this.close())
    }
  }
}

export const serverFactory = (handler, opts) => new Server(handler, opts)
