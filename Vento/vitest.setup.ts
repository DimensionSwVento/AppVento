import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Librerías de generación de PDF (Fase 1 PDF nativo): se importan al tope de
// Report.tsx y revientan al CARGAR el módulo bajo jsdom (svg2pdf.js/fonts.ts
// referencia jsPDF; jsPDF/html2canvas tocan Canvas/WebGL inexistentes). Nunca
// se ejercitan en unit tests (el PDF se genera por acción del usuario), así que
// se stubean globalmente para que cualquier test que importe Report colecte.
vi.mock("svg2pdf.js", () => ({ svg2pdf: vi.fn() }));
vi.mock("html2canvas-pro", () => ({
  default: vi.fn(async () => ({ toDataURL: () => "", width: 0, height: 0 })),
}));
vi.mock("jspdf", () => ({
  default: vi.fn(() => ({
    addImage: vi.fn(),
    addPage: vi.fn(),
    addSvgAsImage: vi.fn(),
    setPage: vi.fn(),
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  })),
}));

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })),
  });
}

// jsdom no implementa la Cache API (`caches`). `useCachedImage` (snapshot del
// mapa en el informe) la usa → sin este stub lanza "caches is not defined".
if (typeof globalThis.caches === "undefined") {
  const store = new Map<string, Response>();
  Object.defineProperty(globalThis, "caches", {
    writable: true,
    value: {
      open: vi.fn().mockResolvedValue({
        match: vi.fn(async (k: string) => store.get(k)),
        put: vi.fn(async (k: string, v: Response) => {
          store.set(k, v);
        }),
        delete: vi.fn(async (k: string) => store.delete(k)),
      }),
      delete: vi.fn().mockResolvedValue(true),
    },
  });
}
