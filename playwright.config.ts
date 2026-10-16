import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:59943', headless: true, trace: 'retain-on-failure' },
})
