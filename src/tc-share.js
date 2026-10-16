/* ============================================================================
   tc-share.js  -  three extra entries in the app's Menu (the hamburger button):
     1) "Share this app"  : opens a small box with Share (the phone's own share sheet: WhatsApp, Instagram,
                            Facebook, Telegram, SMS...), WhatsApp, and Copy link buttons, so users can send
                            Travel Connect to friends and customers.
     2) "Privacy Policy"  : shows /privacy.html inside the app (Back button closes it, the app stays open)
     3) "Terms of Use"    : shows /terms.html the same way
   Added without touching core.js: a MutationObserver watches the Menu box and inserts the entries just above
   "Reload App". Loaded by the loader at the end of tc-regdocs.js. No server calls, no cost.
   ========================================================================== */
(function(){
"use strict";
if(window.__tcShare) return; window.__tcShare=true;

var SITE="https://travelconnect.dev";
var ml=function(){ try{ return typeof tcLang==="function"&&tcLang()==="ml"; }catch(e){ return false; } };
var bl=function(en,m){ return ml()?m:en; };
var say=function(t){ try{ toast(t); }catch(e){ alert(t); } };
var esc=function(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); };

function message(){
 return "Travel Connect - നാട്ടിലെ സേവനങ്ങൾ ഒരൊറ്റ ആപ്പിൽ\n"+
  "Taxi, auto, pickup, shops, hotels, skilled workers & blood donors near you.\n\n"+
  "Play Store-ൽ ഇല്ല. Android: Chrome-ലും iPhone: Safari-യിലും ഈ ലിങ്ക് തുറന്ന് Install / Add to Home Screen ചെയ്യൂ:\n"+SITE;
}

/* ------------------------------------------------------------ share box */
window.tcShareApp=function(){
 if(typeof modal!=="function") return;
 var canShare=typeof navigator.share==="function";
 modal(
  '<div style="font-weight:800;color:#082b49;font-size:16px">&#128228; '+bl("Share Travel Connect","Travel Connect ഷെയർ ചെയ്യുക")+'</div>'+
  '<p class="muted" style="font-size:12.5px;margin:4px 0 8px">'+bl("Send the app link to friends, customers and other business owners.","ആപ്പ് ലിങ്ക് സുഹൃത്തുക്കൾക്കും കസ്റ്റമർമാർക്കും മറ്റ് ബിസിനസ്സ് ഉടമകൾക്കും അയച്ചുകൊടുക്കാം.")+'</p>'+
  '<div style="background:#f5f8fa;border:1px solid #dce4ea;border-radius:10px;padding:10px;font-size:12.5px;white-space:pre-wrap;line-height:1.5">'+esc(message())+'</div>'+
  '<div class="actions" style="margin-top:10px">'+
   (canShare?'<button class="primary" onclick="tcShareNative()">&#128228; '+bl("Share","ഷെയർ")+'</button>':"")+
   '<button onclick="tcShareWhatsApp()" style="background:#1faa59;color:#fff">WhatsApp</button>'+
   '<button onclick="tcShareCopy()">&#128203; '+bl("Copy link","ലിങ്ക് കോപ്പി")+'</button>'+
  '</div>'+
  '<div class="actions"><button onclick="closeModal()">'+bl("Close","അടയ്ക്കുക")+'</button></div>');
};
window.tcShareNative=async function(){
 try{ await navigator.share({title:"Travel Connect",text:message()}); }
 catch(e){ /* cancelled by the user, or not allowed: nothing to do */ }
};
window.tcShareWhatsApp=function(){
 window.open("https://wa.me/?text="+encodeURIComponent(message()),"_blank","noopener");
};
window.tcShareCopy=function(){
 function ok(){ say(bl("Link copied","ലിങ്ക് കോപ്പി ചെയ്തു")); }
 function legacy(){
  try{
   var t=document.createElement("textarea"); t.value=SITE; t.style.cssText="position:fixed;top:0;left:0;opacity:0";
   document.body.appendChild(t); t.focus(); t.select(); var done=document.execCommand("copy"); document.body.removeChild(t);
   if(done){ ok(); return; }
  }catch(e){}
  window.prompt(bl("Copy this link","ഈ ലിങ്ക് കോപ്പി ചെയ്യുക"),SITE);
 }
 try{
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(SITE).then(ok,legacy); return; }
 }catch(e){}
 legacy();
};

/* ------------------------------------------------- Privacy / Terms viewer */
window.tcOpenLegal=function(kind){
 if(typeof modal!=="function") return;
 if(navigator.onLine===false){ say(bl("Needs internet","ഇന്റർനെറ്റ് വേണം")); return; }
 var terms=(kind==="terms");
 var file=terms?"/terms.html":"/privacy.html";
 var title=terms?bl("Terms of Use","ഉപയോഗ നിബന്ധനകൾ"):bl("Privacy Policy","സ്വകാര്യതാ നയം");
 modal(
  '<div style="font-weight:800;color:#082b49;font-size:16px;margin-bottom:8px">'+esc(title)+'</div>'+
  '<iframe src="'+file+(ml()?"#ml":"#en")+'" title="'+esc(title)+'" style="width:100%;height:62vh;border:1px solid #dce4ea;border-radius:10px;background:#fff"></iframe>'+
  '<div class="actions"><button class="primary" onclick="closeModal()">'+bl("Close","അടയ്ക്കുക")+'</button></div>');
};

/* ------------------------------------------------- put the entries in the Menu */
var ICON_SHARE='<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>';
var ICON_SHIELD='<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>';
var ICON_DOC='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>';

function addToMenu(){
 var body=document.getElementById("modalBody"); if(!body) return;
 if(body.querySelector("#tcMenuExtra")) return;
 var reload=body.querySelector('[onclick*="tcApplyUpdate"]'); if(!reload||typeof tcMenuItem!=="function") return;
 var html='<div id="tcMenuExtra">'+
  tcMenuItem(ICON_SHARE,bl("Share this app","ആപ്പ് ഷെയർ ചെയ്യുക"),"closeModal();tcShareApp()")+
  tcMenuItem(ICON_SHIELD,bl("Privacy Policy","സ്വകാര്യതാ നയം"),"closeModal();tcOpenLegal('privacy')")+
  tcMenuItem(ICON_DOC,bl("Terms of Use","ഉപയോഗ നിബന്ധനകൾ"),"closeModal();tcOpenLegal('terms')")+
  '</div>';
 reload.insertAdjacentHTML("beforebegin",html);
}
function start(){
 var body=document.getElementById("modalBody"); if(!body||!window.MutationObserver) return;
 new MutationObserver(function(){ try{ addToMenu(); }catch(e){} }).observe(body,{childList:true});
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
