---
name: feedbackfinder
description: Discover and synthesize public or user-provided product feedback into evidence-backed themes and opportunities.
---

# Feedback Research

## Workflow

1. Define the product area, user group, time range, and decision to inform.
2. Search authorized sources: user-provided research, public forums, app reviews, support exports, surveys, or project files.
3. Record provenance, date, audience, and sampling limitations.
4. Remove duplicates and separate direct feedback from interpretation.
5. Cluster by user goal, pain point, frequency signal, severity, workaround, and requested outcome.
6. Look for contradictory evidence and underserved groups.
7. Produce themes, representative short excerpts, confidence, and design implications.

## Safety

Do not copy personal data or private customer details into artifacts. Use short excerpts, anonymize sources when required, and never imply statistical prevalence from anecdotal samples.

## Output

```json
{
  "sources": [],
  "themes": [
    { "theme": "...", "evidenceCount": 0, "severity": "high|medium|low", "confidence": "high|medium|low", "implication": "..." }
  ],
  "contradictions": [],
  "coverageGaps": [],
  "recommendedNextResearch": []
}
```
