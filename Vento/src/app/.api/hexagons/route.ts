import { NextResponse } from "next/server";
import { existsSync } from "fs";
import path from "path";
import parseH3Parquet from "../../Utils/parseH3Parquet";
import { getH3Data, storeH3Data } from "../../Utils/h3DataCache";

export async function GET() {
  try {
    const cached = getH3Data();
    if (cached) {
      return NextResponse.json(cached);
    }

    const filePath = path.join(
      process.cwd(),
      "src/app/Utils/master_variables.h3.parquet"
    );

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { hexagons: [], totalCount: 0, error: "Archivo parquet no encontrado" },
        { status: 404 }
      );
    }

    const data = await parseH3Parquet(filePath);
    storeH3Data(data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error parsing H3 parquet:", error);
    return NextResponse.json(
      { hexagons: [], totalCount: 0, error: "Error al procesar datos H3" },
      { status: 500 }
    );
  }
}
