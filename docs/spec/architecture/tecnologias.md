---
version: 1.0
date: 2026-03-24
status: propuesto — pendiente confirmación con equipo
---

# Tecnologías Aplicables — Proyecto Vento

## 1. Frontend Framework

### Opción A: Angular 17+
| Aspecto | Detalle |
|---------|---------|
| **Versión recomendada** | Angular 17+ (standalone components, signals) |
| **Lenguaje** | TypeScript (obligatorio) |
| **A favor** | Framework completo (routing, forms, HTTP, DI incluidos). Estructura opinada ideal para equipos. Soporte empresarial Google. Muy maduro. Mencionado en project_knowledge como tecnología considerada |
| **En contra** | Bundle más pesado que React. Curva de aprendizaje más alta para nuevos devs. Ecosistema de mapas menos rico que React |
| **Librerías de mapa** | `ngx-leaflet` (wrapper Angular para Leaflet), `@asymmetrik/ngx-leaflet` |
| **Ideal si** | El equipo ya tiene experiencia Angular o prefiere un framework con todo incluido |

### Opción B: React 18+
| Aspecto | Detalle |
|---------|---------|
| **Versión recomendada** | React 18+ con hooks |
| **Lenguaje** | TypeScript (recomendado) o JavaScript |
| **A favor** | Ecosistema más grande para mapas/visualización. Comunidad masiva. Más flexible. Deck.gl y react-map-gl son nativos. Bundle más liviano |
| **En contra** | No es framework completo — necesita elegir router, state management, etc. Más decisiones de arquitectura |
| **Librerías de mapa** | `react-leaflet`, `deck.gl` (si se necesita WebGL futuro), `react-map-gl` |
| **Ideal si** | El equipo tiene experiencia React o se prioriza ecosistema de mapas |

### Opción C: Vue 3 + Nuxt
| Aspecto | Detalle |
|---------|---------|
| **Versión recomendada** | Vue 3 (Composition API) + Nuxt 3 (opcional) |
| **Lenguaje** | TypeScript (recomendado) o JavaScript |
| **A favor** | Curva de aprendizaje más suave. Buen balance entre Angular (estructura) y React (flexibilidad). Template syntax intuitivo. Documentación excelente |
| **En contra** | Ecosistema más pequeño para GIS/mapas. Comunidad menor que React/Angular. Menor oferta de devs en el mercado |
| **Librerías de mapa** | `vue-leaflet`, `@vue-leaflet/vue-leaflet` |
| **Ideal si** | Equipo pequeño que busca productividad rápida con buena estructura |

### Comparativa Frontend

| Criterio | Angular | React | Vue |
|----------|---------|-------|-----|
| Curva aprendizaje | Alta | Media | Baja |
| Ecosistema mapas/GIS | Bueno | Excelente | Aceptable |
| Bundle size (base) | ~130KB | ~45KB | ~55KB |
| Soporte TypeScript | Nativo | Opcional (recomendado) | Opcional (recomendado) |
| Estructura proyecto | Opinada (consistencia) | Libre (flexibilidad) | Intermedia |
| Comunidad/devs disponibles | Grande | Muy grande | Media |
| Mencionado en project_knowledge | ✅ Sí | No | No |

---

## 2. Librería de Mapas

### Opción A: Leaflet
| Aspecto | Detalle |
|---------|---------|
| **Versión** | 1.9+ |
| **Rendering** | SVG/Canvas (configurable) |
| **A favor** | Maduro, documentado, liviano (~40KB). Gran ecosistema de plugins. Suficiente para ~30K polígonos con Canvas renderer. Soporte para popups, tooltips, layers nativos |
| **En contra** | No tiene WebGL nativo. Para >50K elementos puede ser lento en SVG. No tiene capa H3 nativa (requiere plugin o dibujo manual) |
| **Plugin H3** | `h3-js` para convertir h3_index a GeoJSON boundaries + Leaflet GeoJSON layer |
| **Ideal para Vento** | ✅ Sí — resolución H3 res 5-6 (4,500-31,000 hexágonos) es manejable |

### Opción B: MapLibre GL JS
| Aspecto | Detalle |
|---------|---------|
| **Versión** | 4.x |
| **Rendering** | WebGL nativo |
| **A favor** | Open-source (fork de Mapbox GL). WebGL = rendimiento superior. Vector tiles nativos. Estilos personalizables. 3D capabilities |
| **En contra** | Más complejo de configurar. Requiere entender estilos tipo Mapbox. Hexágonos H3 requieren capa custom. Más pesado que Leaflet |
| **Wrappers** | `ngx-maplibre-gl` (Angular), `react-map-gl` (React), `vue-maplibre-gl` (Vue) |
| **Ideal para Vento** | Opción futura si se necesita más rendimiento o resolución más alta |

### Opción C: Deck.gl (sobre MapLibre o Mapbox)
| Aspecto | Detalle |
|---------|---------|
| **Versión** | 9.x |
| **Rendering** | WebGL2 nativo |
| **A favor** | `H3HexagonLayer` y `H3ClusterLayer` NATIVOS — diseñado por Uber para visualizar H3. Rendimiento excepcional para millones de puntos. GPU-accelerated |
| **En contra** | Sobredimensionado para ~30K hexágonos. Principalmente ecosistema React. Más complejo. Mayor bundle size |
| **Integración** | Nativo con React. Angular requiere wrapper manual |
| **Ideal para Vento** | Solo si la resolución sube a res 7+ (>200K hexágonos) en el futuro |

### Comparativa Mapas

| Criterio | Leaflet | MapLibre GL | Deck.gl |
|----------|---------|-------------|---------|
| Rendimiento ~5K hex | ✅ Excelente | ✅ Excelente | ✅ Overkill |
| Rendimiento ~30K hex | ✅ Bueno (Canvas) | ✅ Excelente | ✅ Excelente |
| Rendimiento >200K hex | ❌ Limitado | ✅ Bueno | ✅ Excelente |
| Soporte H3 nativo | ❌ Plugin manual | ❌ Capa custom | ✅ H3HexagonLayer |
| Popups/tooltips | ✅ Nativo | ✅ Nativo | ⚠️ Requiere custom |
| Complejidad setup | Baja | Media | Alta |
| Peso (KB) | ~40KB | ~200KB | ~300KB+ |
| Compatibilidad Angular | ✅ ngx-leaflet | ✅ ngx-maplibre-gl | ⚠️ Wrapper manual |
| Compatibilidad React | ✅ react-leaflet | ✅ react-map-gl | ✅ Nativo |
| Compatibilidad Vue | ✅ vue-leaflet | ✅ vue-maplibre-gl | ⚠️ Wrapper manual |

**Recomendación para primera entrega:** Leaflet (simplicidad, suficiente para la resolución actual)

---

## 3. Backend / API (Primera Entrega — ADR-007)

> **Nota:** El ADR-007 decide que SÍ hay backend desde la primera entrega, con Arquitectura Limpia y DDD. La tecnología de backend debe definirse con el equipo.

### Opción A: FastAPI (Python)
| Aspecto | Detalle |
|---------|---------|
| **A favor** | Integración natural con pipeline existente (GeoPandas, H3-py, Pandas, pyarrow). Async nativo. Auto-documentación OpenAPI. Tipado con Pydantic |
| **En contra** | Rendimiento inferior a Go/Rust para alta concurrencia. GIL de Python para cómputo pesado |
| **Ideal para Vento** | ✅ Sí — el pipeline de datos ya es Python. Menor fricción de integración |

### Opción B: NestJS (Node.js/TypeScript)
| Aspecto | Detalle |
|---------|---------|
| **A favor** | Mismo lenguaje que el frontend (si es Angular/React con TS). Estructura similar a Angular. Buen rendimiento async |
| **En contra** | No tiene ecosistema geoespacial comparable a Python (GeoPandas, H3-py). Requeriría reimplementar lógica del pipeline |
| **Ideal para Vento** | Solo si todo el equipo es TypeScript y no hay necesidad de integrar con pipeline Python |

### Opción C: Django + Django REST Framework
| Aspecto | Detalle |
|---------|---------|
| **A favor** | Mencionado en project_knowledge como tecnología evaluada. Framework completo (ORM, admin, auth). GeoDjango para PostGIS nativo |
| **En contra** | Más pesado que FastAPI. Menos async-friendly. Overhead para una API pura |
| **Ideal para Vento** | Si se necesita admin panel robusto y ORM complejo desde el inicio |

---

## 4. Base de Datos

### PostgreSQL + PostGIS + H3 (Confirmado)
| Aspecto | Detalle |
|---------|---------|
| **Estado** | ✅ Confirmado — ya existe en pipeline |
| **Versión recomendada** | PostgreSQL 16+ con PostGIS 3.4+ |
| **Extensión H3** | `h3-pg` — funciones H3 nativas en SQL |
| **Uso primera entrega** | Usuarios y sesiones (auth). Datos geoespaciales pre-procesados servidos como JSON estático |
| **Uso futuro** | Almacenamiento de datos H3 dinámicos, histórico de análisis, reportes guardados |

---

## 5. Pre-procesamiento de Datos (Primera Entrega)

### Python + Pandas + PyArrow
| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Script offline que convierte .h3.parquet → JSON/GeoJSON estático |
| **Librerías** | `pandas`, `pyarrow` (lectura parquet), `h3` (geometrías hexágonos), `geopandas` (opcional para GeoJSON) |
| **Frecuencia** | Cada vez que el equipo de investigación entrega nueva versión del .parquet |
| **Output** | Archivo JSON servido como asset estático del frontend |

---

## 6. Lectura de Parquet en Browser (Alternativa)

### Opción: Apache Arrow JS / Parquet WASM
| Aspecto | Detalle |
|---------|---------|
| **Librería** | `apache-arrow` (JS) o `parquet-wasm` |
| **A favor** | Lee .parquet directamente en el navegador sin pre-procesamiento. Cero pipeline adicional |
| **En contra** | Mayor complejidad en frontend. Parquet WASM aún no es mainstream. Bundle size adicional |
| **Estado** | Alternativa viable — evaluar en PoC si se prefiere eliminar el paso de pre-proceso |

---

## 7. Autenticación e Identidad

### Keycloak (Decidido — ADR-005)
| Aspecto | Detalle |
|---------|---------|
| **Estado** | ✅ Decidido — desde primera entrega |
| **Versión** | Keycloak 24+ (o última estable) |
| **Protocolo** | OpenID Connect (OIDC) / OAuth 2.0 |
| **Despliegue** | Contenedor Docker en docker-compose |
| **A favor** | SSO, MFA, gestión de usuarios incluida, federación con AD, auditoría de sesiones, estándar OIDC, consola admin integrada |
| **En contra** | Mayor consumo de recursos (~512MB RAM), curva de aprendizaje inicial |
| **Librerías Frontend** | `keycloak-js` (oficial), `oidc-client-ts`, `react-oidc-context` (React), `angular-auth-oidc-client` (Angular) |
| **Backend** | Validación de tokens OIDC como Resource Server |
| **Usuarios** | Correo electrónico general (NO restringido a dominio institucional) |
| **Roles primera entrega** | `admin`, `analista` |
| **Ideal para Vento** | ✅ Sí — proyecto de escala nacional con múltiples instituciones y requisitos gubernamentales |

### JWT (Supersedido por Keycloak)
| Aspecto | Detalle |
|---------|---------|
| **Estado** | ❌ Reemplazado por Keycloak (ADR-005) |
| **Nota** | Los tokens JWT siguen siendo el mecanismo de transporte (Keycloak emite JWT), pero la gestión de identidad la maneja Keycloak, no una implementación propia |

---

## 8. Generación de Reportes PDF (Futuro)

### Opción A: WeasyPrint (Python/Backend)
| Aspecto | Detalle |
|---------|---------|
| **A favor** | HTML/CSS → PDF. Control total del diseño. Soporte CSS print |
| **En contra** | Requiere backend. Dependencias de sistema (Cairo, Pango) |

### Opción B: ReportLab (Python/Backend)
| Aspecto | Detalle |
|---------|---------|
| **A favor** | PDF nativo sin HTML. Control pixel-perfect. Gráficos programáticos |
| **En contra** | Más verboso. Sin CSS. Requiere backend |

### Opción C: jsPDF + html2canvas (Frontend)
| Aspecto | Detalle |
|---------|---------|
| **A favor** | No requiere backend. Captura lo que el usuario ve. Implementación rápida |
| **En contra** | Calidad inferior. No es "PDF profesional". Dependiente del DOM del browser |

---

## 9. Deploy / Infraestructura

### Docker (Confirmado — desarrollo local)
| Aspecto | Detalle |
|---------|---------|
| **Estado** | ✅ Confirmado — para desarrollo local y CI |
| **docker-compose local** | Frontend + Backend + PostgreSQL + Keycloak |
| **Uso** | Desarrollo local y testing — `docker-compose up` levanta todo |

### Supabase (Evaluado — ADR-006)
| Aspecto | Detalle |
|---------|---------|
| **Qué ofrece** | PostgreSQL gestionado + Storage S3 compatible + API auto-generada |
| **PostGIS** | ✅ Soportado nativamente como extensión |
| **H3-pg** | ✅ Disponible como extensión |
| **Free tier** | 500MB BD, 1GB Storage, 2GB bandwidth, 50K auth users |
| **Pro plan** | $25/mes — cuando se supere free tier |
| **Uso en Vento** | BD de producción (PostgreSQL + PostGIS) + Storage para archivos JSON geoespaciales |
| **Ventaja clave** | BD + Storage en una sola plataforma gestionada. Sin mantener servidores |

### Vercel (Evaluado — ADR-006)
| Aspecto | Detalle |
|---------|---------|
| **Qué ofrece** | Hosting frontend + CDN global (Edge Network) + API Routes serverless + CI/CD automático |
| **Free tier** | 100GB bandwidth, 100h serverless, builds ilimitados, previews por PR |
| **Pro plan** | $20/mes/miembro |
| **Como CDN** | Edge Network global — sirve archivos con cache automático desde nodos cercanos |
| **Como API** | Serverless functions (Node.js/Python) bajo el mismo dominio del frontend |
| **CI/CD** | Push a GitHub → build → deploy automático. Preview por cada PR |
| **Uso en Vento** | Frontend hosting + CDN para JSON geoespaciales + API serverless como proxy |
| **Ventaja clave** | Frontend + CDN + API + CI/CD en un solo servicio. Deploy instantáneo |

### Combinación Recomendada para Producción
| Capa | Servicio | Free tier |
|------|----------|-----------|
| Frontend + CDN | Vercel | 100GB bandwidth |
| API serverless | Vercel API Routes | 100h/mes |
| BD (PostgreSQL + PostGIS) | Supabase | 500MB |
| Storage archivos (S3) | Supabase Storage | 1GB |
| Identidad (Keycloak) | Railway / Render / servidor propio | Variable |
| **Costo total primera entrega** | **$0** | Dentro de free tiers |
| **Costo escalado** | **~$45/mes** | Supabase Pro + Vercel Pro |

---

## 10. Resumen de Decisiones Tecnológicas

| Capa | Decidido | Por Confirmar | Futuro |
|------|----------|---------------|--------|
| Frontend framework | — | Angular 17+ vs React 18+ vs Vue 3 | — |
| Mapas | Leaflet (recomendado) | MapLibre GL como alternativa | Deck.gl si res 7+ |
| Base de datos | PostgreSQL + PostGIS + H3 | — | — |
| Auth/Identidad | Keycloak (ADR-005) | — | Federación AD, MFA |
| Deploy | Docker | — | Cloud (opcional) |
| Pre-proceso datos | Python + Pandas + PyArrow | — | — |
| Backend API | Sí en primera entrega (ADR-007) | FastAPI vs NestJS vs Express | — |
| Arquitectura Backend | Clean Architecture + DDD (ADR-007) | — | — |
| Estructura repo | Monorepo (ADR-007) | Turborepo vs Nx | — |
| Cache frontend | Service Worker + HTTP Cache (ADR-006) | — | CDN edge cache |
| Storage datos geo | Asset estático (temporal) | Supabase Storage vs BD (ADR-006) | — |
| Hosting frontend | — | Vercel (recomendado) | — |
| BD producción | — | Supabase (PostgreSQL + PostGIS) | — |
| CDN | — | Vercel Edge Network | — |
| Deploy Keycloak | — | Railway / Render / servidor propio | — |
| Reportes PDF | — | — | WeasyPrint vs ReportLab vs jsPDF |

### Combinaciones Recomendadas (Stack Completo)

**Stack A — Angular + Leaflet (más estructurado)**
```
Angular 17+ / TypeScript / ngx-leaflet / Leaflet / h3-js
PostgreSQL + PostGIS + H3 / Docker
Pre-proceso: Python + pandas + pyarrow → JSON estático
```

**Stack B — React + Leaflet (más ecosistema mapas)**
```
React 18+ / TypeScript / react-leaflet / Leaflet / h3-js
PostgreSQL + PostGIS + H3 / Docker
Pre-proceso: Python + pandas + pyarrow → JSON estático
```

**Stack C — Vue 3 + Leaflet (más productivo para equipo pequeño)**
```
Vue 3 / TypeScript / vue-leaflet / Leaflet / h3-js
PostgreSQL + PostGIS + H3 / Docker
Pre-proceso: Python + pandas + pyarrow → JSON estático
```

**Criterio de decisión final:** Experiencia del equipo de desarrollo. Los tres stacks son viables para el scope de la primera entrega.
