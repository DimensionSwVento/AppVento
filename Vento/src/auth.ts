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
    roles?: string[];
    error?: string; // para que SessionGuard detecte RefreshTokenError/NoRefreshToken
    sub?: string; // id del usuario (Keycloak `sub`) — lo consume el BFF del histórico
  }
}

declare module "next-auth/jwt" {
  interface JWT {
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
    typeof refreshed.id_token === "string" ? refreshed.id_token : undefined;
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
      refreshToken: newRefreshToken,
      expiresAt: token.expiresAt,
      roles: realmRolesFromOidcTokens(accessToken, newIdToken),
      error: "RefreshTokenError",
    };
  }

  return {
    ...token,
    refreshToken: newRefreshToken,
    expiresAt,
    roles: realmRolesFromOidcTokens(accessToken, newIdToken),
    error: undefined,
  };
}

/**
 * Censura ~la mitad de una cadena (URL/secreto) para logs: deja visible el
 * primer y último cuarto, oculta el medio con `****`. Suficiente para
 * identificar el valor sin filtrarlo entero a los logs.
 */
function maskHalf(value?: string | null): string {
  if (!value) return "❌ missing";
  const s = String(value);
  if (s.length <= 8) return "****";
  const q = Math.max(2, Math.floor(s.length / 4));
  return `${s.slice(0, q)}****${s.slice(-q)}`;
}

console.log("[AUTH] ENV CHECK:", {
  AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ? "✅" : "❌",
  AUTH_SECRET: process.env.AUTH_SECRET ? "✅" : "❌",
  AUTH_KEYCLOAK_ID: process.env.AUTH_KEYCLOAK_ID ?? "❌ missing",
  AUTH_KEYCLOAK_SECRET: process.env.AUTH_KEYCLOAK_SECRET ? "✅" : "❌",
  // URLs censuradas a la mitad (no se filtran enteras al log).
  AUTH_KEYCLOAK_ISSUER: maskHalf(process.env.AUTH_KEYCLOAK_ISSUER),
  BACKEND_URL: maskHalf(process.env.BACKEND_URL),
  NEXT_PUBLIC_API_URL: maskHalf(process.env.NEXT_PUBLIC_API_URL),
  INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET ? "✅" : "❌",
});

// AccuWeb: Keycloak reporta HTTPS como issuer pero internamente solo acepta HTTP.
// AUTH_KEYCLOAK_ISSUER debe ser la URL HTTP interna (ej: http://midominio.com/identity/realms/vento)
// Reescribimos a HTTPS para que coincida con lo que Keycloak valida en el token.
// Fallback "" en vez de `!`: este módulo se evalúa también durante
// `next build` (collecting page data), donde no hay env de auth — sin el
// fallback, `.replace` sobre undefined rompe el build.
const issuerEnv = process.env.AUTH_KEYCLOAK_ISSUER ?? "";
// En local (localhost/127.0.0.1) Keycloak emite el issuer HTTP tal cual —
// reescribirlo a HTTPS rompería la validación del "iss" (dev y e2e).
const isLocalIssuer = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(issuerEnv);
const issuer = isLocalIssuer
  ? issuerEnv
  : issuerEnv.replace(/^http:\/\//, "https://");
const wellKnownUrl = `${issuerEnv}/.well-known/openid-configuration`;

console.log("[AUTH] ISSUER CONFIG:", {
  envOriginal: maskHalf(issuerEnv),
  issuerRewritten: maskHalf(issuer),
  wellKnownUrl: maskHalf(wellKnownUrl),
});

// Reescribe URLs HTTPS → HTTP para conexiones internas en AccuWeb
function httpsToHttp(url: string): string {
  return url.replace(/^https:\/\//, "http://");
}

// Pre-fetch para diagnosticar qué devuelve Keycloak (sólo si hay issuer —
// en build no lo hay y el fetch sería ruido).
if (issuerEnv) {
  fetch(wellKnownUrl)
    .then((res) => res.json())
    .then((config) => {
      console.log("[AUTH] DISCOVERY OK:", {
        issuerFromKeycloak: maskHalf(config.issuer),
        issuerWeExpect: maskHalf(issuer),
        match: config.issuer === issuer ? "✅" : "❌ MISMATCH",
        tokenEndpoint: maskHalf(config.token_endpoint),
        tokenEndpointRewritten: maskHalf(httpsToHttp(config.token_endpoint)),
        authEndpoint: maskHalf(config.authorization_endpoint),
        authEndpointRewritten: maskHalf(httpsToHttp(config.authorization_endpoint)),
      });
    })
    .catch((err) => {
      console.error("[AUTH] DISCOVERY FETCH FAILED:", err.message);
    });
}

// ── Diagnóstico de conexión al BACKEND (una vez al arrancar) ────────────────
// No solo /health: prueba varios endpoints (abiertos y autenticados) para ver,
// por cada uno, la URL (censurada), el método, el estado y el cuerpo de la
// respuesta. Los autenticados envían la identidad interna (mismo patrón que el
// BFF `proxyBackend`). Se salta durante `next build` (sería ruido de red).
const BACKEND_BASE = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "";
if (BACKEND_BASE && process.env.NEXT_PHASE !== "phase-production-build") {
  const internalSecret = process.env.INTERNAL_API_SECRET || "";
  const PROBES: { method: string; path: string; auth?: boolean }[] = [
    { method: "GET", path: "/api/health" }, // abierto
    { method: "GET", path: "/api/tiles/warmup" }, // abierto
    { method: "GET", path: "/api/tiles/counts", auth: true }, // requiere identidad
    { method: "GET", path: "/api/historico", auth: true }, // requiere identidad
  ];
  console.log("[BACKEND] PROBE START:", {
    base: maskHalf(BACKEND_BASE),
    internalSecret: internalSecret ? "✅" : "❌ missing",
    endpoints: PROBES.length,
  });
  for (const p of PROBES) {
    const url = `${BACKEND_BASE}${p.path}`;
    const headers: Record<string, string> = {};
    if (p.auth) {
      headers["X-Internal-Secret"] = internalSecret;
      headers["X-User-Sub"] = "startup-probe";
      headers["X-User-Roles"] = "admin";
    }
    const t0 = Date.now();
    fetch(url, { method: p.method, headers, cache: "no-store" })
      .then(async (res) => {
        const body = (await res.text().catch(() => "")).slice(0, 200);
        console.log("[BACKEND] PROBE:", {
          method: p.method,
          url: maskHalf(url),
          status: res.status,
          ok: res.ok ? "✅" : "⚠️",
          ms: Date.now() - t0,
          body: body || "(vacío)",
        });
      })
      .catch((err) => {
        console.error("[BACKEND] PROBE FAILED:", {
          method: p.method,
          url: maskHalf(url),
          ms: Date.now() - t0,
          error: err?.message ?? String(err),
        });
      });
  }
}

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
      // Endpoints en HTTPS: el nodo Next alcanza el HTTPS público de Keycloak
      // (la discovery ya funciona sobre HTTPS). Reescribir a HTTP mandaba
      // peticiones HTTP planas al puerto HTTPS → nginx devolvía HTML → el
      // intercambio de token fallaba con "content-type must be application/json".
      authorization: {
        url: `${issuer}/protocol/openid-connect/auth`,
        params: { scope: "openid email profile" },
      },
      token: `${issuer}/protocol/openid-connect/token`,
      userinfo: `${issuer}/protocol/openid-connect/userinfo`,
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
      // Solo lo mínimo al cliente — idToken/accessToken/refreshToken NO se pasan al cliente
      // ni se persisten en el JWT cifrado (cookie > 4KB disparaba 400 nginx en AccuWeb).
      // Logout federado se hace con client_id + post_logout_redirect_uri (sin id_token_hint).
      session.roles = token.roles;  // necesario para RBAC en middleware y UI
      session.error = token.error;  // SessionGuard detecta RefreshTokenError para sign-out automático
      session.sub = token.sub;      // id de usuario para el BFF del histórico (ya está en la cookie)
      return session;
    },
  },
  pages: {
    signIn: "/",
    // Evita la página cruda /api/auth/error?error=... (se veía mal en la app):
    // cualquier error de auth redirige limpio al inicio.
    error: "/",
  },
});
