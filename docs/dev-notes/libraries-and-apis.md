---
version: 1.0
date: 2026-04-20
author: mavalan Software
scope: catálogo de librerías y APIs usadas en Vento — qué hacen, dónde se usan, métodos clave
---

# Catálogo de Librerías y APIs

Inventario de las librerías externas que toca el proyecto y de los métodos concretos que se usan. Sirve para:

- Saber rápido qué tocan los archivos antes de modificarlos
- Identificar dónde leer la doc oficial cuando algo te suene a magia
- Onboarding de dev nuevo (en 10 min entiende qué APIs viven en el repo)

> Documento mantenido a mano. Si añades un método nuevo de una lib ya catalogada, mete la fila aquí en el mismo PR.

---

## 1. Geoespacial

### `h3-js` (Uber H3 — indexación hexagonal)

**Doc oficial:** https://h3geo.org/docs/api/indexing
**Usado en:** [Map.tsx](../../Vento/src/app/Components/Map.tsx), [HeatmapDemo.tsx](../../Vento/src/app/Components/HeatmapDemo.tsx), [h3TileIndex.ts](../../Vento/src/app/Utils/h3TileIndex.ts), [areaCalc.ts](../../Vento/src/app/Utils/areaCalc.ts)

| Método | Para qué | Archivo donde se llama |
|--------|----------|------------------------|
| `polygonToCells(polygon, res, isGeoJson)` | Convertir un polígono en lista de h3 indexes a esa resolución | `Map.tsx`, `h3TileIndex.ts` |
| `cellToLatLng(h)` | Centro del hex → `[lat, lng]` | `Map.tsx`, `HeatmapDemo.tsx` |
| `cellToBoundary(h, geoJson)` | Vértices del hex → array de coordenadas | `Map.tsx` (PolygonLayer) |
| `getResolution(h)` | Resolución (0-15) del hex | `Map.tsx` (para label sizing) |
| `getHexagonEdgeLengthAvg(res, "m")` | Largo de arista promedio para una resolución | `Map.tsx` (label sizing) |
| `cellArea(h, "km2")` | Área del hex en km² (también soporta "m2", "rad2") | `areaCalc.ts` |

**Notas:**
- Resolución H3 va de 0 (más grande) a 15 (más pequeño). Vento usa res 3-8 según zoom.
- `polygonToCells` es costoso para polígonos grandes. En `Map.tsx` se invoca **per-tile** con el bbox del tile (no con todo el polígono de Colombia), y la validación "este hex pertenece a Colombia" se hace con un helper local `pointInRing`/`isInColombia` (ray casting) en vez de cachear el set completo del país. Ver **ADR-014** para el racional y los tradeoffs.

---

### `@deck.gl/*` + `@luma.gl/*` (rendering WebGL 2)

**Doc oficial:** https://deck.gl/
**Usado en:** [Map.tsx](../../Vento/src/app/Components/Map.tsx), [HeatmapDemo.tsx](../../Vento/src/app/Components/HeatmapDemo.tsx)

| Clase / método | Para qué |
|----------------|----------|
| `DeckGL` (componente React) | Wrapper que monta el canvas WebGL sobre el mapa |
| `TileLayer<T>` | Renderiza solo los tiles z/x/y visibles — backbone del rendering tile-based |
| `PolygonLayer<T>` | Renderiza polígonos (cuadrícula H3, hexágonos seleccionados, borde territorio) |
| `TextLayer<T>` | Renderiza labels sobre el mapa (H3 ID en hex seleccionados, "+" en hover) |
| `luma.registerAdapters([webgl2Adapter])` | Habilita WebGL2 — se llama una vez al cargar `Map.tsx` |

**Notas:**
- Vento usa DeckGL ~9.2; mayor es la versión, mejores las APIs. Si actualizás, lee changelog.
- Cada layer recibe `data` + un montón de getters (`getPolygon`, `getFillColor`, etc.). El método de cada layer está en su doc respectiva.

---

### `maplibre-gl` + `react-map-gl/maplibre` (mapa base)

**Doc oficial:** https://maplibre.org/maplibre-gl-js/docs/
**Usado en:** [Map.tsx](../../Vento/src/app/Components/Map.tsx)

| Concepto | Para qué |
|----------|----------|
| `<Map>` (de `react-map-gl/maplibre`) | Renderiza el basemap dentro de DeckGL |
| `mapStyle` URL CartoDB Positron | Define los tiles de fondo del mapa |
| `MapRef` | Ref para acceder a la instancia de MapLibre (no se usa mucho actualmente) |

**Notas:**
- MapLibre es fork open-source de Mapbox. No requiere API key.

---

### Nominatim — Geocoding (OpenStreetMap)

**Doc oficial:** https://nominatim.org/release-docs/latest/api/Search/
**Política de uso:** https://operations.osmfoundation.org/policies/nominatim/
**Usado en:** [Vento/src/app/Utils/geocoder.ts](../../Vento/src/app/Utils/geocoder.ts) → consumido por [MapSearchBox.tsx](../../Vento/src/app/Components/MapSearchBox.tsx) en `Map.tsx`

**Endpoint usado:** `GET https://nominatim.openstreetmap.org/search`

| Parámetro | Valor | Para qué |
|-----------|-------|----------|
| `q` | texto del usuario | Query libre — busca corregimiento, municipio, departamento |
| `countrycodes` | `co` | Restringe resultados a Colombia |
| `format` | `jsonv2` | Respuesta JSON con campos enriquecidos |
| `polygon_geojson` | `1` | Incluye polígono GeoJSON del lugar (Polygon o MultiPolygon) para auto-seleccionar hexes H3 |
| `limit` | `7` | Máximo 7 resultados en el dropdown |
| `accept-language` | `es` | Labels en español cuando estén disponibles |

**Campos de la respuesta que usamos:**
- `display_name` → texto completo "El Porvenir, Cauca, Colombia"
- `name` → nombre corto (fallback: primer segmento de `display_name`)
- `lat`, `lon` → centroide para `flyTo` del viewState
- `class` + `type` → categoría OSM (`boundary/administrative`, `place/village`, etc.) para elegir zoom apropiado e icono
- `geojson.type` + `geojson.coordinates` → polígono(s) del lugar, aplanados a anillos `[lng, lat][]` para `polygonToCells` de h3-js

**Restricciones operativas:**
- **Máximo 1 request por segundo** por política pública. El `<MapSearchBox>` debounce 350ms; el typing humano + abort de peticiones previas con `AbortController` mantienen la tasa por debajo del límite.
- Es obligatorio enviar un `User-Agent` o `Referer` identificable. El `fetch` del browser manda `Referer` con el origin de la app → cumple.
- Para producción a escala (cientos de usuarios concurrentes) se debe **self-hostear Nominatim** o migrar a un proveedor comercial (Mapbox, Google, etc.).
- No requiere API key.

**Notas técnicas:**
- Los polígonos `Polygon` y `MultiPolygon` se aplanan a `Array<[number, number][]>` (sólo outer ring por polígono — huecos se ignoran). Esto está OK para nuestro uso (selección de hexes dentro del área).
- Si el lugar no tiene polígono (algunos POI sólo tienen punto), se navega al centroide pero no se auto-selecciona — el `<MapSearchBox>` y `Map.tsx` manejan ese caso.

---

## 2. Autenticación

### `next-auth` v5 beta (NextAuth)

**Doc oficial:** https://authjs.dev/
**Usado en:** [auth.ts](../../Vento/src/auth.ts), [middleware.ts](../../Vento/src/middleware.ts), [SessionGuard.tsx](../../Vento/src/app/Components/SessionGuard.tsx), todos los route handlers de auth

| Método / símbolo | Para qué |
|-------------------|----------|
| `NextAuth(config)` | Crea handlers + `auth` server-side |
| `auth()` | Server-side: lee la sesión actual (en route handlers / layouts) |
| `useSession()` | Client-side: hook para acceder a sesión en componentes |
| `signIn("keycloak")` | Inicia flujo OIDC contra Keycloak |
| `signOut({ redirect: false })` | Cierra sesión NextAuth (local) — el logout federado lo hace `kc-logout` |
| `auth((req) => ...)` (middleware) | Wrapper de middleware con sesión inyectada en `req.auth` |

**Notas:**
- Usar v5 beta significa estar atento a breaking changes. Revisa changelog si actualizás.
- La sesión client-side **NO** contiene `accessToken` ni `refreshToken` (reducción cookie — ver [auth-strategy.md](../security/auth-strategy.md)).

---

### `jose` (JWT/JWE primitives)

**Doc oficial:** https://github.com/panva/jose
**Usado en:** [auth.ts](../../Vento/src/auth.ts) (`decodeJwt`)

| Método | Para qué |
|--------|----------|
| `decodeJwt(token)` | Decodifica payload de JWT **sin verificar firma** — usado para extraer roles del access token Keycloak |

**Notas:**
- Vento usa `decodeJwt` solo para leer claims (roles), no para validar. La validación la hace NextAuth/Keycloak.

---

## 3. UI y framework

### `react` 19 + `next` 16

**Doc oficial:** https://react.dev y https://nextjs.org/docs

| Hook / API | Para qué | Ejemplo en repo |
|-----------|----------|-----------------|
| `useState`, `useEffect` | Estado y side effects estándar | Todos los componentes con estado |
| `useMemo`, `useCallback` | Memoización de cálculos pesados | `Map.tsx` (`getColombiaCells`, layers) |
| `useRef` | Referencia a DOM/objetos persistentes entre renders | `Map.tsx` (containerRef, mapRef) |
| `useContext` + `createContext` | Estado global compartido | `AccionPrincipalContext.tsx` |
| `redirect` (de `next/navigation`) | Server-side redirect | Layouts con auth guard |
| `usePathname`, `useRouter` (de `next/navigation`) | Client-side routing info | `SideBar.tsx` |
| Next.js `rewrites` (en `next.config.ts`) | Proxy a backend FastAPI | `/api/tiles/*` |

**Notas:**
- React Compiler está activado (`reactCompiler: true` en `next.config.ts`) — reduce necesidad de `useMemo`/`useCallback` manuales, pero los actuales no estorban.

---

### `@testing-library/react` + `vitest` + `jsdom`

**Doc oficial:** https://testing-library.com/docs/react-testing-library/intro/
**Usado en:** todos los archivos `*.test.*`

| Función | Para qué |
|---------|----------|
| `render(<Component/>)` | Monta el componente en jsdom |
| `screen.getByText`, `getByRole`, `getByLabelText` | Localizar elementos por lo que el usuario ve |
| `fireEvent.click` / `fireEvent.change` | Simular interacciones |
| `waitFor(callback)` | Esperar a que se cumpla una condición async |
| `vi.fn()`, `vi.mock()`, `vi.hoisted()` | Mocks y stubs |

**Notas:**
- Tests del proyecto en [test-strategy.md](../testing/test-strategy.md).

---

### `jspdf` + `html2canvas` (generación de PDF client-side)

**Doc oficial:** https://github.com/parallax/jsPDF · https://github.com/niklasvh/html2canvas
**Usado en:** [pdfExport.ts](../../Vento/src/app/Utils/pdfExport.ts), llamado desde [Report.tsx](../../Vento/src/app/Components/Report.tsx)

| Método | Para qué |
|--------|----------|
| `html2canvas(el, opts)` | Renderiza un elemento del DOM a un canvas (snapshot visual) |
| `canvas.toDataURL("image/png")` | Convierte el canvas a data URL para embed en PDF |
| `new jsPDF({ orientation, unit, format })` | Crea un documento PDF (A4 portrait por defecto) |
| `pdf.addImage(data, "PNG", x, y, w, h)` | Embebe la imagen renderizada en la página |
| `pdf.addPage()` | Añade páginas si el contenido excede una hoja |
| `pdf.save(filename)` | Dispara la descarga del PDF |

**Notas:**
- Generación 100% client-side — no requiere backend ni ADR-013 todavía (US06-AC3).
- Cuando llegue el backend con WeasyPrint (template profesional + branding fuerte), `pdfExport.ts` se reemplaza por un fetch al endpoint sin tocar `Report.tsx`.

---

## 4. Backend (FastAPI — repo separado)

> El backend vive en un repo aparte. Aquí solo se listan las llamadas que el frontend hace contra él.

| Endpoint | Método | Llamado desde | Propósito |
|----------|--------|---------------|-----------|
| `/api/tiles/{z}/{x}/{y}` | GET | `Map.tsx` / `HeatmapDemo.tsx` via TileLayer | Tiles H3 con scores |
| `/health` | GET | (futuro) monitoreo | Healthcheck |
| `/api/variables` (US04-AC1, pendiente) | GET | `Dimensions.tsx` | Lista de variables agrupadas por dimensión |
| `/api/reports/pdf` (US06-AC3, pendiente) | POST | `informe/page.tsx` | Genera PDF descargable |

Ver [frontend-backend-integration.md](../architecture/frontend-backend-integration.md) para el patrón de proxy.

---

## 5. Keycloak Admin API

> Llamadas server-side desde Next.js para gestionar usuarios desde la UI `/admin/users`.

**Doc oficial:** https://www.keycloak.org/docs-api/latest/rest-api/

**Wrapper en repo:** [Vento/src/app/Utils/keycloakAdmin.ts](../../Vento/src/app/Utils/keycloakAdmin.ts)

| Función wrapper | Endpoint Keycloak | Para qué |
|-----------------|-------------------|----------|
| `getUsers(search, page, limit)` | `GET /admin/realms/vento/users` | Listar usuarios con paginación |
| `createUser(payload)` | `POST /admin/realms/vento/users` | Crear usuario |
| `updateUser(id, payload)` | `PUT /admin/realms/vento/users/{id}` | Actualizar usuario |
| `deleteUser(id)` | `DELETE /admin/realms/vento/users/{id}` | Borrar usuario |
| `assignRealmRole(id, role)` | `POST /admin/realms/vento/users/{id}/role-mappings/realm` | Asignar rol |
| `resetUserPassword(id, password)` | `PUT /admin/realms/vento/users/{id}/reset-password` | Resetear contraseña |
| `getUserRoles(id)` | `GET /admin/realms/vento/users/{id}/role-mappings/realm` | Listar roles del usuario |

**Notas:**
- Las llamadas requieren un access token de service account o admin. Lo obtiene el wrapper internamente.
- Errores propagan como `KeycloakAdminError` con `status` HTTP.

---

## 6. Web APIs nativas usadas

| API | Para qué | Dónde |
|-----|----------|-------|
| `Intl.NumberFormat('es-CO')` | Formato `1,234.56` con separadores de miles | `AreaDisplay.tsx` |
| `fetch` global | HTTP requests cliente y server-side | Toda llamada al backend |
| `ResizeObserver` (mock en test) | Detección de cambio de tamaño (usado por MapLibre internamente) | Mock en `vitest.setup.ts` |
| `document.fullscreenElement` + `requestFullscreen()` | Modo pantalla completa del mapa | `Map.tsx` |
| `sessionStorage` / `localStorage` | Persistencia client-side (planeado para US04/US05) | Pendiente |
| `URL`, `URLSearchParams` | Construcción de URLs | `auth.ts`, route handlers |
| `Headers`, `Response`, `Request` | Web standard primitives en route handlers Next.js | Todos los `route.ts` |

---

## 7. Cómo añadir una lib nueva

1. Instalar: `cd Vento && npm install <lib>`
2. Documentar aquí su sección antes del primer commit
3. Mencionar el ADR si la decisión es relevante (ej. PDF generation → ADR-013)
4. Si reemplaza algo existente, marcar el viejo como deprecado o eliminarlo

---

## 8. Cómo leer este doc

- Tabla de imports al cabezal de cada archivo === resumen rápido
- Este catálogo === detalle de qué hace cada método
- Doc oficial === fuente última de verdad

Si una lib que ves en el repo NO está aquí, **añadila** antes que se vuelva folklore.
