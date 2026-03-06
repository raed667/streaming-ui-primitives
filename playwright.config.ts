import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests run against the built Storybook static site.
 * Run `pnpm build:storybook` first, then `pnpm test:e2e`.
 *
 * For CI: `pnpm test:e2e:ci` builds Storybook then runs tests.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:6006',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Serves the pre-built storybook-static directory
    command: 'pnpm exec serve storybook-static --listen 6006 --no-clipboard --config ../serve.json',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env['CI'],
    timeout: 30000,
  },
})
