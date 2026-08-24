# Loop runs

One folder per `/loop-goal` invocation, created by `node evals/loop/cli.mjs start`.

```
runs/<date>-<goal-slug>/
  meta.json      # goal, profile, status
  rubric.json    # the grounded, locked gate (immutable once locked)
  turns.jsonl    # one record per loop turn (the loop_runs equivalent)
```

These are working artifacts, not baselines — safe to delete. Do not hand-edit a
locked `rubric.json`; re-ground instead.
