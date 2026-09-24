"use client";

import { useCallback, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import QuickGuide from "../../Components/Admin/QuickGuide";
import { useToast } from "../../Components/ui/Toast";
import {
  fetchBundlePlan,
  reconcileColumn,
  fetchChunkPlan,
  applyChunk,
  finalizeBundle,
  uploadBundle,
  ApiError,
  COLUMN_KINDS,
  type BundlePlan,
  type PlanColumn,
} from "../../Utils/admin/bundleApi";

const ESTADO_META: Record<PlanColumn["estado"], { label: string; cls: string }> = {
  ok: { label: "OK", cls: "bg-emerald-100 text-emerald-700" },
  propuesto: { label: "Propuesto", cls: "bg-blue-100 text-blue-700" },
  pendiente: { label: "Pendiente", cls: "bg-red-100 text-red-700" },
};

// Registro por LOTE (paquete) y resultado final de la ingesta por paquetes.
type ChunkRow = {
  file: string;
  rowGroup: number;
  rows: number;
  ms: number;
  ok: boolean;
  error?: string;
};
type IngestResult = {
  ok: boolean;
  totalRows: number;
  totalMs: number;
  failed: number;
  totalChunks: number;
};

const fmtN = new Intl.NumberFormat("es-CO");
const fmtDur = (ms: number) =>
  ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;

export default function AdminBundlePage() {
  const toast = useToast();
  const [root, setRoot] = useState("");
  const [emplazamiento, setEmplazamiento] = useState<"onshore" | "offshore">("onshore");
  const [plan, setPlan] = useState<BundlePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  // Otra ingesta corre en el server (candado 409): aviso persistente para que el
  // admin sepa que debe esperar a que termine antes de guardar esta máster.
  const [ingestBusy, setIngestBusy] = useState(false);
  // Ingesta por PAQUETES: progreso (filas), registro por lote y resultado final.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [chunkLog, setChunkLog] = useState<ChunkRow[]>([]);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // % de subida (null = no hay subida en curso). Da feedback real en bundles
  // grandes; al llegar a 100 el server aún procesa (montaje) → "Procesando…".
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  // Archivos elegidos/arrastrados que esperan el botón "Enviar" (no se suben
  // solos: el admin confirma qué manda antes de arrancar la subida).
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

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

  // Poner archivos EN ESPERA (arrastrados o elegidos): no se suben solos; el
  // admin revisa cuántos son y confirma con el botón "Enviar".
  const elegir = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setPendingFiles(list);
    setUploadError(null);
    setPlan(null);
  }, []);

  // FASE 1: subir al server los parquets EN ESPERA → se montan → enseguida se
  // clasifican (plan). Una sola característica; sin rutas.
  const subir = useCallback(async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);
    setUploadPct(0);
    setPlan(null);
    try {
      const r = await uploadBundle(pendingFiles, setUploadPct);
      setRoot(r.root);
      setPendingFiles([]);
      toast.success(`${r.files} archivos subidos`);
      await verPlan(r.root);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo subir";
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  }, [pendingFiles, toast, verPlan]);

  // Ingesta POR PAQUETES: pide el plan (row-groups) y los ingiere de forma
  // CONSECUTIVA, cada uno rápido y con memoria acotada. Va reportando progreso
  // (filas) y un registro por lote (rows/ms/estado); al final, un resumen.
  const aplicar = useCallback(async () => {
    setApplying(true);
    setIngestBusy(false);
    setResult(null);
    setChunkLog([]);
    const r = root.trim();
    try {
      const plan = await fetchChunkPlan(r);
      setProgress({ done: 0, total: plan.total_rows });
      const log: ChunkRow[] = [];
      let doneRows = 0;
      let failed = 0;
      const t0 = performance.now();
      for (const ch of plan.chunks) {
        const cs = performance.now();
        try {
          const res = await applyChunk(r, ch.file, ch.row_group, emplazamiento);
          const ms = Math.round(performance.now() - cs);
          doneRows += res.processed;
          log.push({ file: ch.file, rowGroup: ch.row_group, rows: res.processed, ms, ok: true });
        } catch (e) {
          const ms = Math.round(performance.now() - cs);
          if (e instanceof ApiError && e.status === 409) setIngestBusy(true);
          failed += 1;
          log.push({
            file: ch.file,
            rowGroup: ch.row_group,
            rows: ch.rows,
            ms,
            ok: false,
            error: e instanceof Error ? e.message : "falló",
          });
        }
        setChunkLog([...log]);
        setProgress({ done: doneRows, total: plan.total_rows });
      }
      const totalMs = Math.round(performance.now() - t0);
      setResult({ ok: failed === 0, totalRows: doneRows, totalMs, failed, totalChunks: plan.chunks.length });
      // Cierra la ingesta: registra la NUEVA versión de la máster (version++ +
      // fecha + archivo). Solo si se ingirió algo. Si falla, no rompe el flujo.
      if (doneRows > 0) {
        try {
          const fin = await finalizeBundle(r, emplazamiento);
          toast.success(`Versión de máster registrada: ${fin.version}`);
        } catch {
          /* no crítico: los datos ya entraron, solo no se estampó la versión */
        }
      }
      if (failed === 0) {
        toast.success(`Ingesta OK: ${fmtN.format(doneRows)} hexágonos en ${plan.chunks.length} lotes`);
      } else {
        toast.error(`Ingesta con ${failed} lote(s) fallido(s) — revisa el detalle`);
      }
    } catch (e) {
      // Falló el PLAN (antes de empezar): p.ej. 409 (otra ingesta) o pendientes.
      if (e instanceof ApiError && e.status === 409) setIngestBusy(true);
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar la ingesta");
    } finally {
      setApplying(false);
      setProgress(null);
    }
  }, [root, emplazamiento, toast]);

  // Reintenta SOLO los lotes que fallaron (idempotente por h3_index).
  const reintentarFallidos = useCallback(async () => {
    const fails = chunkLog.filter((c) => !c.ok);
    if (fails.length === 0) return;
    setApplying(true);
    const r = root.trim();
    const byKey = new Map(chunkLog.map((c) => [`${c.file}#${c.rowGroup}`, c]));
    for (const f of fails) {
      const cs = performance.now();
      try {
        const res = await applyChunk(r, f.file, f.rowGroup, emplazamiento);
        byKey.set(`${f.file}#${f.rowGroup}`, {
          file: f.file, rowGroup: f.rowGroup, rows: res.processed,
          ms: Math.round(performance.now() - cs), ok: true,
        });
      } catch (e) {
        byKey.set(`${f.file}#${f.rowGroup}`, {
          ...f, ms: Math.round(performance.now() - cs),
          error: e instanceof Error ? e.message : "falló",
        });
      }
      setChunkLog([...byKey.values()]);
    }
    const merged = [...byKey.values()];
    const failed = merged.filter((c) => !c.ok).length;
    const totalRows = merged.filter((c) => c.ok).reduce((a, c) => a + c.rows, 0);
    setResult({ ok: failed === 0, totalRows, totalMs: 0, failed, totalChunks: merged.length });
    setApplying(false);
    if (failed === 0) toast.success("Reintento OK: todos los lotes subieron");
  }, [chunkLog, root, emplazamiento, toast]);

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

          {/* Guía rápida en carrusel + léeme */}
          <QuickGuide
            intro="Cómo subir la master"
            steps={[
              {
                titulo: "1 · Qué es esto",
                texto: (
                  <>El <b>dato por hexágono</b> del modelo (scores + valores crudos).
                  Los <b>metadatos</b> de las variables (nombre, fuente, regulatoria…)
                  se suben en la pestaña <b>Metadatos</b>, no aquí.</>
                ),
              },
              {
                titulo: "2 · Qué archivos",
                texto: (
                  <>Un árbol de <code>.h3.parquet</code> (carpetas con cualquier nombre;
                  importan los nombres de <b>archivo</b>): <code>variables</code>,
                  <code> criterios</code>/<code>subcriterios</code>/<code>mcda_agregado</code>,
                  <code> variables_pon</code> y <code>minmax_anchors.json</code>. Cada
                  parquet con columna <code>h3_index</code>.</>
                ),
              },
              {
                titulo: "3 · Cómo se sube",
                texto: (
                  <>Arrastras la carpeta. Se ingiere por <b>paquetes</b> (row-groups)
                  con barra de progreso → memoria acotada, no tumba el backend. Si hay
                  una columna que no reconoce, la deja <b>pendiente</b> y te la muestra
                  antes de aplicar.</>
                ),
              },
              {
                titulo: "4 · Qué guarda",
                texto: (
                  <>Crudas → <code>hexagon.variables</code>; scores →
                  <code> hexagon.scores</code>/<code>score_general</code>; ponderadas →
                  <code> hexagon_variables_pon</code>; anclas →
                  <code> hexagon_meta</code>. Al final <b>estampa la versión</b>
                  (fecha + archivos).</>
                ),
              },
              {
                titulo: "5 · Másters muy pesadas",
                texto: (
                  <>Mejor por <b>consola</b>: <code>python -m tools.ingest_bundle
                  &lt;carpeta&gt;</code> (destructiva con respaldo + swap; imprime la
                  clase de cada columna). Aísla la memoria del backend.</>
                ),
              },
            ]}
            detalle={
              <ul className="ml-4 list-disc space-y-0.5">
                <li><code>variables.h3.parquet</code> → crudos + <code>excluido</code>/<code>alerta</code> → <code>hexagon.variables</code>/<code>tipo_celda</code>.</li>
                <li><code>criterios</code>/<code>subcriterios</code>/<code>mcda_agregado</code> → <code>hexagon.scores</code> + <code>score_general</code>.</li>
                <li><code>variables_pon.h3.parquet</code> → <code>hexagon_variables_pon</code> (mismos códigos, valor ponderado; para el descargar crudos del informe).</li>
                <li><code>minmax_anchors.json</code> → rangos oficiales → <code>hexagon_meta</code>.</li>
              </ul>
            }
          />

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
                if (e.dataTransfer.files.length) elegir(e.dataTransfer.files);
              }}
              className={`mt-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragOver ? "border-[#165170ff] bg-[#cce1ee]/30" : "border-gray-300 bg-gray-50"
              }`}
            >
              <p className="text-sm font-medium text-gray-700">
                {uploading
                  ? uploadPct !== null && uploadPct < 100
                    ? `Subiendo… ${uploadPct}%`
                    : "Procesando en el servidor…"
                  : loading
                    ? "Revisando columnas…"
                    : pendingFiles.length > 0
                      ? `${pendingFiles.length} archivo(s) en espera`
                      : "Arrastra aquí los archivos del modelo"}
              </p>
              {uploading && (
                <>
                  <div className="mx-auto mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-[#165170ff] transition-all duration-200"
                      style={{ width: `${uploadPct ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    Bundles grandes pueden tardar varios minutos. No cierres esta página.
                  </p>
                </>
              )}
              {!uploading && (
                <p className="mt-1 text-[11px] text-gray-500">o elige una carpeta / archivos:</p>
              )}
              <div className="mt-2 flex justify-center gap-2">
                <label className="cursor-pointer rounded-full border border-[#165170ff] px-3 py-1.5 text-xs font-semibold text-[#165170ff] hover:bg-[#cce1ee]/40">
                  Elegir carpeta
                  <input
                    type="file"
                    hidden
                    multiple
                    // @ts-expect-error webkitdirectory no está tipado en React
                    webkitdirectory=""
                    onChange={(e) => e.target.files && elegir(e.target.files)}
                  />
                </label>
                <label className="cursor-pointer rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100">
                  Elegir archivos
                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={(e) => e.target.files && elegir(e.target.files)}
                  />
                </label>
              </div>

              {/* Botón EXPLÍCITO de envío: la subida no arranca hasta pulsarlo. */}
              {pendingFiles.length > 0 && !uploading && (
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={subir}
                    className="rounded-full bg-[#165170ff] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e6a8c]"
                  >
                    Enviar {pendingFiles.length} archivo(s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFiles([])}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Quitar
                  </button>
                </div>
              )}

              <p className="mt-2 text-[10px] text-gray-400">
                Para conjuntos muy grandes, pídeselo al equipo técnico. El arrastre sirve
                para subidas normales.
              </p>
              {uploadError && (
                <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                  No se pudo subir: {uploadError}.{" "}
                  {/Error 404|not found/i.test(uploadError)
                    ? "El servidor aún no acepta subidas (falta desplegar/actualizar el backend). Avisa al equipo técnico."
                    : "Reintenta o avisa al equipo técnico."}
                </p>
              )}
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
              {ingestBusy && (
                <p className="mt-2 flex items-start gap-2 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2.5 text-[12px] leading-snug text-amber-800">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                  <span>
                    <strong>Hay otra carga en proceso.</strong> El servidor solo procesa
                    una máster a la vez para no sobrecargarse. Espera a que termine la
                    ingesta anterior y vuelve a pulsar “Guardar los datos”.
                  </span>
                </p>
              )}
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={aplicar}
                  disabled={applying || pendientes > 0}
                  className="inline-flex items-center gap-2 rounded-full bg-[#165170ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e6a8c] disabled:opacity-40"
                >
                  {applying && (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                  )}
                  {applying
                    ? progress && progress.total > 0
                      ? `Guardando… ${Math.round((progress.done / progress.total) * 100)}%`
                      : "Preparando lotes…"
                    : "Guardar los datos"}
                </button>
                {pendientes > 0 && (
                  <span className="text-xs text-red-600">
                    Confirma los {pendientes} campos pendientes antes de guardar.
                  </span>
                )}
              </div>

              {/* Barra de progreso por lotes (paquetes consecutivos) */}
              {applying && progress && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-[#165170ff] transition-all duration-200"
                      style={{
                        width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    {fmtN.format(progress.done)} / {fmtN.format(progress.total)} hexágonos · lote{" "}
                    {chunkLog.length}. No cierres esta página.
                  </p>
                </div>
              )}

              {/* Resumen del resultado — permanece hasta el próximo intento */}
              {result && (
                <div
                  className={`mt-3 rounded-lg border-l-4 px-3 py-2.5 text-[12px] ${
                    result.ok
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-amber-400 bg-amber-50 text-amber-800"
                  }`}
                >
                  {result.ok ? (
                    <span>
                      <strong>Ingesta completada.</strong> {fmtN.format(result.totalRows)} hexágonos en{" "}
                      {result.totalChunks} lotes
                      {result.totalMs ? ` · ${fmtDur(result.totalMs)}` : ""}.
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        <strong>{result.failed} lote(s) fallaron</strong> de {result.totalChunks}. Los
                        demás ({fmtN.format(result.totalRows)} hex) sí se guardaron.
                      </span>
                      <button
                        type="button"
                        onClick={reintentarFallidos}
                        disabled={applying}
                        className="rounded-full border border-amber-500 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                      >
                        Reintentar los fallidos
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Registro PERMANENTE por lote: qué subió, cuánto tardó, estado */}
              {chunkLog.length > 0 && (
                <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-gray-100">
                  <table className="w-full min-w-[420px] text-[11px]">
                    <thead className="sticky top-0 bg-gray-50 text-left text-gray-400">
                      <tr>
                        <th className="px-3 py-1.5 font-semibold">Archivo</th>
                        <th className="px-3 py-1.5 font-semibold">Lote</th>
                        <th className="px-3 py-1.5 font-semibold">Hex</th>
                        <th className="px-3 py-1.5 font-semibold">Tiempo</th>
                        <th className="px-3 py-1.5 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunkLog.map((c) => (
                        <tr key={`${c.file}#${c.rowGroup}`} className="border-t border-gray-50">
                          <td className="px-3 py-1.5 font-mono text-gray-700">{c.file}</td>
                          <td className="px-3 py-1.5 text-gray-500">{c.rowGroup}</td>
                          <td className="px-3 py-1.5 text-gray-700">{fmtN.format(c.rows)}</td>
                          <td className="px-3 py-1.5 text-gray-500">{fmtDur(c.ms)}</td>
                          <td className="px-3 py-1.5">
                            {c.ok ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                                OK
                              </span>
                            ) : (
                              <span
                                className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700"
                                title={c.error}
                              >
                                Falló
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
