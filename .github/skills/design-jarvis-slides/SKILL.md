---
name: design-jarvis-slides
description: |
  HTML slide deck generator for Jarvis Designer. Builds a self-contained deck
  framework with individually editable
  <section class="slide"> screens, cover, definition, flip-card, implication,
  closing, and conversational speaker notes. The selected DESIGN.md supplies
  the visual language. Use for talks, design reviews, UX strategy, research
  synthesis, design-system storytelling, and internal presentation decks.
triggers:
  - "slide deck"
  - "slides"
  - "presentation"
  - "talk"
  - "deck"
  - "Design Jarvis slides"
  - "product presentation"
  - "UX deck"
od:
  mode: deck
  platform: web
  scenario: presentation
  featured: 1
  preview:
    type: html
    entry: index.html
  design_system:
    requires: true
    sections: [color, typography, layout, patterns, voice]
  default_for: deck
  craft:
    requires: [accessibility-baseline, typography]
  fidelity: high-fidelity
  speaker_notes: true
---

# Jarvis Designer Slides Skill

Create a single, self-contained Jarvis Designer HTML slide deck. This skill owns the deck framework, slide structure, interaction model, and speaker-note workflow. The active `DESIGN.md` owns the visual language: palette, typography, radii, surfaces, spacing, and brand voice. The output artifact must be `index.html` and should not require a build step.

## Resource Map

```
design-jarvis-slides/
├── SKILL.md
├── assets/
│   └── template.html
└── references/
    ├── patterns.md
    ├── speaker-notes.md
    └── template-fidelity.md
```

## Workflow

### Step 0 - Pre-flight

Read these files before writing the artifact:

1. `assets/template.html` - the canonical Jarvis Designer deck framework, CSS, navigation, print behavior, and five starter slide patterns.
2. `references/patterns.md` - when and how to use each slide pattern.
3. `references/template-fidelity.md` - non-negotiable visual and interaction fidelity checks.
4. `references/speaker-notes.md` - conversational note-writing guidance.
5. The injected active `DESIGN.md`, especially color, typography, component styling, layout, and voice rules.

### Step 1 - Plan the deck

Before writing HTML, decide the story arc:

- Cover: audience/context, title, subtitle, date.
- Framing: one definition or context slide.
- Body: 2-6 mindset-shift or implication slides.
- Close: thank-you slide, optionally with further reading.

Keep decks tight. Prefer 5-9 slides unless the user asks for a longer presentation.

### Step 2 - Start from the template

Use `assets/template.html` as the base for `index.html`. Replace bracketed placeholders with real content. Preserve the Jarvis Designer deck framework exactly: `.deck-shell`, `.deck-stage`, one `<section class="slide">` per slide, the first slide's `active` class, counter/nav IDs, keyboard script, print stylesheet, flip-card behavior, and center/grid slide structure.

For Design Jarvis default decks, the cover must match the canonical Jarvis Designer identity: dark `#050505` stage, subtle masked grid, centered status pill with green signal dot, Silkscreen display title, one-line Geist Mono subtitle with cursor, bottom-center rounded pager, and bottom-right keyboard hint.

Before writing final content, rebind the template's semantic CSS variables from the active `DESIGN.md`. Treat the template's default colors, fonts, radii, shadows, and surface treatments as fallbacks only. If the user selects or supplies a design system, the generated deck should visibly follow that selected design system while keeping this skill's deck mechanics.

Standard content slides must keep the template's vertical-centering contract: the visible content group is centered as a whole in the 1920 x 1080 stage. Do not change `.slide.active` to `display: block` or `display: grid`; keep active slides flex-based unless they are explicitly marked `center-slide` for cover/closing. If you add custom slide classes, they must not override `justify-content: center` on non-cover content slides.

Do not use Reveal.js for Jarvis Designer artifacts. Reveal wraps slides in `.reveal .slides section`, which prevents Picker/Pods/Edit from treating each slide as an individually editable screen. Every slide must be a top-level `<section class="slide" data-screen-label="NN Label">` inside `#deck-stage`.

### Step 3 - Write slide content

Use one primary idea per slide. Avoid dense paragraphs and decorative variation. Use these content conventions:

- Titles are action-oriented and end with a period.
- Subtitles are one line, 12-18 words, and state why the slide matters.
- Section labels are sequential: `01 / Definition`, `02 / Mindset shift 1`, etc.
- Card front titles are one short sentence.
- Card backs are 2-4 sentences.
- Comparison table cells are short phrases, not essays.

Use the active design system's title typography and color roles for slide titles. Keep title hierarchy clear and readable at 1920 x 1080, but do not preserve sample template fonts when they conflict with the active `DESIGN.md`.

Use the active design system's component rules for cards and callouts. Preserve the flip-card markup and interaction, but bind radii, borders, fills, shadows, and hover states to the active `DESIGN.md`.

### Step 4 - Include speaker notes

Every slide must include `<aside class="notes">...</aside>`. Notes should sound like a person talking to peers, not a formal script.

### Step 5 - Final fidelity pass

Before finishing, check:

- The deck is one `index.html` file.
- The deck uses the Jarvis Designer fixed deck framework with a 1920 x 1080 `.deck-stage`.
- The visual tokens in `:root` are rebound from the active `DESIGN.md`; sample template styling does not override the selected design system.
- Every slide is a top-level `<section class="slide">` with a useful `data-screen-label`.
- The first slide has `class="slide center-slide active"` or equivalent including `active`; the rest do not include `active`.
- Cover and closing slides use the masked grid background.
- Standard content slides are vertically centered as a complete group; no content slide starts near the top edge unless the slide is intentionally marked `od-no-auto-center`.
- Flip-card slides preserve the approved markup and hint text.
- Flip-card faces and any other card-like surfaces use the active design system's surface, border, radius, and elevation rules.
- Cover and content titles use the active design system's typography roles while preserving slide hierarchy and fit.
- There are no external runtime files besides CDN fonts.
- Text fits inside cards and slide bounds at 1920 x 1080.
- Notes are present for every slide.
