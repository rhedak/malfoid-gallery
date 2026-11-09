#!/usr/bin/env python3
"""Make the social link-preview banner (Open Graph / Twitter card) for the gallery site.

Writes site/og-banner.jpg (1200x630 JPG): the six favourite images (the ones with a clip in videos/videos.yaml)
as tall portrait panels side by side, cropped face-safe around the face and upper body, with the
"Malfoid Gallery" title on a dark gradient band. Needs Pillow; the font is Cormorant Garamond (the site's
heading font) when installed, otherwise another serif.

    python3 scripts/make_og_banner.py            # -> site/og-banner.jpg
    python3 scripts/make_og_banner.py --debug    # also draws the face boxes, to check the crops
    python3 scripts/make_og_banner.py --index    # -> site/malfoid-index/og-banner.jpg ("Malfoid Index" banner)
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import miniyaml  # noqa: E402

W, H = 1200, 630
GAP = 4
FACE_Y = 0.25      # where the face centre sits in a panel (fraction of panel height), well above the title band
BAND_TOP = 330     # the dark gradient starts here

# Face boxes, checked by eye, as fractions of each source image: (centre x, centre y, face width).
# `zoom` > 1 crops tighter (for full-body shots where she is small in the frame).
# Panel order is left to right.
PANELS = [
    ("2026-11-03-autumn-2", dict(cx=0.50, cy=0.21, fw=0.24, zoom=1.0)),
    ("2026-11-03-black-friday-checkout-1", dict(cx=0.52, cy=0.17, fw=0.22, zoom=1.0)),
    ("2026-11-03-christmas-1", dict(cx=0.42, cy=0.20, fw=0.24, zoom=1.0)),
    ("2026-11-03-black-friday-street-1", dict(cx=0.55, cy=0.21, fw=0.26, zoom=1.0)),
    ("2026-11-03-potions-classroom-1", dict(cx=0.48, cy=0.21, fw=0.20, zoom=1.0)),
    ("2026-11-03-tower-stargazing-1", dict(cx=0.47, cy=0.14, fw=0.14, zoom=1.7)),
]

FONT_DIRS = ["/usr/share/fonts/truetype/sand-box/google/Cormorant Garamond", "/usr/share/fonts/truetype/cormorant",
             os.path.expanduser("~/.fonts"), "/usr/share/fonts/truetype/dejavu"]


def font(italic, size, weight="SemiBold"):
    names = ["CormorantGaramond-Italic-VariableFont_wght.ttf"] if italic else ["CormorantGaramond-VariableFont_wght.ttf"]
    names += ["DejaVuSerif-Italic.ttf" if italic else "DejaVuSerif.ttf"]
    for name in names:
        for d in FONT_DIRS:
            path = os.path.join(d, name)
            if os.path.exists(path):
                f = ImageFont.truetype(path, size)
                try:
                    f.set_variation_by_name(weight)
                except Exception:
                    pass
                return f
    return ImageFont.load_default(size)


def crop_panel(img, pw, ph, cx, cy, fw, zoom, debug=False):
    """Crop a pw:ph window that keeps the whole face box inside, with the face centre at FACE_Y."""
    iw, ih = img.size
    ch = min(ih, iw * ph / pw) / zoom  # crop height in source pixels
    cw = ch * pw / ph
    left = min(max(cx * iw - cw / 2, 0), iw - cw)
    top = min(max(cy * ih - FACE_Y * ch, 0), ih - ch)
    # face-safety check: the face box must be fully inside the crop and above the title band
    fx0, fx1 = (cx - fw / 2) * iw, (cx + fw / 2) * iw
    fy0, fy1 = (cy - fw * iw / ih * 0.6) * ih, (cy + fw * iw / ih * 0.6) * ih
    band = top + ch * (BAND_TOP + 60) / ph
    assert left <= fx0 and fx1 <= left + cw, "face cut horizontally"
    assert top <= fy0 and fy1 <= band, "face cut vertically or under the title band"
    out = img.crop((round(left), round(top), round(left + cw), round(top + ch))).resize((pw, ph), Image.LANCZOS)
    if debug:
        s = pw / cw
        ImageDraw.Draw(out).rectangle([(fx0 - left) * s, (fy0 - top) * s, (fx1 - left) * s, (fy1 - top) * s], outline="red", width=2)
    return out


def gradient_text(text, fnt, top_rgb, bottom_rgb):
    """Text as an RGBA image with a vertical colour gradient, like the site's background-clip headings."""
    l, t, r, b = fnt.getbbox(text)
    mask = Image.new("L", (r - l + 4, b - t + 4), 0)
    ImageDraw.Draw(mask).text((-l + 2, -t + 2), text, font=fnt, fill=255)
    grad = Image.new("RGB", mask.size)
    gd = ImageDraw.Draw(grad)
    for y in range(mask.height):
        k = y / max(1, mask.height - 1)
        gd.line([(0, y), (mask.width, y)], fill=tuple(round(a + (c - a) * k) for a, c in zip(top_rgb, bottom_rgb)))
    out = grad.convert("RGBA")
    out.putalpha(mask)
    return out, t


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", default=os.path.join(ROOT, "site", "og-banner.jpg"))
    ap.add_argument("--debug", action="store_true", help="draw the face boxes")
    ap.add_argument("--index", action="store_true", help="the Malfoid Index sub page banner instead of the gallery one")
    args = ap.parse_args()
    if args.index and args.out == os.path.join(ROOT, "site", "og-banner.jpg"):
        args.out = os.path.join(ROOT, "site", "malfoid-index", "og-banner.jpg")
    word2 = "Index" if args.index else "Gallery"
    subtitle = ("FANMADE FICTION, VIDEOS, COMICS AND MORE" if args.index
                else "DAILY MALFOID  ·  DRACONIA MALFOID  ·  GROK IMAGINE")

    videos = {v["id"] for v in miniyaml.load(os.path.join(ROOT, "videos", "videos.yaml"))}
    gallery = {e["id"]: e for e in miniyaml.load(os.path.join(ROOT, "gallery.yaml"))["entries"]}
    for pid, _ in PANELS:
        if pid not in videos:
            print("note: %s has no clip in videos.yaml" % pid, file=sys.stderr)

    canvas = Image.new("RGB", (W, H), (7, 11, 10))
    n = len(PANELS)
    pw_base = (W - GAP * (n - 1)) / n
    x = 0.0
    for i, (pid, f) in enumerate(PANELS):
        x1 = W if i == n - 1 else round(x + pw_base)
        pw = x1 - round(x)
        img = Image.open(os.path.join(ROOT, gallery[pid]["image"])).convert("RGB")
        canvas.paste(crop_panel(img, pw, H, debug=args.debug, **f), (round(x), 0))
        x = x1 + GAP

    # thin silver hairlines between panels
    over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(over)
    x = 0.0
    for i in range(n - 1):
        x += pw_base
        od.rectangle([round(x), 0, round(x) + GAP - 1, H], fill=(201, 211, 208, 70))
        x += GAP
    # dark gradient band for the title, plus a soft vignette at the top
    for y in range(BAND_TOP, H):
        k = (y - BAND_TOP) / (H - BAND_TOP)
        od.line([(0, y), (W, y)], fill=(5, 9, 8, round(255 * min(1, 0.05 + 1.25 * k ** 1.25))))
    for y in range(0, 40):
        od.line([(0, y), (W, y)], fill=(5, 9, 8, round(90 * (1 - y / 40))))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), over)

    # title: silver "Malfoid" + emerald italic "Gallery", centred
    size = 112
    t1, top1 = gradient_text("Malfoid", font(False, size), (246, 249, 248), (138, 151, 147))
    t2, top2 = gradient_text(word2, font(True, size), (160, 245, 210), (16, 185, 129))
    space = round(size * 0.24)
    tw = t1.width + space + t2.width
    tx = (W - tw) // 2
    base_y = 470
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for t, xx, tp in ((t1, tx, top1), (t2, tx + t1.width + space, top2)):
        shadow = Image.new("RGBA", t.size, (0, 0, 0, 255))
        shadow.putalpha(t.getchannel("A"))
        glow.alpha_composite(shadow, (xx, base_y + tp - top1 + 3))
    canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(8)))
    canvas.alpha_composite(t1, (tx, base_y))
    canvas.alpha_composite(t2, (tx + t1.width + space, base_y + top2 - top1))

    d = ImageDraw.Draw(canvas)
    # emerald hairline and subtitle
    line_y = base_y + t1.height + 18
    for xx in range(W // 2 - 70, W // 2 + 70):
        a = 1 - abs(xx - W // 2) / 70
        d.point((xx, line_y), fill=(52, 211, 153, round(255 * a)))
    sub = subtitle
    sf = font(False, 21, "Medium")
    spacing = 3
    widths = [d.textlength(ch, font=sf) for ch in sub]
    sw = sum(widths) + spacing * (len(sub) - 1)
    sx = (W - sw) / 2
    for ch, w in zip(sub, widths):
        d.text((sx, line_y + 14), ch, font=sf, fill=(201, 211, 208, 235))
        sx += w + spacing

    canvas.convert("RGB").save(args.out, "JPEG", quality=88, optimize=True, progressive=True)
    print("wrote %s (%d KB)" % (os.path.relpath(args.out), os.path.getsize(args.out) // 1024))


if __name__ == "__main__":
    main()
