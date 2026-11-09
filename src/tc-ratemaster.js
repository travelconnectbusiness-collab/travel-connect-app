/* "My Rate Master" for Premium owners (tc-ratemaster.js, loaded by tc-regdocs.js after tc-ltextra.js). business.js / core.js are NOT edited.
   Owner's wish (2026-11-08): besides the Travel Connect Rate Master, a Premium owner can make a Rate Master of his OWN (own categories and charges), choose
   in the Quotation / Quick Bill which one to use, and optionally add his own Minimum charge / Minimum KM when making the bill.
   1) OWN CATEGORIES: db.ownCats = [{name,driverBata,minFare,minKm,hidden,standard,competitive,safety,drop,local}] (each plan {rate,incKm,incHours,addKm,addHour}),
      same shape as a Travel Connect category, so every fare calculation works unchanged. Menu > "My Rate Master": list, Add / Edit, "Copy from Travel Connect"
      (copies all categories that are not there yet), Remove = hide (old bills keep working; Restore brings it back). A plan left empty = same as Standard.
      The Travel Connect Rate Master (admin, server config) is never touched; it is not changed by the admin's updates to it either.
   2) A quote / bill made with an own category stores categoryId = -(position+1) (-1, -2 ...). db.categories[-1] etc. are NON-ENUMERABLE getters put on the
      categories array (install()), so every existing db.categories[q.categoryId] lookup (bill, print, PDF, day book, GST...) works, and JSON / server push of the
      Travel Connect list never contains them. install() is repeated (save, timer) because the array can be replaced by a restore / config pull.
   3) Quotation, Quick Bill and Edit-bill category lists: Premium owners with an own master get a small switch "Rate: Travel Connect | Mine" under the category box
      (last choice remembered in localStorage tc_ratemode; opening a saved quote / bill switches to the set it was made with). Switching refills the category list.
      Not Premium (or no own master) = nothing changes. A lapsed Premium still prints / edits old own-master bills.
   4) OFFER PACKAGE (owner 2026-11-09, for special customers who treat the driver like family): an own category may hold an optional "Offer package" with two sets,
      One-day trip and Multi-day trip (per day): package amount (the fare never goes below it), included KM / hours, extra per KM / hour. When the category has an offer
      the Quotation / Quick Bill shows a small switch "Offer package" (off by default); on = the calculation uses the one-day set (1 day) or the multi-day set (more days,
      per day) instead of the chosen rate's figures (calcFare gets a copy of the category with that plan replaced). Not for the Drop rate / a typed (custom) base.
      Stored on the quote (ownOffer), re-applied by billFinalAmount / billBreakdown, the Service line says "Offer package applied".
   5) MINIMUM CHARGE / MINIMUM KM (Premium, optional, per bill, in a closed "Minimum charge / km" box, not for the Drop rate which has its own minimum): wrapper of calcFare.
      Minimum KM (per day x days): the fare is worked out on that KM when the trip is shorter. Minimum charge: the fare is never lower. The difference is added to
      the Base charge so the bill rows still add up, and the bill's Service line says "Minimum charge Rs.X applied". Stored on the quote (ownMinFare / ownMinKm);
      billFinalAmount / billBreakdown use them, so print, PDF, list and day book agree. Opening a saved quote puts these values (and the offer switch) back. */
(function(){
 if(window.__tcRateMaster) return;
 window.__tcRateMaster=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){} };
 var money=function(n){ try{ return money0(n); }catch(e){ return "₹"+(Math.round((+n||0)*100)/100); } };
 function money0(n){ return (typeof window.money==="function")?window.money(n):"₹"+n; }
 function premium(){ try{ return typeof tcIsPremiumPlan==="function"&&tcIsPremiumPlan(); }catch(e){ return false; } }
 function own(){ if(!Array.isArray(db.ownCats)) db.ownCats=[]; return db.ownCats; }
 function save2(){ try{ save(); }catch(e){} }
 var PLANS=[["standard","Standard","സ്റ്റാൻഡേർഡ്"],["competitive","Competitive","കോംപറ്റിറ്റീവ്"],["safety","Minimum Safety","മിനിമം സേഫ്റ്റി"],["drop","Drop","ഡ്രോപ്പ്"],["local","Local","ലോക്കൽ"]];
 var FLD=[["rate","Base rate","ബേസ് റേറ്റ്"],["incKm","Included KM","ഉൾപ്പെട്ട KM"],["incHours","Included hours","ഉൾപ്പെട്ട മണിക്കൂർ"],["addKm","Extra / KM","അധിക KM ന്"],["addHour","Extra / hour","അധിക മണിക്കൂറിന്"]];
 var force=false;

 /* ---------- mode ---------- */
 function getMode(){ try{ return localStorage.getItem("tc_ratemode")==="own"?"own":"tc"; }catch(e){ return "tc"; } }
 function setMode(m){ try{ localStorage.setItem("tc_ratemode",m==="own"?"own":"tc"); }catch(e){} }
 function effOwn(){ return own().length>0&&getMode()==="own"&&(premium()||force); }

 /* ---------- db.categories[-1] ... ---------- */
 function install(){
  try{
   var a=db&&db.categories; if(!Array.isArray(a)||a.__tcOwn) return;
   Object.defineProperty(a,"__tcOwn",{value:1,enumerable:false,configurable:true});
   for(var i=0;i<80;i++) (function(i){
    Object.defineProperty(a,String(-(i+1)),{get:function(){ return (db.ownCats||[])[i]; },enumerable:false,configurable:true});
   })(i);
  }catch(e){}
 }
 install(); setInterval(install,1000);
 var oSave=window.save;
 if(typeof oSave==="function") window.save=function(){ install(); return oSave.apply(this,arguments); };

 /* ---------- category lists ---------- */
 function ownOptions(){
  return '<option value="">-- Select --</option>'+own().map(function(c,i){ return c.hidden?"":'<option value="'+(-(i+1))+'">'+E(c.name)+'</option>'; }).join("");
 }
 function syncSelects(reset){
  ["qCat","qbCat","beCat"].forEach(function(id){
   var s=$(id); if(!s) return; var want=effOwn()?"own":"tc", had=s.dataset.tcSet;
   if(had===want&&!reset) return;
   if(want==="own") s.innerHTML=ownOptions();
   else if(had&&typeof tcCategoryOptions==="function") s.innerHTML=tcCategoryOptions();
   s.dataset.tcSet=want;
   if(!s.dataset.tcRmL){ s.dataset.tcRmL=1; s.addEventListener("change",function(){ redrawBlocks(); }); }
  });
 }
 /* ---------- the switch + minimum boxes under the category box ---------- */
 function selCat(id){ var s=$(id); var v=s?+s.value:0; return (s&&s.value!==""&&v<0)?(db.ownCats||[])[-v-1]:null; }
 function hasSet(x){ return !!(x&&+x.rate>0); }
 function offerOf(c){ return c&&(hasSet(c.offer1)||hasSet(c.offerM))?c:null; }
 function blockHtml(forId){
  var h="", oc=offerOf(selCat(forId));
  if(own().length){
   var o=effOwn();
   h+='<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;margin:2px 0 4px"><b>'+E(B("Rate:","റേറ്റ്:"))+'</b>'+
    '<button type="button" onclick="tcRmMode(\'tc\')" style="flex:none;padding:4px 12px;min-height:0;font-size:12.5px;border-radius:999px;'+(!o?'background:#0b6b78;color:#fff;':'')+'">Travel Connect</button>'+
    '<button type="button" onclick="tcRmMode(\'own\')" style="flex:none;padding:4px 12px;min-height:0;font-size:12.5px;border-radius:999px;'+(o?'background:#0b6b78;color:#fff;':'')+'">'+E(B("Mine","എൻ്റേത്"))+'</button></div>';
  }else{
   h+='<div style="font-size:12.5px;margin:2px 0 4px"><a href="#" onclick="tcRmOpen();return false">+ '+E(B("Make my own Rate Master","എൻ്റെ സ്വന്തം റേറ്റ് മാസ്റ്റർ ഉണ്ടാക്കുക"))+'</a></div>';
  }
  if(oc) h+='<label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:4px 0;font-weight:700"><input type="checkbox" class="tcOffer" style="width:auto;margin:0"> '+E(B("Offer package","ഓഫർ പാക്കേജ്"))+
   '<span class="muted" style="font-weight:400;font-size:12px">'+(hasSet(oc.offer1)?E(B("1 day ","1 ദിവസം "))+money(oc.offer1.rate):"")+(hasSet(oc.offer1)&&hasSet(oc.offerM)?" · ":"")+(hasSet(oc.offerM)?E(B("multi-day ","മൾട്ടി ഡേ "))+money(oc.offerM.rate)+E(B("/day","/ദിവസം")):"")+'</span></label>';
  h+='<details style="margin:0 0 4px"><summary style="font-size:13px;cursor:pointer">'+E(B("Minimum charge / minimum KM (optional)","ഏറ്റവും കുറഞ്ഞ ചാർജ് / KM (ഓപ്ഷണൽ)"))+'</summary>'+
   '<div class="grid"><label>'+E(B("Minimum charge (₹)","മിനിമം ചാർജ് (₹)"))+'<input class="tcMinFare" type="number" inputmode="decimal"></label>'+
   '<label>'+E(B("Minimum KM per day","ദിവസം മിനിമം KM"))+'<input class="tcMinKm" type="number" inputmode="decimal"></label></div>'+
   '<div class="muted" style="font-size:12px">'+E(B("Not used for the Drop rate. The bill never goes below the minimum charge; a shorter trip is charged as the minimum KM.","ഡ്രോപ്പ് റേറ്റിന് ബാധകമല്ല. ബില്ല് മിനിമം ചാർജിൽ കുറയില്ല; കുറഞ്ഞ ദൂരം മിനിമം KM ആയി കണക്കാക്കും."))+'</div></details>';
  return h;
 }
 function inject(){
  if(!premium()) return;
  [["qCat"],["qbCat"]].forEach(function(p){
   var s=$(p[0]); if(!s) return; var lab=s.closest("label"); if(!lab) return;
   var nx=lab.nextElementSibling;
   if(nx&&nx.classList.contains("tcRm")) return;
   var d=document.createElement("div"); d.className="tcRm"; d.setAttribute("data-for",p[0]); d.style.cssText="grid-column:1/-1";
   d.innerHTML=blockHtml(p[0]);
   lab.parentNode.insertBefore(d,lab.nextSibling);
  });
 }
 function redrawBlocks(){
  var bs=document.querySelectorAll(".tcRm");
  for(var i=0;i<bs.length;i++){
   var f=bs[i].querySelector(".tcMinFare"), k=bs[i].querySelector(".tcMinKm"), fv=f?f.value:"", kv=k?k.value:"", open=bs[i].querySelector("details")&&bs[i].querySelector("details").open;
   var of=bs[i].querySelector(".tcOffer"), ov=!!(of&&of.checked);
   bs[i].innerHTML=blockHtml(bs[i].getAttribute("data-for"));
   if(bs[i].querySelector(".tcOffer")) bs[i].querySelector(".tcOffer").checked=ov;
   if(bs[i].querySelector(".tcMinFare")) bs[i].querySelector(".tcMinFare").value=fv;
   if(bs[i].querySelector(".tcMinKm")) bs[i].querySelector(".tcMinKm").value=kv;
   if(open&&bs[i].querySelector("details")) bs[i].querySelector("details").open=true;
  }
 }
 window.tcRmMode=function(m){
  setMode(m); force=false; syncSelects(true); redrawBlocks();
  ["qCat","qbCat"].forEach(function(id){ var s=$(id); if(s){ try{ s.dispatchEvent(new Event("change",{bubbles:true})); }catch(e){} } });
 };
 function run(){ try{ install(); syncSelects(); inject(); }catch(e){} }
 function boot(){ if(window.MutationObserver) new MutationObserver(run).observe(document.body,{childList:true,subtree:true}); run(); }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();

 /* opening a saved quote / bill switches to the set it was made with */
 function modeFromQuote(q){
  if(!q) return;
  if(+q.categoryId<0){ setMode("own"); force=true; }
  else{ force=false; if(own().length&&premium()) setMode("tc"); }
 }
 var oOpenQ=window.openQuote;
 if(typeof oOpenQ==="function") window.openQuote=function(id){
  var q0=null;
  try{ q0=(db.quotes||[]).filter(function(x){ return x.id===id; })[0]; modeFromQuote(q0); }catch(e){}
  var r=oOpenQ.apply(this,arguments);
  setTimeout(function(){ restoreFromQuote(q0); },200);
  return r;
 };
 /* a saved quote: put its minimum boxes and offer switch back (the category value is set by script, no change event) */
 function restoreFromQuote(q){
  try{
   if(!q||!premium()&&!(+q.categoryId<0)) return;
   redrawBlocks();
   var b=document.querySelector('.tcRm[data-for="qCat"]'); if(!b) return;
   var f=b.querySelector(".tcMinFare"), k=b.querySelector(".tcMinKm"), o=b.querySelector(".tcOffer");
   if(f&&+q.ownMinFare>0) f.value=q.ownMinFare; if(k&&+q.ownMinKm>0) k.value=q.ownMinKm; if(o&&q.ownOffer) o.checked=true;
   var d=b.querySelector("details"); if(d&&(+q.ownMinFare>0||+q.ownMinKm>0)) d.open=true;
  }catch(e){}
 }
 var oBe=window.tcBeOpen;
 if(typeof oBe==="function") window.tcBeOpen=function(tripId){
  try{ var t=(db.trips||[]).filter(function(x){ return x.id===tripId; })[0]; modeFromQuote(t&&(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]); }catch(e){}
  return oBe.apply(this,arguments);
 };

 /* ---------- minimum charge / km ---------- */
 var CTX=null;
 function ctxOf(q){
  if(!q) return null; var f=+q.ownMinFare||0, k=+q.ownMinKm||0, o=!!q.ownOffer;
  return (f>0||k>0||o)?{fare:f,km:k,offer:o,plan:q.ratePlan||""}:null;
 }
 function withCtx(x,fn){ var old=CTX; CTX=x; try{ return fn(); } finally{ CTX=old; } }
 function formRoot(){
  var m=$("modal"), mb=$("modalBody");
  if(m&&mb&&!m.classList.contains("hidden")&&mb.querySelector(".tcRm .tcMinFare")) return mb;
  var f=document.querySelector(".tcRm .tcMinFare"); if(!f) return null;
  if(f.closest&&f.closest("#modalBody")) return null;      /* a closed (hidden) sheet's old boxes */
  return document;
 }
 function formVals(){
  var r=formRoot(); if(!r) return null;
  var f=r.querySelector(".tcRm .tcMinFare"), k=r.querySelector(".tcRm .tcMinKm");
  var fare=f?(parseFloat(f.value)||0):0, km=k?(parseFloat(k.value)||0):0, of=r.querySelector(".tcRm .tcOffer"), offer=!!(of&&of.checked);
  var rs=r.querySelector("#qRate,#qbRate,#beRate");
  return (fare>0||km>0||offer)?{fare:fare,km:km,offer:offer,plan:rs?rs.value:""}:null;
 }
 var oCalc=window.calcFare;
 if(typeof oCalc==="function") window.calcFare=function(c,plan,km,h,days,rest,ov){
  var x=CTX||formVals(), offerTag="";
  /* billBreakdown's FIRST fare call is the plain Standard comparison column: no offer, no minimum on that one */
  if(x&&x.skipStd&&plan==="standard"){ x.skipStd=false; return oCalc.apply(this,arguments); }
  if(x&&x.offer&&x.plan&&x.plan!==plan) x=Object.assign({},x,{offer:false});      /* the offer only replaces the plan that was chosen */
  if(x&&x.offer&&plan!=="drop"&&plan!=="custom"&&c&&c[plan]){
   try{
    var oneDay=!((Number(days)||1)>1), st=oneDay?c.offer1:c.offerM;
    if(hasSet(st)){
     var c2=Object.assign({},c), p2=Object.assign({},c[plan]);
     FLD.forEach(function(f){ p2[f[0]]=+st[f[0]]||0; });
     c2[plan]=p2; offerTag=oneDay?"1":"M";
     var a0=Array.prototype.slice.call(arguments); a0[0]=c2;
     var ro=oCalc.apply(this,a0);
     if(ro&&!ro.invalid) ro.offerApplied=offerTag; else offerTag="";
     if(offerTag) return finishMin(ro,x,plan,km,days,a0);
    }
   }catch(e){ offerTag=""; }
  }
  var r=oCalc.apply(this,arguments);
  return finishMin(r,x,plan,km,days,arguments);
 };
 function finishMin(r,x,plan,km,days,args){
  if(!x||plan==="drop"||!r||r.invalid) return r;
  var oC=oCalc;
  try{
   var d=Number(days)||1, kmN=Number(km)||0, mk=(x.km||0)*d;
   if(plan!=="custom"&&mk>kmN){
    var a2=Array.prototype.slice.call(args); a2[2]=mk;
    var r1=oC.apply(null,a2);
    if(r1&&!r1.invalid&&r1.total>r.total){ r.base+=r1.total-r.total; r.total=r1.total; r.minKmApplied=mk; }
   }
   if(x.fare>0&&r.total<x.fare){ r.base+=x.fare-r.total; r.total=x.fare; r.minFareApplied=x.fare; }
  }catch(e){}
  return r;
 }
 var oFinal=window.billFinalAmount;
 if(typeof oFinal==="function") window.billFinalAmount=function(t,q,c){
  var a=arguments, self=this;
  return withCtx(ctxOf(q),function(){ return oFinal.apply(self,a); });
 };
 function note(r){
  var p=[];
  if(r.offerApplied) p.push(B("Offer package applied","ഓഫർ പാക്കേജ് ബാധകം"));
  if(r.minKmApplied) p.push(B("Minimum KM "+r.minKmApplied+" applied","മിനിമം KM "+r.minKmApplied+" ബാധകം"));
  if(r.minFareApplied) p.push(B("Minimum charge "+money(r.minFareApplied)+" applied","മിനിമം ചാർജ് "+money(r.minFareApplied)+" ബാധകം"));
  return p.join(", ");
 }
 var oBd=window.billBreakdown;
 if(typeof oBd==="function") window.billBreakdown=function(t,q,c){
  var a=arguments, self=this;
  var cx=ctxOf(q); if(cx) cx.skipStd=true;
  var bd=withCtx(cx,function(){ return oBd.apply(self,a); });
  try{
   if(q&&q.ratePlan!=="drop"&&bd&&bd.r){
    var n=note(bd.r);
    if(n){ if(!q.ownSvcAuto) q.ownSvcBase=q.service||""; q.service=(q.ownSvcBase?q.ownSvcBase+" - ":"")+n; q.ownSvcAuto=1; }
    else if(q.ownSvcAuto){ q.service=q.ownSvcBase||""; q.ownSvcAuto=0; }
   }
  }catch(e){}
  return bd;
 };
 /* the quotation print / PDF work the fare out again from the category - give them the quote's own offer / minimum too */
 var oPq=window.printQuoteObj;
 if(typeof oPq==="function") window.printQuoteObj=function(q){
  var a=arguments, self=this, cx=ctxOf(q); if(cx) cx.skipStd=false;
  return withCtx(cx,function(){ return oPq.apply(self,a); });
 };
 var oPdf=window.downloadQuotePDFObj;
 if(typeof oPdf==="function") window.downloadQuotePDFObj=function(q){
  var cx=ctxOf(q), old=CTX; CTX=cx;
  var p; try{ p=oPdf.apply(this,arguments); }catch(e){ CTX=old; throw e; }
  return Promise.resolve(p).then(function(v){ CTX=old; return v; },function(e){ CTX=old; throw e; });
 };
 var oBuild=window.buildQuoteObjFromForm;
 if(typeof oBuild==="function") window.buildQuoteObjFromForm=function(r){
  var o=oBuild.apply(this,arguments);
  try{ var f=formVals(); o.ownMinFare=f?f.fare:0; o.ownMinKm=f?f.km:0; o.ownOffer=f&&f.offer?1:0; }catch(e){}
  return o;
 };
 var oQb=window.saveQuickBill;
 if(typeof oQb==="function") window.saveQuickBill=function(){
  var n=(db.quotes||[]).length, f=null;
  try{ f=formVals(); }catch(e){}
  var r=oQb.apply(this,arguments);
  try{ if(f&&(db.quotes||[]).length>n){ db.quotes[0].ownMinFare=f.fare; db.quotes[0].ownMinKm=f.km; db.quotes[0].ownOffer=f.offer?1:0; save2(); } }catch(e){}
  return r;
 };

 /* ---------- My Rate Master pages ---------- */
 function sumLine(c){
  var s=c.standard||{};
  return money(s.rate)+" / "+(+s.incKm||0)+" km / "+(+s.incHours||0)+" hr, "+money(s.addKm)+"/km"+(hasSet(c.offer1)?" · "+B("offer 1 day ","ഓഫർ 1 ദിവസം ")+money(c.offer1.rate):"")+(hasSet(c.offerM)?" · "+B("offer multi-day ","ഓഫർ മൾട്ടി ഡേ ")+money(c.offerM.rate)+"/"+B("day","ദിവസം"):"");
 }
 window.tcRmOpen=function(){
  if(!premium()){
   modal('<h2>'+E(B("My Rate Master","എൻ്റെ റേറ്റ് മാസ്റ്റർ"))+'</h2><p>'+E(B("Your own categories and charges for Quotations and Bills - for Premium plan owners.","ക്വട്ടേഷനും ബില്ലിനും സ്വന്തം കാറ്റഗറിയും ചാർജും - പ്രീമിയം പ്ലാൻ ഉടമകൾക്ക്."))+'</p><div class="actions"><button onclick="closeModal()">OK</button></div>');
   return;
  }
  var list=own(), rows="", hid="";
  list.forEach(function(c,i){
   if(c.hidden){ hid+='<div class="listitem" style="font-size:13px;opacity:.7"><b>'+E(c.name)+'</b> <button style="flex:none;padding:3px 12px;min-height:0;font-size:12px" onclick="tcRmHide('+i+',0)">'+E(B("Restore","തിരികെ"))+'</button></div>'; return; }
   rows+='<div class="listitem" style="font-size:13px"><b>'+E(c.name)+'</b><br><span class="muted">'+E(sumLine(c))+'</span><div class="actions" style="margin-top:4px"><button style="flex:none;padding:3px 16px;min-height:0;font-size:12px" onclick="tcRmEdit('+i+')">'+E(B("Edit","തിരുത്തുക"))+'</button></div></div>';
  });
  modal('<h2>'+E(B("My Rate Master","എൻ്റെ റേറ്റ് മാസ്റ്റർ"))+'</h2>'+
   '<p class="muted" style="font-size:12.5px">'+E(B("Your own categories and charges. In the Quotation / Quick Bill choose Rate: Mine. The Travel Connect Rate Master is not changed.","നിങ്ങളുടെ സ്വന്തം കാറ്റഗറിയും ചാർജും. ക്വട്ടേഷൻ / ക്വിക്ക് ബില്ലിൽ റേറ്റ്: എൻ്റേത് തിരഞ്ഞെടുക്കുക. ട്രാവൽ കണക്റ്റ് റേറ്റ് മാസ്റ്റർ മാറില്ല."))+'</p>'+
   (rows||'<p class="muted">'+E(B("No category yet.","കാറ്റഗറി ഒന്നുമില്ല."))+'</p>')+
   '<div class="actions"><button class="primary" onclick="tcRmEdit(-1)">+ '+E(B("New category","പുതിയ കാറ്റഗറി"))+'</button><button onclick="tcRmCopy()">'+E(B("Copy from Travel Connect","ട്രാവൽ കണക്റ്റിൽ നിന്ന് കോപ്പി"))+'</button><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>'+
   (hid?'<details style="margin-top:8px"><summary style="font-size:12.5px">'+E(B("Removed (old bills still use them)","നീക്കിയവ (പഴയ ബില്ലുകൾ ഉപയോഗിക്കുന്നു)"))+'</summary>'+hid+'</details>':''));
 };
 window.tcRmCopy=function(){
  if(!premium()) return;
  var have={}; own().forEach(function(c){ have[String(c.name||"").trim().toLowerCase()]=1; });
  var n=0;
  (db.categories||[]).forEach(function(c){
   var k=String(c&&c.name||"").trim().toLowerCase(); if(!k||have[k]) return;
   try{ var cp=JSON.parse(JSON.stringify(c)); delete cp.hidden; own().push(cp); have[k]=1; n++; }catch(e){}
  });
  if(n){ save2(); install(); }
  say(n?B(n+" categories copied - edit the rates as you like","കാറ്റഗറികൾ കോപ്പി ചെയ്തു ("+n+") - റേറ്റ് ആവശ്യമുള്ളത് പോലെ മാറ്റാം"):B("Nothing new to copy","കോപ്പി ചെയ്യാൻ പുതിയതൊന്നുമില്ല"));
  tcRmOpen();
 };
 window.tcRmHide=function(i,on){ var c=own()[i]; if(!c) return; c.hidden=!!on; save2(); tcRmOpen(); };
 function planFields(key,c){
  var p=(c&&c[key])||{};
  return '<div class="grid">'+FLD.map(function(f){ return '<label>'+E(B(f[1],f[2]))+'<input id="rm_'+key+'_'+f[0]+'" type="number" inputmode="decimal" value="'+((+p[f[0]]||0)?E(p[f[0]]):"")+'"></label>'; }).join("")+'</div>';
 }
 window.tcRmEdit=function(i){
  if(!premium()) return;
  var c=i>=0?own()[i]:{name:"",driverBata:0};
  if(!c) return;
  var more=PLANS.slice(1).map(function(p){ return '<h4 style="margin:8px 0 2px">'+E(B(p[1],p[2]))+'</h4>'+planFields(p[0],c); }).join("");
  modal('<h2>'+E(i>=0?B("Edit category","കാറ്റഗറി തിരുത്തുക"):B("New category","പുതിയ കാറ്റഗറി"))+'</h2>'+
   '<div class="grid"><label>'+E(B("Category name","കാറ്റഗറി പേര്"))+'<input id="rmName" value="'+E(c.name||"")+'"></label>'+
   '<label>'+E(B("Driver bata","ഡ്രൈവർ ബാറ്റ"))+'<input id="rmBata" type="number" inputmode="decimal" value="'+((+c.driverBata||0)?E(c.driverBata):"")+'"></label>'+
   '</div>'+
   '<h4 style="margin:8px 0 2px">'+E(B("Standard rate","സ്റ്റാൻഡേർഡ് റേറ്റ്"))+'</h4>'+planFields("standard",c)+
   '<details style="margin-top:6px"><summary style="font-size:13px;cursor:pointer">'+E(B("More rates (empty = same as Standard)","കൂടുതൽ റേറ്റുകൾ (ഒഴിച്ചിട്ടാൽ Standard പോലെ)"))+'</summary>'+more+'</details>'+
   '<details style="margin-top:6px"'+((hasSet(c.offer1)||hasSet(c.offerM))?' open':'')+'><summary style="font-size:13px;cursor:pointer">'+E(B("Offer package for special customers (optional)","പ്രത്യേക കസ്റ്റമർക്കുള്ള ഓഫർ പാക്കേജ് (ഓപ്ഷണൽ)"))+'</summary>'+
   '<div class="muted" style="font-size:12px">'+E(B("Amount = the bill never goes below it. Used when you switch Offer package on in the Quotation / Bill.","തുക = ബില്ല് ഇതിൽ കുറയില്ല. ക്വട്ടേഷൻ / ബില്ലിൽ ഓഫർ പാക്കേജ് ഓൺ ആക്കുമ്പോൾ ഉപയോഗിക്കും."))+'</div>'+
   '<h4 style="margin:8px 0 2px">'+E(B("One-day trip","ഒരു ദിവസ ട്രിപ്പ്"))+'</h4>'+planFields("offer1",c)+
   '<h4 style="margin:8px 0 2px">'+E(B("Multi-day trip (per day)","മൾട്ടി ഡേ ട്രിപ്പ് (ഒരു ദിവസത്തിന്)"))+'</h4>'+planFields("offerM",c)+'</details>'+
   '<div id="rmErr" class="danger" style="font-size:12.5px"></div>'+
   '<div class="actions"><button class="primary" onclick="tcRmSave('+i+')">'+E(B("Save","സേവ്"))+'</button>'+(i>=0?'<button class="danger" onclick="tcRmHide('+i+',1)">'+E(B("Remove","നീക്കുക"))+'</button>':'')+'<button onclick="tcRmOpen()">'+E(B("Back","പിന്നോട്ട്"))+'</button></div>');
 };
 function readPlan(key){
  var o={}; FLD.forEach(function(f){ var el=$("rm_"+key+"_"+f[0]); o[f[0]]=Math.max(0,parseFloat(el&&el.value)||0); }); return o;
 }
 window.tcRmSave=function(i){
  if(!premium()) return;
  var name=String(($("rmName")||{}).value||"").trim();
  if(!name){ $("rmErr").textContent=B("Enter the category name","കാറ്റഗറി പേര് നൽകുക"); return; }
  var std=readPlan("standard");
  if(!(std.rate>0)){ $("rmErr").textContent=B("Enter the Standard base rate","Standard ബേസ് റേറ്റ് നൽകുക"); return; }
  var c={name:name,driverBata:Math.max(0,parseFloat($("rmBata").value)||0),standard:std};
  var o1=readPlan("offer1"), oM=readPlan("offerM");
  if(o1.rate>0) c.offer1=o1; if(oM.rate>0) c.offerM=oM;
  PLANS.slice(1).forEach(function(p){
   var v=readPlan(p[0]);
   c[p[0]]=(v.rate>0||v.addKm>0||v.addHour>0||v.incKm>0)?v:JSON.parse(JSON.stringify(std));
  });
  if(i>=0){ var old=own()[i]; if(old&&old.hidden) c.hidden=true; own()[i]=c; } else own().push(c);
  save2(); install(); say(B("Saved","സേവ് ചെയ്തു")); tcRmOpen();
 };
 /* ---------- Menu ---------- */
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var body=$("modalBody");
   if(body&&!body.querySelector("#tcRmMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcRmMenu";
    wrap.innerHTML=tcMenuItem('<rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M8 8h8M8 12h8M8 16h5"></path>',B("My Rate Master","എൻ്റെ റേറ്റ് മാസ്റ്റർ")+(premium()?'':' <span style="font-weight:400;color:#5b6b7a">(Premium)</span>'),"closeModal();setTimeout(tcRmOpen,60)");
    var dm=body.querySelector("#tcWaSelMenu")||body.querySelector("#tcDateFmtMenu");
    if(dm&&dm.parentNode) dm.parentNode.insertBefore(wrap,dm.nextSibling);
    else{ var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null; if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap); }
   }
  }catch(e){}
  return r;
 };
 /* the own categories are part of the Premium cloud backup */
 try{ if(typeof TC_BK_LISTS!=="undefined"&&TC_BK_LISTS.indexOf("ownCats")<0) TC_BK_LISTS.push("ownCats"); }catch(e){}
})();
