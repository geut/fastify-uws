
import { STATUS_CODES } from 'http'

import { Writable } from 'streamx'

import { ERR_HEAD_SET } from './errors.js'
import { kHeaders, kHead } from './symbols.js'

let utcCache

function utcDate () {
  if (!utcCache) cache()
  return utcCache
}

function cache () {
  const d = new Date()
  utcCache = d.toUTCString()
  const timeout = setTimeout(resetCache, 1000 - d.getMilliseconds())
  timeout.unref()
}

function resetCache () {
  utcCache = undefined
}

class Header {
  constructor (name, value) {
    this.name = name
    this.value = String(value)
  }
}

const EMPTY = Buffer.from('')
class HTTPResponse {
  constructor (chunk, end = false) {
    this.isResponse = true
    this.chunk = chunk || EMPTY
    this.end = end
    this.byteLength = Buffer.byteLength(chunk)
  }
}

function onAbort () {
  this.emit('aborted')
}

function onClose () {
  if (this.writableEnded && this.bytesWritten === 0) {
    this.emit('finish')
  }
}

const noop = () => {}

const options = {
  mapWritable (data) {
    return data?.isResponse ? data : new HTTPResponse(data)
  },
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
    this.bytesWritten = 0
    this.sendDate = true

    this[kHeaders] = new Map()

    const destroy = this.destroy.bind(this)
    this.once('error', noop)
    this.once('close', onClose.bind(this))
    socket.once('error', destroy)
    socket.once('close', destroy)
    socket.once('aborted', onAbort.bind(this))
  }

  get aborted () {
    return this.socket.aborted
  }

  get finished () {
    return this.destroyed
  }

  get status () {
    return `${this.statusCode} ${this.statusMessage || STATUS_CODES[this.statusCode]}`
  }

  hasHeader (name) {
    return this[kHeaders].has(name.toLowerCase())
  }

  getHeader (name) {
    return this[kHeaders].get(name.toLowerCase())?.value
  }

  getHeaders () {
    const headers = {}
    this[kHeaders].forEach(header => {
      headers[header.name] = header.value
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

    if (this.sendDate) {
      this[kHeaders].set('date', new Header('Date', utcDate()))
    }

    if (headers) {
      Object.keys(headers).forEach(key => {
        this.setHeader(key, headers[key])
      })
    }
  }

  end (data) {
    if (this.writableEnded) return
    if (data) return super.end(new HTTPResponse(data, true))
    this.writableEnded = true
    return super.end()
  }

  destroy (err) {
    if (this.destroyed || this.destroying) return
    this.socket.destroy(err)
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

    this.bytesWritten += data.byteLength

    if (data.end || (this.contentLength !== null && this.contentLength === data.byteLength)) {
      this.writableEnded = true
      this.socket.end(data.chunk, cb)
      return
    }

    this.socket.write(data.chunk, cb)
  }

  _destroy (cb) {
    if (this.socket.destroyed) return cb()

    if (this.writableEnded) {
      if (!this.headersSent) {
        this.headersSent = true
        this.socket[kHead] = {
          headers: this[kHeaders],
          status: this.status
        }
      }

      this.socket.end(EMPTY)
    }

    this.socket.once('close', cb)
  }
}
