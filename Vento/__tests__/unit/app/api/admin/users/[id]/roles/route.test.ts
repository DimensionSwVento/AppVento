import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

describe("Admin user roles route", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("returns 403 when requester is not admin", async () => {
    authMock.mockResolvedValue({ roles: ["analista"] });
    const { GET } = await import("@/app/api/admin/users/[id]/roles/route");

    const req = new Request("http://localhost/api/admin/users/u1/roles", {
      method: "GET",
    });
    const res = await GET(req, { params: Promise.resolve({ id: "u1" }) });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "No autorizado" });
  });
});
