import { NextResponse } from "next/server";
import { requireAdmin } from "../route";
import {
  updateUser,
  getUserRoles,
  removeRealmRole,
  assignRealmRole,
  KeycloakAdminError,
} from "../../../../Utils/keycloakAdmin";
import { UpdateUserPayload } from "../../../../types/user";

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

    if (Object.keys(updateData).length > 0) {
      await updateUser(id, updateData);
    }

    // 2. Manage roles if provided
    if (payload.role !== undefined) {
      // Get current realm roles
      const currentRoles = await getUserRoles(id);
      const currentRoleNames = currentRoles.map((r) => r.name);

      // We only care about managing our known custom roles (e.g. admin, analista)
      // If we are changing to a new role, we probably want to remove other app roles.
      // For simplicity, we just handle direct mapping: if there is a role and we map it.
      
      // If we are giving a specific role, we might want to ensure they don't have conflicting ones?
      // For this user story, if they pass a role, we'll assign it. If they want to change it, 
      // we'll remove the old ones. Usually roles are: admin / analista.
      const appRoles = ["admin", "analista"];
      
      const targetRole = payload.role;

      // Remove any existing app roles that don't match the new role
      for (const existing of currentRoleNames) {
        if (appRoles.includes(existing) && existing !== targetRole) {
          try {
            await removeRealmRole(id, existing);
          } catch (e) {
             console.error(`Error removing role ${existing} from user ${id}`);
          }
        }
      }

      // Assign the new role if it's an app role and not already assigned
      if (targetRole && appRoles.includes(targetRole) && !currentRoleNames.includes(targetRole)) {
         await assignRealmRole(id, targetRole);
      }
    }

    return NextResponse.json({ message: "Usuario actualizado" }, { status: 200 });
  } catch (err: any) {
    console.error(`PUT /users/[id] Error (id=${(await params).id}):`, err.message);
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
  } catch (err: any) {
    console.error(`DELETE /users/[id] Error (id=${(await params).id}):`, err.message);
    const status = err instanceof KeycloakAdminError ? err.status : 500;
    return NextResponse.json(
      { error: "Error al desactivar usuario" },
      { status }
    );
  }
}
