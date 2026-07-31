---
id: ADR-001
title: Stack Frontend
status: aceptado
date: 2026-03-26
supersedes: propuesta original (Angular/React + Leaflet)
---

# ADR-001: Stack Frontend

## Contexto

Vento necesita renderizar ~4,500-31,000 hexágonos H3 sobre un mapa de Colombia con mapa de calor interactivo, popups y filtrado por variables. La app requiere autenticación, múltiples vistas (login, dashboard, mapa, dimensiones, admin) y API routes para servir datos. Se evaluó la escalabilidad a futuro (res 7+, reportes, MCDM) como criterio clave.

## Opciones Evaluadas

| Criterio | Angular + Leaflet | Vite + React + Leaflet | Next.js + React + Deck.gl |
|----------|-------------------|------------------------|---------------------------|
| Rendering ~5K-30K hex. | ✅ Suficiente (Canvas) | ✅ Suficiente (Canvas) | ✅ Excelente (WebGL) |
| Escala a res 7+ (>200K hex.) | ❌ Migración necesaria | ❌ Migración necesaria | ✅ Nativo, sin cambios |
| Soporte H3 | Plugin disponible | Plugin disponible | Nativo (H3HexagonLayer) |
| Mapa de calor dinámico | ✅ Plugins maduros | ✅ Plugins maduros | ✅ HeatmapLayer GPU |
| Server Components | ❌ No existe | ❌ No existe | ✅ RSC + prefetch datos |
| API Routes integradas | ❌ Necesita backend separado | ❌ Necesita backend separado | ✅ src/app/api/ nativo |
| Layouts + Loading states | Manual | Manual | ✅ Nativo por ruta |
| SEO (futuro: reportes públicos) | ❌ SPA | ❌ SPA | ✅ SSR/SSG |
| React Compiler | ❌ No | ✅ Sí | ✅ Sí, nativo en Next.js 15+ |
| Complejidad | Baja-Media | Baja | Media |

## Decisión

**Next.js 16 (App Router) + React 19 + Deck.gl + MapLibre GL + h3-js**

## Justificación

- **Deck.gl** tiene H3HexagonLayer nativo — no requiere plugins externos ni conversión a GeoJSON. Escala a resoluciones más altas sin cambiar de stack
- **Next.js App Router** unifica frontend y API routes en un solo proyecto (`src/app/api/`), eliminando la necesidad de un backend separado o monorepo multi-app
- **Server Components** permiten prefetch de datos (scores, variables, metadata) en servidor y pasarlos como props al mapa — sin cascada de useEffect en cliente
- **React Compiler** (habilitado) memoiza automáticamente componentes — crítico para re-renders frecuentes al cambiar filtros/variables del mapa
- **MapLibre GL** provee tiles base open-source sin API key (vs Mapbox que requiere token)
- **Vite + Leaflet** fue descartado porque Leaflet es 100% client-side sin beneficio de RSC, y requeriría migración a WebGL si se sube la resolución H3

## Stack Final

| Lib | Versión | Rol |
|-----|---------|-----|
| Next.js | 16.x | Framework (App Router + API Routes) |
| React | 19.x | UI + React Compiler |
| deck.gl | 9.x | Renderizado WebGL hexágonos H3 |
| react-map-gl | 8.x | Wrapper mapa base |
| maplibre-gl | 5.x | Tiles OSM sin API key |
| h3-js | 4.x | Cálculos H3 en cliente |
| Zustand | — | Estado cliente (filtros, selección) |
| TanStack Query | — | Estado servidor (cache, fetch) |
| Tailwind CSS | 4.x | Estilos |
| ESLint | 9.x | Linting |

## Consecuencias

- Leaflet queda descartado — deck.gl lo reemplaza completamente
- No se necesita Docker para desarrollo (Next.js incluye servidor dev)
- No se necesita Turborepo (un solo proyecto Next.js)
- Los componentes del mapa deben ser `"use client"` (deck.gl es WebGL client-side) pero el layout y data fetching pueden ser Server Components
- Keycloak se integra via next-auth (OIDC provider)
