#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const RESULTS_DIR = join(__dirname, "results");
const CANDIDATES_DIR = join(__dirname, "skill-candidates");

export function collectSkillUpdateCandidates({ resultsDir = RESULTS_DIR } = {}) {
  if (!existsSync(resultsDir)) return [];
  const candidates = [];
  for (const file of listJsonFiles(resultsDir)) {
    const result = JSON.parse(readFileSync(file, "utf8"));
    const failedValidators = (result.deterministic_validators || []).filter((validator) => !validator.pass);
    const failedCriteria = (result.criteria || []).filter((criterion) => criterion.pass === false);
    const shouldCreate = result.verdict === "fail" || result.verdict === "parse_error" || failedValidators.length > 0;
    if (!shouldCreate) continue;

    candidates.push({
      schemaVersion: 1,
      scenario_id: result.scenario_id,
      session_id: result.session_id,
      source_result: file,
      verdict: result.verdict,
      harness_score: result.harness_score?.total ?? null,
      recommended_target: inferTarget(result),
      evidence: {
        failed_criteria: failedCriteria.map((criterion) => ({
          criterion: criterion.criterion,
          evidence: criterion.evidence,
          severity: criterion.severity,
        })),
        failed_validators: failedValidators.map((validator) => ({
          type: validator.type,
          description: validator.description,
          evidence: validator.evidence,
        })),
      },
      proposal: buildProposal(result, failedCriteria, failedValidators),
      status: "needs-human-review",
    });
  }
  return candidates;
}

export function writeSkillUpdateCandidates(candidates, { outDir = CANDIDATES_DIR, date = new Date().toISOString().slice(0, 10) } = {}) {
  const dir = join(outDir, date);
  mkdirSync(dir, { recursive: true });
  const paths = [];
  for (const candidate of candidates) {
    const filename = `${candidate.scenario_id || "unknown"}-${candidate.session_id || "no-session"}.json`;
    const path = join(dir, filename);
    writeFileSync(path, JSON.stringify(candidate, null, 2));
    paths.push(path);
  }
  return paths;
}

function buildProposal(result, failedCriteria, failedValidators) {
  const parts = [];
  if (failedCriteria.length) {
    parts.push(`Address failed criteria: ${failedCriteria.map((criterion) => criterion.criterion).join(" | ")}`);
  }
  if (failedValidators.length) {
    parts.push(`Add deterministic discipline for validators: ${failedValidators.map((validator) => validator.description || validator.type).join(" | ")}`);
  }
  if (!parts.length) parts.push("Investigate failed eval and decide whether a skill, agent instruction, or scenario expectation should change.");
  return parts.join("\n");
}

function inferTarget(result) {
  const scenarioId = result.scenario_id || "";
  if (scenarioId.includes("memory")) return ".github/skills/memory/SKILL.md";
  if (scenarioId.includes("hifi") || scenarioId.includes("token") || scenarioId.includes("figma")) return ".github/skills/hifi-design/SKILL.md";
  if (scenarioId.includes("prototype")) return ".github/agents/front-end-engineer.agent.md";
  if (scenarioId.includes("research")) return ".github/agents/ux-researcher.agent.md";
  return ".github/agents/design-jarvis.agent.md";
}

function listJsonFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const path = join(current, entry);
      if (existsSync(path) && isDirectory(path)) stack.push(path);
      else if (entry.endsWith(".json") && !entry.startsWith("baseline-")) files.push(path);
    }
  }
  return files;
}

function isDirectory(path) {
  try {
    readdirSync(path);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  return new Set(argv.slice(2));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv);
  const candidates = collectSkillUpdateCandidates();
  if (!candidates.length) {
    console.log("No failed eval results found; no skill update candidates generated.");
    process.exit(0);
  }
  if (args.has("--write")) {
    const paths = writeSkillUpdateCandidates(candidates);
    console.log(`Wrote ${paths.length} skill update candidate(s):`);
    for (const path of paths) console.log(`- ${path}`);
  } else {
    console.log(JSON.stringify(candidates, null, 2));
    console.log("\nDry run only. Re-run with --write to create candidate files.");
  }
}
