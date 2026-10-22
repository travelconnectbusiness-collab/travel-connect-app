/* Owner (taxi / travel) Dashboard layout (tc-home.js, loaded by tc-regdocs.js).
   1) NEW card "Bookings & follow-ups" right under the business box: today's and tomorrow's confirmed bookings
      (time, customer, route, own vehicle / partner), the number of bookings in the next 7 days, and the open
      enquiries (call-backs due first).  Tap -> Booking Schedule / Enquiries.  Reads db.bookings and db.enquiries only.
   2) Order of the dashboard: business box, Live Trip Log, Trip & Accounts (tc-livetrip.js / tc-accbook.js keep those two
      directly under the business box), Bookings card, the four main buttons (New Enquiry / New Quotation /
      Quick Bill / Trips), Messages, the other button rows,
      and at the very bottom ONE closed box "More" holding the things that are set once and rarely
      touched: Verification & Plan, Shop window (ad posts + social links), Test Notification, Blood Donors,
      the counters, Business workflow, Useful Places, Emergency Contacts.
   3) Driver licence alert (added 2026-10-22): a red / amber strip right under the business box when a driver's licence
      (Drivers list in Trip & Accounts) is expired or ends within 30 days. Tap -> the Drivers list. It disappears by itself
      when the expiry date is updated. Reads db.drivers through window.__tcDrvApi (tc-drivers.js).
   Nothing is deleted - boxes are only moved. Scripts that add boxes next to #tcUpCard keep working
   because #tcUpCard moves into "More" together with them. */
(function(){
 if(window.__tcHome) return;
 window.__tcHome=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 function p2(n){ return String(n).padStart(2,"0"); }
 function ymd(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
 function today(){ return ymd(new Date()); }
 function shift(day,n){ var d=new Date(day+"T12:00:00"); d.setDate(d.getDate()+n); return ymd(d); }
 function tF(x){ try{ return tcFormatTime(x); }catch(e){ return x||""; } }
 function dF(x){ try{ return tcFormatDate(x); }catch(e){ return x||""; } }
 function short(s,n){ s=String(s||""); return s.length>n?s.slice(0,n)+"…":s; }
 function $(id){ return document.getElementById(id); }

 /* ---------- the Bookings & follow-ups card ---------- */
 function who(b){
  if(b.own===true) return "🚖 "+((b.vehName||"")+(b.vehNo?" "+b.vehNo:"")).trim();
  if(b.own===false) return "🤝 "+((b.partner&&b.partner.name)||B("Partner","പാർട്ണർ"));
  return "⚠ "+B("vehicle not set","വാഹനം തീരുമാനിച്ചിട്ടില്ല");
 }
 function stateTxt(b){
  try{
   var st=typeof window.tcBkFlowState==="function"?window.tcBkFlowState(b):"";
   var m={billed:B("✅ billed","✅ ബില്ല് ചെയ്തു"),road:B("🚗 on trip","🚗 ട്രിപ്പിൽ"),ended:B("🏁 bill pending","🏁 ബില്ല് ബാക്കി"),done:B("✔ done - bill pending","✔ കഴിഞ്ഞു - ബില്ല് ബാക്കി")};
   return m[st]?' · '+m[st]:'';
  }catch(e){ return ""; }
 }
 function openPast(t){
  if(typeof window.tcBkFlowState!=="function") return 0;
  return (db.bookings||[]).filter(function(b){ return b.status!=="cancelled"&&b.date&&b.date<t&&b.date>=shift(t,-30)&&["new","road","ended"].indexOf(window.tcBkFlowState(b))>=0; }).length;
 }
 function row(b,color){
  var place=short([b.pickup,b.dest].filter(Boolean).join(" → "),38);
  return '<div onclick="tcSchedule()" style="cursor:pointer;border-left:4px solid '+color+';background:#fff;border-radius:8px;padding:6px 8px;margin:4px 0;border-top:1px solid #e6ebee;border-right:1px solid #e6ebee;border-bottom:1px solid #e6ebee">'+
   '<div style="font-weight:800;font-size:14px">'+(b.time?E(tF(b.time))+' · ':'')+E(b.name)+' <span style="font-weight:400;font-size:12px" class="muted">'+E(b.mobile||"")+'</span></div>'+
   '<div class="muted" style="font-size:12.5px;word-break:break-word">'+E(place)+(place?' · ':'')+E(who(b))+stateTxt(b)+'</div></div>';
 }
 function openEnquiries(){
  var bk=(db.bookings||[]).filter(function(b){ return b.status!=="cancelled"; });
  return (db.enquiries||[]).filter(function(e){
   if((e.outcome||"open")!=="open") return false;
   return !bk.some(function(b){ return b.enquiryId===e.id; });
  });
 }
 function cardHtml(){
  var t=today(), tm=shift(t,1), wk=shift(t,7);
  var bk=(db.bookings||[]).filter(function(b){ return b.status!=="cancelled"; });
  function on(d){ return bk.filter(function(b){ return b.date===d; }).sort(function(a,b){ return String(a.time||"").localeCompare(String(b.time||"")); }); }
  var td=on(t), nx=on(tm);
  var np=openPast(t);
  var later=bk.filter(function(b){ return b.date>tm&&b.date<=wk; }).length;
  var h='<div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><h3 style="margin:0">📅 '+E(B("Bookings & follow-ups","ബുക്കിംഗുകൾ & ഫോളോ-അപ്പ്"))+'</h3>'+
   '<button onclick="tcSchedule()" style="padding:5px 10px;font-size:12px">'+E(B("Schedule","ഷെഡ്യൂൾ"))+' ›</button></div>';
  if(np>0) h+='<div onclick="tcSchedule()" style="cursor:pointer;background:#fdecec;border:1px solid #e3b4b4;border-radius:8px;padding:6px 8px;margin-top:6px;font-size:12.5px"><b>⚠ '+np+'</b> '+E(B("past booking(s) not billed yet - tap to close them (trip done / make bill)","കഴിഞ്ഞ ബുക്കിംഗ് ബില്ല് ചെയ്തിട്ടില്ല - അമർത്തി ട്രിപ്പ് കഴിഞ്ഞു / ബില്ല് ഉണ്ടാക്കുക"))+' ›</div>';
  h+='<div style="font-weight:800;font-size:13px;color:#a12d2d;margin-top:6px">'+E(B("Today","ഇന്ന്"))+' ('+td.length+')</div>';
  h+=td.map(function(b){ return row(b,"#c0392b"); }).join("")||'<div class="muted" style="font-size:12.5px">'+E(B("No bookings today.","ഇന്ന് ബുക്കിംഗ് ഇല്ല."))+'</div>';
  h+='<div style="font-weight:800;font-size:13px;color:#8a5a00;margin-top:6px">'+E(B("Tomorrow","നാളെ"))+' ('+nx.length+')</div>';
  h+=nx.map(function(b){ return row(b,"#e0a526"); }).join("")||'<div class="muted" style="font-size:12.5px">'+E(B("No bookings tomorrow.","നാളെ ബുക്കിംഗ് ഇല്ല."))+'</div>';
  if(later>0) h+='<div style="font-size:12.5px;margin-top:5px" onclick="tcSchedule()"><b>'+later+'</b> '+E(B("more bookings in the next 7 days","ബുക്കിംഗുകൾ അടുത്ത 7 ദിവസത്തിൽ കൂടി"))+' ›</div>';
  var oe=openEnquiries();
  oe.sort(function(a,b){
   var ca=a.callback&&a.callback<=t?0:1, cb=b.callback&&b.callback<=t?0:1;
   if(ca!==cb) return ca-cb;
   return String(b.created||"").localeCompare(String(a.created||""));
  });
  var due=oe.filter(function(e){ return e.callback&&e.callback<=t; }).length;
  h+='<div style="border-top:1px dashed #cfd8de;margin-top:8px;padding-top:6px"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;font-size:13px">'+E(B("Open enquiries","തുറന്ന എൻക്വയറികൾ"))+' ('+oe.length+')'+(due?' <span style="color:#a12d2d">· 📞 '+due+' '+E(B("call back due","തിരികെ വിളിക്കണം"))+'</span>':'')+'</div>'+
   '<button onclick="view(\'enquiries\')" style="padding:4px 10px;font-size:12px">'+E(B("Open","തുറക്കുക"))+' ›</button></div>';
  h+=oe.slice(0,3).map(function(e){
   var dest=(e.destinations&&e.destinations.length)?e.destinations.join(" → "):(e.dest||"");
   return '<div onclick="view(\'enquiries\')" style="cursor:pointer;font-size:12.5px;padding:3px 0;border-bottom:1px solid #eef1f3"><b>'+E(e.name)+'</b> · '+E(short([e.pickup,dest].filter(Boolean).join(" → "),30))+(e.date?' · 📅 '+E(dF(e.date)):'')+(e.callback&&e.callback<=t?' · 📞':'')+'</div>';
  }).join("")||'<div class="muted" style="font-size:12.5px">'+E(B("No open enquiries.","തുറന്ന എൻക്വയറികൾ ഇല്ല."))+'</div>';
  h+='</div>';
  return h;
 }

 /* ---------- driver licence alert ---------- */
 function licHtml(){
  var api=window.__tcDrvApi; if(!api) return "";
  var bad=[], t0=today();
  try{
   api.records().forEach(function(r){
    if(!r.exp) return;
    var days=Math.round((new Date(r.exp+"T12:00:00")-new Date(t0+"T12:00:00"))/86400000);
    if(!isNaN(days)&&days<=30) bad.push({n:r.name||r.mobile||"",exp:r.exp,days:days});
   });
  }catch(e){ return ""; }
  if(!bad.length) return "";
  bad.sort(function(a,b){ return a.days-b.days; });
  var red=bad[0].days<0;
  var h='<div style="font-weight:800;font-size:14px;color:'+(red?"#b3261e":"#8a5a00")+'">&#9888; '+E(B("Driver licence alert","ഡ്രൈവർ ലൈസൻസ് മുന്നറിയിപ്പ്"))+'</div>';
  bad.slice(0,3).forEach(function(x){
   h+='<div style="font-size:13px;margin-top:2px"><b>'+E(x.n)+'</b> &middot; '+(x.days<0
    ?'<span style="color:#b3261e;font-weight:700">'+E(B("licence EXPIRED ","ലൈസൻസ് കഴിഞ്ഞു "))+E(dF(x.exp))+'</span>'
    :'<span style="color:#8a5a00;font-weight:700">'+E(B("licence ends "+dF(x.exp)+" ("+x.days+" days)","ലൈസൻസ് "+dF(x.exp)+" ന് തീരും ("+x.days+" ദിവസം)"))+'</span>')+'</div>';
  });
  if(bad.length>3) h+='<div class="muted" style="font-size:12.5px;margin-top:2px">+'+(bad.length-3)+' '+E(B("more","കൂടി"))+'</div>';
  h+='<div class="muted" style="font-size:12px;margin-top:3px">&#128073; '+E(B("Tap to open the Drivers list","ഡ്രൈവർ ലിസ്റ്റ് തുറക്കാൻ തൊടുക"))+'</div>';
  return '<div data-red="'+(red?1:0)+'">'+h+'</div>';
 }

 /* ---------- arrange ---------- */
 function act(host,sel){
  var a=host.children;
  for(var i=0;i<a.length;i++){ if(a[i].classList&&a[i].classList.contains("actions")&&a[i].querySelector(sel)) return a[i]; }
  return null;
 }
 function profile(host,h2){
  var kids=host.children;
  for(var i=0;i<kids.length;i++){
   var k=kids[i];
   if(k===h2||k.tagName!=="DIV"||k.id||k.classList.contains("actions")||k.classList.contains("grid")) continue;
   if(k.querySelector("button[onclick*=\"view('partner')\"]")) return k;
  }
  return null;
 }
 function arrange(){
  var app=$("app"); if(!app) return;
  var h2=app.querySelector(".card>h2");
  if(!h2||!/Travel Connect Dashboard|ഡാഷ്ബോർഡ്/i.test(h2.textContent)) return;
  var host=h2.parentNode;
  if(!host.querySelector("button[onclick*=\"view('enquiries')\"]")) return;   /* only the taxi / travel owner dashboard */
  /* Bookings card */
  var bc=$("tcBkCard");
  if(!bc){ bc=document.createElement("div"); bc.className="card"; bc.id="tcBkCard"; bc.style.cssText="padding:10px 12px;margin:0 0 10px;border-radius:12px;border:2px solid #0b6b7a;background:#f4fbfc"; host.appendChild(bc); }
  var html=cardHtml();
  if(bc.getAttribute("data-sig")!==html){ bc.setAttribute("data-sig",html); bc.innerHTML=html; }
  /* Driver licence alert (only when there is something to warn about) */
  var lc=$("tcLicCard"), lh="";
  try{ lh=typeof window.tcDrvList==="function"?licHtml():""; }catch(e){ lh=""; }
  if(lh){
   if(!lc){ lc=document.createElement("div"); lc.id="tcLicCard"; lc.onclick=function(){ try{ window.tcDrvList(); }catch(e){} }; host.appendChild(lc); }
   if(lc.getAttribute("data-sig")!==lh){
    lc.setAttribute("data-sig",lh); lc.innerHTML=lh;
    var red=lh.indexOf('data-red="1"')>=0;
    lc.style.cssText="cursor:pointer;padding:8px 12px;margin:0 0 10px;border-radius:12px;border:2px solid "+(red?"#d9534f":"#e0a526")+";background:"+(red?"#fdecec":"#fff6e0");
   }
  }else if(lc){ lc.remove(); lc=null; }
  /* Backup-file reminder (tc-filebk.js): no backup file for 30 days */
  var fc=$("tcFbCard"), fh="";
  try{ fh=typeof window.tcFbReminderHtml==="function"?window.tcFbReminderHtml():""; }catch(e){ fh=""; }
  if(fh){
   if(!fc){ fc=document.createElement("div"); fc.id="tcFbCard"; fc.style.cssText="padding:8px 12px;margin:0 0 10px;border-radius:12px;border:2px solid #4a8fc2;background:#eef6fc"; host.appendChild(fc); }
   if(fc.getAttribute("data-sig")!==fh){ fc.setAttribute("data-sig",fh); fc.innerHTML=fh; }
  }else if(fc){ fc.remove(); fc=null; }
  /* More box */
  var more=$("tcMore");
  if(!more){
   more=document.createElement("details"); more.id="tcMore"; more.className="card"; more.style.cssText="padding:8px 12px;margin:10px 0";
   more.innerHTML='<summary style="font-weight:800;font-size:14px;cursor:pointer;padding:6px 0">⚙ '+E(B("More: plan, shop window, settings & tools","കൂടുതൽ: പ്ലാൻ, ഷോപ്പ് വിൻഡോ, സെറ്റിംഗ്സ്, ടൂളുകൾ"))+'</summary><div id="tcMoreBody" style="margin-top:8px"></div>';
   host.appendChild(more);
  }
  var body=$("tcMoreBody");
  /* things that go into More (moved only when they are not already there) */
  var items=[$("tcUpCard"),$("tcMediaCard"),$("tcPtCard"),$("tcBloodCard"),$("custUsefulPlaces"),$("custEmergency")];
  var kids=host.children;
  for(var i=0;i<kids.length;i++){
   var k=kids[i];
   if(k.tagName==="HR"||(k.classList&&k.classList.contains("grid")&&k.querySelector(".metric"))||(k.classList&&k.classList.contains("card")&&!k.id&&k.querySelector(".notice")&&k.querySelector("h3"))) items.push(k);
  }
  items.forEach(function(el){ if(el&&el.parentNode!==body&&body) body.appendChild(el); });
  /* order of what stays on top */
  var seq=[profile(host,h2),$("tcLicCard"),$("tcLiveCard"),$("tcFbCard"),$("tcAbCard"),bc,act(host,"button[onclick*=\"view('enquiries')\"]"),$("tcMsgCard"),
   act(host,"button[onclick*=\"view('activeboard')\"]"),act(host,"button[onclick*=\"tcOpenDirectory\"]"),act(host,"button[onclick*=\"tcShowPartnerTripHistory\"]")];
  var prev=h2;
  seq.forEach(function(el){
   if(!el||el.parentNode!==host) return;
   if(prev.nextElementSibling!==el) host.insertBefore(el,prev.nextElementSibling);
   prev=el;
  });
  if(host.lastElementChild!==more) host.appendChild(more);
 }
 var t=null;
 function later(){ clearTimeout(t); t=setTimeout(function(){ try{ arrange(); }catch(e){ if(window.console) console.error("tc-home",e); } },90); }
 function start(){
  var app=$("app"); if(!app||!window.MutationObserver) return;
  new MutationObserver(later).observe(app,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
