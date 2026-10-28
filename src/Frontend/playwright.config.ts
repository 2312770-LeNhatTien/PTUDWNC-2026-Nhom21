import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['recipe-management*.spec.ts', 'background-jobs.spec.ts'],
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3105',
    headless: true,
    launchOptions: { args: ['--no-proxy-server'], ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : { channel: 'msedge' }) },
  },
  webServer: {
    command: 'npm run dev -- --port 3105',
    env: { AUTH_SECRET: 'lab05-local-browser-test-secret-only', AUTH_URL: 'http://localhost:3105', NEXTAUTH_URL: 'http://localhost:3105',
      API_URL: 'http://127.0.0.1:59987', NEXT_PUBLIC_API_URL: 'http://127.0.0.1:59987/api/v1' },
    url: 'http://localhost:3105',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

