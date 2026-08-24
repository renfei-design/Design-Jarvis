# Confirmation Dialogs

Rules for confirmation and destructive dialog content in product UI.

## When to Use

- Confirming destructive or irreversible actions (delete, discard, remove)
- Actions with significant consequences
- NOT for routine confirmations — use toasts instead

## Dialog Structure

```
┌─────────────────────────────────────────────┐
│  Title (question format)                    │
│                                             │
│  Body text explaining consequences          │
│                                             │
│               [Cancel]  [Action]            │
└─────────────────────────────────────────────┘
```

## Writing Rules

### Titles

- **Question format** — "Delete report?" not "Delete"
- **Include item context** — "Delete Sales Report?" not just "Delete?"
- **Sentence case** — "Delete report?" not "Delete Report?"
- **No periods** — Question marks only
- **No "Are you sure?"** — The dialog already implies confirmation

### Body

- **State consequences clearly** — What exactly will happen
- **Mention permanence** — "This can't be undone" if applicable
- **Keep brief** — 1–2 sentences
- **Lead with consequences** — If there are important side effects, state them first

### Buttons

- **Name the action** — "Delete" not "Yes" or "OK"
- **Primary = the action being confirmed** — "Delete", "Discard"
- **Secondary = safe option** — Usually "Cancel" or "Keep editing"
- **No "Yes/No"** — Always use specific verbs
- **Sentence case** — "Delete" not "DELETE"
- **1–2 words** — A single verb is usually best

## Examples

### Delete item

```
Title: Delete "Sales Report"?
Body: This report and its data will be permanently removed. This can't be undone.
Buttons: [Cancel] [Delete]
```

### Discard changes

```
Title: Discard unsaved changes?
Body: Your changes haven't been saved. If you leave now, they'll be lost.
Buttons: [Keep editing] [Discard]
```

### Remove member

```
Title: Remove Alex Johnson?
Body: They'll lose access to this workspace and all its items.
Buttons: [Cancel] [Remove]
```

### Sign out

```
Title: Sign out?
Body: Any unsaved changes will be lost.
Buttons: [Cancel] [Sign out]
```

## Don'ts

- ❌ "Are you sure you want to delete this item?" — Too vague + "Are you sure"
- ❌ "Yes" / "No" buttons — Not descriptive
- ❌ "OK" to confirm destructive action — Name the action
- ❌ Long body text — Keep to 1–2 sentences
- ❌ Multiple destructive actions in one dialog

## Common Fixes

| Original | Fixed | Why |
|----------|-------|-----|
| "Are you sure you want to delete this?" | "Delete 'Sales Report'?" + "This can't be undone." | Specific title, clear consequence |
| Buttons: "Yes" / "No" | Buttons: "Delete" / "Cancel" | Name the action |
| "OK" button in delete dialog | "Delete" button | Be specific |
| "Do you really want to leave? All progress will be discarded." | "Discard unsaved changes?" + "Your changes haven't been saved." | Question title, brief body |
