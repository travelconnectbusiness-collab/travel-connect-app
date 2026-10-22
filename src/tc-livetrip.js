/* Live Trip Log (tc-livetrip.js, loaded by tc-regdocs.js).
   For the taxi / travel owner on the road: start a trip (customer, vehicle, start km + time), add every stop
   as it happens (customer pickup, destination, other stop, drop - place + km + time), end the trip with the
   closing km, then make the bill from it in one tap (opens the normal Quick Bill form already filled in:
   places, total km, days, hours).
   DATA: db.liveTrips (inside the app's own saved data, written with save() after EVERY change), so leaving the
   screen, Back, closing the app or restarting the phone never loses anything; a trip is removed only when the
   owner taps Delete. Premium accounts: db.liveTrips is also part of the automatic Cloud Backup. */
(function(){
 window.__tcLiveTrip=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var $=function(id){ return document.getElementById(id); };
 var val=function(id){ var e=$(id); return e?String(e.value||"").trim():""; };

 /* ---------- data ---------- */
 function L(){ if(!Array.isArray(db.liveTrips)) db.liveTrips=[]; return db.liveTrips; }
 function find(id){ return L().filter(function(t){ return t.id===id; })[0]||null; }
 function uid(){ try{ return crypto.randomUUID(); }catch(e){ return "lt"+Date.now()+Math.random().toString(16).slice(2); } }
 function persist(){ try{ save(); }catch(e){} refreshCard(); }
 var TYPES={
  pickup:{en:"Customer pickup",ml:"കസ്റ്റമറെ കയറ്റി",ic:"&#128100;"},
  dest:{en:"Destination reached",ml:"ഡെസ്റ്റിനേഷൻ എത്തി",ic:"&#128205;"},
  stop:{en:"Other stop (food, fuel...)",ml:"മറ്റ് സ്റ്റോപ്പ് (ഭക്ഷണം, ഇന്ധനം...)",ic:"&#9749;"},
  drop:{en:"Customer drop",ml:"കസ്റ്റമറെ ഇറക്കി",ic:"&#127937;"}
 };
 function tl(k){ return B(TYPES[k].en,TYPES[k].ml); }
 function sortedStops(t){ return (t.stops||[]).slice(); }   /* kept in the order they were added (use Move up / down to change) */
 function dayKey(iso){ var d=new Date(iso); return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime(); }
 function hasKm(s){ return s&&s.km!=null&&s.km!==""&&!isNaN(+s.km); }
 /* total KM: the "total" typed at End Trip wins; while the trip is running it is the highest trip-meter reading given at a stop */
 function totals(t){
  var km=0;
  if(t.totalKm!=null&&t.totalKm!==""&&!isNaN(+t.totalKm)) km=+t.totalKm;
  else { var m=null; (t.stops||[]).forEach(function(s){ if(hasKm(s)&&(m==null||(+s.km)>m)) m=+s.km; }); if(m!=null) km=Math.max(0,m-(+t.startKm||0)); }
  var endAt=t.endAt||new Date().toISOString();
  var hours=Math.max(0,(new Date(endAt)-new Date(t.startAt))/3600000);
  var days=Math.max(1,Math.round((dayKey(endAt)-dayKey(t.startAt))/86400000)+1);
  return {km:Math.round(km*10)/10,hours:Math.round(hours*10)/10,days:days};
 }
 function fmt(iso){ try{ return tcFormatDateTime(iso); }catch(e){ return String(iso||""); } }
 function nowLocalInput(iso){
  var d=iso?new Date(iso):new Date(); if(isNaN(d)) d=new Date();
  var p=function(n){ return String(n).padStart(2,"0"); };
  return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes());
 }
 /* a time box that still shows the time it was opened with (data-auto) means "now" = the moment of tapping the button */
 function readAt(id){
  var e=$(id), v=val(id);
  if(e&&e.getAttribute("data-auto")!==null&&e.getAttribute("data-auto")===e.value) return new Date().toISOString();
  var d=v?new Date(v):new Date(); return isNaN(d)?new Date().toISOString():d.toISOString();
 }
 function placeList(){
  var seen={}, out=[];
  function add(p){ p=String(p||"").trim(); if(p&&!seen[p.toLowerCase()]){ seen[p.toLowerCase()]=1; out.push(p); } }
  L().forEach(function(t){ add(t.startPlace); add(t.endPlace); (t.stops||[]).forEach(function(s){ add(s.place); }); });
  try{ add(db.business&&db.business.officeLocation); }catch(e){}
  return out.slice(0,80);
 }
 function placesDl(){ return '<datalist id="tcLtPlaces">'+placeList().map(function(p){ return '<option value="'+E(p)+'">'; }).join("")+'</datalist>'; }
 function mine(){ return L().slice().sort(function(a,b){ return String(b.startAt).localeCompare(String(a.startAt)); }); }

 /* ---------- dashboard card ---------- */
 function cardHtml(){
  var list=mine(), act=list.filter(function(t){ return t.status==="active"; }), done=list.filter(function(t){ return t.status==="ended"; });
  var h='<h3 style="margin:0 0 6px;font-size:15px;color:#0b4f5a">&#128661; '+E(B("Live Trip Log","ലൈവ് ട്രിപ്പ് ലോഗ്"))+'</h3>';
  act.forEach(function(t){
   var T=totals(t);
   h+='<div style="border:1px solid #bfe0d8;background:#f1faf7;border-radius:10px;padding:7px 9px;margin:0 0 6px;font-size:13px"><b>'+E(t.customer||B("Trip in progress","ട്രിപ്പ് നടക്കുന്നു"))+'</b> <span class="muted">'+E(t.vehicleNo||t.vehicle||"")+'</span><br><span class="muted">'+E(B("Started ","തുടങ്ങിയത് "))+E(fmt(t.startAt))+' &middot; '+(t.stops||[]).length+E(B(" stops"," സ്റ്റോപ്പുകൾ"))+' &middot; '+T.km+' km</span>'+
    '<div class="actions" style="margin-top:5px"><button class="primary" onclick="tcLtOpen(\''+t.id+'\')">'+E(B("Open / Add stop","തുറക്കുക / സ്റ്റോപ്പ് ചേർക്കുക"))+'</button></div></div>';
  });
  done.forEach(function(t){
   var T=totals(t);
   h+='<div style="border:1px solid #e3d3a5;background:#fff8e6;border-radius:10px;padding:7px 9px;margin:0 0 6px;font-size:13px"><b>'+E(t.customer||B("Trip","ട്രിപ്പ്"))+'</b> <span class="muted">'+E(B("ended - ","കഴിഞ്ഞു - "))+T.km+' km, '+T.days+E(B(" day(s)"," ദിവസം"))+'</span>'+
    '<div class="actions" style="margin-top:5px"><button class="primary" onclick="tcLtBill(\''+t.id+'\')">'+E(B("Create Bill","ബില്ല് ഉണ്ടാക്കുക"))+'</button><button onclick="tcLtOpen(\''+t.id+'\')">'+E(B("Open","തുറക്കുക"))+'</button></div></div>';
  });
  h+='<div class="actions"><button class="primary" style="background:linear-gradient(135deg,#0b6b78,#12898f)" onclick="tcLtStartForm()">&#9654; '+E(B("Start New Trip","പുതിയ ട്രിപ്പ് തുടങ്ങുക"))+'</button>'+
   (list.length?'<button onclick="tcLtHistory()">'+E(B("All trips","എല്ലാ ട്രിപ്പുകളും"))+' ('+list.length+')</button>':'')+'</div>';
  return h;
 }
 function profileBox(h2){
  var kids=h2.parentNode?h2.parentNode.children:[];
  for(var i=0;i<kids.length;i++){
   var k=kids[i];
   if(k===h2||k.tagName!=="DIV"||k.id||k.classList.contains("actions")||k.classList.contains("grid")) continue;
   if(k.querySelector("button[onclick*=\"view('partner')\"]")) return k;
  }
  return null;
 }
 function refreshCard(){
  var c=$("tcLiveCard"); if(c) c.innerHTML=cardHtml();
 }
 function arrange(){
  var app=$("app"); if(!app) return;
  var h2=app.querySelector(".card>h2");
  if(!h2||!/Travel Connect Dashboard|ഡാഷ്ബോർഡ്/i.test(h2.textContent)){ return; }
  var anchor=profileBox(h2)||h2;
  /* the licence-expiry alert (tc-home.js) sits straight after the profile box: stay behind it, otherwise the two keep moving each other */
  var lic=$("tcLicCard"); if(lic&&lic.parentNode===anchor.parentNode&&lic.previousElementSibling===anchor) anchor=lic;
  var c=$("tcLiveCard");
  if(!c){
   c=document.createElement("div"); c.className="card"; c.id="tcLiveCard";
   c.style.cssText="border:2px solid #148c76;padding:10px 12px;margin:0 0 12px";
   c.innerHTML=cardHtml();
  }
  if(anchor.nextElementSibling!==c) anchor.parentNode.insertBefore(c,anchor.nextSibling);
 }
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ arrange(); }catch(e){} },90); }
 function start(){
  var app=$("app"); if(!app||!window.MutationObserver) return;
  new MutationObserver(later).observe(app,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();

 /* ---------- start a trip ---------- */
 window.tcLtStartForm=function(){
  var vs=(db.vehicles||[]);
  var opts='<option value="">'+E(B("-- choose vehicle --","-- വാഹനം തിരഞ്ഞെടുക്കുക --"))+'</option>'+vs.map(function(v,i){ return '<option value="'+i+'">'+E((v.name||"")+" "+(v.no||""))+'</option>'; }).join("");
  modal('<h2>&#9654; '+E(B("Start New Trip","പുതിയ ട്രിപ്പ് തുടങ്ങുക"))+'</h2>'+placesDl()+
   '<div class="grid">'+
   '<label>'+E(B("Customer name","കസ്റ്റമറുടെ പേര്"))+'<input id="ltName"></label>'+
   '<label>'+E(B("Customer mobile","കസ്റ്റമറുടെ മൊബൈൽ"))+'<input id="ltMobile" type="tel" inputmode="tel"></label>'+
   (vs.length?'<label>'+E(B("Vehicle","വാഹനം"))+'<select id="ltVeh" onchange="tcLtPickVeh()">'+opts+'</select></label>':'')+
   '<label>'+E(B("Vehicle name","വാഹനത്തിൻ്റെ പേര്"))+'<input id="ltVehName"></label>'+
   '<label>'+E(B("Vehicle number","വാഹന നമ്പർ"))+'<input id="ltVehNo"></label>'+
   '<label>'+E(B("Driver name (optional)","ഡ്രൈവറുടെ പേര് (ഓപ്ഷണൽ)"))+'<input id="ltDrv"></label>'+
   '<label>'+E(B("Driver mobile (optional)","ഡ്രൈവറുടെ മൊബൈൽ (ഓപ്ഷണൽ)"))+'<input id="ltDrvM" type="tel" inputmode="tel"></label>'+
   '<label><b>'+E(B("Start point","പുറപ്പെടുന്ന സ്ഥലം"))+'</b><input id="ltStartPlace" list="tcLtPlaces" value="'+E((db.business&&db.business.officeLocation)||"")+'"></label>'+
   '<label>'+E(B("Start KM (optional - leave empty if you reset the trip meter to 0)","തുടക്ക KM (ഓപ്ഷണൽ - ട്രിപ്പ് മീറ്റർ 0 ആക്കിയെങ്കിൽ ഒഴിച്ചിടാം)"))+'<input id="ltStartKm" type="number" inputmode="decimal"></label>'+
   '<label>'+E(B("Start time","തുടങ്ങുന്ന സമയം"))+'<input id="ltStartAt" type="datetime-local" data-auto="'+nowLocalInput()+'" value="'+nowLocalInput()+'"></label>'+
   '</div><div id="ltErr" class="danger" style="font-size:13px"></div>'+
   '<div class="actions"><button class="primary" onclick="tcLtStart()">'+E(B("Start Trip","ട്രിപ്പ് തുടങ്ങുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","വേണ്ട"))+'</button></div>');
 };
 window.tcLtPickVeh=function(){
  var i=val("ltVeh"); if(i==="") return;
  var v=(db.vehicles||[])[+i]; if(!v) return;
  $("ltVehName").value=v.name||""; $("ltVehNo").value=v.no||"";
  try{ var d=findDriverForVehicleNo(v.no); if(d){ $("ltDrv").value=d.name||""; $("ltDrvM").value=d.mobile||d.phone||""; } }catch(e){}
 };
 window.tcLtStart=function(){
  var km=parseFloat(val("ltStartKm")); if(isNaN(km)||km<0) km=0;
  var t={id:uid(),status:"active",created:new Date().toISOString(),
   customer:val("ltName"),mobile:val("ltMobile"),vehicle:val("ltVehName"),vehicleNo:val("ltVehNo"),
   driverName:val("ltDrv"),driverMobile:val("ltDrvM"),
   startPlace:val("ltStartPlace"),startKm:km,startAt:readAt("ltStartAt"),stops:[],note:""};
  L().unshift(t); persist();
  say(B("Trip started","ട്രിപ്പ് തുടങ്ങി"));
  tcLtOpen(t.id);
 };

 /* ---------- the log ---------- */
 var lastType="pickup";
 window.tcLtNow=function(id){ var e=$(id); if(e) e.value=nowLocalInput(); };
 function stopHtml(t,s,prev){
  var hasK=hasKm(s), leg=(hasK&&prev!=null)?(+s.km)-prev:0;
  var meta=[];
  if(hasK) meta.push("km "+E(s.km)+(leg>0?' (+'+Math.round(leg*10)/10+')':''));
  if(s.at) meta.push(E(fmt(s.at)));
  return '<div class="listitem" style="font-size:13px"><b>'+(TYPES[s.type]?TYPES[s.type].ic:"")+' '+E(TYPES[s.type]?tl(s.type):s.type)+'</b> &mdash; '+E(s.place||"-")+
   (meta.length?'<br><span class="muted">'+meta.join(' &middot; ')+'</span>':'')+
   (s.note?'<div style="margin-top:2px;font-size:12.5px;color:#3d4a53">&#128221; '+E(s.note)+'</div>':'')+
   '<div class="actions" style="margin-top:4px"><button style="flex:none;padding:4px 16px;font-size:12px;min-height:0" onclick="tcLtEditStop(\''+t.id+'\',\''+s.id+'\')">'+E(B("Edit","തിരുത്തുക"))+'</button></div></div>';
 }
 window.tcLtOpen=function(id){
  var t=find(id); if(!t){ closeModal(); return; }
  var T=totals(t), rows=sortedStops(t), prev=null;
  /* add a stop - kept at the TOP so it is always one tap away; only Place is needed, everything else is optional */
  var addForm='<div style="border:2px solid #b9d6da;border-radius:12px;padding:8px 10px;margin:4px 0 10px;background:#f6fbfb"><b>+ '+E(B("Add a stop","സ്റ്റോപ്പ് ചേർക്കുക"))+'</b><div class="grid">'+
   '<label>'+E(B("What happened","എന്താണ്"))+'<select id="ltType">'+Object.keys(TYPES).map(function(k){ return '<option value="'+k+'"'+(k===lastType?" selected":"")+'>'+E(tl(k))+'</option>'; }).join("")+'</select></label>'+
   '<label><b>'+E(B("Place","സ്ഥലം"))+'</b><input id="ltPlace" list="tcLtPlaces"></label>'+
   '<label>'+E(B("KM on trip meter now (optional)","ട്രിപ്പ് മീറ്ററിൽ ഇപ്പോഴത്തെ KM (ഓപ്ഷണൽ)"))+'<input id="ltKm" type="number" inputmode="decimal"></label>'+
   '<label>'+E(B("Time (optional)","സമയം (ഓപ്ഷണൽ)"))+'<span style="display:flex;gap:6px"><input id="ltAt" type="datetime-local" style="flex:1"><button type="button" style="flex:none" onclick="tcLtNow(\'ltAt\')">&#128339; '+E(B("Now","ഇപ്പോൾ"))+'</button></span></label>'+
   '<label>'+E(B("Note about this place (optional)","ഈ സ്ഥലത്തെക്കുറിച്ചുള്ള കുറിപ്പ് (ഓപ്ഷണൽ)"))+'<input id="ltNote"></label>'+
   '</div><div id="ltErr" class="danger" style="font-size:13px"></div>'+
   '<div class="actions"><button class="primary" onclick="tcLtAddStop(\''+t.id+'\')">'+E(B("Add","ചേർക്കുക"))+'</button></div></div>';
  var mainBtn=(t.status==="active")?'<button class="primary" style="background:#c9820d;border-color:#c9820d" onclick="tcLtEndForm(\''+t.id+'\')">&#127937; '+E(B("End Trip & Bill","ട്രിപ്പ് അവസാനിപ്പിക്കുക / ബില്ല്"))+'</button>' : '<button class="primary" onclick="tcLtBill(\''+t.id+'\')">'+E(B("Create Bill","ബില്ല് ഉണ്ടാക്കുക"))+'</button><button onclick="tcLtReopen(\''+t.id+'\')">'+E(B("Continue trip","ട്രിപ്പ് തുടരുക"))+'</button>';
  var h='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><h2 style="margin:0">&#128661; '+E(t.customer||B("Live Trip","ലൈവ് ട്രിപ്പ്"))+'</h2><button onclick="closeModal()" style="flex:none;padding:4px 14px;min-height:0">&#10005; '+E(B("Close","അടയ്ക്കുക"))+'</button></div>'+placesDl()+
   '<div class="muted" style="font-size:12.5px;margin:4px 0 6px">'+E((t.vehicle||"")+" "+(t.vehicleNo||""))+(t.driverName?' &middot; '+E(t.driverName):'')+(t.mobile?' &middot; '+E(t.mobile):'')+'</div>'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
   '<span style="background:#eef6f7;border:1px solid #b9d6da;border-radius:999px;padding:3px 10px;font-size:12.5px"><b>'+T.km+'</b> km</span>'+
   '<span style="background:#eef6f7;border:1px solid #b9d6da;border-radius:999px;padding:3px 10px;font-size:12.5px"><b>'+T.days+'</b> '+E(B("day(s)","ദിവസം"))+'</span>'+
   '<span style="background:'+(t.status==="active"?"#e6f6ec":"#fff8e6")+';border:1px solid #cfd8dc;border-radius:999px;padding:3px 10px;font-size:12.5px">'+E(t.status==="active"?B("In progress","നടക്കുന്നു"):B("Ended","കഴിഞ്ഞു"))+'</span></div>'+
   '<div class="actions" style="margin:0 0 8px">'+mainBtn+'</div>'+addForm+
   '<div class="listitem" style="font-size:13px"><b>&#128663; '+E(B("Start","പുറപ്പാട്"))+'</b> &mdash; '+E(t.startPlace||"-")+'<br><span class="muted">'+(t.startKm?'km '+E(t.startKm)+' &middot; ':'')+E(fmt(t.startAt))+'</span></div>';
  if(!rows.length) h+='<p class="muted" style="font-size:12.5px;margin:4px 0">'+E(B("No stops yet. Add the places you have been to - in the order you went.","സ്റ്റോപ്പുകൾ ഒന്നുമില്ല. പോയ സ്ഥലങ്ങൾ പോയ ക്രമത്തിൽ ചേർക്കുക."))+'</p>';
  rows.forEach(function(s){ h+=stopHtml(t,s,prev); if(hasKm(s)) prev=+s.km; else if(prev==null&&t.startKm) prev=null; });
  if(t.status!=="active"){
   h+='<div class="listitem" style="font-size:13px"><b>&#127937; '+E(B("Trip end","ട്രിപ്പ് അവസാനം"))+'</b> &mdash; '+E(t.endPlace||"-")+'<br><span class="muted">'+E(fmt(t.endAt))+'</span></div>'+
    '<div class="muted" style="font-size:12px;margin:4px 0">'+E(B("Total hours (start to end): ","ആകെ മണിക്കൂർ (തുടക്കം മുതൽ അവസാനം വരെ): "))+T.hours+E(B(". Subtract overnight rest in the bill form.",". രാത്രി വിശ്രമ സമയം ബില്ല് ഫോമിൽ കുറയ്ക്കുക."))+'</div>';
  }
  /* bottom actions */
  h+='<div class="actions" style="margin-top:10px"><button onclick="tcLtEditTrip(\''+t.id+'\')">'+E(B("Edit details","വിവരങ്ങൾ തിരുത്തുക"))+'</button><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>'+
   '<div class="actions" style="margin-top:6px"><button class="danger" onclick="tcLtDelete(\''+t.id+'\')">'+E(B("Delete this trip","ഈ ട്രിപ്പ് ഡിലീറ്റ് ചെയ്യുക"))+'</button></div>';
  modal(h);
 };
 /* optional KM box: "" = not given (fine), otherwise it must be a number >= 0 */
 function readKm(id){ var v=val(id); if(v==="") return {ok:true,km:null}; var n=parseFloat(v); return (isNaN(n)||n<0)?{ok:false}:{ok:true,km:n}; }
 function readAtOpt(id){ var v=val(id); if(!v) return ""; var d=new Date(v); return isNaN(d)?"":d.toISOString(); }
 window.tcLtAddStop=function(id){
  var t=find(id); if(!t) return;
  var place=val("ltPlace"), type=val("ltType")||"stop", k=readKm("ltKm");
  if(!place){ $("ltErr").textContent=B("Enter the place","സ്ഥലം നൽകുക"); return; }
  if(!k.ok){ $("ltErr").textContent=B("KM must be a number","KM ഒരു സംഖ്യ ആയിരിക്കണം"); return; }
  var pk=null; (t.stops||[]).forEach(function(s){ if(hasKm(s)) pk=+s.km; });
  if(k.km!=null&&pk!=null&&k.km<pk&&!confirm(B("This KM is less than the previous stop ("+pk+"). Add anyway?","ഈ KM മുൻപത്തെ സ്റ്റോപ്പിനേക്കാൾ ("+pk+") കുറവാണ്. എന്നാലും ചേർക്കണോ?"))) return;
  t.stops.push({id:uid(),type:type,place:place,km:k.km,at:readAtOpt("ltAt"),note:val("ltNote")});
  lastType=(type==="pickup")?"dest":type;
  persist(); say(B("Stop added","സ്റ്റോപ്പ് ചേർത്തു")); tcLtOpen(id);
 };
 window.tcLtEditStop=function(id,sid){
  var t=find(id); if(!t) return;
  var s=(t.stops||[]).filter(function(x){ return x.id===sid; })[0]; if(!s) return;
  modal('<h2>'+E(B("Edit stop","സ്റ്റോപ്പ് തിരുത്തുക"))+'</h2>'+placesDl()+'<div class="grid">'+
   '<label>'+E(B("What happened","എന്താണ്"))+'<select id="ltType">'+Object.keys(TYPES).map(function(k){ return '<option value="'+k+'"'+(k===s.type?" selected":"")+'>'+E(tl(k))+'</option>'; }).join("")+'</select></label>'+
   '<label><b>'+E(B("Place","സ്ഥലം"))+'</b><input id="ltPlace" list="tcLtPlaces" value="'+E(s.place)+'"></label>'+
   '<label>'+E(B("KM on trip meter (optional)","ട്രിപ്പ് മീറ്റർ KM (ഓപ്ഷണൽ)"))+'<input id="ltKm" type="number" inputmode="decimal" value="'+(hasKm(s)?E(s.km):"")+'"></label>'+
   '<label>'+E(B("Time (optional)","സമയം (ഓപ്ഷണൽ)"))+'<span style="display:flex;gap:6px"><input id="ltAt" type="datetime-local" style="flex:1" value="'+(s.at?nowLocalInput(s.at):"")+'"><button type="button" style="flex:none" onclick="tcLtNow(\'ltAt\')">&#128339; '+E(B("Now","ഇപ്പോൾ"))+'</button></span></label>'+
   '<label>'+E(B("Note (optional)","കുറിപ്പ് (ഓപ്ഷണൽ)"))+'<input id="ltNote" value="'+E(s.note||"")+'"></label></div>'+
   '<div id="ltErr" class="danger" style="font-size:13px"></div>'+
   '<div class="actions"><button class="primary" onclick="tcLtSaveStop(\''+id+'\',\''+sid+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   '<button onclick="tcLtMoveStop(\''+id+'\',\''+sid+'\',-1)">&#9650; '+E(B("Move up","മുകളിലേക്ക്"))+'</button><button onclick="tcLtMoveStop(\''+id+'\',\''+sid+'\',1)">&#9660; '+E(B("Move down","താഴേക്ക്"))+'</button></div>'+
   '<div class="actions"><button class="danger" onclick="tcLtDelStop(\''+id+'\',\''+sid+'\')">'+E(B("Remove stop","സ്റ്റോപ്പ് നീക്കുക"))+'</button>'+
   '<button onclick="tcLtOpen(\''+id+'\')">'+E(B("Back","പിന്നോട്ട്"))+'</button></div>');
 };
 window.tcLtSaveStop=function(id,sid){
  var t=find(id); if(!t) return;
  var s=(t.stops||[]).filter(function(x){ return x.id===sid; })[0]; if(!s) return;
  var place=val("ltPlace"), k=readKm("ltKm");
  if(!place){ $("ltErr").textContent=B("Enter the place","സ്ഥലം നൽകുക"); return; }
  if(!k.ok){ $("ltErr").textContent=B("KM must be a number","KM ഒരു സംഖ്യ ആയിരിക്കണം"); return; }
  s.type=val("ltType")||s.type; s.place=place; s.km=k.km; s.at=readAtOpt("ltAt"); s.note=val("ltNote");
  persist(); say(B("Saved","സേവ് ചെയ്തു")); tcLtOpen(id);
 };
 window.tcLtMoveStop=function(id,sid,dir){
  var t=find(id); if(!t) return;
  var a=t.stops||[], i=a.map(function(x){ return x.id; }).indexOf(sid), j=i+dir;
  if(i<0||j<0||j>=a.length){ say(B("Cannot move further","ഇനി നീക്കാൻ കഴിയില്ല")); return; }
  var x=a[i]; a[i]=a[j]; a[j]=x;
  persist(); tcLtEditStop(id,sid);
 };
 window.tcLtDelStop=function(id,sid){
  var t=find(id); if(!t) return;
  if(!confirm(B("Remove this stop?","ഈ സ്റ്റോപ്പ് നീക്കണോ?"))) return;
  t.stops=(t.stops||[]).filter(function(x){ return x.id!==sid; });
  persist(); tcLtOpen(id);
 };

 /* ---------- edit trip details ---------- */
 window.tcLtEditTrip=function(id){
  var t=find(id); if(!t) return;
  modal('<h2>'+E(B("Trip details","ട്രിപ്പ് വിവരങ്ങൾ"))+'</h2>'+placesDl()+'<div class="grid">'+
   '<label>'+E(B("Customer name","കസ്റ്റമറുടെ പേര്"))+'<input id="ltName" value="'+E(t.customer)+'"></label>'+
   '<label>'+E(B("Customer mobile","കസ്റ്റമറുടെ മൊബൈൽ"))+'<input id="ltMobile" type="tel" inputmode="tel" value="'+E(t.mobile)+'"></label>'+
   '<label>'+E(B("Vehicle name","വാഹനത്തിൻ്റെ പേര്"))+'<input id="ltVehName" value="'+E(t.vehicle)+'"></label>'+
   '<label>'+E(B("Vehicle number","വാഹന നമ്പർ"))+'<input id="ltVehNo" value="'+E(t.vehicleNo)+'"></label>'+
   '<label>'+E(B("Driver name","ഡ്രൈവറുടെ പേര്"))+'<input id="ltDrv" value="'+E(t.driverName)+'"></label>'+
   '<label>'+E(B("Driver mobile","ഡ്രൈവറുടെ മൊബൈൽ"))+'<input id="ltDrvM" type="tel" inputmode="tel" value="'+E(t.driverMobile)+'"></label>'+
   '<label>'+E(B("Start point","പുറപ്പെടുന്ന സ്ഥലം"))+'<input id="ltStartPlace" list="tcLtPlaces" value="'+E(t.startPlace)+'"></label>'+
   '<label>'+E(B("Start KM (optional)","തുടക്ക KM (ഓപ്ഷണൽ)"))+'<input id="ltStartKm" type="number" inputmode="decimal" value="'+E(t.startKm?t.startKm:"")+'"></label>'+
   '<label>'+E(B("Start time","തുടങ്ങിയ സമയം"))+'<input id="ltStartAt" type="datetime-local" value="'+nowLocalInput(t.startAt)+'"></label>'+
   (t.status!=="active"?'<label>'+E(B("End point","അവസാന സ്ഥലം"))+'<input id="ltEndPlace" list="tcLtPlaces" value="'+E(t.endPlace)+'"></label><label>'+E(B("Total KM of the trip","ട്രിപ്പിൻ്റെ ആകെ KM"))+'<input id="ltTotalKm" type="number" inputmode="decimal" value="'+E(totals(t).km)+'"></label><label>'+E(B("End time","അവസാനിച്ച സമയം"))+'<input id="ltEndAt" type="datetime-local" value="'+nowLocalInput(t.endAt)+'"></label>':'')+
   '</div><div id="ltErr" class="danger" style="font-size:13px"></div>'+
   '<div class="actions"><button class="primary" onclick="tcLtSaveTrip(\''+id+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="tcLtOpen(\''+id+'\')">'+E(B("Back","പിന്നോട്ട്"))+'</button></div>');
 };
 window.tcLtSaveTrip=function(id){
  var t=find(id); if(!t) return;
  var km=parseFloat(val("ltStartKm")); if(isNaN(km)||km<0) km=0;
  var tk=null;
  if(t.status!=="active"){
   tk=parseFloat(val("ltTotalKm"));
   if(isNaN(tk)||tk<0){ $("ltErr").textContent=B("Enter the total KM of the trip","ട്രിപ്പിൻ്റെ ആകെ KM നൽകുക"); return; }
  }
  t.customer=val("ltName"); t.mobile=val("ltMobile"); t.vehicle=val("ltVehName"); t.vehicleNo=val("ltVehNo");
  t.driverName=val("ltDrv"); t.driverMobile=val("ltDrvM"); t.startPlace=val("ltStartPlace"); t.startKm=km; t.startAt=readAt("ltStartAt");
  if(t.status!=="active"){ t.endPlace=val("ltEndPlace"); t.totalKm=tk; t.endKm=km+tk; t.endAt=readAt("ltEndAt"); }
  persist(); say(B("Saved","സേവ് ചെയ്തു")); tcLtOpen(id);
 };

 /* ---------- end / continue / delete ---------- */
 window.tcLtEndForm=function(id){
  var t=find(id); if(!t) return;
  var cur=totals(t).km;
  modal('<h2>&#127937; '+E(B("End Trip","ട്രിപ്പ് അവസാനിപ്പിക്കുക"))+'</h2>'+placesDl()+'<div class="grid">'+
   '<label>'+E(B("Closing point","അവസാനിക്കുന്ന സ്ഥലം"))+'<input id="ltEndPlace" list="tcLtPlaces" value="'+E(t.startPlace||"")+'"></label>'+
   '<label><b>'+E(B("Total KM of this trip (from trip meter A/B)","ട്രിപ്പിൻ്റെ ആകെ KM (ട്രിപ്പ് മീറ്റർ A/B നോക്കി)"))+'</b><input id="ltTotalKm" type="number" inputmode="decimal" value="'+(cur>0?E(cur):"")+'"></label>'+
   '<label>'+E(B("End time","അവസാനിച്ച സമയം"))+'<input id="ltEndAt" type="datetime-local" data-auto="'+nowLocalInput()+'" value="'+nowLocalInput()+'"></label></div>'+
   '<div id="ltErr" class="danger" style="font-size:13px"></div>'+
   '<div class="actions"><button class="primary" onclick="tcLtEnd(\''+id+'\',true)">'+E(B("End & Create Bill","അവസാനിപ്പിച്ച് ബില്ല് ഉണ്ടാക്കുക"))+'</button><button onclick="tcLtEnd(\''+id+'\')">'+E(B("Only End Trip","ട്രിപ്പ് മാത്രം അവസാനിപ്പിക്കുക"))+'</button><button onclick="tcLtOpen(\''+id+'\')">'+E(B("Back","പിന്നോട്ട്"))+'</button></div>');
 };
 window.tcLtEnd=function(id,bill){
  var t=find(id); if(!t) return;
  var tk=parseFloat(val("ltTotalKm"));
  if(isNaN(tk)||tk<0){ $("ltErr").textContent=B("Enter the total KM of the trip","ട്രിപ്പിൻ്റെ ആകെ KM നൽകുക"); return; }
  t.totalKm=tk; t.endKm=(+t.startKm||0)+tk;
  t.endPlace=val("ltEndPlace"); t.endAt=readAt("ltEndAt"); t.status="ended";
  persist(); say(B("Trip ended","ട്രിപ്പ് അവസാനിപ്പിച്ചു"));
  if(bill) tcLtBill(id); else tcLtOpen(id);
 };
 window.tcLtReopen=function(id){
  var t=find(id); if(!t) return;
  t.status="active"; persist(); tcLtOpen(id);
 };
 window.tcLtDelete=function(id){
  var t=find(id); if(!t) return;
  if(!confirm(B("Delete this trip log permanently? (A bill already made from it is NOT deleted.)","ഈ ട്രിപ്പ് ലോഗ് എന്നെന്നേക്കുമായി ഡിലീറ്റ് ചെയ്യണോ? (ഇതിൽ നിന്ന് ഉണ്ടാക്കിയ ബില്ല് ഡിലീറ്റ് ആകില്ല.)"))) return;
  db.liveTrips=L().filter(function(x){ return x.id!==id; });
  persist(); closeModal(); say(B("Deleted","ഡിലീറ്റ് ചെയ്തു"));
 };
 window.tcLtHistory=function(){
  var list=mine();
  var h='<h2>'+E(B("All trips","എല്ലാ ട്രിപ്പുകളും"))+'</h2>'+(list.map(function(t){
   var T=totals(t);
   var st=t.status==="active"?B("In progress","നടക്കുന്നു"):t.status==="billed"?B("Billed","ബില്ല് ചെയ്തു"):B("Ended","കഴിഞ്ഞു");
   return '<div class="listitem" style="font-size:13px"><b>'+E(t.customer||"-")+'</b> <span class="muted">'+E(st)+'</span><br><span class="muted">'+E(fmt(t.startAt))+' &middot; '+T.km+' km &middot; '+(t.stops||[]).length+E(B(" stops"," സ്റ്റോപ്പുകൾ"))+'</span>'+
    '<div class="actions" style="margin-top:4px"><button onclick="tcLtOpen(\''+t.id+'\')">'+E(B("Open","തുറക്കുക"))+'</button>'+(t.status!=="active"?'<button class="primary" onclick="tcLtBill(\''+t.id+'\')">'+E(B("Create Bill","ബില്ല് ഉണ്ടാക്കുക"))+'</button>':'')+'</div></div>';
  }).join("")||'<p class="muted">'+E(B("No trips yet.","ട്രിപ്പുകളൊന്നും ഇല്ല."))+'</p>')+'<div class="actions"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(h);
 };

 /* ---------- make the bill (the normal Quick Bill form, pre-filled) ---------- */
 var billingId=null;
 var origOpenQB=window.openQuickBillForm;
 if(typeof origOpenQB==="function") window.openQuickBillForm=function(){ billingId=null; return origOpenQB.apply(this,arguments); };
 var origSaveQB=window.saveQuickBill;
 if(typeof origSaveQB==="function") window.saveQuickBill=function(){
  var before=db.trips.length, lid=billingId;
  var r=origSaveQB.apply(this,arguments);
  try{
   if(lid&&db.trips.length>before){
    var t=find(lid); if(t){ t.status="billed"; t.tripId=db.trips[0].id; billingId=null; persist(); }
   }
  }catch(e){}
  return r;
 };
 function setIf(id,v){ var e=$(id); if(e&&v!=null&&v!=="") e.value=v; }
 window.tcLtBill=function(id){
  var t=find(id); if(!t) return;
  if(t.status==="active"){ say(B("End the trip first","ആദ്യം ട്രിപ്പ് അവസാനിപ്പിക്കുക")); tcLtEndForm(id); return; }
  if(typeof origOpenQB!=="function"){ say("Quick Bill is not available"); return; }
  var T=totals(t), route=[], pickups=[];
  sortedStops(t).forEach(function(s){
   if(s.type==="stop") return;
   if(s.type==="pickup"){ pickups.push(s.place); return; }
   route.push(s.place);
  });
  var pickup=pickups.join(" / ");
  origOpenQB();
  billingId=id;
  setIf("qbName",t.customer); setIf("qbMobile",t.mobile); setIf("qbVehicle",t.vehicle); setIf("qbVehicleNo",t.vehicleNo);
  setIf("qbDriverName",t.driverName); setIf("qbDriverMobile",t.driverMobile);
  setIf("qbVehicleStart",t.startPlace); setIf("qbPickup",pickup); setIf("qbDest",route[0]);
  for(var i=1;i<route.length;i++){ try{ addQuickBillStopField(route[i]); }catch(e){} }
  setIf("qbReturn",t.endPlace); setIf("qbKm",T.km); setIf("qbHours",T.hours); setIf("qbDays",T.days);
  try{ var d=new Date(t.startAt); var iso=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); setIf("qbDate",iso); }catch(e){}
  try{ var v=(db.vehicles||[]).filter(function(x){ return x.no&&x.no===t.vehicleNo; })[0]; if(v&&v.cat!=null) setIf("qbCat",v.cat); }catch(e){}
  say(B("Details filled in from the trip - choose rate, check and Create Bill","ട്രിപ്പിൽ നിന്ന് വിവരങ്ങൾ നിറച്ചു - റേറ്റ് തിരഞ്ഞെടുത്ത് പരിശോധിച്ച് ബില്ല് ഉണ്ടാക്കുക"));
 };

 /* ---------- Premium cloud backup includes the live trips ---------- */
 try{ if(typeof TC_BK_LISTS!=="undefined"&&TC_BK_LISTS.indexOf("liveTrips")<0) TC_BK_LISTS.push("liveTrips"); }catch(e){}
})();
