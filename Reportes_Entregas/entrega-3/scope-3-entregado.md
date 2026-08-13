---
version: 1.0
date: 2026-07-30
scope: contractual-tercera-entrega-entregado
origen: feedback-cliente-v2.md + catálogo definitivo de variables + reuniones de cierre Sprint 3
estado: entregado en modo TEMPLATE — a la espera de datos reales del modelo (parquet) y textos oficiales (disclaimer)
maintainer: Mavalan Software
---

# Scope Tercera Entrega — Entregado

Reporte de lo desarrollado para la tercera entrega (Sprint 3). Recoge el feedback v2 del cliente, el catálogo definitivo de variables y las decisiones de las reuniones de cierre. Está pensado también como **guía para el cliente**: qué se entrega, cómo funciona el **modo template** y cómo pasar por sí mismo al **modo con datos reales**.

---

## 1. Resumen ejecutivo

Vento es una herramienta web SIG multicriterio para evaluar la **idoneidad** de zonas para proyectos de energía eólica (onshore y offshore) en Colombia. Convenio **ANH + EAFIT**, desarrollado por **Mavalan Software**.

En esta entrega el software queda **funcional de extremo a extremo en modo template**: el usuario puede seleccionar un área, configurar variables y características, generar un informe con mapa y descargarlo en PDF. Los **valores numéricos** (scores, pesos) son marcadores deterministas hasta que el equipo de investigación entregue el modelo definitivo; **la estructura, el flujo y la presentación ya son los definitivos**.

---

## 2. Qué se entrega en esta tercera entrega

### 2.1 Catálogo definitivo de variables y dimensiones
- **Dimensiones definitivas**: Ambiental, Técnica, **Social**, **económica** (4 puntuables) + **Regulatoria** (informativa, no puntúa). Se fundieron "económica" y "socioeconómica" en **Social**; se añadió **económica**.
- **61 variables ponderadas** con jerarquía **Dimensión → Criterio → Subcriterio → Variable**, cada una con su **código** de columna (p.ej. `AMB-005-A`, `TEC-004-T`, `SOC-011-S`), **fuente de datos** y marca de **representación en mapa**.
- **30 variables informativas** (solo visualización, no puntúan) en un **panel desplegable** dentro de Dimensiones.
- Menú de dimensiones **agrupado por criterio/subcriterio**, con descripciones en tooltip.

### 2.2 Características del proyecto
- **Capacidad nominal** con ingreso manual por teclado + rueda + flechas.
- **Emplazamiento mar/tierra por dato**: cada hexágono sabe si es mar u tierra; **no se permite mezclar** mar y tierra en una selección, y **las variables que no aplican a ese emplazamiento se ocultan** (p.ej. batimetría en tierra, pendiente del terreno en mar).
- Tamaño (categoría derivada de la capacidad) y tipo de aerogenerador sugerido, con sus definiciones.

### 2.3 Mapa
- **Zonas excluidas** en morado (viridis-0), no seleccionables, con **leyenda del motivo** al pasar el cursor.
- Heatmap del informe y popup por hexágono operan **exactamente a resolución H3-8**.

### 2.4 Informe / Reporte
- **Previsualización a pantalla completa** antes de descargar.
- **Captura del mapa** del área seleccionada dentro del informe, con **reencuadre automático** al abrir un informe (incluyendo los guardados en el histórico).
- **PDF idéntico a la previsualización** (se captura el propio informe), paginado en A4 con **cabecera de marca, separadores y número de página**.
- Cabecera del informe con **región, coordenadas, área y nº de variables**.
- **Tabla de variables** consideradas en el puntaje + **ranking** de las que más influyen.
- **Tabla de fuentes de datos** (fuente → variables) + nota sobre el **equilibrado humano** de pesos.
- **Aviso legal (disclaimer)** visible **al inicio** (modal tipo onboarding) y **en el informe/PDF**.

### 2.5 Histórico
- Límite recomendado subido a **100 informes por usuario**.
- Los hexágonos se **compactan al guardar** (mismo formato, más liviano) → menor peso en local y en el backend.

### 2.6 Renombres y limpieza (feedback v2)
- **"Prefactibilidad" → "Idoneidad"** en toda la aplicación; "Histórico de informes".
- Regulatoria movida fuera del score (solo informativa).
- Menú: eliminado el item muerto **Configuraciones**; **Soporte** ahora abre un correo (enlace `mailto`).

---

## 3. Modo TEMPLATE vs. modo con DATOS REALES (guía para el cliente)

El software funciona **hoy** sin depender de los datos finales del modelo. Esto permite validar la experiencia completa mientras el equipo de investigación termina el modelo. El comportamiento se controla con **interruptores (flags)** en un único archivo:

> `Vento/src/app/Utils/projectData.ts` — *documento maestro de valores del proyecto*.

### 3.1 ¿Qué es el modo template?
Mientras no haya datos reales, la app **cae a valores marcadores (placeholder) deterministas** para que todo se vea y funcione: scores por hexágono, heatmap por dimensión, zonas excluidas de ejemplo y emplazamiento deducido por geometría. **Nada de esto se inventa en pantalla como “definitivo”**: es solo para demostrar la funcionalidad.

### 3.2 Interruptores y cómo pasar a datos reales

| Flag (en `projectData.ts`) | Hoy | Al activar el backend |
|---|---|---|
| `USE_BACKEND` (por env `NEXT_PUBLIC_USE_BACKEND`) | `false` = sin API, todo local | `NEXT_PUBLIC_USE_BACKEND=true` conecta el backend (tiles + histórico) |
| `USE_PLACEHOLDER_FALLBACK` | **DERIVADO** = `!USE_BACKEND` | se apaga **solo** al poner el env en `true` |
| `SHOW_PLACEHOLDER_EXCLUDED` | **DERIVADO** = `!USE_BACKEND` | se apaga **solo** al poner el env en `true` |
| `USE_API_EMPLAZAMIENTO` | `true` = mar/tierra por dato | lee la columna `es_offshore` de la API cuando llega (si no, geometría) |

> **Un solo interruptor:** con `NEXT_PUBLIC_USE_BACKEND=true` el modo template se apaga completo (fallback + zonas excluidas de ejemplo). No hay que tocar flags a mano.

### 3.3 De dónde sale cada dato al activar el backend
El endpoint `POST /api/tiles/area` devuelve por hexágono `{ score_general, scores, tipo_celda, variables }` (contrato real — ver `docs/architecture/backend-api.md`, hoy en la rama `develop`):
- **Score general · por dimensión · heatmap**: de `score_general` / `scores[<DIM>]` (claves de categoría `TEC/AMB/SOE/SOC/MAC/REG`, normalizados 0–1). ✅ conectado.
- **Valor por variable en el área** (tabla del informe, informativas, "En el área"): del campo **`variables`** (`areaVariableAverage`). ⚠️ **Seam, aún no casan los datos**: las claves de `variables` son códigos de backend (`TEC_001`) y **crudas** (sin normalizar), distintas del `masterId` del catálogo (`TEC-004-T`). Hasta acordar el **mapeo código↔masterId** (y si se normaliza), cae al marcador.
- **Emplazamiento mar/tierra**: seam `isOffshoreHex` ← `es_offshore`. ⚠️ **`es_offshore` NO está en el contrato** (solo `tipo_celda`); el backend debe agregar esa columna. Mientras, geometría.
- **Ranking "variables que más influyen"**: usa los **pesos del modelo** (`variableWeights.ts`); los pesos NO vienen del endpoint por área — se reemplaza ese módulo cuando llegue el modelo real.

> **Pendientes de integración (alinear con el equipo de backend):** (1) mapeo `masterId ↔ código backend` (`TEC-004-T` ↔ `TEC_001`) + decisión de normalización para el valor por variable; (2) columna mar/tierra en `hexagon`/`AreaHex` — **su nombre real aún no está definido** (`es_offshore` es provisional); (3) alinear `MAX_HISTORIAL_PER_USER` del backend (hoy `50`) con `MAX_HISTORIAL_ENTRIES` del front (`100`). Contrato completo: [backend-api.md](../../docs/architecture/backend-api.md).

### 3.4 Pasos para activar el modo real
1. Colocar el modelo en el backend: `back_elements/data/master_variables.h3.parquet`.
2. Poner `NEXT_PUBLIC_USE_BACKEND=true` en el entorno de la app. *(Con esto el template se apaga solo.)*
3. Verificar que scores, heatmap, valores por variable, zonas excluidas y emplazamiento provienen del backend.
4. (Opcional, limpieza) eliminar los marcadores del inventario listado en `projectData.ts` y los pesos placeholder de `variableWeights.ts` al llegar los reales.

Todo el resto del código (mapa, informe, PDF, histórico, catálogo de variables) **no cambia**: ya está cableado a estos interruptores. El cliente/equipo puede hacer el cambio **por sí mismo** editando el archivo y el entorno, sin tocar más código.

---

## 4. Procedimientos y técnicas usadas (para el equipo)

- **Compactación de hexágonos (`compactHexes`)**: al guardar un informe, la lista de hexágonos H3 se compacta con `compactCells` (7 hijos → 1 padre). Es **geométricamente idéntico** (misma área) pero mucho más liviano; mismo formato `string[]` para local y backend. Al restaurar se usan tal cual (la app recalcula desde la geometría). El heatmap y el popup **siempre normalizan a res 8**, así que la compactación no altera el coloreo ni el detalle.
- **PDF por captura del DOM**: el PDF se genera capturando el propio informe con `html2canvas-pro` (soporta los colores `oklch` de Tailwind v4) y paginando en A4 con jsPDF; así el PDF **es** la previsualización, no un dibujo aparte.
- **Reencuadre del mapa (`focusNonce`/`requestMapFocus`)**: abrir un informe (incluido uno del histórico) dispara el mismo reencuadre del botón de enfoque, para que el mapa —y la captura del informe— muestren la zona correcta.
- **Emplazamiento mar/tierra**: `isOffshoreHex`/`selectionNature` (hoy por geometría) + filtro de variables por `aplicaEn` (`mar`/`tierra`); seam listo para la columna `es_offshore` del parquet.
- **Datos marcadores centralizados**: `USE_PLACEHOLDER_FALLBACK` en `projectData.ts` con inventario de qué borrar al conectar lo real.

---

## 5. Infraestructura — cómo está montado y cómo funciona

```
Usuario ──HTTPS──> App Vento (Next.js 16, AccuWeb)
                     │  /api/auth/*  ─────────────> Keycloak (OIDC, realm vento)
                     │  /api/admin/* ─────────────> Keycloak (gestión usuarios)
                     │  /api/tiles/*, /api/historico ─(BFF, server-only)─> Backend FastAPI (privado)
                     │                                                        └─ lee master_variables.h3.parquet
                     └─ Postgres (histórico por usuario, vía backend)
```

- **Frontend**: Next.js 16 (App Router) en AccuWeb, arranca con `next start` (se removió `output: standalone`).
- **Identidad**: Keycloak (OIDC + PKCE), realm `vento`, cliente `vento-web`. Los endpoints del provider van en **HTTPS** (se removió el rewrite HTTP que causaba `CallbackRouteError`).
- **Backend**: FastAPI **privado** (Clean Architecture/DDD), no expuesto a internet. La app lo alcanza **solo por el BFF** (rutas Next `/api/tiles/*` y `/api/historico`) que reenvían identidad con un secreto compartido `INTERNAL_API_SECRET`; el guard del backend acepta **JWT de Keycloak o el header interno**.
- **nginx (AccuWeb)**: `/api/*` es de Next (NextAuth + BFF); se eliminó el proxy directo a FastAPI. El backend queda alcanzable solo por `BACKEND_URL` desde el servidor Next.
- **Datos**: `master_variables.h3.parquet` (gitignored) leído por el backend; se normalizan códigos→nombres en el catálogo del backend. Nunca se procesa el parquet en el navegador.
- **Correo**: pendiente proveedor SMTP/MailerSend (ver stoppers).
- **Ambientes**: producción en `.../proyectos/vento`. El ambiente de **test** quedó caído por una migración de dominios/certificados del proveedor; Mavalan está reconfigurando un subdominio propio (`test-vento…`). Mientras tanto, las pruebas con usuarios se hacen sobre la de producción.

Envs clave: `NEXT_PUBLIC_USE_BACKEND`, `BACKEND_URL` (server-only), `INTERNAL_API_SECRET` (igual en app y backend), `AUTH_KEYCLOAK_*` (HTTPS), `PARQUET_PATH` (backend).

---

## 6. Stoppers vigentes (qué falta y de quién depende)

| # | Stopper | Depende de | Impacto |
|---|---------|-----------|---------|
| 1 | **Modelo definitivo** (datos + pesos + ecuación) en `.h3.parquet` | Equipo de investigación | Scores, heatmap, "variables que más influyen" y zonas excluidas siguen en modo template |
| 2 | **Texto oficial del disclaimer** (aviso legal) | Secretaría General (universidad) | Hoy hay un texto template; falta el definitivo |
| 3 | **Servidor SMTP / MailerSend** | Cliente | Notificaciones por correo |
| 4 | **Formato del manual de usuario** | Definición conjunta (Mavalan enviará ejemplos) | El manual arranca cuando se decida el formato (walkthrough externo vs. recorrido in-app) |
| 5 | **Ambiente de test** | Infraestructura (migración de dominios) | Mavalan reconfigura subdominio; pruebas mientras tanto en producción |

---

## 7. Diferido a la cuarta entrega (Sprint 4)

- Informe **preconfigurable** por perfil de usuario (elegir dimensiones/nivel de detalle).
- Detalle técnico extenso por dimensión, informativas y regulatoria dentro del informe.
- **Cálculo económico / económica**.
- **Límites offshore** (formato en revisión).
- Informe extenso (según ejemplo compartido por el cliente).
- **Manual de usuario** completo.
