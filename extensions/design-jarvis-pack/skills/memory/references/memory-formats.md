# Memory File Formats

Canonical templates for the Design Jarvis Core + Archive memory system.

---

## Project Directory

```text
.jarvis/memory/projects/<slug>/
├── memory.md
├── manifest.json
├── decisions.md
├── artifacts.json
├── sessions/
└── archive/
```

---

## `memory.md` — Core Memory

Target 80-120 lines; hard max 150. Keep current state only.

```markdown
# <Project Name> — Memory

## Overview
One short paragraph describing the project and why it exists.

## Current Focus
- What is actively being worked on now.

## Constraints
- Product, design-system, accessibility, technical, or process constraints.

## Active Decisions Summary
- D1: Short decision summary.
- D2: Short decision summary.

## Key Artifacts
- Figma: file/page/node references.
- Specs/prototypes/code: paths or URLs.

## Recent Outcome
- Most recent durable result.

## Next Step
- The next meaningful action.

## Pointers
- Decisions: `decisions.md`
- Sessions: `sessions/`
- Artifacts: `artifacts.json`
```

---

## `manifest.json` — Retrieval Metadata

Keep valid JSON. Use it as a routing table, not a prose summary.

```json
{
  "schemaVersion": 1,
  "slug": "project-slug",
  "name": "Project Name",
  "updated": "YYYY-MM-DD",
  "topics": ["topic-a", "topic-b"],
  "activeDecisionIds": ["D1", "D2"],
  "importantFiles": ["memory.md", "decisions.md", "artifacts.json"],
  "sessionCount": 1,
  "artifactFile": "artifacts.json",
  "consolidation": {
    "keepSessions": 5,
    "archiveAfter": 8,
    "staleDecisionDays": 30,
    "coreSoftLimit": 130
  }
}
```

The `consolidation` block is optional; the routine falls back to the same defaults when it is
absent. Include it only when a project needs different thresholds.

---

## `decisions.md` — Decision Log

All decisions live in this file. Lifecycle is tracked by `Status`; do not move
superseded decisions to a separate file.

Allowed statuses: `Draft`, `Active`, `Under Review`, `Superseded`, `Retired`.

```markdown
# Decisions

### D1: Decision title
**Status:** Active
**Date:** YYYY-MM-DD
**Topic:** navigation
**Context:** Why this decision was needed.
**Decision:** What was decided.
**Rationale:** Why this path was chosen.
**Impact:** What artifacts or behaviors this affects.

### D2: Prior decision
**Status:** Superseded
**Superseded by:** D5
**Date:** YYYY-MM-DD
**Topic:** layout
**Context:** ...
**Decision:** ...
**Rationale:** ...
```

---

## `artifacts.json` — Durable References

Prefer structured IDs and paths over prose.

```json
{
  "schemaVersion": 1,
  "updated": "YYYY-MM-DD",
  "figma": [
    {
      "name": "Primary design file",
      "fileKey": "abc123",
      "pages": [
        { "name": "Main flow", "nodeId": "1:2", "status": "active" }
      ]
    }
  ],
  "repo": {
    "specs": [],
    "prototypes": [],
    "code": []
  }
}
```

---

## Session Summary

Store in `sessions/YYYY-MM-DD.md`. Max 80 lines.

```markdown
# Session: YYYY-MM-DD

## Outcome
- What changed or was delivered.

## Decisions
- D1: Decision title (Active)

## Artifacts
- Figma/file/path references.

## Open Questions
- Question or blocker.

## Next Step
- One concrete next action.
```

---

## Archive

Use `archive/` for old context snapshots, compressed historical notes, and raw traces.
Optional Figma write logs go under `archive/auto-log/YYYY-MM-DD.md`, one short line
per write action.

---

## Consolidation Report

Emitted at the end of every consolidation pass. Keep it compact — it is a summary for the
designer, not a log.

```markdown
## Memory Consolidation — <slug> — YYYY-MM-DD
- Sessions: 12 → 5 kept verbatim, 7 archived to archive/sessions-202605.md
- Decisions: D3 flagged Under Review (age 41d); D2 → Superseded by D7
- memory.md: 168 → 121 lines (overflow moved to sessions/2026-06-01.md)
- Metadata: manifest.json revalidated; sessionCount 12 → 5; activeDecisionIds [D7, D8]
- No data lost — full history in archive/
```

Optionally append the same summary to `archive/auto-log/YYYY-MM-DD.md`.

---

## Sessions Rollup

When the sessions pass archives old summaries, append them under a dated month file
`archive/sessions-YYYYMM.md`, newest first, compacted to outcomes + decisions only.

```markdown
# Archived sessions — YYYY-MM

## YYYY-MM-DD
- Outcome: one-line summary.
- Decisions: D4 (Active), D5 (Superseded by D7).

## YYYY-MM-DD
- Outcome: one-line summary.
```

---

## Tool Usage Patterns

### Start a project session

```text
read_file(".jarvis/memory/projects/my-project/memory.md")
```

### Find deeper context

```text
read_file(".jarvis/memory/projects/my-project/manifest.json")
grep_search("checkpoint", includePattern: ".jarvis/memory/projects/my-project/**")
```

### Log a decision

Append a new `D#` entry to `decisions.md`, then update `manifest.json` if the active
decision set or topics changed.

### Save a session

Write `sessions/YYYY-MM-DD.md`, update `memory.md`, and refresh `manifest.json`.
