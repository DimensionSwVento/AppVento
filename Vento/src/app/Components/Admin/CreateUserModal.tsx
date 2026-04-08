import { useState } from "react";
import { CreateUserPayload } from "../../types/user";

interface CreateUserModalProps {
  onClose: () => void;
  onSubmit: (payload: CreateUserPayload) => Promise<void>;
}

export default function CreateUserModal({ onClose, onSubmit }: CreateUserModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("analista");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ firstName, lastName, email, password, role });
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al crear el usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-4 border-b rounded-t">
          <h3 className="text-xl font-semibold text-gray-900">
            Crear Nuevo Usuario
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
              <label className="block mb-2 text-sm font-medium text-gray-900">Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Contraseña Temporal</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900">Rol</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                <option value="analista">Analista</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="flex items-center justify-end p-4 border-t border-gray-200 rounded-b">
              <button type="button" onClick={onClose} className="py-2.5 px-5 ms-3 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700">Cancelar</button>
              <button type="submit" disabled={loading} className="py-2.5 px-5 ms-3 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 disabled:opacity-50">
                {loading ? "Creando..." : "Crear Usuario"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
