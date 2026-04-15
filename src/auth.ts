import { decodeJwt } from "jose";
import NextAuth from "next-auth";
// import Keycloak from "next-auth/providers/keycloak"; // reemplazado por provider OIDC manual con httpsToHttp para AccuWeb

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
  idToken: string | undefined | null,
): string[] {
  const fromAccess = realmRolesFromKeycloakJwt(accessToken);
  if (fromAccess.length > 0) return fromAccess;
  return realmRolesFromKeycloakJwt(idToken);
}

declare module "next-auth" {
  interface Session {
    idToken?: string;
    roles?: string[];
    error?: string; // para que SessionGuard detecte RefreshTokenError/NoRefreshToken
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    roles?: string[];
    error?: string;
  }
}

async function refreshAccessToken(
  token: import("next-auth/jwt").JWT,
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
      : undefined;
  const newIdToken =
    typeof refreshed.id_token === "string" ? refreshed.id_token : token.idToken;
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
      idToken: newIdToken,
      refreshToken: newRefreshToken,
      expiresAt: token.expiresAt,
      roles: realmRolesFromOidcTokens(accessToken, newIdToken),
      error: "RefreshTokenError",
    };
  }

  return {
    ...token,
    idToken: newIdToken,
    refreshToken: newRefreshToken,
    expiresAt,
    roles: realmRolesFromOidcTokens(accessToken, newIdToken),
    error: undefined,
  };
}

console.log("[AUTH] ENV CHECK:", {
  AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ? "✅" : "❌",
  AUTH_SECRET: process.env.AUTH_SECRET ? "✅" : "❌",
  AUTH_KEYCLOAK_ID: process.env.AUTH_KEYCLOAK_ID ?? "❌ missing",
  AUTH_KEYCLOAK_SECRET: process.env.AUTH_KEYCLOAK_SECRET ? "✅" : "❌",
  AUTH_KEYCLOAK_ISSUER: process.env.AUTH_KEYCLOAK_ISSUER ?? "❌ missing",
});

// AccuWeb: Keycloak reporta HTTPS como issuer pero internamente solo acepta HTTP.
// AUTH_KEYCLOAK_ISSUER debe ser la URL HTTP interna (ej: http://midominio.com/identity/realms/vento)
// Reescribimos a HTTPS para que coincida con lo que Keycloak valida en el token.
const issuerEnv = process.env.AUTH_KEYCLOAK_ISSUER!;
const issuer = issuerEnv.replace(/^http:\/\//, "https://");
const wellKnownUrl = `${issuerEnv}/.well-known/openid-configuration`;

console.log("[AUTH] ISSUER CONFIG:", {
  envOriginal: issuerEnv,
  issuerRewritten: issuer,
  wellKnownUrl,
});

// Reescribe URLs HTTPS → HTTP para conexiones internas en AccuWeb
function httpsToHttp(url: string): string {
  return url.replace(/^https:\/\//, "http://");
}

// Pre-fetch para diagnosticar qué devuelve Keycloak
fetch(wellKnownUrl)
  .then((res) => res.json())
  .then((config) => {
    console.log("[AUTH] DISCOVERY OK:", {
      issuerFromKeycloak: config.issuer,
      issuerWeExpect: issuer,
      match: config.issuer === issuer ? "✅" : "❌ MISMATCH",
      tokenEndpoint: config.token_endpoint,
      tokenEndpointRewritten: httpsToHttp(config.token_endpoint),
      authEndpoint: config.authorization_endpoint,
      authEndpointRewritten: httpsToHttp(config.authorization_endpoint),
    });
  })
  .catch((err) => {
    console.error("[AUTH] DISCOVERY FETCH FAILED:", err.message);
  });

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    {
      id: "keycloak",
      name: "Keycloak",
      type: "oidc",
      clientId: process.env.AUTH_KEYCLOAK_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      // issuer HTTPS para validación de tokens (Keycloak devuelve HTTPS en el JWT)
      issuer,
      // Endpoints reescritos a HTTP para conexión interna (AccuWeb no permite HTTPS entre contenedores)
      authorization: {
        url: httpsToHttp(`${issuer}/protocol/openid-connect/auth`),
        params: { scope: "openid email profile" },
      },
      token: httpsToHttp(`${issuer}/protocol/openid-connect/token`),
      userinfo: httpsToHttp(`${issuer}/protocol/openid-connect/userinfo`),
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in: persist tokens from the OIDC response
      if (account) {
        const idToken = (account as { id_token?: string }).id_token;
        const roles = realmRolesFromOidcTokens(account.access_token, idToken);

        return {
          ...token,
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
      // Solo lo mínimo al cliente — accessToken y refreshToken se quedan
      // server-side en el JWT cifrado para evitar cookies > 4KB (error 400 nginx).
      // Si en el futuro el frontend necesita llamar APIs con Bearer, usar
      // un proxy API route que lea el token con auth() server-side.
      session.idToken = token.idToken;  // necesario para logout federado en SideBar
      session.roles = token.roles;      // necesario para RBAC en middleware y UI
      session.error = token.error;      // SessionGuard detecta RefreshTokenError para sign-out automático
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
