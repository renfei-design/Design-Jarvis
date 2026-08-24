# Security policy

## Supported versions

Security fixes target the latest released version and the default development branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository host’s private vulnerability-reporting feature when it is enabled. Otherwise, contact the repository owner privately using the contact method shown on the owner profile and share only the minimum information needed to reproduce the issue.

Include:

- affected version or commit;
- impact and attack preconditions;
- reproducible steps or proof of concept;
- suggested mitigation if known;
- whether credentials or personal data may have been exposed.

Do not include live credentials, private customer data, or exploit details in public artifacts.

## Security expectations

- External connectors are optional and must document permissions.
- Credentials belong in the runtime’s secret store or environment, never in prompts, memory, logs, examples, or source control.
- Project memory must not contain personal data or proprietary customer content.
- Downloaded extension updates must be integrity checked when automatic updates are enabled by a distributor.
