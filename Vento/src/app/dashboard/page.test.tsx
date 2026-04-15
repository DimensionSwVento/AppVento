import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AprincipalProvider } from "../Utils/AccionPrincipalContext";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: { email: "user@example.com", name: "test" },
      roles: [],
    },
    status: "authenticated",
  }),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mismos mocks que Map.test
vi.mock("@deck.gl/react", () => ({
  DeckGL: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="deckgl">{children}</div>
  ),
}));
vi.mock("react-map-gl/maplibre", () => ({
  Map: () => <div data-testid="maplibre" />,
}));
vi.mock("@deck.gl/geo-layers", () => ({
  TileLayer: vi.fn(function (this: object, props: object) {
    Object.assign(this, props);
  }),
}));
vi.mock("@deck.gl/layers", () => ({
  PolygonLayer: vi.fn(function (this: object, props: object) {
    Object.assign(this, props);
  }),
}));
vi.mock("@luma.gl/core", () => ({ luma: { registerAdapters: vi.fn() } }));
vi.mock("@luma.gl/webgl", () => ({ webgl2Adapter: {} }));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renderiza el SideBar y el Mapa juntos", () => {
    render(
      <AprincipalProvider>
        <DashboardPage />
      </AprincipalProvider>
    );
    // SideBar
    expect(screen.getByText("Selección de área")).toBeInTheDocument();
    // Mapa
    expect(screen.getByTestId("deckgl")).toBeInTheDocument();
  });

  it("en seleccion-area no muestra paneles de Dimensiones ni Informe", () => {
    render(
      <AprincipalProvider>
        <DashboardPage />
      </AprincipalProvider>
    );
    // textos exclusivos del contenido de los paneles (no del menú lateral)
    expect(screen.queryByText(/Configura las variables/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Puntuación general/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Potencial energético/i)).not.toBeInTheDocument();
  });
});
