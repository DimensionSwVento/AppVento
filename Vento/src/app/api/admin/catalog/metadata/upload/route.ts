import { auth } from "@/auth";

/**
 * BFF de SUBIDA del CSV/XLSX del actualizador de metadatos. Va aparte del
 * catch-all `[...path]/route.ts` porque ese proxy fuerza `application/json` y
 * aquí hay que **reenviar el multipart tal cual** (con su boundary) en streaming.
 * Ruta más específica → tiene precedencia sobre `[...path]`.
 * → FastAPI POST /api/admin/catalog/metadata/upload
 */
const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";
const SECRET = process.env.INTERNAL_API_SECRET || "";

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.sub) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!session.roles?.includes("admin")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!BACKEND) {
    return Response.json({ error: "backend_not_configured" }, { status: 503 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND}/api/admin/catalog/metadata/upload`, {
      method: "POST",
      headers: {
        "X-Internal-Secret": SECRET,
        "X-User-Sub": session.sub,
        "X-User-Roles": (session.roles ?? []).join(","),
        // Preserva el multipart + boundary original (NO forzar application/json).
        "Content-Type": req.headers.get("content-type") ?? "",
      },
      body: req.body,
      // @ts-expect-error 'duplex' no está en el tipo RequestInit del DOM.
      duplex: "half",
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "backend_unreachable" }, { status: 502 });
  }

  const text = await backendRes.text();
  return new Response(text || null, {
    status: backendRes.status,
    headers: {
      "Content-Type":
        backendRes.headers.get("content-type") ?? "application/json",
    },
  });
}
