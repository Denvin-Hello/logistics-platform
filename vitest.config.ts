import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    include: ["e2e/api/**/*.spec.ts"],
    exclude: ["e2e/vitest-global-setup.ts", "e2e/fixtures"],
    environment: "node",
    globalSetup: ["./e2e/vitest-global-setup.ts"],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
})
