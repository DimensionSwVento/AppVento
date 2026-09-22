"use client";

/**
 * Actualizador de METADATOS (Fase 1 del rediseño anidado): sube un CSV/XLSX
 * (InfoVariables), muestra el PLAN (qué columnas se mapean / se omiten) y APLICA
 * (upsert de la jerarquía dimensión→criterio→subcriterio→variable, conciliando
 * por master_id). Solo admin. Ver docs/spec/backend-arquitectura-anidada.md.
 */
import { useCallback, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import { useToast } from "../../Components/ui/Toast";
import {
  uploadMetadata,
  planMetadata,
  applyMetadata,
  type MetadataPlan,
} from "../../Utils/admin/catalogApi";

type ApplyResult = {
  dimensiones: number;
  criterios: number;
  subcriterios: number;
  variables: number;
};

export default function AdminMetadatosPage() {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [sheet, setSheet] = useState("");
  const [plan, setPlan] = useState<MetadataPlan | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [busy, setBusy] = useState(false);

  const doPlan = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const up = await uploadMetadata(file);
      setPath(up.path);
      const p = await planMetadata(up.path, "infovariables", sheet || undefined);
      setPlan(p);
      toast.success(`Analizado: ${p.summary.mapeadas} columnas mapeadas, ${p.summary.sin_mapear} omitidas`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falló el análisis");
    } finally {
      setBusy(false);
    }
  }, [file, sheet, toast]);

  const doApply = useCallback(async () => {
    if (!path) return;
    setBusy(true);
    try {
      const r = await applyMetadata(path, "infovariables", sheet || undefined);
      setResult(r);
      toast.success(
        `Aplicado: ${r.variables} variables · ${r.dimensiones} dim · ${r.criterios} crit · ${r.subcriterios} subcrit`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falló la aplicación");
    } finally {
      setBusy(false);
    }
  }, [path, sheet, toast]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar>{null}</SideBar>
      <main className="flex-1 overflow-y-auto p-8">
        <AdminNav />
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-semibold text-gray-800">
            Actualizador de metadatos (InfoVariables)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sube el CSV/XLSX del catálogo. Se clasifican las columnas y se actualiza
            la jerarquía <b>dimensión → criterio → subcriterio → variable</b>,
            conciliando cada variable por su <code>master_id</code>.
          </p>

          {/* 1. Subir + analizar */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
            <label className="block text-sm font-medium text-gray-700">
              Archivo (.csv / .xlsx)
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xlsm"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPlan(null);
                setResult(null);
              }}
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#165170ff] file:px-3 file:py-1.5 file:text-white"
            />
            <div className="mt-3 flex items-end gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500">
                  Hoja (solo XLSX, opcional)
                </label>
                <input
                  value={sheet}
                  onChange={(e) => setSheet(e.target.value)}
                  placeholder="Hoja1"
                  className="mt-0.5 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <button
                onClick={doPlan}
                disabled={!file || busy}
                className="rounded-md bg-[#165170ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Analizando…" : "Analizar columnas"}
              </button>
            </div>
          </div>

          {/* 2. Plan */}
          {plan && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-700">
                Plan · {plan.rows} filas{plan.sheet ? ` · hoja ${plan.sheet}` : ""}
              </h2>
              <div className="mt-2 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Mapeadas ({plan.summary.mapeadas})
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[12px]">
                    {plan.mapped.map((m) => (
                      <li key={m.header} className="flex justify-between gap-2">
                        <span className="truncate text-gray-600">{m.header}</span>
                        <span className="shrink-0 font-mono text-[#165170ff]">
                          → {m.destino}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    Omitidas ({plan.summary.sin_mapear})
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[12px] text-gray-400">
                    {plan.unmapped.map((u) => (
                      <li key={u.header} className="truncate">{u.header}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                onClick={doApply}
                disabled={busy || plan.summary.mapeadas === 0}
                className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Aplicando…" : "Aplicar al catálogo"}
              </button>
            </div>
          )}

          {/* 3. Resultado */}
          {result && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Actualizado: <b>{result.variables}</b> variables · {result.dimensiones} dimensiones ·{" "}
              {result.criterios} criterios · {result.subcriterios} subcriterios.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
