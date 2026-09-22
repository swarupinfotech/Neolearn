import type { Config } from "@playwright/test";

const PORT = process.env.E2E_PORT ?? "3310";
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

const config: Config = {
  testDir: "./tests/e2e",
  timeout: 60000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `scripts\\e2e-server.cmd`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      ...process.env,
      E2E_PORT: PORT,
    },
  },
};

export default config;