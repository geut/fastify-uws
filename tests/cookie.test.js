import fastifyCookie from '@fastify/cookie'
import fastify from 'fastify'
import { test } from 'uvu'
import * as assert from 'uvu/assert'

import { serverFactory } from '../src/server.js'

test('test cookie', async () => {
  const app = fastify({
    serverFactory,
  })

  await app.register(fastifyCookie)

  try {
    app.get('/', async (request, reply) => {
      reply.setCookie('foo', 'foo').setCookie('baz', 'baz').setCookie('bar', 'bar').send('test cookie')
    })

    await app.listen({ port: 0 })

    const response = await fetch(`http://localhost:${app.server.address().port}`, {
      method: 'GET',
    })

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Set-Cookie'), 'foo=foo; SameSite=Lax, baz=baz; SameSite=Lax, bar=bar; SameSite=Lax')
  } finally {
    await app.close()
  }
})

test.run()
