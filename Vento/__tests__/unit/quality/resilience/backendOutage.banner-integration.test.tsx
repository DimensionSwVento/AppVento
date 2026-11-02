import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Resilience — end-to-end fault injection across the real BFF wiring.
//
// The browser-side `fetch` is routed to the REAL Next route handlers of this repo
// (`/api/health` and `/api/tiles/[...path]` → `proxyBackend`). The injected fault
// is at the very bottom: the private FastAPI backend is unreachable (the
// server-side fetch to BACKEND_URL rejects). Only the browser → Next hop is
// simulated; every handler in between is product code.
//
// Expected product behaviour (documented in BackendStatusBanner.tsx: "Cartel global
// de 'servidor caído' … tras 2 fallos seguidos muestra una franja de error para que
// la app NO parezca rota (antes: pantallas en 0 sin aviso)"): with the backend
// down for two polling periods, the user sees "Reconectando con el servidor…".

const { authMock } = vi.hoisted(() => {
  process.env.BACKEND_URL = "http://fastapi.internal:8000";
  process.env.INTERNAL_API_SECRET = "s3cret";
  return { authMock: vi.fn() };
});
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/app/Utils/projectData", async (orig) => ({
  ...(await orig<typeof import("@/app/Utils/projectData")>()),
  USE_BACKEND: true,
}));

import BackendStatusBanner from "@/app/Components/ui/BackendStatusBanner";
import * as healthRoute from "@/app/api/health/route";
import * as tilesRoute from "@/app/api/tiles/[...path]/route";

const BACKEND = "http://fastapi.internal:8000";
const POLL_MS = 30_000;

/** Browser fetch → real Next route handlers; server fetch → injected backend outage. */
function wireNextWithBackendDown() {
  const backendCalls: string[] = [];
  const browserCalls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith(BACKEND)) {
      backendCalls.push(url);
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    }
    browserCalls.push(url);
    const req = new Request(new URL(url, "http://localhost:3000"), init);
    const { pathname } = new URL(req.url);
    if (pathname === "/api/health") return healthRoute.GET();
    if (pathname.startsWith("/api/tiles/")) {
      const path = pathname.replace("/api/tiles/", "").split("/");
      return tilesRoute.GET(req, { params: Promise.resolve({ path }) });
    }
    return new Response("not found", { status: 404 });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { backendCalls, browserCalls };
}

describe("Backend outage → user-visible degraded state (BFF integration)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    authMock.mockResolvedValue({ sub: "user-1", roles: [] });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("precondition: with FastAPI down, spatial data requests through the BFF fail with 502", async () => {
    wireNextWithBackendDown();
    const res = await fetch("/api/tiles/warmup");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "backend_unreachable" });
  });

  it("with FastAPI down for two polling periods, the 'Reconectando con el servidor' banner is shown", async () => {
    const { browserCalls } = wireNextWithBackendDown();
    render(<BackendStatusBanner />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    });
    // The banner did probe (so the failure is not "banner disabled")…
    expect(browserCalls.length).toBeGreaterThanOrEqual(2);
    // …but it must report the outage of the data backend to the user.
    expect(screen.queryByText(/Reconectando con el servidor/i)).toBeInTheDocument();
  });
});
