# Adding a work to the Malfoid Index

The Malfoid Index lists fanfics, fan art, comics, videos and other fan works about Malfoid (genderbent Draco Malfoy). You can submit a work in two ways. The rules are the same for both.

1. **By email** to rhedak@proton.me, with a title, your name or handle, a link, the language and two or three sentences about the work.
2. **By pull request** on GitHub, described below.

## The rules

- The work is about Malfoid (genderbent Draco Malfoy).
- The work is in English, or has English subtitles.
- The work is wholesome (SFW).
- The link works and stays online.
- The work is not already listed.
- You made the work yourself. For a pull request, the `creator` field must be your own name or handle.

Anything that does not follow these rules will not be added.

## Adding an entry by pull request

1. Fork the repository, or create a branch if you have write access.
2. Open `malfoid-index/works.yaml` and add your entry at the end of the `works:` list. Keep the indentation the same as the other entries.
3. Open a pull request. The pull request template asks you to confirm the rules.

A new entry looks like this:

```yaml
  - id: "2026-11-my-fanfic"
    title: "My Fanfic Title"
    kind: fanfic
    creator: "Your name or handle"
    url: "https://archiveofourown.org/works/123456"
    language: "English"
    added: 2026-11-09
    summary: "One or two sentences about the work."
    tags: [romance, slice-of-life]
```

Fields:

- `id`: a short unique slug, for example `2026-11-my-fanfic`.
- `title`, `kind`, `url`: required. `kind` is one of `creator`, `comic`, `game`, `fanfic`, `art`, `gallery`, `video`, `music` or `other`, or a list such as `[comic, fanfic]`.
- `creator`, `language`, `added` (the date you submit, `YYYY-MM-DD`), `summary`, `tags`: recommended.
- `first_name`: the first name the work uses for Malfoid, such as Draconia, Dracaena or Draco. Leave it out or blank if the work does not name her. Feeds the name chart on the index.
- `length`: for fanfic only: `one-shot`, `short`, `novel` or `unknown`.
- `thumb`, `also`, `items`, `order`: optional. See the comments at the top of `works.yaml`.

A pull request can also change an entry you already have, for example to fix a link or summary. Edit the same entry and say what changed in the pull request. To remove your work from the index, ask in the pull request or by email.

## What happens next

- A check runs on every pull request and confirms that the index still builds.
- The maintainer reviews the entry and may ask for changes, or decline it.
- When a pull request is merged into `main`, the site is rebuilt and published automatically. This usually takes a few minutes.
