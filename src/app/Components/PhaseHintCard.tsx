"use client";

import { useEffect, useState } from "react";
import { useAprincipal, type Aprincipal } from "../Utils/AccionPrincipalContext";

type Phase = Exclude<Aprincipal, null>;

/**
 * Tarjeta flotante de "hint" por fase del flujo. Aparece como guía permanente
 * (cuando no se puede dismiss) o como tarjeta pequeña eliminable (las demás).
 *
 * - `seleccion-area`: hint PERMANENTE (no dismissable) — sólo desaparece cuando
 *   el usuario selecciona al menos un hex (se asume que la NextStepFloatingCard
 *   ya cubre ese estado).
 * - Otras fases: hint chico arriba-izquierda con botón ✕ para cerrar.
 *   El dismiss se recuerda por fase en `localStorage`.
 */
const HINTS: Record<Phase, { text: string; persistent?: boolean }> = {
  "seleccion-area": {
    text: "Selecciona un área en el mapa para poder analizar su prefactibilidad.",
    persistent: true,
  },
  dimensiones: {
    text:
      "Elige las variables informativas que quieras analizar. No afectan el resultado final, pero dan más precisión al informe.",
  },
  caracteristicas: {
    text:
      "Completa las propiedades técnicas del proyecto (emplazamiento, capacidad, número de aerogeneradores, distancia al SIN).",
  },
  informe: {
    text:
      "Revisa los puntajes por dimensión y descarga el informe en PDF. Cambia la dimensión visualizada con el selector del mapa.",
  },
};

const STORAGE_KEY = "vento:phaseHint:dismissed";

function readDismissed(): Set<Phase> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as Phase[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeDismissed(set: Set<Phase>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* storage lleno o bloqueado → silenciar */
  }
}

export default function PhaseHintCard() {
  const { accion, selectedHexes } = useAprincipal();
  const [dismissed, setDismissed] = useState<Set<Phase>>(new Set());

  // Cargar dismissed-state al montar (cliente sólo)
  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  if (!accion) return null;
  const phase = accion as Phase;
  const hint = HINTS[phase];
  if (!hint) return null;

  // En selección de área: ocultar cuando ya hay hexes seleccionados.
  if (phase === "seleccion-area" && selectedHexes.size > 0) return null;

  // En otras fases: respetar dismiss persistido.
  if (!hint.persistent && dismissed.has(phase)) return null;

  const handleDismiss = () => {
    const next = new Set(dismissed);
    next.add(phase);
    setDismissed(next);
    writeDismissed(next);
  };

  // Estilos: persistent = grande centrado abajo (mismo skin que NextStepFloatingCard);
  // dismissable = chico arriba-izquierda discreto.
  if (hint.persistent) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
      >
        <div
          className="group relative h-[6rem] w-[30rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border-2 border-[#165170ff] bg-white px-4 py-3 text-left text-[#165170ff] shadow-xl shadow-black/20 motion-safe:animate-[vento-cta-in_220ms_ease-out]"
        >
          <span
            className="absolute inset-x-0 top-0 h-1 bg-[#cce1eeff]"
            aria-hidden="true"
          />
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Paso 1
          </span>
          <span className="mt-1 flex items-center justify-between gap-3 text-[13px] font-bold leading-tight">
            <span>{hint.text}</span>
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#165170ff] text-[14px] text-white"
              aria-hidden="true"
            >
              {">"}
            </span>
          </span>
          <span className="mt-1 block text-[10px] leading-tight opacity-80">
            Toca un hexágono o usa el buscador del mapa
          </span>
        </div>
      </div>
    );
  }

  const phaseLabel: Record<Phase, string> = {
    "seleccion-area": "Paso 1",
    dimensiones: "Paso 2",
    caracteristicas: "Paso 3",
    informe: "Paso 4",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-3 left-3 z-10"
    >
      <div className="group relative w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border-2 border-[#165170ff] bg-white px-3 py-2.5 text-left text-[#165170ff] shadow-lg shadow-black/15 motion-safe:animate-[vento-cta-in_220ms_ease-out]">
        <span
          className="absolute inset-x-0 top-0 h-1 bg-[#cce1eeff]"
          aria-hidden="true"
        />
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
              {phaseLabel[phase]}
            </p>
            <p className="mt-0.5 text-[11px] font-medium leading-snug text-[#165170ff]">
              {hint.text}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Ocultar este tip"
            className="shrink-0 text-gray-400 hover:text-[#165170ff]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path
                fillRule="evenodd"
                d="M4.29 4.29a1 1 0 011.42 0L10 8.59l4.29-4.3a1 1 0 011.42 1.42L11.41 10l4.3 4.29a1 1 0 01-1.42 1.42L10 11.41l-4.29 4.3a1 1 0 01-1.42-1.42L8.59 10 4.29 5.71a1 1 0 010-1.42z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
