/* Drop bills: Minimum charge + Return KM (tc-dropmin.js, loaded by tc-regdocs.js after tc-dropbill.js).
   Owner's case (2026-10-22): the Kannur Airport drop has been Rs.2,500 for years; the Drop rate alone would lower it.
   Quick Bill, when the Rate is "Drop", gets three extra boxes:
   1) KM method:  "Drop point KM only" = the Drop rate as it is (e.g. first 5 KM Rs.500, then Rs.42/KM)  or
                  "Trip KM + Return KM" = first (2 x included KM) = 10 KM Rs.500, then half the additional rate = Rs.21/KM.
                  Follows each vehicle category's own Drop rate.
   2) Return KM = km from the drop place back to the garage (recorded separately; added to the trip KM for the fare).
   3) Minimum charge (optional): the fare is never lower than this (Rs.2,500). A higher KM fare is charged as it is.
   Stored on the Quote: dropMode ("oneway"|"return"), returnKm, minCharge. Everything is calculated in billFinalAmount(), so
   the bill, print, PDF, bill list and day book all agree, and editing the trip KM later recalculates.
   4) Trip types "Airport Trip" and "Railway Station Trip" (same fare as a One Day trip: the Competitive package, KM garage to garage)
      and an optional "Trip name" box (e.g. "Airport drop", "Railway station pickup") that prints on the bill as the Service line.
      Nothing typed = the bill shows only the trip type.
   The bill shows the working in its "Service" line ("Drop: 45 KM + 15 KM return = 60 KM at Rs.21/KM, minimum charge Rs.2,500 applied"). */
(function(){
 if(window.__tcDropMin) return;
 window.__tcDropMin=1;
 var CTX=null;
 function ctxOf(q){
  if(!q||q.ratePlan!=="drop") return null;
  var mode=q.dropMode==="return"?"return":"oneway";
  return {mode:mode, ret:mode==="return"?(Number(q.returnKm)||0):0, min:Number(q.minCharge)||0};
 }
 /* "Trip KM + Return KM" method: included KM = double the Drop rate's included KM (5 -> 10), per KM = half the Drop rate's
    additional KM rate (42 -> 21). Both follow each vehicle category's own Drop rate; c.drop.retIncKm / c.drop.retAddKm win if ever set. */
 function retTerms(c){
  var d=c&&c.drop?c.drop:{}, inc=Number(d.incKm)||0, a=Number(d.addKm)||0;
  return {inc:d.retIncKm!=null&&d.retIncKm!==""?Number(d.retIncKm):inc*2, add:d.retAddKm!=null&&d.retAddKm!==""?Number(d.retAddKm):Math.round(a/2*100)/100};
 }
 function withCtx(x,fn){ var old=CTX; CTX=x; try{ return fn(); } finally{ CTX=old; } }

 /* calcFare: while a Drop bill is being worked out, add the return KM, use the half rate and apply the minimum charge. */
 var origCalc=window.calcFare;
 if(typeof origCalc==="function") window.calcFare=function(c,plan,km,h,days,rest,ov){
  var x=CTX;
  if(!x||plan!=="drop") return origCalc.apply(this,arguments);
  ov=Object.assign({},ov||{});
  var cc=c;
  if(x.mode==="return"&&c&&c.drop){ var rt0=retTerms(c); cc=Object.assign({},c,{drop:Object.assign({},c.drop,{incKm:rt0.inc,addKm:rt0.add})}); }
  var r=origCalc.call(this,cc,plan,(Number(km)||0)+x.ret,h,days,rest,ov);
  if(r&&!r.invalid&&x.min>0&&r.total<x.min){ r.extra=(r.extra||0)+(x.min-r.total); r.total=x.min; r.minApplied=x.min; }
  return r;
 };
 var origFinal=window.billFinalAmount;
 if(typeof origFinal==="function") window.billFinalAmount=function(t,q,c){
  var a=arguments, self=this;
  return withCtx(ctxOf(q),function(){ return origFinal.apply(self,a); });
 };

 function note(t,q,c,bd){
  var x=ctxOf(q); if(!x) return "";
  if(!(x.ret>0||x.min>0)) return "";
  var km=(Number(t.actualKm||q.estimatedKm)||0), p=[];
  if(x.ret>0) p.push(km+" KM + "+x.ret+" KM return = "+(km+x.ret)+" KM at "+(typeof money==="function"?money(bd.r.addKm):bd.r.addKm)+"/KM");
  if(bd.r.minApplied) p.push("minimum charge "+money(bd.r.minApplied)+" applied");
  else if(x.min>0) p.push("minimum charge "+money(x.min)+" (KM fare is higher)");
  return "Drop: "+p.join(", ");
 }
 var origBd=window.billBreakdown;
 if(typeof origBd==="function") window.billBreakdown=function(t,q,c){
  var bd=origBd.apply(this,arguments);
  try{
   var x=ctxOf(q);
   if(x&&bd&&bd.r){
    bd.km=(Number(bd.km)||0)+x.ret;
    if(!bd.r.invalid){
     /* a Drop bill is not compared with the Standard day package: Standard = Offer */
     bd.standardRaw=Object.assign({},bd.r); bd.rateSaving=0; bd.totalSavings=(bd.quoteDiscount||0)+(bd.manualDiscount||0);
    }
    var n=note(t,q,c,bd), base=q.tripName||"";
    if(n){ q.service=base?base+" - "+n:n; q.svcAuto=1; }
    else if(q.svcAuto){ q.service=base; q.svcAuto=0; }
   }
  }catch(e){}
  return bd;
 };

 /* ---- Quick Bill form ---- */
 function $(id){ return document.getElementById(id); }
 function dropCat(){ var cs=$("qbCat"); if(!cs||cs.value==="") return null; var c=db.categories[+cs.value]; return c&&c.drop?c:null; }
 function fmt(n){ return typeof money==="function"?money(n):("Rs."+n); }
 function refreshLabels(){
  var m=$("qbDropMode"); if(!m) return;
  var c=dropCat(), t=c?retTerms(c):null;
  m.options[0].textContent="Drop point KM only"+(c?" (first "+(Number(c.drop.incKm)||0)+" KM "+fmt(c.drop.rate)+", then "+fmt(c.drop.addKm)+"/KM)":"");
  m.options[1].textContent="Trip KM + Return KM"+(c?" (first "+t.inc+" KM "+fmt(c.drop.rate)+", then "+fmt(t.add)+"/KM)":"");
 }
 function toggle(){
  var box=$("qbDropBox"), rt=$("qbRate"); if(!box||!rt) return;
  var on=rt.value==="drop"; box.style.display=on?"":"none";
  var m=$("qbDropMode"), rk=$("qbRetKmLbl");
  if(rk) rk.style.display=(on&&m&&m.value==="return")?"":"none";
  refreshLabels();
 }
 function inject(){
  var rt=$("qbRate"); if(!rt||$("qbDropBox")) return;
  var grid=rt.closest(".grid"); if(!grid) return;
  var d=document.createElement("div"); d.id="qbDropBox"; d.className="ratebox"; d.style.display="none"; d.style.margin="8px 0";
  d.innerHTML='<b>Drop trip charges</b><div class="grid">'+
   '<label>Minimum charge (optional)<input id="qbMinCharge" type="number" inputmode="decimal" placeholder="e.g. 2500"></label>'+
   '<label>KM method<select id="qbDropMode"><option value="oneway">Drop point KM only</option><option value="return">Trip KM + Return KM</option></select></label>'+
   '<label id="qbRetKmLbl" style="display:none">Return KM (drop place to garage)<input id="qbRetKm" type="number" inputmode="decimal" value="0"></label></div>'+
   '<div class="muted">Fare = the higher of the minimum charge and the KM fare. In "Trip KM + Return KM" give the whole trip KM above (garage to drop place) and only the way back here.</div>';
  grid.parentNode.insertBefore(d,grid.nextSibling);
  var ty=$("qbType");
  if(ty&&!Array.prototype.some.call(ty.options,function(o){ return o.value==="airport"; })){
   [["airport","Airport Trip"],["station","Railway Station Trip"]].forEach(function(p){
    var op=document.createElement("option"); op.value=p[0]; op.textContent=p[1]; ty.appendChild(op);
   });
  }
  if(ty&&!$("qbTripName")){
   var l=ty.closest("label"), n=document.createElement("label");
   n.innerHTML='Trip name (optional, printed on the bill)<input id="qbTripName" placeholder="Airport drop / Airport pickup / Railway station drop / Railway station pickup">';
   if(l&&l.parentNode) l.parentNode.insertBefore(n,l.nextSibling);
  }
  toggle();
 }
 var oq=window.openQuickBillForm;
 if(typeof oq==="function") window.openQuickBillForm=function(){
  var r=oq.apply(this,arguments);
  try{ inject(); }catch(e){}
  return r;
 };
 document.addEventListener("change",function(e){
  try{ var id=e.target&&e.target.id; if(id==="qbType"||id==="qbRate"||id==="qbDropMode"||id==="qbCat") toggle(); }catch(x){}
 },true);

 function formCtx(){
  var rt=$("qbRate"); if(!rt||rt.value!=="drop"||!$("qbDropBox")) return null;
  var ret=$("qbDropMode").value==="return"?(Number($("qbRetKm").value)||0):0;
  return {mode:$("qbDropMode").value==="return"?"return":"oneway", ret:ret, min:Number($("qbMinCharge").value)||0};
 }
 var op=window.calcQuickBillPreview;
 if(typeof op==="function") window.calcQuickBillPreview=function(){
  var a=arguments, self=this, x=formCtx();
  var r=withCtx(x,function(){ return op.apply(self,a); });
  try{
   var box=$("qbResult");
   if(x&&box&&box.querySelector(".total")&&(x.ret>0||x.min>0)){
    var km=Number($("qbKm").value)||0, p=[];
    if(x.ret>0) p.push(km+" KM + "+x.ret+" KM return = "+(km+x.ret)+" KM");
    if(x.min>0) p.push("minimum charge "+fmt(x.min));
    box.insertAdjacentHTML("beforeend",'<div class="muted">'+p.join(", ")+'</div>');
   }
  }catch(e){}
  return r;
 };
 var os=window.saveQuickBill;
 if(typeof os==="function") window.saveQuickBill=function(){
  var x=formCtx(), n0=db.quotes.length, first=db.quotes[0];
  var tyEl=$("qbType"), airLbl=tyEl&&{airport:"Airport Trip",station:"Railway Station Trip"}[tyEl.value]||"", nameEl=$("qbTripName"), tname=nameEl?nameEl.value.trim():"";
  var r=os.apply(this,arguments);
  try{
   if((airLbl||tname)&&db.quotes.length>n0&&db.quotes[0]!==first){
    var q0=db.quotes[0];
    if(airLbl) q0.type=airLbl;
    if(tname){ q0.tripName=tname; q0.service=tname; }
    save();
   }
   if(x&&db.quotes.length>n0&&db.quotes[0]!==first){
    var q=db.quotes[0], t=db.trips[0];
    q.dropMode=x.mode; q.returnKm=x.ret; q.minCharge=x.min;
    var c=db.categories[q.categoryId], fa=window.billFinalAmount(t,q,c);
    if(fa&&!fa.invalid){ q.subtotal=fa.total; q.quotedAmount=fa.total; }
    if(typeof window.billBreakdown==="function") window.billBreakdown(t,q,c);
    save();
    if(document.querySelector("#billBox")&&document.querySelector("#billTrip")&&typeof loadBill==="function") loadBill();
   }
  }catch(e){}
  return r;
 };
 var ol=window.loadBill;
 if(typeof ol==="function") window.loadBill=function(){
  var r=ol.apply(this,arguments);
  try{
   var bt=document.querySelector("#billTrip"), bb=document.querySelector("#billBox");
   var t=bt&&db.trips.find(function(x){ return x.id===bt.value; });
   var q=t&&db.quotes.find(function(x){ return x.id===t.quoteId; });
   if(q&&(q.svcAuto||q.tripName)&&q.service&&bb&&!bb.querySelector("#tcDropNote")){
    var h=bb.querySelector("h3"); if(h) h.insertAdjacentHTML("beforebegin",'<div id="tcDropNote" class="muted"><b>'+String(q.service).replace(/&/g,"&amp;").replace(/</g,"&lt;")+'</b></div>');
   }
  }catch(e){}
  return r;
 };
})();
