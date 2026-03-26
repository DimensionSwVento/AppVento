---
id: ADR-007
title: Backend en Primera Entrega con Arquitectura Limpia, DDD y Estructura Monorepo
status: aceptado
date: 2026-03-24
supersedes: ADR-003 (parcialmente)
---

# ADR-007: Backend en Primera Entrega con Arquitectura Limpia, DDD y Estructura Monorepo

## Contexto

El ADR-003 original decidió no construir backend API en la primera entrega. Sin embargo, con la incorporación de Keycloak (ADR-005) y la escala real del proyecto (50+ personas, agencia nacional, usuarios profesionales de todo el país), se reconsidera esta decisión:

1. **El frontend necesita un backend** para: validar tokens Keycloak, exponer endpoints de datos, servir como intermediario seguro
2. **La escala del proyecto exige estructura profesional** desde el inicio — no se puede empezar con código ad-hoc y refactorear después
3. **Monorepo vs repos separados:** con múltiples áreas y equipos, un monorepo facilita coordinación

## Decisión

### 1. Backend en Primera Entrega

**SÍ construir backend desde la primera entrega**, pero con alcance controlado:

- Validación de tokens Keycloak (middleware)
- Endpoints para servir datos geoespaciales (proxy/cache del JSON)
- Endpoints protegidos para funcionalidad admin que exceda Keycloak
- Health checks y logging básico

### 2. Arquitectura Limpia + DDD

El backend debe seguir **Clean Architecture** (Robert C. Martin) con principios de **Domain-Driven Design**:

```
backend/
├── src/
│   ├── domain/              # Entidades, value objects, interfaces de repositorio
│   │   ├── entities/        # User, Hexagon, AnalysisArea, etc.
│   │   ├── value-objects/   # H3Index, Score, Coordinate, etc.
│   │   └── ports/           # Interfaces (contratos) de repositorios y servicios externos
│   │
│   ├── application/         # Casos de uso / servicios de aplicación
│   │   ├── use-cases/       # LoginUser, GetHexagons, FilterByVariable, etc.
│   │   └── dto/             # Data Transfer Objects
│   │
│   ├── infrastructure/      # Implementaciones concretas
│   │   ├── persistence/     # Repositorios PostgreSQL/PostGIS
│   │   ├── auth/            # Integración Keycloak (adapter)
│   │   ├── data/            # Lectura JSON/Parquet (adapter)
│   │   └── http/            # Controllers/Routes (Express, Fastify, FastAPI)
│   │
│   └── shared/              # Utilidades cross-cutting (logging, errors, config)
```

**Principios obligatorios:**
- Dependencias apuntan hacia adentro (domain no depende de infrastructure)
- Domain es puro — sin frameworks, sin I/O
- Casos de uso orquestan, no implementan detalles
- Ports & Adapters: interfaces en domain, implementaciones en infrastructure

### 3. Estructura Monorepo

```
Vento/
├── apps/
│   ├── web/                 # Frontend (Angular/React)
│   └── api/                 # Backend (Clean Architecture + DDD)
├── packages/
│   ├── shared-types/        # Tipos TypeScript compartidos (H3, scores, DTOs)
│   └── h3-processor/        # Scripts Python de pre-procesamiento
├── infra/
│   ├── docker/              # Dockerfiles por servicio
│   ├── keycloak/            # Configuración realm Keycloak
│   └── ci/                  # Configuración CI/CD
├── docs/                    # Documentación (existente)
├── .env.example             # Variables de entorno
├── docker-compose.yml       # Orquestación local
├── turbo.json / nx.json     # Config monorepo (según framework)
└── package.json             # Root workspace
```

**Herramienta monorepo:** Turborepo (si React) o Nx (si Angular). Para Python, directorio con `pyproject.toml` propio.

## Justificación

### ¿Por qué backend desde el inicio?
- Keycloak necesita un backend que valide tokens y sirva como resource server
- Servir datos JSON directamente desde el frontend es inseguro y no escalable
- Migrar de "sin backend" a "con backend" después es más costoso que empezar con uno ligero bien estructurado

### ¿Por qué Clean Architecture + DDD?
- Proyecto de escala nacional con 50+ personas — no se puede improvisar estructura
- DDD alinea el código con el dominio del negocio (hexágonos, scores, dimensiones, análisis)
- Clean Architecture permite cambiar infraestructura (BD, auth, formato datos) sin tocar lógica de negocio
- Facilita testing: domain y use-cases se testean sin infraestructura

### ¿Por qué monorepo?
- Un solo repositorio para frontend + backend + scripts + infra
- Tipos compartidos entre frontend y backend (TypeScript)
- CI/CD unificado — un pipeline, múltiples targets
- Onboarding simple: `git clone` → `docker-compose up` → todo funciona
- 50+ personas coordinándose necesitan una fuente de verdad, no fragmentación

## Consecuencias

- **Supersede parcialmente ADR-003:** Ahora SÍ hay backend en primera entrega, pero con scope controlado
- Se requiere definir tecnología de backend: FastAPI (Python) o NestJS/Express (Node.js/TypeScript)
- La estructura DDD agrega complejidad inicial pero reduce deuda técnica a largo plazo
- El monorepo requiere configuración de workspaces (npm/yarn/pnpm workspaces)
- El equipo debe familiarizarse con los principios de Clean Architecture

## Relación con Otros ADRs

| ADR | Relación |
|-----|----------|
| ADR-003 | Supersedido parcialmente — ahora hay backend |
| ADR-005 | Backend valida tokens Keycloak como resource server |
| ADR-006 | Backend puede servir como proxy/cache de datos geoespaciales |
