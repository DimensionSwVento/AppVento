import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env.AUTH_KEYCLOAK_ISSUER = "http://localhost:8080/realms/vento";
  process.env.AUTH_KEYCLOAK_ID = "vento-web";
  delete process.env.AUTH_URL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function makeRequest(origin: string, forwardedProto?: string, forwardedHost?: string): import("next/server").NextRequest {
  const headers = new Headers();
  if (forwardedProto) headers.set("x-forwarded-proto", forwardedProto);
  if (forwardedHost) headers.set("x-forwarded-host", forwardedHost);
  return {
    headers,
    nextUrl: new URL(`${origin}/api/auth/kc-logout`),
    url: `${origin}/api/auth/kc-logout`,
  } as unknown as import("next/server").NextRequest;
}

describe("GET /api/auth/kc-logout", () => {
  it("redirige a Keycloak con issuer reescrito a HTTPS, client_id y post_logout_redirect_uri", async () => {
    const { GET } = await import("@/app/api/auth/kc-logout/route");
    const req = makeRequest("http://localhost:3000");
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toContain("https://localhost:8080/realms/vento/protocol/openid-connect/logout");
    expect(location).toContain("client_id=vento-web");
    expect(location).toContain(`post_logout_redirect_uri=${encodeURIComponent("http://localhost:3000/")}`);
  });

  it("prioriza AUTH_URL sobre x-forwarded-* y nextUrl.origin", async () => {
    process.env.AUTH_URL = "https://vento.dominio.com";
    const { GET } = await import("@/app/api/auth/kc-logout/route");
    const req = makeRequest("http://internal-host", "https", "otra-cosa");
    const res = await GET(req);
    const location = res.headers.get("location")!;
    expect(location).toContain(`post_logout_redirect_uri=${encodeURIComponent("https://vento.dominio.com/")}`);
  });

  it("usa x-forwarded-* cuando AUTH_URL no está definido", async () => {
    const { GET } = await import("@/app/api/auth/kc-logout/route");
    const req = makeRequest("http://internal-host", "https", "vento.proxy.com");
    const res = await GET(req);
    const location = res.headers.get("location")!;
    expect(location).toContain(`post_logout_redirect_uri=${encodeURIComponent("https://vento.proxy.com/")}`);
  });

  it("redirige a / si faltan variables de entorno críticas", async () => {
    delete process.env.AUTH_KEYCLOAK_ISSUER;
    const { GET } = await import("@/app/api/auth/kc-logout/route");
    const req = makeRequest("http://localhost:3000");
    const res = await GET(req);
    expect(res.status).toBe(307);
    const location = res.headers.get("location")!;
    expect(location).toMatch(/^http:\/\/localhost:3000\/$|\/api\/auth\/kc-logout\/?$/);
    expect(location).not.toContain("protocol/openid-connect/logout");
  });
});
