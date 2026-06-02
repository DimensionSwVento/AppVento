"use client";

import { SessionProvider } from "next-auth/react";
import { AprincipalProvider } from "./Utils/AccionPrincipalContext";
import { HeatmapDimensionProvider } from "./Utils/HeatmapDimensionContext";
import SessionGuard from "./Components/SessionGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>
        <AprincipalProvider>
          <HeatmapDimensionProvider>{children}</HeatmapDimensionProvider>
        </AprincipalProvider>
      </SessionGuard>
    </SessionProvider>
  );
}
