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

  it("calls onDelete when trash icon is clicked", () => {
    const handleDelete = vi.fn();

    render(
      <UsersTable
        users={mockUsers}
        onEdit={vi.fn()}
        onDelete={handleDelete}
        onActivate={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
        hasMore={false}
      />
    );

    // Find the delete buttons by title
    const deleteButtons = screen.getAllByTitle("Eliminar usuario");
    fireEvent.click(deleteButtons[0]);
    expect(handleDelete).toHaveBeenCalledWith(mockUsers[0]);
  });

  it("enters inline edit mode when edit icon is clicked", () => {
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

    // Click the edit button for the first user
    const editButtons = screen.getAllByTitle("Editar usuario");
    fireEvent.click(editButtons[0]);

    // The name should now appear in separate input fields
    const firstNameInput = screen.getByDisplayValue("John");
    expect(firstNameInput).toBeDefined();

    const lastNameInput = screen.getByDisplayValue("Doe");
    expect(lastNameInput).toBeDefined();

    // The email should also be in an editable input
    const emailInput = screen.getByDisplayValue("john@test.com");
    expect(emailInput).toBeDefined();

    // Should show confirm and cancel buttons
    expect(screen.getByTitle("Guardar cambios")).toBeDefined();
    expect(screen.getByTitle("Cancelar")).toBeDefined();
  });

  it("calls onEdit with updated data when confirmed", () => {
    const handleEdit = vi.fn();

    render(
      <UsersTable
        users={mockUsers}
        onEdit={handleEdit}
        onDelete={vi.fn()}
        onActivate={vi.fn()}
        page={1}
        onPageChange={vi.fn()}
        hasMore={false}
      />
    );

    // Enter edit mode
    const editButtons = screen.getAllByTitle("Editar usuario");
    fireEvent.click(editButtons[0]);

    // Edit the name
    const firstNameInput = screen.getByDisplayValue("John");
    fireEvent.change(firstNameInput, { target: { value: "Juan" } });
    
    const lastNameInput = screen.getByDisplayValue("Doe");
    fireEvent.change(lastNameInput, { target: { value: "Carlos" } });

    // Click confirm
    fireEvent.click(screen.getByTitle("Guardar cambios"));

    expect(handleEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "1",
        firstName: "Juan",
        lastName: "Carlos",
      })
    );
  });

  it("cancels edit when cancel button is clicked", () => {
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

    // Enter edit mode
    const editButtons = screen.getAllByTitle("Editar usuario");
    fireEvent.click(editButtons[0]);

    // Should be in edit mode
    expect(screen.getByTitle("Cancelar")).toBeDefined();

    // Click cancel
    fireEvent.click(screen.getByTitle("Cancelar"));

    // Should be back to display mode — name is plain text again
    expect(screen.getByText("John Doe")).toBeDefined();
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
