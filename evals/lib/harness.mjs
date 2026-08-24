import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export function parseJsonl(raw) {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); }
      catch { return null; }
    })
    .filter(Boolean);
}

export function parseTranscriptText(raw) {
  const events = parseJsonl(raw);
  return extractMetrics(events);
}

export function parseTranscriptFile(logPath) {
  return parseTranscriptText(readFileSync(logPath, "utf8"));
}

export function extractMetrics(events) {
  let toolCallCount = 0;
  let tokensInput = 0;
  let tokensOutput = 0;
  let firstTs = null;
  let lastTs = null;
  const toolBreakdown = {};
  const specialistsInvoked = new Set();
  const transcriptText = [];
  const toolCalls = [];

  for (const [index, ev] of events.entries()) {
    const timestamp = getTimestamp(ev);
    if (timestamp) {
      const time = new Date(timestamp).getTime();
      if (!Number.isNaN(time)) {
        if (!firstTs || time < firstTs) firstTs = time;
        if (!lastTs || time > lastTs) lastTs = time;
      }
    }

    const toolName = getToolName(ev);
    if (toolName) {
      toolCallCount++;
      toolBreakdown[toolName] = (toolBreakdown[toolName] || 0) + 1;
      const input = getToolInput(ev);
      toolCalls.push({ index, timestamp, toolName, input });

      if (toolName === "agent" || toolName === "task" || toolName === "runSubagent") {
        const target = input?.agent_type || input?.name || input?.agent || input?.agentName;
        if (target) specialistsInvoked.add(target);
      }
    }

    const usage = ev.usage || ev.metadata?.usage || ev.data?.usage;
    if (usage) {
      tokensInput += usage.input_tokens || usage.inputTokens || usage.prompt_tokens || 0;
      tokensOutput += usage.output_tokens || usage.outputTokens || usage.completion_tokens || 0;
    }

    const text = getTranscriptText(ev);
    if (text) transcriptText.push(text.slice(0, 5000));
  }

  return {
    tool_call_count: toolCallCount,
    tool_breakdown: toolBreakdown,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    wall_clock_seconds: firstTs && lastTs ? Math.round((lastTs - firstTs) / 1000) : null,
    specialists_invoked: [...specialistsInvoked],
    tool_calls: toolCalls,
    transcript: transcriptText.join("\n").slice(0, 200000),
    events,
  };
}

export function buildTrajectory({ scenario, sessionId, logPath, metrics }) {
  return {
    schemaVersion: 1,
    scenario_id: scenario.id,
    session_id: sessionId,
    log_path: logPath,
    harness_mode: scenario.harness_mode || null,
    prompt: scenario.prompt,
    expected_specialists: scenario.expected_specialists || [],
    expected_artifacts: scenario.expected_artifacts || [],
    budgets: {
      max_tool_calls: scenario.max_tool_calls ?? null,
      max_tokens: scenario.max_tokens ?? null,
    },
    metrics: stripHeavyMetrics(metrics),
    turns: (metrics.events || []).map(normalizeEvent).filter(Boolean),
  };
}

export function stripHeavyMetrics(metrics) {
  const { transcript, events, ...rest } = metrics;
  return rest;
}

export function runDeterministicValidators(scenario, metrics, options = {}) {
  const validators = [
    ...modeValidatorsForScenario(scenario, options),
    ...(scenario.deterministic_validators || []),
  ];
  return validators.map((validator) => runValidator(validator, metrics, options));
}

export function computeHarnessScore(scenario, grade, metrics, validatorResults = []) {
  const criteria = Array.isArray(grade.criteria) ? grade.criteria : [];
  const correctnessScore = criteria.length
    ? criteria.filter((criterion) => criterion.pass).length / criteria.length
    : verdictScore(grade.verdict);

  const expected = scenario.expected_specialists || [];
  const invoked = metrics.specialists_invoked || [];
  const specialistScore = expected.length
    ? expected.filter((name) => invoked.includes(name)).length / expected.length
    : 1;
  const validatorScore = validatorResults.length
    ? validatorResults.filter((result) => result.pass).length / validatorResults.length
    : 1;
  const toolDisciplineScore = (specialistScore + validatorScore) / 2;

  const toolBudgetScore = scenario.max_tool_calls == null
    ? 1
    : budgetScore(metrics.tool_call_count || 0, scenario.max_tool_calls);
  const tokenBudgetScore = scenario.max_tokens == null
    ? 1
    : budgetScore((metrics.tokens_input || 0) + (metrics.tokens_output || 0), scenario.max_tokens);
  const efficiencyScore = (toolBudgetScore + tokenBudgetScore) / 2;

  const total = (0.6 * correctnessScore) + (0.2 * toolDisciplineScore) + (0.2 * efficiencyScore);
  return {
    total: round(total),
    components: {
      correctness: round(correctnessScore),
      tool_discipline: round(toolDisciplineScore),
      efficiency: round(efficiencyScore),
      specialist_alignment: round(specialistScore),
      deterministic_validators: round(validatorScore),
      tool_budget: round(toolBudgetScore),
      token_budget: round(tokenBudgetScore),
    },
  };
}

function runValidator(validator, metrics, options) {
  switch (validator.type) {
    case "file_exists":
      return withMatchedFiles(validator, options, (files) => ({
        pass: files.length > 0,
        evidence: files.length ? `Matched ${files.length} file(s).` : "No files matched.",
      }));
    case "json_valid":
      return withMatchedFiles(validator, options, (files) => {
        const invalid = [];
        for (const file of files) {
          try { JSON.parse(readFileSync(file, "utf8")); }
          catch (error) { invalid.push(`${toDisplayPath(file, options.repoRoot)}: ${error.message}`); }
        }
        return {
          pass: files.length > 0 && invalid.length === 0,
          evidence: invalid.length ? invalid.join("; ") : `Validated ${files.length} JSON file(s).`,
        };
      });
    case "file_contains":
      return withMatchedFiles(validator, options, (files) => {
        const regex = new RegExp(validator.pattern, validator.flags || "");
        const matched = files.filter((file) => regex.test(readFileSync(file, "utf8")));
        return {
          pass: matched.length > 0,
          evidence: matched.length
            ? `Matched ${matched.map((file) => toDisplayPath(file, options.repoRoot)).join(", ")}.`
            : `Pattern not found in ${files.length} file(s).`,
        };
      });
    case "transcript_contains": {
      const regex = new RegExp(validator.pattern, validator.flags || "");
      return validatorResult(validator, regex.test(metrics.transcript || ""), regex.test(metrics.transcript || "")
        ? "Pattern found in transcript."
        : "Pattern not found in transcript.");
    }
    case "tool_invoked": {
      const matched = (metrics.tool_calls || []).filter((call) => toolMatches(call, validator.toolName, validator.toolPattern));
      return validatorResult(validator, matched.length > 0, matched.length
        ? `Matched ${matched.length} tool call(s).`
        : "Tool call not found.");
    }
    case "tool_input_contains": {
      const regex = new RegExp(validator.pattern, validator.flags || "");
      const matched = (metrics.tool_calls || []).filter((call) => regex.test(JSON.stringify(call.input || {})));
      return validatorResult(validator, matched.length > 0, matched.length
        ? `Matched ${matched.length} tool input(s).`
        : "Pattern not found in tool inputs.");
    }
    case "tool_count":
      return validateToolCount(validator, metrics);
    case "tool_order":
      return validateToolOrder(validator, metrics);
    case "regex_count":
      return validateRegexCount(validator, metrics, options);
    case "artifact_count":
      return validateArtifactCount(validator, options);
    case "json_path_exists":
      return validateJsonPathExists(validator, options);
    case "figma_created_node_ids":
      return validateFigmaCreatedNodeIds(validator, metrics);
    case "command_succeeded":
      return validateCommandSucceeded(validator, metrics);
    case "mode_policy":
      return validateModePolicy(validator, metrics);
    default:
      return validatorResult(validator, false, `Unknown validator type: ${validator.type}`);
  }
}

export function modeValidatorsForScenario(scenario, options = {}) {
  if (!scenario.harness_mode) return [];
  const policies = options.harnessModes || loadHarnessModes(options);
  const policy = policies[scenario.harness_mode];
  if (!policy) {
    return [{
      type: "mode_policy",
      mode: scenario.harness_mode,
      description: `Unknown harness mode: ${scenario.harness_mode}`,
      _policyMissing: true,
    }];
  }
  return [{
    type: "mode_policy",
    mode: scenario.harness_mode,
    description: `Harness mode policy: ${scenario.harness_mode}`,
    ...policy,
  }];
}

function withMatchedFiles(validator, options, evaluate) {
  const files = resolveFiles(validator, options);
  const result = evaluate(files);
  return validatorResult(validator, result.pass, result.evidence);
}

function validateToolOrder(validator, metrics) {
  const calls = metrics.tool_calls || [];
  const beforeIndex = calls.findIndex((call) =>
    toolMatches(call, validator.beforeTool, validator.beforeToolPattern) &&
    inputMatches(call.input, validator.beforeInputPattern)
  );
  const afterIndex = calls.findIndex((call) =>
    toolMatches(call, validator.afterTool, validator.afterToolPattern) &&
    inputMatches(call.input, validator.afterInputPattern)
  );
  const pass = beforeIndex >= 0 && afterIndex >= 0 && beforeIndex < afterIndex;
  return validatorResult(validator, pass, pass
    ? `${validator.beforeTool || validator.beforeToolPattern} occurred before ${validator.afterTool || validator.afterToolPattern}.`
    : `Order not satisfied. beforeIndex=${beforeIndex}, afterIndex=${afterIndex}.`);
}

function validateToolCount(validator, metrics) {
  const calls = (metrics.tool_calls || []).filter((call) => toolMatches(call, validator.toolName, validator.toolPattern));
  const count = calls.length;
  const min = validator.min ?? 0;
  const max = validator.max ?? Infinity;
  return validatorResult(validator, count >= min && count <= max, `Matched ${count} tool call(s); expected ${min}..${max === Infinity ? "∞" : max}.`);
}

function validateRegexCount(validator, metrics, options) {
  const regex = new RegExp(validator.pattern, validator.flags || "g");
  const source = validator.source || "transcript";
  const text = source === "files"
    ? resolveFiles(validator, options).map((file) => readFileSync(file, "utf8")).join("\n")
    : metrics.transcript || "";
  const count = [...text.matchAll(regex)].length;
  const min = validator.min ?? 0;
  const max = validator.max ?? Infinity;
  return validatorResult(validator, count >= min && count <= max, `Matched ${count} occurrence(s); expected ${min}..${max === Infinity ? "∞" : max}.`);
}

function validateArtifactCount(validator, options) {
  const files = resolveFiles(validator, options);
  const min = validator.min ?? 1;
  const max = validator.max ?? Infinity;
  return validatorResult(validator, files.length >= min && files.length <= max, `Matched ${files.length} artifact(s); expected ${min}..${max === Infinity ? "∞" : max}.`);
}

function validateJsonPathExists(validator, options) {
  const files = resolveFiles(validator, options);
  const path = validator.jsonPath || "";
  const missing = [];
  for (const file of files) {
    try {
      const json = JSON.parse(readFileSync(file, "utf8"));
      if (!hasJsonPath(json, path)) missing.push(toDisplayPath(file, options.repoRoot));
    } catch (error) {
      missing.push(`${toDisplayPath(file, options.repoRoot)}: ${error.message}`);
    }
  }
  return validatorResult(validator, files.length > 0 && missing.length === 0, missing.length
    ? `Missing ${path}: ${missing.join(", ")}.`
    : `Found ${path} in ${files.length} file(s).`);
}

function validateFigmaCreatedNodeIds(validator, metrics) {
  const haystack = `${metrics.transcript || ""}\n${JSON.stringify(metrics.events || [])}`;
  const regex = validator.pattern
    ? new RegExp(validator.pattern)
    : /createdNodeIds|created_node_ids|created node ids|nodeIds|node IDs/i;
  const pass = regex.test(haystack);
  return validatorResult(validator, pass, pass
    ? "Created node IDs were found in transcript or tool events."
    : "No created node ID evidence found.");
}

function validateCommandSucceeded(validator, metrics) {
  const haystack = `${metrics.transcript || ""}\n${JSON.stringify(metrics.events || [])}`;
  const commandOk = validator.commandPattern ? new RegExp(validator.commandPattern).test(haystack) : true;
  const success = /exit[_ -]?code["':\s]+0|exited with exit code 0|\"status\"\s*:\s*\"success\"|\\bpassed\\b/i.test(haystack);
  return validatorResult(validator, commandOk && success, commandOk && success
    ? "Command success evidence found."
    : "Command success evidence not found.");
}

function validateModePolicy(validator, metrics) {
  if (validator._policyMissing) return validatorResult(validator, false, "Harness mode is not defined.");

  const calls = metrics.tool_calls || [];
  const denied = [];
  for (const pattern of validator.denyToolPatterns || []) {
    const regex = new RegExp(pattern);
    for (const call of calls) {
      if (regex.test(call.toolName)) denied.push(call.toolName);
    }
  }

  const missingRequiredTools = [];
  if (validator.requireAnyToolPatterns?.length) {
    const found = validator.requireAnyToolPatterns.some((pattern) => {
      const regex = new RegExp(pattern);
      return calls.some((call) => regex.test(call.toolName));
    });
    if (!found) missingRequiredTools.push(`one of ${validator.requireAnyToolPatterns.join(", ")}`);
  }

  const missingRequiredTranscript = [];
  for (const pattern of validator.requireTranscriptPatterns || []) {
    if (!new RegExp(pattern).test(metrics.transcript || "")) missingRequiredTranscript.push(pattern);
  }

  const pass = denied.length === 0 && missingRequiredTools.length === 0 && missingRequiredTranscript.length === 0;
  const failures = [
    denied.length ? `denied tools used: ${[...new Set(denied)].join(", ")}` : "",
    missingRequiredTools.length ? `missing tools: ${missingRequiredTools.join(", ")}` : "",
    missingRequiredTranscript.length ? `missing transcript patterns: ${missingRequiredTranscript.join(", ")}` : "",
  ].filter(Boolean);
  return validatorResult(validator, pass, pass ? "Policy satisfied." : failures.join("; "));
}

function validatorResult(validator, pass, evidence) {
  return {
    type: validator.type,
    description: validator.description || "",
    pass,
    evidence,
  };
}

function resolveFiles(validator, options) {
  const repoRoot = options.repoRoot || process.cwd();
  const pattern = validator.pathPattern || validator.path;
  if (!pattern) return [];
  if (!hasGlob(pattern)) {
    const fullPath = join(repoRoot, pattern);
    return existsSync(fullPath) ? [fullPath] : [];
  }
  return listFiles(repoRoot).filter((file) => globToRegex(pattern).test(toDisplayPath(file, repoRoot)));
}

function listFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      if (entry === ".git" || entry === "node_modules") continue;
      const path = join(dir, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) stack.push(path);
      else files.push(path);
    }
  }
  return files;
}

function hasGlob(pattern) {
  return /[*?]/.test(pattern);
}

function globToRegex(pattern) {
  let out = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    const next = pattern[i + 1];
    if (char === "*" && next === "*") {
      out += ".*";
      i++;
    } else if (char === "*") {
      out += "[^/]*";
    } else if (char === "?") {
      out += "[^/]";
    } else {
      out += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}$`);
}

function toDisplayPath(file, repoRoot = process.cwd()) {
  return relative(repoRoot, file).split(sep).join("/");
}

function toolMatches(call, exact, pattern) {
  if (exact && call.toolName === exact) return true;
  if (pattern && new RegExp(pattern).test(call.toolName)) return true;
  return false;
}

function inputMatches(input, pattern) {
  if (!pattern) return true;
  return new RegExp(pattern).test(JSON.stringify(input || {}));
}

function hasJsonPath(value, path) {
  if (!path) return true;
  const parts = path.split(".").filter(Boolean);
  return hasJsonPathParts(value, parts, 0);
}

function hasJsonPathParts(value, parts, index) {
  if (index >= parts.length) return value !== undefined;
  let current = value;
  const part = parts[index];
  if (Array.isArray(current)) {
    if (part === "[]") return current.some((item) => hasJsonPathParts(item, parts, index + 1));
    if (/^\d+$/.test(part)) return hasJsonPathParts(current[Number(part)], parts, index + 1);
    return current.some((item) => hasJsonPathParts(item, parts, index));
  }
  if (current && typeof current === "object" && part in current) {
    return hasJsonPathParts(current[part], parts, index + 1);
  }
  return false;
}

function loadHarnessModes(options) {
  const repoRoot = options.repoRoot || process.cwd();
  const path = options.harnessModesPath || join(repoRoot, "evals/harness-modes.json");
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8"));
}

function getTimestamp(ev) {
  return ev.timestamp || ev.time || ev.createdAt || ev.created_at;
}

function getToolName(ev) {
  // Current VS Code transcript: { type: "tool.execution_start", data: { toolName, arguments } }.
  // Count starts only so each tool call is tallied once (execution_complete is the paired close).
  if (ev.type === "tool.execution_start") return ev.data?.toolName || null;
  if (ev.type === "tool_call" || ev.toolName || ev.tool || ev.name === "tool_call") {
    return ev.toolName || ev.tool || ev.data?.toolName || ev.data?.tool || (ev.name === "tool_call" ? null : ev.name);
  }
  return null;
}

function getToolInput(ev) {
  return ev.input || ev.arguments || ev.args || ev.data?.input || ev.data?.arguments || {};
}

function getTranscriptText(ev) {
  // Current VS Code transcript: { type: "user.message"|"assistant.message", data: { content } }.
  if ((ev.type === "user.message" || ev.type === "assistant.message") && typeof ev.data?.content === "string") {
    return ev.data.content;
  }
  if (ev.type === "message" || ev.content || ev.text || ev.message) {
    return typeof ev.content === "string"
      ? ev.content
      : JSON.stringify(ev).slice(0, 5000);
  }
  if (getToolName(ev)) return JSON.stringify({ toolName: getToolName(ev), input: getToolInput(ev) }).slice(0, 5000);
  return "";
}

function normalizeEvent(ev, index) {
  const timestamp = getTimestamp(ev);
  const toolName = getToolName(ev);
  if (toolName) {
    return {
      index,
      timestamp,
      type: "tool_call",
      toolName,
      input: truncateValue(getToolInput(ev)),
    };
  }
  const text = getTranscriptText(ev);
  if (!text) return null;
  return {
    index,
    timestamp,
    type: "message",
    role: ev.role || ev.data?.role || null,
    text: text.slice(0, 2000),
  };
}

function truncateValue(value) {
  const text = JSON.stringify(value || {});
  if (text.length <= 2000) return value || {};
  return { preview: text.slice(0, 2000), truncated: true };
}

function verdictScore(verdict) {
  if (verdict === "pass") return 1;
  if (verdict === "fail") return 0;
  return 0.5;
}

function budgetScore(actual, max) {
  if (actual <= max) return 1;
  if (max <= 0) return 0;
  return Math.max(0, max / actual);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
