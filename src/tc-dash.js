/* Owner dashboard layout (tc-dash.js, loaded by tc-regdocs.js).
   1) The business NAME + DETAILS card is always the first thing on the dashboard
      (taxi / travel dashboard AND every other business type); Messages, Blood Donors,
      Verification & Plan, Shop window ... come below it.
   2) The "Verification & Plan" card (#tcUpCard) is shown small and tidy: a compact title,
      short lines side by side, small buttons.
   Nothing here changes data or other scripts: it only moves existing boxes and adds CSS. */
(function(){
 window.__tcDash=1;

 var css=
  "#tcUpCard{display:flex!important;flex-wrap:wrap;align-items:center;gap:3px 12px;padding:8px 11px!important;margin:0 0 10px!important;border-radius:12px;font-size:12.5px;line-height:1.35;box-shadow:none!important;border:1px solid #cfe0e3}"+
  "#tcUpCard>h3{flex:1 1 100%;margin:0 0 1px!important;font-size:13px!important;letter-spacing:.2px;color:#0b4f5a}"+
  "#tcUpCard>div,#tcUpCard>p{margin:1px 0!important;font-size:12.5px!important;flex:0 1 auto}"+
  "#tcUpCard>.actions{flex:1 1 100%;margin:3px 0 0!important;gap:6px}"+
  "#tcUpCard>.actions button{padding:6px 11px!important;font-size:12px!important;min-height:0!important;border-radius:9px}"+
  "#tcDashFirst{margin-top:0}";
 function addCss(){
  if(document.getElementById("tcDashCss")) return;
  var s=document.createElement("style"); s.id="tcDashCss"; s.textContent=css;
  (document.head||document.documentElement).appendChild(s);
 }

 /* is this node the business details box of the taxi dashboard? (a plain div, not .actions, holding the "edit business details" button) */
 function taxiProfile(h2){
  var p=h2.parentNode, kids=p?p.children:[];
  for(var i=0;i<kids.length;i++){
   var k=kids[i];
   if(k===h2||k.tagName!=="DIV"||k.id||k.classList.contains("actions")||k.classList.contains("grid")) continue;
   var b=k.querySelector("button[onclick*=\"view('partner')\"]");
   if(b) return k;
  }
  return null;
 }

 function arrange(){
  var app=document.getElementById("app"); if(!app) return;
  /* taxi / travel dashboard: title h2, then the box */
  var h2=app.querySelector(".card>h2");
  if(h2&&/Travel Connect Dashboard|ഡാഷ്ബോർഡ്/i.test(h2.textContent)){
   var box=taxiProfile(h2);
   if(box&&h2.nextElementSibling!==box){ h2.parentNode.insertBefore(box,h2.nextSibling); }
  }
  /* every other business type: #partnerBox, the first plain .card is the profile card */
  var pb=document.getElementById("partnerBox");
  if(pb&&pb.children.length){
   var prof=null, kids=pb.children;
   for(var i=0;i<kids.length;i++){
    var k=kids[i];
    if(k.classList.contains("card")&&!k.id&&k.querySelector("button[onclick*='tcOpenEditPartnerDetails']")){ prof=k; break; }
   }
   if(prof&&pb.firstElementChild!==prof) pb.insertBefore(prof,pb.firstElementChild);
  }
 }

 var t=null;
 function later(){ clearTimeout(t); t=setTimeout(function(){ try{ arrange(); }catch(e){} },70); }
 function start(){
  addCss();
  var app=document.getElementById("app"); if(!app||!window.MutationObserver) return;
  new MutationObserver(later).observe(app,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
