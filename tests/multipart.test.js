import fs from 'node:fs'
import { pipeline } from 'node:stream'
import util from 'node:util'

import fastifyMultipart from '@fastify/multipart'
import fastify from 'fastify'
import { temporaryFile } from 'tempy'
import { test } from 'uvu'

import { serverFactory } from '../src/server.js'

const pump = util.promisify(pipeline)

const file = new File(['foo'], 'foo.txt', {
  type: 'text/plain',
})

test('test multipart', async () => {
  const app = fastify({
    serverFactory,
  })

  try {
    app.register(fastifyMultipart)

    const filename = temporaryFile()

    app.post('/', async function (req, reply) {
      const data = await req.file()
      const file = data.file
      const dest = fs.createWriteStream(filename)
      await pump(file, dest)
      reply.send()
    })

    await app.listen({ port: 0 })

    const body = new FormData()
    body.set('file', file)

    await fetch(`http://localhost:${app.server.address().port}`, {
      method: 'POST',
      body,
    })
    fs.accessSync(filename)
  } finally {
    await app.close()
  }
})

test.run()
