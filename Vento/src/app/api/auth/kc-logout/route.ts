import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const issuerEnv = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  if (!issuerEnv || !clientId) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const issuer = issuerEnv.replace(/^http:\/\//, "https://").replace(/\/$/, "");

  // Detrás de proxy (nginx AccuWeb), req.nextUrl.origin es la URL interna.
  // Prioridad: AUTH_URL (env) > x-forwarded-* headers > req.nextUrl.origin
  const authUrl = process.env.AUTH_URL?.replace(/\/$/, "");
  const fwdProto = req.headers.get("x-forwarded-proto");
  const fwdHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin =
    authUrl ??
    (fwdProto && fwdHost ? `${fwdProto}://${fwdHost}` : req.nextUrl.origin);

  const post = encodeURIComponent(`${origin}/`);
  const url = `${issuer}/protocol/openid-connect/logout?client_id=${encodeURIComponent(clientId)}&post_logout_redirect_uri=${post}`;
  return NextResponse.redirect(url);
}
