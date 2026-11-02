import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// Resilience — controlled failure (fault injection) and recovery of the global
// "server down" banner. The banner only probes in backend mode, so the flag is
// forced on; the probe (`fetch`) is the injected fault point.
vi.mock("@/app/Utils/projectData", async (orig) => ({
  ...(await orig<typeof import("@/app/Utils/projectData")>()),
  USE_BACKEND: true,
}));

import BackendStatusBanner from "@/app/Components/ui/BackendStatusBanner";

const POLL_MS = 30_000;
const PROBE_TIMEOUT_MS = 8_000;
const BANNER_TEXT = /Reconectando con el servidor/i;

type Fault = "ok" | "reject" | "http500" | "http503" | "hang";

/** Programmable fault injector: each probe consumes the next scripted outcome. */
function installFaultInjector(script: Fault[]) {
  const calls: { url: string; signal?: AbortSignal }[] = [];
  let i = 0;
  const fetchMock = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), signal: init?.signal ?? undefined });
    const fault = script[Math.min(i, script.length - 1)];
    i += 1;
    switch (fault) {
      case "ok":
        return Promise.resolve(new Response(JSON.stringify({ status: "ok" }), { status: 200 }));
      case "http500":
        return Promise.resolve(new Response("boom", { status: 500 }));
      case "http503":
        return Promise.resolve(new Response("unavailable", { status: 503 }));
      case "reject":
        return Promise.reject(new TypeError("Failed to fetch"));
      case "hang":
        // Never answers on its own; only the banner's AbortController ends it.
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        });
    }
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, calls };
}

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("BackendStatusBanner — fault injection and recovery", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it("healthy backend: probes /api/tiles/warmup without cache and never shows the banner", async () => {
    const { calls } = installFaultInjector(["ok"]);
    render(<BackendStatusBanner />);
    await tick(0);
    await tick(POLL_MS * 3);
    expect(calls.length).toBe(4);
    expect(calls.every((c) => c.url === "/api/tiles/warmup")).toBe(true);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it("a single transient failure (blip) does not raise the banner", async () => {
    installFaultInjector(["reject", "ok", "ok"]);
    render(<BackendStatusBanner />);
    await tick(0);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    await tick(POLL_MS);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it.each<[string, Fault]>([
    ["network error (fetch rejects)", "reject"],
    ["HTTP 500", "http500"],
    ["HTTP 503", "http503"],
  ])("two consecutive faults of type %s raise a polite status banner", async (_label, fault) => {
    installFaultInjector([fault, fault]);
    render(<BackendStatusBanner />);
    await tick(0);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    await tick(POLL_MS);
    const banner = screen.getByRole("status");
    expect(banner).toHaveTextContent(BANNER_TEXT);
    // Non-alarming and non-blocking: polite live region, container lets clicks through.
    expect(banner).toHaveAttribute("aria-live", "polite");
    expect(banner.className).toContain("pointer-events-none");
  });

  it("a hanging backend is cut by the 8 s probe timeout and counted as a failure", async () => {
    const { calls } = installFaultInjector(["hang", "hang"]);
    render(<BackendStatusBanner />);
    await tick(0);
    expect(calls[0].signal?.aborted).toBe(false);
    await tick(PROBE_TIMEOUT_MS);
    expect(calls[0].signal?.aborted).toBe(true);
    await tick(POLL_MS); // second probe starts at 30 s and is aborted at 38 s
    expect(calls[1].signal?.aborted).toBe(true);
    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
  });

  it("does not stack probes while a previous one is still in flight", async () => {
    // A probe that never settles and ignores abort: models a stuck connection.
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(<BackendStatusBanner />);
    await tick(0);
    await tick(POLL_MS * 5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recovery: the banner disappears on the first successful probe after an outage", async () => {
    installFaultInjector(["reject", "http503", "http500", "ok", "ok"]);
    render(<BackendStatusBanner />);
    await tick(0);
    await tick(POLL_MS);
    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
    await tick(POLL_MS); // third failure: still down
    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
    await tick(POLL_MS); // backend is back
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    await tick(POLL_MS);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it("recovery resets the failure counter: a new single blip after recovery stays hidden", async () => {
    installFaultInjector(["reject", "reject", "ok", "reject", "ok"]);
    render(<BackendStatusBanner />);
    await tick(0);
    await tick(POLL_MS);
    expect(screen.getByText(BANNER_TEXT)).toBeInTheDocument();
    await tick(POLL_MS);
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    await tick(POLL_MS); // one isolated failure after recovery
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it("stops polling after unmount (no leaked timers)", async () => {
    const { fetchMock } = installFaultInjector(["ok"]);
    const { unmount } = render(<BackendStatusBanner />);
    await tick(0);
    unmount();
    await tick(POLL_MS * 4);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
