"use client";

import { useCallback } from "react";

/**
 * Selector de capacidad nominal en MW estilo "ruedas tipo iOS" (versión ligera).
 *
 * 4 dígitos visibles en una fila: `[C][D][U] . [M][M]`
 *   - C centenas, D decenas, U unidades (cada uno 0–9)
 *   - MM = parte decimal en centésimas (0..99, paso 0.01)
 *
 * Total: 0.00 – 999.99 MW. Sin inputs nativos: cada celda tiene ▲ / dígito / ▼
 * y soporta scroll-wheel + teclado (↑ ↓). Mismo formato visual que pidió el
 * cliente (`[0][0].[1][0][0]`), sin dependencia externa.
 */

const DIGITS_TENS = ["centenas", "decenas", "unidades"] as const;

export interface MWPickerProps {
  value: number; // MW (puede ser fraccional)
  onChange: (mw: number) => void;
}

export default function MWPicker({ value, onChange }: MWPickerProps) {
  // Descomposición: c*100 + d*10 + u + m*0.01
  const c = Math.floor(value / 100) % 10;
  const d = Math.floor(value / 10) % 10;
  const u = Math.floor(value) % 10;
  // Centésimas (parte decimal × 100, redondeada): 0..99
  const m = Math.round((value - Math.floor(value)) * 100) % 100;

  const compose = useCallback(
    (parts: { c: number; d: number; u: number; m: number }) =>
      onChange(parts.c * 100 + parts.d * 10 + parts.u + parts.m / 100),
    [onChange],
  );

  const setC = (n: number) => compose({ c: clamp10(n), d, u, m });
  const setD = (n: number) => compose({ c, d: clamp10(n), u, m });
  const setU = (n: number) => compose({ c, d, u: clamp10(n), m });
  const setM = (n: number) => compose({ c, d, u, m: clamp100(n) });

  return (
    <div className="flex items-center justify-center gap-1">
      <Wheel
        ariaLabel="Centenas"
        digit={c}
        onIncrement={() => setC(c + 1)}
        onDecrement={() => setC(c - 1)}
      />
      <Wheel
        ariaLabel="Decenas"
        digit={d}
        onIncrement={() => setD(d + 1)}
        onDecrement={() => setD(d - 1)}
      />
      <Wheel
        ariaLabel="Unidades"
        digit={u}
        onIncrement={() => setU(u + 1)}
        onDecrement={() => setU(u - 1)}
      />
      <Dot />
      <Wheel
        ariaLabel="Centésimas"
        digit={m}
        width="wide"
        format={(n) => n.toString().padStart(2, "0")}
        onIncrement={() => setM(m + 1)}
        onDecrement={() => setM(m - 1)}
      />
      <span className="ml-2 select-none text-sm font-semibold text-gray-500">
        MW
      </span>
    </div>
  );
}

function clamp10(n: number) {
  return ((n % 10) + 10) % 10;
}
function clamp100(n: number) {
  return ((n % 100) + 100) % 100;
}

function Wheel({
  digit,
  onIncrement,
  onDecrement,
  ariaLabel,
  width = "narrow",
  format,
}: {
  digit: number;
  onIncrement: () => void;
  onDecrement: () => void;
  ariaLabel: string;
  width?: "narrow" | "wide";
  format?: (n: number) => string;
}) {
  const text = format ? format(digit) : digit.toString();
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`flex flex-col items-center select-none ${
        width === "wide" ? "w-12" : "w-8"
      }`}
      onWheel={(e) => {
        e.preventDefault();
        if (e.deltaY > 0) onDecrement();
        else onIncrement();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onIncrement();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onDecrement();
        }
      }}
      tabIndex={0}
    >
      <button
        type="button"
        aria-label={`Aumentar ${ariaLabel}`}
        onClick={onIncrement}
        className="text-gray-400 hover:text-[#165170ff]"
      >
        <ChevronUp />
      </button>
      <span className="block w-full rounded-md bg-gray-50 py-1.5 text-center font-mono text-lg font-bold text-[#165170ff] ring-1 ring-gray-200">
        {text}
      </span>
      <button
        type="button"
        aria-label={`Disminuir ${ariaLabel}`}
        onClick={onDecrement}
        className="text-gray-400 hover:text-[#165170ff]"
      >
        <ChevronDown />
      </button>
    </div>
  );
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="mt-3 self-end pb-2 text-lg font-bold text-[#165170ff]"
    >
      .
    </span>
  );
}

function ChevronUp() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.94l-3.71 3.83a.75.75 0 11-1.08-1.04l4.25-4.39a.75.75 0 011.08 0l4.25 4.39a.75.75 0 01-.02 1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// eslint exhaustive-deps: el array DIGITS_TENS no se usa en runtime,
// se mantiene para documentar la convención del orden de los dígitos.
void DIGITS_TENS;
