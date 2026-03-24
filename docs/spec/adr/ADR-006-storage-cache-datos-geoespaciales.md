---
id: ADR-006
title: Storage, Cache y Entrega de Datos Geoespaciales
status: pendiente-decision-equipo
date: 2026-03-24
---

# ADR-006: Storage, Cache y Entrega de Datos Geoespaciales

## Contexto

Vento consume datos geoespaciales generados por el motor multicriterio del cliente. Actualmente estos datos llegan como archivos `.h3.parquet` y se pre-procesan a JSON/GeoJSON estático. Hay dos preguntas arquitectónicas clave:

1. **¿Dónde vive el JSON/H3 generado?** (S3/CDN, servidor propio, empaquetado como asset)
2. **¿Se necesita cache en el frontend para pre-cargar el mapa?**

Ambas dependen de una **pregunta clave que debe decidirse con el equipo y el cliente:**

> **¿Los datos seguirán recibiéndose como archivos (.parquet) indefinidamente, o se podrán normalizar como API/BD en el futuro?**

El motor multicriterio es del cliente, ejecutado offline. El cliente define el formato de salida. Esta decisión impacta toda la estrategia de datos.

## Decisión

**Decisión diferida — llevar a reunión con el cliente y equipo.**

### Lo que SÍ se decide ahora (primera entrega):

**Cache en frontend:**
- Implementar Service Worker para cache de datos geoespaciales en el navegador
- HTTP Cache con headers `Cache-Control` y `ETag` para versionado
- Versionado de archivos con hash: `hexagons-{hash}.json`
- Indicador de progreso durante carga inicial del mapa

**Storage temporal (primera entrega):**
- JSON/GeoJSON como asset estático del frontend (empaquetado en build o servido desde ruta estática del backend)
- Suficiente para validar el producto con datos reales

### Lo que se decide con el equipo y cliente:

| Escenario | Si archivos para siempre | Si se normaliza a API/BD |
|-----------|--------------------------|--------------------------|
| Storage | S3 + CDN (CloudFront/Cloudflare) | PostgreSQL + PostGIS + H3 |
| Entrega | CDN sirve JSON versionado | API REST sirve datos filtrados |
| Cache | Service Worker + CDN edge | Service Worker + HTTP cache API |
| Actualización | Re-subir archivo a S3 | Pipeline ingesta a BD |
| Ventaja | Simple, económico, CDN distribuye | Filtrado server-side, queries dinámicos |
| Desventaja | Sin filtrado server-side, JSON completo | Más infra, más complejidad |

## Pregunta para Reunión con Cliente

> "El motor multicriterio genera .h3.parquet offline. ¿Hay posibilidad de que en el futuro el motor exponga los resultados vía API o base de datos compartida, o el formato de entrega siempre será archivo?"

**Contexto conocido:** El equipo del cliente ha mencionado que **podría ser API** en el futuro. Esta pregunta debe formalizarse en la próxima reunión.

---

## Análisis Comparativo: Archivos para Siempre vs. API/BD

### Escenario A: Archivos para Siempre (.parquet → JSON → S3/CDN)

```
Cliente genera .h3.parquet (offline)
        ↓
Script Python pre-procesa → hexagons-v{hash}.json
        ↓
Se sube a S3 (Supabase Storage o AWS S3)
        ↓
CDN (Vercel Edge / CloudFront) distribuye
        ↓
Frontend carga JSON completo + Service Worker cache
```

**Pros:**

| Pro | Detalle |
|-----|---------|
| **Simplicidad operativa** | No hay que diseñar esquema BD para datos geoespaciales, ni migraciones, ni ORM geoespacial |
| **Costo casi cero** | S3 + CDN para archivos de 5-15MB cuesta centavos/mes. Supabase Storage: 1GB gratis. Vercel: 100GB bandwidth gratis |
| **Latencia mínima** | CDN edge sirve desde nodo cercano al usuario en Colombia — más rápido que un query a BD |
| **Desacoplamiento total** | El equipo de datos genera archivos, los sube, listo. No necesitan saber nada del backend |
| **Versionado natural** | Cada archivo es una versión inmutable. Rollback = apuntar al archivo anterior |
| **Sin estado server-side** | El backend no necesita procesar datos geoespaciales — solo sirve el archivo |
| **Escalabilidad infinita** | CDN escala horizontalmente sin configuración. 1 usuario o 10,000 = mismo costo |

**Contras:**

| Contra | Detalle |
|--------|---------|
| **Sin filtrado server-side** | El frontend recibe TODOS los ~31K hexágonos siempre. No puede pedir "solo departamento X" |
| **Payload pesado** | 5-15MB por carga completa (mitigado con cache, pero primera carga es lenta en conexiones lentas) |
| **Sin queries dinámicos** | No se puede hacer "dame los top 100 hexágonos por score técnico" sin cargar todo |
| **Actualización manual** | Cada nueva versión del .parquet requiere re-ejecutar script + re-subir a S3 |
| **Sin historial en BD** | No se pueden comparar versiones de datos en el tiempo desde la BD |
| **Limitado para features futuras** | Reportes dinámicos, filtrado por dimensión server-side, análisis comparativo requieren datos en BD |

---

### Escenario B: Datos en BD (PostgreSQL + PostGIS + H3) + API Propia

```
Cliente genera .h3.parquet (offline)
        ↓
Pipeline de ingesta: Python lee .parquet → INSERT en PostgreSQL + PostGIS
        ↓
Backend (API) expone endpoints:
  GET /hexagons                    → todos (paginado)
  GET /hexagons?departamento=X     → filtrado geográfico
  GET /hexagons?dim=tecnica&min=0.7 → filtrado por score
  GET /hexagons/:h3_index          → detalle individual
        ↓
Frontend consume API → renderiza solo lo necesario
```

**Pros:**

| Pro | Detalle |
|-----|---------|
| **Filtrado server-side** | El usuario puede pedir solo hexágonos de una región, dimensión o rango de score |
| **Queries geoespaciales nativos** | PostGIS + H3-pg permiten: "hexágonos dentro de radio X km", intersecciones, vecinos |
| **Payload optimizado** | API devuelve solo lo necesario — no 31K hexágonos cada vez |
| **Historial y versionado** | Cada ingesta se puede versionar en BD. Comparar datos entre versiones |
| **Features futuras habilitadas** | Reportes dinámicos, análisis de sensibilidad, filtrado por dimensión — todo con queries |
| **Paginación y lazy loading** | API controla cuántos datos envía — ideal para conexiones lentas |
| **Trazabilidad y auditoría** | Quién consultó qué, cuándo — requerido para software gubernamental |

**Contras:**

| Contra | Detalle |
|--------|---------|
| **Mayor complejidad** | Diseñar esquema BD geoespacial, pipeline de ingesta, endpoints, ORM/queries |
| **Latencia de queries** | Un query a PostGIS con 31K registros + geometrías puede tomar 200-500ms vs. CDN ~50ms |
| **Costo de infraestructura** | PostgreSQL necesita servidor siempre activo (mitigado con Supabase free tier) |
| **Pipeline de ingesta** | Hay que construir y mantener el proceso de carga .parquet → BD |
| **Dependencia BD** | Si la BD cae, no hay mapa. Con archivos estáticos + cache, el usuario puede seguir con datos cacheados |
| **Overhead para primera entrega** | Más trabajo inicial — esquema, migraciones, endpoints, tests |

---

## Escenario Híbrido (Recomendado para evaluación)

Es posible combinar ambos enfoques:

```
.h3.parquet → Ingesta a PostgreSQL (fuente de verdad)
                    ↓
          API genera JSON estático versionado
                    ↓
          Se sube a S3/CDN (para carga rápida del mapa completo)
                    ↓
          Frontend: carga inicial desde CDN + queries a API para filtros avanzados
```

**Ventajas del híbrido:**
- Carga inicial rápida (CDN) + filtrado dinámico (API)
- BD como fuente de verdad con historial
- CDN como cache distribuido para el caso común (ver mapa completo)
- API para features avanzadas (filtrado, reportes, análisis)

---

## Plataformas de Infraestructura Evaluadas

### Supabase (PostgreSQL + Storage + Auth)

| Aspecto | Detalle |
|---------|---------|
| **Qué ofrece** | PostgreSQL gestionado + Storage (S3 compatible) + Auth + Realtime + Edge Functions |
| **Free tier** | 500MB BD, 1GB Storage, 2GB bandwidth, 50K auth users, 500K edge function invocations |
| **PostGIS** | ✅ Soportado nativamente — se habilita como extensión |
| **H3-pg** | ✅ Disponible como extensión en Supabase |
| **Storage** | Compatible S3 — se puede subir JSON geoespacial directamente |
| **API auto-generada** | PostgREST genera API REST automática desde tablas — útil para prototipado rápido |
| **Auth** | Incluye auth propio, pero usaríamos Keycloak (ADR-005) — Supabase Auth se desactiva |
| **Escalabilidad** | Pro plan $25/mes cuando se supere free tier |
| **Ideal para Vento** | ✅ BD + Storage en una sola plataforma. Free tier cubre primera entrega y pruebas. Escala a Pro si crece |

**Supabase cubre ambos escenarios:**
- **Escenario A (archivos):** Supabase Storage sirve JSONs estáticos como S3
- **Escenario B (BD):** PostgreSQL + PostGIS + H3-pg nativos

### Vercel (Frontend + API Serverless + CDN)

| Aspecto | Detalle |
|---------|---------|
| **Qué ofrece** | Hosting frontend + API Routes (serverless functions) + Edge Network (CDN global) + Dominio personalizado |
| **Free tier** | 100GB bandwidth, 100 horas serverless, builds ilimitados, previews por PR, dominio .vercel.app gratis |
| **Como CDN** | ✅ Edge Network global — sirve archivos estáticos con cache automático desde nodos cercanos al usuario |
| **Como API** | ✅ API Routes (serverless functions en Node.js/Python) — endpoints bajo el mismo dominio del frontend |
| **Integración** | Nativa con React/Next.js. Compatible con Angular/Vue via adaptadores |
| **CI/CD incluido** | Push a GitHub → build automático → deploy. Preview por cada PR |
| **Escalabilidad** | Pro plan $20/mes/miembro cuando se supere free tier |
| **Ideal para Vento** | ✅ Frontend + CDN + API ligera en un solo lugar. Deployments automáticos. Free tier generoso |

**Vercel cubre:**
- **CDN:** Archivos JSON geoespaciales servidos desde edge global — baja latencia en toda Colombia
- **API point:** Serverless functions como proxy al backend principal o como endpoints ligeros
- **Frontend hosting:** SPA desplegada con CI/CD automático

### Combinación Supabase + Vercel

```
┌─────────────────────────────────────────────────┐
│                   VERCEL                         │
│                                                  │
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  Frontend     │  │  API Routes (serverless) │  │
│  │  (React/Next) │  │  - proxy a Supabase     │  │
│  │  + CDN edge   │  │  - validación Keycloak  │  │
│  └──────┬───────┘  └───────────┬─────────────┘  │
└─────────┼──────────────────────┼────────────────┘
          │                      │
          │         ┌────────────▼────────────────┐
          │         │        SUPABASE              │
          │         │                              │
          │         │  ┌─────────────────────┐     │
          │         │  │ PostgreSQL + PostGIS │     │
          │         │  │ + H3-pg             │     │
          │         │  └─────────────────────┘     │
          │         │                              │
          │         │  ┌─────────────────────┐     │
          └─────────┼─►│ Storage (S3)        │     │
                    │  │ hexagons-v{hash}.json│     │
                    │  └─────────────────────┘     │
                    └──────────────────────────────┘

┌──────────────────────────┐
│  KEYCLOAK (Docker/Cloud) │
│  Proveedor de identidad  │
└──────────────────────────┘
```

| Aspecto | Detalle |
|---------|---------|
| **Costo primera entrega** | $0 — ambos free tiers cubren el volumen inicial |
| **Costo escalado** | ~$45/mes (Supabase Pro $25 + Vercel Pro $20) — económico para proyecto nacional |
| **Ventaja clave** | No hay que gestionar servidores, ni configurar nginx, ni mantener VMs |
| **BD + Storage** | Supabase unifica PostgreSQL + S3 en una plataforma |
| **CDN + Deploy** | Vercel unifica frontend + CDN + API serverless + CI/CD |
| **Keycloak** | Se despliega aparte (contenedor Docker en Railway, Render, o servidor propio) |

---

## Matriz de Decisión por Escenario

| Criterio | A: Archivos + S3/CDN | B: BD + API | Híbrido |
|----------|----------------------|-------------|---------|
| Complejidad primera entrega | 🟢 Baja | 🔴 Alta | 🟡 Media |
| Costo inicial | 🟢 $0 (Supabase Storage + Vercel CDN) | 🟢 $0 (Supabase BD free) | 🟢 $0 |
| Filtrado server-side | ❌ No | ✅ Sí | ✅ Sí |
| Latencia carga mapa | 🟢 ~50ms (CDN edge) | 🟡 ~200-500ms (query BD) | 🟢 ~50ms (CDN) + API para filtros |
| Features futuras | 🔴 Limitado | 🟢 Todo habilitado | 🟢 Todo habilitado |
| Payload al usuario | 🔴 5-15MB siempre | 🟢 Solo lo necesario | 🟢 Inicial CDN + filtros API |
| Historial de datos | ❌ No | ✅ Sí | ✅ Sí |
| Resiliencia (BD caída) | 🟢 CDN sigue sirviendo | 🔴 Sin mapa | 🟢 CDN fallback |
| Auditoría gubernamental | 🟡 Limitada | 🟢 Completa | 🟢 Completa |

## Pregunta para Reunión con Cliente

> "El motor multicriterio genera .h3.parquet offline. ¿Hay posibilidad de que en el futuro el motor exponga los resultados vía API o base de datos compartida, o el formato de entrega siempre será archivo?"

**Contexto conocido:** El equipo del cliente ha mencionado que **podría ser API** en el futuro. Esta pregunta debe formalizarse en la próxima reunión para tomar la decisión definitiva.

**Recomendación del equipo de arquitectura:** Si el cliente confirma que puede ser API, ir directo al **escenario híbrido** con Supabase (BD + Storage) + Vercel (CDN + frontend). Si siempre son archivos, el **escenario A** con Supabase Storage + Vercel CDN es la opción más pragmática.

---

## Justificación del Cache en Frontend

- Profesionales de todo el país acceden al sistema — la primera carga puede ser lenta sin cache
- Un JSON de ~31K hexágonos con 5 dimensiones puede pesar 5-15MB
- Service Worker permite acceso offline parcial (datos ya cargados)
- Versionado con hash garantiza que se invalida solo cuando hay datos nuevos

## Consecuencias

- Primera entrega usa JSON estático como asset (decisión temporal)
- Se implementa Service Worker + versionado desde Sprint 1
- La decisión de storage definitivo (S3/CDN vs BD) se toma tras reunión con cliente
- La arquitectura debe ser flexible para soportar ambos escenarios
- **Supabase** se integra como plataforma de BD + Storage (free tier cubre primera entrega)
- **Vercel** se integra como hosting frontend + CDN + API serverless (free tier cubre primera entrega)
- Keycloak se despliega en servicio externo (Railway, Render, o servidor propio)
