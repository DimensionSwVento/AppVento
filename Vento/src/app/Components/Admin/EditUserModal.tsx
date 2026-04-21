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
  const [role, setRole] = useState<"admin" | "analista">("analista");
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
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(180,195,210,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Editar Usuario</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 p-3 text-xs text-red-700 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-600">Nombre</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ focusRingColor: "#1B4F6A" } as React.CSSProperties}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px rgba(27,79,106,0.25)"; e.currentTarget.style.borderColor = "#1B4F6A"; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; }}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-600">Apellido</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none transition-all"
                  onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px rgba(27,79,106,0.25)"; e.currentTarget.style.borderColor = "#1B4F6A"; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; }}
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-600">Correo Electrónico</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-600">Estado de la cuenta</label>
              <label className="relative inline-flex items-center cursor-pointer gap-3">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all" style={{ ...(enabled ? { backgroundColor: "#1B4F6A" } : {}) }}></div>
                <span className="text-sm text-gray-700">{enabled ? "Activo" : "Inactivo"}</span>
              </label>
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-600">Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "analista")}
                disabled={rolesLoading}
                className="w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-wait transition-all"
                onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px rgba(27,79,106,0.25)"; e.currentTarget.style.borderColor = "#1B4F6A"; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.borderColor = ""; }}
              >
                <option value="analista">Analista</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
                {rolesLoading
                  ? "Cargando rol actual…"
                  : role === "admin"
                  ? "Administrador: acceso completo a gestión de usuarios, privilegios y configuración."
                  : "Analista: acceso al flujo principal de análisis de viabilidad, sin gestión de usuarios."}
              </p>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-md text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#165170" }}
                onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#113d56"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#165170"; }}
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
