# Message Bars

Rules for message bar content in product UI.

## Message Types

| Type | Use for | Icon |
|------|---------|------|
| **Info** | Neutral information, tips | ℹ️ |
| **Success** | Completed actions, positive status | ✓ |
| **Warning** | Potential issues, caution | ⚠️ |
| **Error** | Problems requiring attention | ✗ |
| **Blocked** | Action prevented, permissions | 🚫 |

## Content Structure

```
[Icon] [Title (optional)] [Body message] [Action (optional)] [Dismiss]
```

### Components

- **Title** — Optional bold summary (under 50 characters)
- **Body** — Main message (under 512 characters, ideally under 150)
- **Action** — Optional link or button (under 25 characters)
- **Dismiss** — X button to close (when appropriate)

## Character Limits

| Component | Limit |
|-----------|-------|
| Title | 50 characters |
| Body | 512 characters (150 ideal) |
| Action label | 25 characters |

## Writing Rules

### Titles

- **Specific, not generic** — "Almost out of storage" not "Warning"
- **Sentence case** — Capitalize first word only
- **No period**
- **Summarize the main information** — Connect to the action button

### Body

- **1–2 short sentences** — Concise and actionable
- **State the situation clearly** — What happened and what can be done
- **Link to docs if more explanation is needed** — Don't overload the message

### Actions

- **Links** — For supplementary info: "Learn more", "View details"
- **Buttons** — For primary actions that resolve the issue: "Retry", "Upgrade"
- **Never use "Click here"** — Describe the action
- **Link text starts with a verb** — "Learn more about storage" not "Storage info"

## Rules by Type

### Info

Neutral tips or context:

- ✅ "This report is refreshed daily at 8:00 AM."
- ✅ "You can pin frequently used items for quick access."

### Success

Confirm positive outcomes — **don't congratulate for ordinary actions**:

- ✅ "All changes saved."
- ✅ "Your changes were saved."
- ❌ "Congratulations! You successfully saved!" (don't say "successfully")

### Warning

Alert without blocking:

- ✅ "Your trial expires in 7 days. Upgrade to keep your data."
- ✅ "Your storage is 90% full. Delete unused items or upgrade your capacity."

### Error

Explain problems and solutions — **must include an action**:

- ✅ "Refresh failed. We couldn't connect to the data source. [Edit connection]"
- ✅ "Unable to save. You don't have permission to edit this workspace. [Request access]"

### Blocked

Explain why action is prevented — **persists until condition changes**:

- ✅ "You need admin permissions to change this setting. [Contact admin]"
- ✅ "This feature requires a a paid plan license. [Upgrade]"

## Dismissibility

| Type | Dismissible | Persistence |
|------|-------------|-------------|
| Info | Yes | Until dismissed |
| Success | Yes (often auto-dismiss) | Brief |
| Warning | Yes | Until dismissed |
| Error | Yes | Until resolved or dismissed |
| Blocked | No | Until condition changes |

## Common Fixes

| Original | Fixed | Why |
|----------|-------|-----|
| "Error: Something went wrong" | "Refresh failed. We couldn't connect to the data source." | Specific error + fix |
| "WARNING!!!" | "Your storage is 90% full." (warning type) | No all-caps, no exclamation |
| "Successfully completed!" | "All changes saved." | No "successfully" |
| "Please note that..." | Direct statement | No "please note" |
