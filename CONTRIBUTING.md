# Contributing to Design Jarvis

Thank you for helping make product-design agents useful to more teams.

## Contribution principles

- Keep the public core vendor neutral and cross-industry.
- Prefer configurable adapters over required private services.
- Use public standards and primary sources for normative guidance.
- Keep examples fictional, privacy-safe, and free of employee or customer identifiers.
- Preserve role boundaries, artifact paths, and verification evidence.
- Avoid expanding agent context when a focused skill or reference file is sufficient.

## Development workflow

1. Create a focused branch.
2. Make canonical changes under `.github/`, `projects/_starters/`, `evals/`, or extension source as appropriate.
3. If canonical agents, skills, prompts, loop files, or starters change, regenerate extension copies:

   ```bash
   npm --prefix extensions/design-jarvis-pack run sync-assets
   ```

4. Run relevant checks:

   ```bash
   node evals/health-check.mjs
   node evals/check-links.mjs
   node --test 'evals/tests/*.test.mjs'
   npm --prefix extensions/design-jarvis-pack run check
   ```

5. For starter or prototype changes, run the build and inspect the rendered result.
6. Open a pull request that explains the outcome and includes evidence.

## Adding a skill

A skill needs a focused trigger, clear inputs, a reproducible workflow, safety boundaries, and completion evidence. It must not require a particular company’s private service. Organization-specific packs should live in a separate repository or private fork.

## Reporting issues

Use the public issue templates for reproducible bugs and feature proposals. Report security concerns through `SECURITY.md` instead of a public issue.

Participation is governed by `CODE_OF_CONDUCT.md`.
