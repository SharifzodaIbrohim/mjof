(function () {
  "use strict";

  var TYPE_LABEL = {
    news: "Хабар",
    article: "Мақола",
    magazine: "Маҷалла",
    announcement: "Эълон",
    link: "Пайванд"
  };

  var grid = document.getElementById("nwGrid");
  var empty = document.getElementById("nwEmpty");
  var featured = document.getElementById("nwFeatured");
  var filters = document.getElementById("nwFilters");
  var modal = document.getElementById("nwModal");
  var allItems = [];
  var currentType = "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("tg-TJ", { year: "numeric", month: "long", day: "numeric" });
    } catch (e) {
      return "";
    }
  }

  function badgeClass(t) {
    return "nw-badge " + (TYPE_LABEL[t] ? t : "news");
  }

  function coverStyle(url) {
    if (!url) return "";
    var safe = String(url).replace(/"/g, "");
    return ' style="background-image:url(\'' + safe + '\')"';
  }

  function openModal(item) {
    if (!modal || !item) return;
    document.getElementById("nwModalKind").className = badgeClass(item.type);
    document.getElementById("nwModalKind").textContent = TYPE_LABEL[item.type] || "Хабар";
    document.getElementById("nwModalTitle").textContent = item.title || "";
    var meta = [];
    if (item.author) meta.push(item.author);
    var dt = fmtDate(item.createdAt);
    if (dt) meta.push(dt);
    document.getElementById("nwModalMeta").textContent = meta.join(" · ");
    document.getElementById("nwModalText").textContent = item.body || item.summary || "";
    var cover = document.getElementById("nwModalCover");
    if (item.coverImage) {
      cover.classList.remove("hidden");
      cover.style.backgroundImage = "url('" + String(item.coverImage).replace(/'/g, "%27") + "')";
    } else {
      cover.classList.add("hidden");
      cover.style.backgroundImage = "";
    }
    var linkEl = document.getElementById("nwModalLink");
    if (item.url) {
      linkEl.classList.remove("hidden");
      linkEl.innerHTML = '<a href="' + esc(item.url) + '" target="_blank" rel="noopener">Муфассал / пайванд →</a>';
    } else {
      linkEl.classList.add("hidden");
      linkEl.innerHTML = "";
    }
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target && e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  function renderFeatured(item) {
    if (!featured) return;
    if (!item) {
      featured.classList.add("hidden");
      featured.innerHTML = "";
      return;
    }
    featured.classList.remove("hidden");
    featured.innerHTML =
      '<div class="nw-featured-cover"' + coverStyle(item.coverImage) + '></div>' +
      '<div class="nw-featured-body">' +
      '<span class="' + badgeClass(item.type) + '">' + esc(TYPE_LABEL[item.type] || "Хабар") + '</span>' +
      "<h2>" + esc(item.title) + "</h2>" +
      "<p>" + esc(item.summary || item.body || "") + "</p>" +
      '<span class="nw-read">Хондан →</span>' +
      "</div>";
    featured.onclick = function () { openModal(item); };
  }

  function renderGrid(items) {
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = "";
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");
    grid.innerHTML = items.map(function (item, idx) {
      var dt = fmtDate(item.createdAt);
      return (
        '<article class="nw-card" data-idx="' + idx + '" tabindex="0" role="button">' +
        '<div class="nw-card-cover-wrap"><div class="nw-card-cover"' + coverStyle(item.coverImage) + "></div></div>" +
        '<div class="nw-card-body">' +
        '<span class="' + badgeClass(item.type) + '">' + esc(TYPE_LABEL[item.type] || "Хабар") + "</span>" +
        "<h3>" + esc(item.title) + "</h3>" +
        '<p class="nw-sum">' + esc(item.summary || item.body || "") + "</p>" +
        '<div class="nw-card-foot"><span>' + esc(item.author || "M.J.O.F") + "</span><span>" + esc(dt) + "</span></div>" +
        "</div></article>"
      );
    }).join("");

    grid.querySelectorAll(".nw-card").forEach(function (card) {
      var i = parseInt(card.getAttribute("data-idx"), 10);
      function go() { openModal(items[i]); }
      card.addEventListener("click", go);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
  }

  function applyFilter() {
    var list = allItems.slice();
    if (currentType) {
      list = list.filter(function (x) { return x.type === currentType; });
    }
    var feat = null;
    if (!currentType) {
      feat = list.find(function (x) { return x.featured; }) || list[0] || null;
    }
    renderFeatured(feat);
    var rest = feat ? list.filter(function (x) { return x.id !== feat.id; }) : list;
    renderGrid(rest);
  }

  if (filters) {
    filters.addEventListener("click", function (e) {
      var btn = e.target.closest(".nw-chip");
      if (!btn) return;
      filters.querySelectorAll(".nw-chip").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      currentType = btn.getAttribute("data-type") || "";
      applyFilter();
    });
  }

  fetch("/api/content", { credentials: "same-origin", cache: "no-store" })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      allItems = d.items || [];
      applyFilter();
    })
    .catch(function () {
      if (empty) empty.classList.remove("hidden");
    });
})();
