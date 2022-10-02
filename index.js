import http from 'http'
import fs from 'fs'
import fastify from 'fastify'
import errors from 'http-errors'
import { serverFactory } from './src/index.js'

const app = fastify({
  logger: {
    level: 'info'
  },
  serverFactory
})

app
  .get('/', async (req, reply) => {
    return 'hello'
  })
  .post('/', (req) => {
    return 'hello'
  })
  .put('/stream', (req, reply) => {
    return 'hello'
  })
  .listen({
    port: 4001
  }, () => {
    console.log(app.server.address().port)
  })

// http.createServer((req) => {
//   console.log('test', req)
// }).listen(3000)
