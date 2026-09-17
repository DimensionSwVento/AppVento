---
version: 1.0 (DISEÑO canónico)
date: 2026-09-15
scope: Motor de ingesta schema-agnóstico por CLASES + conciliación humana de columnas desconocidas
status: diseño confirmado con el usuario; pendiente implementar en backend
relacionado: ingesta-bundle-modelo.md (estructura del bundle), master-real-schema.md
---

# Ingesta por CLASES + conciliación

> Principio (confirmado 2026-09-15): la ingesta **nunca adivina** ni hardcodea
> columnas. Lee la **cabecera** de cada parquet (como `inspect_parquets.py`),
> **clasifica** contra un registro, para lo **desconocido** pide **conciliación**
> al admin mostrándole **qué hará, cómo quedará y dónde**, y **solo cuando todo
> está resuelto, continúa** e ingiere. Sirve para cualquier parquet (onshore,
> offshore, v2) sin tocar código.

## 1. Flujo de ingesta (plan → conciliar → aplicar)

```
FASE A — INSPECCIONAR + CLASIFICAR (barato, solo esquema, sin datos)
  1. Lee la cabecera de cada .parquet del bundle (columnas + tipos).
  2. Por cada columna: busca en el REGISTRO (por name, luego por base_code).
  3. Arma un PLAN:
       - conocidas   → (columna → clase → destino en hexagon)
       - desconocidas→ PENDIENTES de conciliación

FASE B — AVISO + CONCILIACIÓN (compuerta humana)
  4. Muestra al admin el PLAN completo: qué hará con cada columna, cómo quedará
     y DÓNDE aterriza (mapa/score/informe/...). Marca las pendientes en rojo.
  5. El admin resuelve cada pendiente (ver §4). Puede: variable nueva / campo de
     una existente / bandera / clase nueva / ignorar, + dónde se usa.

FASE C — APLICAR (solo con todo resuelto)
  6. Con 0 pendientes (o pendientes explícitamente "ignorar"), ingiere de verdad:
     enruta cada columna a su destino. Registra el resultado en `data_source`.
```
La FASE A no lee valores (seguro con datos confidenciales). La FASE C es la única
que toca datos, y solo tras aprobación.

## 2. Clases (paleta inicial, EXTENSIBLE)
No es un molde cerrado: la conciliación puede crear clases/campos nuevos.

| Clase | Comportamiento | Destino en `hexagon` |
|---|---|---|
| `clave` | join key | `h3_index` (PK) |
| `variable_modelo` | **puntúa** (está en `variables_pon`) | valor en `hexagon.variables` (JSONB) + `catalog_variable` |
| `variable_informativa` | no puntúa; se muestra | `hexagon.variables` + `catalog_variable` (informativa) |
| `alerta` | marca −2, **no bloquea** el score | flag por hex (badge en mapa) |
| `excluyente` | **oculta** el hex | `hexagon.tipo_celda="excluida"` |
| `criterio` | score de criterio | `hexagon.scores{criterio}` |
| `subcriterio` | score de subcriterio | `hexagon.scores{subcriterio}` |
| `global` | índice general | `hexagon.score_general` |
| `bandera` | control agregado | flag por hex |
| `campo` | atributo de OTRA entidad (no valor-por-hex) | columna/meta sobre esa entidad |
| `ignorar` | no se consume | — |
| `<nueva>` | definida en conciliación | según se defina |

## 3. Registro de columnas (`parquet_column`)
Fuente de verdad del mapeo. Solo contiene lo que un humano **ya confirmó**.

```
name        TEXT PK    -- "AMB_005", "TEC_001_alert", "recurso_eolico", "AMB_005_revisada"
base_code   TEXT       -- "AMB_005" (para auto-match de variantes con sufijo)
kind        TEXT       -- clase (§2) o una nueva
target_ref  TEXT       -- si kind=campo/bandera: entidad a la que se adjunta; si variable: su id de catálogo
usos        TEXT[]     -- {mapa, heatmap, score, informe, detalle, ninguno}
tipo_dato   TEXT       -- double|string|int|bool
estado      TEXT       -- ok | pendiente | ignorada
nota        TEXT
```

## 4. Conciliación de una columna desconocida
El admin elige, y **especifica dónde se usa**:
1. **Variable nueva** → elige clase (`variable_modelo`/`informativa`/`alerta`/`excluyente`) + nombre/descr.
2. **Campo de una variable existente** → `kind=campo`, `target_ref=<variable>` (ej. `AMB_005_revisada` → campo "revisada" de `AMB_005`). No es score.
3. **Bandera** → `kind=bandera` (global o `target_ref=<variable>`).
4. **Clase nueva** → define un `kind` que no existía + su comportamiento/destino.
5. **Ignorar** → `estado=ignorada` (no se consume; queda registrado).

La regla de auto-match solo **propone** (por `name`/`base_code`); **no confirma sola**.

## 5. Regla de clasificación (contra el registro, en orden)
```
1. name/base_code en el registro (estado=ok)   → usa su kind+destino
2. no está en el registro                       → PENDIENTE (no adivinar)
```
Nada se clasifica solo. La "regla del modelo" (si está en `variables_pon` → puntúa)
es solo una **sugerencia** que la conciliación muestra al humano, no un automatismo.

## 6. Seed inicial del registro — las 61 columnas ya confirmadas (onshore)
Se cargan como `estado=ok` para que la primera ingesta onshore no pregunte por ellas:

- **clave (1):** `h3_index`
- **variable_modelo (46):** las de `variables_pon.h3.parquet`
- **alerta (8):** `AMB_010`, `AMB_011`, `AMB_013`, `AMB_015`, `AMB_016`, `TEC_032_t`, `SOC_030_sr`, `TEC_001_alert` (viento < 5 m/s @100 m = `TEC_001_sv003 < 5`)
- **variable_informativa (4):** `AMB_001`, `AMB_004`, `TEC_024_t`, `SOC_025_sr` (regla: no entra al modelo → informativa)
- **bandera (2):** `excluido` (oculta), `alerta` (marca agregada)
- **scores:** los 6 `criterios/*`, `global`, y los 15 `subcriterios/*`

Cualquier columna FUERA de estas → FASE B (conciliación).

## 7. Reporte por ingesta (`data_source.notes`)
Cada corrida guarda: columnas reconocidas / auto-propuestas por base_code /
pendientes / ignoradas + filas. Sin silencios: si algo se saltó, se ve.
