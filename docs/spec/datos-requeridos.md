---
proyecto: Vento
tipo: Datos e insumos requeridos (template → real)
destino: equipo de datos/modelo + backend (Proyecto 2)
---

# Datos que necesitamos

Todo lo que hoy es **template/placeholder** en el frontend y debe reemplazarse por
datos reales. Cada punto indica **el seam de código** donde encaja (para que el
backend devuelva exactamente ese shape) y las **preguntas abiertas** a confirmar.

Flag maestro: con `NEXT_PUBLIC_USE_BACKEND=true` el front deja de usar template y
consume la API real. Clave espacial común: `h3_index`.

---

## 1. La master — tabla por hexágono (`.h3.parquet`)

Una fila por `h3_index` con todas sus columnas. La consume `POST /api/tiles/area`
(body `{ hexes: string[] }`) y alimenta mapa + informe.
**Seam:** `AreaHexInfo` en `src/app/Utils/report/useAreaHexData.ts`.

Shape esperado por hexágono:
```jsonc
{
  "h3_index": "8a2a1072b59ffff",   // clave (resolución fija — ver §1.1)
  "score_general": 0.0-1.0,         // idoneidad agregada del hex
  "scores": {                        // score por DIMENSIÓN (0–1)
    "TEC": 0.0-1.0, "AMB": 0.0-1.0, "SOE": 0.0-1.0, "MAC": 0.0-1.0, "REG": 0.0-1.0
  },
  "variables": {                     // valor POR VARIABLE (ver §1.2)
    "TEC-004-T": <número>, "AMB-005-A": <número>, ...
  },
  "tipo_celda": "disponible" | "excluida",   // "excluida" = zona no apta (§1.3)
  "es_offshore": 0 | 1               // 1 = mar / 0 = tierra (§1.4)
}
```

### 1.1 Resolución H3
- ¿A qué **resolución** viene la master? (el front selecciona a res ≥ 7; pinta hasta res 8). Confirmar la resolución de las columnas.

### 1.2 Formato de la clave de variable y del valor — **crítico**
- ¿La columna se llama exactamente como el `masterId` del catálogo (`TEC-004-T`) o con guion bajo/sufijo (`TEC_004`, `TEC_001_sv001`)? Hoy normalizamos `-`→`_` y quitamos sufijo (`backendVarCode`), pero necesitamos el **formato definitivo**.
- ¿El valor viene **normalizado 0–1** (para "puntaje 0–100") o **crudo con unidad** (para informativas)? Idealmente **ambos**: el crudo (para la tabla verificable y el SIG) y el normalizado (para el modelo).

### 1.3 Celdas excluidas
- Columna/valor que marca la exclusión (hoy `tipo_celda === "excluida"`). ¿Qué variables la disparan (máscara de excluyentes)? Ver §4.
- **Seam:** `setBannedData` (`hexClassification.ts`).

### 1.4 Offshore / onshore (bool por hex)
- Nombre **real** de la columna mar/tierra (`es_offshore` es provisional) y su codificación (1/0). **Seam:** `setEsOffshoreData` (`hexClassification.ts`).

---

## 2. Capas del mapa por variable (geometría)

Para cada variable que se **ve en el mapa** (humedales RAMSAR, resguardos, áreas
coralinas, nodos de conexión, velocidad de viento, etc.) necesitamos su
**representación geográfica**, no solo el flag `enMapa`. Hoy son coordenadas
**inventadas**. **Seam:** `MAP_SYMBOLS` en `src/app/Utils/map/mapSymbols.ts`.

Por variable:
- `variableId` (slug del catálogo) + tipo de representación: **`point`** (marcadores: nodos, puertos, vías) · **`zone`** (polígono/área: protegidas, resguardos) · **`heat`** (campo continuo: velocidad/densidad de viento).
- La geometría: idealmente la **lista de `h3_index`** donde la variable aplica (o polígonos GeoJSON / puntos lat-lng). Con eso el mapa pinta la capa real por hex.
- Color/leyenda: podemos mantener el actual, pero confirmar interpretación.

> Sin esta geometría, una variable **nueva** no puede pintarse en el mapa (solo aparece en el menú). El toggle "ver en mapa" ya está conectado para las que tienen datos.

---

## 3. Catálogo definitivo de variables

Lista completa (61 ponderadas + 30 informativas + 4 características) con TODOS estos
campos por variable. **Seam:** `src/app/Utils/variables/variablesCatalog.ts`
(+ `variableDetails.ts` para el detalle, `variableWeights.ts` para el peso).

Por variable (una fila):
| Campo | Ejemplo / notas |
|---|---|
| `masterId` | `TEC-004-T` (id con el que viene en la master) |
| `slug` (id UI) | `wpd` (estable; si no lo definen, lo mantenemos nosotros) |
| dimensión | tecnica / ambiental / social / macroeconomica / regulatoria |
| criterio · subcriterio | "Recurso eólico" · (opcional) |
| label | "Densidad de potencia WPD" |
| **descripción** | qué es |
| **cómo se calcula** | fórmula/tratamiento (hoy es texto derivado template) |
| **fuente** | IDEAM / GWA / IGAC … |
| **relevancia** | por qué importa / cómo afecta la idoneidad |
| **rango e interpretación** | p.ej. "0–200 W/m² = Poor … >800 = Superb"; a mayor, mejor/peor |
| **tipo** | excluyente / mínimo-viable / penalizante / informativa |
| **peso (AHP)** | ver §4 — hoy placeholder `weightFor` |
| `enMapa` | ¿se representa en el mapa? (→ §2) |
| `aplicaEn` | mar / tierra / ambos |
| polaridad | ¿suma o resta idoneidad? (signo del peso) |
| unidad | m/s, W/m², km, índice… |
| vigencia/fecha | versión del dato (→ §8) |

---

## 4. Modelo multicriterio — fórmulas y pesos

Confirmar el modelo real (hoy: WLC/AHP template).

- **Normalización** de cada variable a escala común (0–1): función/rangos por variable (min-max, categórica, etc.).
- **Score de dimensión** (WLC):
  `score_dim = Σ(peso_i · valor_norm_i) / Σ peso_i` — necesitamos los **pesos AHP por variable** reales.
- **Score general**:
  `índice = Σ(peso_dim · score_dim)` — necesitamos los **pesos por dimensión** (¿iguales? ¿AHP?). Hoy el front asume promedio (peso igual por dimensión).
- **Excluyentes (máscara)**: qué variables actúan como regla dura 0/1 y cómo marcan `tipo_celda="excluida"` (§1.3).
- **Penalizantes**: cómo se aplican (criterio adicional en la suma vs. factor multiplicativo).
- ¿Validación TOPSIS / análisis de sensibilidad se expone en la API o es interno?

> Si el score ya viene calculado en la master (`score_general`/`scores`), igual necesitamos los **pesos y la fórmula** para mostrarlos en la sección "Resumen del cálculo" del informe (trazabilidad).

---

## 5. Dimensión económica — modal "Escenarios de mercado"

Hoy la proyección es una serie **determinista template** (`economicSeries`).
**Seam:** `src/app/Utils/economic/economicScenarios.ts`.

Necesitamos:
- **Escenarios** (nombre, descripción, horizonte en años). Ej: Base / Optimista / Conservador — o los que defina D. Técnica/Macro. **Seam:** `ECONOMIC_SCENARIOS` / admin `/api/admin/catalog/escenarios`.
- **Variables económicas** y su **serie proyectada por año y por escenario**: PIB, PIB per cápita, IPC, desempleo, tasa de cambio, **precio spot (COP/kWh)**, **demanda (kWh)**, **oferta (kWh)**. Formato:
  ```jsonc
  { "escenario": "base", "variable": "precio-spot", "serie": [ {"year": 2025, "value": 280}, ... ] }
  ```
- **Efecto de la capacidad nominal**: hoy escalamos linealmente (20 MW = 1×). Confirmar **cómo escala** cada variable con la capacidad del proyecto (y qué variables sí/no escalan — p.ej. PIB nacional no escala, energía sí).
- **Impuestos / incentivos clave** reales (Ley 1715, IVA, aranceles, depreciación…): valores/porcentajes vigentes. **Seam:** `IMPUESTOS_CLAVE` en `Report.tsx`.
- (Ref. que nos dieron: gráficas tipo Banco Mundial.)

---

## 6. Alerta área vs capacidad nominal (intervalos)

Rango **[área mínima, área máxima] en km² por cada capacidad nominal (MW)**,
definido con **D. Técnica**. Hoy se deriva de la densidad por turbina (template).
**Seam:** `areaRangeForCapacity` en `src/app/Utils/projectData.ts`.

Formato pedido:
```jsonc
[
  { "capacidadMW": 10,  "areaMinKm2": ?, "areaMaxKm2": ? },
  { "capacidadMW": 20,  "areaMinKm2": ?, "areaMaxKm2": ? },
  { "capacidadMW": 50,  "areaMinKm2": ?, "areaMaxKm2": ? },
  { "capacidadMW": 100, "areaMinKm2": ?, "areaMaxKm2": ? }
]
```
(o una fórmula min/max en función de MW). La alerta amber salta si el área
seleccionada cae fuera de ese rango.

---

## 7. Número de aerogeneradores — fórmula y parámetros

Hoy: `nº = floor(área_km² / área_por_aerogenerador)` (mín 1), por categoría S/M/L.
**Seam:** `AEROGENERADORES` + `calcNumAerogeneradores` en `projectData.ts`.

Necesitamos por categoría (S/M/L) los valores **reales**:
| Categoría | potencia (MW) | área por aerogenerador (km²) | espaciamiento (m) |
|---|---|---|---|
| S | ? | ? | ? |
| M | ? | ? | ? |
| L | ? | ? | ? |
- Confirmar la **fórmula** (¿floor por área? ¿por espaciamiento/rotor? ¿tope por capacidad?).

---

## 8. Tabla de variables consideradas (informe) — valores para mostrar

Para cada variable en la tabla del informe (por dimensión):
- **Peso** (→ §4) · **Fuente** (→ §9) · **Valor** = *promedio del valor de la variable sobre los hexágonos del área* (sale de `variables` de la master, §1.2) · **Fecha/vigencia** del dato.
- **Fórmula del score de dimensión** para "Resumen del cálculo": `score_dim = Σ(peso·valor)/Σpeso` con los pesos reales (§4).
- La **tabla cruda por hexágono** (export admin) ya usa `variables` de la master directamente; solo depende de §1.2.

---

## 9. Regulatoria (normas) y fuentes

- **Normas**: lista con `nombre`, `descripción`, `estado` (Aplica / Requiere trámite / Requiere verificación / No aplica), + **autoridades competentes** e **información normativa**. **Seam:** `regulatoryNorms.ts` / admin `/api/admin/catalog/normas`.
- **Fuentes de datos**: por fuente, **versión** y **URL** oficial (para la tabla de fuentes + la columna "Fecha"). **Seam:** `REPORT_SOURCE_LINKS` en `reportSources.ts`.

---

## Resumen de preguntas críticas (bloquean lo demás)
1. Formato exacto de la clave de variable en el parquet (`TEC-004-T` vs `TEC_004`) y si el valor es 0–1 o crudo (o ambos). (§1.2)
2. Nombre real de la columna offshore/onshore. (§1.4)
3. Pesos AHP por variable y por dimensión + normalización. (§4)
4. Geometría (lista de h3 / polígonos) de las variables que van al mapa. (§2)
5. Rangos área↔capacidad y specs por categoría de aerogenerador. (§6, §7)
