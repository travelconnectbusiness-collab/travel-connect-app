/* Odometer & mileage (tc-odo.js, loaded by tc-regdocs.js after tc-accbook.js and tc-livetrip.js).
   For the taxi / travel owner. Three places, nothing else changes:
   1) FUEL entry (Trip & Accounts > + Expense > Fuel): new optional boxes "Odometer (km)" and "Tank filled full". The same box also appears
      for "Service / Repair" (so the last service reading is known). Saved on the entry itself (e.odo, e.full) - the book, its CSV and the
      Premium Cloud Backup already carry accEntries.
   2) LIVE TRIP: Start Trip gets "Odometer at start" (filled with the vehicle's last known reading), End Trip gets "Odometer at end"; typing it
      fills the trip's Total KM (end - start). Saved on the live trip (t.odoStart, t.odoEnd) - already part of the Cloud Backup.
   3) VEHICLE card / vehicle details (Trip & Accounts > Vehicle Book): a small line "Meter 84,230 km - 15.2 km/L - Rs 6.4/km" and a service warning;
      tapping it opens "Odometer & mileage": current meter, KM this month, average + last mileage, fuel cost per KM, add a reading by hand
      (stored in the vehicle: v.odo list), service every N km (v.svcEvery) and last service reading (v.svcLast, or taken from a
      Service / Repair entry that has a reading).
   MILEAGE = the usual full-tank method: between two FULL-tank fuel entries that have a reading, KM run / litres filled since the earlier one
      (partial fills in between are added up). Entries without a reading or without litres are ignored.
   CURRENT METER = the highest reading of the vehicle (a meter only goes up) from its fuel/service entries, hand readings and live trips
      (matched by vehicle number). A new reading lower than that asks "are you sure?".
   Nothing is sent to the server. */
(function(){
 if(window.__tcOdo) return;
 window.__tcOdo=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var $=function(id){ return document.getElementById(id); };
 var val=function(id){ var e=$(id); return e?String(e.value||"").trim():""; };
 var p2=function(n){ return String(n).padStart(2,"0"); };
 var ymd=function(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); };
 var todayIso=function(){ return ymd(new Date()); };
 var localDate=function(iso){ var d=new Date(iso); return isNaN(d)?todayIso():ymd(d); };
 var nv=function(s){ return String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,""); };
 var num=function(n,dec){ n=+n; if(isNaN(n)) return ""; var f=Math.pow(10,dec||0); n=Math.round(n*f)/f; try{ return n.toLocaleString("en-IN",{maximumFractionDigits:dec||0}); }catch(e){ return String(n); } };
 var rs=function(n){ return "₹"+num(n,1); };

 /* ------------------------------------------------------------------ data */
 function VL(){ return (Array.isArray(db.accVehicles)?db.accVehicles:[]).filter(function(v){ return !v.deleted; }); }
 function EL(){ return (Array.isArray(db.accEntries)?db.accEntries:[]).filter(function(e){ return !e.deleted; }); }
 function vById(id){ return id?VL().filter(function(v){ return v.id===id; })[0]||null:null; }
 function vByNo(no){ var k=nv(no); if(!k) return null; return VL().filter(function(v){ return nv(v.no)===k; })[0]||null; }
 function persist(){ try{ save(); }catch(e){} }
 function readings(v,skipEntryId){
  var out=[];
  EL().forEach(function(e){ if(e.vehId===v.id&&+e.odo>0&&e.id!==skipEntryId) out.push({odo:+e.odo,date:e.date,src:"entry",e:e}); });
  (Array.isArray(v.odo)?v.odo:[]).forEach(function(r){ if(!r.deleted&&+r.odo>0) out.push({odo:+r.odo,date:r.date,src:"manual",r:r}); });
  (Array.isArray(db.liveTrips)?db.liveTrips:[]).forEach(function(t){
   var tv=vByNo(t.vehicleNo); if(!tv||tv.id!==v.id) return;
   if(+t.odoStart>0) out.push({odo:+t.odoStart,date:localDate(t.startAt||t.created),src:"trip"});
   if(+t.odoEnd>0) out.push({odo:+t.odoEnd,date:localDate(t.endAt||t.startAt||t.created),src:"trip"});
  });
  return out;
 }
 function current(v,skipEntryId){
  var best=null; readings(v,skipEntryId).forEach(function(r){ if(!best||r.odo>best.odo) best=r; });
  return best;
 }
 /* full-tank mileage */
 function mileage(v){
  var fills=EL().filter(function(e){ return e.vehId===v.id&&e.cat==="Fuel"&&+e.odo>0&&+e.litres>0; }).sort(function(a,b){ return (+a.odo)-(+b.odo); });
  var anchor=null, acc=0, amt=0, pairs=[];
  fills.forEach(function(f){
   if(anchor==null){ if(f.full){ anchor=+f.odo; acc=0; amt=0; } return; }
   acc+=(+f.litres); amt+=(+f.amount||0);
   if(f.full){
    var km=(+f.odo)-anchor;
    if(km>0&&acc>0) pairs.push({km:km,lit:acc,amt:amt,kmpl:km/acc,date:f.date});
    anchor=+f.odo; acc=0; amt=0;
   }
  });
  var tk=0,tl=0,ta=0; pairs.forEach(function(p){ tk+=p.km; tl+=p.lit; ta+=p.amt; });
  return {pairs:pairs,avg:tl>0?tk/tl:0,last:pairs.length?pairs[pairs.length-1].kmpl:0,perKm:tk>0?ta/tk:0,km:tk,fills:fills.length};
 }
 function service(v){
  var every=+v.svcEvery>0?+v.svcEvery:0; if(!every) return null;
  var last=+v.svcLast>0?+v.svcLast:0;
  EL().forEach(function(e){ if(e.vehId===v.id&&e.cat==="Service / Repair"&&+e.odo>last) last=+e.odo; });
  if(!(last>0)) return {every:every,last:0,next:0,left:null,state:"nolast"};
  var cur=current(v), next=last+every, left=cur?next-cur.odo:null;
  return {every:every,last:last,next:next,left:left,state:left==null?"ok":left<=0?"over":left<=500?"soon":"ok"};
 }
 function monthKm(v){
  var ms=todayIso().slice(0,8)+"01", inM=[], before=[];
  readings(v).forEach(function(r){ (r.date>=ms?inM:before).push(r.odo); });
  if(!inM.length) return null;
  var top=Math.max.apply(null,inM), base=before.length?Math.max.apply(null,before):Math.min.apply(null,inM);
  return top>base?top-base:null;
 }

 /* ------------------------------------------------------------------ summary line (vehicle card / details) */
 function svcLine(v){
  var s=service(v); if(!s) return "";
  if(s.state==="nolast") return '<div style="font-size:12px;color:#7a4b00">&#128295; '+E(B("Service every "+num(s.every)+" km - tell the last service reading","സർവീസ് ഓരോ "+num(s.every)+" km - അവസാന സർവീസിലെ റീഡിങ് നൽകുക"))+'</div>';
  if(s.left==null) return '<div class="muted" style="font-size:12px">&#128295; '+E(B("Next service at ","അടുത്ത സർവീസ് "))+num(s.next)+' km</div>';
  if(s.state==="over") return '<div style="font-size:12.5px;color:#a12d2d;font-weight:700">&#9888;&#65039; '+E(B("Service overdue by "+num(-s.left)+" km (was due at "+num(s.next)+")","സർവീസ് "+num(-s.left)+" km വൈകി ("+num(s.next)+"-ൽ ആയിരുന്നു)"))+'</div>';
  if(s.state==="soon") return '<div style="font-size:12.5px;color:#a15a00;font-weight:700">&#128295; '+E(B("Service due in "+num(s.left)+" km (at "+num(s.next)+")","സർവീസ് ഇനി "+num(s.left)+" km (അടുത്തത് "+num(s.next)+")"))+'</div>';
  return '<div class="muted" style="font-size:12px">&#128295; '+E(B("Next service at "+num(s.next)+" km ("+num(s.left)+" km left)","അടുത്ത സർവീസ് "+num(s.next)+" km ("+num(s.left)+" km ബാക്കി)"))+'</div>';
 }
 function boxHtml(v){
  var cur=current(v), m=mileage(v), parts=[];
  if(cur) parts.push(E(B("Meter ","മീറ്റർ "))+'<b>'+num(cur.odo)+' km</b>');
  if(m.avg>0) parts.push('<b>'+num(m.avg,1)+' km/L</b>');
  if(m.perKm>0) parts.push('<b>'+rs(m.perKm)+'/km</b> '+E(B("fuel","ഇന്ധനം")));
  var top=parts.length?'&#9981; '+parts.join(" &middot; "):'<span class="muted">&#9981; '+E(B("Meter reading: not noted - tap to add","മീറ്റർ റീഡിങ്: രേഖപ്പെടുത്തിയിട്ടില്ല - ചേർക്കാൻ തൊടുക"))+'</span>';
  return '<div class="tcOdoBox" onclick="event.stopPropagation();tcOdoOpen(\''+v.id+'\')" style="cursor:pointer;margin-top:6px;padding:6px 8px;border:1px dashed #9ab7b3;border-radius:8px;font-size:13px">'+top+svcLine(v)+'</div>';
 }
 function decorateCards(){
  var items=document.querySelectorAll('#app .listitem[onclick^="tcAbVeh("]');
  Array.prototype.forEach.call(items,function(it){
   if(it.querySelector(".tcOdoBox")) return;
   var m=/tcAbVeh\('([^']+)'\)/.exec(it.getAttribute("onclick")||""); if(!m) return;
   var v=vById(m[1]); if(!v) return;
   it.insertAdjacentHTML("beforeend",boxHtml(v));
  });
 }

 /* ------------------------------------------------------------------ the details window */
 window.tcOdoOpen=function(id){
  var v=vById(id); if(!v) return;
  var cur=current(v), m=mileage(v), mk=monthKm(v), s=service(v);
  var row=function(l,x){ return '<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0"><span>'+E(l)+'</span><b>'+x+'</b></div>'; };
  var h='<h2>&#9981; '+E(B("Odometer & mileage","ഓഡോമീറ്ററും മൈലേജും"))+'</h2><div class="muted" style="font-size:12.5px;margin-bottom:6px">'+E(v.name+(v.no?" ("+v.no+")":""))+'</div>'+
   '<div class="ratebox" style="font-size:13.5px">'+
   row(B("Meter now","ഇപ്പോഴത്തെ മീറ്റർ"),cur?num(cur.odo)+" km":"-")+
   (cur?'<div class="muted" style="font-size:11.5px;margin:-2px 0 4px">'+E(B("last noted ","അവസാനം രേഖപ്പെടുത്തിയത് "))+E(tcFormatDate?tcFormatDate(cur.date):cur.date)+'</div>':"")+
   (mk!=null?row(B("Run this month","ഈ മാസത്തെ ഓട്ടം"),num(mk)+" km"):"")+
   row(B("Average mileage","ശരാശരി മൈലേജ്"),m.avg>0?num(m.avg,1)+" km/L ("+m.pairs.length+")":"-")+
   row(B("Last mileage","അവസാന മൈലേജ്"),m.last>0?num(m.last,1)+" km/L":"-")+
   row(B("Fuel cost per km","ഒരു KM-ന് ഡീസൽ ചെലവ്"),m.perKm>0?rs(m.perKm):"-")+
   '</div>'+
   (m.avg>0?"":'<p class="muted" style="font-size:12px">'+E(B("Mileage appears after two FULL-tank Fuel entries that have the litres and the meter reading (Trip & Accounts > + Expense > Fuel).","ലിറ്ററും മീറ്റർ റീഡിങ്ങും ഉള്ള രണ്ട് ഫുൾ-ടാങ്ക് ഡീസൽ എൻട്രി ആയാൽ മൈലേജ് കാണാം (Trip & Accounts > + ചെലവ് > Fuel)."))+'</p>')+
   svcLine(v)+
   '<h3 style="margin:12px 0 4px;font-size:14px">'+E(B("Add a meter reading","മീറ്റർ റീഡിങ് ചേർക്കുക"))+'</h3>'+
   '<div class="grid"><label>'+E(B("Date","തീയതി"))+tcDateInputHtml("odDate",todayIso())+'</label>'+
   '<label>'+E(B("Odometer (km)","ഓഡോമീറ്റർ (km)"))+'<input id="odVal" type="number" inputmode="decimal" min="0"></label></div>'+
   '<div id="odErr" class="danger" style="font-size:13px"></div>'+
   '<div class="actions"><button class="primary" onclick="tcOdoAdd(\''+id+'\')">'+E(B("Save reading","റീഡിങ് സേവ് ചെയ്യുക"))+'</button></div>'+
   '<h3 style="margin:12px 0 4px;font-size:14px">&#128295; '+E(B("Service reminder","സർവീസ് ഓർമ്മപ്പെടുത്തൽ"))+'</h3>'+
   '<div class="grid"><label>'+E(B("Service every (km)","സർവീസ് ഓരോ (km)"))+'<input id="odEvery" type="number" inputmode="numeric" min="0" value="'+E(v.svcEvery||"")+'" placeholder="10000"></label>'+
   '<label>'+E(B("Last service at (km)","അവസാന സർവീസ് (km)"))+'<input id="odLast" type="number" inputmode="decimal" min="0" value="'+E(v.svcLast||"")+'" placeholder="'+(s&&s.last?E(num(s.last)):"")+'"></label></div>'+
   '<div class="actions"><button onclick="tcOdoSvcSave(\''+id+'\')">'+E(B("Save reminder","ഓർമ്മപ്പെടുത്തൽ സേവ് ചെയ്യുക"))+'</button></div>';
  var rd=readings(v).sort(function(a,b){ return b.odo-a.odo; }).slice(0,8);
  if(rd.length){
   h+='<h3 style="margin:12px 0 4px;font-size:14px">'+E(B("Recent readings","സമീപകാല റീഡിങ്ങുകൾ"))+'</h3>';
   rd.forEach(function(r){
    var src=r.src==="entry"?(r.e.cat==="Fuel"?B("Fuel","ഇന്ധനം"):B("Service","സർവീസ്")):r.src==="trip"?B("Trip","ട്രിപ്പ്"):B("By hand","കൈകൊണ്ട്");
    h+='<div style="display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid #eef1f4"><span>'+E(tcFormatDate?tcFormatDate(r.date):r.date)+' &middot; <span class="muted">'+E(src)+'</span></span><span><b>'+num(r.odo)+' km</b>'+(r.src==="manual"?' <a href="#" onclick="tcOdoDel(\''+id+'\',\''+r.r.id+'\');return false" style="color:#a12d2d;margin-left:6px">&#10005;</a>':'')+'</span></div>';
   });
  }
  h+='<div class="actions"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(h);
 };
 window.tcOdoAdd=function(id){
  var v=vById(id); if(!v) return;
  var odo=parseFloat(val("odVal")), d=tcReadDateInput("odDate");
  var err=$("odErr");
  if(!(odo>0)){ if(err) err.textContent=B("Enter the odometer reading","ഓഡോമീറ്റർ റീഡിങ് നൽകുക"); return; }
  if(d===null){ if(err) err.textContent=B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക"); return; }
  if(!d) d=todayIso();
  var cur=current(v);
  if(cur&&odo<cur.odo&&!confirm(B("This is lower than the last reading ("+num(cur.odo)+" km). Save anyway?","ഇത് അവസാന റീഡിങ്ങിനേക്കാൾ ("+num(cur.odo)+" km) കുറവാണ്. എങ്കിലും സേവ് ചെയ്യട്ടെ?"))) return;
  if(!Array.isArray(v.odo)) v.odo=[];
  var rid; try{ rid=crypto.randomUUID(); }catch(e){ rid="od"+Date.now(); }
  v.odo.push({id:rid,date:d,odo:odo,created:new Date().toISOString()});
  persist(); say(B("Reading saved","റീഡിങ് സേവ് ചെയ്തു"));
  tcOdoOpen(id); refresh();
 };
 window.tcOdoDel=function(id,rid){
  var v=vById(id); if(!v||!Array.isArray(v.odo)) return;
  if(!confirm(B("Delete this reading?","ഈ റീഡിങ് ഡിലീറ്റ് ചെയ്യട്ടെ?"))) return;
  v.odo.forEach(function(r){ if(r.id===rid) r.deleted=true; });
  persist(); tcOdoOpen(id); refresh();
 };
 window.tcOdoSvcSave=function(id){
  var v=vById(id); if(!v) return;
  var ev=parseFloat(val("odEvery")), ls=parseFloat(val("odLast"));
  v.svcEvery=ev>0?ev:""; v.svcLast=ls>0?ls:"";
  persist(); say(B("Saved","സേവ് ചെയ്തു")); tcOdoOpen(id); refresh();
 };
 function refresh(){ var old=document.querySelectorAll(".tcOdoBox"); Array.prototype.forEach.call(old,function(b){ b.parentNode.removeChild(b); }); decorateCards(); }

 /* ------------------------------------------------------------------ 1) fuel / service entry form */
 function chosenVeh(){ var v=val("abVeh"); return v&&v.indexOf("sug:")!==0&&v!=="__new__"?vById(v):null; }
 function editingId(){
  var b=document.querySelector('#modalBody button[onclick^="tcAbSave("]'); if(!b) return "";
  var m=/tcAbSave\('([^']*)'/.exec(b.getAttribute("onclick")||""); return m?m[1]:"";
 }
 function entrySync(){
  var cat=val("abCat"), r=$("tcOdoRow"), f=$("tcOdoFullRow"); if(!r) return;
  var show=(cat==="Fuel"||cat==="Service / Repair");
  r.style.display=show?"":"none"; if(f) f.style.display=(cat==="Fuel")?"":"none";
  var v=chosenVeh(), cur=v?current(v,editingId()):null, h=$("tcOdoHint");
  if(h) h.textContent=cur?B("Last meter reading: ","അവസാന മീറ്റർ റീഡിങ്: ")+num(cur.odo)+" km":"";
 }
 function entryHook(){
  var lit=$("abLitRow"); if(!lit||$("tcOdoRow")) return;
  var id=editingId(), e=id?(Array.isArray(db.accEntries)?db.accEntries.filter(function(x){ return x.id===id; })[0]:null):null;
  var h='<label id="tcOdoRow" style="display:none">'+E(B("Odometer (km) (optional)","ഓഡോമീറ്റർ (km) (ഓപ്ഷണൽ)"))+'<input id="tcOdoIn" type="number" inputmode="decimal" min="0" value="'+E(e&&+e.odo>0?e.odo:"")+'"><span id="tcOdoHint" class="muted" style="font-size:11.5px"></span></label>'+
   '<label id="tcOdoFullRow" style="display:none;flex-direction:row;align-items:center;gap:8px"><input id="tcOdoFull" type="checkbox" style="width:auto"'+((!e||e.full)?' checked':'')+'> '+E(B("Tank filled full","ടാങ്ക് ഫുൾ ആക്കി"))+'</label>';
  lit.insertAdjacentHTML("afterend",h);
  entrySync();
 }
 var origSave=window.tcAbSave;
 if(typeof origSave==="function") window.tcAbSave=function(id,type){
  var oe=$("tcOdoIn"), fe=$("tcOdoFull");
  var visible=!!(oe&&oe.parentNode&&oe.parentNode.style.display!=="none");
  var odo=visible?parseFloat(oe.value):NaN, full=!!(fe&&fe.checked), cat=val("abCat");
  if(odo>0){
   var v=chosenVeh(), cur=v?current(v,id):null;
   if(cur&&odo<cur.odo&&!confirm(B("This meter reading is lower than the last one ("+num(cur.odo)+" km). Save anyway?","ഈ മീറ്റർ റീഡിങ് അവസാനത്തേതിനേക്കാൾ ("+num(cur.odo)+" km) കുറവാണ്. എങ്കിലും സേവ് ചെയ്യട്ടെ?"))) return;
  }
  var list=Array.isArray(db.accEntries)?db.accEntries:null, before=list?list.length:0;
  var r=origSave.apply(this,arguments);
  try{
   var md=document.querySelector("#modal"), closed=!!(md&&md.classList.contains("hidden"));
   if(!closed) return r;   /* the save was refused (amount / date missing) - nothing to add */
   list=Array.isArray(db.accEntries)?db.accEntries:[];
   var e=null;
   if(id) e=list.filter(function(x){ return x.id===id; })[0]||null;
   else if(list.length>before) e=list[list.length-1];
   if(e){
    if(odo>0&&(e.cat==="Fuel"||e.cat==="Service / Repair")){ e.odo=odo; if(e.cat==="Fuel") e.full=full; else delete e.full; }
    else if(id&&visible){ delete e.odo; delete e.full; }
    persist(); setTimeout(refresh,150);
   }
  }catch(x){}
  return r;
 };

 /* ------------------------------------------------------------------ 2) live trip start / end */
 function startFill(force){
  var o=$("ltOdoStart"); if(!o) return;
  var v=vByNo(val("ltVehNo")), cur=v?current(v):null, h=$("ltOdoHint");
  if(cur&&(force||!o.value||o.dataset.auto==="1")){ o.value=cur.odo; o.dataset.auto="1"; }
  if(h) h.textContent=cur?B("Last known meter reading of this vehicle: ","ഈ വാഹനത്തിന്റെ അവസാന മീറ്റർ റീഡിങ്: ")+num(cur.odo)+" km":"";
 }
 function startHook(){
  var km=$("ltStartKm"); if(!km||$("ltOdoStart")) return;
  if(!document.querySelector('#modalBody button[onclick="tcLtStart()"]')) return;   /* only the Start Trip form, not the edit form */
  var lab=km.parentNode;
  lab.insertAdjacentHTML("beforebegin",'<label id="tcLtOdoRow"><b>'+E(B("Odometer at start (optional)","തുടങ്ങുമ്പോഴത്തെ ഓഡോമീറ്റർ (ഓപ്ഷണൽ)"))+'</b><input id="ltOdoStart" type="number" inputmode="decimal" min="0"><span id="ltOdoHint" class="muted" style="font-size:11.5px"></span></label>');
  startFill(false);
 }
 var origStart=window.tcLtStart;
 if(typeof origStart==="function") window.tcLtStart=function(){
  var odo=parseFloat(val("ltOdoStart")), vno=val("ltVehNo");
  if(odo>0){
   var v=vByNo(vno), cur=v?current(v):null;
   if(cur&&odo<cur.odo&&!confirm(B("This meter reading is lower than the vehicle's last reading ("+num(cur.odo)+" km). Continue?","ഈ റീഡിങ് വാഹനത്തിന്റെ അവസാന റീഡിങ്ങിനേക്കാൾ ("+num(cur.odo)+" km) കുറവാണ്. തുടരട്ടെ?"))) return;
  }
  var n0=(db.liveTrips||[]).length;
  var r=origStart.apply(this,arguments);
  try{
   var list=db.liveTrips||[];
   if(odo>0&&list.length>n0&&list[0]){ list[0].odoStart=odo; persist(); }
  }catch(x){}
  return r;
 };
 function endTripId(){
  var b=document.querySelector('#modalBody button[onclick^="tcLtEnd("]'); if(!b) return "";
  var m=/tcLtEnd\('([^']*)'/.exec(b.getAttribute("onclick")||""); return m?m[1]:"";
 }
 function ltFind(id){ return (db.liveTrips||[]).filter(function(t){ return t.id===id; })[0]||null; }
 function endHook(){
  var tk=$("ltTotalKm"); if(!tk||$("ltOdoEnd")) return;
  if(!endTripId()) return;   /* only the End Trip form */
  var t=ltFind(endTripId());
  var lab=tk.parentNode, st=t&&+t.odoStart>0?+t.odoStart:0;
  lab.insertAdjacentHTML("beforebegin",'<label id="tcLtOdoEndRow"><b>'+E(B("Odometer at end (optional)","അവസാനിക്കുമ്പോഴത്തെ ഓഡോമീറ്റർ (ഓപ്ഷണൽ)"))+'</b><input id="ltOdoEnd" type="number" inputmode="decimal" min="0"><span class="muted" style="font-size:11.5px">'+(st?E(B("Started at "+num(st)+" km - the Total KM below is filled for you","തുടങ്ങിയത് "+num(st)+" km - താഴെയുള്ള ആകെ KM തനിയെ നിറയും")):E(B("Start reading was not noted","തുടക്ക റീഡിങ് രേഖപ്പെടുത്തിയിട്ടില്ല")))+'</span></label>');
 }
 var origEnd=window.tcLtEnd;
 if(typeof origEnd==="function") window.tcLtEnd=function(id,bill){
  var odo=parseFloat(val("ltOdoEnd")), t=ltFind(id);
  if(odo>0&&t&&+t.odoStart>0&&odo<+t.odoStart){ var er=$("ltErr"); if(er) er.textContent=B("The end meter reading is lower than the start reading ("+num(t.odoStart)+" km)","അവസാന റീഡിങ് തുടക്ക റീഡിങ്ങിനേക്കാൾ ("+num(t.odoStart)+" km) കുറവാണ്"); return; }
  var r=origEnd.apply(this,arguments);
  try{ var t2=ltFind(id); if(odo>0&&t2&&t2.status==="ended"){ t2.odoEnd=odo; persist(); } }catch(x){}
  return r;
 };
 document.addEventListener("input",function(e){
  var t=e.target; if(!t||!t.id) return;
  if(t.id==="ltOdoEnd"){
   var tr=ltFind(endTripId()), v=parseFloat(t.value);
   if(tr&&+tr.odoStart>0&&v>+tr.odoStart){ var tk=$("ltTotalKm"); if(tk) tk.value=Math.round((v-(+tr.odoStart))*10)/10; }
  }
  if(t.id==="ltOdoStart") t.dataset.auto="0";
  if(t.id==="ltVehNo") startFill(false);
 });
 document.addEventListener("change",function(e){
  var t=e.target; if(!t||!t.id) return;
  if(t.id==="abCat"||t.id==="abVeh") setTimeout(entrySync,30);
  if(t.id==="ltVeh") setTimeout(function(){ startFill(true); },30);
 });

 /* ------------------------------------------------------------------ 3) vehicle details window */
 var origVeh=window.tcAbVeh;
 if(typeof origVeh==="function") window.tcAbVeh=function(id){
  var r=origVeh.apply(this,arguments);
  try{
   var v=vById(id), mb=$("modalBody");
   if(v&&mb&&!mb.querySelector(".tcOdoBox")){
    var rb=mb.querySelector(".ratebox");
    if(rb) rb.insertAdjacentHTML("beforebegin",boxHtml(v)); else mb.insertAdjacentHTML("afterbegin",boxHtml(v));
   }
  }catch(x){}
  return r;
 };

 /* ------------------------------------------------------------------ keep everything hooked as pages and windows are drawn */
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ decorateCards(); entryHook(); startHook(); endHook(); }catch(e){} },90); }
 function start(){
  var app=$("app"), mb=$("modalBody");
  if(window.MutationObserver){
   if(app) new MutationObserver(later).observe(app,{childList:true,subtree:true});
   if(mb) new MutationObserver(later).observe(mb,{childList:true,subtree:true});
  }
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
