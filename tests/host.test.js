import fastify from 'fastify'
import { test } from 'uvu'
import * as assert from 'uvu/assert'

import { serverFactory } from '../src/server.js'

test('fastify allow custom hostname', async () => {
	const app = fastify({ serverFactory })
	try {
		await app.listen({ host: 'custom.hostname', port: 3000 })
		assert.unreachable('should have thrown')
	} catch (err) {
		assert.instance(err, Error)
		assert.is(err.code, 'ENOTFOUND')
	}
})

test.run()
