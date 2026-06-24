"use client";

import { SessionProvider } from "next-auth/react";
import { AprincipalProvider } from "./Utils/AccionPrincipalContext";
import { CaracteristicasProvider } from "./Utils/CaracteristicasContext";
import { HeatmapDimensionProvider } from "./Utils/HeatmapDimensionContext";
import { VariablesProvider } from "./Utils/VariablesContext";
import SessionGuard from "./Components/SessionGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>
        <AprincipalProvider>
          <VariablesProvider>
            <CaracteristicasProvider>
              <HeatmapDimensionProvider>{children}</HeatmapDimensionProvider>
            </CaracteristicasProvider>
          </VariablesProvider>
        </AprincipalProvider>
      </SessionGuard>
    </SessionProvider>
  );
}
