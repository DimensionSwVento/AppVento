import { auth } from "@/auth";
import { Agent } from "undici";

// Base interna del backend FastAPI (privado en AccuWeb). Server-only; cae a la
// pública si no se define una interna dedicada.
const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";
const SECRET = process.env.INTERNAL_API_SECRET || "";

// undici (el fetch de Node) corta por defecto a los ~300 s (headers/body timeout):
// la ingesta larga de un máster daba "backend_unreachable" a los ~5 min aunque
// nginx y gunicorn permitieran más. Este dispatcher sube ambos a 30 min. Las demás
// llamadas responden rápido igual, así que un techo alto no las afecta.
const longDispatcher = new Agent({
  headersTimeout: 1_800_000,
  bodyTimeout: 1_800_000,
});

/**
 * Proxy autenticado Next → FastAPI (patrón BFF) para TODA la API (tiles + histórico).
 *
 * El servidor Next ya validó la sesión de Keycloak (NextAuth); aquí reenvía la
 * IDENTIDAD ya verificada (`sub` + `roles`) al backend privado con un secreto
 * interno compartido. No se relayan access tokens ni se guardan en la cookie.
 * `path` es la ruta completa del backend, ej. `/api/tiles/area` o `/api/historico`.
 */
export async function proxyBackend(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const session = await auth();
  if (!session?.sub) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!BACKEND) {
    return Response.json({ error: "backend_not_configured" }, { status: 503 });
  }

  const headers = new Headers(init?.headers);
  headers.set("X-Internal-Secret", SECRET);
  headers.set("X-User-Sub", session.sub);
  headers.set("X-User-Roles", (session.roles ?? []).join(","));
  if (init?.body) headers.set("Content-Type", "application/json");

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      // @ts-expect-error 'dispatcher' es opción de undici, no del tipo RequestInit del DOM.
      dispatcher: longDispatcher,
    });
  } catch {
    return Response.json({ error: "backend_unreachable" }, { status: 502 });
  }

  const text = await backendRes.text();
  return new Response(text || null, {
    status: backendRes.status,
    headers: {
      "Content-Type": backendRes.headers.get("content-type") ?? "application/json",
    },
  });
}
