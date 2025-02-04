import { test } from 'uvu'

import { serverFactory } from '../src/server.js'
import testFastify from './fastify/index.cjs'

test('fastify integration tests', async () => {
  const results = await testFastify(serverFactory, {
    tests: [
      '404s',
      '500s',
      'allowUnsafeRegex',
      'als',
      'async-await',
      'bodyLimit',
      'case-insensitive',
      'close',
      'custom-parser-async',
      'custom-querystring-parser',
      'decorator',
      'delete',
      'genReqId',
      'hooks-async',
      'hooks',
      'listen.1',
      'listen.2',
      'listen.3',
      'listen.4',
      'listen.5',
      'nullable-validation',
      'output-validation',
      'promises',
      'proto-poisoning',
      'register',
      'route-hooks',
      'route.1',
      'route.2',
      'route.3',
      'route.4',
      'route.5',
      'route.6',
      'route.7',
      'versioned-routes',
      'schema-feature',
      'server',
      'internals/handleRequest',
      'internals/reply',
      'stream.1',
      'stream.2',
      'stream.3',
      'stream.4',
      'stream.5',
      'https/https',
      'url-rewriting',
      'trust-proxy',
      'http-methods/copy',
      'http-methods/custom-http-methods',
      'http-methods/get',
      'http-methods/head',
      'http-methods/lock',
      'http-methods/mkcalendar',
      'http-methods/mkcol',
      'http-methods/move',
      'http-methods/propfind',
      'http-methods/proppatch',
      'http-methods/report',
      'http-methods/search',
      'http-methods/trace',
      'http-methods/unlock',
    ],
    ignore: [
      'framework-unsupported method',
      'root framework-unsupported method',
      'framework-unsupported method 2',
      'framework-unsupported method 3',
      'run hook with encapsulated 404 and framework-unsupported method',
      'Unknown method',
      'listen on socket',
      'Current opened connection should NOT continue to work after closing and return "connection: close" header - return503OnClosing: false',
      'Current opened connection should continue to work after closing and return "connection: close" header - return503OnClosing: false, skip Node >= v18.19.x',
      'Current opened connection should NOT continue to work after closing and return "connection: close" header - return503OnClosing: false, skip Node < v18.19.x',
      'shutsdown while keep-alive connections are active (non-async, native)',
      'shutsdown while keep-alive connections are active (non-async, idle, native)',
      'shutsdown while keep-alive connections are active (non-async, custom)',
      'redirect to an invalid URL should not crash the server',
      'invalid response headers should not crash the server',
      'invalid response headers when sending back an error',
      'invalid response headers and custom error handler',
      'for HEAD method, no body should be sent but content-length should be',
      'undefined payload should be sent as-is',
      'addresses getter',
    ],
  })
  console.log(results)
})

test.run()
