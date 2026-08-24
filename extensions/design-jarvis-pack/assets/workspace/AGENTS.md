# AGENTS.md

Open-standard guidance for contributors and agent runtimes working in this repository.

## Project overview

Design Jarvis is an open-source, vendor-neutral multi-agent system for product and UX design. It ships:

- six agent roles under `.github/agents/`;
- reusable task skills under `.github/skills/`;
- per-project artifacts under `projects/<slug>/`;
- durable project memory under `.jarvis/memory/projects/<slug>/`;
- an optional editor extension under `extensions/`;
- scenario-based evaluation under `evals/`.

## Output rules

- `projects/_starters/` is read-only. Copy a starter before editing it.
- Specs, prototypes, research, diagrams, and assets belong under `projects/<slug>/`.
- Project slugs use lowercase hyphenated names.
- Create artifact folders only when the first artifact of that type is produced.
- Do not create planning or notes files unless the user asks for them.

## Design-system defaults

Design Jarvis does not assume a vendor design system. Discover and follow, in order:

1. the design system named by the user;
2. tokens and components already present in the project;
3. project memory and existing artifacts;
4. the neutral starter tokens in `projects/_starters/design-tokens.css`.

Baseline defaults when no system exists:

- system UI font stack;
- accessible blue accent `#2563EB`;
- 4px spacing grid;
- 4px controls, 8px cards, and 12px dialogs;
- WCAG 2.2 AA minimum;
- responsive layouts beginning at 1440 × 900, with smaller widths verified as relevant.

Document intentional deviations from the active design system.

## Workflows

- **HTML capture:** copy `projects/_starters/_template.html`, build under `projects/<slug>/prototypes/`, and optionally capture the result into Figma.
- **Native Figma:** load `figma-use` before any Figma write and use the project’s configured component libraries.
- **Code prototype:** use the project’s existing stack. If none exists, prefer standards-based TypeScript, semantic HTML, and CSS custom properties.

## Memory

Load `.jarvis/memory/projects/<slug>/memory.md` first. Read `manifest.json`, `artifacts.json`, `decisions.md`, sessions, and archive entries only when the task needs deeper context.

Never store credentials, personal data, private customer information, or proprietary source material in project memory.

## Verification

Match evidence to the claim:

- Figma changes: created or updated node IDs plus screenshots.
- Code changes: build, tests, and rendered-state verification.
- Research: direct links to credible, current sources and explicit separation of observation from inference.
- Specs and memory: schema/path validation and review of the written artifact.
- Agent/skill changes: `node evals/health-check.mjs` and `node --test 'evals/tests/*.test.mjs'`.

## Contributing

- Keep agent guidance useful across industries and companies.
- Avoid private connectors, internal organization names, employee identifiers, proprietary repositories, and fixed vendor component libraries.
- Prefer configurable integration points and public standards.
- Use imperative commit messages.
- State what changed, why, and how it was verified.
