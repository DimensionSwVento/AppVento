---
id: ADR-010
title: Hosting en AccuWeb — No uso de Supabase + Vercel
status: aceptado
date: 2026-04-20
---

# ADR-010: Hosting en AccuWeb — No uso de Supabase + Vercel

## Contexto

[tecnologias.md §9](../architecture/tecnologias.md) propuso como "Combinación Recomendada para Producción":

- **Frontend + CDN**: Vercel (100GB bandwidth gratis)
- **API serverless**: Vercel API Routes
- **BD**: Supabase PostgreSQL + PostGIS
- **Storage**: Supabase Storage
- **Keycloak**: Railway / Render / servidor propio
- **Costo total**: $0 en free tier, ~$45/mes al escalar

En la práctica se eligió **AccuWeb.cloud** para frontend y Keycloak, con el backend FastAPI en infraestructura separada.

Este ADR documenta **por qué Supabase + Vercel no se usaron**, a pesar de ser la recomendación técnica.

## Decisión

**Usar AccuWeb.cloud para hosting del frontend Next.js y del servidor Keycloak.** Supabase y Vercel quedan descartados para la primera entrega.

## Razones para elegir AccuWeb

1. **Restricción del cliente / presupuesto**: el cliente (ANH/EAFIT/mavalan) ya tenía cuenta en AccuWeb con capacidad disponible. Usar ese hosting no añade costo marginal al proyecto; Vercel Pro ($20/mes/miembro) y Supabase Pro ($25/mes) sí lo harían al salir del free tier.
2. **Requisito institucional de datos en país**: para software con respaldo gubernamental (ANH), puede haber preferencia (explícita o implícita) por hosting que no vendore-lock a empresas estadounidenses. AccuWeb.cloud es una opción más neutra.
3. **Equipo ya familiarizado con cPanel**: los devs del proyecto tienen experiencia con el panel de AccuWeb. Vercel requiere aprender workflows nuevos (edge functions, env vars via CLI).
4. **Simplicidad de un solo proveedor**: Supabase + Vercel = dos facturas, dos dashboards, dos rotaciones de secrets. AccuWeb consolida frontend + Keycloak + (eventualmente) backend en un solo proveedor.
5. **PostgreSQL en hosting propio es suficiente**: PostGIS + h3-pg se instalan en un PostgreSQL provisionado en AccuWeb. Supabase no aporta valor único para el scope actual.

## Razones por las que Supabase + Vercel *serían mejores* (rechazadas pero válidas)

1. **Vercel Edge Network** = latencia muy baja globalmente. AccuWeb sirve desde una región sola.
2. **CI/CD nativo**: push a GitHub → deploy automático Vercel con preview por PR. AccuWeb requiere configuración manual via cPanel (y el CI custom que tenemos tiene fricciones — ver [accuweb-runbook.md §8](../ops/accuweb-runbook.md)).
3. **Supabase Auth** podría reemplazar Keycloak en deliverables futuros, pero ya decidimos Keycloak (ADR-005).
4. **Soporte PostGIS gestionado**: Supabase tiene PostGIS como extensión sin configuración. En AccuWeb hay que instalar y mantener manualmente.
5. **Serverless API Routes** en Vercel permiten escalar sin reservar infra. AccuWeb tiene recursos fijos.

## Consecuencias

### Positivas
- **Costo real $0** al cliente (usa cuota existente de AccuWeb).
- **Un solo proveedor** que gestionar.
- **Sin vendor lock-in** a servicios que podrían cambiar T&C.

### Negativas
- **Limitaciones de AccuWeb**: nginx con buffers chicos (obligó a reducir cookies), HTTPS externo con HTTP interno (obligó a `httpsToHttp()` en auth), sin acceso a config de nginx. Ver [tech-stack-validation.md §13](../architecture/tech-stack-validation.md).
- **CI frágil**: pipeline custom que depende de automations propias (ver [accuweb-runbook.md §8](../ops/accuweb-runbook.md)).
- **Latencia global peor** que Vercel Edge — aceptable porque la audiencia principal es Colombia.

### Riesgos
- **Crecimiento bloqueado**: si el tráfico crece 10x, AccuWeb puede ser insuficiente. Evaluar migración a Vercel + Supabase si eso pasa (ver §Reversibilidad).
- **SLA menos predecible** que Vercel — no hay dashboards de uptime pública.

## Reversibilidad

La migración a Vercel + Supabase es **técnicamente viable** si cambian las circunstancias:

1. **Frontend → Vercel**: Next.js es nativo de Vercel. Migración: conectar GitHub repo, configurar env vars. Tiempo estimado: 2h.
2. **DB → Supabase**: exportar PostgreSQL + PostGIS al formato de Supabase. Tiempo: 4-8h según volumen.
3. **Keycloak → Railway / Render**: contenedor Docker con realm-export. Tiempo: 1h.
4. **DNS cutover**: cambiar apuntamiento del dominio. Tiempo: 15 min + TTL.

Total migración: ~1-2 días si se decide. Nada en el stack actual **impide** esta migración — la decisión es puramente operativa.

## Revisión

Este ADR se revisa si:
- El cliente cambia de hosting institucional
- AccuWeb deja de ser viable (costo, performance, limitaciones)
- El tráfico supera capacidad del plan actual

---

**Aceptado por**: Mavalan Software en consulta con el cliente.
**Próxima revisión**: a los 6 meses post-deploy v1.0 (evaluar métricas reales de AccuWeb vs proyecciones).
