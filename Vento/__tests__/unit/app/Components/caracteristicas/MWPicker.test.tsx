import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MWPicker, {
  DEFAULT_MW_PICKER_DECIMAL_STEP,
  type MWPickerDecimalStep,
} from "@/app/Components/caracteristicas/MWPicker";

function ControlledPicker({
  initialValue,
  decimalStep,
  onChange,
}: {
  initialValue: number;
  decimalStep?: MWPickerDecimalStep;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <>
      <MWPicker
        value={value}
        decimalStep={decimalStep}
        onChange={(nextValue) => {
          onChange(nextValue);
          setValue(nextValue);
        }}
      />
      <output data-testid="capacity-value">{value.toFixed(2)}</output>
    </>
  );
}

describe("MWPicker", () => {
  it("descompone el valor en cinco inputs numéricos por dígito", () => {
    render(<MWPicker value={345.67} onChange={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Centenas" })).toHaveValue("3");
    expect(screen.getByRole("textbox", { name: "Decenas" })).toHaveValue("4");
    expect(screen.getByRole("textbox", { name: "Unidades" })).toHaveValue("5");
    expect(screen.getByRole("textbox", { name: "Décimas" })).toHaveValue("6");
    expect(screen.getByRole("textbox", { name: "Centésimas" })).toHaveValue("7");
  });

  it("mantiene el cero a la izquierda en los decimales", () => {
    render(<MWPicker value={1.05} onChange={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Décimas" })).toHaveValue("0");
    expect(screen.getByRole("textbox", { name: "Centésimas" })).toHaveValue("5");
  });

  it("normaliza valores externos al rango representable y a centésimas", () => {
    const { rerender } = render(
      <MWPicker value={1_000.456} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("textbox", { name: "Centenas" })).toHaveValue("9");
    expect(screen.getByRole("textbox", { name: "Decenas" })).toHaveValue("9");
    expect(screen.getByRole("textbox", { name: "Unidades" })).toHaveValue("9");
    expect(screen.getByRole("textbox", { name: "Décimas" })).toHaveValue("9");
    expect(screen.getByRole("textbox", { name: "Centésimas" })).toHaveValue("9");

    rerender(<MWPicker value={-1} onChange={vi.fn()} />);
    for (const name of [
      "Centenas",
      "Decenas",
      "Unidades",
      "Décimas",
      "Centésimas",
    ]) {
      expect(screen.getByRole("textbox", { name })).toHaveValue("0");
    }
  });

  it("acepta dígitos por teclado y avanza el foco hasta las centésimas", () => {
    const onChange = vi.fn();
    render(<ControlledPicker initialValue={0} onChange={onChange} />);

    const hundreds = screen.getByRole("textbox", { name: "Centenas" });
    const tens = screen.getByRole("textbox", { name: "Decenas" });
    const units = screen.getByRole("textbox", { name: "Unidades" });
    const tenths = screen.getByRole("textbox", { name: "Décimas" });
    const hundredths = screen.getByRole("textbox", { name: "Centésimas" });

    hundreds.focus();
    fireEvent.keyDown(hundreds, { key: "3" });
    expect(tens).toHaveFocus();
    fireEvent.keyDown(tens, { key: "4" });
    expect(units).toHaveFocus();
    fireEvent.keyDown(units, { key: "5" });
    expect(tenths).toHaveFocus();
    fireEvent.keyDown(tenths, { key: "6" });
    expect(hundredths).toHaveFocus();
    fireEvent.keyDown(hundredths, { key: "7" });

    expect(screen.getByTestId("capacity-value")).toHaveTextContent("345.67");
    expect(onChange).toHaveBeenLastCalledWith(345.67);
  });

  it("acepta entrada móvil o pegada y usa el último dígito válido", () => {
    const onChange = vi.fn();
    render(<ControlledPicker initialValue={0} onChange={onChange} />);
    const units = screen.getByRole("textbox", { name: "Unidades" });

    fireEvent.change(units, { target: { value: "8" } });
    expect(onChange).toHaveBeenLastCalledWith(8);

    fireEvent.paste(units, {
      clipboardData: { getData: () => "valor 42" },
    });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("ignora caracteres no numéricos sin mover el foco ni cambiar el valor", () => {
    const onChange = vi.fn();
    render(<ControlledPicker initialValue={15} onChange={onChange} />);
    const units = screen.getByRole("textbox", { name: "Unidades" });

    units.focus();
    expect(fireEvent.keyDown(units, { key: "x" })).toBe(false);
    fireEvent.change(units, { target: { value: "x" } });

    expect(units).toHaveFocus();
    expect(screen.getByTestId("capacity-value")).toHaveTextContent("15.00");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("las flechas arriba y abajo ajustan el dígito enfocado", () => {
    const onChange = vi.fn();
    render(<MWPicker value={15} onChange={onChange} />);
    const units = screen.getByRole("textbox", { name: "Unidades" });

    fireEvent.keyDown(units, { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith(16);
    onChange.mockClear();
    fireEvent.keyDown(units, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith(14);
  });

  it("los controles enteros recomponen el valor y envuelven cada dígito", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MWPicker value={349.67} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aumentar Decenas" }));
    expect(onChange).toHaveBeenCalledWith(359.67);

    onChange.mockClear();
    rerender(<MWPicker value={9} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Aumentar Unidades" }));
    expect(onChange).toHaveBeenCalledWith(0);

    onChange.mockClear();
    rerender(<MWPicker value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Disminuir Unidades" }));
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it("usa 5 centésimas como paso predeterminado provisional", () => {
    const onChange = vi.fn();
    render(<MWPicker value={12.4} onChange={onChange} />);

    expect(DEFAULT_MW_PICKER_DECIMAL_STEP).toBe(5);
    expect(
      screen.getByRole("group", { name: "Centésimas" }),
    ).toHaveAccessibleDescription("Paso decimal de 0.05 MW");

    fireEvent.click(
      screen.getByRole("button", { name: "Aumentar Centésimas" }),
    );
    expect(onChange).toHaveBeenCalledWith(12.45);
  });

  it("permite configurar saltos de 10 centésimas", () => {
    const onChange = vi.fn();
    render(<MWPicker value={12.4} onChange={onChange} decimalStep={10} />);

    expect(
      screen.getByRole("group", { name: "Centésimas" }),
    ).toHaveAccessibleDescription("Paso decimal de 0.1 MW");

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Décimas" }), {
      key: "ArrowUp",
    });
    expect(onChange).toHaveBeenCalledWith(12.5);

    onChange.mockClear();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Centésimas" }), {
      key: "ArrowDown",
    });
    expect(onChange).toHaveBeenCalledWith(12.3);
  });

  it.each([
    { decimalStep: 5 as const, value: 5.97, expected: 5.02 },
    { decimalStep: 10 as const, value: 5.95, expected: 5.05 },
  ])(
    "envuelve los decimales en 0-99 con paso $decimalStep",
    ({ decimalStep, value, expected }) => {
      const onChange = vi.fn();
      render(
        <MWPicker
          value={value}
          onChange={onChange}
          decimalStep={decimalStep}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Aumentar Centésimas" }),
      );
      expect(onChange).toHaveBeenCalledWith(expected);
    },
  );

  it("preserva la interacción con la rueda del mouse", () => {
    const onChange = vi.fn();
    render(<MWPicker value={15.25} onChange={onChange} decimalStep={10} />);

    fireEvent.wheel(screen.getByRole("group", { name: "Unidades" }), {
      deltaY: -100,
    });
    expect(onChange).toHaveBeenCalledWith(16.25);

    onChange.mockClear();
    fireEvent.wheel(screen.getByRole("group", { name: "Centésimas" }), {
      deltaY: 100,
    });
    expect(onChange).toHaveBeenCalledWith(15.15);
  });

  it("expone el estado inválido y la descripción del error", () => {
    render(
      <>
        <MWPicker
          value={0}
          onChange={vi.fn()}
          invalid
          describedBy="capacity-error"
        />
        <p id="capacity-error">Capacidad fuera de rango</p>
      </>,
    );

    const picker = screen.getByRole("group", {
      name: "Capacidad nominal en megavatios",
    });
    expect(picker).toHaveAccessibleDescription("Capacidad fuera de rango");
    expect(screen.getByRole("textbox", { name: "Unidades" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
