import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const signOutMock = vi.fn().mockResolvedValue(undefined);
const useSessionMock = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/app/Utils/AccionPrincipalContext", () => ({
  useAprincipal: () => ({
    accion: "seleccion-area",
    setAccion: vi.fn(),
    selectedHexes: new Set(),
  }),
}));

vi.mock("@/app/Utils/keycloakLogout", () => ({
  keycloakLogoutUrl: vi.fn(
    (idToken: string) =>
      `https://kc.example.com/logout?id_token_hint=${idToken}`,
  ),
}));

import SideBar from "@/app/Components/SideBar";

beforeEach(() => {
  useSessionMock.mockReturnValue({
    data: {
      user: { email: "user@example.com" },
      idToken: "test-id-token",
    },
  });
  delete (window as { location?: unknown }).location;
  (window as { location: unknown }).location = {
    href: "",
    origin: "https://app.example.com",
  };
});

describe("SideBar — Auth", () => {
  it("displays the user email from the session", () => {
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );

    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("renders the logout button", () => {
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );

    const logoutBtn = screen.getByRole("button", { name: /salir/i });
    expect(logoutBtn).toBeInTheDocument();
    expect(logoutBtn).toHaveAttribute("title", "Cerrar sesión");
  });

  it("shows empty email when session has no user email", () => {
    useSessionMock.mockReturnValue({
      data: { user: {} },
    });

    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );

    const logoutBtn = screen.getByRole("button", { name: /salir/i });
    expect(logoutBtn).toBeInTheDocument();
  });

  it("calls signOut and redirects to Keycloak logout on click", async () => {
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );

    const logoutBtn = screen.getByRole("button", { name: /salir/i });
    await fireEvent.click(logoutBtn);

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
  });
});
