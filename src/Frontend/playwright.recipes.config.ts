import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'recipe-management*.spec.ts', timeout: 60000, workers: 1,
  use: { baseURL: 'http://localhost:3106', headless: true, actionTimeout: 15000,
    launchOptions: { args: ['--no-proxy-server'], ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {}) } },
  webServer: {
    command: 'npm run dev -- --port 3106', url: 'http://localhost:3106', timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: { AUTH_SECRET: 'recipes-local-test-secret-only', NEXTAUTH_URL: 'http://localhost:3106', AUTH_URL: 'http://localhost:3106', API_URL: 'http://localhost:5106', NEXT_PUBLIC_API_URL: 'http://localhost:5106/api/v1' },
  },
});
