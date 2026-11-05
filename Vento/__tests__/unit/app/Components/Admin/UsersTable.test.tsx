import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UsersTable from "@/app/Components/Admin/UsersTable";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch for role fetching. Por defecto devuelve analista; los tests
// que necesiten admin pueden sobrescribir con mockImplementationOnce.
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ roles: ["analista"] }),
  } as Response)
);

const mockUsers = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john@test.com",
    enabled: true,
    createdTimestamp: 1672531200000,
    roles: ["admin"],
  },
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@test.com",
    enabled: false,
    createdTimestamp: 1672617600000,
    roles: ["analista"],
  },
];

describe("UsersTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders users correctly", () => {
    render(
      <UsersTable
        users={mockUsers}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onActivate={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
        hasMore={false}
      />
    );

    expect(screen.getByText("John Doe")).toBeDefined();
    expect(screen.getByText("john@test.com")).toBeDefined();
    expect(screen.getByText("Activo")).toBeDefined();

    expect(screen.getByText("Jane Smith")).toBeDefined();
    expect(screen.getByText("jane@test.com")).toBeDefined();
    expect(screen.getByText("Desactivado")).toBeDefined();
  });

  it("shows pagination when there are more pages", () => {
    const handlePageChange = vi.fn();

    render(
      <UsersTable
        users={mockUsers}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onActivate={vi.fn()}
        page={2}
        onPageChange={handlePageChange}
        hasMore={true}
      />
    );

    const prevButton = screen.getByText("Anterior");
    const nextButton = screen.getByText("Mostrar más");

    fireEvent.click(prevButton);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  // US08-04 (feedback UX): sin edición inline — editar abre directo el modal
  // (onEdit con el usuario tal cual) y desactivar/activar son acciones directas.
  describe("acciones por fila", () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const handleActivate = vi.fn();
    const renderTable = () =>
      render(
        <UsersTable
          users={mockUsers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onActivate={handleActivate}
        page={1}
        onPageChange={vi.fn()}
        hasMore={false}
        />
      );

    it("el lápiz llama a onEdit con el usuario, sin inputs inline", () => {
      renderTable();
      fireEvent.click(screen.getAllByTitle("Editar usuario")[0]);
      expect(handleEdit).toHaveBeenCalledWith(mockUsers[0]);
      expect(screen.queryByDisplayValue("John")).toBeNull();
    });

    it("clic en la fila también abre la edición", () => {
      renderTable();
      fireEvent.click(screen.getByText("Jane Smith"));
      expect(handleEdit).toHaveBeenCalledWith(mockUsers[1]);
    });

    it("usuario activo: 'Desactivar' llama a onDelete y no abre la edición", () => {
      renderTable();
      const buttons = screen.getAllByTitle("Desactivar usuario");
      expect(buttons).toHaveLength(1); // solo John está activo
      fireEvent.click(buttons[0]);
      expect(handleDelete).toHaveBeenCalledWith(mockUsers[0]);
      expect(handleEdit).not.toHaveBeenCalled();
    });

    it("usuario inactivo: muestra 'Activar' en vez de 'Desactivar'", () => {
      renderTable();
      const buttons = screen.getAllByTitle("Activar usuario");
      expect(buttons).toHaveLength(1); // solo Jane está inactiva
      fireEvent.click(buttons[0]);
      expect(handleActivate).toHaveBeenCalledWith(mockUsers[1]);
      expect(handleEdit).not.toHaveBeenCalled();
    });
  });

  it("shows empty state when no users", () => {
    render(
      <UsersTable
        users={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onActivate={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
        hasMore={false}
      />
    );

    expect(screen.getByText("No se encontraron usuarios.")).toBeDefined();
  });

  it("shows 'Activo' badge for enabled users and 'Desactivado' for disabled users", () => {
    render(
      <UsersTable
        users={mockUsers}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onActivate={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
        hasMore={false}
      />
    );

    expect(screen.getByText("Activo")).toBeDefined();
    expect(screen.getByText("Desactivado")).toBeDefined();
  });

  // US-FB-05 — Admin visibilidad de roles
  describe("Role badge (US-FB-05 AC1)", () => {
    it("prefetch dispara un fetch /roles por cada usuario al montar", async () => {
      render(
        <UsersTable
          users={mockUsers}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onActivate={vi.fn()}
          page={1}
          onPageChange={vi.fn()}
          hasMore={false}
        />
      );
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/1/roles");
        expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/2/roles");
      });
    });

    it("muestra badge 'Analista' cuando /roles devuelve ['analista']", async () => {
      render(
        <UsersTable
          users={mockUsers}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onActivate={vi.fn()}
          page={1}
          onPageChange={vi.fn()}
          hasMore={false}
        />
      );
      await waitFor(() => {
        expect(screen.getAllByText("Analista").length).toBe(2);
      });
    });

    it("muestra badge 'Administrador' cuando /roles incluye 'admin'", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ roles: ["admin"] }),
        } as Response)
      );
      render(
        <UsersTable
          users={mockUsers}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onActivate={vi.fn()}
          page={1}
          onPageChange={vi.fn()}
          hasMore={false}
        />
      );
      await waitFor(() => {
        expect(screen.getAllByText("Administrador").length).toBe(2);
      });
    });

    it("invalida el cache de roles al cambiar la referencia de users (AC4)", async () => {
      const { rerender } = render(
        <UsersTable
          users={mockUsers}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onActivate={vi.fn()}
          page={1}
          onPageChange={vi.fn()}
          hasMore={false}
        />
      );
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith("/api/admin/users/1/roles"),
      );
      const initialCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
        .length;
      // Nueva referencia → debería re-fetchear roles para reflejar cambios
      rerender(
        <UsersTable
          users={[...mockUsers]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onActivate={vi.fn()}
          page={1}
          onPageChange={vi.fn()}
          hasMore={false}
        />
      );
      await waitFor(() => {
        expect(
          (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length,
        ).toBeGreaterThan(initialCalls);
      });
    });
  });
});
