"use client";

import { useCallback, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import { useToast } from "../../Components/ui/Toast";
import {
  fetchBundlePlan,
  reconcileColumn,
  applyBundle,
  uploadBundle,
  COLUMN_KINDS,
  type BundlePlan,
  type PlanColumn,
} from "../../Utils/admin/bundleApi";

const ESTADO_META: Record<PlanColumn["estado"], { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-emerald-100 text-emerald-700" },
  propuesto: { label: "Propuesto", cls: "bg-blue-100 text-blue-700" },
  pendiente: { label: "Pendiente", cls: "bg-red-100 text-red-700" },
};

export default function AdminBundlePage() {
  const toast = useToast();
  const [root, setRoot] = useState("");
  const [emplazamiento, setEmplazamiento] = useState<"onshore" | "offshore">("onshore");
  const [plan, setPlan] = useState<BundlePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // FASE 2: clasifica las columnas del bundle ya subido. `root` es interno (lo
  // fija la subida), nunca se escribe a mano.
  const verPlan = useCallback(
    async (bundleRoot: string) => {
      setLoading(true);
      try {
        const p = await fetchBundlePlan(bundleRoot);
        setPlan(p);
        if (p.error) toast.error(p.error);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo leer el plan");
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // FASE 1: arrastrar/elegir los parquets → se montan en el server → enseguida se
  // clasifican (plan). Una sola característica; sin rutas.
  const subir = useCallback(
    async (files: FileList | File[]) => {
      if (!files || Array.from(files).length === 0) return;
      setUploading(true);
      setPlan(null);
      try {
        const r = await uploadBundle(files);
        setRoot(r.root);
        toast.success(`${r.files} archivos montados`);
        await verPlan(r.root);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir");
      } finally {
        setUploading(false);
      }
    },
    [toast, verPlan],
  );

  const aplicar = useCallback(async () => {
    setApplying(true);
    try {
      const r = await applyBundle(root.trim(), emplazamiento);
      toast.success(`Ingesta OK: ${r.rows.toLocaleString("es-CO")} hexágonos (${r.emplazamiento})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La ingesta falló");
    } finally {
      setApplying(false);
    }
  }, [root, emplazamiento, toast]);

  const pendientes = plan?.summary.pendientes ?? 0;
  // Pendientes primero para conciliar rápido.
  const columnas = plan
    ? [...plan.columns].sort(
        (a, b) =>
          (a.estado === "pendiente" ? 0 : 1) - (b.estado === "pendiente" ? 0 : 1),
      )
    : [];

  return (
    <main className="flex h-screen w-full">
      <SideBar>
        <div className="flex h-full w-full flex-col" />
      </SideBar>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-5xl px-8 py-10">
          <h1 className="text-2xl font-semibold text-gray-800">Administración</h1>
          <AdminNav />

          <h2 className="mt-2 text-lg font-semibold text-gray-800">
            Subir la master (modelo)
          </h2>
          <p className="text-sm text-gray-500">
            Sube los datos del modelo <b>arrastrando los archivos</b> desde tu
            computador. La herramienta los revisa, te avisa si encuentra algo que no
            reconoce para que lo confirmes, y luego los guarda. No necesitas escribir
            ninguna ruta.
          </p>

          {/* FASE 1 — Arrastrar los parquets (nunca se escribe una ruta) */}
          <section className="mt-5 rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">1 · Subir archivos</h3>
              <label className="text-xs text-gray-500">
                Emplazamiento{" "}
                <select
                  value={emplazamiento}
                  onChange={(e) => setEmplazamiento(e.target.value as "onshore" | "offshore")}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#165170ff]"
                >
                  <option value="onshore">onshore</option>
                  <option value="offshore">offshore</option>
                </select>
              </label>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) subir(e.dataTransfer.files);
              }}
              className={`mt-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragOver ? "border-[#165170ff] bg-[#cce1ee]/30" : "border-gray-300 bg-gray-50"
              }`}
            >
              <p className="text-sm font-medium text-gray-700">
                {uploading
                  ? "Subiendo…"
                  : loading
                    ? "Revisando…"
                    : "Arrastra aquí los archivos del modelo"}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">o elige una carpeta / archivos:</p>
              <div className="mt-2 flex justify-center gap-2">
                <label className="cursor-pointer rounded-full border border-[#165170ff] px-3 py-1.5 text-xs font-semibold text-[#165170ff] hover:bg-[#cce1ee]/40">
                  Elegir carpeta
                  <input
                    type="file"
                    hidden
                    multiple
                    // @ts-expect-error webkitdirectory no está tipado en React
                    webkitdirectory=""
                    onChange={(e) => e.target.files && subir(e.target.files)}
                  />
                </label>
                <label className="cursor-pointer rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                  Elegir archivos
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={(e) => e.target.files && subir(e.target.files)}
                  />
                </label>
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                Para conjuntos muy grandes, pídeselo al equipo técnico. El arrastre sirve
                para subidas normales.
              </p>
            </div>
          </section>

          {plan && !plan.error && (
            <section className="mt-4 rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700">
                2 · Revisar y confirmar
              </h3>
              {/* Resumen */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge label={`${plan.summary.total} columnas`} cls="bg-gray-100 text-gray-700" />
                <Badge label={`${plan.summary.conocidas} ok`} cls="bg-emerald-100 text-emerald-700" />
                <Badge label={`${plan.summary.propuestas} propuestas`} cls="bg-blue-100 text-blue-700" />
                <Badge label={`${plan.summary.pendientes} pendientes`} cls="bg-red-100 text-red-700" />
                <Badge label={`${plan.files.length} archivos`} cls="bg-gray-100 text-gray-700" />
              </div>

              {/* Columnas */}
              <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-3">Columna</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Clase</th>
                      <th className="px-4 py-3">Usos</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {columnas.map((c) => (
                      <ColumnRow
                        key={c.name}
                        col={c}
                        onSaved={() => verPlan(root)}
                        toastErr={toast.error}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* FASE 3 — Aplicar la ingesta a la BD */}
              <h3 className="mt-6 text-sm font-semibold text-gray-700">
                3 · Guardar los datos
              </h3>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={aplicar}
                  disabled={applying || pendientes > 0}
                  className="rounded-full bg-[#165170ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e6a8c] disabled:opacity-40"
                >
                  {applying ? "Guardando…" : "Guardar los datos"}
                </button>
                {pendientes > 0 && (
                  <span className="text-xs text-red-600">
                    Confirma los {pendientes} campos pendientes antes de guardar.
                  </span>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded-full px-2.5 py-1 font-semibold ${cls}`}>{label}</span>;
}

/** Fila de columna con conciliación inline (clase + usos + guardar). */
function ColumnRow({
  col,
  onSaved,
  toastErr,
}: {
  col: PlanColumn;
  onSaved: () => void;
  toastErr: (msg: string) => void;
}) {
  const [kind, setKind] = useState<string>(col.kind ?? "variable_informativa");
  const [usos, setUsos] = useState<string>(col.usos ?? "");
  const [targetRef, setTargetRef] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // `campo` (atributo de otra variable, ej. AMB_005_revisada) y `bandera` por
  // variable necesitan saber A QUÉ entidad se adjuntan.
  const needsTarget = kind === "campo" || kind === "bandera";

  const save = async () => {
    setSaving(true);
    try {
      await reconcileColumn(col.name, {
        kind,
        usos,
        estado: "ok",
        ...(needsTarget ? { targetRef } : {}),
      });
      onSaved();
    } catch (e) {
      toastErr(e instanceof Error ? e.message : "No se pudo conciliar");
    } finally {
      setSaving(false);
    }
  };

  const isPend = col.estado === "pendiente";
  return (
    <tr className={`border-b border-gray-50 last:border-0 ${isPend ? "bg-red-50/40" : ""}`}>
      <td className="px-4 py-2 font-mono text-[12px] text-gray-800">{col.name}</td>
      <td className="px-4 py-2 text-[11px] uppercase text-gray-400">{col.tipo_dato}</td>
      <td className="px-4 py-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#165170ff]"
        >
          {COLUMN_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        {needsTarget && (
          <input
            type="text"
            value={targetRef}
            onChange={(e) => setTargetRef(e.target.value)}
            placeholder="adjuntar a… (ej. AMB_005)"
            className="mt-1 block w-40 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs outline-none focus:border-[#165170ff]"
          />
        )}
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          value={usos}
          onChange={(e) => setUsos(e.target.value)}
          placeholder="mapa,informe…"
          className="w-32 rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#165170ff]"
        />
      </td>
      <td className="px-4 py-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO_META[col.estado].cls}`}>
          {ESTADO_META[col.estado].label}
        </span>
      </td>
      <td className="px-4 py-2 text-right">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full border border-[#165170ff] px-3 py-1 text-xs font-semibold text-[#165170ff] hover:bg-[#cce1ee]/40 disabled:opacity-40"
        >
          {saving ? "…" : isPend ? "Conciliar" : "Guardar"}
        </button>
      </td>
    </tr>
  );
}
