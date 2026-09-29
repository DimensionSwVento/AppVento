"use client";

import { useCallback, useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import ConfirmDialog from "../../Components/ui/ConfirmDialog";
import { useToast } from "../../Components/ui/Toast";
import {
  createTurbine,
  deleteTurbine,
  fetchTurbines,
  updateTurbine,
  type AdminTurbine,
} from "../../Utils/admin/catalogApi";

/** Formatea el rango de potencia por aerogenerador (max 0 = sin tope, "utility"). */
function potenciaRange(t: AdminTurbine): string {
  const min = t.potenciaMinMW;
  if (t.potenciaMaxMW && t.potenciaMaxMW > 0) return `${min} – ${t.potenciaMaxMW} MW`;
  return `${min} MW o más`;
}

export default function AdminTurbinasPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminTurbine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminTurbine | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminTurbine | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchTurbines());
    } catch {
      toast.error("No se pudieron cargar los aerogeneradores");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleSave = async (t: AdminTurbine, isNew: boolean) => {
    if (isNew) {
      await createTurbine(t);
      toast.success("Aerogenerador creado");
    } else {
      await updateTurbine(t.id, {
        label: t.label,
        detail: t.detail,
        potenciaMinMW: t.potenciaMinMW,
        potenciaMaxMW: t.potenciaMaxMW,
        areaPorAeroKm2: t.areaPorAeroKm2,
        espaciamientoM: t.espaciamientoM,
      });
      toast.success("Aerogenerador actualizado");
    }
    setEditing(null);
    setCreating(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteTurbine(id);
    toast.success("Aerogenerador eliminado");
    setToDelete(null);
    await load();
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

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Aerogeneradores</h2>
              <p className="text-sm text-gray-500">
                Categorías de turbina (S/M/L) y sus especificaciones de ingeniería.
                Alimentan el cálculo de nº de turbinas y área por capacidad. No vienen
                del cliente: se definen aquí.
              </p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-white"
              style={{ backgroundColor: "#165170" }}
            >
              Crear aerogenerador
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#1B4F6A] border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Aerogenerador</th>
                    <th className="px-4 py-2.5 font-semibold">Potencia/unidad</th>
                    <th className="px-4 py-2.5 font-semibold">Área · espaciamiento</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800">
                          {t.label}{" "}
                          <span className="text-xs font-normal text-gray-400">({t.id})</span>
                        </p>
                        <p className="text-xs text-gray-500">{t.detail}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{potenciaRange(t)}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {t.areaPorAeroKm2} km² · {t.espaciamientoM} m
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => setEditing(t)}
                          className="mr-3 text-xs font-semibold text-[#165170ff] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setToDelete(t)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        No hay aerogeneradores. Crea el primero.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {(creating || editing) && (
        <TurbineModal
          turbine={editing}
          existingIds={items.map((t) => t.id)}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          variant="danger"
          title="Eliminar aerogenerador"
          message={
            <>
              ¿Eliminar <b>{toDelete.label}</b>? No se podrá deshacer.
            </>
          }
          confirmLabel="Eliminar"
          onConfirm={() => handleDelete(toDelete.id)}
          onCancel={() => setToDelete(null)}
        />
      )}
    </main>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = "any",
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
  min?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
      />
    </div>
  );
}

function TurbineModal({
  turbine,
  existingIds,
  onClose,
  onSave,
}: {
  turbine: AdminTurbine | null;
  existingIds: string[];
  onClose: () => void;
  onSave: (t: AdminTurbine, isNew: boolean) => Promise<void>;
}) {
  const isNew = turbine === null;
  const [id, setId] = useState(turbine?.id ?? "");
  const [label, setLabel] = useState(turbine?.label ?? "");
  const [detail, setDetail] = useState(turbine?.detail ?? "");
  const [potenciaMinMW, setMin] = useState<number>(turbine?.potenciaMinMW ?? 0);
  const [potenciaMaxMW, setMax] = useState<number>(turbine?.potenciaMaxMW ?? 0);
  const [areaPorAeroKm2, setArea] = useState<number>(turbine?.areaPorAeroKm2 ?? 0);
  const [espaciamientoM, setEsp] = useState<number>(turbine?.espaciamientoM ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = id.trim();
    if (isNew && existingIds.includes(tid)) {
      setError(`Ya existe un aerogenerador con id "${tid}".`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(
        {
          id: tid || label.trim(),
          label,
          detail,
          potenciaMinMW,
          potenciaMaxMW,
          areaPorAeroKm2,
          espaciamientoM,
        },
        isNew,
      );
    } catch {
      setError("No se pudo guardar. Revisa el id (no debe estar repetido).");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(180,195,210,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          {isNew ? "Crear aerogenerador" : "Editar aerogenerador"}
        </h3>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              ID (S / M / L)
            </label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              disabled={!isNew}
              placeholder="S"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A] disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
            />
          </div>
        </div>

        <label className="mb-1 block text-xs font-medium text-gray-600">Detalle</label>
        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
        />

        <div className="mb-3 grid grid-cols-2 gap-3">
          <NumField label="Potencia mín. (MW)" value={potenciaMinMW} onChange={setMin} />
          <NumField
            label="Potencia máx. (MW · 0 = sin tope)"
            value={potenciaMaxMW}
            onChange={setMax}
          />
          <NumField label="Área por aero (km²)" value={areaPorAeroKm2} onChange={setArea} />
          <NumField
            label="Espaciamiento (m)"
            value={espaciamientoM}
            onChange={setEsp}
            step="1"
          />
        </div>

        {error && <p className="mb-3 text-xs font-medium text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
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
      </form>
    </div>
  );
}
