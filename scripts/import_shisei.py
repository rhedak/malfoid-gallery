#!/usr/bin/env python3
"""Rebuild ideas/poses.yaml and references/poses/ from a Shisei checkout.

Shisei (https://github.com/wquguru/shisei) is a CC0 mannequin pose library. Only the `std`
(full body, standard, P###) and `upper` (upper body, U###) series are used; the sexy and duo
series are skipped entirely, and so is every std/upper pose that is rated suggestive or that
we judged suggestive or risky for SFW posting (see KEEP below: only listed poses are imported).

  git clone --depth 1 --filter=blob:none --no-checkout https://github.com/wquguru/shisei.git /workspace/shisei
  python3 scripts/import_shisei.py --shisei /workspace/shisei [--tier w900]

The script checks out only the data files and downloads just the images it needs (raw files at the same commit),
copies one image per kept pose and view to references/poses/<id>-<view>.webp (the grey clay
mannequin where Shisei has a clay map for that view, else the line-art mannequin), copies Shisei's
LICENSE-images and NOTICE next to them, and writes ideas/poses.yaml.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VIEWS = ["front", "diag", "side", "above", "below"]

# Curated whitelist. Fields:
#   posture  stand|sit|kneel|crouch (upper poses: any)
#   ground   the pose sits/kneels/crouches on the floor -> needs a setting with a `ground` phrase
#   hands    true = the pose occupies her hands (no gesture expressions)
#   gaze     true = the pose fixes where she looks
#   swim     allowed with swimwear (relaxed, cheerful, non-sexual)
#   formal   allowed with the gown / in formal settings
# Skipped on purpose (std): P001 P003 P011 P013 (arched / chest out / legs lifted), P007 (prone),
#   P008 P016 P027 P032 P043 (hands behind head / lifting hair: pin-up style), P021 P048 (hand at neck/thigh),
#   P022 P039 (chest out), P026 P040 (hip pushed out / hips swayed), P034 P070 P071 P072 (arching back),
#   P038 (hidden by Shisei: wrong pose), all Lying P049-P057,
#   P058 P059 P061 P062 P063 (squats with knees spread: not safe with a skirt), all Leaning forward P064-P069,
#   P057 P071 (rated suggestive).
# Skipped (upper): U024 (hand on chest) and all of Chest emphasis U026-U050 and Sexy U051-U080.
S, U = "std", "upper"
KEEP = {
    # Sitting
    "P002": dict(posture="sit", ground=True, hands=True),
    "P004": dict(posture="sit", ground=True, hands=True, swim=True),
    "P005": dict(posture="sit", ground=True, hands=True),
    "P006": dict(posture="sit", ground=True, hands=True),
    "P009": dict(posture="sit", ground=True, hands=True),
    "P010": dict(posture="sit", ground=True, hands=True),
    "P012": dict(posture="sit", ground=True, hands=True),
    "P014": dict(posture="sit", ground=True, hands=True),
    # Standing
    "P015": dict(posture="stand", hands=True, formal=True),
    "P017": dict(posture="stand", gaze=True, formal=True),
    "P018": dict(posture="stand", hands=True),
    "P019": dict(posture="stand", hands=True),
    "P020": dict(posture="stand", hands=True, swim=True),
    "P024": dict(posture="stand", formal=False),
    "P025": dict(posture="stand", hands=True),
    "P029": dict(posture="stand", hands=True, swim=True, formal=True),
    "P030": dict(posture="stand", hands=True, swim=True),
    # Kneeling
    "P031": dict(posture="kneel", ground=True, hands=True),
    "P033": dict(posture="kneel", ground=True, hands=True),
    "P035": dict(posture="kneel", ground=True, hands=True),
    "P036": dict(posture="kneel", ground=True, hands=True),
    "P037": dict(posture="kneel", ground=True, gaze=True),
    # Side sit / W-sit
    "P041": dict(posture="sit", ground=True, hands=True),
    "P042": dict(posture="sit", ground=True, hands=True),
    "P044": dict(posture="sit", ground=True, hands=True),
    "P045": dict(posture="sit", ground=True, formal=True),
    "P046": dict(posture="sit", ground=True, hands=True, formal=True),
    "P047": dict(posture="sit", ground=True, hands=True),
    # Squatting
    "P060": dict(posture="crouch", ground=True, hands=True),
    # Twist
    "P073": dict(posture="stand", hands=True, formal=True),
    "P074": dict(posture="kneel", ground=True, gaze=True),
    "P075": dict(posture="sit", ground=True, hands=True),
}
for n in range(1, 26):
    if n == 24:
        continue
    KEEP[f"U{n:03d}"] = dict(posture="any", hands=True, formal=True,
                             swim=n in (1, 2, 3, 4, 5, 6, 7, 9, 13, 18, 21, 22))


def q(s):
    return json.dumps(s, ensure_ascii=False)


def git(shisei, *args):
    return subprocess.run(["git", "-C", shisei, *args], check=True, capture_output=True, text=True).stdout


def fetch(sh, commit, paths):
    """Download the images from raw.githubusercontent.com at the pinned commit (a partial clone's
    checkout fetches blobs one by one and is very slow)."""
    import concurrent.futures
    import urllib.request

    def one(path):
        dst = os.path.join(sh, path)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        url = f"https://raw.githubusercontent.com/wquguru/shisei/{commit}/{path}"
        for attempt in range(4):
            try:
                with urllib.request.urlopen(url, timeout=60) as r:
                    data = r.read()
                if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
                    raise ValueError("not a webp: " + path)
                with open(dst, "wb") as f:
                    f.write(data)
                return
            except Exception:
                if attempt == 3:
                    raise

    with concurrent.futures.ThreadPoolExecutor(16) as ex:
        list(ex.map(one, paths))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--shisei", default="/workspace/shisei")
    ap.add_argument("--tier", default="w900", choices=["w600", "w900"])
    a = ap.parse_args()
    sh = a.shisei
    git(sh, "checkout", "HEAD", "--", "LICENSE", "LICENSE-images", "NOTICE", "data/catalog.json")
    commit = git(sh, "rev-parse", "HEAD").strip()
    cat = {x["id"]: x for x in json.load(open(os.path.join(sh, "data/catalog.json"), encoding="utf-8"))}
    tree = set(git(sh, "ls-tree", "-r", "--name-only", "HEAD", f"images/line/{a.tier}", f"images/clay/{a.tier}").split())

    plan = []  # (pose id, view, kind, src path)
    poses = []
    for pid, cur in KEEP.items():
        x = cat[pid]
        assert x["series"] in ("std", "upper") and x["rating"] == "general", pid
        gaps = x.get("gaps") or {}
        views, line_views = [], []
        for v in VIEWS:
            fn = f"{x['series']}_{pid}_{v}.webp"
            clay, line = f"images/clay/{a.tier}/{fn}", f"images/line/{a.tier}/{fn}"
            if v in gaps or line not in tree:
                continue
            kind, src = ("clay", clay) if clay in tree else ("line", line)
            if kind == "line":
                line_views.append(v)
            views.append(v)
            plan.append((pid, v, kind, src))
        if not views:
            print("skip (no views):", pid, file=sys.stderr)
            continue
        poses.append((pid, x, cur, views, line_views))

    fetch(sh, commit, [p[3] for p in plan])
    out_dir = os.path.join(ROOT, "references", "poses")
    if os.path.isdir(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)
    total = 0
    for pid, v, kind, src in plan:
        dst = os.path.join(out_dir, f"shisei-{pid}-{v}.webp")
        shutil.copyfile(os.path.join(sh, src), dst)
        total += os.path.getsize(dst)
    shutil.copyfile(os.path.join(sh, "LICENSE-images"), os.path.join(out_dir, "LICENSE-images"))
    shutil.copyfile(os.path.join(sh, "NOTICE"), os.path.join(out_dir, "NOTICE"))

    L = [
        "# Poses for scripts/ideas.py, generated by scripts/import_shisei.py from Shisei. Do not edit by hand;",
        "# change KEEP in the importer and re-run it.",
        "# source: Shisei, https://github.com/wquguru/shisei (data/catalog.json). Shisei's images and its own data",
        "#   (incl. the English pose descriptions, desc_en) are CC0 1.0; its code is Apache-2.0.",
        "#   The pose list (selection, numbering, names, categories) follows ai-pose-gallery by ギア (@giaaibusi),",
        "#   https://ai-pose-gallery.pages.dev/ - credited, not licensed.",
        "#   Only the std (P###) and upper (U###) series; sexy and duo skipped, and suggestive std/upper poses too.",
        "# fields: series, category, name (English, from the pose list), text = Shisei's English description",
        "#   (her pose; used in the prompt), framing full|upper, posture, ground = on the floor (setting needs a",
        "#   `ground` phrase), hands_busy, sets_gaze, swim_ok, formal_ok (gown / formal settings),",
        "#   views = mannequin views on disk, line_views = views that are line art (others: grey clay mannequin),",
        "#   image = path pattern; {view} is one of views.",
        "source:",
        '  repo: "https://github.com/wquguru/shisei"',
        f"  commit: {q(commit)}",
        f"  tier: {q(a.tier)}",
        '  license: "CC0-1.0 (images and data); pose list credited to ai-pose-gallery by ギア @giaaibusi"',
        "poses:",
    ]
    for pid, x, cur, views, line_views in poses:
        L += [
            f"  - id: {q('shisei-' + pid)}",
            f"    shisei_id: {q(pid)}",
            f"    series: {q(x['series'])}",
            f"    category: {q(x['class_en'])}",
            f"    name: {q(x['name_en'])}",
            f"    text: {q(x['desc_en'])}",
            f"    framing: {'full' if x['series'] == 'std' else 'upper'}",
            f"    posture: {cur['posture']}",
            f"    ground: {'true' if cur.get('ground') else 'false'}",
            f"    hands_busy: {'true' if cur.get('hands') else 'false'}",
            f"    sets_gaze: {'true' if cur.get('gaze') else 'false'}",
            f"    swim_ok: {'true' if cur.get('swim') else 'false'}",
            f"    formal_ok: {'true' if cur.get('formal') else 'false'}",
            f"    views: [{', '.join(views)}]",
            f"    line_views: [{', '.join(line_views)}]",
            f"    image: {q('references/poses/shisei-' + pid + '-{view}.webp')}",
            f"    src_jp: {q(x['name_jp'])}",
        ]
    with open(os.path.join(ROOT, "ideas", "poses.yaml"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    ns = sum(1 for p in poses if p[1]["series"] == "std")
    print(f"poses: {len(poses)} (std {ns}, upper {len(poses) - ns}); images: {len(plan)}, {total / 1e6:.1f} MB ({a.tier})")


if __name__ == "__main__":
    main()
