---
name: malfoid-index-length
description: Use when setting or checking the length field of a fanfic entry in the Malfoid Index (malfoid-index/works.yaml). Covers the one-shot, short and novel thresholds, where to read the part or chapter count on Wattpad, Fanfiction.net, malfoid.love, AO3 and X, and what to do when the count is not available.
---

# The length field

`length` is set only on fanfic entries (the `fanfic` kind, including lists such as `[comic, fanfic]`). It is one of `one-shot`, `short`, `novel` or `unknown`. An entry without the field shows as "Length unknown" on the index, the same as `unknown`.

## Thresholds

Use the count of parts or chapters the site shows:

- `one-shot`: 1 part, 1 chapter, or no chapter count (Fanfiction.net shows no `Chapters:` line for a one-shot).
- `short`: 2 to 5 parts or chapters.
- `novel`: 6 or more parts or chapters.

These are counts of posted parts, not words, because the word count is not shown on every site. If the site shows a word count and the parts are unusual (for example one very long part), use your judgment and say so.

## Where to read the count

- **Wattpad:** the header shows `N parts`. Use the element whose text is exactly `N parts` or `N part`. Do not use the first regex match on the page, which can pick up a recommended story. The browser snippet is in the `malfoid-index-first-name` skill.
- **Fanfiction.net:** the `Chapters: N` line in the page. No line means one-shot.
- **malfoid.love:** the blurb shows `N pieces`, sometimes with a word count. Use `N pieces`.
- **AO3:** the work page shows `Chapters: N/M`. `N` is posted chapters. AO3 was unavailable in the last pass, so these are often unverified.
- **X:** a single post or a short thread is `one-shot`. A numbered thread or an article with several parts is `short` or `novel` by count. If you cannot count, use `unknown`.

## When the count is not available

Leave the field out, or set `length: "unknown"`, and say so in your notes. Do not guess from the summary. A story page that shows only the blurb and no part count, or a page that errors, is `unknown`.

## Procedure

1. Get the count from the page above.
2. Apply the threshold.
3. Save the count with the decision so the change can be audited.
4. Apply all decisions in one pass over `works.yaml`, replacing the `length:` line. Keep the rest of the entry as it is.
5. Run the build check from the `malfoid-index-add-entry` skill.
