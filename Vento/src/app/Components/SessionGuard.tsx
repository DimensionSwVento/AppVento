"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { syncAccessToken } from "../Utils/authFetch";

/**
 * Keeps the module-level access token in sync with the NextAuth session
 * and forces a full sign-out + redirect when the refresh token is dead.
 *
 * Must be rendered **inside** <SessionProvider>.
 */
export default function SessionGuard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = useSession();

  useEffect(() => {
    syncAccessToken(session?.accessToken);
  }, [session?.accessToken]);

  useEffect(() => {
    if (
      session?.error === "RefreshTokenError" ||
      session?.error === "NoRefreshToken"
    ) {
      signOut({ redirect: false }).then(() => {
        globalThis.location.href = "/?expired=true";
      });
    }
  }, [session?.error]);

  return <>{children}</>;
}
