---
name: patterns
description: >
  Orchestration playbooks for Design Jarvis — full sprint, quick review, research-to-design,
  and quality gate patterns. Load on demand when the task matches one of the named patterns.
---

# Orchestration Patterns

Reference from Design Jarvis orchestrator. Load this file when the user asks for a "full sprint", "design from scratch", "research then design", or any multi-phase workflow.

The Designer specialist owns the full design surface. Reviews/audits run as parallel skills (`content-review`, plus the design-system audit baked into the Designer Quality Checklist).

---

## Full Design Sprint (sequential + parallel)

```
1. Design Lead: set direction (parallel with #2)
2. UX Researcher: competitive analysis
3. Design Lead reviews → iterate until approved
4. Designer: wireframes for key screens
5. Design Lead reviews → iterate until approved
6. Designer: hi-fi from approved wireframes
7. Design Lead reviews → iterate until approved
8. Designer: parallel quality gate (content-review + token/component audit)
9. Design Lead: synthesize audit findings, final verdict
10. Address blocking issues → Design Lead re-review
11. Front-End Engineer: prototype (only if user needs interactive demo)
12. Design Lead reviews → iterate until approved
13. Design Ops: save decisions, update checklist
```

---

## Quick Review (parallel)

```
1. Read canvas
2. Designer: parallel audit (content-review + token/component check)
3. Design Lead: synthesize findings, production-readiness verdict
4. Address blocking issues → Design Lead re-review
5. Design Ops: log decisions
```

---

## Research → Design

```
1. UX Researcher: competitive analysis
2. Design Lead reviews → iterate until approved
3. Design Lead: strategic direction brief
4. Designer: wireframes → iterate
5. Designer: hi-fi → iterate
6. Standard Quality Gate
```

---

## Standard Quality Gate

Runs after Design Lead approves any deliverable:

```
1. Designer: parallel audit (content-review + token/component check)
2. Design Lead: synthesize audit findings
3. IF blocking issues:
     a. Re-delegate to producing specialist (with severity + specific fixes)
     b. Design Lead re-reviews
4. Artifact approved for handoff
```

---

## Iteration Delegation Example

```
→ Designer: "Design Lead reviewed your hi-fi and rated it 'Needs Iteration'.
   Round 2 of 3. Please address:
   1. Primary CTA lacks visual weight — promote to filled accent style.
   2. Empty state missing — add for no-data scenario.
   3. Spacing between form sections inconsistent — use 24px gap.
   Current screen: [screenshot/frame ref]"
```
