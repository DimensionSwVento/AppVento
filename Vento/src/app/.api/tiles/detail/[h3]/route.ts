import { NextResponse } from "next/server";
import { getHexDetail, isIndexReady } from "../../../../Utils/h3TileIndex";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ h3: string }> }
) {
  if (!isIndexReady()) {
    return NextResponse.json({ error: "Índice no inicializado" }, { status: 503 });
  }

  const { h3 } = await params;
  const detail = getHexDetail(h3);

  if (!detail) {
    return NextResponse.json({ error: "Hexágono no encontrado" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
