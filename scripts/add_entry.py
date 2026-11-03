#!/usr/bin/env python3
"""Add one generated image to the gallery.

Copies the original Grok Imagine JPG into images/ (byte-for-byte, unchanged),
writes input/<id>.yaml with the full trace, and appends the entry to gallery.yaml.

Example:
  python3 scripts/add_entry.py \
    --image /path/to/thanksgiving-1.jpg --id 2026-11-03-thanksgiving-1 \
    --title "Thanksgiving dinner" --tags thanksgiving,autumn,food \
    --base-post https://grok.com/imagine/post/... \
    --reference references/draconia-uniform.webp \
    --prompt "Same woman, ..." \
    --result-post https://grok.com/imagine/post/... \
    --created 2026-11-03

No third-party dependencies (YAML is written with JSON-style quoted strings,
which are valid YAML).
"""
import argparse
import datetime
import json
import os
import shutil
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "gallery.yaml")
INDEX_HEADER = (
    "# Gallery index: one item per image, oldest first.\n"
    "# A posting routine picks the first entry whose `posted:` is empty,\n"
    "# posts it, then fills `posted:` with the date and post URLs.\n"
    "entries:\n"
)


def q(s):
    return json.dumps(s, ensure_ascii=False)


def image_size(path):
    try:
        from PIL import Image  # optional
        with Image.open(path) as im:
            return im.size
    except ImportError:
        pass
    # minimal JPEG SOF parser
    with open(path, "rb") as f:
        data = f.read()
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack(">HH", data[i + 5:i + 9])
            return w, h
        seg_len = struct.unpack(">H", data[i + 2:i + 4])[0]
        i += 2 + seg_len
    raise ValueError("cannot read image size of " + path)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--image", required=True, help="source image file (original Grok JPG)")
    p.add_argument("--id", help="entry id / base name; default <created>-<image basename>")
    p.add_argument("--title", required=True)
    p.add_argument("--tags", required=True, help="comma-separated; the first tag is the theme")
    p.add_argument("--base-post", required=True, help="Grok Imagine post that was edited")
    p.add_argument("--reference", required=True, help="path under references/")
    p.add_argument("--prompt", required=True, help="exact full prompt text")
    p.add_argument("--result-post", required=True, help="Grok Imagine post of the result")
    p.add_argument("--created", default=datetime.date.today().isoformat())
    p.add_argument("--tool", default="Grok Imagine (edit)")
    p.add_argument("--notes", default="")
    p.add_argument("--force", action="store_true", help="overwrite an existing entry's files (index not duplicated)")
    a = p.parse_args()

    if not os.path.isfile(os.path.join(ROOT, a.reference)):
        sys.exit("reference not found: " + a.reference)
    ext = os.path.splitext(a.image)[1].lower() or ".jpg"
    entry_id = a.id or f"{a.created}-{os.path.splitext(os.path.basename(a.image))[0]}"
    img_rel = f"images/{entry_id}{ext}"
    inp_rel = f"input/{entry_id}.yaml"
    img_abs = os.path.join(ROOT, img_rel)
    inp_abs = os.path.join(ROOT, inp_rel)

    index_text = open(INDEX, encoding="utf-8").read() if os.path.exists(INDEX) else INDEX_HEADER
    in_index = f"  - id: {q(entry_id)}\n" in index_text
    if (os.path.exists(inp_abs) or in_index) and not a.force:
        sys.exit(f"entry {entry_id} already exists (use --force to rewrite its files)")

    shutil.copyfile(a.image, img_abs)
    w, h = image_size(img_abs)
    tags = [t.strip() for t in a.tags.split(",") if t.strip()]

    yaml = (
        f"id: {q(entry_id)}\n"
        f"title: {q(a.title)}\n"
        f"theme: {q(tags[0] if tags else '')}\n"
        f"tags: [{', '.join(q(t) for t in tags)}]\n"
        f"created: {a.created}\n"
        f"tool: {q(a.tool)}\n"
        f"base_post: {q(a.base_post)}\n"
        f"reference: {q(a.reference)}\n"
        f"prompt: {q(a.prompt)}\n"
        f"result_post: {q(a.result_post)}\n"
        f"image: {q(img_rel)}\n"
        f"size: \"{w}x{h}\"\n"
        f"notes: {q(a.notes)}\n"
    )
    with open(inp_abs, "w", encoding="utf-8") as f:
        f.write(yaml)

    if not in_index:
        index_text += (
            f"  - id: {q(entry_id)}\n"
            f"    title: {q(a.title)}\n"
            f"    created: {a.created}\n"
            f"    input: {q(inp_rel)}\n"
            f"    image: {q(img_rel)}\n"
            f"    posted:\n"
        )
        with open(INDEX, "w", encoding="utf-8") as f:
            f.write(index_text)
    print(f"added {entry_id}: {img_rel} ({w}x{h}), {inp_rel}")


if __name__ == "__main__":
    main()
