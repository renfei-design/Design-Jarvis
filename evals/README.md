# Design Jarvis evaluation harness

The harness grades captured Design Jarvis sessions against realistic product-design scenarios. It is runtime neutral: provide a normalized or supported JSONL transcript with `--log`.

## What it measures

- Success criteria through an optional LLM judge.
- Deterministic file, JSON, transcript, tool-order, artifact, and command validators.
- Specialist routing and skill/tool discipline.
- Tool calls, token usage, wall-clock time, and normalized trajectories.
- A combined score: 60% correctness, 20% discipline, and 20% efficiency.

## Local checks

```bash
node evals/health-check.mjs
node --test 'evals/tests/*.test.mjs'
```

## Grade a captured session

```bash
node evals/run.mjs \
  --scenario 01-competitive-research \
  --log /absolute/path/to/session.jsonl
```

Without an external judge, the runner still emits metrics and deterministic-validator results. To enable LLM grading, configure any compatible endpoint:

```bash
export JUDGE_ENDPOINT=https://your-provider.example/v1/chat/completions
export JUDGE_TOKEN=your-token
export JUDGE_MODEL=your-model
```

Never commit tokens or private transcripts. Results, artifacts, and local runs are ignored by default.

## Scenario schema

Each file under `scenarios/` defines:

- `id`, title, category, and harness mode;
- the user prompt;
- expected specialists and artifacts;
- observable success criteria;
- deterministic validators;
- tool and token budgets.

Harness modes are `research`, `design-review`, `figma-write`, `prototype-build`, `memory-maintenance`, and `spec`. Shared mode policies live in `harness-modes.json`.

## Deterministic validators

Supported checks include:

- `file_exists`, `file_contains`, `json_valid`, and `json_path_exists`;
- `transcript_contains` and `regex_count`;
- `tool_invoked`, `tool_input_contains`, `tool_count`, and `tool_order`;
- `artifact_count`, `figma_created_node_ids`, and `command_succeeded`.

## Baselines

After grading a set of sessions:

```bash
node evals/run.mjs --batch --baseline
```

Baseline files are immutable comparison points. Changes to agents or skills should rerun affected scenarios. A score regression greater than 2 percentage points or token increase greater than 25% requires explicit review.

## Improvement candidates

```bash
node evals/propose-skill-updates.mjs
node evals/propose-skill-updates.mjs --write
```

Candidates are reviewable suggestions and are never applied automatically.
