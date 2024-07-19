![uWebSockets.js for fastify](.github/assets/logo.png 'uWebSockets.js for fastify')

# fastify-uws
[uWebSockets.js](https://github.com/uNetworking/uWebSockets.js) for fastify

![Tests](https://github.com/geut/fastify-uws/actions/workflows/test.yml/badge.svg)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard--ext-05ae89.svg)](https://github.com/tinchoz49/eslint-config-standard-ext)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat)](https://github.com/RichardLitt/standard-readme)

[![Made by GEUT][geut-badge]][geut-url]

## Install

```
$ npm install @geut/fastify-uws
```

## Usage

```javascript
import { getUws, serverFactory, WebSocketStream } from '@geut/fastify-uws'
import fastifyUwsPlugin from '@geut/fastify-uws/plugin'
import fastify from 'fastify'

const app = fastify({
  serverFactory
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
      topics: [
        'home/sensors/ligth',
        'home/sensors/temp'
      ]
    },
    uwsHandler(conn) {
      conn.subscribe('home/sensors/temp')
      conn.on('message', (message) => {
        conn.publish('home/sensors/temp', 'random message')
      })
      conn.send(JSON.stringify({ hello: 'world' }))
    }
  })
  .get('/stream', { uws: true }, (conn) => {
    const stream = new WebSocketStream(conn)
    stream.on('data', (data) => {
      console.log('stream data from /stream')
    })
  })
  .listen({
    port: 3000
  }, (err) => {
    err && console.error(err)
  })
```

# Benchmarks

* __Machine:__ linux x64 | 2 vCPUs | 6.8GB Mem
* __Node:__ `v18.15.0`
* __Run:__ Wed Apr 12 2023 19:06:58 GMT+0000 (Coordinated Universal Time)
* __Method:__ `autocannon -c 100 -d 40 -p 10 localhost:3000` (two rounds; one to warm-up, one to measure)

|                          | Version | Router | Requests/s | Latency (ms) | Throughput/Mb |
| :--                      | --:     | --:    | :-:        | --:          | --:           |
| fastify-uws              | 1.0.0   | ✓      | 84001.6    | 11.50        | 12.58         |
| 0http                    | v3.5.1  | ✓      | 50275.2    | 19.41        | 8.97          |
| bare                     | 10.13.0 | ✗      | 49063.2    | 19.94        | 8.75          |
| h3                       | 1.6.4   | ✗      | 48583.2    | 20.10        | 7.97          |
| fastify                  | 4.15.0  | ✓      | 48141.6    | 20.30        | 8.63          |
| h3-router                | 1.6.4   | ✓      | 48025.6    | 20.34        | 7.88          |
| polka                    | 0.5.2   | ✓      | 47676.0    | 20.49        | 8.50          |
| server-base              | 7.1.32  | ✗      | 47286.4    | 20.68        | 8.43          |
| server-base-router       | 7.1.32  | ✓      | 46884.0    | 20.85        | 8.36          |
| yeps                     | 1.1.1   | ✗      | 45748.0    | 21.36        | 8.16          |
| connect                  | 3.7.0   | ✗      | 45615.2    | 21.44        | 8.14          |
| connect-router           | 1.3.8   | ✓      | 44720.0    | 21.91        | 7.97          |
| vapr                     | 0.6.0   | ✓      | 43516.0    | 22.48        | 7.14          |
| spirit                   | 0.6.1   | ✗      | 43287.2    | 22.64        | 7.72          |
| spirit-router            | 0.5.0   | ✓      | 41488.0    | 23.64        | 7.40          |
| polkadot                 | 1.0.0   | ✗      | 39672.8    | 24.73        | 7.07          |
| koa                      | 2.14.2  | ✗      | 38013.4    | 25.80        | 6.78          |
| yeps-router              | 1.2.0   | ✓      | 36993.8    | 26.54        | 6.60          |
| take-five                | 2.0.0   | ✓      | 36582.2    | 26.86        | 13.15         |
| koa-isomorphic-router    | 1.0.1   | ✓      | 36292.6    | 27.07        | 6.47          |
| restify                  | 11.1.0  | ✓      | 35689.0    | 27.53        | 6.43          |
| koa-router               | 12.0.0  | ✓      | 33882.2    | 29.03        | 6.04          |
| restana                  | 4.9.7   | ✓      | 33645.4    | 29.26        | 6.00          |
| hapi                     | 21.3.1  | ✓      | 32087.2    | 30.68        | 5.72          |
| express                  | 4.18.2  | ✓      | 11337.0    | 87.64        | 2.02          |
| fastify-big-json         | 4.15.0  | ✓      | 11012.2    | 90.32        | 126.70        |
| express-with-middlewares | 4.18.2  | ✓      | 10000.8    | 99.45        | 3.72          |
| trpc-router              | 10.19.1 | ✓      | 6594.1     | 150.95       | 1.97          |
| foxify                   | 0.10.20 | ✓      | N/A        | N/A          | N/A           |
| galatajs                 | 0.1.1   | ✓      | N/A        | N/A          | N/A           |
| micro-route              | 2.5.0   | ✓      | N/A        | N/A          | N/A           |
| micro                    | 10.0.1  | ✗      | N/A        | N/A          | N/A           |
| microrouter              | 3.1.3   | ✓      | N/A        | N/A          | N/A           |
| total.js                 | 3.4.13  | ✓      | N/A        | N/A          | N/A           |

## Issues

:bug: If you found an issue we encourage you to report it on [github](https://github.com/geut/fastify-uws/issues). Please specify your OS and the actions to reproduce it.

## Contributing

:busts_in_silhouette: Ideas and contributions to the project are welcome. You must follow this [guideline](https://github.com/geut/fastify-uws/blob/main/CONTRIBUTING.md).

## License

MIT © A [**GEUT**](http://geutstudio.com/) project

[geut-url]: https://geutstudio.com
[geut-badge]: https://img.shields.io/badge/Made%20By-GEUT-4f5186?style=for-the-badge&link=https://geutstudio.com&labelColor=white&logo=data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCABAAEADASIAAhEBAxEB/8QAGwAAAgIDAQAAAAAAAAAAAAAABAYDBQACBwH/xAA0EAACAQMBBAcGBgMAAAAAAAABAgMABBEFBhIhQRMiMVFhgcEUIzJxkbFCUmKh0fAkcuH/xAAYAQADAQEAAAAAAAAAAAAAAAABAwQCAP/EACARAAMAAwACAgMAAAAAAAAAAAABAgMRIRIxBEEiM1H/2gAMAwEAAhEDEQA/AOgVlau6xoXdgqqMkk8AKV9U2oYs0WngBRw6VhxPyFamXXoDeiz1PUbmzuujQIUKgjIqGLXnz72FSO9TikfVbi6uXWSSaWRuzixNBx3VzCepNIvgTw+hpjwv+iGr3tM6xa30F2PdP1uangRRNc70fUbi4JLIVaPskXgM/wA076Ze+2W+WwJF4MPWlNaemajI2/GvYbWVlZQHCptZqLNKLGJsKoDSY5nkKorKzlvrlYIRlm5nsA7zWX8pnv55SfikJ/emPZGDcs7m6CguTuL5DPrVf64Me2F2mzNhAg6ZTO/MsSB9BW15s1pt1GVEPRHvQ+hqbTNT9sZ0kCpIOIA5ij5ZEijaSRgqqMkmpVkb7sMuWtoV73S49L3I4B7kjq57c881BZ6vFpuoKjq7dIvYBw8PtUOqX1xcSxoJXw8mQuewVW3vX1eFR+Fcn96OLVvpFzz8kM020kp4QwIvixzVpot5Je2bSTEFw5HAY7qUKadnIymm7x/G5I+3pTskzM8G4rqq6JGpI8E1wi8HR2H0NT7P6rcRKUEzYR9/czgEf0VabV2JgvhdKPdzdvg399aVG37K4Esfw/3hTU1S2NpNrSHqax9q/wAzTm3lY5KA4ZTQl2mo9CWljncL+cnA+tVVhqeSGt5mik5qDg/9o+XVb6aFonuDusMHqjP2qavjbfGTPX3xgTstrm4uGDSEYVV+woWPMKy3dzwd+JHcOQrdkgtyZpXJb87nJ8qqr68a7cKgIjB4DmadGNQjohs9i1C66Xqtvbx+EjIp10jaOMLBaPasDwRTGc5PyNJ1rb9EN5/jP7U17KaaZJvbpV6icI88z3+VG0vH8ipJJ8Ga8tIr22eCYZVh5g94pC1TTJtPmMU67yH4XxwYV0So54IriIxzRrIh7QwzSIyOTbWzlElkCcxtjwNedHeKMCVseDmnq72UgkJa1maL9LDeH81XvspfA9WSBh/sR6U9XD+zDQp+yTSNmR/MnJomG3SLiBlu80zQ7JXTH31xEg/Tlj6Vb2OzljaEO6meQc5OweVc8koOmUGjaFLfuss4MdsOOewv8v5p0ijSGNY41CoowAOQrbsr2p7t0zSWj//Z
