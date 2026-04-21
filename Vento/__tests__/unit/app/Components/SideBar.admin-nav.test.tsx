import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AprincipalProvider } from "@/app/Utils/AccionPrincipalContext";

const {
  pathnameRef,
  routerPushMock,
  signOutMock,
  useSessionMock,
  useAprincipalMock,
  setAccionMock,
} = vi.hoisted(() => ({
  pathnameRef: { current: "/admin/users" },
  routerPushMock: vi.fn(),
  signOutMock: vi.fn().mockResolvedValue(undefined),
  useSessionMock: vi.fn(),
  useAprincipalMock: vi.fn(),
  setAccionMock: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
  usePathname: () => pathnameRef.current,
}));

vi.mock("@/app/Utils/AccionPrincipalContext", () => ({
  useAprincipal: () => useAprincipalMock(),
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

  it("click en 'Dimensiones' desde admin navega si hay selección (habilitada)", () => {
    useAprincipalMock.mockReturnValue({
      accion: "seleccion-area",
      setAccion: setAccionMock,
      selectedHexes: new Set(["8a2a1072b59ffff"]),
    });
    renderSideBar();
    fireEvent.click(screen.getByText("Dimensiones").parentElement!);
    expect(routerPushMock).toHaveBeenCalledWith("/dashboard");
    expect(setAccionMock).toHaveBeenCalledWith("dimensiones");
  });

  it("en /admin/* no se marca 'Selección de área' con highlight (bg-gray-400)", () => {
    renderSideBar();
    const item = screen.getByText("Selección de área").parentElement!;
    expect(item.className).not.toContain("bg-gray-400");
  });

  it("en /dashboard SÍ se marca 'Selección de área' con highlight cuando accion coincide", () => {
    pathnameRef.current = "/dashboard";
    renderSideBar();
    const item = screen.getByText("Selección de área").parentElement!;
    expect(item.className).toContain("bg-gray-400");
  });
});
