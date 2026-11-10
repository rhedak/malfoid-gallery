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
  var OTHER_PALETTE = ["#38bdf8", "#f472b6", "#f87171", "#a3e635", "#e879f9", "#22d3ee", "#94a3b8", "#818cf8"];
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
      .forEach(function (n, i) { colorOf[n] = otherColor(i); });
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

  // Build the donut: one ring circle per slice, each drawn as a dash of the circumference.
  function donut(slices, named, selected, onPick) {
    var svg = svgEl("svg", { viewBox: "0 0 200 200", role: "img", "aria-label": "Donut chart of first names used for Malfoid" });
    svg.setAttribute("class", "names-donut");
    svg.appendChild(svgEl("circle", { cx: "100", cy: "100", r: String(R), fill: "none", stroke: "var(--panel-2, #16201c)", "stroke-width": String(STROKE) }));
    var offset = 0;
    slices.forEach(function (s) {
      if (!s.count) return;
      var len = (s.count / named) * C;
      var seg = svgEl("circle", {
        cx: "100", cy: "100", r: String(R), fill: "none", stroke: s.color,
        "stroke-width": String(STROKE),
        "stroke-dasharray": (len - 1.5) + " " + C,
        "stroke-dashoffset": String(-offset),
        transform: "rotate(-90 100 100)",
        "class": "names-seg" + (selected === s.name ? " is-on" : (selected ? " is-off" : ""))
      });
      var title = svgEl("title", {});
      title.textContent = s.name + ": " + s.count + " (" + Math.round((s.count / named) * 100) + "%)";
      seg.appendChild(title);
      seg.addEventListener("click", function () { onPick(s.name); });
      svg.appendChild(seg);
      offset += len;
    });
    return svg;
  }

  function body(works, selected, onPick) {
    var t = tally(works);
    if (!t.named) return [el("p", "names-empty", "No works name her yet.")];

    var out = [];
    var wrap = el("div", "names-wrap");
    var ring = el("div", "names-ring");
    ring.appendChild(donut(t.slices, t.named, selected, onPick));
    var centre = el("div", "names-centre");
    centre.appendChild(el("strong", null, selected || "Malfoid"));
    centre.appendChild(el("span", null, selected
      ? (t.slices.filter(function (s) { return s.name === selected; })[0] || { count: 0 }).count + " works"
      : "first names in the index"));
    ring.appendChild(centre);
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
