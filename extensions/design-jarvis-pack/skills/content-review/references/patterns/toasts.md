# Toast Notifications

Rules for toast notification content in product UI.

## Purpose

Toasts are brief, transient confirmations that auto-dismiss. Use for non-critical status updates.

## Toast Formula

```
[Item/Noun] [past-tense verb].
```

### Examples

- ✅ "Settings saved."
- ✅ "File uploaded."
- ✅ "Pipeline started."
- ✅ "Item deleted."
- ❌ "Your settings have been successfully saved to the system."
- ❌ "The file you selected has been uploaded."

## Writing Rules

### Titles

- **Noun + past-tense verb** — "Report saved" not "Saved report"
- **Sentence case** — "Connection created" not "Connection Created"
- **Brief** — 3–5 words maximum
- **No periods** — Unless followed by body text
- **No exclamation points** — "Copied" not "Copied!"
- **No "successfully"** — It's implied by the toast

### Body Text (optional)

- **Only include if it adds value** — Most toasts don't need body text
- **Brief** — One sentence, under 100 characters
- **Actionable** — Tell user what to do next
- **Sentence case with period**

### Actions (optional)

- **Use sparingly** — Not every toast needs an action
- **Single action** — One button maximum
- **Clear label** — "View report" not "Click here"
- **Verb-first** — "View", "Open", "Undo"

## Duration

| Type | Duration | Use for |
|------|----------|---------|
| Standard | 5–10 seconds | Confirmations |
| Progress | Until complete | File uploads, long operations |
| Error | Until dismissed | Non-blocking errors |

## Don'ts

- ❌ Use for critical information (use message bars or dialogs)
- ❌ Include "successfully" — "Saved" not "Successfully saved"
- ❌ Show multiple toasts at once (queue them)
- ❌ Use for required user actions (use dialogs)
- ❌ Include long explanations

## Common Fixes

| Original | Fixed | Why |
|----------|-------|-----|
| "Your settings have been successfully saved" | "Settings saved" | Brief, no "successfully" |
| "Saved!" | "Settings saved" | No exclamation, add context |
| "The file was uploaded to the workspace" | "File uploaded" | Brief |
| "Success! Your pipeline has started running" | "Pipeline started" | No "success", brief |
