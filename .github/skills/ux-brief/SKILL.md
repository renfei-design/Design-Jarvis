---
name: ux-brief
description: Turn a product requirement, problem statement, or discovery note into a concise, vendor-neutral UX brief.
---

# UX Brief

Create `projects/<slug>/specs/ux-brief.md` unless the user supplies another destination.

## Workflow

1. Read the source requirement and existing project memory.
2. Extract facts, constraints, decisions, assumptions, and unresolved questions. Do not invent missing requirements.
3. Define intended users by goals, context, capability, and constraints rather than demographic stereotypes.
4. Describe the current problem, desired outcome, primary scenarios, success measures, scope, non-goals, dependencies, and risks.
5. Record accessibility, privacy, localization, platform, and design-system considerations.
6. Link source artifacts and identify the next design decision.

## Template

```markdown
# UX brief: <feature>

## Summary and recommendation
## Problem and evidence
## Intended users and contexts
## User goals and primary scenarios
## Desired outcomes and success measures
## Scope and non-goals
## Constraints and dependencies
## Accessibility, privacy, and localization
## Design-system and platform context
## Risks, assumptions, and open questions
## Source artifacts
## Next decision
```

Every claim should be traceable to a source, user statement, or explicitly labeled assumption.
