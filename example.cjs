const t = require('tap')
const test = t.test
const sget = require('simple-get').concat
const Fastify = require('fastify')
const net = require('net')
const { serverFactory } = require('./dist/index.cjs')

const fastify = Fastify({
  serverFactory,
  // return503OnClosing: false,
  // forceCloseConnections: false
})

fastify.get('/', (req, reply) => {
  // fastify.close()
  return reply.send({ hello: 'world' })
})

fastify.listen({ port: 3000 }, () => {

  // const port = fastify.server.address().port
  // const client = net.createConnection({ port }, () => {
  //   client.write('GET / HTTP/1.1\r\n\r\n')

  //   client.once('data', data => {
  //     console.log(data.toString())
  //     // t.match(data.toString(), /Connection:\s*keep-alive/i)
  //     // t.match(data.toString(), /200 OK/i)

  //     client.write('GET / HTTP/1.1\r\n\r\n')

  //     client.once('data', data => {
  //       console.log(data.toString(), /Connection:\s*close/i)

  //       // Test that fastify closes the TCP connection
  //       client.once('close', () => {
  //         console.log('close')
  //       })
  //     })
  //   })
  // })
})
