# fastify-uws
uWebSockets.js for fastify

![Tests](https://github.com/geut/fastify-uws/actions/workflows/test.yml/badge.svg)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg?style=flat)](https://standardjs.com)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat)](https://github.com/RichardLitt/standard-readme)

[![Made by GEUT][geut-badge]][geut-url]

## Install

```
$ npm install @geut/fastify-uws
```

## Usage

```javascript
import fastify from 'fastify'
import { serverFactory, fastifyUws } from '@geut/fastify-uws'

const app = fastify({
  serverFactory
})

await app.register(fastifyUws)

app.websocketServer.on('open', ws => {
  console.log('OPEN')
})

app.websocketServer.on('close', ws => {
  console.log('CLOSE')
})

app
  .get('/', { ws: { topics: ['home/sensors/ligth', 'home/sensors/temp'] } }, async (req, reply) => {
    if (!reply.ws) {
      return 'hello from http endpoint'
    }

    reply.subscribe('home/sensors/temp')
    reply.on('message', (message) => {
      reply.publish('home/sensors/temp', 'random message')
    })
    reply.send(JSON.stringify({ hello: 'world' }))
  })
  .listen({
    port: 3000
  }, (err) => {
    err && console.error(err)
  })
```

## Benchmarks

Generated from: https://github.com/geut/benchmarks

* __Machine:__ linux x64 | 2 vCPUs | 6.8GB Mem
* __Node:__ `v14.20.1`
* __Run:__ Thu Oct 13 2022 21:42:53 GMT+0000 (Coordinated Universal Time)
* __Method:__ `autocannon -c 100 -d 40 -p 10 localhost:3000` (two rounds; one to warm-up, one to measure)

|                          | Version | Router | Requests/s | Latency | Throughput/Mb |
| :--                      | --:     | --:    | :-:        | --:     | --:           |
| fastify-uws              | 0.0.5   | ✓      | 80122.8    | 12.00   | 12.00         |
| bare                     | 10.13.0 | ✗      | 56154.4    | 17.32   | 10.01         |
| polkadot                 | 1.0.0   | ✗      | 55499.2    | 17.52   | 9.90          |
| polka                    | 0.5.2   | ✓      | 55183.2    | 17.64   | 9.84          |
| foxify                   | 0.10.20 | ✓      | 55168.8    | 17.63   | 9.05          |
| micro                    | 9.4.1   | ✗      | 55053.6    | 17.67   | 9.82          |
| connect                  | 3.7.0   | ✗      | 55044.8    | 17.67   | 9.82          |
| fastify                  | 4.8.1   | ✓      | 54933.6    | 17.71   | 9.85          |
| 0http                    | 3.4.1   | ✓      | 54540.8    | 17.84   | 9.73          |
| rayo                     | 1.3.10  | ✓      | 53823.2    | 18.09   | 9.60          |
| server-base              | 7.1.32  | ✗      | 53657.6    | 18.14   | 9.57          |
| server-base-router       | 7.1.32  | ✓      | 52456.8    | 18.56   | 9.36          |
| yeps                     | 1.1.1   | ✗      | 49796.0    | 19.58   | 8.88          |
| restana                  | 4.9.6   | ✓      | 48790.4    | 20.00   | 8.70          |
| micro-route              | 2.5.0   | ✓      | 47211.2    | 20.69   | 8.42          |
| connect-router           | 1.3.7   | ✓      | 46852.8    | 20.85   | 8.36          |
| trek-engine              | 1.0.5   | ✗      | 46170.4    | 21.16   | 7.57          |
| trek-router              | 1.2.0   | ✓      | 44349.8    | 22.05   | 7.27          |
| vapr                     | 0.6.0   | ✓      | 43468.8    | 22.51   | 7.13          |
| yeps-router              | 1.2.0   | ✓      | 40915.2    | 23.94   | 7.30          |
| koa                      | 2.13.4  | ✗      | 39010.6    | 25.14   | 6.96          |
| total.js                 | 3.4.13  | ✓      | 38128.8    | 25.73   | 11.67         |
| spirit                   | 0.6.1   | ✗      | 37768.0    | 25.99   | 6.74          |
| spirit-router            | 0.5.0   | ✓      | 37556.0    | 26.13   | 6.70          |
| take-five                | 2.0.0   | ✓      | 36465.0    | 26.93   | 13.11         |
| koa-isomorphic-router    | 1.0.1   | ✓      | 35757.4    | 27.47   | 6.38          |
| restify                  | 8.6.1   | ✓      | 35377.8    | 27.77   | 6.38          |
| koa-router               | 12.0.0  | ✓      | 33373.2    | 29.46   | 5.95          |
| hapi                     | 20.2.2  | ✓      | 29162.8    | 33.79   | 5.20          |
| microrouter              | 3.1.3   | ✓      | 28242.0    | 34.91   | 5.04          |
| trpc-router              | 9.27.4  | ✓      | 24931.6    | 39.59   | 5.52          |
| egg.js                   | 3.3.3   | ✓      | 18348.9    | 53.98   | 6.56          |
| express                  | 4.18.2  | ✓      | 11994.8    | 82.81   | 2.14          |
| express-with-middlewares | 4.18.2  | ✓      | 10532.1    | 94.37   | 3.92          |
| express-route-prefix     | 4.18.2  | ✓      | 10291.0    | 96.63   | 3.81          |
| fastify-big-json         | 4.8.1   | ✓      | 9940.1     | 100.11  | 114.37        |

## Issues

:bug: If you found an issue we encourage you to report it on [github](https://github.com/geut/fastify-uws/issues). Please specify your OS and the actions to reproduce it.

## Contributing

:busts_in_silhouette: Ideas and contributions to the project are welcome. You must follow this [guideline](https://github.com/geut/fastify-uws/blob/main/CONTRIBUTING.md).

## License

MIT © A [**GEUT**](http://geutstudio.com/) project

[geut-url]: https://geutstudio.com
[geut-badge]: https://img.shields.io/badge/Made%20By-GEUT-4f5186?style=for-the-badge&link=https://geutstudio.com&labelColor=white&logo=data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCABAAEADASIAAhEBAxEB/8QAGwAAAgIDAQAAAAAAAAAAAAAABAYDBQACBwH/xAA0EAACAQMBBAcGBgMAAAAAAAABAgMABBEFBhIhQRMiMVFhgcEUIzJxkbFCUmKh0fAkcuH/xAAYAQADAQEAAAAAAAAAAAAAAAABAwQCAP/EACARAAMAAwACAgMAAAAAAAAAAAABAgMRIRIxBEEiM1H/2gAMAwEAAhEDEQA/AOgVlau6xoXdgqqMkk8AKV9U2oYs0WngBRw6VhxPyFamXXoDeiz1PUbmzuujQIUKgjIqGLXnz72FSO9TikfVbi6uXWSSaWRuzixNBx3VzCepNIvgTw+hpjwv+iGr3tM6xa30F2PdP1uangRRNc70fUbi4JLIVaPskXgM/wA076Ze+2W+WwJF4MPWlNaemajI2/GvYbWVlZQHCptZqLNKLGJsKoDSY5nkKorKzlvrlYIRlm5nsA7zWX8pnv55SfikJ/emPZGDcs7m6CguTuL5DPrVf64Me2F2mzNhAg6ZTO/MsSB9BW15s1pt1GVEPRHvQ+hqbTNT9sZ0kCpIOIA5ij5ZEijaSRgqqMkmpVkb7sMuWtoV73S49L3I4B7kjq57c881BZ6vFpuoKjq7dIvYBw8PtUOqX1xcSxoJXw8mQuewVW3vX1eFR+Fcn96OLVvpFzz8kM020kp4QwIvixzVpot5Je2bSTEFw5HAY7qUKadnIymm7x/G5I+3pTskzM8G4rqq6JGpI8E1wi8HR2H0NT7P6rcRKUEzYR9/czgEf0VabV2JgvhdKPdzdvg399aVG37K4Esfw/3hTU1S2NpNrSHqax9q/wAzTm3lY5KA4ZTQl2mo9CWljncL+cnA+tVVhqeSGt5mik5qDg/9o+XVb6aFonuDusMHqjP2qavjbfGTPX3xgTstrm4uGDSEYVV+woWPMKy3dzwd+JHcOQrdkgtyZpXJb87nJ8qqr68a7cKgIjB4DmadGNQjohs9i1C66Xqtvbx+EjIp10jaOMLBaPasDwRTGc5PyNJ1rb9EN5/jP7U17KaaZJvbpV6icI88z3+VG0vH8ipJJ8Ga8tIr22eCYZVh5g94pC1TTJtPmMU67yH4XxwYV0So54IriIxzRrIh7QwzSIyOTbWzlElkCcxtjwNedHeKMCVseDmnq72UgkJa1maL9LDeH81XvspfA9WSBh/sR6U9XD+zDQp+yTSNmR/MnJomG3SLiBlu80zQ7JXTH31xEg/Tlj6Vb2OzljaEO6meQc5OweVc8koOmUGjaFLfuss4MdsOOewv8v5p0ijSGNY41CoowAOQrbsr2p7t0zSWj//Z
