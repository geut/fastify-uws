import util from 'node:util'

import { test } from 'uvu'
import { serverFactory } from '../src/index.js'
import testFastify from './fastify/index.cjs'

test('fastify integration tests', async () => {
  const results = await testFastify(serverFactory, [
    // '404s',
    // '500s',
    // 'allowUnsafeRegex',
    // 'als',
    // 'async-await',
    // 'bodyLimit',
    // 'case-insensitive',
    // 'close-pipelining',
    // 'close',
    // 'custom-parser-async',
    // 'custom-parser',
    // 'custom-querystring-parser',
    // 'decorator',
    // 'delete',
    // 'genReqId',
    // 'get',
    // 'head',
    // 'hooks-async',
    // 'hooks',
    // 'listen',
    // 'logger',
    // 'nullable-validation',
    // 'output-validation',
    // 'plugin',
    // 'promises',
    // 'proto-poisoning',
    // 'register',
    'reply-error',
    // 'request-error',
    // 'route-hooks',
    // 'route',
    // 'versioned-routes',
    // 'schema-feature',
    // 'server',
    // 'skip-reply-send',
    // 'internals/handleRequest',
    // 'internals/reply',
    // 'internals/initialConfig',
    // 'stream',
    // 'https/https',
    // 'url-rewriting'
    // 'trust-proxy',
    // 'upgrade'
  ])

  console.log(results)
})

test.run()
