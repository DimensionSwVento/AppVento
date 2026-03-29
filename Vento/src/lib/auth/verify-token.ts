import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const KEYCLOAK_URL =
  process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8080";
const KEYCLOAK_REALM =
  process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "vento";

const ISSUER = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
const JWKS_URI = `${ISSUER}/protocol/openid-connect/certs`;

const jwks = createRemoteJWKSet(new URL(JWKS_URI));

export interface KeycloakJWTPayload extends JWTPayload {
  email?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email_verified?: boolean;
  realm_access?: { roles: string[] };
}

export async function verifyToken(token: string): Promise<KeycloakJWTPayload> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: ISSUER,
  });
  return payload as KeycloakJWTPayload;
}

export function extractRoles(payload: KeycloakJWTPayload): string[] {
  return payload.realm_access?.roles ?? [];
}
