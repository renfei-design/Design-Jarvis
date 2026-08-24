# Workflow diagram starters

Reusable starters for the `workflow-diagram` skill. Copy these into `projects/<slug>/diagrams/` before editing.

## Files

| File | Use |
|---|---|
| `feature-workflow.mmd` | Product or UX workflow with decisions and recovery paths |
| `ux-state-flow.mmd` | UI state transitions such as empty/loading/error/success |
| `decision-tree.mmd` | Branching business or product logic |
| `data-pipeline-flow.mmd` | Data movement across product and service stages |
| `agent-orchestration-flow.mmd` | Design Jarvis or AI-agent routing workflows |
| `sequence-flow.mmd` | Actor/system handoffs over time |
| `preview.html` | Single-file Mermaid preview shell |

## Use

1. Copy a `.mmd` starter into `projects/<slug>/diagrams/<name>.mmd`.
2. Replace sample nodes with the project flow.
3. Copy `preview.html` to `projects/<slug>/diagrams/<name>.html`.
4. Replace `{{...}}` placeholders.
5. Keep Mermaid source as the editable source of truth.
