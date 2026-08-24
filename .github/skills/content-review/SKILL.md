---
name: content-review
description: Review product copy for clarity, consistency, inclusivity, scannability, and actionability using plain-language principles.
---

# Product Content Review

Use for UI strings, flows, screenshots, Figma frames, prototypes, and content inventories.

## Principles

- Put the user’s goal or outcome first.
- Prefer familiar words, active voice, and direct instructions.
- Use sentence case unless the active design system specifies otherwise.
- Make buttons describe the action and avoid generic labels such as “OK” or “Submit” when a specific verb is available.
- Explain errors in plain language, preserve the user’s work, and provide a recovery action.
- Avoid blame, unnecessary apology, idioms, cultural assumptions, ableist language, and organization-specific jargon.
- Keep terminology consistent with the product’s glossary.
- Do not expose implementation details, identifiers, or sensitive data without a user need.

## Workflow

1. Extract visible UI strings with their element type, state, and location.
2. Identify the user’s task and the consequence of each message or action.
3. Review hierarchy, terminology, grammar, capitalization, punctuation, tone, localization risk, and accessibility.
4. Propose minimal edits that preserve product meaning.
5. If applying changes in Figma, load `figma-use`, batch updates, load fonts, return mutated node IDs, and verify with a screenshot.

## Output

```json
{
  "findings": [
    {
      "location": "node, file, or screen",
      "element": "button|heading|error|helper|label|other",
      "before": "...",
      "after": "...",
      "reason": "clarity|consistency|inclusivity|actionability|accessibility",
      "confidence": "high|medium|low"
    }
  ],
  "terminologyQuestions": [],
  "appliedNodeIds": []
}
```
