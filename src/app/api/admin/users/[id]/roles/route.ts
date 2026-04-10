import { NextResponse } from "next/server";
import { requireAdmin } from "../../route";
import {
  getUserRoles,
  KeycloakAdminError,
} from "../../../../../Utils/keycloakAdmin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const keycloakRoles = await getUserRoles(id);
    const roles = keycloakRoles.map((r) => r.name);

    return NextResponse.json({ roles });
  } catch (err: any) {
    console.error(`GET /users/${id}/roles Error:`, err.message);
    const status = err instanceof KeycloakAdminError ? err.status : 500;
    return NextResponse.json(
      { error: "Error al obtener roles del usuario" },
      { status }
    );
  }
}
