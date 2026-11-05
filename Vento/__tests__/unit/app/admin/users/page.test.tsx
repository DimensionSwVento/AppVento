import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminUsersPage from "@/app/admin/users/page";
import { ToastProvider } from "@/app/Components/ui/Toast";
import type { CreateUserPayload } from "@/app/types/user";

// US08-04: buscador insensible a tildes + filtro por rol, y toast visible al
// crear usuario (FB-FIX-13).

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/app/Utils/contexts/AccionPrincipalContext", () => ({
  useAprincipal: () => ({ setAccion: vi.fn() }),
}));
// Layout ajeno a lo que se prueba (SideBar arrastra sesión/rutas).
vi.mock("@/app/Components/layout/SideBar", () => ({
  default: ({ children }: { children: React.ReactNode }) => <aside>{children}</aside>,
}));
vi.mock("@/app/Components/Admin/AdminNav", () => ({ default: () => null }));
// El formulario real se cubre aparte; aquí sólo importa que dispare onSubmit.
vi.mock("@/app/Components/Admin/CreateUserModal", () => ({
  default: ({ onSubmit }: { onSubmit: (p: CreateUserPayload) => Promise<void> }) => (
    <button
      onClick={() =>
        onSubmit({
          firstName: "Nuevo",
          lastName: "Usuario",
          email: "nuevo@test.com",
          password: "Secreta123!",
          role: "analista",
        })
      }
    >
      stub-crear
    </button>
  ),
}));

const users = [
  { id: "1", firstName: "Andrés", lastName: "Gómez", email: "andres@test.com", enabled: true, createdTimestamp: 1, roles: ["admin"] },
  { id: "2", firstName: "Laura", lastName: "Pérez", email: "laura@test.com", enabled: true, createdTimestamp: 2, roles: ["analista"] },
  { id: "3", firstName: "Carlos", lastName: "Ruiz", email: "carlos@test.com", enabled: false, createdTimestamp: 3, roles: ["analista"] },
];

beforeEach(() => {
  global.fetch = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (init?.method === "POST") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    }
    if (u.endsWith("/roles")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ roles: [] }) } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ users }) } as Response);
  });
});

async function renderPage() {
  render(
    <ToastProvider>
      <AdminUsersPage />
    </ToastProvider>,
  );
  await screen.findByText("3 usuarios");
}

describe("AdminUsersPage", () => {
  it("busca sin tildes: 'gomez' encuentra a 'Gómez'", async () => {
    await renderPage();

    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre o correo..."), {
      target: { value: "gomez" },
    });

    await screen.findByText("1 usuario");
    expect(screen.getByText("Andrés Gómez")).toBeInTheDocument();
    expect(screen.queryByText("Laura Pérez")).not.toBeInTheDocument();
  });

  it("busca con tilde aunque el nombre se escriba sin ella: 'andres' → 'Andrés'", async () => {
    await renderPage();

    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre o correo..."), {
      target: { value: "ANDRES" },
    });

    await screen.findByText("1 usuario");
    expect(screen.getByText("Andrés Gómez")).toBeInTheDocument();
  });

  it("filtra por rol y por estado", async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText("Filtrar por rol"), { target: { value: "admin" } });
    expect(screen.getByText("1 usuario")).toBeInTheDocument();
    expect(screen.getByText("Andrés Gómez")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar por rol"), { target: { value: "analista" } });
    fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "inactivo" } });
    expect(screen.getByText("1 usuario")).toBeInTheDocument();
    expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
  });

  it("muestra un toast de éxito al crear un usuario (FB-FIX-13)", async () => {
    await renderPage();

    fireEvent.click(screen.getByText("Crear usuario nuevo"));
    fireEvent.click(screen.getByText("stub-crear"));

    const toast = await screen.findByRole("status");
    expect(within(toast).getByText("Usuario creado correctamente")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/users",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
