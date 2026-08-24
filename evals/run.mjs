#!/usr/bin/env node
// Design Jarvis eval runner.
// Reads a captured agent-session JSONL log, extracts metrics, and grades it
// against a scenario via an optional OpenAI-compatible judge endpoint.
//
// Usage:
//   node evals/run.mjs --scenario 01-competitive-research --log <path-to-jsonl>
//   node evals/run.mjs --batch --baseline

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTrajectory,
  computeHarnessScore,
  parseTranscriptFile,
  runDeterministicValidators,
  stripHeavyMetrics,
} from "./lib/harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = join(__dirname, "scenarios");
const RESULTS_DIR = join(__dirname, "results");
const TRAJECTORIES_DIR = join(__dirname, "trajectories");
const JUDGE_PROMPT_PATH = join(__dirname, "judges", "design-lead-judge.md");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    }
  }
  return args;
}

// A matched entry may be a flat `<id>.jsonl` file or a `<id>/` directory
// containing `main.jsonl` (current VS Code layout).
function resolveLogFile(entryPath) {
  let stat;
  try { stat = statSync(entryPath); } catch { return null; }
  if (stat.isFile()) return entryPath;
  if (stat.isDirectory()) {
    const nested = join(entryPath, "main.jsonl");
    if (existsSync(nested)) return nested;
    const anyJsonl = readdirSync(entryPath).find((f) => f.endsWith(".jsonl"));
    if (anyJsonl) return join(entryPath, anyJsonl);
  }
  return null;
}

function deriveSessionId(logPath) {
  const parts = logPath.replace(/\/+$/, "").split("/");
  const name = parts.pop();
  if (name === "main.jsonl") return parts.pop() || "session";
  return name.replace(/\.jsonl$/, "");
}

async function gradeWithJudge(scenario, metrics) {
  const token = process.env.JUDGE_TOKEN;
  const endpoint = process.env.JUDGE_ENDPOINT;
  if (!token || !endpoint) {
    console.warn("JUDGE_ENDPOINT or JUDGE_TOKEN is not set — emitting a metrics-only result.");
    return { scenario_id: scenario.id, verdict: "ungraded", criteria: [], notes: "No external judge configured." };
  }
  const judgePrompt = readFileSync(JUDGE_PROMPT_PATH, "utf8");

  // The judge needs compact metrics plus a transcript excerpt — never the raw
  // events/tool_calls arrays (hundreds of KB) which blow past model token limits.
  // JUDGE_TRANSCRIPT_CHARS lets maintainers widen the excerpt for larger models.
  const transcriptBudget = Number(process.env.JUDGE_TRANSCRIPT_CHARS || 18000);
  const compactMetrics = {
    tool_call_count: metrics.tool_call_count,
    tool_breakdown: metrics.tool_breakdown,
    tokens_input: metrics.tokens_input,
    tokens_output: metrics.tokens_output,
    wall_clock_seconds: metrics.wall_clock_seconds,
    specialists_invoked: metrics.specialists_invoked,
  };
  const transcript = truncateForJudge(metrics.transcript || "", transcriptBudget);
  const userMessage = JSON.stringify({ scenario, metrics: compactMetrics, transcript }, null, 2);

  const model = process.env.JUDGE_MODEL || "judge-model";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: judgePrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Judge API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  return parseJudgeJson(text, scenario.id);
}

function truncateForJudge(text, budget) {
  if (text.length <= budget) return text;
  const head = Math.ceil(budget * 0.65);
  const tail = budget - head;
  return `${text.slice(0, head)}\n\n…[transcript truncated: ${text.length - budget} chars omitted]…\n\n${text.slice(text.length - tail)}`;
}

function parseJudgeJson(text, scenarioId) {
  // Models often wrap JSON in markdown fences or prose; extract the JSON object.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const slice = start !== -1 && end > start ? candidate.slice(start, end + 1) : candidate;
  try { return JSON.parse(slice); }
  catch { return { scenario_id: scenarioId, verdict: "parse_error", raw: text }; }
}

async function runOne(scenarioId, sessionId, logOverride = null) {
  const scenario = JSON.parse(readFileSync(join(SCENARIOS_DIR, `${scenarioId}.json`), "utf8"));
  if (!logOverride) throw new Error("A JSONL transcript path is required. Pass --log <path>.");
  const logPath = resolveLogFile(logOverride);
  if (!logPath) throw new Error(`Transcript not found or unreadable: ${logOverride}`);
  const metrics = parseTranscriptFile(logPath);
  const grade = await gradeWithJudge(scenario, metrics);
  const deterministicValidators = runDeterministicValidators(scenario, metrics, { repoRoot: join(__dirname, "..") });
  const harnessScore = computeHarnessScore(scenario, grade, metrics, deterministicValidators);

  const today = new Date().toISOString().slice(0, 10);
  const outDir = join(RESULTS_DIR, today);
  mkdirSync(outDir, { recursive: true });
  const trajectoryDir = join(TRAJECTORIES_DIR, today);
  mkdirSync(trajectoryDir, { recursive: true });
  const trajectory = buildTrajectory({ scenario, sessionId, logPath, metrics });
  const trajectoryPath = join(trajectoryDir, `${scenarioId}-${sessionId}.jsonl`);
  writeFileSync(trajectoryPath, `${JSON.stringify(trajectory)}\n`);

  const result = {
    ...grade,
    deterministic_validators: deterministicValidators,
    harness_score: harnessScore,
    metrics: stripHeavyMetrics(metrics),
    scenario_id: scenario.id,
    session_id: sessionId,
    trajectory_path: trajectoryPath,
    run_at: new Date().toISOString(),
  };
  const outPath = join(outDir, `${scenarioId}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`✔ ${scenarioId} → ${result.verdict}  (score ${harnessScore.total}, ${metrics.tool_call_count} tool calls, ${metrics.tokens_input + metrics.tokens_output} tokens) → ${outPath}`);
  return result;
}

async function rollupBaseline() {
  const today = new Date().toISOString().slice(0, 10);
  const dir = join(RESULTS_DIR, today);
  if (!existsSync(dir)) throw new Error(`No results for today (${today}). Run scenarios first.`);
  const results = readdirSync(dir).filter(f => f.endsWith(".json") && !f.startsWith("baseline-"))
    .map(f => JSON.parse(readFileSync(join(dir, f), "utf8")));
  const passed = results.filter(r => r.verdict === "pass").length;
  const summary = {
    date: today,
    total: results.length,
    passed,
    pass_rate: results.length ? passed / results.length : 0,
    mean_tool_calls: avg(results.map(r => r.metrics?.tool_call_count || 0)),
    mean_tokens: avg(results.map(r => (r.metrics?.tokens_input || 0) + (r.metrics?.tokens_output || 0))),
    mean_harness_score: avg(results.map(r => Math.round((r.harness_score?.total || 0) * 1000))) / 1000,
    by_scenario: results.map(r => ({
      id: r.scenario_id,
      verdict: r.verdict,
      harness_score: r.harness_score?.total,
      validators_passed: (r.deterministic_validators || []).filter(v => v.pass).length,
      validators_total: (r.deterministic_validators || []).length,
      tool_calls: r.metrics?.tool_call_count,
      tokens: (r.metrics?.tokens_input || 0) + (r.metrics?.tokens_output || 0),
    })),
  };
  const out = join(RESULTS_DIR, `baseline-${today}.json`);
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`✔ Baseline → ${out}`);
  console.log(`  Pass rate: ${(summary.pass_rate * 100).toFixed(1)}% (${passed}/${results.length})`);
}

function avg(arr) { return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0; }

const args = parseArgs(process.argv);
if (args.batch && args.baseline) {
  rollupBaseline().catch(e => { console.error(e); process.exit(1); });
} else if (args.scenario && args.log) {
  const logOverride = typeof args.log === "string" ? args.log : null;
  const sessionId = args.session || deriveSessionId(logOverride);
  runOne(args.scenario, sessionId, logOverride).catch(e => { console.error(e); process.exit(1); });
} else {
  console.error("Usage: node evals/run.mjs --scenario <id> --log <path-to-session.jsonl>");
  console.error("       node evals/run.mjs --batch --baseline");
  process.exit(1);
}
