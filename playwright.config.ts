import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  workers: 4,
  use: {
    baseURL: 'http://127.0.0.1:4321/linkxcap/',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://127.0.0.1:4321/linkxcap/zh/index.html',
    reuseExistingServer: true,
  },
});
