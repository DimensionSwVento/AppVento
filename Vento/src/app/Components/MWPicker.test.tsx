import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MWPicker from "./MWPicker";

describe("MWPicker", () => {
  it("descompone el valor en centenas, decenas, unidades y centésimas", () => {
    render(<MWPicker value={345.67} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Centenas" })).toHaveTextContent("3");
    expect(screen.getByRole("group", { name: "Decenas" })).toHaveTextContent("4");
    expect(screen.getByRole("group", { name: "Unidades" })).toHaveTextContent("5");
    expect(screen.getByRole("group", { name: "Centésimas" })).toHaveTextContent("67");
  });

  it("muestra las centésimas con cero a la izquierda", () => {
    render(<MWPicker value={1.05} onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Centésimas" })).toHaveTextContent("05");
  });

  it("incrementar un dígito recompone el valor en MW", () => {
    const onChange = vi.fn();
    render(<MWPicker value={345.67} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar Decenas" }));
    expect(onChange).toHaveBeenCalledWith(355.67);
  });

  it("los dígitos envuelven en 0-9 (9 + 1 = 0, 0 - 1 = 9)", () => {
    const onChange = vi.fn();
    const { rerender } = render(<MWPicker value={9} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar Unidades" }));
    expect(onChange).toHaveBeenCalledWith(0);

    onChange.mockClear();
    rerender(<MWPicker value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Disminuir Unidades" }));
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it("las centésimas envuelven en 0-99", () => {
    const onChange = vi.fn();
    render(<MWPicker value={5.99} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar Centésimas" }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("soporta teclado: ↑ incrementa, ↓ decrementa", () => {
    const onChange = vi.fn();
    render(<MWPicker value={15} onChange={onChange} />);
    const unidades = screen.getByRole("group", { name: "Unidades" });
    fireEvent.keyDown(unidades, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith(16);
    onChange.mockClear();
    fireEvent.keyDown(unidades, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith(14);
  });

  it("soporta scroll-wheel: deltaY negativo incrementa, positivo decrementa", () => {
    const onChange = vi.fn();
    render(<MWPicker value={15} onChange={onChange} />);
    const unidades = screen.getByRole("group", { name: "Unidades" });
    fireEvent.wheel(unidades, { deltaY: -100 });
    expect(onChange).toHaveBeenCalledWith(16);
    onChange.mockClear();
    fireEvent.wheel(unidades, { deltaY: 100 });
    expect(onChange).toHaveBeenCalledWith(14);
  });
});
