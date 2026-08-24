---
name: data-explore
description: Analyze user-provided or project-accessible datasets to ground product and UX decisions without assuming a specific analytics platform.
---

# Data Exploration

Use when a design or product decision needs quantitative evidence from CSV, TSV, JSON, SQL, spreadsheets, APIs, or another source the user has authorized.

## Workflow

1. Define the decision, metric, population, time window, and expected source.
2. Inspect the source schema and documentation before querying.
3. Check freshness, missingness, units, filters, denominator, sampling, and privacy constraints.
4. Run the smallest query that answers the question and preserve reproducible steps.
5. Validate surprising results with a second slice or independent calculation.
6. Explain what the data supports, what it does not support, and the implication for the design.

## Rules

- Never invent a metric or silently substitute training knowledge for unavailable data.
- Never upload private data to an external service without explicit authorization.
- Aggregate or redact personal data and report small-sample risks.
- Keep credentials out of commands, logs, artifacts, and memory.
- Distinguish correlation, causation, and qualitative interpretation.

## Output

Report source, freshness, filters, method, result, limitations, confidence, and design implication. Save reusable analysis under `projects/<slug>/research/` when requested.
