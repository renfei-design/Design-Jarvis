---
name: hifi-design
description: Create and verify high-fidelity product designs using the active project design system or neutral starter tokens.
---

# High-Fidelity Design

## Choose a workflow

- **HTML capture:** fastest for exploration and reviewable screens.
- **Native Figma:** use when real component instances, variables, auto layout, or library linkage are required.
- **Code prototype:** use when interaction behavior and production transfer matter most.

## HTML capture

1. Copy `projects/_starters/_template.html` and `design-tokens.css` to `projects/<slug>/prototypes/<name>/`.
2. Rebind tokens to the active project design system.
3. Build semantic regions and realistic content.
4. Implement relevant states and responsive behavior.
5. Serve locally, inspect in a browser, and optionally capture to Figma.

## Native Figma

1. Load `figma-use`.
2. Inspect the target file, configured libraries, variables, and nearby patterns.
3. Create frames with auto layout and named regions.
4. Prefer library instances and bound variables; document missing components.
5. Batch writes, return node IDs, and verify with screenshots.

## Code prototype

Use the current project stack. When none exists, prefer semantic HTML, CSS custom properties, and standards-based TypeScript. Do not introduce a vendor UI library by default.

## Quality gate

- Clear task hierarchy and primary action.
- Consistent spacing, typography, color, radius, and elevation.
- Default, loading, empty, error, success, disabled, and permission states as relevant.
- WCAG 2.2 AA contrast, focus, labels, target sizes, and keyboard paths.
- Responsive behavior and overflow verified at relevant widths.
- Realistic content without private or organization-specific data.
- Screenshots and artifact IDs/paths returned.

Never edit shared starters directly and never claim design-system compliance without identifying the active system.
