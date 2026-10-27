import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUsers,
  getRealmRoleMembers,
  createUser,
  assignRealmRole,
  resetUserPassword,
  KeycloakAdminError,
} from "../../../Utils/apis/keycloakAdmin";
import { CreateUserPayload, User } from "../../../types/user";

// Reusable function to check admin role
export async function requireAdmin() {
  const session = await auth();
  if (!session || !session.roles?.includes("admin")) {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const search = searchParams.get("search") || undefined;

  try {
    const keycloakUsers = await getUsers(search, page, limit);

    // US08-04.5 — Rol por usuario SIN N+1: se traen los miembros del rol `admin`
    // en UNA sola llamada y se marca cada usuario. Si Keycloak no permite la
    // consulta de miembros, se degrada a "sin rol" (el filtro "Todos" sigue ok).
    let adminIds = new Set<string>();
    try {
      const admins = await getRealmRoleMembers("admin");
      adminIds = new Set(admins.map((a) => a.id));
    } catch (e) {
      console.warn(
        "No se pudo resolver miembros del rol admin:",
        e instanceof Error ? e.message : String(e),
      );
    }

    const users: User[] = keycloakUsers.map((u) => ({
      id: u.id,
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      email: u.email || "",
      enabled: u.enabled,
      createdTimestamp: u.createdTimestamp,
      // "admin" si es miembro del rol; el resto queda como analista (sin rol).
      roles: adminIds.has(u.id) ? ["admin"] : (u.realmRoles ?? []),
    }));

    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("GET Users Error:", message);
    const status = err instanceof KeycloakAdminError ? err.status : 500;
    return NextResponse.json(
      { error: "Error fetching users from Keycloak: " + message },
      { status }
    );
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const payload: CreateUserPayload = await request.json();

    if (!payload.email || !payload.firstName || !payload.lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userId = await createUser({
      username: payload.email, // Use email as username
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      enabled: true,
      emailVerified: true, // Auto-verify internally created users
    });

    if (!userId) {
      throw new Error("User created but ID could not be resolved");
    }

    // Set initial password if provided
    if (payload.password) {
       await resetUserPassword(userId, payload.password);
    } // else, email actions could be sent, or manually configured later.

    // Assign role if provided
    if (payload.role) {
      await assignRealmRole(userId, payload.role);
    }

    return NextResponse.json(
      { message: "Usuario creado exitosamente", id: userId },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST User Error:", err instanceof Error ? err.message : err);
    const status = err instanceof KeycloakAdminError ? err.status : 500;
    const errorMsg =
      err instanceof KeycloakAdminError
        ? err.message
        : "Error al crear usuario";
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
