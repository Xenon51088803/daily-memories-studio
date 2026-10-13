import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3311",
    viewport: { width: 1440, height: 1080 },
    launchOptions: { channel: "chrome" },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3311",
    url: "http://127.0.0.1:3311",
    reuseExistingServer: false,
    timeout: 180000,
    env: { DIARY_DATA_DIR: `.diary-test-data/${Date.now()}`, NEXT_DIST_DIR: ".next-e2e" },
  },
});
