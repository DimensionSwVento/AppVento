# Performance del frontend (Playwright)

> Plan completo (entornos, SLOs, CI y solicitud al encargado):
> [`docs/testing/performance-testing-plan.md`](../../docs/testing/performance-testing-plan.md).

Mide en un Chromium real, **con datos reales** (sin stubs), lo que siente el usuario
en el mapa:

| Métrica | Qué significa |
|---|---|
| `canvasMs` | Tiempo hasta que el canvas del mapa es visible. |
| `mapaListoMs` | Tiempo hasta que no quedan peticiones `/api` en vuelo (mapa con datos). **NFR-P2: < 5 s.** |
| `lcpMs` | *Largest Contentful Paint*: cuándo se pintó el elemento principal. |
| `tbtMs` | *Total Blocking Time*: cuánto tiempo estuvo el hilo principal bloqueado por JavaScript. |
| `cls` | *Cumulative Layout Shift*: saltos visuales. |
| `inpMs` | *Interaction to Next Paint*: latencia de la interacción más lenta. |
| `fps` / `worstFrameMs` | Fluidez al hacer zoom o paneo; `worstFrameMs` es el congelamiento más largo. |
| `jsKb` / `apiJsonKb` | Bytes reales de JavaScript y de JSON de API (comprimidos/decodificados según el navegador). |
| `ttfbMs` (por endpoint) | Espera al servidor. Si es bajo pero la petición tarda mucho, el tiempo se fue en el navegador. |

Además lista **cada petición** a `/api` (cuántas, latencia, peso) y los recursos
que más pesan. Ese patrón es el que replica k6 en `AppVento---Backend/perf/`,
la prueba de carga del servidor.

## Pruebas

| Test | Qué mide | Tag |
|---|---|---|
| `map.perf.ts` → abrir mapa | NFR-P2, LCP/TBT/CLS, peso de la primera carga | `@smoke` |
| `map.perf.ts` → explorar | NFR-P3, FPS/jank en zoom/paneo | `@interaction` |
| `cache.perf.ts` → primera vs segunda visita | NFR-P5/NFR-P6, caché de assets y API | `@bundle @cache` |
| `flows.perf.ts` → selección → Dimensiones → Informe | Transiciones reales del producto | `@flow` |

## Cómo correr

### Local (build de producción + datos reales)

```bash
# 1. Keycloak local + backend local con datos
docker compose -f ../infra/keycloak/docker-compose.yml up -d
(cd ../../AppVento---Backend && docker compose up -d db app)

# 2. La suite (compila el build de producción la primera vez)
INTERNAL_API_SECRET=<el del .env del backend> npm run perf:e2e
```

- Usuario: `e2e-admin` por defecto; otro con `PERF_USER` / `PERF_PASSWORD`.
- Resultados: tablas en consola y `perf-results/<run>_<test>.json` (ignorado por git).
- Resumen con medianas de varias corridas: `npm run perf:report`.

### Contra test/prod (sin compilar nada)

```bash
PERF_BASE_URL=https://<entorno> PERF_ENV=test \
PERF_USER=perf-user PERF_PASSWORD=… \
npm run perf:e2e:smoke          # solo lectura (seguro para prod)
```

- `PERF_BASE_URL` desactiva el `webServer`: se mide el servidor real.
- El login es real contra Keycloak; el setup deja `e2e/.auth/perf.json` y
  `e2e/.auth/perf.cookie`. Pasa ese JSON a k6 con `COOKIE_FILE=…`.
- Contra **producción**: solo `@smoke`/`@cache` (lectura). No corras `@flow` con
  selección/PDF sin autorización; genera carga real.
- Opcional: `PERF_CPU_THROTTLE=4` (portátil modesto) y `PERF_NETWORK=fast3g`
  para medir en condiciones peores a las de tu máquina.
- `PERF_FLOW_REPORT=0` mide el flujo hasta Dimensiones (sin abrir el informe);
  útil en máquinas modestas o para aislar la carga de capas del mapa.

### Repetir y comparar

Una sola corrida puede variar ±30 %. Para comparar antes y después de un cambio:

```bash
npx playwright test --config playwright.perf.config.ts --repeat-each=5
npm run perf:report -- --last 5
```

Siempre en la **misma máquina, mismo entorno y mismos datos**. No mezcles local
con test/prod.

## ⚠️ GPU

Sin GPU, Chromium dibuja WebGL **por software** (SwiftShader). Los FPS y el TBT
salen falsamente malos y el CPU que consume frena también al servidor. La config
fuerza la GPU (`--use-angle=gl`, que en WSL funciona vía WSLg) y la prueba
**imprime el renderer**: si dice `SwiftShader` o `llvmpipe`, no confíes en los
números del navegador.

## Qué NO cubre todavía

- **NFR-P1** (render de ~30 000 hexágonos sin lag): hace falta un escenario de
  selección grande + paneo sostenido; pendiente de definir el presupuesto.
- **PDF completo** (< 30 s): la generación con jsPDF/html2canvas se mide aparte,
  con un test `@pdf` opt-in, para no contaminar la carga inicial.
- **NFR-P4** (TTI tras login): el login real está, pero falta aislar la
  redirección Keycloak → mapa con un presupuesto propio.
