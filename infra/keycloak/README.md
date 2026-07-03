# Keycloak — entorno local / e2e

```bash
docker compose up -d   # Keycloak 26.2 + Postgres, importa realm-export.json
```

Realm `vento`, cliente `vento-web`, roles `admin` y `analista`.

## Usuarios de prueba (SOLO DEV / E2E)

`realm-export.json` siembra dos usuarios usados por la suite Playwright del
frontend (`Vento/e2e/`). **Nunca usar estas credenciales fuera de entornos
locales o CI** — igual que el client secret `dev-secret-change-in-production`,
existen únicamente porque este realm jamás debe desplegarse a producción.

| Usuario | Password | Roles |
|---|---|---|
| `e2e-analista` | `e2e-analista-password` | `analista` |
| `e2e-admin` | `e2e-admin-password` | `admin`, `analista` |

## Re-importar el realm

El volumen `keycloak_pgdata` persiste la base: si el realm ya existe, los
cambios en `realm-export.json` (p. ej. usuarios nuevos) **no se aplican** al
reiniciar. Para forzar el re-import:

```bash
docker compose down -v && docker compose up -d
```
