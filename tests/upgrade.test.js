import { once } from 'events'
import { connect } from 'net'
import { lookup } from 'dns/promises'

import Fastify from 'fastify'
import { test } from 'uvu'
import * as assert from 'uvu/assert'

import fastifyUws from '../src/plugin.js'
import { serverFactory } from '../src/server.js'

test('upgrade to both servers', async () => {
	const results = await lookup('localhost', { all: true })
	if (results.length !== 2) {
		throw new Error('should test both servers')
	}

	const app = Fastify({
		serverFactory,
	})

  app.register(fastifyUws)

	app.get('/', () => ({}))

	await app.listen()

	{
		const client = connect(app.server.address().port, '127.0.0.1')
    const done = Promise.all([
			once(client, 'close'),
			once(app.server, 'upgrade').then(([_req, socket, _head]) => {
        assert.ok(`upgrade event ${JSON.stringify(socket.address())}`)
        socket.end()
			}),
		])
		client.write('GET / HTTP/1.1\r\n')
		client.write('Upgrade: websocket\r\n')
		client.write('Connection: Upgrade\r\n')
		client.write('Host: localhost\r\n')
		client.write('Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n')
		client.write('Sec-WebSocket-Protocol: com.xxx.service.v1\r\n')
		client.write('Sec-WebSocket-Version: 13\r\n\r\n')
		client.write('\r\n\r\n')
		await done
	}

	// {
	// 	const client = connect(app.server.address().port, '::1')
	// 	client.write('GET / HTTP/1.1\r\n')
	// 	client.write('Upgrade: websocket\r\n')
	// 	client.write('Connection: Upgrade\r\n')
	// 	client.write('Host: localhost\r\n')
	// 	client.write('Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==\r\n')
	// 	client.write('Sec-WebSocket-Protocol: com.xxx.service.v1\r\n')
	// 	client.write('Sec-WebSocket-Version: 13\r\n\r\n')
	// 	await Promise.all([
	// 		once(client, 'close'),
	// 		once(app.server, 'upgrade').then(([_req, socket, _head]) => {
	// 			assert.ok(`upgrade event ${JSON.stringify(socket.address())}`)
	// 			socket.end()
	// 		}),
	// 	])
	// }

	await app.close()
})

test.run()
