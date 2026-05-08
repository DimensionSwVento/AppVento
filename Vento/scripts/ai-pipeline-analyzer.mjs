/**
 * AI Pipeline Analyzer — implements the "AI Analysis phase" of the
 * automated testing protocol described in the paper:
 *   "Automated Testing for Energy GIS Software Applications Based on
 *    Quality Attributes" (Sec. III, Fig. 1; Sec. IV, Fig. 2-4).
 *
 * Inputs (Test phase artifacts):
 *   - quality-evidence/reports/attribute-coverage.json
 *   - quality-evidence/reports/vitest.json (raw, optional)
 *   - quality-evidence/logs/*.log (optional)
 *
 * Behavior:
 *   1. Build a structured evidence payload (no secrets, ≤ ~6 KB).
 *   2. If OPENROUTER_API_KEY is set, call OpenRouter with a pinned model
 *      and temperature 0; persist prompt + raw response for reproducibility.
 *   3. If the API call is unavailable or fails, fall back to a deterministic
 *      heuristic that produces the *same JSON schema*. The downstream
 *      deployment-gate is provider-agnostic.
 *
 * Outputs (AI Analysis phase artifacts):
 *   - quality-evidence/ai/prompt.txt
 *   - quality-evidence/ai/response.raw.json
 *   - quality-evidence/ai/metadata.json
 *   - quality-evidence/ai/pipeline-recommendation.json
 *   - quality-evidence/ai/pipeline-recommendation.md
 *
 * Configuration (env vars):
 *   - OPENROUTER_API_KEY  (required to call the LLM)
 *   - AI_PIPELINE_MODEL   (default: "openai/gpt-4o-mini")
 *   - AI_PIPELINE_BASE_URL (default: "https://openrouter.ai/api/v1")
 *   - AI_PIPELINE_TIMEOUT_MS (default: 60000)
 *   - AI_PIPELINE_REFERER  (optional, recommended by OpenRouter)
 *   - AI_PIPELINE_TITLE    (optional, recommended by OpenRouter)
 *   - GIT_SHA, GITHUB_SHA  (optional; used in metadata for traceability)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const projectRoot = process.cwd();

const paths = {
  coverageJson: path.join(projectRoot, "quality-evidence/reports/attribute-coverage.json"),
  vitestJson: path.join(projectRoot, "quality-evidence/reports/vitest.json"),
  logsDir: path.join(projectRoot, "quality-evidence/logs"),
  systemPrompt: path.join(projectRoot, "scripts/prompts/ai-analyzer.system.md"),
  outDir: path.join(projectRoot, "quality-evidence/ai"),
};

const DEFAULTS = {
  model: process.env.AI_PIPELINE_MODEL || "openai/gpt-4o-mini",
  baseUrl: process.env.AI_PIPELINE_BASE_URL || "https://openrouter.ai/api/v1",
  timeoutMs: Number(process.env.AI_PIPELINE_TIMEOUT_MS || 60000),
  referer: process.env.AI_PIPELINE_REFERER || "https://github.com/EAFIT-Research/AppVento",
  title: process.env.AI_PIPELINE_TITLE || "Vento AI Pipeline Analyzer",
};

// ---------------------------------------------------------------------------
// 1. Read & sanitize evidence
// ---------------------------------------------------------------------------

function requireFile(p) {
  if (!fs.existsSync(p)) throw new Error(`Required input not found: ${p}`);
}

function readLogSummaries(logsDir) {
  if (!fs.existsSync(logsDir)) return [];
  return fs
    .readdirSync(logsDir)
    .filter((f) => f.endsWith(".log"))
    .map((f) => {
      const content = fs.readFileSync(path.join(logsDir, f), "utf-8");
      const lines = content.split("\n");
      return {
        file: f,
        lineCount: lines.length,
        tail: lines.slice(-15).join("\n"),
      };
    });
}

function buildEvidencePayload() {
  requireFile(paths.coverageJson);
  const coverage = JSON.parse(fs.readFileSync(paths.coverageJson, "utf-8"));

  const failed = coverage.failedAssertions || [];
  return {
    pipeline: {
      scope: coverage.scope,
      note: coverage.note,
      generated_at: coverage.global.generatedAt,
      git_sha: process.env.GIT_SHA || process.env.GITHUB_SHA || "local",
    },
    global_metrics: coverage.global,
    attributes: coverage.attributes.map((a) => ({
      id: a.id,
      name: a.name,
      criticality: a.criticality,
      status: a.status,
      matched_suites: a.matchedSuites,
      total_assertions: a.totalAssertions,
      passed_assertions: a.passedAssertions,
      failed_assertions: a.failedAssertions,
      pass_rate: a.passRate,
      heuristic_priority_score: a.priorityScore,
      suite_files_sample: a.suiteFiles.slice(0, 5),
    })),
    failed_assertions_detail: failed.slice(0, 20),
    log_summaries: readLogSummaries(paths.logsDir),
  };
}

// ---------------------------------------------------------------------------
// 2. Build the prompt
// ---------------------------------------------------------------------------

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["global_assessment", "per_attribute", "deployment_recommendation"],
  properties: {
    global_assessment: { type: "string" },
    per_attribute: {
      type: "array",
      items: {
        type: "object",
        required: ["attribute_id", "risk_level", "rationale", "anomalies_detected", "suggested_tests"],
        properties: {
          attribute_id: { type: "string" },
          risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
          rationale: { type: "string" },
          anomalies_detected: { type: "array", items: { type: "string" } },
          suggested_tests: { type: "array", items: { type: "string" } },
        },
      },
    },
    deployment_recommendation: {
      type: "object",
      required: ["decision", "rationale", "blocking_issues", "warnings"],
      properties: {
        decision: { type: "string", enum: ["allow", "warn", "block"] },
        rationale: { type: "string" },
        blocking_issues: { type: "array", items: { type: "string" } },
        warnings: { type: "array", items: { type: "string" } },
      },
    },
    next_iteration_priorities: { type: "array", items: { type: "string" } },
  },
};

function buildUserPrompt(evidence) {
  return [
    "You are receiving the structured evidence produced by the Test phase of the",
    "Vento CI/CD pipeline. Apply the protocol described in your system prompt and",
    "produce ONLY a JSON object that strictly matches the schema below.",
    "",
    "PIPELINE METADATA:",
    JSON.stringify(evidence.pipeline, null, 2),
    "",
    "GLOBAL TEST METRICS:",
    JSON.stringify(evidence.global_metrics, null, 2),
    "",
    "QUALITY ATTRIBUTE EVIDENCE (frontend-only scope, criticality 1-5):",
    JSON.stringify(evidence.attributes, null, 2),
    "",
    "FAILED ASSERTIONS DETAIL (truncated to 20):",
    JSON.stringify(evidence.failed_assertions_detail, null, 2),
    "",
    "LOG SUMMARIES (tails, optional):",
    JSON.stringify(evidence.log_summaries, null, 2),
    "",
    "REQUIRED RESPONSE SCHEMA (JSON Schema draft-07, abbreviated):",
    JSON.stringify(RESPONSE_SCHEMA, null, 2),
    "",
    "Respond now with the JSON object only. No prose, no markdown fences.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 3. Call OpenRouter (or any OpenAI-compatible endpoint)
// ---------------------------------------------------------------------------

async function callOpenRouter({ apiKey, systemPrompt, userPrompt }) {
  const url = `${DEFAULTS.baseUrl}/chat/completions`;
  const body = {
    model: DEFAULTS.model,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULTS.timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": DEFAULTS.referer,
        "X-Title": DEFAULTS.title,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    return { raw: text, parsed: JSON.parse(text) };
  } finally {
    clearTimeout(timeout);
  }
}

const FENCED_JSON_RE = /```(?:json)?\s*([\s\S]+?)```/;

function extractJsonFromContent(content) {
  if (typeof content !== "string") return content;
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const fenced = FENCED_JSON_RE.exec(trimmed);
  if (fenced) return JSON.parse(fenced[1]);
  throw new Error(`Could not extract JSON from LLM content: ${trimmed.slice(0, 200)}`);
}

// ---------------------------------------------------------------------------
// 4. Deterministic heuristic fallback (same JSON schema as the LLM)
// ---------------------------------------------------------------------------

const RATIONALE_BY_DECISION = {
  allow: "All prioritized attributes meet the deterministic baseline.",
  warn: "Pipeline succeeds but contains evidence gaps or sub-threshold results.",
  block: "One or more critical conditions failed; deployment should be blocked.",
};

function classifyAttributes(attrs) {
  return {
    failingCritical: attrs.filter((a) => a.criticality === 5 && a.failed_assertions > 0),
    failingHigh: attrs.filter((a) => a.criticality >= 4 && a.failed_assertions > 0),
    missingEvidenceHigh: attrs.filter(
      (a) => a.criticality >= 4 && a.matched_suites === 0,
    ),
    passingButLow: attrs.filter(
      (a) => a.criticality === 5 && a.status === "PASS" && a.pass_rate < 100,
    ),
  };
}

function decideDeployment({ buckets, failureRate }) {
  const blocking_issues = [];
  const warnings = [];
  let decision = "allow";

  if (buckets.failingCritical.length > 0) {
    decision = "block";
    blocking_issues.push(
      `Critical attributes with failed assertions: ${buckets.failingCritical.map((a) => a.id).join(", ")}`,
    );
  }
  if (failureRate > 0.05) {
    decision = "block";
    blocking_issues.push(
      `Global failure rate ${(failureRate * 100).toFixed(2)}% exceeds 5% threshold`,
    );
  }
  if (decision === "block") return { decision, blocking_issues, warnings };

  if (buckets.missingEvidenceHigh.length > 0) {
    decision = "warn";
    warnings.push(
      `High-criticality attributes with no matched suites: ${buckets.missingEvidenceHigh.map((a) => a.id).join(", ")}`,
    );
  }
  if (buckets.passingButLow.length > 0) {
    decision = "warn";
    warnings.push(
      `Critical attributes with sub-100% pass rate: ${buckets.passingButLow.map((a) => a.id).join(", ")}`,
    );
  }
  if (buckets.failingHigh.length > 0 && buckets.failingCritical.length === 0) {
    decision = "warn";
    warnings.push(
      `High-criticality attributes with failures: ${buckets.failingHigh.map((a) => a.id).join(", ")}`,
    );
  }
  return { decision, blocking_issues, warnings };
}

function riskLevelFor(a) {
  if (a.failed_assertions > 0 && a.criticality === 5) return "critical";
  if (a.failed_assertions > 0 && a.criticality >= 4) return "high";
  if (a.criticality >= 4 && a.matched_suites <= 1) return "medium";
  return "low";
}

function anomaliesFor(a) {
  const anomalies = [];
  if (a.matched_suites === 0)
    anomalies.push("No matched test suites — possible mapping regression");
  if (a.failed_assertions > 0)
    anomalies.push(`${a.failed_assertions} failed assertion(s) on ${a.matched_suites} suite(s)`);
  if (a.matched_suites > 0 && a.total_assertions === 0)
    anomalies.push("Suites matched but contain zero assertions");
  if (a.pass_rate < 100 && a.pass_rate > 0)
    anomalies.push(`Pass rate ${a.pass_rate}% under 100%`);
  return anomalies;
}

function heuristicAnalysis(evidence) {
  const attrs = evidence.attributes;
  const buckets = classifyAttributes(attrs);
  const totalTests = evidence.global_metrics.tests || 0;
  const failedTests = evidence.global_metrics.failedTests || 0;
  const failureRate = totalTests > 0 ? failedTests / totalTests : 0;

  const { decision, blocking_issues, warnings } = decideDeployment({ buckets, failureRate });

  const per_attribute = attrs.map((a) => ({
    attribute_id: a.id,
    risk_level: riskLevelFor(a),
    rationale: `Heuristic: criticality ${a.criticality}, status ${a.status}, pass_rate ${a.pass_rate}%, suites ${a.matched_suites}.`,
    anomalies_detected: anomaliesFor(a),
    suggested_tests: [],
  }));

  const failureRatePct = (failureRate * 100).toFixed(2);
  return {
    global_assessment: `Heuristic-only assessment: ${decision.toUpperCase()}. Failed critical: ${buckets.failingCritical.length}, missing evidence: ${buckets.missingEvidenceHigh.length}, global failure rate: ${failureRatePct}%.`,
    per_attribute,
    deployment_recommendation: {
      decision,
      rationale: RATIONALE_BY_DECISION[decision],
      blocking_issues,
      warnings,
    },
    next_iteration_priorities: attrs
      .filter((a) => a.matched_suites <= 1 && a.criticality >= 4)
      .map((a) => `Increase coverage breadth for "${a.id}" (current matched_suites=${a.matched_suites}).`),
  };
}

// ---------------------------------------------------------------------------
// 5. Render markdown report
// ---------------------------------------------------------------------------

function toMarkdown(report, metadata) {
  const dec = report.deployment_recommendation;
  const modelSuffix = metadata.model ? ` — model: \`${metadata.model}\`` : "";
  const lines = [
    "# AI Pipeline Analyzer — Deployment Recommendation",
    "",
    `Generated: ${metadata.timestamp}`,
    `Provider: \`${metadata.provider}\`${modelSuffix}`,
    `Git SHA: \`${metadata.git_sha}\``,
    "",
    "## Decision",
    "",
    `**${dec.decision.toUpperCase()}** — ${dec.rationale}`,
    "",
  ];

  if (dec.blocking_issues?.length) {
    lines.push("### Blocking issues", "");
    for (const i of dec.blocking_issues) lines.push(`- ${i}`);
    lines.push("");
  }
  if (dec.warnings?.length) {
    lines.push("### Warnings", "");
    for (const w of dec.warnings) lines.push(`- ${w}`);
    lines.push("");
  }

  lines.push(
    "## Global assessment",
    "",
    report.global_assessment,
    "",
    "## Per attribute",
    "",
    "| Attribute | Risk | Anomalies | Rationale |",
    "|---|---|---|---|",
  );
  for (const a of report.per_attribute) {
    const anomalies = a.anomalies_detected.length
      ? a.anomalies_detected.map((x) => `- ${x}`).join("<br>")
      : "—";
    const rationale = a.rationale.replaceAll("\n", " ");
    lines.push(`| ${a.attribute_id} | ${a.risk_level} | ${anomalies} | ${rationale} |`);
  }
  lines.push("");

  if (report.next_iteration_priorities?.length) {
    lines.push("## Next iteration priorities", "");
    for (const p of report.next_iteration_priorities) lines.push(`- ${p}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(paths.outDir, { recursive: true });

  const evidence = buildEvidencePayload();
  const systemPrompt = fs.readFileSync(paths.systemPrompt, "utf-8");
  const userPrompt = buildUserPrompt(evidence);
  const promptHash = crypto
    .createHash("sha256")
    .update(systemPrompt + "\n---\n" + userPrompt)
    .digest("hex");

  fs.writeFileSync(
    path.join(paths.outDir, "prompt.txt"),
    `# system\n${systemPrompt}\n\n# user\n${userPrompt}\n`,
  );

  const apiKey = process.env.OPENROUTER_API_KEY;
  let report;
  let providerMeta;

  if (apiKey) {
    try {
      const { raw, parsed } = await callOpenRouter({
        apiKey,
        systemPrompt,
        userPrompt,
      });
      fs.writeFileSync(path.join(paths.outDir, "response.raw.json"), raw);

      const content = parsed?.choices?.[0]?.message?.content;
      report = extractJsonFromContent(content);
      providerMeta = {
        provider: "openrouter",
        model: parsed?.model || DEFAULTS.model,
        usage: parsed?.usage || null,
      };
    } catch (err) {
      console.error("[ai-analyzer] LLM call failed, falling back to heuristic:", err.message);
      report = heuristicAnalysis(evidence);
      const truncated = err.message.slice(0, 200);
      providerMeta = {
        provider: "heuristic-fallback",
        model: null,
        reason: `llm_error: ${truncated}`,
      };
      fs.writeFileSync(
        path.join(paths.outDir, "response.raw.json"),
        JSON.stringify({ error: err.message, provider: "heuristic-fallback" }, null, 2),
      );
    }
  } else {
    console.warn(
      "[ai-analyzer] OPENROUTER_API_KEY not set — using deterministic heuristic fallback.",
    );
    report = heuristicAnalysis(evidence);
    providerMeta = {
      provider: "heuristic-fallback",
      model: null,
      reason: "missing_api_key",
    };
    fs.writeFileSync(
      path.join(paths.outDir, "response.raw.json"),
      JSON.stringify({ note: "no LLM call performed", provider: "heuristic-fallback" }, null, 2),
    );
  }

  const metadata = {
    ...providerMeta,
    timestamp: new Date().toISOString(),
    git_sha: evidence.pipeline.git_sha,
    prompt_sha256: promptHash,
    base_url: DEFAULTS.baseUrl,
    temperature: 0,
    schema_version: 1,
  };

  fs.writeFileSync(
    path.join(paths.outDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
  );
  fs.writeFileSync(
    path.join(paths.outDir, "pipeline-recommendation.json"),
    JSON.stringify({ ...report, _metadata: metadata }, null, 2),
  );
  fs.writeFileSync(
    path.join(paths.outDir, "pipeline-recommendation.md"),
    toMarkdown(report, metadata),
  );

  const modelSuffix = metadata.model ? ` model=${metadata.model}` : "";
  console.log(
    `[ai-analyzer] decision=${report.deployment_recommendation.decision} provider=${metadata.provider}${modelSuffix}`,
  );
}

try {
  await main();
} catch (err) {
  console.error("[ai-analyzer] fatal:", err);
  process.exit(1);
}
