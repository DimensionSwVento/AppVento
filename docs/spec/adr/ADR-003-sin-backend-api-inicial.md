---
id: ADR-003
title: Sin Backend API en Primera Entrega
status: supersedido-parcialmente
date: 2026-03-24
superseded_by: ADR-007
---

> **⚠️ SUPERSEDIDO PARCIALMENTE por ADR-007:** Se decidió que SÍ habrá backend en primera entrega con Clean Architecture + DDD. Keycloak (ADR-005) asume la autenticación. Este ADR se mantiene como referencia histórica de la decisión original.

# ADR-003: Sin Backend API en Primera Entrega

## Contexto

El equipo NO es responsable del modelo multicriterio. Los datos llegan como archivos `.h3.parquet` generados por el equipo de investigación, con columnas de variables, scores, tipos de celda y metadata asociados a un `h3_index`.

Con un equipo de 1 dev fulltime + 2 part-time y 1 mes de plazo, construir un backend API (FastAPI) además del frontend es un riesgo al scope.

## Decisión

**No construir backend API (FastAPI) en la primera entrega.** El frontend consume los datos .parquet directamente.

## Alternativas para Consumo de Datos en Frontend

1. **Pre-procesamiento:** Script que convierte .h3.parquet → JSON/GeoJSON estático servido como asset
2. **Lectura directa en browser:** Librería como `parquet-wasm` o `apache-arrow-js` para leer .parquet en el navegador
3. **Carga desde PostgreSQL:** Si los datos ya están en PostGIS, queries directos desde el frontend vía servicio ligero

**Recomendación:** Opción 1 (pre-proceso a JSON estático) para la primera entrega por simplicidad. A la resolución H3 actual, el JSON completo de Colombia es viable como archivo estático.

## Justificación

- Reduce complejidad del primer entregable significativamente
- El equipo se concentra en el producto visible: mapa + login + admin
- Backend API se implementa en sprints futuros cuando sea necesario (reportes, histórico, más datos)
- Los datos .parquet cambian con baja frecuencia (cuando el equipo de investigación genera nueva versión)

## Consecuencias

- Sin API REST, features como generación de reportes dinámicos y histórico quedan para sprints futuros
- Actualizar datos requiere re-ejecutar el script de pre-procesamiento y re-desplegar
- Cuando se necesite el backend, se implementará FastAPI con los endpoints ya diseñados en la arquitectura
