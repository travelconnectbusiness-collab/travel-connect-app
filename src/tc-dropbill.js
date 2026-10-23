/* Drop trips use the Drop rate (tc-dropbill.js, loaded by tc-regdocs.js).
   Owner's case (2026-10-21): a Drop trip bill showed "Included coverage 80 KM / 8 hrs, extra KM Rs.21" and
   Standard Rs.2,800 / Offer Rs.2,500 - the Competitive day package - not his Drop rate (first 5 KM / 1 hr, then Rs.42 per KM).
   Cause: in Quick Bill the "Trip type" and the "Rate" were two separate boxes; choosing Drop left the Rate on Competitive
   (the Quotation form already switched it by itself).
   1) Quick Bill: choosing Trip type Drop / Local now selects the Drop / Local rate by itself (any other type puts a Drop / Local rate
      back to Competitive). The Rate box can still be changed by hand afterwards.
   (A later idea to show no Standard comparison on Drop bills was dropped on 2026-10-22: a Drop bill shows "Standard vs Offer" and the
   saving like every other trip, Standard = the Standard rate for the same KM / hours.)
   2) (2026-10-24) The form opens with Trip type Local Trip already chosen: the Rate box is now set to Local at once, not only after the type is changed.
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
 /* the form opens with Trip type "Local Trip" already chosen - bring the Rate box in line at once (before, it stayed on Competitive until the type was changed) */
 var origOpen=window.openQuickBillForm;
 if(typeof origOpen==="function") window.openQuickBillForm=function(){ var r=origOpen.apply(this,arguments); try{ sync(); }catch(x){} return r; };
 document.addEventListener("change",function(e){ try{ if(e.target&&e.target.id==="qbType") sync(); }catch(x){} },true);
})();
