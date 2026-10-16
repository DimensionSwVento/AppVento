import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import EditUserModal from "@/app/Components/Admin/EditUserModal";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/app/types/user";

// US08-04 (H16): cambiar el rol admin (otorgar o quitar) exige confirmación
// in-app antes de aplicar; el resto de cambios se guardan directo.

const user: User = {
  id: "u1",
  firstName: "Ana",
  lastName: "Gómez",
  email: "ana@test.com",
  enabled: true,
  createdTimestamp: 1672531200000,
};

/** Mockea fetch: GET roles devuelve `roles`; el resto (notify) responde ok. */
function mockFetch(roles: string[]) {
  global.fetch = vi.fn((url: RequestInfo | URL) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(String(url).endsWith("/roles") ? { roles } : {}),
    } as Response),
  );
}

async function renderModal(roles: string[]) {
  mockFetch(roles);
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<EditUserModal user={user} onClose={onClose} onSubmit={onSubmit} />);
  const select = screen.getByRole("combobox");
  // El select queda deshabilitado mientras carga el rol actual.
  await waitFor(() => expect(select).not.toBeDisabled());
  return { onSubmit, onClose, select };
}

describe("EditUserModal — confirmación de rol admin (H16)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("otorgar admin pide confirmación y no aplica hasta confirmar", async () => {
    const { onSubmit, onClose, select } = await renderModal(["analista"]);

    fireEvent.change(select, { target: { value: "admin" } });
    fireEvent.click(screen.getByText("Guardar Cambios"));

    expect(
      screen.getByRole("alertdialog", { name: "Otorgar rol de Administrador" }),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Otorgar admin"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith("u1", {
        firstName: "Ana",
        lastName: "Gómez",
        enabled: true,
        role: "admin",
      }),
    );
    // Se notifica por correo al usuario que recibe el rol.
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/users/notify",
      expect.objectContaining({ method: "POST" }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("cancelar la confirmación de otorgar admin no aplica cambios", async () => {
    const { onSubmit, select } = await renderModal(["analista"]);

    fireEvent.change(select, { target: { value: "admin" } });
    fireEvent.click(screen.getByText("Guardar Cambios"));
    fireEvent.click(screen.getByText("Cancelar", { selector: "[role=alertdialog] button" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("quitar admin (downgrade) pide confirmación y no notifica por correo", async () => {
    const { onSubmit, select } = await renderModal(["admin"]);
    expect(select).toHaveValue("admin");

    fireEvent.change(select, { target: { value: "analista" } });
    fireEvent.click(screen.getByText("Guardar Cambios"));

    expect(
      screen.getByRole("alertdialog", { name: "Quitar rol de Administrador" }),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Quitar admin"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ role: "analista" }),
      ),
    );
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/admin/users/notify",
      expect.anything(),
    );
  });

  it("sin cambio de rol guarda directo, sin diálogo", async () => {
    const { onSubmit } = await renderModal(["analista"]);

    fireEvent.click(screen.getByText("Guardar Cambios"));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ role: "analista" }),
      ),
    );
  });
});

describe("EditUserModal — rol precargado desde el listado", () => {
  it("si el usuario ya trae roles, abre con el rol listo y sin pedir /roles", () => {
    mockFetch(["analista"]);
    render(
      <EditUserModal
        user={{ ...user, roles: ["admin"] }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const select = screen.getByRole("combobox");
    expect(select).not.toBeDisabled();
    expect(select).toHaveValue("admin");
    expect(screen.queryByText("Cargando rol actual…")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
