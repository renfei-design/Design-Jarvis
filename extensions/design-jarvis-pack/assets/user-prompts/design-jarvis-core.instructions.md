---
description: "Use when working with Design Jarvis, product design, Figma design review, UX specs, prototypes, or design project memory."
---

# Design Jarvis Core Context

These instructions make the user-level Design Jarvis agent useful in any VS Code folder. For the full workspace experience, run **Design Jarvis: Set Up This Workspace** from the Command Palette.

# Design Jarvis project context

Design Jarvis is an open-source, vendor-neutral AI design team for product and UX work. The repository contains agent definitions, reusable skills, optional Figma workflows, local project memory, starter artifacts, an editor extension, and a scenario-based evaluation harness.

## Repository structure

- `.github/agents/`: orchestrator and specialist roles.
- `.github/skills/`: task-specific playbooks loaded only when relevant.
- `projects/<slug>/`: specs, prototypes, research, diagrams, and assets.
- `projects/_starters/`: read-only neutral templates; copy before editing.
- `.jarvis/memory/projects/<slug>/`: project state, decisions, sessions, and artifact references.
- `evals/`: deterministic validators and realistic scenarios.
- `extensions/`: optional editor integration and packaged copies of canonical agents/skills.

## Output rules

- Write project artifacts only under `projects/<slug>/`.
- Never edit `projects/_starters/` while producing a project artifact.
- Use lowercase-hyphenated project slugs.
- Create subfolders lazily.
- Do not add private organization names, employee identifiers, credentials, proprietary repositories, or internal-only connectors.

## Design-system policy

Do not assume a vendor design system. Follow the system supplied by the user or discovered in the project. When none exists, use `projects/_starters/design-tokens.css` as a neutral, replaceable baseline.

## Memory policy

Load `memory.md` first. Retrieve deeper files only when needed. Validate JSON metadata after edits, keep the core concise, and never store secrets or private customer information.

## Verification

- Figma writes require node IDs and screenshots.
- Code changes require proportional build/test/render checks.
- Research requires current citations and explicit uncertainty.
- Agent or skill changes require `node evals/health-check.mjs` and `node --test 'evals/tests/*.test.mjs'`.

See `AGENTS.md` and `.github/agents/_shared-context.md` for the complete operating contract.
