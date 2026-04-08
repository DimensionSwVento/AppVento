import { render, screen, fireEvent } from "@testing-library/react";
import UsersTable from "@/app/Components/Admin/UsersTable";
import { describe, it, expect, vi } from "vitest";

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
  it("renders users correctly", () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const handleActivate = vi.fn();
    const handlePageChange = vi.fn();

    render(
      <UsersTable
        users={mockUsers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onActivate={handleActivate}
        page={1}
        onPageChange={handlePageChange}
        hasMore={false}
      />
    );

    expect(screen.getByText("John Doe")).toBeDefined();
    expect(screen.getByText("john@test.com")).toBeDefined();
    expect(screen.getByText("Activo")).toBeDefined();
    
    expect(screen.getByText("Jane Smith")).toBeDefined();
    expect(screen.getByText("jane@test.com")).toBeDefined();
    expect(screen.getByText("Inactivo")).toBeDefined();
  });

  it("handles pagination clicks", () => {
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
    const nextButton = screen.getByText("Siguiente");

    fireEvent.click(prevButton);
    expect(handlePageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it("calls onEdit and onDelete for enabled users", () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    const handleActivate = vi.fn();

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

    const editButtons = screen.getAllByText("Editar");
    fireEvent.click(editButtons[0]);
    expect(handleEdit).toHaveBeenCalledWith(mockUsers[0]);

    // Only the enabled user (John) should show "Desactivar"
    const deactivateButton = screen.getByText("Desactivar");
    fireEvent.click(deactivateButton);
    expect(handleDelete).toHaveBeenCalledWith(mockUsers[0]);
  });

  it("shows 'Activar' button for disabled users and calls onActivate", () => {
    const handleActivate = vi.fn();

    render(
      <UsersTable
        users={mockUsers}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onActivate={handleActivate}
        page={1}
        onPageChange={vi.fn()}
        hasMore={false}
      />
    );

    // Disabled user (Jane) should show "Activar" instead of "Desactivar"
    const activateButton = screen.getByText("Activar");
    fireEvent.click(activateButton);
    expect(handleActivate).toHaveBeenCalledWith(mockUsers[1]);
  });

  it("shows 'Desactivar' for enabled users and 'Activar' for disabled users", () => {
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

    // John is enabled → "Desactivar"
    // Jane is disabled → "Activar"
    expect(screen.getAllByText("Desactivar")).toHaveLength(1);
    expect(screen.getAllByText("Activar")).toHaveLength(1);
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
});
