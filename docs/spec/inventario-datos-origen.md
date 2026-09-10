---
proyecto: Vento
tipo: Inventario de datos que consume la app + su origen
---

# Inventario de datos y su origen

Todos los datos que la app **recibe/consume**, de dónde vienen hoy, y a dónde
deberían venir. Complemento operativo de `docs/spec/datos-requeridos.md`.

---

# ⭐ Datos que necesitamos (entregables)

Lista concreta de lo que el equipo de datos/modelo debe entregar.

### 1. La master — tabla por `h3_index`
Una fila por hexágono con **todas sus variables** (informativas, ponderadas/no-informativas, excluyentes, etc.), y además:
- **una columna por variable**, con clave = el **id de la master** (ej. `TEC-004-T`) y su valor. Indicar si el valor es **crudo (con unidad)** o **normalizado 0–1** (idealmente ambos).
- **bool off/onshore** — 1/0 (mar/tierra). Confirmar el **nombre real** de la columna (`es_offshore` es provisional).
- **columna(s) de "se ve en el mapa" por variable** — qué hexágonos pertenecen a cada capa visible (humedales RAMSAR, resguardos, áreas coralinas, nodos, viento…): idealmente un flag/pertenencia por hex y variable.
- `score_general` (0–1) + score por dimensión (`TEC`, `AMB`, `SOE`/social, `MAC`, `REG`, 0–1).
- `tipo_celda` — `disponible` / `excluida` (no apta).
- Indicar la **resolución** H3 y el **formato exacto** de la clave de columna.

### 2. Lista definitiva de TODAS las variables (+ económica)
Una fila por variable con:
- **`masterId`** = id con el que viene referenciada en la master (ej. `TEC-004-T`).
- **descripción** · **cómo se calcula** · **fuente** · **relevancia** · **rango e interpretación** (ej. "0–200 W/m² = Poor … >800 = Superb"; a mayor valor → mejor/peor).
- (útil también: dimensión, criterio, tipo excluyente/informativa, unidad, `enMapa`, mar/tierra, polaridad.)

**+ Datos y fórmulas para la modal "Escenarios de mercado"** (dimensión económica, modal en Dimensiones):
- **Escenarios**: `{ id, label, descripción, horizonte(años) }`.
- **Serie por (escenario, variable, año)** para: PIB, PIB per cápita, IPC, desempleo, tasa de cambio, **precio spot (COP/kWh)**, **demanda (kWh)**, **oferta (kWh)**.
- **Cómo escala con la capacidad nominal** (y qué variables NO escalan).
- **Impuestos/incentivos clave** `{ label, valor }` (Ley 1715, IVA, aranceles, depreciación…).

### 3. Intervalos de la alerta amber (área vs capacidad)
- Por capacidad nominal `{ capacidadMW, areaMinKm2, areaMaxKm2 }` (10/20/50/100 MW) — o una **fórmula** min/max en función de los MW. (Definir con D. Técnica.)

### 4. Fórmula del número de aerogeneradores
- La **fórmula** (hoy: `floor(área / área_por_aerogenerador)`, mín 1) — confirmar.
- Parámetros por categoría S/M/L: `{ potenciaMW, areaPorAeroKm2, espaciamientoM }`.

### 5. Tabla de variables consideradas (informe) — valores
- Por variable: **pesos** (AHP) · **valor = promedio general del área** (agregado de la columna de la variable en la master, §1) · **fecha/vigencia**. *(Las **fuentes** se pidieron antes — §2.)*

### 6. Fórmula del score de dimensión
- `score_dim = Σ(peso_i · valor_i) / Σ peso_i` (con los **pesos AHP reales**).
- `índice general = Σ(peso_dim · score_dim)` (con los **pesos por dimensión** — hoy el front asume promedio).
- Reglas de **normalización** de cada variable a 0–1.

### 7. Regulatoria + avisos (faltaba en la lista)
- **Normas** `{ nombre, descripción, estado }` (estado = Aplica / Requiere trámite / Requiere verificación / No aplica) + **autoridades competentes** + **información normativa**. (Modal regulatorio + informe — hoy template.)
- **Disclaimer**: texto legal **aprobado por EAFIT** (se muestra al inicio y al final del informe — hoy template).
- (Menor: **icono** para variables informativas **nuevas** creadas en admin; hoy usan un icono genérico.)

---

## Leyenda de origen
| Tag | Origen |
|---|---|
| 🔌 **API** | Backend FastAPI vía BFF (`/api/tiles/*`, `/api/admin/catalog/*`) |
| 🔑 **Keycloak** | Identidad/roles (NextAuth) |
| 🛠️ **Admin/API** | Se administra en `/admin/*` → API real; hoy **fallback template en memoria** (`catalogApi.ts`) |
| 🧊 **Front (quemado)** | Constante/template en el código (reemplazar por dato real) |
| 🧮 **Calculado** | Se computa en el front a partir de otros datos |
| 🖱️ **UI/usuario** | Estado de interacción (selección, toggles, config) |
| 💾 **Local** | `localStorage` / `sessionStorage` del navegador |
| 🌐 **Externo** | Servicio de terceros |

> Regla: con `NEXT_PUBLIC_USE_BACKEND=true`, todo lo 🛠️/🔌 pasa a real; lo 🧊 sigue quemado hasta migrarlo.

---

## 1. Tabla maestra por hexágono (mapa + informe)
**Seam:** `AreaHexInfo` / `useAreaHexData.ts` · **Endpoint:** `POST /api/tiles/area`
| Dato | Origen |
|---|---|
| `h3_index` (clave por hex) | 🔌 API |
| `score_general` (0–1) | 🔌 API |
| `scores` por dimensión `{TEC,AMB,SOE,MAC,REG}` (0–1) | 🔌 API |
| `variables` `{ masterId: valor }` por hex | 🔌 API |
| `tipo_celda` (`disponible`/`excluida`) | 🔌 API |
| `es_offshore` (1/0, mar/tierra) | 🔌 API |
| Rejilla H3 visible por tile / geometría de Colombia | 🧮 Calculado (`h3/mapGeo`, `h3Resolution`) |
| Hexes prohibidos `BANNED_HEXES` | 🔌 API (`bannedStore`) + 🧊 Front (6 zonas demo) |

## 2. Capas informativas del mapa (símbolos por variable)
**Seam:** `MAP_SYMBOLS` (`Utils/map/mapSymbols.ts`)
| Dato | Origen |
|---|---|
| Geometría por variable (humedales RAMSAR, resguardos, nodos, coral, viento…): puntos/polígonos/hex | 🧊 Front (**coords inventadas** → necesita 🔌 API con `h3_index`/polígonos) |
| Tipo de capa (`point`/`zone`/`heat`), color, icono, leyenda | 🧊 Front |
| Cuáles se ven en mapa (toggle "ver en mapa") | 🛠️ Admin/API (`fetchMapDisabledIds`) + 🖱️ leyenda |

## 3. Autenticación / sesión
| Dato | Origen |
|---|---|
| `session.user.email`, `session.user.name` | 🔑 Keycloak |
| `session.roles[]` (admin/analista) → `useIsAdmin()` | 🔑 Keycloak |
| Registro de usuario | 🔑 Keycloak (`/api/auth/register`) |

## 4. Menú de dimensiones (fase "dimensiones")
| Dato | Origen |
|---|---|
| Lista de dimensiones (`DIMENSIONS`) | 🧊 Front |
| Variables **informativas** del menú (id, label, dimensión, criterio, subcriterio, descripción, icono, `enMapa`, `aplicaEn`, `noCalculo`) | 🛠️ Admin/API (`fetchMenuVariables`, semilla = catálogo de hoy) |
| Peso de variable (`weightFor`) | 🧊 Front (**placeholder** → §Modelo) |
| Detalle de variable (cómo se calcula · relevancia · rango) | 🧊 Front (derivado `variableDetails`) → dato real por variable |
| Variables activas del usuario | 🖱️ UI (`VariablesContext`) |

## 5. Modal "Dimensión económica – Escenarios de mercado"
**Seam:** `EconomicModal.tsx` · `economicScenarios.ts` · `EconomicContext`
Campos del modal:
| Campo | Dato | Origen |
|---|---|---|
| 1. Escenario de **capacidad nominal** | `[0,10,20,50,100] MW` | 🧊 Front (`CAPACIDADES_NOMINALES`) + 🖱️ selección |
| 2. **Horizonte** | `[5,10,15]` años (base 2025) | 🧊 Front (`PROJECTION_HORIZONS`, `BASE_YEAR`) + 🖱️ |
| 2. **Escenario** | lista `{id,label,description,horizonte}` | 🛠️ Admin/API (`fetchEscenarios`) |
| 3. **Variables a graficar** (chips) | variables económicas activas | 🖱️ UI + 🧊 catálogo |
| 4. **Proyección** (serie por año) | `economicSeries(esc,var,años,capacidad)` | 🧊 Front (**template determinista** → necesita 🔌 serie real por escenario/año) |
| 4. **Comparar escenarios** | superpone escenarios | 🖱️ UI (`compareMode`) |
| 5. **Incluir en informe PDF** | bool | 🖱️ UI (`addToReport`) |
| Escala por capacidad | factor = MW/20 | 🧮 Calculado (→ confirmar cómo escala real) |
| Impuestos/incentivos clave (en el informe) | Ley 1715, IVA, aranceles… | 🧊 Front (`IMPUESTOS_CLAVE`) → valores reales |

## 6. Modal "Dimensión regulatoria"
**Seam:** `RegulatoryModal.tsx` · `regulatoryNorms.ts` · `RegulatoryContext`
Campos del modal:
| Campo | Dato | Origen |
|---|---|---|
| **Semáforo normativo** (Aplica / Trámite / Verificación / No aplica) | conteos | 🧮 Calculado (`normasSemaforo`) |
| **Normas aplicables** (`nombre`, `descripción`, `estado`) | lista | 🛠️ Admin/API (`fetchNormas`) |
| **Autoridades competentes** (sigla, nombre) | lista | 🧊 Front (`REGULATORY_AUTHORITIES`) |
| **Información normativa** | ítems | 🧊 Front (`INFO_NORMATIVA`) |
| **Agregar al informe** | bool | 🖱️ UI (`addToReport`) |

## 7. Características del proyecto (fase "caracteristicas")
**Seam:** `Caracteristicas.tsx` · `CaracteristicasContext` · `projectData.ts`
| Campo | Dato | Origen |
|---|---|---|
| Tipo de emplazamiento (onshore/offshore) | auto por el área | 🧮 Calculado (`dominantHexType`) |
| Tecnología offshore (flotante/fija) | selección | 🖱️ UI |
| **Capacidad nominal (MW)** | input | 🖱️ UI (rango `MIN/MAX_CAPACITY_MW` 🧊) |
| Categoría S/M/L + specs (potencia, área/turbina, espaciamiento) | `AEROGENERADORES` | 🧊 Front (**template** → reales) |
| **Nº de aerogeneradores** | `floor(área/áreaPorTurbina)` | 🧮 Calculado (`calcNumAerogeneradores`) |
| Área del proyecto (km²) | suma de hexes | 🧮 Calculado (`cellArea`) |
| **Alerta área vs capacidad** (rango min/max) | `areaRangeForCapacity` | 🧊 Front (**template** → D. Técnica) |

## 8. Informe (fase "informe" + PDF)
**Seam:** `Report.tsx` · `ReportBuilder.tsx` · `reportConfig.ts`
| Dato | Origen |
|---|---|
| Configuración del informe (dimensiones/secciones/gráfico) | 🖱️ UI (`ReportConfig`) |
| Score general (gauge) + score por dimensión | 🔌 API (`useAreaScores`) / 🧮 agregación |
| Ejes de gráfico (radar/circular/barras) | 🧮 desde scores |
| **Tabla por dimensión**: variable, tipo, peso, **valor=promedio del área**, **fecha**, fuente | 🧊 catálogo + 🔌 valor (master) + 🧊 fecha/fuente (`reportSources`) |
| Variables que más influyen (suma/resta) | 🧮 desde `weightFor` (🧊) |
| Variables excluyentes | 🧊 `isExcluyente` (→ flag real de la master) |
| Sección económica (serie/comparación) | ver §5 |
| Sección regulatoria (semáforo/normas) | ver §6 |
| **Fuentes de datos** (fuente · versión · enlace) | 🧊 Front (`REPORT_SOURCE_LINKS`) → reales |
| Fuentes por dimensión | 🧮 desde catálogo |
| Bloque "Resumen del cálculo" (fórmula score) | 🧊 fórmula (→ pesos reales §Modelo) |
| Disclaimer (título/cuerpo) | 🧊 Front (`reportTemplates`, aprobar EAFIT) |
| Captura del mapa (snapshot) | 🧮 Cliente (`html2canvas` → cache `SNAPSHOT_KEY`) |
| **Tabla cruda por hex** (export admin PNG) | 🔌 API (`variables` de la master) + 🧊 fuente/fecha |

## 9. Modelo multicriterio (fórmulas/pesos) — necesario para trazabilidad
| Dato | Origen |
|---|---|
| Pesos AHP por variable | 🧊 Front (`variableWeights`, **placeholder**) → 🔌/entrega modelo |
| Pesos por dimensión | 🧮 hoy promedio → definir reales |
| Normalización por variable (a 0–1) | 🔌/entrega modelo |
| `score_dim = Σ(peso·valor)/Σpeso` · `índice = Σ(peso_dim·score_dim)` | 🧮 fórmula (confirmar) |
| Máscara de excluyentes → `tipo_celda="excluida"` | 🔌 API (qué variables la disparan) |

## 10. Histórico de informes
**Seam:** `HistorialContext` · `InformeEntry` (`historial/types.ts`)
| Dato | Origen |
|---|---|
| Entradas (id, fecha, nombre, hexes, variables, características, scores, región, área, `reportConfig`) | 🔌 API (`ApiHistorialRepo`) **o** 💾 Local (`LocalStorageHistorialRepo`) según `USE_BACKEND` |

## 11. Administración
| Superficie | Dato | Origen |
|---|---|---|
| `/admin/users` | usuarios (id, nombre, correo, enabled, roles) + CRUD | 🔑 Keycloak (`/api/admin/users*`) |
| `/admin/variables` | variables modelo/informativas + dataset | 🛠️ Admin/API (`/api/admin/catalog/variables`, `datasets`) |
| `/admin/normativa` | normas CRUD | 🛠️ Admin/API (`/normas`) |
| `/admin/escenarios` | escenarios CRUD | 🛠️ Admin/API (`/escenarios`) |

## 12. Otros
| Dato | Origen |
|---|---|
| Buscador de regiones (sugerencias) | 🌐 Externo (Nominatim/OSM en vivo) |
| Onboarding "visto" (1×/sesión) | 💾 `sessionStorage` |
| Estado de fases (`accion`, `selectedHexes`, `maxFaseIdx`) | 🖱️ UI (`AccionPrincipalContext`) |
| Iconos de variables | 🧊 Front (`variableIcons`) |

---

## Prioridad de migración (🧊/🛠️ → 🔌 real)
1. **Master `.h3.parquet`** (§1) — desbloquea mapa, scores, valores, tabla cruda, offshore, excluidos.
2. **Geometría de capas del mapa** (§2).
3. **Pesos + normalización del modelo** (§9) — desbloquea scores reales y trazabilidad.
4. **Admin catálogo real** (§11) — variables/normas/escenarios persistentes.
5. **Series económicas reales** (§5), **rangos capacidad/área** (§7) y **fuentes reales** (§8).
