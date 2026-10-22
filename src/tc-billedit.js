/* Edit the whole bill (tc-billedit.js, loaded by tc-regdocs.js).
   Owner's case (2026-10-22): a Quick Bill made as "Drop" could not be changed to "Airport Trip" afterwards - the bill screen only had
   "Edit trip details" (dates, KM, hours, driver, other charges) and "Adjust Final Bill Amount".
   New button "Edit full bill" on the bill screen (next to those two) opens a form with everything a Quick Bill was made with:
     customer name / mobile, trip type (incl. Airport Trip / Railway Station Trip), vehicle category, rate, vehicle, vehicle number,
     start / destinations / closing point, trip date, extra KM / extra hour rate overrides, trip name,
     and, when the rate is Drop: minimum charge, KM method (drop point KM only / trip KM + return KM) and return KM.
   Choosing a trip type also picks its rate (Drop -> Drop rate, Local -> Local rate, anything else -> Competitive, as in Quick Bill);
   the rate can still be changed by hand. Payments already received stay; the bill amount is recalculated.
   If the new rate cannot be used (e.g. Local rate for more than the Local limit KM) nothing is saved and the reason is shown.
   Unedited book entries made from this bill's payments follow the new customer / vehicle.
   Works on the quote + trip behind the bill (a Quick Bill is exactly one quote + one trip). */
(function(){
 if(window.__tcBillEdit) return;
 window.__tcBillEdit=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var $=function(id){ return document.getElementById(id); };
 var TYPES=[["local","Local Trip"],["one_day","One Day"],["round","Round Trip"],["outstation","Outstation"],["drop","Drop"],["airport","Airport Trip"],["station","Railway Station Trip"]];
 function typeCode(v){
  v=String(v||"");
  for(var i=0;i<TYPES.length;i++){ if(TYPES[i][0]===v||TYPES[i][1]===v) return TYPES[i][0]; }
  return "";
 }
 function typeValue(code){
  if(code==="airport") return "Airport Trip";
  if(code==="station") return "Railway Station Trip";
  return code;
 }
 function find(id){
  var t=(db.trips||[]).filter(function(x){ return x.id===id; })[0]; if(!t) return null;
  var q=(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]; if(!q) return null;
  return {t:t,q:q};
 }
 function hasOpt(sel,v){ return Array.prototype.some.call(sel.options,function(o){ return o.value===v; }); }

 window.tcBeOpen=function(tripId){
  var x=find(tripId); if(!x) return;
  var t=x.t, q=x.q;
  var dests=(q.destinations&&q.destinations.length)?q.destinations.join(", "):(q.destination||"");
  var code=typeCode(q.type);
  var typeOpts=(code?"":'<option value="">'+E(q.type||"-")+' (keep)</option>')+TYPES.map(function(p){ return '<option value="'+p[0]+'">'+E(p[1])+'</option>'; }).join("");
  modal('<h2>Edit full bill</h2>'+
   '<p class="muted">Payments already received stay. The bill amount is calculated again from the new details.</p>'+
   '<div class="grid">'+
   '<label>Customer name<input id="beName" value="'+E(t.customer||q.customer||"")+'"></label>'+
   '<label>Customer mobile<input id="beMobile" value="'+E(q.mobile||"")+'"></label>'+
   '<label>Trip type<select id="beType">'+typeOpts+'</select></label>'+
   '<label>Trip name (optional, printed on the bill)<input id="beTripName" value="'+E(q.tripName||"")+'" placeholder="Airport drop / Railway station pickup"></label>'+
   '<label>Vehicle category<select id="beCat">'+tcCategoryOptions()+'</select></label>'+
   '<label>Rate<select id="beRate">'+rateOptions()+'</select></label>'+
   '<label>Vehicle<input id="beVeh" value="'+E(q.vehicle||"")+'"></label>'+
   '<label>Vehicle number<input id="beVehNo" value="'+E(q.vehicleNo||"")+'"></label>'+
   '<label>Start point<input id="bePickup" value="'+E(t.pickup||q.pickup||"")+'"></label>'+
   '<label>Destinations (separate with commas)<input id="beDest" value="'+E(t.dest||dests)+'"></label>'+
   '<label>Closing point<input id="beReturn" value="'+E(t.returnPoint||q.returnPoint||"")+'"></label>'+
   '<label>Trip date'+tcDateInputHtml("beDate",t.startDate||q.startDate||"")+'</label>'+
   '<label>Override Extra KM Rate (optional)<input id="beOvKm" type="number" value="'+E(q.overrideAddKm||"")+'"></label>'+
   '<label>Override Extra Hour Rate (optional)<input id="beOvHr" type="number" value="'+E(q.overrideAddHour||"")+'"></label>'+
   '</div>'+
   '<div id="beDropBox" class="ratebox" style="display:none;margin:8px 0"><b>Drop trip charges</b><div class="grid">'+
   '<label>Minimum charge (optional)<input id="beMin" type="number" value="'+E(q.minCharge||"")+'"></label>'+
   '<label>KM method<select id="beMode"><option value="oneway">Drop point KM only</option><option value="return">Trip KM + Return KM</option></select></label>'+
   '<label>Return KM (drop place to garage)<input id="beRet" type="number" value="'+E(q.returnKm||0)+'"></label></div></div>'+
   '<div class="actions"><button class="primary" onclick="tcBeSave(\''+E(tripId)+'\')">Save bill</button><button onclick="closeModal()">Cancel</button></div>');
  $("beType").value=code||"";
  $("beCat").value=(q.categoryId!=null&&q.categoryId!=="")?String(q.categoryId):"";
  var rt=$("beRate"), rp=q.ratePlan||"competitive";
  if(!hasOpt(rt,rp)){ var o=document.createElement("option"); o.value=rp; o.textContent=rp; rt.appendChild(o); }
  rt.value=rp;
  $("beMode").value=q.dropMode==="return"?"return":"oneway";
  toggle();
 };
 function toggle(){
  var rt=$("beRate"), box=$("beDropBox"); if(!rt||!box) return;
  box.style.display=rt.value==="drop"?"":"none";
 }
 document.addEventListener("change",function(e){
  try{
   var id=e.target&&e.target.id;
   if(id==="beType"){
    var ty=e.target.value, rt=$("beRate");
    if(rt){
     if(ty==="drop"&&hasOpt(rt,"drop")) rt.value="drop";
     else if(ty==="local"&&hasOpt(rt,"local")) rt.value="local";
     else if(ty&&(rt.value==="drop"||rt.value==="local")&&hasOpt(rt,"competitive")) rt.value="competitive";
    }
    toggle();
   }
   if(id==="beRate") toggle();
  }catch(x){}
 },true);

 window.tcBeSave=function(tripId){
  var x=find(tripId); if(!x) return;
  var t=x.t, q=x.q;
  var name=$("beName").value.trim();
  if(!name){ say("Enter the customer's name"); return; }
  if($("beCat").value===""){ say("Select a Vehicle Category"); return; }
  var date=tcReadDateInput("beDate");
  if(date===null){ say("Enter the trip date as DD-MM-YYYY"); return; }
  var catIdx=+$("beCat").value, c=db.categories[catIdx];
  var ratePlan=$("beRate").value, code=$("beType").value;
  var destList=$("beDest").value.split(",").map(function(s){ return s.trim(); }).filter(Boolean);
  var drop=ratePlan==="drop";
  var nq=Object.assign({},q,{
   customer:name,mobile:$("beMobile").value.trim(),
   type:code?typeValue(code):q.type,category:c.name,categoryId:catIdx,ratePlan:ratePlan,
   vehicle:$("beVeh").value.trim(),vehicleNo:$("beVehNo").value.trim(),
   pickup:$("bePickup").value.trim(),destinations:destList,destination:destList[0]||"",returnPoint:$("beReturn").value.trim(),
   startDate:date||q.startDate||"",
   overrideAddKm:$("beOvKm").value||"",overrideAddHour:$("beOvHr").value||"",
   dropMode:drop&&$("beMode").value==="return"?"return":"oneway",
   returnKm:drop&&$("beMode").value==="return"?(+$("beRet").value||0):0,
   minCharge:drop?(+$("beMin").value||0):0,
   tripName:$("beTripName").value.trim()
  });
  nq.service=nq.tripName; nq.svcAuto=0;
  var nt=Object.assign({},t,{customer:name,pickup:nq.pickup,dest:destList.join(", "),returnPoint:nq.returnPoint,startDate:nq.startDate});
  var fa;
  try{ fa=billFinalAmount(nt,nq,c); }catch(e){ fa=null; }
  if(!fa){ say("Could not work out the bill with these details"); return; }
  if(fa.invalid){ say(fa.reason||"These details do not work with the chosen rate"); return; }
  Object.assign(q,nq);
  Object.assign(t,nt);
  q.subtotal=fa.total; q.quotedAmount=fa.total;
  try{ if(typeof window.billBreakdown==="function") window.billBreakdown(t,q,c); }catch(e){}   /* refreshes the Drop working line */
  /* the book entries made from this bill's payments follow the new customer / vehicle (edited ones are left alone) */
  try{
   var a=window.__tcAbApi;
   if(a&&a.entries){
    var v=a.matchVehicle?a.matchVehicle(q.vehicleNo,q.vehicle):null;
    a.entries().forEach(function(e){
     if(e.tripId!==t.id||e.src!=="bill"||e.edited) return;
     e.customer=name; e.vehNo=q.vehicleNo; e.vehName=q.vehicle; e.vehId=v?v.id:"";
     if(a.routeOf) e.route=a.routeOf(t,q);
    });
   }
  }catch(e){}
  save(); closeModal(); say("Bill updated");
  if(document.querySelector("#billBox")&&document.querySelector("#billTrip")) loadBill();
 };

 /* the button on the bill screen */
 var ol=window.loadBill;
 if(typeof ol==="function") window.loadBill=function(){
  var r=ol.apply(this,arguments);
  try{
   var bb=$("billBox"), bt=$("billTrip");
   if(bb&&bt&&bt.value&&!bb.querySelector("#tcBeBtn")){
    var first=bb.querySelector(".actions");
    if(first){
     var b=document.createElement("button"); b.id="tcBeBtn"; b.type="button"; b.textContent="Edit full bill (type / category / rate / customer)";
     b.setAttribute("onclick","tcBeOpen('"+bt.value+"')");
     first.appendChild(b);
    }
   }
  }catch(e){}
  return r;
 };
})();
