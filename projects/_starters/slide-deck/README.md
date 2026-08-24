# Slide Deck Template

Reveal.js-based presentation template matching the **AI UX Design — Design for Uncertainty** deck style. Self-contained HTML — no build step, no dependencies beyond CDN.

## Quick start

```bash
cp templates/slide-deck/template.html projects/<your-deck>/index.html
open projects/<your-deck>/index.html
```

Replace `[BRACKETED]` placeholders with your content.

## Style at a glance

- **Background:** near-black (`#050505`) with a subtle 40×40 grid net (`.pf-grid`) on cover/closing slides, faded with a radial mask
- **Fonts:** Inter (UI), Geist Mono (body), Silkscreen (display titles)
- **Accent color:** the configurable accent token for chrome, mint (`#2dd4a8`) for highlights
- **Slide size:** 1280 × 720 (16:9)

## Slide patterns included

| Pattern | When to use | Key CSS |
|---|---|---|
| **Cover** | Opening slide with audience pill, big title, blinking-cursor subtitle | `.center-slide`, `.pf-grid`, `pf-ping`, `pf-blink` |
| **Definition** | Explain a concept with a comparison table | `.compare-table` |
| **Mindset shift** | Three-card flip layout: broken contract → example → new contract | `.flip-row` (default 3-up), `.flip-card` |
| **Implication** | Two-card flip layout: concept → design case | `.flip-row` with inline `grid-template-columns: 1fr 1fr` |
| **Thank you** | Closing slide with optional "Further reading" link callout | `.center-slide`, `.pf-grid` |

## Adding more slides

Use the VS Code snippets (type the prefix + Tab):

- `slide-cover` — title/cover slide
- `slide-section` — section divider with comparison table
- `slide-mindset` — 3-card mindset shift slide
- `slide-implication` — 2-card implication slide
- `slide-thanks` — closing thank you slide
- `flip-card` — single flip card (snap into a `.flip-row`)

## Conventions

- **Titles:** action-oriented ("Design for the unhappy path."), end with a period
- **Subtitles:** one line, names the *why*, 12-18 words
- **Card front titles:** one short sentence — the punchline
- **Card backs:** 2-4 sentences — expansion or story
- **Section labels:** `01 / Definition`, `02 / Mindset shift 1`, etc. — keep numbering sequential

## Customizing the theme

All colors and tokens live in the `:root` CSS variables block at the top of the template. Change those rather than overriding individual rules.
