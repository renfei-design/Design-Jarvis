---
name: generate-ux-handoffspec
description: Generate a tracker- and repository-neutral UX handoff specification from product requirements and design artifacts.
---

# UX Handoff Specification

Create `ux-design-spec-handoff.md` under `projects/<slug>/specs/` unless the user supplies another destination.

## Inputs

- Product requirement or brief.
- Figma frames, prototypes, diagrams, or screenshots.
- Active design system and engineering constraints.
- Known research, decisions, metrics, and open questions.

## Workflow

1. Resolve the project and inspect existing memory/specs to avoid duplication.
2. Build an artifact inventory with stable links, node IDs, screen names, and implementation paths.
3. Document the problem, intended users, goals, non-goals, assumptions, constraints, and success measures.
4. Describe information architecture and numbered flows with entry, trigger, system response, user feedback, exit, and recovery.
5. Specify each screen or component: purpose, regions, content, actions, states, responsive behavior, permissions, and data dependencies.
6. Record accessibility requirements, analytics events, localization concerns, performance expectations, and privacy/security implications.
7. Map design-system components and tokens; list intentional deviations and missing components.
8. Add acceptance criteria, test scenarios, unresolved questions, decisions, ownership, and change history.
9. Verify every referenced artifact and clearly label unavailable evidence or `TBD` fields.

## Required structure

```markdown
# UX design specification: <feature>

## 1. Overview
## 2. Users, needs, and outcomes
## 3. Scope, assumptions, and constraints
## 4. Information architecture and flows
## 5. Screens, components, and states
## 6. Content and terminology
## 7. Accessibility
## 8. Responsive behavior and performance
## 9. Data, permissions, privacy, and analytics
## 10. Design-system mapping and deviations
## 11. Acceptance criteria and test scenarios
## 12. Decisions, open questions, and ownership
## 13. Artifact index and change history
```

Use `TBD — owner: <role>` for genuinely missing information. Do not invent product requirements, metrics, legal rules, or implementation details.
