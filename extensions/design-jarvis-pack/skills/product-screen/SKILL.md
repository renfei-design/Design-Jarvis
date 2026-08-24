---
name: product-screen
description: Create a high-quality, interactive product screen or small workflow using the active project design system.
---

# Product Screen

Use for new screens, focused workflows, dashboards, settings, forms, editors, and other product surfaces.

## Workflow

1. Resolve the active project and read its brief, memory, existing artifacts, and design-system context.
2. Define the primary user task, entry condition, completion outcome, and required states.
3. Choose the artifact path:
   - HTML prototype under `projects/<slug>/prototypes/<name>/`;
   - native Figma when library linkage is required;
   - project code when the user explicitly requests implementation.
4. Use existing components and tokens. When no design system exists, copy the neutral starter and document the fallback.
5. Implement realistic content and interactions for default, loading, empty, error, success, disabled, and permission states as applicable.
6. Verify hierarchy, keyboard access, responsive behavior, overflow, focus, content clarity, and design-system consistency.

## Completion evidence

- artifact path or Figma node IDs;
- rendered screenshot or canvas screenshot;
- state coverage;
- build/test results for code;
- accessibility and responsive checks;
- explicit remaining deltas.

Never edit `projects/_starters/` directly.
