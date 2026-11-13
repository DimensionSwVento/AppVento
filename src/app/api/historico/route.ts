import { proxyBackend } from "@/app/Utils/apis/backendProxy";

/** GET /api/historico → informes del usuario autenticado (proxy al FastAPI). */
export async function GET() {
  return proxyBackend("/api/historico", { method: "GET" });
}

/** POST /api/historico → guarda un informe del usuario autenticado. */
export async function POST(req: Request) {
  const body = await req.text();
  return proxyBackend("/api/historico", { method: "POST", body });
}
