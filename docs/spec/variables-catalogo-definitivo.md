---
version: 1.0
date: 2026-07-29
audience: devs · equipo datos · PM
scope: Catálogo DEFINITIVO de variables/dimensiones (Excel del cliente, 3 hojas)
maintainer: mavalan Software
---

# Catálogo definitivo de variables — Vento

> Fuente: Excel del cliente (3 hojas). Reemplaza a los placeholders de
> `Vento/src/app/Utils/variables/variablesCatalog.ts` y a `dimensionHexScore`
> cuando se conecte la master. Estructura: `Dimensión → Criterio → Subcriterio → Variable`.

## Resumen
- **Tabla 1 — `Variables_conPesoModelo`**: 61 variables ponderadas (puntúan) en 4 dimensiones (Ambiental, Técnica, Social, Macroeconómica).
- **Tabla 2 — `Características`**: 4 parámetros de configuración (no puntúan): tipo tecnología offshore, capacidad nominal, tamaño (derivado), tipo de aerogeneradores (sugerido).
- **Tabla 3 — `Informativas`**: 30 variables solo-visualización (no pesan) en 4 dimensiones + Regulatoria pendiente.

---

## TABLA 1 — Variables ponderadas del modelo (61)

### AMBIENTAL
Medio natural, biótico y abiótico afectable por infraestructura eólica.
- **Bióticas → Especies bióticas**: Especies endémicas (AMB-005-A, Von Humboldt) · migratorias (AMB-003-A, GBIF) · marinas IUCN (AMB-019-A, GBIF) · aves IUCN (AMB-017-A, GBIF) · murciélagos IUCN (AMB-042-A, GBIF) · congregación aves playeras (AMB-038-A, IGAC) · pastos marinos (AMB-020-A, INVEMAR).
- **Bióticas → Áreas protegidas** *(todas en mapa)*: Zonas reproducción aves (AMB-034-A, IGAC) · Áreas clave biodiversidad (AMB-033-A, s/fuente) · Humedales RAMSAR (AMB-012-A, s/fuente) · Áreas coralinas (AMB-021-A, INVEMAR) · Playas anidación tortugas (AMB-036-A, INVEMAR).
- **Abióticas → Amenazas**: Riesgo físico relativo (TEC-015/AMB-040, UNGRD) · Amenaza volcánica (TEC-016).
- **Abióticas → Geológicas/geotécnicas**: Uso/cobertura suelo Corine (AMB-006-A, IGAC) · Fallas y sismicidad (AMB-031-A, IGAC) · Batimetría cimentación offshore (AMB-030-A, NOAA) · Pendiente (AMB-007-A, propia) · Litología/fondos marinos (AMB-028-A, INVEMAR) · Elevación (AMB-008-A, NASA).

### TÉCNICA
- **Recurso eólico**: Densidad de potencia WPD (TEC-004-T).
- **Infraestructura y red** *(las 3 en mapa)*: Distancia a nodos de conexión SIN (TEC-023-T, m) · Distancia a infraestructura vial (TEC-032-T, escala 1–5) · Distancia a infraestructura portuaria (TEC-031-T, m).

### SOCIAL
- **Económico (SOE-)**: Distancia a atractivo turístico (SOE-001) · Tiempo a centro poblado ≥50k hab (SOE-002) · Pobreza multidimensional (SOE-003) · Analfabetismo (SOE-004) · Pobreza energética (SOE-005) · Instrumentos de ordenamiento territorial IOT (SOE-006).
- **Social (SOC-)**:
  - *Vulnerabilidad social (8)*: desocupados (SOC-001-SE) · proyección densidad poblacional (SOC-002-S) · dist. viviendas a urbanos (SOC-007-S) · IPM (SOC-008-SE) · analfabetismo (SOC-012-S) · hogares/municipio (SOC-034-S) · pobreza monetaria (SOC-035-SE) · tipología territorial (SOC-036-SE).
  - *Brecha energética (3)*: tarifa energía (SOC-010-TSE) · IPM energética (SOC-038-TSE) · zona no interconectada (SOC-009-TS).
  - *Seguridad/conflicto (5)*: grupos beligerantes (SOC-011-S) · cultivos coca (SOC-015-SR) · minería ilegal (SOC-018-AE) · reclutamiento menores (SOC-031-S) · incidencia delictiva (SOC-041-S).
  - *Gobernanza/riesgo político (2)*: desempeño institucional (SOC-023-SER) · tipología territorial (SOC-036-SE).
  - *Étnico/territorial (5)*: resguardos indígenas (SOC-013-SR, **en mapa**) · reserva campesina (SOC-016-SR) · comunidades negras (SOC-032-S) · ZOMAC (SOC-039-SR) · PDET (SOC-040-SER).

### MACROECONÓMICA (sin IDs)
- **Proyecciones → General**: PIB · PIB per cápita · IPC · Desempleo · Tasa de cambio COP-USD.
- **Proyecciones → Sector energético**: Precio spot (COP/kWh) · Demanda energía (kWh) · Oferta energía (kWh).

---

## TABLA 2 — Características (4, no puntúan)
1. **Tipo de tecnología offshore** — derivado del área: flotante/fija (profundidad <100 m hay opción; resto flotante). onshore=tierra, offshore=mar; **se delimita automáticamente**, el usuario no lo altera.
2. **Capacidad nominal (MW)** — ingresada por el usuario; habilita/deshabilita tipos de turbina.
3. **Tamaño** — derivado de la capacidad (no seleccionable): pequeño <1 MW · mediano 1–20 MW · grande >20 MW. Mensaje informativo.
4. **Tipo de aerogeneradores** — sugerido por capacidad: pequeña 1–100 kW · mediana 100 kW–1 MW · grande 1 MW+. ⚠️ pendiente: cálculo de nº de aerogeneradores por hex H3.

---

## TABLA 3 — Informativas (30, solo visualización)
- **Técnica (4)**: Velocidad viento media anual (TEC-001-T, alturas 10/50/100/150/200 m, **mapa**) · Densidad de viento (TEC-002-T, **mapa**) · Turbulencia (TEC-005-TE, clases IEC) · AEP (NA, calculado por Weibull+densidad+perfiles).
- **Social (19)**: propias → Diversidad religiosa (SOC-024-S) · Inclinaciones políticas (SOC-005-S) · Riesgo electoral (SOC-004-SR). + 16 repetidas de Tabla 1 (SOC-001/002/007/008/035/010/038/009/011/015/018/041/023/013/016/032).
- **Macroeconómica (1)**: Proyección precio spot (NA, serie de tiempo 10 años, sin mapa).
- **Ambiental (6)**: Uso/cobertura suelo (AMB-006) · Congregación aves playeras (AMB-038-A) · Zonas reproducción aves (AMB-034-A) · Amenazas volcánicas (s/ID) · Elevación (AMB-008-A) · Batimetría (AMB-030-A).
- **Regulatoria**: declarada pero **sin variables** ("Falta"). ⚠️ pendiente.

*Ideas de visualización:* panel lateral desplegable; escalas de color por cuantiles (ref. Mapa Social de Prosperidad Social); velocidad/densidad como heatmap + valor promedio del polígono con selector de altura de buje; turbulencia categórica; AEP y macro como valores/series en el informe.

---

## Vacíos y cruces a resolver (del cliente)
1. **Regulatoria sin contenido** (ni modelo ni informativas).
2. **IDs faltantes**: 8 macroeconómicas, "Amenazas volcánicas", y sin fuente: "Áreas clave biodiversidad" / "Humedales RAMSAR".
3. **Analfabetismo duplicado**: SOE-004 y SOC-012-S.
4. **Tipología territorial (SOC-036-SE)** en 2 subcriterios → posible doble peso.
5. **16 variables sociales** están como ponderadas Y como informativas → definir si se muestran dos veces o el mismo dato cumple ambos roles.
6. **"Variables abióticas"** sin definición corta.
7. **Solo 9 variables marcadas para mapa**: 5 áreas protegidas + 3 infraestructura + resguardos indígenas.

---

## Mapeo a lo que hay hoy en el código (para la migración)
- El front hoy usa dimensiones: `ambiental · tecnica · economica · socioeconomica(→"Social") · regulatoria`. La master define **Ambiental · Técnica · Social · Macroeconómica** (+ Regulatoria pendiente). Hay que **reconciliar** las dimensiones (aparece Macroeconómica; "económica" y "socioeconómica" del front se funden en "Social" con subcriterios Económico/Social).
- Variables informativas del mapa (nodos, viento, distancias) ya pedidas en Sprint 3 → salen de TEC-001/002/023/031/032.
- `dimensionHexScore` (placeholder) y `variablesCatalog.ts` se reemplazan por esta estructura cuando llegue la master (`.h3.parquet` + columnas por ID).
