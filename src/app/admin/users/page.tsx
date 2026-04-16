"use client";
import { useEffect, useState } from "react";
import SideBar from "../../Components/SideBar";
import UsersTable from "../../Components/Admin/UsersTable";
import UserSearchBar from "../../Components/Admin/UserSearchBar";
import CreateUserModal from "../../Components/Admin/CreateUserModal";
import EditUserModal from "../../Components/Admin/EditUserModal";
import DeleteUserDialog from "../../Components/Admin/DeleteUserDialog";
import { User, CreateUserPayload, UpdateUserPayload } from "../../types/user";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 20;

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/users?${qs.toString()}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error("No estás autorizado para ver esta página. Se requiere rol de Administrador.");
        throw new Error("Error al obtener usuarios");
      }

      const data = await res.json();
      setUsers(data.users);
      setHasMore(data.users.length === limit);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleSearch = (term: string) => {
    setSearch(term);
    setPage(1); // Reset page on new search
  };

  const handleCreate = async (payload: CreateUserPayload) => {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Error al crear usuario");
    }
    await fetchUsers();
  };

  const handleUpdate = async (id: string, payload: UpdateUserPayload) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Error al actualizar usuario");
    }
    await fetchUsers();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Error al desactivar usuario");
    }
    await fetchUsers();
  };

  const handleActivate = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Error al activar usuario");
    }
    await fetchUsers();
  };

  return (
    <main className="flex h-screen w-full">
      <SideBar>
        <div className="flex flex-col w-full h-full"></div>
      </SideBar>

      <div className="flex-1 overflow-y-auto bg-white">
        <div className="w-full max-w-4xl mx-auto px-8 py-10">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-800">Administrar usuarios</h1>
            <p className="mt-1 text-sm text-gray-900">
              Gestiona los diferentes usuarios que tienen acceso a la plataforma, y sus diferentes privilegios.
            </p>
          </div>

          {/* Create button */}
          <div className="mb-8">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#165170" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#113d56"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#165170"; }}
            >
              Crear usuario nuevo
            </button>
          </div>

          {error ? (
            <div className="p-4 mb-4 text-sm text-red-700 rounded-xl bg-red-50 border border-red-100" role="alert">
              {error}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6">
              {/* Search bar */}
              <div className="mb-6">
                <UserSearchBar onSearch={handleSearch} />
              </div>

              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-7 h-7 rounded-full border-[3px] border-[#1B4F6A] border-t-transparent animate-spin"></div>
                </div>
              ) : (
                <UsersTable
                  users={users}
                  page={page}
                  hasMore={hasMore}
                  onPageChange={setPage}
                  onEdit={(user) => {
                    // Inline edit passes back the full user with updated fields
                    handleUpdate(user.id, {
                      firstName: user.firstName,
                      lastName: user.lastName,
                      email: user.email,
                      enabled: user.enabled,
                    });
                  }}
                  onDelete={setUserToDelete}
                  onActivate={(user) => handleActivate(user.id)}
                />
              )}
            </div>
          )}

          {/* Modals */}
          {showCreateModal && (
            <CreateUserModal
              onClose={() => setShowCreateModal(false)}
              onSubmit={handleCreate}
            />
          )}
          {userToEdit && (
            <EditUserModal
              user={userToEdit}
              onClose={() => setUserToEdit(null)}
              onSubmit={handleUpdate}
            />
          )}
          {userToDelete && (
            <DeleteUserDialog
              user={userToDelete}
              onClose={() => setUserToDelete(null)}
              onConfirm={handleDelete}
            />
          )}
        </div>
      </div>
    </main>
  );
}
