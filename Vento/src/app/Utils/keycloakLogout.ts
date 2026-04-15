export function keycloakLogoutUrl(idToken: string | undefined, postLogoutReturnToAppOrigin: string): string | null {
  const explicitIssuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER?.replace(/\/$/, "");
  const base = process.env.NEXT_PUBLIC_KEYCLOAK_URL?.replace(/\/$/, "");
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
  const issuer =
    explicitIssuer ||
    (base && realm ? `${base}/realms/${realm}` : null);
  if (!issuer) return null;
  const post = encodeURIComponent(`${postLogoutReturnToAppOrigin.replace(/\/$/, "")}/`);
  const hint = idToken ? `&id_token_hint=${encodeURIComponent(idToken)}` : "";
  return `${issuer}/protocol/openid-connect/logout?post_logout_redirect_uri=${post}${hint}`;
}
