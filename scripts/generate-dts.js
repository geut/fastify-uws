import * as fs from 'node:fs'
import { $ } from 'execa'

await $`tsc src/server.js src/plugin.js --declaration --allowJs --emitDeclarationOnly --outDir types`

const types = fs.readFileSync('types/plugin.d.ts', 'utf-8')
fs.writeFileSync(
  'types/plugin.d.ts',
  types + 'import "./fastify-overload.d.ts"',
)
