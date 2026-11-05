"use client";

/**
 * Guía rápida en CARRUSEL (estilo onboarding) para las zonas de subida del admin.
 * Pasa entre pasos con flechas ‹ ›; puntos indicadores abajo. Debajo, un "léeme"
 * colapsable con el detalle completo (opcional). Inline (no modal).
 */
import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface GuideStep {
  titulo: string;
  texto: ReactNode;
}

export default function QuickGuide({
  steps,
  detalle,
  intro = "Guía rápida",
}: {
  steps: GuideStep[];
  /** Contenido del "léeme" (detalle completo), opcional. */
  detalle?: ReactNode;
  intro?: string;
}) {
  const [i, setI] = useState(0);
  if (!steps.length) return null;
  const last = steps.length - 1;
  const paso = steps[i];

  return (
    <div className="mt-3 rounded-2xl border border-[#cce1eeff] bg-[#f2f8fb] p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#165170ff]">
          {intro} · {i + 1}/{steps.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#cce1eeff] bg-white text-[#165170ff] transition-colors hover:bg-[#cce1eeff]/40 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => setI((n) => Math.min(last, n + 1))}
            disabled={i === last}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#cce1eeff] bg-white text-[#165170ff] transition-colors hover:bg-[#cce1eeff]/40 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 min-h-[64px]">
        <h4 className="text-sm font-bold text-gray-900">{paso.titulo}</h4>
        <div className="mt-1 text-[12px] leading-relaxed text-gray-600">
          {paso.texto}
        </div>
      </div>

      <div className="mt-3 flex gap-1.5">
        {steps.map((_, k) => (
          <button
            key={k}
            type="button"
            aria-label={`Ir al paso ${k + 1}`}
            onClick={() => setI(k)}
            className={`h-1.5 rounded-full transition-all ${
              k === i ? "w-4 bg-[#165170ff]" : "w-1.5 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>

      {detalle && (
        <details className="mt-3 border-t border-[#cce1eeff] pt-2 text-[12px] leading-relaxed text-gray-700">
          <summary className="cursor-pointer font-semibold text-[#165170ff]">
            Léeme (detalle completo)
          </summary>
          <div className="mt-2 space-y-2">{detalle}</div>
        </details>
      )}
    </div>
  );
}
