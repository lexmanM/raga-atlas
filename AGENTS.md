# Repository rule: agent-agnostic by default

This rule applies to the entire repository and to every human or automated
contributor.

Everything built in this repository must remain agent agnostic:

- Application code, builds, tests, documentation, and local workflows must not
  require a particular AI coding agent, vendor-specific agent service, or
  agent-injected runtime.
- Use standard, publicly documented ecosystem tools and file formats. A fresh
  checkout must be usable from an ordinary terminal without an agent present.
- Do not commit agent-vendor project metadata, hidden vendor workspaces,
  proprietary preview/deployment scaffolding, or code that detects which agent
  is running it.
- Agent-specific helpers may exist only as untracked personal configuration.
  They must never be required to build, run, test, or understand Swara.
- A vendor integration is acceptable only when the product explicitly needs
  it, it is isolated behind an adapter, and the core local workflow continues
  to work without it. Get explicit approval before adding one.
- Keep generated output and machine-local state out of version control.
- Before considering a change complete, run `npm run check:agnostic` along with
  the normal tests and build.

If a requested change conflicts with this rule, surface the conflict and ask
for explicit direction instead of silently introducing agent coupling.
