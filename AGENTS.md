# Agent Guide

## Project Purpose

This repo contains a local X/Twitter userscript for hiding spam/NSFW-style replies on status pages. The core file is `x-strict-reply-filter.user.js`.

The filter should favor high-confidence pattern combinations over broad keyword blocking. Prefer reusable structural signals over account IDs, exact rotating handles, or one-off strings.

## Key Files

- `x-strict-reply-filter.user.js`: userscript implementation, text extraction, normalization, scoring signals, and filtering behavior.
- `tests/real-world-cases.json`: real spam samples and policy boundary cases.
- `tests/run-real-world-cases.js`: regression test runner for accumulated real-world cases.
- `CHANGELOG.md`: update notes for every behavior change.
- `readme.md`: user-facing install and usage documentation.

## Development Rules

- Prefer extending the existing score model over adding hard deny lists.
- Add every user-reported spam example to `tests/real-world-cases.json`.
- Add false-positive boundary cases when tightening a broad signal.
- Keep rules based on reusable features, not account IDs or fixed rotating handles.
- Do not treat normal English phrase meaning as spam by itself. Use structural signals such as emoji-broken words, compact short codes, non-Latin decoration, NSFW profile bait, or template combinations.
- Preserve X emoji image `alt` adjacency when it affects text patterns such as `Lo🌹nel`.
- Keep changes narrow. Avoid unrelated refactors when adjusting a detection rule.

## Testing

Run before finishing any rule change:

```sh
node tests/run-real-world-cases.js
```

The expected result is that all real-world cases pass. If tightening a rule causes a policy case to fail, either refine the rule or document why the policy boundary changed.

## Changelog

For every behavior change, add an entry to `CHANGELOG.md` with the next version section.

Doc-only changes do not need a version entry unless they describe a behavior change or release note.

## Current Rule Philosophy

High-confidence spam signals include:

- Short digit/emoji/Latin-code replies like `😟🤯0Pe☺️`.
- Emoji inserted inside Latin words, such as `Lo🌹nel🚀iness`.
- Latin text plus emoji plus non-Latin decorative wrappers like `༛ꚡꚢꚣ`.
- Adult or grey-market display-name bait combined with low-value content.
- Known real-world spam templates preserved as regression cases.

Avoid broad rules that would hide ordinary replies such as normal English text with trailing emoji.
