---
name: malfoid-index-add-entry
description: Use when adding, checking or fixing an entry in the Malfoid Index (malfoid-index/works.yaml), whether from an emailed submission, an X, YouTube, Wattpad, AO3, FFN or Google Doc link, or a malfoid.com survey. Covers the rules a work must meet, duplicate checks, the entry format, the first_name and length fields, the build check and the local commit.
---

# Adding an entry to the Malfoid Index

The index is `malfoid-index/works.yaml`, rendered by `scripts/build_site.py` into `site/malfoid-index/`. The user approves entries, the commit is made locally, and **the user pushes only when they say "push"**. Never push on your own.

## 1. Check the submission against the rules

A work is added only if all of these hold:

- It is about Malfoid (genderbent Draco Malfoy). Works that only mention Draco in passing do not qualify.
- It is in English, or has English subtitles.
- It is wholesome (SFW). If you cannot tell, check the first chapter or first post and say so.
- The link works and stays online. A blocked or down page is not a failed check; say it is unverified.
- It is not already listed. Search `works.yaml` by URL, status ID, YouTube ID, handle and title before adding.
- The creator is the submitter. For a creator submitting their own work, `creator` is their own name or handle.

Ask the user before adding anything that fails a rule, is ambiguous, or is outside what they sent.

## 2. Choose kind, creator and url

- `kind` is one of `creator`, `comic`, `game`, `fanfic`, `art`, `gallery`, `video`, `music`, `other`, or a list such as `[creator, art]`. Use `creator` with `items:` when one person has many works, as the index does for X artists and YouTube channels.
- `url` is the canonical link. Use the story page for Wattpad, the work page for AO3 and FFN, the status for an X post, and the channel for a YouTube creator.
- `also:` holds extra links to the same work on other platforms, and it shows the "on:" icon row.
- `added:` is the date the entry is added, `YYYY-MM-DD`.

## 3. Write the entry

Insert the new entry at the end of the `works:` list, with the same indentation as the others. Use this shape:

```yaml
  - id: "fanfic-wattpad-123456789"
    title: "Exact title"
    kind: fanfic
    creator: "Author handle"
    url: "https://www.wattpad.com/story/123456789"
    language: "English"
    added: 2026-11-10
    summary: "One or two sentences, in your own words."
    tags: [romance, enemies-to-lovers]
    first_name: "Dracaena"
    length: "novel"
```

- `id`: a unique slug. Use the platform and its ID where you can, for example `fanfic-wattpad-416935238`.
- `first_name` and `length` are set by the `malfoid-index-first-name` and `malfoid-index-length` skills. Leave `first_name: ""` if the work does not name her in chapter 1.
- `length` only applies to fanfic. Leave it out for other kinds.

## 4. Check, build, commit

```bash
python3 -c "import yaml; yaml.safe_load(open('malfoid-index/works.yaml'))"
python3 scripts/build_site.py --out "$TMPDIR/preview" --no-thumbs
```

The build must print the entry count, for example `93 entries, 0 new thumbnails, 302 index works`. Check that the count went up by the number of entries you added.

Commit locally with the trailer the repo uses:

```bash
git add malfoid-index/works.yaml
git commit -m "Index: add <title>" -m "Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>"
```

Do not push. Tell the user the commit hash and say "not pushed".

## Pitfalls

- A Wattpad or AO3 page can be blocked or down. Mark it unverified and leave the name and length blank rather than guessing.
- Titles can be misleading. Check the prose, not the title.
- Several stories can share one ID on Wattpad. Search for the ID before adding.
- YAML: keep quotes around string values, and never leave a tab in the file.
