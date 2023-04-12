import nanoerror from 'nanoerror'

export const ERR_HEAD_SET = nanoerror('ERR_HEAD_SET', 'Cannot set headers after they are sent to the client')
export const ERR_ADDRINUSE = nanoerror('EADDRINUSE', 'listen EADDRINUSE: address already in use %s:%s')
export const ERR_UPGRADE = nanoerror('ERR_UPGRADE', 'Cannot upgrade to WebSocket protocol %o')
export const ERR_STREAM_DESTROYED = nanoerror('ERR_STREAM_DESTROYED', 'Stream destroyed')
export const ERR_UWS_APP_NOT_FOUND = nanoerror('ERR_UWS_APP_NOT_FOUND', 'uWebSockets app not found')
export const ERR_ENOTFOUND = nanoerror('ERR_ENOTFOUND', 'getaddrinfo ENOTFOUND %s')
export const ERR_SOCKET_BAD_PORT = nanoerror('ERR_SOCKET_BAD_PORT', 'RangeError [ERR_SOCKET_BAD_PORT]: options.port should be >= 0 and < 65536. Received (%s)')
