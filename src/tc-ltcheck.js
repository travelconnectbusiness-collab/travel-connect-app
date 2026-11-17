/* Live Trip - KM CHECK + LOCATION AT START / STOP / END (tc-ltcheck.js, loaded by tc-regdocs.js after tc-ltextra.js).
   Owner 2026-11-17: "can the AI help put the live-trip kilometres, start point and closing point in correctly?"
   tc-livetrip.js / tc-ltloc.js are NOT edited; tcLtAddStop and tcLtEnd are wrapped, the End Trip form gets a row by a MutationObserver.
   1) KM CHECK before a stop or the trip end is saved (all plans - a wrong meter reading spoils the bill for everyone):
      - a jump of more than 1000 km from the previous point (one digit too many?)
      - an average speed over 110 km/h between the previous point and this one (KM or time wrong?)
      - the same KM as the previous point although it is another place, more than 30 minutes later
      - Premium: the road km from the map (the "Road km from the last point" line of tc-ltextra.js, window.__tcLtxRoadLast) differs a lot
        from the typed km (more than 10 km and more than 40 %)
      - trip end, Premium: the KM from the map saved on the trip (t.mapKm) differs a lot from end KM - start KM (more than 15 km and 25 %)
      Each problem is said in one plain sentence; the owner taps OK to save anyway or Cancel to correct it. Nothing is blocked or changed.
      window.tcLtKmCheck(t, km, atIso, type, place, isEnd) -> [messages] (exported for tests).
   2) LOCATION: Premium (tcIsPremiumPlan) -
      - End Trip form: "Take my location" under the Closing point box (GPS -> OpenStreetMap name, same request as tc-ltloc.js, so tc-ltplace.js
        gives the owner's own saved name near a saved point). The position is kept on the trip (t.endLat / endLon / endAcc) when the trip is ended,
        and the "KM from the map" of tc-ltextra.js uses it for the closing point.
      - Start form, Add-a-stop form and End form: when the phone has ALREADY allowed location for the app (no question pops up), the location is
        taken by itself once when the form opens and the place box is empty (start: empty or still the office place) - the owner can still type over it.
   The phone never asks for permission by itself here; the first time, the owner taps "Take my location" once. */
(function(){
 if(window.__tcLtCheck) return;
 window.__tcLtCheck=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 function DB(){ try{ return typeof db!=="undefined"?db:null; }catch(e){ return null; } }
 function premium(){ try{ return typeof tcIsPremiumPlan==="function"&&tcIsPremiumPlan(); }catch(e){ return false; } }
 function find(id){ var d=DB(); return ((d&&d.liveTrips)||[]).filter(function(t){ return t.id===id; })[0]||null; }
 function val(id){ var e=$(id); return e?String(e.value||"").trim():""; }
 function readAt(id){ var v=val(id), d=v?new Date(v):new Date(); return isNaN(d)?new Date().toISOString():d.toISOString(); }
 function r1(n){ return Math.round(n*10)/10; }
 function same(a,b){ return String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase(); }

 /* the point just before this time: last stop at or before it, else the start */
 function prevPoint(t,atIso){
  var list=(t.stops||[]).filter(function(s){ return s.type!=="end"&&String(s.at)<=String(atIso); }).sort(function(a,b){ return String(a.at).localeCompare(String(b.at)); });
  var s=list[list.length-1];
  return s?{km:+s.km||0,at:s.at,place:s.place,id:s.id}:{km:+t.startKm||0,at:t.startAt,place:t.startPlace,id:"start"};
 }
 window.tcLtKmCheck=function(t,km,atIso,type,place,isEnd){
  var out=[]; if(!t||isNaN(km)) return out;
  var p=prevPoint(t,atIso), leg=r1(km-p.km);
  var hrs=(new Date(atIso)-new Date(p.at))/3600000;
  if(leg>1000) out.push(B("The KM is "+leg+" km more than the previous point ("+p.km+"). Is there one digit too many?",
   "മുൻപത്തെ സ്ഥലത്തേക്കാൾ ("+p.km+") "+leg+" km കൂടുതലാണ്. ഒരു അക്കം കൂടിപ്പോയോ?"));
  else if(leg>20&&hrs>0.05&&leg/hrs>110) out.push(B("From the previous point that is "+leg+" km in "+fmtH(hrs)+" - about "+Math.round(leg/hrs)+" km/h. Please check the KM or the time.",
   "മുൻപത്തെ സ്ഥലത്ത് നിന്ന് "+fmtH(hrs)+" കൊണ്ട് "+leg+" km - മണിക്കൂറിൽ ഏകദേശം "+Math.round(leg/hrs)+" km വേഗം വരും. KM-ഓ സമയമോ ഒന്ന് നോക്കൂ."));
  if(leg===0&&hrs>0.5&&place&&p.place&&!same(place,p.place)) out.push(B("The KM is the same as at the previous point ("+p.place+"), but this is another place. Did the meter reading change?",
   "മുൻപത്തെ സ്ഥലത്തെ ("+p.place+") അതേ KM ആണ്, പക്ഷേ ഇത് വേറെ സ്ഥലമാണ്. മീറ്റർ റീഡിംഗ് മാറിയില്ലേ?"));
  var rl=window.__tcLtxRoadLast;
  if(!isEnd&&premium()&&rl&&rl.tid===t.id&&place&&same(place,rl.place)&&rl.km>0&&leg>=0){
   var d=Math.abs(leg-rl.km);
   if(d>10&&d>rl.km*0.4) out.push(B("The map shows about "+rl.km+" km by road from the previous point, but the meter difference is "+leg+" km. Please check the KM.",
    "മുൻപത്തെ സ്ഥലത്ത് നിന്ന് റോഡ് വഴി ഏകദേശം "+rl.km+" km ആണ് മാപ്പിൽ, പക്ഷേ മീറ്ററിലെ വ്യത്യാസം "+leg+" km ആണ്. KM ഒന്ന് നോക്കൂ."));
  }
  if(isEnd&&premium()&&+t.mapKm>0){
   var tot=r1(km-(+t.startKm||0)), dd=Math.abs(tot-t.mapKm);
   if(dd>15&&dd>t.mapKm*0.25) out.push(B("The whole trip is "+tot+" km by the meter, but the map gave "+t.mapKm+" km. Please check the start and end KM.",
    "മീറ്റർ പ്രകാരം ട്രിപ്പ് മുഴുവൻ "+tot+" km, പക്ഷേ മാപ്പിൽ "+t.mapKm+" km ആണ്. തുടക്ക KM-ഉം അവസാന KM-ഉം ഒന്ന് നോക്കൂ."));
  }
  return out;
 };
 function fmtH(h){ var m=Math.round(h*60); return m<60?m+" min":Math.floor(m/60)+" h "+(m%60?(m%60)+" min":""); }
 function ask(list){
  if(!list.length) return true;
  return confirm(B("Please check before saving:","സേവ് ചെയ്യുന്നതിന് മുമ്പ് ഒന്ന് നോക്കൂ:")+"\n\n• "+list.join("\n• ")+"\n\n"+B("OK = save anyway,  Cancel = correct it","OK = എന്നാലും സേവ് ചെയ്യുക,  Cancel = തിരുത്തുക"));
 }

 /* ---------- wrap save of a stop / the end ---------- */
 function wrap(){
  var oAdd=window.tcLtAddStop;
  if(typeof oAdd==="function"&&!oAdd.__ck){
   window.tcLtAddStop=function(id){
    var t=find(id), km=parseFloat(val("ltKm")), place=val("ltPlace"), type=val("ltType")||"stop";
    if(t&&place&&!isNaN(km)&&km>=(+t.startKm||0)){
     if(!ask(window.tcLtKmCheck(t,km,readAt("ltAt"),type,place,type==="end"))) return;
    }
    var r=oAdd.apply(this,arguments);
    if(type==="end") keepEnd(id);
    return r;
   };
   window.tcLtAddStop.__ck=1;
  }
  var oEnd=window.tcLtEnd;
  if(typeof oEnd==="function"&&!oEnd.__ck){
   window.tcLtEnd=function(id){
    var t=find(id), km=parseFloat(val("ltEndKm"));
    if(t&&!isNaN(km)&&km>=(+t.startKm||0)){
     if(!ask(window.tcLtKmCheck(t,km,readAt("ltEndAt"),"end",val("ltEndPlace"),true))) return;
    }
    var r=oEnd.apply(this,arguments);
    keepEnd(id);
    return r;
   };
   window.tcLtEnd.__ck=1;
  }
 }
 /* the closing position taken in this form goes on the trip once it is really ended */
 function keepEnd(id){
  var t=find(id), ep=window.__tcLtEndPos;
  if(!t||t.status==="active"||!ep||ep.tid!==id) return;
  if(!same(t.endPlace,ep.name)) return;   /* the owner typed another place: the position is not of that place */
  t.endLat=ep.lat; t.endLon=ep.lon; t.endAcc=ep.acc;
  try{ save(); }catch(e){}
 }

 /* ---------- location ---------- */
 var BAD=["highway","boundary","landuse","place"];
 function nameOf(j,lat,lon){
  try{ if(typeof window.tcLtLocName==="function"){ var n=window.tcLtLocName(j); if(n) return n; } }catch(e){}
  var a=(j&&j.address)||{}, nm=j&&j.name, small=a.hamlet||a.neighbourhood||a.suburb||a.quarter||a.village||a.town||"", big=a.village||a.town||a.city||a.state_district||a.county||"";
  if(nm&&BAD.indexOf(j.category)<0) return nm+(small&&small!==nm?", "+small:"");
  if(small) return small+(big&&big!==small?", "+big:"");
  if(big) return big;
  return "GPS "+lat.toFixed(4)+", "+lon.toFixed(4);
 }
 var taking=false;
 function take(tid,auto){
  var msg=$("tcLtcEndMsg"), box=$("ltEndPlace");
  if(!box||taking) return;
  if(!navigator.geolocation){ if(msg&&!auto) msg.textContent=B("This phone cannot give the location.","ഈ ഫോണിൽ ലൊക്കേഷൻ കിട്ടില്ല."); return; }
  taking=true; if(msg){ msg.style.color=""; msg.textContent=B("Taking the location...","ലൊക്കേഷൻ എടുക്കുന്നു..."); }
  var done=false, wd=setTimeout(function(){ if(done) return; done=true; taking=false; if(msg) msg.textContent=B("No location yet. Type the place, or try again in the open sky.","ലൊക്കേഷൻ കിട്ടിയില്ല. സ്ഥലം ടൈപ്പ് ചെയ്യുക, അല്ലെങ്കിൽ തുറസ്സായ സ്ഥലത്ത് വീണ്ടും ശ്രമിക്കുക."); },window.__tcLtcWait||30000);
  navigator.geolocation.getCurrentPosition(function(p){
   if(done) return; done=true; clearTimeout(wd);
   var lat=p.coords.latitude, lon=p.coords.longitude, acc=Math.round(p.coords.accuracy||0);
   fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=en&lat="+lat.toFixed(6)+"&lon="+lon.toFixed(6),{headers:{Accept:"application/json"}})
    .then(function(r){ return r.json(); }).then(function(j){ return nameOf(j,lat,lon); },function(){ return "GPS "+lat.toFixed(4)+", "+lon.toFixed(4); })
    .then(function(nm){
     taking=false;
     var b=$("ltEndPlace"); if(!b) return;
     if(auto&&b.value&&b.getAttribute("data-tcv")!==b.value) return;   /* the owner typed meanwhile: keep his text */
     b.value=nm; b.setAttribute("data-tcv",nm);
     window.__tcLtEndPos={tid:tid,lat:lat,lon:lon,acc:acc,name:nm};
     var m=$("tcLtcEndMsg"); if(m){ m.style.color="#1c6b2c"; m.textContent=B("Location taken","ലൊക്കേഷൻ എടുത്തു")+(acc?" (± "+acc+" m)":""); }
    });
  },function(){
   if(done) return; done=true; clearTimeout(wd); taking=false;
   if(msg) msg.textContent=auto?"":B("Location is not allowed or not available. Type the place.","ലൊക്കേഷൻ അനുവദിച്ചിട്ടില്ല / കിട്ടിയില്ല. സ്ഥലം ടൈപ്പ് ചെയ്യുക.");
  },{enableHighAccuracy:true,timeout:25000,maximumAge:60000});
 }
 window.tcLtcTakeEnd=function(tid){ take(tid,false); };

 var granted=null;
 function checkPerm(){
  try{ if(navigator.permissions&&navigator.permissions.query) navigator.permissions.query({name:"geolocation"}).then(function(s){ granted=(s.state==="granted"); s.onchange=function(){ granted=(s.state==="granted"); }; },function(){ granted=false; }); else granted=false; }catch(e){ granted=false; }
 }
 function tidIn(re){ var b=$("modalBody"); if(!b) return ""; var m=re.exec(b.innerHTML); return m?m[1]:""; }
 function clickTake(){
  var b=$("modalBody"); if(!b) return false;
  var bt=b.querySelectorAll("button[onclick*='tcLtLocTake']"); if(!bt.length) return false;
  try{ bt[0].click(); return true; }catch(e){ return false; }
 }
 function inject(){
  var b=$("modalBody"); if(!b) return;
  wrap();
  /* End Trip form: Closing point + End KM, and no Start KM box (that is the edit form) */
  var ep=$("ltEndPlace");
  if(ep&&$("ltEndKm")&&!$("ltStartKm")&&premium()&&!$("tcLtcEndRow")){
   var tid=tidIn(/tcLtEnd\('([^']+)'/); if(!tid) return;
   window.__tcLtEndPos=null;
   var lab=ep.parentNode, row=document.createElement("div"); row.id="tcLtcEndRow"; row.style.cssText="grid-column:1/-1;margin:-2px 0 6px";
   row.innerHTML='<button type="button" onclick="tcLtcTakeEnd(\''+E(tid)+'\')" style="padding:5px 12px;min-height:0;font-size:13px">&#128205; '+E(B("Take my location","എൻ്റെ ലൊക്കേഷൻ എടുക്കുക"))+'</button><div id="tcLtcEndMsg" class="muted" style="font-size:12.5px;margin-top:3px"></div>';
   lab.parentNode.insertBefore(row,lab.nextSibling);
   var t=find(tid);
   if(granted&&t&&(!ep.value||same(ep.value,t.startPlace))){ ep.setAttribute("data-tcv",ep.value); take(tid,true); }
  }
  if(!granted||!premium()) return;
  /* Add-a-stop form: place still empty -> take it by itself once */
  var pl=$("ltPlace");
  if(pl&&$("ltType")&&!pl.getAttribute("data-tcauto")&&tidIn(/tcLtAddStop\('([^']+)'/)){
   pl.setAttribute("data-tcauto","1");
   if(!pl.value) setTimeout(clickTake,120);
  }
  /* Start form: empty or still the office place */
  var sp=$("ltStartPlace");
  if(sp&&!sp.getAttribute("data-tcauto")&&/tcLtStart\(/.test(b.innerHTML)&&!/tcLtSaveTrip|tcLtEditSave/.test(b.innerHTML)){
   sp.setAttribute("data-tcauto","1");
   var d=DB(), off=(d&&d.business&&d.business.officeLocation)||"";
   if(!sp.value||same(sp.value,off)) setTimeout(clickTake,120);
  }
 }
 var tmr=0;
 function later(){ clearTimeout(tmr); tmr=setTimeout(function(){ try{ inject(); }catch(e){} },70); }
 function boot(){
  checkPerm(); wrap();
  var mb=$("modalBody")||document.body;
  if(window.MutationObserver) new MutationObserver(later).observe(mb,{childList:true,subtree:true});
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
