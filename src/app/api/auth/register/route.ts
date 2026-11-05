import { NextRequest, NextResponse } from "next/server";

/**
 * Inicia el flujo de registro en Keycloak.
 *
 * No usamos `signIn("keycloak")` de NextAuth porque:
 *  1. Necesitamos el endpoint `/registrations` de Keycloak (no `/auth`) para
 *     que KC muestre directamente el form de registro en vez del de login.
 *     NOTA: `kc_action=register` NO funciona — ese param es para Required Actions
 *     (CONFIGURE_TOTP, UPDATE_PASSWORD, etc.); Keycloak lo rechaza con
 *     `kc_action_status=error` y muestra login igualmente.
 *  2. Tras el registro, necesitamos interceptar el callback en una ruta propia
 *     (`/api/auth/register/callback`) para cerrar la sesion SSO antes de crear
 *     sesion NextAuth — ver ADR-012 y US-FB-02 (AC3).
 *
 * CSRF: generamos un `state` aleatorio y lo guardamos en cookie HttpOnly para
 * verificarlo en el callback.
 */
export async function GET(req: NextRequest) {
  const issuerEnv = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;

  if (!issuerEnv || !clientId) {
    console.error(
      "[REGISTER] Missing AUTH_KEYCLOAK_ISSUER or AUTH_KEYCLOAK_ID env",
    );
    return NextResponse.redirect(new URL("/?error=register_config", req.url));
  }

  // Browser-facing redirect: usamos HTTPS como hace kc-logout/route.ts.
  const issuer = issuerEnv.replace(/^http:\/\//, "https://").replace(/\/$/, "");

  // Origin publico para construir redirect_uri. Misma prioridad que kc-logout.
  const authUrl = process.env.AUTH_URL?.replace(/\/$/, "");
  const fwdProto = req.headers.get("x-forwarded-proto");
  const fwdHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin =
    authUrl ??
    (fwdProto && fwdHost ? `${fwdProto}://${fwdHost}` : req.nextUrl.origin);

  const redirectUri = `${origin}/api/auth/register/callback`;

  // state = 32 bytes random hex (CSRF)
  const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  // Keycloak expone `/registrations` como alias del Authorization Endpoint
  // pero con la pestaña de registro pre-seleccionada. Es el mecanismo oficial
  // para ir directamente al form de registro sin pasar por login.
  // Ref: https://www.keycloak.org/docs/latest/server_admin/#_registration-recaptcha
  const response = NextResponse.redirect(
    `${issuer}/protocol/openid-connect/registrations?${params.toString()}`,
  );

  // Cookie para verificar el state en el callback. Scope limitado al callback.
  response.cookies.set("vento_register_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/register",
    maxAge: 10 * 60, // 10 min: el usuario debe completar el form en ese tiempo.
  });

  return response;
}

/**
 * Algunos navegadores/formularios inician el flujo con POST (p. ej. reenvío de
 * formulario). Lo tratamos igual que GET para no devolver 405 en el iniciador
 * del registro.
 */
export async function POST(req: NextRequest) {
  return GET(req);
}
