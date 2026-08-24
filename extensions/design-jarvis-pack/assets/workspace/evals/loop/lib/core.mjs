// Jarvis Improvement Loop — pure core logic.
// No file I/O or process spawning lives here so the decision logic is unit-testable.
// CLI wiring (fs, child_process, web) lives in cli.mjs.

/**
 * Classify a free-text goal into a profile id using each profile's classify_signals.
 * Returns { profile, confidence: 0..1, scores, ambiguous }.
 * Confidence is the lead profile's share of total signal hits.
 */
export function classifyGoal(goal, profilesConfig) {
  const text = String(goal || "").toLowerCase();
  const profiles = profilesConfig?.profiles || {};
  const scores = {};
  let total = 0;

  for (const [id, profile] of Object.entries(profiles)) {
    let hits = 0;
    for (const signal of profile.classify_signals || []) {
      if (signal && text.includes(String(signal).toLowerCase())) hits++;
    }
    scores[id] = hits;
    total += hits;
  }

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topId, topScore] = ranked[0] || [null, 0];
  const secondScore = ranked[1]?.[1] ?? 0;

  const fallback = profilesConfig?.classification?.default_profile || "fuzzy";
  if (!topScore) {
    return { profile: fallback, confidence: 0, scores, ambiguous: true };
  }

  const confidence = total ? topScore / total : 0;
  // Ambiguous when the lead doesn't clearly dominate the runner-up.
  const ambiguous = topScore - secondScore <= 0 || confidence < 0.4;
  return { profile: topId, confidence: Number(confidence.toFixed(3)), scores, ambiguous };
}

/** Supported deterministic check kinds the verifier can execute. */
export const DETERMINISTIC_CHECK_KINDS = new Set([
  "grep_absent",
  "grep_present",
  "command",
  "file_exists",
  "json_path",
  "score_at_least",
]);

/** Check kinds that require human / LLM judgment (cannot be auto-graded green). */
export const JUDGE_CHECK_KINDS = new Set(["manual_judge"]);

/**
 * Validate a grounded rubric before it can be locked.
 * Enforces the grounding_policy: every criterion must have a source and a runnable check kind.
 * Returns { valid, errors, warnings, deterministicCount, judgeCount }.
 */
export function validateRubric(rubric) {
  const errors = [];
  const warnings = [];
  if (!rubric || typeof rubric !== "object") {
    return { valid: false, errors: ["rubric is not an object"], warnings, deterministicCount: 0, judgeCount: 0 };
  }
  if (!rubric.goal) errors.push("rubric.goal is required");
  if (!rubric.profile) errors.push("rubric.profile is required");
  const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];
  if (!criteria.length) errors.push("rubric.criteria must be a non-empty array");

  let deterministicCount = 0;
  let judgeCount = 0;

  for (const [i, c] of criteria.entries()) {
    const label = c?.id || `#${i + 1}`;
    if (!c?.statement) errors.push(`criterion ${label}: missing statement`);

    // grounding_policy: a criterion without a cited source must be marked unverifiable, never graded.
    const hasSource = c?.source && (c.source.ref || c.source.url || c.source.note);
    if (c?.status === "unverifiable") {
      warnings.push(`criterion ${label}: unverifiable — must be escalated to the user, excluded from the gate`);
      continue;
    }
    if (!hasSource) {
      errors.push(`criterion ${label}: no cited source (set status 'unverifiable' and escalate, or add source)`);
    }

    const kind = c?.check?.kind;
    if (!kind) {
      errors.push(`criterion ${label}: missing check.kind`);
    } else if (DETERMINISTIC_CHECK_KINDS.has(kind)) {
      deterministicCount++;
    } else if (JUDGE_CHECK_KINDS.has(kind)) {
      judgeCount++;
    } else {
      errors.push(`criterion ${label}: unknown check.kind '${kind}'`);
    }
  }

  const gradable = criteria.filter((c) => c?.status !== "unverifiable");
  if (gradable.length && deterministicCount === 0) {
    warnings.push("no deterministic criteria — gate relies entirely on judgment (grounding still required)");
  }

  return { valid: errors.length === 0, errors, warnings, deterministicCount, judgeCount };
}

/**
 * Decide whether the loop has reached a genuine plateau.
 * state: { failingCriteria: number, lastTurnMeasurableGain: boolean, openCandidates: number }
 * Returns { plateau, reason }.
 */
export function checkPlateau(state = {}) {
  const failing = Number(state.failingCriteria || 0);
  const openCandidates = Number(state.openCandidates || 0);
  const gain = Boolean(state.lastTurnMeasurableGain);

  if (failing > 0) return { plateau: false, reason: `${failing} criterion(s) still failing` };
  if (openCandidates > 0) return { plateau: false, reason: `${openCandidates} open improvement candidate(s) remain` };
  if (gain) return { plateau: false, reason: "last turn produced a measurable gain; another pass may help" };
  return { plateau: true, reason: "no failing criteria, no open candidates, no measurable gain available" };
}

/**
 * Regression guard for the self-improve gate.
 * Returns { ok, deltaPp, tokenRatio, reasons }.
 */
export function checkRegression({ score, baselineScore, tokens, baselineTokens } = {}) {
  const reasons = [];
  let ok = true;
  let deltaPp = null;
  let tokenRatio = null;

  if (typeof score === "number" && typeof baselineScore === "number") {
    deltaPp = Number(((score - baselineScore) * 100).toFixed(2));
    if (deltaPp < -2) {
      ok = false;
      reasons.push(`score regressed ${deltaPp}pp (limit -2pp)`);
    }
  }
  if (typeof tokens === "number" && typeof baselineTokens === "number" && baselineTokens > 0) {
    tokenRatio = Number((tokens / baselineTokens).toFixed(3));
    if (tokenRatio > 1.25) {
      ok = false;
      reasons.push(`tokens rose ${Math.round((tokenRatio - 1) * 100)}% (limit 25%)`);
    }
  }
  return { ok, deltaPp, tokenRatio, reasons };
}

/** Read a dotted path from an object. Returns undefined if any segment is missing. */
export function readPath(obj, dottedPath) {
  return String(dottedPath || "")
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/** kebab-case slug for run directory names. */
export function slugify(text, max = 48) {
  return String(text || "goal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max) || "goal";
}

/** Translate a glob (supporting ** and *) into a RegExp anchored to a relative path. */
export function globToRegExp(glob) {
  let re = "";
  const g = String(glob).replace(/\\/g, "/");
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    if (ch === "*") {
      if (g[i + 1] === "*") {
        re += ".*";
        i++;
        if (g[i + 1] === "/") i++;
      } else {
        re += "[^/]*";
      }
    } else if ("\\^$+?.()|[]{}".includes(ch)) {
      re += "\\" + ch;
    } else {
      re += ch;
    }
  }
  return new RegExp("^" + re + "$");
}

/** Whether a URL's hostname is within a profile's web allowlist. */
export function isAllowedSource(url, allowlist = []) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return allowlist.some((domain) => host === domain || host.endsWith("." + domain));
  } catch {
    return false;
  }
}
