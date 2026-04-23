import { describe, it, expect, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.AUTH_KEYCLOAK_ISSUER = "http://localhost:8080/realms/vento";
  process.env.AUTH_KEYCLOAK_ID = "vento-web";
  delete process.env.AUTH_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function makeRequest(
  origin: string,
  forwardedProto?: string,
  forwardedHost?: string,
): import("next/server").NextRequest {
  const headers = new Headers();
  if (forwardedProto) headers.set("x-forwarded-proto", forwardedProto);
  if (forwardedHost) headers.set("x-forwarded-host", forwardedHost);
  return {
    headers,
    cookies: { get: () => undefined },
    nextUrl: new URL(`${origin}/api/auth/register`),
    url: `${origin}/api/auth/register`,
  } as unknown as import("next/server").NextRequest;
}

describe("GET /api/auth/register", () => {
  it("redirige al endpoint /registrations de Keycloak (no /auth, no kc_action=register)", async () => {
    const { GET } = await import("@/app/api/auth/register/route");
    const req = makeRequest("http://localhost:3000");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    // Debe usar el endpoint /registrations, NO /auth
    expect(location).toContain(
      "https://localhost:8080/realms/vento/protocol/openid-connect/registrations",
    );
    // kc_action=register NO debe estar (causa kc_action_status=error en Keycloak 26)
    expect(location).not.toContain("kc_action=register");
    expect(location).toContain("client_id=vento-web");
    expect(location).toContain("response_type=code");
    expect(location).toContain("scope=openid+email+profile");
    expect(location).toContain(
      `redirect_uri=${encodeURIComponent("http://localhost:3000/api/auth/register/callback")}`,
    );
    expect(location).toMatch(/state=[0-9a-f-]+/);
  });

  it("setea cookie vento_register_state httpOnly con path scope al callback", async () => {
    const { GET } = await import("@/app/api/auth/register/route");
    const req = makeRequest("http://localhost:3000");
    const res = await GET(req);

    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toContain("vento_register_state=");
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie).toContain("Path=/api/auth/register");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
  });

  it("prioriza AUTH_URL sobre x-forwarded-* y nextUrl.origin para redirect_uri", async () => {
    process.env.AUTH_URL = "https://vento.dominio.com";
    const { GET } = await import("@/app/api/auth/register/route");
    const req = makeRequest("http://internal-host", "http", "otra-cosa");
    const res = await GET(req);
    const location = res.headers.get("location")!;
    expect(location).toContain(
      `redirect_uri=${encodeURIComponent("https://vento.dominio.com/api/auth/register/callback")}`,
    );
  });

  it("usa x-forwarded-* cuando AUTH_URL no esta definido", async () => {
    const { GET } = await import("@/app/api/auth/register/route");
    const req = makeRequest("http://internal-host", "https", "vento.proxy.com");
    const res = await GET(req);
    const location = res.headers.get("location")!;
    expect(location).toContain(
      `redirect_uri=${encodeURIComponent("https://vento.proxy.com/api/auth/register/callback")}`,
    );
  });

  it("redirige a / con error=register_config si faltan env vars", async () => {
    delete process.env.AUTH_KEYCLOAK_ISSUER;
    const { GET } = await import("@/app/api/auth/register/route");
    const req = makeRequest("http://localhost:3000");
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("/?error=register_config");
    expect(location).not.toContain("protocol/openid-connect/registrations");
  });

  it("cada invocacion genera un state distinto (CSRF no reutilizable)", async () => {
    const { GET } = await import("@/app/api/auth/register/route");
    const req1 = makeRequest("http://localhost:3000");
    const req2 = makeRequest("http://localhost:3000");
    const res1 = await GET(req1);
    const res2 = await GET(req2);

    const state1 = /state=([^&]+)/.exec(res1.headers.get("location")!)![1];
    const state2 = /state=([^&]+)/.exec(res2.headers.get("location")!)![1];
    expect(state1).not.toEqual(state2);
  });
});
