# Agent Guide

## Project Purpose

This repo contains a local X/Twitter reply filter for hiding spam/NSFW-style replies on status pages. It ships as both a userscript and a Chrome extension. The shared rule core lives under `src/`.

The filter should favor high-confidence pattern combinations over broad keyword blocking. Prefer reusable structural signals over account IDs, exact rotating handles, or one-off strings.

## Key Files

- `src/filter-core.js`: shared normalization, scoring signals, and spam score model.
- `src/dom-extract.js`: shared X DOM text extraction, including emoji image `alt` adjacency.
- `src/x-page-filter.js`: shared X page scanning, hiding, counter, and double-runtime guard.
- `userscript/x-strict-reply-filter.user.js`: generated userscript distribution file.
- `extension/manifest.json`: Chrome extension manifest.
- `extension/dist/content.js`: generated Chrome extension content script.
- `scripts/build-distributions.js`: builds generated userscript and extension content files from `src/`.
- `tests/real-world-cases.json`: real spam samples and policy boundary cases.
- `tests/run-real-world-cases.js`: regression test runner for accumulated real-world cases.
- `CHANGELOG.md`: update notes for every behavior change.
- `README.md`: user-facing install and usage documentation.

## Development Rules

- Prefer extending the existing score model over adding hard deny lists.
- Add every user-reported spam example to `tests/real-world-cases.json`.
- Add false-positive boundary cases when tightening a broad signal.
- Keep rules based on reusable features, not account IDs or fixed rotating handles.
- Do not treat normal English phrase meaning as spam by itself. Use structural signals such as emoji-broken words, compact short codes, non-Latin decoration, NSFW profile bait, or template combinations.
- Preserve X emoji image `alt` adjacency when it affects text patterns such as `Lo🌹nel`.
- Keep userscript and Chrome extension behavior aligned by changing shared `src/` files first, then rebuilding distributions.
- Do not add popup/options/side-panel UI until the open question is resolved.
- Keep changes narrow. Avoid unrelated refactors when adjusting a detection rule.

## Testing

Run before finishing any rule change:

```sh
node scripts/build-distributions.js
node tests/run-real-world-cases.js
```

The expected result is that all real-world cases pass. If tightening a rule causes a policy case to fail, either refine the rule or document why the policy boundary changed.

## Deployment

When the user asks to deploy, release, publish, or update the userscript / oilmonkey version:

1. Confirm the intended version in `scripts/build-distributions.js`, `extension/manifest.json`, and the generated userscript header. Bump them together when publishing a new behavior.
2. Run `node scripts/build-distributions.js` from the repo root.
3. Run `node tests/run-real-world-cases.js` and ensure all cases pass.
4. Commit the source changes and generated `userscript/x-strict-reply-filter.user.js` / `extension/dist/content.js` together.
5. Push to GitHub `main`. Greasy Fork Source Syncing is already configured outside the repo to update the userscript from the pushed GitHub source via webhook, so do not paste script code into Greasy Fork unless the user explicitly asks for a manual fallback.

When the user asks to publish the Chrome extension version:

1. Complete the same version, build, and regression-test steps above.
2. Build the upload package from the repo root:

```sh
node scripts/build-distributions.js
mkdir -p dist
cd extension
zip -r ../dist/x-strict-reply-filter-chrome-<version>.zip manifest.json dist icons
```

3. Upload the generated zip to the Chrome Web Store Developer Dashboard for the existing extension listing, then submit it for review. If dashboard access or authentication is needed, ask the user to handle that browser step or explicitly approve using the browser.

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
