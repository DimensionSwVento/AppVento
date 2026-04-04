import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

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
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER!;
  const tokenUrl = `${issuer}/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.AUTH_KEYCLOAK_ID!,
      client_secret: process.env.AUTH_KEYCLOAK_SECRET!,
      refresh_token: token.refreshToken!,
    }),
  });

  const refreshed = await response.json();

  if (!response.ok) {
    return { ...token, error: "RefreshTokenError" };
  }

  return {
    ...token,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
    error: undefined,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Keycloak],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens from the OIDC response
      if (account) {
        const roles =
          (account as Record<string, unknown>).realm_access &&
          ((account as Record<string, unknown>).realm_access as { roles?: string[] }).roles
            ? ((account as Record<string, unknown>).realm_access as { roles: string[] }).roles
            : [];

        return {
          ...token,
          accessToken: account.access_token,
          idToken: (account as { id_token?: string }).id_token,
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
