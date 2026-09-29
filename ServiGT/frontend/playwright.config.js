// Config minima de Playwright para E2E de humo contra el stack ya levantado
// (docker compose up). No inicia servidores propios: apunta al frontend/
// backend expuestos en los puertos del docker-compose del proyecto, para no
// duplicar infraestructura ni levantar un segundo stack por accidente.
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8086';

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
