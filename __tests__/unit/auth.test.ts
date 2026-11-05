import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Capture the config object that auth.ts passes to NextAuth()       */
/* ------------------------------------------------------------------ */

let capturedConfig: Record<string, unknown> = {};

vi.mock("next-auth", () => ({
  default: (cfg: Record<string, unknown>) => {
    capturedConfig = cfg;
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    };
  },
  __esModule: true,
}));

vi.mock("next-auth/providers/keycloak", () => ({
  default: (opts: Record<string, unknown>) => ({ id: "keycloak", ...opts }),
  __esModule: true,
}));

const decodeMock = vi.fn();
vi.mock("jose", () => ({
  decodeJwt: (...args: unknown[]) => decodeMock(...args),
}));

beforeEach(() => {
  vi.stubEnv("AUTH_KEYCLOAK_ID", "vento-app");
  vi.stubEnv("AUTH_KEYCLOAK_SECRET", "test-secret");
  vi.stubEnv("AUTH_KEYCLOAK_ISSUER", "https://kc.example.com/realms/vento");
});

/* ------------------------------------------------------------------ */
/*  Helpers to call callbacks from the captured config                 */
/* ------------------------------------------------------------------ */

type JwtCb = (params: {
  token: Record<string, unknown>;
  account?: Record<string, unknown> | null;
}) => Promise<Record<string, unknown>>;

type SessionCb = (params: {
  session: Record<string, unknown>;
  token: Record<string, unknown>;
}) => Promise<Record<string, unknown>>;

async function importAuth() {
  await import("@/auth");
  return capturedConfig;
}

/* ================================================================== */
/*  Tests                                                              */
/* ================================================================== */

describe("auth.ts — NextAuth configuration", () => {
  it("configures Keycloak as the sole provider", async () => {
    const cfg = await importAuth();
    const providers = cfg.providers as Array<{ id: string }>;
    expect(providers).toHaveLength(1);
    expect(providers[0].id).toBe("keycloak");
  });

  it("sets signIn page to '/'", async () => {
    const cfg = await importAuth();
    expect((cfg.pages as Record<string, string>).signIn).toBe("/");
  });
});

/* ---------- JWT callback ---------- */

describe("auth.ts — jwt callback", () => {
  let jwtCb: JwtCb;

  beforeEach(async () => {
    const cfg = await importAuth();
    jwtCb = (cfg.callbacks as { jwt: JwtCb }).jwt;
  });

  it("persists refresh token metadata and roles on initial sign-in", async () => {
    decodeMock.mockReturnValue({
      realm_access: { roles: ["admin", "analista"] },
    });

    const result = await jwtCb({
      token: { sub: "user-1" },
      account: {
        access_token: "at-123",
        id_token: "id-456",
        refresh_token: "rt-789",
        expires_at: 9999999999,
      },
    });

    expect(result.accessToken).toBeUndefined();
    expect(result.idToken).toBeUndefined();
    expect(result.refreshToken).toBe("rt-789");
    expect(result.expiresAt).toBe(9999999999);
    expect(result.roles).toEqual(["admin", "analista"]);
  });

  it("returns token as-is when still valid", async () => {
    const token = {
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    const result = await jwtCb({ token, account: null });
    expect(result).toBe(token);
  });

  it("refreshes token when expired", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "new-at",
          id_token: "new-id",
          refresh_token: "new-rt",
          expires_in: 300,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    decodeMock.mockReturnValue({
      realm_access: { roles: ["analista"] },
    });

    const token = {
      refreshToken: "old-rt",
      expiresAt: 0,
    };

    const result = await jwtCb({ token, account: null });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result.accessToken).toBeUndefined();
    expect(result.idToken).toBeUndefined();
    expect(result.refreshToken).toBe("new-rt");
    expect(result.roles).toEqual(["analista"]);
    expect(result.error).toBeUndefined();

    fetchSpy.mockRestore();
  });

  it("returns RefreshTokenError when refresh fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }),
    );
    decodeMock.mockReturnValue({});

    const token = {
      refreshToken: "expired-rt",
      expiresAt: 0,
    };

    const result = await jwtCb({ token, account: null });
    expect(result.error).toBe("RefreshTokenError");

    fetchSpy.mockRestore();
  });

  it("returns NoRefreshToken error when refreshToken is missing", async () => {
    const token = { expiresAt: 0 };
    const result = await jwtCb({ token, account: null });
    expect(result.error).toBe("NoRefreshToken");
  });

  it("extracts roles from id_token when access_token has none", async () => {
    decodeMock
      .mockReturnValueOnce({})
      .mockReturnValueOnce({ realm_access: { roles: ["analista"] } });

    const result = await jwtCb({
      token: { sub: "u1" },
      account: {
        access_token: "at",
        id_token: "id-with-roles",
        refresh_token: "rt",
        expires_at: 9999999999,
      },
    });

    expect(result.roles).toEqual(["analista"]);
  });

  it("returns empty roles when JWT decode throws", async () => {
    decodeMock.mockImplementation(() => {
      throw new Error("bad jwt");
    });

    const result = await jwtCb({
      token: { sub: "u1" },
      account: {
        access_token: "bad-jwt",
        id_token: null,
        refresh_token: "rt",
        expires_at: 9999999999,
      },
    });

    expect(result.roles).toEqual([]);
  });
});

/* ---------- Session callback ---------- */

describe("auth.ts — session callback", () => {
  it("copies only roles/error into session (tokens stay server-side)", async () => {
    const cfg = await importAuth();
    const sessionCb = (cfg.callbacks as { session: SessionCb }).session;

    const session: Record<string, unknown> = { user: { name: "test" } };
    const token = {
      roles: ["admin"],
      error: undefined,
    };

    const result = await sessionCb({ session, token });
    // accessToken se queda server-side en el JWT (cookie reduction)
    expect(result.accessToken).toBeUndefined();
    expect(result.idToken).toBeUndefined();
    expect(result.roles).toEqual(["admin"]);
    // error se pasa al cliente — lo usa SessionGuard para detectar refresh expirado
    expect(result.error).toBeUndefined();
  });

  it("propaga error del token a la session (usado por SessionGuard)", async () => {
    const cfg = await importAuth();
    const sessionCb = (cfg.callbacks as { session: SessionCb }).session;

    const session: Record<string, unknown> = {};
    const token = { error: "RefreshTokenError" };

    const result = await sessionCb({ session, token });
    expect(result.error).toBe("RefreshTokenError");
  });
});
