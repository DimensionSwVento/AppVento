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
import { ProviderComposer, type WrapperComponent } from "./Utils/ProviderComposer";

// Orden = de MÁS EXTERNO a MÁS INTERNO (idéntico al anidamiento anterior).
// SessionGuard va después de SessionProvider (usa su sesión); los contextos de
// dominio dentro de la sesión ya validada.
const PROVIDERS: WrapperComponent[] = [
  ToastProvider,
  SessionProvider,
  SessionGuard,
  AprincipalProvider,
  VariablesProvider,
  EconomicProvider,
  RegulatoryProvider,
  CaracteristicasProvider,
  HeatmapDimensionProvider,
  HistorialProvider,
];

export default function AppProvider({ children }: { children: React.ReactNode }) {
  return <ProviderComposer providers={PROVIDERS}>{children}</ProviderComposer>;
}
