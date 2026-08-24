---
name: kb-search
description: Search authorized project files, public documentation, and optional connected knowledge sources for relevant decisions and guidance.
---

# Knowledge Search

## Source order

1. Current project memory and artifacts.
2. Repository documentation and code.
3. User-provided links or files.
4. Public primary sources.
5. Optional connected knowledge tools explicitly authorized for the current environment.

## Workflow

1. Turn the request into a small set of concepts, synonyms, product areas, and date constraints.
2. Search titles and metadata first, then open only the most relevant results.
3. Prefer current canonical sources over summaries and duplicated notes.
4. Distinguish active decisions from superseded or historical material.
5. Return the answer with source pointers, dates, confidence, and contradictions.

## Safety

Never assume a private connector exists. Do not copy secrets, personal data, private customer information, or proprietary source text into public artifacts. If a source cannot be shared, paraphrase only what the user is authorized to use and label the restriction.

## Output

```json
{
  "answer": "...",
  "sources": [{ "title": "...", "ref": "path or URL", "date": "...", "status": "current|historical|unknown" }],
  "contradictions": [],
  "confidence": "high|medium|low",
  "gaps": []
}
```
