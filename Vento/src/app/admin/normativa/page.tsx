"use client";

import { useCallback, useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import AdminNav from "../../Components/Admin/AdminNav";
import ConfirmDialog from "../../Components/ui/ConfirmDialog";
import { useToast } from "../../Components/ui/Toast";
import {
  NORMA_ESTADO_META,
  type NormaEstado,
} from "../../Utils/report/regulatoryNorms";
import {
  createNorma,
  deleteNorma,
  fetchNormas,
  updateNorma,
  type Norma,
} from "../../Utils/admin/catalogApi";

const ESTADOS: NormaEstado[] = ["aplica", "tramite", "verificacion", "no-aplica"];

export default function AdminNormativaPage() {
  const toast = useToast();
  const [normas, setNormas] = useState<Norma[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Norma | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Norma | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setNormas(await fetchNormas());
    } catch {
      toast.error("No se pudieron cargar las normas");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Carga inicial / al cambiar de pestaña: fetch al montar (uso legítimo de effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleSave = async (n: Omit<Norma, "id">, id?: string) => {
    if (id) {
      await updateNorma(id, n);
      toast.success("Norma actualizada");
    } else {
      await createNorma(n);
      toast.success("Norma creada");
    }
    setEditing(null);
    setCreating(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteNorma(id);
    toast.success("Norma eliminada");
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
                Normativa regulatoria
              </h2>
              <p className="text-sm text-gray-500">
                Crea y actualiza las normas y su estado. Alimentan la dimensión
                regulatoria del informe.
              </p>
            </div>
            <button
              onClick={() => setCreating(true)}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-white"
              style={{ backgroundColor: "#165170" }}
            >
              Crear norma
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
                    <th className="px-4 py-2.5 font-semibold">Norma</th>
                    <th className="px-4 py-2.5 font-semibold">Estado</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {normas.map((n) => {
                    const m = NORMA_ESTADO_META[n.estado];
                    return (
                      <tr key={n.id} className="border-t border-gray-100 align-top">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800">{n.nombre}</p>
                          <p className="text-xs text-gray-500">{n.descripcion}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="rounded px-2 py-0.5 text-xs font-semibold"
                            style={{ backgroundColor: m.bg, color: m.color }}
                          >
                            {m.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => setEditing(n)}
                            className="mr-3 text-xs font-semibold text-[#165170ff] hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setToDelete(n)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {normas.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-500">
                        No hay normas. Crea la primera.
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
        <NormaModal
          norma={editing}
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
          title="Eliminar norma"
          message={
            <>
              ¿Eliminar <b>{toDelete.nombre}</b>? No se podrá deshacer.
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

function NormaModal({
  norma,
  onClose,
  onSave,
}: {
  norma: Norma | null;
  onClose: () => void;
  onSave: (n: Omit<Norma, "id">, id?: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState(norma?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(norma?.descripcion ?? "");
  const [estado, setEstado] = useState<NormaEstado>(norma?.estado ?? "aplica");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ nombre, descripcion, estado }, norma?.id);
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
          {norma ? "Editar norma" : "Crear norma"}
        </h3>
        <label className="mb-1 block text-xs font-medium text-gray-600">Nombre</label>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
        />
        <label className="mb-1 block text-xs font-medium text-gray-600">Descripción</label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
          className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
        />
        <label className="mb-1 block text-xs font-medium text-gray-600">Estado</label>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as NormaEstado)}
          className="mb-5 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#1B4F6A]"
        >
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {NORMA_ESTADO_META[s].label}
            </option>
          ))}
        </select>
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
