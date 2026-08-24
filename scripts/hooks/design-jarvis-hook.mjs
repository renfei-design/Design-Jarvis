#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const mode = process.argv[2];
const repoRoot = process.cwd();
const rawInput = readStdin();
const payload = parseJson(rawInput) || {};
const toolName = String(payload.toolName || payload.tool_name || "");
const toolArgs = normalizeToolArgs(payload.toolArgs ?? payload.tool_input ?? payload.tool_args ?? {});
const toolResult = payload.toolResult ?? payload.tool_result ?? payload.result ?? {};
const allInputText = stringifyForSearch({ payload, toolArgs, toolResult });

try {
  switch (mode) {
    case "guard-paths":
      guardPaths();
      break;
    case "guard-shell-policy":
      guardShellPolicy();
      break;
    case "guard-figma-use":
      guardFigmaUse();
      break;
    case "validate-figma-result":
      validateFigmaResult();
      break;
    case "validate-memory":
      validateMemory();
      break;
    case "validate-customizations":
      validateCustomizations();
      break;
    case "subagent-context":
      subagentContext();
      break;
    case "final-gate":
      finalGate();
      break;
    default:
      warn(`Unknown Design Jarvis hook mode: ${mode || "<missing>"}`);
  }
} catch (error) {
  block(`Design Jarvis hook failed: ${error.message}`);
}

function guardPaths() {
  if (!mentionsStarter(allInputText)) return;
  if (isReadOnlyTool(toolName)) return;

  if (isShellTool(toolName)) {
    const command = getCommand(toolArgs);
    if (isSafeStarterShellUse(command)) return;
    block("projects/_starters is read-only. Copy starter files into projects/<slug>/ before editing.");
  }

  if (isMutatingTool(toolName)) {
    block("projects/_starters is read-only. Use it only as a source template and write project artifacts under projects/<slug>/.");
  }
}

function guardShellPolicy() {
  if (!isShellTool(toolName)) return;
  const command = getCommand(toolArgs);
  if (!command) return;

  const denyPatterns = [
    [/\$\{[^}]+@P\}/, "Shell parameter transformation that executes expanded text is blocked."],
    [/\$\{![^}]+\}/, "Indirect shell expansion that hides command construction is blocked."],
    [/(^|[;&|\s])eval\s+/, "Dynamic shell evaluation is not allowed in agent sessions."],
    [/\bp[k]ill\b|\bkill[a]ll\b/, "Use kill <PID> instead of name-based process termination."],
    [/\bgit\s+reset\s+--hard\b/, "git reset --hard is destructive and requires explicit user approval outside hooks."],
    [/\bgit\s+clean\s+-[^\n]*[fdx]/, "git clean with force/delete flags is destructive and blocked."],
    [/\bgit\s+push\b[^\n]*(--force|-f)\b/, "Force push is blocked unless explicitly approved outside hooks."],
    [/\brm\s+-[^\n]*r[^\n]*f[^\n]*\s+(\/|~|\.|\.\/|\.\.\/|\*|\.\*)($|\s)/, "Broad recursive deletion targets are blocked."],
    // Block wiping a critical directory ROOT (e.g. `rm -rf .jarvis`, `rm -rf projects/`),
    // but allow recursive deletes of nested subpaths within them (e.g. a fixture or one project).
    [/\brm\s+-[^\n]*r[^\n]*f[^\n]*\s+(\.\/)?(projects|\.github|\.jarvis|scripts)\/?(\s|$)/, "Recursive deletion of a project-critical directory root is blocked."],
    [/\bchmod\s+-R\s+([0-7]{3,4}|a[+=]|ugo[+=])/, "Recursive chmod over broad paths is blocked."],
    [/\bchown\s+-R\b/, "Recursive chown is blocked."],
  ];

  for (const [pattern, reason] of denyPatterns) {
    if (pattern.test(command)) block(reason);
  }

  if (mentionsStarter(command) && shellCommandMutatesPath(command)) {
    block("Shell command appears to modify projects/_starters, which is read-only.");
  }
}

function guardFigmaUse() {
  if (!isUseFigmaTool(toolName)) return;
  const argsText = stringifyForSearch(toolArgs);
  const code = getFigmaCode(toolArgs);

  if (!/figma-use/i.test(argsText)) {
    block("use_figma calls must include skillNames: \"figma-use\" after loading the figma-use skill.");
  }

  const forbidden = [
    [/figma\.notify\s*\(/, "figma.notify() is not implemented in the use_figma runtime."],
    [/figma\.closePlugin\s*\(/, "Do not call figma.closePlugin(); the MCP runtime handles plugin closure."],
    [/\(\s*async\s*\(\s*\)\s*=>/, "Do not wrap use_figma code in an async IIFE; top-level await is supported."],
    [/(?<!Shared)(getPluginData|setPluginData)\s*\(/, "getPluginData/setPluginData are unsupported; use shared plugin data or returned node IDs."],
    [/figma\.currentPage\s*=/, "Use await figma.setCurrentPageAsync(page); assigning figma.currentPage throws in this runtime."],
    [/[{,]\s*[rgb]\s*:\s*(?:[3-9]\d|1\d\d|2\d\d)\b/, "Figma colors must use 0-1 RGB values, not 0-255 values."],
  ];

  for (const [pattern, reason] of forbidden) {
    if (pattern.test(code)) block(reason);
  }

  if (/(createText\s*\(|\.characters\s*=)/.test(code) && !/loadFontAsync\s*\(/.test(code)) {
    block("Text creation or text mutation must load the font first with await figma.loadFontAsync(...).");
  }
}

function validateFigmaResult() {
  if (!isUseFigmaTool(toolName)) return;
  const code = getFigmaCode(toolArgs);
  if (!figmaCodeLikelyWrites(code)) return;

  const resultText = stringifyForSearch(toolResult || payload);
  if (/(createdNodeIds|mutatedNodeIds|nodeIds|nodeId)/.test(resultText)) return;

  const reason = "Figma write completed without returned node IDs. Return createdNodeIds[] or mutatedNodeIds[] so Design Jarvis can verify the canvas change.";
  maybeBlockAfterTool(reason);
}

function validateMemory() {
  if (!/\.jarvis\/memory/.test(allInputText)) return;

  const memoryProjectsDir = join(repoRoot, ".jarvis", "memory", "projects");
  if (!existsSync(memoryProjectsDir)) return;

  const errors = [];
  const warnings = [];
  for (const project of safeReaddir(memoryProjectsDir)) {
    const dir = join(memoryProjectsDir, project);
    if (!safeStat(dir)?.isDirectory()) continue;

    for (const jsonFile of ["manifest.json", "artifacts.json"]) {
      const file = join(dir, jsonFile);
      if (!existsSync(file)) continue;
      try {
        JSON.parse(readFileSync(file, "utf8"));
      } catch (error) {
        errors.push(`${displayPath(file)} is invalid JSON: ${error.message}`);
      }
    }

    const memoryPath = join(dir, "memory.md");
    if (existsSync(memoryPath)) {
      const lines = readFileSync(memoryPath, "utf8").split("\n").length;
      if (lines > 150) warnings.push(`${displayPath(memoryPath)} has ${lines} lines; target hard max is 150.`);
    }

    const decisionsPath = join(dir, "decisions.md");
    if (existsSync(decisionsPath)) {
      const text = readFileSync(decisionsPath, "utf8");
      const entries = text.split(/^###\s+D\d+\b/m).slice(1);
      entries.forEach((entry, index) => {
        const missing = ["Status", "Decision", "Rationale"].filter((field) => !new RegExp(`\\*\\*${field}:\\*\\*|^${field}:`, "mi").test(entry));
        if (missing.length) warnings.push(`${displayPath(decisionsPath)} D-entry ${index + 1} is missing ${missing.join(", ")}.`);
      });
    }
  }

  if (errors.length) maybeBlockAfterTool(`Memory validation failed: ${errors.join("; ")}`);
  if (warnings.length) warn(`Design Jarvis memory warnings:\n- ${warnings.join("\n- ")}`);
}

function validateCustomizations() {
  const changed = changedCustomizationFiles();
  const mentionedCustomization = /(^|[\s"'])((\.github\/(agents|skills)|evals)\/|AGENTS\.md|\.github\/agent-instructions\.md)/.test(allInputText);
  if (!changed.length && !mentionedCustomization) return;

  const health = spawnSync("node", ["evals/health-check.mjs"], { cwd: repoRoot, encoding: "utf8" });
  if (health.status !== 0) {
    maybeBlockAfterTool(`Design Jarvis eval health check failed.\n${trimCommandOutput(health)}`);
  }

  const tests = spawnSync("node", ["--test", "evals/tests/*.test.mjs"], { cwd: repoRoot, encoding: "utf8", shell: true });
  if (tests.status !== 0) {
    maybeBlockAfterTool(`Design Jarvis eval tests failed.\n${trimCommandOutput(tests)}`);
  }
}

function subagentContext() {
  const agentName = String(payload.agentName || payload.agent_name || payload.agentDisplayName || payload.agent_display_name || "").toLowerCase();
  if (!agentName) return;

  const reminders = [];
  if (agentName.includes("designer")) {
    reminders.push("Load the task-specific skill before acting; load figma-use before any use_figma call; return created/mutated node IDs and screenshot evidence for Figma writes; write artifacts only under projects/<slug>/.");
  }
  if (agentName.includes("design lead")) {
    reminders.push("Return a structured verdict with blocker/serious issues explicit. Use max 2 review rounds before escalation to the user.");
  }
  if (agentName.includes("design ops")) {
    reminders.push("Use the Core + Archive memory schema. Keep manifest/artifacts JSON valid, decisions D-numbered, and memory.md compact.");
  }
  if (agentName.includes("front-end")) {
    reminders.push("Do not edit projects/_starters. Run build/tests where available and provide visual fidelity evidence before returning done.");
  }
  if (agentName.includes("research")) {
    reminders.push("Cite sources with URLs and access dates, distinguish observed facts from synthesis, and return citation verification.");
  }
  if (!reminders.length) return;

  writeJson({ additionalContext: `Design Jarvis hook reminder: ${reminders.join(" ")}` });
}

function finalGate() {
  const transcriptPath = payload.transcriptPath || payload.transcript_path;
  if (!transcriptPath || !existsSync(transcriptPath)) return;
  const text = readFileSync(transcriptPath, "utf8").slice(-60000);
  const appearsDesignJarvisDone = /Owners:|Review rounds:|Follow-ups:|Verified:/.test(text);
  if (!appearsDesignJarvisDone) return;

  const missing = [];
  for (const label of ["Owners:", "Review rounds:", "Verified:", "Follow-ups:"]) {
    if (!text.includes(label)) missing.push(label);
  }
  if (!missing.length) return;

  const reason = `Final Design Jarvis response may be missing required completion fields: ${missing.join(", ")}.`;
  if (process.env.DESIGN_JARVIS_STRICT_FINAL_GATE === "1") {
    writeJson({ decision: "block", reason, additionalContext: reason });
    process.exit(2);
  }
  warn(reason);
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function parseJson(value) {
  if (!value || typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeToolArgs(value) {
  if (typeof value === "string") return parseJson(value) || { value };
  return value && typeof value === "object" ? value : {};
}

function stringifyForSearch(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getCommand(args) {
  if (typeof args?.command === "string") return args.command;
  if (typeof args?.input === "string") return args.input;
  if (typeof args?.toolArgs?.command === "string") return args.toolArgs.command;
  const text = stringifyForSearch(args);
  const match = text.match(/"command"\s*:\s*"((?:\\.|[^"])*)"/);
  return match ? match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : text;
}

function getFigmaCode(args) {
  for (const key of ["code", "script", "javascript", "js"]) {
    if (typeof args?.[key] === "string") return args[key];
  }
  return stringifyForSearch(args);
}

function mentionsStarter(text) {
  return /projects\/_starters\b/.test(text);
}

function isReadOnlyTool(name) {
  return /^(read|search|grep|glob|view|fetch|figma\/get_|figma-get_|get_screenshot|get_metadata|get_design_context)/i.test(name);
}

function isShellTool(name) {
  return /(bash|shell|runinterminal|terminal)/i.test(name);
}

function isUseFigmaTool(name) {
  return /(use_figma|figma-use_figma|figma\/use_figma)/i.test(name);
}

function isMutatingTool(name) {
  return /(edit|write|create|update|delete|apply_patch|bash|shell|runinterminal|terminal|use_figma|generate_figma_design)/i.test(name);
}

function isSafeStarterShellUse(command) {
  const trimmed = command.trim();
  if (/^(ls|find|grep|rg|cat|head|tail|wc|sed\s+-n)\b/.test(trimmed)) return true;
  if (/^cp\s+(-R\s+|-r\s+)?projects\/_starters\//.test(trimmed) && !/>\s*projects\/_starters\//.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    const destination = parts[parts.length - 1] || "";
    return !destination.startsWith("projects/_starters/");
  }
  return false;
}

function shellCommandMutatesPath(command) {
  return /(^|[;&|\s])(rm|mv|touch|mkdir|chmod|chown|sed\s+-i|perl\s+-i|python\d?|node|npm|tee)\b/.test(command) || />\s*projects\/_starters\//.test(command);
}

function figmaCodeLikelyWrites(code) {
  return /(create\w*\s*\(|appendChild\s*\(|remove\s*\(|\.characters\s*=|\.fills\s*=|\.strokes\s*=|\.resize\s*\(|\.x\s*=|\.y\s*=|setBoundVariable|importVariableByKeyAsync)/.test(code);
}

function changedCustomizationFiles() {
  const result = spawnSync("git", ["diff", "--name-only", "--", ".github/agents", ".github/skills", ".github/agent-instructions.md", "AGENTS.md", "evals"], { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) return [];
  return result.stdout.split("\n").filter(Boolean);
}

function safeReaddir(path) {
  try {
    return readdirSync(path);
  } catch {
    return [];
  }
}

function safeStat(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function displayPath(path) {
  return path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
}

function trimCommandOutput(result) {
  return `${result.stdout || ""}${result.stderr || ""}`.trim().slice(0, 4000);
}

function writeJson(value) {
  process.stdout.write(JSON.stringify(value));
}

function block(reason) {
  writeJson({
    permissionDecision: "deny",
    permissionDecisionReason: reason,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    },
    decision: "block",
    reason,
    continue: false,
    stopReason: reason
  });
  process.exit(2);
}

function maybeBlockAfterTool(reason) {
  writeJson({
    decision: "block",
    reason,
    additionalContext: reason,
    systemMessage: reason
  });
  process.exit(2);
}

function warn(message) {
  process.stderr.write(`${message}\n`);
}
