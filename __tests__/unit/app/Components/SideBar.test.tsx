import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signOutMock = vi.fn().mockResolvedValue(undefined);
const useSessionMock = vi.fn();
const setAccionMock = vi.fn();
const useAprincipalMock = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/app/Utils/contexts/AccionPrincipalContext", () => ({
  useAprincipal: () => useAprincipalMock(),
}));

vi.mock("@/app/Utils/apis/keycloakLogout", () => ({
  keycloakLogoutUrl: vi.fn(
    (idToken: string | undefined, origin: string) =>
      `https://kc.example.com/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(origin)}`,
  ),
}));

import SideBar from "@/app/Components/layout/SideBar";

function renderSideBar() {
  return render(
    <SideBar>
      <span>child</span>
    </SideBar>,
  );
}

beforeEach(() => {
  useSessionMock.mockReturnValue({
    data: {
      user: { email: "user@example.com", name: "User Test" },
      idToken: "test-id-token",
    },
  });
  useAprincipalMock.mockReturnValue({
    accion: "seleccion-area",
    setAccion: setAccionMock,
    selectedHexes: new Set(),
  });
  setAccionMock.mockReset();
  signOutMock.mockClear();
  delete (window as { location?: unknown }).location;
  (window as { location: unknown }).location = {
    href: "https://app.example.com/dashboard",
    origin: "https://app.example.com",
  };
});

describe("SideBar — Auth", () => {
  it("muestra el email del usuario desde la sesión", () => {
    renderSideBar();
    expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument();
  });

  it("muestra el botón de cerrar sesión", () => {
    renderSideBar();
    const logoutBtn = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(logoutBtn).toBeInTheDocument();
    expect(logoutBtn).toHaveAttribute("title", "Cerrar sesión");
    expect(logoutBtn).not.toHaveTextContent("X");
  });

  it("fallback si la sesión no tiene email del usuario", () => {
    useSessionMock.mockReturnValue({ data: { user: {} } });
    renderSideBar();
    expect(
      screen.getByRole("button", { name: "Cerrar sesión" }),
    ).toBeInTheDocument();
  });

  it("llama signOut y redirige a Keycloak logout al hacer click", async () => {
    renderSideBar();
    const logoutBtn = screen.getByRole("button", { name: "Cerrar sesión" });
    await fireEvent.click(logoutBtn);
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    await waitFor(() => {
      expect(window.location.href).toBe("/api/auth/kc-logout");
    });
  });
});

describe("SideBar — Navegación", () => {
  it("renderiza las 4 acciones principales del menú", () => {
    renderSideBar();
    expect(screen.getByText("Selección de área")).toBeInTheDocument();
    expect(screen.getByText("Dimensiones")).toBeInTheDocument();
    expect(screen.getByText("Características del proyecto")).toBeInTheDocument();
    expect(screen.getByText("Informe de idoneidad")).toBeInTheDocument();
  });

  it("oculta el panel de children en seleccion-area", () => {
    renderSideBar();
    expect(screen.queryByText("child")).not.toBeInTheDocument();
  });

  it("Dimensiones está deshabilitado si no hay hexágonos seleccionados", () => {
    renderSideBar();
    const dim = screen.getByText("Dimensiones").parentElement!;
    expect(dim).toHaveAttribute("aria-disabled", "true");
    expect(dim.className).toContain("cursor-not-allowed");
  });

  it("Características se habilita cuando hay hexágonos seleccionados", () => {
    // Orden del flujo: seleccion-area → Características → Dimensiones → Informe.
    // Desde selección, el paso habilitado es Características (no Dimensiones).
    useAprincipalMock.mockReturnValue({
      accion: "seleccion-area",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    renderSideBar();
    const car = screen.getByText("Características del proyecto").parentElement!;
    expect(car).toHaveAttribute("aria-disabled", "false");
    expect(car.className).toContain("cursor-pointer");
  });

  it("ya no renderiza el CTA de próximo paso dentro del SideBar (vive en el mapa)", () => {
    useAprincipalMock.mockReturnValue({
      accion: "seleccion-area",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    renderSideBar();
    expect(screen.queryByTestId("next-step-cta")).not.toBeInTheDocument();
  });

  it("click en un paso anterior navega hacia atrás (retroceso libre)", () => {
    useAprincipalMock.mockReturnValue({
      accion: "informe",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    renderSideBar();
    fireEvent.click(screen.getByText("Dimensiones").parentElement!);
    expect(setAccionMock).toHaveBeenCalledWith("dimensiones");
  });

  it("click en Características avanza si hay selección desde seleccion-area", () => {
    useAprincipalMock.mockReturnValue({
      accion: "seleccion-area",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    renderSideBar();
    fireEvent.click(screen.getByText("Características del proyecto").parentElement!);
    expect(setAccionMock).toHaveBeenCalledWith("caracteristicas");
  });

  it("muestra link de Gestión de usuarios solo si la sesión incluye rol admin", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { email: "admin@test.com" },
        idToken: "tok",
        roles: ["admin"],
      },
    });
    renderSideBar();
    expect(screen.getByText("Gestión de usuarios")).toBeInTheDocument();
  });

  it("no muestra link de Gestión de usuarios si no es admin", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { email: "user@test.com" },
        idToken: "tok",
        roles: ["analista"],
      },
    });
    renderSideBar();
    expect(screen.queryByText("Gestión de usuarios")).not.toBeInTheDocument();
  });
});
