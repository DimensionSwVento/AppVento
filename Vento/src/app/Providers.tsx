"use client";

import { SessionProvider } from "next-auth/react";
import { AprincipalProvider } from "./Utils/contexts/AccionPrincipalContext";
import { CaracteristicasProvider } from "./Utils/contexts/CaracteristicasContext";
import { HeatmapDimensionProvider } from "./Utils/contexts/HeatmapDimensionContext";
import { VariablesProvider } from "./Utils/contexts/VariablesContext";
import { EconomicProvider } from "./Utils/contexts/EconomicContext";
import { RegulatoryProvider } from "./Utils/contexts/RegulatoryContext";
import { HistorialProvider } from "./Utils/historial/HistorialContext";
import { ToastProvider } from "./Components/ui/Toast";
import SessionGuard from "./Components/auth/SessionGuard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider>
        <SessionGuard>
          <AprincipalProvider>
            <VariablesProvider>
              <EconomicProvider>
              <RegulatoryProvider>
              <CaracteristicasProvider>
                <HeatmapDimensionProvider>
                <HistorialProvider>{children}</HistorialProvider>
              </HeatmapDimensionProvider>
              </CaracteristicasProvider>
              </RegulatoryProvider>
              </EconomicProvider>
            </VariablesProvider>
          </AprincipalProvider>
        </SessionGuard>
      </SessionProvider>
    </ToastProvider>
  );
}
