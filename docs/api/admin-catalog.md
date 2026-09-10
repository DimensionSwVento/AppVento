# API — Catálogo de administración (Sprint 4 · US08-01/02/03)

Endpoints que consume el frontend a través del BFF Next
(`/api/admin/catalog/*` → `proxyBackend` → **FastAPI**). El BFF ya:

- valida sesión Keycloak y **exige rol `admin`** (403 si no),
- inyecta identidad: headers `X-User-Sub`, `X-User-Roles`, `X-Internal-Secret`.

FastAPI debe exponer las rutas **con el mismo path** bajo `/api/admin/catalog/…`
y confiar en `X-Internal-Secret` + `X-User-Roles` (contiene `admin`).

Activar el consumo real: `NEXT_PUBLIC_USE_BACKEND=true` (si no, el front usa un
store template en memoria, la UI ya funciona).

---

## 1. Variables y datasets — US08-01

### `GET /api/admin/catalog/variables?tipo=modelo|informativa`
Lista las variables del tipo pedido. **Respuesta** `AdminVariable[]`:
```jsonc
{
  "id": "wpd",
  "label": "Densidad de potencia WPD",
  "dimension": "tecnica",
  "dimensionLabel": "Técnica",
  "tipo": "modelo",              // "modelo" | "informativa"
  "enabled": true,              // modelo: SIEMPRE true (no deshabilitable)
  "enMapa": true,
  "enMenu": false,
  "excluyente": false,
  "fuente": "IDEAM",
  "unidad": "m/s",
  "rango": "0–100 (normalizado)",
  "descripcion": "…",
  "datasetVersion": "v1.0",
  "datasetUpdatedAt": "2024-05-10"
}
```

### `POST /api/admin/catalog/variables`
Crea una variable **informativa** (las del modelo no se crean aquí). **Body**:
`{ label, dimension, enMapa?, enMenu?, excluyente?, fuente?, unidad?, rango?, descripcion? }`
→ **201** `AdminVariable`.

### `PATCH /api/admin/catalog/variables/:id`
Edita detalle / habilita-deshabilita / mapa-menú. **Body** = `Partial<AdminVariable>`.
Regla: si `tipo === "modelo"`, ignorar `enabled` (no se puede deshabilitar).
→ `AdminVariable` actualizado.

### `PATCH /api/admin/catalog/datasets/:id`
Actualiza el dataset asociado a la variable `:id` (nueva carga/versión).
**Body**: `{ version: string }` → `AdminVariable` (con `datasetVersion`/`datasetUpdatedAt`).

---

## 2. Normativa regulatoria — US08-02

`Norma = { id, nombre, descripcion, estado }`
`estado ∈ "aplica" | "tramite" | "verificacion" | "no-aplica"`

- `GET  /api/admin/catalog/normas` → `Norma[]`
- `POST /api/admin/catalog/normas` — body `{ nombre, descripcion, estado }` → **201** `Norma`
- `PATCH /api/admin/catalog/normas/:id` — body `Partial<Norma>` → `Norma`
- `DELETE /api/admin/catalog/normas/:id` → **204**

Alimentan la dimensión Regulatoria del informe (semáforo + etiquetas).

---

## 3. Escenarios económicos — US08-03

`AdminEscenario = { id, label, description, horizonte }` (`horizonte` = años).

- `GET  /api/admin/catalog/escenarios` → `AdminEscenario[]`
- `POST /api/admin/catalog/escenarios` — body `{ label, description, horizonte }` → **201**
- `PATCH /api/admin/catalog/escenarios/:id` — body `Partial<AdminEscenario>` → `AdminEscenario`
- `DELETE /api/admin/catalog/escenarios/:id` → **204**

Alimentan el panel económico (modal) y la sección económica del informe.

---

## 4. Usuarios — filtro por rol (US08-04.5)

Cambio pequeño en el endpoint EXISTENTE `GET /api/admin/users`:
incluir el **rol** de cada usuario en el listado para poder filtrar sin N+1.

**Hoy:** `{ users: [{ id, firstName, lastName, email, enabled, createdTimestamp }] }`
**Pedido:** añadir `role: "admin" | "analista"` a cada usuario
→ `{ users: [{ …, role }] }`.

(Keycloak: resolver el realm-role en el mismo listado, o un endpoint
`GET /api/admin/users/roles?ids=…` en lote.)

---

### Notas
- Errores: `{ "error": "mensaje" }` con el status HTTP correspondiente.
- El front hace *fallback* a template si `USE_BACKEND=false`; con backend real,
  cada método pega a estas rutas (ver `src/app/Utils/admin/catalogApi.ts`).
