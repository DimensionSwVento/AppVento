import { NextResponse } from "next/server";

export async function GET() {
  console.log("healt");
  
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
