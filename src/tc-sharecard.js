/* "Share Travel Connect" card on every home page (tc-sharecard.js, loaded by tc-regdocs.js).
   Reason (owner, 2026-10-21): the Share button was only inside the Menu, so a new skilled worker never saw it.
   Now a clear green card sits on the home page of EVERY kind of user:
     - customer home: right under "Find Nearby Vehicle / Local Directory / Available vehicles now"
     - partner dashboard (skilled worker, shop, auto, pickup ...): right under the Messages card
     - taxi / travel owner dashboard: just above the closed "More" box
   Buttons: Share (the phone's share sheet) and WhatsApp - both use tc-share.js. The Menu entry stays.
   Nothing is stored and no server is used. */
(function(){
 if(window.__tcShareCard) return;
 window.__tcShareCard=1;
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 function $(id){ return document.getElementById(id); }
 function html(){
  var native=typeof navigator.share==="function";
  return '<div style="display:flex;align-items:center;gap:12px">'+
   '<div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">&#128228;</div>'+
   '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:16px">'+E(B("Share Travel Connect","Travel Connect ഷെയർ ചെയ്യൂ"))+'</div>'+
   '<div style="font-size:12.5px;opacity:.96;line-height:1.35">'+E(B("Send the app to your friends, customers and other workers - it is free.","ആപ്പ് നിങ്ങളുടെ സുഹൃത്തുക്കൾക്കും കസ്റ്റമർമാർക്കും മറ്റ് ജോലിക്കാർക്കും അയച്ചുകൊടുക്കൂ - സൗജന്യമാണ്."))+'</div></div></div>'+
   '<div style="display:flex;gap:8px;margin-top:10px">'+
   (native?'<button onclick="tcShareNative()" style="flex:1;padding:10px;font-size:14px;font-weight:800;background:#fff;color:#0b6b3a;border:0;border-radius:10px">&#128228; '+E(B("Share","ഷെയർ"))+'</button>':'<button onclick="tcShareApp()" style="flex:1;padding:10px;font-size:14px;font-weight:800;background:#fff;color:#0b6b3a;border:0;border-radius:10px">&#128228; '+E(B("Share","ഷെയർ"))+'</button>')+
   '<button onclick="tcShareWhatsApp()" style="flex:1;padding:10px;font-size:14px;font-weight:800;background:#25d366;color:#fff;border:0;border-radius:10px">WhatsApp</button>'+
   '<button onclick="tcShareCopy()" style="padding:10px 12px;font-size:14px;background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.6);border-radius:10px">&#128203;</button></div>';
 }
 function make(){
  var c=$("tcShareCard");
  if(!c){ c=document.createElement("div"); c.id="tcShareCard"; c.style.cssText="padding:12px 14px;margin:2px 0 14px;border-radius:16px;color:#fff;background:linear-gradient(135deg,#0f9d58,#0b6b3a);box-shadow:0 2px 8px rgba(11,107,58,.25)"; c.innerHTML=html(); }
  return c;
 }
 function place(){
  var app=$("app"); if(!app||typeof window.tcShareNative!=="function") return;
  var u=null; try{ u=getCurrentUser(); }catch(e){}
  if(!u) return;
  var anchor=null, mode="";
  var ab=app.querySelector("button[onclick*=\"view('activeboard')\"]");
  var more=$("tcMore"), box=$("partnerBox");
  if(more&&more.parentNode&&app.contains(more)){ anchor=more; mode="before"; }                        /* taxi / travel owner dashboard */
  else if(box&&box.querySelector("#tcMsgCard,button[onclick*=\"tcOpenEditPartnerDetails\"]")){          /* other businesses' dashboard */
   var m=box.querySelector("#tcMsgCard"); if(m){ anchor=m; mode="after"; } else { anchor=box.firstElementChild; mode="before"; }
  }else if(ab&&u.role==="customer"){ anchor=ab.closest(".actions")||ab.parentNode; mode="after"; }       /* customer home */
  var c=$("tcShareCard");
  if(!anchor){ if(c&&c.parentNode&&!app.querySelector("#tcMore,#partnerBox,button[onclick*=\"view('activeboard')\"]")) c.remove(); return; }
  if(!c) c=make();
  if(mode==="before"){ if(c.nextElementSibling!==anchor||c.parentNode!==anchor.parentNode) anchor.parentNode.insertBefore(c,anchor); }
  else if(c.previousElementSibling!==anchor||c.parentNode!==anchor.parentNode) anchor.parentNode.insertBefore(c,anchor.nextSibling);
 }
 var t=null;
 function later(){ clearTimeout(t); t=setTimeout(function(){ try{ place(); }catch(e){ if(window.console) console.error("tc-sharecard",e); } },120); }
 function start(){
  var app=$("app"); if(!app||!window.MutationObserver) return;
  new MutationObserver(later).observe(app,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
