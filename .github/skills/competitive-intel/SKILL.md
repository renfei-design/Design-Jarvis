---
name: competitive-intel
description: Research competing and adjacent products using current public sources, then synthesize design implications.
---

# Competitive Intelligence

## Workflow

1. Define the product decision the research must inform.
2. Select 3–5 relevant products or adjacent examples based on audience, task, market, and interaction model.
3. Research current primary sources first: official documentation, product pages, changelogs, standards, and demos.
4. Add independent sources only when needed for usability evidence, adoption context, or criticism.
5. Compare task model, information architecture, interaction pattern, system feedback, error recovery, accessibility, and pricing/permission boundaries when relevant.
6. Separate observed facts from inference.
7. Synthesize table stakes, differentiators, gaps, risks, and a recommendation.

## Evidence rules

- Cite direct URLs and access dates.
- Prefer current primary sources for product behavior.
- Mark behavior inferred from marketing screenshots or secondary reports.
- Do not use private company sources unless the user supplied and authorized them.
- Respect source copyright; summarize rather than reproducing long passages.

## Deliverable

Save durable research under `projects/<slug>/research/` when requested.

```markdown
# Competitive research: <decision>

## Recommendation
...

## Comparison
| Product | Task model | Strength | Weakness | Evidence |

## Table stakes
...

## Differentiators
...

## Gaps and opportunities
...

## Design implications
...

## Sources and confidence
...
```
