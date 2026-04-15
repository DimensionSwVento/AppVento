import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AprincipalProvider } from "@/app/Utils/AccionPrincipalContext";

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

vi.mock("@/app/Utils/AccionPrincipalContext", () => ({
  useAprincipal: () => useAprincipalMock(),
}));

vi.mock("@/app/Utils/keycloakLogout", () => ({
  keycloakLogoutUrl: vi.fn(
    (idToken: string | undefined, origin: string) =>
      `https://kc.example.com/logout?id_token_hint=${idToken}&post_logout_redirect_uri=${encodeURIComponent(origin)}`,
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
  delete (window as { location?: unknown }).location;
  (window as { location: unknown }).location = {
    href: "",
    origin: "https://app.example.com",
  };
});

describe("SideBar — Auth", () => {
  it("muestra el email del usuario desde la sesión", () => {
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument();
  });

  it("muestra el botón de cerrar sesión", () => {
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    const logoutBtn = screen.getByTitle("Cerrar sesión");
    expect(logoutBtn).toBeInTheDocument();
  });

  it("fallback si la sesión no tiene email del usuario", () => {
    useSessionMock.mockReturnValue({ data: { user: {} } });
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    expect(screen.getByTitle("Cerrar sesión")).toBeInTheDocument();
  });

  it("llama signOut y redirige a Keycloak logout al hacer click", async () => {
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    const logoutBtn = screen.getByTitle("Cerrar sesión");
    await fireEvent.click(logoutBtn);
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
  });
});

describe("SideBar — Navegación", () => {
  it("renderiza las 4 acciones principales del menú", () => {
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    expect(screen.getByText("Selección de área")).toBeInTheDocument();
    expect(screen.getByText("Dimensiones")).toBeInTheDocument();
    expect(screen.getByText("Características del proyecto")).toBeInTheDocument();
    expect(screen.getByText("Informe de viabilidad")).toBeInTheDocument();
  });

  it("Dimensiones está deshabilitado si no hay hexágonos seleccionados", () => {
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    const dim = screen.getByText("Dimensiones").parentElement!;
    expect(dim.className).toContain("opacity-40");
  });

  it("Dimensiones se habilita cuando hay hexágonos seleccionados", () => {
    useAprincipalMock.mockReturnValue({
      accion: "seleccion-area",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    const dim = screen.getByText("Dimensiones").parentElement!;
    expect(dim.className).toContain("cursor-pointer");
    expect(dim.className).not.toContain("opacity-40");
  });

  it("click en un paso anterior navega hacia atrás (retroceso libre)", () => {
    useAprincipalMock.mockReturnValue({
      accion: "informe",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    fireEvent.click(screen.getByText("Dimensiones").parentElement!);
    expect(setAccionMock).toHaveBeenCalledWith("dimensiones");
  });

  it("click en Dimensiones avanza si hay selección desde seleccion-area", () => {
    useAprincipalMock.mockReturnValue({
      accion: "seleccion-area",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    fireEvent.click(screen.getByText("Dimensiones").parentElement!);
    expect(setAccionMock).toHaveBeenCalledWith("dimensiones");
  });

  it("muestra link de Gestión de usuarios solo si la sesión incluye rol admin", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: { email: "admin@test.com" },
        idToken: "tok",
        roles: ["admin"],
      },
    });
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
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
    render(
      <SideBar>
        <span>child</span>
      </SideBar>,
    );
    expect(screen.queryByText("Gestión de usuarios")).not.toBeInTheDocument();
  });
});
