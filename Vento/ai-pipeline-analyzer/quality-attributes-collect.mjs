/**
 * Quality Attributes Collector — Test Phase artifact builder.
 *
 * Reads raw Vitest JSON output and the attribute-mapping config, and produces
 * a deterministic per-attribute coverage report in two formats:
 *   - quality-evidence/reports/attribute-coverage.json
 *   - quality-evidence/reports/attribute-coverage.md
 *
 * This script is the deterministic "Test phase" artifact described in the
 * paper (Sec. III, Fig. 1) and feeds the AI Analysis phase
 * (ai-pipeline-analyzer.mjs, same directory).
 *
 * Scope: frontend-only. End-to-end GIS attributes (real spatial data,
 * geoservices) require backend coverage and live outside this script.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analyzerDir = __dirname;
const projectRoot = path.resolve(analyzerDir, "..");

const reportPath = path.join(projectRoot, "quality-evidence/reports/vitest.json");
const configPath = path.join(analyzerDir, "quality-attributes.config.json");
const outputDir = path.join(projectRoot, "quality-evidence/reports");
const outputJsonPath = path.join(outputDir, "attribute-coverage.json");
const outputMdPath = path.join(outputDir, "attribute-coverage.md");

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

function safeRate(numerator, denominator) {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function scoreAttribute({ criticality, passRate, matchedSuites, totalAssertions, failedAssertions }) {
  const normalizedCriticality = Math.min(5, Math.max(1, criticality)) / 5;
  const confidence = totalAssertions > 0 ? Math.min(1, totalAssertions / 15) : 0;
  const failureFactor = failedAssertions > 0 ? 1 : 0;
  const breadthFactor = matchedSuites > 0 ? Math.min(1, matchedSuites / 5) : 0;

  const score =
    100 *
    (0.35 * normalizedCriticality +
      0.35 * (1 - passRate / 100) +
      0.2 * (1 - confidence) +
      0.1 * (1 - breadthFactor) +
      0.15 * failureFactor);
  return Number(score.toFixed(2));
}

function toRelative(filePath) {
  return filePath.replaceAll("\\", "/").replace(`${projectRoot.replaceAll("\\", "/")}/`, "");
}

function matchSuite(fileName, patterns) {
  const normalized = fileName.replaceAll("\\", "/");
  return patterns.some((pattern) => normalized.includes(pattern));
}

ensureFileExists(reportPath);
ensureFileExists(configPath);

const vitestReport = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
const attributesConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const suites = vitestReport.testResults || [];
const global = {
  testSuites: vitestReport.numTotalTestSuites ?? 0,
  passedSuites: vitestReport.numPassedTestSuites ?? 0,
  failedSuites: vitestReport.numFailedTestSuites ?? 0,
  tests: vitestReport.numTotalTests ?? 0,
  passedTests: vitestReport.numPassedTests ?? 0,
  failedTests: vitestReport.numFailedTests ?? 0,
  generatedAt: new Date().toISOString(),
};

const failedAssertionsAcrossSuites = [];

const attributes = attributesConfig.attributes.map((attr) => {
  const matched = suites.filter((suite) => matchSuite(suite.name, attr.patterns));
  const assertions = matched.flatMap((suite) =>
    (suite.assertionResults || []).map((a) => ({
      ...a,
      _suite: toRelative(suite.name),
    })),
  );
  const totalAssertions = assertions.length;
  const passedAssertions = assertions.filter((a) => a.status === "passed").length;
  const failed = assertions.filter((a) => a.status === "failed");
  const failedAssertions = failed.length;
  const passRate = safeRate(passedAssertions, totalAssertions);
  const coverageStatus = matched.length > 0 && failedAssertions === 0 ? "PASS" : "ATTENTION";
  const priorityScore = scoreAttribute({
    criticality: attr.criticality,
    passRate,
    matchedSuites: matched.length,
    totalAssertions,
    failedAssertions,
  });

  for (const f of failed) {
    failedAssertionsAcrossSuites.push({
      attribute_id: attr.id,
      suite: f._suite,
      title: f.fullName || f.title,
      messages: (f.failureMessages || []).slice(0, 1),
    });
  }

  return {
    id: attr.id,
    name: attr.name,
    criticality: attr.criticality,
    status: coverageStatus,
    matchedSuites: matched.length,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    passRate,
    priorityScore,
    suggestedTests: attr.suggested_tests || [],
    suiteFiles: matched.map((suite) => toRelative(suite.name)),
  };
});

const ranking = [...attributes].sort((a, b) => b.priorityScore - a.priorityScore);
const report = {
  scope: "frontend-only",
  note:
    "Este reporte cubre los atributos de calidad verificables desde el frontend (Next.js + Vitest). " +
    "La cobertura end-to-end de atributos GIS de backend (geoservicios reales, datasets vivos) queda " +
    "fuera de alcance de este artefacto y se evalúa desde el repositorio FastAPI.",
  global,
  attributes,
  failedAssertions: failedAssertionsAcrossSuites,
  priorityRanking: ranking.map((r, idx) => ({
    rank: idx + 1,
    id: r.id,
    name: r.name,
    priorityScore: r.priorityScore,
    status: r.status,
    suggestedTests: r.suggestedTests,
  })),
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputJsonPath, JSON.stringify(report, null, 2));

const coverageRows = attributes.map(
  (attr) =>
    `| ${attr.name} | ${attr.status} | ${attr.matchedSuites} | ${attr.passedAssertions}/${attr.totalAssertions} | ${attr.passRate}% | ${attr.priorityScore} |`,
);
const rankingRows = report.priorityRanking.map(
  (item) =>
    `${item.rank}. **${item.name}** (${item.priorityScore}) — ${item.status}. Suggested: ${item.suggestedTests.join("; ") || "N/A"}`,
);

const mdLines = [
  "# Quality Attributes Coverage Report (Test Phase)",
  "",
  `Generated: ${report.global.generatedAt}`,
  "",
  "## Global",
  "",
  `- Test suites: ${global.passedSuites}/${global.testSuites} passed`,
  `- Tests: ${global.passedTests}/${global.tests} passed`,
  `- Scope: ${report.scope}`,
  `- Note: ${report.note}`,
  "",
  "## Attribute Coverage",
  "",
  "| Attribute | Status | Suites | Assertions (pass/total) | Pass rate | Priority score |",
  "|---|---:|---:|---:|---:|---:|",
  ...coverageRows,
  "",
  "## Heuristic Prioritization (deterministic baseline, pre-AI)",
  "",
  ...rankingRows,
  "",
];

fs.writeFileSync(outputMdPath, mdLines.join("\n"));

console.log(`[collect] attribute-coverage.json → ${outputJsonPath}`);
console.log(`[collect] attribute-coverage.md   → ${outputMdPath}`);
