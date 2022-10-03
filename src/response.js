
import { STATUS_CODES } from 'http'

import { Writable } from 'streamx'

import { HTTPResponse } from './http-socket.js'
import { ERR_HEAD_SET } from './errors.js'
import { kHeaders, kDestroyError } from './symbols.js'

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
export class Response extends Writable {
  constructor (socket) {
    super({
      mapWritable: (data) => {
        if (data?.isResponse) return data
        const res = new HTTPResponse(data)
        if (!res.end) {
          res.end = this.contentLength !== null && this.contentLength === res.byteLength
        }
        this.writableEnded = res.end
        return res
      },
      byteLength: (data) => {
        return data.byteLength
      }
    })

    this.socket = socket
    this.statusCode = 200
    this.headersSent = false
    this.chunked = false
    this.contentLength = null
    this.writableEnded = false
    this.sendDate = true

    this[kHeaders] = new Map([
      ['date', new Header('Date', utcDate())]
    ])

    socket.once('close', () => this.destroy())
    socket.once('aborted', () => this.emit('aborted'))
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

    if (headers) {
      Object.keys(headers).forEach(key => {
        this.setHeader(key, headers[key])
      })
    }
  }

  end (data) {
    if (this.writableEnded) return
    return super.end(new HTTPResponse(data, true))
  }

  destroy (err) {
    this[kDestroyError] = err
    super.destroy(err)
  }

  _write (data, cb) {
    if (this.aborted) return cb()

    if (!this.headersSent) {
      this.headersSent = true
      data.headers = this[kHeaders]
      data.status = this.status
    }

    if (data.end) {
      this.socket.end(data)
      return cb()
    }

    this.socket.write(data)
    cb()
  }

  _destroy (cb) {
    if (this.socket.destroyed || this.socket.destroying || this.aborted || this.writableEnded) return cb()
    this.socket.once('close', cb)
    this.socket.destroy(this[kDestroyError])
  }
}
