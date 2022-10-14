import { Readable } from 'streamx'

import { kReq, kHeaders, kUrl } from './symbols.js'
export class Request extends Readable {
  constructor (req, socket, method) {
    super()

    this.socket = socket
    this.method = method
    this.httpVersion = '1.1'
    this.readableEnded = false
    this[kReq] = req
    if (req.url) {
      this[kUrl] = req.url
      this[kHeaders] = req.headers
    } else {
      this[kUrl] = null
      this[kHeaders] = null
    }

    this.once('error', () => {})
    socket.once('error', err => super.destroy(err))
    socket.once('close', () => super.destroy())
    socket.once('aborted', () => this.emit('aborted'))
  }

  get aborted () {
    return this.socket.aborted
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
    this.socket.setEncoding(encoding)
  }

  setTimeout (timeout) {
    this.socket.setTimeout(timeout)
  }

  destroy (err) {
    if (this.destroyed || this.destroying) return
    this.socket.destroy(err)
  }

  _read (cb) {
    const socket = this.socket
    let closed = false

    const onRead = () => {
      if (closed || this.destroyed || this.destroying) return

      const chunk = socket.read()

      if (chunk) {
        this.push(chunk)
        return onRead()
      }

      socket.once('readable', onRead)
    }

    socket.once('end', () => {
      closed = true
      this.readableEnded = true
      this.push(null)
      cb()
    })

    onRead()
  }
}
