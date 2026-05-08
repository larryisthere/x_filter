# Changelog

## 1.5.14 - 2026-05-09

- Moved the filtered-reply counter from the status header to a fixed bottom-right floating button above X's action buttons.

## 1.5.13 - 2026-05-09

- Added a status-page header badge showing how many suspected spam replies were hidden on the current thread.

## 1.5.12 - 2026-05-09

- Added display-nickname scoring for `同城速配` / `速配` and the `色播` spelling variant.
- Tightened short digit/emoji-code spam detection so one- or two-digit emoji-only replies such as `8💟💕💖` are hidden without broad emoji blocking.
- Added regression coverage for the latest local dating and adult livestream bait screenshots.

## 1.5.11 - 2026-05-08

- Tightened short digit/emoji/Latin-code spam detection so three emoji are enough when the normalized text is a compact digit-plus-Latin code.
- Added regression coverage for the latest short-code reply batch such as `😟🤯0Pe☺️` and `🤫😬4lj🌼`.

## 1.5.10 - 2026-05-08

- Added stronger display-nickname scoring for adult-service bait such as `免费破处`, `涩播`, `固炮`, `合欢宗`, `母狗找主人`, and `全国安排`.
- Tightened emoji-obfuscated English detection around emoji breaking English words rather than the English phrase content itself.
- Added a high-confidence combo for Latin text plus emoji plus non-Latin decorative characters such as Coptic/Tibetan wrappers.
- Removed the old fixed weird-symbol cluster rules after folding them into the generic non-Latin decoration signal.
- Preserved emoji adjacency when extracting X image emoji alt text so `Lo🌹nel`-style broken words still reach the scorer as broken words.
- Added regression coverage for the latest screenshot batch, including both emoji-broken English filler and adult-bait nicknames paired with generic English text.

## 1.5.9 - 2026-05-08

- Added detection for very short digit/emoji/Latin-code reply spam like `9💗🥰✨🧡7`.
- Added display-nickname scoring for bait phrases such as `想找单男`, `无偿线下`, `单男`, `骚`, and `线下`.
- Added regression coverage for the latest short-code reply batch and nickname-only bait filtering.

## 1.5.8 - 2026-05-07

- Added coverage for the `风暖岁安事事皆顺遂` short Chinese filler spam variant.
- Added regression cases for repeated emoji-obfuscated English filler samples reported after lazy loading.

## 1.5.7 - 2026-05-07

- Added real-world regression coverage for the latest “全国安排” screenshot batch, including the one reply that should remain visible.
- Added detection for emoji inserted inside Latin words, weird symbol clusters plus emoji, and short mixed Chinese filler replies with random Latin prefixes.
- Added coverage for superscript Latin prefix variants like `ᶜʳᵃᶻʸ` and `ʰᵒᵖᵉ`.
- Added exact regression coverage for the latest lazy-loaded X reply spam batch.

## 1.5.6 - 2026-05-07

- Added `tests/real-world-cases.json` to preserve real user-reported spam samples by version.
- Added `tests/run-real-world-cases.js` so filter changes can be checked against accumulated samples.
- Documented the real-world regression test workflow.

## 1.5.5 - 2026-05-07

- Removed the remaining hard regex filter path and unified filtering through the spam score model.
- Migrated useful hard-rule templates into scored template signals.
- Removed the unused strict-mode switch after hard rules were retired.

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
