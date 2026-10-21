import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'background-jobs.spec.ts', timeout: 120000, workers: 1,
  use: { baseURL: 'http://localhost:3107', headless: true, actionTimeout: 15000,
    launchOptions: { args: ['--no-proxy-server'], ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {}) } },
  webServer: {
    command: process.env.JOBS_TEST_PRODUCTION ? 'npm run start -- --port 3107' : 'npm run dev -- --port 3107',
    url: 'http://localhost:3107', timeout: 180000, reuseExistingServer: false,
    env: { AUTH_SECRET: 'jobs-local-test-secret-only', NEXTAUTH_URL: 'http://localhost:3107', AUTH_URL: 'http://localhost:3107', API_URL: 'http://localhost:5107', NEXT_PUBLIC_API_URL: 'http://localhost:5107/api/v1' },
  },
});
