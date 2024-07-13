import fastify from 'fastify'
import { test } from 'uvu'

import { serverFactory } from '../src/server.js'

test('fastify should listen succesful', async () => {
  const app = fastify({ serverFactory })
  await app.listen({ port: 0 })
  await app.close()
})

test.run()
