'use client';

import { useState, useEffect } from "react";
import { UserCheck, UserX } from "lucide-react";
import { User, AppRole } from "../../types/user";

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
  const [rolesCache, setRolesCache] = useState<Record<string, AppRole>>({});

  // Prefetch roles para todos los usuarios visibles en la página.
  // N+1 consciente — limitado a 20 usuarios por página (limit en page.tsx).
  // Permite mostrar badge de rol sin esperar a que el admin abra el editor.
  // Al cambiar la referencia de `users` (p.ej. tras crear/editar) se invalida
  // el cache completo para que los cambios de rol se reflejen sin recargar (AC4).
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(
      users.map(async (u) => {
        const res = await fetch(`/api/admin/users/${u.id}/roles`);
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        const roles: string[] = data.roles ?? [];
        const role: AppRole = roles.includes("admin") ? "admin" : "analista";
        return { id: u.id, role };
      })
    ).then((results) => {
      if (cancelled) return;
      const patch: Record<string, AppRole> = {};
      for (const r of results) {
        if (r.status === "fulfilled") patch[r.value.id] = r.value.role;
      }
      // Reemplaza el cache completo: invalida entradas obsoletas (AC4) sin
      // necesidad de un reset síncrono previo.
      setRolesCache(patch);
    });
    return () => {
      cancelled = true;
    };
  }, [users]);


  if (users.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        No se encontraron usuarios.
      </div>
    );
  }

  return (
    <div>
      {/* Users list */}
      <div className="flex flex-col gap-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="relative px-4 py-5 rounded-xl transition-all duration-150 cursor-pointer bg-gray-50 hover:bg-gray-100"
            // Clic en la fila = editar: abre directo el modal completo (nombre,
            // estado y rol), sin edición inline previa (feedback UX US08-04).
            onClick={() => onEdit(user)}
          >
            {/* Main row: left content + right action buttons centered */}
            <div className="flex items-center">
              {/* Left side: status + name + email */}
              <div className="flex-1 min-w-0">
                {/* Status + Role badges */}
                <div className="mb-2 flex items-center gap-2 flex-wrap">
                  {user.enabled ? (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: "#d7ebc1", color: "#386904" }}
                    >
                      Activo
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: "#ebc1c7", color: "#850a0c" }}
                    >
                      Desactivado
                    </span>
                  )}
                  {/* Role badge — siempre visible (US-FB-05 AC1) */}
                  {(() => {
                    const role = rolesCache[user.id];
                    if (!role) {
                      return (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium text-gray-400 bg-gray-100 border border-gray-200"
                          title="Cargando rol..."
                        >
                          …
                        </span>
                      );
                    }
                    const isAdmin = role === "admin";
                    return (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border"
                        style={{
                          backgroundColor: isAdmin ? "#e0e7ff" : "#f3f4f6",
                          color: isAdmin ? "#3730a3" : "#4b5563",
                          borderColor: isAdmin ? "#c7d2fe" : "#e5e7eb",
                        }}
                        title={isAdmin ? "Administrador — gestión de usuarios y acceso total" : "Analista — acceso al flujo principal"}
                      >
                        {isAdmin ? "Administrador" : "Analista"}
                      </span>
                    );
                  })()}
                </div>

                {/* Name & Email */}
                <p className="text-sm font-medium text-gray-800">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
              </div>

              {/* Right side: Action buttons — always visible, vertically centered */}
              <div
                className="flex-shrink-0 flex items-center gap-2 ml-4"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onEdit(user)}
                  title="Editar usuario"
                  aria-label={`Editar a ${user.firstName} ${user.lastName}`}
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-[#165170] transition-colors"
                  style={{ color: "#165170" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L18 8.625" />
                  </svg>
                </button>
                {/* Desactivar ≠ eliminar: ícono de usuario tachado (no papelera)
                    y, si ya está inactivo, la acción inversa "Activar". */}
                {user.enabled ? (
                  <button
                    onClick={() => onDelete(user)}
                    title="Desactivar usuario"
                    aria-label={`Desactivar a ${user.firstName} ${user.lastName}`}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-[#850a0c] hover:border-[#850a0c] hover:bg-red-50 transition-colors"
                  >
                    <UserX className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    onClick={() => onActivate(user)}
                    title="Activar usuario"
                    aria-label={`Activar a ${user.firstName} ${user.lastName}`}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 text-[#386904] hover:border-[#386904] hover:bg-green-50 transition-colors"
                  >
                    <UserCheck className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show more / Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-start gap-4 mt-6 pt-4">
          {page > 1 && (
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
          )}
          {hasMore && (
            <button
              onClick={() => onPageChange(page + 1)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              Mostrar más
            </button>
          )}
        </div>
      )}
    </div>
  );
}
