import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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
