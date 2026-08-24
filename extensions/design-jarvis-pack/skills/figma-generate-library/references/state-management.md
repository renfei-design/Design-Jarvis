# State Management — Full Reference

Complete state management patterns for long-running design system builds.

---

## State Persistence

**Do NOT rely solely on conversation context for the state ledger.** Write it to a project-level file:

```
.github/skills/figma-generate-library/.dsb-state-{RUN_ID}.json
```

Re-read this file at the start of every turn. In long workflows, conversation context will be truncated — the file is the source of truth.

**Note:** Use the project directory for state files, never `/tmp`.

---

## State Ledger Format

```json
{
  "runId": "ds-build-2024-001",
  "phase": "phase3",
  "step": "component-button",
  "entities": {
    "collections": { "primitives": "id:...", "color": "id:..." },
    "variables": { "color/bg/primary": "id:...", "spacing/sm": "id:..." },
    "pages": { "Cover": "id:...", "Button": "id:..." },
    "components": { "Button": "id:..." }
  },
  "pendingValidations": ["Button:screenshot"],
  "completedSteps": ["phase0", "phase1", "phase2", "component-avatar"]
}
```

---

## Shared Plugin Data Tagging

Tag every created **scene node** immediately after creation:

```javascript
node.setSharedPluginData('dsb', 'run_id', RUN_ID);        // identifies this build run
node.setSharedPluginData('dsb', 'phase', 'phase3');        // which phase created it
node.setSharedPluginData('dsb', 'key', 'component/button');// unique logical key
```

**Note:** `getPluginData()` / `setPluginData()` are NOT supported in `use_figma`. Use `getSharedPluginData()` / `setSharedPluginData()` instead.

---

## Idempotency Check Patterns

Before every create, query by name + state ledger ID:

| Entity type | Idempotency key | How to check existence |
|-------------|----------------|----------------------|
| Scene nodes | `setSharedPluginData('dsb', 'key', value)` or unique name | `node.getSharedPluginData('dsb', 'key')` or `page.findOne(n => n.name === 'Button')` |
| Variables | Name within collection | `(await figma.variables.getLocalVariablesAsync()).find(v => v.name === name && v.variableCollectionId === collId)` |
| Styles | Name | `getLocalTextStyles().find(s => s.name === name)` |

If exists → skip or update. Never duplicate.

---

## Resume Protocol

At session start or after context truncation:

1. Run a read-only `use_figma` to scan all pages, components, variables, and styles by name — reconstruct the `{key → id}` map
2. Re-read the state file from disk if available
3. Resume from the last completed step in the state ledger

**Continuation prompt** (give this to the user when resuming in a new chat):
> "I'm continuing a design system build. Run ID: {RUN_ID}. Load the figma-generate-library skill and resume from the last completed step."

---

## Token Architecture Details

### Standard Pattern (50–200 tokens — recommended starting point)

```
Collection: "Primitives"    modes: ["Value"]
  blue/500 = #3B82F6, gray/900 = #111827, ...

Collection: "Color"         modes: ["Light", "Dark"]
  color/bg/primary → Light: alias Primitives/white, Dark: alias Primitives/gray-900
  color/text/primary → Light: alias Primitives/gray-900, Dark: alias Primitives/white

Collection: "Spacing"       modes: ["Value"]
  spacing/xs = 4, spacing/sm = 8, spacing/md = 16, ...
```

### Complexity Tiers

| Complexity | Pattern |
|-----------|---------|
| < 50 tokens | Single collection, 2 modes (Light/Dark) |
| 50–200 tokens | **Standard**: Primitives (1 mode) + Color semantic (Light/Dark) + Spacing (1 mode) + Typography (1 mode) |
| 200+ tokens | **Advanced**: Multiple semantic collections, 4–8 modes (Light/Dark × Contrast × Brand). See M3 pattern in `references/token-creation.md` |
