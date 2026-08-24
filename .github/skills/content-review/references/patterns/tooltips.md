# Tooltips

Rules for tooltip content in product UI.

## Core Rules

1. **Keep it brief** — One sentence or phrase, ideally under 150 characters
2. **Don't repeat the label** — Add value, don't echo
3. **Use sentence case** — Capitalize first word only
4. **No period** — Unless multiple sentences (avoid multiple sentences)
5. **Action-oriented** — Start with verb for action tooltips

## When to Use Tooltips

### Do use for

- Icon-only buttons (required for accessibility)
- Truncated text (show full text on hover)
- Keyboard shortcuts — "Bold (Ctrl+B)"
- Brief clarification of complex labels
- Status indicators
- Disabled state explanation — "You need Admin access to change this"

### Don't use for

- Essential information (users may not see tooltips)
- Long explanations (use helper text instead)
- Interactive content (tooltips disappear on mouse move)
- Touch-primary interfaces (no hover on touch)
- Form validation — use inline errors
- Instructions needed to complete a task — use visible labels

## Content Patterns

### Icon-only buttons

Describe the action:

- ✅ "Settings", "Close", "Copy to clipboard"
- ❌ "Click to open settings" (don't instruct)

### With keyboard shortcut

- ✅ "Bold (Ctrl+B)"
- ✅ "Undo (Ctrl+Z)"

### Truncated text

Show the full text:

- ✅ "Marketing Campaign Performance Report Q4 2024"

### Disabled controls

Explain why:

- ✅ "Delete sub-items before deleting this item"
- ✅ "You need edit access to change this setting"

## Formatting

- **Sentence case** — "Sort items by date" not "Sort Items By Date"
- **No period** for short phrases — "Open settings"
- **Period only** for complete sentences with body text

## Accessibility

- **Required for icon-only buttons** — screen readers need text
- **Keyboard accessible** — tooltips should appear on focus, not just hover
- **Don't rely on tooltips alone** — provide aria-labels too

## Don'ts

- ❌ Repeat the visible label
- ❌ Include links (not interactive)
- ❌ Exceed ~150 characters
- ❌ Use for form validation errors
- ❌ Use "Click to..." — just describe the action

## Common Fixes

| Original | Fixed | Why |
|----------|-------|-----|
| "Click to open settings" | "Settings" | Don't instruct, just name |
| "Save" (tooltip on Save button) | Remove tooltip | Don't repeat the label |
| "This button sorts items by date" | "Sort by date" | Be brief, no "this button" |
| "Click here to learn more about this feature and how it works" | "Learn more about this feature" | Under 150 chars, no "click here" |
