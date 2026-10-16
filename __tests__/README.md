# Tests en Vento

Este proyecto usa **Vitest + React Testing Library** para tests unitarios.

## Estructura

- `__tests__/unit/`: tests unitarios (espejo de `src/`).

Ejemplo:
- `__tests__/unit/app/page.test.tsx` prueba `src/app/page.tsx`.

## Comandos

Desde `Vento/`:

- `npm run test`: ejecuta tests unitarios en modo desarrollo.
- `npm run test:ci`: ejecuta tests unitarios en modo una sola corrida (ideal para CI).

## Convenciones

- Nombres de archivos: `*.test.ts` o `*.test.tsx`.
- Tests de UI: usar React Testing Library.
- Tests de auth/API: mockear servicios externos (NextAuth, Keycloak, fetch).
- No conectarse a servicios reales en unit tests.
