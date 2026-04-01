import { NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";
import parseH3Parquet from "../../../Utils/parseH3Parquet";
import { getH3Data, storeH3Data } from "../../../Utils/h3DataCache";
import { initTileIndex, isIndexReady } from "../../../Utils/h3TileIndex";

export async function GET() {
  if (isIndexReady()) {
    return NextResponse.json({ status: "ready" });
  }

  try {
    let data = getH3Data();
    if (!data) {
      const filePath = path.join(process.cwd(), "src/app/Utils/master_variables.h3.parquet");
      if (!existsSync(filePath)) {
        return NextResponse.json({ status: "no_data" }, { status: 404 });
      }
      data = await parseH3Parquet(filePath);
      storeH3Data(data);
    }

    // debug: verificar qué variables se parsearon y un hexágono de muestra
    const sample = data.hexagons[0];
    console.log("[WARMUP] variableNames:", data.variableNames);
    console.log("[WARMUP] sample hex:", JSON.stringify(sample).slice(0, 500));

    initTileIndex(data.hexagons, data.variableNames);
    return NextResponse.json({
      status: "ready",
      count: data.totalCount,
      variableNames: data.variableNames,
      sampleHex: sample ? { h3: sample.h3_index, score: sample.score_general, vars: Object.keys(sample.variables) } : null,
    });
  } catch (error) {
    console.error("Error warming up tile index:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
