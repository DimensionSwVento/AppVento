import { describe, it, expect } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import NextStepButton from "@/app/Components/ui/NextStepButton";
import { AprincipalProvider, useAprincipal } from "@/app/Utils/contexts/AccionPrincipalContext";

function Probe() {
  const { accion } = useAprincipal();
  return <span data-testid="accion">{accion}</span>;
}

function Seeder({ to }: { to: "dimensiones" | "caracteristicas" | "informe" }) {
  const { setAccion } = useAprincipal();
  useEffect(() => {
    setAccion(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

describe("NextStepButton", () => {
  it("no se renderiza en el último paso (informe)", () => {
    render(
      <AprincipalProvider>
        <Seeder to="informe" />
        <NextStepButton />
      </AprincipalProvider>
    );
    expect(screen.queryByText("Siguiente paso")).not.toBeInTheDocument();
  });

  it("avanza de dimensiones a caracteristicas al hacer click", () => {
    render(
      <AprincipalProvider>
        <Seeder to="dimensiones" />
        <NextStepButton />
        <Probe />
      </AprincipalProvider>
    );
    expect(screen.getByTestId("accion").textContent).toBe("dimensiones");
    const btn = screen.getByRole("button");
    act(() => btn.click());
    expect(screen.getByTestId("accion").textContent).toBe("caracteristicas");
  });
});
