# Changelog

## 1.5.1 - 2026-05-07

- Improved emoji-obfuscated English joke detection by matching a Latin-only text skeleton.
- Added coverage for `now I'm`, `it said`, `laughingstock`, and `already full` joke-spam variants.

## 1.5.0 - 2026-05-07

- Added detection for emoji-obfuscated English joke spam replies like the batch shown in the reference screenshot.
- Added scoring for Unicode replacement markers combined with Latin-dominant reply text.
- Kept the new English-template detection as a high-confidence combo rule to reduce false positives on normal English replies.
- Renamed the main userscript file to `x-strict-reply-filter.user.js`.
- Added project `readme.md` and `changelog.md`.

## 1.4.2

- Existing strict reply regex filter with Chinese NSFW bait rules, blocked mention accounts, normalization, and local spam scoring.
