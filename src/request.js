import { Readable } from 'streamx'

import { kReq, kRes, kServer } from './symbols.js'

const kMethod = Symbol('method')
const kUrl = Symbol('url')
const kHeaders = Symbol('headers')
const kEncoding = Symbol('encoding')

export class Request extends Readable {
  constructor (server, req, res, socket) {
    super()

    this[kServer] = server
    this.socket = socket
    this.httpVersion = '1.1'
    this[kReq] = req
    this[kRes] = res
    this[kMethod] = null
    this[kUrl] = null
    this[kHeaders] = null
    this[kEncoding] = null
    socket.once('aborted', () => {
      this.destroy()
    })
    this.once('error', (err) => {
      socket.destroy(err)
    })
  }

  get aborted () {
    return this.socket.aborted
  }

  get protocol () {
    return 'https'
  }

  get method () {
    let method = this[kMethod]
    if (method) return method
    method = this[kMethod] = this[kReq].getMethod().toUpperCase()
    return method
  }

  get url () {
    let url = this[kUrl]
    if (url) return url
    const query = this[kReq].getQuery()
    url = this[kUrl] = this[kReq].getUrl() + (query.length > 0 ? `?${query}` : '')
    return url
  }

  set url (url) {
    this[kUrl] = url
  }

  get headers () {
    let headers = this[kHeaders]
    if (headers) return headers
    headers = this[kHeaders] = {}
    this[kReq].forEach((k, v) => {
      headers[k.toLowerCase()] = v
    })
    return headers
  }

  setEncoding (encoding) {
    this[kEncoding] = encoding
  }

  _open (cb) {
    const encoding = this[kEncoding]
    this[kRes].onData((chunk, isLast) => {
      if (this.destroyed || this.destroying) return

      chunk = Buffer.from(chunk)

      if (encoding) {
        chunk = chunk.toString(encoding)
        if (this.receivedEncodedLength === undefined) {
          this.receivedEncodedLength = chunk.length
        } else {
          this.receivedEncodedLength += chunk.length
        }
      }

      this.push(chunk)
      if (isLast) {
        this.push(null)
      }
    })

    cb()
  }
}
