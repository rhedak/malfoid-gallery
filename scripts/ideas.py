#!/usr/bin/env python3
"""Random idea generator for Draconia images (Grok Imagine edit prompts).

Picks an outfit, setting, pose, emotion and coverage level from ideas/*.yaml,
checks that they fit together, and prints the combo plus a ready edit prompt,
the base post and the reference to edit from.

  python3 scripts/ideas.py                      # one random idea
  python3 scripts/ideas.py --seed 7 --count 3   # ideas with seeds 7, 8, 9 (each reproducible)
  python3 scripts/ideas.py --season winter --theme christmas
  python3 scripts/ideas.py --outfit gown --coverage casual
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
PREFIX = "Same woman, same face, hair, braid and art style, "
SUFFIX = ", anime illustration, full scene background, portrait framing, hands fully in frame."

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
    if e.get("uses_hands") and p.get("hands_busy"):
        return False, None
    if e.get("sets_gaze") and p.get("sets_gaze"):
        return False, None
    return True, eff


def build_prompt(d, o, s, p, e, season, theme):
    if o.get("canonical"):
        head = f"{PREFIX}wearing {o['text']}. Don't redesign the {o.get('keep', 'outfit')}. "
    else:
        head = f"{PREFIX}now wearing {o['text']}. "
    place = s["text"]
    if theme not in (None, "everyday") and theme not in (s.get("themes") or []):
        place += ", " + d["settings"]["theme_decor"][theme]
    if s.get("ambience", True) is not False:
        amb = d["settings"]["season_ambience"][season]
        place += (", " + amb) if "outdoor" in (s.get("tags") or []) else (", " + amb + " outside the windows")
    scene = place[0].upper() + place[1:] + f". She {p['text']}, {e['text']}"
    prompt = head + scene + SUFFIX
    check_sfw(prompt, "generated prompt")
    return prompt


def pick(d, seed, a):
    rng = random.Random(seed)
    outfits = [o for o in d["outfits"]["outfits"] if not a.outfit or o["id"] == a.outfit]
    if a.coverage:
        outfits = [o for o in outfits if o["coverage"] == a.coverage]
    settings = [s for s in d["settings"]["settings"] if not a.setting or s["id"] == a.setting]
    poses = d["poses"]["poses"]
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
        if ok:
            return o, s, p, e, season, theme
    raise SystemExit("no compatible combination found for these filters")


def make_idea(d, seed, a):
    o, s, p, e, season, theme = pick(d, seed, a)
    base = d["outfits"]["bases"][o["base"]]
    prompt = build_prompt(d, o, s, p, e, season, theme)
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
                 "pose_src": p.get("src_id"), "emotion": e["id"], "coverage": o["coverage"],
                 "season": season, "theme": theme},
        "title": title, "tags": tags, "base_post": base["post"], "reference": base["reference"],
        "prompt": prompt,
        "_names": (o["name"], s["name"], p["text"], e["name"]),
    }


def as_yaml(x):
    i = x["idea"]
    lines = ["idea:"] + [f"  {k}: {q(v) if v is not None else 'null'}" for k, v in i.items()]
    lines += [f"title: {q(x['title'])}", f"tags: [{', '.join(q(t) for t in x['tags'])}]",
              f"base_post: {q(x['base_post'])}", f"reference: {q(x['reference'])}", f"prompt: {q(x['prompt'])}"]
    return "\n".join(lines) + "\n"


def as_text(x):
    i, n = x["idea"], x["_names"]
    return (f"Idea (seed {i['seed']}): {x['title']}\n"
            f"  outfit:   {i['outfit']} ({n[0]}), coverage {i['coverage']}\n"
            f"  setting:  {i['setting']} ({n[1]}), season {i['season']}, theme {i['theme']}\n"
            f"  pose:     {i['pose']} ({n[2]})" + (f" [src {i['pose_src']}]" if i["pose_src"] else "") + "\n"
            f"  emotion:  {i['emotion']} ({n[3]})\n"
            f"  tags:     {', '.join(x['tags'])}\n"
            f"  base:     {x['base_post']}\n"
            f"  ref:      {x['reference']}\n"
            f"  prompt:   {x['prompt']}\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--season", choices=SEASONS)
    ap.add_argument("--theme", choices=THEMES)
    ap.add_argument("--outfit", help="outfit id from ideas/outfits.yaml")
    ap.add_argument("--setting", help="setting id from ideas/settings.yaml")
    ap.add_argument("--coverage", choices=["modest", "casual", "summer", "swimwear"])
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
