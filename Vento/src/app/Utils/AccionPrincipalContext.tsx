"use client";

import { createContext, useContext, useState } from "react";

type Aprincipal =
  | "seleccion-area"
  | "dimensiones"
  | "caracteristicas"
  | "informe"
  | null;

interface AprincipalContext {
  accion: Aprincipal;
  setAccion: (accion: Aprincipal) => void;
}

const AprincipalContext = createContext<AprincipalContext>({
  accion: "seleccion-area",
  setAccion: () => {},
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

  return (
    <AprincipalContext.Provider value={{ accion, setAccion }}>
      {children}
    </AprincipalContext.Provider>
  );
}
