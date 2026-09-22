---
proyecto: Vento — idoneidad eólica (SIG/MCDM)
doc: Modelo de datos ANIDADO — grupos, clases, relaciones y usos
fecha: 2026-09-22
jerarquia_de_verdad:
  - "1. FUENTE DE VERDAD del CATÁLOGO: InfoVariables(2) a/b/c.csv (cliente) — nombres, dimensión, criterio/subcriterio, emplazamiento, ¿mapa?, fuente, licencia, URL, informativa/opcional"
  - "2. FUENTE DE VERDAD de la ESTRUCTURA de datos: los inspects que pasó el usuario en el chat — inspect_parquets (bundle onshore) + inspect_bundle (económico macro, xlsx)"
  - "3. NO es fuente de verdad: backend/AppVento---Backend está DESACTUALIZADO. Se usa solo para ver 'qué existe hoy' y qué hay que cambiar para alinearlo a (1) y (2)"
  - "4. VERSIÓN VIEJA (solo comparar cambios de código, NO actualizar según ella): InfoVariables1/2/3.csv — ver §11"
estado: en construcción — los 4 grupos que afirmó el usuario son ALGUNOS, no los únicos ni definitivos
alcance_actual: SOLO ONSHORE — el bundle offshore aún no se entrega (llega después, mismo layout)
---

# Modelo de datos de Vento — anidado por grupos, con clases y usos

> **⚠️ Jerarquía de fuentes de verdad (leer primero).**
> 1. **`InfoVariables(2) a/b/c`** = verdad del **catálogo/metadatos** (qué es cada
>    variable, dimensión, emplazamiento, mapa, fuente, licencia, URL).
> 2. **Los inspects que pasó el usuario en el chat** (`inspect_parquets` onshore +
>    `inspect_bundle` económico/xlsx) = verdad de la **estructura de datos** (qué
>    columnas/tablas existen de verdad).
> 3. **El backend NO es fuente de verdad — está desactualizado.** Sus seeds
>    (`variables_seed.json`, `variable_catalog.py`) y clasificaciones reflejan un
>    estado viejo; aquí se citan solo para ver **qué hay que cambiar** (ver §10).

> **Cómo leer este doc.** El dato del modelo viene en un **bundle de parquets**
> jerárquico. La jerarquía **es** cómo se organiza la BD. Cada columna tiene una
> **clase** (qué es) que decide **dónde aterriza** en `hexagon` y **para qué se
> usa** (mapa / score / informe / detalle). El **catálogo** (`InfoVariables`) le
> pone nombre, dimensión, fuente, emplazamiento y bandera de mapa a cada código.
>
> ⚠️ Los grupos "criterios / subcriterios / variables / variables ponderadas"
> son la **espina dorsal**, pero **no son los únicos**: hay además alertas,
> excluyentes, banderas, características de proyecto, la económica-macro y la
> regulatoria (ver §6).

---

## 0. La jerarquía anidada (de arriba hacia abajo)

```
GLOBAL  (score_general por hex)                         ← criterios/global.h3.parquet
  └── CRITERIOS  (6 scores por hex)                     ← criterios/*.h3.parquet
        └── SUBCRITERIOS  (15 scores, raw + 1a5)        ← subcriterios/*.h3.parquet
              └── VARIABLES  (crudas 61 / ponderadas 46)← variables/ + variables_pon/
                    · flags transversales: excluido, alerta
```

- **variables** = valor CRUDO por hex (lo que se muestra/mapea/detalla).
- **variables_pon** = las mismas variables ya NORMALIZADAS+PONDERADAS (las 46 que
  puntúan). La diferencia `61 − 46 = 15` = informativas + alertas + flags.
- **subcriterios** trae dos versiones por columna: `_raw` (valor) y `_1a5`
  (normalizado 1–5 vía `minmax_anchors.json`).
- Los **scores están PRECALCULADOS** por el equipo de datos (WLC/AHP). El back los
  **ingiere**, no los recalcula (hay un placeholder `calc_temp_viability` solo como
  fallback si `global ≤ 0`). Ver `domain/query_engine/scoring.py`.

---

## 1. Las CLASES de columna (el registro `parquet_column`)

Cada columna del bundle se enruta por su **clase**. Esto es el motor
schema-agnóstico (`bundle_service.py`); lo desconocido queda **pendiente de
conciliación** (nunca se adivina). Mapa clase → destino en `hexagon`:

| Clase (`kind`) | Qué es | Aterriza en | Uso |
|---|---|---|---|
| `clave` | `h3_index` | PK `hexagon.h3_index` | — |
| `global` | score general | `hexagon.score_general` | resultado, heatmap, informe |
| `criterio` | score de criterio | `hexagon.scores[criterio]` | informe, score |
| `subcriterio` | score de subcriterio | `hexagon.scores[subcriterio]` | informe |
| `variable_modelo` | variable que puntúa | `hexagon.variables[code]` | score, (mapa/detalle) |
| `variable_informativa` | no puntúa | `hexagon.variables[code]` | detalle |
| `alerta` | marca **−2**, NO bloquea | `hexagon.variables[code]` (flag) | mapa/aviso |
| `excluyente` | oculta el hex | `hexagon.tipo_celda='excluida'` | máscara |
| `bandera` | flag agregado por hex | `hexagon.variables[code]` | mapa |
| `campo` | atributo de otra entidad | (no valor por hex) | metadato |
| `ignorar` | no se consume | — | — |

**Conteo del registro semilla (`parquet_column_seed.csv`, 83 columnas):**
1 clave · 1 global · 6 criterio · 15 subcriterio · 46 variable_modelo · 4
variable_informativa · 8 alerta · 1 excluyente (`excluido`) · 1 bandera (`alerta`).

---

## 2. GRUPO — Criterios (6) → Dimensiones de la app (3 puntuables)

`criterios/criterios.h3.parquet`: `h3_index, recurso_eolico, economia,
infraestructura, contexto_biotico, contexto_abiotico, entorno_social, global, alerta`.

| Criterio (bundle) | Subcriterios | Dimensión app | Nota |
|---|---|---|---|
| `recurso_eolico` | densidad_wpd | **Técnica** | recurso eólico = WPD |
| `infraestructura` | dist_nodos, dist_infra | **Técnica** | distancias a red/vías/puertos |
| `contexto_biotico` | especies_bioticas, areas_protegidas | **Ambiental** | |
| `contexto_abiotico` | amenazas, geologicas | **Ambiental** | |
| `entorno_social` | vulnerabilidad, brecha, riesgo_seguridad, gobernanza, sensibilidad | **Social** | variables SOC |
| `economia` | dist_interes, cond_vida, instituciones | **Social** | variables **SOE** |

> ⚠️ **TRAMPA CRÍTICA:** el criterio **`economia`** del modelo son las **SOE-001..006
> (socioeconómicas)** → puntúan dentro de **Social**. NO es la **dimensión
> Económica** (ECO-001..008, macro), que es **informativa, no puntúa** y vive en
> un bundle aparte (§6.3). Dos "economías", mismo nombre.

**Mapeo 6 criterios → 3 dimensiones puntuables:**
`Técnica = recurso_eolico + infraestructura` · `Ambiental = contexto_biotico +
contexto_abiotico` · `Social = entorno_social + economia(SOE)`.
Económica-macro y Regulatoria quedan **fuera del modelo** (informativas).

---

## 3. GRUPO — Subcriterios (15)

`subcriterios/*` trae `_raw` + `_1a5` (normalizado con `minmax_anchors.json`).

| Criterio | Subcriterio (bundle) | Criterio/Subcriterio en `InfoVariables` |
|---|---|---|
| recurso_eolico | `densidad_wpd` | Recurso eólico → Densidad de potencia WPD |
| infraestructura | `dist_nodos` | Infraestructura y red → Distancia a nodos de conexión |
| infraestructura | `dist_infra` | Infraestructura y red → Distancia vial/portuaria |
| contexto_biotico | `especies_bioticas` | Variables bióticas → Especies bióticas |
| contexto_biotico | `areas_protegidas` | Variables bióticas → Áreas protegidas |
| contexto_abiotico | `amenazas` | Variables abióticas → Amenazas |
| contexto_abiotico | `geologicas` | Variables abióticas → Condiciones geológicas y geotécnicas |
| economia | `dist_interes` | (Social) Económico → Distancia a puntos de interés |
| economia | `cond_vida` | (Social) Económico → Condiciones de vida |
| economia | `instituciones` | (Social) Económico → Instituciones (estabilidad jurídica) |
| entorno_social | `vulnerabilidad` | Social → Vulnerabilidad social |
| entorno_social | `brecha` | Social → Brecha energética y asequibilidad |
| entorno_social | `riesgo_seguridad` | Social → Riesgo seguridad/delictividad/conflicto |
| entorno_social | `gobernanza` | Social → Falta de gobernanza e institucionalidad |
| entorno_social | `sensibilidad` | Social → Sensibilidad sociocultural/étnica/territorial |

### 3.1 Tabla AGREGADA de scores — `mcda_agregado.h3.parquet` (canónica)

Un **solo parquet (24 cols, 1.49 M filas)** que combina TODOS los scores
normalizados en un sitio → la ingesta lo prefiere (`_CANON_SCORES`) y evita leer
`criterios/*` + `subcriterios/*` por separado. Contiene:
`h3_index` + **15 subcriterios** + **6 criterios** + `global` + `alerta`(bool).

- Son los **valores normalizados/agregados** (0–1) del modelo — los "rangos" de
  normalización viven en `subcriterios/minmax_anchors.json` (→ `hexagon_meta`).
- **Destino:** subcriterios+criterios → `hexagon.scores` (JSONB) · `global` →
  `hexagon.score_general` · `alerta` → bandera.
- ℹ️ **`densidad_wpd0` = `densidad_wpd`**: el `0` es un **cambio de nombre entre
  versiones** (mismo subcriterio WPD), NO un conflicto real. Basta tratarlos como
  iguales en el registro (alias) o normalizar en la ingesta.

---

## 4. GRUPO — Variables (crudas 61 / ponderadas 46) con su clase + metadatos

Join: `parquet_column_seed.csv` (clase real) × `InfoVariables(2)b/c` (nombre,
emplazamiento, ¿mapa?, fuente). `base_code` = `DIM_NNN` (quita sufijos
`_svNNN/_onshore/_dist/_t/_sr/_alert…`) para casar la columna del parquet con el
`master_id` del catálogo.

### 4.1 Variables del MODELO (puntúan — `variable_modelo`, están en `variables_pon`)

| Col parquet | master_id | Nombre | Dim | Emplazam. | ¿Mapa? | Fuente |
|---|---|---|---|---|---|---|
| `TEC_004_sv003` | TEC-004-T | Densidad de potencia **WPD** | Téc | Onshore&Offshore | **Sí (heat)** | GWA |
| `TEC_023_onshore` | TEC-023-T | Distancia a nodos de conexión (SIN) | Téc | O&O | Sí (punto) | UPME |
| `TEC_032_dist` | TEC-032-T | Distancia a infraestructura vial | Téc | Onshore | Sí (punto) | Invias |
| `TEC_015_t` | **AMB-040** (viejo `TEC-015/AMB-040`) | **Riesgo físico relativo** (amenaza UNGRD) → subcriterio `amenazas` | Amb¹ | Onshore | No | UNGRD |
| `AMB_005` | AMB-005-A | Especies endémicas | Amb | O&O | No | Humboldt |
| `AMB_003` | AMB-003-A | Especies migratorias | Amb | O&O | No | GBIF |
| `AMB_017` | AMB-017-A | Especies aves IUCN | Amb | O&O | No | GBIF |
| `AMB_042` | AMB-042-A | Especies murciélagos IUCN | Amb | Onshore | No | GBIF |
| `AMB_038` | AMB-038-A | Congregación de aves playeras | Amb | Onshore | No | INVEMAR |
| `AMB_034` | AMB-034-A | Zonas de reproducción de aves | Amb | Onshore | **Sí (zona)** | INVEMAR |
| `AMB_033` | AMB-033-A | Áreas clave para la biodiversidad (KBA) | Amb | O&O | No | KBA |
| `AMB_012` | AMB-012-A | Humedales RAMSAR | Amb | Onshore | **Sí (zona)** | IGAC |
| `AMB_036` | AMB-036-A | Playas de anidación de tortugas | Amb | O&O | No | INVEMAR |
| `AMB_031` | AMB-031-A | Fallas y sismicidad | Amb | Onshore | No | SGC |
| `AMB_028` | AMB-028-A | Litología | Amb | Onshore | No | SGC |
| `AMB_006` | AMB-006-A | Uso y cobertura del suelo | Amb | Onshore | **Sí** | IGAC · *string (categórica)* |
| `AMB_007` | AMB-007-A | Pendiente del terreno | Amb | Onshore | Sí | Elab. propia |
| `AMB_008` | AMB-008-A | Elevación | Amb | Onshore | Sí | IGAC |
| `SOE_001` | SOE-001 | Distancia mín. a atractivo turístico | Soc(SOE) | Onshore | No | MinCIT |
| `SOE_002` | SOE-002 | Tiempo mín. a centro poblado ≥50k | Soc(SOE) | Onshore | No | DANE |
| `SOE_003` | SOE-003 | Pobreza multidimensional | Soc(SOE) | Onshore | No | DANE |
| `SOE_004` | SOE-004 | Tasa de analfabetismo | Soc(SOE) | Onshore | No | DANE |
| `SOE_005` | SOE-005 | Pobreza energética | Soc(SOE) | Onshore | No | MME |
| `SOE_006` | SOE-006 | Instrumentos de ordenamiento territorial | Soc(SOE) | Onshore | No | IGAC |
| `SOC_001` | SOC-001-SE | Tasa de desocupados | Soc | O&O | No | DANE |
| `SOC_002` | SOC-002-S | Proyección densidad poblacional | Soc | O&O | Sí | DANE |
| `SOC_007_s` | SOC-007-S | Distancia viviendas a centros urbanos | Soc | O&O | Sí | DANE |
| `SOC_008` | SOC-008-SE | Índice de pobreza multidimensional | Soc | O&O | Sí | DANE |
| `SOC_012` | SOC-012-S | Tasa de analfabetismo | Soc | O&O | No | Datos Abiertos |
| `SOC_034_s` | SOC-034-S | Hogares por municipio | Soc | O&O | No | DANE |
| `SOC_035` | SOC-035-SE | Índice pobreza monetaria | Soc | O&O | No¹ | DANE |
| `SOC_036` | SOC-036-SE | Tipología territorial | Soc | O&O | No | DNP · *string (categórica)* |
| `SOC_010_tse` | SOC-010-TSE | Tarifa de energía eléctrica | Soc | O&O | Sí | Datos Abiertos |
| `SOC_038` | SOC-038-TSE | IPM energética | Soc | O&O | Sí | UPME |
| `SOC_009` | SOC-009-TS | Zona no interconectada | Soc | O&O | Sí | Datos Abiertos |
| `SOC_011` | SOC-011-S | Presencia grupos beligerantes | Soc | O&O | Sí | Arcgis |
| `SOC_015` | SOC-015-SR | Densidad de cultivos de coca | Soc | O&O | Sí | Datos Abiertos |
| `SOC_018` | SOC-018-AE | Mapa de minería ilegal | Soc | O&O | Sí | Arcgis |
| `SOC_031` | SOC-031-S | Reclutamiento menores de 18 | Soc | O&O | No | Colombia en Mapas |
| `SOC_041_s` | SOC-041-S | Índice de incidencia delictiva | Soc | O&O | No | Elab. propia |
| `SOC_023_ser` | SOC-023-SER | Índice desempeño institucional | Soc | O&O | No | DANE |
| `SOC_032` | SOC-032-S | Territorios de comunidades negras | Soc | O&O | Sí | Colombia en Mapas |
| `SOC_016_sr` | SOC-016-SR | Zonas de reserva campesina | Soc | O&O | Sí | Colombia en Mapas |
| `SOC_013` | SOC-013-SR | Resguardos indígenas | Soc | O&O | Sí | Colombia en Mapas |
| `SOC_039` | SOC-039-SR | ZOMAC | Soc | O&O | No | ART |
| `SOC_040` | SOC-040-SER | PDET | Soc | O&O | No | FINAGRO |

¹ `TEC_015_t`: **dimensión = Ambiental** aunque su prefijo sea `TEC` — es una
amenaza (subcriterio `amenazas`/`contexto_abiotico`). El prefijo NO manda aquí.

`SOC_035`: `InfoVariables b` = No; `InfoVariables c` lo lista como informativa
con mapa = Sí. Conciliar.

### 4.2 Variables INFORMATIVAS (no puntúan — `variable_informativa`)

| Col parquet | master_id | Nota |
|---|---|---|
| `AMB_001` | AMB-001 | Áreas protegidas RUNAP (Decreto 2372/2010) — detalle |
| `AMB_004` | AMB-004 | Páramos (Ley 1930/2018) — detalle |
| `TEC_024_t` | TEC-024-? | ⚠️ **no está en InfoVariables** — conciliar |
| `SOC_025_sr` | SOC-025-? | ⚠️ **no está en InfoVariables** (¿≠ SOC-024 diversidad religiosa?) · *string* |

### 4.3 ALERTAS (`alerta`) — marcan **−2**, NO bloquean el score

✅ **Confirmadas OK y procesadas** en el reporte **MCDA VENTO Lite** (2026-09-22).
No necesitan ficha de menú en `InfoVariables` (son banderas de alerta, no variables
seleccionables). Regla del reporte: **multi-columna → dejar 1 columna de valor.**

| Col parquet | base | Estado | Umbral / significado |
|---|---|---|---|
| `TEC_001_alert` | TEC_001 | ✅ OK | **Velocidad del viento < 5 m/s @100 m** (`TEC_001_sv003 < 5`) → 1 = alerta |
| `TEC_032_t` | TEC_032 | ✅ OK | Alerta ligada a infraestructura vial |
| `SOC_030_sr` | SOC_030 | ✅ OK | Alerta social (confirmada como alerta) |
| `AMB_010` | AMB_010 | ✅ OK | Alerta ambiental |
| `AMB_011` | AMB_011 | ✅ OK | Alerta ambiental |
| `AMB_013` | AMB_013 | ✅ OK | Alerta ambiental |
| `AMB_015` | AMB_015 | ✅ OK | Alerta ambiental |
| `AMB_016` | AMB_016 | ✅ OK | Alerta ambiental |

> **SUBCRITERIOS y EXCLUYENTES:** el reporte MCDA VENTO Lite no lista ninguno
> "no procesado / con nota" → todos OK.

### 4.4 Flags transversales

- **`excluido`** (bool, clase `excluyente`) → `tipo_celda='excluida'` → hex oculto,
  0 % idoneidad, no seleccionable.
- **`alerta`** (bool, clase `bandera`) → marca agregada de alerta por hex.

### 4.5 ⚠️ Conflicto del VIENTO (a resolver antes de cablear el mapa)

| Código | InfoVariables | En el bundle real | Clase real |
|---|---|---|---|
| **TEC-004-T** | "Densidad de potencia WPD" | `TEC_004_sv003` + subcriterio `densidad_wpd` | **variable_modelo** (la que puntúa y va al heatmap) |
| TEC-001-T | "Velocidad del viento @100 m" | solo `TEC_001_alert` | **alerta** (viento <5 m/s) — NO puntúa |
| TEC-002-T | "densidad de potencia @100 m" | **no aparece en el parquet** | — |

➡️ El **heatmap de recurso eólico del modelo = WPD (TEC-004)**. El front hoy
(`mapSymbols.ts`) pinta `velocidad-viento (TEC-001-T)` + `densidad-viento
(TEC-002-T)` → **no casa con el dato real**. Corregir a WPD (TEC-004).

### 4.6 Verificación de completitud — `variables_pon` (46) vs InfoVariables

Cruce contra `tabla_maestra_mcda_onshore.h3.parquet` (61 cols, = capa `variables`).

**Las 46 ponderadas están todas** y cuadran: **6 SOE + 22 SOC + 4 TEC + 14 AMB**.

| Dimensión | En parquet (modelo) | Estado vs InfoVariables |
|---|---|---|
| SOE | 6 (SOE-001..006) | ✅ completas |
| SOC | 22 | ✅ completas |
| TEC | 4 (TEC-004, TEC-023, TEC-032, `TEC_015_t`) | ✅ `TEC_015_t` = **AMB-040 Riesgo físico** (resuelto por comparación); falta **TEC-031** portuaria (offshore, esperado) |
| AMB | 14 | ⚠️ ver abajo (mayoría offshore, esperadas) |

**Faltantes AMB respecto a InfoVariables (recordar: hoy solo ONSHORE):**
- **Esperadas (offshore → bundle futuro):** AMB-019 marinas IUCN, AMB-020 pastos
  marinos, AMB-029 fondos marinos, AMB-030 batimetría.
- **AMB-040 Riesgo físico:** ✅ **presente como `TEC_015_t`** (código viejo `TEC-015`).
- ⚠️ **AMB-041 Amenaza volcánica** (viejo `TEC-016`): no aparece con ese código —
  ¿entre las alertas `AMB_010/011/013/015/016`? → confirmar.
- ⚠️ **AMB-021 coralinas** (O&O, mapa Sí): no aparece onshore → confirmar.

**Todo mapeado:** las 61 columnas están clasificadas en `parquet_column` (46 modelo +
8 alerta + 4 informativa + `excluido` + `alerta` + `h3_index`). **Excluyentes** = solo
el bool `excluido`. **Sin ficha InfoVariables** (pendientes §9): `TEC_024_t`,
`SOC_025_sr` (informativas).
*(Nota: en este dump `AMB_006`/`SOC_036`/`SOC_025_sr` vienen `double`; en el bundle
previo eran `string` — el tipo cambió entre versiones.)*

---

## 5. Esquema de BD ACTUAL (backend — estado a reconciliar, NO fuente de verdad)

> Esto es lo que el backend tiene **hoy**. Sirve para ver el punto de partida y
> qué cambiar; la verdad de qué debe existir la dan `InfoVariables` + los inspects
> (§10 lista dónde el backend está desalineado).


### 5.1 Datos por hex — `hexagon` (espejo del bundle, runtime del mapa)

| Columna | Tipo | Origen (clase) |
|---|---|---|
| `h3_index` | PK string | `clave` |
| `score_general` | float | `global` |
| `scores` | **JSONB** | `criterio` + `subcriterio` (todos los scores precalculados) |
| `variables` | **JSONB** | `variable_modelo` + `variable_informativa` + `alerta` + `bandera` (crudos) |
| `tipo_celda` | string | `excluyente` (`excluida`) o `disponible` |
| `emplazamiento` | string idx | onshore / offshore (bundle de origen) — mig `0008` |
| `lat`, `lng` | float idx | calculados del `h3_index` en la ingesta (bbox tiles) |
| `updated_at` | datetime | |

> `variables_pon` (ponderadas) **no** tiene columna propia hoy: las 46 se puntúan
> aguas arriba y el resultado ya viene en `scores`/`global`. Si se quisiera
> mostrar el valor ponderado por variable, faltaría `hexagon.variables_pon` JSONB.

- **`hexagon_meta`** (una fila por variable): `vmin/vmax` para normalizar +
  catálogo. Reemplaza el barrido del dataset en cada request.

### 5.2 Catálogo / metadatos — `catalog_variable` (US08-01)

Campos actuales: `id, label, dimension, dimension_label, tipo(modelo|informativa),
enabled, en_mapa, en_menu, excluyente, fuente, unidad, rango, descripcion,
dataset_version, dataset_updated_at, master_id, criterio, subcriterio,
aplica_en(""|mar|tierra), no_calculo, polaridad(+1/−1/0), peso, map_kind(""|heatmap|zona),
map_threshold`. Seed: `variables_seed.json` (91 entradas).

**⚠️ El "back de metadatos" que falta** (lo que trae `InfoVariables` y aún NO
está en la tabla):
- `emplazamiento` ENUM(onshore|offshore|both) — hoy solo existe `aplica_en`
  (`""|mar|tierra`), que no distingue "both" de "cualquiera". **Añadir**.
- `licencia` (tipo de licencia de datos) — **añadir**.
- `url_fuente` — **añadir**.
- Alimentar todo esto desde `InfoVariables` **conciliando por `master_id`** (nunca
  por nombre → no se actualiza la variable equivocada).

### 5.3 Otras tablas de catálogo (editables por admin)

- `catalog_norma` (id, nombre, descripcion, estado) → §6.4. Seed `normas_seed.csv`.
- `catalog_escenario` (id, label, description, horizonte, mult, impacto) → §6.3. Seed `escenarios_seed.csv`.
- `catalog_turbine` (id S|M|L, potencia_min/max_mw, area, espaciamiento) → §6.1. Seed `turbines_seed.csv`.
- `data_source` (id, kind, location, rows, status, ingested_at) — dónde vive cada fuente.
- `master_version` (version, status, source, applied_at, hex_count, var_count) — trazabilidad.
- `parquet_column` (name, base_code, kind, target_ref, usos, estado) — el registro de clases (§1).

---

## 6. Otros grupos de datos (los que NO son las 4 capas)

### 6.1 Características del proyecto (`InfoVariables(2)a`)
- **Tipo de emplazamiento** (flotante/fija; offshore <100 m opción, resto flotante)
  → se delimita **automáticamente**, no lo elige el usuario.
- **Capacidad nominal (MW)** → ingresada por el usuario.
- **Tamaño derivado**: pequeño <1 MW · mediano 1–20 MW · grande >20 MW (automático).
- **Tipo de aerogenerador** sugerido por capacidad: turbina pequeña 1 kW–100 kW ·
  mediana 100 kW–1 MW · grande 1 MW+. Nº de unidades = calculable. → `catalog_turbine`.

### 6.2 Recurso eólico especial (multi-altura)
`TEC-001` (velocidad) y `TEC-004` (WPD/densidad) vienen por **altura de buje**
(10/50/100/150/200 m → sub-variantes `svNNN`). Se representa a **100 m** por
defecto; futuro: selector de altura. `base_code` colapsa las `svNNN`.
**Regla de ingesta (MCDA VENTO Lite):** variable **multi-columna → dejar 1 sola
columna de valor** (p.ej. el WPD/velocidad a 100 m = `sv003`).

### 6.3 Dimensión ECONÓMICA — macro (bundle aparte, `inspect_bundle.py`) — INFORMATIVA

No toca `hexagon` ni el modelo de idoneidad. Es un **modelo macro CGE (GAMS)** que
corre **por escenario de MW de generación eólica** y proyecta variables macro por
año. La pista está en los nombres de archivo:

**A) INPUTS — variables exógenas por escenario** (lo que ENTRA al modelo, formato
ancho `Variable × YEAR × Escenario_mw_*`):
- `variables_esce.xlsx` (*variables de escenario*, 139 filas): 10 drivers
  (CREC CONSUMO/EXPORT/FBK/GASTO/IMPORT/PIB, IPC, DEMANDA GEN, PRECIO DEMANDA SPOT,
  TASA DE CAMBIO) × escenarios `{0,1,10,20,100,200,300,500}`.
- `VARIABLES_2.xlsx` (**v2**, 167 filas): 12 drivers (añade PRECIO DEMANDA GEN/GEN 2)
  × escenarios `{50,150,200,250,300,450,500,550,600,650,700,800,900,1000}`.
  → Es la versión **ampliada/actualizada** de los inputs (más escenarios, más precio).

**B) OUTPUTS — `panel_por_variable.xlsx`** (lo que SALE del modelo; *panel por
variable*, 26 hojas). Formato **tidy**: `escenario_mw | cat1..catN | anio | valor`.
Fuente declarada: `RESULTADOS*.gdx` (GAMS). Bloques por tema:

| Grupo | Hojas |
|---|---|
| Resumen | RESUMEN, RESUMEN1 (drivers: CREC PIB, IPC, PRECIO DEMANDA SPOT/GEN, DEMANDA GEN, TASA DE CAMBIO…) |
| Macro real | PIB (29 sectores), PRECIOS (IPC/PXC × 25 sectores), CAPITAL, VALORES2 (salarios WC/WNCA/WNCI × sector) |
| Empleo/Población | EMPLEO (32 series), POBLACION, POBETAREO, CEDAD (consumo por edad) |
| Energía/Ambiente | GENERACION (por agente + GEN EOLICA/SOLAR/…), EMISIONES |
| Gobierno | GOBG, GOBGNC, GOBGPIB, GOBGNCPIB, GOBRESTO(PIB) — cuentas fiscales (± %PIB) |
| Seguridad social | GOBPENS(PIB), GOBSALUD(PIB), PSSPENS, PSSADR |
| Externo | BdeP (balanza de pagos) |
| Potencia | RESULTADOSPOT (**453k filas**: T1/T2/T3 × mes × alta cardinalidad) |

⚠️ **Discrepancia de ejes de escenario** (a conciliar con el equipo): los 3 archivos
usan **escenarios distintos** →
- inputs `variables_esce` = `{0,1,10,20,100,200,300,500}`
- inputs `VARIABLES_2` = `{50..1000}` (14 valores)
- outputs `panel` = **`{-500,-300,-200,-20,-10,-1,0(base),100}`** (deltas con signo)

**Catálogo** (`InfoVariables c`): **ECO-001..008** (precio spot, PIB, IPC, inflación,
TRM, demanda, oferta, emisiones) — "proyección en distintos escenarios", **no puntúa**,
opcional para el usuario.

**Destino BD propuesto:**
- `economic_series(panel, escenario_mw, cat1, cat2, cat3, anio, valor)` — tabla
  **long genérica** (el `panel`/hoja + cat1..cat3 cubren las 26 hojas heterogéneas).
- `economic_panel(id, nombre, descripcion, n_categorias)` — catálogo de hojas (de la
  hoja RESUMEN).
- `catalog_escenario` (mult/impacto/horizonte) + `catalog_variable` ECO-001..008.
- **Lo que la app muestra** = un **subconjunto curado** (RESUMEN1 + PIB/EMPLEO/
  EMISIONES/GENERACION/PRECIOS por escenario y año); el resto (GOB*/PSS*/CEDAD/
  RESULTADOSPOT) se **almacena** pero no necesariamente se renderiza — decisión de UX.

#### 6.3.1 Clasificación por hoja — qué es / dónde se usa

Uso: **📊 App** = se muestra en el panel económico (US04-02) · **🗄️ BD** = se
ingiere y queda disponible (detalle/avanzado), no se pinta por defecto · **⚙️ Meta**
= metadato interno.

| Archivo/Hoja | Qué es | Uso |
|---|---|---|
| `variables_esce.xlsx` | Inputs/drivers exógenos por escenario (v1) | ⚙️ **Input del modelo** (supuestos) |
| `VARIABLES_2.xlsx` | Inputs/drivers (v2 ampliada) | ⚙️ **Input del modelo** (supuestos del escenario; opcional mostrar) |
| `RESUMEN` | Índice de las 26 hojas (nombre/desc/ubicación) | ⚙️ **Meta** → alimenta `economic_panel` |
| `RESUMEN1` | KPIs macro (CREC PIB, IPC, PRECIO DEMANDA SPOT/GEN, DEMANDA GEN, TRM) | 📊 **App** — gráfica principal de proyección |
| `PIB` | PIB por 29 sectores + total/nominal | 📊 **App** — crecimiento económico (ECO-002) |
| `PRECIOS` | IPC/PXC por 25 sectores | 📊 **App** — inflación/precios (ECO-003/004) |
| `GENERACION` | Generación eléctrica por agente/tecnología (GEN EÓLICA…) | 📊 **App** — mix y aporte eólico (ECO-006/007) |
| `EMISIONES` | Emisiones por fuente (ACPM, biomasa, carbón, gas…) | 📊 **App** — impacto ambiental (ECO-008) |
| `EMPLEO` | Empleo (formal/informal, PEA, tasa desempleo…) | 📊 **App** — impacto en empleo |
| `POBLACION` | Población (PET, PET ACT, total) | 🗄️ BD — contexto |
| `POBETAREO` / `CEDAD` | Población y consumo por edad | 🗄️ BD — demográfico profundo |
| `CAPITAL` | Stock/uso de capital por sector | 🗄️ BD — detalle CGE |
| `VALORES2` | Salarios (WC/WNCA/WNCI) por sector | 🗄️ BD — detalle laboral |
| `BdeP` | Balanza de pagos (cuenta corriente, export/import, remesas) | 🗄️ BD — sector externo |
| `GOBG` / `GOBGPIB` | Cuentas de gobierno (ingresos/pagos/déficit) ±%PIB | 🗄️ BD — fiscal |
| `GOBGNC` / `GOBGNCPIB` | Gobierno nacional central detallado | 🗄️ BD — fiscal |
| `GOBRESTO` / `GOBRESTOPIB` | Resto de gobierno | 🗄️ BD — fiscal |
| `GOBPENS` / `GOBPENSPIB` | Gasto en pensiones | 🗄️ BD — seg. social |
| `GOBSALUD` / `GOBSALUDPIB` | Gasto en salud | 🗄️ BD — seg. social |
| `PSSADR` | Protección social salud (ADRES) | 🗄️ BD — seg. social |
| `PSSPENS` | Protección social pensiones | 🗄️ BD — seg. social |
| `RESULTADOSPOT` | Resultados de potencia (T1/T2/T3 × mes, **453k filas**) | 🗄️ BD — operativo masivo |

**Mapeo hojas 📊 App → catálogo ECO (`InfoVariables c`):**

| ECO | Variable | Sale de |
|---|---|---|
| ECO-001 | Precio spot energía | RESUMEN1 (PRECIO DEMANDA SPOT) |
| ECO-002 | PIB | PIB / RESUMEN1 (CREC PIB) |
| ECO-003 | IPC | PRECIOS / RESUMEN1 (IPC) |
| ECO-004 | Inflación | PRECIOS (derivada del IPC) |
| ECO-005 | TRM | RESUMEN1 (TASA DE CAMBIO) |
| ECO-006 | Demanda de energía | RESUMEN1 (DEMANDA GEN) / GENERACION |
| ECO-007 | Oferta de energía | GENERACION |
| ECO-008 | Emisiones | EMISIONES |

### 6.4 Dimensión REGULATORIA (`InfoVariables(2)c`) — INFORMATIVA
- **REG-001-L … REG-023-R** (leyes/decretos/resoluciones) con **estado**: Vigente /
  Requiere trámite / Requiere verificación, + descripción + URL. → `catalog_norma`
  (estados: aplica|tramite|verificacion|no-aplica).
- **Regulación-Social / -Técnica / -Ambiental**: normas ligadas a variables
  concretas (p.ej. `SOC-013-SR` resguardos → consulta previa; `AMB-001` RUNAP).

---

## 7. Relaciones (cómo se concilia todo)

```
InfoVariables (master_id: AMB-012-A)
        │  -→_  + quita sufijos
        ▼
base_code (AMB_012) ──── casa ───▶ columna parquet (AMB_012)   [variables/variables_pon]
        │                                   │
        ▼                                   ▼
catalog_variable.master_id          parquet_column.name/base_code (clase)
        │                                   │ enruta por clase
        ▼                                   ▼
metadatos (nombre, fuente, emplazam.)   hexagon.{variables|scores|score_general|tipo_celda}
```

- **Clave de conciliación = `master_id` ↔ `base_code`** (no el nombre).
- **variable ⟷ subcriterio ⟷ criterio ⟷ global**: jerarquía del modelo (§2–§3).
- **variables (61) ⟷ variables_pon (46)**: misma columna; estar en `_pon` ⇒ clase
  `variable_modelo`; solo en crudo ⇒ informativa / alerta / flag.
- **Regla propuesta (solo sugerencia):** columna nueva desconocida → si entra a
  `variables_pon` = modelo; si no = informativa. Igual se **pregunta** (conciliación).

---

## 8. Flujo de ingesta (plan → conciliar → aplicar)

1. **PLAN** (`bundle_service.plan`): lee solo cabeceras, clasifica cada columna
   (exact → ok · base_code → propuesto · nada → **pendiente**).
2. **CONCILIAR** (`upsert_column`, panel admin): el humano resuelve las pendientes.
3. **APLICAR** (solo con 0 pendientes):
   - **Interfaz** = `upsert` (actualiza+añade, no borra, no frena informes) —
     también por **paquetes/row-group** (`chunk_plan`/`apply_chunk`) + `finalize`
     (sube versión + fecha + archivo).
   - **Consola/prod** = `destructive` con backup + swap **blue-green**.
   - Filtra fuera de Colombia (`is_in_colombia`), calcula lat/lng, enruta por clase.

---

## 9. Pendientes / conflictos a conciliar (resumen)

1. **Viento**: heatmap del modelo = **WPD (TEC-004)**, no TEC-001/TEC-002. Corregir front.
2. **Códigos SIN ficha — solo quedan 2:** `TEC_024_t` y `SOC_025_sr` (informativas).
   ✅ `TEC_015_t` **RESUELTO** (comparando con la versión vieja): = **Riesgo físico
   relativo** `AMB-040` (viejo `TEC-015`). ✅ Las alertas `AMB_010/011/013/015/016`,
   `TEC_032_t`, `SOC_030_sr`, `TEC_001_alert` = banderas OK (MCDA VENTO Lite).
   `densidad_wpd0` = `densidad_wpd` (cambio de nombre, no conflicto).
3. **`SOC_035`**: ¿mapa Sí (c) o No (b)? Definir.
4. **`emplazamiento` de variable**: añadir a `catalog_variable` (hoy solo `aplica_en`
   mar/tierra, no cubre "both"). Es lo que destraba "qué variables por modelo".
5. **`licencia` + `url_fuente`**: añadir a `catalog_variable` + seed desde InfoVariables.
6. **`variables_pon` por hex**: decidir si se persiste (`hexagon.variables_pon`) para
   mostrar el valor ponderado, o basta con `scores`.
7. **Económica-macro**: crear `economic_series` (long) + `economic_panel` + ingesta
   del bundle. **Conciliar los ejes de escenario** (inputs `{0..500}`/`{50..1000}`
   vs outputs `{-500..+100}`) y decidir qué hojas ve el usuario (curado) vs solo BD.
8. **`densidad_wpd0`** en `mcda_agregado` vs **`densidad_wpd`** en el registro → no
   casa; añadir al registro `parquet_column` o normalizar en la ingesta.
9. **Solo ONSHORE hoy** (usuario 2026-09-22): el **offshore aún no se entrega**. Las
   variables marcadas Offshore (AMB-019/020/029/030, TEC-031) y la columna
   `emplazamiento=offshore` llegan con el bundle offshore futuro (mismo layout).

---

## 10. Backend DESACTUALIZADO — divergencias vs. la fuente de verdad

El backend se alinea a `InfoVariables` + inspects; hoy está desfasado en:

| # | Backend hoy | Debe quedar (según InfoVariables/inspects) |
|---|---|---|
| 1 | `variables_seed.json` (91) sin `emplazamiento`, `licencia`, `url_fuente` | Regenerar el seed desde `InfoVariables` con esos campos |
| 2 | `catalog_variable` sin columnas `emplazamiento`/`licencia`/`url` (solo `aplica_en` mar/tierra) | Migración `0009`: añadir las 3 (emplazamiento onshore/offshore/**both**) |
| 3 | `variable_catalog.py` → `LABELS` es un **STUB vacío**; `DIMENSIONS` usa `SOE→Socioeconómica`, `MAC→Macroeconómica`, `REG→Regulatoria` | Nombres reales desde InfoVariables; SOE va bajo **Social**; macro = **ECO** (no MAC); REG = informativa |
| 4 | Front `mapSymbols.ts`: viento = velocidad `TEC-001` + densidad `TEC-002` | Heatmap del modelo = **WPD `TEC-004`** (TEC-001 solo alerta; TEC-002 no existe) |
| 5 | `parquet_column_seed.csv`: clasificación de columnas fija en el repo | Validar contra el bundle real vigente; conciliar por panel las que cambien |
| 6 | Sin tablas de la **económica-macro** | Crear `economic_series` (escenario_mw × cat × año × valor) desde el bundle xlsx |
| 7 | Códigos en el parquet sin ficha en InfoVariables — **solo 3**: `TEC_015_t`, `TEC_024_t`, `SOC_025_sr` (las alertas ya se cerraron) | Pedir su ficha al equipo — InfoVariables manda |

> Regla operativa: cuando el backend y `InfoVariables`/inspects difieran, **gana
> `InfoVariables`/inspects**. El backend se actualiza hacia ellos, no al revés.

---

## 11-bis. Cobertura de metadatos: InfoVariables vs la página de Dimensiones

La página de Dimensiones (front `Variable` + `VariableDetail`) muestra estos campos.
¿Los trae `InfoVariables(2)`?

| Campo que muestra Dimensiones | ¿InfoVariables? | De dónde sale (final) |
|---|---|---|
| `label` (nombre) | ✅ | InfoVariables (Variable) |
| `dimension` | ✅ | InfoVariables |
| `criterio` (+ definición) | ✅ | InfoVariables |
| `subcriterio` (+ definición) | ✅ | InfoVariables |
| `description` (qué es) | ✅ | InfoVariables (Descripción) |
| `fuente` | ✅ | InfoVariables (Fuente de datos) |
| `masterId` (código) | ✅ | InfoVariables (ID) |
| `enMapa` (ver en mapa) | ✅ | InfoVariables (¿mapa?) |
| `aplicaEn` / emplazamiento | ✅ | InfoVariables (Emplazamiento onshore/offshore/both) |
| tipo modelo/informativa + opcional | ✅ | InfoVariables (Menú: "Activo por MCDM" vs "Opcional") |
| **licencia + URL fuente** | ✅ **(NUEVO)** | InfoVariables — el front **aún NO los muestra** → oportunidad |
| `iconKey` (icono) | ❌ | Front/admin (el cliente no manda iconos) |
| `peso` / `polaridad` (AHP) | ❌ | **Modelo** (`variables_pon` / pesos), NO InfoVariables |
| `detalle.rango` (normalización) | ❌ | **Modelo** (`minmax_anchors.json`) |
| `unidad` | ⚠️ parcial | A veces en la descripción ("en metros", "1 a 5") → editable en admin |
| `detalle.calculo` / `relevancia` | ⚠️ parcial | Definiciones de criterio/subcriterio + editable en admin |
| `excluyente` | ⚠️ | Solo el bool `excluido` del bundle (no por nombre) |

**Con qué quedó (resumen):** `InfoVariables(2)` **satisface el bloque descriptivo
completo** de la página de Dimensiones (nombre, dimensión, criterio/subcriterio +
definiciones, descripción, fuente, emplazamiento, en-mapa, modelo/opcional) **y suma
2 campos nuevos** (licencia, URL) que el front todavía no pinta. Lo que **NO** trae
—y hay que seguir sacando de otra parte— es **icono** (front/admin), **peso/polaridad
y rango** (del modelo), y **unidad/cálculo/relevancia** (parciales, editables en
admin). → El "back de metadatos" = `catalog_variable` alimentada por InfoVariables
para lo descriptivo + el modelo para peso/rango + admin para icono/unidad.

---

## 11. Comparación de versiones del catálogo (VIEJA → ACTUAL)

> **`InfoVariables1/2/3` = versión VIEJA** — **NO** se usa para actualizar datos.
> Sirve SOLO para **detectar cambios de código** entre versiones y explicar códigos
> "huérfanos" del parquet. La **`InfoVariables(2) a/b/c` (ACTUAL) manda** siempre.

| Concepto | Código VIEJO (InfoVariables1/3) | Código ACTUAL (InfoVariables 2) | Efecto en el parquet |
|---|---|---|---|
| Riesgo físico relativo | **`TEC-015` / `AMB-040`** | `AMB-040` | ✅ `TEC_015_t` del parquet = esta variable |
| Amenaza volcánica | **`TEC-016`** | `AMB-041` | parquet no trae `TEC_016`; ¿entre `AMB_01x` alertas? |
| Litología / Fondos marinos | `AMB-028-A` **juntas** ("Litología y fondos marinos") | **split**: `AMB-028` Litología + `AMB-029` Fondos marinos (offshore) | `AMB-029` es nuevo (offshore) |
| Subcriterio WPD | `densidad_wpd` | `densidad_wpd0` (agregado) | mismo subcriterio, solo cambió el nombre |
| Macro | PIB/IPC/Desempleo/TRM/Spot/Demanda/Oferta **SIN código** | `ECO-001..008` | códigos nuevos para la económica |
| Metadatos por variable | sin Emplazamiento / licencia / URL | **+ Emplazamiento, licencia, URL, "opcional en mapa"** | motiva el back de metadatos |
| Fuentes de datos | algunas distintas (p.ej. AMB-038 IGAC, AMB-031 IGAC, AMB-008 NASA) | actualizadas (INVEMAR, SGC, IGAC…) | gana la ACTUAL |

**Aún sin resolver por comparación:** `TEC_024_t` y `SOC_025_sr` (informativas) — no
aparecen ni en la vieja ni en la nueva con ese código exacto. Candidatos informativos
de la vieja `InfoVariables3` (por si hubo re-código): `SOC-024` diversidad religiosa,
`SOC-005` inclinaciones políticas, `SOC-004-SR` riesgo electoral, `TEC-005-TE`
turbulencia, AEP. → confirmar con el equipo.

---

### Fuentes
- **Fuente de verdad:** `InfoVariables(2) a/b/c.csv` + inspects del chat (`inspect_parquets`, `inspect_bundle`)
- **Solo para comparar cambios (VIEJA, no actualizar según ella):** `InfoVariables1/2/3.csv`
- **Solo referencia (desactualizado):** `backend/AppVento---Backend/infrastructure/data/parquet_column_seed.csv` (clases)
- `backend/AppVento---Backend/infrastructure/db/models.py` (esquema BD)
- `backend/AppVento---Backend/application/services/bundle_service.py` (ingesta por clases)
- `InfoVariables(2) a/b/c.csv` (catálogo cliente — fuente de verdad)
- `inspect_parquets.py` (bundle onshore) · `inspect_bundle.py` (económico macro)
- Relacionado: `docs/spec/ingesta-clases-conciliacion.md`, `docs/spec/ingesta-bundle-modelo.md`
