---
version: 1.0
date: 2026-07-31
scope: quality-attributes-oriented CI/CD pipeline for the Vento frontend
---

# Quality-Attributes-Oriented CI/CD Pipeline

This document describes the pipeline referenced in the paper *"Automated Testing
for Energy GIS Software Applications Based on Quality Attributes"*. It explains
what the pipeline is made of, what each stage consumes and produces, and how to
reproduce a run.

Everything described here lives in [`quality/`](../../quality) and
[`.github/workflows/quality-pipeline.yml`](../../.github/workflows/quality-pipeline.yml).
The pipeline is **additive**: it does not replace
[`frontend-ci.yml`](../../.github/workflows/frontend-ci.yml), which remains the
workflow that gates merges today.

---

## 1. What the approach consists of

Two artifacts and one pipeline.

1. **A catalog of 13 quality attributes** relevant to GIS applications in the
   energy sector. For each attribute: a description, the tests the catalog
   requires, and the evidence expected for the attribute to be considered
   satisfied.
2. **An inventory of quality gates** that exist in this repository, each
   declaring the single attribute it serves and which of that attribute's
   catalog tests it actually implements.
3. **A CI/CD pipeline** that runs the gates on every change, normalizes their
   evidence, analyses it, and decides whether the change may be deployed.

The catalog is not only a test specification. It is the **reference model**: the
analysis stage receives catalog entries as context, and that is what lets it move
from a line of Vitest or `tsc` output to a statement about a quality attribute.

---

## 2. Files

| Path | Role |
| --- | --- |
| `quality/quality-attributes.json` | The catalog. 13 attributes. |
| `quality/quality-attributes.schema.json` | Schema for the catalog. |
| `quality/gates.json` | Gate inventory: gate → attribute mapping. |
| `quality/gates.schema.json` | Schema for the inventory. |
| `quality/evidence-bundle.schema.json` | Contract for the per-run evidence bundle. |
| `quality/prompts/level1-diagnostic.system.md` | System prompt, diagnostic stage. |
| `quality/prompts/level2-coverage.system.md` | System prompt, recommendation stage. |
| `quality/scripts/lib/model.mjs` | Loads catalog and inventory; **the only implementation of coverage computation**. |
| `quality/scripts/validate-catalog.mjs` | Validates the catalog. |
| `quality/scripts/validate-gates.mjs` | Validates the inventory and cross-checks it against the catalog. |
| `quality/scripts/coverage-inventory.mjs` | Prints the attribute coverage inventory. |
| `quality/scripts/collect-evidence.mjs` | Runs the gates, emits the evidence bundle. |
| `quality/scripts/validate-bundle.mjs` | Validates a bundle against its schema and the model. |
| `quality/scripts/analyze-level1.mjs` | Diagnostic stage. |
| `quality/scripts/analyze-level2.mjs` | Coverage-recommendation stage. |
| `quality/scripts/deployment-decision.mjs` | Deterministic deployment decision. |
| `quality/scripts/render-summary.mjs` | Renders the bundle into the job summary. |
| `quality/scripts/fetch-run-bundle.mjs` | Recovers a bundle from a finished run. |
| `quality/scripts/paper-report.mjs` | Generates the paper's quantitative tables. |
| `quality/evidence/run-<id>.json` | One normalized bundle per run. |
| `quality/reports/paper-material.md` | Generated material for the paper. |

---

## 3. The catalog

Each of the 13 entries has this shape:

```json
{
  "id": "data-quality",
  "name": "Data Quality",
  "description": "System capability to work with complete, consistent spatial data suitable for the territorial context",
  "tests": ["positional accuracy tests", "spatial completeness tests", "..."],
  "expectedEvidence": ["positional errors within defined thresholds", "..."],
  "supportingStudies": [16, 18],
  "criticality": null
}
```

`criticality` is `null` for every attribute on purpose. It is a value the team
assigns; **the pipeline never infers it and never uses it to weight anything.**

The schema is strict (`additionalProperties: false`) and pins the catalog to
exactly 13 entries, so an accidental deletion, duplication or misspelt key fails
CI. `validate-catalog.mjs` adds the two invariants JSON Schema cannot express:
unique ids and unique names.

---

## 4. The gate inventory

A **quality gate** is an automated evaluation point in the pipeline. Each gate
declares:

```json
{
  "id": "h3-boundary-tests",
  "name": "H3 boundary and geospatial constant tests",
  "attributeId": "data-quality",
  "description": "Tests of the official IGAC boundary artifact and the derived territorial constants...",
  "source": { "kind": "vitest", "include": ["src/app/Utils/h3Resolution.test.ts", "..."] },
  "catalogTests": ["positional accuracy tests", "spatial completeness tests", "metadata validation"],
  "blocking": true,
  "enabled": true
}
```

Twelve gates are currently declared, of four kinds: `vitest`, `playwright`,
`command` and `npm-audit`.

Two conventions matter:

- **The seven `vitest` gates partition the unit suite.** They declare disjoint
  file globs, and the suite runs **once**; each gate is a partition of that
  single run. `validate-gates.mjs` enforces that every unit test file on disk is
  claimed by exactly one gate, so tests and assertions per attribute add up
  without double counting, and a new test file that no gate claims fails CI.
- **`catalogTests` may be empty, and often should be.** `health-route-test` does
  not implement "connectivity tests to data sources": the route returns a static
  payload and touches no data source. Recording `[]` is what makes Availability
  correctly surface as weakly covered. Claiming otherwise would inflate the
  coverage figures.

`validate-gates.mjs` also rejects a gate that names an attribute outside the
catalog, or that claims a `catalogTests` entry which is not verbatim one of that
attribute's tests.

### Attribute coverage

Coverage is computed by `computeAttributeCoverage()` in `lib/model.mjs`, from the
catalog and the inventory, every time it is needed:

- **uncovered** — no gate declares the attribute;
- **covered** — its gates implement at least `strongCoverageMinRatio` (0.5, set
  in `gates.json`) of its catalog tests;
- **weak** — it has gates but implements less than that.

**No coverage figure is stored anywhere as a constant.** Change a gate's
`attributeId` and the numbers move. Run it with:

```bash
node quality/scripts/coverage-inventory.mjs
```

---

## 5. The workflow

`.github/workflows/quality-pipeline.yml` contains **two jobs**.

```
                    ┌───────────────────────────────────────────┐
   push / PR  ─────▶│ Job 1 — quality-evidence                  │
                    │                                           │
                    │  validate catalog                         │
                    │  validate gate inventory                  │
                    │  attribute coverage inventory             │
                    │  run the 12 gates                         │
                    │  ▼                                        │
                    │  evidence bundle  (run-<id>.json)         │
                    │  ▼                                        │
                    │  analyzer level 1 — diagnostic            │
                    │  analyzer level 2 — recommendation        │
                    │  ▼                                        │
                    │  deployment decision (deterministic)      │
                    └────────────────┬──────────────────────────┘
                                     │ job outputs:
                                     │ decision, deploy_allowed, reason
                                     ▼
                    ┌───────────────────────────────────────────┐
                    │ Job 2 — deployment-gate                   │
                    │  allow  → job succeeds (simulated deploy) │
                    │  block  → job fails                       │
                    └───────────────────────────────────────────┘
```

The catalog and the inventory are validated **before any gate runs**, so a run
can never collect evidence against a model that does not hold together.

> **Organization policy.** Actions from outside DimensionSwVento are not
> permitted, so this workflow uses no marketplace action — not even
> `actions/checkout`. Checkout is done with `git` and `github.token`, and Node
> comes from the runner tool cache. The same constraint applies to
> `actions/upload-artifact`, which is why the evidence bundle is printed into the
> job log instead of uploaded, and recovered afterwards with
> `fetch-run-bundle.mjs`.

---

## 6. The evidence bundle

One artifact per run, `quality/evidence/run-<id>.json`. It is the **sole input**
to the analysis stage and the **sole source** of the quantitative results
reported in the paper, so its shape is a contract: fields may be added, never
renamed or removed. `validate-bundle.mjs` enforces it.

```json
{
  "runId": "30600550960",
  "commit": "73f24dc4...",
  "timestamp": "2026-07-31T03:07:50.572Z",
  "workflowDurationMs": 222952,
  "catalogVersion": "1.0.0",
  "gatesVersion": "1.0.0",
  "assertionCountMethod": "static-expect-calls",
  "gates": [
    {
      "gateId": "h3-boundary-tests",
      "attributeId": "data-quality",
      "status": "passed",
      "testsRun": 12, "testsPassed": 12, "assertions": 26,
      "durationMs": 31912,
      "logExcerpt": "...",
      "artifacts": ["..."],
      "diagnostic": null
    }
  ],
  "coverage": { "lines": 61.67, "branches": 52.64 },
  "audit": { "critical": 2, "high": 6, "moderate": 5, "low": 0 },
  "attributeCoverage": { "covered": ["..."], "uncovered": ["..."] },
  "analysis": null,
  "deployment": { "decision": "allow" }
}
```

Four decisions inside the collector are worth knowing:

- **The bundle is always written and always valid JSON**, including when gates
  fail. Producing evidence is the collector's only job, and a failed gate *is*
  evidence, so the collector always exits 0.
- **Gate status comes from the Vitest JSON report, not from the process exit
  code.** Vitest exits non-zero when a *coverage threshold* fails even if every
  test passed; reading the report means a threshold miss can never mislabel
  passing tests as failed.
- **`--coverage.reportOnFailure` is passed explicitly.** Vitest defaults it to
  `false`, so any run with a failing test would produce no coverage at all —
  precisely the runs most worth analysing. It is passed on the command line so
  that `npm run test:coverage` keeps its current behaviour for the team.
- **Stack frames pointing into `node_modules` are dropped** from log excerpts.
  They are the bulk of a Vitest failure message and carry nothing about the
  defect. Every frame naming project code is kept verbatim.

`assertions` is a **static count of `expect(` calls** in the gate's test files.
Vitest does not report per-test expect counts, so there is no runtime figure;
`assertionCountMethod` records the method in the bundle rather than implying
instrumentation.

---

## 7. The analysis stage

The stage is **hybrid**, and the split is the point.

### Deterministic layer

Answers the closed question — *is the expected evidence present?* — as pass/fail
per gate. Rules are sufficient here, and rules are what may stop a deployment.

### Generative layer

Answers two open questions that rules cannot, because the input is unstructured,
heterogeneous log text whose wording changes between library versions.

**Level 1 — diagnostic.** One call per **failed** gate. A run with every gate
green makes no call at all. The prompt carries:

- the gate's log excerpt and metrics;
- the **full catalog entry** for the attribute that gate serves;
- the list of all 13 attribute identifiers.

It returns `rootCause`, `affectedAttributeId`, `whyItMatters`, `remediation` and
`confidence`. `affectedAttributeId` is constrained twice — by the response
schema's `enum` and by revalidation in code. An identifier outside the catalog is
**retried once** with a corrective message and then recorded as rejected; it is
never patched to a valid value.

**Level 2 — coverage recommendation.** Exactly one call per run, green or not:
the question it answers is what the catalog demands that the repository does not
yet implement, which does not depend on this run having failed. The prompt
carries the **entire catalog**, the gate inventory and this run's results, and it
returns `uncoveredAttributes`, `weaklyCoveredAttributes` and `recommendations`
ordered by priority.

The hard constraint is that a recommended test must exist **verbatim** in the
`tests` list of the attribute it is recommended for. It is enforced three times:

1. the response schema restricts `suggestedTests` to the union of catalog tests,
   so an outright invention is rejected by the provider;
2. the prompt states the constraint explicitly;
3. every suggestion is rechecked against *that specific attribute's* tests.

Anything else is dropped and reported in `analysis.validation` rather than
quietly removed — what was discarded is as informative as what survived.

### What the generative layer does **not** do

It does not detect anomalies, learn thresholds, train models, or keep history.
There is no machine learning of any kind, and no database of past runs. It also
**does not decide whether to deploy**.

### Model and reproducibility

| Setting | Value |
| --- | --- |
| Provider | OpenRouter |
| Model | `google/gemini-3.1-flash-lite` (override with `AI_ANALYZER_MODEL`) |
| Temperature | 0 |
| Response format | `json_schema`, `strict: true` |
| Provider routing | `require_parameters: true` — a provider that would ignore the schema is not routed to |
| `max_tokens` | explicit (700 level 1, 2000 level 2) |

Every prompt and every raw response is persisted under
`quality/evidence/raw/<runId>/analysis/`. Observed cost: about **USD 0.0007** per
level-1 diagnostic and **USD 0.0021** per level-2 call.

The API key is read from `OPENROUTER_API_KEY` — the `OPENROUTER_API_KEY` Actions
secret in CI, or `Vento/.env.local` locally. Both analysis steps are
`continue-on-error`, so a missing key or a provider outage degrades the analysis
without hiding the evidence already collected.

---

## 8. The deployment decision

Computed by `deployment-decision.mjs` and enforced by the `deployment-gate` job.
It is a **pure function of the collected evidence** and of the `blocking` flag
each gate declares:

1. a blocking gate that **failed** blocks the deployment;
2. a blocking gate that was **skipped** blocks it too — a gate that produced no
   evidence cannot be treated as having passed;
3. a failing **non-blocking** gate is recorded as a warning and does not block;
4. otherwise the deployment is allowed.

**The generative analysis is not an input to this decision.** The diagnostics
explain a block; they never cause or lift one. An LLM in this path would make the
outcome of a run non-reproducible and would place an unverifiable judgement in a
position of authority over the repository.

`dependency-audit` is declared **non-blocking**. The dependency tree currently
carries critical and high advisories; the counts are recorded as evidence and
reported as a warning on every run.

This is a proof of concept: the gate allows or blocks a **simulated** deployment
and does not deploy anything.

---

## 9. Running it

### In CI

Automatically on push and pull request affecting `Vento/**`, `quality/**` or the
workflow file, and manually via *Run workflow* (`workflow_dispatch`).

### Locally

```bash
cd Vento && npm ci && cd ..

node quality/scripts/validate-catalog.mjs
node quality/scripts/validate-gates.mjs
node quality/scripts/coverage-inventory.mjs

# production-build and the two Playwright gates need a machine with enough
# memory and a running Keycloak; skip them locally if necessary.
node quality/scripts/collect-evidence.mjs \
  --run-id local-001 \
  --skip production-build,accessibility-tests,map-render-performance

node quality/scripts/validate-bundle.mjs quality/evidence/run-local-001.json
node quality/scripts/analyze-level1.mjs  quality/evidence/run-local-001.json
node quality/scripts/analyze-level2.mjs  quality/evidence/run-local-001.json
node quality/scripts/deployment-decision.mjs quality/evidence/run-local-001.json
node quality/scripts/render-summary.mjs  quality/evidence/run-local-001.json
```

A skipped gate is recorded with `status: "skipped"` and a reason — distinct from
`failed`, and never counted as a pass.

### Recovering a run's evidence

```bash
node quality/scripts/fetch-run-bundle.mjs <runId>   # needs the gh CLI
```

Writes `quality/evidence/run-<runId>.json` and `timings-<runId>.json`, the
latter holding per-step durations from the Actions API.

### Regenerating the paper's tables

```bash
node quality/scripts/paper-report.mjs \
  --green   quality/evidence/run-<greenRunId>.json \
  --failure quality/evidence/run-<failureRunId>.json
```

---

## 10. Extending it

**Adding a test file.** Claim it in the `include` list of exactly one `vitest`
gate in `gates.json`, or `validate-gates.mjs` fails the run.

**Adding a gate.** Append an entry to `gates.json` with an `attributeId` from the
catalog and, where applicable, `catalogTests` copied verbatim from that
attribute's entry. Coverage figures update by themselves.

**Covering a new attribute.** The six uncovered attributes — Data Integration,
Result Quality, Scalability, Traceability and Auditability, Resilience and
Geoethics — have no gate. Level 2 recommends which of their catalog tests to
implement first, and every recommendation is traceable to the catalog.

**Changing the catalog.** Bump `catalogVersion`. Bundles record the version they
were produced against, so past evidence stays interpretable.
