# Performance del frontend (Playwright)

Mide en un Chromium real, **con datos reales** (sin stubs), lo que siente el usuario
en el mapa:

| Métrica | Qué significa |
|---|---|
| `canvasMs` | Tiempo hasta que el canvas del mapa es visible. |
| `mapaListoMs` | Tiempo hasta que no quedan peticiones `/api` en vuelo (mapa con datos). **NFR-P2: < 5 s.** |
| `lcpMs` | *Largest Contentful Paint*: cuándo se pintó el elemento principal. |
| `tbtMs` | *Total Blocking Time*: cuánto tiempo estuvo el hilo principal bloqueado por JavaScript. Mientras está bloqueado, la página no responde. |
| `fps` / `worstFrameMs` | Fluidez al hacer zoom o paneo; `worstFrameMs` es el congelamiento más largo. |
| `ttfbMs` (por endpoint) | Espera al servidor. Si es bajo pero la petición tarda mucho, el tiempo se fue en el navegador. |

Además lista **cada petición** a `/api` (cuántas, latencia y peso). Ese patrón es el
que replica k6 en `AppVento---Backend/perf/`, la prueba de carga del servidor.

## Cómo correr

```bash
# 1. Keycloak local + backend local con datos
docker compose -f ../infra/keycloak/docker-compose.yml up -d
(cd ../../AppVento---Backend && docker compose up -d db app)

# 2. La suite (compila el build de producción la primera vez)
INTERNAL_API_SECRET=<el del .env del backend> npm run perf:e2e
```

- Usuario: `e2e-admin` por defecto; otro con `PERF_USER` / `PERF_PASSWORD`.
- Resultados: tablas en consola y `perf-results/<fecha>_map.json` (ignorado por git).

## ⚠️ GPU

Sin GPU, Chromium dibuja WebGL **por software** (SwiftShader). Los FPS y el TBT salen
falsamente malos y el CPU que consume frena también al servidor. La config fuerza la
GPU (`--use-angle=gl`, que en WSL funciona vía WSLg) y la prueba **imprime el renderer**:
si dice `SwiftShader` o `llvmpipe`, no confíes en los números del navegador.

## Variabilidad

Una sola corrida puede variar ±30 %. Para comparar antes y después de un cambio,
repite (`npm run perf:e2e -- --repeat-each=5`) y compara medianas, siempre en la
misma máquina.
