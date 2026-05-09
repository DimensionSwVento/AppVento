import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

describe("Admin user by id route", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("PUT returns 403 when requester is not admin", async () => {
    authMock.mockResolvedValue(null);
    const { PUT } = await import("@/app/api/admin/users/[id]/route");

    const req = new Request("http://localhost/api/admin/users/u1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Ana" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "u1" }) });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "No autorizado" });
  });

  it("DELETE returns 403 when requester is not admin", async () => {
    authMock.mockResolvedValue({ roles: ["analista"] });
    const { DELETE } = await import("@/app/api/admin/users/[id]/route");

    const req = new Request("http://localhost/api/admin/users/u1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "u1" }) });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "No autorizado" });
  });

  it("PUT returns 400 for invalid app role before touching Keycloak", async () => {
    authMock.mockResolvedValue({ roles: ["admin"] });
    const { PUT } = await import("@/app/api/admin/users/[id]/route");

    const req = new Request("http://localhost/api/admin/users/u1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "superadmin" }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "u1" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Rol inválido/i);
  });
});
