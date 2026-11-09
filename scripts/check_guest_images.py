#!/usr/bin/env python3
"""Check the external image links of guest entries (guest/entries/*.yaml with an image_url).

Each link must answer with an image (Content-Type image/*) and at most 15 MB. Entries that use a
file in guest/images/ are not fetched here. Used by the Submission check workflow on pull requests;
the site build itself stays offline.

    python3 scripts/check_guest_images.py
"""
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_site  # noqa: E402

MAX_BYTES = 15 * 1024 * 1024
USER_AGENT = "malfoid-gallery-check/1.0 (+https://github.com/rhedak/malfoid-gallery)"


def check(url):
    """Returns None when the link is fine, otherwise a short reason."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            ctype = resp.headers.get("Content-Type", "")
            length = resp.headers.get("Content-Length")
            if resp.status != 200:
                return "HTTP %s" % resp.status
            if not ctype.lower().startswith("image/"):
                return "not an image (Content-Type: %r)" % ctype
            if length and int(length) > MAX_BYTES:
                return "larger than 15 MB"
            resp.read(1024)  # enough to confirm the body is served
    except urllib.error.HTTPError as err:
        return "HTTP %s" % err.code
    except (urllib.error.URLError, OSError, ValueError) as err:
        return "could not fetch (%s)" % err
    return None


def main():
    failures = []
    checked = 0
    for path in sorted(__import__("glob").glob(os.path.join(build_site.ROOT, build_site.GUEST_DIR, "*.yaml"))):
        rel = os.path.relpath(path, build_site.ROOT)
        g = build_site.miniyaml.load(path)
        url = str((g or {}).get("image_url") or "").strip() if isinstance(g, dict) else ""
        if not url:
            continue
        checked += 1
        reason = check(url)
        if reason:
            failures.append("%s: %s (%s)" % (rel, url, reason))
    for line in failures:
        print("error:", line)
    print("checked %d external guest image link(s), %d failed" % (checked, len(failures)))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
