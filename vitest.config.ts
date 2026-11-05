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
    // `isolate: true` es requerido: varios archivos de test mockean los mismos
    // módulos (next-auth/react, next/navigation, @/app/Utils/AccionPrincipalContext)
    // con factories distintas. Sin aislamiento, el primer factory queda cementado
    // en la caché de módulos compartida y los demás archivos ven mocks ajenos.
    isolate: true,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/app/types/**",
        "src/**/*.d.ts",
        "src/app/Utils/data/**",
      ],
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      // Umbrales fijados ~5 puntos bajo la medición inicial
      // (2026-06-12: stmts 59.5 / branches 53.3 / funcs 59.8 / lines 62.0).
      // Política ratchet: al subir la cobertura, subir los umbrales (nunca bajarlos).
      thresholds: {
        lines: 57,
        statements: 54,
        functions: 54,
        branches: 48,
      },
    },
  },
});

