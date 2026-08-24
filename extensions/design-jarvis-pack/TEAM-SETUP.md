# Team setup

Design Jarvis can be distributed as a packaged extension or adopted as plain agent and skill files.

## Extension route

1. Build or download the extension from a distribution source your organization trusts.
2. Install it in a compatible editor.
3. Run **Install for Me**.
4. Run **Set Up This Workspace** in repositories that should contain shared skills and starters.
5. Connect Figma only for team members who need canvas workflows.

## File-only route

Copy the relevant agent and skill Markdown files into the target runtime. Preserve `AGENTS.md`, the project-folder rules, and verification requirements.

## Organization customization

Keep organization-specific design systems, connectors, templates, terminology, and governance in a separate pack or private fork. The public core should remain vendor neutral so updates can be shared across companies.

## Security and privacy

- Review extension packages before distribution.
- Do not bake credentials into connector configuration.
- Keep private customer data out of project memory and example artifacts.
- Make external integrations optional and document their permissions.
