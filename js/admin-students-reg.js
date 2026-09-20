(function(){
  var V = "mjof-dav-5";
  var LOGO_L = "/js/_logo_left.txt?v=" + V;
  var LOGO_R = "/js/_logo_right.txt?v=" + V;
  var F = [
    "/js/_asr_s0.txt?v=" + V,
    "/js/_asr_s1.txt?v=" + V,
    "/js/_asr_s2.txt?v=" + V,
    "/js/_asr_s3.txt?v=" + V,
    "/js/_asr_s4.txt?v=" + V,
    "/js/_asr_s5.txt?v=" + V,
    "/js/_asr_s6.txt?v=" + V,
    "/js/_asr_s7.txt?v=" + V
  ];
  function loadText(url){
    return fetch(url, { credentials: "same-origin", cache: "no-store" }).then(function(r){
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.text();
    });
  }
  Promise.all([loadText(LOGO_L), loadText(LOGO_R)]).then(function(logos){
    window.__MJOF_LOGO_L = "data:image/jpeg;base64," + logos[0].replace(/\s/g, "");
    window.__MJOF_LOGO_R = "data:image/jpeg;base64," + logos[1].replace(/\s/g, "");
    return Promise.all(F.map(loadText));
  }).then(function(p){
    (0, eval)(p.join(""));
    console.log("[students-reg] M.J.O.F davotnoma + logos loaded v=" + V);
  }).catch(function(e){
    console.error("[students-reg] load failed", e);
  });
})();
