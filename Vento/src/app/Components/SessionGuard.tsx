"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * Detecta si la sesión expiró (refresh token inválido) y muestra un modal
 * amigable durante 3s antes de forzar sign-out + redirect a "/?expired=true".
 *
 * Debe renderizarse **dentro** de <SessionProvider>.
 */

const REDIRECT_DELAY_MS = 3000;

export default function SessionGuard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: session } = useSession();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (
      session?.error === "RefreshTokenError" ||
      session?.error === "NoRefreshToken"
    ) {
      setExpired(true);
      const timer = setTimeout(() => {
        signOut({ redirect: false }).then(() => {
          globalThis.location.href = "/?expired=true";
        });
      }, REDIRECT_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [session?.error]);

  return (
    <>
      {children}
      {expired && (
        <div
          role="alertdialog"
          aria-labelledby="session-expired-title"
          aria-describedby="session-expired-desc"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#165170]/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[#165170]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2
              id="session-expired-title"
              className="text-base font-semibold text-gray-800"
            >
              Tu sesión ha expirado
            </h2>
            <p
              id="session-expired-desc"
              className="mt-2 text-sm text-gray-500"
            >
              Serás redirigido para iniciar sesión nuevamente.
            </p>
            <div className="mt-4 h-1 w-full overflow-hidden rounded bg-gray-100">
              <div
                className="h-full rounded bg-[#165170]"
                style={{
                  animation: `sg-progress ${REDIRECT_DELAY_MS}ms linear forwards`,
                }}
              />
            </div>
          </div>
          <style>{`
            @keyframes sg-progress {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
