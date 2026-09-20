(function(){
  var V = "mjof-dav-3";
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
  Promise.all(F.map(function(f){
    return fetch(f, { credentials: "same-origin", cache: "no-store" }).then(function(r){
      if (!r.ok) throw new Error(f + " " + r.status);
      return r.text();
    });
  })).then(function(p){
    (0, eval)(p.join(""));
    console.log("[students-reg] M.J.O.F davotnoma loaded v=" + V);
  }).catch(function(e){
    console.error("[students-reg] load failed", e);
  });
})();
