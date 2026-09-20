/* Даъватнома — force M.J.O.F blue theme (safety net after students-reg) */
(function(){
  function forceMjof(html){
    if (!html || typeof html !== "string") return html;
    if (html.indexOf("Даъватнома") < 0 && html.indexOf("Даватнома") < 0 && html.indexOf("GEOGRAFIA") < 0) return html;

    /* Brand & links */
    html = html.replace(/GEOGRAFIA\.TJ/g, "M.J.O.F");
    html = html.replace(/Geografia\.tj/g, "M.J.O.F");
    html = html.replace(/geografia\.tj/gi, "mjof.tj");
    html = html.replace(/geografia-19tf\.onrender\.com/gi, "mjof.onrender.com");
    html = html.replace(/instagram\.com\/geografia\.tj\/?/gi, "instagram.com/mjof.tj");
    html = html.replace(/Платформаи география/g, "Маҷмӯаи Олимпиадаҳои Фаннӣ");
    html = html.replace(/Иштирокчӣ · Geografia\.tj/g, "Иштирокчӣ · M.J.O.F");
    html = html.replace(/\| Geografia\.tj/g, "| M.J.O.F");

    /* Green palette → blue */
    html = html.replace(/#0a3328/gi, "#0f172a");
    html = html.replace(/#0f4d3a/gi, "#1e3a8a");
    html = html.replace(/#157a58/gi, "#1d4ed8");
    html = html.replace(/#e8f0eb/gi, "#e8ecf1");
    html = html.replace(/#e8f5ef/gi, "#e0e7ff");
    html = html.replace(/#f0f7f3/gi, "#eef2ff");
    html = html.replace(/#f2f8f5/gi, "#f1f5f9");
    html = html.replace(/#fafdfb/gi, "#f8fafc");
    html = html.replace(/#cfe0d6/gi, "#cfd8e3");
    html = html.replace(/#b8d9c8/gi, "#c7d2fe");
    html = html.replace(/#b8dcc9/gi, "#c7d2fe");
    html = html.replace(/#d4f0e4/gi, "#e0e7ff");
    html = html.replace(/#5a6b62/gi, "#5b6b7c");
    html = html.replace(/#132019/gi, "#0f172a");
    html = html.replace(/color=0b3d2e/gi, "color=1e40af");
    html = html.replace(/rgba\(10,\s*51,\s*40/gi, "rgba(15,23,42");

    if (html.indexOf("--g1:") >= 0 || html.indexOf("var(--g1)") >= 0) {
      html = html.replace(/--g1:\s*#[0-9a-fA-F]{3,8}/g, "--g1:#0f172a");
      html = html.replace(/--g2:\s*#[0-9a-fA-F]{3,8}/g, "--g2:#1d4ed8");
      html = html.replace(/--g3:\s*#[0-9a-fA-F]{3,8}/g, "--g3:#e0e7ff");
      html = html.replace(/--ink:\s*#[0-9a-fA-F]{3,8}/g, "--ink:#0f172a");
      html = html.replace(/--muted:\s*#[0-9a-fA-F]{3,8}/g, "--muted:#5b6b7c");
      html = html.replace(/--line:\s*#[0-9a-fA-F]{3,8}/g, "--line:#cfd8e3");
    }

    html = html.replace(/ДАВАТНОМА · ИҶОЗАТНОМА/g, "ДАЪВАТНОМА · ИҶОЗАТНОМА");
    html = html.replace(/<h1>Даватнома<\/h1>/g, "<h1>Даъватнома</h1>");
    return html;
  }

  var OrigBlob = window.Blob;
  window.Blob = function(parts, opts){
    try {
      if (parts && parts.length === 1 && typeof parts[0] === "string") {
        var s = parts[0];
        if (s.indexOf("Даъватнома") >= 0 || s.indexOf("Даватнома") >= 0 || s.indexOf("GEOGRAFIA") >= 0 || s.indexOf("M.J.O.F") >= 0) {
          parts = [forceMjof(s)];
        }
      }
    } catch (_) {}
    return new OrigBlob(parts, opts);
  };
  window.Blob.prototype = OrigBlob.prototype;

  console.log("[davotnoma-print] M.J.O.F force-blue safety net installed");
})();
