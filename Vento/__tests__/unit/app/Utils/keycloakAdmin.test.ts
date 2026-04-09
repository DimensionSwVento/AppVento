import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "https://kc.example.com/realms/vento");
  vi.stubEnv("AUTH_KEYCLOAK_ID", "vento-web");
  vi.stubEnv("AUTH_KEYCLOAK_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  mockFetch.mockReset();
});

// Helper: simulate a successful token response followed by an API response
function mockTokenThenApi(apiResponse: Response) {
  // First call = token endpoint
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ access_token: "mock-token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
  // Second call = actual Keycloak Admin API
  mockFetch.mockResolvedValueOnce(apiResponse);
}

function mockTokenThenApiSequence(...responses: Response[]) {
  // First call = token endpoint (shared for the initial call)
  for (const res of responses) {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "mock-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    mockFetch.mockResolvedValueOnce(res);
  }
}

// ── Imports (after mocks) ────────────────────────────────────────────

import {
  getUsers,
  getUserCount,
  createUser,
  updateUser,
  getUserRoles,
  getAvailableRealmRoles,
  assignRealmRole,
  removeRealmRole,
  resetUserPassword,
  KeycloakAdminError,
} from "@/app/Utils/keycloakAdmin";

// ── Tests ────────────────────────────────────────────────────────────

describe("KeycloakAdminError", () => {
  it("stores status and message", () => {
    const err = new KeycloakAdminError("forbidden", 403);
    expect(err.message).toBe("forbidden");
    expect(err.status).toBe(403);
    expect(err.name).toBe("KeycloakAdminError");
  });
});

describe("getUsers", () => {
  it("fetches users with default pagination", async () => {
    const users = [{ id: "1", username: "test@test.com" }];
    mockTokenThenApi(
      new Response(JSON.stringify(users), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await getUsers();

    expect(result).toEqual(users);
    // Verify the API URL used
    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toContain("/admin/realms/vento/users?first=0&max=20");
  });

  it("passes search and pagination params", async () => {
    mockTokenThenApi(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await getUsers("john", 2, 10);

    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toContain("first=10");
    expect(apiCall[0]).toContain("max=10");
    expect(apiCall[0]).toContain("search=john");
  });

  it("throws KeycloakAdminError on failure", async () => {
    mockTokenThenApi(
      new Response('{"error":"not found"}', {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(getUsers()).rejects.toThrow(KeycloakAdminError);
  });
});

describe("getUserCount", () => {
  it("returns user count", async () => {
    mockTokenThenApi(
      new Response("42", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const count = await getUserCount();
    expect(count).toBe(42);
  });
});

describe("createUser", () => {
  it("returns user ID from Location header", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "mock-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    mockFetch.mockResolvedValueOnce(
      new Response(null, {
        status: 201,
        headers: {
          Location:
            "https://kc.example.com/admin/realms/vento/users/new-user-id-123",
        },
      })
    );

    const id = await createUser({
      username: "test@test.com",
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
    });

    expect(id).toBe("new-user-id-123");
  });

  it("throws 409 on duplicate email", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: "mock-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    mockFetch.mockResolvedValueOnce(
      new Response("Conflict", { status: 409 })
    );

    await expect(
      createUser({ username: "dup@test.com", email: "dup@test.com" })
    ).rejects.toThrow("El correo o usuario ya existe");
  });
});

describe("updateUser", () => {
  it("sends PUT with user data", async () => {
    mockTokenThenApi(new Response(null, { status: 204 }));

    await updateUser("user-id", { firstName: "Updated" });

    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toContain("/users/user-id");
    expect(apiCall[1].method).toBe("PUT");
    expect(JSON.parse(apiCall[1].body)).toEqual({ firstName: "Updated" });
  });
});

describe("getUserRoles", () => {
  it("returns realm role mappings for a user", async () => {
    const roles = [
      { id: "r1", name: "admin", composite: false, clientRole: false, containerId: "vento" },
    ];
    mockTokenThenApi(
      new Response(JSON.stringify(roles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await getUserRoles("user-id");
    expect(result).toEqual(roles);

    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toContain("/users/user-id/role-mappings/realm");
  });
});

describe("getAvailableRealmRoles", () => {
  it("fetches available roles using user-scoped endpoint", async () => {
    const available = [
      { id: "r2", name: "analista", composite: false, clientRole: false, containerId: "vento" },
    ];
    mockTokenThenApi(
      new Response(JSON.stringify(available), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await getAvailableRealmRoles("user-id");
    expect(result).toEqual(available);

    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toContain("/users/user-id/role-mappings/realm/available");
  });
});

describe("assignRealmRole", () => {
  it("finds role from available roles and POSTs assignment", async () => {
    const availableRoles = [
      { id: "r1", name: "admin", composite: false, clientRole: false, containerId: "vento" },
      { id: "r2", name: "analista", composite: false, clientRole: false, containerId: "vento" },
    ];

    // Call 1: token + getAvailableRealmRoles
    mockTokenThenApi(
      new Response(JSON.stringify(availableRoles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    // Call 2: token + POST role-mappings
    mockTokenThenApi(new Response(null, { status: 204 }));

    await assignRealmRole("user-id", "analista");

    // The POST call is the 4th fetch call (token, available, token, post)
    const postCall = mockFetch.mock.calls[3];
    expect(postCall[0]).toContain("/users/user-id/role-mappings/realm");
    expect(postCall[1].method).toBe("POST");
    const body = JSON.parse(postCall[1].body);
    expect(body).toEqual([availableRoles[1]]);
  });

  it("throws 404 if role is not available (already assigned or non-existent)", async () => {
    const availableRoles = [
      { id: "r1", name: "admin", composite: false, clientRole: false, containerId: "vento" },
    ];

    mockTokenThenApi(
      new Response(JSON.stringify(availableRoles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    // We only need one expect here to verify the error.
    // If we call assignRealmRole twice, we need to mock the responses twice.
    await expect(assignRealmRole("user-id", "nonexistent")).rejects.toThrow(
      /no fue encontrado/
    );
  });
});

describe("removeRealmRole", () => {
  it("finds role from current roles and DELETEs it", async () => {
    const currentRoles = [
      { id: "r1", name: "admin", composite: false, clientRole: false, containerId: "vento" },
      { id: "r2", name: "analista", composite: false, clientRole: false, containerId: "vento" },
    ];

    // Call 1: token + getUserRoles
    mockTokenThenApi(
      new Response(JSON.stringify(currentRoles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    // Call 2: token + DELETE role-mappings
    mockTokenThenApi(new Response(null, { status: 204 }));

    await removeRealmRole("user-id", "admin");

    const deleteCall = mockFetch.mock.calls[3];
    expect(deleteCall[0]).toContain("/users/user-id/role-mappings/realm");
    expect(deleteCall[1].method).toBe("DELETE");
    const body = JSON.parse(deleteCall[1].body);
    expect(body).toEqual([currentRoles[0]]);
  });

  it("throws 404 if role is not currently assigned", async () => {
    const currentRoles = [
      { id: "r1", name: "admin", composite: false, clientRole: false, containerId: "vento" },
    ];

    mockTokenThenApi(
      new Response(JSON.stringify(currentRoles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(removeRealmRole("user-id", "analista")).rejects.toThrow(
      /no está asignado/
    );
  });
});

describe("resetUserPassword", () => {
  it("sends PUT with password payload", async () => {
    mockTokenThenApi(new Response(null, { status: 204 }));

    await resetUserPassword("user-id", "new-pass-123");

    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toContain("/users/user-id/reset-password");
    expect(apiCall[1].method).toBe("PUT");
    const body = JSON.parse(apiCall[1].body);
    expect(body).toEqual({
      type: "password",
      value: "new-pass-123",
      temporary: false,
    });
  });
});

describe("authentication", () => {
  it("throws when env variables are missing", async () => {
    vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "");
    vi.stubEnv("AUTH_KEYCLOAK_ID", "");
    vi.stubEnv("AUTH_KEYCLOAK_SECRET", "");

    await expect(getUsers()).rejects.toThrow("Missing Keycloak env variables");
  });
});
