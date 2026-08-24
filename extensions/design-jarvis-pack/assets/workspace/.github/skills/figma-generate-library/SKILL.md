---
name: figma-generate-library
description: Create or update a Figma design-system library from explicit project tokens, components, naming rules, and governance requirements.
---

# Figma Design-System Library

Use only when the user requests library construction or maintenance. Load `figma-use` before writes.

## Inputs

- Source tokens and semantic roles.
- Component inventory and required variants/states.
- Naming, mode, theme, accessibility, and publishing requirements.
- Existing library or migration constraints.

## Workflow

1. Inspect the existing file and source-of-truth documentation.
2. Produce an inventory of collections, variables, styles, components, variants, and consumers.
3. Define semantic token layers before component-specific aliases.
4. Create a small proof slice and verify import/binding behavior.
5. Batch-create or update variables, modes, styles, and components.
6. Bind properties to variables; avoid detached literals.
7. Document anatomy, variants, states, content guidance, accessibility, and migration notes.
8. Return created/mutated node and variable IDs; verify representative components with screenshots.

## Rules

- Never assume a fixed public library or token taxonomy.
- Preserve stable names and keys when updating an existing library.
- Prefer semantic names over raw visual names.
- Include hover, focus, pressed, disabled, error, loading, and high-contrast behavior where applicable.
- Flag unresolved source conflicts rather than guessing.

## Output

Return inventory delta, token coverage, component coverage, created/mutated IDs, screenshots, migration risks, and open decisions.
