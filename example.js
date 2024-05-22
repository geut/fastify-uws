import fastify from 'fastify'
import { WebSocketStream, getUws, serverFactory } from './src/server.js'

import fastifyUwsPlugin from './src/plugin.js'

const app = fastify({
  serverFactory,
})

await app.register(fastifyUwsPlugin)

app.addHook('onReady', async () => {
  // access to uws app
  const uwsApp = getUws(app)
})

app.websocketServer.on('open', (ws) => {
  console.log('OPEN')
})

app.websocketServer.on('close', (ws) => {
  console.log('CLOSE')
})

app
  .route({
    method: 'GET',
    url: '/',
    handler(req, reply) {
      return 'hello from http endpoint'
    },
    uws: {
      // cache subscription topics to produce less memory allocations
      topics: ['home/sensors/ligth', 'home/sensors/temp'],
    },
    uwsHandler(conn) {
      conn.subscribe('home/sensors/temp')
      conn.on('message', (message) => {
        conn.publish('home/sensors/temp', 'random message')
      })
      conn.send(JSON.stringify({ hello: 'world' }))
    },
  })
  .get('/stream', { uws: true }, (conn) => {
    const stream = new WebSocketStream(conn)
    stream.on('data', (data) => {
      console.log('stream data from /stream')
    })
  })
  .listen(
    {
      port: 3000,
    },
    (err) => {
      err && console.error(err)
    },
  )
