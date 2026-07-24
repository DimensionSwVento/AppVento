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
    const { API_BASE } = await import("./apiUrl");
    expect(API_BASE).toBe("http://localhost:8000");
  });

  it("cae a cadena vacía (same-origin) sin la variable", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { API_BASE } = await import("./apiUrl");
    expect(API_BASE).toBe("");
  });

  it("construye una URL normalizada con base configurada", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/");
    const { apiUrl } = await import("./apiUrl");
    expect(apiUrl("/api/tiles/detail/abc")).toBe(
      "http://localhost:8000/api/tiles/detail/abc",
    );
  });

  it("conserva rutas same-origin cuando no hay base", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { apiUrl } = await import("./apiUrl");
    expect(apiUrl("api/tiles/detail/abc")).toBe("/api/tiles/detail/abc");
  });
});
