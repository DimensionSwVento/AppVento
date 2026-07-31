import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signOut: vi.fn(),
}));

vi.mock("@/app/Utils/contexts/AccionPrincipalContext", () => ({
  AprincipalProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="aprincipal-provider">{children}</div>
  ),
}));

import Providers from "@/app/Providers";

describe("Providers", () => {
  it("renders children within SessionProvider and AprincipalProvider", () => {
    render(
      <Providers>
        <span data-testid="child">Hello</span>
      </Providers>,
    );

    expect(screen.getByTestId("session-provider")).toBeInTheDocument();
    expect(screen.getByTestId("aprincipal-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("nests AprincipalProvider inside SessionProvider", () => {
    render(
      <Providers>
        <span>nested</span>
      </Providers>,
    );

    const sessionProvider = screen.getByTestId("session-provider");
    const aprincipalProvider = screen.getByTestId("aprincipal-provider");

    expect(sessionProvider).toContainElement(aprincipalProvider);
  });
});
