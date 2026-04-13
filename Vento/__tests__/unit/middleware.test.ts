import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  // When auth receives a callback, it returns a middleware function.
  auth: () => () => {},
}));

describe("middleware", () => {
  it("exports auth as default middleware", async () => {
    const mod = await import("@/middleware");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("protects dashboard and admin routes via matcher", async () => {
    const { config } = await import("@/middleware");
    expect(config).toBeDefined();
    expect(config.matcher).toEqual(["/dashboard/:path*", "/admin/:path*"]);
  });

  it("does not match root or other routes", async () => {
    const { config } = await import("@/middleware");
    const matchers = config.matcher as string[];
    expect(matchers).not.toContain("/");
    expect(matchers).not.toContain("/api/:path*");
    expect(matchers).not.toContain("/login");
  });
});
