// Malfoid Index: the first-name chart. It is drawn in code from the works in works.json
// (the first_name field of each entry), so it updates whenever the index is rebuilt.
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

  // Other names get colours from a fixed hue spread, so the same name keeps its colour on every build.
  function otherColor(i) {
    return "hsl(" + ((i * 137) % 360) + ", 62%, 66%)";
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
      .map(function (n, i) { return { name: n, color: otherColor(i), count: counts[n] }; });
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

  function render(works, selected, onPick) {
    var box = document.getElementById("names-chart");
    if (!box) return;
    box.textContent = "";
    var t = tally(works);

    box.appendChild(el("h2", "names-title", "Which first name is used for Malfoid?"));
    if (!t.named) {
      box.appendChild(el("p", "names-empty", "No works name her yet."));
      return;
    }

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
    box.appendChild(wrap);

    var foot = el("p", "names-foot");
    foot.textContent = t.named + " of " + t.total + " works name her. " +
      (t.unknown ? t.unknown + " don't yet; they are left out of the chart. " : "") +
      (selected ? "Click the selected name again to show all works." : "Click a name to filter the list.");
    box.appendChild(foot);
  }

  // Called by index.js with the works and a callback that sets the list filter.
  var current = { works: [], selected: "", onPick: null };
  window.renderNamesChart = function (works, selected, onPick) {
    current = { works: works || [], selected: selected || "", onPick: onPick };
    render(current.works, current.selected, function (name) {
      current.onPick(name === current.selected ? "" : name);
    });
  };
})();
