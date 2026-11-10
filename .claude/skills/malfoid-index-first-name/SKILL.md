---
name: malfoid-index-first-name
description: Use when setting or checking the first_name field of a Malfoid Index entry (malfoid-index/works.yaml), which feeds the first-name chart. Covers the naming rules, the spelling merges, how to read chapter 1 in the browser (including Wattpad's Start reading button) and when to leave the field blank.
---

# The first_name field

`first_name` records the name the work uses for Malfoid, such as `Draconia`, `Dracaena`, `Draco`, or another name (`Lyra`, `Draca`, `Dracina`). It feeds the chart next to the About box and the name tags on the cards. Every entry has the field. Leave it as `""` when the work does not name her, or when you cannot check.

## Canonical names and spelling merges

Use these exact values. The build and the chart treat each as one name.

| Value | Also written as |
|---|---|
| `Draconia` | Dracona, Drakonia |
| `Dracaena` | Draceana, Dracena, Dracenia, Dracaenia, Dracanea, Dracæna |
| `Draco` | (only the plain name) |

Any other spelling is its own name. Use it as written, but use one spelling per name, for example `Lyra`, `Draca`, `Dracina`.

Do not count these as a name for her: Lucius, Narcissa, Abraxas, Druella, Ursa, Scorpius, Astoria, Armand, Iris, Victoria, Evelyn, and any "House", "Lady", "Miss", "Mr", "Mrs", "Professor", "Female", "Fem", "Little", "Last", "Lost", "The" or "Other" before Malfoy or Malfoid. A "female Draco" or "genderbent Draco" description means the work keeps the name Draco, so count it as `Draco` only when the story uses Draco for her in the prose.

## Rule for a single entry

1. Read **chapter 1** (or the first post, or the first part of a fic that has no chapter 1 on the reader). Count the names in the prose.
2. Pick the name with the most mentions. Keep it only when it has **at least 2 mentions** and **at least twice** the count of any other name. Otherwise leave the field blank.
3. A name stated in the **title or blurb** as the lead's name also counts, when the prose does not contradict it. Say so in your notes.
4. Ties and near-ties are blank. Accuracy matters more than coverage.

Summaries alone are not enough. Several entries were first set from summaries and turned out to name the wrong character.

A blurb or description often says "Draco is a girl now" or "female Draco" without giving the new name, and the prose then uses a different name. Do not take `Draco` from a blurb. Set `Draco` only when the prose calls her Draco. Blossoms at Christmas is an example: the blurb reads as Draco, but the chapter uses Dracaena.

## Reading chapter 1 in the browser

Use claude-in-chrome. Load the tools once with `ToolSearch`, then batch the calls: navigate, wait about 3 seconds, run JavaScript, and read the counts.

**Wattpad.** The story page does not list chapters in the DOM. Click the **Start reading** button; it opens the first unread part, which is chapter 1 for a new reader. Do this in one JavaScript call, then wait about 4 seconds before reading:

```js
(()=>{const el=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&/^\d+ parts?$/.test(x.textContent.trim()));const parts=el?el.textContent.trim():'?';const b=[...document.querySelectorAll('button,a')].find(x=>/^start reading$/i.test(x.textContent.trim()));if(b)b.click();return {parts,clicked:!!b}})()
```

Then count names in the reader, and confirm the URL is a part, not the story page:

```js
(()=>{const t=document.body.innerText;const re=/\b(Draconia|Dracona|Dracaena|Draceana|Dracena|Draco|Lyra|Dracia|Draca|Dracina|Dracea|[A-Z][a-z]+ (?:Malfoy|Malfoid))\b/g;const c={};[...t.matchAll(re)].forEach(x=>c[x[0]]=(c[x[0]]||0)+1);return {u:location.pathname.slice(0,60),c}})()
```

Check the `u` field. It should contain `/<digits>-`. If it shows `/story/`, the click did not navigate. Wait and try again. If the reader opens a later part, say so: the story may have chapter 1 unavailable. Some stories open at a bookmarked part, so note it.

**Fanfiction.net.** Go straight to `https://www.fanfiction.net/s/<id>/1/`. Count names in `#storytext`. Read `Chapters: N` for the length. No `Chapters:` line means one chapter.

**malfoid.love.** Story pages show the blurb and the text. Count in `document.body.innerText`. The blurb often gives the piece count (`N pieces`) and sometimes says the lead's name.

**AO3.** Often down for maintenance, or the request is denied. If so, leave the field blank and mark the entry unverified. Do not work around the block.

**X.** Long posts and threads are readable with `innerText` after a 2 to 3 second wait. Count names in the post text.

**Blocked pages.** If a site refuses the browser, say so and leave the field blank.

## Record and apply

Save each result (URL, parts, counts, decision) to a scratch JSON file so the work survives a context reset. Apply all decisions in one pass over `works.yaml`, replacing the `first_name:` line in each entry and keeping the rest of the entry as it is. Then run the build check from the `malfoid-index-add-entry` skill.
