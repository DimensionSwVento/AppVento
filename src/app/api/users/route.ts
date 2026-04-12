// Gestión de usuarios via Keycloak admin console o /api/admin/users
import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ status: "use_keycloak_admin" }, { status: 503 }); }
