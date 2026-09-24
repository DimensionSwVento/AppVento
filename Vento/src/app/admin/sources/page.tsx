"use client";

import { useCallback, useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import QuickGuide from "../../Components/Admin/QuickGuide";
import ConfirmDialog from "../../Components/ui/ConfirmDialog";
import { useToast } from "../../Components/ui/Toast";
import {
  fetchDataSources,
  requestIngest,
  type DataSource,
} from "../../Utils/admin/catalogApi";

const STATUS_META: Record<DataSource["status"], { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pendiente", cls: "bg-amber-100 text-amber-700" },
  error: { label: "Error", cls: "bg-red-100 text-red-700" },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) || d.getTime() === 0
    ? "—"
    : d.toLocaleString("es-CO");
}

export default function AdminSourcesPage() {
  const toast = useToast();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<DataSource | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Refresh manual (tras una ingesta). El setState va tras `await`.
  const load = useCallback(async () => {
    try {
      setSources(await fetchDataSources());
    } catch {
      toast.error("No se pudieron cargar las fuentes de datos");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carga al montar: fetch INLINE con setState en callbacks async (React Compiler
  // prohíbe llamar en el effect una función que hace setState, pero permite
  // setState dentro de un callback asíncrono).
  useEffect(() => {
    let alive = true;
    fetchDataSources()
      .then((s) => alive && setSources(s))
      .catch(() => alive && toast.error("No se pudieron cargar las fuentes de datos"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [toast]);

  const doIngest = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      await requestIngest(target.id);
      toast.success(`Ingesta de "${target.label}" completada`);
      setTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La ingesta falló");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex h-screen w-full">
      <SideBar>
        <div className="flex h-full w-full flex-col" />
      </SideBar>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-4xl px-8 py-10">
          <h1 className="text-2xl font-semibold text-gray-800">Administración</h1>
          <AdminNav />

          <h2 className="mt-2 text-lg font-semibold text-gray-800">
            Fuentes de datos
          </h2>
          <p className="text-sm text-gray-500">
            De dónde salen los datos de la plataforma y cuándo se actualizaron por
            última vez. <b>&quot;Actualizar&quot;</b> vuelve a leer el archivo y pone al
            día los datos: cambia los que se modificaron y agrega los nuevos, sin
            borrar nada.
          </p>

          <QuickGuide
            intro="Cómo leer esta pantalla"
            steps={[
              {
                titulo: "1 · Qué es",
                texto: (
                  <>El <b>registro</b> de cada fuente ingerida (máster, variables,
                  normas, escenarios, turbinas): dónde vive el archivo, cuántas filas y
                  el estado/fecha de su última carga.</>
                ),
              },
              {
                titulo: "2 · Actualizar",
                texto: (
                  <><b>Actualizar</b> re-lee la fuente y hace <b>upsert</b> (cambia +
                  añade, no borra) → no frena la app. La carga <b>destructiva</b>
                  (reemplazo total) es solo por consola.</>
                ),
              },
              {
                titulo: "3 · Dónde subir",
                texto: (
                  <>El <b>dato por hexágono</b> se sube en <b>Subir master</b>; los
                  <b> metadatos</b> (InfoVariables + económico) en <b>Metadatos</b>.
                  Aquí solo se ve el estado.</>
                ),
              },
            ]}
          />

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent" />
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Dónde se guarda</th>
                    <th className="px-4 py-3">Filas</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Última ingesta</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{s.label}</div>
                        <div className="text-[11px] uppercase text-gray-400">{s.kind}</div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="break-all text-[11px] text-gray-600">{s.location}</code>
                        {s.notes && (
                          <div className="mt-0.5 text-[11px] text-red-600">{s.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700">{s.rows}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_META[s.status].cls}`}>
                          {STATUS_META[s.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmt(s.ingestedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setTarget(s)}
                          className="rounded-full border border-[#165170ff] px-3 py-1.5 text-xs font-semibold text-[#165170ff] hover:bg-[#cce1ee]/40"
                        >
                          Actualizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {target && (
        <ConfirmDialog
          title={`Actualizar "${target.label}"`}
          confirmLabel="Actualizar"
          loading={submitting}
          message={
            <>
              Se pondrán al día los datos de <b>{target.label}</b>: se actualizan los
              que cambiaron y se agregan los nuevos, sin borrar nada. ¿Continuar?
            </>
          }
          onConfirm={doIngest}
          onCancel={() => setTarget(null)}
        />
      )}
    </main>
  );
}
