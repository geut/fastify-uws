
import { STATUS_CODES } from 'node:http'

import { Writable } from 'streamx'

import { kReq, kRes, kServer } from './symbols.js'

const kHeaders = Symbol('headers')
const kWriteHead = Symbol('writeHead')
const kEnded = Symbol('ended')
const kTimer = Symbol('timer')
const kQueue = Symbol('queue')
const kTryFastEnd = Symbol('tryFastEnd')
const kStarted = Symbol('started')

const EMPTY = Buffer.alloc(0)

export class Response extends Writable {
  constructor (server, res, req, socket) {
    super()

    this[kServer] = server
    this[kRes] = res
    this[kReq] = req
    this.socket = socket
    this.statusCode = 200
    this.headersSent = false
    this.chunked = false
    this.contentLength = null

    this[kHeaders] = new Map()
    this[kEnded] = false
    this[kTimer] = null
    this[kQueue] = 0
    this[kStarted] = false

    socket.once('aborted', () => {
      this[kTimer] && clearTimeout(this[kTimer])
      this.destroy()
    })

    socket.once('close', () => {
      this[kTimer] && clearTimeout(this[kTimer])
      this.setHeader('connection', 'close')
      this.end()
    })

    this.once('error', err => {
      socket.destroy(err)
    })

    // workaround to be compatible with nodejs ServerResponse
    this.once('close', () => {
      if (!this[kStarted]) this.emit('finish')
    })

    if (server.timeout) {
      this[kTimer] = setTimeout(() => {
        if (this[kEnded] === false && this.aborted === false && !this.destroyed && !this.destroying) {
          this.socket.emit('timeout')
          res.close()
        }
      }, server.timeout)
    }
  }

  get aborted () {
    return this.socket.aborted
  }

  get finished () {
    return this.destroyed
  }

  hasHeader (name) {
    return this[kHeaders].has(name.toLowerCase())
  }

  getHeader (name) {
    return this[kHeaders].get(name.toLowerCase())?.value
  }

  getHeaders () {
    const headers = {}
    let header
    for (header of this[kHeaders].values()) {
      headers[header.name] = header.value
    }
    return headers
  }

  setHeader (name, value) {
    const key = name.toLowerCase()

    if (key === 'content-length') {
      this.contentLength = Number(value)
      return
    }

    if (key === 'transfer-encoding') {
      this.chunked = value.includes('chunked')
      return
    }

    this[kHeaders].set(key, { value, name })
  }

  writeHead (statusCode, statusMessage, headers) {
    this.statusCode = statusCode

    if (typeof statusMessage === 'object') {
      headers = statusMessage
    } else if (statusMessage) {
      this.statusMessage = statusMessage
    }

    if (headers) {
      let key
      for (key in headers) {
        this.setHeader(key, headers[key])
      }
    }
  }

  end (data) {
    this[kTimer] && clearTimeout(this[kTimer])
    return super.end(data || EMPTY)
  }

  write (data) {
    const drained = super.write(data)
    if (drained) this[kQueue]++
    return drained
  }

  _open (cb) {
    this[kStarted] = true
    cb()
  }

  _write (data, cb) {
    if (this.aborted || this[kEnded] || this.destroyed || this.destroying) return cb()

    if ((this.contentLength !== null && this.contentLength === data.length) || this[kQueue] === 0) {
      this[kTryFastEnd](data)
      return cb()
    }

    this[kQueue]--
    this[kWriteHead]()
    this[kRes].write(data)

    cb()
  }

  _final (cb) {
    if (this.aborted || this[kEnded]) return cb()
    this[kTryFastEnd]()
    cb()
  }

  _destroy (cb) {
    if (this.aborted || this[kEnded]) return cb()
    this[kTimer] && clearTimeout(this[kTimer])
    cb()
  }

  [kWriteHead] () {
    if (this.aborted || this.headersSent) return
    this.headersSent = true

    const res = this[kRes]
    const statusMessage = this.statusMessage || STATUS_CODES[this.statusCode]
    res.writeStatus(`${this.statusCode} ${statusMessage}`)

    let header
    for (header of this[kHeaders].values()) {
      res.writeHeader(header.name, String(header.value))
    }
  }

  [kTryFastEnd] (data = EMPTY) {
    this[kEnded] = true
    const res = this[kRes]
    if (this.headersSent) {
      res.end(data)
    } else {
      res.cork(() => {
        this[kWriteHead]()
        res.end(data)
      })
    }
  }
}
