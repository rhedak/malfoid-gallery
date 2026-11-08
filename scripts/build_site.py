#!/usr/bin/env python3
"""Build the static gallery website (GitHub Pages) from the repo data.

Reads gallery.yaml, input/*.yaml, plan/daily-malfoid-*.yaml, videos/videos.yaml and the ideas/ lists,
and writes a ready-to-serve folder (default `_site/`, not committed):

  _site/index.html, app.js, style.css, vendor/   copied from site/ (the static source)
  _site/index.json                               one merged record per gallery entry
  _site/thumbs/<id>.webp                         ~480 px wide thumbnails (needs Pillow)
  _site/images/, videos/, references/            the media the pages link to (copied unchanged)

QA notes, seeds, idea prompts and rejected/ are left out on purpose.

    python3 scripts/build_site.py            # build into _site/
    python3 scripts/build_site.py --out /tmp/site --no-thumbs
    cd _site && python3 -m http.server 8000  # preview at http://localhost:8000/
"""
import argparse
import datetime
import glob
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import miniyaml  # noqa: E402

THUMB_WIDTH = 480
THUMB_QUALITY = 80

THEME_NAMES = {
    "autumn": "Autumn", "winter": "Winter", "christmas": "Christmas", "thanksgiving": "Thanksgiving",
    "black-friday": "Black Friday", "everyday": "Everyday", "doodle": "Doodle tests",
    "halloween": "Halloween", "new-year": "New Year", "valentines": "Valentine's", "spring": "Spring",
    "summer": "Summer", "pack-keyframes": "Companion pack: key frames", "pack-activities": "Companion pack: activities",
}
LOCATION_NAMES = {
    "castle": "Castle school", "town": "Town & shops", "home": "Home & cozy", "outdoors": "Outdoors",
    "plain": "Plain background", "": "Unknown",
}
STYLE_NAMES = {"anime": "Anime", "rough-doodle": "Rough doodle", "cel-90s": "90s cel"}
STATUS_NAMES = {"posted": "Posted", "upcoming": "Upcoming", "gallery-only": "Gallery only"}
# Older entries (made before ideas.py) have no `idea:` block; infer their outfit from the prompt.
OUTFIT_HINTS = [
    ("camel coat", "camel-coat"), ("christmas sweater", "christmas-sweater"),
    ("cream knit sweater", "cream-sweater-plaid"), ("gown", "gown"), ("black robe", "uniform-robe"),
    ("hooded robe", "uniform-robe"), ("grey vest", "uniform-vest"),
]


def load(path):
    return miniyaml.load(os.path.join(ROOT, path))


def humanize(s):
    return (s or "").replace("-", " ").strip().capitalize()


def by_id(items):
    return {x["id"]: x for x in items or []}


def is_animated(rel):
    """True for an animated WebP/GIF (companion pack activities); needs Pillow, else False."""
    if not rel.lower().endswith((".webp", ".gif")):
        return False
    try:
        from PIL import Image
        with Image.open(os.path.join(ROOT, rel)) as im:
            return getattr(im, "n_frames", 1) > 1
    except Exception:
        return False


def location_group(setting, tags, style):
    stags = set((setting or {}).get("tags") or [])
    if setting:
        if "castle" in stags:
            return "castle"
        if "city" in stags:
            return "town"
        if "indoor" in stags:
            return "home"
        return "outdoors"
    if style and style != "anime":
        return "plain"
    tags = set(tags)
    if "companion-pack" in tags:
        return "plain"
    if "castle" in tags:
        return "castle"
    if tags & {"park", "leaves"}:
        return "outdoors"
    if tags & {"food", "cozy", "christmas", "thanksgiving"}:
        return "home"
    return ""


def infer_outfit(prompt):
    p = (prompt or "").lower()
    for hint, oid in OUTFIT_HINTS:
        if hint in p:
            return oid
    return None


def size_of(s):
    try:
        w, h = (int(x) for x in str(s).lower().split("x"))
        return w, h
    except Exception:
        return None, None


def captions_of(day):
    out = {}
    for platform in ("x", "instagram", "tiktok", "rednote"):
        block = day.get(platform)
        if isinstance(block, dict):
            out[platform] = {k: v for k, v in block.items() if v not in (None, "")}
    return out


def posted_of(value):
    """`posted:` is empty, a date, or {date, x, instagram, ...}."""
    if not value:
        return None
    if isinstance(value, dict):
        links = {k: v for k, v in value.items() if k != "date" and isinstance(v, str) and v.startswith("http")}
        return {"date": str(value.get("date") or ""), "links": links}
    return {"date": str(value), "links": {}}


def build_index():
    gallery = load("gallery.yaml")["entries"]
    outfits = by_id(load("ideas/outfits.yaml").get("outfits"))
    settings = by_id(load("ideas/settings.yaml").get("settings"))
    emotions = by_id(load("ideas/emotions.yaml").get("emotions"))
    styles = by_id(load("ideas/styles.yaml").get("styles"))
    videos = by_id(load("videos/videos.yaml"))
    days = {}
    for plan_path in sorted(glob.glob(os.path.join(ROOT, "plan", "daily-malfoid-*.yaml"))):
        plan = load(os.path.relpath(plan_path, ROOT))
        for day in plan.get("days") or []:
            days[day["id"]] = dict(day, series=plan.get("series", "Daily Malfoid"))

    entries = []
    for order, g in enumerate(gallery):
        inp = load(g["input"])
        idea = inp.get("idea") if isinstance(inp.get("idea"), dict) else {}
        tags = list(inp.get("tags") or [])
        style = idea.get("style") or next((t[6:] for t in tags if t.startswith("style-")), None) or "anime"
        outfit = idea.get("outfit") or infer_outfit(inp.get("prompt"))
        setting = settings.get(idea.get("setting")) if idea.get("setting") else None
        emotion = idea.get("emotion")
        day = days.get(g["id"])
        video = videos.get(g["id"])
        gallery_only = bool(g.get("gallery_only") or inp.get("gallery_only"))
        posted = posted_of(g.get("posted"))
        status = "gallery-only" if gallery_only else ("posted" if posted else "upcoming")
        w, h = size_of(inp.get("size"))
        pose_name = idea.get("pose_name")
        rec = {
            "id": g["id"],
            "order": order,
            "title": inp.get("title") or g.get("title"),
            "created": str(g.get("created") or inp.get("created") or ""),
            "theme": inp.get("theme") or "",
            "themeName": THEME_NAMES.get(inp.get("theme"), humanize(inp.get("theme"))),
            "tags": tags,
            "style": style,
            "styleName": STYLE_NAMES.get(style, humanize(style)),
            "styleDesc": (styles.get(style) or {}).get("name"),
            "variant": idea.get("variant"),
            "status": status,
            "planned": str(g["planned"]) if g.get("planned") else None,
            "posted": posted,
            "image": g["image"],
            "thumb": "thumbs/%s.webp" % g["id"],
            "width": w,
            "height": h,
            "prompt": inp.get("prompt") or "",
            "tool": inp.get("tool"),
            "basePost": inp.get("base_post"),
            "resultPost": inp.get("result_post"),
            "reference": inp.get("reference"),
            "poseRef": inp.get("pose_ref"),
            "poseName": pose_name,
            "poseView": idea.get("pose_view"),
            "outfit": outfit,
            "outfitName": (outfits.get(outfit) or {}).get("name", humanize(outfit)) if outfit else None,
            "emotion": emotion,
            "emotionName": (emotions.get(emotion) or {}).get("name", humanize(emotion)) if emotion else None,
            "setting": idea.get("setting"),
            "settingName": (setting or {}).get("name"),
            "location": location_group(setting, tags, style),
            "season": idea.get("season"),
            "media": "video" if video else ("animation" if is_animated(g["image"]) else "image"),
            "source": inp.get("source"),
        }
        rec["locationName"] = LOCATION_NAMES[rec["location"]]
        if day:
            rec["daily"] = {
                "series": day.get("series"), "n": day.get("n"), "label": day.get("label"),
                "date": str(day.get("date")), "type": day.get("type"), "theme": day.get("theme"),
                "captions": captions_of(day),
            }
        if video:
            rec["video"] = {
                "src": video.get("video"), "post": video.get("video_post"),
                "sourcePost": video.get("source_post"), "motion": video.get("motion"),
            }
        entries.append(rec)

    return {
        "title": "Malfoid Gallery",
        "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "repo": "https://github.com/rhedak/malfoid-gallery",
        "labels": {"status": STATUS_NAMES, "location": LOCATION_NAMES, "theme": THEME_NAMES},
        "entries": entries,
    }


def build_works():
    """The Malfoid Index sub page: malfoid-index/works.yaml -> works.json (newest added first)."""
    data = load("malfoid-index/works.yaml")

    def text(v):
        return "" if v is None else str(v).strip()

    works = []
    for w in data.get("works") or []:
        if not isinstance(w, dict) or not text(w.get("title")):
            continue
        tags = w.get("tags") or []
        works.append({
            "id": text(w.get("id")),
            "title": text(w.get("title")),
            "kind": text(w.get("kind")) or "other",
            "creator": text(w.get("creator")),
            "url": text(w.get("url")),
            "language": text(w.get("language")),
            "added": text(w.get("added")),
            "summary": text(w.get("summary")),
            "tags": [text(t) for t in (tags if isinstance(tags, list) else [tags]) if text(t)],
            "also": [text(u) for u in (w.get("also") or []) if text(u).startswith(("http://", "https://"))],
        })
    works.sort(key=lambda w: w["added"], reverse=True)
    return {"title": text(data.get("title")) or "Malfoid Index", "contact": text(data.get("contact")), "works": works}


def copy(rel, out):
    src, dst = os.path.join(ROOT, rel), os.path.join(out, rel)
    if not os.path.isfile(src):
        print("warning: missing", rel, file=sys.stderr)
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        shutil.copy2(src, dst)


def make_thumb(src, dst):
    from PIL import Image  # imported lazily so --no-thumbs works without Pillow
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return False
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with Image.open(src) as im:
        if im.mode in ("RGBA", "LA", "P"):  # pack frames are transparent: put them on the site's dark panel colour
            im = im.convert("RGBA")
            bg = Image.new("RGBA", im.size, (16, 26, 22, 255))
            bg.alpha_composite(im)
            im = bg
        im = im.convert("RGB")
        if im.width > THUMB_WIDTH:
            im = im.resize((THUMB_WIDTH, round(im.height * THUMB_WIDTH / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=THUMB_QUALITY, method=6)
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", default=os.path.join(ROOT, "_site"), help="output folder (default: _site/)")
    ap.add_argument("--no-thumbs", action="store_true", help="skip thumbnails (no Pillow needed)")
    args = ap.parse_args()
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)

    src_dir = os.path.join(ROOT, "site")
    for base, _dirs, files in os.walk(src_dir):
        for name in files:
            rel = os.path.relpath(os.path.join(base, name), src_dir)
            os.makedirs(os.path.join(out, os.path.dirname(rel)), exist_ok=True)
            shutil.copy2(os.path.join(base, name), os.path.join(out, rel))
    open(os.path.join(out, ".nojekyll"), "w").close()

    index = build_index()
    made = 0
    for e in index["entries"]:
        copy(e["image"], out)
        for rel in (e.get("reference"), e.get("poseRef"), (e.get("video") or {}).get("src")):
            if rel:
                copy(rel, out)
        if not args.no_thumbs:
            made += make_thumb(os.path.join(ROOT, e["image"]), os.path.join(out, e["thumb"]))
    with open(os.path.join(out, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    works = build_works()
    os.makedirs(os.path.join(out, "malfoid-index"), exist_ok=True)
    with open(os.path.join(out, "malfoid-index", "works.json"), "w", encoding="utf-8") as f:
        json.dump(works, f, ensure_ascii=False, separators=(",", ":"))
    print("built %s: %d entries, %d new thumbnails, %d index works" % (
        os.path.relpath(out, os.getcwd()), len(index["entries"]), made, len(works["works"])))


if __name__ == "__main__":
    main()
