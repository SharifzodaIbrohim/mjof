(function () {
  "use strict";

  var TYPE_LABEL = {
    news: "Хабар",
    article: "Мақола",
    magazine: "Маҷалла",
    announcement: "Эълон",
    link: "Пайванд",
    book: "Мавод"
  };

  var coverDataUrl = "";

  function tokenHeaders() {
    // Must match admin.js TOKEN_KEY
    var t = localStorage.getItem("geo_admin_token")
      || localStorage.getItem("adminToken")
      || localStorage.getItem("mjof_admin_token")
      || "";
    var h = { "Content-Type": "application/json" };
    if (t) h["X-Admin-Token"] = t;
    return h;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function $(id) { return document.getElementById(id); }

  function setPreview(src) {
    var wrap = $("contentImagePreviewWrap");
    var img = $("contentImagePreviewImg");
    if (!wrap || !img) return;
    if (src) {
      img.src = src;
      wrap.style.display = "";
    } else {
      img.src = "";
      wrap.style.display = "none";
    }
  }

  function resetForm() {
    var form = $("contentForm");
    if (form) form.reset();
    coverDataUrl = "";
    if ($("contentEditId")) $("contentEditId").value = "";
    if ($("contentPublished")) $("contentPublished").checked = true;
    if ($("contentFeatured")) $("contentFeatured").checked = false;
    if ($("contentAuthor")) $("contentAuthor").value = "M.J.O.F";
    if ($("contentSubmitBtn")) $("contentSubmitBtn").textContent = "Илова кардан";
    if ($("contentResetBtn")) $("contentResetBtn").style.display = "none";
    if ($("contentImageFile")) $("contentImageFile").value = "";
    setPreview("");
  }

  function fillForm(item) {
    if (!item) return;
    $("contentEditId").value = item.id || "";
    $("contentTitle").value = item.title || "";
    $("contentType").value = item.type || "news";
    $("contentSummary").value = item.summary || "";
    $("contentBody").value = item.body || "";
    $("contentAuthor").value = item.author || "M.J.O.F";
    $("contentUrl").value = item.url || "";
    $("contentImageUrl").value = (item.coverImage && !item.coverImage.startsWith("data:")) ? item.coverImage : "";
    $("contentFeatured").checked = !!item.featured;
    $("contentPublished").checked = item.published !== false;
    coverDataUrl = (item.coverImage && item.coverImage.startsWith("data:")) ? item.coverImage : "";
    setPreview(item.coverImage || "");
    $("contentSubmitBtn").textContent = "Захира кардан";
    $("contentResetBtn").style.display = "";
  }

  function loadList() {
    var tbody = $("contentBodyTable");
    if (!tbody) return;
    fetch("/api/admin/content", { headers: tokenHeaders(), credentials: "same-origin", cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error && !d.items) {
          tbody.innerHTML = '<tr><td colspan="5" style="color:#b91c1c;text-align:center;padding:1.5rem">' + esc(d.error) + ' — дубора ворид шавед</td></tr>';
          return;
        }
        var items = d.items || [];
        if (!items.length) {
          tbody.innerHTML = '<tr><td colspan="5" style="color:#8494a7;text-align:center;padding:1.5rem">Ҳанӯз контент нест</td></tr>';
          return;
        }
        tbody.innerHTML = items.map(function (it) {
          var thumb = it.coverImage
            ? '<img src="' + esc(it.coverImage) + '" alt="" style="width:48px;height:36px;object-fit:cover;border-radius:6px" />'
            : '<span style="display:inline-block;width:48px;height:36px;background:#e2e8f0;border-radius:6px"></span>';
          var status = [];
          if (it.featured) status.push('<span style="color:#1d4ed8;font-weight:700">Вижа</span>');
          status.push(it.published !== false ? '<span style="color:#059669">Нашр</span>' : '<span style="color:#d97706">Сиёҳнавис</span>');
          return (
            "<tr data-id=\"" + esc(it.id) + "\">" +
            "<td>" + thumb + "</td>" +
            "<td><strong>" + esc(it.title) + "</strong></td>" +
            "<td>" + esc(TYPE_LABEL[it.type] || it.type) + "</td>" +
            "<td>" + status.join(" · ") + "</td>" +
            '<td style="white-space:nowrap">' +
            '<button type="button" class="btn sm content-edit" data-id="' + esc(it.id) + '">Таҳрир</button> ' +
            '<button type="button" class="btn sm danger content-del" data-id="' + esc(it.id) + '">Нест</button>' +
            "</td></tr>"
          );
        }).join("");

        tbody.querySelectorAll(".content-edit").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-id");
            var item = items.find(function (x) { return x.id === id; });
            if (item) {
              fillForm(item);
              $("contentForm").scrollIntoView({ behavior: "smooth", block: "start" });
            }
          });
        });
        tbody.querySelectorAll(".content-del").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = btn.getAttribute("data-id");
            if (!id || !confirm("Ин хабарро нест мекунед?")) return;
            fetch("/api/admin/content/" + encodeURIComponent(id), {
              method: "DELETE",
              headers: tokenHeaders(),
              credentials: "same-origin"
            }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
              .then(function (res) {
                if (!res.ok) alert(res.j.error || "Хато");
                else loadList();
              })
              .catch(function () { alert("Хатои шабака"); });
          });
        });
      })
      .catch(function () {
        tbody.innerHTML = '<tr><td colspan="5">Хатои боркунӣ</td></tr>';
      });
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve("");
      if (file.size > 900000) {
        reject(new Error("Акс хеле калон аст (макс. ~900 КБ)."));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("Хониши файл нашуд")); };
      reader.readAsDataURL(file);
    });
  }

  function bindForm() {
    var form = $("contentForm");
    if (!form) return;

    var fileInput = $("contentImageFile");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var f = fileInput.files && fileInput.files[0];
        if (!f) return;
        readFileAsDataUrl(f).then(function (data) {
          coverDataUrl = data;
          setPreview(data);
          if ($("contentImageUrl")) $("contentImageUrl").value = "";
        }).catch(function (e) {
          alert(e.message || "Хато");
          fileInput.value = "";
        });
      });
    }

    var urlInput = $("contentImageUrl");
    if (urlInput) {
      urlInput.addEventListener("change", function () {
        var u = urlInput.value.trim();
        if (u) {
          coverDataUrl = "";
          setPreview(u);
        }
      });
    }

    if ($("contentResetBtn")) {
      $("contentResetBtn").addEventListener("click", resetForm);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var title = ($("contentTitle").value || "").trim();
      if (title.length < 2) {
        alert("Унвон лозим аст");
        return;
      }
      var cover = coverDataUrl || ($("contentImageUrl").value || "").trim();
      var payload = {
        title: title,
        type: $("contentType").value || "news",
        summary: ($("contentSummary").value || "").trim(),
        body: ($("contentBody").value || "").trim(),
        coverImage: cover,
        author: ($("contentAuthor").value || "M.J.O.F").trim(),
        url: ($("contentUrl").value || "").trim(),
        featured: !!($("contentFeatured") && $("contentFeatured").checked),
        published: !($("contentPublished") && !$("contentPublished").checked),
        lang: "tg"
      };
      var editId = ($("contentEditId").value || "").trim();
      var method = editId ? "PUT" : "POST";
      var url = editId ? "/api/admin/content/" + encodeURIComponent(editId) : "/api/admin/content";
      var btn = $("contentSubmitBtn");
      if (btn) { btn.disabled = true; btn.textContent = "Сабт..."; }
      fetch(url, {
        method: method,
        headers: tokenHeaders(),
        credentials: "same-origin",
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) {
            alert(res.j.error || "Хато ҳангоми сабт");
            return;
          }
          resetForm();
          loadList();
        })
        .catch(function () { alert("Хатои шабака"); })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = $("contentEditId").value ? "Захира кардан" : "Илова кардан";
          }
        });
    });
  }

  function init() {
    bindForm();
    document.querySelectorAll('.tab[data-tab="content"]').forEach(function (btn) {
      btn.addEventListener("click", function () { loadList(); });
    });
    var panel = $("tab-content");
    if (panel && !panel.classList.contains("hidden")) loadList();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
