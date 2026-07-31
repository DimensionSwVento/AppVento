# Quality attributes pipeline — material for the paper

Generated from committed evidence bundles. Catalog v1.0.0, gate inventory v1.0.0.

## Attribute coverage of the approach

**7 of 13** quality attributes have at least one quality gate in the repository: 4 covered and 3 weakly covered (threshold: a gate set must implement at least 50% of the attribute's catalog tests to count as covered). 6 attributes have no gate.

- Covered: processing, security, data-quality, usability-geospatial
- Weakly covered: availability, performance, interoperability
- Uncovered: data-integration, result-quality, scalability, traceability-auditability, resilience, geoethics

This figure is computed from `quality/quality-attributes.json` and `quality/gates.json` on every run; it is not recorded anywhere as a constant.

## Run A — all gates green

| Property | Value |
| --- | --- |
| Run id | `30649925317` |
| Commit | `6df3fba7c347dd2738a9b1f6f54450d891b41729` |
| Timestamp (UTC) | 2026-07-31T17:12:02.950Z |
| Catalog version | 1.0.0 |
| Gate inventory version | 1.0.0 |
| Environment | GitHub Actions, Node v22.23.1 |
| Evidence collection time | 186.3 s |
| Job `Quality evidence` (platform-reported) | 281.0 s |
| Job `Deployment gate` (platform-reported) | 3.0 s |
| Gates | 12 passed, 0 failed, 0 skipped |
| Deployment decision | **ALLOW** — Every blocking quality gate produced evidence and passed. |
| Code coverage | 61.67% lines, 52.64% branches |
| Dependency audit | 2 critical, 6 high, 5 moderate, 0 low |

### Tests and assertions per quality attribute

| Quality attribute | Coverage status | Catalog tests implemented | Gates | Test cases run | Passed | Assertions | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Processing | covered | 2/4 | 2 | 29 | 29 | 47 | 5.3 s |
| Availability | weak | 0/3 | 3 | 6 | 6 | 8 | 22.4 s |
| Data Integration | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Performance | weak | 1/3 | 1 | 4 | 4 | 6 | 34.2 s |
| Result Quality | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| Security | covered | 3/4 | 2 | 94 | 94 | 188 | 1.7 s |
| Data Quality | covered | 3/4 | 1 | 12 | 12 | 26 | 25.0 s |
| Scalability | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Interoperability | weak | 1/4 | 1 | 7 | 7 | 19 | 0.0 s |
| Usability (Geospatial) | covered | 2/4 | 2 | 188 | 188 | 316 | 47.4 s |
| Traceability and Auditability | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Resilience | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| Geoethics | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| **Total** | | | 12 | **340** | **340** | **610** | 136.0 s |

### Result per quality gate

| Gate | Attribute served | Status | Test cases | Assertions | Duration | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| `typescript-check` | Processing | passed | 1/1 | 0 | 5.3 s | yes |
| `spatial-operations-tests` | Processing | passed | 28/28 | 47 | 0.0 s | yes |
| `h3-boundary-tests` | Data Quality | passed | 12/12 | 26 | 25.0 s | yes |
| `external-service-client-tests` | Interoperability | passed | 7/7 | 19 | 0.0 s | yes |
| `spatial-data-cache-tests` | Availability | passed | 3/3 | 3 | 0.0 s | yes |
| `health-route-test` | Availability | passed | 2/2 | 5 | 0.0 s | yes |
| `auth-rbac-tests` | Security | passed | 93/93 | 188 | 0.6 s | yes |
| `dependency-audit` | Security | passed | 1/1 | 0 | 1.2 s | no |
| `ui-component-tests` | Usability (Geospatial) | passed | 185/185 | 314 | 4.9 s | yes |
| `accessibility-tests` | Usability (Geospatial) | passed | 3/3 | 2 | 42.5 s | yes |
| `map-render-performance` | Performance | passed | 4/4 | 6 | 34.2 s | yes |
| `production-build` | Availability | passed | 1/1 | 0 | 22.4 s | yes |

### Deployment decision

```json
{
  "decision": "allow",
  "reason": "Every blocking quality gate produced evidence and passed.",
  "blockingFailures": [],
  "warnings": [
    {
      "gateId": "dependency-audit",
      "attributeId": "security",
      "reason": "dependency advisories present (2 critical, 6 high); the gate is declared non-blocking, so this does not stop the deployment"
    }
  ],
  "evaluatedAt": "2026-07-31T17:12:06.071Z",
  "rule": "deterministic; the generative analysis explains a block but never causes or lifts one"
}
```

### Pipeline step durations (platform-reported)

| Step | Outcome | Duration |
| --- | --- | --- |
| Set up job | success | 0.0 s |
| Checkout (no marketplace actions) | success | 2.0 s |
| Node 22 from the runner tool cache | success | 1.0 s |
| Install dependencies | success | 16.0 s |
| Validate quality attributes catalog | success | 0.0 s |
| Validate quality gate inventory | success | 0.0 s |
| Attribute coverage inventory | success | 1.0 s |
| Start Keycloak (realm vento) | success | 20.0 s |
| Wait for realm import | success | 25.0 s |
| Install Playwright chromium | success | 22.0 s |
| Collect quality evidence | success | 186.0 s |
| Validate evidence bundle | success | 1.0 s |
| Analyzer level 1 (diagnostic) | success | 0.0 s |
| Analyzer level 2 (coverage recommendation) | success | 3.0 s |
| Deployment decision | success | 0.0 s |
| Render job summary | success | 0.0 s |
| Publish evidence bundle | success | 0.0 s |
| Complete job | success | 0.0 s |
| Set up job | success | 0.0 s |
| Enforce the deployment decision | success | 0.0 s |
| Complete job | success | 0.0 s |

## Generative analysis, level 2: coverage recommendation (run A)

```json
{
  "level": 2,
  "model": "google/gemini-3.1-flash-lite",
  "usage": {
    "prompt_tokens": 3381,
    "completion_tokens": 624,
    "total_tokens": 4005,
    "cost": 0.00178125,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.00178125,
      "upstream_inference_prompt_cost": 0.00084525,
      "upstream_inference_completions_cost": 0.000936
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "image_tokens": 0,
      "audio_tokens": 0
    }
  },
  "uncoveredAttributes": [
    "data-integration",
    "result-quality",
    "scalability",
    "traceability-auditability",
    "resilience",
    "geoethics"
  ],
  "weaklyCoveredAttributes": [
    {
      "attributeId": "processing",
      "missing": "CRS consistency tests; reproducibility tests"
    },
    {
      "attributeId": "availability",
      "missing": "connectivity tests to data sources; fault tolerance tests; GIS service recovery tests"
    },
    {
      "attributeId": "performance",
      "missing": "layer loading time; spatial query latency"
    },
    {
      "attributeId": "security",
      "missing": "spatial integrity"
    },
    {
      "attributeId": "data-quality",
      "missing": "temporal consistency tests"
    },
    {
      "attributeId": "interoperability",
      "missing": "OGC services testing; import/export format testing; standards and schema validation"
    },
    {
      "attributeId": "usability-geospatial",
      "missing": "cartographic comprehension tests; spatial cognitive load tests"
    }
  ],
  "recommendations": [
    {
      "attributeId": "result-quality",
      "suggestedTests": [
        "topological consistency",
        "validation against reference data"
      ],
      "rationale": "Ensuring the accuracy of spatial results is critical for wind-energy investment decisions; topological consistency is essential for valid GIS analysis.",
      "priority": "high"
    },
    {
      "attributeId": "processing",
      "suggestedTests": [
        "CRS consistency tests",
        "reproducibility tests"
      ],
      "rationale": "The application performs complex H3 spatial operations; verifying CRS consistency and result reproducibility is vital to prevent erroneous spatial calculations.",
      "priority": "high"
    },
    {
      "attributeId": "data-quality",
      "suggestedTests": [
        "temporal consistency tests"
      ],
      "rationale": "Vento relies on time-sensitive wind data; temporal consistency is required to ensure the data used for assessment is current and valid.",
      "priority": "medium"
    },
    {
      "attributeId": "performance",
      "suggestedTests": [
        "layer loading time",
        "spatial query latency"
      ],
      "rationale": "Improving responsiveness is necessary for the usability of the dashboard during interactive territorial analysis.",
      "priority": "medium"
    },
    {
      "attributeId": "security",
      "suggestedTests": [
        "spatial integrity"
      ],
      "rationale": "While access control is implemented, verifying spatial integrity ensures that the data rendered on the map has not been tampered with.",
      "priority": "medium"
    }
  ],
  "validation": {
    "droppedSuggestedTests": [],
    "droppedRecommendations": [],
    "coverageComparison": {
      "uncoveredClaimedButCovered": [],
      "uncoveredMissedByModel": [],
      "weakClaimedButNotWeak": [],
      "weakMissedByModel": []
    }
  }
}
```

## Run B — with an injected defect

| Property | Value |
| --- | --- |
| Run id | `30649932035` |
| Commit | `dc7ea9e48d26923b235d00c2d1c9927890c2bf3a` |
| Timestamp (UTC) | 2026-07-31T17:12:54.835Z |
| Catalog version | 1.0.0 |
| Gate inventory version | 1.0.0 |
| Environment | GitHub Actions, Node v22.23.1 |
| Evidence collection time | 227.6 s |
| Job `Quality evidence` (platform-reported) | 329.0 s |
| Job `Deployment gate` (platform-reported) | 3.0 s |
| Gates | 11 passed, 1 failed, 0 skipped |
| Deployment decision | **BLOCK** — 1 blocking quality gate(s) did not pass. |
| Code coverage | 61.67% lines, 52.64% branches |
| Dependency audit | 2 critical, 6 high, 5 moderate, 0 low |

### Tests and assertions per quality attribute

| Quality attribute | Coverage status | Catalog tests implemented | Gates | Test cases run | Passed | Assertions | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Processing | covered | 2/4 | 2 | 29 | 29 | 47 | 6.6 s |
| Availability | weak | 0/3 | 3 | 6 | 6 | 8 | 26.5 s |
| Data Integration | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Performance | weak | 1/3 | 1 | 4 | 4 | 6 | 40.8 s |
| Result Quality | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| Security | covered | 3/4 | 2 | 94 | 94 | 188 | 2.2 s |
| Data Quality | covered | 3/4 | 1 | 12 | 9 | 26 | 31.9 s |
| Scalability | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Interoperability | weak | 1/4 | 1 | 7 | 7 | 19 | 0.0 s |
| Usability (Geospatial) | covered | 2/4 | 2 | 188 | 188 | 316 | 56.0 s |
| Traceability and Auditability | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Resilience | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| Geoethics | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| **Total** | | | 12 | **340** | **337** | **610** | 164.1 s |

### Result per quality gate

| Gate | Attribute served | Status | Test cases | Assertions | Duration | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| `typescript-check` | Processing | passed | 1/1 | 0 | 6.6 s | yes |
| `spatial-operations-tests` | Processing | passed | 28/28 | 47 | 0.0 s | yes |
| `h3-boundary-tests` | Data Quality | failed | 9/12 | 26 | 31.9 s | yes |
| `external-service-client-tests` | Interoperability | passed | 7/7 | 19 | 0.0 s | yes |
| `spatial-data-cache-tests` | Availability | passed | 3/3 | 3 | 0.0 s | yes |
| `health-route-test` | Availability | passed | 2/2 | 5 | 0.0 s | yes |
| `auth-rbac-tests` | Security | passed | 93/93 | 188 | 0.7 s | yes |
| `dependency-audit` | Security | passed | 1/1 | 0 | 1.4 s | no |
| `ui-component-tests` | Usability (Geospatial) | passed | 185/185 | 314 | 6.7 s | yes |
| `accessibility-tests` | Usability (Geospatial) | passed | 3/3 | 2 | 49.3 s | yes |
| `map-render-performance` | Performance | passed | 4/4 | 6 | 40.8 s | yes |
| `production-build` | Availability | passed | 1/1 | 0 | 26.4 s | yes |

### Deployment decision

```json
{
  "decision": "block",
  "reason": "1 blocking quality gate(s) did not pass.",
  "blockingFailures": [
    {
      "gateId": "h3-boundary-tests",
      "attributeId": "data-quality",
      "reason": "blocking gate failed (9/12 test cases passed)"
    }
  ],
  "warnings": [
    {
      "gateId": "dependency-audit",
      "attributeId": "security",
      "reason": "dependency advisories present (2 critical, 6 high); the gate is declared non-blocking, so this does not stop the deployment"
    }
  ],
  "evaluatedAt": "2026-07-31T17:13:02.048Z",
  "rule": "deterministic; the generative analysis explains a block but never causes or lifts one"
}
```

### Pipeline step durations (platform-reported)

| Step | Outcome | Duration |
| --- | --- | --- |
| Set up job | success | 0.0 s |
| Checkout (no marketplace actions) | success | 3.0 s |
| Node 22 from the runner tool cache | success | 0.0 s |
| Install dependencies | success | 22.0 s |
| Validate quality attributes catalog | success | 0.0 s |
| Validate quality gate inventory | success | 0.0 s |
| Attribute coverage inventory | success | 0.0 s |
| Start Keycloak (realm vento) | success | 14.0 s |
| Wait for realm import | success | 26.0 s |
| Install Playwright chromium | success | 26.0 s |
| Collect quality evidence | success | 227.0 s |
| Validate evidence bundle | success | 0.0 s |
| Analyzer level 1 (diagnostic) | success | 4.0 s |
| Analyzer level 2 (coverage recommendation) | success | 4.0 s |
| Deployment decision | success | 0.0 s |
| Render job summary | success | 0.0 s |
| Publish evidence bundle | success | 0.0 s |
| Complete job | success | 0.0 s |
| Set up job | success | 0.0 s |
| Enforce the deployment decision | failure | 0.0 s |
| Complete job | success | 0.0 s |

## Generative analysis, level 1: diagnostic (run B)

#### Gate `h3-boundary-tests`

Log excerpt given to the model:

```
src/app/Utils/h3Resolution.test.ts > h3Resolution - cartografia oficial IGAC (US-FB2-02) IGAC incluye San Andres y Providencia (via 12 millas náuticas del territorio marítimo)
AssertionError: expected false to be true // Object.is equality
    at /home/runner/work/AppVento/AppVento/Vento/src/app/Utils/h3Resolution.test.ts:38:45
    at new Promise (<anonymous>)
    at new Promise (<anonymous>)

src/app/Utils/h3Resolution.test.ts > h3Resolution - cartografia oficial IGAC (US-FB2-02) MAX_BOUNDS cubre continente, costas y archipielago
AssertionError: expected -79 to be less than or equal to -82
    at /home/runner/work/AppVento/AppVento/Vento/src/app/Utils/h3Resolution.test.ts:44:18
    at new Promise (<anonymous>)
    at new Promise (<anonymous>)

src/app/Utils/h3Resolution.test.ts > h3Resolution - cartografia oficial IGAC (US-FB2-02) isPointInColombia usa la cartografia compartida para continente, archipielago y oceanos fuera del alcance
AssertionError: expected false to be true // Object.is equality
    at /home/runner/work/AppVento/AppVento/Vento/src/app/Utils/h3Resolution.test.ts:54:45
    at new Promise (<anonymous>)
    at new Promise (<anonymous>)
```

Verbatim output:

```json
{
  "rootCause": "The spatial boundary constants and the isPointInColombia logic in src/app/Utils/h3Resolution.test.ts fail to correctly include the San Andres and Providencia archipelago and incorrectly define the western longitudinal boundary.",
  "affectedAttributeId": "data-quality",
  "whyItMatters": "The system fails to recognize the full extent of Colombian territory, specifically excluding the San Andres and Providencia archipelago. This compromises the integrity of wind-energy assessments by preventing the system from processing or validating spatial data within these regions, leading to incomplete territorial coverage for energy planning.",
  "remediation": "Update the boundary constants in src/app/Utils/h3Resolution.ts to include the maritime territory of San Andres and Providencia and adjust the MAX_BOUNDS constant to correctly encompass the westernmost coordinates of the archipelago.",
  "confidence": 0.95,
  "attempts": 2,
  "model": "google/gemini-3.1-flash-lite",
  "usage": {
    "prompt_tokens": 1657,
    "completion_tokens": 192,
    "total_tokens": 1849,
    "cost": 0.00070225,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.00070225,
      "upstream_inference_prompt_cost": 0.00041425,
      "upstream_inference_completions_cost": 0.000288
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "image_tokens": 0,
      "audio_tokens": 0
    }
  }
}
```

## Generative analysis, level 2: coverage recommendation (run B)

```json
{
  "level": 2,
  "model": "google/gemini-3.1-flash-lite",
  "usage": {
    "prompt_tokens": 4313,
    "completion_tokens": 704,
    "total_tokens": 5017,
    "cost": 0.00213425,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.00213425,
      "upstream_inference_prompt_cost": 0.00107825,
      "upstream_inference_completions_cost": 0.001056
    },
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "image_tokens": 0,
      "audio_tokens": 0
    }
  },
  "uncoveredAttributes": [
    "data-integration",
    "result-quality",
    "scalability",
    "traceability-auditability",
    "resilience",
    "geoethics"
  ],
  "weaklyCoveredAttributes": [
    {
      "attributeId": "processing",
      "missing": "CRS consistency tests; reproducibility tests"
    },
    {
      "attributeId": "availability",
      "missing": "connectivity tests to data sources; fault tolerance tests; GIS service recovery tests"
    },
    {
      "attributeId": "performance",
      "missing": "layer loading time; spatial query latency"
    },
    {
      "attributeId": "security",
      "missing": "spatial integrity"
    },
    {
      "attributeId": "data-quality",
      "missing": "temporal consistency tests"
    },
    {
      "attributeId": "interoperability",
      "missing": "OGC services testing; import/export format testing; standards and schema validation"
    },
    {
      "attributeId": "usability-geospatial",
      "missing": "cartographic comprehension tests; spatial cognitive load tests"
    }
  ],
  "recommendations": [
    {
      "attributeId": "result-quality",
      "suggestedTests": [
        "topological consistency",
        "validation against reference data"
      ],
      "rationale": "The application informs territorial decisions; ensuring the spatial outputs are topologically sound and validated against reference data is critical to prevent erroneous energy-investment assessments.",
      "priority": "high"
    },
    {
      "attributeId": "data-quality",
      "suggestedTests": [
        "temporal consistency tests"
      ],
      "rationale": "The current data-quality gate failed significantly (9/12 tests). Adding temporal consistency tests is essential to ensure the spatial data used for wind assessment is current and reliable.",
      "priority": "high"
    },
    {
      "attributeId": "processing",
      "suggestedTests": [
        "CRS consistency tests",
        "reproducibility tests"
      ],
      "rationale": "As a GIS application, ensuring coordinate reference system consistency and result reproducibility is fundamental to the integrity of the core processing engine.",
      "priority": "medium"
    },
    {
      "attributeId": "performance",
      "suggestedTests": [
        "layer loading time",
        "spatial query latency"
      ],
      "rationale": "Improving responsiveness for spatial queries and layer loading is necessary to maintain the usability of the map interface during complex energy-assessment workflows.",
      "priority": "medium"
    },
    {
      "attributeId": "security",
      "suggestedTests": [
        "spatial integrity"
      ],
      "rationale": "While access control is implemented, verifying spatial integrity ensures that the data rendered on the map has not been tampered with or corrupted during transit.",
      "priority": "medium"
    }
  ],
  "validation": {
    "droppedSuggestedTests": [],
    "droppedRecommendations": [],
    "coverageComparison": {
      "uncoveredClaimedButCovered": [],
      "uncoveredMissedByModel": [],
      "weakClaimedButNotWeak": [],
      "weakMissedByModel": []
    }
  }
}
```

