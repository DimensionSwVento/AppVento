import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getUsers,
  createUser,
  assignRealmRole,
  resetUserPassword,
  KeycloakAdminError,
  getUserRoles,
} from "../../../Utils/keycloakAdmin";
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

    // To get roles for the table, we might need a separate call for each user, 
    // or assume we return them simply mapped.
    // Making n individual calls to get roles might be slow for a table of 20,
    // but the Keycloak API `/users` doesn't always return realm roles directly safely depending on version.
    // For simplicity, we will fetch roles for each user in the returned patch since limit is max 20.
    
    const users: User[] = await Promise.all(
      keycloakUsers.map(async (u) => {
        let userRoles: string[] = [];
        try {
          const roles = await getUserRoles(u.id);
          userRoles = roles.map((r) => r.name);
        } catch {
          // ignore role fetch error per user
        }

        return {
          id: u.id,
          firstName: u.firstName || "",
          lastName: u.lastName || "",
          email: u.email || "",
          enabled: u.enabled,
          createdTimestamp: u.createdTimestamp,
          roles: userRoles,
        };
      })
    );

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error("GET Users Error:", err.message);
    const status = err.status || 500;
    return NextResponse.json(
      { error: "Error fetching users from Keycloak: " + err.message },
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
  } catch (err: any) {
    console.error("POST User Error:", err.message);
    const status = err instanceof KeycloakAdminError ? err.status : 500;
    const errorMsg =
      err instanceof KeycloakAdminError
        ? err.message
        : "Error al crear usuario";
    return NextResponse.json({ error: errorMsg }, { status });
  }
}
