/* Customer fare calculator shows an APPROXIMATE RANGE (tc-custfare.js, loaded by tc-regdocs.js).
   Owner's request (2026-10-22): showing one figure can look too high (or too exact). The customer page now shows
   "Approx. Rs.LOW - Rs.HIGH": LOW = the better of (this trip's own rate: Local / Drop / Competitive) and the Standard rate,
   HIGH = the other one; both rounded to the nearest Rs.50 (LOW down, HIGH up). A clear notice says it is only the app's estimate,
   not the actual fare, and to contact the travel agency / vehicle driver for the real charge.
   Wraps calcCustomerFare() (cs.js): the original validates and prints a single fare, this replaces that figure with the range.
   Invalid cases (e.g. Local limit exceeded) keep the original message. Nothing is stored. */
(function(){
 if(window.__tcCustFare) return;
 window.__tcCustFare=1;
 var o=window.calcCustomerFare;
 if(typeof o!=="function") return;
 function lang(){ try{ return tcLang(); }catch(e){ return "en"; } }
 function m(n){ try{ return money(n); }catch(e){ return "₹"+n; } }
 window.calcCustomerFare=function(){
  var r=o.apply(this,arguments);
  try{
   var box=document.querySelector("#cResult"); if(!box||!box.querySelector(".total")) return r;
   var catIdx=document.querySelector("#cCat").value, type=document.querySelector("#cType").value;
   var c=db.categories[+catIdx]; if(!c) return r;
   var km=+document.querySelector("#cKm").value||0, h=+document.querySelector("#cHours").value||0;
   var days=+document.querySelector("#cDays").value||1, rest=+document.querySelector("#cRestHours").value||0;
   var plan=(type==="local")?"local":(type==="drop")?"drop":"competitive";
   var own=calcFare(c,plan,km,h,days,rest,{}), std=calcFare(c,"standard",km,h,days,rest,{});
   if(!own||own.invalid||!std||std.invalid) return r;
   var a=Math.min(own.total,std.total), b=Math.max(own.total,std.total);
   var lo=Math.floor(a/50)*50, hi=Math.ceil(b/50)*50;
   var ml=lang()==="ml";
   var head=lo===hi?(ml?"ഏകദേശം ":"Approx. ")+m(lo):(ml?"ഏകദേശം ":"Approx. ")+m(lo)+" – "+m(hi);
   var note=ml
    ?"ഇത് യഥാർത്ഥ ചാർജ് അല്ല. ഏകദേശം ഒരു ധാരണ കിട്ടാൻ വേണ്ടി ആപ്പ് കണക്കാക്കിയ ഒരു നിഗമനം മാത്രമാണ്. യഥാർത്ഥ ചാർജ് അറിയാൻ ട്രാവൽ ഏജൻസിയുമായോ വാഹന ഡ്രൈവറുമായോ നേരിട്ട് ബന്ധപ്പെടുക."
    :"This is not the actual fare. It is only the app's own estimate, to give you a rough idea. To know the actual charge, please contact the travel agency or the vehicle driver directly.";
   var btn=ml?"ബുക്ക് ചെയ്യാൻ പാർട്ണറെ കണ്ടെത്തുക":"Find a partner to book";
   box.innerHTML='<div class="total" id="tcCfRange">'+head+'</div>'+
    '<div class="muted" id="tcCfNote" style="margin-top:6px">'+note+'</div>'+
    '<div class="actions" style="margin-top:8px"><button onclick="tcOpenDirectory()">'+btn+'</button></div>';
  }catch(e){}
  return r;
 };
})();
