import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/users/route";

describe("GET /api/users", () => {
  it("returns 200 with empty users array (stub)", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.users).toEqual([]);
  });
});

describe("POST /api/users", () => {
  it("returns 201 with created flag and request body", async () => {
    const payload = { email: "new@example.com", name: "New User" };
    const request = new Request("http://localhost/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.created).toBe(true);
    expect(body.email).toBe("new@example.com");
    expect(body.name).toBe("New User");
  });
});
