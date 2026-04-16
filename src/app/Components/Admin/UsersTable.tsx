'use client';

import { useState, useEffect, useRef } from "react";
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

interface InlineEditState {
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  role: AppRole;
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editState, setEditState] = useState<InlineEditState>({
    firstName: "",
    lastName: "",
    email: "",
    enabled: true,
    role: "analista",
  });
  const [rolesCache, setRolesCache] = useState<Record<string, AppRole>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch roles for a user when selected
  useEffect(() => {
    if (!selectedUserId) return;
    if (rolesCache[selectedUserId]) {
      setEditState((prev) => ({ ...prev, role: rolesCache[selectedUserId] }));
      return;
    }
    const fetchRole = async () => {
      try {
        const res = await fetch(`/api/admin/users/${selectedUserId}/roles`);
        if (res.ok) {
          const data = await res.json();
          const roles: string[] = data.roles ?? [];
          const role: AppRole = roles.includes("admin") ? "admin" : "analista";
          setRolesCache((prev) => ({ ...prev, [selectedUserId]: role }));
          setEditState((prev) => ({ ...prev, role }));
        }
      } catch {
        // keep default
      }
    };
    fetchRole();
  }, [selectedUserId]);

  // Close selection when clicking outside the list
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSelectedUserId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectUser = (user: User) => {
    if (selectedUserId === user.id) {
      setSelectedUserId(null);
      return;
    }
    setSelectedUserId(user.id);
    const cachedRole = rolesCache[user.id] ?? "analista";
    setEditState({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      enabled: user.enabled,
      role: cachedRole,
    });
  };

  const handleConfirmEdit = (user: User) => {
    onEdit({
      ...user,
      firstName: editState.firstName,
      lastName: editState.lastName,
      email: editState.email,
      enabled: editState.enabled,
    });
    setSelectedUserId(null);
  };

  const handleCancelSelect = () => {
    setSelectedUserId(null);
  };

  if (users.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-gray-400">
        No se encontraron usuarios.
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {/* Users list */}
      <div className="flex flex-col gap-2">
        {users.map((user) => {
          const isSelected = selectedUserId === user.id;

          return (
            <div
              key={user.id}
              className={`
                relative px-4 py-5 rounded-xl transition-all duration-150 cursor-pointer
                ${isSelected
                  ? "bg-gray-100 border border-gray-200 shadow-sm"
                  : "bg-gray-50 hover:bg-gray-100"
                }
              `}
              onClick={() => !isSelected && handleSelectUser(user)}
            >
              {/* Main row: left content + right action buttons centered */}
              <div className="flex items-center">
                {/* Left side: status + name + email */}
                <div className="flex-1 min-w-0">
                  {/* Status badge */}
                  <div className="mb-2">
                    {isSelected ? (
                      <select
                        value={editState.enabled ? "activo" : "desactivado"}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            enabled: e.target.value === "activo",
                          }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-medium px-2.5 py-1 rounded border cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#165170] transition-colors"
                        style={{
                          backgroundColor: editState.enabled ? "#d7ebc1" : "#ebc1c7",
                          color: editState.enabled ? "#386904" : "#850a0c",
                          borderColor: editState.enabled ? "#b8d89e" : "#d9a0a8",
                        }}
                      >
                        <option value="activo" style={{ backgroundColor: "#ffffff", color: "#386904" }}>Activo</option>
                        <option value="desactivado" style={{ backgroundColor: "#ffffff", color: "#850a0c" }}>Desactivado</option>
                      </select>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* Name & Email */}
                  <div onClick={(e) => isSelected && e.stopPropagation()}>
                    {isSelected ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 w-full max-w-md">
                          {/* First Name input */}
                          <input
                            type="text"
                            value={editState.firstName}
                            onChange={(e) => setEditState((prev) => ({ ...prev, firstName: e.target.value }))}
                            className="text-sm font-medium text-gray-800 border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[#165170] focus:border-[#165170] bg-white"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Nombre"
                          />
                          {/* Last Name input */}
                          <input
                            type="text"
                            value={editState.lastName}
                            onChange={(e) => setEditState((prev) => ({ ...prev, lastName: e.target.value }))}
                            className="text-sm font-medium text-gray-800 border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-[#165170] focus:border-[#165170] bg-white"
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Apellido"
                          />
                        </div>
                        {/* Email input */}
                        <input
                          type="email"
                          value={editState.email}
                          onChange={(e) => setEditState((prev) => ({ ...prev, email: e.target.value }))}
                          className="text-xs text-gray-600 border border-gray-300 rounded-md px-3 py-2 w-full max-w-md focus:outline-none focus:ring-1 focus:ring-[#165170] focus:border-[#165170] bg-white"
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Correo electrónico"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Action buttons — always visible, vertically centered */}
                <div
                  className="flex-shrink-0 flex items-center gap-2 ml-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isSelected ? (
                    <>
                      {/* Confirm (green check) */}
                      <button
                        onClick={() => handleConfirmEdit(user)}
                        title="Guardar cambios"
                        className="w-10 h-10 flex items-center justify-center rounded-full border-2 transition-colors bg-transparent"
                        style={{ borderColor: "#386904", color: "#386904" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      {/* Cancel (red X) */}
                      <button
                        onClick={handleCancelSelect}
                        title="Cancelar"
                        className="w-10 h-10 flex items-center justify-center rounded-full border-2 transition-colors bg-transparent"
                        style={{ borderColor: "#850a0c", color: "#850a0c" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Edit icon — always visible */}
                      <button
                        onClick={() => handleSelectUser(user)}
                        title="Editar usuario"
                        className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-[#165170] transition-colors"
                        style={{ color: "#165170" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L18 8.625" />
                        </svg>
                      </button>
                      {/* Delete icon — always visible */}
                      <button
                        onClick={() => onDelete(user)}
                        title="Eliminar usuario"
                        className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-200 hover:border-[#165170] transition-colors"
                        style={{ color: "#165170" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
