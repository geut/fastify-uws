import { lookup } from 'dns/promises'
import { connect } from 'net'
import { once } from 'events'

import { test } from 'uvu'
import * as assert from 'uvu/assert'
import Fastify from 'fastify'

test('upgrade to both servers', async t => {
  const results = await lookup('localhost', { all: true })
  if (results.length !== 2) {
    throw new Error('should test both servers')
  }

  const app = Fastify()

  app.get('/', (req, res) => {
  })

  await app.listen()

  {
    const client = connect(app.server.address().port, '127.0.0.1')
    client.write('GET / HTTP/1.1\r\n')
    client.write('Upgrade: websocket\r\n')
    client.write('Connection: Upgrade\r\n')
    client.write('Host: localhost\r\n')
    client.write('Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n')
    client.write('Sec-WebSocket-Protocol: com.xxx.service.v1\r\n')
    client.write('Sec-WebSocket-Version: 13\r\n\r\n')
    client.write('\r\n\r\n')
    await Promise.all([
      once(client, 'close'),
      once(app.server, 'upgrade').then(([req, socket, head]) => {
        assert.ok(`upgrade event ${JSON.stringify(socket.address())}`)
        socket.end()
      })
    ])
  }

  {
    const client = connect(app.server.address().port, '::1')
    client.write('GET / HTTP/1.1\r\n')
    client.write('Upgrade: websocket\r\n')
    client.write('Connection: Upgrade\r\n')
    client.write('Host: localhost\r\n')
    client.write('Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n')
    client.write('Sec-WebSocket-Protocol: com.xxx.service.v1\r\n')
    client.write('Sec-WebSocket-Version: 13\r\n\r\n')
    await Promise.all([
      once(client, 'close'),
      once(app.server, 'upgrade').then(([req, socket, head]) => {
        assert.ok(`upgrade event ${JSON.stringify(socket.address())}`)
        socket.end()
      })
    ])
  }

  await app.close()
})

test.run()
