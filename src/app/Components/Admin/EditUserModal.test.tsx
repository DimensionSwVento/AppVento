import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditUserModal from "./EditUserModal";
import type { User } from "../../types/user";

const adminUser: User = {
  id: "user-1",
  firstName: "Ana",
  lastName: "Prueba",
  email: "ana@example.com",
  enabled: true,
  createdTimestamp: 1,
  roles: ["admin"],
};

describe("EditUserModal", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ roles: ["admin"] }),
    } as Response);
  });

  it("aclara que el downgrade es reversible si el usuario sigue en Keycloak", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <EditUserModal
        user={adminUser}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const roleSelect = screen.getByRole("combobox");
    await waitFor(() => expect(roleSelect).toBeEnabled());

    fireEvent.change(roleSelect, { target: { value: "analista" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar Cambios" }));

    expect(
      await screen.findByRole("alertdialog", {
        name: "Quitar rol de Administrador",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Este cambio es reversible mientras el usuario no haya sido eliminado de Keycloak\./,
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
