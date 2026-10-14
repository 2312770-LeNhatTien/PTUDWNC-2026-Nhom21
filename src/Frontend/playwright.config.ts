import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3105',
    headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : undefined,
  },
  webServer: {
    command: 'npm run dev -- --port 3105',
    env: { AUTH_SECRET: 'lab05-local-browser-test-secret-only' },
    url: 'http://localhost:3105',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

