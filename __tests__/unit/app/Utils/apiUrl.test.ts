import { describe, it, expect, vi, afterEach } from "vitest";

// API_BASE se lee al cargar el módulo → hay que re-importarlo con
// vi.resetModules para probar cada valor del env.
describe("apiUrl — API_BASE", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("usa NEXT_PUBLIC_API_URL cuando está definida", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
    const { API_BASE } = await import("@/app/Utils/apis/apiUrl");
    expect(API_BASE).toBe("http://localhost:8000");
  });

  it("cae a cadena vacía (same-origin) sin la variable", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { API_BASE } = await import("@/app/Utils/apis/apiUrl");
    expect(API_BASE).toBe("");
  });
});
