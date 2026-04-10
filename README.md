# Vento Frontend

Frontend del proyecto Vento — aplicacion web de analisis de viabilidad eolica para Colombia. Renderiza hexagonos H3 sobre un mapa interactivo con mapa de calor por variables de viabilidad.

Este proyecto es exclusivamente el **frontend**. Para que los hexagonos se rendericen correctamente, debe conectarse al backend en FastAPI que procesa y sirve los datos geoespaciales.

## Stack

- **Next.js 16+** (App Router, TypeScript, Tailwind CSS)
- **deck.gl** + **react-map-gl** + **maplibre-gl** (renderizado WebGL)
- **h3-js** (indices H3, geometria hexagonos)

## Arquitectura

```
  ┌──────────────┐       ┌──────────────────┐       ┌──────────┐
  │   Frontend   │──────>│  FastAPI Backend  │──────>│ Parquet  │
  │   (Next.js)  │ HTTP  │  (Python)        │       │  / BD    │
  └──────────────┘       └──────────────────┘       └──────────┘
```

El frontend consume endpoints REST del backend. Sin el backend corriendo, el mapa no mostrara hexagonos.

## Desarrollo local

### 1. Levantar el backend

Ver el README del repositorio `AppVento---Backend` para instrucciones completas. Resumen rapido:

```bash
cd AppVento---Backend/api
pip install -r requirements.txt
PYTHONPATH=. PARQUET_PATH=../../Vento/src/app/Utils/master_variables.h3.parquet uvicorn main:app --port 8000
```

Verificar que responde:
```bash
curl http://localhost:8000/health
```

### 2. Configurar el frontend

```bash
# En Vento/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Levantar el frontend

```bash
cd Vento
npm install
npm run dev
```

Abre `http://localhost:3000` — el mapa cargara los hexagonos desde el backend en `:8000`.

## API Endpoints consumidos

Todos provistos por el backend FastAPI:

| Endpoint | Descripcion |
|----------|-------------|
| `GET /api/tiles/warmup` | Carga parquet e inicializa indice espacial |
| `GET /api/tiles/{z}/{x}/{y}?var=` | Hexagonos para un tile (zoom/x/y) |
| `GET /api/tiles/detail/{h3}` | Detalle completo de un hexagono |
| `GET /api/tiles/variables` | Variables disponibles con rangos min/max |
| `GET /api/tiles/counts?zoom=&var=&selected=` | Conteos globales por resolucion |

## Variables de entorno

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend FastAPI (requerido) | — |

## Notas

- El archivo `master_variables.h3.parquet` no se sube al repo (`.gitignore`). Lo consume el backend, no el frontend.
- Los hexagonos se filtran a Colombia y sus mares circundantes (lat [-4.3, 13.5], lng [-82, -66.5]).
- La autenticacion se maneja via Keycloak (realm `vento`, client `vento-web`). El backend valida los tokens JWT.

## Configuración de Keycloak para Gestión de Usuarios

Para que el panel de administración de usuarios (ruta `/admin/users`) funcione correctamente comunicándose con la Admin REST API de Keycloak, el cliente definido en `AUTH_KEYCLOAK_ID` (`vento-web` por defecto) debe tener los siguientes requisitos en la consola de Keycloak:

1. **Client Authentication**: Debe estar en "On" (para que requiera client secret).
2. **Service Accounts Enabled**: Debe estar activo (permite al cliente usar Client Credentials Grant).
3. **Roles de Service Account**:
   - Ir a la pestaña "Service accounts roles" del cliente.
   - Presionar "Assign role".
   - Filtrar por "Filter by clients".
   - Buscar el cliente `realm-management` y asignarle el rol **`manage-users`**.

Adicionalmente, se recomienda que existan dos Realm Roles configurados llamados exactamente `"admin"` y `"analista"`.
