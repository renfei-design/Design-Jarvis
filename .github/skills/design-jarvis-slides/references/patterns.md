# Jarvis Designer Slide Patterns

Use a small, repeatable slide vocabulary. The deck should feel like one designed object, not a collection of unrelated layouts.

These patterns define structure and interaction only. Colors, typography, radii, surface treatment, and visual voice come from the active `DESIGN.md`.

## Cover

Use for the opening slide only.

- `<section class="slide dj-slide center-slide active" data-screen-label="01 Cover">` for the opening slide
- masked `.pf-grid` background
- status pill with audience/context and date
- large title using the active design system's display role
- one-line Geist Mono subtitle with blinking cursor
- speaker notes that frame the room and the reason for the deck

## Definition

Use immediately after the cover when the topic needs shared language.

- `<section class="slide dj-slide" data-screen-label="02 Definition">`
- section label in `01 / Definition` format inside the slide
- display title ending with a period
- one lead paragraph, optional second paragraph
- optional `.compare-table` with three columns: dimension, old/traditional, new

Keep text sharp. If the definition slide needs more than two paragraphs, split the argument into another slide.

## Mindset Shift

Use for thesis-level ideas where something changed and designers need a new posture.

- `<section class="slide dj-slide" data-screen-label="03 Mindset shift">`
- section label inside the slide
- display title
- one-line subtitle
- visible line: `Click each card to flip.`
- three-card `.flip-row`

Cards must preserve the flip-card markup and minimum size. Card visual styling comes from the active design system.

Card roles:

1. The broken contract - what changed or no longer holds.
2. Example - a concrete product story.
3. The new contract - the design response.

## Implication

Use when a concept needs one paired product case.

- `<section class="slide dj-slide" data-screen-label="04 Implication">`
- same header structure as mindset shift
- `.flip-row` with `style="grid-template-columns: 1fr 1fr;"`
- two cards: `The concept` and `Design case`

The card backs can be a little longer here because there are only two cards.

## Closing

Use as the final slide.

- `<section class="slide dj-slide center-slide" data-screen-label="NN Closing">`
- masked `.pf-grid` background
- `Thank you.` title
- `Questions welcome.` subtitle with blinking cursor
- optional further-reading callout

Do not add a new visual treatment for closing. Echoing the cover is part of the identity.
