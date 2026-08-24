---
name: a11y-review
description: Review designs, content, and prototypes against WCAG 2.2 AA and produce actionable accessibility findings.
---

# Accessibility Review

Use for accessibility audits, annotations, remediation plans, and quality gates across any product or design system.

## Inputs

- Figma URL, screenshot, rendered page, code path, or spec.
- User tasks and supported input methods.
- Target platforms and any accessibility requirements beyond WCAG 2.2 AA.

## Workflow

1. Inspect the artifact and identify interactive controls, reading order, states, and dynamic behavior.
2. Review perceivable concerns: contrast, text alternatives, zoom/reflow, color dependence, labels, and error identification.
3. Review operable concerns: keyboard access, focus visibility/order, target size, motion, time limits, and escape paths.
4. Review understandable concerns: instructions, naming, consistency, validation, and destructive-action safeguards.
5. Review robust concerns: semantic structure, roles, names, values, status announcements, and compatibility assumptions.
6. Classify each finding by WCAG criterion, severity, evidence, user impact, and specific remediation.
7. Verify contrast with measured foreground/background values and verify keyboard behavior in a running prototype when available.

## Severity

- **Blocker:** prevents a core task or creates a severe safety/access barrier.
- **Serious:** materially impairs task completion for a supported user group.
- **Moderate:** creates avoidable friction but has a viable path through.
- **Minor:** polish or best-practice improvement with limited task impact.

## Output

```json
{
  "scope": ["artifact references"],
  "standard": "WCAG 2.2 AA",
  "findings": [
    {
      "id": "a11y-001",
      "severity": "serious",
      "criterion": "2.4.7 Focus Visible",
      "where": "control or node",
      "evidence": "observable problem",
      "impact": "who is affected and how",
      "fix": "specific remediation",
      "verification": "how to prove the fix"
    }
  ],
  "passedChecks": [],
  "limitations": []
}
```

Do not claim a full audit from screenshots alone. State which keyboard, screen-reader, zoom, motion, and runtime checks were not possible.
