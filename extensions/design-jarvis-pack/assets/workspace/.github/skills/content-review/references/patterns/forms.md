# Forms

Rules for form content including labels, placeholders, validation, and helper text.

## Form Field Anatomy

```
[Label] *
[Input field with placeholder]
[Helper text]
[Error message (when invalid)]
```

## Labels

### Writing Rules

- **Sentence case** — "Email address" not "Email Address"
- **Brief** — 1–4 words
- **No colon** — "Email address" not "Email address:"
- **Required indicator** — Add * for required fields

### Examples

- ✅ "Email address *"
- ✅ "Display name"
- ✅ "Phone number (optional)"
- ❌ "Enter Your Email Address Here:"

## Placeholders

### Writing Rules

- **Show example format** — Not instructions
- **Brief** — Must fit in input field
- **Don't use as label** — Placeholders disappear when typing

### Examples

- ✅ "name@example.com"
- ✅ "Search workspaces"
- ✅ "MM/DD/YYYY"
- ❌ "Enter your email address here"
- ❌ "Type something..."

## Helper Text

Appears below input field. Stays visible while typing.

### Writing Rules

- **Brief** — Under 100 characters
- **Adds value beyond the label** — Don't restate the label
- **Complete sentences with period**

### Examples

- ✅ "Use at least 8 characters with a number and symbol."
- ✅ "This is how others will see you."
- ❌ "Enter your name" (restates the label)

## Validation / Error Messages

Inline messages that appear when a field is invalid. See `error-messages.md` for full rules.

### Rules

- **Specific** — Say what's wrong and how to fix it
- **Sentence case** — "Enter a valid email address"
- **No exclamation points** — "Enter a valid email" not "Invalid!"
- **Appear immediately** — On blur or submit

### Examples

- ✅ "Enter a valid email address"
- ✅ "Name must be 3–50 characters"
- ✅ "Select at least one option"
- ❌ "Invalid"
- ❌ "Error"
- ❌ "This field is required" (vague)

## Checkbox and Radio Labels

- **Sentence case**
- **Positive framing** — State what happens when selected
- **Parallel construction** — Keep labels consistent in groups

### Examples

```
Checkboxes:
☑ Send me email updates
☑ Share usage data to help improve the product

Radio buttons:
○ Keep a copy in my workspace
○ Move to the new location
○ Create a shortcut
```

## Dropdown / Select Fields

### Label

- ✅ "Country/region *"

### Placeholder option

- ✅ "Select a country/region"

### Options

- Sentence case
- Alphabetical order (when logical)
- Most common options first (when appropriate)

## Button Labels in Forms

| Action | Button Label |
|--------|--------------|
| Submit new item | Create |
| Save changes | Save |
| Cancel and close | Cancel |
| Next step | Next |
| Previous step | Back |
| Final step | Finish |

## Common Fixes

| Original | Fixed | Why |
|----------|-------|-----|
| "Enter Your Email Address Here:" | "Email address *" | Sentence case, no colon, brief |
| "This field is required" | "Enter a name" | Specific |
| "Invalid" | "Enter a valid email address" | Specific guidance |
| "Type something..." | "Search workspaces" | Show purpose, not instruction |
