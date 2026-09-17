# Stories — Sprint 4 (Cuarta Entrega)

El workflow [`sync-stories.yml`](../../workflows/sync-stories.yml) sincroniza
**solo** los `*.yml` de esta carpeta hacia GitHub Issues + **Project #2**, con el
milestone **"Cuarta Entrega"**. Se dispara **MANUALMENTE** (Actions → Run
workflow); no corre en push. Los sprints anteriores viven en `../sprint-01/` y
`../sprint-02/` y ya no se re-sincronizan.

## Cómo agregar una story
Crea un `.yml` aquí con este esquema (igual que los sprints previos):

```yaml
id: US06-03
title: "[US06-03] Preconfigurar informe de idoneidad"
epic: "E6-Reportes"
epic_label: "epic:E6-Reportes"        # labels válidos: E2-Mapa-SIG, E3-Admin, E4-Variables, E6-Reportes, E7-UX
priority: critica                      # critica | alta | media
priority_label: "priority:critica"
milestone: "Cuarta Entrega"
depends_on: []
unlocks: ""
week: 1
body: |
  ## Historia de Usuario
  ...
  ## Criterios de Aceptación
  ...
  ## Tareas técnicas
  ...
```

Al hacer `push` de esta carpeta (o `workflow_dispatch`), el workflow crea/actualiza
el issue por título exacto y lo añade al Project #2.

## Estado
**Todas las HUs del PDF del Sprint 4 están incluidas** (14): US06-03, US06-04,
US08-01, US08-02, US08-03, US08-04, US04-02, US04-03, US04-04, US04-05, US09-03,
US09-04, US03-04, QA-04. (Los manuales de usuario/técnico/instalación quedan
FUERA: los cubre la empresa.)
