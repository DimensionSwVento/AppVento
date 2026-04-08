import { User } from "../../types/user";

interface UsersTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onActivate: (user: User) => void;
  page: number;
  onPageChange: (page: number) => void;
  hasMore: boolean;
}

export default function UsersTable({
  users,
  onEdit,
  onDelete,
  onActivate,
  page,
  onPageChange,
  hasMore,
}: UsersTableProps) {
  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
          <tr>
            <th scope="col" className="px-6 py-3">
              Nombre Completo
            </th>
            <th scope="col" className="px-6 py-3">
              Correo Electrónico
            </th>
            <th scope="col" className="px-6 py-3">
              Roles
            </th>
            <th scope="col" className="px-6 py-3">
              Estado
            </th>
            <th scope="col" className="px-6 py-3">
              Fecha de Creación
            </th>
            <th scope="col" className="px-6 py-3">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                {user.firstName} {user.lastName}
              </td>
              <td className="px-6 py-4">{user.email}</td>
              <td className="px-6 py-4">
                {user.roles && user.roles.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.map((r) => (
                      <span
                        key={r}
                        className={`text-xs px-2 py-0.5 rounded ${
                          r === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : r === "analista"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 italic">Sin rol</span>
                )}
              </td>
              <td className="px-6 py-4">
                {user.enabled ? (
                  <span className="bg-green-100 text-green-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                    Activo
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded">
                    Inactivo
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                {new Date(user.createdTimestamp).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 flex gap-2">
                <button
                  onClick={() => onEdit(user)}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Editar
                </button>
                {user.enabled ? (
                  <button
                    onClick={() => onDelete(user)}
                    className="font-medium text-red-600 hover:underline"
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    onClick={() => onActivate(user)}
                    className="font-medium text-green-600 hover:underline"
                  >
                    Activar
                  </button>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                No se encontraron usuarios.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between p-4 bg-white border-t border-gray-200 sm:px-6">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <span className="text-sm text-gray-700">Página {page}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
