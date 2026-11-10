// Malfoid Index: lists the works in works.json (built from malfoid-index/works.yaml).
// Every value is written with textContent, and links are only made for http(s) URLs,
// because the entries come from people outside this project.
(function () {
  "use strict";

  var KINDS = { creator: "Creator", comic: "Comic", game: "Game", fanfic: "Fanfic", art: "Fan art", gallery: "Gallery", video: "Video", music: "Music", other: "Other" };
  var LENGTHS = { "one-shot": "One-shot", short: "Short", novel: "Novel", unknown: "Length unknown" };
  var state = { kind: "all", length: "all", q: "", name: "" };
  var data = { works: [], contact: "" };
  var pageTitle = document.title;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function safeUrl(u) {
    try {
      var x = new URL(u);
      return x.protocol === "https:" || x.protocol === "http:" ? x.href : null;
    } catch (e) {
      return null;
    }
  }

  // Known platforms get an icon in the "on:" row; anything else is a plain "link".
  var PLATFORMS = [
    { key: "x", name: "X", match: /(^|\.)(x|twitter)\.com$/ },
    { key: "youtube", name: "YouTube", match: /(^|\.)(youtube\.com|youtu\.be)$/ },
    { key: "wattpad", name: "Wattpad", match: /(^|\.)wattpad\.com$/ },
    { key: "instagram", name: "Instagram", match: /(^|\.)instagram\.com$/ }
  ];
  var SVG_NS = "http://www.w3.org/2000/svg";
  var ICON_PATHS = {
    x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
    youtube: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
  };

  function platformOf(href) {
    var host;
    try { host = new URL(href).hostname.toLowerCase(); } catch (e) { return null; }
    for (var i = 0; i < PLATFORMS.length; i++) {
      if (PLATFORMS[i].match.test(host)) return PLATFORMS[i];
    }
    return null;
  }

  function svgEl(name, attrs) {
    var n = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function platformIcon(p) {
    var svg = svgEl("svg", { viewBox: "0 0 24 24", width: "16", height: "16", "aria-hidden": "true", focusable: "false" });
    if (p.key === "instagram") {
      // Instagram: a rounded square with a lens and a dot, drawn in the current text colour.
      svg.appendChild(svgEl("rect", { x: "3", y: "3", width: "18", height: "18", rx: "5", fill: "none", stroke: "currentColor", "stroke-width": "2" }));
      svg.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "4", fill: "none", stroke: "currentColor", "stroke-width": "2" }));
      svg.appendChild(svgEl("circle", { cx: "17.2", cy: "6.8", r: "1.2", fill: "currentColor" }));
    } else if (ICON_PATHS[p.key]) {
      svg.appendChild(svgEl("path", { fill: "currentColor", d: ICON_PATHS[p.key] }));
    } else {
      // Wattpad: a plain "W" badge in its orange, since the official mark is not drawn here.
      svg.appendChild(svgEl("rect", { x: "0", y: "0", width: "24", height: "24", rx: "5", fill: "#ff500a" }));
      var t = svgEl("text", { x: "12", y: "17", "text-anchor": "middle", "font-family": "Arial, sans-serif", "font-size": "15", "font-weight": "700", fill: "#ffffff" });
      t.textContent = "W";
      svg.appendChild(t);
    }
    return svg;
  }

  // The "on:" row: one icon per distinct http(s) link, shown only when there is more than one.
  function platformRow(urls) {
    var links = [];
    urls.forEach(function (u) {
      var href = safeUrl(u);
      if (href && links.indexOf(href) === -1) links.push(href);
    });
    if (links.length < 2) return null;
    var row = el("p", "work-platforms");
    row.appendChild(el("span", "work-platforms-label", "on:"));
    links.forEach(function (href) {
      var p = platformOf(href);
      var a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      if (p) {
        a.className = "platform";
        a.title = p.name;
        a.setAttribute("aria-label", p.name);
        a.appendChild(platformIcon(p));
      } else {
        a.className = "platform platform-text";
        a.title = href;
        a.textContent = "link";
      }
      row.appendChild(a);
    });
    return row;
  }

  function haystack(w) {
    var itemTitles = (w.items || []).map(function (i) { return i.title; });
    return [w.title, w.creator, w.summary, w.language, (w.tags || []).join(" "), itemTitles.join(" "),
      (w.kinds || []).map(function (k) { return KINDS[k] || k; }).join(" ")]
      .join(" ").toLowerCase();
  }

  // The kind, length and search filters, which the first-name chart follows too.
  function matchesFilters(w) {
    if (state.kind !== "all" && (w.kinds || []).indexOf(state.kind) === -1) return false;
    if (state.length !== "all" && (w.length || "unknown") !== state.length) return false;
    if (!state.q) return true;
    return state.q.split(/\s+/).every(function (term) { return haystack(w).indexOf(term) !== -1; });
  }

  // The list: the filters above, plus a first name chosen in the chart.
  function matches(w) {
    if (!matchesFilters(w)) return false;
    return !state.name || (w.first_name || "") === state.name;
  }

  function renderChips() {
    var box = document.getElementById("kinds");
    box.textContent = "";
    var kinds = [["all", "All"]];
    Object.keys(KINDS).forEach(function (k) { kinds.push([k, KINDS[k]]); });
    kinds.forEach(function (pair) {
      var count = pair[0] === "all" ? data.works.length
        : data.works.filter(function (w) { return (w.kinds || []).indexOf(pair[0]) !== -1; }).length;
      if (pair[0] !== "all" && count === 0) return;
      var b = el("button", "chip", pair[1]);
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.kind === pair[0]));
      b.appendChild(el("span", "n", String(count)));
      b.addEventListener("click", function () { state.kind = pair[0]; renderChips(); renderList(); });
      box.appendChild(b);
    });
  }

  function renderLengths() {
    var box = document.getElementById("lengths");
    box.textContent = "";
    var ids = ["all", "one-shot", "short", "novel", "unknown"];
    ids.forEach(function (id) {
      var count = id === "all" ? data.works.length
        : data.works.filter(function (w) { return (w.length || "unknown") === id; }).length;
      if (id !== "all" && count === 0) return;
      var label = id === "all" ? "Any length" : LENGTHS[id];
      var b = el("button", "chip", label);
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.length === id));
      b.appendChild(el("span", "n", String(count)));
      b.addEventListener("click", function () { state.length = id; renderLengths(); renderList(); });
      box.appendChild(b);
    });
  }

  function thumbOf(src) {
    var img = el("img", "work-thumb");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.onerror = function () { img.remove(); };
    return img;
  }

  function titleOf(w, cls) {
    var h = el("h2");
    var url = safeUrl(w.url);
    if (url) {
      var a = el("a", null, w.title || "Untitled");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      h.appendChild(a);
    } else {
      h.textContent = w.title || "Untitled";
    }
    return h;
  }

  function card(w) {
    var article = el("article", "work");
    if (w.thumb) article.appendChild(thumbOf(w.thumb));
    var top = el("div", "work-top");
    (w.kinds && w.kinds.length ? w.kinds : ["other"]).forEach(function (k) {
      top.appendChild(el("span", "kind", KINDS[k] || k));
    });
    if ((w.kinds || []).indexOf("fanfic") !== -1) top.appendChild(el("span", "kind", LENGTHS[w.length || "unknown"]));
    if (w.first_name) {
      // The name the work uses for Malfoid, in the same colour as its slice in the chart.
      var nameTag = el("span", "name-tag", w.first_name);
      var nameColor = window.nameColor ? window.nameColor(w.first_name) : "";
      if (nameColor) nameTag.style.setProperty("--tag", nameColor);
      top.appendChild(nameTag);
    }
    if (w.added) top.appendChild(el("span", "work-date", w.added));
    article.appendChild(top);

    article.appendChild(titleOf(w));

    var meta = [];
    if (w.creator) meta.push("by " + w.creator);
    if (w.language) meta.push(w.language);
    if (meta.length) article.appendChild(el("p", "work-meta", meta.join(" · ")));
    if (w.summary) article.appendChild(el("p", "work-summary", w.summary));
    var row = platformRow([w.url].concat(w.also || []));
    if (row) article.appendChild(row);
    if (w.items && w.items.length) {
      var more = el("a", "work-more", "See all " + w.items.length + " works →");
      more.href = "#" + encodeURIComponent(w.id);
      article.appendChild(more);
    }
    if (w.tags && w.tags.length) {
      var tags = el("div", "work-tags");
      w.tags.forEach(function (t) { tags.appendChild(el("span", null, t)); });
      article.appendChild(tags);
    }
    return article;
  }

  // One work inside a creator's sub page.
  function itemCard(item, creator) {
    var article = el("article", "work");
    article.appendChild(el("p", "work-meta", "by " + creator));
    article.appendChild(titleOf(item));
    if (item.added) article.appendChild(el("p", "work-date", item.added));
    if (item.summary) article.appendChild(el("p", "work-summary", item.summary));
    var row = platformRow([item.url].concat(item.also || []));
    if (row) article.appendChild(row);
    return article;
  }

  function setControlsHidden(hidden) {
    document.querySelectorAll(".index-controls").forEach(function (s) { s.hidden = hidden; });
  }

  function renderList() {
    drawNames();
    var list = document.getElementById("list");
    var count = document.getElementById("count");
    list.textContent = "";
    var shown = data.works.filter(matches);
    count.textContent = (shown.length === data.works.length
      ? data.works.length + (data.works.length === 1 ? " work" : " works")
      : shown.length + " of " + data.works.length + " works")
      + (state.name ? " named " + state.name : "");
    if (!shown.length) {
      list.appendChild(el("div", "index-empty", data.works.length
        ? "Nothing matches that search yet."
        : "No works listed yet. Be the first to send one in."));
      return;
    }
    shown.forEach(function (w) { list.appendChild(card(w)); });
  }

  // The sub page for a creator with many works: their own entry at the top, then each work.
  function renderCreator(w) {
    setControlsHidden(true);
    document.title = w.title + " · Malfoid Index";
    var list = document.getElementById("list");
    var count = document.getElementById("count");
    list.textContent = "";
    var back = el("p", "work-back");
    var backLink = el("a", null, "← All works");
    backLink.href = "#";
    back.appendChild(backLink);
    list.appendChild(back);
    count.textContent = w.items.length + (w.items.length === 1 ? " work" : " works") + " by " + (w.creator || w.title);

    var head = el("article", "work creator-head");
    if (w.thumb) head.appendChild(thumbOf(w.thumb));
    var top = el("div", "work-top");
    (w.kinds || []).forEach(function (k) { top.appendChild(el("span", "kind", KINDS[k] || k)); });
    head.appendChild(top);
    head.appendChild(titleOf(w));
    if (w.creator) head.appendChild(el("p", "work-meta", w.creator));
    if (w.summary) head.appendChild(el("p", "work-summary", w.summary));
    var row = platformRow([w.url].concat(w.also || []));
    if (row) head.appendChild(row);
    list.appendChild(head);

    w.items.forEach(function (item) { list.appendChild(itemCard(item, w.creator || w.title)); });
  }

  function showList() {
    setControlsHidden(false);
    document.title = pageTitle;
    renderChips();
    renderLengths();
    renderList();
  }

  // The address bar hash picks the view: #<creator id> opens that creator's sub page.
  function route() {
    var id = "";
    try { id = decodeURIComponent((location.hash || "").slice(1)); } catch (e) { id = ""; }
    var w = null;
    if (id) {
      data.works.forEach(function (x) {
        if (!w && x.id === id && x.items && x.items.length) w = x;
      });
    }
    if (w) {
      renderCreator(w);
      window.scrollTo(0, 0);
    } else {
      showList();
    }
  }

  function setupSubmit() {
    var to = data.contact || "rhedak@proton.me";
    var subject = "Malfoid Index submission";
    var body = [
      "Title:",
      "Kind (fanfic / fan art / gallery / video / music / other):",
      "Your name or handle:",
      "Link to the work (must stay online):",
      "Language (English, or English subs):",
      "Short summary (1-2 sentences):",
      "Tags (optional):",
      "",
      "I made this myself, it is in English (or has English subs) and wholesome (SFW), and I agree to it being listed in the Malfoid Index.",
    ].join("\n");
    var href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    document.getElementById("submit").href = href;
    var contact = document.getElementById("contact");
    contact.href = "mailto:" + to;
    contact.textContent = to;
  }

  // Picking a name in the chart filters the list; picking it again clears the filter.
  function setName(name) {
    state.name = name || "";
    renderList();
  }

  // The chart counts only the works that pass the other filters.
  function drawNames() {
    if (window.renderNamesChart) window.renderNamesChart(data.works.filter(matchesFilters), state.name, setName);
  }

  function init(json) {
    data = json;
    if (window.initNameColors) window.initNameColors(data.works);
    setupSubmit();
    drawNames();
    route();
    window.addEventListener("hashchange", route);
    var q = document.getElementById("q");
    q.addEventListener("input", function () { state.q = q.value.trim().toLowerCase(); renderList(); });
  }

  function fallback() {
    init({ works: [], contact: "rhedak@proton.me" });
  }

  try {
    fetch("works.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(init)
      .catch(fallback);
  } catch (e) {
    fallback();
  }
})();
