import { once } from 'node:events'
import fastify from 'fastify'

import sget from 'simple-get'
import { test } from 'uvu'
import * as assert from 'uvu/assert'
import WebSocket from 'ws'

import fastifyUwsPlugin from '../src/plugin.js'
import { serverFactory } from '../src/server.js'

const get = opts =>
  new Promise((resolve, reject) =>
    sget.concat(opts, (err, _, data) => {
      if (err) return reject(err)
      resolve(data.toString())
    })
  )

test.after.each(async (context) => {
  if (context.app) await context.app.close()
})

test('basic websocket', async (context) => {
  let onGlobalMessage = 0

  const app = fastify({
    logger: true,
    serverFactory,
  })

  context.app = app

  await app.register(fastifyUwsPlugin)

  app.websocketServer.on('message', () => onGlobalMessage++)

  await app
    .route({
      method: 'GET',
      url: '/',
      uws: { topics: ['home/sensors/ligth', 'home/sensors/temp'] },
      handler: () => {
        return 'hello from http endpoint'
      },
      uwsHandler: (conn) => {
        conn.subscribe('home/sensors/temp')
        conn.on('message', message =>
          conn.publish('home/sensors/temp', message))
        conn.send(JSON.stringify(conn.getTopics()))
      },
    })
    .listen({
      port: 0,
      host: '127.0.0.1',
    })

  const address = `${app.server.address().address}:${app.server.address().port}`

  const clientA = new WebSocket(`ws://${address}`)
  const clientB = new WebSocket(`ws://${address}`)

  await Promise.all([
    once(clientA, 'message').then(([message]) =>
      assert.is(message.toString(), JSON.stringify(['home/sensors/temp']))
    ),
    once(clientB, 'message').then(([message]) =>
      assert.is(message.toString(), JSON.stringify(['home/sensors/temp']))
    ),
    once(app.websocketServer, 'open'),
  ])

  clientA.send('message from A')
  await once(clientB, 'message').then(([message]) =>
    assert.is(message.toString(), 'message from A')
  )

  assert.is(onGlobalMessage, 1)

  clientB.close()
  await once(app.websocketServer, 'close')

  assert.is(await get(`http://${address}`), 'hello from http endpoint')
})

test.run()
