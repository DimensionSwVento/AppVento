import { auth } from "@/auth";
import { proxyBackend } from "@/app/Utils/apis/backendProxy";

/**
 * BFF para la ACTUALIZACIÓN DE LA MASTER (US04-03 · admin). Proxy autenticado
 * Next → FastAPI, exige rol admin antes de reenviar.
 *
 * Rutas (bajo /api/admin/master):
 *   GET  /status   → versión vigente + si hay ingesta en curso + programada + warning
 *   POST /update   → { mode: "immediate"|"scheduled", scheduledAt?, source? }
 */
async function handle(req: Request, path: string[]): Promise<Response> {
  const session = await auth();
  if (!session?.sub) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!session.roles?.includes("admin")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const search = new URL(req.url).search;
  const target = `/api/admin/master/${path.map(encodeURIComponent).join("/")}${search}`;
  const method = req.method;
  const body = method === "POST" ? await req.text() : undefined;
  return proxyBackend(target, { method, body });
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
