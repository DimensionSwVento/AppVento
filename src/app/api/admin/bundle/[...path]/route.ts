import { auth } from "@/auth";
import { proxyBackend } from "@/app/Utils/apis/backendProxy";

/**
 * BFF del MOTOR DE INGESTA POR CLASES (docs/spec/ingesta-clases-conciliacion.md).
 * Proxy autenticado Next → FastAPI, exige rol admin.
 *
 * Rutas (bajo /api/admin/bundle):
 *   POST  /plan             → clasifica las columnas del bundle (Fase A)
 *   GET   /columns?estado=  → registro columna→clase
 *   PATCH /columns/{name}   → concilia/crea una columna
 *   POST  /apply            → ingesta UPSERT del bundle (interfaz)
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
  const target = `/api/admin/bundle/${path.map(encodeURIComponent).join("/")}${search}`;
  const method = req.method;
  const body = method === "GET" ? undefined : await req.text();
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
