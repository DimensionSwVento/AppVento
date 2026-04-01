import { NextResponse } from "next/server";
import { getGlobalCounts, isIndexReady } from "../../../Utils/h3TileIndex";

export async function GET(req: Request) {
  if (!isIndexReady()) {
    return NextResponse.json({ total: 0, selected: 0, aboveThreshold: 0 });
  }

  const url = new URL(req.url);
  const zoom = parseInt(url.searchParams.get("zoom") ?? "6", 10);
  const varName = url.searchParams.get("var") ?? undefined;
  const selected = url.searchParams.get("selected")?.split(",").filter(Boolean) ?? [];

  const counts = getGlobalCounts(zoom, selected, varName);
  return NextResponse.json(counts);
}
