import { NextResponse } from "next/server";
import { getAvailableVariables, getVariableRange, isIndexReady } from "../../../Utils/h3TileIndex";
import { getVariableLabel } from "../../../Utils/parseH3Parquet";

export async function GET() {
  if (!isIndexReady()) {
    return NextResponse.json({ error: "Índice no inicializado" }, { status: 503 });
  }

  const names = getAvailableVariables();
  const variables = names.map((name) => ({
    name,
    label: getVariableLabel(name),
    range: getVariableRange(name),
  }));

  return NextResponse.json({ variables });
}
