# AI Pipeline Analyzer

Todo lo que participa en la fase **Test → AI Analysis → Deploy gate** del protocolo vive aquí. La evidencia generada sigue bajo `../quality-evidence/` (no se versiona en Git; ver `.gitignore`).

| Archivo | Rol |
|---------|-----|
| `quality-attributes.config.json` | Mapeo atributo ↔ patrones de suite Vitest |
| `quality-attributes-collect.mjs` | Colector determinístico → `quality-evidence/reports/attribute-coverage.*` |
| `ai-pipeline-analyzer.mjs` | Llamada OpenRouter + fallback heurístico → `quality-evidence/ai/*` |
| `deployment-gate.mjs` | Lee la recomendación y exit-codea → `quality-evidence/decision/*` |
| `qa-simulate.mjs` | Escenarios sintéticos negativos (solo local) |
| `prompts/ai-analyzer.system.md` | System prompt versionado |

**Comandos** (desde `Vento/`): `npm run qa:collect`, `qa:ai`, `qa:gate`, `qa:pipeline`, `qa:simulate`.
