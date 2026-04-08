export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  createdTimestamp: number;
  roles?: string[]; // Simplified role list for the frontend
}

export interface KeycloakUser {
  id: string;
  createdTimestamp: number;
  username: string;
  enabled: boolean;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  email: string;
  realmRoles?: string[];
  clientRoles?: Record<string, string[]>;
  disableableCredentialTypes?: string[];
  requiredActions?: string[];
  notBefore?: number;
}

export interface KeycloakRole {
  id: string;
  name: string;
  description?: string;
  composite: boolean;
  clientRole: boolean;
  containerId: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role?: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  role?: string;
}
