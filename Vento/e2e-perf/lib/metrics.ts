import fs from "node:fs";
import path from "node:path";
import type { Page, Request } from "@playwright/test";
import { CPU_THROTTLE, NETWORK_PROFILE, RESULTS_DIR, RUN_ID, targetInfo } from "./config";

export type ApiCall = {
  endpoint: string;
  start: number;
  end?: number;
  status?: number;
  bytes?: number;
  failed?: boolean;
  /** Espera al servidor (envío → primer byte). Alto = lento el BFF/backend; bajo = la espera fue en el navegador. */
  ttfb?: number;
};

type Pending = Set<Promise<void>>;

/** /api/tiles/detail/8a… → "detail"; /api/tiles/6/18/30 → "tile z/x/y". */
export function endpointOf(url: string): string {
  const p = new URL(url).pathname.replace(/^\/api\//, "");
  if (/^tiles\/\d+\/\d+\/\d+$/.test(p)) return "tiles z/x/y";
  if (p.startsWith("tiles/detail/")) return "tiles/detail";
  if (p.startsWith("historico/")) return "historico/:id";
  return p;
}

/**
 * Registra cada petición a /api/* con duración, estado y tamaño.
 * Las lecturas asíncronas de `response()/sizes()` se guardan en `pending` para
 * que `waitForApiQuiet` no resuma antes de que terminen de llenarse los campos.
 */
export function trackApi(page: Page): { calls: ApiCall[]; pending: Pending } {
  const calls: ApiCall[] = [];
  const pending: Pending = new Set();
  const byReq = new Map<Request, ApiCall>();

  page.on("request", (req) => {
    if (!req.url().includes("/api/") || req.url().includes("/api/auth/")) return;
    const call: ApiCall = { endpoint: `${req.method()} ${endpointOf(req.url())}`, start: Date.now() };
    calls.push(call);
    byReq.set(req, call);
  });

  page.on("requestfinished", (req) => {
    const call = byReq.get(req);
    if (!call) return;
    call.end = Date.now();
    const t = req.timing();
    if (t.responseStart > 0 && t.requestStart >= 0) call.ttfb = Math.round(t.responseStart - t.requestStart);
    const job = (async () => {
      try {
        const [resp, sizes] = await Promise.all([req.response(), req.sizes().catch(() => null)]);
        call.status = resp?.status();
        call.bytes = sizes?.responseBodySize;
      } catch {
        /* la petición pudo abortarse al cerrar la página */
      }
    })();
    pending.add(job);
    void job.finally(() => pending.delete(job));
  });

  page.on("requestfailed", (req) => {
    const call = byReq.get(req);
    if (call) Object.assign(call, { end: Date.now(), failed: true });
  });

  return { calls, pending };
}

/** Espera a que no haya peticiones /api en vuelo durante `quietMs`. */
export async function waitForApiQuiet(
  calls: ApiCall[],
  pending: Pending,
  quietMs = 1_500,
  timeoutMs = 180_000,
): Promise<number> {
  const t0 = Date.now();
  for (;;) {
    const inflight = calls.filter((c) => c.end === undefined).length;
    const last = Math.max(0, ...calls.map((c) => c.end ?? Date.now()));
    if (inflight === 0 && pending.size === 0 && Date.now() - last >= quietMs) return last;
    if (Date.now() - t0 > timeoutMs) {
      throw new Error(`/api no se aquietó en ${timeoutMs} ms (${inflight} en vuelo, ${pending.size} lecturas)`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

type PerfWindow = {
  __perf: {
    lcp: number;
    longTasks: number[];
    frames: number[];
    cls: number;
    events: Array<{ name: string; duration: number; interactionId: number }>;
    loaf: number[];
  };
};

/** Observadores en la página: LCP, tareas largas, CLS, INP, LoAF y timestamps de cada frame. */
export async function installObservers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as PerfWindow;
    w.__perf = { lcp: 0, longTasks: [], frames: [], cls: 0, events: [], loaf: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__perf.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__perf.longTasks.push(e.duration);
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as PerformanceEntry[]) {
        const shift = e as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (!shift.hadRecentInput) w.__perf.cls += shift.value ?? 0;
      }
    }).observe({ type: "layout-shift", buffered: true });
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as PerformanceEntry[]) {
          const ev = e as PerformanceEntry & { interactionId?: number };
          w.__perf.events.push({ name: e.name, duration: e.duration, interactionId: ev.interactionId ?? 0 });
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    } catch {
      /* Safari/Firefox antiguos sin Event Timing */
    }
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) w.__perf.loaf.push(e.duration);
      }).observe({ type: "long-animation-frame", buffered: true });
    } catch {
      /* no soportado */
    }
    const tick = (t: number) => {
      w.__perf.frames.push(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

export type PagePerf = {
  lcp: number;
  longTasks: number[];
  frames: number[];
  cls: number;
  events: Array<{ name: string; duration: number; interactionId: number }>;
  loaf: number[];
  now: number;
};

export const readPerf = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as PerfWindow;
    return { ...w.__perf, now: performance.now() } as PagePerf;
  });

/** FPS y peor salto entre frames dentro de una ventana [from, to] (ms de performance.now). */
export function smoothness(frames: number[], from: number, to: number) {
  const f = frames.filter((t) => t >= from && t <= to);
  let worst = 0;
  for (let i = 1; i < f.length; i++) worst = Math.max(worst, f[i] - f[i - 1]);
  return { fps: Math.round((f.length / Math.max(1, to - from)) * 1000), worstFrameMs: Math.round(worst) };
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

/** Resumen por endpoint: n, p50/p95/máx en ms, KB totales, fallos. */
export function summarize(calls: ApiCall[]) {
  const by = new Map<string, ApiCall[]>();
  for (const c of calls) by.set(c.endpoint, [...(by.get(c.endpoint) ?? []), c]);
  return [...by].map(([endpoint, cs]) => {
    const d = cs.filter((c) => c.end).map((c) => c.end! - c.start);
    return {
      endpoint,
      n: cs.length,
      p50ms: percentile(d, 50),
      p95ms: percentile(d, 95),
      maxMs: d.length ? Math.max(...d) : null,
      ttfbMs: Math.max(0, ...cs.map((c) => c.ttfb ?? 0)),
      kb: Math.round(cs.reduce((s, c) => s + (c.bytes ?? 0), 0) / 1024),
      fallos: cs.filter((c) => c.failed || (c.status ?? 200) >= 400).length,
    };
  });
}

type ResourceTiming = PerformanceResourceTiming & {
  deliveryType?: string;
};

export type ResourceSummary = {
  totalKb: number;
  totalEncodedKb: number;
  totalTransferKb: number;
  totalCount: number;
  jsKb: number;
  jsEncodedKb: number;
  jsTransferKb: number;
  cssKb: number;
  cssEncodedKb: number;
  cssTransferKb: number;
  jsonKb: number;
  fontKb: number;
  imgKb: number;
  apiJsonKb: number;
  apiJsonEncodedKb: number;
  apiJsonTransferKb: number;
  byInitiator: Array<{ type: string; count: number; kb: number; encodedKb: number; transferKb: number }>;
  resources: Array<{
    name: string;
    initiatorType: string;
    count: number;
    kb: number;
    encodedKb: number;
    transferKb: number;
    durationMs: number;
    cached: boolean;
  }>;
};

/** Tamaños reales de la carga (transferencia comprimida + cuerpo decodificado). */
export async function resourceSummary(page: Page): Promise<ResourceSummary> {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType("resource") as ResourceTiming[];
    const byName = new Map<string, ResourceSummary["resources"][number]>();
    let total = 0;
    let totalTransfer = 0;
    let totalCount = 0;
    for (const e of entries) {
      const decoded = e.decodedBodySize || 0;
      const encoded = e.encodedBodySize || 0;
      const transfer = e.transferSize || 0;
      total += decoded;
      totalTransfer += transfer;
      totalCount += 1;
      const name = e.name;
      const prev = byName.get(name);
      if (prev) {
        prev.count += 1;
        prev.kb += decoded / 1024;
        prev.encodedKb += encoded / 1024;
        prev.transferKb += transfer / 1024;
        prev.durationMs = Math.max(prev.durationMs, e.duration);
        prev.cached = prev.cached && (e.transferSize === 0 || (e as ResourceTiming).deliveryType === "cache");
      } else {
        byName.set(name, {
          name,
          initiatorType: e.initiatorType,
          count: 1,
          kb: decoded / 1024,
          encodedKb: encoded / 1024,
          transferKb: transfer / 1024,
          durationMs: e.duration,
          cached: e.transferSize === 0 && e.encodedBodySize > 0,
        });
      }
    }
    const resources = [...byName.values()];
    const sum = (pred: (r: ResourceSummary["resources"][number]) => boolean) =>
      resources.filter(pred).reduce((s, r) => s + r.kb, 0);
    const sumEncoded = (pred: (r: ResourceSummary["resources"][number]) => boolean) =>
      resources.filter(pred).reduce((s, r) => s + r.encodedKb, 0);
    const sumTransfer = (pred: (r: ResourceSummary["resources"][number]) => boolean) =>
      resources.filter(pred).reduce((s, r) => s + r.transferKb, 0);
    const byInitiatorMap = new Map<string, { count: number; kb: number; encodedKb: number; transferKb: number }>();
    for (const r of resources) {
      const cur = byInitiatorMap.get(r.initiatorType) ?? { count: 0, kb: 0, encodedKb: 0, transferKb: 0 };
      cur.count += r.count;
      cur.kb += r.kb;
      cur.encodedKb += r.encodedKb;
      cur.transferKb += r.transferKb;
      byInitiatorMap.set(r.initiatorType, cur);
    }
    const apiJson = resources.filter((r) => r.name.includes("/api/"));
    return {
      totalKb: Math.round(total / 1024),
      totalEncodedKb: Math.round(resources.reduce((s, r) => s + r.encodedKb, 0)),
      totalTransferKb: Math.round(totalTransfer / 1024),
      totalCount,
      jsKb: Math.round(sum((r) => r.name.includes(".js"))),
      jsEncodedKb: Math.round(sumEncoded((r) => r.name.includes(".js"))),
      jsTransferKb: Math.round(sumTransfer((r) => r.name.includes(".js"))),
      cssKb: Math.round(sum((r) => r.name.includes(".css"))),
      cssEncodedKb: Math.round(sumEncoded((r) => r.name.includes(".css"))),
      cssTransferKb: Math.round(sumTransfer((r) => r.name.includes(".css"))),
      jsonKb: Math.round(sum((r) => r.name.includes("/api/"))),
      fontKb: Math.round(sum((r) => /\.(woff2?|ttf|otf)$/.test(r.name))),
      imgKb: Math.round(sum((r) => /\.(png|jpe?g|webp|svg|gif|avif)$/.test(r.name))),
      apiJsonKb: Math.round(apiJson.reduce((s, r) => s + r.kb, 0)),
      apiJsonEncodedKb: Math.round(apiJson.reduce((s, r) => s + r.encodedKb, 0)),
      apiJsonTransferKb: Math.round(apiJson.reduce((s, r) => s + r.transferKb, 0)),
      byInitiator: [...byInitiatorMap].map(([type, v]) => ({ type, ...v, kb: Math.round(v.kb), encodedKb: Math.round(v.encodedKb), transferKb: Math.round(v.transferKb) })),
      resources: resources
        .sort((a, b) => b.kb - a.kb)
        .slice(0, 80)
        .map((r) => ({ ...r, kb: Math.round(r.kb), encodedKb: Math.round(r.encodedKb), transferKb: Math.round(r.transferKb), durationMs: Math.round(r.durationMs) })),
    };
  });
}

/** Renderer WebGL real. Con SwiftShader (software) las métricas del navegador NO sirven. */
export async function webglRenderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "sin WebGL";
  });
}

/** Aplica CPU/red lentas para acercarse a un portátil/4G real (solo Chromium/CDP). */
export async function applyThrottling(page: Page): Promise<void> {
  if (CPU_THROTTLE <= 1 && !NETWORK_PROFILE) return;
  try {
    const client = await page.context().newCDPSession(page);
    if (CPU_THROTTLE > 1) {
      await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE });
    }
    if (NETWORK_PROFILE) {
      // Valores conservadores tipo "Fast 3G" de Lighthouse (descarga 1,6 Mbps).
      const profiles: Record<string, { download: number; upload: number; latency: number }> = {
        fast3g: { download: 1.6 * 1024 * 1024 / 8, upload: 750 * 1024 / 8, latency: 150 },
        slow3g: { download: 400 * 1024 / 8, upload: 400 * 1024 / 8, latency: 400 },
      };
      const p = profiles[NETWORK_PROFILE] ?? profiles.fast3g;
      await client.send("Network.enable");
      await client.send("Network.emulateNetworkConditions", {
        offline: false,
        downloadThroughput: p.download,
        uploadThroughput: p.upload,
        latency: p.latency,
      });
    }
  } catch (e) {
    console.warn(`⚠️  No se pudo aplicar throttling (¿Firefox/WebKit?): ${String(e)}`);
  }
}

/** Evita que el onboarding/disclaimer tape el mapa en las pruebas (1 vez por
 * sesión). Se marca ANTES de navegar para que el dashboard no lo abra. */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("vento_onboarding_seen", "1");
    } catch {
      /* sessionStorage puede estar bloqueado; la prueba seguirá y fallará al clicar */
    }
  });
}

export function tbt(longTasks: number[]): number {
  return Math.round(longTasks.reduce((s, d) => s + Math.max(0, d - 50), 0));
}

export function inp(events: Array<{ duration: number; interactionId: number }>): number {
  const interactions = events.filter((e) => e.interactionId > 0);
  return Math.round(Math.max(0, ...interactions.map((e) => e.duration)));
}

/** Completa `bytes` de las llamadas con los tamaños de Resource Timing.
 * `request.sizes()` no siempre trae el cuerpo (0/undefined); el navegador sí
 * reporta `decodedBodySize` en las entradas de recursos. */
export function fillBytes(calls: ApiCall[], resources: ResourceSummary): void {
  for (const call of calls) {
    if (call.bytes && call.bytes > 0) continue;
    const path = call.endpoint.split(" ")[1] ?? "";
    const match = resources.resources.find((r) => {
      try {
        const p = new URL(r.name).pathname;
        return p === `/api/${path}` || p.startsWith(`/api/${path}/`);
      } catch {
        return false;
      }
    });
    if (match) call.bytes = Math.round(match.kb * 1024);
  }
}

export function writeResult(
  testName: string,
  startedAt: string,
  payload: Record<string, unknown>,
): string {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const file = path.join(RESULTS_DIR, `${RUN_ID}_${testName}.json`);
  const body = {
    runId: RUN_ID,
    test: testName,
    startedAt,
    finishedAt: new Date().toISOString(),
    target: targetInfo(),
    ...payload,
  };
  fs.writeFileSync(file, JSON.stringify(body, null, 2));
  console.log(`\nResultados → ${file}`);
  return file;
}
