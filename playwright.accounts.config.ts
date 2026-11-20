import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/accounts",
  use: { baseURL: "http://127.0.0.1:3011", trace: "retain-on-failure" },
  outputDir: "./test-results/accounts",
  timeout: 60000,
  webServer: {
    command: "npm run build && npm run start -- --port 3011",
    url: "http://127.0.0.1:3011",
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://supabase.pracapp.test",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "playwright-mock-key",
    },
    timeout: 90000,
  },
});
