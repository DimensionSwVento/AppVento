import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CaracteristicasProvider,
  useCaracteristicas,
} from "./CaracteristicasContext";

/** Componente sonda: expone el estado y dispara setters desde botones. */
function Probe() {
  const c = useCaracteristicas();
  return (
    <div>
      <span data-testid="state">
        {JSON.stringify({
          tipo: c.tipoEmplazamiento,
          tec: c.tipoTecnologiaOffshore,
          mw: c.capacidadMW,
          num: c.numAerogeneradores,
          cat: c.categoriaAerogenerador,
          sin: c.distanciaSINKm,
        })}
      </span>
      <button onClick={() => c.setTipoEmplazamiento("offshore")}>offshore</button>
      <button onClick={() => c.setTipoTecnologiaOffshore("flotante")}>flotante</button>
      <button onClick={() => c.setTipoEmplazamiento("onshore")}>onshore</button>
      <button onClick={() => c.setCapacidadMW(150.5)}>mw</button>
      <button onClick={() => c.setNumAerogeneradores(25)}>num</button>
      <button onClick={() => c.setCategoriaAerogenerador("M")}>cat</button>
      <button onClick={() => c.setDistanciaSINKm(12.3)}>sin</button>
      <button onClick={() => c.reset()}>reset</button>
    </div>
  );
}

function state() {
  return JSON.parse(screen.getByTestId("state").textContent!);
}

describe("CaracteristicasContext", () => {
  it("estado inicial: todo null", () => {
    render(
      <CaracteristicasProvider>
        <Probe />
      </CaracteristicasProvider>,
    );
    expect(state()).toEqual({
      tipo: null,
      tec: null,
      mw: null,
      num: null,
      cat: null,
      sin: null,
    });
  });

  it("los setters actualizan cada campo", () => {
    render(
      <CaracteristicasProvider>
        <Probe />
      </CaracteristicasProvider>,
    );
    fireEvent.click(screen.getByText("offshore"));
    fireEvent.click(screen.getByText("flotante"));
    fireEvent.click(screen.getByText("mw"));
    fireEvent.click(screen.getByText("num"));
    fireEvent.click(screen.getByText("cat"));
    fireEvent.click(screen.getByText("sin"));
    expect(state()).toEqual({
      tipo: "offshore",
      tec: "flotante",
      mw: 150.5,
      num: 25,
      cat: "M",
      sin: 12.3,
    });
  });

  it("volver a onshore limpia el sub-tipo offshore", () => {
    render(
      <CaracteristicasProvider>
        <Probe />
      </CaracteristicasProvider>,
    );
    fireEvent.click(screen.getByText("offshore"));
    fireEvent.click(screen.getByText("flotante"));
    expect(state().tec).toBe("flotante");
    fireEvent.click(screen.getByText("onshore"));
    expect(state()).toMatchObject({ tipo: "onshore", tec: null });
  });

  it("reset vuelve al estado inicial", () => {
    render(
      <CaracteristicasProvider>
        <Probe />
      </CaracteristicasProvider>,
    );
    fireEvent.click(screen.getByText("offshore"));
    fireEvent.click(screen.getByText("mw"));
    fireEvent.click(screen.getByText("reset"));
    expect(state()).toEqual({
      tipo: null,
      tec: null,
      mw: null,
      num: null,
      cat: null,
      sin: null,
    });
  });

  it("fuera del provider entrega el contexto noop (no lanza)", () => {
    render(<Probe />);
    expect(state().tipo).toBeNull();
    // Setters noop: no lanzan ni cambian estado.
    fireEvent.click(screen.getByText("offshore"));
    expect(state().tipo).toBeNull();
  });
});
