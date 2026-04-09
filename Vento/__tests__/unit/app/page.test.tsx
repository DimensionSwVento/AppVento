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

vi.mock("@/app/Components/SignInButton", () => ({
  default: () => <button>Iniciar sesión</button>,
}));

import Home from "@/app/page";

beforeEach(() => {
  authMock.mockReset();
  redirectMock.mockReset();
});

describe("Home page (src/app/page.tsx)", () => {
  it("redirects to /dashboard when session exists", async () => {
    authMock.mockResolvedValue({ user: { name: "test" } });

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("renders the login page when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    expect(
      screen.getByText("Plataforma de Viabilidad Eólica"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/análisis geoespacial de viabilidad eólica/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it("displays the Vento logo when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    const logo = screen.getByAltText("Vento");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "/vento_logo.png");
  });

  it("shows the external auth notice", async () => {
    authMock.mockResolvedValue(null);

    const jsx = await Home();
    render(jsx);

    expect(
      screen.getByText(
        /autenticación es gestionada por un servicio de identidad externo/i,
      ),
    ).toBeInTheDocument();
  });
});
