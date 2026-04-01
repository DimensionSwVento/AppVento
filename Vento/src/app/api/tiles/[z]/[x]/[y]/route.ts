import { NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";
import parseH3Parquet from "../../../../../Utils/parseH3Parquet";
import { getH3Data, storeH3Data } from "../../../../../Utils/h3DataCache";
import { initTileIndex, getHexagonsForTile, isIndexReady } from "../../../../../Utils/h3TileIndex";

async function ensureIndex() {
  if (isIndexReady()) return true;

  let data = getH3Data();
  if (!data) {
    const filePath = path.join(process.cwd(), "src/app/Utils/master_variables.h3.parquet");
    if (!existsSync(filePath)) return false;
    data = await parseH3Parquet(filePath);
    storeH3Data(data);
  }

  initTileIndex(data.hexagons, data.variableNames);
  return true;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const { z, x, y } = await params;
    const zi = parseInt(z, 10);
    const xi = parseInt(x, 10);
    const yi = parseInt(y, 10);

    if (isNaN(zi) || isNaN(xi) || isNaN(yi)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const ready = await ensureIndex();
    console.log(`[API tile] ${zi}/${xi}/${yi} indexReady:${ready}`);
    if (!ready) return NextResponse.json([], { status: 404 });

    const url = new URL(req.url);
    const varName = url.searchParams.get("var") ?? undefined;

    const hexagons = getHexagonsForTile(zi, xi, yi, varName);
    console.log(`[API tile] ${zi}/${xi}/${yi} → ${hexagons.length} hex`);

    return NextResponse.json(hexagons, {
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  } catch (error) {
    console.error("Error serving tile:", error);
    return NextResponse.json([], { status: 500 });
  }
}
