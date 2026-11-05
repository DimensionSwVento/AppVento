"use client";

import { SessionProvider } from "next-auth/react";
import { AprincipalProvider } from "./Utils/contexts/AccionPrincipalContext";
import { CaracteristicasProvider } from "./Utils/contexts/CaracteristicasContext";
import { HeatmapDimensionProvider } from "./Utils/contexts/HeatmapDimensionContext";
import { VariablesProvider } from "./Utils/contexts/VariablesContext";
import { EconomicProvider } from "./Utils/contexts/EconomicContext";
import { RegulatoryProvider } from "./Utils/contexts/RegulatoryContext";
import { HistorialProvider } from "./Utils/historial/HistorialContext";
import { BackendHealthProvider } from "./Utils/contexts/BackendHealthContext";
import { ToastProvider } from "./Components/ui/Toast";
import SessionGuard from "./Components/auth/SessionGuard";
import BackendStatusBanner from "./Components/ui/BackendStatusBanner";
import FlowDraftSync from "./Utils/draft/FlowDraftSync";
import { ProviderComposer, type WrapperComponent } from "./Utils/ProviderComposer";

// SessionProvider con REFRESCO PROACTIVO: revalida la sesión cada pocos minutos
// (y al volver el foco a la pestaña), lo que dispara el `jwt` callback del
// servidor y refresca el access token ANTES de que expire. Sin esto, ver el
// informe ~30 min sin interactuar dejaba morir la sesión aunque el refresh
// funcione. El intervalo (en segundos) debe ser menor que la vida del access
// token de Keycloak.
const SessionProviderWithRefresh: WrapperComponent = ({ children }) => (
  <SessionProvider refetchInterval={4 * 60} refetchOnWindowFocus>
    {children}
  </SessionProvider>
);

// Orden = de MÁS EXTERNO a MÁS INTERNO (idéntico al anidamiento anterior).
// SessionGuard va después de SessionProvider (usa su sesión); los contextos de
// dominio dentro de la sesión ya validada.
const PROVIDERS: WrapperComponent[] = [
  ToastProvider,
  BackendHealthProvider,
  SessionProviderWithRefresh,
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
  return (
    <ProviderComposer providers={PROVIDERS}>
      <BackendStatusBanner />
      <FlowDraftSync />
      {children}
    </ProviderComposer>
  );
}
