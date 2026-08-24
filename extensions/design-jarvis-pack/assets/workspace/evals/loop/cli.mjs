#!/usr/bin/env node
// Jarvis Improvement Loop — CLI.
// Deterministic backbone for the /loop-goal agent workflow. The agent (LLM) runs the
// 6-phase contract; this CLI provides the parts that MUST be deterministic so grades
// cannot be faked: goal classification, rubric validation, gate verification, and
// run persistence.
//
// Subcommands:
//   classify  --goal "<text>"                        Suggest a profile (hint for the agent).
//   ground    --goal "<text>" [--profile <id>] [--run <id>]
//                                                     Scaffold a grounded rubric (repo sources + schema).
//   validate  --rubric <path>                         Enforce grounding_policy before locking.
//   verify    --rubric <path> [--json]                Run the locked gate (deterministic-first).
//   start     --goal "<text>" [--profile <id>]        Create a run dir; print run id.
//   record    --run <id> --turn <path>                Append a turn record to turns.jsonl.
//   status    --run <id>                              Print run state + plateau check.
//
// All paths are resolved from the repo root (two levels up from this file).

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  appendFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyGoal,
  validateRubric,
  checkPlateau,
  DETERMINISTIC_CHECK_KINDS,
  globToRegExp,
  readPath,
  slugify,
} from "./lib/core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOOP_DIR = __dirname;
// REPO_ROOT and RUNS_DIR are reassignable so a globally installed engine can target
// the user's actual workspace via --repo-root / JIL_REPO_ROOT. Default keeps the
// in-repo behavior (two levels up) so the dev harness and tests are unchanged.
let REPO_ROOT = join(__dirname, "..", "..");
let RUNS_DIR = join(LOOP_DIR, "runs");
const POLICIES_PATH = join(LOOP_DIR, "policies.json");
const PROFILES_PATH = join(LOOP_DIR, "profiles.json");

// Commands the `command` check kind is allowed to run, by leading token. Defensive
// guard so a rubric can only invoke repo tooling, never arbitrary shell.
const COMMAND_ALLOWLIST = ["node", "npm", "npx"];

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 3; i < argv.length; i++) {
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

function walkFiles(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try { entries = readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const full = join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

function expandGlobs(globs = []) {
  const all = walkFiles(REPO_ROOT).map((f) => relative(REPO_ROOT, f).replace(/\\/g, "/"));
  const matched = new Set();
  for (const glob of globs) {
    const re = globToRegExp(glob);
    for (const rel of all) if (re.test(rel)) matched.add(rel);
  }
  return [...matched];
}

// ---- check executors -------------------------------------------------------

function runGrep(check, expectPresent) {
  const files = expandGlobs(check.globs || []);
  const re = new RegExp(check.pattern, check.flags || "g");
  const hitsByFile = [];
  for (const rel of files) {
    const content = readFileSync(join(REPO_ROOT, rel), "utf8");
    const matches = content.match(re);
    if (matches && matches.length) hitsByFile.push({ file: rel, count: matches.length });
  }
  const present = hitsByFile.length > 0;
  const pass = expectPresent ? present : !present;
  const evidence = expectPresent
    ? (present ? `found in ${hitsByFile.length} file(s)` : `pattern not found in ${files.length} scanned file(s)`)
    : (present ? `pattern present in: ${hitsByFile.slice(0, 5).map((h) => h.file).join(", ")}` : `pattern absent across ${files.length} scanned file(s)`);
  return { pass, evidence, detail: hitsByFile.slice(0, 20) };
}

function runCommand(check) {
  const cmd = String(check.run || "").trim();
  const lead = cmd.split(/\s+/)[0];
  if (!COMMAND_ALLOWLIST.includes(lead)) {
    return { pass: false, evidence: `command '${lead}' not in allowlist (${COMMAND_ALLOWLIST.join(", ")})` };
  }
  const res = spawnSync(cmd, { cwd: REPO_ROOT, shell: true, encoding: "utf8", timeout: 1000 * 60 * 5 });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  let pass = res.status === 0;
  if (pass && check.expectInStdout) pass = new RegExp(check.expectInStdout).test(out);
  return { pass, evidence: `exit ${res.status}${check.expectInStdout ? ` / expect '${check.expectInStdout}'` : ""}`, detail: out.slice(-1000) };
}

function runFileExists(check) {
  const target = join(REPO_ROOT, check.path);
  const ok = existsSync(target);
  return { pass: ok, evidence: ok ? `exists: ${check.path}` : `missing: ${check.path}` };
}

function runJsonPath(check) {
  const target = join(REPO_ROOT, check.file);
  if (!existsSync(target)) return { pass: false, evidence: `file missing: ${check.file}` };
  let json;
  try { json = JSON.parse(readFileSync(target, "utf8")); } catch (e) { return { pass: false, evidence: `invalid JSON: ${e.message}` }; }
  const val = readPath(json, check.path);
  const ok = val !== undefined;
  return { pass: ok, evidence: ok ? `${check.path} = ${JSON.stringify(val).slice(0, 80)}` : `path missing: ${check.path}` };
}

function runScoreAtLeast(check) {
  const target = join(REPO_ROOT, check.result);
  if (!existsSync(target)) return { pass: false, evidence: `result missing: ${check.result}` };
  const json = JSON.parse(readFileSync(target, "utf8"));
  const val = Number(readPath(json, check.field || "harness_score.total"));
  const min = Number(check.min);
  const ok = !Number.isNaN(val) && val >= min;
  return { pass: ok, evidence: `${check.field || "harness_score.total"}=${val} (min ${min})` };
}

function executeCheck(check) {
  switch (check?.kind) {
    case "grep_absent": return runGrep(check, false);
    case "grep_present": return runGrep(check, true);
    case "command": return runCommand(check);
    case "file_exists": return runFileExists(check);
    case "json_path": return runJsonPath(check);
    case "score_at_least": return runScoreAtLeast(check);
    default: return { pass: false, evidence: `non-deterministic or unknown kind '${check?.kind}' — needs judgment` };
  }
}

// ---- subcommands -----------------------------------------------------------

function cmdClassify(args) {
  const profiles = loadJson(PROFILES_PATH);
  const result = classifyGoal(args.goal, profiles);
  console.log(JSON.stringify(result, null, 2));
}

function cmdGround(args) {
  const profilesCfg = loadJson(PROFILES_PATH);
  const profileId = args.profile || classifyGoal(args.goal, profilesCfg).profile;
  const profile = profilesCfg.profiles[profileId];
  if (!profile) { console.error(`Unknown profile '${profileId}'`); process.exit(2); }

  // Scaffold: list repo ground sources that actually exist, so the agent grounds in real files.
  const repoSources = (profile.ground_sources_repo || []).map((ref) => {
    const bare = ref.split(" (")[0];
    const exists = bare.includes("*") ? expandGlobs([bare]).length > 0 : existsSync(join(REPO_ROOT, bare));
    return { ref, exists };
  });

  const rubric = {
    schemaVersion: 1,
    goal: args.goal,
    profile: profileId,
    locked: false,
    created: new Date().toISOString(),
    gate: profile.gate,
    web_allowlist: profile.ground_sources_web_allowlist || [],
    repo_ground_sources: repoSources,
    criteria: [
      {
        id: "c1",
        statement: "TODO: replace with a sourced, checkable criterion",
        type: "deterministic",
        check: { kind: "command", run: "node evals/health-check.mjs", expectInStdout: "" },
        source: { kind: "repo", ref: "evals/health-check.mjs", note: "deterministic gate" },
        status: "active",
      },
    ],
    instructions: "Agent: fill criteria from repo_ground_sources + (allowlisted) web sources. Every criterion needs a cited source and a runnable check.kind. Mark unsourced criteria status:'unverifiable' and escalate. Then `validate`, then set locked:true.",
  };

  if (args.run) {
    const runDir = join(RUNS_DIR, args.run);
    mkdirSync(runDir, { recursive: true });
    const out = join(runDir, "rubric.json");
    writeFileSync(out, JSON.stringify(rubric, null, 2));
    console.log(`Wrote rubric scaffold: ${relative(REPO_ROOT, out)}`);
  } else {
    console.log(JSON.stringify(rubric, null, 2));
  }
}

function cmdValidate(args) {
  const rubric = loadJson(join(REPO_ROOT, args.rubric.startsWith("/") ? relative(REPO_ROOT, args.rubric) : args.rubric));
  const result = validateRubric(rubric);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exit(1);
}

function resolveRubricPath(p) {
  if (existsSync(p)) return p;
  const fromRepo = join(REPO_ROOT, p);
  if (existsSync(fromRepo)) return fromRepo;
  const fromLoop = join(LOOP_DIR, p);
  if (existsSync(fromLoop)) return fromLoop;
  throw new Error(`rubric not found: ${p}`);
}

function cmdVerify(args) {
  const rubric = loadJson(resolveRubricPath(args.rubric));
  const validation = validateRubric(rubric);
  if (!validation.valid) {
    console.error("Rubric failed validation — cannot verify against an ungrounded gate:");
    console.error(validation.errors.map((e) => ` - ${e}`).join("\n"));
    process.exit(1);
  }
  if (!rubric.locked) {
    console.error("Rubric is not locked. Lock it (locked:true) after grounding before verifying.");
    process.exit(1);
  }

  const results = [];
  for (const c of rubric.criteria) {
    if (c.status === "unverifiable") {
      results.push({ id: c.id, status: "unverifiable", pass: null, evidence: "escalated to user; excluded from gate", source: c.source });
      continue;
    }
    if (!DETERMINISTIC_CHECK_KINDS.has(c.check?.kind)) {
      results.push({ id: c.id, status: "pending-judge", pass: null, evidence: "requires LLM/human judgment against sourced statement", source: c.source });
      continue;
    }
    const r = executeCheck(c.check);
    results.push({ id: c.id, statement: c.statement, pass: r.pass, evidence: r.evidence, source: c.source, detail: r.detail });
  }

  const deterministic = results.filter((r) => r.pass !== null && r.status !== "unverifiable" && r.status !== "pending-judge");
  const failed = deterministic.filter((r) => r.pass === false);
  const pendingJudge = results.filter((r) => r.status === "pending-judge");
  const unverifiable = results.filter((r) => r.status === "unverifiable");
  const green = failed.length === 0;

  const report = {
    goal: rubric.goal,
    profile: rubric.profile,
    gate_kind: rubric.gate?.kind,
    green_deterministic: green,
    summary: {
      deterministic_total: deterministic.length,
      deterministic_passed: deterministic.length - failed.length,
      pending_judge: pendingJudge.length,
      unverifiable: unverifiable.length,
    },
    criteria: results,
    note: green
      ? (pendingJudge.length ? "Deterministic checks pass. Judge criteria still need an LLM/human verdict against their sourced statements." : "All deterministic checks pass.")
      : "Deterministic gate RED — do not claim success.",
  };

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Gate (${report.gate_kind}) deterministic: ${green ? "GREEN" : "RED"}`);
    for (const r of results) {
      const mark = r.pass === true ? "PASS" : r.pass === false ? "FAIL" : r.status.toUpperCase();
      console.log(` [${mark}] ${r.id} — ${r.evidence}`);
    }
    console.log(report.note);
  }
  if (!green) process.exit(1);
}

function cmdStart(args) {
  const profilesCfg = loadJson(PROFILES_PATH);
  const profileId = args.profile || classifyGoal(args.goal, profilesCfg).profile;
  const date = new Date().toISOString().slice(0, 10);
  const id = `${date}-${slugify(args.goal)}`;
  const runDir = join(RUNS_DIR, id);
  mkdirSync(runDir, { recursive: true });
  const meta = { id, goal: args.goal, profile: profileId, created: new Date().toISOString(), status: "open" };
  writeFileSync(join(runDir, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(JSON.stringify({ run: id, dir: relative(REPO_ROOT, runDir), profile: profileId }, null, 2));
}

function cmdRecord(args) {
  const runDir = join(RUNS_DIR, args.run);
  if (!existsSync(runDir)) { console.error(`Unknown run '${args.run}'. Run 'start' first.`); process.exit(2); }
  const turn = loadJson(resolveRubricPath(args.turn));
  const entry = { ts: new Date().toISOString(), ...turn };
  appendFileSync(join(runDir, "turns.jsonl"), JSON.stringify(entry) + "\n");
  console.log(`Recorded turn into ${relative(REPO_ROOT, join(runDir, "turns.jsonl"))}`);
}

function cmdStatus(args) {
  const runDir = join(RUNS_DIR, args.run);
  if (!existsSync(runDir)) { console.error(`Unknown run '${args.run}'.`); process.exit(2); }
  const meta = loadJson(join(runDir, "meta.json"));
  const turnsPath = join(runDir, "turns.jsonl");
  const turns = existsSync(turnsPath)
    ? readFileSync(turnsPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
  const last = turns[turns.length - 1] || {};
  const plateau = checkPlateau({
    failingCriteria: last.failingCriteria ?? 0,
    openCandidates: last.openCandidates ?? 0,
    lastTurnMeasurableGain: last.measurableGain ?? false,
  });
  console.log(JSON.stringify({ meta, turns: turns.length, last_phase: last.phase || null, plateau }, null, 2));
}

// ---- dispatch --------------------------------------------------------------

const sub = process.argv[2];
const args = parseArgs(process.argv);

// Portability: when invoked from a globally installed engine, target the user's
// workspace. Runs persist under <workspace>/.jarvis/loop-runs so they travel with
// the project instead of polluting the shared engine install.
const repoRootArg = args["repo-root"] || process.env.JIL_REPO_ROOT;
if (repoRootArg && typeof repoRootArg === "string") {
  REPO_ROOT = resolve(repoRootArg);
  RUNS_DIR = join(REPO_ROOT, ".jarvis", "loop-runs");
}

const handlers = {
  classify: cmdClassify,
  ground: cmdGround,
  validate: cmdValidate,
  verify: cmdVerify,
  start: cmdStart,
  record: cmdRecord,
  status: cmdStatus,
};

if (!sub || !handlers[sub]) {
  console.error("Usage: node evals/loop/cli.mjs <classify|ground|validate|verify|start|record|status> [--flags]");
  process.exit(2);
}
handlers[sub](args);
