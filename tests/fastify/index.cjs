const path = require('node:path')
const { Readable } = require('node:stream')

const requireInject = require('require-inject')
const _sget = require('simple-get').concat
const tap = require('tap')

const _fastify = require('./module/fastify.js')
const symbols = require('./module/lib/symbols.js')

const FASTIFY_CWD = path.resolve(__dirname, 'module')

module.exports = async (serverFactory, opts = {}) => {
  const fastify = (opts = {}) => _fastify({
    ...opts,
    serverFactory,
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
    },
  }

  const cwd = process.cwd.bind(process)
  process.cwd = () => FASTIFY_CWD

  const results = {}

  tap.setTimeout(0)

  try {
    await Promise.all(tests.map(async (test) => {
      const res = await tap.test(test, { timeout: 120_000 }, (t) => {
        const runningTests = []

        function wrapTest(t) {
          const _test = t.test

          t.test = (name, ...args) => {
            if (ignore.includes(name)) {
              const runningTest = _test(name, { skip: true }, t => t.end())
              runningTests.push(runningTest)
              return runningTest
            }

            const cbIndex = args.findIndex(arg => typeof arg === 'function')
            const cb = args[cbIndex]
            args[cbIndex] = (t) => {
              return cb(wrapTest(t))
            }
            const runningTest = _test(name, ...args)
            runningTests.push(runningTest)
            return runningTest
          }

          return t
        }

        requireInject(`./module/test/${test}.test.js`, {
          './module/fastify.js': fastify,
          './module/lib/symbols.js': symbols,
          'simple-get': simpleGet,
          'tap': wrapTest(t),
        })

        new Promise(resolve => setTimeout(resolve, 5_000)).then(() => Promise.all(runningTests)).finally(() => {
          if (runningTests.length > 0) {
            t.end()
          }
        })
      })

      if (res.fail > 0) {
        const err = new Error(`error on ${test}`)
        err.tap = res
        throw err
      }

      results[test] = res
    }))
    return results
  } catch (err) {
    if (err.tap) {
      console.dir(err.tap, { depth: null })
    }
    throw err
  } finally {
    process.cwd = cwd
  }
}
