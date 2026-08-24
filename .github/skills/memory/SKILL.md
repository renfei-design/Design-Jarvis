---
name: memory
description: >
  Manage Design Jarvis's persistent project memory — compact project state, decision logs,
  session summaries, artifact references, and cross-project preferences/patterns.
  Use when asked to log a decision, save context, summarize a session, look up prior
  decisions, initialize project memory, or check what was done last session.
---

# Skill: Memory System

> Manage Design Jarvis persistent memory with a **Core + Archive** model: keep the small,
> durable project state in context and search/load deeper history only when needed.

## Purpose

Memory lets Jarvis accumulate project-specific intelligence across sessions without
polluting every turn with stale history. The system separates:

- **Core memory** — current working context that should fit in a small prompt block.
- **Structured metadata** — machine-readable pointers for retrieval and maintenance.
- **Archive memory** — decisions, sessions, raw traces, and older notes loaded on demand.

## Architecture: Core + Archive

Only `memory.md` should be loaded automatically at project start. Use `manifest.json`
to decide what else to read or search.

| Layer | Files | When loaded | Budget |
|---|---|---|---|
| **Core** | `memory.md` | First for the active project | Target 80-120 lines, hard max 150 |
| **Metadata** | `manifest.json`, `artifacts.json` | When routing/retrieving context or updating memory | Small, valid JSON |
| **Archive** | `decisions.md`, `sessions/`, `archive/` | Targeted read/search only | Unlimited; compact over time |

**Loading discipline:**
1. Read `.jarvis/memory/projects/<slug>/memory.md`.
2. Read `manifest.json` if you need file pointers, topics, or decision IDs.
3. Search or read archive files only when the task needs deeper history.
4. Never eagerly load all sessions, decisions, or raw traces.

## Directory Structure

```
.jarvis/
└── memory/
    ├── projects/
    │   └── <project-slug>/
    │       ├── memory.md          ← CORE: compact current state
    │       ├── manifest.json      ← metadata for retrieval and maintenance
    │       ├── decisions.md       ← status-based decision log
    │       ├── artifacts.json     ← Figma/code/spec references
    │       ├── sessions/          ← concise session summaries
    │       └── archive/           ← old context, raw traces, compressed notes
    ├── preferences.md             ← user style + workflow preferences
    ├── patterns.md                ← cross-project design patterns
    └── library-cache/             ← reusable library/component references
```

## File Responsibilities

### `memory.md` — Core project state

Keep this current, compact, and useful at session start. It is not a changelog.

Recommended sections:
- Project overview
- Current focus
- Constraints
- Active decisions summary
- Key artifacts
- Recent outcome
- Next step
- Deep links / pointers

### `manifest.json` — Retrieval metadata

Use valid JSON so tools can parse it. Keep it small:

```json
{
  "schemaVersion": 1,
  "slug": "project-slug",
  "updated": "YYYY-MM-DD",
  "topics": ["topic-a", "topic-b"],
  "activeDecisionIds": ["D1"],
  "importantFiles": ["memory.md", "decisions.md"],
  "sessionCount": 0,
  "artifactFile": "artifacts.json"
}
```

### `decisions.md` — Status-based decision log

Store all decisions in one file. Do not move decisions between active/archive files.
Use status fields instead.

Allowed statuses:
`Draft`, `Active`, `Under Review`, `Superseded`, `Retired`.

### `artifacts.json` — External references

Track durable references such as Figma files, pages, nodes, specs, prototypes, and
code deliverables. Prefer IDs and paths over prose.

### `sessions/` and `archive/`

Session summaries are episodic memory. Raw traces and older details belong in
`archive/`, including `archive/auto-log/YYYY-MM-DD.md` for optional Figma write logs.

## Memory Operations

### Session start

1. Identify the active project slug.
2. Read `memory.md`.
3. If the request depends on prior decisions/artifacts, read `manifest.json`.
4. Search or read specific archive files only when pointed to by `memory.md`,
   `manifest.json`, or the user's request.

### During a session

- **Durable project state changed** → update `memory.md`.
- **Decision made or changed** → append/update an entry in `decisions.md`; refresh
  `manifest.json.activeDecisionIds`.
- **Artifact created or renamed** → update `artifacts.json` and `manifest.json`.
- **User preference learned** → update root `preferences.md`.
- **Reusable pattern learned** → update root `patterns.md`.

### Session end

1. Write a concise summary to `sessions/YYYY-MM-DD.md`.
2. Update `memory.md` with current focus, recent outcome, and next step.
3. Refresh `manifest.json` (`updated`, topics, active decisions, session count,
   important files).
4. Compact old sessions into `archive/` when they stop being useful individually.

### Consolidation

Consolidation is a periodic, **file-only** maintenance pass that keeps memory lean and
background-safe. It is **idempotent** (running twice changes nothing the second time) and
**non-destructive** (history is *moved* to `archive/`, never deleted; decisions change status,
never disappear).

**Thresholds** — read from `manifest.json.consolidation`, falling back to these defaults when
the key is absent:

| Key | Default | Meaning |
|---|---:|---|
| `keepSessions` | 5 | Session summaries kept verbatim in `sessions/` |
| `archiveAfter` | 8 | Run the sessions pass once `sessions/` exceeds this count |
| `staleDecisionDays` | 30 | `Active` decisions older than this are flagged `Under Review` |
| `coreSoftLimit` | 130 | `memory.md` line count that triggers compaction (hard max 150) |

**Steps:**
1. **Load** `memory.md` and `manifest.json` (plus the `consolidation` thresholds).
2. **Sessions pass** — if the `sessions/` count exceeds `archiveAfter`, keep the newest
   `keepSessions` verbatim and append the rest to `archive/sessions-YYYYMM.md` (grouped by each
   session's own year-month), then delete the rolled-up files. Dedupe repeated outcomes during
   the roll-up.
3. **Decisions pass** — in `decisions.md`: flag `Active` entries older than `staleDecisionDays`
   as `Under Review` with a dated note; when a newer decision shares a `Topic`, mark the older
   one `Superseded` + `Superseded by: D#`; compact `Retired`/`Superseded` bodies to a one-line
   stub (ID, title, status, link).
4. **Core budget pass** — if `memory.md` exceeds `coreSoftLimit` lines, move overflow detail
   into the current session summary or `archive/`, keeping the canonical sections intact.
5. **Metadata** — revalidate `manifest.json` and `artifacts.json` as JSON; refresh `updated`,
   `sessionCount`, `activeDecisionIds`, and `importantFiles`.
6. **Report** — emit a consolidation report (template in
   [references/memory-formats.md](references/memory-formats.md)) summarizing what moved, what was
   flagged, and confirming no data was lost.

**Triggers:** manual ("consolidate memory"), budget-driven (at session end when `sessions/`
exceeds `archiveAfter` or `memory.md` exceeds `coreSoftLimit`), or autonomous in a background run.

## Size Budgets

| File | Max | Action when exceeded |
|---|---:|---|
| `memory.md` | 150 lines | Compress older details into `sessions/` or `archive/` |
| `manifest.json` | 80 lines | Remove verbose descriptions; keep pointers only |
| `decisions.md` | No hard max | Search/read targeted decisions; compact retired details if needed |
| session summary | 80 lines | Summarize outcomes, decisions, open questions, next step |

## Behavioral Rules

1. **Core stays small.** `memory.md` is the only default load and must remain compact.
2. **Status beats file moves.** Decisions live in `decisions.md`; lifecycle is tracked
   with status fields.
3. **Metadata stays valid.** `manifest.json` and `artifacts.json` must be valid JSON.
4. **Search before loading archives.** Use targeted search for old context.
5. **No sensitive data.** Memory may exist on disk or be committed in examples; do not
   store secrets, credentials, personal data, or private customer details.
6. **Graceful degradation.** If memory files do not exist, initialize the core files.
7. **Tell the user.** Briefly mention when memory is loaded, saved, or migrated.

> Full templates and examples → [references/memory-formats.md](references/memory-formats.md)
