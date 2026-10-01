# Vento — Sprint 4: resumen consolidado de cambios

> Para el PR / deploy. Front en rama `Sprint_4--report_preconig`, backend en
> `develop` (prod = `main`). Fecha: 2026-10-01.

## Totales
- **Frontend:** ~40 commits · **Backend:** ~15 · **Docs/arquitectura:** ~5
- Cobertura: preconfiguración de informe, mapa/capas, admin/usuarios, rendimiento
  de backend (anti-OOM + capacidad), feedback del cliente (26 ítems) y manuales.

---

## 1. Informe / PDF (preconfiguración + fixes)
| Commit | Cambio |
|--------|--------|
| `1d0e032` | informe: valores reales en lista/tabla + historial restaurado |
| `b54ccd0` | #17 Regulatoria/Económica fuera del tooltip |
| `c09855c` | #8 líneas del radar con contraste |
| `ab79ae5` | #9 flechas "más influyen" SVG + #4 fuente heredada |
| `fd1db05` | #5 PDF más nítido (menos borroso) |
| `517d5ad` | #3 tablas del PDF no se cortan (chunks) |
| `764b2fe` | #3 intervalos de ponderación chunkeados |
| `f4f7038` | #3 normas y fuentes chunkeadas |
| `947cc26` | #18 aviso antes de exportar datos por hexágono |
| `ca122d3`… | PDF nativo (fases 1–4: charts vector, texto buscable, índice) |

## 2. Mapa / capas / heatmap
| Commit | Cambio |
|--------|--------|
| `4ad3574`·`2ddd379` | #1 heatmap+tooltip no se despintan/vacían al alejar el zoom |
| `5c38b40` | #14 excluidas no entran en la selección (historial) |
| `32df657` | #7 Regulatoria/Económica fuera del selector de heatmap |
| `356dbe2` | #11 punto de capa con color de la variable + #6 quitar blink |
| `537bb71` | #16 iconos de capa siempre con borde de color |
| `5a9899e` | #19 pill "cargando mapa" ya no se queda pegado |
| `4d9ca59` | #19b leyenda viridis (solo valores + muesca + en dimensiones) |
| `a491552` | #2 leyenda viridis de dimensiones reposicionada |
| `e958392` | #6 toggle de calor dispara el pill "cargando mapa" |
| `c14b927` | #7 capas de variable apagadas por default en dimensiones |
| `fc10035` | #24 no re-pedir variables-bulk al ocultar + AbortController |
| `3b1224f` | #23 aviso de reconexión ámbar/compacto (no franja roja) |

## 3. Admin / usuarios / soporte
| Commit | Cambio |
|--------|--------|
| `5e09b37` | modal admin de tamaño fijo con scroll |
| `a63a00f` | FB-FIX-07 borrar informe con modal propio (no window.confirm) |
| `7d703af` | #1 ConfirmDialog por portal (no se recorta) |
| `78a7fd2` | #5 lista de usuarios con barra de carga |
| `0f11313` | #22 carga de admin dentro del panel + #20 historial desde admin |
| `c7bca3e`·`03d3ab7` | #25 soporte: modal con correo de BD + editor admin |
| (ya hechos) | FB-FIX-14 (sin tildes), FB-FIX-16 (confirmar admin), FB-FIX-18 (desactivar directo) |

## 4. Rendimiento backend (anti-OOM + capacidad)
| Commit | Cambio |
|--------|--------|
| `ee2ab6e` | pool explícito + cap de threadpool (agota QueuePool bajo ráfaga) |
| `5f9fc24` | capa de excluidos en UNA petición (mata get_tile por-tile) |
| `fe59ca4` | `variables-bulk`: varias variables en UNA pasada del bbox |
| `aa83bb1` | traza de peticiones para diagnosticar saturación |
| `7503f06`…`58b8839` | `tools/loadtest.py` (por endpoint, EXPLAIN + salud BD) |
| `061e446` | warmup con conteo estimado (`reltuples`) + caché de excluidos |
| `622734b` | migración `0015` índice parcial `ix_hexagon_excluded` |
| `e9878df` | `GET /api/admin/db/overview` (verificación de ingesta) |
| `c73dc23` | README backend: límites por endpoint/GB |

## 5. Datos / catálogo / modo
| Commit | Cambio |
|--------|--------|
| `94ec5ea`·`db55520` | catálogo real desde BD; valores informativos reales (no template) |
| `1835c7e`·`81d60bb` | modo sin mixtura (backend \| template) + log de arranque |
| `02fdfec`·`2061c6e` | subir master por drag-and-drop (una sola feature por fases) |
| `04473da` | mini-mapa del informe con score real del backend |
| `5798413` | lint: DimensionCard import sin usar |

## 6. Docs / arquitectura
| Commit | Cambio |
|--------|--------|
| `7de3c22` | benchmark de carga + arquitectura DB espacial h3 + documento técnico |
| `55c838d` | README front: capacidad por endpoint/GB |
| (nuevos) | `manual-tecnico.md`, `manual-instalacion.md`, este resumen |

---

## Resultados de capacidad (benchmark)
- Techo útil ≈ **25 usuarios concurrentes** (2 workers × 18 hilos = 36 ops BD).
- `variables-bulk` = cuello #1 (scan de bbox, ~165 MB/req); `warmup` (count) y
  `excluded` (scan sin índice) resueltos con estimado/índice/caché.
- cache-hit BD 74 % → plan **Fase 2 h3-pg** documentado.

## Despliegue
1. `git push` de las ramas · merge a prod (front `deploy-prod`, backend `main`).
2. `alembic upgrade head` (migración 0015) + `VACUUM ANALYZE hexagon`.
3. Build del front · verificar con `tools/loadtest.py --db-url`.
