import { NextResponse } from "next/server";
import { requireAdmin } from "../route";
import {
  updateUser,
  getUserRoles,
  removeRealmRole,
  assignRealmRole,
  KeycloakAdminError,
} from "../../../../Utils/apis/keycloakAdmin";
import { UpdateUserPayload, APP_ROLES } from "../../../../types/user";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Need to await params dynamically per Next.js 15+ patterns sometimes, but we are on Next.js 16
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const payload: UpdateUserPayload = await request.json();

    // 1. Update basic user data (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (payload.firstName !== undefined) updateData.firstName = payload.firstName;
    if (payload.lastName !== undefined) updateData.lastName = payload.lastName;
    if (payload.enabled !== undefined) updateData.enabled = payload.enabled;
    if (payload.email !== undefined) updateData.email = payload.email;

    if (Object.keys(updateData).length > 0) {
      await updateUser(id, updateData);
    }

    // 2. Manage roles if provided
    if (payload.role !== undefined) {
      // Validate before touching Keycloak: an unknown/null value would otherwise
      // strip all app roles without assigning a replacement.
      if (!APP_ROLES.includes(payload.role)) {
        return NextResponse.json(
          { error: `Rol inválido. Los valores permitidos son: ${APP_ROLES.join(", ")}` },
          { status: 400 }
        );
      }

      const targetRole = payload.role;

      const currentRoles = await getUserRoles(id);
      const currentRoleNames = currentRoles.map((r) => r.name);

      // Remove any existing app roles that differ from the target
      for (const existing of currentRoleNames) {
        if ((APP_ROLES as readonly string[]).includes(existing) && existing !== targetRole) {
          try {
            await removeRealmRole(id, existing);
          } catch {
            console.error(`Error removing role ${existing} from user ${id}`);
          }
        }
      }

      // Assign the target role only if not already present
      if (!currentRoleNames.includes(targetRole)) {
        await assignRealmRole(id, targetRole);
      }
    }

    return NextResponse.json({ message: "Usuario actualizado" }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`PUT /users/[id] Error (id=${(await params).id}):`, message);
    const status = err instanceof KeycloakAdminError ? err.status : 500;
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Disable user (soft delete)
    await updateUser(id, { enabled: false });

    return NextResponse.json(
      { message: "Usuario desactivado correctamente" },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`DELETE /users/[id] Error (id=${(await params).id}):`, message);
    const status = err instanceof KeycloakAdminError ? err.status : 500;
    return NextResponse.json(
      { error: "Error al desactivar usuario" },
      { status }
    );
  }
}
