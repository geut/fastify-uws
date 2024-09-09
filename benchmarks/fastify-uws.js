import fastify from 'fastify'

import { serverFactory } from '../src/server.js'

const app = fastify({
  logger: false,
  serverFactory,
})

app.get('/', (req, reply) => {
  reply.send({ hello: 'world' })
})

app.listen({ port: 3000 }, async (err, address) => {
  if (err) throw err
})
