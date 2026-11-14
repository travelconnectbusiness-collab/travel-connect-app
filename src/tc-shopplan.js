/* Shop / workshop / other non-taxi businesses: ONE YEAR FREE, then Premium (tc-shopplan.js, loaded by tc-regdocs.js after tc-workshop.js).
   Owner 2026-11-12: Free = directory listing only; Plus = shop photo, 2 small ad posts, social links (server: partner_media.js);
   Premium = the working tools: stock, sale, purchase, expenses, bill / quotation / invoice, job cards, reports, cloud save.
   Businesses that are NOT Taxi / Travel get every Premium tool free for ONE YEAR from the first use (Taxi / Travel keeps its own 2 months,
   because the map costs the owner money); after that a new entry needs Premium.
   HOW IT WORKS
   - the first time the shop book is used by a business without Premium, the day is written into the book itself as a setting
     (SH.setCfg("trial0", yyyy-mm-dd)). It travels with the book to every phone (first day wins if two phones wrote one), so clearing the app data does not restart the year.
   - Premium (tcIsPremiumPlan) or the Taxi / Travel business: nothing changes, nothing is shown.
   - inside the year: the shop Home and the Vehicle jobs page show ONE green line "Premium tools free: N days left" (amber in the last 30 days)
     with a small "What is in Free / Plus / Premium?" note. window.__tcShopPlan.state() = {mode:"prem"|"trial"|"locked", left, end}.
   - after the year without Premium: VIEW ONLY. Everything written stays visible (stock, history, reports, bills can be opened / shared), nothing is deleted
     and the old entries keep syncing. New entries are refused with a clear message: the Sale / Purchase / Loss / Vehicle job / New bill buttons show it at once, and every
     other write (expense, edit, cancel, import ...) is stopped at the book (SH.add / addMany / cancel / replace / saveProduct / newProduct). Settings stay editable.
   - tc-workshop.js asks window.__tcShopPlan.state() so a workshop inside its free year also has service reminders and the monthly report.
   SERVER (functions/api/shop.js, 2026-11-12): the SERVER decides the same thing from the registration day of the businesses of this mobile number / e-mail and refuses new
   records after the year, so another phone, cleared data or a changed app cannot skip it. Every /api/shop answer carries plan:{mode,end,left}; this file reads it
   (fetch wrapper below) and it wins over the local day. The local day (trial0) is only the fallback while no server answer has been seen (offline, first minutes).
   A push whose records the server dropped (dropped > 0) shows the "Premium needed" pop-up. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcShopPlan) return;
 var T=UI.T, E=UI.E, H=SH.H, DAYS=365;
 function dmy(d){ try{ return UI.dmy(d); }catch(e){ return d; } }
 function biz(){ try{ return window.__tcBizOnScreen?String(window.__tcBizOnScreen()||""):""; }catch(e){ return ""; } }
 function loggedIn(){ try{ var u=getCurrentUser(); return !!(u&&u.mobile); }catch(e){ return false; } }
 function days(a,b){ var p=String(a).split("-"), q=String(b).split("-"); return Math.round((Date.UTC(+q[0],+q[1]-1,+q[2])-Date.UTC(+p[0],+p[1]-1,+p[2]))/86400000); }
 /* the earliest trial0 day in the book (cached until the book changes) */
 var cv=-1, cd="";
 function start(){
  var S=SH._S(); if(cv===S.ver) return cd;
  var m="";
  Object.keys(S.recs).forEach(function(id){ var r=S.recs[id]; if(r&&r.k==="c"&&r.x&&r.x.k==="trial0"&&/^\d{4}-\d\d-\d\d$/.test(String(r.x.v||""))&&(!m||r.x.v<m)) m=r.x.v; });
  cv=S.ver; cd=m; return m;
 }
 var SP=null;   /* the last plan the server sent: {mode,end,left} */
 var DEMO=null;  /* admin test pages (tc-demo.js): a plan chosen by hand {mode,left}, only while a test page is open */
 function fromServer(){
  if(!SP) return null;
  if(SP.mode==="prem") return {mode:"prem"};
  var left=SP.end?days(H.today(),SP.end):0;
  if(SP.mode==="locked"||left<=0) return {mode:"locked",left:0,end:SP.end||""};
  return {mode:"trial",left:left,end:SP.end};
 }
 function state(){
  if(DEMO) return DEMO.mode==="trial"?{mode:"trial",left:DEMO.left,end:H.addDays(H.today(),DEMO.left)}:DEMO.mode==="locked"?{mode:"locked",left:0,end:H.addDays(H.today(),-1)}:{mode:"prem"};
  if(biz()==="taxi_travel") return {mode:"prem"};
  if(typeof tcIsPremiumPlan!=="function") return {mode:"prem"};
  var p=false; try{ p=!!tcIsPremiumPlan(); }catch(e){}
  if(p) return {mode:"prem"};
  var sv=fromServer(); if(sv) return sv;
  var t0=start();
  if(!t0){
   if(!loggedIn()) return {mode:"prem"};
   t0=H.today(); try{ SH.setCfg("trial0",t0); }catch(e){}
  }
  var left=DAYS-days(t0,H.today()), end=H.addDays(t0,DAYS);
  return left>0?{mode:"trial",left:left,end:end}:{mode:"locked",left:0,end:end};
 }
 function locked(){ return state().mode==="locked"; }
 window.__tcShopPlan={state:state,locked:locked,server:function(){ return SP; },setDemo:function(mode,left){ DEMO=mode?{mode:mode,left:left||365}:null; try{ later(); }catch(e){} }};

 /* Platinum (level 3): the server says it in every /api/shop answer (plan.lvl); the last answer is remembered so the tools also show when the phone starts offline */
 function platKey(){ var m=""; try{ var u=getCurrentUser(); m=u&&u.mobile?String(u.mobile):""; }catch(e){} return "tc_plat:"+m; }
 window.tcIsPlatinumPlan=function(){
  if(SP&&SP.lvl!=null) return SP.lvl>=3;
  try{ return localStorage.getItem(platKey())==="1"; }catch(e){ return false; }
 };
 /* ---------- read the plan the server puts in every /api/shop answer ---------- */
 (function(){
  var of=window.fetch; if(typeof of!=="function") return;
  window.fetch=function(u){
   var p=of.apply(this,arguments);
   try{
    var url=typeof u==="string"?u:((u&&u.url)||"");
    if(url.indexOf("/api/shop")>=0) p.then(function(r){
     try{ r.clone().json().then(function(j){
      if(j&&j.plan&&j.plan.mode){ SP={mode:String(j.plan.mode),end:String(j.plan.end||""),lvl:+j.plan.lvl||0}; try{ localStorage.setItem(platKey(),SP.lvl>=3?"1":"0"); }catch(e){} try{ later(); }catch(e){} }
      if(j&&j.dropped>0) deny();
     }).catch(function(){}); }catch(e){}
    }).catch(function(){});
   }catch(e){}
   return p;
  };
 })();

 /* ---------- the "Premium needed" pop-up ---------- */
 function showLock(){
  if(document.getElementById("tsPlanLock")) return;
  var o=document.createElement("div"); o.id="tsPlanLock";
  o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100001;display:flex;align-items:center;justify-content:center;padding:18px";
  o.innerHTML='<div style="background:#fff;border-radius:14px;padding:16px;max-width:380px;width:100%;box-sizing:border-box;font-size:16px;line-height:1.4">'+
   '<div style="font-size:19px;font-weight:800;margin-bottom:8px">🔒 '+E(T("പ്രീമിയം വേണം","Premium needed"))+'</div>'+
   '<div>'+E(T("ഒരു വർഷത്തെ സൗജന്യ ഉപയോഗം കഴിഞ്ഞു. പുതിയ എൻട്രി ചേർക്കാൻ പ്രീമിയം വേണം.","Your free year is over. New entries need Premium."))+'</div>'+
   '<div style="margin-top:8px;color:#1a6b3a">'+E(T("പഴയ കണക്കുകൾ എല്ലാം കാണാം, ഒന്നും നഷ്ടപ്പെടില്ല.","All your old records stay and can be viewed. Nothing is lost."))+'</div>'+
   '<div style="margin-top:8px;color:#555;font-size:14px">'+E(T("പ്രീമിയം എടുക്കാൻ: ഡാഷ്ബോർഡിലെ 'Verification & Plan' കാർഡ്.","To get Premium: the 'Verification & Plan' card on the Dashboard."))+'</div>'+
   '<button style="margin-top:12px;width:100%;padding:12px;font-size:17px;border:0;border-radius:10px;background:#0b6b78;color:#fff" onclick="document.getElementById(\'tsPlanLock\').remove()">'+E(T("ശരി","OK"))+'</button></div>';
  document.body.appendChild(o);
 }
 function deny(){ setTimeout(showLock,80); }   /* after the caller's own closeSheet() / render() */

 /* ---------- the book itself refuses new entries ---------- */
 var ow={};
 ["add","cancel","replace","saveProduct","newProduct"].forEach(function(n){
  var f=SH[n]; if(typeof f!=="function") return; ow[n]=f;
  SH[n]=function(){
   if(n==="add"&&arguments[0]==="c") return f.apply(this,arguments);
   if(locked()){ deny(); return null; }
   return f.apply(this,arguments);
  };
 });
 (function(){
  var f=SH.addMany; if(typeof f!=="function") return;
  SH.addMany=function(){ if(locked()){ deny(); return 0; } return f.apply(this,arguments); };
 })();

 /* ---------- the buttons that start a new entry say it at once ---------- */
 function wrapOpen(name,test){
  var f=window[name]; if(typeof f!=="function"||f.__tcPlan) return;
  var w=function(){ if(locked()&&test(arguments)){ showLock(); return; } return f.apply(this,arguments); };
  w.__tcPlan=1; window[name]=w;
 }
 var WRITE={sale:1,purchase:1,dead:1,jobform:1};
 function install(){
  wrapOpen("tsOpen",function(a){ return !!WRITE[a[0]]; });
  wrapOpen("UI_go",function(a){ return !!WRITE[a[0]]; });
  wrapOpen("wsNew",function(){ return true; });
  wrapOpen("tdNew",function(){ return true; });
 }
 install(); setTimeout(install,1500);

 /* ---------- the one-line notice on the shop Home and the Vehicle jobs page ---------- */
 function banner(s){
  var ml="ഫ്രീ: ഡയറക്ടറിയിൽ ലിസ്റ്റിംഗ് മാത്രം.\nപ്ലസ്: ഷോപ്പ് ഫോട്ടോ, 2 പരസ്യ പോസ്റ്റ്, സോഷ്യൽ ലിങ്കുകൾ.\nപ്രീമിയം: സ്റ്റോക്ക്, ബിൽ / ക്വട്ടേഷൻ, ജോബ് കാർഡ്, റിപ്പോർട്ടുകൾ, ക്ലൗഡ് സേവ്.\nപ്ലാറ്റിനം: 10 സ്റ്റാഫ് ഫോൺ, നിങ്ങളുടെ 11 ഫോൺ, CA Excel (GST + ലാഭ-നഷ്ടം + കടം).\nപ്രീമിയം എടുക്കാൻ: ഡാഷ്ബോർഡിലെ 'Verification & Plan' കാർഡ്.";
  var en="Free: directory listing only.\nPlus: shop photo, 2 ad posts, social links.\nPremium: stock, bills / quotations, job cards, reports, cloud save.\nPlatinum: 10 staff phones, 11 of your own phones, CA Excel (GST + profit-loss + dues).\nTo get Premium / Platinum: the 'Verification & Plan' card on the Dashboard.";
  var note='<details style="margin-top:4px"><summary class="tsM" style="cursor:pointer">'+E(T("ഫ്രീ / പ്ലസ് / പ്രീമിയം: എന്തൊക്കെ?","Free / Plus / Premium: what is in each?"))+'</summary><div class="tsM" style="white-space:pre-line;margin-top:4px">'+E(T(ml,en))+'</div></details>';
  if(s.mode==="trial"){
   var amber=s.left<=30;
   return '<div id="tsPlanBn" class="tsC" style="padding:8px 10px;background:'+(amber?'#fff3d6':'#eaf7ee')+'"><div style="font-size:14.5px">🎁 <b>'+E(T("പ്രീമിയം സൗകര്യങ്ങൾ സൗജന്യം","Premium tools are free"))+'</b> · '+s.left+' '+E(T("ദിവസം ബാക്കി","days left"))+' <span class="tsM">('+E(dmy(s.end))+')</span></div>'+
    (amber?'<div class="tsM">'+E(T("അതിനു ശേഷം പുതിയ എൻട്രിക്ക് പ്രീമിയം വേണം. പഴയ കണക്കുകൾ കാണാം.","After that new entries need Premium. Old records stay visible."))+'</div>':'')+note+'</div>';
  }
  return '<div id="tsPlanBn" class="tsC" style="padding:8px 10px;background:#fde8e8"><div style="font-size:14.5px">🔒 <b>'+E(T("സൗജന്യ ഒരു വർഷം കഴിഞ്ഞു","Your free year is over"))+'</b></div><div class="tsM">'+E(T("പഴയ കണക്കുകൾ കാണാം. പുതിയ എൻട്രിക്ക് പ്രീമിയം വേണം.","Old records can be viewed. New entries need Premium."))+'</div>'+note+'</div>';
 }
 var bt=null;
 function paint(){
  try{
   var sh=document.getElementById("tcShop"); if(!sh||sh.classList.contains("hidden")) return;
   var b=document.getElementById("tsBody"); if(!b) return;
   var home=!!b.querySelector(".tsTot"), jobs=!!b.querySelector('input[oninput*="wsSearch"]');
   var cur=b.querySelector("#tsPlanBn");
   if(!home&&!jobs){ if(cur) cur.remove(); return; }
   var s=state();
   if(s.mode==="prem"){ if(cur) cur.remove(); return; }
   var h=banner(s);
   if(cur){ if(cur.getAttribute("data-k")===s.mode+s.left) return; cur.remove(); }
   b.insertAdjacentHTML("afterbegin",h);
   var n=b.querySelector("#tsPlanBn"); if(n) n.setAttribute("data-k",s.mode+s.left);
  }catch(e){}
 }
 function later(){ clearTimeout(bt); bt=setTimeout(paint,120); }
 try{ if(window.MutationObserver) new MutationObserver(later).observe(document.body,{childList:true,subtree:true}); }catch(e){}
 SH.onChange(later);
 later();
})();
