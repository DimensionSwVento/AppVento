import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/auth", () => ({
  signIn: vi.fn(),
}));

import SignInButton from "@/app/Components/SignInButton";

describe("SignInButton", () => {
  it("renders a form with a submit button", () => {
    render(<SignInButton />);

    const button = screen.getByRole("button", { name: /iniciar sesión/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "submit");
  });

  it("the button is inside a form element", () => {
    const { container } = render(<SignInButton />);
    const form = container.querySelector("form");
    expect(form).toBeInTheDocument();

    const button = screen.getByRole("button", { name: /iniciar sesión/i });
    expect(form).toContainElement(button);
  });

  it("the form has full width styling", () => {
    const { container } = render(<SignInButton />);
    const form = container.querySelector("form");
    expect(form).toHaveClass("w-full");
  });
});
