# Changelog

All notable changes to Design Jarvis are documented here.

## Unreleased

### Changed

- Reframed Design Jarvis as a vendor-neutral, open-source product and UX design-agent toolkit.
- Replaced fixed product, platform, typography, color, component-library, and repository assumptions with project discovery and neutral fallbacks.
- Reworked specialist agents for cross-industry product design and project-stack implementation.
- Generalized accessibility, content, research, data exploration, design, implementation, brief, specification, feedback, and issue-writing skills.
- Replaced the product-specific application starter with a small generic Vite/React foundation.
- Reduced default external integrations to optional Figma access.
- Replaced the internal-only extension license with the MIT License.
- Added CI, local-link validation, community conduct guidance, and third-party notices.
- Added dependency audits, automated dependency-update configuration, and extension installer regression tests.
- Simplified the optional extension home view so it does not request repository credentials or download updates.
- Hardened local skill-pack installation against path traversal, untrusted install locations, and symbolic-link payloads.

### Removed

- Private knowledge and analytics connectors.
- Organization-specific repository access policies and employee identifiers.
- Fixed internal repositories, work-item systems, product personas, component libraries, and product terminology.
- The stale platform-specific installer and dormant private-release updater.
- Stale walkthrough screenshots containing pre-public product names and obsolete update UI.

### Verification

- Repository residue scan for product/vendor-specific terminology.
- Evaluation harness health check and unit tests.
- Extension source check and generated-asset synchronization.

## 0.1.21

Last pre-open-source internal release. Historical internal details were intentionally omitted from the public changelog.
