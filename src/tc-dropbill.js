/* Drop trips use the Drop rate (tc-dropbill.js, loaded by tc-regdocs.js).
   Owner's case (2026-10-21): a Drop trip bill showed "Included coverage 80 KM / 8 hrs, extra KM Rs.21" and
   Standard Rs.2,800 / Offer Rs.2,500 - the Competitive day package - not his Drop rate (first 5 KM / 1 hr, then Rs.42 per KM).
   Cause: in Quick Bill the "Trip type" and the "Rate" were two separate boxes; choosing Drop left the Rate on Competitive
   (the Quotation form already switched it by itself).
   1) Quick Bill: choosing Trip type Drop / Local now selects the Drop / Local rate by itself (any other type puts a Drop / Local rate
      back to Competitive). The Rate box can still be changed by hand afterwards.
   2) A bill made on the Drop rate is no longer compared with the Standard day package (it said "Standard Rs.2,800 vs Offer"
      and counted the difference as the customer's "savings", which is not true for a drop). Standard = Offer = the Drop fare;
      only a real discount you give is shown as savings.
   Nothing else about the fare calculation changes. */
(function(){
 if(window.__tcDropBill) return;
 window.__tcDropBill=1;
 function sync(){
  var ty=document.getElementById("qbType"), rt=document.getElementById("qbRate");
  if(!ty||!rt) return;
  var has=function(v){ return Array.prototype.some.call(rt.options,function(o){ return o.value===v; }); };
  if(ty.value==="drop"&&has("drop")) rt.value="drop";
  else if(ty.value==="local"&&has("local")) rt.value="local";
  else if((rt.value==="drop"||rt.value==="local")&&has("competitive")) rt.value="competitive";
 }
 document.addEventListener("change",function(e){ try{ if(e.target&&e.target.id==="qbType") sync(); }catch(x){} },true);
 var orig=window.billBreakdown;
 if(typeof orig==="function") window.billBreakdown=function(t,q,c){
  var bd=orig.apply(this,arguments);
  try{
   if(q&&q.ratePlan==="drop"&&bd&&bd.r){
    var days=t.days||q.days||1, rest=t.restHours!=null?t.restHours:(q.restHours||0);
    var sr=calcFare(c,"drop",bd.km,bd.h,days,rest,{addKm:q.overrideAddKm,addHour:q.overrideAddHour});
    if(sr&&!sr.invalid){ bd.standardRaw=sr; bd.rateSaving=0; bd.totalSavings=(bd.quoteDiscount||0)+(bd.manualDiscount||0); }
   }
  }catch(e){}
  return bd;
 };
})();
