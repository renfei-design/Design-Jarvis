---
name: loop-goal
description: >
  Run a goal through the Jarvis Improvement Loop (loop engineering): ground a
  sourced pass/fail rubric in real evidence first, then iterate Discover →
  change → Verify until the goal is verifiably met or it hits an honest plateau.
  Use when the user types "/loop-goal", or says "loop on this", "loop goal",
  "loop engineering", "iterate until done", "verify until done", "keep going
  until it's actually done", "run the loop", or states a goal they want pursued
  and checked rather than a one-shot answer. Goal-agnostic — works for design
  tasks, research, prototypes, content/a11y cleanup, and fuzzy "make it better"
  goals.
---

# Loop Goal (Jarvis Improvement Loop)

Drive a stated goal through a verifiable loop. Grading is **grounded in external
evidence first**, never invented — every criterion cites a real source. The loop
is executed via a deterministic CLI, not narrated.

> **Why it matters:** this turns the agent from a one-shot responder into a
> self-directed operator — it sets its own pass/fail bar, then works, checks, and
> re-plans autonomously until the goal is *provably* met, escalating only at real
> blockers. You delegate the outcome, not the steps.

## 0. Locate the engine (once)

The loop engine ships with the extension and installs to a stable global path.
Resolve it in this order and reuse the result; always pass `--repo-root "$PWD"`
so it grounds and writes runs against the **current workspace**:

```bash
JIL=./evals/loop/cli.mjs
[ -f "$JIL" ] || JIL="$HOME/.design-jarvis/loop/cli.mjs"
[ -f "$JIL" ] || { echo "Loop engine missing. In VS Code run 'Design Jarvis: Install Agents' from the Command Palette, then retry."; exit 1; }
```

Requires **Node.js on PATH**. If `node` is missing, tell the user and stop.

## Hard rules

1. **Ground before work.** Never start until a rubric is grounded, validated, and locked. Every criterion cites a real source (repo path or allowlisted URL). Unsourceable criteria → `status:"unverifiable"` → escalate to the user, never grade them.
2. **Deterministic-first.** Use `cli.mjs verify` for everything machine-checkable. Never claim a gate is green if the deterministic gate is RED.
3. **One verified change per turn.** No batched cosmetic edits.
4. **Honest plateau.** When no failing criterion and no sourced, measurable gain remains, record ONE plateau note and stop. Do not pad turns.
5. **Propose, don't apply** risky/irreversible actions. Pause and ask before applying self-improvement edits to main, editing baselines, pushing, real Figma writes, or sending messages.

## Procedure

**Phase 0 — Ground the gate:**
```bash
node "$JIL" classify --goal "<goal>" --repo-root "$PWD"      # ask one Q if ambiguous
node "$JIL" start    --goal "<goal>" --profile <id> --repo-root "$PWD"
node "$JIL" ground   --goal "<goal>" --profile <id> --run <run-id> --repo-root "$PWD"
```
Fill `<workspace>/.jarvis/loop-runs/<run-id>/rubric.json` from repo ground sources
(skill acceptance steps, specs, design-system defaults) and allowlisted standards
(for example WCAG on w3.org or web-platform guidance on developer.mozilla.org). Prefer a
deterministic `check.kind` (`grep_absent`, `grep_present`, `command`,
`file_exists`, `json_path`, `score_at_least`). Then:
```bash
node "$JIL" validate --rubric <workspace>/.jarvis/loop-runs/<run-id>/rubric.json
```
Fix every error, then set `"locked": true`.

**Phases 1–N — Iterate** (repeat until done or plateau), citing evidence each turn:
- **Discover** — probe the profile's sources; cite what you found.
- **Hypothesis** — name the gap, the fix, and the expected measurable result.
- **Implement** — exactly one real change.
- **Verify** — `node "$JIL" verify --rubric <…>/rubric.json --repo-root "$PWD" --json`. Resolve `pending-judge` criteria yourself against their sourced statements.
- **Record** — `node "$JIL" record --run <run-id> --turn <turn.json> --repo-root "$PWD"`.
- Check `node "$JIL" status --run <run-id> --repo-root "$PWD"`; if `plateau.plateau` is true, stop.

## Close out

Report: the locked rubric (criteria + sources), per-turn change + verify evidence,
final gate state (deterministic green/red + judge verdicts), and the plateau note
or the human-gated action you're requesting approval for. Never report success
for any criterion whose deterministic check is RED.

> Full spec: `evals/loop/README.md`. Policies: `evals/loop/policies.json`.
> Profiles: `evals/loop/profiles.json`. The `self-improve` profile is
> maintainer-only (needs the Design Jarvis source repo).
