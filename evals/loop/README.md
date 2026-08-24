# Jarvis Improvement Loop (JIL)

A goal-agnostic **loop-engineering** engine for Design Jarvis. You state a goal
(via `/loop-goal`); the loop grounds a grading rubric in external evidence, then
runs a hard six-phase verification contract until the goal is met or a genuine
plateau is reached.

It implements the same lineage as the project's `ARCHITECTURE.md` (OODA · PDCA ·
Anthropic evaluator–optimizer · ReAct), retargeted from a single web app to the
**whole agent system** and to **any goal type**.

---

## The one idea

The loop never changes. Only three things vary per goal, supplied by a **profile**:

| Variable | What it is |
|---|---|
| **Discover source** | where ground-truth lives (eval results, design system, web, the artifact) |
| **Verify gate** | how progress is proven (health-check, screenshot, cited sources, build) |
| **Plateau** | what "done" means |

Everything else — the contract, the policies, the honesty rules — is shared.

## The six-phase contract

Every turn completes all six phases, each **cited**:

1. **Ground** *(once, up front)* — build the grading rubric from external evidence:
   repo first (skill criteria, scenario `success_criteria`, baselines), then
   trusted web/KB. Each criterion carries a **source**. This is what defeats the
   "LLM grades its own work" problem.
2. **Discover** — probe real current state and cite it.
3. **Hypothesis** — name the gap, the fix, and the **expected measurable result**.
4. **Implement** — one real change.
5. **Verify** — run the locked gate (deterministic-first); prove the change; no regression.
6. **Next-direction** — evidence-based pointer to the next highest-value gap.

## The four policies (`policies.json`)

- **grounding_policy** — no criterion enters the gate without a cited source; unsourced criteria are escalated, never graded.
- **loop_contract** — all six phases done & cited; one verified change per turn.
- **plateau_policy** — stop honestly when no measurable, sourced gain remains.
- **human_gate_policy** — propose, don't apply. Irreversible/shared-world actions pause and ask.

A turn is **rejected** if it skips Ground/Discover/Verify, grades an unsourced
criterion, makes a cosmetic change, pads after plateau, or performs a human-gated
action without approval.

## Goal profiles (`profiles.json`)

`self-improve` · `design-task` · `research` · `prototype` · `memory` · `fuzzy`
(fallback that must derive a sourced gate first). Classification is a hint; on low
confidence the loop asks one clarifying question (late commitment).

> **Where profiles run.** `design-task`, `research`, `prototype`, `memory`, and
> `fuzzy` work in any set-up workspace — they ground against the workspace's own
> skills, specs, and artifacts. `self-improve` is **maintainer-only**: its gate
> calls `node evals/health-check.mjs` and grounds against `evals/scenarios/*` and
> `evals/results/baseline-*.json`, which ship only in the Design Jarvis source
> repo, not in a packaged workspace.

---

## CLI — the deterministic backbone

The agent runs the contract; this CLI provides the parts that must be
deterministic so grades can't be faked.

```bash
# Suggest a profile for a goal
node evals/loop/cli.mjs classify --goal "fix the token-binding skill"

# Start a run (creates runs/<date>-<slug>/)
node evals/loop/cli.mjs start --goal "fix the token-binding skill"

# Scaffold a grounded rubric into the run
node evals/loop/cli.mjs ground --goal "fix the token-binding skill" --run <run-id>

# Enforce grounding before locking (every criterion needs a source + runnable check)
node evals/loop/cli.mjs validate --rubric evals/loop/runs/<run-id>/rubric.json

# Run the locked gate (deterministic-first); exits non-zero if RED
node evals/loop/cli.mjs verify --rubric evals/loop/runs/<run-id>/rubric.json --json

# Persist a turn + check plateau
node evals/loop/cli.mjs record --run <run-id> --turn turn.json
node evals/loop/cli.mjs status --run <run-id>
```

### Rubric schema

```jsonc
{
  "goal": "…", "profile": "self-improve", "locked": true,
  "gate": { "kind": "eval", "must_pass": ["…"] },
  "criteria": [
    {
      "id": "c1",
      "statement": "Scenario 08 harness_score ≥ baseline",
      "type": "deterministic",
      "check": { "kind": "score_at_least", "result": "evals/results/…/08.json", "field": "harness_score.total", "min": 0.81 },
      "source": { "kind": "repo", "ref": "evals/results/baseline-…json", "note": "immutable baseline" },
      "status": "active"            // or "unverifiable" → escalated, excluded from gate
    }
  ]
}
```

### Deterministic check kinds

`grep_absent` · `grep_present` · `command` (allowlisted: node/npm/npx) ·
`file_exists` · `json_path` · `score_at_least`. Anything else is `pending-judge`
— graded by the LLM/human **against the sourced statement**, never auto-greened.

---

## How `/loop-goal` uses this

`.github/prompts/loop-goal.prompt.md` is the agent-facing playbook. It instructs
the agent to: classify → start → ground (repo + allowlisted web) → validate →
lock → run Discover/Hypothesis/Implement/Verify per turn → record → stop at
plateau or a human gate. Self-improvement edits are **staged as
`skill-candidates`, never auto-applied to main**.

## Relationship to the eval harness

JIL reuses the harness as ground-truth: `health-check.mjs` is the self-improve
gate, `scenarios/*` supply grounded criteria, `baseline-*.json` are immutable
comparison points, and `propose-skill-updates.mjs` produces the reviewable
candidates a self-improve run stages.
