# Error Messages

Rules for error messaging in product UI.

## Core Principles

1. **State what happened** — Be specific about the problem
2. **Explain why** — Help users understand the cause (if helpful)
3. **Tell what to do** — Provide a clear next step or recovery action
4. **No blame** — Never imply the user did something wrong
5. **No error codes alone** — Always include human-readable text

## Error Message Structure

```
[What happened]. [What to do next].
```

### Formula

- ✅ "Unable to save. Check your connection and try again."
- ✅ "Name already exists. Enter a different name."
- ❌ "Error 501"
- ❌ "Invalid input!"
- ❌ "You didn't enter a valid email address."

## Error Display Patterns

### Inline (field-level)

For form validation — appears below the invalid field:

- ✅ "Enter a valid email address"
- ✅ "Name must be 3–50 characters"
- ❌ "Invalid" (too vague)
- ❌ "Error: bad input" (technical + vague)

### Banner (page-level)

For system or page-wide errors — message bar at top:

- ✅ "We couldn't connect to the data source. Check your credentials and try again."
- ✅ "Unable to save. You don't have permission to edit this workspace."

### Toast (transient)

For brief, non-blocking errors:

- ✅ "Couldn't copy. Try again."

## Writing Rules

- **Sentence case** — "Unable to save" not "UNABLE TO SAVE"
- **Present tense** — "Can't connect" not "Couldn't have connected"
- **Active voice** — "We couldn't load your data" not "Your data couldn't be loaded"
- **Use contractions** — "can't", "couldn't", "don't"
- **No exclamation points** — Never in error messages
- **Avoid "please"** — "Try again" not "Please try again"
- **Avoid "sorry"** — Don't over-apologize

## Tone

- **Be helpful**, not apologetic
- **Avoid blame** — Never imply user error
- **Focus on the solution**, not the problem
- **Be specific** — Say exactly what went wrong

## Common Fixes

| Original | Fixed | Why |
|----------|-------|-----|
| "Error 404: Page not found. The page you were looking for could not be found on the server." | "Page not found. Check the address or return to the home page." | No error code, clear next step |
| "Invalid input!" | "Enter a valid email address" | Specific, no exclamation |
| "You failed to provide a valid name" | "Enter a name between 3 and 50 characters" | No blame, specific guidance |
| "Something went wrong" | "We couldn't load your data. Try again, or contact support if the problem continues." | Specific + next step |
| "Error" | "Unable to save. Check your connection and try again." | Never a bare "Error" |
