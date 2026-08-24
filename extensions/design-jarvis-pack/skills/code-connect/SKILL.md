---
name: code-connect
description: Connects Figma design components to code components using Code Connect mapping tools. Use when user says "code connect", "connect this component to code", "map this component", "link component to code", "create code connect mapping", or wants to establish mappings between Figma designs and code implementations. For canvas writes via `use_figma`, use `figma-use`.
disable-model-invocation: false
---

# Code Connect Components

## Overview

This skill connects Figma design components to their corresponding code implementations using Figma's Code Connect feature. It analyzes the Figma design structure, searches the codebase for matching components, and establishes mappings that maintain design-code consistency.

**Project context**: inspect the current repository and design system before proposing mappings.

## Skill Boundaries

- Use this skill for `get_code_connect_suggestions` + `send_code_connect_mappings` workflows.
- For writing to the Figma canvas with Plugin API scripts, use [figma-use](../figma-use/SKILL.md).
- For building full-page screens from code or a description, use [hifi-design](../hifi-design/SKILL.md).

## Prerequisites

- Figma MCP server connected and accessible
- Figma URL with node ID: `https://figma.com/design/:fileKey/:fileName?node-id=1-2` (required)
  - **OR** `figma-desktop` MCP: user selects node in Figma desktop (no URL needed)
- **Components must be published to a team library.** Code Connect only works with published components.
- **Code Connect requires Organization or Enterprise plan.**
- Access to the project codebase for component scanning

## Required Workflow

Follow these steps in order. Do not skip steps.

### Step 1: Get Code Connect Suggestions

Call `get_code_connect_suggestions` to identify all unmapped components in one operation.

**Option A — `figma-desktop` MCP (no URL):** Call `get_code_connect_suggestions` immediately. The server uses the currently selected node.

**Option B — Figma URL provided:** Parse the URL, convert node ID format (`1-2` → `1:2`), then call:
```
get_code_connect_suggestions(fileKey=":fileKey", nodeId="1:2")
```

Handle the response:
- "No published components found" → inform user; components need to be published first.
- "All components already connected" → inform user; nothing to do.
- Otherwise → list of unmapped components with names, node IDs, properties, and thumbnails.

### Step 2: Scan Codebase for Matching Components

For each unmapped component, search the codebase for a match. Look for:
- Files with matching or similar names in `src/components/`, `components/`, `ui/`, etc.
- Props that correspond to Figma properties (variants, text, styles)
- Component structure that aligns with Figma hierarchy

If multiple candidates match equally, pick the closest prop-interface match and note your reasoning.

### Step 3: Present Matches to User

```
The following components match the design:
- `ComponentName` (`path/to/component`): `DesignComponentName` at node ID `nodeId` (`figmaUrl?node-id=X-Y`)

Would you like to connect these components? You can accept all, select specific ones, or skip.
```

If no exact match: show 2 closest candidates with differences. Let the user decide.

### Step 4: Create Code Connect Mappings

Call `send_code_connect_mappings` with only the accepted mappings:

```
send_code_connect_mappings(
  fileKey=":fileKey",
  nodeId="1:2",
  mappings=[
    { nodeId: "1:2", componentName: "Button", source: "src/components/Button.tsx", label: "React" },
    { nodeId: "1:5", componentName: "Card", source: "src/components/Card.tsx", label: "React" }
  ]
)
```

**Valid `label` values:** React, Web Components, Vue, Svelte, Storybook, Javascript, Swift UIKit, Objective-C UIKit, SwiftUI, Compose, Java, Kotlin, Android XML Layout, Flutter, Markdown.

Provide a summary after processing:
```
Code Connect Summary:
- Successfully connected: 3
  - Button (1:2) → src/components/Button.tsx
- Could not connect: 1
  - CustomWidget (1:10) - No matching component found
```

> Full worked examples, common issues, best practices, and troubleshooting → [references/examples.md](references/examples.md)
