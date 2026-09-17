"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import SideBar from "../../Components/layout/SideBar";
import UsersTable from "../../Components/Admin/UsersTable";
import UserSearchBar from "../../Components/Admin/UserSearchBar";
import AdminNav from "../../Components/Admin/AdminNav";
import CreateUserModal from "../../Components/Admin/CreateUserModal";
import EditUserModal from "../../Components/Admin/EditUserModal";
import DeleteUserDialog from "../../Components/Admin/DeleteUserDialog";
import { User, CreateUserPayload, UpdateUserPayload } from "../../types/user";
import { useAprincipal } from "@/app/Utils/contexts/AccionPrincipalContext";
import { useToast } from "../../Components/ui/Toast";
import { useRouter } from "next/navigation";

// Se trae un lote grande una sola vez y se filtra/pagina en el cliente
// (US08-04.5): búsqueda insensible a tildes + filtro por estado, instantáneos.
// Suficiente para cientos de usuarios; si algún día son miles, migrar a
// búsqueda/paginación server-side.
const BATCH = 500;
const PAGE_SIZE = 20;

/** Normaliza para comparar sin tildes ni mayúsculas ("Gómez" == "gomez"). */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export default function AdminUsersPage() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<"todos" | "activo" | "inactivo">("todos");
  const [rol, setRol] = useState<"todos" | "admin" | "analista">("todos");
  const [page, setPage] = useState(1);
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
  };

  // Trae el lote completo (sin `search`: el filtrado es en cliente).
  const fetchUsers = useCallback(() => {
    return fetch(`/api/admin/users?page=1&limit=${BATCH}`)
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
        setAllUsers(data.users ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Error desconocido");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  /** Refresco tras crear/editar/desactivar. */
  const refreshUsers = async () => {
    setLoading(true);
    setError(null);
    await fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filtrado en cliente: texto (sin tildes) + estado + rol. Coincidencia por
  // TOKENS (todos deben aparecer) y ORDEN por relevancia (empieza-por antes que
  // contiene, luego alfabético) para que "andres" no traiga a "Élomo" primero.
  const filtered = useMemo(() => {
    const q = norm(search);
    const tokens = q.split(/\s+/).filter(Boolean);
    const q0 = tokens[0] ?? "";
    // Query CON acentos (para priorizar coincidencia exacta de tilde: si escribes
    // "Ándrés" con tilde, "Ándrés" va antes que "Andres").
    const q0Raw = (search.trim().toLowerCase().split(/\s+/)[0] ?? "");

    const base = allUsers.filter((u) => {
      if (estado === "activo" && !u.enabled) return false;
      if (estado === "inactivo" && u.enabled) return false;
      // Filtro por rol (US08-04.5): activo cuando el listado trae `roles`.
      if (rol !== "todos") {
        const isAdmin = u.roles?.includes("admin") ?? false;
        if (rol === "admin" && !isAdmin) return false;
        if (rol === "analista" && isAdmin) return false;
      }
      if (tokens.length === 0) return true;
      const hay = norm(`${u.firstName} ${u.lastName} ${u.email}`);
      return tokens.every((t) => hay.includes(t)); // AND de todos los términos
    });

    const rank = (u: User): number => {
      if (!q0) return 4;
      const fn = norm(u.firstName);
      const ln = norm(u.lastName);
      // 0: coincidencia EXACTA de acento (respeta la tilde que escribiste).
      if (
        q0Raw &&
        (u.firstName.toLowerCase().startsWith(q0Raw) ||
          u.lastName.toLowerCase().startsWith(q0Raw))
      )
        return 0;
      if (fn.startsWith(q0) || ln.startsWith(q0)) return 1; // empieza por (sin tildes)
      if (
        norm(`${u.firstName} ${u.lastName}`)
          .split(/\s+/)
          .some((w) => w.startsWith(q0))
      )
        return 2; // alguna palabra empieza por
      return 3; // solo contiene
    };

    return base.sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return norm(`${a.firstName} ${a.lastName}`).localeCompare(
        norm(`${b.firstName} ${b.lastName}`),
        "es",
      );
    });
  }, [allUsers, search, estado, rol]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageUsers = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const hasMore = safePage < totalPages;

  const handleSearch = (term: string) => {
    setSearch(term);
    setPage(1);
  };

  const handleEstado = (v: "todos" | "activo" | "inactivo") => {
    setEstado(v);
    setPage(1);
  };

  const handleRol = (v: "todos" | "admin" | "analista") => {
    setRol(v);
    setPage(1);
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
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
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
          <AdminNav />
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
              {/* Search bar + filtro por estado */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <UserSearchBar onSearch={handleSearch} />
                <select
                  value={estado}
                  onChange={(e) =>
                    handleEstado(
                      e.target.value as "todos" | "activo" | "inactivo",
                    )
                  }
                  aria-label="Filtrar por estado"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1B4F6A]"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
                <select
                  value={rol}
                  onChange={(e) =>
                    handleRol(e.target.value as "todos" | "admin" | "analista")
                  }
                  aria-label="Filtrar por rol"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#1B4F6A]"
                >
                  <option value="todos">Todos los roles</option>
                  <option value="admin">Administrador</option>
                  <option value="analista">Analista</option>
                </select>
                {!loading && (
                  <span className="ml-auto text-xs text-gray-500">
                    {filtered.length} usuario{filtered.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center p-12">
                  <div className="w-7 h-7 rounded-full border-[3px] border-[#1B4F6A] border-t-transparent animate-spin"></div>
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  No se encontraron usuarios con esos criterios.
                </p>
              ) : (
                <UsersTable
                  users={pageUsers}
                  page={safePage}
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
