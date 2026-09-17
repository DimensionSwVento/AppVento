"use client";

import { useCallback, useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import ConfirmDialog from "../../Components/ui/ConfirmDialog";
import { useToast } from "../../Components/ui/Toast";
import {
  fetchMasterStatus,
  requestMasterUpdate,
  type MasterStatus,
  type MasterVersion,
} from "../../Utils/admin/catalogApi";

const STATUS_META: Record<MasterVersion["status"], { label: string; cls: string }> = {
  ready: { label: "Vigente", cls: "bg-emerald-100 text-emerald-700" },
  updating: { label: "Actualizando…", cls: "bg-amber-100 text-amber-700" },
  scheduled: { label: "Programada", cls: "bg-blue-100 text-blue-700" },
  failed: { label: "Falló", cls: "bg-red-100 text-red-700" },
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) || d.getTime() === 0
    ? "—"
    : d.toLocaleString("es-CO");
}

export default function AdminMasterPage() {
  const toast = useToast();
  const [status, setStatus] = useState<MasterStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"immediate" | "scheduled">("immediate");
  const [scheduledAt, setScheduledAt] = useState("");
  const [source, setSource] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Refresh manual (tras actualizar la master). El setState va tras `await`.
  const load = useCallback(async () => {
    try {
      setStatus(await fetchMasterStatus());
    } catch {
      toast.error("No se pudo cargar el estado de la master");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carga al montar: fetch INLINE con setState en callbacks async (.then/.finally)
  // — el React Compiler no permite llamar en el effect una función que hace
  // setState, pero sí setState dentro de un callback asíncrono.
  useEffect(() => {
    let alive = true;
    fetchMasterStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && toast.error("No se pudo cargar el estado de la master"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [toast]);

  const doUpdate = async () => {
    setSubmitting(true);
    try {
      await requestMasterUpdate({
        mode,
        scheduledAt: mode === "scheduled" ? new Date(scheduledAt).toISOString() : undefined,
        source: source.trim() || undefined,
      });
      toast.success(
        mode === "scheduled"
          ? "Actualización de la master programada"
          : "Actualización de la master iniciada",
      );
      setConfirming(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la master");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    !status?.updating && (mode === "immediate" || Boolean(scheduledAt));

  return (
    <main className="flex h-screen w-full">
      <SideBar>
        <div className="flex h-full w-full flex-col" />
      </SideBar>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-3xl px-8 py-10">
          <h1 className="text-2xl font-semibold text-gray-800">Administración</h1>
          <AdminNav />

          <h2 className="mt-2 text-lg font-semibold text-gray-800">
            Actualizar la master
          </h2>
          <p className="text-sm text-gray-500">
            Reemplaza el dataset de hexágonos. Puedes lanzarla ya o programarla a
            una hora.
          </p>

          {/* Advertencia (siempre visible) */}
          {status?.warning && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ {status.warning}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Estado actual */}
              <section className="mt-5 rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700">Estado</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field k="Versión vigente" v={status?.current?.version ?? "—"} />
                  <Field k="Aplicada" v={fmt(status?.current?.appliedAt ?? null)} />
                  <Field k="Hexágonos" v={String(status?.current?.hexCount ?? 0)} />
                  <Field k="Variables" v={String(status?.current?.varCount ?? 0)} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {status?.updating && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_META.updating.cls}`}>
                      Ingesta en curso — los informes de este lapso pueden salir inconsistentes
                    </span>
                  )}
                  {status?.scheduled && (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_META.scheduled.cls}`}>
                      Programada para {fmt(status.scheduled.scheduledAt)}
                    </span>
                  )}
                </div>
              </section>

              {/* Formulario de actualización */}
              <section className="mt-5 rounded-2xl border border-gray-100 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700">Nueva actualización</h3>
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "immediate"}
                        onChange={() => setMode("immediate")}
                        className="accent-[#165170]"
                      />
                      Inmediata
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "scheduled"}
                        onChange={() => setMode("scheduled")}
                        className="accent-[#165170]"
                      />
                      Programada
                    </label>
                  </div>

                  {mode === "scheduled" && (
                    <label className="text-sm text-gray-600">
                      Fecha y hora
                      <input
                        type="datetime-local"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#165170ff]"
                      />
                    </label>
                  )}

                  <label className="text-sm text-gray-600">
                    Ruta del parquet (opcional; por defecto la del servidor)
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="/ruta/al/master.h3.parquet"
                      className="mt-1 block w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-[#165170ff]"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => setConfirming(true)}
                    className="self-start rounded-full bg-[#165170ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e6a8c] disabled:opacity-40"
                  >
                    {mode === "scheduled" ? "Programar actualización" : "Actualizar ahora"}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Confirmar actualización de la master"
          variant="danger"
          confirmLabel={mode === "scheduled" ? "Programar" : "Actualizar ahora"}
          loading={submitting}
          message={
            <>
              {status?.warning}
              <br />
              <br />
              {mode === "scheduled"
                ? `Se programará para ${scheduledAt ? new Date(scheduledAt).toLocaleString("es-CO") : "—"}.`
                : "La ingesta comenzará de inmediato."}
            </>
          }
          onConfirm={doUpdate}
          onCancel={() => setConfirming(false)}
        />
      )}
    </main>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-gray-100 py-1.5">
      <span className="text-gray-500">{k}</span>
      <span className="text-right font-medium text-gray-800">{v}</span>
    </div>
  );
}
