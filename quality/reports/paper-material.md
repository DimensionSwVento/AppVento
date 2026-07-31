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
| Run id | `30600550960` |
| Commit | `73f24dc44912350f0a022fa365482a342894a21a` |
| Timestamp (UTC) | 2026-07-31T03:07:50.572Z |
| Catalog version | 1.0.0 |
| Gate inventory version | 1.0.0 |
| Environment | GitHub Actions, Node v22.23.1 |
| Evidence collection time | 223.0 s |
| Job `Quality evidence` (platform-reported) | 309.0 s |
| Gates | 12 passed, 0 failed, 0 skipped |
| Code coverage | 61.67% lines, 52.64% branches |
| Dependency audit | 2 critical, 6 high, 5 moderate, 0 low |

### Tests and assertions per quality attribute

| Quality attribute | Coverage status | Catalog tests implemented | Gates | Test cases run | Passed | Assertions | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Processing | covered | 2/4 | 2 | 29 | 29 | 47 | 6.8 s |
| Availability | weak | 0/3 | 3 | 6 | 6 | 8 | 27.2 s |
| Data Integration | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Performance | weak | 1/3 | 1 | 4 | 4 | 6 | 41.0 s |
| Result Quality | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| Security | covered | 3/4 | 2 | 94 | 94 | 188 | 2.3 s |
| Data Quality | covered | 3/4 | 1 | 12 | 12 | 26 | 31.9 s |
| Scalability | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Interoperability | weak | 1/4 | 1 | 7 | 7 | 19 | 0.0 s |
| Usability (Geospatial) | covered | 2/4 | 2 | 189 | 189 | 316 | 49.6 s |
| Traceability and Auditability | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Resilience | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| Geoethics | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| **Total** | | | 12 | **341** | **341** | **610** | 158.8 s |

### Result per quality gate

| Gate | Attribute served | Status | Test cases | Assertions | Duration | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| `typescript-check` | Processing | passed | 1/1 | 0 | 6.7 s | yes |
| `spatial-operations-tests` | Processing | passed | 28/28 | 47 | 0.0 s | yes |
| `h3-boundary-tests` | Data Quality | passed | 12/12 | 26 | 31.9 s | yes |
| `external-service-client-tests` | Interoperability | passed | 7/7 | 19 | 0.0 s | yes |
| `spatial-data-cache-tests` | Availability | passed | 3/3 | 3 | 0.0 s | yes |
| `health-route-test` | Availability | passed | 2/2 | 5 | 0.0 s | yes |
| `auth-rbac-tests` | Security | passed | 93/93 | 188 | 0.7 s | yes |
| `dependency-audit` | Security | passed | 1/1 | 0 | 1.5 s | no |
| `ui-component-tests` | Usability (Geospatial) | passed | 185/185 | 314 | 6.8 s | yes |
| `accessibility-tests` | Usability (Geospatial) | passed | 4/4 | 2 | 42.8 s | yes |
| `map-render-performance` | Performance | passed | 4/4 | 6 | 41.0 s | yes |
| `production-build` | Availability | passed | 1/1 | 0 | 27.2 s | yes |

### Pipeline step durations (platform-reported)

| Step | Outcome | Duration |
| --- | --- | --- |
| Set up job | success | 0.0 s |
| Checkout (no marketplace actions) | success | 1.0 s |
| Node 22 from the runner tool cache | success | 0.0 s |
| Install dependencies | success | 21.0 s |
| Validate quality attributes catalog | success | 0.0 s |
| Validate quality gate inventory | success | 0.0 s |
| Attribute coverage inventory | success | 0.0 s |
| Start Keycloak (realm vento) | success | 14.0 s |
| Wait for realm import | success | 25.0 s |
| Install Playwright chromium | success | 20.0 s |
| Collect quality evidence | success | 223.0 s |
| Validate evidence bundle | success | 0.0 s |
| Analyzer level 1 (diagnostic) | success | 0.0 s |
| Analyzer level 2 (coverage recommendation) | success | 3.0 s |
| Render job summary | success | 0.0 s |
| Publish evidence bundle | success | 0.0 s |
| Complete job | success | 1.0 s |

## Generative analysis, level 2: coverage recommendation (run A)

```json
{
  "level": 2,
  "model": "google/gemini-3.1-flash-lite",
  "usage": {
    "prompt_tokens": 4316,
    "completion_tokens": 694,
    "total_tokens": 5010,
    "cost": 0.00212,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.00212,
      "upstream_inference_prompt_cost": 0.001079,
      "upstream_inference_completions_cost": 0.001041
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
      "rationale": "Ensuring the reliability of spatial outputs is critical for decision-making in wind-energy assessment; these tests are currently entirely missing.",
      "priority": "high"
    },
    {
      "attributeId": "processing",
      "suggestedTests": [
        "CRS consistency tests",
        "reproducibility tests"
      ],
      "rationale": "The core GIS operations are partially verified, but lack verification of coordinate system integrity and result repeatability, which are essential for territorial analysis.",
      "priority": "high"
    },
    {
      "attributeId": "security",
      "suggestedTests": [
        "spatial integrity"
      ],
      "rationale": "While access control is robust, the integrity of the spatial data itself remains unverified, posing a risk to the validity of the assessment.",
      "priority": "medium"
    },
    {
      "attributeId": "data-quality",
      "suggestedTests": [
        "temporal consistency tests"
      ],
      "rationale": "The application handles static territorial data well, but lacks verification for temporal updates, which is vital for long-term energy planning.",
      "priority": "medium"
    },
    {
      "attributeId": "performance",
      "suggestedTests": [
        "layer loading time",
        "spatial query latency"
      ],
      "rationale": "While map rendering is verified, the actual latency of data retrieval and query performance is not, impacting the user experience during complex assessments.",
      "priority": "low"
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
| Run id | `30603791312` |
| Commit | `20ea9b7836d64364c8257576db0815d988dabe5a` |
| Timestamp (UTC) | 2026-07-31T04:23:05.410Z |
| Catalog version | 1.0.0 |
| Gate inventory version | 1.0.0 |
| Environment | GitHub Actions, Node v22.23.1 |
| Evidence collection time | 226.0 s |
| Job `Quality evidence` (platform-reported) | 319.0 s |
| Gates | 11 passed, 1 failed, 0 skipped |
| Code coverage | 61.67% lines, 52.64% branches |
| Dependency audit | 2 critical, 6 high, 5 moderate, 0 low |

### Tests and assertions per quality attribute

| Quality attribute | Coverage status | Catalog tests implemented | Gates | Test cases run | Passed | Assertions | Duration |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Processing | covered | 2/4 | 2 | 29 | 29 | 47 | 6.9 s |
| Availability | weak | 0/3 | 3 | 6 | 6 | 8 | 26.9 s |
| Data Integration | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Performance | weak | 1/3 | 1 | 4 | 4 | 6 | 42.8 s |
| Result Quality | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| Security | covered | 3/4 | 2 | 94 | 94 | 188 | 2.2 s |
| Data Quality | covered | 3/4 | 1 | 12 | 9 | 26 | 32.3 s |
| Scalability | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Interoperability | weak | 1/4 | 1 | 7 | 7 | 19 | 0.0 s |
| Usability (Geospatial) | covered | 2/4 | 2 | 189 | 189 | 316 | 49.9 s |
| Traceability and Auditability | uncovered | 0/4 | 0 | 0 | 0 | 0 | — |
| Resilience | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| Geoethics | uncovered | 0/3 | 0 | 0 | 0 | 0 | — |
| **Total** | | | 12 | **341** | **338** | **610** | 161.1 s |

### Result per quality gate

| Gate | Attribute served | Status | Test cases | Assertions | Duration | Blocking |
| --- | --- | --- | --- | --- | --- | --- |
| `typescript-check` | Processing | passed | 1/1 | 0 | 6.9 s | yes |
| `spatial-operations-tests` | Processing | passed | 28/28 | 47 | 0.0 s | yes |
| `h3-boundary-tests` | Data Quality | failed | 9/12 | 26 | 32.3 s | yes |
| `external-service-client-tests` | Interoperability | passed | 7/7 | 19 | 0.0 s | yes |
| `spatial-data-cache-tests` | Availability | passed | 3/3 | 3 | 0.0 s | yes |
| `health-route-test` | Availability | passed | 2/2 | 5 | 0.0 s | yes |
| `auth-rbac-tests` | Security | passed | 93/93 | 188 | 0.7 s | yes |
| `dependency-audit` | Security | passed | 1/1 | 0 | 1.5 s | no |
| `ui-component-tests` | Usability (Geospatial) | passed | 185/185 | 314 | 6.5 s | yes |
| `accessibility-tests` | Usability (Geospatial) | passed | 4/4 | 2 | 43.4 s | yes |
| `map-render-performance` | Performance | passed | 4/4 | 6 | 42.8 s | yes |
| `production-build` | Availability | passed | 1/1 | 0 | 26.9 s | yes |

### Pipeline step durations (platform-reported)

| Step | Outcome | Duration |
| --- | --- | --- |
| Set up job | success | 0.0 s |
| Checkout (no marketplace actions) | success | 1.0 s |
| Node 22 from the runner tool cache | success | 0.0 s |
| Install dependencies | success | 19.0 s |
| Validate quality attributes catalog | success | 0.0 s |
| Validate quality gate inventory | success | 0.0 s |
| Attribute coverage inventory | success | 0.0 s |
| Start Keycloak (realm vento) | success | 14.0 s |
| Wait for realm import | success | 31.0 s |
| Install Playwright chromium | success | 20.0 s |
| Collect quality evidence | success | 226.0 s |
| Validate evidence bundle | success | 0.0 s |
| Analyzer level 1 (diagnostic) | success | 1.0 s |
| Analyzer level 2 (coverage recommendation) | success | 4.0 s |
| Render job summary | success | 0.0 s |
| Publish evidence bundle | success | 0.0 s |
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
  "rootCause": "The spatial boundary constants and logic in src/app/Utils/h3Resolution.test.ts fail to correctly include the San Andrés and Providencia archipelago and incorrectly define the longitudinal bounds (MAX_BOUNDS) for the Colombian territory.",
  "affectedAttributeId": "data-quality",
  "whyItMatters": "The system fails to recognize the San Andrés and Providencia archipelago as part of the Colombian territory, leading to the exclusion of these regions from wind-energy assessments. This compromises the spatial completeness of the data, potentially resulting in biased or incomplete territorial planning decisions for offshore wind projects in the Caribbean.",
  "remediation": "Update the boundary definitions and the isPointInColombia logic in src/app/Utils/h3Resolution.ts to correctly incorporate the 12-nautical-mile maritime territory of the San Andrés and Providencia archipelago and adjust the MAX_BOUNDS constant to accurately reflect the westernmost longitudinal limit of the national territory.",
  "confidence": 0.95,
  "attempts": 1,
  "model": "google/gemini-3.1-flash-lite",
  "usage": {
    "prompt_tokens": 1323,
    "completion_tokens": 220,
    "total_tokens": 1543,
    "cost": 0.00066075,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.00066075,
      "upstream_inference_prompt_cost": 0.00033075,
      "upstream_inference_completions_cost": 0.00033
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
    "prompt_tokens": 4315,
    "completion_tokens": 673,
    "total_tokens": 4988,
    "cost": 0.00208825,
    "is_byok": false,
    "prompt_tokens_details": {
      "cached_tokens": 0,
      "cache_write_tokens": 0,
      "audio_tokens": 0,
      "video_tokens": 0
    },
    "cost_details": {
      "upstream_inference_cost": 0.00208825,
      "upstream_inference_prompt_cost": 0.00107875,
      "upstream_inference_completions_cost": 0.0010095
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
      "rationale": "Ensuring the accuracy of spatial results is critical for wind-energy investment decisions; this attribute currently has no coverage.",
      "priority": "high"
    },
    {
      "attributeId": "data-quality",
      "suggestedTests": [
        "temporal consistency tests"
      ],
      "rationale": "The existing boundary tests failed in this run, indicating that data quality is under strain and requires immediate attention to ensure temporal consistency.",
      "priority": "high"
    },
    {
      "attributeId": "processing",
      "suggestedTests": [
        "CRS consistency tests",
        "reproducibility tests"
      ],
      "rationale": "GIS operations are central to the application; completing these tests ensures that spatial calculations are reliable and repeatable.",
      "priority": "medium"
    },
    {
      "attributeId": "performance",
      "suggestedTests": [
        "layer loading time",
        "spatial query latency"
      ],
      "rationale": "Improving responsiveness is essential for user experience in a GIS application, building upon the existing map rendering tests.",
      "priority": "medium"
    },
    {
      "attributeId": "security",
      "suggestedTests": [
        "spatial integrity"
      ],
      "rationale": "Completing the security suite by verifying spatial integrity protects the validity of the data used in decision-making.",
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

