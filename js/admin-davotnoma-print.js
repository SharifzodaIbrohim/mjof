/* Даъватнома print patch — M.J.O.F blue theme, load AFTER admin-students-reg */
(function(){
  var CSS = "@page{size:A4;margin:8mm}"+ 
    "@media print{html,body{height:auto!important;overflow:hidden!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}"+ 
    ".toolbar,.hint{display:none!important}.page{margin:0;padding:0;max-width:none}"+ 
    ".pass{box-shadow:none;border-radius:0;page-break-inside:avoid;break-inside:avoid}"+ 
    ".foot,.body,.head,.qr-row,.top{page-break-inside:avoid;break-inside:avoid}"+ 
    ".photo-wrap{width:126px!important;height:152px!important}"+ 
    ".qr img{width:96px!important;height:96px!important}"+ 
    "table{font-size:12px!important}th,td{padding:6px 10px!important}"+ 
    ".head{padding:12px 16px 10px!important}.head h1{font-size:1.5rem!important;margin:8px 0 4px!important}"+ 
    ".head-logo{width:80px!important;height:80px!important}.head-logo .mark{width:60px!important;height:60px!important;font-size:1.1rem!important}"+ 
    ".body{padding:12px 14px 8px!important}.foot{padding:10px 14px 12px!important}"+ 
    ".idbox{font-size:1rem!important;padding:6px 12px!important}}";

  var HINT = '<p class="hint" style="text-align:center;font-size:11px;color:#5b6b7c;margin:4px 0 8px">'+ 
    'Чоп: дар Print → <b>Headers and footers</b>-ро ХОМӮШ кунед (то file:// / суроға наояд)</p>';

  function fixTexts(html){
    html = html.replace(/GEOGRAFIA\.TJ/g, "M.J.O.F");
    html = html.replace(/Geografia\.tj/g, "M.J.O.F");
    html = html.replace(/geografia\.tj/gi, "mjof.tj");
    html = html.replace(/geografia-19tf\.onrender\.com/gi, "mjof.onrender.com");
    html = html.replace(/instagram\.com\/geografia\.tj/gi, "instagram.com/mjof.tj");
    html = html.replace(/Платформаи география/g, "Маҷмӯаи Олимпиадаҳои Фаннӣ");
    html = html.replace(/ДАВАТНОМА · ИҶОЗАТНОМА/g, "ДАЪВАТНОМА · ИҶОЗАТНОМА");
    html = html.replace(/<h1>Даватнома<\/h1>/g, "<h1>Даъватнома</h1>");
    html = html.replace(/<title>Даватнома/g, "<title>Даъватнома");
    html = html.replace(/ID барои воридшавӣ/g, "ID-и иштирокчӣ");
    html = html.replace(/ID \(барои воридшавӣ\)/g, "ID-и иштирокчӣ");
    html = html.replace(/Санаи оғоз:/g, "Санаи имтиҳонсупорӣ:");
    html = html.replace(/>Муассиса \/ Мактаб</g, ">Муассисаи таълимӣ<");
    html = html.replace(/>Синф</g, ">Синфӣ<");
    html = html.replace(/>Унвони олимпиада</g, ">Намуди олимпиада<");
    return html;
  }

  function patchHtml(html){
    if(!html || (html.indexOf("Даъватнома")<0 && html.indexOf("Даватнома")<0 && html.indexOf("M.J.O.F")<0)) return html;
    html = fixTexts(html);
    if(html.indexOf("@page{size:A4;margin:8mm}")<0 && html.indexOf("@media print")>=0){
      html = html.replace("</style>", CSS + "</style>");
    }
    if(html.indexOf("Headers and footers")<0){
      html = html.replace("</div><article", "</div>"+HINT+"<article");
    }
    return html;
  }

  var OrigBlob = window.Blob;
  window.Blob = function(parts, opts){
    try {
      if(parts && parts.length===1 && typeof parts[0]==="string" &&
         (parts[0].indexOf("Даъватнома")>=0 || parts[0].indexOf("Даватнома")>=0 || parts[0].indexOf("M.J.O.F")>=0)){
        parts = [patchHtml(parts[0])];
      }
    } catch(_){}
    return new OrigBlob(parts, opts);
  };
  window.Blob.prototype = OrigBlob.prototype;

  console.log("[davotnoma-print] M.J.O.F blue theme + print fixes installed");
})();
