import { decodeJwt } from "jose";
import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

type KeycloakJwtClaims = {
  realm_access?: { roles?: unknown };
};

function realmRolesFromKeycloakJwt(jwt: string | undefined | null): string[] {
  if (!jwt) return [];
  try {
    const payload = decodeJwt(jwt) as KeycloakJwtClaims;
    const roles = payload.realm_access?.roles;
    return Array.isArray(roles)
      ? roles.filter((r): r is string => typeof r === "string")
      : [];
  } catch {
    return [];
  }
}

/** Realm roles from Keycloak JWTs (access token first, then id token). */
function realmRolesFromOidcTokens(
  accessToken: string | undefined | null,
  idToken: string | undefined | null
): string[] {
  const fromAccess = realmRolesFromKeycloakJwt(accessToken);
  if (fromAccess.length > 0) return fromAccess;
  return realmRolesFromKeycloakJwt(idToken);
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    roles?: string[];
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    roles?: string[];
    error?: string;
  }
}

async function refreshAccessToken(
  token: import("next-auth/jwt").JWT
): Promise<import("next-auth/jwt").JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "NoRefreshToken" };
  }

  const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
  const tokenUrl = `${issuer}/protocol/openid-connect/token`;

  let response: Response;
  try {
    response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.AUTH_KEYCLOAK_ID!,
        client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
        refresh_token: token.refreshToken,
      }),
    });
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }

  if (!response.ok) {
    return { ...token, error: "RefreshTokenError" };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return { ...token, error: "RefreshTokenError" };
  }

  let refreshed: Record<string, unknown>;
  try {
    refreshed = await response.json();
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }

  const accessToken =
    typeof refreshed.access_token === "string"
      ? refreshed.access_token
      : token.accessToken;
  const newIdToken =
    typeof refreshed.id_token === "string"
      ? refreshed.id_token
      : token.idToken;
  const newRefreshToken =
    typeof refreshed.refresh_token === "string"
      ? refreshed.refresh_token
      : token.refreshToken;

  const expiresIn = Number(refreshed.expires_in);
  const expiresAt =
    Number.isFinite(expiresIn) && expiresIn > 0
      ? Math.floor(Date.now() / 1000) + expiresIn
      : undefined;

  if (expiresAt === undefined) {
    return {
      ...token,
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt: token.expiresAt,
      idToken: newIdToken,
      roles: realmRolesFromOidcTokens(accessToken, newIdToken),
      error: "RefreshTokenError",
    };
  }

  return {
    ...token,
    accessToken,
    refreshToken: newRefreshToken,
    expiresAt,
    idToken: newIdToken,
    roles: realmRolesFromOidcTokens(accessToken, newIdToken),
    error: undefined,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens from the OIDC response
      if (account) {
        const idToken = (account as { id_token?: string }).id_token;
        const roles = realmRolesFromOidcTokens(account.access_token, idToken);

        return {
          ...token,
          accessToken: account.access_token,
          idToken,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          roles,
        };
      }

      // Token still valid
      if (token.expiresAt && Date.now() / 1000 < token.expiresAt - 60) {
        return token;
      }

      // Token expired — attempt refresh
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      session.roles = token.roles;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
