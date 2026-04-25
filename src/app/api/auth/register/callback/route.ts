import { NextRequest, NextResponse } from "next/server";

/**
 * Callback del flujo de registro (ver `/api/auth/register/route.ts` y ADR-012).
 *
 * Secuencia:
 *  1. Validamos el `state` contra la cookie (CSRF).
 *  2. Intercambiamos el `code` por tokens en el token endpoint server-side.
 *     Necesitamos el `id_token` para poder hacer logout federado (id_token_hint).
 *  3. Redirigimos al usuario al logout endpoint de Keycloak con
 *     `post_logout_redirect_uri=/registration-success`. Keycloak termina la
 *     sesion SSO, borra la cookie y redirige a la confirmacion.
 *
 * NUNCA creamos sesion NextAuth aqui — garantiza AC3 (no hay forma de llegar
 * al dashboard sin pasar por /login despues).
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieState = req.cookies.get("vento_register_state")?.value;

  const issuerEnv = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;

  if (!issuerEnv || !clientId || !clientSecret) {
    console.error(
      "[REGISTER_CB] Missing AUTH_KEYCLOAK_* env vars, cannot complete flow",
    );
    return clearStateCookie(
      NextResponse.redirect(new URL("/?error=register_config", req.url)),
    );
  }

  // Origin publico (mismo criterio que register/route.ts y kc-logout).
  const authUrl = process.env.AUTH_URL?.replace(/\/$/, "");
  const fwdProto = req.headers.get("x-forwarded-proto");
  const fwdHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin =
    authUrl ??
    (fwdProto && fwdHost ? `${fwdProto}://${fwdHost}` : url.origin);

  // Usuario canceló o Keycloak rechazó el registro (ej. email duplicado).
  if (error) {
    console.warn("[REGISTER_CB] Keycloak returned error:", error);
    return clearStateCookie(
      NextResponse.redirect(new URL(`/?error=register_${error}`, req.url)),
    );
  }

  if (!code || !state) {
    return clearStateCookie(
      NextResponse.redirect(new URL("/?error=register_missing_code", req.url)),
    );
  }

  // CSRF check
  if (!cookieState || cookieState !== state) {
    console.warn("[REGISTER_CB] state mismatch (CSRF protection)");
    return clearStateCookie(
      NextResponse.redirect(new URL("/?error=register_state", req.url)),
    );
  }

  const issuerInternal = issuerEnv.replace(/\/$/, "");
  const issuerPublic = issuerInternal.replace(/^http:\/\//, "https://");

  const tokenUrl = `${issuerInternal}/protocol/openid-connect/token`;
  const redirectUri = `${origin}/api/auth/register/callback`;

  let idToken: string | undefined;
  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        "[REGISTER_CB] token exchange failed:",
        res.status,
        await res.text().catch(() => ""),
      );
      return clearStateCookie(
        NextResponse.redirect(
          new URL("/?error=register_token_exchange", req.url),
        ),
      );
    }

    const body = (await res.json()) as { id_token?: unknown };
    if (typeof body.id_token === "string") {
      idToken = body.id_token;
    }
  } catch (err) {
    console.error("[REGISTER_CB] token exchange threw:", err);
    return clearStateCookie(
      NextResponse.redirect(
        new URL("/?error=register_token_exchange", req.url),
      ),
    );
  }

  // Redirect final: federated logout -> /registration-success.
  // Usamos issuer HTTPS publico porque el navegador es quien sigue el redirect.
  const postLogoutRedirect = `${origin}/registration-success`;
  const logoutParams = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: postLogoutRedirect,
  });
  if (idToken) {
    // id_token_hint no es obligatorio desde KC 18+ si el client_id y
    // post_logout_redirect_uri estan whitelisted, pero cuando existe evita el
    // "consent screen" de cierre de sesion.
    logoutParams.set("id_token_hint", idToken);
  }

  const logoutUrl = `${issuerPublic}/protocol/openid-connect/logout?${logoutParams.toString()}`;
  return clearStateCookie(NextResponse.redirect(logoutUrl));
}

function clearStateCookie(res: NextResponse): NextResponse {
  res.cookies.set("vento_register_state", "", {
    httpOnly: true,
    path: "/api/auth/register",
    maxAge: 0,
  });
  return res;
}
