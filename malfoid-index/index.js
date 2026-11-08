// Malfoid Index: lists the works in works.json (built from malfoid-index/works.yaml).
// Every value is written with textContent, and links are only made for http(s) URLs,
// because the entries come from people outside this project.
(function () {
  "use strict";

  var KINDS = { fanfic: "Fanfic", art: "Fan art", video: "Video", music: "Music", other: "Other" };
  var state = { kind: "all", q: "" };
  var data = { works: [], contact: "" };

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

  function haystack(w) {
    return [w.title, w.creator, w.summary, w.language, (w.tags || []).join(" "), KINDS[w.kind] || w.kind]
      .join(" ").toLowerCase();
  }

  function matches(w) {
    if (state.kind !== "all" && w.kind !== state.kind) return false;
    if (!state.q) return true;
    return state.q.split(/\s+/).every(function (term) { return haystack(w).indexOf(term) !== -1; });
  }

  function renderChips() {
    var box = document.getElementById("kinds");
    box.textContent = "";
    var kinds = [["all", "All"]];
    Object.keys(KINDS).forEach(function (k) { kinds.push([k, KINDS[k]]); });
    kinds.forEach(function (pair) {
      var count = pair[0] === "all" ? data.works.length
        : data.works.filter(function (w) { return w.kind === pair[0]; }).length;
      if (pair[0] !== "all" && count === 0) return;
      var b = el("button", "chip", pair[1]);
      b.type = "button";
      b.setAttribute("aria-pressed", String(state.kind === pair[0]));
      b.appendChild(el("span", "n", String(count)));
      b.addEventListener("click", function () { state.kind = pair[0]; renderChips(); renderList(); });
      box.appendChild(b);
    });
  }

  function card(w) {
    var article = el("article", "work");
    if (w.thumb) {
      var img = el("img", "work-thumb");
      img.src = w.thumb;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = function () { img.remove(); };
      article.appendChild(img);
    }
    var top = el("div", "work-top");
    top.appendChild(el("span", "kind", KINDS[w.kind] || w.kind || "Other"));
    if (w.added) top.appendChild(el("span", "work-date", w.added));
    article.appendChild(top);

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
    article.appendChild(h);

    var meta = [];
    if (w.creator) meta.push("by " + w.creator);
    if (w.language) meta.push(w.language);
    if (meta.length) article.appendChild(el("p", "work-meta", meta.join(" · ")));
    if (w.summary) article.appendChild(el("p", "work-summary", w.summary));
    if (w.also && w.also.length) {
      var also = el("p", "work-also", "Also on: ");
      w.also.forEach(function (u, i) {
        var href = safeUrl(u);
        if (!href) return;
        if (i) also.appendChild(document.createTextNode(" · "));
        var a = el("a", null, "copy " + (i + 1));
        a.href = href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        also.appendChild(a);
      });
      article.appendChild(also);
    }
    if (w.tags && w.tags.length) {
      var tags = el("div", "work-tags");
      w.tags.forEach(function (t) { tags.appendChild(el("span", null, t)); });
      article.appendChild(tags);
    }
    return article;
  }

  function renderList() {
    var list = document.getElementById("list");
    var count = document.getElementById("count");
    list.textContent = "";
    var shown = data.works.filter(matches);
    count.textContent = shown.length === data.works.length
      ? data.works.length + (data.works.length === 1 ? " work" : " works")
      : shown.length + " of " + data.works.length + " works";
    if (!shown.length) {
      list.appendChild(el("div", "index-empty", data.works.length
        ? "Nothing matches that search yet."
        : "No works listed yet. Be the first to send one in."));
      return;
    }
    shown.forEach(function (w) { list.appendChild(card(w)); });
  }

  function setupSubmit() {
    var to = data.contact || "rhedak@proton.me";
    var subject = "Malfoid Index submission";
    var body = [
      "Title:",
      "Kind (fanfic / fan art / video / music / other):",
      "Your name or handle:",
      "Link to the work (must stay online):",
      "Language:",
      "Short summary (1-2 sentences):",
      "Tags (optional):",
      "",
      "I made this myself and agree to it being listed in the Malfoid Index.",
    ].join("\n");
    var href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    document.getElementById("submit").href = href;
    var contact = document.getElementById("contact");
    contact.href = "mailto:" + to;
    contact.textContent = to;
  }

  function init(json) {
    data = json;
    setupSubmit();
    renderChips();
    renderList();
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
