"use client";

import { useCallback, useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import ConfirmDialog from "../../Components/ui/ConfirmDialog";
import { useToast } from "../../Components/ui/Toast";
import { PROJECTION_HORIZONS } from "../../Utils/economic/economicScenarios";
import {
  createEscenario,
  deleteEscenario,
  fetchEscenarios,
  updateEscenario,
  type AdminEscenario,
} from "../../Utils/admin/catalogApi";

export default function AdminEscenariosPage() {
  const toast = useToast();
  const [items, setItems] = useState<AdminEscenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminEscenario | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AdminEscenario | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchEscenarios());
    } catch {
      toast.error("No se pudieron cargar los escenarios");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: Omit<AdminEscenario, "id">, id?: string) => {
    if (id) {
      await updateEscenario(id, e);
      toast.success("Escenario actualizado");
    } else {
      await createEscenario(e);
      toast.success("Escenario creado");
    }
    setEditing(null);
    setCreating(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteEscenario(id);
    toast.success("Escenario eliminado");
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
              <h2 className="text-lg font-semibold text-gray-800">
                Escenarios económicos
              </h2>
              <p className="text-sm text-gray-500">
                Crea y actualiza los escenarios de la dimensión económica.
                Alimentan el panel económico y el informe.
              </p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-white"
              style={{ backgroundColor: "#165170" }}
            >
              Crear escenario
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
                    <th className="px-4 py-2.5 font-semibold">Escenario</th>
                    <th className="px-4 py-2.5 font-semibold">Horizonte</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800">{s.label}</p>
                        <p className="text-xs text-gray-500">{s.description}</p>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{s.horizonte} años</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => setEditing(s)}
                          className="mr-3 text-xs font-semibold text-[#165170ff] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setToDelete(s)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                        No hay escenarios. Crea el primero.
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
        <EscenarioModal
          escenario={editing}
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
          title="Eliminar escenario"
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

function EscenarioModal({
  escenario,
  onClose,
  onSave,
}: {
  escenario: AdminEscenario | null;
  onClose: () => void;
  onSave: (e: Omit<AdminEscenario, "id">, id?: string) => Promise<void>;
}) {
  const [label, setLabel] = useState(escenario?.label ?? "");
  const [description, setDescription] = useState(escenario?.description ?? "");
  const [horizonte, setHorizonte] = useState<number>(
    escenario?.horizonte ?? PROJECTION_HORIZONS[1],
  );
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ label, description, horizonte }, escenario?.id);
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
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h3 className="mb-4 text-base font-semibold text-gray-800">
          {escenario ? "Editar escenario" : "Crear escenario"}
        </h3>
        <label className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
          className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
        />
        <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
        />
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Horizonte (años)
        </label>
        <input
          type="number"
          min={1}
          max={30}
          value={horizonte}
          onChange={(e) => setHorizonte(Number(e.target.value))}
          className="mb-5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
        />
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
