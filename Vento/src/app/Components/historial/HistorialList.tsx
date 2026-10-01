"use client";
import { useEffect, useMemo, useState } from "react";
import { Trash2, Eye, Info, Search } from "lucide-react";
import { useAprincipal } from "../../Utils/contexts/AccionPrincipalContext";
import { useVariables } from "../../Utils/contexts/VariablesContext";
import { useCaracteristicas } from "../../Utils/contexts/CaracteristicasContext";
import { useHistorial } from "../../Utils/historial/HistorialContext";
import { groupByRecency } from "../../Utils/historial/grouping";
import { uncompactHexes } from "../../Utils/historial/hexCodec";
import { isHexBanned } from "../../Utils/h3/hexClassification";
import ConfirmDialog from "../ui/ConfirmDialog";
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
  const { entries, remove, error, loading, refresh } = useHistorial();
  const { setSelectedHexes, setAccion, requestMapFocus, restoreReportConfig } =
    useAprincipal();
  const { replaceActiveVariables } = useVariables();
  const { restore: restoreCaracteristicas } = useCaracteristicas();
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  // FB-FIX-07: confirmación de borrado con el modal propio de la app (antes
  // `window.confirm` nativo, que rompía la consistencia visual).
  const [confirmDel, setConfirmDel] = useState<InformeEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Re-consultar la BD CADA VEZ que se abre el histórico (este componente se
  // monta al entrar a la vista). Antes solo se consultaba una vez al arrancar la
  // app → al reabrir el histórico o tras un guardado en otra sesión mostraba el
  // estado en memoria (parecía "que solo duraba la sesión"). Ahora siempre
  // refleja lo persistido en el backend. `refresh` hace setState, así que se
  // difiere con setTimeout(0) para no llamarlo síncrono dentro del effect (regla
  // del React Compiler: react-hooks/set-state-in-effect).
  useEffect(() => {
    const t = setTimeout(refresh, 0);
    return () => clearTimeout(t);
  }, [refresh]);

  // Búsqueda por nombre (case-insensitive) → luego se agrupa por recencia.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => e.nombre.toLowerCase().includes(q)) : entries;
  }, [entries, query]);
  const groups = useMemo(() => groupByRecency(filtered), [filtered]);

  const verInforme = (e: InformeEntry) => {
    // Descompacta a la resolución original: lo guardado viene COMPACTADO
    // (`compactHexes`); en modo backend hay que restaurar la selección real para
    // que `/tiles/area` case (si no, el informe/tooltip restaurado sale vacío).
    // #14: al restaurar NO deben entrar zonas excluidas en la selección (igual que
    // a mano y por búsqueda). Se descompacta y se filtran las excluidas.
    setSelectedHexes(
      new Set(uncompactHexes(e.hexes).filter((h) => !isHexBanned(h))),
    );
    replaceActiveVariables(e.variables);
    restoreCaracteristicas(e.caracteristicas);
    // Rehidrata la config del informe guardada (US audit: antes se guardaba
    // en el histórico pero nunca se releía → el informe restaurado ignoraba
    // las secciones/gráfico elegidos y volvía a los defaults).
    if (e.reportConfig) restoreReportConfig(e.reportConfig);
    setAccion("informe");
    // Reencuadra el mapa a la selección del informe (efecto del botón de
    // enfoque). Sin esto el mapa —y la captura del informe/PDF— se quedaban en
    // la localización anterior.
    requestMapFocus();
  };

  const eliminar = (e: InformeEntry) => setConfirmDel(e);

  const doEliminar = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await remove(confirmDel.id);
      toast.info("Informe eliminado del histórico");
    } finally {
      setDeleting(false);
      setConfirmDel(null);
    }
  };

  // Fallo al traer el histórico → avisar + reintentar (no silenciar como vacío).
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-medium text-red-600">
          No se pudo cargar el histórico
        </p>
        <p className="mt-1 max-w-xs text-xs text-gray-400">{error}</p>
        <button
          type="button"
          onClick={() => refresh()}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#165170ff] px-3 py-1.5 text-xs font-semibold text-[#165170ff] hover:bg-[#cce1ee]/40 disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
          {loading ? "Reintentando…" : "Reintentar"}
        </button>
      </div>
    );
  }

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
                  {e.masterVersion && (
                    <p className="text-[10px] text-gray-400">
                      Datos: master {e.masterVersion}
                    </p>
                  )}
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

      {confirmDel && (
        <ConfirmDialog
          variant="danger"
          loading={deleting}
          title="Eliminar informe del histórico"
          confirmLabel="Eliminar"
          message={
            <>
              ¿Eliminar el informe <b>{confirmDel.nombre}</b> del histórico? Esta
              acción no se puede deshacer.
            </>
          }
          onConfirm={doEliminar}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
}
