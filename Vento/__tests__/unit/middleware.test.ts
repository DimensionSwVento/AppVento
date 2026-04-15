import { describe, it, expect, vi, beforeEach } from "vitest";

type AuthCallback = (req: {
  auth: { roles?: string[] } | null;
  nextUrl: URL;
}) => Response | undefined;

let capturedCallback: AuthCallback;

vi.mock("@/auth", () => ({
  auth: (cb: AuthCallback) => {
    capturedCallback = cb;
    return cb;
  },
}));

function callMiddleware(
  pathname: string,
  auth: { roles?: string[] } | null
): Response | undefined {
  const url = new URL(pathname, "http://localhost:3000");
  return capturedCallback({ auth, nextUrl: url });
}

beforeEach(async () => {
  await import("@/middleware");
});

describe("middleware — matcher config", () => {
  it("protects dashboard, admin and dimensions routes", async () => {
    const { config } = await import("@/middleware");
    expect(config.matcher).toEqual([
      "/dashboard/:path*",
      "/admin/:path*",
      "/dimensions/:path*",
    ]);
  });

  it("does not match root, api, or login", async () => {
    const { config } = await import("@/middleware");
    const matchers = config.matcher as string[];
    expect(matchers).not.toContain("/");
    expect(matchers).not.toContain("/api/:path*");
    expect(matchers).not.toContain("/login");
  });
});

describe("middleware — unauthenticated user", () => {
  it("redirects to / from /dashboard", () => {
    const res = callMiddleware("/dashboard", null);
    expect(res).toBeInstanceOf(Response);
    expect(res!.status).toBeGreaterThanOrEqual(300);
    expect(res!.status).toBeLessThan(400);
    expect(new URL(res!.headers.get("location")!).pathname).toBe("/");
  });

  it("redirects to / from /admin/users", () => {
    const res = callMiddleware("/admin/users", null);
    expect(new URL(res!.headers.get("location")!).pathname).toBe("/");
  });

  it("redirects to / from /dimensions", () => {
    const res = callMiddleware("/dimensions", null);
    expect(new URL(res!.headers.get("location")!).pathname).toBe("/");
  });
});

describe("middleware — authenticated user without admin role", () => {
  it("allows /dashboard", () => {
    const res = callMiddleware("/dashboard", { roles: ["analista"] });
    expect(res).toBeUndefined();
  });

  it("allows /dimensions", () => {
    const res = callMiddleware("/dimensions", { roles: ["analista"] });
    expect(res).toBeUndefined();
  });

  it("redirects to /not-authorized from /admin/users", () => {
    const res = callMiddleware("/admin/users", { roles: ["analista"] });
    expect(res).toBeInstanceOf(Response);
    expect(new URL(res!.headers.get("location")!).pathname).toBe("/not-authorized");
  });
});

describe("middleware — admin user", () => {
  it("allows /dashboard", () => {
    const res = callMiddleware("/dashboard", { roles: ["admin"] });
    expect(res).toBeUndefined();
  });

  it("allows /admin/users", () => {
    const res = callMiddleware("/admin/users", { roles: ["admin"] });
    expect(res).toBeUndefined();
  });

  it("allows /dimensions", () => {
    const res = callMiddleware("/dimensions", { roles: ["admin"] });
    expect(res).toBeUndefined();
  });
});
