import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AprincipalProvider } from "@/app/Utils/AccionPrincipalContext";

const { signOutMock, useSessionMock } = vi.hoisted(() => ({
  signOutMock: vi.fn().mockResolvedValue(undefined),
  useSessionMock: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/app/Utils/keycloakLogout", () => ({
  keycloakLogoutUrl: vi.fn(
    (idToken: string) =>
      `https://kc.example.com/logout?id_token_hint=${idToken}`,
  ),
}));

import SideBar from "@/app/Components/SideBar";

function renderSideBar() {
  return render(
    <AprincipalProvider>
      <SideBar>
        <span>child</span>
      </SideBar>
    </AprincipalProvider>,
  );
}

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
    renderSideBar();

    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("renders the logout button", () => {
    renderSideBar();

    const logoutBtn = screen.getByRole("button", { name: /salir/i });
    expect(logoutBtn).toBeInTheDocument();
    expect(logoutBtn).toHaveAttribute("title", "Cerrar sesión");
  });

  it("shows empty email when session has no user email", () => {
    useSessionMock.mockReturnValue({
      data: { user: {} },
    });

    renderSideBar();

    const logoutBtn = screen.getByRole("button", { name: /salir/i });
    expect(logoutBtn).toBeInTheDocument();
  });

  it("calls signOut and redirects to Keycloak logout on click", async () => {
    renderSideBar();

    const logoutBtn = screen.getByRole("button", { name: /salir/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    });
  });
});
