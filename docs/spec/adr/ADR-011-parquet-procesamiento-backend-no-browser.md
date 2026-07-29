---
id: ADR-011
title: Procesamiento de .h3.parquet en Backend — No en Browser
status: aceptado
date: 2026-04-20
---

# ADR-011: Procesamiento de `.h3.parquet` en Backend — No en Browser

## Contexto

[tecnologias.md §6](../architecture/tecnologias.md) evaluó como alternativa **leer `.parquet` directamente en el navegador** con:
- `apache-arrow` (JS) o `parquet-wasm`
- `hyparquet` (librería liviana JS)

La idea era eliminar el paso de pre-procesamiento y servir el `.parquet` crudo como asset estático.

Se hizo PoC con **hyparquet** — código en [Vento/src/app/Utils/parseH3Parquet.ts](../../Vento/src/app/Utils/parseH3Parquet.ts) (deshabilitado actualmente).

Tras la migración a arquitectura tile-based (ADR-008), la decisión cambió: **el parsing se hace en el backend FastAPI**.

## Decisión

**El backend FastAPI es el único responsable de leer y servir los datos de `.h3.parquet`.** El frontend **nunca** recibe el `.parquet` crudo — solo recibe tiles JSON pre-indexados vía endpoints.

El código `parseH3Parquet.ts` queda como referencia histórica, deshabilitado, con comentario indicando que no debe usarse.

## Razones

1. **Tamaño del archivo**: el `.parquet` con scores completos de Colombia a resolución H3 7-8 puede pesar 50-500 MB. Enviarlo al browser:
   - Rompe experiencia móvil (carga lenta, consumo de datos)
   - Supera límites de cache del service worker en algunos navegadores
   - Impide actualizar datos sin redeploy (todo el archivo se cachea en browser)
2. **Memoria del browser**: hyparquet en PoC tuvo spikes de memoria >1GB con archivos grandes. Inaceptable para tablets o equipos modestos.
3. **Paralelismo real**: FastAPI con `uvicorn --workers 4` paraleliza peticiones de tiles. El browser single-threaded no puede.
4. **Arquitectura tile-based (ADR-008)**: el modelo es "pide solo lo que ves, cuando lo ves". Parsing en browser contradice esta premisa — obligaría a leer todo el `.parquet` para extraer un tile.
5. **Preparación para RBAC de datos**: en el futuro, ciertos datos pueden requerir autorización (variables sensibles, datos comerciales). Mantenerlos server-side permite filtrar por rol. Browser parsing no permite esto.
6. **Reutilización Python ↔ Python**: el equipo de investigación entrega `.parquet`. Ya usan Python (GeoPandas, H3-py, Pandas). FastAPI comparte ecosistema — cero fricción de integración.

## Alternativas consideradas

### Opción A: Parsing en browser con hyparquet
- ❌ Rechazada — ver §razones 1-5

### Opción B: Parsing en browser con parquet-wasm
- ❌ Rechazada — mismos problemas que hyparquet, con peor madurez y mayor bundle size.

### Opción C: Pre-proceso a JSON estático servido como asset
- ⚠️ Considerada — simple pero ineficiente:
  - Para dataset completo de Colombia a res 7, el JSON puede ser 10x más pesado que el Parquet
  - Sin paginación natural (tiles)
  - Obliga a recrear y redeploy todo el JSON cada actualización
- ❌ Rechazada por ineficiencia.

### Opción D: Parsing en backend FastAPI + servir tiles JSON ✅
- ✅ **Aceptada**
- Parsing ocurre una vez al arranque del contenedor (caché en memoria)
- Tiles JSON pequeños (~100KB por tile a res alto) se sirven bajo demanda
- Fácil de escalar horizontalmente si hace falta

## Consecuencias

### Positivas
- Browser queda liviano — solo renderiza.
- Actualización de datos = reemplazar `.parquet` en el servidor + reinicio backend. Sin redeploy frontend.
- Cache fácil: TileLayer DeckGL + HTTP Cache-Control del backend.
- Escalabilidad: si necesitamos servir más tiles, agregamos réplicas del backend.

### Negativas
- Requiere backend siempre corriendo para que el mapa tenga datos. Si el backend cae, el mapa queda vacío (aunque UI funciona).
- El código `parseH3Parquet.ts` queda como "código muerto" que puede confundir a nuevos devs. Mitigación: comentario explícito en el archivo + este ADR como referencia.

### Riesgos
- Si el backend FastAPI se vuelve cuello de botella, migrar a servir tiles pre-generados como archivos estáticos en S3 / Supabase Storage (opción futura).

## Items relacionados

- [ADR-008 Arquitectura Tile-based](ADR-008-arquitectura-tile-based.md) — contexto de por qué tile-based ganó
- [frontend-backend-integration.md §8](../../architecture/frontend-backend-integration.md) — diagrama del flujo de datos
- [parseH3Parquet.ts](../../../Vento/src/app/Utils/parseH3Parquet.ts) — código histórico deshabilitado
- [h3-data-pipeline.md](../../dev-notes/h3-data-pipeline.md) — detalle técnico del pipeline

## Acción pendiente

Añadir comentario al head de [parseH3Parquet.ts](../../../Vento/src/app/Utils/parseH3Parquet.ts) explicando por qué está deshabilitado, referenciando este ADR. Tiempo: 5 min (cuando se toque el archivo).

---

**Aceptado por**: mavalan Software.
**Próxima revisión**: si el volumen de datos baja drásticamente (<10 MB) o si el backend se vuelve cuello de botella.
