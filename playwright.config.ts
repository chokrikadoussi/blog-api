import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.e2e.ts",
  timeout: 30_000,
  retries: 0,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["json", { outputFile: "playwright-report/results.json" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    extraHTTPHeaders: {
      "Content-Type": "application/json",
    },
  },
});
