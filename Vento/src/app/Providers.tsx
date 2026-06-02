"use client";

import { SessionProvider } from "next-auth/react";
import { AprincipalProvider } from "./Utils/AccionPrincipalContext";
import { CaracteristicasProvider } from "./Utils/CaracteristicasContext";
import SessionGuard from "./Components/SessionGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>
        <AprincipalProvider>
          <CaracteristicasProvider>{children}</CaracteristicasProvider>
        </AprincipalProvider>
      </SessionGuard>
    </SessionProvider>
  );
}
