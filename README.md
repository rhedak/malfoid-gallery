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
images/               generated images, the original Grok Imagine JPGs, unchanged
input/                one YAML file per image, same base name as the image
scripts/add_entry.py  helper that adds a new entry (image + input file + index line)
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
