# Architecture

Design Jarvis separates a vendor-neutral core from optional runtime integrations.

```text
User request
    │
    ▼
Orchestrator ── routes by deliverable and risk
    │
    ├── Design Lead        direction and quality review
    ├── Product Designer   briefs, flows, UI, content, accessibility
    ├── UX Researcher      public evidence and synthesis
    ├── Front-End Engineer prototypes and implementation verification
    └── Design Ops         memory, decisions, and artifact tracking
            │
            ▼
      Reusable skills
            │
            ├── local files and project code
            ├── optional Figma integration
            ├── public web sources
            ├── project artifacts
            └── privacy-safe project memory
```

## Core layers

### Agents

Agent definitions describe role boundaries, routing, quality standards, and completion evidence. They do not assume an industry, company, design system, or cloud platform.

### Skills

Skills are task-specific Markdown playbooks. They can be reused independently and should prefer public standards, active project context, and configurable integrations.

### Artifacts

Deliverables live under `projects/<slug>/`. Shared starters provide neutral semantic tokens and small prototype/deck/diagram foundations.

### Memory

The Core + Archive model keeps current context in `memory.md` and retrieves decisions, sessions, and artifacts only when needed. Memory is local by default and excludes credentials, personal data, and proprietary customer content.

### Integrations

Figma is an optional adapter for canvas work. Other organizations can add connectors without changing the core agents, but no private connector is required by default.

### Evaluation

`evals/` validates agent routing, skill loading, tool discipline, artifact rules, memory behavior, and completion evidence. The goal-specific loop engine uses sourced rubrics and deterministic gates to prevent unverified completion claims.

## Design-system resolution

1. Explicit user or project configuration.
2. Existing code and design assets.
3. Project memory and prior decisions.
4. Neutral starter tokens.

This resolution order lets companies plug in their own system without forking core behavior.

## Extension packaging

The optional editor extension copies canonical agents, skills, loop files, and starters during `npm run sync-assets`. Generated copies must never become an independent source of truth.
