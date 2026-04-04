# Keycloak Custom Theme — Compiled JARs

This directory stores the compiled `.jar` files for the Vento custom Keycloak login theme.

## Files

| JAR | Keycloak versions |
|-----|-------------------|
| `keycloak-theme-for-kc-22-to-25.jar` | Keycloak 22.x – 25.x |
| `keycloak-theme-for-kc-all-other-versions.jar` | Keycloak 26.x and others |

The theme is customized and compiled externally. Only the resulting `.jar` files are stored here.

## Local development (Docker)

The `docker-compose.yml` mounts `keycloak-theme-for-kc-all-other-versions.jar` into
`/opt/keycloak/providers/` automatically. No extra steps needed — just run:

```bash
cd infra/keycloak && docker compose up -d
```

Then select the theme in **Realm settings → Themes → Login theme** — on the **vento** realm, not `master` (the frontend uses `vento` for OIDC). See [../README.md](../README.md) (“Two different logins”).

## Production deployment

1. Connect to the server where Keycloak is installed.
2. Copy the appropriate JAR into the Keycloak `providers/` directory:
   ```
   <keycloak-install-dir>/providers/
   ```
   For example, on the current production instance (Keycloak 26.0.7):
   ```
   keycloak-26.0.7/providers/keycloak-theme-for-kc-all-other-versions.jar
   ```
3. Rebuild Keycloak (or restart the service) so it picks up the new provider:
   ```bash
   bin/kc.sh build   # if needed
   ```
4. In the Admin Console, go to **Realm settings → Themes → Login theme** and select the custom theme.

## Updating the theme

1. Generate the new compiled `.jar` externally.
2. Replace the corresponding file in this directory.
3. Commit to the repo.
4. Upload to the production server's `providers/` directory.
5. Restart/rebuild Keycloak in production.
