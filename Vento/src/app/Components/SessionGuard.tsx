"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * Detecta si la sesión expiró (refresh token inválido) y fuerza sign-out +
 * redirect a "/?expired=true" para mostrar aviso en el login.
 *
 * Debe renderizarse **dentro** de <SessionProvider>.
 */
export default function SessionGuard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = useSession();

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
