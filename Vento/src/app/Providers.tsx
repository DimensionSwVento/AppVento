"use client";

import { SessionProvider } from "next-auth/react";
import { AprincipalProvider } from "./Utils/AccionPrincipalContext";
import { VariablesProvider } from "./Utils/VariablesContext";
import SessionGuard from "./Components/SessionGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>
        <AprincipalProvider>
          <VariablesProvider>{children}</VariablesProvider>
        </AprincipalProvider>
      </SessionGuard>
    </SessionProvider>
  );
}
