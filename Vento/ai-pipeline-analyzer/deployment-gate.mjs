/**
 * Deployment Gate — implements the conditional Deploy phase of the
 * automated testing protocol (paper Sec. III, Fig. 1; Sec. IV, Fig. 2).
 *
 * Reads the AI Pipeline Analyzer recommendation and decides whether the
 * build is promoted. Persists the final decision as a pipeline artifact.
 *
 * Inputs:
 *   - quality-evidence/ai/pipeline-recommendation.json
 *
 * Outputs:
 *   - quality-evidence/decision/deployment-decision.json
 *
 * Configuration (env vars):
 *   - DEPLOY_GATE_STRICT  ("true" makes the gate exit 1 on `warn`)
 *   - GIT_SHA, GITHUB_SHA (for traceability)
 *
 * Exit codes:
 *   0  → allow (or warn in non-strict mode)
 *   1  → block (or warn in strict mode)
 *   2  → analyzer output missing or malformed
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const paths = {
  recommendation: path.join(
    projectRoot,
    "quality-evidence/ai/pipeline-recommendation.json",
  ),
  decisionDir: path.join(projectRoot, "quality-evidence/decision"),
};

function loadRecommendation() {
  if (!fs.existsSync(paths.recommendation)) {
    console.error(
      `[gate] AI recommendation not found at ${paths.recommendation}. ` +
        "Did you run \"npm run qa:ai\" before this gate?",
    );
    process.exit(2);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(paths.recommendation, "utf-8"));
  } catch (err) {
    console.error("[gate] Could not parse AI recommendation:", err.message);
    process.exit(2);
  }
  const dec = parsed?.deployment_recommendation;
  if (!dec || !["allow", "warn", "block"].includes(dec.decision)) {
    console.error("[gate] AI recommendation has invalid `deployment_recommendation`.");
    process.exit(2);
  }
  return parsed;
}

const strict = String(process.env.DEPLOY_GATE_STRICT || "").toLowerCase() === "true";
const recommendation = loadRecommendation();
const dec = recommendation.deployment_recommendation;
const meta = recommendation._metadata || {};

const finalDecision = {
  decision: dec.decision,
  rationale: dec.rationale,
  blocking_issues: dec.blocking_issues || [],
  warnings: dec.warnings || [],
  strict_mode: strict,
  provider: meta.provider || "unknown",
  model: meta.model || null,
  git_sha: meta.git_sha || process.env.GIT_SHA || process.env.GITHUB_SHA || "local",
  evaluated_at: new Date().toISOString(),
  source_recommendation_at: meta.timestamp || null,
};

fs.mkdirSync(paths.decisionDir, { recursive: true });
fs.writeFileSync(
  path.join(paths.decisionDir, "deployment-decision.json"),
  JSON.stringify(finalDecision, null, 2),
);

console.log(
  `[gate] decision=${dec.decision} provider=${meta.provider} strict=${strict}`,
);
if (dec.blocking_issues?.length) {
  console.log("[gate] blocking_issues:");
  for (const i of dec.blocking_issues) console.log(`  - ${i}`);
}
if (dec.warnings?.length) {
  console.log("[gate] warnings:");
  for (const w of dec.warnings) console.log(`  - ${w}`);
}

if (dec.decision === "block") {
  console.error("[gate] BLOCK — deployment will not be promoted.");
  process.exit(1);
}
if (dec.decision === "warn" && strict) {
  console.error("[gate] WARN in strict mode — treating as block.");
  process.exit(1);
}
console.log(`[gate] ${dec.decision.toUpperCase()} — deployment may proceed.`);
process.exit(0);
