import nanoerror from 'nanoerror'

export const ERR_HEAD_SET = nanoerror('ERR_HEAD_SET', 'Cannot set headers after they are sent to the client')
export const ERR_ADDRINUSE = nanoerror('EADDRINUSE', 'listen EADDRINUSE: address already in use %s:%s')
export const ERR_UPGRADE = nanoerror('ERR_UPGRADE', 'Cannot upgrade to WebSocket protocol %o')
export const ERR_STREAM_DESTROYED = nanoerror('ERR_STREAM_DESTROYED', 'Stream destroyed')
