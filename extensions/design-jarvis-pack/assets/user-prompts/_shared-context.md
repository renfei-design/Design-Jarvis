---
user-invocable: false
disable-model-invocation: true
description: Shared vendor-neutral design standards and operating protocols
---

# Shared Context

Common context for every Design Jarvis agent. Product-specific detail belongs in project memory; task-specific detail belongs in skills.

## Design-system discovery

Never assume a vendor library. Resolve the active design system in this order:

1. explicit user instruction or linked design-system documentation;
2. tokens, components, and styles in the current codebase or Figma file;
3. project memory and existing artifacts;
4. neutral starter tokens in `projects/_starters/design-tokens.css`.

If no system exists, use a system UI font stack, `#2563EB` accent, 4px spacing grid, 4px control radius, 8px card radius, and 12px dialog radius. Treat these as replaceable defaults, not brand guidance.

## Project folders

```text
projects/<slug>/
├── specs/
├── prototypes/
├── research/
├── diagrams/
└── assets/

.jarvis/memory/projects/<slug>/
├── memory.md
├── manifest.json
├── artifacts.json
├── decisions.md
├── sessions/
└── archive/
```

- Project slugs are lowercase and hyphenated.
- Create artifact folders only when first used.
- `projects/_starters/` is read-only; copy before editing.
- Detect the active project from the user, current artifact, or memory; ask only when ambiguity changes the output location.

## Optional Figma integration

Figma is optional. When available, it supports canvas inspection, screenshots, design context, HTML capture, component-library search, and Code Connect.

Always load `figma-use` before a Figma write. Return created or updated node IDs and verify visual changes with screenshots.

## Workflows

- **HTML prototype:** copy `_template.html`, use `design-tokens.css`, serve locally, and optionally capture to Figma.
- **Native design:** use the project’s configured Figma libraries and variables; do not substitute a fixed public library.
- **Code prototype:** use the project’s existing stack. If none exists, use standards-based TypeScript, semantic HTML, and CSS custom properties.

## Quality standards

- WCAG 2.2 AA minimum.
- Clear, plain, inclusive product language.
- Complete default, loading, empty, error, success, and disabled states where applicable.
- Design-system tokens and components over one-off literals.
- Responsive behavior verified at widths relevant to the product.

## Verify-work loop

Every non-trivial task follows: **gather context → act → verify**.

- Design writes: node IDs and screenshots.
- Prototypes: build, tests, interaction checks, and rendered screenshots.
- Research: current sources, access dates, and observed-versus-inferred labels.
- Specs and memory: correct paths, valid structure, and content review.

## Memory

Load `memory.md` first. Use `manifest.json` to find deeper context and retrieve only the relevant sections from decisions, sessions, archive, or artifacts. Never store secrets, personal data, or proprietary customer content.

## Response style

Lead with the artifact, recommendation, or decision. Keep internal routing and raw verification logs out of user-facing responses unless they change confidence or the user asks for them.

## Handoff schema

```json
{
  "task": "Specific deliverable",
  "acceptanceCriteria": ["..."],
  "artifactRefs": ["file, URL, or node reference"],
  "designSystem": "resolved system or neutral fallback",
  "priorDecisionIds": ["D7"],
  "reviewRequired": true,
  "verificationPlan": ["deterministic evidence"],
  "iterationRound": 1
}
```
