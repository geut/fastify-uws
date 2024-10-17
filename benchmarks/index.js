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
    duration: 3,
  })

  results.set(bench.name, {
    name: bench.name,
    ...result,
  })

  child.kill('SIGINT')
}

const a = results.get('fastify-node')
const b = results.get('fastify-uws')

const comp = autocannonCompare(a, b)

console.log(`${a.name}: ${a.requests.average}`)
console.log(`${b.name}: ${b.requests.average}`)

if (comp.equal) {
  console.log('Same performance!')
} else if (comp.aWins) {
  console.log(`${a.name} is faster than ${b.name} by ${comp.requests.difference} of difference`)
} else {
  console.log(`${b.name} is faster than ${a.name} by ${autocannonCompare(b, a).requests.difference} of difference`)
}
