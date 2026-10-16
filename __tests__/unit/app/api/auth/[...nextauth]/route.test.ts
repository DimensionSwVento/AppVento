import { describe, it, expect, vi } from "vitest";

vi.mock("@/auth", () => ({
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

describe("NextAuth route handlers", () => {
  it("exports GET handler", async () => {
    const mod = await import("@/app/api/auth/[...nextauth]/route");
    expect(mod.GET).toBeDefined();
    expect(typeof mod.GET).toBe("function");
  });

  it("exports POST handler", async () => {
    const mod = await import("@/app/api/auth/[...nextauth]/route");
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe("function");
  });
});
