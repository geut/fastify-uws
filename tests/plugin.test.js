import { once } from 'events'

import { test } from 'uvu'
import * as assert from 'uvu/assert'
import fastify from 'fastify'
import WebSocket from 'ws'
import sget from 'simple-get'

import { serverFactory, fastifyUws } from '../src/index.js'

const get = (opts) => new Promise((resolve, reject) => sget.concat(opts, (err, _, data) => {
  if (err) return reject(err)
  resolve(data.toString())
}))

test.after.each(async (context) => {
  if (context.app) await context.app.close()
})

test('basic websocket', async (context) => {
  let onGlobalMessage = 0

  const app = context.app = fastify({
    logger: true,
    serverFactory
  })

  await app.register(fastifyUws)

  app.websocketServer.on('message', () => onGlobalMessage++)

  await app
    .get('/', { ws: { topics: ['home/sensors/ligth', 'home/sensors/temp'] } }, async (req, reply) => {
      if (!reply.ws) {
        return 'hello from http endpoint'
      }

      reply.subscribe('home/sensors/temp')
      reply.on('message', (message) => reply.publish('home/sensors/temp', message))
      reply.send(JSON.stringify(reply.getTopics()))
    })
    .listen({
      port: 3000,
      host: '127.0.0.1'
    })

  const address = `${app.server.address().address}:${app.server.address().port}`

  const clientA = new WebSocket(`ws://${address}`)
  const clientB = new WebSocket(`ws://${address}`)

  await Promise.all([
    once(clientA, 'message').then(([message]) => assert.is(message.toString(), JSON.stringify(['home/sensors/temp']))),
    once(clientB, 'message').then(([message]) => assert.is(message.toString(), JSON.stringify(['home/sensors/temp']))),
    once(app.websocketServer, 'open')
  ])

  clientA.send('message from A')
  await once(clientB, 'message').then(([message]) => assert.is(message.toString(), 'message from A'))

  assert.is(onGlobalMessage, 1)

  clientB.close()
  await once(app.websocketServer, 'close')

  assert.is(await get(`http://${address}`), 'hello from http endpoint')
})

test.run()
