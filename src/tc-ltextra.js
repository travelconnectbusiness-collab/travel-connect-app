/* Live Trip - CHARGES + KM FROM THE MAP (tc-ltextra.js, loaded by tc-regdocs.js after tc-ltloc.js). tc-livetrip.js / core.js / business.js are NOT edited:
   the boxes are put in by a MutationObserver on #modalBody and tcLtBill is wrapped.
   Owner's wish (2026-11-06, on a real trip): 1) toll / parking and the like could not be added while the trip is running; 2) the kilometres should come from the map,
   because the start point is already set (Premium only).
   1) CHARGES (all plans): the Live Trip box gets a row of chips  Toll | Parking | Driver food | Driver stay | Permit | State tax.  Tap a chip -> amount (+ note) -> Add.
      Saved in the trip (t.ex = [{id,k,a,at,n}], save() at once - same safety as the stops). The list under the chips has a remove (x) for every entry and the total.
      "Create Bill" fills the Other Charges boxes of the Quick Bill form (qbExtra_toll ... ) with the totals, so the bill carries them. The keys are the bill's own extra-charge keys.
   2) KM FROM THE MAP (Premium - tcIsPremiumPlan): End Trip form gets "KM from the map" under the Total KM box. It takes the start point (saved coordinates when the start was taken with
      "Take my location", else the typed start place looked up on OpenStreetMap), every stop in the order added (saved coordinates or looked up by name), and the closing point
      (the start again when it is the same place, else looked up by name), asks the public OSRM road router for the DRIVING distance and puts it in the Total KM box (the box stays editable).
      The live trip box has a small "Map km" link that shows the distance so far (start to the last stop) without saving it.
      Places that cannot be found on the map are skipped and named in the message; a failed / slow router only shows a message. The map's road km can differ a little from the trip meter. */
(function(){
 if(window.__tcLtExtra) return;
 window.__tcLtExtra=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){} };
 function premium(){ try{ return typeof tcIsPremiumPlan==="function"&&tcIsPremiumPlan(); }catch(e){ return false; } }
 function find(id){ return (db.liveTrips||[]).filter(function(t){ return t.id===id; })[0]||null; }
 function uid(){ try{ return crypto.randomUUID(); }catch(e){ return "x"+Date.now()+Math.random().toString(16).slice(2); } }
 function save2(){ try{ save(); }catch(e){} }
 function money2(n){ n=Math.round((+n||0)*100)/100; return "₹"+n.toLocaleString("en-IN",{maximumFractionDigits:2}); }
 var KEYS=[["toll","Toll","ടോൾ"],["parking","Parking","പാർക്കിംഗ്"],["driverFood","Driver food","ഡ്രൈവർ ഭക്ഷണം"],["driverStay","Driver stay","ഡ്രൈവർ താമസം"],["permit","Permit","പെർമിറ്റ്"],["stateTax","State tax","സ്റ്റേറ്റ് ടാക്സ്"]];
 function kname(k){ var r=KEYS.filter(function(x){ return x[0]===k; })[0]; return r?B(r[1],r[2]):k; }
 function sums(t){ var o={}; (t.ex||[]).forEach(function(e){ o[e.k]=Math.round(((o[e.k]||0)+(+e.a||0))*100)/100; }); return o; }
 function total(t){ var s=0; (t.ex||[]).forEach(function(e){ s+=+e.a||0; }); return Math.round(s*100)/100; }
 function tidOf(){
  var b=$("modalBody"); if(!b) return "";
  var m=/tcLtAddStop\('([^']+)'\)/.exec(b.innerHTML); return m?m[1]:"";
 }
 function hhmm(iso){ try{ var d=new Date(iso), p=function(n){ return String(n).padStart(2,"0"); }; return p(d.getHours())+":"+p(d.getMinutes()); }catch(e){ return ""; } }

 /* ---------- 1) charges ---------- */
 var pick="";
 function listHtml(t){
  var rows=(t.ex||[]).slice().reverse().map(function(e){
   return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px;padding:3px 0;border-top:1px solid #e3eef0"><span><b>'+E(kname(e.k))+'</b> '+money2(e.a)+' <span class="muted">'+E(hhmm(e.at))+(e.acc?' &#128210;':'')+(e.n?' &middot; '+E(e.n):'')+'</span></span>'+
    '<button type="button" onclick="tcLtxDel(\''+t.id+'\',\''+e.id+'\')" style="flex:none;padding:0 10px;min-height:0;font-size:15px;line-height:24px" aria-label="remove">&times;</button></div>';
  }).join("");
  return rows;
 }
 /* tick: also write it as an expense in Trip & Accounts (only once the book has been opened; remembered) */
 function accOn(){ try{ return localStorage.getItem("tc_ltx_acc")!=="0"; }catch(e){ return true; } }
 function accRow(){
  if(typeof window.tcAbReady!=="function"||!window.tcAbReady()) return "";
  return '<label id="tcLtxAccRow" style="display:flex;flex-direction:row;align-items:center;gap:8px;font-size:12.5px;margin:6px 0 2px"><input type="checkbox" id="tcLtxAcc" style="width:auto;flex:none"'+(accOn()?' checked':'')+'> <span>'+E(B("Also write this as an expense in my Trip & Accounts","ഇത് എന്റെ Trip & Accounts-ൽ ചെലവായും എഴുതുക"))+'</span></label>';
 }
 function boxInner(t){
  var h='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b>&#128176; '+E(B("Toll, parking & charges","ടോൾ, പാർക്കിംഗ് മുതലായവ"))+'</b><span id="tcLtxTot" style="font-weight:700">'+(total(t)>0?money2(total(t)):"")+'</span></div>'+
   '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">'+KEYS.map(function(r){
    return '<button type="button" data-k="'+r[0]+'" onclick="tcLtxPick(\''+r[0]+'\')" style="flex:none;padding:5px 11px;min-height:0;font-size:12.5px;border-radius:999px;'+(pick===r[0]?'background:#0b6b78;color:#fff;':'')+'">'+E(B(r[1],r[2]))+'</button>';
   }).join("")+(premium()?'<button type="button" id="tcLtxMapBtn" onclick="tcLtxMapKm(\'live\')" style="flex:none;padding:5px 11px;min-height:0;font-size:12.5px;border-radius:999px">&#128205; '+E(B("Map km","മാപ്പ് KM"))+'</button>':'')+'</div>'+
   '<div id="tcLtxForm" style="display:'+(pick?'block':'none')+';margin-bottom:6px"><div style="font-size:12.5px;margin-bottom:3px"><b id="tcLtxWhat">'+E(pick?kname(pick):"")+'</b></div>'+
   '<div style="display:flex;gap:6px"><input id="tcLtxAmt" type="number" inputmode="decimal" placeholder="&#8377;" style="flex:1;min-width:0"><input id="tcLtxNote" placeholder="'+E(B("note (optional)","കുറിപ്പ് (ഓപ്ഷണൽ)"))+'" style="flex:2;min-width:0">'+
   '<button type="button" class="primary" onclick="tcLtxAdd()" style="flex:none">'+E(B("Add","ചേർക്കുക"))+'</button></div>'+accRow()+'<div id="tcLtxErr" class="danger" style="font-size:12.5px"></div></div>'+
   '<div id="tcLtxMapMsg" class="muted" style="font-size:12.5px"></div>'+
   '<div id="tcLtxList">'+listHtml(t)+'</div>';
  return h;
 }
 function draw(){
  var box=$("tcLtxBox"); if(!box) return;
  var t=find(box.getAttribute("data-tid")); if(!t) return;
  var keep=$("tcLtxMapMsg")?$("tcLtxMapMsg").innerHTML:"";
  box.innerHTML=boxInner(t);
  if($("tcLtxMapMsg")) $("tcLtxMapMsg").innerHTML=keep;
 }
 function inject(){
  var b=$("modalBody"); if(!b) return;
  var add=$("ltType"), tid=tidOf();
  if(add&&tid&&!$("tcLtxBox")){
   var t=find(tid); if(!t) return;
   var anchor=add.parentNode; while(anchor&&anchor!==b&&!(anchor.getAttribute&&/border:\s*2px/.test(anchor.getAttribute("style")||""))) anchor=anchor.parentNode;
   if(!anchor||anchor===b) return;
   pick="";
   var box=document.createElement("div"); box.id="tcLtxBox"; box.setAttribute("data-tid",tid);
   box.style.cssText="border:2px solid #d9e6c8;border-radius:12px;padding:8px 10px;margin:4px 0 10px;background:#fafdf5";
   box.innerHTML=boxInner(t);
   anchor.parentNode.insertBefore(box,anchor);
  }
  var tk=$("ltTotalKm");
  if(tk&&premium()&&tidFromEnd()&&!$("tcLtxKmRow")){
   var lab=tk.parentNode, row=document.createElement("div"); row.id="tcLtxKmRow"; row.style.cssText="margin:-2px 0 8px";
   row.innerHTML='<button type="button" onclick="tcLtxMapKm(\'end\')" style="padding:6px 12px;min-height:0;font-size:13px">&#128205; '+E(B("KM from the map","മാപ്പിൽ നിന്ന് KM"))+'</button><div id="tcLtxKmMsg" class="muted" style="font-size:12.5px;margin-top:3px"></div>';
   lab.parentNode.insertBefore(row,lab.nextSibling);
  }
 }
 var tmr=0;
 function later(){ clearTimeout(tmr); tmr=setTimeout(function(){ try{ inject(); }catch(e){} },60); }
 function boot(){ var mb=$("modalBody")||document.body; if(window.MutationObserver) new MutationObserver(later).observe(mb,{childList:true,subtree:true}); }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();

 window.tcLtxPick=function(k){
  pick=(pick===k)?"":k; draw();
  if(pick){ var a=$("tcLtxAmt"); if(a) try{ a.focus(); }catch(e){} }
 };
 window.tcLtxAdd=function(){
  var box=$("tcLtxBox"); if(!box) return;
  var t=find(box.getAttribute("data-tid")); if(!t||!pick) return;
  var a=parseFloat(($("tcLtxAmt")||{}).value);
  if(isNaN(a)||a<=0){ var er=$("tcLtxErr"); if(er) er.textContent=B("Enter the amount","തുക നൽകുക"); return; }
  if(!Array.isArray(t.ex)) t.ex=[];
  var ex={id:uid(),k:pick,a:Math.round(a*100)/100,at:new Date().toISOString(),n:String((($("tcLtxNote")||{}).value)||"").trim()};
  var tk=$("tcLtxAcc"), wrote=false;
  if(tk){ try{ localStorage.setItem("tc_ltx_acc",tk.checked?"1":"0"); }catch(e){} if(tk.checked&&typeof window.tcAbLiveExp==="function"){ try{ wrote=!!window.tcAbLiveExp(t,ex); }catch(e){} if(wrote) ex.acc=1; } }
  t.ex.push(ex);
  pick=""; save2(); draw(); say(wrote?B("Added - and written in your expenses","ചേർത്തു - ചെലവായും എഴുതി"):B("Added","ചേർത്തു"));
 };
 window.tcLtxDel=function(tid,eid){
  var t=find(tid); if(!t) return;
  t.ex=(t.ex||[]).filter(function(e){ return e.id!==eid; });
  try{ if(typeof window.tcAbLiveDel==="function") window.tcAbLiveDel(eid); }catch(e){}
  save2(); draw();
 };
 /* the bill carries the charges */
 var oBill=window.tcLtBill;
 if(typeof oBill==="function") window.tcLtBill=function(id){
  var r=oBill.apply(this,arguments), t=find(id);
  try{
   if(t&&(t.ex||[]).length){
    var s=sums(t), n=0;
    Object.keys(s).forEach(function(k){ var e=$("qbExtra_"+k); if(e){ e.value=s[k]; n++; } });
    if(n) say(B("Toll / parking charges filled in from the trip","ടോൾ / പാർക്കിംഗ് തുകകൾ ട്രിപ്പിൽ നിന്ന് ചേർത്തു"));
   }
  }catch(e){}
  return r;
 };

 /* ---------- 2) km from the map ---------- */
 var geo={}, gcount=0;
 function fetchT(url,ms){
  var ctl=(typeof AbortController==="function")?new AbortController():null, tm=ctl?setTimeout(function(){ try{ ctl.abort(); }catch(e){} },ms||12000):0;
  return fetch(url,ctl?{signal:ctl.signal,headers:{Accept:"application/json"}}:{headers:{Accept:"application/json"}}).then(function(r){ clearTimeout(tm); return r.json(); },function(e){ clearTimeout(tm); throw e; });
 }
 function geocode(text){
  var key=String(text||"").trim().toLowerCase(); if(!key) return Promise.resolve(null);
  if(geo[key]!==undefined) return Promise.resolve(geo[key]);
  if(gcount>=8) return Promise.resolve(null);
  gcount++;
  var gps=/^GPS\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i.exec(text);
  if(gps){ geo[key]={lat:+gps[1],lon:+gps[2]}; return Promise.resolve(geo[key]); }
  return new Promise(function(res){ setTimeout(res,gcount>1?1100:0); }).then(function(){
   return fetchT("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q="+encodeURIComponent(text),10000);
  }).then(function(j){
   var p=(j&&j[0])?{lat:+j[0].lat,lon:+j[0].lon}:null; if(p&&(isNaN(p.lat)||isNaN(p.lon))) p=null; geo[key]=p; return p;
  },function(){ return null; });
 }
 function sameText(a,b){ return String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase(); }
 /* the points to drive through, in order: [{label,lat,lon,found}] */
 function points(t,endText,withEnd){
  var list=[{label:t.startPlace||B("Start","പുറപ്പാട്"),lat:t.startLat,lon:t.startLon,text:t.startPlace}];
  (t.stops||[]).forEach(function(s){ if(s.place||s.lat!=null) list.push({label:s.place||"-",lat:s.lat,lon:s.lon,text:s.place}); });
  if(withEnd){
   var et=String(endText||"").trim();
   if(!et||sameText(et,t.startPlace)) list.push({label:t.startPlace||B("Start","പുറപ്പാട്"),lat:t.startLat,lon:t.startLon,text:t.startPlace});
   else list.push({label:et,lat:null,lon:null,text:et});
  }
  return list.reduce(function(chain,p){
   return chain.then(function(){
    if(p.lat!=null&&p.lon!=null&&!isNaN(+p.lat)&&!isNaN(+p.lon)){ p.lat=+p.lat; p.lon=+p.lon; p.found=true; return; }
    return geocode(p.text).then(function(g){ if(g){ p.lat=g.lat; p.lon=g.lon; p.found=true; p.guess=true; } else p.found=false; });
   });
  },Promise.resolve()).then(function(){ return list; });
 }
 function osrm(pts){
  var c=[]; pts.forEach(function(p){ var last=c[c.length-1]; if(!last||Math.abs(last[0]-p.lon)>1e-5||Math.abs(last[1]-p.lat)>1e-5) c.push([p.lon,p.lat]); });
  if(c.length<2) return Promise.resolve(0);
  var url="https://router.project-osrm.org/route/v1/driving/"+c.map(function(x){ return x[0].toFixed(5)+","+x[1].toFixed(5); }).join(";")+"?overview=false&alternatives=false&steps=false";
  return fetchT(url,15000).then(function(j){
   if(j&&j.code==="Ok"&&j.routes&&j.routes[0]) return Math.round(j.routes[0].distance/100)/10;
   throw new Error("noroute");
  });
 }
 var busy=false;
 window.tcLtxMapKm=function(mode){
  var isEnd=(mode==="end"), msgEl=$(isEnd?"tcLtxKmMsg":"tcLtxMapMsg");
  var tid=isEnd?tidFromEnd():((($("tcLtxBox")||{}).getAttribute&&$("tcLtxBox").getAttribute("data-tid"))||"");
  var t=find(tid); if(!t||!msgEl) return;
  if(!premium()){ msgEl.textContent=B("This is a Premium feature.","ഇത് പ്രീമിയം സൗകര്യമാണ്."); return; }
  if(busy) return; busy=true;
  msgEl.style.color=""; msgEl.textContent=B("Getting the distance from the map...","മാപ്പിൽ നിന്ന് ദൂരം എടുക്കുന്നു...");
  var endText=isEnd?String((($("ltEndPlace")||{}).value)||""):"";
  points(t,endText,isEnd).then(function(pts){
   var ok=pts.filter(function(p){ return p.found; }), miss=pts.filter(function(p){ return !p.found; });
   if(ok.length<2) throw {code:"few",miss:miss};
   return osrm(ok).then(function(km){ return {km:km,ok:ok,miss:miss}; });
  }).then(function(r){
   busy=false;
   var tx=r.km+" km "+B("by road (map)","റോഡ് വഴി (മാപ്പ്)")+" · "+r.ok.length+" "+B("points","സ്ഥലങ്ങൾ");
   if(r.ok.some(function(p){ return p.guess; })) tx+=" · "+B("some places found by name","ചില സ്ഥലങ്ങൾ പേര് നോക്കി കണ്ടെത്തിയത്");
   if(r.miss.length) tx+=" · "+B("not found: ","കണ്ടെത്താനായില്ല: ")+r.miss.map(function(p){ return p.label; }).join(", ");
   if(isEnd){
    var box=$("ltTotalKm"); if(box) box.value=r.km;
    t.mapKm=r.km; t.mapKmAt=new Date().toISOString(); save2();
    tx+=" — "+B("filled in; the trip meter may differ a little, you can change it.","നിറച്ചു; ട്രിപ്പ് മീറ്ററിൽ ചെറിയ വ്യത്യാസം വരാം, മാറ്റാം.");
   }
   msgEl.style.color="#1c6b2c"; msgEl.textContent=tx;
  }).catch(function(e){
   busy=false; msgEl.style.color="#a12d2d";
   if(e&&e.code==="few") msgEl.textContent=B("Need the start and at least one place that can be found on the map.","പുറപ്പാടും മാപ്പിൽ കണ്ടെത്താവുന്ന ഒരു സ്ഥലമെങ്കിലും വേണം.")+(e.miss&&e.miss.length?" ("+e.miss.map(function(p){ return p.label; }).join(", ")+")":"");
   else msgEl.textContent=B("The map could not give the distance now. Try again later or type the KM.","മാപ്പിൽ നിന്ന് ഇപ്പോൾ ദൂരം കിട്ടിയില്ല. പിന്നീട് ശ്രമിക്കുക, അല്ലെങ്കിൽ KM ടൈപ്പ് ചെയ്യുക.");
  });
 };
 function tidFromEnd(){
  var b=$("modalBody"); if(!b) return "";
  var m=/tcLtEnd\('([^']+)'/.exec(b.innerHTML); return m?m[1]:"";
 }
})();
