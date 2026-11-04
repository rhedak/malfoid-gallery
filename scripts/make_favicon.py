#!/usr/bin/env python3
"""Make the site favicons from the v3 upper-body doodle (2026-11-04-doodle-upper-1).

Writes site/favicon.ico (16/32/48), favicon-32.png, apple-touch-icon.png (180), icon-192.png, icon-512.png.
Small sizes (<=48) use a tighter face crop so the eyes still read at 16px; larger sizes show the whole head
on a white rounded square with a thin emerald edge. Usage: python3 scripts/make_favicon.py [--preview out.png]
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "images", "2026-11-04-doodle-upper-1.jpg")
OUT = os.path.join(ROOT, "site")
# crop boxes in source pixels (1408x1408): whole head, and a tight face crop for tiny sizes
HEAD = (430, 60, 990, 620)
FACE = (530, 200, 900, 570)
EMERALD = (16, 185, 129)


def icon(size, box, rounded=True):
    S = size * 4  # supersample
    src = Image.open(SRC).convert("RGB").crop(box)
    if size <= 48:  # a touch more contrast so lines survive downscaling
        src = ImageEnhance.Contrast(src).enhance(1.25)
    pad = 0 if not rounded else int(S * 0.06)
    art = src.resize((S - 2 * pad, S - 2 * pad), Image.LANCZOS)
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    mask = Image.new("L", (S, S), 0)
    r = int(S * 0.22) if rounded else 0
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), r, fill=255)
    bg = Image.new("RGBA", (S, S), (255, 255, 255, 255))
    bg.paste(art, (pad, pad))
    canvas.paste(bg, (0, 0), mask)
    if rounded and size >= 48:
        ImageDraw.Draw(canvas).rounded_rectangle((0, 0, S - 1, S - 1), r, outline=EMERALD + (255,), width=max(4, S // 64))
    out = canvas.resize((size, size), Image.LANCZOS)
    if size <= 32:
        out = out.filter(ImageFilter.UnsharpMask(radius=0.6, percent=80, threshold=1))
    return out


def build():
    files = {}
    files["favicon-32.png"] = icon(32, FACE)
    files["apple-touch-icon.png"] = icon(180, HEAD, rounded=False).convert("RGB")  # iOS rounds it itself
    files["icon-192.png"] = icon(192, HEAD)
    files["icon-512.png"] = icon(512, HEAD)
    for name, im in files.items():
        im.save(os.path.join(OUT, name), optimize=True)
    i16, i32, i48 = icon(16, FACE), icon(32, FACE), icon(48, HEAD)
    i48.save(os.path.join(OUT, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=[i16, i32])
    return i16, i32


def preview(path):
    i16, i32 = build()
    W, H = 900, 380
    p = Image.new("RGB", (W, H), (16, 26, 22))
    d = ImageDraw.Draw(p)
    x = 30
    for s, im in [(16, i16), (32, i32), (64, icon(64, HEAD)), (180, icon(180, HEAD))]:
        p.paste(im, (x, 40 + 180 - s), im)
        d.text((x, 235), f"{s}px", fill=(200, 210, 205))
        x += s + 50
    big = i16.resize((96, 96), Image.NEAREST)  # 16px zoomed to show the pixels
    p.paste(big, (x, 124), big); d.text((x, 235), "16px x6", fill=(200, 210, 205))
    # browser tab mock
    for y0, bar, tab, fg in [(275, (222, 225, 230), (255, 255, 255), (40, 40, 40)), (325, (32, 33, 36), (53, 54, 58), (230, 230, 230))]:
        d.rectangle((0, y0, W, y0 + 44), fill=bar)
        d.rounded_rectangle((20, y0 + 8, 300, y0 + 44), 8, fill=tab)
        p.paste(i16, (34, y0 + 18), i16)
        d.text((60, y0 + 19), "Malfoid Gallery", fill=fg)
        d.rounded_rectangle((310, y0 + 8, 560, y0 + 44), 8, fill=bar)
        d.text((330, y0 + 19), "Other tab", fill=(130, 130, 130))
    p.save(path)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview")
    a = ap.parse_args()
    preview(a.preview) if a.preview else build()
    print("favicons written to site/")
