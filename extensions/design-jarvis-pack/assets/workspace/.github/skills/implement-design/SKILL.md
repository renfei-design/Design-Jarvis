---
name: implement-design
description: Implement a design in the current project stack with visual, interaction, responsive, and accessibility verification.
---

# Implement Design

## Workflow

1. Inspect the source design, target repository, existing components, tokens, routes, data patterns, and test conventions.
2. Define the screen/state matrix and map design elements to existing components.
3. Implement structure and behavior before visual polish.
4. Use project tokens and components; add a semantic token only when the project lacks one and document it.
5. Implement keyboard behavior, focus management, labels, announcements, validation, and reduced-motion support.
6. Verify responsive layouts, long content, localization expansion, loading, empty, error, success, disabled, and permission states.
7. Run build/type checks and tests.
8. Compare rendered output with source screenshots and report measurable deltas.

## Rules

- Follow the project’s framework instead of imposing a preferred stack.
- Do not hardcode visual values when a project token exists.
- Do not replace working project components with lookalike custom components.
- Preserve user data across errors and avoid destructive defaults.
- Keep demo data fictional and non-sensitive.

## Completion

Return changed files, build/test results, verified states, screenshots, accessibility checks, design-system deviations, and remaining fidelity deltas.
