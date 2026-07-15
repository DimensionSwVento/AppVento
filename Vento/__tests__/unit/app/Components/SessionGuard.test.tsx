import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const signOutMock = vi.fn().mockResolvedValue(undefined);
const useSessionMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
  useSession: () => useSessionMock(),
}));

import SessionGuard from "@/app/Components/auth/SessionGuard";

beforeEach(() => {
  signOutMock.mockClear();
  useSessionMock.mockReset();
  vi.useFakeTimers();
  // Stub location.href
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { href: "" } as Location,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SessionGuard", () => {
  it("no muestra modal ni dispara sign-out cuando la sesión no tiene error", () => {
    useSessionMock.mockReturnValue({
      data: { roles: ["analista"] },
      status: "authenticated",
    });
    render(<SessionGuard>child</SessionGuard>);
    expect(signOutMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("muestra modal amigable inmediatamente cuando session.error === 'RefreshTokenError'", () => {
    useSessionMock.mockReturnValue({
      data: { error: "RefreshTokenError" },
      status: "authenticated",
    });
    render(<SessionGuard>child</SessionGuard>);
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/tu sesión ha expirado/i)).toBeInTheDocument();
    expect(signOutMock).not.toHaveBeenCalled(); // aún no, se espera 3s
  });

  it("tras 3s dispara sign-out + redirige a /?expired=true", async () => {
    useSessionMock.mockReturnValue({
      data: { error: "RefreshTokenError" },
      status: "authenticated",
    });
    render(<SessionGuard>child</SessionGuard>);
    await vi.advanceTimersByTimeAsync(3000);
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    // El redirect ocurre tras resolver signOut — dejar que el microtask corra
    await vi.runAllTicks();
    expect(globalThis.location.href).toBe("/?expired=true");
  });

  it("también reacciona a 'NoRefreshToken'", async () => {
    useSessionMock.mockReturnValue({
      data: { error: "NoRefreshToken" },
      status: "authenticated",
    });
    render(<SessionGuard>child</SessionGuard>);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(3000);
    expect(signOutMock).toHaveBeenCalled();
  });

  it("renderiza children independientemente del estado de sesión", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });
    const { container } = render(
      <SessionGuard>
        <span data-testid="child">hola</span>
      </SessionGuard>
    );
    expect(container.querySelector('[data-testid="child"]')).not.toBeNull();
  });
});
