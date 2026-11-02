import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";

import VariableTooltip from "@/app/Components/dimensions/VariableTooltip";
import SelectedVariablesChips from "@/app/Components/dimensions/SelectedVariablesChips";
import Report from "@/app/Components/report/Report";
import { VariablesProvider } from "@/app/Utils/contexts/VariablesContext";
import { AprincipalProvider } from "@/app/Utils/contexts/AccionPrincipalContext";
import { EconomicProvider } from "@/app/Utils/contexts/EconomicContext";
import { RegulatoryProvider } from "@/app/Utils/contexts/RegulatoryContext";
import { HistorialProvider } from "@/app/Utils/historial/HistorialContext";
import { ToastProvider } from "@/app/Components/ui/Toast";
import {
  OPTIONAL_VARIABLES,
  VARIABLES,
  type Variable,
} from "@/app/Utils/variables/variablesCatalog";
import { REPORT_SOURCE_LINKS } from "@/app/Utils/report/reportSources";

// Geoethics — data origin and licence: wherever the product claims to tell the
// user where a variable comes from (variable tooltip, variable detail "Fuente de
// datos" tab, report "Fuentes de datos" sheet) it must show the declared source,
// its link and, when declared, its licence — and never invent one.

vi.mock("html2canvas-pro", () => ({ default: vi.fn() }));
vi.mock("jspdf", () => ({ default: vi.fn() }));
vi.mock("svg2pdf.js", () => ({ svg2pdf: vi.fn(() => Promise.resolve()) }));
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

const CATALOG: Variable[] = [...VARIABLES, ...OPTIONAL_VARIABLES];
const declaresSource = (v: Variable) => !!v.fuente && v.fuente !== "(sin definir)";

describe("Data origin metadata is well-formed", () => {
  it("every declared source link in the catalog is an absolute http(s) URL", () => {
    const bad = CATALOG.filter((v) => v.url).filter((v) => {
      try {
        const u = new URL(v.url!);
        return !(u.protocol === "http:" || u.protocol === "https:") || !u.hostname.includes(".");
      } catch {
        return true;
      }
    });
    expect(bad.map((v) => [v.id, v.url])).toEqual([]);
  });

  it("a link is never declared without the source it belongs to", () => {
    const orphan = CATALOG.filter((v) => v.url && !declaresSource(v)).map((v) => v.id);
    expect(orphan).toEqual([]);
  });

  it("every curated report source has a name, a version and a valid link", () => {
    expect(REPORT_SOURCE_LINKS.length).toBeGreaterThan(0);
    for (const s of REPORT_SOURCE_LINKS) {
      expect(s.fuente.trim()).not.toBe("");
      expect(s.version.trim()).not.toBe("");
      expect(() => new URL(s.url)).not.toThrow();
      expect(["http:", "https:"]).toContain(new URL(s.url).protocol);
    }
  });
});

describe("Variable tooltip shows the origin of every variable that declares one", () => {
  const withSource = CATALOG.filter(declaresSource);

  it("the catalog declares sources for most variables (fixture sanity)", () => {
    expect(withSource.length).toBeGreaterThan(CATALOG.length / 2);
  });

  it("for each variable with a declared source the tooltip shows it, linked when a URL is declared", () => {
    const failures: string[] = [];
    for (const v of withSource) {
      render(<VariableTooltip variable={v} />);
      fireEvent.click(screen.getByRole("button", { name: `Información sobre ${v.label}` }));
      const tip = screen.getByRole("tooltip");
      if (!tip.textContent?.includes(`Fuente: ${v.fuente}`)) failures.push(`${v.id}: source text`);
      if (v.url) {
        const a = within(tip).queryByRole("link", { name: v.fuente });
        if (a?.getAttribute("href") !== v.url) failures.push(`${v.id}: link`);
        if (a?.getAttribute("target") !== "_blank") failures.push(`${v.id}: target`);
      }
      cleanup();
    }
    expect(failures).toEqual([]);
  });

  it("a variable without a declared source shows no source line (nothing invented)", () => {
    for (const fuente of [undefined, "(sin definir)"]) {
      const v: Variable = { ...CATALOG[0], id: "sin-fuente", label: "Sin fuente", fuente, url: undefined };
      render(<VariableTooltip variable={v} />);
      fireEvent.click(screen.getByRole("button", { name: "Información sobre Sin fuente" }));
      expect(screen.getByRole("tooltip")).not.toHaveTextContent(/Fuente:/);
      cleanup();
    }
  });
});

describe("Variable detail — 'Fuente de datos' tab: source, link and licence", () => {
  function openSourceTab(label: string) {
    render(
      <VariablesProvider>
        <SelectedVariablesChips />
      </VariablesProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: `Ver detalle de ${label}` }));
    fireEvent.click(screen.getByRole("button", { name: "Fuente de datos" }));
  }

  it("shows source, licence and an external link for a variable that declares all three", () => {
    const v = VARIABLES.find((x) => x.licencia && x.url && declaresSource(x))!;
    expect(v).toBeDefined();
    openSourceTab(v.label);
    expect(screen.getByText(v.fuente!)).toBeInTheDocument();
    expect(screen.getByText(/Licencia:/).parentElement).toHaveTextContent(`Licencia: ${v.licencia}`);
    const link = screen.getByRole("link", { name: /Ver fuente/ });
    expect(link).toHaveAttribute("href", v.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    if (v.masterId !== "NA") expect(screen.getAllByText(v.masterId).length).toBeGreaterThan(0);
  });

  it("does not show a licence that the source did not declare", () => {
    const v = VARIABLES.find((x) => !x.licencia && declaresSource(x))!;
    expect(v).toBeDefined();
    openSourceTab(v.label);
    expect(screen.getByText(v.fuente!)).toBeInTheDocument();
    expect(screen.queryByText(/Licencia:/)).toBeNull();
  });
});

describe("Report — 'Fuentes de datos' sheet", () => {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ToastProvider>
        <HistorialProvider>
          <VariablesProvider>
            <EconomicProvider>
              <RegulatoryProvider>
                <AprincipalProvider>{children}</AprincipalProvider>
              </RegulatoryProvider>
            </EconomicProvider>
          </VariablesProvider>
        </HistorialProvider>
      </ToastProvider>
    );
  }

  beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("lists every data source with its version and a link to it", { timeout: 20_000 }, async () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Previsualizar/i }));
    const heading = (await screen.findAllByRole("heading", { name: /Fuentes de datos$/ }))[0];
    const table = heading.parentElement!.querySelector("table")!;
    expect(table).not.toBeNull();
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(REPORT_SOURCE_LINKS.length);
    for (const s of REPORT_SOURCE_LINKS) {
      const row = rows.find((r) => within(r).queryByText(s.fuente))!;
      expect(row).toBeDefined();
      expect(row).toHaveTextContent(s.version);
      expect(within(row).getByRole("link")).toHaveAttribute("href", s.url);
    }
  });

  it("states the sources consulted for each dimension, taken from the variables' declared sources", { timeout: 20_000 }, async () => {
    render(
      <Wrapper>
        <Report />
      </Wrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Previsualizar/i }));
    const h4 = await screen.findByText(/Fuentes por dimensión/i);
    const table = h4.parentElement!.querySelector("table")!;
    const ambientalRow = within(table)
      .getAllByRole("row")
      .find((r) => /Ambiental/.test(r.textContent ?? ""))!;
    expect(ambientalRow).toBeDefined();
    const declared = new Set(
      VARIABLES.filter((v) => v.dimension === "ambiental" && declaresSource(v)).map((v) => v.fuente!.trim()),
    );
    // At least one declared source of the dimension appears, and nothing appears
    // that no ambiental variable declared.
    const shown = (ambientalRow.querySelectorAll("td")[1]?.textContent ?? "").split(", ").map((s) => s.trim());
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.every((f) => f.length > 0)).toBe(true);
    for (const f of shown) {
      expect([...declared].some((d) => d.toLowerCase() === f.toLowerCase() || d.includes(f) || f.includes(d))).toBe(true);
    }
  });
});
