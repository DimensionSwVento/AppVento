import { NextResponse } from "next/server";

export async function GET() {
  // TODO: servir datos H3 desde JSON pre-procesado
  return NextResponse.json({ hexagons: [] });
}
