/* Trip requests - "nobody accepted" help for the customer + admin settings and driver response stats.
   Loaded by tc-regdocs.js. Server side: trip_fallback.js.
   Customer: after N minutes (admin setting, default 5) without an accepting driver, the waiting screen shows the nearby
   drivers that were alerted (Call button) and the Krishna Tours help number. The same list is shown on the
   "No driver available" screen. Admin: All Users page > "Trip requests: help screen & driver response". */
(function(){
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var BL=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };

 /* ---------- customer ---------- */
 function panelHtml(d){
  if(!d||!d.ready) return "";
  var h="";
  if(d.nearby&&d.nearby.length){
   h+='<div style="margin-top:6px;font-size:13px">'+E(BL("These nearby drivers were alerted. You can call them directly:","ഈ അടുത്തുള്ള ഡ്രൈവർമാർക്ക് അലേർട്ട് പോയിട്ടുണ്ട്. നേരിട്ട് വിളിക്കാം:"))+'</div>';
   d.nearby.forEach(function(n){
    h+='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;padding:6px 8px;border:1px solid #e3d3a5;border-radius:10px;background:#fff"><div style="text-align:left"><b>'+E(n.name)+'</b>'+(n.distance_km!=null?'<div class="muted" style="font-size:12px">'+E(n.distance_km)+' km</div>':'')+'</div>'+
     '<a href="tel:'+E(n.mobile)+'" style="text-decoration:none"><button class="primary" type="button">&#128222; '+E(BL("Call","വിളിക്കൂ"))+'</button></a></div>';
   });
  }
  if(d.help_phone){
   h+='<div style="margin-top:8px;font-size:13px">'+E(BL("Need help finding a vehicle? Call Krishna Tours & Travels:","വാഹനം കിട്ടാൻ സഹായം വേണോ? Krishna Tours & Travels-നെ വിളിക്കൂ:"))+'</div>'+
    '<div style="margin-top:4px"><a href="tel:'+E(d.help_phone)+'" style="text-decoration:none"><button class="primary" type="button">&#128222; '+E(d.help_phone)+'</button></a></div>';
  }
  if(!h) return "";
  return '<div style="border:2px solid #e0a526;background:#fff8e6;border-radius:12px;padding:10px;margin-top:10px;text-align:left"><b>'+E(BL("No driver has accepted yet","ഇതുവരെ ഒരു ഡ്രൈവറും സ്വീകരിച്ചിട്ടില്ല"))+'</b>'+h+'</div>';
 }
 async function getFallback(alertId){
  var u=getCurrentUser(); if(!u) return null;
  var r=await fetch("/api/trip_alerts?action=fallback&alert_id="+alertId+"&mobile="+encodeURIComponent(u.mobile));
  var d=await r.json(); return d.ok?d:null;
 }
 var timer=null;
 async function check(alertId){
  clearTimeout(timer);
  if(window._tcActiveTripAlertId!==alertId) return;
  try{
   var d=await getFallback(alertId);
   if(!d||d.status==="accepted"||d.status==="cancelled") return;
   if(!d.ready){ timer=setTimeout(function(){ check(alertId); },(Math.max(1,d.seconds_left||60)+1)*1000); return; }
   var w=document.querySelector("#tripWaitStatus");
   if(w&&window._tcActiveTripAlertId===alertId&&!document.querySelector("#tripFallback")){
    w.insertAdjacentHTML("afterend",'<div id="tripFallback">'+panelHtml(d)+'</div>');
   }
  }catch(e){}
 }
 var oldShow=window.tcShowTripWaiting;
 if(typeof oldShow==="function") window.tcShowTripWaiting=function(alertId){
  var r=oldShow.apply(this,arguments);
  try{ check(alertId); }catch(e){}
  return r;
 };
 /* same as customer-safety.js tcPollTripStatus, plus the nearby-drivers list on the "No driver available" screen */
 if(typeof window.tcPollTripStatus==="function") window.tcPollTripStatus=async function(alertId){
  var user=getCurrentUser();
  if(!user||window._tcActiveTripAlertId!==alertId){ clearInterval(_tcTripPollTimer); return; }
  try{
   var res=await fetch("/api/trip_alerts?action=status&alert_id="+alertId+"&mobile="+encodeURIComponent(user.mobile));
   var data=await res.json();
   if(!data.ok) return;
   if(data.status==="accepted"){
    clearInterval(_tcTripPollTimer);
    tcShowTripAccepted(data.partner,data.distance_km,data.duration_min);
   }else if(data.status==="expired"||data.status==="cancelled"){
    clearInterval(_tcTripPollTimer);
    if(document.querySelector("#tripWaitStatus")){
     modal('<div style="text-align:center;padding:6px 0"><h2>No driver available</h2><p class="muted">Nobody accepted in time. You can try again, or browse the Active Vehicles Board / Local Directory directly.</p><div id="tripFallbackEnd"></div><div class="actions"><button class="primary" onclick="closeModal();tcOpenTripRequest()">Try Again</button><button onclick="closeModal()">Close</button></div></div>');
     if(data.status==="expired"){
      try{ var d=await getFallback(alertId); var box=document.querySelector("#tripFallbackEnd"); if(box&&d&&d.ready) box.innerHTML=panelHtml(d); }catch(e){}
     }
    }
   }
  }catch(e){}
 };

 /* ---------- admin: All Users page ---------- */
 var oldRender=window.tcRenderAllUsersAdmin;
 if(typeof oldRender==="function") window.tcRenderAllUsersAdmin=async function(){
  var r=await oldRender.apply(this,arguments);
  try{
   if(!document.querySelector("#tcTripAdm")){
    var anchor=document.querySelector("#tcAbuse")||document.querySelector("#tcAllUsersSummary");
    if(anchor){
     anchor.insertAdjacentHTML("afterend",'<details id="tcTripAdm" style="margin:0 0 12px;border:2px solid #c8d3dc;border-radius:12px;padding:8px 10px"><summary><b>Trip requests: help screen &amp; driver response</b></summary><div id="tcTripAdmBody" class="muted">Tap to load...</div></details>');
     document.querySelector("#tcTripAdm").addEventListener("toggle",function(){ if(this.open) tcTripAdmLoad(); });
    }
   }
  }catch(e){}
  return r;
 };
 window.tcTripAdmLoad=async function(){
  var box=document.querySelector("#tcTripAdmBody"); if(!box) return;
  box.textContent="Loading...";
  try{
   var d=await (await fetch("/api/trip_alerts?action=fallback_admin&token="+encodeURIComponent(adminToken()))).json();
   if(!d.ok){ box.textContent="Could not load."; return; }
   var t=d.totals, pct=t.total?Math.round(t.accepted*100/t.total):0;
   var h='<div style="border:1px solid #dde;border-radius:10px;padding:8px;margin:6px 0"><b>Help screen for customers</b>'+
    '<div class="muted" style="font-size:12px;margin:2px 0 6px">If nobody accepts, the customer sees the nearby drivers and this number after the wait time.</div>'+
    '<label style="display:block;font-size:13px">Wait time (minutes, '+d.limits.min+'-'+d.limits.max+')<input id="fbMin" type="number" min="'+d.limits.min+'" max="'+d.limits.max+'" value="'+E(d.minutes)+'"></label>'+
    '<label style="display:block;font-size:13px;margin-top:4px">Help phone number (Krishna Tours)<input id="fbPhone" type="tel" value="'+E(d.help_phone)+'" placeholder="e.g. 9876543210"></label>'+
    '<div class="actions" style="margin-top:6px"><button class="primary" onclick="tcTripAdmSave()">Save</button></div></div>';
   h+='<div style="font-size:13px;margin:8px 0"><b>Last 30 days:</b> '+t.total+' requests &middot; accepted '+t.accepted+' ('+pct+'%) &middot; <span style="color:'+(t.unanswered?'#a12d2d':'inherit')+'">nobody accepted '+t.unanswered+'</span> &middot; no driver online '+t.nobody_online+'</div>';
   h+='<b>Driver response</b> <span class="muted" style="font-size:12px">(alerts received / accepted; counted from the day this feature went live)</span>'+(d.drivers.length?"":'<div class="muted">No data yet.</div>');
   d.drivers.forEach(function(x){
    var never=x.received>=5&&x.accepted===0, rate=x.received?Math.round(x.accepted*100/x.received):0;
    h+='<div style="margin:4px 0;padding:5px 8px;border:1px solid '+(never?'#e0a0a0':'#dde')+';border-radius:8px;background:'+(never?'#fff3f3':'#fff')+';font-size:13px"><b>'+E(x.business_name)+'</b> <span class="muted">'+E((typeof TC_BUSINESS_TYPES!=="undefined"&&TC_BUSINESS_TYPES[x.business_type])||x.business_type)+'</span><br>'+
     x.received+' received &middot; '+x.accepted+' accepted ('+rate+'%)'+(never?' <span style="color:#a12d2d"><b>never accepts</b></span>':'')+' &middot; <a href="tel:'+E(x.mobile1)+'">'+E(x.mobile1)+'</a></div>';
   });
   box.innerHTML=h;
  }catch(e){ box.textContent="Network error."; }
 };
 window.tcTripAdmSave=async function(){
  var m=parseInt((document.querySelector("#fbMin")||{}).value,10), p=((document.querySelector("#fbPhone")||{}).value||"").trim();
  try{
   var d=await (await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"fallback_set",minutes:m,phone:p,token:adminToken()})})).json();
   if(!d.ok){ say(d.error==="bad_minutes"?"Wait time must be between 2 and 9 minutes":d.error==="bad_phone"?"Enter a valid phone number or leave it empty":"Could not save"); return; }
   say("Saved"); tcTripAdmLoad();
  }catch(e){ say("Network error"); }
 };
})();
