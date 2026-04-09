'use client';

import { useEffect, useState } from "react";
import { User, UpdateUserPayload } from "../../types/user";

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSubmit: (id: string, payload: UpdateUserPayload) => Promise<void>;
}

export default function EditUserModal({ user, onClose, onSubmit }: EditUserModalProps) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [enabled, setEnabled] = useState(user.enabled);
  const [role, setRole] = useState("analista");
  const [rolesLoading, setRolesLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`/api/admin/users/${user.id}/roles`);
        if (res.ok) {
          const data = await res.json();
          const roles: string[] = data.roles ?? [];
          setRole(roles.includes("admin") ? "admin" : "analista");
        }
      } catch {
        // keep default "analista"
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(user.id, { firstName, lastName, enabled, role });
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage || "Error al actualizar el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4 border-b rounded-t">
          <h3 className="text-xl font-semibold text-gray-900">
            Editar Usuario
          </h3>
          <button
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center"
            onClick={onClose}
          >
            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span className="sr-only">Cerrar modal</span>
          </button>
        </div>
        <div className="p-4 space-y-4">
          {error && <div className="p-2 text-sm text-red-800 bg-red-100 rounded-lg">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Nombre</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Apellido</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
              </div>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Correo Electrónico (No editable)</label>
              <input type="email" value={user.email} disabled className="bg-gray-100 border border-gray-300 text-gray-500 text-sm rounded-lg block w-full p-2.5 cursor-not-allowed" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Estado de la cuenta</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-sm font-medium text-gray-900">{enabled ? "Activo" : "Inactivo"}</span>
              </label>
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={rolesLoading}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="analista">Analista</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex items-center justify-end p-4 border-t border-gray-200 rounded-b">
              <button type="button" onClick={onClose} className="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700">Cancelar</button>
              <button type="submit" disabled={loading} className="py-2.5 px-5 ms-3 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 disabled:opacity-50">
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
