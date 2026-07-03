import { describe, it, expect, vi } from "vitest";
import { useEffect, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import NextStepFloatingCard from "./NextStepFloatingCard";
import {
  AprincipalProvider,
  useAprincipal,
} from "../Utils/AccionPrincipalContext";

function Seed({
  accion,
  hexes,
  children,
}: {
  accion?: "seleccion-area" | "dimensiones" | "caracteristicas" | "informe";
  hexes?: string[];
  children: React.ReactNode;
}) {
  const { setAccion, setSelectedHexes } = useAprincipal();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (accion !== undefined) setAccion(accion);
    if (hexes && hexes.length > 0) setSelectedHexes(new Set(hexes));
    // Helper de test: siembra el contexto tras montar y libera el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ready) return null;
  return <>{children}</>;
}

function renderCard(
  opts: {
    accion?: "seleccion-area" | "dimensiones" | "caracteristicas" | "informe";
    hexes?: string[];
  } = {},
) {
  return render(
    <AprincipalProvider>
      <Seed accion={opts.accion} hexes={opts.hexes}>
        <NextStepFloatingCard />
        <AccionProbe />
      </Seed>
    </AprincipalProvider>,
  );
}

function AccionProbe() {
  const { accion } = useAprincipal();
  return <span data-testid="accion-state">{accion}</span>;
}

describe("NextStepFloatingCard", () => {
  it("no renderiza nada si no hay hexes seleccionados", () => {
    renderCard({ accion: "seleccion-area" });
    expect(screen.queryByTestId("next-step-cta")).not.toBeInTheDocument();
  });

  it("no renderiza fuera de la fase seleccion-area aun con hexes", () => {
    renderCard({ accion: "dimensiones", hexes: ["8a2a1072b59ffff"] });
    expect(screen.queryByTestId("next-step-cta")).not.toBeInTheDocument();
  });

  it("muestra el CTA cuando hay selección activa en seleccion-area", () => {
    renderCard({ accion: "seleccion-area", hexes: ["8a2a1072b59ffff"] });
    const cta = screen.getByTestId("next-step-cta");
    expect(cta).toHaveTextContent("Continuar a Dimensiones");
    expect(cta).toHaveTextContent("1 hexágono seleccionado");
  });

  it("pluraliza el conteo de hexágonos", () => {
    renderCard({
      accion: "seleccion-area",
      hexes: ["8a2a1072b59ffff", "8a2a1072b5bffff"],
    });
    expect(screen.getByTestId("next-step-cta")).toHaveTextContent(
      "2 hexágonos seleccionados",
    );
  });

  it("click en el CTA cambia la acción a dimensiones", () => {
    renderCard({ accion: "seleccion-area", hexes: ["8a2a1072b59ffff"] });
    fireEvent.click(screen.getByTestId("next-step-cta"));
    expect(screen.getByTestId("accion-state")).toHaveTextContent("dimensiones");
  });
});

void vi;
