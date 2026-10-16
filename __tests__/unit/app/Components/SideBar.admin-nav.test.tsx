import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const pathnameRef = vi.hoisted(() => ({ current: "/admin/users" }));
const routerPushMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const useSessionMock = vi.hoisted(() => vi.fn());
const useAprincipalMock = vi.hoisted(() => vi.fn());
const setAccionMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
  usePathname: () => pathnameRef.current,
}));

vi.mock("@/app/Utils/contexts/AccionPrincipalContext", () => ({
  useAprincipal: () => useAprincipalMock(),
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
  pathnameRef.current = "/admin/users";
  routerPushMock.mockReset();
  setAccionMock.mockReset();
  useSessionMock.mockReturnValue({
    data: {
      user: { email: "admin@example.com", name: "Admin Test" },
      roles: ["admin"],
    },
  });
  useAprincipalMock.mockReturnValue({
    accion: "seleccion-area",
    setAccion: setAccionMock,
    selectedHexes: new Set(),
  });
});

describe("SideBar — navegación desde /admin/*", () => {
  it("click en 'Selección de área' desde admin navega a /dashboard", () => {
    renderSideBar();
    fireEvent.click(screen.getByText("Selección de área").parentElement!);
    expect(routerPushMock).toHaveBeenCalledWith("/dashboard");
    expect(setAccionMock).toHaveBeenCalledWith("seleccion-area");
  });

  it("click en 'Dimensiones' desde admin solo navega si estaría habilitada en el flujo normal", () => {
    // Sin selección → no habilitada → no debería navegar
    renderSideBar();
    fireEvent.click(screen.getByText("Dimensiones").parentElement!);
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("click en 'Características' desde admin navega si hay selección (habilitada)", () => {
    // Orden del flujo: seleccion-area → Características → Dimensiones → Informe.
    // Desde selección, el paso habilitado es Características.
    useAprincipalMock.mockReturnValue({
      accion: "seleccion-area",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    renderSideBar();
    fireEvent.click(screen.getByText("Características del proyecto").parentElement!);
    expect(routerPushMock).toHaveBeenCalledWith("/dashboard");
    expect(setAccionMock).toHaveBeenCalledWith("caracteristicas");
  });

  it("en /admin/* no se marca 'Selección de área' con highlight activo", () => {
    renderSideBar();
    const item = screen.getByText("Selección de área").parentElement!;
    expect(item.className).not.toContain("border-l-[#cce1eeff]");
  });

  it("en /dashboard SÍ se marca 'Selección de área' con highlight activo cuando accion coincide", () => {
    pathnameRef.current = "/dashboard";
    renderSideBar();
    const item = screen.getByText("Selección de área").parentElement!;
    expect(item.className).toContain("border-l-[#cce1eeff]");
  });
});
