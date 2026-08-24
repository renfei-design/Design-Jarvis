---
name: bugfiler
description: Turn UX evidence into a clear, tracker-neutral issue draft with impact, reproduction steps, acceptance criteria, and verification.
---

# UX Issue Writer

Use when a user wants a UX, accessibility, content, or design-system problem documented for an issue tracker.

## Workflow

1. Gather the artifact reference, environment, current behavior, expected behavior, and user impact.
2. Reproduce or inspect the issue when possible. Separate observed evidence from inference.
3. Classify the issue: usability, accessibility, content, visual consistency, interaction, responsive behavior, or implementation fidelity.
4. Assign severity based on task impact, affected users, frequency, workaround, and reversibility.
5. Draft a tracker-neutral issue. Do not submit it externally unless the user explicitly asks and an authorized connector is available.

## Output template

```markdown
# <Outcome-focused title>

## Summary
<What is wrong and why it matters>

## Evidence
- Artifact/build: <reference>
- Environment: <browser, device, viewport, version>
- Observed: <facts>

## Steps to reproduce
1. ...

## Expected behavior
...

## Actual behavior
...

## User impact
<affected users, blocked/degraded task, frequency, workaround>

## Severity
<blocker | serious | moderate | minor> — <rationale>

## Acceptance criteria
- [ ] ...

## Verification
<how a reviewer can prove the issue is fixed>
```

Never include credentials, private customer data, employee identifiers, or inaccessible internal links in a public issue.
