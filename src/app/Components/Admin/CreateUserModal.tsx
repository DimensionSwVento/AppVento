"use client";

import { useState } from "react";
import { CreateUserPayload } from "../../types/user";

interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload) => Promise<void>;
}

export default function CreateUserModal({
  onClose,
  onSubmit,
}: CreateUserModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "analista">("analista");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const passwordErrors = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("longitud mínima 8");
    if (!/\d/.test(pwd))
      errors.push("debe contener al menos 1 caracter numérico");
    if (!/[A-Z]/.test(pwd))
      errors.push("debe contener al menos 1 letra mayúscula");
    if (!/[^a-zA-Z0-9]/.test(pwd))
      errors.push("debe contener al menos 1 caracter especial");
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ firstName, lastName, email, password, role });
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage || "Error al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  const focusStyle = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.currentTarget.style.boxShadow = "0 0 0 2px rgba(27,79,106,0.25)";
      e.currentTarget.style.borderColor = "#1B4F6A";
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.currentTarget.style.boxShadow = "";
      e.currentTarget.style.borderColor = "";
      setPasswordTouched(true);
    },
  };

  const errors = passwordErrors(password);
  const isInvalid = passwordTouched && errors.length > 0;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(180,195,210,0.45)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">
            Crear Nuevo Usuario
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
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
                <label className="block mb-1.5 text-xs font-medium text-gray-600">
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none transition-all"
                  {...focusStyle}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-600">
                  Apellido
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none transition-all"
                  {...focusStyle}
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-600">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none transition-all"
                {...focusStyle}
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-600">
                Contraseña Temporal
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className={`w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 border rounded-lg focus:outline-none transition-all ${
                  isInvalid ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                {...focusStyle}
              />
              {isInvalid && (
                <ul className="mt-1 space-y-0.5">
                  {errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-500">
                      Contraseña incorrecta: {err}.
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-gray-600">
                Rol
              </label>
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "admin" | "analista")
                }
                className="w-full px-3 py-2 text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none transition-all"
                {...focusStyle}
              >
                <option value="analista">Analista</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="mt-1.5 text-[11px] text-gray-500 leading-relaxed">
                {role === "admin"
                  ? "Administrador: acceso completo a gestión de usuarios, privilegios y configuración."
                  : "Analista: acceso al flujo principal de análisis de prefactibilidad, sin gestión de usuarios."}
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
                onMouseEnter={(e) => {
                  if (!loading)
                    (
                      e.currentTarget as HTMLButtonElement
                    ).style.backgroundColor = "#113d56";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    "#165170";
                }}
              >
                {loading ? "Creando..." : "Crear Usuario"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
