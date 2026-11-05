# Malfoid Gallery

Seasonal and social-media images of **Draconia Malfoid**, made in **Grok Imagine** (xAI) by editing her
base posts. One image (or a short clip of it) from this gallery is shared per day on **X**, **Instagram**,
**TikTok** and **Rednote** (Xiaohongshu, 小红书).

Every image is traceable: for each one you can see which base post and reference it was made from, the
exact prompt, and the Grok Imagine post of the result.

> Draconia Malfoid is an unofficial, non-commercial original fan character, a **21-year-old adult woman**,
> loosely inspired by Draco Malfoy from the *Harry Potter* series. *Harry Potter* and related names are
> trademarks of Warner Bros. Entertainment Inc. / Wizarding World. This gallery is **not affiliated with,
> endorsed or sponsored by** Warner Bros., Wizarding World Digital or J.K. Rowling. Images will be taken down
> on request by any rights holder (contact: <rhedak00@yahoo.de>).

## Layout

```
gallery.yaml          index of all entries, oldest first, with `planned:` (post date) and `posted:` fields;
                      `gallery_only: true` marks images kept in the gallery that are never posted
plan/                 monthly "Daily Malfoid" posting plans: date, item, image or video, captions and hashtags per platform
references/           base reference images of Draconia
  draconia-uniform.webp   robed school uniform (neutral pose)
  draconia-gown.webp      green-and-silver Yule Ball gown (neutral pose)
  draconia-vest.webp      uniform without the robe: shirt, tie, vest, skirt (neutral pose)
  draconia-uniform-fullbody.jpg  robed uniform, head to toe, black knee socks and loafers (Grok post a22d4f44, base for new uniform images)
  draconia-vest-fullbody.jpg     vest uniform, head to toe, black knee socks and loafers (Grok post 918f66cf, base for new vest images)
  draconia-uniform-fullbody-transparent.png  RGBA, transparent version of draconia-uniform-fullbody.jpg (Grok Imagine Remove Background
                          on post a22d4f44 -> post f0a396f0); faint pink fringe at the robe hem and loafer soles
  draconia-vest-fullbody-transparent.png     RGBA, transparent version of draconia-vest-fullbody.jpg (Grok Imagine Remove Background
                          on post 918f66cf -> post 23617d71); faint pink fringe at the loafer soles
  poses/                  mannequin pose references from Shisei (CC0), shisei-<P###|U###>-<view>.webp,
                          900x1200; LICENSE-images and NOTICE from Shisei alongside
images/               generated images, the original Grok Imagine JPGs, unchanged
input/                one YAML file per image, same base name as the image
rejected/             replaced images and their input files (same layout, `rejected:` says why; not posted)
ideas/                idea lists for the generator: outfits, settings, poses, emotions, skin (coverage), styles (art style)
ideas/archive/        the old pose list (paraphrased ai-pose-gallery names); kept so older entries stay traceable
scripts/add_entry.py  helper that adds a new entry (image + input file + index line)
scripts/ideas.py      random idea generator: outfit + setting + pose/view + emotion + coverage + art style -> prompt
scripts/import_shisei.py  rebuilds ideas/poses.yaml and references/poses/ from a Shisei checkout
scripts/build_site.py builds the gallery website (_site/, not committed) from the YAML: index.json + WebP thumbnails
site/                 static source of the website: index.html, style.css, app.js, vendor/ (MiniSearch, MIT)
scripts/miniyaml.py   tiny YAML loader (uses PyYAML if installed), so the scripts need only Python 3
```

Entry ids are `<created date>-<theme>-<n>`, e.g. `2026-11-03-thanksgiving-1`, giving
`images/2026-11-03-thanksgiving-1.jpg` and `input/2026-11-03-thanksgiving-1.yaml`.

## How an entry is traced

```
input/<id>.yaml
  -> base_post   (Grok Imagine post that was edited / used as the character image)
   + reference   (the matching file in references/)
   + pose_ref    (newer entries: the mannequin pose image in references/poses/, second reference)
   + prompt      (exact full edit prompt)
  -> result_post (Grok Imagine post of the result)
  -> image       (images/<id>.jpg, downloaded unchanged)
```

Fields of an input file: `id`, `title`, `theme`, `tags`, `created`, `tool`, `base_post`, `reference`,
`pose_ref` (when a pose reference was used), `prompt`, `result_post`, `image`, `size`, `notes`.

## Posting

A daily routine (series **Daily Malfoid**) takes the entry in `gallery.yaml` whose `planned:` date is today,
looks that date up in `plan/daily-malfoid-2026-11.yaml` and posts its `media` (the image, or on video days the
clip from `videos/`) with that day's X / Instagram / TikTok / Rednote captions and hashtags (AI labels on where offered),
then fills in `posted:`, for example:

```yaml
    posted: {date: 2026-11-04, x: "https://x.com/...", instagram: "https://www.instagram.com/p/..."}
```

Gallery-only images: an entry with `gallery_only: true` (and the tag `gallery-only`) is kept in the gallery as an
image only. It has no `planned:` date, is not in any `plan/` file, and the routine never posts it, not even
as a fallback when nothing is planned. Add such an entry with `add_entry.py --gallery-only`. Example: the
first rough-doodle style test, `2026-11-04-doodle-1` to `-4`.

Rednote (Xiaohongshu, 小红书): each plan day has a `rednote` block with a Simplified Chinese `title`
(about 20 characters max), a short casual `body` (Chinese lines plus one English line, numbered
"Daily Malfoid #N" like the other platforms) and Xiaohongshu-style `tags` (max 5: #AI绘画 / #AI视频, #二次元,
#傲娇, one theme tag, #DailyMalfoid; no franchise tags). Every platform keeps at most 5 hashtags, and X / Instagram /
TikTok use #malfoid (not #animeOC). Rednote takes image notes (图文笔记) and
video notes (视频笔记), so every day, image or video, can be posted there. Tick Rednote's AI-generated content
declaration (内容由AI生成) on every post. Posting is done by hand.

## Adding a batch

```sh
python3 scripts/add_entry.py \
  --image /path/to/autumn-2.jpg --created 2026-11-10 \
  --title "Pumpkin patch" --tags autumn,pumpkins \
  --base-post https://grok.com/imagine/post/<base-id> \
  --reference references/draconia-uniform.webp \
  --prompt "Same woman, same face, hair and art style, ..." \
  --result-post https://grok.com/imagine/post/<result-id> \
  --notes "optional"
```

The script copies the image byte-for-byte into `images/`, reads its size, writes `input/<id>.yaml` and
appends the entry (with an empty `posted:`) to `gallery.yaml`. It needs only the Python standard library.
`--gallery-only` adds the `gallery-only` tag and `gallery_only: true` for an image that should never be posted.

## Idea generator

`scripts/ideas.py` picks a random outfit, setting, pose (with a camera view), emotion, coverage level and art style
from `ideas/*.yaml`, checks that they fit together, and prints the combination with a ready Grok Imagine
prompt, the base post / character reference (image 1) and `pose_ref`, the mannequin pose image (image 2).
In Grok Imagine, give it both images in that order and the prompt; the prompt says to take the pose and
camera angle from the mannequin in the second image (and nothing else from it), and also spells the pose
out in words (Shisei's English description).

```sh
python3 scripts/ideas.py                         # one random idea (a random seed is chosen and printed)
python3 scripts/ideas.py --seed 7 --count 3      # seeds 7, 8, 9; any idea can be re-made from its seed
python3 scripts/ideas.py --season winter --theme christmas --tsundere
python3 scripts/ideas.py --outfit gown           # or --setting library, --coverage summer
python3 scripts/ideas.py --pose shisei-P012 --view diag   # a given pose / view (front, diag, side)
python3 scripts/ideas.py --style rough-doodle    # force an art style (ids in ideas/styles.yaml)
python3 scripts/ideas.py --seed 7 --yaml > /tmp/idea.yaml
# make the image in Grok Imagine from the base post (image 1) + pose_ref (image 2) + prompt, download it, then:
python3 scripts/add_entry.py --idea /tmp/idea.yaml --image ~/Downloads/result.jpg \
  --result-post https://grok.com/imagine/post/<result-id>
```

With `--idea`, add_entry.py takes the base post, reference, pose_ref, prompt, title and tags from the idea
(flags override them) and stores an `idea:` block (seed, outfit, setting, pose, pose name, view, Shisei id,
emotion, coverage, season, theme, style) in the input file. If you pass a changed `--prompt`, the entry records
`prompt_edited: true` and keeps the generated prompt as `idea_prompt`.

Prompts start by naming the two references ("the first image shows the character, the second image is a
faceless grey mannequin used only as a pose reference"), then "Draw the same woman as in the first image,
same face, hair, braid and art style, ...". For her own outfits (robed uniform, uniform without robe, gown)
the prompt says "wearing the same ..." and "Don't redesign the uniform/gown." Then "Use the pose of the
mannequin in the second image, seen from the front / a three-quarter angle / the side: <description>. Copy
only the pose and the camera angle from the mannequin, not its look.", the setting and the expression. Every
prompt ends with "Anime illustration, full scene background, full body in frame (or waist-up portrait framing
for upper-body poses), hands fully in frame." Views are picked front 4 : three-quarter 4 : side 1; the above
and below views are vendored but not used. Older entries (before the Shisei switch) were single-image edits
with prompts starting "Same woman, ...". Uniform outfits edit from the uniform base post, the
robe-less uniform edits from the vest base post, and the gown and formal dresses edit from the gown post.

| list | contents |
|---|---|
| `ideas/outfits.yaml` | outfits with base post + reference, coverage level, seasons, themes and required setting tags |
| `ideas/settings.yaml` | castle magic school places, holiday, cafe/city and beach/pool settings, with seasons, tags and themes |
| `ideas/poses.yaml` | Shisei poses (generated by `scripts/import_shisei.py`; see the credits below) |
| `ideas/emotions.yaml` | expressions, most of them tsundere |
| `ideas/skin.yaml` | coverage levels: modest, casual, summer, swimwear |
| `ideas/styles.yaml` | art styles with weights: `anime` (default, ~80%) and alternates (rough doodle, watercolor, 90s cel, picture book, pencil sketch) |

### Art style lever

Most ideas use the house style, `anime`: the prompt is unchanged ("same face, hair, braid and art style",
"Anime illustration, full scene background"). About one idea in five gets an alternate style from
`ideas/styles.yaml`, picked by weight (anime 80, rough-doodle 5, watercolor 5, cel-90s 4, picture-book 3,
pencil-sketch 3); `--style <id>` forces one. With an alternate style the prompt says "same face, hairstyle,
braid, hair colour and eye colour, but redrawn in the art style described at the end", keeps the outfit text,
and ends with the style's `text` plus its `background` phrase instead of "Anime illustration, full scene
background". The idea records `style:` (also stored in the entry's `idea:` block by add_entry.py), and
non-default styles add a `style-<id>` tag. The style is drawn from its own random stream (seeded
`style-<seed>`), so every seed still gives the same outfit, setting, pose, view, emotion, season and theme as
before the lever existed, and anime-style ideas give the exact same prompt. Entries made before the lever have
no `style:` field; read that as `anime`.

Daily Malfoid (`plan/daily-malfoid-*.yaml`) stays in the default `anime` style. Alternate styles are for
extra, unscheduled posts; such an image is added to the plan only if it turns out well. When generating
ideas for the daily series, pass `--style anime` (or re-roll ideas whose style is not `anime`).

`rough-doodle` (日系粗糙数字涂鸦) is adapted from a style prompt by @798145343h on X
(https://x.com/798145343h/status/2117499225206317377): thick uneven black crayon outlines, flat opaque colour
that spills over the lines, white paper gaps, scribbled white highlights, simplified face and hair blocks, plain
white background. Its text keeps her identity and outfit from the reference image. Since 2026-11-04 the text
pushes harder on roughness (thick chunky crayon brush with a mouse in MS Paint, lines that wobble and break, colour
fill that misses and overshoots the lines, scribbled hatching, scratchy white highlights), because the first test
sketches (`2026-11-04-doodle-1`..`-4`) came out too neat; it still keeps adult proportions.

Compatibility checks: seasons must match; themed outfits and settings (Christmas, Halloween, ...) are used
only for that theme; the gown and evening dresses need a formal setting; swimwear needs a beach or pool
setting; floor poses (sitting, kneeling, squatting) need a setting with a `ground` phrase (which replaces
"the floor" in the description), so ballrooms, feasts and streets get only standing and upper-body poses; the
gown and formal settings use only poses marked `formal_ok`; an expression with a gesture (arms crossed, holding out a gift) goes only with a pose whose hands
are free; a pose and an expression can't both set her gaze.

## SFW rules (hard, enforced in scripts/ideas.py)

- Draconia is an adult, a **21-year-old woman**. Nothing may suggest a minor.
- No nudity, no lingerie or underwear, no see-through clothes, no suggestive or sexual poses or expressions.
- Coverage levels stop at **tasteful swimwear** (a one-piece, or a modest bikini with a cover-up). Swimwear
  is allowed only at beach/pool settings and only with poses and expressions marked `swim_ok`. Those are
  relaxed, cheerful, non-sexual ones; smug, sideways-glance and model-style poses are excluded.
- No franchise trademarks in prompts: say "castle magic school", "broom-sport pitch", "magical village".
- The generator refuses to load data or print a prompt that contains a banned term (see `BANNED` in
  `scripts/ideas.py`).

## Gallery website

**<https://rhedak.github.io/malfoid-gallery/>**: a browsable, searchable gallery of every entry in `gallery.yaml`
(rejected images are not included).

- **Grid** of thumbnails with Daily Malfoid number, clip and style badges; sort by newest, oldest or plan order.
- The sticky search and filter panel collapses to one compact row (search, active-filter chips, count) once you
  scroll past the header; click the row or *Filters* to open it again, *Collapse* (or Esc) to close it.
- **Search** (client-side, [MiniSearch](https://github.com/lucaong/minisearch), MIT, vendored in `site/vendor/`)
  over title, full prompt, tags, theme, outfit, emotion and setting names; prefix and light fuzzy matching.
- **Filters**: chips for theme, art style, status (posted / upcoming / gallery only) and media (image / video clip),
  dropdowns for outfit, emotion and location group (castle school, town & shops, home & cozy, outdoors, plain
  background). Tags in the detail view are clickable filters too. The search, filters and sort live in the URL
  query (`?q=library&theme=christmas&style=anime&media=video&sort=plan`), so a filtered view can be shared; the
  open entry is in the hash (`#/2026-11-03-christmas-1`).
- **Detail view**: full image (or the clip, with the image as poster), Daily Malfoid number and planned / posted
  date, theme, style, outfit, emotion, location, pose, tags, the full prompt (collapsible, with a copy button), base
  post, Grok result and clip links, posted links once `posted:` has them, the per-platform captions from the plan
  (X / Instagram / TikTok / Rednote tabs, with copy buttons) and the character and pose references.
  Keys: ← → browse, Esc closes, `/` focuses the search; swipe left / right on mobile.
- QA `notes`, seeds, idea prompts and other internals are left out of the site on purpose.
- **Companion pack entries**: 17 key frames and 8 activity animations from the Draconia picture packs of the
  anime AI companion ([anime_ai_companion-packs](https://github.com/rhedak/anime_ai_companion-packs)), as gallery-only
  entries under the themes *Companion pack: key frames* / *Companion pack: activities* (media *Animation* for the
  animated WebPs, assembled from the pack frames). They carry a `source:` link to the packs repo instead of Grok posts;
  add more with `scripts/add_entry.py --gallery-only --source URL --emotion ID --outfit ID`.
- **Featured wheel** above the grid: the images (thumbnails) in a fresh random order on every load, scrolling
  sideways in a loop with the centre one a little larger and brighter. It follows the search and filters, pauses on
  hover, touch, drag or a hidden tab, can be dragged, and is a static, manually scrollable strip with reduced motion.
  *Hide* / *Show* collapses it (remembered in localStorage).
- **Chat call-to-action**: an emerald "💬 Chat with her in your browser" button in the header and footer (and a
  small *Chat* button, icon only on mobile, in the collapsed sticky row) opens the anime AI companion web demo with
  the Draconia uniform pack: <https://rhedak.github.io/anime_ai_companion/demo/?pack=draconia-uniform>.
- **Link preview**: sharing the URL on X and elsewhere shows `site/og-banner.jpg` (1200×630, Open Graph and
  `summary_large_image` Twitter card tags in `site/index.html`): the six images with clips, cropped around the face.
  Regenerate it with `python3 scripts/make_og_banner.py` (`--debug` draws the face boxes; positions are in `PANELS`).

How it is built: `scripts/build_site.py` merges `gallery.yaml`, `input/*.yaml`, `plan/daily-malfoid-*.yaml`,
`videos/videos.yaml` and the names from `ideas/*.yaml` into `_site/index.json`, copies `site/` and the linked
images, clips and references, and makes ~480 px WebP thumbnails (`_site/thumbs/`, needs Pillow). Older entries
without an `idea:` block get their outfit from their prompt and their location group from their tags. Nothing
generated is committed to `main`.

Publishing: Pages serves the `gh-pages` branch, which holds only the built `_site/`. After changing the YAML,
rebuild and push it again (the index does not update by itself):

```sh
python3 scripts/build_site.py --out /tmp/malfoid-site
cd /tmp/malfoid-site && git init -q -b gh-pages && git add -A \
  && git commit -qm "Build site" && git push -f https://github.com/rhedak/malfoid-gallery.git gh-pages
```

(A GitHub Actions workflow that builds and deploys on every push to `main` can replace this step; adding it needs
a token with the `workflow` scope or a commit made in the GitHub web UI.)

Preview locally:

```sh
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install pillow   # or any Python with Pillow
/tmp/venv/bin/python scripts/build_site.py                      # -> _site/  (--no-thumbs works without Pillow)
cd _site && python3 -m http.server 8000                         # http://localhost:8000/
```

## Pose references and credits

Poses come from **[Shisei 姿勢](https://github.com/wquguru/shisei)** by The Shisei Authors, a free mannequin
pose reference library (<https://shisei.indaloop.app/>). Thank you!

- **Images and data: CC0 1.0.** Shisei's images and its own data (`data/catalog.json`, including the English
  pose descriptions used in our prompts) are dedicated to the public domain under CC0 1.0 Universal. No
  attribution is required; we credit it anyway. Shisei's code is Apache-2.0 (we use none of it).
  `references/poses/LICENSE-images` and `references/poses/NOTICE` are Shisei's own files, copied unchanged.
- **Pose list: credited to ギア ([@giaaibusi](https://x.com/giaaibusi)) / ai-pose-gallery.** The selection,
  numbering, names and categories of Shisei's poses follow the public pose catalog of
  [ai-pose-gallery](https://ai-pose-gallery.pages.dev/) by ギア. Per Shisei's NOTICE that part is credited,
  not licensed (neither CC0 nor Apache-2.0 covers it). Neither Shisei nor this gallery is affiliated with
  or endorsed by its author.
- **What we use:** only the full-body standard (`std`, P###) and upper-body (`upper`, U###) series. The sexy
  and duo series are not used at all, and from std/upper we also skip every pose Shisei rates suggestive and
  those we judged unsuitable for SFW posts (chest-out, arched-back, hip-sway, hands-behind-head pin-up,
  lying-down, bent-forward and wide-knee squat poses; the whole Chest emphasis and Sexy categories, and U024).
  The kept list is the `KEEP` table in `scripts/import_shisei.py`: 32 std + 24 upper poses.
- **Images:** `references/poses/shisei-<id>-<view>.webp` are Shisei's 900x1200 (`w900`) files for each kept
  pose and each view that passed Shisei's QC (front, diag = three-quarter, side, above, below): the grey clay
  mannequin where Shisei has a clay map for that view, otherwise the line-art mannequin
  (`line_views` in `ideas/poses.yaml`). About 3.2 MB in total.
- To refresh: `git clone --depth 1 --filter=blob:none --no-checkout https://github.com/wquguru/shisei.git
  /workspace/shisei && python3 scripts/import_shisei.py --shisei /workspace/shisei`.

Earlier entries used `ideas/archive/poses-ai-pose-gallery-zh.yaml`: our own short English paraphrases of pose
names from [anhao/ai-pose-gallery-zh](https://github.com/anhao/ai-pose-gallery-zh) (Anhao's Chinese
translation of the same ai-pose-gallery by ギア), with original ids kept for traceability. No images or data
files were copied from that repo. The generator no longer uses that list.

- `videos/`: short Grok Imagine clips of the favourite images, listed with prompts in `videos/videos.yaml`.
