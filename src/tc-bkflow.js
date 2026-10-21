/* Booking -> Live trip -> Bill without typing the customer again (tc-bkflow.js, loaded by tc-regdocs.js).
   Owner's problem (2026-10-21): the booking was confirmed, but the Live Trip log and the Bill had to be started from
   scratch (customer name, mobile, vehicle ... typed again) and nothing said what to do when the trip was over.
   Every booking card in Booking Schedule now shows ONE status line and the next step:
     not started  : [Start trip]  [Make bill]  [Trip done]
     on the road  : [Open trip log]  [End trip & bill]
     trip ended   : [Make bill]
     billed       : status "Billed" + [Open bill]
   - Start trip opens the normal "Start New Trip" form already filled (customer, mobile, vehicle, driver); the trip log remembers the booking.
   - Make bill opens the normal Quick Bill form already filled (or, after a trip log, the bill form filled from the log: KM, hours, stops).
   - When that bill is created the booking remembers the trip (tripId) so its money shows in Trip & Accounts under the same trip.
   - Trip done = just marks the booking finished (no bill yet). Partner bookings get Make bill / Trip done only.
   Nothing is deleted or changed in the existing forms; the extra fields on the booking are lt (trip log id) and done. */
(function(){
 if(window.__tcBkFlow) return;
 window.__tcBkFlow=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){} };
 function $(id){ return document.getElementById(id); }
 function bById(id){ return (db.bookings||[]).filter(function(b){ return b.id===id; })[0]||null; }
 function ltOf(b){ return b&&b.lt?(db.liveTrips||[]).filter(function(t){ return t.id===b.lt; })[0]||null:null; }
 function trOf(b){ return b&&b.tripId?(db.trips||[]).filter(function(t){ return t.id===b.tripId; })[0]||null:null; }
 function qOf(b){ return b&&b.quoteId?(db.quotes||[]).filter(function(q){ return q.id===b.quoteId; })[0]||null:null; }
 function persist(){ try{ save(); }catch(e){} }
 function refresh(){ try{ if(window.__tcEnqApi&&window.__tcEnqApi.refresh) window.__tcEnqApi.refresh(); }catch(e){} }
 function setIf(id,v){ var e=$(id); if(e&&v!=null&&v!=="") e.value=v; }
 function billed(b){ var t=trOf(b); return !!(t&&(t.billNo||t.status==="completed")); }
 function chip(t,bg,fg){ return '<span style="display:inline-block;background:'+bg+';color:'+fg+';border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700;margin:0 4px 2px 0">'+E(t)+'</span>'; }
 function btn(label,fn,primary){ return '<button'+(primary?' class="primary"':'')+' onclick="'+fn+'">'+E(label)+'</button>'; }

 /* state of a booking: "billed" | "road" | "ended" | "done" | "new" */
 function state(b){
  if(billed(b)) return "billed";
  var l=ltOf(b);
  if(l){ if(l.status==="active") return "road"; if(l.status==="billed"&&trOf(b)) return "billed"; return "ended"; }
  if(b.done) return "done";
  return "new";
 }
 window.tcBkFlowHtml=function(b){
  if(!b||b.status==="cancelled") return "";
  var s=state(b), id=b.id, h='<div style="margin-top:6px;padding:6px 8px;border-radius:10px;background:#f1f8f9;border:1px solid #cfe4e8">', row='<div class="actions" style="margin-top:4px">';
  var canLive=b.own!==false&&typeof window.tcLtStartForm==="function";
  if(s==="billed"){
   h+=chip("✅ "+B("Billed","ബില്ല് ചെയ്തു"),"#e6f7e9","#1c6b2c");
   row+=btn("🧾 "+B("Open bill","ബില്ല് തുറക്കുക"),"tcBkBill('"+id+"')");
  }else if(s==="road"){
   h+=chip("🚗 "+B("Trip in progress","ട്രിപ്പ് നടക്കുന്നു"),"#fff4e0","#8a5a00");
   row+=btn("📍 "+B("Open trip log","ട്രിപ്പ് ലോഗ്"),"tcBkLog('"+id+"')")+btn("🏁 "+B("End trip & bill","ട്രിപ്പ് അവസാനിപ്പിച്ച് ബില്ല്"),"tcBkEnd('"+id+"')",true);
  }else if(s==="ended"){
   h+=chip("🏁 "+B("Trip ended - bill not made","ട്രിപ്പ് കഴിഞ്ഞു - ബില്ല് ഉണ്ടാക്കിയിട്ടില്ല"),"#fdecec","#a12d2d");
   row+=btn("🧾 "+B("Make bill","ബില്ല് ഉണ്ടാക്കുക"),"tcBkBill('"+id+"')",true)+btn("📍 "+B("Trip log","ട്രിപ്പ് ലോഗ്"),"tcBkLog('"+id+"')");
  }else if(s==="done"){
   h+=chip("✔ "+B("Trip done - bill not made","ട്രിപ്പ് കഴിഞ്ഞു - ബില്ല് ഉണ്ടാക്കിയിട്ടില്ല"),"#fdecec","#a12d2d");
   row+=btn("🧾 "+B("Make bill","ബില്ല് ഉണ്ടാക്കുക"),"tcBkBill('"+id+"')",true);
  }else{
   h+=chip(B("Not started","തുടങ്ങിയിട്ടില്ല"),"#eef1f4","#555");
   row+=(canLive?btn("▶ "+B("Start trip","ട്രിപ്പ് തുടങ്ങുക"),"tcBkStart('"+id+"')",true):"")+btn("🧾 "+B("Make bill","ബില്ല് ഉണ്ടാക്കുക"),"tcBkBill('"+id+"')")+btn("✔ "+B("Trip done","ട്രിപ്പ് കഴിഞ്ഞു"),"tcBkDone('"+id+"')");
  }
  return h+row+'</div></div>';
 };
 window.tcBkFlowState=state;

 /* ---------- start the trip log from the booking ---------- */
 function vehIndex(b){
  var no=String(b.vehNo||"").replace(/\s+/g,"").toLowerCase(); if(!no) return -1;
  var vs=db.vehicles||[]; for(var i=0;i<vs.length;i++){ if(String(vs[i].no||"").replace(/\s+/g,"").toLowerCase()===no) return i; }
  return -1;
 }
 /* the plain "Start New Trip" form offers today's waiting bookings, so nothing is typed again */
 var origForm=window.tcLtStartForm;
 if(typeof origForm==="function") window.tcLtStartForm=function(){
  var r=origForm.apply(this,arguments);
  try{
   if(window.__tcBkFilling) return r;
   var t0=new Date(), t=t0.getFullYear()+"-"+String(t0.getMonth()+1).padStart(2,"0")+"-"+String(t0.getDate()).padStart(2,"0");
   var list=(db.bookings||[]).filter(function(b){ return b.status!=="cancelled"&&b.own!==false&&b.date===t&&state(b)==="new"; }).sort(function(a,b){ return String(a.time||"").localeCompare(String(b.time||"")); });
   var host=document.querySelector("#modalBody h2");
   if(list.length&&host){
    var h='<div style="background:#f1f8f9;border:1px solid #cfe4e8;border-radius:10px;padding:6px 8px;margin:6px 0"><div style="font-size:12.5px;font-weight:800">'+E(B("Today's bookings - tap one to fill the form","ഇന്നത്തെ ബുക്കിംഗ് - അമർത്തിയാൽ ഫോം നിറയും"))+'</div>'+
     list.slice(0,5).map(function(b){ return '<button onclick="tcBkStart(\''+b.id+'\')" style="display:block;width:100%;text-align:left;margin:3px 0;font-size:13px">'+E((b.time?b.time+" · ":"")+b.name+" · "+[b.pickup,b.dest].filter(Boolean).join(" → "))+'</button>'; }).join("")+'</div>';
    host.insertAdjacentHTML("afterend",h);
   }
  }catch(e){}
  return r;
 };
 window.tcBkStart=function(id){
  var b=bById(id); if(!b) return;
  if(typeof window.tcLtStartForm!=="function"){ say(B("Live Trip is not available","ലൈവ് ട്രിപ്പ് ലഭ്യമല്ല")); return; }
  window.__tcBkFilling=1; try{ window.tcLtStartForm(); }finally{ window.__tcBkFilling=0; }
  setIf("ltName",b.name); setIf("ltMobile",b.mobile);
  var vi=vehIndex(b), sel=$("ltVeh");
  if(vi>=0&&sel){ sel.value=String(vi); try{ tcLtPickVeh(); }catch(e){} }
  else{ setIf("ltVehName",b.vehName); setIf("ltVehNo",b.vehNo); }
  if(b.driver){
   setIf("ltDrv",b.driver);
   var d=(db.drivers||[]).filter(function(x){ return String(x.name||"").trim().toLowerCase()===String(b.driver).trim().toLowerCase(); })[0];
   if(d) setIf("ltDrvM",d.mobile||"");
  }
  var n=$("ltName"); if(n) n.setAttribute("data-bk",id);
  say(B("Details filled in from the booking - check and Start Trip","ബുക്കിംഗിൽ നിന്ന് വിവരങ്ങൾ നിറച്ചു - പരിശോധിച്ച് ട്രിപ്പ് തുടങ്ങുക"));
 };
 var origStart=window.tcLtStart;
 if(typeof origStart==="function") window.tcLtStart=function(){
  var n=$("ltName"), bk=n?n.getAttribute("data-bk"):"", before=(db.liveTrips||[]).length;
  var r=origStart.apply(this,arguments);
  try{
   if(bk&&(db.liveTrips||[]).length>before){
    var t=db.liveTrips[0], b=bById(bk);
    if(b){
     t.bookingId=bk; if(!t.note) t.note=[b.pickup,b.dest].filter(Boolean).join(" → ");
     b.lt=t.id; persist(); refresh();
    }
   }
  }catch(e){}
  return r;
 };
 window.tcBkLog=function(id){ var b=bById(id), l=ltOf(b); if(l&&typeof window.tcLtOpen==="function") window.tcLtOpen(l.id); else say(B("Trip log not found","ട്രിപ്പ് ലോഗ് കണ്ടില്ല")); };
 window.tcBkEnd=function(id){ var b=bById(id), l=ltOf(b); if(l&&typeof window.tcLtEndForm==="function") window.tcLtEndForm(l.id); else say(B("Trip log not found","ട്രിപ്പ് ലോഗ് കണ്ടില്ല")); };
 window.tcBkDone=function(id){
  var b=bById(id); if(!b) return;
  b.done=new Date().toISOString(); persist(); refresh();
  say(B("Marked as done. Tap 'Make bill' when you are ready.","കഴിഞ്ഞതായി അടയാളപ്പെടുത്തി. ബില്ല് ഉണ്ടാക്കാൻ 'ബില്ല് ഉണ്ടാക്കുക' അമർത്തുക."));
 };

 /* ---------- bill ---------- */
 window.__tcBkBilling=null;
 var origOpen=window.openQuickBillForm;
 if(typeof origOpen==="function") window.openQuickBillForm=function(){ window.__tcBkBilling=null; return origOpen.apply(this,arguments); };
 var origSave=window.saveQuickBill;
 if(typeof origSave==="function") window.saveQuickBill=function(){
  var id=window.__tcBkBilling, before=(db.trips||[]).length;
  var r=origSave.apply(this,arguments);
  try{
   if(id&&(db.trips||[]).length>before){
    var b=bById(id), tr=db.trips[0];
    if(b&&tr){
     b.tripId=tr.id; b.quoteId=tr.quoteId||b.quoteId; b.done=b.done||new Date().toISOString();
     var q=(db.quotes||[]).filter(function(x){ return x.id===tr.quoteId; })[0];
     if(q){ if(b.enquiryId&&!q.enquiryId) q.enquiryId=b.enquiryId; if(!q.startTime&&b.time) q.startTime=b.time; }
     var l=ltOf(b); if(l&&!l.tripId){ l.tripId=tr.id; if(l.status!=="active") l.status="billed"; }
     window.__tcBkBilling=null; persist(); refresh();
    }
   }
  }catch(e){}
  return r;
 };
 /* the trip log's own "End & Create Bill" / "Create Bill" also links the new bill to the booking */
 var origLtBill=window.tcLtBill;
 if(typeof origLtBill==="function") window.tcLtBill=function(id){
  var r=origLtBill.apply(this,arguments);
  try{
   var l=(db.liveTrips||[]).filter(function(x){ return x.id===id; })[0];
   if(l&&l.bookingId&&l.status!=="active"&&$("qbName")){ var b=bById(l.bookingId); if(b&&!trOf(b)){ window.__tcBkBilling=b.id; fillExtra(b,true); } }
  }catch(e){}
  return r;
 };
 window.tcBkBill=function(id){
  var b=bById(id); if(!b) return;
  var tr=trOf(b);
  if(tr){
   if(typeof window.tcAbOpenBill==="function"){ closeModalSafe(); window.tcAbOpenBill(tr.id); return; }
   view("billing"); return;
  }
  var l=ltOf(b);
  if(l&&l.status!=="active"&&typeof window.tcLtBill==="function"){
   closeModalSafe(); window.tcLtBill(l.id); window.__tcBkBilling=id; fillExtra(b,true); return;
  }
  if(typeof window.openQuickBillForm!=="function"){ say(B("Quick Bill is not available","ക്വിക്ക് ബിൽ ലഭ്യമല്ല")); return; }
  closeModalSafe();
  window.openQuickBillForm(); window.__tcBkBilling=id;
  setIf("qbName",b.name); setIf("qbMobile",b.mobile);
  setIf("qbVehicle",b.vehName); setIf("qbVehicleNo",b.vehNo);
  if(b.driver){ setIf("qbDriverName",b.driver); var d=(db.drivers||[]).filter(function(x){ return String(x.name||"").trim().toLowerCase()===String(b.driver).trim().toLowerCase(); })[0]; if(d) setIf("qbDriverMobile",d.mobile||""); }
  setIf("qbPickup",b.pickup);
  var q=qOf(b), dests=(q&&q.destinations&&q.destinations.length)?q.destinations:(b.dest?[b.dest]:[]);
  setIf("qbDest",dests[0]);
  for(var i=1;i<dests.length;i++){ try{ addQuickBillStopField(dests[i]); }catch(e){} }
  if(q){ setIf("qbType",q.type); setIf("qbRate",q.ratePlan); setIf("qbDays",q.days); setIf("qbRestHours",q.restHours); setIf("qbReturn",q.returnPoint); setIf("qbKm",q.estimatedKm); setIf("qbHours",q.estimatedHours); }
  fillExtra(b);
  say(B("Details filled in from the booking - enter the actual KM and hours, check and Create Bill","ബുക്കിംഗിൽ നിന്ന് വിവരങ്ങൾ നിറച്ചു - യഥാർത്ഥ KM, മണിക്കൂർ നൽകി പരിശോധിച്ച് ബില്ല് ഉണ്ടാക്കുക"));
 };
 function fillExtra(b,keepDate){   /* things the trip log form does not know: category and date of the booking */
  var cat=(b.categoryId!=null&&b.categoryId!=="")?String(b.categoryId):"";
  var c=$("qbCat"); if(c&&cat!==""&&!c.value) c.value=cat;
  var dt=$("qbDate"); if(dt&&b.date&&!keepDate) dt.value=b.date;
 }
 function closeModalSafe(){ try{ if(!document.querySelector("#modal").classList.contains("hidden")) closeModal(); }catch(e){} }
 window.__tcBkFlowApi={state:state};
})();
