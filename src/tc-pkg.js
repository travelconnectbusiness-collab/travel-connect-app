/* Saved packages for the Quotation form (tc-pkg.js, loaded by tc-regdocs.js after tc-import.js).
   A package = a tour you quote again and again (e.g. "Munnar 2 days"). On the Quotation form a "Packages" box offers:
     Use       - fills the form from the chosen package: trip type, vehicle category, destinations, day-wise itinerary, KM, hours, days,
                 rest hours, rate (a fixed package price = rate "Custom / Manual Amount" + the amount), service, extra-rate overrides,
                 driver bata, discount, round off, advance %, other charges and the Fare Details note.
                 NOT touched: customer name / mobile, pickup point, vehicle number, dates and times.
     Save this as a package - stores the form as it is now (asks for a name; the same name asks before it is replaced).
     Manage    - rename / delete.
   Stored in db.settings.packages (travels with the app data and the file backup). Nothing is sent to the server. */
(function(){
 if(window.__tcPkg) return;
 window.__tcPkg=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var $=function(id){ return document.getElementById(id); };
 var val=function(id){ var e=$(id); return e?String(e.value==null?"":e.value):""; };
 function S0(){ if(!db.settings) db.settings={}; return db.settings; }
 function list(){ var s=S0(); if(!Array.isArray(s.packages)) s.packages=[]; return s.packages; }
 function persist(){ try{ save(); }catch(e){} }
 function catName(){ var i=+val("qCat"); return (db.categories&&db.categories[i]&&db.categories[i].name)||""; }
 function extraKeys(){ return Array.prototype.map.call(document.querySelectorAll('[id^="qExtra_"]'),function(e){ return e.id; }); }
 function snapshot(){
  var ex={}; extraKeys().forEach(function(id){ var v=parseFloat(val(id)); if(v>0) ex[id]=v; });
  return {
   type:val("qType"),cat:catName(),rate:val("qRate"),custom:parseFloat(val("qCustom"))||0,
   km:parseFloat(val("qKm"))||0,hours:parseFloat(val("qHours"))||0,days:parseFloat(val("qDays"))||1,rest:parseFloat(val("qRestHours"))||0,
   dests:(typeof collectDestinations==="function"?collectDestinations():[]),itin:(typeof collectItinerary==="function"?collectItinerary():[]),
   ovKm:val("qOverrideAddKm"),ovHr:val("qOverrideAddHour"),service:val("qService"),fareNote:val("qFareNote"),
   bataOn:!!($("qBataOn")&&$("qBataOn").checked),bata:parseFloat(val("qBata"))||0,
   discType:val("qDiscType"),discValue:parseFloat(val("qDiscValue"))||0,round:val("qRound"),advPct:val("qAdvancePct"),extra:ex
  };
 }
 function setv(id,v){ var e=$(id); if(e) e.value=v==null?"":v; }
 function apply(p){
  if(!p) return;
  setv("qType",p.type); try{ handleTripTypeChange(); }catch(e){}
  if(p.cat&&db.categories){ for(var i=0;i<db.categories.length;i++){ if(db.categories[i]&&db.categories[i].name===p.cat){ setv("qCat",String(i)); break; } } }
  setv("qRate",p.rate); setv("qCustom",p.custom?p.custom:""); if($("qCustom")) $("qCustom").dataset.auto="0";
  setv("qKm",p.km||""); setv("qHours",p.hours||""); setv("qDays",p.days||1); setv("qRestHours",p.rest||0);
  var c=$("qStopsContainer"); if(c) c.innerHTML="";
  var d=p.dests||[]; setv("qDest",d[0]||""); for(var k=1;k<d.length;k++){ try{ addStopField(d[k]); }catch(e){} }
  var ic=$("qItineraryContainer"); if(ic) ic.innerHTML="";
  (p.itin||[]).forEach(function(t){ try{ addItineraryDay(t); }catch(e){} });
  setv("qOverrideAddKm",p.ovKm); setv("qOverrideAddHour",p.ovHr); setv("qService",p.service); setv("qFareNote",p.fareNote);
  var bo=$("qBataOn"); if(bo){ bo.checked=!!p.bataOn; try{ toggleBata(); }catch(e){} if(p.bataOn) setv("qBata",p.bata); }
  setv("qDiscType",p.discType||"none"); setv("qDiscValue",p.discValue||0); setv("qRound",p.round||"0"); setv("qAdvancePct",p.advPct||"0");
  extraKeys().forEach(function(id){ setv(id,(p.extra&&p.extra[id])||0); });
  try{ handleLocalCheck(); }catch(e){}
  try{ calcQuote(); }catch(e){}
 }
 function byId(id){ return list().filter(function(p){ return p.id===id; })[0]||null; }
 function boxHtml(){
  var l=list();
  return '<div id="tcPkgBox" style="border:1px dashed #9ab7b3;border-radius:10px;padding:8px;margin-bottom:10px"><div style="font-weight:700;font-size:13px">&#128230; '+E(B("Packages","പാക്കേജുകൾ"))+'</div>'+
   (l.length?'<div style="display:flex;gap:6px;margin-top:4px"><select id="tcPkgSel" style="flex:1"><option value="">'+E(B("- choose a package -","- പാക്കേജ് തിരഞ്ഞെടുക്കുക -"))+'</option>'+l.map(function(p){ return '<option value="'+E(p.id)+'">'+E(p.name)+'</option>'; }).join("")+'</select><button type="button" class="primary" onclick="tcPkgUse()">'+E(B("Use","എടുക്കുക"))+'</button></div>':
    '<div class="muted" style="font-size:12px;margin-top:2px">'+E(B("No package saved yet. Fill the form for a tour you quote often, then tap 'Save this as a package'.","പാക്കേജ് ഒന്നും സേവ് ചെയ്തിട്ടില്ല. പതിവായി ക്വോട്ട് ചെയ്യുന്ന ടൂറിന്റെ ഫോം പൂരിപ്പിച്ച് 'പാക്കേജായി സേവ് ചെയ്യുക' അമർത്തുക."))+'</div>')+
   '<div class="actions" style="margin-top:4px"><button type="button" onclick="tcPkgSave()">&#128190; '+E(B("Save this as a package","പാക്കേജായി സേവ് ചെയ്യുക"))+'</button>'+(l.length?'<button type="button" onclick="tcPkgManage()">'+E(B("Manage","മാറ്റുക / ഒഴിവാക്കുക"))+'</button>':'')+'</div></div>';
 }
 function mount(){
  var n=$("qName"); if(!n||!$("qCat")) return;
  var box=$("tcPkgBox"), sig=list().map(function(p){ return p.id+":"+p.name; }).join("|"), html=boxHtml().replace('<div id="tcPkgBox"','<div id="tcPkgBox" data-sig="'+E(sig)+'"');
  if(box){ if(box.getAttribute("data-sig")===sig) return; var keep=($("tcPkgSel")||{}).value; box.outerHTML=html; if(keep&&$("tcPkgSel")) $("tcPkgSel").value=keep; return; }
  var grid=n.closest(".grid"); if(!grid) return;
  grid.insertAdjacentHTML("beforebegin",html);
 }
 window.tcPkgUse=function(){
  var id=val("tcPkgSel"); if(!id){ say(B("Choose a package first","ആദ്യം ഒരു പാക്കേജ് തിരഞ്ഞെടുക്കുക")); return; }
  var p=byId(id); if(!p) return;
  apply(p);
  say(B("Package filled in: ","പാക്കേജ് നിറച്ചു: ")+p.name+" "+B("- add the customer and dates","- കസ്റ്റമറെയും തീയതിയും ചേർക്കുക"));
 };
 window.tcPkgSave=function(){
  if(!$("qCat")||val("qCat")===""){ say(B("Choose the vehicle category first","ആദ്യം വാഹന വിഭാഗം തിരഞ്ഞെടുക്കുക")); return; }
  var s=snapshot();
  if(!s.dests.length&&!(s.km>0)){ say(B("Fill in the destinations / KM first","ആദ്യം സ്ഥലങ്ങളും KM-ഉം നൽകുക")); return; }
  var def=s.dests.length?s.dests.slice(0,2).join(" - ")+(s.days>1?" "+s.days+"D":""):"";
  var name=(prompt(B("Name of this package","ഈ പാക്കേജിന്റെ പേര്"),def)||"").trim().slice(0,60);
  if(!name) return;
  var ex=list().filter(function(p){ return p.name.toLowerCase()===name.toLowerCase(); })[0];
  if(ex){
   if(!confirm(B("A package named '"+ex.name+"' exists. Replace it?","'"+ex.name+"' എന്ന പാക്കേജ് ഉണ്ട്. മാറ്റിവെക്കട്ടേ?"))) return;
   var keep={id:ex.id,name:ex.name,created:ex.created}; for(var k in ex) delete ex[k];
   for(var k2 in s) ex[k2]=s[k2]; ex.id=keep.id; ex.name=keep.name; ex.created=keep.created; ex.updated=new Date().toISOString();
  }else{
   var id; try{ id=crypto.randomUUID(); }catch(e){ id="pk"+Date.now(); }
   s.id=id; s.name=name; s.created=new Date().toISOString(); list().push(s);
  }
  persist(); say(B("Package saved","പാക്കേജ് സേവ് ചെയ്തു")); mount();
 };
 window.tcPkgManage=function(){
  var l=list();
  var h='<h2>&#128230; '+E(B("Packages","പാക്കേജുകൾ"))+'</h2>';
  if(!l.length) h+='<p class="muted">'+E(B("No packages.","പാക്കേജ് ഇല്ല."))+'</p>';
  l.forEach(function(p){
   h+='<div class="listitem"><b>'+E(p.name)+'</b><div class="muted" style="font-size:12px">'+E([p.type,p.cat,(p.dests||[]).join(" > "),p.days>1?p.days+" days":"",p.km?p.km+" km":"",p.rate==="custom"&&p.custom?"₹"+p.custom:""].filter(Boolean).join(" · "))+'</div>'+
    '<div class="actions"><button onclick="tcPkgRename(\''+E(p.id)+'\')">'+E(B("Rename","പേര് മാറ്റുക"))+'</button><button class="danger" onclick="tcPkgDel(\''+E(p.id)+'\')">'+E(B("Delete","ഒഴിവാക്കുക"))+'</button></div></div>';
  });
  h+='<div class="actions"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(h);
 };
 window.tcPkgRename=function(id){
  var p=byId(id); if(!p) return;
  var n=(prompt(B("New name","പുതിയ പേര്"),p.name)||"").trim().slice(0,60); if(!n) return;
  p.name=n; persist(); tcPkgManage(); mount();
 };
 window.tcPkgDel=function(id){
  var p=byId(id); if(!p) return;
  if(!confirm(B("Delete '"+p.name+"'?","'"+p.name+"' ഒഴിവാക്കട്ടേ?"))) return;
  S0().packages=list().filter(function(x){ return x.id!==id; });
  persist(); tcPkgManage(); mount();
 };
 window.__tcPkgApi={list:list,snapshot:snapshot,apply:apply};
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ mount(); }catch(e){} },100); }
 function start(){
  var app=$("app");
  if(window.MutationObserver&&app) new MutationObserver(later).observe(app,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
