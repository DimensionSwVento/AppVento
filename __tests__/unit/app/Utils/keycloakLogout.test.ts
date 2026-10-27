import { describe, it, expect, vi, beforeEach } from "vitest";
import { keycloakLogoutUrl } from "@/app/Utils/apis/keycloakLogout";

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("keycloakLogoutUrl", () => {
  it("builds URL with id_token_hint when idToken is provided", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KEYCLOAK_ISSUER",
      "https://kc.example.com/realms/vento",
    );

    const url = keycloakLogoutUrl("id-token-123", "https://app.example.com");

    expect(url).toBe(
      "https://kc.example.com/realms/vento/protocol/openid-connect/logout" +
        "?post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2F" +
        "&id_token_hint=id-token-123",
    );
  });

  it("builds URL without id_token_hint when idToken is undefined", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KEYCLOAK_ISSUER",
      "https://kc.example.com/realms/vento",
    );

    const url = keycloakLogoutUrl(undefined, "https://app.example.com");

    expect(url).toBe(
      "https://kc.example.com/realms/vento/protocol/openid-connect/logout" +
        "?post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2F",
    );
    expect(url).not.toContain("id_token_hint");
  });

  it("falls back to NEXT_PUBLIC_KEYCLOAK_URL + REALM when issuer is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_ISSUER", "");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_URL", "https://kc.example.com");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_REALM", "vento");

    const url = keycloakLogoutUrl("tok", "https://app.example.com");

    expect(url).toContain(
      "https://kc.example.com/realms/vento/protocol/openid-connect/logout",
    );
    expect(url).toContain("id_token_hint=tok");
  });

  it("returns null when no issuer and no base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_ISSUER", "");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_URL", "");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_REALM", "");

    const url = keycloakLogoutUrl("tok", "https://app.example.com");
    expect(url).toBeNull();
  });

  it("returns null when base URL exists but realm is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_ISSUER", "");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_URL", "https://kc.example.com");
    vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_REALM", "");

    const url = keycloakLogoutUrl("tok", "https://app.example.com");
    expect(url).toBeNull();
  });

  it("strips trailing slashes from issuer and origin", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KEYCLOAK_ISSUER",
      "https://kc.example.com/realms/vento/",
    );

    const url = keycloakLogoutUrl("tok", "https://app.example.com/");

    expect(url).toContain(
      "https://kc.example.com/realms/vento/protocol/openid-connect/logout",
    );
    expect(url).toContain(
      "post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2F",
    );
  });

  it("encodes special characters in the id_token", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_KEYCLOAK_ISSUER",
      "https://kc.example.com/realms/vento",
    );

    const tokenWithSpecialChars = "eyJ+abc/def=";
    const url = keycloakLogoutUrl(
      tokenWithSpecialChars,
      "https://app.example.com",
    );

    expect(url).toContain(
      `id_token_hint=${encodeURIComponent(tokenWithSpecialChars)}`,
    );
  });
});
