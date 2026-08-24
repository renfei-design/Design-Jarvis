# Template Fidelity

The Jarvis Designer deck framework depends on restraint. Keep the mechanics recognizable while rebinding visual styling to the active `DESIGN.md`.

## Mandatory

- Output a single `index.html` file.
- Keep the Jarvis Designer fixed deck framework: `.deck-shell`, `.deck-stage`, `.slide`, `.deck-counter`, `.deck-hint`, counter IDs, keyboard script, scale-to-fit logic, and print stylesheet.
- Keep `.deck-stage` at 1920 x 1080.
- Every slide must be a top-level `<section class="slide">` inside `#deck-stage`; this is how Picker, Pods, Edit, and per-slide refinement identify individual screens.
- The first slide must include `active`; no other slide may include `active` in the initial HTML.
- Every slide must include a meaningful `data-screen-label`, for example `01 Cover`, `02 Definition`, `03 Mindset shift`.
- Keep the counter/nav outside `.deck-stage` so it does not scale with the slide canvas.
- Keep the `:root` token block and use CSS variables for theme colors, fonts, radii, borders, shadows, and surfaces.
- Rebind `:root` tokens from the active `DESIGN.md`; template defaults are fallback examples, not the visual authority.
- Use the active design system's background and surface roles on every slide.
- Vertically center standard content slides as a complete content group; cover and closing slides already use `center-slide`.
- Keep non-cover active slides flex-based. Do not override `.slide.active` to `display: block` or `display: grid`; those layouts pin the content group to the top and break the deck system.
- If a rare slide truly needs top alignment, mark it with `od-no-auto-center` and explain why in the speaker notes. Otherwise the platform will auto-center Design Jarvis content slides at save time.
- Use `max-width: 1380px; margin: 0 auto;` for standard content containers on the 1920 x 1080 stage.
- Use the masked `.pf-grid` background on cover and closing slides.
- Cover and content title styles must follow the active design system's typography and color roles while fitting inside the slide bounds.

## Flip Cards

Do not invent a new flip-card system.

- Use `.flip-row`, `.flip-card`, `.flip-card-inner`, `.flip-card-front`, `.flip-card-back`, `.flip-card-num`, `.flip-card-title`, `.flip-card-hint`, `.flip-card-body`, and `.flip-card-eyebrow`.
- Use three equal columns for mindset-shift slides.
- Use only `style="grid-template-columns: 1fr 1fr;"` for two-card implication slides.
- Keep the visible instruction line: `Click each card to flip.`
- Keep the card hint text visually equivalent to `Tap to reveal ->`.
- Preserve the 320px minimum card height.
- Keep flip-card fronts and backs visually consistent with the active design system's card/surface rules.

## Avoid

- Magazine layouts, horizontal swipe article compositions, and newspaper columns.
- Decorative gradients, blobs, stock images, or custom illustrations.
- Random light/dark variants that are not supported by the active design system.
- Dense bullet slides.
- One-off card radii, hover models, or flip animations outside the active design system.
- Inline one-off colors outside active DESIGN.md tokens.
- Reveal.js, `.reveal`, `.reveal .slides`, or `.reveal .slides section` wrappers.

## Final Check

Open the deck in Jarvis Designer and confirm the counter shows the real total slide count, Picker can select each slide independently, no text overflows, no card faces overlap, and the first visible screen is the actual presentation, not instructions about the presentation.
