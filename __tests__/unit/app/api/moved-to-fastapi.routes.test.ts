import { describe, it, expect } from "vitest";

const movedRoutes = [
  "@/app/api/hexagons/route",
  "@/app/api/tiles/variables/route",
  "@/app/api/tiles/counts/route",
  "@/app/api/tiles/detail/[h3]/route",
  "@/app/api/tiles/warmup/route",
  "@/app/api/tiles/[z]/[x]/[y]/route",
];

describe("Routes moved to FastAPI", () => {
  it.each(movedRoutes)("returns 503 and explicit moved status for %s", async (routePath) => {
    const mod = (await import(routePath)) as { GET: () => Promise<Response> };
    const res = await mod.GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ status: "moved_to_fastapi" });
  });
});
