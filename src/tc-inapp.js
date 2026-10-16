/* tc-inapp.js - help for people who open a Travel Connect link INSIDE Instagram / Facebook / Messenger / Snapchat / Line.
   Those in-app browsers cannot install the app (no "Install app" / "Add to Home Screen"), so a small yellow banner
   at the top of the page tells them how to open the link in the real browser:
     Android : "Open in Chrome" button (Android intent link, falls back to the normal address if Chrome is missing)
     iPhone  : steps (... -> Open in external browser, then Share -> Add to Home Screen) + "Copy link" button
   It is never shown in normal Chrome / Safari or in the installed app (display-mode: standalone).
   The X button hides it for this browsing session only (sessionStorage). Costs nothing: no server calls at all. */
(function(){
 if(window.__tcInApp) return; window.__tcInApp=true;
 var ua=navigator.userAgent||"";
 if(!/Instagram|FBAN|FBAV|FB_IAB|FBIOS|Messenger|Snapchat|Line\//i.test(ua)) return;
 try{ if((window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true) return; }catch(e){}
 try{ if(sessionStorage.getItem("tcInAppClosed")==="1") return; }catch(e){}

 var isAndroid=/Android/i.test(ua);
 var isIOS=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&navigator.maxTouchPoints>1);
 var path=location.pathname+location.search;
 var webUrl=location.protocol+"//"+location.host+path;
 var intentUrl="intent://"+location.host+path+"#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url="+encodeURIComponent(webUrl)+";end";

 function el(tag,css,html){ var e=document.createElement(tag); if(css) e.style.cssText=css; if(html!=null) e.innerHTML=html; return e; }
 var BTN="border:0;border-radius:20px;padding:9px 16px;font-weight:800;font-size:14px;background:#082b49;color:#fff;margin-top:8px;box-shadow:none";

 function copyLink(btn){
  function done(){ btn.textContent="Copied ✓ · കോപ്പി ചെയ്തു"; }
  function legacy(){
   try{
    var t=document.createElement("textarea"); t.value=webUrl; t.style.cssText="position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(t); t.focus(); t.select(); var ok=document.execCommand("copy"); document.body.removeChild(t);
    if(ok){ done(); return; }
   }catch(e){}
   window.prompt("Copy this link / ഈ ലിങ്ക് കോപ്പി ചെയ്യുക:",webUrl);
  }
  try{
   if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(webUrl).then(done,legacy); return; }
  }catch(e){}
  legacy();
 }

 function build(){
  if(document.getElementById("tcInAppBar")) return;
  var bar=el("div","background:#fff3c4;border-bottom:3px solid #ffc928;color:#3d2f00;padding:10px 40px 12px 14px;font:600 13.5px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;position:relative;z-index:60");
  bar.id="tcInAppBar";
  var x=el("button","position:absolute;top:6px;right:8px;border:0;background:transparent;box-shadow:none;font-size:20px;line-height:1;padding:4px 8px;color:#3d2f00","✕");
  x.setAttribute("aria-label","Close");
  x.onclick=function(){ try{ sessionStorage.setItem("tcInAppClosed","1"); }catch(e){} if(bar.parentNode) bar.parentNode.removeChild(bar); };
  bar.appendChild(x);

  if(isAndroid){
   bar.appendChild(el("div","","<b>Open in Chrome to install the app.</b><br>ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യാൻ Chrome-ൽ തുറക്കൂ."));
   var b=el("button",BTN,"Open in Chrome · Chrome-ൽ തുറക്കൂ");
   b.onclick=function(){ location.href=intentUrl; };
   bar.appendChild(b);
   bar.appendChild(el("div","font-weight:500;font-size:12.5px;margin-top:6px;opacity:.9","If the button does not work: tap ⋮ (top right) → “Open in Chrome”.<br>ബട്ടൺ പ്രവർത്തിച്ചില്ലെങ്കിൽ: ⋮ (മുകളിൽ വലത്ത്) → “Open in Chrome” അമർത്തുക."));
  }else{
   var how=isIOS
    ?"Tap <b>•••</b> (top right) → <b>Open in external browser</b> (Safari), then <b>Share</b> → <b>Add to Home Screen</b>.<br>മുകളിൽ വലത്ത് <b>•••</b> → <b>Open in external browser</b> (Safari) അമർത്തുക, ശേഷം <b>Share</b> → <b>Add to Home Screen</b>."
    :"Open this link in your normal browser (Chrome / Safari) to install the app.<br>ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യാൻ ഈ ലിങ്ക് Chrome / Safari-യിൽ തുറക്കൂ.";
   bar.appendChild(el("div","","<b>This browser cannot install the app. · ഈ ബ്രൗസറിൽ ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്യാൻ പറ്റില്ല.</b><br>"+how));
   var c=el("button",BTN,"Copy link · ലിങ്ക് കോപ്പി ചെയ്യൂ");
   c.onclick=function(){ copyLink(c); };
   bar.appendChild(c);
  }
  document.body.insertBefore(bar,document.body.firstChild);
 }
 if(document.body) build(); else document.addEventListener("DOMContentLoaded",build);
})();
