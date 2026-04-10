import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    name: "unit",
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    include: ["__tests__/unit/**/*.{test,spec}.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
