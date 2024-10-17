import { EventEmitter } from 'eventemitter3'

import { ERR_STREAM_DESTROYED } from './errors.js'
import {
  kAddress,
  kClientError,
  kEncoding,
  kHead,
  kHttps,
  kReadyState,
  kRemoteAdress,
  kRes,
  kServer,
  kTimeoutRef,
  kUwsRemoteAddress,
  kWriteOnly,
  kWs,
} from './symbols.js'

const localAddressIpv6 = Buffer.from([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
])

const toHex = (buf, start, end) => buf.slice(start, end).toString('hex')

const noop = () => {}

/**
 * @this {HTTPSocket}
 */
function onAbort() {
  this.aborted = true
  this.emit('aborted')
  this.errored && this.emit('error', this.errored)
  this.emit('close')
}

function onDrain(offset) {
  this.emit('drain', offset)
  return true
}

function onTimeout() {
  if (!this.destroyed) {
    this.emit('timeout')
    this.abort()
  }
}

function drain(socket, cb) {
  socket.writableNeedDrain = true
  let done = false

  const onClose = () => {
    socket.removeListener('drain', onDrain)
    if (done) return

    done = true
    cb()
  }

  const onDrain = () => {
    if (done) return
    socket.writableNeedDrain = false
    socket.removeListener('close', onClose)
    socket.removeListener('drain', onDrain)
    cb()
  }

  socket.on('drain', onDrain)
  socket.once('close', onClose)
}

function writeHead(res, head) {
  if (head.status) res.writeStatus(head.status)
  if (head.headers) {
    for (const header of head.headers.values()) {
      if (header.isMultiValue) {
        for (const value of header.value) {
          res.writeHeader(header.name, value)
        }
      } else {
        res.writeHeader(header.name, header.value)
      }
    }
  }
}

function byteLength(data) {
  if (data?.empty) return 0
  if (data?.byteLength !== undefined) return data.byteLength
  return Buffer.byteLength(data)
}

function getChunk(data) {
  if (data?.chunk) return data.chunk
  return data
}

export class HTTPSocket extends EventEmitter {
  constructor(server, res, writeOnly) {
    super()

    this.aborted = false
    this.writableNeedDrain = false
    this.bytesRead = 0
    this.bytesWritten = 0
    this.writableEnded = false
    this.errored = null
    this[kServer] = server
    this[kRes] = res
    this[kWriteOnly] = writeOnly
    this[kReadyState] = {
      read: false,
      write: false,
    }
    this[kEncoding] = null
    this[kRemoteAdress] = null
    this[kUwsRemoteAddress] = null
    this[kHead] = null
    this[kClientError] = false

    this.once('error', noop) // maybe?
    res.onAborted(onAbort.bind(this))
    res.onWritable(onDrain.bind(this))

    if (server.timeout) {
      this[kTimeoutRef] = setTimeout(onTimeout.bind(this), server.timeout)
    }
  }

  get readyState() {
    const state = this[kReadyState]
    if (state.read && !state.write) return 'readOnly'
    if (!state.read && state.write) return 'writeOnly'
    if (state.read) return 'open'
    return 'opening'
  }

  get writable() {
    return true
  }

  get readable() {
    return true
  }

  get encrypted() {
    return !!this[kServer][kHttps]
  }

  get remoteAddress() {
    let remoteAddress = this[kRemoteAdress]
    if (remoteAddress) return remoteAddress

    let buf = this[kUwsRemoteAddress]
    if (!buf) {
      buf = this[kUwsRemoteAddress] = Buffer.from(this[kRes].getRemoteAddress())
    }

    if (buf.length === 4) {
      remoteAddress = `${buf.readUInt8(0)}.${buf.readUInt8(1)}.${buf.readUInt8(
        2
      )}.${buf.readUInt8(3)}`
    } else {
      // avoid to call toHex if local
      if (buf.equals(localAddressIpv6)) {
        remoteAddress = '::1'
      } else {
        remoteAddress = `${toHex(buf, 0, 2)}:${toHex(buf, 2, 4)}:${toHex(
          buf,
          4,
          6
        )}:${toHex(buf, 6, 8)}:${toHex(buf, 8, 10)}:${toHex(
          buf,
          10,
          12
        )}:${toHex(buf, 12, 14)}:${toHex(buf, 14)}`
      }
    }

    this[kRemoteAdress] = remoteAddress
    return remoteAddress
  }

  get remoteFamily() {
    if (!this[kUwsRemoteAddress]) {
      this[kUwsRemoteAddress] = Buffer.from(this[kRes].getRemoteAddress())
    }

    return this[kUwsRemoteAddress].length === 4 ? 'IPv4' : 'IPv6'
  }

  get destroyed() {
    return this.writableEnded || this.aborted
  }

  address() {
    return { ...this[kServer][kAddress] }
  }

  abort() {
    if (this.aborted) return
    this.aborted = true
    if (!this[kWs] && !this.writableEnded) {
      this[kRes].close()
    }
  }

  setEncoding(encoding) {
    this[kEncoding] = encoding
  }

  destroy(err) {
    if (this.aborted) return
    this._clearTimeout()
    this.errored = err
    this.abort()
  }

  onRead(cb) {
    if (this[kWriteOnly] || this.aborted) return cb(null, null)

    let done = false
    this[kReadyState].read = true
    const encoding = this[kEncoding]
    try {
      this[kRes].onData((chunk, isLast) => {
        if (done) return

        this.bytesRead += chunk.byteLength

        if (encoding) {
          chunk = Buffer.from(chunk).toString(encoding)
        } else {
          chunk = Buffer.copyBytesFrom(new Uint8Array(chunk))
        }

        this.emit('data', chunk)

        cb(null, chunk)
        if (isLast) {
          done = true
          cb(null, null)
        }
      })
    } catch (err) {
      done = true
      this.destroy(err)
      cb(err)
    }
  }

  end(data, _, cb = noop) {
    if (this.aborted) throw new ERR_STREAM_DESTROYED()

    if (!data) return this.abort()

    this.writableEnded = true

    this._clearTimeout()

    const res = this[kRes]

    res.cork(() => {
      if (this[kHead]) {
        writeHead(res, this[kHead])
        this[kHead] = null
      }
      res.end(getChunk(data))
      this.bytesWritten += byteLength(data)
      this.emit('close')
      this.emit('finish')
      cb()
    })
  }

  write(data, _, cb = noop) {
    if (this.destroyed) throw new ERR_STREAM_DESTROYED()

    if (this[kClientError] && data.startsWith('HTTP/')) {
      const [header, body] = data.split('\r\n\r\n')
      const [first, ...headers] = header.split('\r\n')
      const [,code, statusText] = first.split(' ')
      this[kHead] = {
        headers: headers.map((header) => {
          const [name, ...value] = header.split(': ')
          return { name, value: value.join(': ').trim() }
        }).filter(header => header.name.toLowerCase() !== 'content-length'),
        status: `${code} ${statusText}`,
      }
      data = body
      return this.end(data, _, cb)
    }

    const res = this[kRes]

    this[kReadyState].write = true

    res.cork(() => {
      if (this[kHead]) {
        writeHead(res, this[kHead])
        this[kHead] = null
      }

      const drained = res.write(getChunk(data))
      this.bytesWritten += byteLength(data)

      if (drained) return cb()
      drain(this, cb)
    })

    return !this.writableNeedDrain
  }

  _clearTimeout() {
    this[kTimeoutRef] && clearTimeout(this[kTimeoutRef])
  }
}
