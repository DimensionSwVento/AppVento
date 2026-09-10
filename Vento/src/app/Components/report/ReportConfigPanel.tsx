"use client";

/**
 * Panel "Configuración del informe" (US06-03). El usuario define QUÉ incluir
 * antes de guardar/descargar: dimensiones puntuables, tipo de gráfico y qué
 * secciones aparecen. Vive FUERA del `reportRef` (no entra al PDF) y además va
 * marcado `data-pdf-ignore` por si se moviera dentro. La previsualización se
 * actualiza en vivo (CA10).
 */
import type { ReportChartType, ReportConfig } from "../../Utils/report/reportConfig";

interface ReportConfigPanelProps {
  config: ReportConfig;
  /** Dimensiones puntuables disponibles (id + label). */
  scorableDims: { id: string; label: string }[];
  onPatch: (patch: Partial<ReportConfig>) => void;
  onToggleDim: (id: string) => void;
  /** Columna única (panel lateral del builder) en vez de tarjeta 3-col. */
  vertical?: boolean;
}

const CHART_OPTIONS: { value: ReportChartType; label: string }[] = [
  { value: "radar", label: "Radar" },
  { value: "pie", label: "Circular" },
  { value: "bar", label: "Barras" },
];

export default function ReportConfigPanel({
  config,
  scorableDims,
  onPatch,
  onToggleDim,
  vertical = false,
}: ReportConfigPanelProps) {
  const activeDims = scorableDims.filter((d) => config.dims[d.id]).length;

  return (
    <section
      data-pdf-ignore="true"
      className={
        vertical
          ? "w-full"
          : "w-full max-w-[800px] rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      }
      aria-label="Configuración del informe"
    >
      <div className={`${vertical ? "hidden" : "mb-3"} flex items-center gap-2`}>
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#cce1eeff] text-[#165170ff]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M10 18h4" />
          </svg>
        </span>
        <h4 className="text-sm font-semibold text-[#165170ff]">
          Configuración del informe
        </h4>
      </div>

      <div className={vertical ? "flex flex-col gap-5" : "grid grid-cols-1 gap-4 md:grid-cols-3"}>
        {/* Tipo de gráfico */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Gráfico de puntajes
          </p>
          <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
            {CHART_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPatch({ chartType: opt.value })}
                aria-pressed={config.chartType === opt.value}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  config.chartType === opt.value
                    ? "bg-[#165170ff] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dimensiones puntuables */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Dimensiones puntuables ({activeDims}/{scorableDims.length})
          </p>
          <div className="flex flex-col gap-1">
            {scorableDims.map((d) => (
              <Check
                key={d.id}
                label={d.label}
                checked={!!config.dims[d.id]}
                onChange={() => onToggleDim(d.id)}
              />
            ))}
          </div>
        </div>

        {/* Secciones del informe */}
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Secciones
          </p>
          <div className="flex flex-col gap-1">
            <Check
              label="Mapa del área"
              checked={config.showMap}
              onChange={() => onPatch({ showMap: !config.showMap })}
            />
            <Check
              label="Detalle de variables puntuadas"
              checked={config.showScoreDetail}
              onChange={() => onPatch({ showScoreDetail: !config.showScoreDetail })}
            />
            <Check
              label="Variables que más influyen"
              checked={config.showInfluencers}
              onChange={() => onPatch({ showInfluencers: !config.showInfluencers })}
            />
            <Check
              label="Detalle interno del modelo"
              checked={config.showModelDetail}
              onChange={() => onPatch({ showModelDetail: !config.showModelDetail })}
            />
            <Check
              label="Variables informativas"
              checked={config.showInformative}
              onChange={() => onPatch({ showInformative: !config.showInformative })}
            />
            <Check
              label="Variables excluyentes"
              checked={config.showExcluyentes}
              onChange={() => onPatch({ showExcluyentes: !config.showExcluyentes })}
            />
            <Check
              label="Regulatoria (informativa)"
              checked={config.showRegulatoria}
              onChange={() => onPatch({ showRegulatoria: !config.showRegulatoria })}
            />
            <Check
              label="Fuentes de datos"
              checked={config.showSources}
              onChange={() => onPatch({ showSources: !config.showSources })}
            />
          </div>
        </div>
      </div>

      <p className="mt-3 border-t border-gray-100 pt-2 text-[10px] italic leading-snug text-gray-400">
        La previsualización se actualiza al instante. El PDF y lo guardado al
        histórico reflejan exactamente esta configuración.
      </p>
    </section>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 shrink-0 accent-[#165170] cursor-pointer"
      />
      <span className="min-w-0">{label}</span>
    </label>
  );
}
