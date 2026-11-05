import { proxyBackend } from "@/app/Utils/apis/backendProxy";

// BFF catch-all para /api/tiles/*: proxy autenticado al FastAPI (inyecta la
// identidad del usuario con el secreto interno). Reemplaza al rewrite de
// next.config: TODA la API va por el mismo sistema de auth.
async function handle(req: Request, path: string[]): Promise<Response> {
  const search = new URL(req.url).search; // conserva ?var=… etc.
  const target = `/api/tiles/${path.map(encodeURIComponent).join("/")}${search}`;
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
