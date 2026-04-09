import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: "unit",
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    include: ["__tests__/unit/**/*.{test,spec}.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
    isolate: false,
    fileParallelism: false,
  },
});

