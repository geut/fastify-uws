import { fork } from 'node:child_process'

import autocannon from 'autocannon'
import autocannonCompare from 'autocannon-compare'

const benchs = [
  {
    name: 'fastify-node',
    file: 'fastify-node.js',
  },
  {
    name: 'fastify-uws',
    file: 'fastify-uws.js',
  },
]

const results = new Map()

for (const bench of benchs) {
  const child = fork(`./benchmarks/${bench.file}`)

  await new Promise(resolve => setTimeout(resolve, 1000))

  const result = await autocannon({
    url: `http://localhost:3000/${bench.file}`,
    connections: 100,
    pipelining: 10,
    duration: 2,
  })

  console.log(autocannon.printResult(result, { detailed: true }))

  results.set(bench.name, result)

  child.kill('SIGINT')
}

console.log(autocannonCompare(results.get('fastify-node'), results.get('fastify-uws')))
