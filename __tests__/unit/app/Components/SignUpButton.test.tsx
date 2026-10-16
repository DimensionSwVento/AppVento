import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import SignUpButton from "@/app/Components/auth/SignUpButton";

describe("SignUpButton", () => {
  it("renderiza un link con label 'Crear cuenta'", () => {
    render(<SignUpButton />);
    const link = screen.getByRole("link", { name: /crear cuenta/i });
    expect(link).toBeInTheDocument();
  });

  it("apunta a /api/auth/register (inicia el flujo de registro)", () => {
    render(<SignUpButton />);
    const link = screen.getByRole("link", { name: /crear cuenta/i });
    expect(link).toHaveAttribute("href", "/api/auth/register");
  });

  it("tiene ancho completo y estilo outline para diferenciarse de SignInButton", () => {
    render(<SignUpButton />);
    const link = screen.getByRole("link", { name: /crear cuenta/i });
    expect(link).toHaveClass("w-full");
    expect(link.className).toMatch(/border/);
  });
});
