import ipaddr from 'ipaddr.js'
import { Duplex } from 'streamx'

import {
  kRes,
  kHttps,
  kDisableRemoteAddress,
  kServer,
  kAddress,
  kRemoteAdress,
  kFamily,
  kParse,
  kEncoding,
  kTimeoutRef,
  kEnded,
  kReadyState,
  kWriteOnly,
  kWriteHead,
  kOnDrain,
  kWs
} from './symbols.js'

const EMPTY = Buffer.alloc(0)

export class HTTPSocket extends Duplex {
  constructor (server, res, writeOnly) {
    super({
      mapWritable: data => {
        if (data?.isResponse) return data
        return new HTTPResponse(data)
      },
      byteLengthWritable: (data) => {
        return data.byteLength
      }
    })

    this.aborted = false
    this.bytesRead = 0
    this.bytesWritten = 0

    this[kServer] = server
    this[kRes] = res
    this[kWriteOnly] = writeOnly
    this[kReadyState] = {
      read: false,
      write: false
    }
    this[kEnded] = false
    this[kEncoding] = null

    if (this[kServer][kDisableRemoteAddress]) {
      this[kRemoteAdress] = '::1'
      this[kFamily] = 'ipv6'
    } else {
      this[kRemoteAdress] = null
      this[kFamily] = null
      this[kAddress] = null
    }

    this.on('error', () => {
      this.abort()
    })

    this.on('close', () => {
      if (!this[kWs] && !this.aborted && !this[kEnded]) {
        this.abort()
      }
    })

    res.onAborted(() => {
      this.aborted = true
      this.destroy()
      this.emit('aborted')
    })

    res.onWritable(() => {
      this.emit('uws-drain')
      return true
    })

    if (server.timeout) {
      this[kTimeoutRef] = setTimeout(() => {
        if (this[kEnded] === false && this.aborted === false && !this.destroyed && !this.destroying) {
          this.emit('timeout')
          this.abort()
        }
      }, server.timeout)
    }
  }

  get readyState () {
    const state = this[kReadyState]
    if (state.read && !state.write) return 'readOnly'
    if (!state.read && state.write) return 'writeOnly'
    if (state.read) return 'open'
    return 'opening'
  }

  get encrypted () {
    return !!this[kServer][kHttps]
  }

  get remoteAddress () {
    let remoteAddress = this[kRemoteAdress]
    if (remoteAddress) return remoteAddress
    remoteAddress = this[kRemoteAdress] = this[kParse]().toString()
    return remoteAddress
  }

  get family () {
    let family = this[kFamily]
    if (family) return family
    family = this[kFamily] = this[kParse]().kind()
    return family
  }

  address () {
    return { ...this[kServer][kAddress] }
  }

  abort () {
    if (this.aborted || this[kEnded]) return
    this.aborted = true

    if (!this[kWs]) {
      this[kRes].close()
    }
  }

  setEncoding (encoding) {
    this[kEncoding] = encoding
  }

  end (data) {
    if (this.destroyed || this.destroying || this[kEnded] || this.writableEnded) return
    this.writableEnded = true
    if (data || this[kReadyState].write) {
      super.end(data?.isResponse ? data : new HTTPResponse(data, true))
    } else {
      super.end()
    }
  }

  _predestroy () {
    this[kTimeoutRef] && clearTimeout(this[kTimeoutRef])
  }

  _read (cb) {
    if (this[kWriteOnly] || this.aborted) {
      this.push(null)
      return cb()
    }

    this[kReadyState].read = true
    const encoding = this[kEncoding]
    try {
      this[kRes].onData((chunk, isLast) => {
        if (this.destroyed || this.destroying) return cb()

        chunk = Buffer.from(chunk)

        this.bytesRead += chunk.length

        if (encoding) {
          chunk = chunk.toString(encoding)
        }

        this.push(chunk)
        if (isLast) {
          this.push(null)
          cb()
        }
      })
    } catch (err) {
      this.destroy(err)
    }
  }

  _write (data, cb) {
    if (this.destroyed || this[kEnded]) return cb()

    this[kReadyState].write = true

    const res = this[kRes]

    // fast end
    if (data.end) {
      this[kEnded] = true
      res.cork(() => {
        this[kWriteHead](data.status, data.headers)
        res.end(data.chunk)
      })
      return cb()
    }

    this[kWriteHead](data.status, data.headers)

    const drained = res.write(data.chunk)
    if (drained) return cb()
    this[kOnDrain](() => res.write(data.chunk), cb)
  }

  [kParse] () {
    let address = this[kAddress]
    if (address) return address
    address = this[kAddress] = ipaddr.parse(Buffer.from(this[kRes].getRemoteAddressAsText()).toString())
    return address
  }

  [kWriteHead] (status, headers) {
    if (this.aborted) return

    const res = this[kRes]
    if (status) res.writeStatus(status)

    if (headers) {
      headers.forEach(header => {
        res.writeHeader(header.name, String(header.value))
      })
    }
  }

  [kOnDrain] (tryWrite, cb) {
    let done = false

    const onClose = () => {
      this.removeListener('uws-drain', onDrain)
      if (done) return

      done = true
      cb()
    }

    const onDrain = () => {
      if (done) return

      done = tryWrite()
      if (done) {
        this.removeListener('close', onClose)
        this.removeListener('uws-drain', onDrain)
        cb()
      }
    }

    this.on('uws-drain', onDrain)
    this.once('close', onClose)
  }
}

export class HTTPResponse {
  constructor (chunk, end) {
    if (chunk) {
      this.chunk = chunk
      this.end = end
    } else {
      this.end = true
      this.empty = true
      this.chunk = EMPTY
    }
    this.isResponse = true
    this.status = null
    this.headers = null
  }

  get byteLength () {
    if (this._byteLength !== undefined) return this._byteLength
    this._byteLength = this.empty ? 1 : Buffer.byteLength(this.chunk)
    return this._byteLength
  }
}
