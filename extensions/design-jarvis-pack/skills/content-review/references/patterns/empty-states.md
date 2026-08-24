# Empty States

Rules for empty state content in product UI.

## Types of Empty States

| Type | When | Example |
|------|------|---------|
| **First-use** | User first encounters feature with no content | "No pipelines yet" |
| **User-cleared** | User removed all content | "No saved reports" |
| **No results** | Search/filter returns nothing | "No results found" |
| **Error** | Error prevents content display | "Unable to load data" |

## Anatomy

Every empty state can include:

1. **Illustration** (optional) — Visual context
2. **Title** — Main message, sentence case, no period
3. **Body** (optional) — Short explanation, 1–2 sentences
4. **Primary action** (optional) — Clear next step button
5. **Secondary action** (optional) — Link for more info

## Writing Rules

### Titles

- **Sentence case** — "No pipelines yet" not "No Pipelines Yet"
- **No period** at the end
- **Brief** — 5 words or fewer if possible
- **State the situation** — "No results found" not "Oops!"

### Body

- **1–2 sentences** — Keep it short
- **Actionable** — Tell users what they can do, not just what's missing
- **Don't restate the title** — Add new information
- **Focus on what users can do** — Not on what's missing

### Button Labels

- **Clear call to action** — "Create pipeline" not "Get started"
- **Directly respond to the title** — Title: "No pipelines" → Button: "Create pipeline"
- **Verb-first** — See `buttons.md` for full rules

## Examples by Type

### First-use

```
Title: No pipelines yet
Body: Create a pipeline to move and transform your data.
Button: Create pipeline
```

### User-cleared

```
Title: No saved reports
Body: Create a new report to analyze your data.
Button: Create report
```

### No results (search/filter)

```
Title: No results found
Body: Try adjusting your filters or search terms.
Button: Clear filters
```

### No access

```
Title: You don't have access
Body: Ask a workspace admin for permission to view this content.
Button: Request access
```

### Error state

```
Title: Something went wrong
Body: We couldn't load your data. Try again, or contact support if the problem continues.
Button: Try again
```

## Tone Guidelines

- **Be helpful**, not apologetic
- **Avoid blame** — Never imply user error
- **Focus on the solution**, not the problem
- **Keep it brief** — Users want to move forward

## Don'ts

- ❌ "No data" or "Empty" without further guidance
- ❌ Too many actions (ideally one primary action)
- ❌ Illustrations that don't relate to the context
- ❌ Blank areas without explanation
- ❌ Technical jargon

## Common Fixes

| Original | Fixed | Why |
|----------|-------|-----|
| "No data available." | "No reports yet. Create your first report to start analyzing your data." | Add guidance + action |
| "Empty" | "No items yet. Add items to get started." | Be helpful |
| "0 results" | "No results found. Try adjusting your search." | Human-readable + next step |
| "Nothing to show." | "No pipelines yet. Create a pipeline to move and transform your data." | Specific + actionable |
