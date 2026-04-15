import { NextResponse } from "next/server";

export async function GET() {
  // TODO: listar usuarios via Keycloak Admin API
  return NextResponse.json({ users: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  // TODO: crear usuario via Keycloak Admin API
  return NextResponse.json({ created: true, ...body }, { status: 201 });
}
