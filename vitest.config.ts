import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
  },
});
