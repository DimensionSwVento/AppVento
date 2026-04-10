"use client";

import { SessionProvider } from "next-auth/react";
import { AprincipalProvider } from "./Utils/AccionPrincipalContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AprincipalProvider>{children}</AprincipalProvider>
    </SessionProvider>
  );
}
