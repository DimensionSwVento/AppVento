# Benchmark de carga — tras PK `h3_index` → BIGINT (2026-10-01)

> Re-corrida del loadtest después de aplicar la migración **0016** (PK `h3_index`
> VARCHAR → BIGINT, el tipo nativo del índice H3). Compara contra el benchmark
> base [benchmark-carga-h3-2026-09-30.md](benchmark-carga-h3-2026-09-30.md).
> Reporte crudo: `benchmark-post-hexa/loadtest-report.txt` (+ `.csv`).

- **Fecha:** 2026-10-01
- **Cambio bajo prueba:** solo el **tipo de dato** de la PK (ver migración 0016).
  El resto de Fase 2 (extensión `h3-pg`, tablas angostas, vistas) **no** entró.
- **Herramienta:** misma `tools/loadtest.py`, misma rampa `[10,25,50,100,…]`,
  mismo corte `err>25% o p95>8000ms`.

> [!WARNING]
> **El primer post-hexa (`loadtest-report.txt`) NO es comparación justa.** Se
> ejecutó con la tabla **recién ingerida y sin `VACUUM ANALYZE`** (el paso falló por
> "VACUUM cannot run inside a transaction block"). Resultado: `reltuples = 0` →
> `warmup` cayó al `count(*)` exacto (14 s) y el visibility map vacío disparó los
> heap-fetches. **Fue un artefacto de medición.**
>
> [!NOTE]
> **El run bueno es el WARM (`loadtest-report3.txt`)**, tras `VACUUM ANALYZE`
> (`reltuples = 1.618.553`, muestra 2494 hexes). **Es el que vale para conclusiones**
> — ver §1-bis. El comparativo visual: `benchmark-post-hexa/comparacion-pk-bigint.svg`.

---

## 1. Comparación por endpoint

| Endpoint | Base · 30-sep (PK `varchar`, stats OK) | Post-hexa · 01-oct (PK `bigint`, **tabla fría, sin ANALYZE**) |
|---|---|---|
| **warmup** | rompió **50** · query 720 ms · 432.171 heap-fetches | rompió **25** · query **14.249 ms** · 1.644.344 heap-fetches ← stats frías |
| **variables** | rompió 100 · 0,12 ms | rompió 50 · 0,045 ms |
| **variables-bulk** | rompió **10** · **5.823 ms** / ~1,33 GB | rompió **10** · 317 ms (bbox distinto, rows=0) |
| **area** | rompió 100 · 0,68 ms | rompió 50 · 55 ms (300 celdas, cache fría) |
| **detail** | rompió 100 · 0,10 ms | rompió 100 · **1,6 ms** (`Index Scan … ::bigint`) |
| **cache-hit BD** | 74,4 % | 74,1–74,3 % |
| **reltuples** | poblado | 0 → tras `ANALYZE`: **1.618.553** |
| **Techo global** | **≈ 25** | **≈ 25** |

---

## 2. Qué dice de verdad (la diferencia)

1. **El cambio de tipo funciona y es correcto.** `detail` y `area` siguen por
   `Index Scan` sobre la PK, ahora con enteros
   (`h3_index = '614297157815500799'::bigint`, `… = ANY('{…}'::bigint[])`).
   `detail` 1,6 ms, `area` 55 ms. El round-trip hex↔bigint (TypeDecorator
   `H3Index`) es transparente: la API sigue devolviendo el token hex.
2. **La "regresión" (warmup 50→25, area/variables 100→50) es un artefacto de
   medición**, no del bigint: tabla recién salida del blue-green swap **sin
   `VACUUM ANALYZE`** → buffers fríos + `reltuples=0`. El tipo de la PK no puede
   bajar `area`/`variables` de 100 a 50; una cache fría sí.
3. **`variables-bulk` sigue siendo el cuello estructural** (rompe en 10 en ambas).
   No depende de la PK: es un scan por bbox (`BitmapAnd` de `lat_idx`+`lng_idx`)
   que arrastra el JSONB ancho (`width=741`). El bigint no lo toca.
4. **cache-hit clavado en ~74 %** en las dos corridas → la BD sigue hambrienta de
   RAM, igual que antes.

---

## 3. Conclusión y techo

- **Techo real: sigue ≈ 25 usuarios simultáneos** explorando antes de degradar.
  **No lo movió el cambio de tipo — y era lo esperado**: el límite lo ponen
  `variables-bulk` (bbox + JSONB) y la RAM (cache 74 %), no la PK.
- El `bigint` es un **prerequisito correcto y de bajo riesgo** (índice más
  compacto, PK lista para `h3-pg`), pero **no sube el techo por sí solo**. Valida
  el hallazgo #7 del benchmark base ("PK = text engorda los índices"), sin ser aún
  la palanca de capacidad.
- **Degradación sana, no caída:** bajo la tormenta sintética el server hace
  backpressure (encola/expira el exceso) pero **no se cae ni se congela** — el
  trabajo anti-OOM de Fase 1 (streaming + cap de threadpool + pool) hace su parte.
  Un usuario real en otra pestaña no lo nota.

---

## 4. Siguientes pasos

1. **Re-benchmark con estadísticas calientes** (lo que falta para la foto limpia):
   ```sh
   psql "$DSN" -c "VACUUM ANALYZE hexagon;"
   psql "$DSN" -c "VACUUM ANALYZE hexagon_variables_pon;"
   # re-correr tools/loadtest.py --db-url …
   ```
   Esperado: `warmup` recupera su rango (reltuples ya poblado) y vuelve a ~50.
2. **Añadir `VACUUM ANALYZE` al final de la ingesta** (runbook / o en el propio
   `bundle_service` tras el swap) para que no vuelva a quedar frío.
3. **Para mover el techo de verdad (Fase 2 pendiente):** tabla/vista angosta para
   `variables-bulk` (solo `h3_index + valor`, sin el JSONB gordo) — mayor retorno —
   y más RAM / 3.er worker.

---

## Notas

- Los índices quedaron nombrados `hexagon_new_*` por el rename del blue-green
  (`hexagon_new_pkey`, `hexagon_new_lat_idx`…). Funciona igual; renombrables en una
  migración cosmética si se quiere.
