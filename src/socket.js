import EventEmitter from 'node:events'
import ipaddr from 'ipaddr.js'

import { kRes, kHttps, kDisableRemoteAddress, kServer } from './symbols.js'

const kAddress = Symbol('address')
const kRemoteAdress = Symbol('remoteAddress')
const kFamily = Symbol('family')
const kParse = Symbol('parse')

export class Socket extends EventEmitter {
  constructor (server, res) {
    super()

    this[kServer] = server
    this[kRes] = res

    this.aborted = false

    if (this[kServer][kDisableRemoteAddress]) {
      this[kRemoteAdress] = '::1'
      this[kFamily] = 'ipv6'
    } else {
      this[kRemoteAdress] = null
      this[kFamily] = null
      this[kAddress] = null
    }

    res.onAborted(() => {
      this.emit('aborted')
    })
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

  get writable () {
    return true
  }

  get readable () {
    return true
  }

  [kParse] () {
    let address = this[kAddress]
    if (address) return address
    address = this[kAddress] = ipaddr.parse(Buffer.from(this[kRes].getRemoteAddressAsText()).toString())
    return address
  }

  end (res) {
    if (this.aborted || this.destroyed) return
    this[kRes].end(res)
    this.emit('close')
  }

  destroy (err) {
    if (this.aborted || this.destroyed) return
    this.destroyed = true
    if (err) {
      this.aborted = true
      this[kRes].close()
    } else {
      this.emit('close')
    }
  }
}
