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
images/               generated images, the original Grok Imagine JPGs, unchanged
input/                one YAML file per image, same base name as the image
ideas/                idea lists for the generator: outfits, settings, poses, emotions, skin (coverage)
scripts/add_entry.py  helper that adds a new entry (image + input file + index line)
scripts/ideas.py      random idea generator: outfit + setting + pose + emotion + coverage -> edit prompt
scripts/miniyaml.py   tiny YAML loader (uses PyYAML if installed), so the scripts need only Python 3
```

Entry ids are `<created date>-<theme>-<n>`, e.g. `2026-11-03-thanksgiving-1`, giving
`images/2026-11-03-thanksgiving-1.jpg` and `input/2026-11-03-thanksgiving-1.yaml`.

## How an entry is traced

```
input/<id>.yaml
  -> base_post   (Grok Imagine post that was edited)
   + reference   (the matching file in references/)
   + prompt      (exact full edit prompt)
  -> result_post (Grok Imagine post of the result)
  -> image       (images/<id>.jpg, downloaded unchanged)
```

Fields of an input file: `id`, `title`, `theme`, `tags`, `created`, `tool`, `base_post`, `reference`,
`prompt`, `result_post`, `image`, `size`, `notes`.

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

`scripts/ideas.py` picks a random outfit, setting, pose, emotion and coverage level from `ideas/*.yaml`,
checks that they fit together, and prints the combination with a ready Grok Imagine edit prompt and the base
post and reference to edit from.

```sh
python3 scripts/ideas.py                         # one random idea (a random seed is chosen and printed)
python3 scripts/ideas.py --seed 7 --count 3      # seeds 7, 8, 9; any idea can be re-made from its seed
python3 scripts/ideas.py --season winter --theme christmas --tsundere
python3 scripts/ideas.py --outfit gown           # or --setting library, --coverage summer
python3 scripts/ideas.py --seed 7 --yaml > /tmp/idea.yaml
# make the image in Grok Imagine from the printed base post + prompt, download it, then:
python3 scripts/add_entry.py --idea /tmp/idea.yaml --image ~/Downloads/result.jpg \
  --result-post https://grok.com/imagine/post/<result-id>
```

With `--idea`, add_entry.py takes the base post, reference, prompt, title and tags from the idea (flags
override them) and stores an `idea:` block (seed, outfit, setting, pose, pose source id, emotion, coverage,
season, theme) in the input file. If you pass a changed `--prompt`, the entry records
`prompt_edited: true` and keeps the generated prompt as `idea_prompt`.

Prompts follow the style of the existing entries: they start with "Same woman, same face, hair, braid and
art style, ...". For her own outfits (robed uniform, uniform without robe, gown) the prompt says "wearing the
same ..." and "Don't redesign the uniform/gown." Every prompt ends with ", anime illustration, full scene
background, portrait framing, hands fully in frame." Uniform outfits edit from the uniform base post, the
robe-less uniform edits from the vest base post, and the gown and formal dresses edit from the gown post.

| list | contents |
|---|---|
| `ideas/outfits.yaml` | outfits with base post + reference, coverage level, seasons, themes and required setting tags |
| `ideas/settings.yaml` | castle magic school places, holiday, cafe/city and beach/pool settings, with seasons, tags and themes |
| `ideas/poses.yaml` | pose phrases (see the source credit below) |
| `ideas/emotions.yaml` | expressions, most of them tsundere |
| `ideas/skin.yaml` | coverage levels: modest, casual, summer, swimwear |

Compatibility checks: seasons must match; themed outfits and settings (Christmas, Halloween, ...) are used
only for that theme; the gown and evening dresses need a formal setting; swimwear needs a beach or pool
setting; an expression with a gesture (arms crossed, holding out a gift) goes only with a pose whose hands
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

## Pose source

Most of the pose phrases in `ideas/poses.yaml` are our own short English paraphrases of pose **names** from
[anhao/ai-pose-gallery-zh](https://github.com/anhao/ai-pose-gallery-zh) (`data/pose-zh.json`, Anhao's Chinese
translation of the pose gallery by ギア [@giaaibusi](https://x.com/giaaibusi),
<https://ai-pose-gallery.pages.dev/>). Each entry keeps the original id and Chinese name (`src_id`,
`src_zh`) for traceability. That repo's MIT licence covers only its code; its images and pose data belong to
the original author and may not be used commercially. So this repo copies **no images and no data file**,
only paraphrased pose names, and only from the standard full-body and cute upper-body lines (all sexy,
explicit, lying-down and chest-emphasis poses were skipped). Entries with `src_id: null` are our own.
