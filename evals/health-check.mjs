#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SCENARIOS_DIR = join(__dirname, "scenarios");
const MODES_PATH = join(__dirname, "harness-modes.json");

const VALIDATOR_TYPES = new Set([
  "file_exists",
  "json_valid",
  "file_contains",
  "transcript_contains",
  "tool_invoked",
  "tool_input_contains",
  "tool_count",
  "tool_order",
  "regex_count",
  "artifact_count",
  "json_path_exists",
  "figma_created_node_ids",
  "command_succeeded",
  "mode_policy",
]);

const REQUIRED_SCENARIO_FIELDS = [
  "id",
  "title",
  "category",
  "harness_mode",
  "prompt",
  "expected_specialists",
  "expected_artifacts",
  "success_criteria",
  "max_tool_calls",
  "max_tokens",
];

export function runHealthCheck({ repoRoot = REPO_ROOT } = {}) {
  const errors = [];
  const warnings = [];
  const scenariosDir = join(repoRoot, "evals/scenarios");
  const modesPath = join(repoRoot, "evals/harness-modes.json");
  const modes = readJson(modesPath, errors);
  const modeNames = new Set(Object.keys(modes || {}));

  if (!existsSync(join(repoRoot, "evals/lib/harness.mjs"))) errors.push("Missing evals/lib/harness.mjs.");
  if (!existsSync(join(repoRoot, "evals/tests/harness.test.mjs"))) errors.push("Missing evals/tests/harness.test.mjs.");
  if (!existsSync(modesPath)) errors.push("Missing evals/harness-modes.json.");
  const isFullRepository = existsSync(join(repoRoot, "AGENTS.md")) || existsSync(join(repoRoot, ".github/agents"));
  if (isFullRepository) {
    for (const relPath of [
      "LICENSE",
      "README.md",
      "CODE_OF_CONDUCT.md",
      "CONTRIBUTING.md",
      "GOVERNANCE.md",
      "SECURITY.md",
      "SUPPORT.md",
      "THIRD_PARTY_NOTICES.md",
      ".github/workflows/ci.yml",
      "evals/check-links.mjs",
    ]) {
      if (!existsSync(join(repoRoot, relPath))) errors.push(`Missing public-readiness file '${relPath}'.`);
    }
  }

  for (const file of readdirSync(scenariosDir).filter((name) => name.endsWith(".json")).sort()) {
    const fullPath = join(scenariosDir, file);
    const scenario = readJson(fullPath, errors);
    if (!scenario) continue;
    for (const field of REQUIRED_SCENARIO_FIELDS) {
      if (!(field in scenario)) errors.push(`${file}: missing required field '${field}'.`);
    }
    if (scenario.harness_mode && !modeNames.has(scenario.harness_mode)) {
      errors.push(`${file}: unknown harness_mode '${scenario.harness_mode}'.`);
    }
    if (!Array.isArray(scenario.success_criteria) || scenario.success_criteria.length === 0) {
      errors.push(`${file}: success_criteria must be a non-empty array.`);
    }
    if (!Array.isArray(scenario.expected_specialists)) {
      errors.push(`${file}: expected_specialists must be an array.`);
    }
    for (const validator of scenario.deterministic_validators || []) {
      if (!VALIDATOR_TYPES.has(validator.type)) errors.push(`${file}: unknown validator type '${validator.type}'.`);
      if (!validator.description) warnings.push(`${file}: validator '${validator.type}' should include a description.`);
    }
  }

  const staleFiles = [
    ".github/agents",
    ".github/skills/memory",
    "evals/scenarios",
    "evals/README.md",
  ];
  const stalePattern = /decisions-active\.md|last-session\.md|three-tier|hot \/ warm \/ cold|hot\/warm\/cold/i;
  for (const relPath of staleFiles) {
    scanTextFiles(join(repoRoot, relPath), (file, text) => {
      if (stalePattern.test(text)) errors.push(`${relativePath(repoRoot, file)}: stale memory schema reference.`);
    });
  }

  // Public-core neutrality gate. Terms are assembled so this guard does not
  // trigger itself. Local project artifacts, personal skills, dependency
  // lockfiles, and captured eval runs are intentionally outside this scan.
  const restrictedTerms = [
    "Micro" + "soft",
    "Fab" + "ric",
    "Az" + "ure",
    "Power" + " BI",
    "One" + "Lake",
    "Flu" + "ent",
    "Seg" + "oe UI",
    "Nex" + "us",
    "Work" + "IQ",
    "C" + "opilot",
    "gim" + "-home",
    "ms" + "data",
    "open" + "-design",
    "design" + "-jarvis-create",
  ];
  const restrictedPattern = new RegExp(`\\b(?:${restrictedTerms.map(escapeRegex).join("|")})\\b`, "i");
  const neutralityRoots = [
    "AGENTS.md",
    "README.md",
    "ARCHITECTURE.md",
    "CHANGELOG.md",
    "CODE_OF_CONDUCT.md",
    "CONTRIBUTING.md",
    "GOVERNANCE.md",
    "SECURITY.md",
    "SUPPORT.md",
    "THIRD_PARTY_NOTICES.md",
    "introduction.html",
    ".github/agents",
    ".github/skills",
    ".github/prompts",
    ".github/ISSUE_TEMPLATE",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/workflows",
    ".github/agent-instructions.md",
    ".vscode",
    "docs",
    "projects/_starters",
    "scripts",
    "evals/scenarios",
    "evals/loop/profiles.json",
    "extensions/design-jarvis-pack/src",
    "extensions/design-jarvis-pack/scripts",
    "extensions/design-jarvis-pack/media",
    "extensions/design-jarvis-pack/assets",
    "extensions/design-jarvis-pack/skills",
    "extensions/design-jarvis-pack/skill-packs",
    "extensions/design-jarvis-pack/README.md",
    "extensions/design-jarvis-pack/GETTING-STARTED.md",
    "extensions/design-jarvis-pack/TEAM-SETUP.md",
    "extensions/design-jarvis-pack/THIRD_PARTY_NOTICES.md",
    "extensions/design-jarvis-pack/package.json",
  ];
  for (const relPath of neutralityRoots) {
    scanTextFiles(join(repoRoot, relPath), (file, text) => {
      const match = text.match(restrictedPattern);
      if (match) errors.push(`${relativePath(repoRoot, file)}: public core contains restricted vendor term '${match[0]}'.`);
    });
  }

  for (const relPath of [
    `.github/skills/${"fab" + "ric-screen"}`,
    `projects/_starters/${"fab" + "ric-tokens.css"}`,
    "projects/_starters/notebook-foundation",
    "extensions/design-jarvis-pack/Install Design Jarvis.command",
    "extensions/design-jarvis-pack/src/createCanvas.js",
    "extensions/design-jarvis-pack/assets/create-runtime.tgz",
  ]) {
    if (existsSync(join(repoRoot, relPath))) errors.push(`${relPath}: deprecated vendor-specific path must not exist.`);
  }

  // Loop engine (JIL) config lint — the loop's policies/profiles must stay valid
  // and shippable so /loop-goal works in a set-up workspace. Skip when the loop
  // dir is absent (e.g. minimal harness fixtures) — presence is guarded by the
  // loop run rubric and loop.test.mjs.
  if (existsSync(join(repoRoot, "evals/loop"))) {
    const loopPolicies = readJson(join(repoRoot, "evals/loop/policies.json"), errors);
    if (loopPolicies) {
      for (const id of ["grounding_policy", "loop_contract", "plateau_policy", "human_gate_policy"]) {
        if (!loopPolicies.policies || !loopPolicies.policies[id]) errors.push(`evals/loop/policies.json: missing policy '${id}'.`);
      }
    }
    const loopProfiles = readJson(join(repoRoot, "evals/loop/profiles.json"), errors);
    if (loopProfiles) {
      for (const [id, profile] of Object.entries(loopProfiles.profiles || {})) {
        if (!profile.gate) errors.push(`evals/loop/profiles.json: profile '${id}' missing gate.`);
        if (!profile.plateau_when) errors.push(`evals/loop/profiles.json: profile '${id}' missing plateau_when.`);
      }
    }
  }

  return {
    pass: errors.length === 0,
    errors,
    warnings,
    checked: {
      scenarios: existsSync(scenariosDir) ? readdirSync(scenariosDir).filter((name) => name.endsWith(".json")).length : 0,
      modes: modeNames.size,
    },
  };
}

function readJson(path, errors) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${relativePath(REPO_ROOT, path)}: ${error.message}`);
    return null;
  }
}

function scanTextFiles(path, visit) {
  if (!existsSync(path)) return;
  const skippedDirectories = new Set([".git", ".jarvis", "dist", "node_modules", "runs"]);
  const stack = [path];
  while (stack.length) {
    const current = stack.pop();
    const stat = existsSync(current) ? readdirOrFile(current) : null;
    if (!stat) continue;
    if (stat.type === "dir") {
      if (skippedDirectories.has(basename(current))) continue;
      for (const child of stat.children) stack.push(join(current, child));
    } else if (/\.(md|json|mjs|js|ts|tsx|css|html|yml|yaml|txt)$/.test(current)) {
      visit(current, readFileSync(current, "utf8"));
    }
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readdirOrFile(path) {
  try {
    const children = readdirSync(path);
    return { type: "dir", children };
  } catch {
    return { type: "file" };
  }
}

function relativePath(root, file) {
  return file.startsWith(root) ? file.slice(root.length + 1) : file;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = runHealthCheck();
  if (result.warnings.length) {
    console.warn("Warnings:");
    for (const warning of result.warnings) console.warn(`- ${warning}`);
  }
  if (!result.pass) {
    console.error("Harness health check failed:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Harness health check passed (${result.checked.scenarios} scenarios, ${result.checked.modes} modes).`);
}
