import fastify from 'fastify'

const app = fastify({
  logger: false,
})

app.get('/', (req, reply) => {
  reply.send({ hello: 'world' })
})

app.listen({ port: 3000 }, async (err, address) => {
  if (err) throw err
})
