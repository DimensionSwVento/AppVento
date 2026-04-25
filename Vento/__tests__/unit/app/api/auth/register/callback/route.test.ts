import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.AUTH_KEYCLOAK_ISSUER = "http://localhost:8080/realms/vento";
  process.env.AUTH_KEYCLOAK_ID = "vento-web";
  process.env.AUTH_KEYCLOAK_SECRET = "dev-secret";
  delete process.env.AUTH_URL;
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

type QS = Record<string, string | undefined>;

function makeRequest(
  origin: string,
  search: QS,
  cookieState?: string,
  forwarded?: { proto?: string; host?: string },
): import("next/server").NextRequest {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(search)) if (v) sp.set(k, v);
  const url = `${origin}/api/auth/register/callback${sp.toString() ? `?${sp.toString()}` : ""}`;
  const nextUrl = new URL(url);
  const headers = new Headers();
  if (forwarded?.proto) headers.set("x-forwarded-proto", forwarded.proto);
  if (forwarded?.host) headers.set("x-forwarded-host", forwarded.host);

  return {
    headers,
    cookies: {
      get: (name: string) =>
        cookieState !== undefined && name === "vento_register_state"
          ? { name, value: cookieState }
          : undefined,
    },
    nextUrl,
    url,
  } as unknown as import("next/server").NextRequest;
}

function mockTokenExchange(body: Record<string, unknown> | null, ok = true) {
  globalThis.fetch = vi.fn(async () =>
    ({
      ok,
      status: ok ? 200 : 400,
      async json() {
        return body ?? {};
      },
      async text() {
        return "";
      },
    }) as unknown as Response,
  ) as unknown as typeof fetch;
}

describe("GET /api/auth/register/callback", () => {
  it("redirige a Keycloak logout con id_token_hint y post_logout_redirect=/registration-success", async () => {
    mockTokenExchange({ id_token: "id-token-value" });
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://localhost:3000",
      { code: "abc", state: "s1" },
      "s1",
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    const loc = res.headers.get("location")!;
    expect(loc).toContain(
      "https://localhost:8080/realms/vento/protocol/openid-connect/logout",
    );
    expect(loc).toContain("client_id=vento-web");
    expect(loc).toContain(
      `post_logout_redirect_uri=${encodeURIComponent("http://localhost:3000/registration-success")}`,
    );
    expect(loc).toContain("id_token_hint=id-token-value");
  });

  it("hace fetch al token endpoint INTERNO (HTTP, sin rewrite) con grant_type=authorization_code", async () => {
    const fetchMock = vi.fn(async () =>
      ({
        ok: true,
        async json() {
          return { id_token: "x" };
        },
        async text() {
          return "";
        },
      }) as unknown as Response,
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://localhost:3000",
      { code: "abc", state: "s1" },
      "s1",
    );
    await GET(req);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://localhost:8080/realms/vento/protocol/openid-connect/token");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const body = (init.body as URLSearchParams).toString();
    expect(body).toContain("grant_type=authorization_code");
    expect(body).toContain("code=abc");
    expect(body).toContain("client_id=vento-web");
    expect(body).toContain("client_secret=dev-secret");
    expect(body).toContain(
      `redirect_uri=${encodeURIComponent("http://localhost:3000/api/auth/register/callback")}`,
    );
  });

  it("redirige a /?error=register_state si el state de la cookie no coincide (CSRF)", async () => {
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://localhost:3000",
      { code: "abc", state: "s1" },
      "OTRO",
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("/?error=register_state");
  });

  it("redirige a /?error=register_state si no hay cookie de state", async () => {
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest("http://localhost:3000", {
      code: "abc",
      state: "s1",
    });
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("/?error=register_state");
  });

  it("redirige a / con error=register_<error> si Keycloak devuelve error (ej. access_denied)", async () => {
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://localhost:3000",
      { error: "access_denied" },
      "s1",
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toContain(
      "/?error=register_access_denied",
    );
  });

  it("redirige a /?error=register_missing_code si falta code o state", async () => {
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest("http://localhost:3000", { code: "abc" }, "s1");
    const res = await GET(req);
    expect(res.headers.get("location")).toContain(
      "/?error=register_missing_code",
    );
  });

  it("redirige a /?error=register_token_exchange si el token endpoint falla", async () => {
    mockTokenExchange(null, false);
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://localhost:3000",
      { code: "abc", state: "s1" },
      "s1",
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toContain(
      "/?error=register_token_exchange",
    );
  });

  it("completa el flujo aun si Keycloak no devuelve id_token (solo omite id_token_hint)", async () => {
    mockTokenExchange({});
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://localhost:3000",
      { code: "abc", state: "s1" },
      "s1",
    );
    const res = await GET(req);

    const loc = res.headers.get("location")!;
    expect(loc).toContain("protocol/openid-connect/logout");
    expect(loc).not.toContain("id_token_hint=");
  });

  it("limpia la cookie vento_register_state en TODAS las ramas de salida", async () => {
    mockTokenExchange({ id_token: "x" });
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://localhost:3000",
      { code: "abc", state: "s1" },
      "s1",
    );
    const res = await GET(req);
    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/vento_register_state=;/);
    expect(setCookie.toLowerCase()).toContain("max-age=0");
  });

  it("usa AUTH_URL para construir post_logout_redirect_uri cuando existe", async () => {
    process.env.AUTH_URL = "https://vento.dominio.com";
    mockTokenExchange({ id_token: "x" });
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://internal-host",
      { code: "abc", state: "s1" },
      "s1",
    );
    const res = await GET(req);
    const loc = res.headers.get("location")!;
    expect(loc).toContain(
      `post_logout_redirect_uri=${encodeURIComponent("https://vento.dominio.com/registration-success")}`,
    );
  });

  it("redirige a /?error=register_config si faltan env vars criticas", async () => {
    delete process.env.AUTH_KEYCLOAK_SECRET;
    const { GET } = await import("@/app/api/auth/register/callback/route");
    const req = makeRequest(
      "http://localhost:3000",
      { code: "abc", state: "s1" },
      "s1",
    );
    const res = await GET(req);
    expect(res.headers.get("location")).toContain("/?error=register_config");
  });
});
