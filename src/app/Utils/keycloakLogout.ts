export function keycloakLogoutUrl(idToken: string, postLogoutReturnToAppOrigin: string): string | null {
  const explicitIssuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER?.replace(/\/$/, "");
  const base = process.env.NEXT_PUBLIC_KEYCLOAK_URL?.replace(/\/$/, "");
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
  const issuer =
    explicitIssuer ||
    (base && realm ? `${base}/realms/${realm}` : null);
  if (!issuer) return null;
  const post = encodeURIComponent(`${postLogoutReturnToAppOrigin.replace(/\/$/, "")}/`);
  return `${issuer}/protocol/openid-connect/logout?id_token_hint=${encodeURIComponent(idToken)}&post_logout_redirect_uri=${post}`;
}
