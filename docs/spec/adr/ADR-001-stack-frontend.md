---
id: ADR-001
title: Stack Frontend
status: propuesto
date: 2026-03-24
---

# ADR-001: Stack Frontend

## Contexto

Vento necesita renderizar ~4,500-31,000 hexágonos H3 sobre un mapa de Colombia con mapa de calor interactivo, popups y filtrado por variables. El documento original menciona "tal vez Angular" como tecnología considerada.

## Opciones Evaluadas

| Criterio | Angular + Leaflet | React + Deck.gl | React + MapLibre GL |
|----------|-------------------|------------------|----------------------|
| Rendering ~5K-30K hexágonos | ✅ Suficiente (Canvas/SVG) | ✅ Excelente (WebGL) | ✅ Muy bueno (WebGL) |
| Soporte H3 | Plugin disponible | Nativo (H3HexagonLayer) | Requiere capa custom |
| Mapa de calor dinámico | ✅ Plugins maduros | ✅ HeatmapLayer GPU | ✅ Expressions |
| Complejidad | Baja-Media | Media-Alta | Media |
| Ecosistema | Maduro | Muy grande | Creciente |

## Decisión

**Angular 17+ o React + Leaflet** (decisión final según experiencia del equipo).

## Justificación

- A resolución H3 nivel zonal (res 5-6), **no se requiere WebGL pesado**. Leaflet con Canvas renderer maneja ~30K polígonos sin problema
- Deck.gl es sobredimensionado para esta cantidad de hexágonos
- Leaflet tiene ecosistema maduro de plugins para mapas interactivos, popups, y capas
- Angular o React son ambos viables — la decisión depende de la experiencia del equipo disponible

## Consecuencias

- Si en el futuro se necesita resolución más alta (res 7+, >200K hexágonos), habría que migrar a WebGL (Deck.gl o MapLibre)
- El plugin H3 para Leaflet debe validarse con datos reales en Semana 1 (spike/PoC)
