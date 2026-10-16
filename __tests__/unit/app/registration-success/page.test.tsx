import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

import RegistrationSuccessPage from "@/app/registration-success/page";

describe("/registration-success page (US-FB-02 AC1, AC2)", () => {
  it("muestra el mensaje de confirmacion en espanol (AC1)", () => {
    render(<RegistrationSuccessPage />);
    expect(screen.getByText(/usuario registrado/i)).toBeInTheDocument();
    expect(
      screen.getByText(/cuenta se creó correctamente/i),
    ).toBeInTheDocument();
  });

  it("el bloque de estado tiene role=status y aria-live para accesibilidad", () => {
    render(<RegistrationSuccessPage />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("renderiza SignInButton (AC2) — click va directo al login de Keycloak, no al landing", () => {
    const { container } = render(<RegistrationSuccessPage />);
    const button = screen.getByRole("button", { name: /iniciar sesión/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "submit");
    // El botón vive dentro de un form (la server action de SignInButton)
    expect(container.querySelector("form")).toContainElement(button);
  });

  it("muestra el logo de Vento", () => {
    render(<RegistrationSuccessPage />);
    const logo = screen.getByAltText("Vento");
    expect(logo).toHaveAttribute("src", "/vento_logo.svg");
  });
});
