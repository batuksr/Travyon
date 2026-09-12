import { configDefaults, defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

const webRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: webRoot,
  test: {
    // Cloud Functions use node:test; Flutter tests run through flutter test.
    exclude: [...configDefaults.exclude],
  },
})
