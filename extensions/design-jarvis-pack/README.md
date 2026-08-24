# Design Jarvis extension

Optional editor integration for the open-source Design Jarvis product-design agent system.

The extension installs the orchestrator and specialists, exposes reusable skills and prompts, prepares the current workspace, manages local project metadata, and registers optional Figma access.

## Development

```bash
npm install
npm run sync-assets
npm run check
npm run package
```

Canonical agents, skills, starters, and loop files live at the repository root. Run `sync-assets` after changing them; do not edit generated copies under `assets/` or `skills/` directly.

## Privacy

Project artifacts and memory remain local by default. Figma is optional. The extension does not ship private knowledge, analytics, work-item, or organization-only connectors.

Activation does not request repository credentials, download updates, change global MCP settings, or install files into the user profile. User-level agent and skill installation happens only after an explicit command. Workspace trust is required before the extension can create or update project files.

## License

MIT. See `LICENSE`.
