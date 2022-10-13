import { Duplex } from 'streamx'

import {
  kRes,
  kHttps,
  kServer,
  kAddress,
  kRemoteAdress,
  kEncoding,
  kTimeoutRef,
  kEnded,
  kReadyState,
  kWriteOnly,
  kWriteHead,
  kOnDrain,
  kWs,
  kUwsRemoteAddress,
  kHeadWrited
} from './symbols.js'

const localAddressIpv6 = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])

const toHex = (buf, start, end) => buf.slice(start, end).toString('hex')
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
    this[kRemoteAdress] = null
    this[kUwsRemoteAddress] = null
    this[kHeadWrited] = false

    this.on('error', () => {
      this.abort()
    })

    res.onAborted(() => {
      this.emit('aborted')
      this.aborted = true
      if (this.destroyed) return
      this.destroy()
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

    let buf = this[kUwsRemoteAddress]
    if (!buf) {
      buf = this[kUwsRemoteAddress] = Buffer.from(this[kRes].getRemoteAddress())
    }

    if (buf.length === 4) {
      remoteAddress = `${buf.readUInt8(0)}.${buf.readUInt8(1)}.${buf.readUInt8(2)}.${buf.readUInt8(3)}`
    } else {
      // avoid to call toHex if local
      if (buf.equals(localAddressIpv6)) {
        remoteAddress = '::1'
      } else {
        remoteAddress = `${toHex(buf, 0, 2)}:${toHex(buf, 2, 4)}:${toHex(buf, 4, 6)}:${toHex(buf, 6, 8)}:${toHex(buf, 8, 10)}:${toHex(buf, 10, 12)}:${toHex(buf, 12, 14)}:${toHex(buf, 14)}`
      }
    }

    this[kRemoteAdress] = remoteAddress
    return remoteAddress
  }

  get remoteFamily () {
    if (!this[kUwsRemoteAddress]) {
      this[kUwsRemoteAddress] = Buffer.from(this[kRes].getRemoteAddress())
    }

    return this[kUwsRemoteAddress].length === 4 ? 'IPv4' : 'IPv6'
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
    if (data) return super.end(data.isResponse ? data : new HTTPResponse(data, true))
    return super.end()
  }

  destroy (err) {
    this[kTimeoutRef] && clearTimeout(this[kTimeoutRef])
    super.destroy(err)
  }

  _destroy (cb) {
    if (!this[kWs] && !this.aborted && !this[kEnded]) {
      this[kRes].close()
    }
    cb()
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

    const res = this[kRes]

    this[kReadyState].write = true
    this[kEnded] = data.end

    if (data.end) {
      if (data.status && data.headers) {
        // fast end
        res.cork(() => {
          this[kWriteHead](data.status, data.headers)
          res.end(data.chunk)
        })
      } else {
        res.end(data.chunk)
      }

      this[kHeadWrited] = true
      return cb()
    }

    this[kWriteHead](data.status, data.headers)

    this[kHeadWrited] = true
    const drained = res.write(data.chunk)
    if (drained) return cb()
    this[kOnDrain](() => res.write(data.chunk), cb)
  }

  [kWriteHead] (status, headers) {
    if (this.aborted || this[kHeadWrited]) return

    const res = this[kRes]
    if (status) res.writeStatus(status)

    if (headers) {
      headers.forEach(header => {
        res.writeHeader(header.name, header.value)
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
    this.chunk = chunk || undefined

    if (chunk) {
      this.end = end
      this.byteLength = Buffer.byteLength(chunk)
    } else {
      this.end = true
      this.byteLength = 1
    }

    this.isResponse = true
    this.status = null
    this.headers = null
  }
}
