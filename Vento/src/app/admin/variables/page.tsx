"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import { useToast } from "../../Components/ui/Toast";
import {
  createInformativa,
  fetchVariables,
  fetchMasterCodes,
  updateDataset,
  updateVariable,
  type AdminVariable,
  type VariableTipo,
} from "../../Utils/admin/catalogApi";
import { DIMENSIONS } from "../../Utils/variables/variablesCatalog";

export default function AdminVariablesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<VariableTipo>("modelo");
  const [vars, setVars] = useState<AdminVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminVariable | null>(null);
  const [editing, setEditing] = useState<AdminVariable | null>(null);
  const [datasetFor, setDatasetFor] = useState<AdminVariable | null>(null);
  const [creating, setCreating] = useState(false);
  // Códigos reales de la máster (hexagon.variables) para el combobox de vinculación.
  const [masterCodes, setMasterCodes] = useState<string[]>([]);

  useEffect(() => {
    // fetch async → setState en callback (no síncrono en el effect).
    fetchMasterCodes().then(setMasterCodes).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchVariables(tab);
      setVars(list);
      setSelected((s) => (s && list.find((v) => v.id === s.id)) || null);
    } catch {
      toast.error("No se pudieron cargar las variables");
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    // Carga inicial / al cambiar de pestaña: fetch al montar (uso legítimo de effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const patch = async (id: string, p: Partial<AdminVariable>, msg: string) => {
    try {
      await updateVariable(id, p);
      toast.success(msg);
      await load();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  return (
    <main className="flex h-screen w-full">
      <SideBar>
        <div className="flex h-full w-full flex-col" />
      </SideBar>
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-6xl px-8 py-10">
          <h1 className="text-2xl font-semibold text-gray-800">Administración</h1>
          <AdminNav />

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Variables y datasets
              </h2>
              <p className="text-sm text-gray-500">
                Administra las variables del modelo (no deshabilitables) y las
                informativas.
              </p>
            </div>
            {tab === "informativa" && (
              <button
                onClick={() => setCreating(true)}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-white"
                style={{ backgroundColor: "#165170" }}
              >
                Nueva variable informativa
              </button>
            )}
          </div>

          {/* Tabs modelo / informativa */}
          <div className="mb-4 inline-flex rounded-lg border border-gray-200 p-0.5">
            {(["modelo", "informativa"] as VariableTipo[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setSelected(null);
                }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab === t ? "bg-[#165170ff] text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t === "modelo" ? "Variables del modelo" : "Variables informativas"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            {/* Tabla */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent" />
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Variable</th>
                      <th className="px-3 py-2.5 font-semibold">Máster</th>
                      <th className="px-3 py-2.5 font-semibold">Dimensión</th>
                      <th className="px-3 py-2.5 font-semibold">Mapa</th>
                      {tab === "informativa" && (
                        <th className="px-3 py-2.5 font-semibold">Estado</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[...vars]
                      .sort(
                        (a, b) =>
                          a.dimensionLabel.localeCompare(b.dimensionLabel) ||
                          a.label.localeCompare(b.label),
                      )
                      .map((v, i, arr) => (
                        <Fragment key={v.id}>
                          {(i === 0 ||
                            arr[i - 1].dimensionLabel !== v.dimensionLabel) && (
                            <tr className="bg-gray-50/70">
                              <td
                                colSpan={5}
                                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                              >
                                {v.dimensionLabel}
                              </td>
                            </tr>
                          )}
                          <tr
                            onClick={() => setSelected(v)}
                            className={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 ${
                              selected?.id === v.id ? "bg-[#cce1eeff]/30" : ""
                            }`}
                          >
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-800">{v.label}</p>
                          {v.excluyente && (
                            <span className="text-[10px] font-semibold text-red-600">
                              Excluyente
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`font-mono text-[11px] ${
                              !v.masterId || v.masterId === "NA" || v.masterId.includes("-")
                                ? "rounded bg-amber-100 px-1.5 py-0.5 text-amber-700"
                                : "text-gray-600"
                            }`}
                            title="Debe coincidir con la columna del parquet (hexagon.variables)"
                          >
                            {v.masterId || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{v.dimensionLabel}</td>
                        <td className="px-3 py-2.5">
                          <Toggle
                            checked={v.enMapa}
                            onChange={(e) => {
                              e.stopPropagation();
                              patch(v.id, { enMapa: !v.enMapa }, "Visualización en mapa actualizada");
                            }}
                          />
                        </td>
                        {tab === "informativa" && (
                          <td className="px-3 py-2.5">
                            <Toggle
                              checked={v.enabled}
                              onChange={(e) => {
                                e.stopPropagation();
                                patch(
                                  v.id,
                                  { enabled: !v.enabled },
                                  v.enabled ? "Variable deshabilitada" : "Variable habilitada",
                                );
                              }}
                            />
                          </td>
                        )}
                          </tr>
                        </Fragment>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Detalle de la variable */}
            <div className="rounded-2xl border border-gray-100 p-5 shadow-sm">
              {selected ? (
                <DetailPanel
                  v={selected}
                  onEdit={() => setEditing(selected)}
                  onDataset={() => setDatasetFor(selected)}
                  onToggleEnabled={
                    selected.tipo === "informativa"
                      ? () =>
                          patch(
                            selected.id,
                            { enabled: !selected.enabled },
                            selected.enabled ? "Variable deshabilitada" : "Variable habilitada",
                          )
                      : undefined
                  }
                />
              ) : (
                <p className="py-12 text-center text-sm text-gray-400">
                  Selecciona una variable para ver su detalle.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <EditVarModal
          v={editing}
          codes={masterCodes}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      {datasetFor && (
        <DatasetModal
          v={datasetFor}
          onClose={() => setDatasetFor(null)}
          onSaved={async () => {
            setDatasetFor(null);
            await load();
          }}
        />
      )}
      {creating && (
        <CreateInformativaModal
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}
    </main>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`relative h-5 w-10 rounded-full transition-colors ${
        checked ? "bg-[#1B4F6A]" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-[2px] h-4 w-4 rounded-full bg-white transition-all ${
          checked ? "left-[22px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

// Fila clave/valor del detalle (a nivel módulo: regla react-hooks/static-components).
function Row({ k, val }: { k: string; val: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-gray-100 py-1.5 text-xs">
      <span className="text-gray-500">{k}</span>
      <span className="text-right font-medium text-gray-800">{val}</span>
    </div>
  );
}

function DetailPanel({
  v,
  onEdit,
  onDataset,
  onToggleEnabled,
}: {
  v: AdminVariable;
  onEdit: () => void;
  onDataset: () => void;
  onToggleEnabled?: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-base font-semibold text-gray-800">{v.label}</h3>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
          {v.tipo === "modelo" ? "Modelo" : "Informativa"}
        </span>
      </div>
      <p className="mb-3 text-xs text-gray-500">{v.descripcion}</p>
      <Row k="Dimensión" val={v.dimensionLabel} />
      <Row k="Fuente" val={v.fuente} />
      <Row k="Unidad" val={v.unidad} />
      <Row k="Rango" val={v.rango} />
      <Row k="En mapa" val={v.enMapa ? "Sí" : "No"} />
      <Row k="En menú" val={v.enMenu ? "Sí" : "No"} />
      <Row k="Excluyente" val={v.excluyente ? "Sí" : "No"} />
      <Row k="Dataset" val={`${v.datasetVersion} · ${v.datasetUpdatedAt}`} />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={onEdit}
          className="rounded-md border border-[#165170ff] px-3 py-1.5 text-xs font-semibold text-[#165170ff] hover:bg-[#cce1eeff]/40"
        >
          Editar detalle
        </button>
        <button
          onClick={onDataset}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Actualizar dataset
        </button>
        {onToggleEnabled ? (
          <button
            onClick={onToggleEnabled}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            {v.enabled ? "Deshabilitar" : "Habilitar"}
          </button>
        ) : (
          <span className="self-center text-[10px] italic text-gray-400">
            Las del modelo no se deshabilitan
          </span>
        )}
      </div>
    </div>
  );
}

function EditVarModal({
  v,
  codes,
  onClose,
  onSaved,
}: {
  v: AdminVariable;
  codes: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [masterId, setMasterId] = useState(v.masterId ?? "");
  const [descripcion, setDescripcion] = useState(v.descripcion);
  const [fuente, setFuente] = useState(v.fuente);
  const [unidad, setUnidad] = useState(v.unidad);
  const [rango, setRango] = useState(v.rango);
  const [enMapa, setEnMapa] = useState(v.enMapa);
  const [enMenu, setEnMenu] = useState(v.enMenu);
  const [excluyente, setExcluyente] = useState(v.excluyente);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateVariable(v.id, {
        masterId: masterId.trim() || "NA",
        descripcion, fuente, unidad, rango, enMapa, enMenu, excluyente,
      });
      toast.success("Detalle actualizado");
      onSaved();
    } catch {
      toast.error("No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={`Editar detalle — ${v.label}`}>
      <form onSubmit={submit}>
        <Field label="Código de la máster (master_id)">
          <input
            value={masterId}
            onChange={(e) => setMasterId(e.target.value)}
            placeholder="ej. AMB_005, TEC_004_sv003, SOC_007_s"
            list="master-codes-dl"
            className={`${inputCls} font-mono`}
          />
          {/* Al hacer click/escribir despliega los códigos REALES de la máster
              (claves de hexagon.variables) → elegir en vez de adivinar. */}
          <datalist id="master-codes-dl">
            {codes.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="mt-1 text-[11px] leading-snug text-gray-500">
            Debe coincidir EXACTO con la columna del parquet (la clave de{" "}
            <code>hexagon.variables</code>). Si no casa, la tabla del informe y la
            descarga de crudos de esta variable salen vacías. Ej.: si en el catálogo
            quedó <code>AMB-005-A</code> pero la máster trae <code>AMB_005</code>,
            corrígelo aquí y la tabla ya la encuentra.
          </p>
        </Field>
        <Field label="Descripción">
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>
        <Field label="Fuente">
          <input value={fuente} onChange={(e) => setFuente(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad">
            <input value={unidad} onChange={(e) => setUnidad(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Rango">
            <input value={rango} onChange={(e) => setRango(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="mb-4 flex flex-wrap gap-4 pt-1">
          <Check label="En mapa" checked={enMapa} onChange={() => setEnMapa((b) => !b)} />
          <Check label="En menú" checked={enMenu} onChange={() => setEnMenu((b) => !b)} />
          <Check label="Excluyente" checked={excluyente} onChange={() => setExcluyente((b) => !b)} />
        </div>
        <Actions onClose={onClose} saving={saving} />
      </form>
    </ModalShell>
  );
}

function DatasetModal({
  v,
  onClose,
  onSaved,
}: {
  v: AdminVariable;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [version, setVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDataset(v.id, version || "nueva versión");
      toast.success("Dataset actualizado");
      onSaved();
    } catch {
      toast.error("No se pudo actualizar el dataset");
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell onClose={onClose} title={`Actualizar dataset — ${v.label}`}>
      <form onSubmit={submit}>
        <p className="mb-3 text-xs text-gray-500">
          Dataset actual: <b>{v.datasetVersion}</b> ({v.datasetUpdatedAt}). Indica
          la nueva versión/carga de datos.
        </p>
        <Field label="Nueva versión">
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="ej. v2.0 / 2025-Q1"
            className={inputCls}
          />
        </Field>
        <Actions onClose={onClose} saving={saving} />
      </form>
    </ModalShell>
  );
}

function CreateInformativaModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [label, setLabel] = useState("");
  const [dimension, setDimension] = useState(DIMENSIONS[0].id);
  const [descripcion, setDescripcion] = useState("");
  const [fuente, setFuente] = useState("");
  const [enMapa, setEnMapa] = useState(false);
  const [enMenu, setEnMenu] = useState(true);
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createInformativa({ label, dimension, descripcion, fuente, enMapa, enMenu });
      toast.success("Variable informativa creada");
      onSaved();
    } catch {
      toast.error("No se pudo crear la variable");
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell onClose={onClose} title="Nueva variable informativa">
      <form onSubmit={submit}>
        <Field label="Nombre">
          <input value={label} onChange={(e) => setLabel(e.target.value)} required className={inputCls} />
        </Field>
        <Field label="Dimensión">
          <select value={dimension} onChange={(e) => setDimension(e.target.value as typeof dimension)} className={inputCls}>
            {DIMENSIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descripción">
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} className={inputCls} />
        </Field>
        <Field label="Fuente">
          <input value={fuente} onChange={(e) => setFuente(e.target.value)} className={inputCls} />
        </Field>
        <div className="mb-4 flex gap-4 pt-1">
          <Check label="En mapa" checked={enMapa} onChange={() => setEnMapa((b) => !b)} />
          <Check label="En menú" checked={enMenu} onChange={() => setEnMenu((b) => !b)} />
        </div>
        <Actions onClose={onClose} saving={saving} />
      </form>
    </ModalShell>
  );
}

// ── UI helpers ───────────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]";

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(180,195,210,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h3 className="mb-4 text-base font-semibold text-gray-800">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-[#165170]" />
      {label}
    </label>
  );
}

function Actions({ onClose, saving }: { onClose: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-1">
      <button
        type="button"
        onClick={onClose}
        className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-md px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "#165170" }}
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
