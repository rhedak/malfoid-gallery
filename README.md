# Malfoid Gallery

Seasonal and social-media images of **Draconia Malfoid**, made in **Grok Imagine** (xAI) by editing her
base posts. One image from this gallery is shared per day on **X** and **Instagram**.

Every image is traceable: for each one you can see which base post and reference it was made from, the
exact prompt, and the Grok Imagine post of the result.

> Draconia Malfoid is an unofficial, non-commercial original fan character, a **21-year-old adult woman**,
> loosely inspired by Draco Malfoy from the *Harry Potter* series. *Harry Potter* and related names are
> trademarks of Warner Bros. Entertainment Inc. / Wizarding World. This gallery is **not affiliated with,
> endorsed or sponsored by** Warner Bros., Wizarding World Digital or J.K. Rowling. Images will be taken down
> on request by any rights holder (contact: <rhedak00@yahoo.de>).

## Layout

```
gallery.yaml          index of all entries, oldest first, with a `posted:` field per entry
references/           base reference images of Draconia
  draconia-uniform.webp   robed school uniform (neutral pose)
  draconia-gown.webp      green-and-silver Yule Ball gown (neutral pose)
  draconia-vest.webp      uniform without the robe: shirt, tie, vest, skirt (neutral pose)
  poses/                  mannequin pose references from Shisei (CC0), shisei-<P###|U###>-<view>.webp,
                          900x1200; LICENSE-images and NOTICE from Shisei alongside
images/               generated images, the original Grok Imagine JPGs, unchanged
input/                one YAML file per image, same base name as the image
ideas/                idea lists for the generator: outfits, settings, poses, emotions, skin (coverage)
ideas/archive/        the old pose list (paraphrased ai-pose-gallery names); kept so older entries stay traceable
scripts/add_entry.py  helper that adds a new entry (image + input file + index line)
scripts/ideas.py      random idea generator: outfit + setting + pose/view + emotion + coverage -> prompt
scripts/import_shisei.py  rebuilds ideas/poses.yaml and references/poses/ from a Shisei checkout
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

A daily routine takes the first entry in `gallery.yaml` whose `posted:` is empty, posts the image on X and
Instagram, then fills in `posted:`, for example:

```yaml
    posted: {date: 2026-11-04, x: "https://x.com/...", instagram: "https://www.instagram.com/p/..."}
```

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

## Idea generator

`scripts/ideas.py` picks a random outfit, setting, pose (with a camera view), emotion and coverage level
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
python3 scripts/ideas.py --seed 7 --yaml > /tmp/idea.yaml
# make the image in Grok Imagine from the base post (image 1) + pose_ref (image 2) + prompt, download it, then:
python3 scripts/add_entry.py --idea /tmp/idea.yaml --image ~/Downloads/result.jpg \
  --result-post https://grok.com/imagine/post/<result-id>
```

With `--idea`, add_entry.py takes the base post, reference, pose_ref, prompt, title and tags from the idea
(flags override them) and stores an `idea:` block (seed, outfit, setting, pose, pose name, view, Shisei id,
emotion, coverage, season, theme) in the input file. If you pass a changed `--prompt`, the entry records
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
