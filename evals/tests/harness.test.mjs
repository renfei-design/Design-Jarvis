import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildTrajectory,
  computeHarnessScore,
  parseTranscriptText,
  runDeterministicValidators,
} from "../lib/harness.mjs";
import { runHealthCheck } from "../health-check.mjs";
import { collectSkillUpdateCandidates, writeSkillUpdateCandidates } from "../propose-skill-updates.mjs";

test("parseTranscriptText extracts tools, specialists, tokens, and transcript", () => {
  const raw = [
    JSON.stringify({ timestamp: "2026-05-03T00:00:00Z", type: "message", role: "user", content: "Build a frame" }),
    JSON.stringify({ timestamp: "2026-05-03T00:00:01Z", type: "tool_call", toolName: "task", input: { agent_type: "Designer" } }),
    JSON.stringify({ timestamp: "2026-05-03T00:00:02Z", type: "tool_call", toolName: "skill", input: { skill: "figma-use" } }),
    JSON.stringify({ timestamp: "2026-05-03T00:00:03Z", type: "tool_call", toolName: "figma-use_figma", input: { description: "Create frame" } }),
    JSON.stringify({ timestamp: "2026-05-03T00:00:04Z", usage: { input_tokens: 120, output_tokens: 30 }, type: "message", content: "Done" }),
  ].join("\n");

  const metrics = parseTranscriptText(raw);

  assert.equal(metrics.tool_call_count, 3);
  assert.equal(metrics.tool_breakdown.skill, 1);
  assert.equal(metrics.tool_breakdown["figma-use_figma"], 1);
  assert.deepEqual(metrics.specialists_invoked, ["Designer"]);
  assert.equal(metrics.tokens_input, 120);
  assert.equal(metrics.tokens_output, 30);
  assert.equal(metrics.wall_clock_seconds, 4);
  assert.match(metrics.transcript, /figma-use/);
});

test("deterministic validators check files, JSON, transcript, and tool order", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "jarvis-eval-"));
  try {
    const projectDir = join(repoRoot, ".jarvis/memory/projects/demo");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "decisions.md"), [
      "# Decisions",
      "### D1: Settings navigation",
      "**Status:** Active",
      "**Decision:** Use a left sidebar.",
      "**Rationale:** Scales better than tabs.",
    ].join("\n"));
    writeFileSync(join(projectDir, "manifest.json"), JSON.stringify({ schemaVersion: 1, slug: "demo" }));

    const metrics = parseTranscriptText([
      JSON.stringify({ type: "tool_call", toolName: "skill", input: { skill: "figma-use" } }),
      JSON.stringify({ type: "tool_call", toolName: "figma-use_figma", input: { description: "Create frame" } }),
      JSON.stringify({ type: "message", content: "Updated .jarvis/memory/projects/demo/decisions.md" }),
    ].join("\n"));
    const scenario = {
      deterministic_validators: [
        { type: "file_contains", pathPattern: ".jarvis/memory/projects/*/decisions.md", pattern: "D\\d+[\\s\\S]*Status[\\s\\S]*Decision[\\s\\S]*Rationale" },
        { type: "json_valid", pathPattern: ".jarvis/memory/projects/*/manifest.json" },
        { type: "transcript_contains", pattern: "decisions\\.md" },
        { type: "tool_input_contains", pattern: "figma-use" },
        { type: "tool_order", beforeTool: "skill", beforeInputPattern: "figma-use", afterTool: "figma-use_figma" },
      ],
    };

    const results = runDeterministicValidators(scenario, metrics, { repoRoot });

    assert.equal(results.length, 5);
    assert.deepEqual(results.map((result) => result.pass), [true, true, true, true, true]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("mode policies and broader artifact validators are enforced", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "jarvis-policy-"));
  try {
    const artifactDir = join(repoRoot, "projects/demo/prototypes/example");
    mkdirSync(artifactDir, { recursive: true });
    mkdirSync(join(repoRoot, "evals"), { recursive: true });
    writeFileSync(join(repoRoot, "evals/harness-modes.json"), JSON.stringify({
      "prototype-build": {
        requireAnyToolPatterns: ["bash", "runInTerminal", "generate_figma_design", "figma-generate_figma_design"],
      },
    }));
    writeFileSync(join(artifactDir, "index.html"), "<main>Hello</main>");
    writeFileSync(join(repoRoot, "artifact.json"), JSON.stringify({ figma: [{ pages: [{ nodeId: "1:2" }] }] }));

    const metrics = parseTranscriptText([
      JSON.stringify({ type: "tool_call", toolName: "bash", input: { command: "npm run build" } }),
      JSON.stringify({ type: "tool_call", toolName: "figma-generate_figma_design", input: { url: "http://localhost:5173" } }),
      JSON.stringify({ type: "message", content: "createdNodeIds: [\"1:2\"] <exited with exit code 0> build passed" }),
    ].join("\n"));
    const scenario = {
      harness_mode: "prototype-build",
      deterministic_validators: [
        { type: "artifact_count", pathPattern: "projects/**/prototypes/**/*.html", min: 1 },
        { type: "json_path_exists", path: "artifact.json", jsonPath: "figma.0.pages.0.nodeId" },
        { type: "figma_created_node_ids" },
        { type: "command_succeeded", commandPattern: "npm" },
        { type: "tool_count", toolPattern: "figma", min: 1, max: 2 },
        { type: "regex_count", pattern: "build", min: 1 },
      ],
    };

    const results = runDeterministicValidators(scenario, metrics, { repoRoot });

    assert.equal(results.length, 7);
    assert.deepEqual(results.map((result) => result.pass), [true, true, true, true, true, true, true]);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("computeHarnessScore combines correctness, discipline, and efficiency", () => {
  const scenario = {
    expected_specialists: ["Designer", "Design Lead"],
    max_tool_calls: 10,
    max_tokens: 1000,
  };
  const grade = {
    verdict: "fail",
    criteria: [{ pass: true }, { pass: false }, { pass: true }],
  };
  const metrics = {
    specialists_invoked: ["Designer"],
    tool_call_count: 5,
    tokens_input: 300,
    tokens_output: 200,
  };
  const validators = [{ pass: true }, { pass: false }];

  const score = computeHarnessScore(scenario, grade, metrics, validators);

  assert.equal(score.components.correctness, 0.667);
  assert.equal(score.components.specialist_alignment, 0.5);
  assert.equal(score.components.deterministic_validators, 0.5);
  assert.equal(score.components.tool_discipline, 0.5);
  assert.equal(score.components.efficiency, 1);
  assert.equal(score.total, 0.7);
});

test("buildTrajectory emits normalized rollout data without transcript payload", () => {
  const scenario = {
    id: "demo",
    prompt: "Do the thing",
    expected_specialists: ["Design Ops"],
    expected_artifacts: ["decisions.md"],
    max_tool_calls: 5,
    max_tokens: 1000,
  };
  const metrics = parseTranscriptText([
    JSON.stringify({ timestamp: "2026-05-03T00:00:00Z", type: "message", role: "user", content: "Do the thing" }),
    JSON.stringify({ timestamp: "2026-05-03T00:00:01Z", type: "tool_call", toolName: "task", input: { agent_type: "Design Ops" } }),
  ].join("\n"));

  const trajectory = buildTrajectory({ scenario, sessionId: "abc123", logPath: "/tmp/abc123.jsonl", metrics });

  assert.equal(trajectory.schemaVersion, 1);
  assert.equal(trajectory.scenario_id, "demo");
  assert.equal(trajectory.metrics.transcript, undefined);
  assert.equal(trajectory.turns.length, 2);
  assert.equal(trajectory.turns[1].toolName, "task");
});

test("memory persistence scenario targets Core + Archive schema", () => {
  const scenario = JSON.parse(readFileSync(new URL("../scenarios/06-memory-persistence.json", import.meta.url), "utf8"));

  assert.deepEqual(
    scenario.expected_artifacts,
    ["decision-entry-with-D-number", "updated-decisions-md", "updated-memory-md-or-manifest-json"],
  );
  assert(scenario.success_criteria.some((criterion) => criterion.includes("decisions.md")));
  assert(!scenario.success_criteria.some((criterion) => criterion.includes("decisions-active.md")));
  assert(scenario.deterministic_validators.some((validator) => validator.type === "json_valid"));
});

test("health check validates scenario modes and stale schema references", () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "jarvis-health-"));
  try {
    mkdirSync(join(repoRoot, "evals/scenarios"), { recursive: true });
    mkdirSync(join(repoRoot, "evals/lib"), { recursive: true });
    mkdirSync(join(repoRoot, "evals/tests"), { recursive: true });
    writeFileSync(join(repoRoot, "evals/lib/harness.mjs"), "");
    writeFileSync(join(repoRoot, "evals/tests/harness.test.mjs"), "");
    writeFileSync(join(repoRoot, "evals/harness-modes.json"), JSON.stringify({ research: { denyToolPatterns: [] } }));
    writeFileSync(join(repoRoot, "evals/scenarios/01-demo.json"), JSON.stringify({
      id: "01-demo",
      title: "Demo",
      category: "research",
      harness_mode: "research",
      prompt: "Research something",
      expected_specialists: ["UX Researcher"],
      expected_artifacts: ["report"],
      success_criteria: ["Does the thing."],
      deterministic_validators: [{ type: "tool_invoked", toolName: "web_fetch", description: "Uses web." }],
      max_tool_calls: 10,
      max_tokens: 1000,
    }));

    const result = runHealthCheck({ repoRoot });

    assert.equal(result.pass, true);
    assert.equal(result.checked.scenarios, 1);
    assert.equal(result.checked.modes, 1);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("skill update candidates are generated for failed eval results", () => {
  const root = mkdtempSync(join(tmpdir(), "jarvis-candidates-"));
  try {
    const resultsDir = join(root, "results/2026-05-03");
    const outDir = join(root, "candidates");
    mkdirSync(resultsDir, { recursive: true });
    writeFileSync(join(resultsDir, "06-memory-persistence.json"), JSON.stringify({
      scenario_id: "06-memory-persistence",
      session_id: "abc",
      verdict: "fail",
      harness_score: { total: 0.4 },
      criteria: [{ criterion: "Writes decisions.md", pass: false, evidence: "Not found.", severity: "blocking" }],
      deterministic_validators: [{ type: "file_contains", description: "Decision file updated", pass: false, evidence: "No match." }],
    }));

    const candidates = collectSkillUpdateCandidates({ resultsDir: join(root, "results") });
    const paths = writeSkillUpdateCandidates(candidates, { outDir, date: "2026-05-03" });

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].recommended_target, ".github/skills/memory/SKILL.md");
    assert.equal(paths.length, 1);
    assert.match(readFileSync(paths[0], "utf8"), /needs-human-review/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
