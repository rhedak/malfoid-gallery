"""Tiny YAML loader for the subset used in this repo (stdlib only).

Uses PyYAML when it is installed; otherwise parses: block mappings, block lists
("- item" / "- key: value"), nested blocks by indentation, flow lists [a, "b"],
double/single-quoted or bare scalars, true/false/null, ints, and full-line
comments. Write repo YAML in that subset (quote strings that contain ": " or "#").
"""
import json
import re

try:
    import yaml as _pyyaml
except ImportError:  # pragma: no cover
    _pyyaml = None


def _scalar(s):
    s = s.strip()
    if s == "" or s in ("~", "null", "Null", "NULL"):
        return None
    if s.startswith('"'):
        return json.loads(s)
    if s.startswith("'"):
        return s[1:-1].replace("''", "'")
    if s.startswith("["):
        inner = s[1:-1].strip()
        if not inner:
            return []
        items, buf, q = [], "", None
        for ch in inner:
            if q:
                buf += ch
                if ch == q and not buf.endswith("\\" + q):
                    q = None
            elif ch in "\"'":
                q = ch
                buf += ch
            elif ch == ",":
                items.append(_scalar(buf))
                buf = ""
            else:
                buf += ch
        items.append(_scalar(buf))
        return items
    if s in ("true", "True"):
        return True
    if s in ("false", "False"):
        return False
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    if re.fullmatch(r"-?\d+\.\d+", s):
        return float(s)
    return s


def _split_key(content):
    m = re.match(r"^([^\s\"'\[\]{}#][^:]*?):(?:\s+(.*))?$", content)
    if not m:
        return None
    return m.group(1).strip(), (m.group(2) or "")


def _lines(text):
    out = []
    for raw in text.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#") or raw.strip() == "---":
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        out.append([indent, raw.strip()])
    return out


def _parse(lines, i, indent):
    if lines[i][1].startswith("- ") or lines[i][1] == "-":
        return _parse_list(lines, i, indent)
    return _parse_map(lines, i, indent)


def _parse_list(lines, i, indent):
    res = []
    while i < len(lines) and lines[i][0] == indent and (lines[i][1].startswith("- ") or lines[i][1] == "-"):
        rest = lines[i][1][2:].strip() if lines[i][1] != "-" else ""
        if rest == "":
            if i + 1 < len(lines) and lines[i + 1][0] > indent:
                val, i = _parse(lines, i + 1, lines[i + 1][0])
            else:
                val, i = None, i + 1
        elif _split_key(rest) and not rest.startswith(("\"", "'", "[")):
            lines[i] = [indent + 2, rest]
            val, i = _parse_map(lines, i, indent + 2)
        else:
            val, i = _scalar(rest), i + 1
        res.append(val)
    return res, i


def _parse_map(lines, i, indent):
    res = {}
    while i < len(lines) and lines[i][0] == indent and not lines[i][1].startswith("- "):
        kv = _split_key(lines[i][1])
        if kv is None:
            raise ValueError("cannot parse line: %r" % lines[i][1])
        key, rest = kv
        i += 1
        if rest.strip() == "":
            if i < len(lines) and lines[i][0] > indent:
                val, i = _parse(lines, i, lines[i][0])
            elif i < len(lines) and lines[i][0] == indent and lines[i][1].startswith("- "):
                val, i = _parse_list(lines, i, indent)
            else:
                val = None
        else:
            val = _scalar(rest)
        res[key] = val
    return res, i


def loads(text, force_builtin=False):
    if _pyyaml is not None and not force_builtin:
        return _pyyaml.safe_load(text)
    lines = _lines(text)
    if not lines:
        return None
    val, i = _parse(lines, 0, lines[0][0])
    if i != len(lines):
        raise ValueError("unparsed content at: %r" % lines[i][1])
    return val


def load(path, force_builtin=False):
    with open(path, encoding="utf-8") as f:
        return loads(f.read(), force_builtin)


def q(s):
    """Quote a scalar for YAML output (JSON strings are valid YAML)."""
    if s is None:
        return ""
    if isinstance(s, bool):
        return "true" if s else "false"
    if isinstance(s, int):
        return str(s)
    return json.dumps(s, ensure_ascii=False)
