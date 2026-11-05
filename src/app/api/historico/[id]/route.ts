import { proxyBackend } from "@/app/Utils/apis/backendProxy";

/** DELETE /api/historico/:id → elimina un informe propio del usuario. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return proxyBackend(`/api/historico/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
