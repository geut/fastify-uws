import EventEmitter from 'events'
import fastq from 'fastq'

import {
  kRes,
  kHttps,
  kServer,
  kAddress,
  kRemoteAdress,
  kEncoding,
  kTimeoutRef,
  kReadyState,
  kWriteOnly,
  kWs,
  kUwsRemoteAddress,
  kQueue,
  kHead
} from './symbols.js'

import { ERR_STREAM_DESTROYED } from './errors.js'

const localAddressIpv6 = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])

const toHex = (buf, start, end) => buf.slice(start, end).toString('hex')

const noop = () => {}

function onAbort () {
  this.aborted = true
  this.emit('aborted')
  this.errored && this.emit('error', this.errored)
  this.emit('close')
}

function onDrain () {
  this.emit('drain')
  return true
}

function onTimeout () {
  if (!this.destroyed) {
    this.emit('timeout')
    this.abort()
  }
}

function onWrite (data, cb) {
  const res = this[kRes]

  this[kReadyState].write = true

  if (this[kHead]) {
    writeHead(res, this[kHead])
    this[kHead] = null
  }

  const drained = res.write(getChunk(data))
  if (drained) {
    this.bytesWritten += byteLength(data)
    return cb()
  }
  drain(this, res, data, cb)
}

function cork (res, data) {
  writeHead(res, this[kHead])
  this[kHead] = null
  res.end(data)
}

function end (socket, data) {
  socket._clearTimeout()

  const res = socket[kRes]

  if (socket[kHead]) {
    res.cork(cork.bind(socket, res, getChunk(data)))
  } else {
    res.end(getChunk(data))
  }

  socket.bytesWritten += byteLength(data)
  socket.emit('close')
  socket.emit('finish')
}

function drain (socket, res, data, cb) {
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

    done = res.write(getChunk(data))
    if (done) {
      socket.writableNeedDrain = false
      this.bytesWritten += byteLength(data)
      socket.removeListener('close', onClose)
      socket.removeListener('drain', onDrain)
      cb()
    }
  }

  socket.on('drain', onDrain)
  socket.once('close', onClose)
}

function writeHead (res, head) {
  if (head.status) res.writeStatus(head.status)
  if (head.headers) {
    for (const header of head.headers.values()) {
      res.writeHeader(header.name, header.value)
    }
  }
}

function byteLength (data) {
  if (data.byteLength !== undefined) return data.byteLength
  return Buffer.byteLength(data)
}

function getChunk (data) {
  if (data.chunk) return data.chunk
  return data
}

export class HTTPSocket extends EventEmitter {
  constructor (server, res, writeOnly) {
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
      write: false
    }
    this[kEncoding] = null
    this[kRemoteAdress] = null
    this[kUwsRemoteAddress] = null
    this[kHead] = null

    this.once('error', noop) // maybe?
    res.onAborted(onAbort.bind(this))
    res.onWritable(onDrain.bind(this))

    if (server.timeout) {
      this[kTimeoutRef] = setTimeout(onTimeout.bind(this), server.timeout)
    }
  }

  get readyState () {
    const state = this[kReadyState]
    if (state.read && !state.write) return 'readOnly'
    if (!state.read && state.write) return 'writeOnly'
    if (state.read) return 'open'
    return 'opening'
  }

  get writable () {
    return true
  }

  get readable () {
    return true
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

  get destroyed () {
    return this.writableEnded || this.aborted
  }

  address () {
    return { ...this[kServer][kAddress] }
  }

  abort () {
    if (this.aborted) return
    this.aborted = true
    this[kQueue] && this[kQueue].kill()
    if (!this[kWs] && !this.writableEnded) {
      this[kRes].close()
    }
  }

  setEncoding (encoding) {
    this[kEncoding] = encoding
  }

  destroy (err) {
    if (this.aborted) return
    this._clearTimeout()
    this.errored = err
    this.abort()
  }

  onRead (cb) {
    if (this[kWriteOnly] || this.aborted) return cb(null, null)

    let done = false
    this[kReadyState].read = true
    const encoding = this[kEncoding]
    try {
      this[kRes].onData((chunk, isLast) => {
        if (done) return

        chunk = Buffer.from(chunk)

        this.bytesRead += Buffer.byteLength(chunk)

        if (encoding) {
          chunk = chunk.toString(encoding)
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

  end (data, _, cb = noop) {
    if (this.aborted) throw new ERR_STREAM_DESTROYED()

    if (!data) return this.abort()

    this.writableEnded = true
    const queue = this[kQueue]

    // fast end
    if (!queue || queue.idle()) {
      end(this, data)
      cb()
      return
    }

    queue.push(data, cb)
  }

  write (data, _, cb = noop) {
    if (this.destroyed) throw new ERR_STREAM_DESTROYED()

    if (!this[kQueue]) {
      this[kQueue] = fastq(this, onWrite, 1)
    }

    this[kQueue].push(data, cb)
    return !this.writableNeedDrain
  }

  _clearTimeout () {
    this[kTimeoutRef] && clearTimeout(this[kTimeoutRef])
  }
}
