
import { STATUS_CODES } from 'http'

import { Writable } from 'streamx'

import { ERR_HEAD_SET, ERR_STREAM_DESTROYED } from './errors.js'
import { kHeaders, kHead } from './symbols.js'

class Header {
  constructor (name, value) {
    this.name = name
    this.value = String(value)
  }
}

const EMPTY = Buffer.alloc(0)
class HTTPResponse {
  constructor (chunk, end = false) {
    this.chunk = chunk || EMPTY
    this.empty = !chunk
    this.end = end
    this.byteLength = this.empty ? 1 : Buffer.byteLength(this.chunk)
  }
}

function onAbort () {
  this.emit('aborted')
}

const noop = () => {}

const options = {
  byteLength (data) {
    return data.byteLength
  }
}

export class Response extends Writable {
  constructor (socket) {
    super(options)

    this.socket = socket
    this.statusCode = 200
    this.headersSent = false
    this.chunked = false
    this.contentLength = null
    this.writableEnded = false
    this.firstChunk = true

    this[kHeaders] = new Map()

    const destroy = this.destroy.bind(this)
    this.once('error', noop)
    socket.once('error', destroy)
    socket.once('close', destroy)
    socket.once('aborted', onAbort.bind(this))
  }

  get aborted () {
    return this.socket.aborted
  }

  get finished () {
    return this.socket.writableEnded && !this.socket.aborted
  }

  get status () {
    return `${this.statusCode} ${this.statusMessage || STATUS_CODES[this.statusCode]}`
  }

  get bytesWritten () {
    return this.socket.bytesWritten
  }

  hasHeader (name) {
    return this[kHeaders].has(name.toLowerCase())
  }

  getHeader (name) {
    return this[kHeaders].get(name.toLowerCase())?.value
  }

  getHeaders () {
    const headers = {}
    this[kHeaders].forEach((header, key) => {
      headers[key] = header.value
    })
    return headers
  }

  setHeader (name, value) {
    if (this.headersSent) throw new ERR_HEAD_SET()

    const key = name.toLowerCase()

    if (key === 'content-length') {
      this.contentLength = Number(value)
      return
    }

    if (key === 'transfer-encoding') {
      this.chunked = value.includes('chunked')
      return
    }

    this[kHeaders].set(key, new Header(name, value))
  }

  removeHeader (name) {
    if (this.headersSent) throw new ERR_HEAD_SET()

    this[kHeaders].delete(name.toLowerCase())
  }

  writeHead (statusCode, statusMessage, headers) {
    if (this.headersSent) throw new ERR_HEAD_SET()

    this.statusCode = statusCode

    if (typeof statusMessage === 'object') {
      headers = statusMessage
    } else if (statusMessage) {
      this.statusMessage = statusMessage
    }

    if (headers) {
      Object.keys(headers).forEach(key => {
        this.setHeader(key, headers[key])
      })
    }
  }

  end (data) {
    if (this.aborted) return
    if (this.destroyed) throw new ERR_STREAM_DESTROYED()
    this.writableEnded = true
    return super.end(new HTTPResponse(data, true))
  }

  destroy (err) {
    if (this.destroyed || this.destroying || this.aborted) return
    this.socket.destroy(err)
  }

  write (data) {
    if (this.aborted) return

    if (this.destroyed) throw new ERR_STREAM_DESTROYED()

    data = new HTTPResponse(data)

    // fast end
    if (this.firstChunk && this.contentLength !== null && this.contentLength === data.byteLength) {
      data.end = true
      this.writableEnded = true
      super.end(data)
      return true
    }

    this.firstChunk = false
    return super.write(data)
  }

  _write (data, cb) {
    if (this.aborted) return cb()

    if (!this.headersSent) {
      this.headersSent = true
      this.socket[kHead] = {
        headers: this[kHeaders],
        status: this.status
      }
    }

    if (data.end) {
      this.socket.end(data, null, cb)
      return
    }

    this.socket.write(data, null, cb)
  }

  _destroy (cb) {
    if (this.socket.destroyed) return cb()
    this.socket.once('close', cb)
  }
}
