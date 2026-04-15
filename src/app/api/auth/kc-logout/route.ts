import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const issuerEnv = process.env.AUTH_KEYCLOAK_ISSUER;
  const clientId = process.env.AUTH_KEYCLOAK_ID;
  if (!issuerEnv || !clientId) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const issuer = issuerEnv.replace(/^http:\/\//, "https://").replace(/\/$/, "");
  const origin = req.nextUrl.origin;
  const post = encodeURIComponent(`${origin}/`);
  const url = `${issuer}/protocol/openid-connect/logout?client_id=${encodeURIComponent(clientId)}&post_logout_redirect_uri=${post}`;
  return NextResponse.redirect(url);
}
