# Workflows propios de `deploy-prod` (fuente)

Estos YAML **no se ejecutan** en `develop`/`main`: están fuera de
`.github/workflows/` a propósito. Son la **fuente** de los workflows que deben
vivir en la rama `deploy-prod`.

## Por qué existen aquí

El job `deploy` de `ci.yml` reconstruye `deploy-prod` como una rama *orphan*
que contiene **solo `Vento/` aplanado** y hace `rm -rf` del resto. Eso borra el
`.github/workflows/` de `deploy-prod` en cada deploy. Como `deploy-front.yml` es
el que dispara el **deploy SSH real** a producción, perderlo deja producción sin
mecanismo de despliegue.

Para evitarlo, `ci.yml` (job `deploy`, solo cuando el destino es `deploy-prod`)
copia estos archivos a `.github/workflows/` de la rama de deploy antes del
`git push --force`. Así `deploy-prod` siempre conserva sus workflows.

## Archivos

- **`deploy-front.yml`** — build + SSH (gate→front) + `rsync` de `.next`/`public`
  + `systemctl restart nextjs`. Se dispara con `push` a `deploy-prod`.
- **`guard-deploy-prod.yml`** — bloquea que carpetas meta (`_bmad`, `docs`,
  `infra`, `Reportes_Entregas`, …) entren a `deploy-prod`.

## Si editas el deploy de producción

Edita el archivo **aquí** (no en la rama `deploy-prod`, que se regenera). El
cambio llega a `deploy-prod` en el siguiente deploy de `main`.
