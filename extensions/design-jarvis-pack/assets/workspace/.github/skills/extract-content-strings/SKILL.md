---
name: extract-content-strings
description: Extract, normalize, classify, and verify user-facing strings from designs or code into a portable content inventory.
---

# Extract Content Strings

Save the inventory to `projects/<slug>/specs/content-strings.md` or a user-specified destination.

## Workflow

1. Resolve the source: Figma frames, screenshots with available text, HTML, templates, components, or localization files.
2. Extract only user-facing text. Exclude layer names, code identifiers, design notes, token names, test fixtures, and invisible metadata unless requested.
3. Preserve context: screen, component, element type, state, trigger, audience, and character constraints.
4. Normalize whitespace and exact duplicates while retaining intentionally different contextual uses.
5. Assign stable, platform-neutral keys such as `settings_save_button` or `search_empty_title`.
6. Flag dynamic placeholders, pluralization, variables, markup, localization risk, terminology conflicts, missing labels, and inaccessible icon-only controls.
7. Cross-check extracted counts and spot-check the source before completion.

## Inventory format

```markdown
| Key | Source | Screen/component | Element | State | String | Variables | Notes |
|---|---|---|---|---|---|---|---|
```

## Rules

- Preserve exact source wording in the inventory; propose rewrites in a separate review column or artifact.
- Never include credentials, personal data, private customer content, or internal identifiers.
- Do not infer text hidden behind unavailable states; mark it missing.
- If writing to Figma, load `figma-use`, return mutated node IDs, and verify with a screenshot.
