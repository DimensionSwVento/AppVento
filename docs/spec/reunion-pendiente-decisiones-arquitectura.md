---
tipo: convocatoria-reunion
status: pendiente
fecha_sugerida: por-definir
prioridad: alta
---

# Reunión de Decisiones Arquitectónicas — Vento

## Objetivo

Revisar y validar las decisiones arquitectónicas documentadas en ADR-005, ADR-006 y ADR-007. Alinear al equipo multidisciplinario antes de iniciar implementación.

## Figuras Esperadas para Resolver Dudas

| Figura | Por qué se necesita |
|--------|---------------------|
| **Arquitecto de software** | Validar Clean Architecture + DDD, monorepo y decisiones técnicas de ADR-007 |
| **Responsable de producto (PO/PM)** | Priorización, alcance de nuevas historias y alineación con visión de negocio |
| **Perfil DevOps / Infraestructura** | Decisiones sobre CI/CD, Docker, despliegue de Keycloak, storage (S3/CDN) |
| **Representante del equipo de datos** | Decisión clave: formato de entrega del motor multicriterio (archivos vs API vs BD compartida) |
| **Representante científico/universidad** | Validar que la arquitectura soporta los datos y modelos científicos del proyecto |
| **Representante de seguridad/compliance** | Requisitos de seguridad gubernamental, evaluación de Keycloak como proveedor OIDC |
| **Perfil QA** | Impacto de las nuevas historias e infraestructura en el plan de testing |

## Cosas a discutir

### 1. Contexto
- Resumen del estado actual del proyecto
- Presentar las 6 nuevas historias de usuario y 3 nuevos ADRs

### 3. ADR-006: Storage y Cache de Datos — REQUIERE DECISIÓN
- **Pregunta clave para el cliente:**
  > "¿Los datos del motor multicriterio seguirán entregándose como archivos (.h3.parquet) indefinidamente, o hay posibilidad de exponer resultados vía API o BD compartida en el futuro?"
- **Impacto:** Define si la arquitectura se optimiza para archivos estáticos (S3+CDN) o para datos dinámicos (PostgreSQL+API)
- **Nota:** El motor multicriterio es del cliente, ejecutado offline. El cliente decide el formato
- **Estado ADR:** Pendiente decisión equipo. Cache en frontend SÍ está listo como historia (US-CACHE)

### 4. ADR-007: Backend + Clean Architecture + DDD + Monorepo
- **Decisiones:**
  - Backend DESDE primera entrega (supersede ADR-003)
  - Arquitectura Limpia con DDD
  - Estructura monorepo
- **A discutir:** Tecnología de backend (FastAPI vs NestJS vs Express). Herramienta monorepo (Turborepo vs Nx)
- **Estado:** Listo como historias de usuario (US-MONO, US-DDD, US-CI, US-ENV)

### 5. Próximos pasos

## Nota Importante

Todo lo discutido en esta reunión está documentado como decisiones ADR. Sin embargo, **no todas las decisiones ADR son historias de usuario todavía**:

| Decisión | ¿Es historia de usuario? | Estado |
|----------|--------------------------|--------|
| Keycloak (ADR-005) | ✅ Sí — US-KEY | Lista para implementar |
| Cache frontend (ADR-006) | ✅ Sí — US-CACHE | Lista para implementar |
| Storage definitivo S3/CDN vs BD (ADR-006) | ❌ No aún | Requiere decisión con cliente |
| Backend DDD (ADR-007) | ✅ Sí — US-DDD | Lista para implementar |
| Monorepo (ADR-007) | ✅ Sí — US-MONO | Lista para implementar |
| CI Pipeline (ADR-007) | ✅ Sí — US-CI | Lista para implementar |
| Variables de entorno (ADR-007) | ✅ Sí — US-ENV | Lista para implementar |
| Tecnología backend específica | ❌ No aún | Requiere decisión equipo |
| Herramienta monorepo específica | ❌ No aún | Requiere decisión equipo |
