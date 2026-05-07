# Changelog

## 1.5.4 - 2026-05-07

- Removed fixed mentioned-account denylist filtering because spam account IDs rotate too quickly.
- Kept generic mention scoring as a reusable signal instead of hard-coding account IDs.

## 1.5.3 - 2026-05-07

- Refactored spam scoring into reusable text signals and a declarative `SCORE_RULES` table.
- Moved repeated scoring regex patterns out of per-reply evaluation.
- Cleaned up strong-rule formatting without changing filter behavior.

## 1.5.2 - 2026-05-07

- Included X emoji image `alt` text when extracting visible reply text.
- Added exact high-confidence coverage for the football/laughingstock and phone/memes English joke spam templates.

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

- Existing strict reply regex filter with Chinese NSFW bait rules, normalization, and local spam scoring.
