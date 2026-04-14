// API movida a FastAPI backend
import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ status: "moved_to_fastapi" }, { status: 503 }); }
