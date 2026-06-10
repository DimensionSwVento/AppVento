# Vento

**Herramienta SIG multicriterio para identificar zonas con potencial eolico en Colombia.**

Un convenio entre **ANH** (Agencia Nacional de Hidrocarburos) y **EAFIT** para acelerar la transicion energetica del pais.

---

## Que es Vento?

Vento es una aplicacion web que muestra un **mapa interactivo de Colombia** dividido en hexagonos H3. El usuario selecciona un area, configura las caracteristicas tecnicas del proyecto eolico, y obtiene un **informe de prefactibilidad** con puntajes de idoneidad por dimension.

| Pregunta | Respuesta |
|----------|-----------|
| Que problema resuelve? | Evaluar donde instalar parques eolicos toma semanas y requiere cruzar datos de muchas fuentes. Vento lo centraliza en un solo mapa. |
| Para quien es? | Analistas de energia, investigadores y tomadores de decisiones de ANH/EAFIT. |
| Que muestra el mapa? | Un heatmap en estandar Viridis (amarillo = alto, morado = bajo) centrado en una metrica a la vez (puntajes) + maximo una variable informativa simultanea por hex. Score agregado WLC con pesos signados. |
| Que evalua? | Score general (WLC) + 5 dimensiones implementadas: Tecnica, Ambiental, Regulatoria, Socioeconomica, Macroeconomica. La spec del cliente menciona 7 puntajes (general + 6 dominios) — el 6to dominio queda pendiente de definicion en reunion. |
| De donde vienen los datos? | El equipo de investigacion genera archivos `.h3.parquet` con los datos ya procesados por el modelo multicriterio. El backend FastAPI los sirve via tiles. |

---

## Flujo del Usuario

```
Login (Keycloak)
   |
   v
Mapa SIG interactivo
   |
   v
Seleccion de area (onshore u offshore)
   |
   v
Eleccion de dimensiones a evaluar
   |
   v
Caracteristicas del proyecto (tipo emplazamiento auto, MW, distancia SIN)
   |
   v
Informe de prefactibilidad
   - Heatmap Viridis multidimensional
   - Puntajes de idoneidad por dimension
   - Variables informativas con catalogo
   - Descarga PDF
```

Navegacion secuencial en el sidebar (area -> dimensiones -> caracteristicas -> informe); el usuario puede regresar libremente a fases anteriores.

---

## Estado del Software

### Scope 1 (cerrado) — Login + Mapa + Admin

| Modulo | Funcionalidad | Estado |
|--------|---------------|--------|
| Auth | Keycloak OIDC+PKCE via NextAuth, roles `admin` / `analista`, logout federado | OK |
| Mapa interactivo | DeckGL + MapLibre, hexagonos H3, seleccion con polygon-clipping, hover, area en km^2 | OK |
| Admin de usuarios | CRUD via Keycloak Admin REST API + UI integrada (crear, listar, editar, eliminar) | OK |
| Notificacion email | Aviso al usuario al asignar rol admin (US-FB-06) | OK |
| Infraestructura | Docker Compose Keycloak, deploy CI, Next.js standalone en AccuWeb (Apache) | OK |

### Scope 2 (cerrado 2026-06-01) — Flujo completo de prefactibilidad

#### US03 Mapa

| AC | Detalle | Estado |
|----|---------|--------|
| AC4 | Calculo de area en km^2 sobre la seleccion | OK |
| AC extra | Busqueda tipo Google Maps para ubicacion de zona (sugerencia de expertos) | OK |

#### US04 Variables / Configuracion de Dimensiones

| Item | Detalle | Estado |
|------|---------|--------|
| Iconos | Iconos actualizados segun Figura 3 (identificador junto con el color para cada variable seleccionada) | OK |
| Tooltip puntajes | Puntajes (general + dimensiones implementadas) en caja de tooltip de acceso permanente, aparte de las variables. Spec original pide 7 (general + 6 dominios), por aclarar | OK con observacion |
| Popup por variable | Al click en una variable seleccionada se despliega un popup con icono, id y descripcion (no satura la pantalla; ampliable en sprint 3) | OK |

#### US05 Caracteristicas del Proyecto

| Item | Detalle | Estado |
|------|---------|--------|
| Formulario dinamico | Tres caracteristicas tecnicas para aerogeneradores | OK |
| Catalogo de modelos | Seleccion entre 3 categorias estandar (S, M, L), ampliable a 5 | OK |
| Validacion de rangos | Capacidad nominal valida con rangos tecnicos permitidos | OK |
| Tipo de emplazamiento | Auto-deteccion onshore / offshore segun los hex seleccionados; restriccion a hex contiguos del mismo tipo (no se pueden mezclar) | OK |
| Tecnologia offshore | Selector flotante / fija con cimentacion (se despliega solo si offshore) | OK |
| Capacidad nominal | MWPicker de 4 ruedas (centenas / decenas / unidades / milesimas de 10 en 10), categoria derivada: Pequena <=1MW, Mediano >1MW, Grande >20MW | OK |
| Tamano del proyecto | Numero de aerogeneradores + area + categoria S / M / L | OK |
| Distancia al SIN | Tarea Felipe — derivada de la zona de interes | OK |

#### US06 Informe — Previsualizacion y PDF

| Item | Detalle | Estado |
|------|---------|--------|
| Score general | Mostrado en la previsualizacion del informe | OK |
| Scores por dimension | Uno por dominio en la previsualizacion | OK |
| Heatmap Viridis | Prefactibilidad en estandar Viridis (amarillo alto -> morado bajo) sobre el mapa | OK |
| Foco una metrica | Visualizacion base centrada en UNA metrica a la vez (puntajes) + maximo OTRA simultanea (variables informativas) en el hex | OK |
| Dos momentos de seleccion | Variables para visualizacion en la fase de dimensiones + variables para estadisticas en la fase de informe | OK |
| Tooltip por hex / conjunto | Valor del hex (o promedio del conjunto) por cada puntaje y cada variable informativa seleccionada, con limite para no saturar | OK |
| Rename UI | "Viabilidad (prefactibilidad)" y "Puntajes de idoneidad" en toda la UI del sprint 2 | OK |
| Generacion PDF | Descarga del informe con branding | OK |


### FB1 (cerrado) — Feedback Ronda 1

| HU | Detalle | Estado |
|----|---------|--------|
| US-FB-01 | Keycloak en espanol + navegacion + politicas (mensajes, formularios y enlaces "Olvidaste tu contrasena" en es) | OK |
| US-FB-02 | Flujo post-registro con confirmacion del lado app (pantalla intermedia + redireccion) | OK |
| US-FB-03 | Gestion de expiracion de sesion con lifespans definidos en Keycloak | OK |
| US-FB-04 | Territorio colombiano completo: offshore + insular (cartografia IGAC + Nominatim con mar territorial) | OK |
| US-FB-05 | Admin: visibilidad y asignacion de roles desde la UI | OK |
| US-FB-06 | Notificacion email al asignar admin (originalmente bloqueada por SMTP, implementada en scope 1) | OK |

### FB2 (cerrado) — Feedback Ronda 2

| HU | Detalle | Estado |
|----|---------|--------|
| US-FB2-01 | Guia visual del proximo paso (card flotante; tutoriales quedan para scope posterior) | OK |
| US-FB2-02 | Cartografia oficial IGAC integrada al mapa | OK |
| US-FB2-03 | Polish de layout landing/dashboard | OK |
| US-FB2-04 | Transicion visual suave al cambiar resolucion H3 (slide via requestAnimationFrame + pill de "cargando") | OK |
| US-FB2-05 | Icono claro de cierre de sesion | OK |


### Pendiente

Falta la conexion maestra a datos — ingesta del `.h3.parquet` al pipeline del backend para que el mapa base y los puntajes consuman datos reales en lugar de los mocks actuales.

---

## Arquitectura

```
+--------------------------------------------------------------+
|                  NAVEGADOR DEL USUARIO                       |
|                                                              |
|   Next.js 16 (App Router) + React 19 + Tailwind v4           |
|   DeckGL (WebGL) + MapLibre GL + react-map-gl + h3-js        |
|                                                              |
|   Modulo Auth     Modulo Mapa SIG     Modulo Admin           |
|   (NextAuth)      (US03..US06)        (Keycloak Admin API)   |
+----------+--------------+--------------+---------------------+
           |              |              |
           v              v              v
+--------------------------------------------------------------+
|                   FastAPI Backend                            |
|   /api/tiles/* (tiles, detail, variables, counts, warmup)    |
+----------+-----------------------------------+---------------+
           |                                   |
           v                                   v
+----------------------+              +------------------------+
|   Parquet H3 maestro |              |   Keycloak (realm      |
|   master_variables.  |              |   "vento", client      |
|   h3.parquet         |              |   "vento-frontend"     |
+----------------------+              |   public OIDC+PKCE)    |
                                      +------------------------+

   Despliegue: AccuWeb.cloud (frontend via Apache, Keycloak en VM)
```

El backend FastAPI ya esta integrado. Los hexagonos se entregan por tile (z/x/y) para no enviar toda Colombia de una sola vez.

---

## Stack Tecnologico

### Frontend (`Vento/`)

| Capa | Tecnologia |
|------|-----------|
| Framework | Next.js 16 (App Router, standalone build) |
| UI | React 19, Tailwind CSS v4 (OKLCH), lucide-react + iconos custom Tabler/SVG |
| Mapas | DeckGL ~9.2 (TileLayer + PolygonLayer), MapLibre GL 5, react-map-gl 8, basemap CartoDB Positron |
| H3 | h3-js 4.4 (cellToBoundary, polygonToCells, cellToChildren, etc.) |
| Auth | NextAuth 5 (beta) con provider Keycloak |
| Geocoding | Nominatim (OSM) + IGAC ArcGIS para union de cartografia |
| Geometria | polygon-clipping para uniones, point-in-polygon ray-casting para clasificacion onshore/offshore |
| PDF | html2canvas-pro + jsPDF (html2canvas-pro requerido por OKLCH/color-mix de Tailwind v4) |
| Tests | Vitest + Testing Library (component + util tests) |

### Backend (`AppVento---Backend/`)

| Capa | Tecnologia |
|------|-----------|
| API | FastAPI + Uvicorn |
| Datos | Parquet H3 master (`master_variables.h3.parquet`) cargado en memoria con indice espacial |
| Lenguaje | Python (pandas, pyarrow) |
| Arquitectura | Clean Architecture + DDD monorepo (ADR-007) |

### Plataforma

| Capa | Detalle |
|------|---------|
| Auth | Keycloak en VM (realm `vento`, client `vento-frontend` public OIDC+PKCE, client confidential `vento-web` para Admin API) |
| Hosting | AccuWeb.cloud — frontend Next.js standalone tras Apache, backend FastAPI en mismo host |
| CI | Build + deploy automatico por rama |

---

## Datos y Hexagonos H3

### Pipeline

```
Equipo de investigacion
        |
        |  Genera master_variables.h3.parquet (modelo multicriterio)
        v
Backend FastAPI carga el parquet en warmup
        |
        |  Sirve hexagonos por tile (z/x/y) con variables y scores
        v
Frontend renderiza con DeckGL TileLayer
        |
        v
Usuario interactua, selecciona, recibe informe
```

### Que contiene cada hexagono?

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| `h3_index` | Identificador unico H3 | `85283473fffffff` |
| `score_general` | Promedio agregado WLC de las 5 dimensiones (0-1) | `0.73` |
| `score_<dimension>` | Score por dimension (Tecnica / Ambiental / Regulatoria / Socioeconomica / Macroeconomica) | `0.81` |
| Variables | Valores individuales (velocidad viento, pendiente, distancia SIN, etc.) | `6.2 m/s` |
| Metadata | Origen y vigencia de cada variable | `GWA 2024` |

### Tipos de variables

| Tipo | Que hace | Ejemplo |
|------|----------|---------|
| Excluyente | Descarta zonas automaticamente | Area protegida |
| De decision (suma) | Aumenta el score (peso positivo) | Velocidad de viento |
| Penalizante (resta) | Reduce el score (peso negativo) | Pendiente pronunciada |
| Informativa | No afecta el score, aparece en el informe para contexto | Direccion del viento |

### Dimensiones

| Dimension | Que evalua |
|-----------|------------|
| Tecnica | Recurso eolico, geologia, logistica, implementacion |
| Ambiental | Areas protegidas, impacto ecosistemas |
| Regulatoria | Normativa, permisos, zonas de exclusion legal |
| Socioeconomica | Impacto en comunidades, acceso, infraestructura social |
| Macroeconomica | Costos, retorno, viabilidad financiera |

---

## Estructura del Proyecto

```
AppVento/
├── Vento/                              # Frontend Next.js
│   ├── src/app/
│   │   ├── Components/                 # Map, SideBar, Report, HeatmapLegend, etc.
│   │   ├── Components/Admin/           # CRUD usuarios
│   │   ├── Utils/
│   │   │   ├── h3Resolution.ts         # SEA_BBOXES + LAND_POLYGONS (poligonos islas)
│   │   │   ├── hexClassification.ts    # Clasificacion onshore/offshore
│   │   │   ├── variableWeights.ts      # Pesos signados WLC (pendiente aval cliente)
│   │   │   └── pdfExport.ts            # Exportacion PDF via html2canvas-pro + jsPDF
│   │   └── contexts/                   # AprincipalContext, VariablesContext, etc.
│   ├── scripts/
│   │   └── generate-igac-boundary.mjs  # Genera poligono Colombia (IGAC + Nominatim union)
│   └── package.json
├── docs/
│   ├── project_knowledge.md
│   └── spec/
│       ├── architecture/architecture.md
│       └── adr/                        # ADR-001 a ADR-012
├── Reportes_Entregas/
│   ├── entrega-1/
│   └── entrega-2/scope-2-entregado.md
└── _bmad/                              # Configuracion BMAD multi-agente
```

Backend en repo separado `AppVento---Backend/` (FastAPI clean-architecture, ver ADR-007).

---

## Decisiones Arquitectonicas (ADR)

| ADR | Decision | Estado |
|-----|----------|--------|
| ADR-001 | Stack frontend (Next.js + DeckGL + MapLibre, no Leaflet) | Vigente |
| ADR-002 | Resolucion H3 nivel 5-6 con downscale por zoom | Vigente |
| ADR-003 | Sin backend API en scope 1 (luego revertido en scope 2) | Superada por ADR-007 |
| ADR-004 | Scope inicial scope 1 a 1 mes | Cerrada |
| ADR-005 | Keycloak como IdP institucional (realm `vento`) | Vigente |
| ADR-006 | Storage y cache de datos geoespaciales | Vigente |
| ADR-007 | Backend FastAPI con Clean Architecture + DDD, monorepo | Vigente |
| ADR-008 | Arquitectura tile-based (`/api/tiles/{z}/{x}/{y}`) | Vigente |
| ADR-009 | Notificaciones email pendientes de SMTP | Pendiente SMTP |
| ADR-010 | Hosting AccuWeb (vs Supabase/Vercel) | Vigente |
| ADR-011 | Procesamiento Parquet en backend, no en browser | Vigente |
| ADR-012 | Confirmacion post-registro lado app | Vigente |

Detalle en [`docs/spec/adr/`](docs/spec/adr/).

---

## Equipo y Contexto

| Aspecto | Detalle |
|---------|---------|
| Institucion | Convenio ANH - Universidad EAFIT |
| Fase | Fase 2 (desarrollo herramienta SIG) con criterios para Fase 3 |
| Metodologia | Agile + BMAD framework para planificacion asistida por IA |

---

## Glosario

| Termino | Significado |
|---------|-------------|
| H3 | Sistema de indexacion hexagonal de Uber. Vento usa resolucion 5-6. |
| SIG | Sistema de Informacion Geografica. |
| MCDM | Multi-Criteria Decision Making. Modelo que pondera variables para un score. |
| WLC | Weighted Linear Combination. Tecnica de agregacion del score (pesos signados, suma/resta segun polaridad). |
| AHP | Analytic Hierarchy Process. Metodo para derivar pesos del modelo. |
| Prefactibilidad | Antes "viabilidad". Termino normalizado en UI tras feedback del cliente. |
| Puntaje de idoneidad | Antes "puntaje". Termino normalizado tras feedback. |
| Onshore / Offshore | Onshore = tierra firme. Offshore = mar. La clasificacion automatica usa `SEA_BBOXES` + `LAND_POLYGONS` (poligonos fieles a la costa, no rectangulos). |
| Score general | Promedio ponderado WLC de las 5 dimensiones, [0, 1]. |
| Hexagono excluido | Zona no instalable (area protegida, cuerpo de agua). Se muestra pero no es seleccionable. |
| Parquet | Formato columnar eficiente. El equipo de investigacion entrega `.h3.parquet`. |
| OIDC + PKCE | Estandar de autenticacion publica de Keycloak. Lo usa `vento-frontend`. |
| HAWT / VAWT | Turbinas eje horizontal / vertical. |
| LCOE | Levelized Cost of Energy. |
