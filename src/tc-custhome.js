/* Compact, simple Customer home page + small Active switch (tc-custhome.js, loaded by tc-regdocs.js after tc-persrem.js).
   Owner's request (2026-10-29, after an auto driver's suggestion): "do not stretch the pages so long - small switches, a button that opens the
   fare / budget fields only when tapped, as much as possible on ONE screen; the Admin's 'Preview: Customer Page' must show the CUSTOMER page only,
   not my own business cards".
   core.js / cs.js / directory.js are NOT edited. This file
   1) wraps customerHome(): after cs.js has drawn the page it only MOVES / RESTYLES what is there (every id and onclick stays, so the fare calculator,
      directory, messages, My Accounts card ... keep working):
      - Messages / Blood donors / Find Nearby Vehicle / My Accounts cards become slim rows;
      - "Local directory" and "Available vehicles now" sit side by side in ONE row;
      - the whole Fare Estimate form is closed inside one button "Fare / trip budget estimate" and opens only when tapped;
      - Useful places / Emergency / Calls boxes are slimmer; Feedback + About + Log out go into one closed "More" box.
   (also: a slim "My Accounts" row under the Messages card on the owner Dashboard.)
   2) Preview (Admin menu > Preview: Customer Page, address #previewcustomer): the owner's own cards (Verification & Plan, Shop window, Test Notification)
      are hidden and a small bar says "Customer page preview".
   3) CSS only: the big green "Active now" row of partners / vehicles (directory.js tcActiveToggleHtml) is shown as a SMALL switch on one line.
   Nothing is deleted, no data is touched; if anything here fails the page stays exactly as cs.js drew it. */
(function(){
 if(window.__tcCustHome) return;
 window.__tcCustHome=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };

 /* ---------- CSS ---------- */
 var css=
  /* small Active switch (partner dashboard + vehicle rows) */
  '[id$="_row"][data-onchange]{padding:3px 4px!important;gap:8px!important;margin-top:4px!important;background:transparent!important;border:0!important;border-radius:8px!important}'+
  '[id$="_row"][data-onchange] [id$="_track"]{width:40px!important;height:22px!important}'+
  '[id$="_row"][data-onchange] [id$="_knob"]{width:16px!important;height:16px!important;top:3px!important}'+
  '[id$="_row"][data-onchange][data-checked="1"] [id$="_knob"]{left:21px!important}'+
  '[id$="_row"][data-onchange][data-checked="0"] [id$="_knob"]{left:3px!important}'+
  '[id$="_row"][data-onchange] [id$="_label"]{font-size:13px!important}'+
  '[id$="_row"][data-onchange] [id$="_sub"]{display:none!important}'+
  /* customer home */
  '#tcCH #tcMsgCard{padding:9px 12px!important;margin:0 0 8px!important;border-radius:14px!important;gap:10px!important}'+
  '#tcCH #tcMsgCard>div:first-child{width:34px!important;height:34px!important;font-size:18px!important}'+
  '#tcCH #tcMsgCard .tcMsgSub{display:none!important}'+
  '#tcCH #tcMsgCard>div:nth-child(2)>div:first-child{font-size:15px!important}'+
  '#tcCH #tcBloodCard{padding:6px 10px!important;margin:0 0 8px!important;border-radius:12px!important}'+
  '#tcCH #tcBloodCard>div:first-child{gap:8px!important}'+
  '#tcCH #tcBloodCard>div:first-child>div:first-child{font-size:18px!important}'+
  '#tcCH #tcBloodCard .muted{display:none!important}'+
  '#tcCH #tcBloodCard button.primary{padding:6px 10px!important;font-size:12.5px!important;min-height:0!important}'+
  '#tcCH #tcBloodCard summary{font-size:11.5px!important}'+
  '#tcCH #tcTripReq{padding:9px 12px!important;margin:0 0 8px!important;border-radius:14px!important;gap:10px!important}'+
  '#tcCH #tcTripReq>div:first-child{width:34px!important;height:34px!important;font-size:18px!important}'+
  '#tcCH #tcTripReq>div:nth-child(2)>div:first-child{font-size:15px!important}'+
  '#tcCH #tcTripReq>div:nth-child(2)>div:nth-child(2){font-size:11.5px!important}'+
  '#tcCH #tcPersCard{padding:8px 12px!important;margin:0 0 8px!important;border-radius:12px!important;gap:10px!important;box-shadow:none!important}'+
  '#tcCH #tcPersCard>div:first-child{font-size:20px!important}'+
  '#tcCH #tcPersCard>div:nth-child(2)>div:first-child{font-size:14px!important}'+
  '#tcCH #tcPersCard>div:nth-child(2)>div:nth-child(2){display:none!important}'+
  '#tcCH #tcShareCard{padding:8px 12px!important;margin:0 0 8px!important;border-radius:12px!important;box-shadow:none!important}'+
  '#tcCH #tcShareCard>div:first-child{gap:8px!important}'+
  '#tcCH #tcShareCard>div:first-child>div:first-child{width:30px!important;height:30px!important;font-size:16px!important}'+
  '#tcCH #tcShareCard>div:first-child>div:nth-child(2)>div:first-child{font-size:14.5px!important}'+
  '#tcCH #tcShareCard>div:first-child>div:nth-child(2)>div:nth-child(2){display:none!important}'+
  '#tcCH #tcShareCard>div:last-child{margin-top:6px!important}'+
  '#tcCH #tcShareCard button{padding:7px 8px!important;font-size:13px!important}'+
  '#tcCH #tcChRow{display:flex;gap:8px;margin:0 0 8px}'+
  '#tcCH #tcChRow button{flex:1 1 0;min-width:0;margin:0;padding:11px 6px;font-size:13.5px}'+
  '#tcCH #tcFareBox{margin:0 0 8px}'+
  '#tcCH #tcFareBox>summary,#tcCH #tcMoreBox>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;padding:11px 12px;border-radius:12px;font-weight:800;font-size:14px;background:#e9f3f4;color:#0b4f5a}'+
  '#tcCH #tcFareBox>summary::-webkit-details-marker,#tcCH #tcMoreBox>summary::-webkit-details-marker{display:none}'+
  '#tcCH #tcFareBox>summary:after,#tcCH #tcMoreBox>summary:after{content:"\\25B8";margin-left:auto;opacity:.7}'+
  '#tcCH #tcFareBox[open]>summary:after,#tcCH #tcMoreBox[open]>summary:after{content:"\\25BE"}'+
  '#tcCH #tcFareBox>.tcFareIn{padding:8px 2px 0}'+
  '#tcCH #tcMoreBox{margin:8px 0 0}'+
  '#tcCH #tcMoreBox>summary{background:#f1f3f5;color:#4a5a67;font-weight:700;font-size:13px}'+
  '#tcCH #tcMoreBox>.tcMoreIn{padding-top:6px}'+
  '#tcCH #custUsefulPlaces,#tcCH #custMyCalls{padding:9px 12px!important;margin:0 0 8px!important}'+
  '#tcCH #custUsefulPlaces h3,#tcCH #custMyCalls h3{font-size:14px!important}'+
  '#tcCH #custEmergency{margin:0 0 8px!important;box-shadow:none!important;border-width:1px!important}'+
  '#tcCH #custEmergency>div:first-child{padding:8px 12px!important;gap:10px!important}'+
  '#tcCH #custEmergency>div:first-child>div:first-child{width:30px!important;height:30px!important;font-size:16px!important}'+
  '#tcCH #custEmergency>div:first-child>div:nth-child(2)>div:first-child{font-size:13.5px!important;letter-spacing:.4px!important}'+
  '#tcCH #custEmergency>div:first-child>div:nth-child(2)>div:nth-child(2){display:none!important}'+
  '#tcPrevBar{margin:0 0 8px;padding:7px 10px;border-radius:10px;background:#fff6df;color:#7a4f00;font-size:12.5px;font-weight:700}'+
  /* preview: only the customer page, never the owner's own business cards */
  '#tcCH.tcPrevCust #tcUpCard,#tcCH.tcPrevCust #tcMediaCard,#tcCH.tcPrevCust #tcPtCard,#tcCH.tcPrevCust #tcSecBar,#tcCH.tcPrevCust #tcHomeMore{display:none!important}';
 try{ var st=document.createElement("style"); st.id="tcCustHomeCss"; st.textContent=css; document.head.appendChild(st); }catch(e){}

 /* ---------- helpers ---------- */
 function preview(){ try{ return location.hash==="#previewcustomer"; }catch(e){ return false; } }
 function section(app){ return app&&app.querySelector("section.container>.card"); }

 /* the pieces between two nodes (first and last included) */
 function range(first,last){
  var out=[], n=first;
  while(n){ out.push(n); if(n===last) return out; n=n.nextElementSibling; }
  return null;
 }

 function reshape(){
  var app=$("app"), root=section(app);
  if(!root||root.id==="tcCH"||!$("cCat")||!$("cResult")) return;
  root.id="tcCH";
  if(preview()){
   root.classList.add("tcPrevCust");
   root.insertAdjacentHTML("afterbegin",'<div id="tcPrevBar">&#128065; '+E(B("Customer page preview - this is what a customer sees","കസ്റ്റമർ പേജ് പ്രിവ്യൂ - കസ്റ്റമർക്ക് ഇങ്ങനെ കാണും"))+'</div>');
  }
  /* Find Nearby Vehicle card: give it an id for the CSS */
  try{ var tr=root.querySelector('[onclick*="tcOpenTripRequest"]'); if(tr) tr.id="tcTripReq"; }catch(e){}
  /* directory + available vehicles: one row */
  try{
   var bd=root.querySelector('button[onclick*="tcOpenDirectory"]'), bv=root.querySelector('button[onclick*="activeboard"]');
   if(bd&&bv){
    var ad=bd.closest(".actions"), av=bv.closest(".actions");
    var row=document.createElement("div"); row.id="tcChRow"; row.className="actions";   /* tc-pers.js finds the strip by button[activeboard] > .actions */
    ad.parentNode.insertBefore(row,ad);
    bd.removeAttribute("style"); bv.removeAttribute("style"); bd.classList.add("primary");
    row.appendChild(bd); row.appendChild(bv);
    [ad,av].forEach(function(x){ if(x&&x!==row&&x.parentNode&&!x.children.length) x.remove(); });
   }
  }catch(e){}
  /* the Fare Estimate form: closed behind one button */
  try{
   var h2=null, hs=root.querySelectorAll("h2"); for(var i=0;i<hs.length;i++){ if(hs[i].nextElementSibling&&hs[i].nextElementSibling.querySelector&&hs[i].nextElementSibling.querySelector("#cCat")){ h2=hs[i]; break; } }
   var nodes=h2?range(h2,$("cResult")):null;
   if(nodes&&nodes.length>2){
    var det=document.createElement("details"); det.id="tcFareBox";
    var sm=document.createElement("summary"); sm.innerHTML='<span>&#129518;</span><span>'+E(B("Fare / trip budget estimate","ചാർജ് / ട്രിപ്പ് ബജറ്റ് എസ്റ്റിമേറ്റ്"))+'</span>';
    var inn=document.createElement("div"); inn.className="tcFareIn";
    nodes[0].parentNode.insertBefore(det,nodes[0]);
    det.appendChild(sm); det.appendChild(inn);
    nodes.forEach(function(n,k){ if(k===0){ n.remove(); } else inn.appendChild(n); });
   }
  }catch(e){}
  /* Feedback + About + Log out: one closed "More" box */
  try{
   var fb=$("custFeedback"), fcard=fb&&fb.closest(".card"), lo=root.querySelector('button[onclick*="logout"]'), lrow=lo&&lo.closest(".actions");
   if(fcard&&lrow){
    var mb=document.createElement("details"); mb.id="tcMoreBox";
    var ms=document.createElement("summary"); ms.innerHTML='<span>&#8943;</span><span>'+E(B("More - feedback, about, log out","കൂടുതൽ - അഭിപ്രായം, വിവരങ്ങൾ, ലോഗൗട്ട്"))+'</span>';
    var mi=document.createElement("div"); mi.className="tcMoreIn";
    fcard.parentNode.insertBefore(mb,fcard);
    mb.appendChild(ms); mb.appendChild(mi);
    var n=fcard;
    while(n){ var nx=n.nextElementSibling; mi.appendChild(n); if(n===lrow) break; n=nx; }
   }
  }catch(e){}
 }

 /* My Accounts: a slim one-line shortcut on the owner Dashboard too (it was only in the Menu; the customer home has its own slim card from tc-pers.js) */
 function chip(){
  var u=null; try{ u=getCurrentUser(); }catch(e){}
  var c=$("tcPersChip"), msg=$("tcMsgCard");
  if(!u||u.role==="customer"||typeof window.tcPersOpen!=="function"||!msg||msg.closest("#tcCH")){ if(c&&(!msg||msg.closest("#tcCH"))) c.remove(); return; }
  var due=""; try{ due=(window.__tcPers&&__tcPers.dueText)?__tcPers.dueText():""; }catch(e){}
  var txt=B("My Accounts","എന്റെ കണക്കുകൾ")+(due?"  "+due:"");
  if(!c){
   c=document.createElement("div"); c.id="tcPersChip"; c.setAttribute("onclick","tcPersOpen()");
   c.style.cssText="cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 12px;margin:0 0 8px;border-radius:12px;background:#e9f3f4;color:#0b4f5a;font-weight:700;font-size:13.5px";
   c.innerHTML='<span style="font-size:17px">&#128210;</span><span class="tcPcT" style="flex:1;min-width:0"></span><span style="font-size:18px;opacity:.7">&rsaquo;</span>';
  }
  var t=c.querySelector(".tcPcT"); if(t&&t.textContent!==txt) t.textContent=txt;
  if(!c.parentNode) msg.parentNode.insertBefore(c,msg.nextSibling);        /* placed once - other scripts reorder the Dashboard boxes, never fight them */
 }

 var oc=window.customerHome;
 if(typeof oc==="function"){
  window.customerHome=function(){
   var r=oc.apply(this,arguments);
   try{ reshape(); }catch(e){ if(window.console) console.error("tc-custhome",e); }
   return r;
  };
 }

 /* the first page of a session is drawn before this file is loaded: reshape it when it shows up */
 (function(){
  var tm=0;
  function chk(){ clearTimeout(tm); tm=setTimeout(function(){ try{ reshape(); }catch(e){ if(window.console) console.error("tc-custhome",e); } try{ chip(); }catch(e){ if(window.console) console.error("tc-custhome chip",e); } },30); }
  function start(){ var a=$("app"); if(!a||!window.MutationObserver) return; new MutationObserver(chk).observe(a,{childList:true,subtree:true}); chk(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();
})();
