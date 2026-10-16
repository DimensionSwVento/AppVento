"use client";

import type { ReactNode } from "react";

/** Logo de aerogenerador (SVG inline — se captura limpio en el PDF). */
function TurbineIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* torre */}
      <path d="M11 12h2l.7 9h-3.4L11 12z" fill="#165170" />
      {/* aspas */}
      <g fill="#165170">
        <path d="M12 11a1 1 0 0 1-1-1V3.2a.8.8 0 0 1 1.5-.4l2.2 5.6A1 1 0 0 1 14 10l-1.5 1z" />
        <path d="M12 11a1 1 0 0 1 .9.4l3.9 5.5a.8.8 0 0 1-1 1.2l-5.3-3A1 1 0 0 1 11 12z" />
        <path d="M12 11a1 1 0 0 1-.6 1.3l-6.2 2.2a.8.8 0 0 1-.9-1.2l3.8-5.1A1 1 0 0 1 13 10.9z" />
      </g>
      <circle cx="12" cy="11" r="1.4" fill="#0f3d52" />
    </svg>
  );
}

/**
 * Una HOJA A4 del informe (US06-03/04). Ancho fijo A4 @96dpi (794px); el alto
 * base es A4 (1123px) y crece solo si el contenido lo excede. Cada sección va en
 * su propia hoja y las tablas largas se parten en MINI-TABLAS (una por hoja) para
 * que nunca se corten a mitad. En el PDF, cada hoja se captura como UNA página
 * (selector `data-report-sheet`), así no hay huecos ni cortes.
 */
export default function ReportSheet({
  region,
  index,
  total,
  children,
}: {
  region?: string | null;
  index: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <div
      data-report-sheet="true"
      className="report-sheet relative mx-auto flex w-[794px] flex-col bg-white shadow-md ring-1 ring-black/5"
      // Alto MÍNIMO A4 (794×1123 @96dpi) pero crece con el contenido en vez de
      // recortarlo (antes `height`+`overflow-hidden` cortaba lo que sobraba, #1).
      // El export corta en páginas A4 por altura (slicing multipágina).
      style={{ width: 794, minHeight: 1123 }}
    >
      {/* Cabecera: logo del aerogenerador + "Idoneidad eólica" en negrilla */}
      <div className="flex items-center justify-between border-b-2 border-[#165170ff] px-10 pb-3 pt-8">
        <div className="flex items-center gap-2">
          <TurbineIcon />
          <span className="text-sm font-extrabold tracking-tight text-[#165170ff]">
            Idoneidad eólica
          </span>
        </div>
        <span className="text-[10px] text-gray-400">
          {region ? `Vento — ${region}` : "Vento"}
        </span>
      </div>

      {/* Contenido de la hoja */}
      <div className="flex-1 px-10 py-6">{children}</div>

      {/* Pie con número de página */}
      <div className="flex items-center justify-between border-t border-gray-200 px-10 pb-6 pt-2 text-[9px] text-gray-400">
        <span className="font-bold text-[#165170ff]">Vento</span>
        <span>
          Página {index + 1} de {total}
        </span>
      </div>
    </div>
  );
}
