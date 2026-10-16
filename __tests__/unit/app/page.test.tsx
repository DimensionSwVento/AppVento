import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const authMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    redirectMock(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

vi.mock("@/app/Components/auth/SignInButton", () => ({
  default: () => <button>Iniciar sesión</button>,
}));

vi.mock("@/app/Components/auth/SignUpButton", () => ({
  default: () => (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href="/api/auth/register">Crear cuenta</a>
  ),
}));

import Home from "@/app/page";

beforeEach(() => {
  authMock.mockReset();
  redirectMock.mockReset();
});

const defaultProps = {
  searchParams: Promise.resolve({} as { expired?: string; error?: string }),
};

describe("Home page (src/app/page.tsx)", () => {
  it("redirects to /dashboard when session exists", async () => {
    authMock.mockResolvedValue({ user: { name: "test" } });

    await expect(Home(defaultProps)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("does not redirect when session exists but expired param is set", async () => {
    authMock.mockResolvedValue({ user: { name: "test" } });

    const props = { searchParams: Promise.resolve({ expired: "true" }) };
    const jsx = await Home(props);
    render(jsx);

    expect(redirectMock).not.toHaveBeenCalled();
    expect(
      screen.getByText(/sesión ha expirado/i),
    ).toBeInTheDocument();
  });

  it("renders the login page when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const jsx = await Home(defaultProps);
    render(jsx);

    expect(
      screen.getByText("Plataforma de idoneidad Eólica"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/análisis geoespacial de idoneidad eólica/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it("displays the Vento logo when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const jsx = await Home(defaultProps);
    render(jsx);

    const logo = screen.getByAltText("Vento");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/vento_logo.svg");
  });

  it("shows the external auth notice", async () => {
    authMock.mockResolvedValue(null);

    const jsx = await Home(defaultProps);
    render(jsx);

    expect(
      screen.getByText(
        /autenticación es gestionada por un servicio de identidad externo/i,
      ),
    ).toBeInTheDocument();
  });

  it("muestra el boton 'Crear cuenta' apuntando a /api/auth/register (US-FB-02)", async () => {
    authMock.mockResolvedValue(null);

    const jsx = await Home(defaultProps);
    render(jsx);

    const link = screen.getByRole("link", { name: /crear cuenta/i });
    expect(link).toHaveAttribute("href", "/api/auth/register");
  });

  it("muestra mensaje de error amigable cuando el flujo de registro falla", async () => {
    authMock.mockResolvedValue(null);

    const props = {
      searchParams: Promise.resolve({ error: "register_token_exchange" }),
    };
    const jsx = await Home(props);
    render(jsx);

    expect(
      screen.getByText(/no pudimos completar el registro/i),
    ).toBeInTheDocument();
  });

  it("muestra mensaje especifico cuando el usuario cancela el registro", async () => {
    authMock.mockResolvedValue(null);

    const props = {
      searchParams: Promise.resolve({ error: "register_access_denied" }),
    };
    const jsx = await Home(props);
    render(jsx);

    expect(screen.getByText(/cancelaste el registro/i)).toBeInTheDocument();
  });
});
