import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'deployment.smoke.spec.ts', workers: 1, timeout: 120000,
  use: {
    baseURL: process.env.DEPLOYMENT_URL || 'https://localhost:8443',
    ignoreHTTPSErrors: true, // Chỉ bộ kiểm chứng local với cert tự ký.
    headless: true, actionTimeout: 20000,
    launchOptions: { args: ['--no-proxy-server'], ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : {}) },
  },
});
