import type { Page } from "@playwright/test";

/**
 * Stubs de red para e2e:
 * - El basemap de Carto es una dependencia externa → lo reemplazamos por un
 *   estilo MapLibre mínimo para que el mapa monte sin red externa (CI hermético).
 * - El backend FastAPI no vive en este repo → cualquier llamada a /api/tiles/*
 *   se responde con fixtures (mismo contrato TileHex que HeatmapDemo).
 */

const EMPTY_STYLE = {
  version: 8,
  name: "e2e-empty",
  sources: {},
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#dfe8ee" } },
  ],
};

export async function stubBasemap(page: Page): Promise<void> {
  await page.route("**basemaps.cartocdn.com/**", (route) => {
    if (route.request().url().endsWith("style.json")) {
      return route.fulfill({ json: EMPTY_STYLE });
    }
    return route.fulfill({ status: 204, body: "" });
  });
}

export async function stubTilesApi(page: Page): Promise<void> {
  await page.route("**/api/tiles/warmup", (route) =>
    route.fulfill({ json: { status: "ready" } }),
  );
  await page.route("**/api/tiles/counts*", (route) =>
    route.fulfill({ json: { total: 120, selected: 0, aboveThreshold: 80 } }),
  );
  await page.route("**/api/tiles/variables", (route) =>
    route.fulfill({
      json: {
        variables: [
          { name: "001_velocidad_de_viento", label: "Velocidad de Viento", range: { min: 0, max: 12 } },
        ],
      },
    }),
  );
  await page.route("**/api/tiles/detail/**", (route) =>
    route.fulfill({
      json: {
        h3_index: "85447e63fffffff",
        score_general: 0.72,
        tipo_celda: "continental",
        variables: { "001_velocidad_de_viento/mean": 7.5 },
      },
    }),
  );
}
