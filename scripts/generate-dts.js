import * as fs from 'node:fs'
import { createBundle } from 'dts-buddy'

await createBundle({
  project: 'tsconfig.json',
  output: 'types/index.d.ts',
  modules: {
    '@geut/fastify-uws': 'src/server.js',
    '@geut/fastify-uws/plugin': 'src/plugin.js'
  },
  include: [
    'src/**/*.js'
  ]
})

const types = fs.readFileSync('types/index.d.ts', 'utf-8')
fs.writeFileSync(
  'types/index.d.ts',
  types.replace("declare module '@geut/fastify-uws/plugin' {", "declare module '@geut/fastify-uws/plugin' {\n  /// <reference path=\"./types/fastify-overload.d.ts\" />")
)
