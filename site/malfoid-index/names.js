// Malfoid Index: the first-name chart. It is drawn in code from the works in works.json
// (the first_name field of each entry), so it updates whenever the index is rebuilt.
// index.js passes in the works that match the page's other filters, so the chart follows them.
// Every label is written with textContent.
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var MAIN = [
    { name: "Draconia", color: "#34d399" },
    { name: "Dracaena", color: "#a78bfa" },
    { name: "Draco", color: "#fbbf24" }
  ];
  var R = 80;            // ring radius
  var STROKE = 34;       // ring width
  var C = 2 * Math.PI * R;

  // Whether the chart body is folded away. Remembered in this browser only (localStorage, no cookies).
  // Collapsing also clears a name filter (see the header click below).
  var STORE_KEY = "malfoid-index-names-open";
  var collapsed = false;
  try {
    if (localStorage.getItem(STORE_KEY) === "0") collapsed = true;
  } catch (e) {}
  // Latest inputs from index.js.
  var current = { works: [], selected: "", onPick: null };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function svgEl(name, attrs) {
    var n = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  // Other names get colours from a fixed hue spread. Colours are set once from the whole index
  // (see initColors), so a name keeps its colour when the filters change and on the cards.
  var colorOf = {};
  // Hand-picked hues that sit well away from the three main colours (emerald, violet, amber),
  // so no other name looks like Draconia, Dracaena or Draco. Past the list, lightness steps keep them apart.
  var OTHER_PALETTE = ["#38bdf8", "#f472b6", "#f87171", "#a3e635", "#e879f9", "#94a3b8", "#fb923c", "#2dd4bf"];
  // Fixed colours for the names already in the index, so each keeps its colour as the list grows.
  var FIXED = { "Lyra": "#38bdf8", "Draca": "#f472b6", "Dracina": "#f87171", "Aurea": "#a3e635",
    "Dancia": "#e879f9", "Dracia": "#94a3b8", "Dracarya": "#fb923c", "Draya": "#2dd4bf" };
  function otherColor(i) {
    var base = OTHER_PALETTE[i % OTHER_PALETTE.length];
    var round = Math.floor(i / OTHER_PALETTE.length);
    if (!round) return base;
    return "hsl(" + ((i * 97) % 360) + ", 70%, " + (58 + (round % 3) * 8) + "%)";
  }
  function initColors(works) {
    var counts = {};
    (works || []).forEach(function (w) {
      var n = (w.first_name || "").trim();
      if (n) counts[n] = (counts[n] || 0) + 1;
    });
    colorOf = {};
    MAIN.forEach(function (m) { colorOf[m.name] = m.color; });
    Object.keys(counts)
      .filter(function (n) { return !colorOf[n]; })
      .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); })
      .forEach(function (n, i) { colorOf[n] = FIXED[n] || otherColor(i); });
  }

  function tally(works) {
    var counts = {};
    var unknown = 0;
    var total = 0;
    works.forEach(function (w) {
      total++;
      var n = (w.first_name || "").trim();
      if (!n) { unknown++; return; }
      counts[n] = (counts[n] || 0) + 1;
    });
    var named = total - unknown;
    var main = MAIN.map(function (m) { return { name: m.name, color: m.color, count: counts[m.name] || 0 }; });
    var others = Object.keys(counts)
      .filter(function (n) { return !MAIN.some(function (m) { return m.name === n; }); })
      .sort(function (a, b) { return counts[b] - counts[a] || a.localeCompare(b); })
      .map(function (n) { return { name: n, color: colorOf[n] || "#94a3b8", count: counts[n] }; });
    return { slices: main.concat(others), unknown: unknown, named: named, total: total };
  }

  // Build the labelled pie: one wedge per name, a leader line and a label for each, placed outside the pie.
  // Labels on each side are spread apart vertically so they do not overlap.
  function pie(slices, named, selected, onPick) {
    var W = 440, H = 380, cx = 220, cy = 190, r = 112, GAP = 32;
    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Pie chart of first names used for Malfoid", "class": "names-pie" });
    var items = slices.filter(function (s) { return s.count; });
    var angle = -Math.PI / 2;
    var marks = [];

    items.forEach(function (s) {
      var frac = s.count / named;
      var a2 = angle + frac * 2 * Math.PI;
      var mid = (angle + a2) / 2;
      var cls = "names-seg" + (selected === s.name ? " is-on" : (selected ? " is-off" : ""));
      var seg;
      if (frac >= 0.9999) {
        seg = svgEl("circle", { cx: String(cx), cy: String(cy), r: String(r), fill: s.color, "class": cls });
      } else {
        var x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
        var x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
        var d = "M" + cx + "," + cy + " L" + x1 + "," + y1 + " A" + r + "," + r + " 0 " + (frac > 0.5 ? 1 : 0) + " 1 " + x2 + "," + y2 + " Z";
        seg = svgEl("path", { d: d, fill: s.color, "class": cls });
      }
      seg.style.stroke = "var(--panel, #121a17)";
      seg.style.strokeWidth = "1.5";
      var title = svgEl("title", {});
      title.textContent = s.name + ": " + s.count + " (" + Math.round(frac * 100) + "%)";
      seg.appendChild(title);
      seg.addEventListener("click", function () { onPick(s.name); });
      svg.appendChild(seg);
      marks.push({ s: s, frac: frac, mid: mid });
      angle = a2;
    });

    // Lay out labels: right side and left side separately, each spread so they do not collide.
    [true, false].forEach(function (rightSide) {
      var side = marks.filter(function (m) { return (Math.cos(m.mid) >= 0) === rightSide; });
      side.sort(function (a, b) { return Math.sin(a.mid) - Math.sin(b.mid); });
      var ys = side.map(function (m) { return cy + (r + 14) * Math.sin(m.mid); });
      for (var i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + GAP);
      for (var j = ys.length - 2; j >= 0; j--) ys[j] = Math.min(ys[j], ys[j + 1] - GAP);
      if (ys.length && ys[0] < 16) { var shift = 16 - ys[0]; ys = ys.map(function (y) { return y + shift; }); }
      side.forEach(function (m, k) {
        var dir = rightSide ? 1 : -1;
        var ly = Math.min(Math.max(ys[k], 16), H - 16);
        var p0x = cx + r * Math.cos(m.mid), p0y = cy + r * Math.sin(m.mid);
        var p1x = cx + (r + 14) * Math.cos(m.mid), p1y = cy + (r + 14) * Math.sin(m.mid);
        var lx = cx + dir * (r + 40);
        svg.appendChild(svgEl("polyline", {
          points: p0x + "," + p0y + " " + p1x + "," + p1y + " " + (lx - dir * 4) + "," + ly,
          fill: "none", stroke: "rgba(180, 200, 190, 0.55)", "stroke-width": "1"
        }));
        var t = svgEl("text", { x: String(lx), y: String(ly - 2), "text-anchor": rightSide ? "start" : "end", "font-size": "14" });
        t.setAttribute("class", "names-label");
        t.appendChild(svgNode("tspan", { x: String(lx), dy: "0", "font-weight": "600" }, m.s.name));
        t.appendChild(svgNode("tspan", { x: String(lx), dy: "15", "font-size": "12", "class": "names-label-pct" }, (m.frac * 100).toFixed(1) + "%"));
        svg.appendChild(t);
      });
    });
    return svg;
  }

  function svgNode(name, attrs, text) {
    var n = svgEl(name, attrs);
    n.textContent = text;
    return n;
  }

  function body(works, selected, onPick) {
    var t = tally(works);
    if (!t.named) return [el("p", "names-empty", "No works name her yet.")];

    var out = [];
    var wrap = el("div", "names-wrap");
    var ring = el("div", "names-ring");
    ring.appendChild(pie(t.slices, t.named, selected, onPick));
    wrap.appendChild(ring);

    var list = el("ul", "names-legend");
    t.slices.forEach(function (s) {
      if (!s.count) return;
      var li = el("li");
      var b = el("button", "names-row" + (selected === s.name ? " is-on" : ""));
      b.type = "button";
      b.setAttribute("aria-pressed", String(selected === s.name));
      var sw = el("span", "names-swatch");
      sw.style.background = s.color;
      b.appendChild(sw);
      b.appendChild(el("span", "names-name", s.name));
      b.appendChild(el("span", "names-num", s.count + " · " + Math.round((s.count / t.named) * 100) + "%"));
      b.addEventListener("click", function () { onPick(s.name); });
      li.appendChild(b);
      list.appendChild(li);
    });
    wrap.appendChild(list);
    out.push(wrap);

    var foot = el("p", "names-foot");
    foot.textContent = t.named + " of " + t.total + " works name her. " +
      (t.unknown ? t.unknown + " don't yet; they are left out of the chart. " : "") +
      (selected ? "Click the selected name again to show all works." : "Click a name to filter the list.");
    out.push(foot);
    return out;
  }

  function draw() {
    var box = document.getElementById("names-chart");
    if (!box) return;
    box.textContent = "";

    var head = el("button", "names-head");
    head.type = "button";
    head.setAttribute("aria-expanded", String(!collapsed));
    head.appendChild(el("span", "names-title", "Which first name is used for Malfoid?"));
    var chev = el("span", "names-chev", collapsed ? "▸" : "▾");
    chev.setAttribute("aria-hidden", "true");
    head.appendChild(chev);
    head.addEventListener("click", function () {
      collapsed = !collapsed;
      try { localStorage.setItem(STORE_KEY, collapsed ? "0" : "1"); } catch (e) {}
      // Folding the chart away also clears a name filter, so the list is back to all names.
      if (collapsed && current.selected) current.onPick("");
      else draw();
    });
    box.appendChild(head);

    var inner = el("div", "names-body");
    inner.hidden = collapsed;
    if (!collapsed) {
      body(current.works, current.selected, function (name) {
        current.onPick(name === current.selected ? "" : name);
      }).forEach(function (n) { inner.appendChild(n); });
    }
    box.appendChild(inner);
  }

  // Called once by index.js with every work, and by the cards for each name's colour.
  window.initNameColors = initColors;
  window.nameColor = function (n) { return colorOf[n] || ""; };

  // Called by index.js with the works that match the other filters, the selected name and a callback
  // that sets the name filter.
  window.renderNamesChart = function (works, selected, onPick) {
    current = { works: works || [], selected: selected || "", onPick: onPick };
    draw();
  };
})();
