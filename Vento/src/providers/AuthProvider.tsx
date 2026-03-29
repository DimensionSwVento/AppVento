"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type Keycloak from "keycloak-js";
import {
  getKeycloak,
  KEYCLOAK_INIT_OPTIONS,
  TOKEN_REFRESH_MARGIN_SECONDS,
} from "@/lib/keycloak";

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  preferredUsername: string;
  givenName: string;
  familyName: string;
  emailVerified: boolean;
  realmRoles: string[];
}

interface AuthContextValue {
  initialized: boolean;
  authenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  keycloak: Keycloak | null;
  login: () => void;
  logout: () => void;
  register: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseUser(kc: Keycloak): AuthUser | null {
  const idToken = kc.idTokenParsed as Record<string, unknown> | undefined;
  const accessToken = kc.tokenParsed as Record<string, unknown> | undefined;
  if (!idToken && !accessToken) return null;

  const profile = idToken ?? accessToken ?? {};

  const realmAccess =
    (accessToken?.realm_access as { roles?: string[] } | undefined) ??
    (idToken?.realm_access as { roles?: string[] } | undefined);

  return {
    sub: (profile.sub as string) ?? "",
    email: (profile.email as string) ?? "",
    name: (profile.name as string) ?? "",
    preferredUsername: (profile.preferred_username as string) ?? "",
    givenName: (profile.given_name as string) ?? "",
    familyName: (profile.family_name as string) ?? "",
    emailVerified: (profile.email_verified as boolean) ?? false,
    realmRoles: realmAccess?.roles ?? [],
  };
}

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [keycloak] = useState<Keycloak | null>(() =>
    globalThis.window === undefined ? null : getKeycloak(),
  );
  const initCalled = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!keycloak || initCalled.current) return;
    initCalled.current = true;

    const kc = keycloak;

    function stopInterval() {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleTokenRefresh() {
      kc.updateToken(TOKEN_REFRESH_MARGIN_SECONDS)
        .then((refreshed) => {
          if (refreshed) {
            setToken(kc.token ?? null);
            setUser(parseUser(kc));
          }
        })
        .catch(() => {
          setAuthenticated(false);
          setUser(null);
          setToken(null);
          stopInterval();
        });
    }

    kc.init(KEYCLOAK_INIT_OPTIONS)
      .then((auth) => {
        setAuthenticated(auth);
        setToken(kc.token ?? null);
        if (auth) setUser(parseUser(kc));
        setInitialized(true);

        if (auth) {
          intervalRef.current = setInterval(handleTokenRefresh, 30_000);
        }
      })
      .catch((err) => {
        console.error("Keycloak init failed", err);
        setInitialized(true);
      });

    return stopInterval;
  }, [keycloak]);

  const login = useCallback(() => {
    keycloak?.login({
      redirectUri: globalThis.location.origin + "/auth-test",
    });
  }, [keycloak]);

  const logout = useCallback(() => {
    keycloak?.logout({ redirectUri: globalThis.location.origin + "/" });
  }, [keycloak]);

  const register = useCallback(() => {
    keycloak?.register({
      redirectUri: globalThis.location.origin + "/auth-test",
    });
  }, [keycloak]);

  const refreshTokenFn = useCallback(async (): Promise<boolean> => {
    if (!keycloak) return false;
    try {
      const refreshed = await keycloak.updateToken(-1);
      if (refreshed) {
        setToken(keycloak.token ?? null);
        setUser(parseUser(keycloak));
      }
      return true;
    } catch {
      return false;
    }
  }, [keycloak]);

  const contextValue = useMemo(
    () => ({
      initialized,
      authenticated,
      user,
      token,
      keycloak,
      login,
      logout,
      register,
      refreshToken: refreshTokenFn,
    }),
    [initialized, authenticated, user, token, keycloak, login, logout, register, refreshTokenFn],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
