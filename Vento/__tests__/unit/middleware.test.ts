import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("middleware", () => {
  it("re-exports auth as middleware", async () => {
    const mod = await import("@/middleware");
    expect(mod.middleware).toBeDefined();
    expect(typeof mod.middleware).toBe("function");
  });

  it("protects only /dashboard routes via matcher", async () => {
    const { config } = await import("@/middleware");
    expect(config).toBeDefined();
    expect(config.matcher).toEqual(["/dashboard/:path*"]);
  });

  it("does not match root or other routes", async () => {
    const { config } = await import("@/middleware");
    const matchers = config.matcher as string[];
    expect(matchers).not.toContain("/");
    expect(matchers).not.toContain("/api/:path*");
    expect(matchers).not.toContain("/login");
  });
});
