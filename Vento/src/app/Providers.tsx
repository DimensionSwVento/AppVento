"use client";

import { SessionProvider } from "next-auth/react";
import { AprincipalProvider } from "./Utils/AccionPrincipalContext";
import SessionGuard from "./Components/SessionGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>
        <AprincipalProvider>{children}</AprincipalProvider>
      </SessionGuard>
    </SessionProvider>
  );
}
