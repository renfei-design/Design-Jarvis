import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyGoal,
  validateRubric,
  checkPlateau,
  checkRegression,
  readPath,
  slugify,
  globToRegExp,
  isAllowedSource,
} from "../loop/lib/core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const profiles = JSON.parse(readFileSync(join(__dirname, "..", "loop", "profiles.json"), "utf8"));
const policies = JSON.parse(readFileSync(join(__dirname, "..", "loop", "policies.json"), "utf8"));

test("config: policies has the four governing policies", () => {
  const ids = Object.keys(policies.policies);
  for (const id of ["grounding_policy", "loop_contract", "plateau_policy", "human_gate_policy"]) {
    assert.ok(ids.includes(id), `missing policy ${id}`);
  }
});

test("config: every profile has a gate and plateau condition", () => {
  for (const [id, p] of Object.entries(profiles.profiles)) {
    assert.ok(p.gate, `${id} missing gate`);
    assert.ok(p.plateau_when, `${id} missing plateau_when`);
  }
});

test("classifyGoal routes a self-improve goal", () => {
  const r = classifyGoal("the agent keeps failing this eval scenario, fix the regression", profiles);
  assert.equal(r.profile, "self-improve");
  assert.ok(r.confidence > 0);
});

test("classifyGoal routes a research goal", () => {
  const r = classifyGoal("how do competing products handle this — competitive benchmark", profiles);
  assert.equal(r.profile, "research");
});

test("classifyGoal falls back to fuzzy and flags ambiguity on no signal", () => {
  const r = classifyGoal("zxcvbnm qwerty", profiles);
  assert.equal(r.profile, "fuzzy");
  assert.equal(r.ambiguous, true);
});

test("validateRubric rejects a criterion with no cited source", () => {
  const rubric = {
    goal: "g", profile: "self-improve",
    criteria: [{ id: "c1", statement: "x", check: { kind: "command", run: "node x" } }],
  };
  const r = validateRubric(rubric);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /no cited source/.test(e)));
});

test("validateRubric accepts a sourced, checkable criterion", () => {
  const rubric = {
    goal: "g", profile: "self-improve",
    criteria: [{
      id: "c1", statement: "health check passes",
      check: { kind: "command", run: "node evals/health-check.mjs" },
      source: { kind: "repo", ref: "evals/health-check.mjs" }, status: "active",
    }],
  };
  const r = validateRubric(rubric);
  assert.equal(r.valid, true);
  assert.equal(r.deterministicCount, 1);
});

test("validateRubric allows unverifiable criteria but warns (escalation path)", () => {
  const rubric = {
    goal: "g", profile: "fuzzy",
    criteria: [
      { id: "c1", statement: "premium feel", status: "unverifiable" },
      { id: "c2", statement: "no raw hex", check: { kind: "grep_absent", pattern: "#", globs: ["x"] }, source: { ref: "AGENTS.md" }, status: "active" },
    ],
  };
  const r = validateRubric(rubric);
  assert.equal(r.valid, true);
  assert.ok(r.warnings.some((w) => /unverifiable/.test(w)));
});

test("checkPlateau is honest about remaining work", () => {
  assert.equal(checkPlateau({ failingCriteria: 1 }).plateau, false);
  assert.equal(checkPlateau({ failingCriteria: 0, openCandidates: 2 }).plateau, false);
  assert.equal(checkPlateau({ failingCriteria: 0, openCandidates: 0, lastTurnMeasurableGain: true }).plateau, false);
  assert.equal(checkPlateau({ failingCriteria: 0, openCandidates: 0, lastTurnMeasurableGain: false }).plateau, true);
});

test("checkRegression enforces the 2pp / 25% guards", () => {
  assert.equal(checkRegression({ score: 0.78, baselineScore: 0.81 }).ok, false);
  assert.equal(checkRegression({ score: 0.82, baselineScore: 0.81 }).ok, true);
  assert.equal(checkRegression({ tokens: 130, baselineTokens: 100 }).ok, false);
  assert.equal(checkRegression({ tokens: 120, baselineTokens: 100 }).ok, true);
});

test("readPath reads dotted paths", () => {
  assert.equal(readPath({ a: { b: { c: 5 } } }, "a.b.c"), 5);
  assert.equal(readPath({ a: 1 }, "a.b.c"), undefined);
});

test("slugify produces safe run ids", () => {
  assert.equal(slugify("Fix the Token-Binding Skill!"), "fix-the-token-binding-skill");
});

test("globToRegExp matches ** and *", () => {
  assert.ok(globToRegExp("projects/**/*.css").test("projects/a/b/x.css"));
  assert.ok(globToRegExp("evals/*.mjs").test("evals/run.mjs"));
  assert.equal(globToRegExp("evals/*.mjs").test("evals/lib/x.mjs"), false);
});

test("isAllowedSource enforces the domain allowlist", () => {
  assert.equal(isAllowedSource("https://www.w3.org/WAI/WCAG22/", ["w3.org"]), true);
  assert.equal(isAllowedSource("https://evil.example.com", ["w3.org", "developer.mozilla.org"]), false);
});
