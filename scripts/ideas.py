#!/usr/bin/env python3
"""Random idea generator for Draconia images (Grok Imagine, character + pose reference).

Picks an outfit, setting, pose (+ camera view), emotion and coverage level from ideas/*.yaml,
checks that they fit together, and prints the combo plus a ready Grok Imagine prompt that uses
two reference images: (1) Draconia's base post / character reference, (2) a mannequin pose
image from Shisei (references/poses/, CC0) whose path is printed as pose_ref.

  python3 scripts/ideas.py                      # one random idea
  python3 scripts/ideas.py --seed 7 --count 3   # ideas with seeds 7, 8, 9 (each reproducible)
  python3 scripts/ideas.py --season winter --theme christmas
  python3 scripts/ideas.py --outfit gown --coverage casual
  python3 scripts/ideas.py --pose shisei-P012 --view diag
  python3 scripts/ideas.py --seed 7 --yaml > /tmp/idea.yaml
  python3 scripts/add_entry.py --idea /tmp/idea.yaml --image result.jpg --result-post URL

SFW is enforced here, not just in the data: see check_sfw() and the README.
"""
import argparse
import os
import random
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import miniyaml  # noqa: E402
from miniyaml import q  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDEAS = os.path.join(ROOT, "ideas")
SEASONS = ["spring", "summer", "autumn", "winter"]
THEMES = ["everyday", "christmas", "halloween", "thanksgiving", "new-year", "valentines", "summer-festival"]
REFS = ("Two reference images: the first image shows the character, the second image is a faceless "
        "{kind} used only as a pose reference. ")
PREFIX = "Draw the same woman as in the first image, same face, hair, braid and art style, "
POSE = ("Use the pose of the mannequin in the second image, {view_text}: {pose}. "
        "Copy only the pose and the camera angle from the mannequin, not its look. ")
SUFFIX = {
    "full": " Anime illustration, full scene background, full body in frame, hands fully in frame.",
    "upper": " Anime illustration, full scene background, waist-up portrait framing, hands fully in frame.",
}
# Camera views used for prompts (Shisei also has above/below; those are vendored but not picked).
VIEW_WEIGHTS = {"front": 4, "diag": 4, "side": 1}
VIEW_TEXT = {"front": "seen from the front", "diag": "seen from a three-quarter angle", "side": "seen from the side"}
VIEW_NAME = {"front": "front", "diag": "three-quarter", "side": "side"}

# Hard SFW / trademark rules. Any of these in a data entry or a final prompt is an error.
BANNED = [
    r"nude", r"naked", r"nsfw", r"lingerie", r"underwear", r"bra\b", r"panties", r"thong", r"topless",
    r"see-through", r"cleavage", r"sexy", r"seductive", r"sensual", r"erotic", r"provocative", r"suggestive",
    r"lewd", r"busty", r"micro bikini", r"string bikini", r"bedroom eyes", r"lying on (a|the) bed",
    r"child", r"\bkid\b", r"loli", r"underage", r"teen",
    r"hogwarts", r"slytherin", r"gryffindor", r"hufflepuff", r"ravenclaw", r"harry potter", r"quidditch",
    r"hogsmeade", r"wizarding world", r"malfoy", r"warner",
]
BANNED_RE = re.compile("|".join(BANNED), re.I)


def check_sfw(text, where):
    m = BANNED_RE.search(text or "")
    if m:
        raise SystemExit(f"SFW/trademark rule violated in {where}: {m.group(0)!r}")


def load():
    d = {
        "outfits": miniyaml.load(os.path.join(IDEAS, "outfits.yaml")),
        "settings": miniyaml.load(os.path.join(IDEAS, "settings.yaml")),
        "poses": miniyaml.load(os.path.join(IDEAS, "poses.yaml")),
        "emotions": miniyaml.load(os.path.join(IDEAS, "emotions.yaml")),
        "skin": miniyaml.load(os.path.join(IDEAS, "skin.yaml")),
    }
    for key, lst in (("outfits", d["outfits"]["outfits"]), ("settings", d["settings"]["settings"]),
                     ("poses", d["poses"]["poses"]), ("emotions", d["emotions"]["emotions"])):
        for e in lst:
            check_sfw(e.get("text", "") + " " + e.get("name", ""), f"ideas/{key}.yaml:{e['id']}")
    for p in d["poses"]["poses"]:
        if p.get("series") not in ("std", "upper"):
            raise SystemExit(f"pose {p['id']}: only Shisei std/upper poses are allowed")
        for v in p["views"]:
            if not os.path.isfile(os.path.join(ROOT, p["image"].format(view=v))):
                raise SystemExit(f"pose {p['id']}: missing image {p['image'].format(view=v)}")
    levels = {lv["id"] for lv in d["skin"]["levels"]}
    for o in d["outfits"]["outfits"]:
        if o["coverage"] not in levels:
            raise SystemExit(f"outfit {o['id']}: unknown coverage {o['coverage']}")
        if o["base"] not in d["outfits"]["bases"]:
            raise SystemExit(f"outfit {o['id']}: unknown base {o['base']}")
    return d


def seasons_of(e):
    s = e.get("seasons") or ["any"]
    return set(SEASONS) if "any" in s else set(s)


def compatible(o, s, p, e, lvl, season, theme):
    """Return (ok, theme). theme: requested theme or None."""
    if season not in seasons_of(o) or season not in seasons_of(s):
        return False, None
    ot, st = set(o.get("themes") or []), set(s.get("themes") or [])
    if theme == "everyday":
        if ot or st:
            return False, None
        eff = "everyday"
    elif theme:
        if theme not in ot | st:
            return False, None
        if (ot and theme not in ot) or (st and theme not in st):
            return False, None
        eff = theme
    else:
        if ot and st and not (ot & st):
            return False, None
        both = sorted(ot & st) or sorted(ot | st)
        eff = both[0] if both else "everyday"
    stags = set(s.get("tags") or [])
    for req in (o.get("requires_setting_tags"), lvl.get("requires_setting_tags")):
        if req and not (set(req) & stags):
            return False, None
    if s.get("coverage") and o["coverage"] not in s["coverage"]:
        return False, None
    if o["coverage"] == "swimwear":
        if not (stags & {"beach", "pool"}) or not p.get("swim_ok") or not e.get("swim_ok"):
            return False, None
    formal = "formal" in stags or o["id"] == "gown"
    if formal and not p.get("formal_ok"):
        return False, None
    if p.get("ground") and not s.get("ground"):
        return False, None
    if e.get("uses_hands") and p.get("hands_busy"):
        return False, None
    if e.get("sets_gaze") and p.get("sets_gaze"):
        return False, None
    return True, eff


def pose_text(p, s):
    """Shisei's pose description, with "the floor" swapped for the setting's ground."""
    t = p["text"]
    g = s.get("ground")
    if p.get("ground") and g:
        if "on the floor" in t:
            t = t.replace("on the floor", "on " + g, 1).replace("the floor", "the ground")
        else:
            t += ", on " + g
    return t


def build_prompt(d, o, s, p, view, e, season, theme):
    kind = "line-art mannequin drawing" if view in (p.get("line_views") or []) else "grey mannequin"
    if o.get("canonical"):
        head = f"{PREFIX}wearing {o['text']}. Don't redesign the {o.get('keep', 'outfit')}. "
    else:
        head = f"{PREFIX}now wearing {o['text']}. "
    head = REFS.format(kind=kind) + head + POSE.format(view_text=VIEW_TEXT[view], pose=pose_text(p, s))
    place = s["text"]
    if theme not in (None, "everyday") and theme not in (s.get("themes") or []):
        place += ", " + d["settings"]["theme_decor"][theme]
    if s.get("ambience", True) is not False:
        amb = d["settings"]["season_ambience"][season]
        place += (", " + amb) if "outdoor" in (s.get("tags") or []) else (", " + amb + " outside the windows")
    expr = e["text"][5:] if e["text"].startswith("with ") else e["text"]
    scene = "Setting: " + place + f". Expression: {expr}."
    prompt = head + scene + SUFFIX[p.get("framing", "full")]
    check_sfw(prompt, "generated prompt")
    return prompt


def pick(d, seed, a):
    rng = random.Random(seed)
    outfits = [o for o in d["outfits"]["outfits"] if not a.outfit or o["id"] == a.outfit]
    if a.coverage:
        outfits = [o for o in outfits if o["coverage"] == a.coverage]
    settings = [s for s in d["settings"]["settings"] if not a.setting or s["id"] == a.setting]
    poses = [p for p in d["poses"]["poses"] if not a.pose or p["id"] in (a.pose, "shisei-" + a.pose)]
    if not poses:
        raise SystemExit("no pose matches " + a.pose)
    emotions = [e for e in d["emotions"]["emotions"] if not a.tsundere or e.get("tsundere")]
    levels = {lv["id"]: lv for lv in d["skin"]["levels"]}
    if not outfits or not settings:
        raise SystemExit("no outfit/setting matches the filters")
    weights = [levels[o["coverage"]].get("weight", 1) for o in outfits]
    for _ in range(5000):
        o = rng.choices(outfits, weights)[0]
        s = rng.choice(settings)
        p = rng.choice(poses)
        e = rng.choice(emotions)
        cand = [a.season] if a.season else sorted(seasons_of(o) & seasons_of(s))
        if not cand:
            continue
        season = rng.choice(cand)
        ok, theme = compatible(o, s, p, e, levels[o["coverage"]], season, a.theme)
        views = [v for v in VIEW_WEIGHTS if v in p["views"] and (not a.view or v == a.view)]
        if ok and views:
            view = rng.choices(views, [VIEW_WEIGHTS[v] for v in views])[0]
            return o, s, p, view, e, season, theme
    raise SystemExit("no compatible combination found for these filters")


def make_idea(d, seed, a):
    o, s, p, view, e, season, theme = pick(d, seed, a)
    base = d["outfits"]["bases"][o["base"]]
    prompt = build_prompt(d, o, s, p, view, e, season, theme)
    pose_ref = p["image"].format(view=view)
    tags = [theme if theme != "everyday" else season, season]
    if "castle" in (s.get("tags") or []):
        tags.append("castle")
    if o["base"] in ("uniform", "vest") and o.get("canonical"):
        tags.append("uniform")
    if o["id"] == "gown":
        tags.append("gown")
    if o["coverage"] in ("summer", "swimwear"):
        tags.append(o["coverage"])
    if e.get("tsundere"):
        tags.append("tsundere")
    tags = list(dict.fromkeys(tags))
    title = f"{s['name'][0].upper() + s['name'][1:]}, {e['name']}"
    return {
        "idea": {"seed": seed, "outfit": o["id"], "setting": s["id"], "pose": p["id"],
                 "pose_name": p["name"], "pose_view": view, "pose_src": "shisei:" + p["shisei_id"],
                 "emotion": e["id"], "coverage": o["coverage"], "season": season, "theme": theme},
        "title": title, "tags": tags, "base_post": base["post"], "reference": base["reference"],
        "pose_ref": pose_ref, "prompt": prompt,
        "_names": (o["name"], s["name"], p["name"], e["name"]),
    }


def as_yaml(x):
    i = x["idea"]
    lines = ["idea:"] + [f"  {k}: {q(v) if v is not None else 'null'}" for k, v in i.items()]
    lines += [f"title: {q(x['title'])}", f"tags: [{', '.join(q(t) for t in x['tags'])}]",
              "# Grok Imagine: image 1 = base_post (or the reference file), image 2 = pose_ref",
              f"base_post: {q(x['base_post'])}", f"reference: {q(x['reference'])}",
              f"pose_ref: {q(x['pose_ref'])}", f"prompt: {q(x['prompt'])}"]
    return "\n".join(lines) + "\n"


def as_text(x):
    i, n = x["idea"], x["_names"]
    return (f"Idea (seed {i['seed']}): {x['title']}\n"
            f"  outfit:   {i['outfit']} ({n[0]}), coverage {i['coverage']}\n"
            f"  setting:  {i['setting']} ({n[1]}), season {i['season']}, theme {i['theme']}\n"
            f"  pose:     {i['pose']} ({n[2]}), view {VIEW_NAME[i['pose_view']]}\n"
            f"  emotion:  {i['emotion']} ({n[3]})\n"
            f"  tags:     {', '.join(x['tags'])}\n"
            f"  base:     {x['base_post']}\n"
            f"  ref:      {x['reference']}  (image 1)\n"
            f"  pose_ref: {x['pose_ref']}  (image 2)\n"
            f"  prompt:   {x['prompt']}\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--season", choices=SEASONS)
    ap.add_argument("--theme", choices=THEMES)
    ap.add_argument("--outfit", help="outfit id from ideas/outfits.yaml")
    ap.add_argument("--setting", help="setting id from ideas/settings.yaml")
    ap.add_argument("--coverage", choices=["modest", "casual", "summer", "swimwear"])
    ap.add_argument("--pose", help="pose id from ideas/poses.yaml, e.g. shisei-P012 (or P012)")
    ap.add_argument("--view", choices=list(VIEW_WEIGHTS), help="mannequin view (diag = three-quarter)")
    ap.add_argument("--tsundere", action="store_true", help="only tsundere expressions")
    ap.add_argument("--seed", type=int, help="seed of the first idea; idea k uses seed+k")
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--yaml", action="store_true", help="YAML output (feeds add_entry.py --idea); docs separated by ---")
    a = ap.parse_args()
    d = load()
    if a.outfit and a.outfit not in {o["id"] for o in d["outfits"]["outfits"]}:
        ap.error("unknown outfit " + a.outfit)
    if a.setting and a.setting not in {s["id"] for s in d["settings"]["settings"]}:
        ap.error("unknown setting " + a.setting)
    start = a.seed if a.seed is not None else random.SystemRandom().randrange(1, 10**6)
    out = []
    for k in range(a.count):
        x = make_idea(d, start + k, a)
        out.append(as_yaml(x) if a.yaml else as_text(x))
    print(("---\n" if a.yaml else "\n").join(out), end="")


if __name__ == "__main__":
    main()
