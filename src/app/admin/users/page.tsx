"use client";
import { useCallback, useEffect, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import UsersTable from "../../Components/Admin/UsersTable";
import UserSearchBar from "../../Components/Admin/UserSearchBar";
import CreateUserModal from "../../Components/Admin/CreateUserModal";
import EditUserModal from "../../Components/Admin/EditUserModal";
import DeleteUserDialog from "../../Components/Admin/DeleteUserDialog";
import { User, CreateUserPayload, UpdateUserPayload } from "../../types/user";
import { useAprincipal } from "@/app/Utils/contexts/AccionPrincipalContext";
import { useToast } from "../../Components/ui/Toast";
import { useRouter } from "next/navigation";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 20;
  const router = useRouter();

  const { setAccion } = useAprincipal();
  const toast = useToast();

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const navegarInicio = () => {
    setAccion("seleccion-area");
    router.push("/dashboard");
    //   return;
  };

  // Sin setState síncrono aquí: el loading/error se ajusta en el bloque de
  // render de abajo (cambio de page/search) o en refreshUsers (handlers).
  // Estilo promise-chain: los setState viven en callbacks (.then/.catch),
  // nunca en el cuerpo síncrono — apto para llamarse desde el effect.
  const fetchUsers = useCallback(() => {
    const qs = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });

    return fetch(`/api/admin/users?${qs.toString()}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403)
            throw new Error(
              "No estás autorizado para ver esta página. Se requiere rol de Administrador.",
            );
          throw new Error("Error al obtener usuarios");
        }
        return res.json();
      })
      .then((data) => {
        setUsers(data.users);
        setHasMore(data.users.length === limit);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error desconocido");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, search]);

  /** Refresco disparado desde handlers (crear/editar/borrar): ahí sí es
   *  válido el setState síncrono. */
  const refreshUsers = async () => {
    setLoading(true);
    setError(null);
    await fetchUsers();
  };

  // Ajuste de estado durante el render cuando cambian page/search — patrón
  // recomendado en vez de setState síncrono dentro del effect.
  const [lastQuery, setLastQuery] = useState({ page, search });
  if (lastQuery.page !== page || lastQuery.search !== search) {
    setLastQuery({ page, search });
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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
    await refreshUsers();
    toast.success("Usuario creado correctamente");
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
    await refreshUsers();
    toast.success("Cambios guardados correctamente");
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Error al desactivar usuario");
    }
    await refreshUsers();
    toast.success("Usuario desactivado");
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
    await refreshUsers();
    toast.success("Usuario activado");
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
            <h1 className="text-2xl font-semibold text-gray-800">
              Administrar usuarios
            </h1>
            <p className="mt-1 text-sm text-gray-900">
              Gestiona los diferentes usuarios que tienen acceso a la
              plataforma, y sus diferentes privilegios.
            </p>
          </div>

          {/* Create button */}
          <div className="flex mb-8">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#165170" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#113d56";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#165170";
              }}
            >
              Crear usuario nuevo
            </button>
            <button
              onClick={navegarInicio}
              className="mx-[2rem] px-6 py-2 rounded-full border-2 border-[#165170] text-[#165170] bg-white transition-all duration-200 text-sm font-medium"
            >
              Inicio
            </button>
          </div>

          {error ? (
            <div
              className="p-4 mb-4 text-sm text-red-700 rounded-xl bg-red-50 border border-red-100"
              role="alert"
            >
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
                  onEdit={setUserToEdit}
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
