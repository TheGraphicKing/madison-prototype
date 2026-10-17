import { defineConfig } from "@playwright/test";

// The five demo flows, end to end, against the static export served on :4321 (npx serve out -l 4321).
export default defineConfig({
  testDir: "e2e",
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE ?? "http://localhost:4321",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 20_000,
    screenshot: "only-on-failure",
    // the scenes are WebGL: use the machine's GPU rather than software rendering
    launchOptions: { args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal", "--enable-unsafe-swiftshader"] },
  },
});
