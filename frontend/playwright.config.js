const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 45000,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL || "http://localhost:3000", browserName: "chromium", channel: process.env.E2E_BROWSER_CHANNEL || "msedge", headless: true },
});
