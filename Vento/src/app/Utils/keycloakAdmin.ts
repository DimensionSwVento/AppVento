import { KeycloakUser, KeycloakRole } from "../types/user";

/**
 * Representación (parcial) de usuario que acepta la Admin REST API de
 * Keycloak en create/update. El index signature admite atributos extra
 * del UserRepresentation sin recurrir a `any`.
 */
export interface KeycloakUserInput {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  credentials?: { type: string; value: string; temporary: boolean }[];
  [key: string]: unknown;
}

export class KeycloakAdminError extends Error {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "KeycloakAdminError";
  }
}

async function getAdminToken(): Promise<string> {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;

  if (!issuer || !clientId || !clientSecret) {
    throw new Error("Missing Keycloak env variables for admin access");
  }

  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Error fetching Keycloak admin token:", err);
    throw new Error("Failed to authenticate with Keycloak Admin API");
  }

  const data = await response.json();
  return data.access_token;
}

function getBaseAdminUrl() {
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER;
  if (!issuer) {
    throw new Error("Missing AUTH_KEYCLOAK_ISSUER");
  }
  return issuer.replace("/realms/", "/admin/realms/");
}

async function fetchAdminApi(endpoint: string, options: RequestInit = {}) {
  const token = await getAdminToken();
  const url = `${getBaseAdminUrl()}${endpoint}`;

  const defaultHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (options.body && typeof options.body === "string") {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers: { ...defaultHeaders, ...options.headers },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new KeycloakAdminError(
      `Keycloak API Error (${response.status}): ${errText}`,
      response.status
    );
  }

  // Handle empty responses (like from DELETE or some POST)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}

export async function getUsers(
  search?: string,
  page = 1,
  limit = 20
): Promise<KeycloakUser[]> {
  const first = (page - 1) * limit;
  let endpoint = `/users?first=${first}&max=${limit}`;

  if (search) {
    endpoint += `&search=${encodeURIComponent(search)}`;
  }

  return fetchAdminApi(endpoint);
}

export async function getUserCount(search?: string): Promise<number> {
  let endpoint = `/users/count`;
  if (search) {
    endpoint += `?search=${encodeURIComponent(search)}`;
  }
  return fetchAdminApi(endpoint);
}

export async function createUser(
  userData: KeycloakUserInput,
): Promise<string | undefined> {
  const token = await getAdminToken();
  const url = `${getBaseAdminUrl()}/users`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  if (response.status === 409) {
    throw new KeycloakAdminError("El correo o usuario ya existe", 409);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new KeycloakAdminError(
      `Failed to create user: ${errText}`,
      response.status
    );
  }

  // Keycloak returns the new user's location in the headers
  const locationHeader = response.headers.get("Location");
  if (locationHeader) {
    const parts = locationHeader.split("/");
    return parts[parts.length - 1]; // user ID
  }
  return undefined;
}

export async function updateUser(
  userId: string,
  userData: KeycloakUserInput,
): Promise<void> {
  await fetchAdminApi(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
}

export async function getUserRoles(userId: string): Promise<KeycloakRole[]> {
  return fetchAdminApi(`/users/${userId}/role-mappings/realm`);
}

/**
 * Get available realm roles that can be assigned to a user.
 * Uses the user-scoped endpoint which works with manage-users permission,
 * unlike GET /roles/{name} which requires view-realm permission.
 */
export async function getAvailableRealmRoles(
  userId: string
): Promise<KeycloakRole[]> {
  return fetchAdminApi(`/users/${userId}/role-mappings/realm/available`);
}

/**
 * Get a role by name using the realm-scoped endpoint.
 * NOTE: Requires view-realm permission on the Service Account.
 * Prefer getAvailableRealmRoles() or getUserRoles() when possible.
 */
export async function getRoleByName(roleName: string): Promise<KeycloakRole> {
  return fetchAdminApi(`/roles/${encodeURIComponent(roleName)}`);
}

export async function assignRealmRole(
  userId: string,
  roleName: string
): Promise<void> {
  // Use user-scoped available roles endpoint (works with manage-users permission)
  // instead of realm-scoped GET /roles/{name} (requires view-realm permission)
  const availableRoles = await getAvailableRealmRoles(userId);
  const role = availableRoles.find((r) => r.name === roleName);
  if (!role) {
    throw new KeycloakAdminError(
      `El rol "${roleName}" no fue encontrado o ya está asignado al usuario`,
      404
    );
  }
  await fetchAdminApi(`/users/${userId}/role-mappings/realm`, {
    method: "POST",
    body: JSON.stringify([role]),
  });
}

export async function removeRealmRole(
  userId: string,
  roleName: string
): Promise<void> {
  // Use user-scoped current roles endpoint (works with manage-users permission)
  // instead of realm-scoped GET /roles/{name} (requires view-realm permission)
  const currentRoles = await getUserRoles(userId);
  const role = currentRoles.find((r) => r.name === roleName);
  if (!role) {
    throw new KeycloakAdminError(
      `El rol "${roleName}" no está asignado actualmente al usuario`,
      404
    );
  }
  await fetchAdminApi(`/users/${userId}/role-mappings/realm`, {
    method: "DELETE",
    body: JSON.stringify([role]),
  });
}

export async function resetUserPassword(
  userId: string,
  password: string
): Promise<void> {
  await fetchAdminApi(`/users/${userId}/reset-password`, {
    method: "PUT",
    body: JSON.stringify({
      type: "password",
      value: password,
      temporary: false,
    }),
  });
}
