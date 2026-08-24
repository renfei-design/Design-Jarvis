# Slide Deck Template

Design Jarvis presentation template with a self-contained HTML deck framework, no build step, and no runtime dependency beyond CDN fonts.

## Quick start

Copy `template.html` into `projects/<slug>/slides/<deck-name>/index.html` and replace the bracketed placeholders.

## Fidelity contract

- Stage: fixed 1920 x 1080 inside `.deck-shell` and `#deck-stage`.
- Structure: every slide is a top-level `<section class="slide">` inside `#deck-stage`.
- Cover: dark `#050505` stage, subtle masked grid, centered status pill, Silkscreen title, mono subtitle, and blinking cursor.
- Chrome: custom bottom-center rounded pager plus bottom-right keyboard hint.
- Navigation: ArrowLeft, ArrowRight, Space, Home, and End with slide position persisted in localStorage.
- Print: one 1920 x 1080 slide per page.

Do not use Reveal.js for Design Jarvis slide artifacts. Reveal wrappers break per-slide selection in tools that expect top-level slide sections.
