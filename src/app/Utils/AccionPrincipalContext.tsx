"use client";

import { createContext, useContext, useState } from "react";

export type Aprincipal =
  | "seleccion-area"
  | "dimensiones"
  | "caracteristicas"
  | "informe"
  | null;

interface AprincipalContext {
  accion: Aprincipal;
  setAccion: (accion: Aprincipal) => void;
  selectedHexes: Set<string>;
  setSelectedHexes: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const AprincipalContext = createContext<AprincipalContext>({
  accion: "seleccion-area",
  setAccion: () => {},
  selectedHexes: new Set(),
  setSelectedHexes: () => {},
});

export function useAprincipal() {
  return useContext(AprincipalContext);
}

export function AprincipalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [accion, setAccion] = useState<Aprincipal>("seleccion-area");
  const [selectedHexes, setSelectedHexes] = useState<Set<string>>(new Set());

  return (
    <AprincipalContext.Provider value={{ accion, setAccion, selectedHexes, setSelectedHexes }}>
      {children}
    </AprincipalContext.Provider>
  );
}
