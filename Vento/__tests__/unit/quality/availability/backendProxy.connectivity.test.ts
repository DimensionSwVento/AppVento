// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Availability of the spatial data source as seen from the frontend: every map
// tile, area score and historial call reaches the private FastAPI backend through
// the BFF proxy (`proxyBackend`, used by /api/tiles/* and /api/historico). These
// tests exercise connectivity to that data source and how the BFF tolerates its
// faults (unreachable, 5xx, misconfiguration) without throwing to the caller.

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }));
vi.mock("@/auth", () => ({ auth: authMock }));

const BACKEND = "http://backend.internal:8000";
const SESSION = { sub: "user-123", roles: ["analyst", "admin"] };

async function loadProxy(env: { BACKEND_URL?: string; INTERNAL_API_SECRET?: string }) {
  vi.resetModules();
  vi.stubEnv("BACKEND_URL", env.BACKEND_URL ?? "");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "");
  vi.stubEnv("INTERNAL_API_SECRET", env.INTERNAL_API_SECRET ?? "s3cret");
  return import("@/app/Utils/apis/backendProxy");
}

async function loadTilesRoute(env: { BACKEND_URL?: string } = { BACKEND_URL: BACKEND }) {
  await loadProxy(env);
  return import("@/app/api/tiles/[...path]/route");
}

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });

describe("BFF proxy — connectivity to the spatial data source", () => {
  const originalFetch = globalThis.fetch;
  let upstream: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authMock.mockResolvedValue(SESSION);
    upstream = vi.fn();
    globalThis.fetch = upstream as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("reaches the configured backend with the verified identity and no caching", async () => {
    upstream.mockResolvedValue(
      new Response(JSON.stringify({ status: "ready" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { proxyBackend } = await loadProxy({ BACKEND_URL: BACKEND });
    const res = await proxyBackend("/api/tiles/warmup", { method: "GET" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ready" });
    expect(upstream).toHaveBeenCalledTimes(1);
    const [url, init] = upstream.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BACKEND}/api/tiles/warmup`);
    expect(init.cache).toBe("no-store");
    const h = new Headers(init.headers);
    expect(h.get("X-Internal-Secret")).toBe("s3cret");
    expect(h.get("X-User-Sub")).toBe("user-123");
    expect(h.get("X-User-Roles")).toBe("analyst,admin");
  });

  it("tiles route forwards the path segments and the query string to the data source", async () => {
    upstream.mockResolvedValue(new Response("[]", { status: 200 }));
    const { GET } = await loadTilesRoute();
    await GET(
      new Request("http://localhost/api/tiles/7/36/60?var=001_velocidad_de_viento"),
      ctx(["7", "36", "60"]),
    );
    expect(upstream.mock.calls[0][0]).toBe(
      `${BACKEND}/api/tiles/7/36/60?var=001_velocidad_de_viento`,
    );
  });

  it("tiles route forwards POST bodies (area queries) as JSON", async () => {
    upstream.mockResolvedValue(new Response("{}", { status: 200 }));
    const { POST } = await loadTilesRoute();
    const body = JSON.stringify({ hexes: ["874a8c4a1ffffff"] });
    await POST(
      new Request("http://localhost/api/tiles/area", { method: "POST", body }),
      ctx(["area"]),
    );
    const init = upstream.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(body);
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("unauthenticated callers get 401 and the data source is never contacted", async () => {
    authMock.mockResolvedValue(null);
    const { proxyBackend } = await loadProxy({ BACKEND_URL: BACKEND });
    const res = await proxyBackend("/api/tiles/counts");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe("BFF proxy — fault tolerance when the data source fails", () => {
  const originalFetch = globalThis.fetch;
  let upstream: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authMock.mockResolvedValue(SESSION);
    upstream = vi.fn();
    globalThis.fetch = upstream as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("missing backend configuration → 503 backend_not_configured (no request attempted)", async () => {
    const { proxyBackend } = await loadProxy({ BACKEND_URL: "" });
    const res = await proxyBackend("/api/tiles/warmup");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "backend_not_configured" });
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([
    ["connection refused", Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } })],
    ["DNS failure", Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } })],
    ["headers timeout", Object.assign(new Error("Headers Timeout Error"), { code: "UND_ERR_HEADERS_TIMEOUT" })],
  ])("unreachable data source (%s) → controlled 502 backend_unreachable, never throws", async (_l, err) => {
    upstream.mockRejectedValue(err);
    const { proxyBackend } = await loadProxy({ BACKEND_URL: BACKEND });
    const res = await proxyBackend("/api/tiles/7/36/60");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "backend_unreachable" });
  });

  it.each([500, 502, 503, 504])(
    "upstream HTTP %i is propagated with its status and body (the client can tell a failure)",
    async (status) => {
      upstream.mockResolvedValue(
        new Response(JSON.stringify({ detail: "db down" }), {
          status,
          headers: { "content-type": "application/json" },
        }),
      );
      const { proxyBackend } = await loadProxy({ BACKEND_URL: BACKEND });
      const res = await proxyBackend("/api/historico");
      expect(res.status).toBe(status);
      expect(res.ok).toBe(false);
      expect(await res.json()).toEqual({ detail: "db down" });
    },
  );

  it("an empty upstream body does not break the proxy", async () => {
    upstream.mockResolvedValue(new Response(null, { status: 204 }));
    const { proxyBackend } = await loadProxy({ BACKEND_URL: BACKEND });
    const res = await proxyBackend("/api/historico/abc", { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("the proxy is stateless across faults: after an outage the next request reaches the recovered backend", async () => {
    upstream
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 120 }), { status: 200 }));
    const { proxyBackend } = await loadProxy({ BACKEND_URL: BACKEND });
    expect((await proxyBackend("/api/tiles/counts")).status).toBe(502);
    expect((await proxyBackend("/api/tiles/counts")).status).toBe(503);
    const ok = await proxyBackend("/api/tiles/counts");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ total: 120 });
    expect(upstream).toHaveBeenCalledTimes(3);
  });
});
