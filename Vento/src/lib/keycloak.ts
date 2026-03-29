import Keycloak from "keycloak-js";

const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8080",
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "vento",
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "vento-web",
};

let keycloakInstance: Keycloak | null = null;

export function getKeycloak(): Keycloak {
  if (typeof window === "undefined") {
    throw new Error("Keycloak can only be used in the browser");
  }
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak(keycloakConfig);
  }
  return keycloakInstance;
}

export const KEYCLOAK_INIT_OPTIONS: Keycloak.KeycloakInitOptions = {
  onLoad: "check-sso",
  pkceMethod: "S256",
  checkLoginIframe: false,
};

export const TOKEN_REFRESH_MARGIN_SECONDS = 60;
