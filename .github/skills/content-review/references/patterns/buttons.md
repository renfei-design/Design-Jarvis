# Button Labels

Rules for button text in product UI.

## Core Principles

1. **Lead with verbs** — Start with action words
2. **Be specific** — Say what happens, not just "OK"
3. **Use sentence case** — "Save changes" not "Save Changes"
4. **Keep it short** — 1–3 words
5. **One button = one action** — Don't launch two actions from one button

## Standard Patterns

### Single-word actions

| Action | Use for |
|--------|---------|
| Save | Persist changes |
| Delete | Remove permanently |
| Cancel | Exit without changes |
| Close | Dismiss dialog/panel |
| Apply | Apply without closing |
| Copy | Duplicate item |
| Edit | Modify existing item |

### Verb + Noun pattern

Use when a single verb is ambiguous:

- ✅ "Save report", "Delete workspace", "Export data", "Import file"
- ❌ "OK", "Yes", "Submit", "Click here"

## New vs Add vs Create

| Word | When to use |
|------|-------------|
| **New** | Creating something from scratch (New report, New workspace) |
| **Add** | Adding to existing collection (Add member, Add column) |
| **Create** | Generating/producing something (Create from template) — prefer "New" when possible |

## Confirmation Actions (Destructive Dialogs)

| Scenario | Primary | Secondary |
|----------|---------|-----------|
| Delete item | Delete | Cancel |
| Discard changes | Discard | Keep editing |
| Remove member | Remove | Cancel |
| Sign out | Sign out | Cancel |

**Rule:** Primary button names the action — never use generic "OK" or "Yes."

## Cancel vs Close

| Word | When to use |
|------|-------------|
| **Cancel** | Abandoning in-progress action |
| **Close** | Dismissing completed view or information panel |

## Formatting Rules

- **Sentence case** — "Save changes" not "Save Changes"
- **No periods** — "Save" not "Save."
- **No exclamation points** — "Save" not "Save!"
- **No articles** — "Delete folder" not "Delete the folder"
- **Ellipsis (...)** — Only when button opens a dialog needing more input: "Save as...", "Export to..."

## Don'ts

- ❌ "Click here" — the button implies clicking
- ❌ "Please save" — no "please"
- ❌ "Submit" — too generic; use a specific action
- ❌ "Commit changes" — jargon; use "Save"

## Button Pairs

| Primary | Secondary |
|---------|-----------|
| Save | Cancel |
| New | Cancel |
| Delete | Cancel |
| Apply | Close |
| Continue | Back |
| Next | Previous |
| Finish | Cancel |

## Layout & Placement

- **Dialogs/panels** — Right-align buttons
- **Single-page forms** — Left-align buttons
- **Primary button on the left**, secondary to its right
- **One primary button per view** (theme color)
- **Don't set focus on destructive buttons** — default focus on "Save" or "Cancel"
- **Don't use buttons for navigation** — use links (exception: "Back"/"Next" in wizards)

## Common Fixes

| Original | Fixed | Why |
|----------|-------|-----|
| "Click Here To Generate Your Report Now!" | "Generate report" | Verb-first, sentence case, no "click here" |
| "OK" (in delete dialog) | "Delete" | Name the action |
| "Yes" / "No" | "Delete" / "Cancel" | Use specific verbs |
| "Submit" | "Save" or "Create" | Be specific |
| "Save Changes." | "Save changes" | No period, sentence case |
