import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AprincipalProvider } from "../Utils/AccionPrincipalContext";

// Auth + nav mocks (SideBar usa useSession, usePathname, Link)
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { email: "test@test.com", name: "Test" } } }),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => <a {...props}>{children}</a>,
}));

// Map: DeckGL + MapLibre no funcionan en jsdom, mock mínimo
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
  TextLayer: vi.fn(function (this: object, props: object) {
    Object.assign(this, props);
  }),
}));
vi.mock("@luma.gl/core", () => ({ luma: { registerAdapters: vi.fn() } }));
vi.mock("@luma.gl/webgl", () => ({ webgl2Adapter: {} }));

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renderiza el SideBar y el Mapa", () => {
    render(
      <AprincipalProvider>
        <DashboardPage />
      </AprincipalProvider>
    );
    // SideBar — item del menú
    expect(screen.getByText("Selección de área")).toBeInTheDocument();
    // Mapa
    expect(screen.getByTestId("deckgl")).toBeInTheDocument();
  });

  it("no muestra contenido de subpáginas cuando está en seleccion-area", () => {
    render(
      <AprincipalProvider>
        <DashboardPage />
      </AprincipalProvider>
    );
    // textos exclusivos del contenido de los paneles
    expect(screen.queryByText(/Configura las variables/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Puntuación general/i)).not.toBeInTheDocument();
  });
});
