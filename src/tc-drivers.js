/* Driver list (tc-drivers.js, loaded by tc-regdocs.js).
   Button "Drivers" in Trip & Accounts opens the list of the owner's drivers (db.drivers - the same list the
   Rate Master page adds to). Each driver card shows: name, mobile (Call), vehicle, LICENCE number + expiry date
   (red when expired, amber when it ends within 30 days) and, for This week / This month / All time:
   number of trips, wages / bata on his trips, driver tips (to give / given / direct from customer).
   Drivers that appear on trips or tips but are not in the list are shown with an "Add to list" button.
   Add / edit / delete: licence number, licence expiry, note are new optional fields on the driver
   (older drivers keep working; db.drivers is already part of the cloud backup). Reads trips and the Accounts book only. */
(function(){
 if(window.__tcDrivers) return;
 window.__tcDrivers=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var M=function(n){ try{ return money(n); }catch(e){ return "₹"+Math.round(+n||0); } };
 var dF=function(x){ try{ return tcFormatDate(x); }catch(e){ return x||""; } };
 var say=function(m){ try{ toast(m); }catch(e){} };
 function A(){ return window.__tcAbApi; }
 function p2(n){ return String(n).padStart(2,"0"); }
 function ymd(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
 function today(){ return ymd(new Date()); }
 function weekStart(){ var d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); return ymd(d); }
 function from(per){ return per==="week"?weekStart():per==="month"?today().slice(0,8)+"01":""; }
 function digits(s){ return String(s||"").replace(/\D/g,"").slice(-10); }
 function nm(s){ return String(s||"").trim().toLowerCase().replace(/\s+/g," "); }
 var PER="month";

 function quoteOf(t){ return (db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]||null; }
 function tripDate(t){ var q=quoteOf(t)||{}; return String(t.startDate||q.startDate||t.entryDate||t.created||"").slice(0,10); }
 function same(rec,name,mobile){
  if(digits(rec.mobile)&&digits(mobile)&&digits(rec.mobile)===digits(mobile)) return true;
  return !!nm(name)&&nm(rec.name)===nm(name);
 }
 /* the owner's drivers + people named on trips / tips that are not in the list */
 function records(){
  var recs=(db.drivers||[]).map(function(d,i){ return {idx:i,d:d,name:d.name||"",mobile:d.mobile||"",licence:d.licence||"",exp:d.licExpiry||"",note:d.note||"",veh:d.vehicleIdx}; });
  function ensure(name,mobile){
   if(!nm(name)&&!digits(mobile)) return;
   for(var i=0;i<recs.length;i++){ if(same(recs[i],name,mobile)) return; }
   recs.push({idx:-1,d:null,name:name||"",mobile:mobile||"",licence:"",exp:"",note:"",veh:null});
  }
  (db.trips||[]).forEach(function(t){ if(t&&(t.driverName||t.driverMobile)) ensure(t.driverName,t.driverMobile); });
  var a=A(); if(a) a.entries().forEach(function(e){ if(a.isDrv(e)&&e.driver) ensure(e.driver,""); });
  return recs;
 }
 function stats(rec,f){
  var a=A(), s={trips:0,wages:0,toGive:0,given:0,direct:0};
  if(!a) return s;
  var byTrip={}; a.entries().forEach(function(e){ if(e.tripId) (byTrip[e.tripId]=byTrip[e.tripId]||[]).push(e); });
  (db.trips||[]).forEach(function(t){
   if(!t||!same(rec,t.driverName,t.driverMobile)) return;
   var d=tripDate(t); if(f&&d<f) return;
   s.trips++;
   (byTrip[t.id]||[]).forEach(function(e){ if(e.type==="out"&&e.cat==="Driver wages / bata") s.wages+=(+e.amount||0); });
  });
  a.entries().forEach(function(e){
   if(!a.isDrv(e)||!same(rec,e.driver,"")) return;
   if(f&&e.date<f) return;
   var x=+e.amount||0; if(e.direct) s.direct+=x; else if(e.drvPaid) s.given+=x; else s.toGive+=x;
  });
  return s;
 }
 function licInfo(rec){
  if(!rec.licence&&!rec.exp) return {txt:B("Licence not added","ലൈസൻസ് ചേർത്തിട്ടില്ല"),color:"#777",flag:0};
  var t=B("Licence ","ലൈസൻസ് ")+(rec.licence||"");
  if(!rec.exp) return {txt:t,color:"#333",flag:0};
  var days=Math.round((new Date(rec.exp+"T12:00:00")-new Date(today()+"T12:00:00"))/86400000);
  if(days<0) return {txt:t+" · "+B("EXPIRED ","കഴിഞ്ഞു ")+dF(rec.exp),color:"#b3261e",flag:2,bold:1};
  if(days<=30) return {txt:t+" · "+B("expires "+dF(rec.exp)+" ("+days+" days)",dF(rec.exp)+" ന് തീരും ("+days+" ദിവസം)"),color:"#9a6700",flag:1,bold:1};
  return {txt:t+" · "+B("valid till ","വരെ ")+dF(rec.exp),color:"#1c6b2c",flag:0};
 }
 function vehName(i){ var v=(i===null||i===undefined||i==="")?null:(db.vehicles||[])[+i]; return v?((v.name||"")+(v.no?" "+v.no:"")).trim():""; }

 window.tcDrvList=function(per){
  if(per) PER=per;
  var f=from(PER), recs=records();
  var pers=[["week",B("This week","ഈ ആഴ്ച")],["month",B("This month","ഈ മാസം")],["all",B("All time","എല്ലാ കാലവും")]];
  var rows=recs.map(function(r){ return {r:r,s:stats(r,f),l:licInfo(r)}; });
  rows.sort(function(a,b){ return (b.l.flag-a.l.flag)||(b.s.trips-a.s.trips)||nm(a.r.name).localeCompare(nm(b.r.name)); });
  var warn=rows.filter(function(x){ return x.l.flag>0; }).length;
  var h='<h2>&#128101; '+E(B("Drivers","ഡ്രൈവർമാർ"))+'</h2>'+
   '<div class="actions" style="margin-bottom:6px">'+pers.map(function(p){ return '<button class="'+(PER===p[0]?"primary":"")+'" onclick="tcDrvList(\''+p[0]+'\')">'+E(p[1])+'</button>'; }).join("")+'</div>'+
   '<div class="actions" style="margin-bottom:6px"><button class="primary" onclick="tcDrvEdit(-1)">+ '+E(B("Add driver","ഡ്രൈവർ ചേർക്കുക"))+'</button></div>'+
   (warn?'<div style="background:#fff3e0;border:1px solid #e0a526;border-radius:8px;padding:6px 8px;font-size:12.5px;margin-bottom:6px">&#9888; '+E(B(warn+" driver licence(s) expired or ending within 30 days.",warn+" ഡ്രൈവറുടെ ലൈസൻസ് കഴിഞ്ഞു / 30 ദിവസത്തിനുള്ളിൽ തീരും."))+'</div>':'');
  if(!rows.length) h+='<p class="muted">'+E(B("No drivers yet. Tap Add driver.","ഡ്രൈവർമാർ ഇല്ല. 'ഡ്രൈവർ ചേർക്കുക' അമർത്തുക."))+'</p>';
  rows.forEach(function(x,i){
   var r=x.r, s=x.s, l=x.l, vn=vehName(r.veh), tel=digits(r.mobile);
   h+='<div class="listitem" style="margin:6px 0"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="min-width:0"><b>'+E(r.name||B("(no name)","(പേര് ഇല്ല)"))+'</b>'+
    (r.mobile?' <span class="muted" style="font-size:12px">'+E(r.mobile)+'</span>':'')+
    (vn?'<div class="muted" style="font-size:12px">&#128663; '+E(vn)+'</div>':'')+'</div>'+
    '<div style="white-space:nowrap">'+(tel?'<a href="tel:'+E(tel)+'" style="display:inline-block;padding:4px 10px;border-radius:12px;background:#0b6b78;color:#fff;text-decoration:none;font-size:12.5px;font-weight:700">&#128222;</a> ':'')+
    '<button style="font-size:12px;padding:4px 10px" onclick="tcDrvEdit('+(r.idx>=0?r.idx:"-2,"+i)+')">'+E(r.idx>=0?B("Edit","തിരുത്തുക"):B("Add to list","ലിസ്റ്റിൽ ചേർക്കുക"))+'</button></div></div>'+
    '<div style="font-size:12.5px;margin-top:3px;color:'+l.color+';'+(l.bold?'font-weight:700':'')+'">'+E(l.txt)+'</div>'+
    '<div style="font-size:12.5px;margin-top:3px">'+E(B("Trips ","ട്രിപ്പ് "))+'<b>'+s.trips+'</b> &middot; '+E(B("Wages/bata ","ബത്ത "))+'<b>'+M(s.wages)+'</b></div>'+
    ((s.toGive+s.given+s.direct)>0?'<div style="font-size:12px;margin-top:2px" class="muted">&#127873; '+E(B("Tips: to give ","ടിപ്പ്: കൊടുക്കാൻ "))+'<b style="color:'+(s.toGive>0?"#b3261e":"inherit")+'">'+M(s.toGive)+'</b> &middot; '+E(B("given ","കൊടുത്തത് "))+M(s.given)+' &middot; '+E(B("direct ","നേരിട്ട് "))+M(s.direct)+'</div>':'')+
    (r.note?'<div class="muted" style="font-size:12px;margin-top:2px">'+E(r.note)+'</div>':'')+'</div>';
   window.__tcDrvGhost=window.__tcDrvGhost||{}; window.__tcDrvGhost[i]={name:r.name,mobile:r.mobile};
  });
  h+='<div class="actions"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(h);
 };
 window.tcDrvEdit=function(idx,ghost){
  var d=idx>=0?(db.drivers||[])[idx]:null, g=(idx===-2&&window.__tcDrvGhost)?window.__tcDrvGhost[ghost]:null;
  d=d||g||{};
  var vs=(db.vehicles||[]).map(function(v,i){ return '<option value="'+i+'"'+(String(d.vehicleIdx)===String(i)?" selected":"")+'>'+E((v.name||"")+" "+(v.no||""))+'</option>'; }).join("");
  modal('<h2>'+E(idx>=0?B("Edit driver","ഡ്രൈവർ തിരുത്തുക"):B("Add driver","ഡ്രൈവർ ചേർക്കുക"))+'</h2><div class="grid">'+
   '<label>'+E(B("Name","പേര്"))+'<input id="dvName" value="'+E(d.name||"")+'"></label>'+
   '<label>'+E(B("Mobile","മൊബൈൽ"))+'<input id="dvMob" type="tel" value="'+E(d.mobile||"")+'"></label>'+
   '<label>'+E(B("Vehicle (optional)","വാഹനം (ഓപ്ഷണൽ)"))+'<select id="dvVeh"><option value="">-</option>'+vs+'</select></label>'+
   '<label>'+E(B("Licence number (optional)","ലൈസൻസ് നമ്പർ (ഓപ്ഷണൽ)"))+'<input id="dvLic" value="'+E(d.licence||"")+'"></label>'+
   '<label>'+E(B("Licence valid till (optional)","ലൈസൻസ് കാലാവധി (ഓപ്ഷണൽ)"))+tcDateInputHtml("dvExp",d.licExpiry||"")+'</label>'+
   '<label>'+E(B("Note (optional)","കുറിപ്പ് (ഓപ്ഷണൽ)"))+'<input id="dvNote" value="'+E(d.note||"")+'"></label></div>'+
   '<div class="actions"><button class="primary" onclick="tcDrvSave('+idx+')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   (idx>=0?'<button onclick="tcDrvDel('+idx+')" style="color:#b3261e">'+E(B("Delete","ഒഴിവാക്കുക"))+'</button>':'')+
   '<button onclick="tcDrvList()">'+E(B("Back","പിന്നിലേക്ക്"))+'</button></div>');
 };
 window.tcDrvSave=function(idx){
  var v=function(id){ var e=document.getElementById(id); return e?String(e.value||"").trim():""; };
  var name=v("dvName"); if(!name){ say(B("Enter the driver's name","ഡ്രൈവറുടെ പേര് നൽകുക")); return; }
  var exp=tcReadDateInput("dvExp"); if(exp===null){ say(B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക")); return; }
  var o={name:name.slice(0,60),mobile:v("dvMob").slice(0,20),vehicleIdx:v("dvVeh")!==""?+v("dvVeh"):null,licence:v("dvLic").slice(0,40),licExpiry:exp||"",note:v("dvNote").slice(0,120)};
  if(!db.drivers) db.drivers=[];
  if(idx>=0&&db.drivers[idx]) Object.assign(db.drivers[idx],o); else db.drivers.push(Object.assign({created:new Date().toISOString()},o));
  save(); say(B("Saved","സേവ് ചെയ്തു")); tcDrvList();
 };
 window.tcDrvDel=function(idx){
  var d=(db.drivers||[])[idx]; if(!d) return;
  if(!confirm(B("Remove "+d.name+" from the driver list? Trips and tips already recorded stay.",d.name+" നെ ഡ്രൈവർ ലിസ്റ്റിൽ നിന്ന് ഒഴിവാക്കട്ടേ? രേഖപ്പെടുത്തിയ ട്രിപ്പുകളും ടിപ്പുകളും നിലനിൽക്കും."))) return;
  db.drivers.splice(idx,1); save(); tcDrvList();
 };
 window.__tcDrvApi={records:records,stats:stats,licInfo:licInfo};
})();
