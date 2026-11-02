/**
 * Minimal OpenRouter client for the generative analysis stage.
 *
 * Design constraints that matter for reproducibility, since the pipeline is the
 * subject of a paper:
 *   - the model is pinned and recorded in the bundle, never left to a default;
 *   - temperature is 0;
 *   - the response is constrained by a JSON Schema (`strict: true`) and the
 *     provider is required to support that, so a provider that would silently
 *     ignore the schema is not routed to;
 *   - max_tokens is always explicit (OpenRouter rejects requests whose default
 *     budget exceeds the account's remaining credit);
 *   - every prompt and every raw response is persisted next to the bundle.
 *
 * The API key is read from OPENROUTER_API_KEY, falling back to Vento/.env.local
 * for local runs. It is never logged.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { FRONTEND_DIR } from "./model.mjs";

export const DEFAULT_MODEL = "google/gemini-3.1-flash-lite";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export function resolveApiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();

  const envLocal = path.join(FRONTEND_DIR, ".env.local");
  if (existsSync(envLocal)) {
    const match = readFileSync(envLocal, "utf8").match(/^OPENROUTER_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  }
  return null;
}

export function resolveModel() {
  return process.env.AI_ANALYZER_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * One structured-output completion.
 * Returns { ok, data, raw, usage, model, error }. Never throws on a bad
 * response: an analysis stage that crashes the pipeline would be worse than one
 * that reports it could not analyse.
 */
export async function completeStructured({
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  schema,
  schemaName,
  maxTokens = 700,
}) {
  const requestBody = {
    model,
    temperature: 0,
    max_tokens: maxTokens,
    provider: { require_parameters: true },
    response_format: {
      type: "json_schema",
      json_schema: { name: schemaName, strict: true, schema },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "Vento Quality Attributes Pipeline",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    return { ok: false, error: `network error: ${error.message}`, requestBody };
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    return { ok: false, error: `unparseable response: ${error.message}`, requestBody };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `HTTP ${response.status}: ${body?.error?.message ?? "unknown error"}`,
      raw: body,
      requestBody,
    };
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, error: "response contained no message content", raw: body, requestBody };
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    return {
      ok: false,
      error: `model did not return JSON: ${error.message}`,
      raw: body,
      requestBody,
    };
  }

  return {
    ok: true,
    data,
    raw: body,
    requestBody,
    usage: body.usage ?? null,
    model: body.model ?? model,
  };
}

/** Persists a prompt/response pair so any reported result can be reproduced. */
export function persistExchange(dir, name, { requestBody, raw, error }) {
  mkdirSync(dir, { recursive: true });
  const redacted = requestBody ? { ...requestBody } : null;
  writeFileSync(
    path.join(dir, `${name}.request.json`),
    `${JSON.stringify(redacted, null, 2)}\n`,
  );
  writeFileSync(
    path.join(dir, `${name}.response.json`),
    `${JSON.stringify(raw ?? { error }, null, 2)}\n`,
  );
}
