import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Cloud Functions use node:test; Flutter tests run through flutter test.
    exclude: [...configDefaults.exclude, 'functions/**', 'mobile/**'],
  },
})
