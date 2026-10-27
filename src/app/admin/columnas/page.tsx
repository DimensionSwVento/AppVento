"use client";

import { useCallback, useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import { useToast } from "../../Components/ui/Toast";
import {
  fetchRegistryColumns,
  reconcileColumn,
  renameColumn,
  COLUMN_KINDS,
  type RegistryColumn,
} from "../../Utils/admin/bundleApi";

/**
 * Admin · Columnas consumidas (N1c). Lista las columnas de la máster/InfoVariables
 * que la app consume (registro `parquet_column`): su CLASE, a qué está CONECTADA
 * (target_ref) y sus usos. Permite RENOMBRARLAS (si la fuente cambia el nombre de
 * la columna, aquí se actualiza y la app la sigue consumiendo) y reasignar clase /
 * conexión. Persiste en BD (`/admin/bundle/columns`).
 */
type Draft = { name: string; kind: string; targetRef: string; nota: string };

export default function AdminColumnasPage() {
  const toast = useToast();
  const [cols, setCols] = useState<RegistryColumn[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchRegistryColumns();
      setCols(list);
      const d: Record<string, Draft> = {};
      for (const c of list)
        d[c.name] = { name: c.name, kind: c.kind, targetRef: c.targetRef, nota: c.nota };
      setDrafts(d);
    } catch {
      toast.error("No se pudieron cargar las columnas");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const setDraft = (orig: string, p: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [orig]: { ...d[orig], ...p } }));

  const save = async (orig: string) => {
    const d = drafts[orig];
    if (!d) return;
    setSavingName(orig);
    try {
      // 1) Renombrar si cambió el nombre (crea el nuevo con el mapeo, borra el viejo).
      const key = d.name.trim() && d.name.trim() !== orig ? d.name.trim() : orig;
      if (key !== orig) await renameColumn(orig, key);
      // 2) Actualizar clase / conexión / nota sobre el nombre resultante.
      await reconcileColumn(key, {
        kind: d.kind,
        targetRef: d.targetRef,
        nota: d.nota,
      });
      toast.success("Columna actualizada");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSavingName(null);
    }
  };

  const shown = cols.filter((c) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.targetRef.toLowerCase().includes(q) ||
      c.kind.toLowerCase().includes(q)
    );
  });

  const inputCls =
    "w-full rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-800 focus:border-[#165170] focus:outline-none";

  return (
    <main className="flex h-screen w-full">
      <SideBar>
        <div className="flex h-full w-full flex-col" />
      </SideBar>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-6xl px-8 py-10">
          <h1 className="text-2xl font-semibold text-gray-800">Administración</h1>
          <AdminNav />

          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Columnas consumidas</h2>
            <p className="text-sm text-gray-500">
              Columnas de la máster/InfoVariables que la app consume. Si la fuente
              cambia el <b>nombre</b> de una columna, renómbrala aquí para que se
              siga consumiendo. También puedes ver y ajustar <b>a qué está conectada</b>.
            </p>
          </div>

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por nombre, conexión o clase…"
            className="mb-3 w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nombre de columna</th>
                    <th className="px-3 py-2 font-semibold">Clase</th>
                    <th className="px-3 py-2 font-semibold">Conectada a (target)</th>
                    <th className="px-3 py-2 font-semibold">Usos</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => {
                    const d = drafts[c.name];
                    if (!d) return null;
                    const dirty =
                      d.name.trim() !== c.name ||
                      d.kind !== c.kind ||
                      d.targetRef !== c.targetRef ||
                      d.nota !== c.nota;
                    return (
                      <tr key={c.name} className="border-t border-gray-100 align-top">
                        <td className="px-3 py-2">
                          <input
                            value={d.name}
                            onChange={(e) => setDraft(c.name, { name: e.target.value })}
                            className={`${inputCls} font-mono`}
                          />
                          {c.baseCode && (
                            <span className="mt-0.5 block text-[10px] text-gray-400">
                              base: {c.baseCode}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={d.kind}
                            onChange={(e) => setDraft(c.name, { kind: e.target.value })}
                            className={inputCls}
                          >
                            {!COLUMN_KINDS.includes(d.kind as (typeof COLUMN_KINDS)[number]) && (
                              <option value={d.kind}>{d.kind}</option>
                            )}
                            {COLUMN_KINDS.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={d.targetRef}
                            onChange={(e) => setDraft(c.name, { targetRef: e.target.value })}
                            placeholder="id de variable/entidad"
                            className={inputCls}
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-500">{c.usos || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              c.estado === "ok"
                                ? "bg-green-100 text-green-700"
                                : c.estado === "pendiente"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {c.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => save(c.name)}
                            disabled={!dirty || savingName === c.name}
                            className="rounded-md bg-[#165170ff] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            {savingName === c.name ? "…" : "Guardar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                        Sin columnas (¿backend apagado o master sin ingerir?).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
