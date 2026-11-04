/* Malfoid Gallery front end: plain JS, no build step. Data comes from index.json (scripts/build_site.py). */
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  "use strict";

  var CHIP_FACETS = ["theme", "style", "status", "media"];
  var SELECT_FACETS = ["outfit", "emotion", "loc"];
  var FIELD = { theme: "theme", style: "style", status: "status", media: "media", outfit: "outfit", emotion: "emotion", loc: "location" };
  var MEDIA_NAMES = { image: "Image", video: "Video clip", animation: "Animation" };
  var PLATFORMS = [["x", "X"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["rednote", "Rednote 小红书"]];

  var data, entries = [], byId = {}, mini = null, labels = {};
  var state = emptyState();
  var visible = [];
  var current = null; // id shown in the detail view
  var mediaMode = "image";
  var lastFocus = null;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function emptyState() {
    return { q: "", sort: "newest", theme: [], style: [], status: [], media: [], outfit: "", emotion: "", loc: "", tag: "" };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtDate(d) {
    if (!d) return "";
    var p = String(d).split("-");
    if (p.length !== 3) return d;
    var dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return dt.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  function label(facet, value) {
    var e;
    if (facet === "theme") return (labels.theme || {})[value] || cap(value);
    if (facet === "status") return (labels.status || {})[value] || cap(value);
    if (facet === "loc") return (labels.location || {})[value] || cap(value);
    if (facet === "media") return MEDIA_NAMES[value] || cap(value);
    if (facet === "style") { e = entries.find(function (x) { return x.style === value; }); return e ? e.styleName : cap(value); }
    if (facet === "outfit") { e = entries.find(function (x) { return x.outfit === value; }); return e ? cap(e.outfitName) : cap(value); }
    if (facet === "emotion") { e = entries.find(function (x) { return x.emotion === value; }); return e ? cap(e.emotionName) : cap(value); }
    if (facet === "tag") return "#" + value;
    return value;
  }

  /* ---------- URL state ---------- */
  function readUrl() {
    var p = new URLSearchParams(location.search);
    var s = emptyState();
    s.q = p.get("q") || "";
    s.sort = ["newest", "oldest", "plan"].indexOf(p.get("sort")) >= 0 ? p.get("sort") : "newest";
    CHIP_FACETS.forEach(function (f) { s[f] = (p.get(f) || "").split(",").filter(Boolean); });
    SELECT_FACETS.concat(["tag"]).forEach(function (f) { s[f] = p.get(f) || ""; });
    state = s;
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    CHIP_FACETS.forEach(function (f) { if (state[f].length) p.set(f, state[f].join(",")); });
    SELECT_FACETS.concat(["tag"]).forEach(function (f) { if (state[f]) p.set(f, state[f]); });
    if (state.sort !== "newest") p.set("sort", state.sort);
    var qs = p.toString().replace(/%2C/g, ",");
    history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  /* ---------- search + filter ---------- */
  function buildSearch() {
    if (!window.MiniSearch) return;
    mini = new window.MiniSearch({
      idField: "id",
      fields: ["title", "prompt", "tagText", "themeName", "outfitName", "emotionName", "settingName", "styleName", "planTheme"],
      storeFields: ["id"],
      searchOptions: { boost: { title: 3, tagText: 2.5, themeName: 2, outfitName: 1.5, emotionName: 1.5 }, prefix: true, fuzzy: 0.15, combineWith: "AND" }
    });
    mini.addAll(entries.map(function (e) {
      return {
        id: e.id, title: e.title, prompt: e.prompt, tagText: e.tags.join(" "), themeName: e.themeName + " " + e.theme,
        outfitName: e.outfitName || "", emotionName: e.emotionName || "", settingName: e.settingName || "",
        styleName: e.styleName, planTheme: e.daily ? e.daily.theme + " " + e.daily.label : ""
      };
    }));
  }
  function searchHits() {
    var q = state.q.trim();
    if (!q) return null;
    var hits = {};
    if (mini) {
      mini.search(q).forEach(function (r) { hits[r.id] = r.score; });
    } else { // fallback: plain substring match on every word
      var words = q.toLowerCase().split(/\s+/);
      entries.forEach(function (e) {
        var hay = [e.title, e.prompt, e.tags.join(" "), e.themeName, e.outfitName, e.emotionName].join(" ").toLowerCase();
        if (words.every(function (w) { return hay.indexOf(w) >= 0; })) hits[e.id] = 1;
      });
    }
    return hits;
  }
  function matches(e, hits, skip) {
    if (hits && !(e.id in hits)) return false;
    for (var i = 0; i < CHIP_FACETS.length; i++) {
      var f = CHIP_FACETS[i];
      if (f !== skip && state[f].length && state[f].indexOf(e[FIELD[f]]) < 0) return false;
    }
    for (var j = 0; j < SELECT_FACETS.length; j++) {
      var g = SELECT_FACETS[j];
      if (g !== skip && state[g] && e[FIELD[g]] !== state[g]) return false;
    }
    if (state.tag && skip !== "tag" && e.tags.indexOf(state.tag) < 0) return false;
    return true;
  }
  function sortList(list) {
    var s = state.sort;
    return list.slice().sort(function (a, b) {
      if (s === "oldest") return a.order - b.order;
      if (s === "plan") {
        var an = a.daily ? a.daily.n : 1e6, bn = b.daily ? b.daily.n : 1e6;
        return an - bn || a.order - b.order;
      }
      return (b.created > a.created ? 1 : b.created < a.created ? -1 : 0) || b.order - a.order;
    });
  }

  /* ---------- render: controls ---------- */
  function values(field) {
    var seen = {}, out = [];
    entries.forEach(function (e) { var v = e[field]; if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out;
  }
  function renderControls(hits) {
    CHIP_FACETS.forEach(function (f) {
      var box = $('.chip-row[data-facet="' + f + '"] .chips');
      var vals = values(FIELD[f]);
      if (f === "theme") vals.sort(function (a, b) { return count(f, b, hits) - count(f, a, hits); });
      box.innerHTML = vals.map(function (v) {
        var n = count(f, v, hits), on = state[f].indexOf(v) >= 0;
        return '<button class="chip' + (n || on ? "" : " zero") + '" data-facet="' + f + '" data-value="' + esc(v) + '" aria-pressed="' + on + '">' +
          esc(label(f, v)) + '<span class="n">' + n + "</span></button>";
      }).join("");
    });
    SELECT_FACETS.forEach(function (f) {
      var sel = $('select[data-facet="' + f + '"]');
      var vals = values(FIELD[f]).sort(function (a, b) { return label(f, a).localeCompare(label(f, b)); });
      var html = '<option value="">All</option>' + vals.map(function (v) {
        var n = count(f, v, hits);
        return '<option value="' + esc(v) + '"' + (state[f] === v ? " selected" : "") + (n ? "" : " disabled") + ">" + esc(label(f, v)) + " (" + n + ")</option>";
      }).join("");
      sel.innerHTML = html;
      sel.value = state[f];
    });
    $("#q").value !== state.q && ($("#q").value = state.q);
    $("#sort").value = state.sort;

    var pills = [];
    CHIP_FACETS.forEach(function (f) { state[f].forEach(function (v) { pills.push([f, v]); }); });
    SELECT_FACETS.concat(["tag"]).forEach(function (f) { if (state[f]) pills.push([f, state[f]]); });
    var active = $("#active");
    active.innerHTML = pills.map(function (p) {
      return '<button class="pill" data-remove="' + p[0] + '" data-value="' + esc(p[1]) + '" title="Remove filter">' + esc(label(p[0], p[1])) + "<i>×</i></button>";
    }).join("") + (pills.length || state.q ? '<button class="linkish" data-action="clear">Clear all</button>' : "");
    var miniPills = pills.slice();
    if (state.sort !== "newest") miniPills.push(["sort", state.sort]);
    $("#mini-pills").innerHTML = miniPills.length ? miniPills.map(function (p) {
      var text = p[0] === "sort" ? "Sort: " + $('#sort option[value="' + p[1] + '"]').textContent : label(p[0], p[1]);
      return '<button class="pill" data-remove="' + p[0] + '" data-value="' + esc(p[1]) + '" title="Remove" aria-label="Remove ' + esc(text) + '">' + esc(text) + "<i>×</i></button>";
    }).join("") : '<span class="mini-empty">No filters</span>';
    var nf = miniPills.length, badge = $("#filter-count");
    badge.hidden = !nf; badge.textContent = nf;
    if (!collapsed) syncExpandHeight();
  }
  function count(f, v, hits) {
    var field = FIELD[f], n = 0;
    entries.forEach(function (e) { if (e[field] === v && matches(e, hits, f)) n++; });
    return n;
  }

  /* ---------- render: grid ---------- */
  function render() {
    var hits = searchHits();
    visible = sortList(entries.filter(function (e) { return matches(e, hits); }));
    renderControls(hits);
    var grid = $("#grid"), tpl = $("#card-tpl");
    var frag = document.createDocumentFragment();
    visible.forEach(function (e, i) {
      var node = tpl.content.firstElementChild.cloneNode(true);
      node.href = "#/" + encodeURIComponent(e.id);
      node.dataset.id = e.id;
      var img = $("img", node);
      img.alt = e.title;
      if (e.width && e.height) { img.width = 480; img.height = Math.round(480 * e.height / e.width); }
      if (i < 8) img.loading = "eager";
      img.addEventListener("load", function () { img.classList.add("loaded"); });
      img.addEventListener("error", function () { if (img.src.indexOf(e.image) < 0) img.src = e.image; });
      img.src = e.thumb;
      $("h3", node).textContent = e.title;
      $(".card-meta", node).textContent = e.daily
        ? e.daily.label.replace("Daily Malfoid ", "Daily ") + " · " + fmtDate(e.daily.date)
        : "Gallery only · " + e.themeName;
      var b = [];
      if (e.daily) b.push('<span class="badge num">#' + e.daily.n + "</span>");
      if (e.media === "video") b.push('<span class="badge video">▶ Clip</span>');
      if (e.media === "animation") { b.push('<span class="badge video">▶ Anim</span>'); node.dataset.anim = e.image; }
      if (e.status === "posted") b.push('<span class="badge posted">Posted</span>');
      if (e.style !== "anime") b.push('<span class="badge style">' + esc(e.styleName) + "</span>");
      $(".card-badges", node).innerHTML = b.join("");
      frag.appendChild(node);
    });
    grid.replaceChildren(frag);
    $$(".card[data-anim]", grid).forEach(function (c) {
      var img = $("img", c), still = img.src;
      c.addEventListener("mouseenter", function () { img.src = c.dataset.anim; });
      c.addEventListener("mouseleave", function () { img.src = still; });
    });
    wheelSet(visible);
    $("#empty").hidden = visible.length > 0;
    var total = entries.length;
    $("#result-count").innerHTML = visible.length === total
      ? "<b>" + total + "</b> entries"
      : "<b>" + visible.length + "</b> of " + total + " entries";
    $("#mini-count").innerHTML = "<b>" + visible.length + "</b>" + (visible.length === total ? '<span class="tot"> entries</span>' : '<span class="tot"> / ' + total + "</span>");
  }

  /* ---------- detail view ---------- */
  function highlight(text) {
    var safe = esc(text), q = state.q.trim();
    if (!q) return safe;
    var words = q.split(/\s+/).filter(function (w) { return w.length > 1; }).map(function (w) {
      return esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });
    if (!words.length) return safe;
    return safe.replace(new RegExp("(" + words.join("|") + ")", "gi"), "<mark>$1</mark>");
  }
  function navList() {
    return visible.some(function (e) { return e.id === current; }) ? visible : sortList(entries);
  }
  function openDetail(id) {
    var e = byId[id];
    if (!e) { closeDetail(true); return; }
    var wasOpen = !$("#detail").hidden;
    if (!wasOpen) {
      lastFocus = document.activeElement;
      mediaMode = state.media.length === 1 && state.media[0] === "video" && e.video ? "video" : "image";
    } else if (current !== id) {
      mediaMode = mediaMode === "video" && e.video ? "video" : "image";
    }
    current = id;
    $("#detail").hidden = false;
    document.body.classList.add("lock");
    renderMedia(e);
    renderInfo(e);
    document.title = e.title + " · Malfoid Gallery";
    var list = navList(), i = list.findIndex(function (x) { return x.id === id; });
    [list[i - 1], list[i + 1]].forEach(function (n) { if (n) { var im = new Image(); im.src = n.image; } });
    if (!wasOpen) $(".close").focus({ preventScroll: true });
  }
  function renderMedia(e) {
    var frame = $("#media-frame"), toggle = $("#media-toggle");
    toggle.hidden = !e.video;
    $$("button", toggle).forEach(function (b) { b.classList.toggle("on", b.dataset.mode === mediaMode); });
    if (e.video && mediaMode === "video") {
      frame.innerHTML = '<video controls playsinline loop preload="metadata" poster="' + esc(e.image) + '"><source src="' + esc(e.video.src) + '" type="video/mp4"></video>';
    } else {
      frame.innerHTML = '<a href="' + esc(e.image) + '" target="_blank" rel="noopener" title="Open full image"><img src="' + esc(e.image) + '" alt="' + esc(e.title) + '"' +
        (e.width ? ' width="' + e.width + '" height="' + e.height + '"' : "") + "></a>";
    }
  }
  function fact(k, v) { return v ? "<dt>" + esc(k) + "</dt><dd>" + v + "</dd>" : ""; }
  function facetBtn(facet, value, text) {
    return value ? '<button class="facet" data-facet="' + facet + '" data-value="' + esc(value) + '">' + esc(text) + "</button>" : "";
  }
  function link(href, text) { return href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(text) + "</a>" : ""; }
  function renderInfo(e) {
    var h = [];
    var kick = [];
    if (e.daily) kick.push('<span class="badge num">' + esc(e.daily.label) + "</span>");
    kick.push('<span class="badge ' + e.status + '">' + esc(label("status", e.status)) + "</span>");
    if (e.media === "video") kick.push('<span class="badge video">▶ Clip</span>');
    if (e.media === "animation") kick.push('<span class="badge video">▶ Animation</span>');
    if (e.style !== "anime") kick.push('<span class="badge">' + esc(e.styleName) + "</span>");
    h.push('<div class="d-kicker">' + kick.join("") + "</div>");
    h.push('<h2 id="d-title">' + esc(e.title) + "</h2>");
    var sub = [];
    if (e.daily) sub.push((e.status === "posted" ? "Posted " : "Planned for ") + fmtDate(e.posted && e.posted.date || e.daily.date));
    else sub.push("Gallery only, never posted");
    sub.push("created " + fmtDate(e.created));
    h.push('<p class="d-sub">' + esc(sub.join(" · ")) + "</p>");

    h.push('<div class="d-section"><h4>Details</h4><dl class="facts">' +
      fact("Theme", facetBtn("theme", e.theme, e.themeName)) +
      fact("Style", facetBtn("style", e.style, e.styleName) + (e.variant ? ' <span style="color:var(--silver-2)">(' + esc(e.variant) + ")</span>" : "")) +
      fact("Outfit", facetBtn("outfit", e.outfit, cap(e.outfitName))) +
      fact("Emotion", facetBtn("emotion", e.emotion, cap(e.emotionName))) +
      fact("Location", (e.settingName ? esc(cap(e.settingName)) + " · " : "") + facetBtn("loc", e.location, e.locationName)) +
      fact("Pose", e.poseName ? esc(e.poseName) + (e.poseView ? " (" + esc(e.poseView === "diag" ? "three-quarter" : e.poseView) + ")" : "") : "") +
      fact("Daily theme", e.daily ? esc(e.daily.theme) : "") +
      fact("Tool", esc(e.tool)) +
      fact("Size", e.width ? e.width + " × " + e.height : "") +
      "</dl></div>");

    if (e.tags.length) {
      h.push('<div class="d-section"><h4>Tags</h4><div class="tags">' + e.tags.map(function (t) {
        return '<button class="tag" data-tag="' + esc(t) + '">#' + esc(t) + "</button>";
      }).join("") + "</div></div>");
    }

    var preview = e.prompt.slice(0, 90);
    if (e.prompt) h.push('<div class="d-section"><h4>Prompt</h4><details class="prompt"' + (state.q ? " open" : "") + '><summary><span>Full prompt</span><span class="preview">' + esc(preview) +
      '…</span><button class="copy" data-copy="prompt">Copy</button></summary><p class="prompt-text">' + highlight(e.prompt) + "</p></details></div>");

    var links = [link(e.basePost, "Base post"), link(e.resultPost, "Grok result")];
    if (e.source) {
      var srcUrl = e.source.split(" ")[0], srcNote = e.source.slice(srcUrl.length).trim();
      links.push(link(srcUrl, "Companion pack source"));
      if (srcNote) links.push('<span class="src-note">' + esc(srcNote.replace(/^\(|\)$/g, "")) + "</span>");
    }
    if (e.video) links.push(link(e.video.post, "Grok clip"));
    if (e.posted && e.posted.links) Object.keys(e.posted.links).forEach(function (k) {
      links.push(link(e.posted.links[k], "Post on " + (PLATFORMS.find(function (p) { return p[0] === k; }) || [k, cap(k)])[1]));
    });
    h.push('<div class="d-section"><h4>Links</h4><div class="links">' + links.join("") + "</div></div>");

    if (e.video) {
      h.push('<div class="d-section"><h4>Clip</h4><p class="motion">' + esc(e.video.motion) + '</p><div class="links"><a href="' + esc(e.video.src) + '" target="_blank" rel="noopener">MP4 file</a></div></div>');
    }

    var caps = e.daily && e.daily.captions || {};
    var plats = PLATFORMS.filter(function (p) { return caps[p[0]]; });
    if (plats.length) {
      h.push('<div class="d-section"><h4>Captions · ' + esc(e.daily.label) + '</h4><div class="tabs" role="tablist">' + plats.map(function (p, i) {
        return '<button role="tab" data-tab="' + p[0] + '" aria-selected="' + (i === 0) + '">' + esc(p[1]) + "</button>";
      }).join("") + "</div>" + plats.map(function (p, i) {
        var c = caps[p[0]];
        var head = [c.format, c.post].filter(Boolean).map(esc).join(" · ");
        var tags = c.hashtags || c.tags || "";
        return '<div class="caption" data-panel="' + p[0] + '"' + (i ? " hidden" : "") + '><div class="cap-head"><span>' + head +
          '</span><button class="copy" data-copy="caption" data-platform="' + p[0] + '">Copy</button></div>' +
          (c.title ? '<p class="cap-title">' + esc(c.title) + "</p>" : "") +
          "<p>" + esc(c.caption || c.body || "") + "</p>" + (tags ? '<div class="hashtags">' + esc(tags) + "</div>" : "") + "</div>";
      }).join("") + "</div>");
    }

    var refs = [];
    if (e.reference) refs.push('<figure><a href="' + esc(e.reference) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(e.reference) + '" alt="Character reference"></a><figcaption>Character reference</figcaption></figure>');
    if (e.poseRef) refs.push('<figure><a href="' + esc(e.poseRef) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + esc(e.poseRef) + '" alt="Pose reference"></a><figcaption>Pose reference (Shisei, CC0)</figcaption></figure>');
    if (refs.length) h.push('<div class="d-section"><h4>References</h4><div class="refs">' + refs.join("") + "</div></div>");

    h.push('<p class="hint">← → to browse · Esc to close · swipe on mobile</p>');
    var info = $("#detail-info");
    info.innerHTML = h.join("");
    info.scrollTop = 0;
    if (window.matchMedia("(max-width: 900px)").matches) $(".detail-panel").scrollTop = 0;
  }
  function closeDetail(replace) {
    if ($("#detail").hidden) return;
    $("#detail").hidden = true;
    document.body.classList.remove("lock");
    var v = $("#media-frame video"); if (v) v.pause();
    $("#media-frame").innerHTML = "";
    var id = current; current = null;
    document.title = "Malfoid Gallery · Draconia Malfoid";
    if (location.hash) {
      if (!replace && history.state && history.state.fromGrid) history.back();
      else history.replaceState(null, "", location.pathname + location.search);
    }
    var card = id && $('.card[data-id="' + CSS.escape(id) + '"]');
    if (card) card.focus({ preventScroll: false }); else if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function step(dir) {
    if (!current) return;
    var list = navList(), i = list.findIndex(function (x) { return x.id === current; });
    var n = list[(i + dir + list.length) % list.length];
    if (!n) return;
    history.replaceState(history.state, "", location.pathname + location.search + "#/" + encodeURIComponent(n.id));
    openDetail(n.id);
  }
  function route() {
    var m = location.hash.match(/^#\/(.+)$/);
    if (m) openDetail(decodeURIComponent(m[1]));
    else closeDetail(true);
  }


  /* ---------- featured wheel ---------- */
  // Shuffled once per load (a random rank per entry), then follows the active search and filters. Animated with
  // requestAnimationFrame: the item list is doubled so the strip loops seamlessly; the item nearest the centre is
  // drawn a little larger and brighter. Pauses on hover, touch, drag, a hidden tab or when collapsed.
  var wheel = { rank: {}, items: [], offset: 0, half: 0, paused: 0, hover: false, touchUntil: 0, dragging: false,
    justDragged: false, last: 0, raf: 0, speed: 38, key: "" };
  var reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
  function wheelOn() { return !$("#wheel").classList.contains("off"); }
  function wheelSet(list) {
    if (!$("#wheel")) return;
    var key = list.map(function (e) { return e.id; }).join(",");
    if (key === wheel.key) return;
    wheel.key = key;
    var pics = list.filter(function (e) { return e.thumb || e.image; }).slice().sort(function (a, b) {
      return wheel.rank[a.id] - wheel.rank[b.id];
    });
    $("#wheel").hidden = pics.length < 3;
    var reduced = reducedMq.matches;
    var seq = reduced ? pics : pics.concat(pics);
    var frag = document.createDocumentFragment();
    seq.forEach(function (e, i) {
      var a = document.createElement("a");
      a.className = "wheel-item";
      a.href = "#/" + encodeURIComponent(e.id);
      a.dataset.id = e.id;
      a.title = e.title;
      a.draggable = false;
      if (i >= pics.length) { a.tabIndex = -1; a.setAttribute("aria-hidden", "true"); }
      var img = document.createElement("img");
      img.alt = i >= pics.length ? "" : e.title;
      img.loading = i < 8 ? "eager" : "lazy";
      img.decoding = "async";
      img.draggable = false;
      img.src = e.thumb || e.image;
      img.addEventListener("error", function () { if (img.src.indexOf(e.image) < 0) img.src = e.image; });
      a.appendChild(img);
      frag.appendChild(a);
    });
    $("#wheel-track").replaceChildren(frag);
    wheel.items = Array.prototype.slice.call($("#wheel-track").children);
    $("#wheel").classList.toggle("reduced", reduced);
    wheel.offset = 0;
    wheelMeasure();
    wheelPaint();
  }
  function wheelMeasure() {
    var n = wheel.items.length / 2;
    wheel.half = n && wheel.items[n] ? wheel.items[n].offsetLeft - wheel.items[0].offsetLeft : 0;
  }
  function wheelPaint() {
    if (reducedMq.matches || !wheel.items.length) return;
    if (!wheel.half) wheelMeasure();
    if (wheel.half) wheel.offset = ((wheel.offset % wheel.half) + wheel.half) % wheel.half;
    $("#wheel-track").style.transform = "translate3d(" + (-wheel.offset).toFixed(1) + "px,0,0)";
    var vp = $("#wheel-viewport"), mid = vp.clientWidth / 2, span = Math.max(240, vp.clientWidth * 0.55), best = null, bestD = 1e9;
    wheel.items.forEach(function (it) {
      var c = it.offsetLeft + it.offsetWidth / 2 - wheel.offset, d = Math.abs(c - mid);
      if (c < -400 || c > vp.clientWidth + 400) return;
      var k = Math.max(0, 1 - d / span); // 1 at the centre, 0 towards the edges
      it.style.setProperty("--s", (0.84 + 0.18 * k * k).toFixed(3));
      it.style.setProperty("--b", (0.62 + 0.42 * k).toFixed(3));
      if (d < bestD) { bestD = d; best = it; }
    });
    wheel.items.forEach(function (it) { it.classList.toggle("center", it === best); });
  }
  function wheelPausedNow() {
    return wheel.hover || wheel.dragging || Date.now() < wheel.touchUntil || document.hidden || !wheelOn() ||
      !$("#detail").hidden || reducedMq.matches;
  }
  function wheelLoop(t) {
    wheel.raf = requestAnimationFrame(wheelLoop);
    var dt = wheel.last ? Math.min(0.05, (t - wheel.last) / 1000) : 0;
    wheel.last = t;
    if (wheelPausedNow()) return;
    var r = $("#wheel").getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return; // off screen: no work
    wheel.offset += wheel.speed * dt;
    wheelPaint();
  }
  function wheelSetOpen(open, save) {
    $("#wheel").classList.toggle("off", !open);
    $("#wheel-toggle").setAttribute("aria-expanded", String(open));
    $(".wheel-toggle-label", $("#wheel-toggle")).textContent = open ? "Hide" : "Show";
    $("#wheel-body").inert = !open;
    if (save) try { localStorage.setItem("malfoid-wheel", open ? "1" : "0"); } catch (err) { /* private mode */ }
    if (open) requestAnimationFrame(function () { wheelMeasure(); wheelPaint(); });
  }
  function wheelInit() {
    if (!$("#wheel")) return;
    entries.forEach(function (e) { wheel.rank[e.id] = Math.random(); });
    var saved = null;
    try { saved = localStorage.getItem("malfoid-wheel"); } catch (err) { /* ignore */ }
    wheelSetOpen(saved !== "0", false);
    $("#wheel-toggle").addEventListener("click", function () { wheelSetOpen(!wheelOn(), true); });
    var vp = $("#wheel-viewport"), startX = 0, startOff = 0, down = false, pid = null;
    vp.addEventListener("mouseenter", function () { wheel.hover = true; });
    vp.addEventListener("mouseleave", function () { wheel.hover = false; });
    vp.addEventListener("pointerdown", function (ev) {
      if (reducedMq.matches || (ev.pointerType === "mouse" && ev.button !== 0)) return;
      down = true; pid = ev.pointerId; startX = ev.clientX; startOff = wheel.offset; wheel.justDragged = false;
      wheel.touchUntil = Date.now() + 1e9;
    });
    vp.addEventListener("pointermove", function (ev) {
      if (!down || ev.pointerId !== pid) return;
      var dx = ev.clientX - startX;
      if (!wheel.dragging && Math.abs(dx) > 6) {
        wheel.dragging = true; vp.classList.add("dragging");
        try { vp.setPointerCapture(pid); } catch (err) { /* ignore */ }
      }
      if (wheel.dragging) { wheel.offset = startOff - dx; wheelPaint(); }
    });
    function end(ev) {
      if (!down || (ev && ev.pointerId !== pid)) return;
      down = false;
      if (wheel.dragging) { wheel.justDragged = true; setTimeout(function () { wheel.justDragged = false; }, 60); }
      wheel.dragging = false; vp.classList.remove("dragging");
      wheel.touchUntil = Date.now() + (ev && ev.pointerType === "mouse" ? 0 : 2500); // touch: resume after a moment
    }
    vp.addEventListener("pointerup", end);
    vp.addEventListener("pointercancel", end);
    window.addEventListener("resize", function () { wheelMeasure(); wheelPaint(); });
    reducedMq.addEventListener && reducedMq.addEventListener("change", function () { wheel.key = ""; wheelSet(visible); });
    document.addEventListener("visibilitychange", function () { wheel.last = 0; });
    wheel.raf = requestAnimationFrame(wheelLoop);
  }

  /* ---------- collapsible sticky panel ---------- */
  var collapsed = false;
  function setAria() {
    [$("#mini"), $("#toggle-filters")].forEach(function (el) { el.setAttribute("aria-expanded", String(!collapsed)); });
    $("#toggle-filters").setAttribute("aria-label", collapsed ? "Show filters" : "Collapse filters");
    $("#mini").tabIndex = collapsed ? 0 : -1;
  }
  function syncExpandHeight() {
    var ex = $("#expand");
    ex.style.maxHeight = ex.scrollHeight + "px";
  }
  // The panel opens and closes only on the user's click / tap (collapsed by default on every screen size) and stays
  // as it is while scrolling. No spacer: when toggled while stuck, the browser's scroll anchoring keeps the cards in place.
  function setPanel(open) {
    if (open === !collapsed) return;
    var ex = $("#expand"), controls = $(".controls");
    if (!open) { ex.style.maxHeight = ex.scrollHeight + "px"; void ex.offsetHeight; }
    collapsed = !open;
    controls.classList.toggle("collapsed", collapsed);
    if (open) { ex.removeAttribute("aria-hidden"); ex.inert = false; syncExpandHeight(); }
    else { ex.style.maxHeight = "0px"; ex.setAttribute("aria-hidden", "true"); ex.inert = true; }
    setAria();
  }
  function collapsePanel() { setPanel(false); }
  function expandPanel() { setPanel(true); }

  /* ---------- events ---------- */
  function setFacet(facet, value, toggle) {
    if (CHIP_FACETS.indexOf(facet) >= 0) {
      var arr = state[facet], i = arr.indexOf(value);
      if (i >= 0) { if (toggle) arr.splice(i, 1); } else arr.push(value);
    } else {
      state[facet] = toggle && state[facet] === value ? "" : value;
    }
  }
  function update() { writeUrl(); render(); }
  function filterFromDetail(fn) {
    fn();
    closeDetail(true);
    update();
    window.scrollTo({ top: $("#grid").offsetTop - 160, behavior: "smooth" });
  }
  function copyText(text, btn) {
    var done = function () { btn.classList.add("done"); btn.textContent = "Copied"; setTimeout(function () { btn.classList.remove("done"); btn.textContent = "Copy"; }, 1400); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (err) { /* ignore */ } ta.remove();
    }
  }

  function bind() {
    var qTimer;
    $("#q").addEventListener("input", function (ev) {
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { state.q = ev.target.value; update(); }, 120);
    });
    $("#sort").addEventListener("change", function (ev) { state.sort = ev.target.value; update(); });
    $("#toggle-filters").addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (collapsed) expandPanel(true); else collapsePanel();
    });
    $(".controls").addEventListener("click", function (ev) {
      var chip = ev.target.closest(".chip");
      if (chip) { setFacet(chip.dataset.facet, chip.dataset.value, true); update(); return; }
      var pill = ev.target.closest(".pill");
      if (pill) {
        if (pill.dataset.remove === "sort") state.sort = "newest"; else setFacet(pill.dataset.remove, pill.dataset.value, true);
        update(); return;
      }
      // collapsed row: a click anywhere except the search box expands the panel
      if (collapsed && !ev.target.closest(".search, .mini-cta")) expandPanel(true);
    });
    $(".controls").addEventListener("keydown", function (ev) {
      if (collapsed && ev.target === $("#mini") && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); expandPanel(true); }
      else if (!collapsed && ev.key === "Escape" && ev.target !== $("#q")) { ev.preventDefault(); collapsePanel(); $("#toggle-filters").focus(); }
    });
    // start collapsed on every screen size so the first images are on the first screen
    collapsePanel();
    window.addEventListener("resize", function () { if (!collapsed) syncExpandHeight(); });
    $(".selects").addEventListener("change", function (ev) {
      var f = ev.target.dataset.facet; if (!f) return; state[f] = ev.target.value; update();
    });
    document.addEventListener("click", function (ev) {
      var clear = ev.target.closest('[data-action="clear"]');
      if (clear) { var s = state.sort; state = emptyState(); state.sort = s; $("#q").value = ""; update(); return; }
      var card = ev.target.closest(".card, .wheel-item");
      if (card && card.classList.contains("wheel-item") && wheel.justDragged) { ev.preventDefault(); return; }
      if (card && !ev.metaKey && !ev.ctrlKey && !ev.shiftKey && ev.button === 0) {
        ev.preventDefault();
        history.pushState({ fromGrid: true }, "", location.pathname + location.search + "#/" + encodeURIComponent(card.dataset.id));
        openDetail(card.dataset.id);
      }
    });
    $("#detail").addEventListener("click", function (ev) {
      var t = ev.target;
      var act = t.closest("[data-action]");
      if (act) {
        var a = act.dataset.action;
        if (a === "close") closeDetail(); else if (a === "prev") step(-1); else if (a === "next") step(1);
        return;
      }
      var mode = t.closest(".media-toggle button");
      if (mode) { mediaMode = mode.dataset.mode; renderMedia(byId[current]); if (mediaMode === "video") { var v = $("#media-frame video"); v && v.play().catch(function () {}); } return; }
      var tag = t.closest(".tag");
      if (tag) { filterFromDetail(function () { state.tag = tag.dataset.tag; }); return; }
      var facet = t.closest("button.facet");
      if (facet) { filterFromDetail(function () { setFacet(facet.dataset.facet, facet.dataset.value, false); }); return; }
      var tab = t.closest(".tabs button");
      if (tab) {
        $$(".tabs button", $("#detail")).forEach(function (b) { b.setAttribute("aria-selected", b === tab); });
        $$(".caption", $("#detail")).forEach(function (p) { p.hidden = p.dataset.panel !== tab.dataset.tab; });
        return;
      }
      var copy = t.closest(".copy");
      if (copy) {
        ev.preventDefault(); ev.stopPropagation();
        var e = byId[current], text = "";
        if (copy.dataset.copy === "prompt") text = e.prompt;
        else {
          var c = e.daily.captions[copy.dataset.platform];
          text = [c.title, c.caption || c.body, c.hashtags || c.tags].filter(Boolean).join("\n\n");
        }
        copyText(text, copy);
      }
    });
    document.addEventListener("keydown", function (ev) {
      var inField = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target.tagName || ""));
      if (!$("#detail").hidden) {
        if (ev.key === "Escape") { ev.preventDefault(); closeDetail(); }
        else if (ev.key === "ArrowLeft" && !inField) { ev.preventDefault(); step(-1); }
        else if (ev.key === "ArrowRight" && !inField) { ev.preventDefault(); step(1); }
        return;
      }
      if (ev.key === "/" && !inField) { ev.preventDefault(); $("#q").focus(); }
      else if (ev.key === "Escape" && ev.target === $("#q") && state.q) { state.q = ""; $("#q").value = ""; update(); }
    });
    var sx = 0, sy = 0, st = 0;
    var media = $(".detail-media");
    media.addEventListener("touchstart", function (ev) { var t = ev.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
    media.addEventListener("touchend", function (ev) {
      var t = ev.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st < 700 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    window.addEventListener("hashchange", route);
    window.addEventListener("popstate", function () { readUrl(); render(); route(); });
  }

  function init(json) {
    data = json;
    entries = data.entries;
    labels = data.labels || {};
    entries.forEach(function (e) { byId[e.id] = e; });
    if (data.generated) $("#generated").textContent = "Index built " + new Date(data.generated).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
    buildSearch();
    readUrl();
    bind();
    wheelInit();
    render();
    setAria();
    if (!collapsed) syncExpandHeight();
    route();
    // reload mid-page: the browser restores the scroll position before index.json has filled the grid, so the
    // page is still short and the position gets clipped; restore it ourselves once the cards are there
    var savedY = +sessionStorage.getItem("malfoid-scroll") || 0;
    if (savedY && !location.hash) window.scrollTo(0, savedY);
    window.addEventListener("pagehide", function () { sessionStorage.setItem("malfoid-scroll", String(window.scrollY)); });
  }

  fetch("index.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(function (err) {
      $("#grid").innerHTML = '<p class="empty">Could not load the gallery index (' + esc(err.message) + ").</p>";
    });
})();
