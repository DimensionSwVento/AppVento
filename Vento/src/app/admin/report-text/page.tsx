"use client";

import { useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import { useToast } from "../../Components/ui/Toast";
import {
  fetchReportCalcText,
  updateReportCalcText,
  fetchReportContent,
  updateReportContent,
} from "../../Utils/admin/catalogApi";
import {
  CALC_SUMMARY_DEFAULTS,
  REPORT_CONTENT_DEFAULTS,
  type CalcSummaryText,
  type ReportContentText,
} from "../../Utils/report/reportTemplates";

/**
 * Admin · "Resumen del cálculo" del informe (#2B). Edita el TEXTO y las
 * expresiones que se IMPRIMEN en el informe para explicar cómo se obtiene el
 * score. Es SOLO descriptivo: no recalcula nada (el score real lo precalcula el
 * backend). Persiste en `app_config·report_calc_text`.
 */
export default function AdminReportTextPage() {
  const toast = useToast();
  const [form, setForm] = useState<CalcSummaryText>(CALC_SUMMARY_DEFAULTS);
  const [content, setContent] = useState<ReportContentText>(REPORT_CONTENT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingContent, setSavingContent] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchReportCalcText().then((t) => alive && setForm(t)),
      fetchReportContent().then((c) => alive && setContent(c)),
    ])
      .catch(() => toast.error("No se pudo cargar la configuración del informe"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [toast]);

  const patch = (p: Partial<CalcSummaryText>) =>
    setForm((f) => ({ ...f, ...p }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await updateReportCalcText(form);
      setForm(saved);
      toast.success("Resumen del cálculo actualizado");
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setForm(CALC_SUMMARY_DEFAULTS);

  // ── Contenido editable (#3): disclaimer + incentivos ──
  const patchContent = (p: Partial<ReportContentText>) =>
    setContent((c) => ({ ...c, ...p }));
  const setIncentivo = (i: number, key: "label" | "value", val: string) =>
    setContent((c) => ({
      ...c,
      incentivos: c.incentivos.map((it, j) =>
        j === i ? { ...it, [key]: val } : it,
      ),
    }));
  const addIncentivo = () =>
    setContent((c) => ({ ...c, incentivos: [...c.incentivos, { label: "", value: "" }] }));
  const removeIncentivo = (i: number) =>
    setContent((c) => ({ ...c, incentivos: c.incentivos.filter((_, j) => j !== i) }));

  const handleSaveContent = async () => {
    setSavingContent(true);
    try {
      const saved = await updateReportContent({
        ...content,
        incentivos: content.incentivos.filter((it) => it.label.trim()),
      });
      setContent(saved);
      toast.success("Contenido del informe actualizado");
    } catch {
      toast.error("No se pudo guardar el contenido");
    } finally {
      setSavingContent(false);
    }
  };
  const handleResetContent = () => setContent(REPORT_CONTENT_DEFAULTS);

  const labelCls = "text-sm font-medium text-gray-700";
  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-[#165170] focus:outline-none";

  return (
    <main className="flex h-screen w-full">
      <SideBar>
        <div className="flex h-full w-full flex-col" />
      </SideBar>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-4xl px-8 py-10">
          <h1 className="text-2xl font-semibold text-gray-800">Administración</h1>
          <AdminNav />

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              Resumen del cálculo
            </h2>
            <p className="text-sm text-gray-500">
              Edita el texto y las expresiones que se muestran en el informe para
              explicar cómo se obtiene el score. Es solo descriptivo:{" "}
              <b>no cambia el cálculo</b> (el score real lo produce el modelo del
              backend).
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div>
                <label className={labelCls} htmlFor="fdim">
                  Fórmula · Score por dimensión
                </label>
                <input
                  id="fdim"
                  value={form.formulaDimension}
                  onChange={(e) => patch({ formulaDimension: e.target.value })}
                  className={`${inputCls} font-mono`}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Se imprime como: “Score dimensión = {form.formulaDimension} =
                  …”.
                </p>
              </div>

              <div>
                <label className={labelCls} htmlFor="fgen">
                  Fórmula · Índice general
                </label>
                <input
                  id="fgen"
                  value={form.formulaGeneral}
                  onChange={(e) => patch({ formulaGeneral: e.target.value })}
                  className={`${inputCls} font-mono`}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Se imprime como: “Índice general = {form.formulaGeneral} = …”.
                </p>
              </div>

              <div>
                <label className={labelCls} htmlFor="nota">
                  Nota metodológica
                </label>
                <textarea
                  id="nota"
                  rows={4}
                  value={form.metodologiaNota}
                  onChange={(e) => patch({ metodologiaNota: e.target.value })}
                  className={inputCls}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Aparece al pie del resumen y de las fuentes del informe.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleReset}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Restaurar por defecto
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: "#165170" }}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>

            {/* Contenido editable del informe (#3): disclaimer + incentivos. */}
            <div className="flex flex-col gap-5 rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Contenido del informe
                </h2>
                <p className="text-sm text-gray-500">
                  Aviso legal (disclaimer) e incentivos tributarios de la dimensión
                  económica que se imprimen en el informe.
                </p>
              </div>
              <div>
                <label className={labelCls} htmlFor="disT">
                  Título del aviso legal
                </label>
                <input
                  id="disT"
                  value={content.disclaimerTitle}
                  onChange={(e) => patchContent({ disclaimerTitle: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="disB">
                  Texto del aviso legal
                </label>
                <textarea
                  id="disB"
                  rows={6}
                  value={content.disclaimerBody}
                  onChange={(e) => patchContent({ disclaimerBody: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Incentivos tributarios (clave · valor)</label>
                  <button
                    type="button"
                    onClick={addIncentivo}
                    className="text-sm font-semibold text-[#165170ff] hover:underline"
                  >
                    + Añadir
                  </button>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {content.incentivos.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={it.label}
                        onChange={(e) => setIncentivo(i, "label", e.target.value)}
                        placeholder="Concepto (p.ej. Exclusión de IVA)"
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                      <input
                        value={it.value}
                        onChange={(e) => setIncentivo(i, "value", e.target.value)}
                        placeholder="Valor (p.ej. Aplica)"
                        className="w-40 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeIncentivo(i)}
                        aria-label="Quitar incentivo"
                        className="shrink-0 text-gray-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleResetContent}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Restaurar por defecto
                </button>
                <button
                  onClick={handleSaveContent}
                  disabled={savingContent}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: "#165170" }}
                >
                  {savingContent ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
