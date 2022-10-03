import { test } from 'uvu'
import { serverFactory } from '../src/index.js'
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
      'close-pipelining',
      'close',
      'custom-parser-async',
      'custom-parser',
      'custom-querystring-parser',
      'decorator',
      'delete',
      'genReqId',
      'get',
      'head',
      'hooks-async',
      'hooks',
      'listen',
      'logger',
      'nullable-validation',
      'output-validation',
      'plugin',
      'promises',
      'proto-poisoning',
      'register',
      'route-hooks',
      'route',
      'versioned-routes',
      'schema-feature',
      'server',
      'internals/handleRequest',
      'internals/reply',
      'stream',
      'https/https',
      'url-rewriting',
      'trust-proxy',
      'upgrade'
    ],
    ignore: [
      'framework-unsupported method',
      'root framework-unsupported method',
      'framework-unsupported method 2',
      'framework-unsupported method 3',
      'run hook with encapsulated 404 and framework-unsupported method',
      'Unknown method',
      'listen on socket',
      'Current opened connection should continue to work after closing and return "connection: close" header - return503OnClosing: false',
      'shutsdown while keep-alive connections are active (non-async, native)',
      'shutsdown while keep-alive connections are active (non-async, idle, native)',
      'shutsdown while keep-alive connections are active (non-async, custom)'
    ]
  })

  console.log(results)
})

test.run()
