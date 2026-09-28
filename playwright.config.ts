import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const webServerUrl = process.env.PLAYWRIGHT_WEB_SERVER_URL || 'http://localhost:3001';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--no-proxy-server'],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 3001',
    url: webServerUrl,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});