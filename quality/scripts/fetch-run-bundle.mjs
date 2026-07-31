#!/usr/bin/env node
/**
 * Downloads the evidence bundle of a GitHub Actions run.
 *
 * The organization's Actions policy forbids marketplace actions, so
 * actions/upload-artifact is unavailable and the pipeline prints the bundle
 * into the job log instead. This script recovers it from there, which keeps the
 * bundle a real deliverable of every CI run rather than something only visible
 * by scrolling a log.
 *
 * It also records the per-step timings reported by the Actions API, so the
 * durations quoted in the paper come from the platform rather than from the
 * collector's own stopwatch.
 *
 * Requires the `gh` CLI, authenticated.
 *
 * Usage:
 *   node quality/scripts/fetch-run-bundle.mjs <runId> [--out quality/evidence]
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { QUALITY_DIR } from "./lib/model.mjs";

const GROUP_START = "##[group]Evidence bundle";
const GROUP_END = "##[endgroup]";

function parseArgs(argv) {
  const options = { runId: null, outDir: path.join(QUALITY_DIR, "evidence") };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out") {
      options.outDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (!options.runId) {
      options.runId = argv[i];
    }
  }
  return options;
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
}

/** Strips the "job<TAB>step<TAB>timestamp " prefix and ANSI codes GitHub adds. */
function extractBundle(log) {
  const collected = [];
  let capturing = false;

  for (const line of log.split("\n")) {
    const parts = line.split("\t");
    if (parts.length < 3 || parts[1].trim() !== "Publish evidence bundle") continue;

    const content = parts[2]
      .replace(/^﻿?\S+Z /, "")
      .replace(/\x1b\[[0-9;]*m/g, "");

    if (content.startsWith(GROUP_START)) {
      capturing = true;
      continue;
    }
    if (content.startsWith(GROUP_END)) {
      capturing = false;
      continue;
    }
    if (capturing) collected.push(content);
  }

  return collected.join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.runId) {
    console.error("[fetch-run-bundle] Usage: fetch-run-bundle.mjs <runId> [--out <dir>]");
    process.exit(1);
  }

  console.log(`[fetch-run-bundle] Reading log of run ${options.runId}...`);
  const log = gh(["run", "view", options.runId, "--log"]);
  const raw = extractBundle(log);

  if (!raw.trim()) {
    console.error(
      "[fetch-run-bundle] No evidence bundle found in the log. The run may have " +
        "failed before the 'Publish evidence bundle' step.",
    );
    process.exit(1);
  }

  let bundle;
  try {
    bundle = JSON.parse(raw);
  } catch (error) {
    console.error(`[fetch-run-bundle] The captured text is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  mkdirSync(options.outDir, { recursive: true });
  const bundlePath = path.join(options.outDir, `run-${bundle.runId}.json`);
  writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);

  // Per-step timings straight from the Actions API.
  const jobs = JSON.parse(
    gh(["api", `repos/{owner}/{repo}/actions/runs/${options.runId}/jobs`, "--paginate"]),
  );
  const timings = {
    runId: String(options.runId),
    jobs: (jobs.jobs ?? []).map((job) => ({
      name: job.name,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      durationMs: new Date(job.completed_at) - new Date(job.started_at),
      conclusion: job.conclusion,
      steps: (job.steps ?? []).map((step) => ({
        name: step.name,
        conclusion: step.conclusion,
        durationMs: new Date(step.completed_at) - new Date(step.started_at),
      })),
    })),
  };
  const timingsPath = path.join(options.outDir, `timings-${bundle.runId}.json`);
  writeFileSync(timingsPath, `${JSON.stringify(timings, null, 2)}\n`);

  const passed = bundle.gates.filter((g) => g.status === "passed").length;
  const failed = bundle.gates.filter((g) => g.status === "failed").length;
  const skipped = bundle.gates.filter((g) => g.status === "skipped").length;
  console.log(
    `[fetch-run-bundle] ${path.relative(process.cwd(), bundlePath)}: ` +
      `${passed} passed, ${failed} failed, ${skipped} skipped\n` +
      `[fetch-run-bundle] ${path.relative(process.cwd(), timingsPath)}: per-step timings`,
  );
}

main();
