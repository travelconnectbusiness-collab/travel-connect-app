/* Live Trip - one-tap location for a stop (tc-ltloc.js, loaded by tc-regdocs.js after tc-odo.js). PREMIUM accounts only.
   Owner's wish (2026-10-27): at each stop of a Live Trip the place name had to be typed. Now one tap on "Take my location" reads the phone's
   position (tcGetLocation in core.js: precise GPS first, rough network location as fallback) and fills the Place box by itself:
     - if the exact spot has a clear name (hotel, temple, bus stand, petrol pump ...) -> "that name, small place"
     - otherwise the small local place + the nearby bigger area, e.g. "Kuniyil, Valayam" (or "Valayam, Kozhikode" when there is no smaller name)
   The name comes from OpenStreetMap (Nominatim, ONE request per tap, English names so they also print in the PDF bill); the exact coordinates
   are ALWAYS kept with the stop (stop.lat / lon / acc / ts; trip.startLat / startLon for the start point) even when the name lookup fails
   (no internet) - then the Place box gets "GPS 11.6543, 75.7654" so the stop can still be added, and it can be renamed any time.
   Buttons: "Take my location" (fills place + time-now if empty) and, on the Add-a-stop form, "Add stop here" = take location AND add the stop in one tap.
   A stop with a saved location shows a small map link in the list and on the edit form. A hint shows the straight-line distance from the
   previous located point (roads are longer, so it is only a hint - the KM box is never changed).
   Nothing in tc-livetrip.js / core.js is edited: the buttons are put in by a MutationObserver and the save functions are wrapped. */
(function(){
 if(window.__tcLtLoc) return;
 window.__tcLtLoc=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 function premium(){ try{ return typeof tcIsPremiumPlan==="function"&&tcIsPremiumPlan(); }catch(e){ return false; } }
 function nowInput(){
  var d=new Date(), p=function(n){ return String(n).padStart(2,"0"); };
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes());
 }
 function save2(){ try{ save(); }catch(e){} }
 function find(id){ return (db.liveTrips||[]).filter(function(t){ return t.id===id; })[0]||null; }

 /* ---------- the place name from an OpenStreetMap reverse result ---------- */
 var L1=["hamlet","isolated_dwelling","neighbourhood","quarter","suburb","locality","city_district"];
 var L2=["village","town","city","municipality"];
 var L3=["state_district","county"];
 function first(a,keys,not){
  for(var i=0;i<keys.length;i++){ var v=a[keys[i]]; if(v&&String(v).trim()&&String(v).toLowerCase()!==String(not||"").toLowerCase()) return String(v).trim(); }
  return "";
 }
 function nameFrom(d){
  var a=(d&&d.address)||{}, small=first(a,L1), big="";
  if(small){ big=first(a,L2,small)||first(a,L3,small); }
  else { small=first(a,L2); big=first(a,L3,small); if(!small){ small=first(a,L3); big=""; } }
  var poi="";
  if(d&&d.name&&["highway","boundary","landuse","place"].indexOf(d.category)<0) poi=String(d.name).trim();
  if(poi.toLowerCase()===small.toLowerCase()||poi.toLowerCase()===big.toLowerCase()) poi="";
  var parts=poi?[poi,small||big]:[small,big];
  if(!parts.filter(Boolean).length){
   var rd=a.road||(d&&d.display_name?String(d.display_name).split(",")[0]:"");
   parts=[rd,first(a,L2)||first(a,L3)];
  }
  var seen={}, out=[];
  parts.forEach(function(p){ p=String(p||"").trim(); if(p&&!seen[p.toLowerCase()]){ seen[p.toLowerCase()]=1; out.push(p); } });
  return out.join(", ");
 }
 var cache={};
 function lookup(lat,lon){
  var key=lat.toFixed(4)+","+lon.toFixed(4);
  if(cache[key]) return Promise.resolve(cache[key]);
  if(typeof fetch!=="function") return Promise.resolve("");
  var ctl=(typeof AbortController==="function")?new AbortController():null, tm=ctl?setTimeout(function(){ try{ ctl.abort(); }catch(e){} },9000):0;
  return fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat="+lat+"&lon="+lon,ctl?{signal:ctl.signal}:undefined)
   .then(function(r){ return r.json(); })
   .then(function(d){ clearTimeout(tm); var n=nameFrom(d); if(n) cache[key]=n; return n; })
   .catch(function(){ clearTimeout(tm); return ""; });
 }
 window.tcLtLocName=nameFrom;   /* for tests */

 /* ---------- distance hint ---------- */
 function km(a,b,c,d){
  var R=6371, rad=Math.PI/180, dl=(c-a)*rad, dn=(d-b)*rad;
  var x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(dn/2)*Math.sin(dn/2);
  return 2*R*Math.asin(Math.sqrt(x));
 }
 function prevPoint(t,beforeSid){
  var p=t&&t.startLat!=null?{lat:+t.startLat,lon:+t.startLon}:null;
  var arr=(t&&t.stops)||[];
  for(var i=0;i<arr.length;i++){ if(arr[i].id===beforeSid) break; if(arr[i].lat!=null) p={lat:+arr[i].lat,lon:+arr[i].lon}; }
  return p;
 }

 /* ---------- one capture ---------- */
 var cap=null, busy=false;     /* cap = what this open form has captured: {lat,lon,acc,ts} */
 function msg(t,bad){ var m=$("tcLtLocMsg"); if(m){ m.textContent=t||""; m.style.color=bad?"#b3261e":"#3d4a53"; } }
 function errText(c){
  if(c===1) return B("Location is blocked for this app. Allow Location in the phone settings (Chrome: menu > Settings > Site settings > Location) and tap again.","ഈ ആപ്പിന് ലൊക്കേഷൻ അനുവദിച്ചിട്ടില്ല. ഫോൺ സെറ്റിങ്സിൽ (Chrome: മെനു > Settings > Site settings > Location) അനുവദിച്ചിട്ട് വീണ്ടും ടാപ്പ് ചെയ്യുക.");
  if(c===3) return B("Finding the location took too long. Turn ON Location (GPS), move near a window or outdoors and tap again.","ലൊക്കേഷൻ കിട്ടാൻ വൈകി. ഫോണിൽ Location (GPS) ഓൺ ആണോ എന്ന് നോക്കി, തുറന്ന സ്ഥലത്തു നിന്ന് വീണ്ടും ടാപ്പ് ചെയ്യുക.");
  if(c===0) return B("This phone or browser does not support location.","ഈ ഫോണിലോ ബ്രൗസറിലോ ലൊക്കേഷൻ ലഭ്യമല്ല.");
  return B("The phone could not find the location. Turn ON Location (GPS) and tap again.","ഫോണിന് ലൊക്കേഷൻ കണ്ടെത്താനായില്ല. Location (GPS) ഓൺ ചെയ്ത് വീണ്ടും ടാപ്പ് ചെയ്യുക.");
 }
 /* placeId = the Place input to fill; tripId/sid = to measure the hint; returns a promise of true when the box was filled */
 function capture(placeId,tripId,sid){
  var inp=$(placeId);
  if(!inp||busy) return Promise.resolve(false);
  busy=true; msg(B("Getting your location...","ലൊക്കേഷൻ എടുക്കുന്നു..."));
  var btns=document.querySelectorAll(".tcLtLocBtn"); btns.forEach(function(b){ b.disabled=true; });
  var done=function(){ busy=false; document.querySelectorAll(".tcLtLocBtn").forEach(function(b){ b.disabled=false; }); };
  var get=(typeof tcGetLocation==="function")?tcGetLocation(false):Promise.resolve({error:0});
  /* the phone's "allow location?" question can stay unanswered for ever - never leave the buttons dead */
  get=Promise.race([get,new Promise(function(res){ setTimeout(function(){ res({error:3}); },window.__tcLtLocWait||30000); })]);
  return get.then(function(g){
   if(!g||g.error!==undefined||g.lat==null){ msg(errText(g?g.error:2),true); done(); return false; }
   cap={lat:g.lat,lon:g.lon,acc:Math.round(g.accuracy||0),ts:new Date().toISOString()};
   msg(B("Got the location. Finding the place name...","ലൊക്കേഷൻ കിട്ടി. സ്ഥലപ്പേര് നോക്കുന്നു..."));
   return lookup(g.lat,g.lon).then(function(name){
    var inp2=$(placeId); if(!inp2){ done(); return false; }   /* form closed meanwhile */
    var fix=g.lat.toFixed(5)+", "+g.lon.toFixed(5);
    var note="";
    if(name){ inp2.value=name; note=B("Place: ","സ്ഥലം: ")+name; }
    else {
     if(!inp2.value.trim()) inp2.value="GPS "+g.lat.toFixed(4)+", "+g.lon.toFixed(4);
     note=B("Location saved, but the place name could not be found (no internet?) - type the name if you like.","ലൊക്കേഷൻ സേവ് ചെയ്തു, പക്ഷേ സ്ഥലപ്പേര് കിട്ടിയില്ല (ഇന്റർനെറ്റ് ഇല്ലേ?) - വേണമെങ്കിൽ പേര് ടൈപ്പ് ചെയ്യുക.");
    }
    var at=$("ltAt"); if(at&&!at.value) at.value=nowInput();
    if(cap.acc>500) note+=" "+B("(rough location, about "+cap.acc+" m off)","(ഏകദേശ ലൊക്കേഷൻ, ഏകദേശം "+cap.acc+" മീറ്റർ വ്യത്യാസം വരാം)");
    try{
     var pp=prevPoint(find(tripId),sid);
     if(pp&&tripId){ var d=km(pp.lat,pp.lon,g.lat,g.lon); if(d>=0.3) note+=" "+B("~"+d.toFixed(1)+" km straight line from the last located point (road is usually longer).","~"+d.toFixed(1)+" km നേർരേഖയിൽ കഴിഞ്ഞ ലൊക്കേഷനിൽ നിന്ന് (റോഡിലൂടെ കൂടുതൽ ആകും)."); }
    }catch(e){}
    msg(note,false); done(); return true;
   });
  }).catch(function(){ msg(errText(2),true); done(); return false; });
 }
 window.tcLtLocTake=function(placeId,tripId,sid){ return capture(placeId,tripId,sid); };
 window.tcLtLocAdd=function(tripId){
  return capture("ltPlace",tripId,"").then(function(ok){
   if(ok&&typeof window.tcLtAddStop==="function") window.tcLtAddStop(tripId);
   return ok;
  });
 };

 /* ---------- buttons in the forms ---------- */
 function mapLink(lat,lon){ return '<a href="https://www.google.com/maps?q='+E(lat)+','+E(lon)+'" target="_blank" rel="noopener">&#128506; '+E(B("Map","മാപ്പ്"))+'</a>'; }
 function hook(){
  var mb=$("modalBody"); if(!mb) return;
  if(!premium()) return;
  var ids=[["ltPlace",""],["ltStartPlace",""]];
  ids.forEach(function(x){
   var inp=$(x[0]); if(!inp||$("tcLtLocRow")) return;
   var lab=inp.parentNode, tripId="", sid="", addBtn=mb.querySelector('button[onclick^="tcLtAddStop("]'), saveBtn=mb.querySelector('button[onclick^="tcLtSaveStop("]');
   var mm;
   if(addBtn&&(mm=/tcLtAddStop\('([^']*)'/.exec(addBtn.getAttribute("onclick")||""))) tripId=mm[1];
   if(saveBtn&&(mm=/tcLtSaveStop\('([^']*)','([^']*)'/.exec(saveBtn.getAttribute("onclick")||""))){ tripId=mm[1]; sid=mm[2]; }
   cap=null; busy=false;
   var saved=null;
   if(sid){ var t=find(tripId), s=t&&(t.stops||[]).filter(function(z){ return z.id===sid; })[0]; if(s&&s.lat!=null) saved=s; }
   var h='<div id="tcLtLocRow" style="margin:4px 0 2px"><div style="display:flex;gap:6px;flex-wrap:wrap">'+
    '<button type="button" class="tcLtLocBtn" style="flex:1;min-width:140px" onclick="tcLtLocTake(\''+x[0]+'\',\''+tripId+'\',\''+sid+'\')">&#128205; '+E(B("Take my location","എന്റെ ലൊക്കേഷൻ എടുക്കുക"))+'</button>'+
    (addBtn&&!sid?'<button type="button" class="tcLtLocBtn" style="flex:1;min-width:140px" onclick="tcLtLocAdd(\''+tripId+'\')">&#9889; '+E(B("Add stop here","ഇവിടെ സ്റ്റോപ്പ് ചേർക്കുക"))+'</button>':'')+
    '</div><div id="tcLtLocMsg" style="font-size:12.5px;margin-top:3px">'+(saved?'&#128205; '+E(saved.lat+", "+saved.lon)+' &middot; '+mapLink(saved.lat,saved.lon):'')+'</div></div>';
   lab.insertAdjacentHTML("afterend",h);
  });
  /* a small map link on every stop (and the start point) that has a saved location */
  mb.querySelectorAll('button[onclick*="tcLtEditStop("]').forEach(function(b){
   var m=/tcLtEditStop\('([^']*)','([^']*)'/.exec(b.getAttribute("onclick")||""); if(!m) return;
   var t=find(m[1]), s=t&&(t.stops||[]).filter(function(z){ return z.id===m[2]; })[0];
   var item=b.closest(".listitem"); if(!s||s.lat==null||!item||item.querySelector(".tcLtPin")) return;
   var acts=item.querySelector(".actions"), d=document.createElement("div");
   d.className="tcLtPin muted"; d.style.cssText="font-size:12px;margin-top:2px"; d.innerHTML="&#128205; "+mapLink(s.lat,s.lon);
   if(acts) item.insertBefore(d,acts); else item.appendChild(d);
  });
 }
 var tm=null;
 function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ hook(); }catch(e){} },30); }
 function boot(){
  var mb=$("modalBody")||document.body;
  if(window.MutationObserver) new MutationObserver(later).observe(mb,{childList:true,subtree:true});
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();

 /* ---------- keep the coordinates with the saved stop / trip ---------- */
 function stamp(o,pre){
  if(!cap) return;
  if(pre){ o.startLat=cap.lat; o.startLon=cap.lon; o.startAcc=cap.acc; }
  else { o.lat=cap.lat; o.lon=cap.lon; o.acc=cap.acc; o.gts=cap.ts; }
 }
 var oAdd=window.tcLtAddStop;
 if(typeof oAdd==="function") window.tcLtAddStop=function(id){
  var t=find(id), n0=t?(t.stops||[]).length:0, c=cap;
  var r=oAdd.apply(this,arguments);
  try{
   var t2=find(id);
   if(c&&t2&&(t2.stops||[]).length>n0){ cap=c; stamp(t2.stops[t2.stops.length-1],false); cap=null; save2(); }
  }catch(e){}
  return r;
 };
 var oSave=window.tcLtSaveStop;
 if(typeof oSave==="function") window.tcLtSaveStop=function(id,sid){
  var c=cap, r=oSave.apply(this,arguments);
  try{
   var t=find(id), s=t&&(t.stops||[]).filter(function(z){ return z.id===sid; })[0];
   if(c&&s){ cap=c; stamp(s,false); cap=null; save2(); }
  }catch(e){}
  return r;
 };
 var oStart=window.tcLtStart;
 if(typeof oStart==="function") window.tcLtStart=function(){
  var n0=(db.liveTrips||[]).length, c=cap;
  var r=oStart.apply(this,arguments);
  try{
   var list=db.liveTrips||[];
   if(c&&list.length>n0&&list[0]){ cap=c; stamp(list[0],true); cap=null; save2(); }
  }catch(e){}
  return r;
 };
 window.__tcLtLocState=function(){ return {cap:cap,busy:busy}; };   /* for tests */
})();
