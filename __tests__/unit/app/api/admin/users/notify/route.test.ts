import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const ORIGINAL_ENV = { ...process.env };

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

describe("POST /api/admin/users/notify", () => {
  beforeEach(() => {
    authMock.mockReset();
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns 403 when requester is not admin", async () => {
    authMock.mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/users/notify/route");

    const req = new Request("http://localhost/api/admin/users/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mail: "ana@test.com", name: "Ana" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "No autorizado" });
  });

  it("returns 400 when request payload is incomplete", async () => {
    authMock.mockResolvedValue({ roles: ["admin"] });
    const { POST } = await import("@/app/api/admin/users/notify/route");

    const req = new Request("http://localhost/api/admin/users/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mail: "ana@test.com" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Faltan campos requeridos/i);
  });

  it("returns 500 when SendGrid env vars are missing", async () => {
    authMock.mockResolvedValue({ roles: ["admin"] });
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_FROM_EMAIL;
    const { POST } = await import("@/app/api/admin/users/notify/route");

    const req = new Request("http://localhost/api/admin/users/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mail: "ana@test.com", name: "Ana" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/SendGrid incompleta/i);
  });

  it("returns 200 when SendGrid request succeeds", async () => {
    authMock.mockResolvedValue({ roles: ["admin"] });
    process.env.SENDGRID_API_KEY = "sg-test-key";
    process.env.SENDGRID_FROM_EMAIL = "noreply@test.com";

    globalThis.fetch = vi.fn(async () => {
      return {
        ok: true,
        status: 202,
        text: async () => "",
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const { POST } = await import("@/app/api/admin/users/notify/route");
    const req = new Request("http://localhost/api/admin/users/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mail: "ana@test.com", name: "Ana" }),
    });
    const res = await POST(req);

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://api.sendgrid.com/v3/mail/send");
    expect(init.method).toBe("POST");
    expect(res.status).toBe(200);
  });

  it("returns 502 when SendGrid responds with non-2xx", async () => {
    authMock.mockResolvedValue({ roles: ["admin"] });
    process.env.SENDGRID_API_KEY = "sg-test-key";
    process.env.SENDGRID_FROM_EMAIL = "noreply@test.com";

    globalThis.fetch = vi.fn(async () => {
      return {
        ok: false,
        status: 401,
        text: async () => '{"errors":[{"message":"unauthorized"}]}',
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const { POST } = await import("@/app/api/admin/users/notify/route");
    const req = new Request("http://localhost/api/admin/users/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mail: "ana@test.com", name: "Ana" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/Error enviando email/i);
  });
});
