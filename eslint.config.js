import { standard } from 'eslint-config-standard-ext'

export default standard({}, {
  ignores: [
    'dist/',
    'tests/fastify/module/',
    'example.js',
    'types/',
  ],
})
