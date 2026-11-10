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

// AppProvider monta <FlowDraftSync /> (autoguardado de borrador), que consume
// useAprincipal/useVariables/useCaracteristicas. Este test solo verifica el
// anidado de providers, así que se stubea para no arrastrar esos contextos.
vi.mock("@/app/Utils/draft/FlowDraftSync", () => ({ default: () => null }));

import AppProvider from "@/app/AppProvider";

describe("AppProvider", () => {
  it("renders children within SessionProvider and AprincipalProvider", () => {
    render(
      <AppProvider>
        <span data-testid="child">Hello</span>
      </AppProvider>,
    );

    expect(screen.getByTestId("session-provider")).toBeInTheDocument();
    expect(screen.getByTestId("aprincipal-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("nests AprincipalProvider inside SessionProvider", () => {
    render(
      <AppProvider>
        <span>nested</span>
      </AppProvider>,
    );

    const sessionProvider = screen.getByTestId("session-provider");
    const aprincipalProvider = screen.getByTestId("aprincipal-provider");

    expect(sessionProvider).toContainElement(aprincipalProvider);
  });
});
