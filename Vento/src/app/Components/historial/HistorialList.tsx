"use client";
import { useMemo, useState } from "react";
import { Trash2, Eye, Info, Search } from "lucide-react";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import { useCaracteristicas } from "../../Utils/contexts/CaracteristicasContext";
import { useHistorial } from "../../Utils/historial/HistorialContext";
import { groupByRecency } from "../../Utils/historial/grouping";
import { MAX_HISTORIAL_ENTRIES as MAX_ENTRIES } from "../../Utils/projectData";
import type { InformeEntry } from "../../Utils/historial/types";
import { useToast } from "../ui/Toast";

const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});
const fmtKm2 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

type Periodo = "todos" | "hoy" | "semana" | "mes";
const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];
// Qué secciones de recencia muestra cada filtro (acumulativo).
const VISIBLE_POR_PERIODO: Record<Periodo, string[]> = {
  todos: ["hoy", "semana", "mes", "anteriores"],
  hoy: ["hoy"],
  semana: ["hoy", "semana"],
  mes: ["hoy", "semana", "mes"],
};

export default function HistorialList() {
  const { entries, remove } = useHistorial();
  const { setSelectedHexes, setAccion } = useAprincipal();
  const { replaceActiveVariables } = useVariables();
  const { restore: restoreCaracteristicas } = useCaracteristicas();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("todos");

  // Búsqueda por nombre (case-insensitive) → luego se agrupa por recencia.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => e.nombre.toLowerCase().includes(q)) : entries;
  }, [entries, query]);
  const groups = useMemo(() => groupByRecency(filtered), [filtered]);

  const verInforme = (e: InformeEntry) => {
    setSelectedHexes(new Set(e.hexes));
    replaceActiveVariables(e.variables);
    restoreCaracteristicas(e.caracteristicas);
    setAccion("informe");
  };

  const eliminar = async (e: InformeEntry) => {
    if (!window.confirm(`¿Eliminar el informe "${e.nombre}" del histórico?`)) return;
    await remove(e.id);
    toast.info("Informe eliminado del histórico");
  };

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-gray-600">
          Aún no has generado análisis
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Genera un informe y guárdalo para verlo aquí.
        </p>
      </div>
    );
  }

  const SECCIONES: { key: string; titulo: string; items: InformeEntry[] }[] = [
    { key: "hoy", titulo: "Hoy", items: groups.hoy },
    { key: "semana", titulo: "Esta semana", items: groups.semana },
    { key: "mes", titulo: "Este mes", items: groups.mes },
    { key: "anteriores", titulo: "Más antiguos", items: groups.anteriores },
  ];
  const visibleSecciones = SECCIONES.filter(
    (s) => VISIBLE_POR_PERIODO[periodo].includes(s.key) && s.items.length > 0,
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <h3 className="text-lg font-bold text-[#165170ff]">
        Histórico de informes
      </h3>

      {/* Búsqueda por nombre + filtros por periodo */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar informe por nombre…"
            aria-label="Buscar informe por nombre"
            className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 shadow-sm outline-none focus:border-[#165170ff]"
          />
        </div>
        <div className="flex gap-1.5">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              aria-pressed={periodo === p.id}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                periodo === p.id
                  ? "bg-[#165170ff] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {visibleSecciones.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-white px-3 py-4 text-center text-xs text-gray-500">
          No hay informes que coincidan con la búsqueda o el filtro.
        </p>
      )}

      {visibleSecciones.map((s) => (
        <section key={s.titulo}>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {s.titulo}
          </h4>
          <ul className="flex flex-col gap-2">
            {s.items.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {e.nombre}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {fmtFecha.format(new Date(e.createdAt))} ·{" "}
                    {fmtKm2.format(e.areaKm2)} km² · Score{" "}
                    {e.scores.general.toFixed(1)}
                  </p>
                </div>
                <button
                  onClick={() => verInforme(e)}
                  className="flex items-center gap-1 rounded-full bg-[#165170ff] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e6a8c]"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Ver
                </button>
                <button
                  onClick={() => eliminar(e)}
                  aria-label={`Eliminar ${e.nombre}`}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Aviso de espacio — mismo estilo que los toasts info (borde brand + bg claro). */}
      <p className="mt-auto flex items-start gap-2 rounded-lg border-l-4 border-[#165170ff] bg-[#cce1eeff]/40 px-3 py-2.5 text-[11px] leading-snug text-gray-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#165170ff]" aria-hidden="true" />
        <span>
          Se conservan hasta <strong>{MAX_ENTRIES}</strong> informes
          ({entries.length}/{MAX_ENTRIES}); al superar el límite se elimina
          automáticamente el más antiguo.
        </span>
      </p>
    </div>
  );
}
