"use client";

/**
 * Actualizador de METADATOS: sube UNO O VARIOS CSV/XLSX. El sistema AUTODETECTA
 * cada archivo (catálogo InfoVariables — incluida regulatoria → catalog_norma — o
 * panel económico → economic_series) y lo rutea solo. Un solo drag para todo.
 * Solo admin. Ver docs/spec/backend-arquitectura-anidada.md.
 */
import { useCallback, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import QuickGuide from "../../Components/Admin/QuickGuide";
import { useToast } from "../../Components/ui/Toast";
import {
  uploadMetadata,
  planMetadata,
  applyMetadata,
  type MetadataPlan,
  type MetadataApplyResult,
} from "../../Utils/admin/catalogApi";

type PlanItem = { name: string; path: string; plan: MetadataPlan };
type ResultItem = { name: string; result: MetadataApplyResult };

// Plantilla InfoVariables: columnas que el importador reconoce (por palabra clave)
// + una fila de EJEMPLO con valores demostrativos para que el cliente la llene.
// Headers que COINCIDEN con los de InfoVariables real (el importador los reconoce
// por palabra clave, así que el texto largo "¿Se muestra en el mapa? Opcional…" y
// "ID (Mostrar en el detalle)" también casan). "¿Se muestra en el mapa?" se llena
// con Sí/No; "Menú" con la nota del InfoVariables.
const TEMPLATE_HEADERS = [
  "Dimensión", "Criterio", "Subcriterio", "Variable", "Emplazamiento",
  "¿Se muestra en el mapa? Opcional para que el usuario lo active desde el mismo menú.",
  "Menú", "ID (Mostrar en el detalle)", "Descripción (Mostrar en el detalle)",
  "Fuente de datos (Mostrar en el detalle)", "Tipo de licencia de datos (Mostrar en el detalle)",
  "URL fuente de datos (Mostrar en el detalle)", "Unidad", "Rango",
  "Cómo se calcula", "Peso", "Polaridad",
  "Comentarios/ideas sobre la forma de visualización", "Estado", "Condición de activación",
];
const TEMPLATE_DEMO = [
  "Ambiental", "Variables bióticas", "Áreas protegidas", "Humedales RAMSAR",
  "Onshore", "Sí", "Activo por defecto por MCDM", "AMB-012-A",
  "Ubicación de los humedales RAMSAR en Colombia", "IGAC", "uso libre",
  "https://www.colombiaenmapas.gov.co/", "índice", "0–100 (normalizado)",
  "Presencia normalizada 0–1 de la capa", "0.8", "-1",
  "Mostrar como capa de área con icono", "activo", "",
];

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadInfoVariablesTemplate(): void {
  const rows = [TEMPLATE_HEADERS, TEMPLATE_DEMO];
  // BOM (﻿) → Excel abre el CSV con acentos correctos (UTF-8).
  const csv = "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_infovariables.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminMetadatosPage() {
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);

  const doPlan = useCallback(async () => {
    if (!files.length) return;
    setBusy(true);
    setResults([]);
    setItems([]);
    try {
      const out: PlanItem[] = [];
      for (const f of files) {
        const up = await uploadMetadata(f);
        const plan = await planMetadata(up.path, "infovariables", undefined, f.name);
        out.push({ name: f.name, path: up.path, plan });
      }
      setItems(out);
      toast.success(`Analizados ${out.length} archivo(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falló el análisis");
    } finally {
      setBusy(false);
    }
  }, [files, toast]);

  const doApply = useCallback(async () => {
    if (!items.length) return;
    setBusy(true);
    try {
      const out: ResultItem[] = [];
      for (const it of items) {
        const result = await applyMetadata(it.path, "infovariables", undefined, it.name);
        out.push({ name: it.name, result });
      }
      setResults(out);
      toast.success(`Aplicados ${out.length} archivo(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falló la aplicación");
    } finally {
      setBusy(false);
    }
  }, [items, toast]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar>{null}</SideBar>
      <main className="flex-1 overflow-y-auto p-8">
        <AdminNav />
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-semibold text-gray-800">
            Actualizador de metadatos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sube uno o varios CSV/XLSX. El sistema <b>autodetecta</b> cada archivo:
            catálogo <b>InfoVariables</b> (jerarquía + variables + <b>regulatoria</b> →
            normas, conciliando por <code>master_id</code>) o <b>panel económico</b>
            (<code>escenario_mw·cat·anio·valor</code> → series). <b>Un solo drag para todo.</b>
          </p>

          <QuickGuide
            intro="Cómo usar metadatos"
            steps={[
              {
                titulo: "1 · Qué subir",
                texto: (
                  <>Los archivos <b>InfoVariables</b> (a/b/c) y/o el <b>panel económico</b>
                  (xlsx). Aquí van los <b>metadatos</b> — no el dato por hexágono (eso va
                  en <b>Subir master</b>).</>
                ),
              },
              {
                titulo: "2 · Varios a la vez",
                texto: (
                  <>Puedes seleccionar <b>varios archivos</b> juntos (p.ej. InfoVariables
                  a/b/c). Cada uno se analiza y aplica por separado.</>
                ),
              },
              {
                titulo: "3 · Se autodetecta",
                texto: (
                  <>El sistema reconoce cada archivo: <b>variables</b> → catálogo +
                  jerarquía; filas <b>REG…</b> o dimensión regulatoria → <b>normas</b>;
                  columnas <code>escenario_mw</code>+<code>valor</code> → <b>series
                  económicas</b>.</>
                ),
              },
              {
                titulo: "4 · Cómo opera",
                texto: (
                  <><b>Analizar</b> muestra el plan (qué se mapea / se omite, por
                  archivo). <b>Aplicar</b> lo guarda. Cada variable se concilia por su
                  <code> master_id</code> — nunca se pisa por nombre.</>
                ),
              },
            ]}
            detalle={
              <div className="space-y-2">
                <p className="font-semibold text-gray-700">
                  Reglas de detección (por qué cada archivo va a un lado)
                </p>
                <p>
                  El sistema no adivina: decide según <b>cómo se llaman las columnas
                  y las filas</b>. Estas son las reglas exactas:
                </p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    Tiene columnas <code>escenario_mw</code> + <code>valor</code> →{" "}
                    <b>panel económico</b> (series). El nombre del archivo se usa como
                    nombre del panel.
                  </li>
                  <li>
                    Fila con <code>master_id</code> que empieza por <code>REG</code>{" "}
                    <i>o</i> cuya dimensión es «regulatoria» → <b>norma</b> (informativa,
                    editable en Admin · Normativa; se prende/apaga en Dimensiones).
                  </li>
                  <li>
                    Cualquier otra fila del catálogo → <b>variable</b> + su jerarquía
                    (dimensión · criterio · subcriterio), conciliando por{" "}
                    <code>master_id</code> — nunca se pisa por nombre.
                  </li>
                </ul>
                <p>
                  Si una columna del catálogo no se reconoce, aparece en <b>Omitidas</b>{" "}
                  (no rompe nada). El panel económico solo ingiere las hojas{" "}
                  <b>curadas</b> (RESUMEN1/PIB/PRECIOS/GENERACION/EMISIONES/EMPLEO); el
                  resto queda en BD para trazabilidad. Detalle columna→BD en{" "}
                  <code>docs/spec/modelo-datos-anidado.md §11-ter</code>.
                </p>
              </div>
            }
          />

          {/* 1. Subir (múltiple) + analizar */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
            <label className="block text-sm font-medium text-gray-700">
              Archivos (.csv / .xlsx) — puedes seleccionar varios
            </label>
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.xlsm"
              onChange={(e) => {
                setFiles(Array.from(e.target.files ?? []));
                setItems([]);
                setResults([]);
              }}
              className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#165170ff] file:px-3 file:py-1.5 file:text-white"
            />
            {files.length > 0 && (
              <p className="mt-2 text-[12px] text-gray-500">
                {files.length} archivo(s): {files.map((f) => f.name).join(", ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={doPlan}
                disabled={!files.length || busy}
                className="rounded-md bg-[#165170ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Analizando…" : "Analizar"}
              </button>
              {/* Descargar la plantilla vacía para llenarla y subirla (con una modal
                  que explica qué pasa antes de descargar). */}
              <button
                type="button"
                onClick={() => setShowTemplate(true)}
                className="rounded-md border border-[#165170ff] px-4 py-2 text-sm font-semibold text-[#165170ff] hover:bg-[#cce1eeff]/40"
              >
                Descargar plantilla vacía
              </button>
            </div>
          </div>

          {/* Modal explicativa antes de descargar la plantilla InfoVariables. */}
          {showTemplate && (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center p-4"
              style={{ backgroundColor: "rgba(30,45,60,0.45)", backdropFilter: "blur(2px)" }}
              onClick={() => setShowTemplate(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-bold text-[#165170ff]">
                  Descargar plantilla de InfoVariables
                </h3>
                <p className="mt-2 text-sm leading-snug text-gray-600">
                  Se descarga un <b>CSV</b> con las columnas que el sistema reconoce
                  y <b>una fila de ejemplo</b> (valor demostrativo). Llénalo con tus
                  variables/normas y súbelo aquí con <b>«Analizar»</b>: el importador
                  mapea cada columna a su campo (dimensión, criterio, fuente, unidad,
                  peso, cómo se calcula…). Se abre en Excel; al subir vale CSV o XLSX.
                </p>
                <ul className="mt-2 list-disc pl-5 text-[12px] leading-snug text-gray-500">
                  <li>Reemplaza la fila de ejemplo por tus datos reales (o bórrala).</li>
                  <li>No cambies los nombres de las columnas (se reconocen por palabra clave).</li>
                  <li>Los acentos se conservan (UTF-8).</li>
                </ul>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTemplate(false)}
                    className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadInfoVariablesTemplate();
                      setShowTemplate(false);
                    }}
                    className="rounded-full px-5 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: "#165170" }}
                  >
                    Descargar CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. Plan por archivo (según el tipo detectado) */}
          {items.map((it) => (
            <div key={it.path} className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-700">
                {it.name} —{" "}
                {it.plan.tipo === "economic"
                  ? `panel económico · ${it.plan.total} hojas (${it.plan.curadas} curadas)`
                  : `catálogo InfoVariables · ${it.plan.rows} filas`}
              </h2>

              {it.plan.tipo === "infovariables" && (
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      Mapeadas ({it.plan.summary.mapeadas})
                    </p>
                    <ul className="mt-1 space-y-0.5 text-[12px]">
                      {it.plan.mapped.map((m) => (
                        <li key={m.header} className="flex justify-between gap-2">
                          <span className="truncate text-gray-600">{m.header}</span>
                          <span className="shrink-0 font-mono text-[#165170ff]">→ {m.destino}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      Omitidas ({it.plan.summary.sin_mapear})
                    </p>
                    <ul className="mt-1 space-y-0.5 text-[12px] text-gray-400">
                      {it.plan.unmapped.map((u) => (
                        <li key={u.header} className="truncate">{u.header}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {it.plan.tipo === "economic" && (
                <ul className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {it.plan.sheets.map((s) => (
                    <li
                      key={s.sheet}
                      title={s.rol}
                      className={`rounded px-2 py-0.5 ${
                        s.rol === "curada"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.rol === "input"
                            ? "bg-sky-100 text-sky-700"
                            : s.rol === "meta"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {s.sheet}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {items.length > 0 && (
            <button
              onClick={doApply}
              disabled={busy}
              className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy ? "Aplicando…" : `Aplicar ${items.length} archivo(s)`}
            </button>
          )}

          {/* 3. Resultados por archivo */}
          {results.map((r) => (
            <div
              key={r.name}
              className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              <b>{r.name}</b> —{" "}
              {r.result.tipo === "economic"
                ? `económico: ${r.result.rows} filas en ${r.result.panels} paneles`
                : `catálogo: ${r.result.variables} variables · ${r.result.dimensiones} dim · ${r.result.criterios} crit · ${r.result.subcriterios} subcrit · ${r.result.normas} normas`}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
