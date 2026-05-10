# Open Questions

## OQ-001: Chrome extension UI surface

Status: open

The first Chrome extension version intentionally has no popup, options page, or side panel. It runs with the same default policy as the userscript: do not filter the main tweet, use spam score threshold `7`, and hide matched replies directly.

Before adding UI, decide whether the extension should use:

- A small popup for simple enable/disable and status display.
- Chrome's Side Panel API for a wider right-side panel with per-page details.
- No UI, keeping configuration source-only until there is a concrete user workflow.

Only add this UI when there is a real workflow such as pausing filtering, inspecting hidden-reply reasons, changing the threshold, or exporting report data.
