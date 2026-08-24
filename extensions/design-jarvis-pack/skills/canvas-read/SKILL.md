---
name: canvas-read
description: >
  Read and understand the current Figma canvas to build deep context before responding.
  Use when asked to read, look at, analyze, describe, or understand the canvas, Figma file,
  design, or selection. Also use proactively before any task that references existing
  canvas content — wireframe feedback, design review, content extraction, or iteration.
---

# Canvas Reader

Scan the current Figma canvas to build visual + structural context.
**Goal:** understand what's on the canvas so you can answer questions, give feedback, extract content, or plan next actions accurately.

## Core Principle: Screenshot First, Metadata Later

**ALWAYS get screenshots before diving into node trees.** Screenshots give you 90% of what you need. Metadata/node inspection should only be used for targeted lookups after you already know what you're looking for from the screenshot.

## Workflow

### Step 1 — Get Overview + Screenshots

1. Call `get_metadata` (with a fileKey and optionally a nodeId) to get the structural outline — frame names, node IDs, hierarchy.
2. Call `get_screenshot` for each key frame to see the visual content.

**Parse screenshots visually:** Read the UI content, identify components, layouts, text, interaction states — all from the image. You have strong vision capabilities. Use them.

**For large canvases (>10 frames):** Screenshot the first 10, then ask the user if they want to continue or focus on specific frames.

### Step 2 — Targeted Node Inspection (only when needed)

After screenshots, if you need specific node properties (fills, text content, dimensions):

- Use `use_figma` to inspect specific nodes by ID:
```js
const node = await figma.getNodeByIdAsync("NODE_ID");
return { name: node.name, type: node.type, width: node.width, height: node.height };
```

**Never scan the entire tree** — find targets visually in screenshots first, then inspect only what you need.

### Step 3 — Extract Text Content (conditional)

If you need exact text content too small to read in screenshots, use `use_figma` to traverse text nodes:

```js
const frame = await figma.getNodeByIdAsync("FRAME_ID");
const textNodes = frame.findAll(n => n.type === "TEXT").map(t => ({
  id: t.id, name: t.name, characters: t.characters, fontSize: t.fontSize
}));
return textNodes;
```

**Skip this step** if you can read the text from screenshots — you usually can.

## Output Format

Present a structured summary:

**For Flow/Screen Designs:**
```
**Canvas: [Page Name]**
[N] frames — [brief description]
| # | Frame | Description |
|---|-------|-------------|
| 1 | [name] | [what you see] |
```

**For Single Screen / Component:**
```
**[Frame Name]**
[Detailed description: layout, components, states, content]
```

## Editing Workflow

When the user asks you to change something on the canvas:
1. **Screenshot** — visually confirm what needs changing and where
2. **Get metadata** — `get_metadata` to find the node ID
3. **Inspect** — `use_figma` to read specific properties if needed
4. **Modify** — `use_figma` to make the edit

**Rule of thumb:** If you need more than 2 inspection calls to find your target, you're not using screenshots effectively.

## Token-Efficient Queries

The `figma` MCP returns large payloads by default. Apply these rules to keep context lean:

- **Always pass a `nodeId` to `get_metadata`** when you know the target — never let it traverse the full page.
- **Screenshots are visual primary, metadata is targeted lookup.** Don't fetch metadata "just to see what's there" — screenshot first.
- **Cache and reuse.** Component keys, frame IDs, file keys returned earlier in the session are valid for the rest of the session — never re-query.
- **Avoid `get_screenshot` polling.** Image responses are heavy. Use it once at start and once at major milestones.
- **In `use_figma` reads, return only the fields you need** — name + dimensions, not the full node JSON. Each unused field consumed is context wasted.

See `figma-use/SKILL.md` § 4a for the same rules applied to write workflows.

## Tips

- **Parallel screenshots are the #1 priority** — they give you 90% of context
- **Don't scan node trees for discovery** — use screenshots to discover, inspect only for IDs
- **Identify the product** — recognize the product, platform, and active design-system patterns
- **Read text in screenshots** — use your vision capabilities
- **Cache what you've learned** — don't re-scan frames you already screenshotted
