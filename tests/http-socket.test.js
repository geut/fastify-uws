import { Buffer } from 'buffer'
import { randomBytes } from 'crypto'
import { test } from 'uvu'
import * as assert from 'uvu/assert'
import { Server } from '../src/server.js'

test('writable drain', async () => {
	const chunks = []
	const server = new Server((_req, res) => {
		for (let i = 0; i < 2; i++) {
			const t = randomBytes(1024 * 1024 * 10)
			chunks.push(t)
			res.write(t)
		}
		res.end()
	})

	await new Promise((resolve) =>
		server.listen({ host: 'localhost' }, resolve),
	)

	const res = await fetch(`http://localhost:${server.address().port}`).then((res) =>
		res.arrayBuffer(),
	)

  const buf = Buffer.concat(chunks)

	assert.equal(res.byteLength, buf.length)
	assert.equal(Buffer.from(res), buf)

	return new Promise((resolve) => server.close(() => resolve()))
})

test.run()
