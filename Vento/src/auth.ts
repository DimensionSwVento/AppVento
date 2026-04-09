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

async function refreshAccessToken(token: import("next-auth/jwt").JWT) {
  if (!token.refreshToken) {
    return { ...token, error: "NoRefreshToken" };
  }

  const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
  const tokenUrl = `${issuer}/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.AUTH_KEYCLOAK_ID!,
      client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
      refresh_token: token.refreshToken,
    }),
  });

  const refreshed = await response.json();

  if (!response.ok) {
    return { ...token, error: "RefreshTokenError" };
  }

  const accessToken =
    typeof refreshed.access_token === "string"
      ? refreshed.access_token
      : token.accessToken;
  const newIdToken =
    typeof (refreshed as { id_token?: unknown }).id_token === "string"
      ? (refreshed as { id_token: string }).id_token
      : token.idToken;

  return {
    ...token,
    accessToken,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
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
