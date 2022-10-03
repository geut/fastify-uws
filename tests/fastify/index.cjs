const { Readable } = require('stream')
const path = require('path')
const { once } = require('events')
const requireInject = require('require-inject')
const _sget = require('simple-get').concat

const _fastify = require('./module/fastify.js')
const symbols = require('./module/lib/symbols.js')

const FASTIFY_CWD = path.resolve(__dirname, 'module')

// set on a test object directly, after creation

function requireTap (ignore) {
  const t = requireInject.withEmptyCache('tap')

  function wrapTest (t) {
    const _test = t.test

    t.test = (name, cb, ...args) => {
      if (ignore.includes(name)) {
        return _test(name, (t) => {
          t.pass('ignore')
          t.end()
        })
      }
      return _test(name, (t) => {
        return cb(wrapTest(t))
      }, ...args)
    }

    return t
  }

  wrapTest(t, true)

  return t
}

module.exports = async (serverFactory, opts = {}) => {
  const fastify = (opts = {}) => _fastify({
    ...opts,
    serverFactory
  })

  const { tests, ignore } = opts

  // uwebsocket.js doesn't support chunked requests, yet
  const concatReadStream = async (opts = {}, cb) => {
    try {
      let { body } = opts
      const chunks = []
      for await (const chunk of body) {
        chunks.push(chunk)
      }

      if (Buffer.isBuffer(chunks[0])) {
        body = Buffer.concat(chunks)
      } else {
        body = chunks.join()
      }

      return _sget({ ...opts, body }, cb)
    } catch (err) {
      cb(err)
    }
  }

  const simpleGet = {
    concat: (opts, cb) => {
      if (typeof opts === 'string') return _sget(opts, cb)

      const { body } = opts
      if (body && body instanceof Readable) {
        return concatReadStream(opts, cb)
      }

      return _sget({ ...opts, body }, cb)
    }
  }

  const cwd = process.cwd.bind(process)
  process.cwd = () => FASTIFY_CWD

  const results = {}

  try {
    for (const test of tests) {
      const t = requireTap(ignore)
      const done = once(t, 'end')

      requireInject(`./module/test/${test}.test.js`, {
        './module/fastify.js': fastify,
        './module/lib/symbols.js': symbols,
        'simple-get': simpleGet,
        tap: t
      })

      await done

      if (t.counts.fail > 0) {
        const err = new Error(`error on ${test}`)
        err.tap = t
        throw err
      }

      results[test] = t.counts
    }

    return results
  } finally {
    process.cwd = cwd
  }
}
