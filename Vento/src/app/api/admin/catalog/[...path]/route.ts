import { auth } from "@/auth";
import { proxyBackend } from "@/app/Utils/apis/backendProxy";

/**
 * BFF catch-all para el CATÁLOGO de administración (US08-01/02/03): variables,
 * datasets, normas y escenarios. Proxy autenticado Next → FastAPI (mismo patrón
 * que /api/tiles), pero además EXIGE rol admin antes de reenviar.
 *
 * Rutas (todas bajo /api/admin/catalog):
 *   GET    /variables?tipo=modelo|informativa
 *   POST   /variables                 (crear variable informativa)
 *   PATCH  /variables/:id             (editar detalle / habilitar / mapa-menú)
 *   PATCH  /datasets/:id              (actualizar dataset asociado)
 *   GET    /normas
 *   POST   /normas
 *   PATCH  /normas/:id
 *   DELETE /normas/:id
 *   GET    /escenarios
 *   POST   /escenarios
 *   PATCH  /escenarios/:id
 *   DELETE /escenarios/:id
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
  const target = `/api/admin/catalog/${path.map(encodeURIComponent).join("/")}${search}`;
  const method = req.method;
  const body =
    method === "POST" || method === "PUT" || method === "PATCH"
      ? await req.text()
      : undefined;
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
export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return handle(req, path);
}
