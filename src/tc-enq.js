/* Enquiry -> Booking (tc-enq.js, loaded by tc-regdocs.js).  PHASE 1.
   WHAT IT ADDS (business.js is NOT edited - this file wraps its functions):
   1) Enquiry form (both the Quick Fare "Save as Enquiry" and the plain form) gets: pickup TIME, passengers,
      note, SOURCE (customer called directly / came through someone = care-of) with that person's name,
      mobile and the COMMISSION we have to pay him (amount or %).
   2) Enquiry list as cards with an OUTCOME: Open / Booked / Lost (reason chips) and an optional call-back date,
      old-customer hint (same mobile), Call / WhatsApp / Edit.
   3) "Confirm" on an enquiry (and the Quotation "Confirm & Create Trip") makes a BOOKING (db.bookings):
      date, time, customer, mobile, places, category, passengers, source, and
        OWN VEHICLE?  Yes -> choose our vehicle (+ driver); its trip money then goes to that vehicle's book as always
                      No  -> given to a PARTNER: name, mobile, vehicle no, the margin WE receive.
                             The margin is booked in the Trip & Accounts book as "Partner margin" income only when
                             "Margin received" is tapped (cash basis) - it never touches an own vehicle's profit.
      Commission payable to the care-of person is booked as "Commission paid" expense only when "Commission paid" is tapped.
   4) "Booking Schedule" page (#schedule): upcoming bookings by day (Today / Tomorrow / date), past, cancelled.
      Cancel with a reason and whether the advance was refunded.
   5) Quotations saved from an enquiry remember enquiryId; the booking remembers enquiryId / quoteId / tripId.
   Stores: db.bookings, plus extra fields on db.enquiries (time, pax, note, source, via*, comm*, outcome, lostReason, callback, bookingId).
   Phase 2 (later): reminders, same-day clash warning, WhatsApp reminder.  Phase 3: demand report. */
(function(){
 if(window.__tcEnq) return;
 if(typeof enquiries!=="function"||typeof saveEnquiry!=="function"||typeof saveQuickAsEnquiry!=="function"||typeof convertTrip!=="function") return;
 window.__tcEnq=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var $=function(id){ return document.getElementById(id); };
 var V=function(id){ var el=$(id); return el?String(el.value||"").trim():""; };
 var say=function(s){ try{ toast(s); }catch(e){} };
 var M=function(n){ try{ return money(n); }catch(e){ return "Rs."+n; } };
 function p2(n){ return String(n).padStart(2,"0"); }
 function ymd(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
 function today(){ return ymd(new Date()); }
 function shift(day,n){ var d=new Date(day+"T12:00:00"); d.setDate(d.getDate()+n); return ymd(d); }
 function uid(){ try{ return crypto.randomUUID(); }catch(e){ return "bk"+Date.now()+Math.random().toString(16).slice(2); } }
 function dF(x){ try{ return tcFormatDate(x); }catch(e){ return x||""; } }
 function tF(x){ try{ return tcFormatTime(x); }catch(e){ return x||""; } }
 function BL(){ if(!Array.isArray(db.bookings)) db.bookings=[]; return db.bookings; }
 function bById(id){ return BL().filter(function(b){ return b.id===id; })[0]||null; }
 function eById(id){ return (db.enquiries||[]).filter(function(e){ return e.id===id; })[0]||null; }
 function qById(id){ return (db.quotes||[]).filter(function(q){ return q.id===id; })[0]||null; }
 function catName(id){ var c=(db.categories||[])[+id]; return (id===""||id==null||!c)?"":c.name; }
 function digits(m){ return String(m||"").replace(/\D/g,"").slice(-10); }
 function persist(){ try{ save(); }catch(e){} }
 function short(s,n){ s=String(s||""); return s.length>n?s.slice(0,n)+"…":s; }

 /* ---------- backup includes the bookings ---------- */
 try{ if(typeof TC_BK_LISTS!=="undefined"&&TC_BK_LISTS.indexOf("bookings")<0) TC_BK_LISTS.push("bookings"); }catch(e){}

 /* ---------- small helpers ---------- */
 var REASONS=[["price","Price too high","വില കൂടുതൽ"],["busy","Vehicle not free","വാഹനം ഒഴിവില്ല"],["date","Date mismatch","തീയതി ശരിയായില്ല"],["cancel","Customer cancelled","കസ്റ്റമർ ഒഴിവാക്കി"],["other","Other","മറ്റുള്ളവ"]];
 function reasonLabel(k){ var r=REASONS.filter(function(x){ return x[0]===k; })[0]; return r?B(r[1],r[2]):(k||""); }
 function parseComm(s){
  s=String(s||"").trim(); if(!s) return {amount:0,pct:0,text:""};
  var n=parseFloat(s.replace(/[^0-9.]/g,""))||0;
  if(/%/.test(s)) return {amount:0,pct:n,text:s};
  return {amount:n,pct:0,text:s};
 }
 function commLabel(o){ if(o.commPct>0) return o.commPct+"%"; if(o.commAmount>0) return M(o.commAmount); return ""; }
 /* old-customer hint: same mobile in other bookings / enquiries */
 function oldCust(mobile,selfEnq,selfBk){
  var d=digits(mobile); if(!d) return "";
  var n=0,last="";
  BL().forEach(function(b){ if(b.id===selfBk||b.status==="cancelled"||digits(b.mobile)!==d) return; n++; if(b.date&&b.date>last) last=b.date; });
  (db.enquiries||[]).forEach(function(e){ if(e.id===selfEnq||digits(e.mobile)!==d) return; if(BL().some(function(b){ return b.enquiryId===e.id; })) return; n++; var x=e.date||e.entryDate||""; if(x>last) last=x; });
  if(!n) return "";
  return B("Old customer: "+n+" earlier"+(last?", last "+dF(last):""),"പഴയ കസ്റ്റമർ: "+n+" മുൻപ്"+(last?", അവസാനം "+dF(last):""));
 }
 function chip(txt,bg,fg){ return '<span style="display:inline-block;font-size:11px;font-weight:700;padding:1px 8px;border-radius:10px;background:'+bg+';color:'+fg+';margin:0 4px 2px 0">'+E(txt)+'</span>'; }
 function srcChip(o){
  if(o.source==="via") return chip("👤 "+B("Via ","വഴി ")+(o.viaName||"?")+(commLabel(o)?" · "+B("comm ","കമ്മീഷൻ ")+commLabel(o):""),"#fff4e0","#8a5a00");
  return chip("☎ "+B("Direct","നേരിട്ട്"),"#e8f4ea","#1c6b2c");
 }

 /* ---------- extra fields block (enquiry forms) ---------- */
 function srcFieldsHtml(p,o){
  o=o||{};
  return '<label>'+E(B("Source","എവിടെ നിന്ന് വന്നു"))+'<select id="'+p+'Src" onchange="tcEnqSrcToggle(\''+p+'\')"><option value="direct"'+(o.source!=="via"?' selected':'')+'>☎ '+E(B("Customer called directly","കസ്റ്റമർ നേരിട്ട് വിളിച്ചു"))+'</option><option value="via"'+(o.source==="via"?' selected':'')+'>👤 '+E(B("Through someone (care-of)","മറ്റൊരാൾ വഴി (care-of)"))+'</option></select></label>'+
  '<div id="'+p+'ViaBox" class="grid" style="'+(o.source==="via"?'':'display:none')+'">'+
  '<label>'+E(B("Referred by (name)","ആര് വഴി (പേര്)"))+'<input id="'+p+'Via" value="'+E(o.viaName||"")+'"></label>'+
  '<label>'+E(B("His mobile","അയാളുടെ മൊബൈൽ"))+'<input id="'+p+'ViaMob" inputmode="numeric" value="'+E(o.viaMobile||"")+'"></label>'+
  '<label>'+E(B("Commission to pay (₹ or %, blank = none)","കൊടുക്കേണ്ട കമ്മീഷൻ (₹ അല്ലെങ്കിൽ %, ഇല്ലെങ്കിൽ ഒഴിച്ചിടുക)"))+'<input id="'+p+'Comm" value="'+E(o.commText||(o.commPct>0?o.commPct+"%":(o.commAmount>0?o.commAmount:"")))+'"></label></div>';
 }
 function extraHtml(p,withCat){
  return '<div id="'+p+'Extra" style="border:1px dashed #9db4c0;border-radius:10px;padding:8px;margin:8px 0;background:#f7fbfd">'+
   '<b style="font-size:13px">'+E(B("Booking details","ബുക്കിംഗ് വിവരങ്ങൾ"))+'</b>'+
   '<div class="grid">'+
   '<label>'+E(B("Pickup time","പിക്കപ്പ് സമയം"))+'<input id="'+p+'Time" type="time"></label>'+
   (withCat?'<label>'+E(B("Vehicle category","വാഹന വിഭാഗം"))+'<select id="'+p+'Cat">'+tcCategoryOptions()+'</select></label>':'')+
   '<label>'+E(B("Passengers","യാത്രക്കാർ"))+'<input id="'+p+'Pax" type="number" min="1" inputmode="numeric"></label>'+
   '</div>'+srcFieldsHtml(p)+
   '<label>'+E(B("Note","കുറിപ്പ്"))+'<input id="'+p+'Note"></label></div>';
 }
 window.tcEnqSrcToggle=function(p){ var s=$(p+"Src"), b=$(p+"ViaBox"); if(s&&b) b.style.display=s.value==="via"?"":"none"; };
 function readExtras(p){
  var c=parseComm(V(p+"Comm")), src=V(p+"Src")==="via"?"via":"direct";
  var o={time:V(p+"Time"),pax:parseInt(V(p+"Pax"),10)||0,note:V(p+"Note"),source:src,
   viaName:src==="via"?V(p+"Via"):"",viaMobile:src==="via"?V(p+"ViaMob"):"",
   commAmount:src==="via"?c.amount:0,commPct:src==="via"?c.pct:0,commText:src==="via"?c.text:""};
  var cat=V(p+"Cat"); if(cat!=="") o.categoryId=+cat;
  return o;
 }

 /* ---------- Enquiries page ---------- */
 var ENQ={filter:"open"};
 var origEnquiries=window.enquiries;
 window.enquiries=function(){
  var r=origEnquiries.apply(this,arguments);
  try{ decorate(); }catch(e){ if(window.console) console.error("tc-enq",e); }
  return r;
 };
 function decorate(){
  var a=$("app"); if(!a||$("enxExtra")) return;
  var b1=a.querySelector('button[onclick="saveEnquiry()"]');
  if(b1&&b1.parentNode) b1.parentNode.insertAdjacentHTML("beforebegin",extraHtml("enx",true));
  var b2=a.querySelector('button[onclick="saveQuickAsEnquiry()"]');
  if(b2&&b2.parentNode) b2.parentNode.insertAdjacentHTML("beforebegin",extraHtml("eqx",false));
  var h=a.querySelector("h2");
  var top='<div class="actions" style="margin:6px 0"><button class="primary" onclick="tcSchedule()">📅 '+E(B("Booking Schedule","ബുക്കിംഗ് ഷെഡ്യൂൾ"))+' ('+upcoming().length+')</button></div>';
  if(h) h.insertAdjacentHTML("afterend",top);
  var l=$("enqList"); if(l) l.innerHTML=enqListHtml();
 }
 function wrapSave(name,p){
  var orig=window[name];
  window[name]=function(){
   var x=null; try{ x=readExtras(p); }catch(e){}
   var before=(db.enquiries||[]).length;
   var r=orig.apply(this,arguments);
   try{
    if(x&&(db.enquiries||[]).length>before){
     var e=db.enquiries[0];
     for(var k in x) if(x[k]!==""&&x[k]!==undefined&&!(x[k]===0&&k!=="categoryId")) e[k]=x[k];
     e.source=x.source; e.outcome="open";
     if(x.source!=="via"){ delete e.viaName; delete e.viaMobile; delete e.commAmount; delete e.commPct; delete e.commText; }
     persist();
     var l=$("enqList"); if(l) l.innerHTML=enqListHtml();
    }
   }catch(er){ if(window.console) console.error("tc-enq",er); }
   return r;
  };
 }
 wrapSave("saveEnquiry","enx");
 wrapSave("saveQuickAsEnquiry","eqx");

 function outcome(e){ return e.outcome||(BL().some(function(b){ return b.enquiryId===e.id&&b.status!=="cancelled"; })?"booked":"open"); }
 function enqListHtml(){
  var all=(db.enquiries||[]).slice(), cnt={open:0,booked:0,lost:0,all:all.length};
  all.forEach(function(e){ cnt[outcome(e)]++; });
  var tabs=[["open",B("Open","തുറന്നത്")],["booked",B("Booked","ബുക്ക്ഡ്")],["lost",B("Lost","നഷ്ടം")],["all",B("All","എല്ലാം")]];
  var h='<div style="display:flex;gap:6px;margin:8px 0;flex-wrap:wrap">'+tabs.map(function(t){
   var on=ENQ.filter===t[0];
   return '<button onclick="tcEnqFilter(\''+t[0]+'\')" style="padding:5px 11px;font-size:12.5px;'+(on?'background:#0b6b7a;color:#fff;border-color:#0b6b7a':'')+'">'+E(t[1])+' ('+cnt[t[0]]+')</button>';
  }).join("")+'</div>';
  var list=all.filter(function(e){ return ENQ.filter==="all"||outcome(e)===ENQ.filter; });
  list.sort(function(a,b){
   var ca=a.callback&&a.callback<=today()?0:1, cb=b.callback&&b.callback<=today()?0:1;
   if(ca!==cb) return ca-cb;
   return String(b.created||"").localeCompare(String(a.created||""));
  });
  h+=list.map(enqCard).join("")||'<p class="muted">'+E(B("No enquiries here.","ഇവിടെ എൻക്വയറികളില്ല."))+'</p>';
  return h;
 }
 window.tcEnqFilter=function(f){ ENQ.filter=f; var l=$("enqList"); if(l) l.innerHTML=enqListHtml(); };
 function enqCard(e){
  var o=outcome(e), bk=BL().filter(function(b){ return b.enquiryId===e.id; })[0];
  var st=o==="booked"?chip("✅ "+B("Booked","ബുക്ക്ഡ്"),"#e8f4ea","#1c6b2c"):o==="lost"?chip("✖ "+B("Lost","നഷ്ടം")+(e.lostReason?": "+reasonLabel(e.lostReason):""),"#fdecec","#a12d2d"):chip("● "+B("Open","തുറന്നത്"),"#e8f1fb","#1d4f8c");
  var cb=e.callback?(e.callback<=today()?chip("📞 "+B("Call back today/overdue ","തിരികെ വിളിക്കാൻ ")+dF(e.callback),"#fdecec","#a12d2d"):chip("📞 "+B("Call back ","തിരികെ വിളിക്കാൻ ")+dF(e.callback),"#fff4e0","#8a5a00")):"";
  var old=oldCust(e.mobile,e.id,"");
  var place=[e.pickup,(e.destinations&&e.destinations.length?e.destinations.join(" → "):(e.dest||""))].filter(Boolean).join(" → ");
  var when=(e.date?dF(e.date):B("date not fixed","തീയതി തീരുമാനിച്ചിട്ടില്ല"))+(e.time?" · "+tF(e.time):"");
  var meta=[catName(e.categoryId),e.pax?e.pax+" "+B("pax","പേർ"):"",e.type].filter(Boolean).join(" · ");
  var wa=tcWaNumber?tcWaNumber(e.mobile):"";
  var h='<div class="listitem"><div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start"><div><b>'+E(e.name)+'</b> · <a href="tel:'+E(e.mobile)+'">'+E(e.mobile)+'</a></div><div style="text-align:right">'+st+'</div></div>'+
   '<div style="font-size:13px;word-break:break-word">'+E(place)+'</div>'+
   '<div class="muted" style="font-size:12.5px">📅 '+E(when)+(meta?' · '+E(meta):'')+'</div>'+
   '<div style="margin-top:3px">'+srcChip(e)+cb+(old?chip("🔁 "+old,"#eef0f6","#3b4a7a"):'')+'</div>'+
   (e.note?'<div class="muted" style="font-size:12px">📝 '+E(e.note)+'</div>':'')+
   '<div class="muted" style="font-size:11.5px">'+E(B("Entered ","ചേർത്തത് "))+E(dF(e.entryDate||e.created))+(e.status==="quoted"?" · "+E(B("quotation made","ക്വട്ടേഷൻ ഉണ്ടാക്കി")):"")+'</div>'+
   '<div class="actions" style="margin-top:4px">';
  if(o==="open"){
   h+='<button class="primary" onclick="tcEnqConfirm(\''+e.id+'\')">✅ '+E(B("Confirm","കൺഫേം"))+'</button>'+
    '<button onclick="enquiryToQuote(\''+e.id+'\')">'+E(B("Quotation","ക്വട്ടേഷൻ"))+'</button>'+
    '<button onclick="tcEnqLost(\''+e.id+'\')">✖ '+E(B("Lost","നഷ്ടം"))+'</button>'+
    '<button onclick="tcEnqCallback(\''+e.id+'\')">📞 '+E(B("Call back","തിരികെ വിളി"))+'</button>';
  }else if(o==="booked"&&bk){
   h+='<button onclick="tcSchedule()">📅 '+E(B("Open in schedule","ഷെഡ്യൂളിൽ കാണുക"))+'</button>';
  }else if(o==="lost"){
   h+='<button onclick="tcEnqReopen(\''+e.id+'\')">↩ '+E(B("Reopen","വീണ്ടും തുറക്കുക"))+'</button>';
  }
  h+='<button onclick="tcEnqEdit(\''+e.id+'\')">'+E(B("Edit","തിരുത്തുക"))+'</button>';
  if(wa) h+='<button onclick="window.open(\'https://wa.me/'+wa+'\',\'_blank\')">WhatsApp</button>';
  h+='</div></div>';
  return h;
 }
 function refreshList(){ var l=$("enqList"); if(l) l.innerHTML=enqListHtml(); }

 /* ---------- Lost / call back / reopen ---------- */
 window.tcEnqLost=function(id){
  var e=eById(id); if(!e) return;
  modal('<h2>'+E(B("Why was it lost?","എന്തുകൊണ്ട് നഷ്ടമായി?"))+'</h2><p class="muted">'+E(e.name)+'</p>'+
   '<div style="display:flex;flex-direction:column;gap:8px">'+REASONS.map(function(r){ return '<button onclick="tcEnqLostSave(\''+id+'\',\''+r[0]+'\')" style="padding:10px;font-size:14px;text-align:left">'+E(B(r[1],r[2]))+'</button>'; }).join("")+'</div>'+
   '<div class="actions"><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>');
 };
 window.tcEnqLostSave=function(id,r){ var e=eById(id); if(!e) return; e.outcome="lost"; e.lostReason=r; e.lostAt=new Date().toISOString(); e.callback=""; persist(); closeModal(); say(B("Marked as lost","നഷ്ടമായി എന്ന് രേഖപ്പെടുത്തി")); refreshList(); };
 window.tcEnqReopen=function(id){ var e=eById(id); if(!e) return; e.outcome="open"; e.lostReason=""; persist(); refreshList(); };
 window.tcEnqCallback=function(id){
  var e=eById(id); if(!e) return;
  modal('<h2>📞 '+E(B("Call back on","തിരികെ വിളിക്കേണ്ട ദിവസം"))+'</h2><p class="muted">'+E(e.name)+' · '+E(e.mobile)+'</p>'+
   '<label>'+E(B("Date","തീയതി"))+tcDateInputHtml("cbDate",e.callback||shift(today(),1))+'</label>'+
   '<div class="actions"><button class="primary" onclick="tcEnqCallbackSave(\''+id+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+(e.callback?'<button onclick="tcEnqCallbackClear(\''+id+'\')">'+E(B("Remove","ഒഴിവാക്കുക"))+'</button>':'')+'<button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>');
 };
 window.tcEnqCallbackSave=function(id){
  var e=eById(id); if(!e) return;
  var d=tcReadDateInput("cbDate"); if(!d){ say(B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക")); return; }
  e.callback=d; persist(); closeModal(); refreshList();
 };
 window.tcEnqCallbackClear=function(id){ var e=eById(id); if(e) e.callback=""; persist(); closeModal(); refreshList(); };

 /* ---------- Edit enquiry ---------- */
 window.tcEnqEdit=function(id){
  var e=eById(id); if(!e) return;
  var catSel='<select id="xeCat">'+tcCategoryOptions()+'</select>';
  modal('<h2>'+E(B("Edit enquiry","എൻക്വയറി തിരുത്തുക"))+'</h2><div class="grid">'+
   '<label>'+E(B("Customer name","കസ്റ്റമർ പേര്"))+'<input id="xeName" value="'+E(e.name||"")+'"></label>'+
   '<label>'+E(B("Mobile","മൊബൈൽ"))+'<input id="xeMob" inputmode="numeric" value="'+E(e.mobile||"")+'"></label>'+
   '<label>'+E(B("Pickup","പിക്കപ്പ്"))+'<input id="xePick" value="'+E(e.pickup||"")+'"></label>'+
   '<label>'+E(B("Destination","ലക്ഷ്യസ്ഥാനം"))+'<input id="xeDest" value="'+E((e.destinations&&e.destinations.length)?e.destinations.join(" → "):(e.dest||""))+'"></label>'+
   '<label>'+E(B("Required date","ആവശ്യമായ തീയതി"))+tcDateInputHtml("xeDate",e.date||"")+'</label>'+
   '<label>'+E(B("Pickup time","പിക്കപ്പ് സമയം"))+'<input id="xeTime" type="time" value="'+E(e.time||"")+'"></label>'+
   '<label>'+E(B("Vehicle category","വാഹന വിഭാഗം"))+catSel+'</label>'+
   '<label>'+E(B("Passengers","യാത്രക്കാർ"))+'<input id="xePax" type="number" min="1" value="'+E(e.pax||"")+'"></label></div>'+
   srcFieldsHtml("xe",e)+
   '<label>'+E(B("Note","കുറിപ്പ്"))+'<input id="xeNote" value="'+E(e.note||"")+'"></label>'+
   '<div class="actions"><button class="primary" onclick="tcEnqEditSave(\''+id+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>');
  if(e.categoryId!=null&&$("xeCat")) $("xeCat").value=String(e.categoryId);
 };
 window.tcEnqEditSave=function(id){
  var e=eById(id); if(!e) return;
  if(!V("xeName")||!V("xeMob")){ say(B("Enter customer name and mobile","പേരും മൊബൈലും നൽകുക")); return; }
  var d=tcReadDateInput("xeDate"); if(d===null){ say(B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക")); return; }
  var x=readExtras("xe");
  e.name=V("xeName"); e.mobile=V("xeMob"); e.pickup=V("xePick");
  if(V("xeDest")!==((e.destinations&&e.destinations.length)?e.destinations.join(" → "):(e.dest||""))){ e.dest=V("xeDest"); e.destinations=V("xeDest")?[V("xeDest")]:[]; }
  e.date=d||""; e.time=x.time; e.pax=x.pax; e.note=x.note; e.source=x.source;
  e.viaName=x.viaName; e.viaMobile=x.viaMobile; e.commAmount=x.commAmount; e.commPct=x.commPct; e.commText=x.commText;
  if(x.categoryId!=null) e.categoryId=x.categoryId;
  var bk=BL().filter(function(b){ return b.enquiryId===e.id&&b.status!=="cancelled"; })[0];
  if(bk){ bk.name=e.name; bk.mobile=e.mobile; bk.source=e.source; bk.viaName=e.viaName; bk.viaMobile=e.viaMobile; bk.commAmount=e.commAmount; bk.commPct=e.commPct; bk.commText=e.commText; }
  persist(); closeModal(); say(B("Saved","സേവ് ചെയ്തു")); refreshList();
 };

 /* ---------- Confirm -> booking ---------- */
 function ownVehicles(){
  var l=(db.accVehicles||[]).filter(function(v){ return !v.deleted; }).map(function(v){ return {key:"a:"+v.id,id:v.id,name:v.name||"",no:v.no||""}; });
  if(!l.length) l=(db.vehicles||[]).map(function(v,i){ return {key:"v:"+i,id:"",name:v.name||v.model||"",no:v.no||""}; });
  return l;
 }
 function vehLabel(v){ return (v.name||"")+(v.no?" ("+v.no+")":""); }
 /* ctx: {enqId} | {bookingId} | {quoteId,tripId,enqId?} ; draft = new booking object prepared from the sources */
 var BF=null;
 function openForm(draft,isNew){
  BF={draft:draft,isNew:!!isNew};
  var d=draft, vs=ownVehicles();
  var own=d.own===true?"yes":d.own===false?"no":"";
  var vopts='<option value="">-- '+E(B("Choose","തിരഞ്ഞെടുക്കുക"))+' --</option>'+vs.map(function(v){
   var sel=(d.vehId&&v.id===d.vehId)||(!d.vehId&&d.vehNo&&v.no===d.vehNo);
   return '<option value="'+E(v.key)+'"'+(sel?' selected':'')+'>'+E(vehLabel(v))+'</option>';
  }).join("");
  var h='<h2>'+E(isNew?B("Confirm booking","ബുക്കിംഗ് കൺഫേം ചെയ്യുക"):B("Booking details","ബുക്കിംഗ് വിവരങ്ങൾ"))+'</h2>'+
   '<div class="grid"><label>'+E(B("Customer name","കസ്റ്റമർ പേര്"))+'<input id="bkName" value="'+E(d.name||"")+'"></label>'+
   '<label>'+E(B("Mobile","മൊബൈൽ"))+'<input id="bkMob" inputmode="numeric" value="'+E(d.mobile||"")+'"></label>'+
   '<label>'+E(B("Trip date","യാത്രാ തീയതി"))+tcDateInputHtml("bkDate",d.date||"")+'</label>'+
   '<label>'+E(B("Pickup time","പിക്കപ്പ് സമയം"))+'<input id="bkTime" type="time" value="'+E(d.time||"")+'"></label>'+
   '<label>'+E(B("Pickup","പിക്കപ്പ്"))+'<input id="bkPick" value="'+E(d.pickup||"")+'"></label>'+
   '<label>'+E(B("Destination","ലക്ഷ്യസ്ഥാനം"))+'<input id="bkDest" value="'+E(d.dest||"")+'"></label>'+
   '<label>'+E(B("Vehicle category","വാഹന വിഭാഗം"))+'<select id="bkCat">'+tcCategoryOptions()+'</select></label>'+
   '<label>'+E(B("Passengers","യാത്രക്കാർ"))+'<input id="bkPax" type="number" min="1" value="'+E(d.pax||"")+'"></label></div>'+
   srcFieldsHtml("bk",d)+
   '<div style="border:2px solid #0b6b7a;border-radius:10px;padding:8px;margin:8px 0">'+
   '<label><b>'+E(B("Own vehicle?","സ്വന്തം വാഹനമാണോ?"))+'</b><select id="bkOwn" onchange="tcEnqOwnToggle()"><option value=""'+(own===""?' selected':'')+'>-- '+E(B("Decide later","പിന്നീട് തീരുമാനിക്കാം"))+' --</option><option value="yes"'+(own==="yes"?' selected':'')+'>'+E(B("Yes - our own vehicle","അതെ - സ്വന്തം വാഹനം"))+'</option><option value="no"'+(own==="no"?' selected':'')+'>'+E(B("No - given to a partner","അല്ല - പാർട്ണർക്ക് കൊടുത്തു"))+'</option></select></label>'+
   '<div id="bkOwnBox" style="'+(own==="yes"?'':'display:none')+'"><div class="grid">'+
   '<label>'+E(B("Our vehicle","നമ്മുടെ വാഹനം"))+'<select id="bkVeh">'+vopts+'</select></label>'+
   '<label>'+E(B("Vehicle no. (if not in list)","വാഹന നമ്പർ (ലിസ്റ്റിൽ ഇല്ലെങ്കിൽ)"))+'<input id="bkVehNo" value="'+E(d.vehId?"":(d.vehNo||""))+'"></label>'+
   '<label>'+E(B("Driver (optional)","ഡ്രൈവർ (ഓപ്ഷണൽ)"))+'<input id="bkDrv" value="'+E(d.driver||"")+'"></label></div>'+
   '<p class="muted" style="font-size:12px;margin:2px 0">'+E(B("Trip income and expenses go to this vehicle's book as usual.","ട്രിപ്പ് വരവും ചെലവും ഈ വാഹനത്തിന്റെ ബുക്കിൽ പതിവുപോലെ വരും."))+'</p></div>'+
   '<div id="bkPartBox" style="'+(own==="no"?'':'display:none')+'"><div class="grid">'+
   '<label>'+E(B("Given to (partner name)","ആർക്ക് കൊടുത്തു (പാർട്ണർ)"))+'<input id="bkPName" value="'+E((d.partner&&d.partner.name)||"")+'"></label>'+
   '<label>'+E(B("Partner mobile","പാർട്ണർ മൊബൈൽ"))+'<input id="bkPMob" inputmode="numeric" value="'+E((d.partner&&d.partner.mobile)||"")+'"></label>'+
   '<label>'+E(B("Partner vehicle no.","പാർട്ണർ വാഹന നമ്പർ"))+'<input id="bkPVeh" value="'+E((d.partner&&d.partner.vehNo)||"")+'"></label>'+
   '<label>'+E(B("Our margin / commission (₹)","നമുക്ക് കിട്ടുന്ന മാർജിൻ / കമ്മീഷൻ (₹)"))+'<input id="bkPMargin" type="number" inputmode="decimal" value="'+E((d.partner&&d.partner.margin)||"")+'"></label></div>'+
   '<p class="muted" style="font-size:12px;margin:2px 0">'+E(B("The margin is added to the book as 'Partner margin' income only when you tap 'Margin received'. It is not mixed into any own vehicle's profit.","മാർജിൻ 'Margin received' അമർത്തുമ്പോൾ മാത്രമേ ബുക്കിൽ 'Partner margin' വരവായി ചേരൂ. സ്വന്തം വാഹനത്തിന്റെ ലാഭത്തിൽ കലരില്ല."))+'</p></div></div>'+
   '<label>'+E(B("Note","കുറിപ്പ്"))+'<input id="bkNote" value="'+E(d.note||"")+'"></label>'+
   '<div class="actions"><button class="primary" onclick="tcEnqBookSave()">'+E(isNew?B("Confirm booking","ബുക്കിംഗ് കൺഫേം"):B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>';
  modal(h);
  if(d.categoryId!=null&&$("bkCat")) $("bkCat").value=String(d.categoryId);
 }
 window.tcEnqOwnToggle=function(){ var v=V("bkOwn"); if($("bkOwnBox")) $("bkOwnBox").style.display=v==="yes"?"":"none"; if($("bkPartBox")) $("bkPartBox").style.display=v==="no"?"":"none"; };
 function draftFromEnq(e){
  var dests=(e.destinations&&e.destinations.length)?e.destinations.join(" → "):(e.dest||"");
  return {id:uid(),enquiryId:e.id,name:e.name,mobile:e.mobile,date:e.date||"",time:e.time||"",pickup:e.pickup||"",dest:dests,categoryId:e.categoryId,pax:e.pax||0,note:e.note||"",
   source:e.source==="via"?"via":"direct",viaName:e.viaName||"",viaMobile:e.viaMobile||"",commAmount:e.commAmount||0,commPct:e.commPct||0,commText:e.commText||"",own:null,status:"booked",created:new Date().toISOString()};
 }
 window.tcEnqConfirm=function(id){ var e=eById(id); if(!e) return; openForm(draftFromEnq(e),true); };
 window.tcEnqBookEdit=function(id){ var b=bById(id); if(!b) return; openForm(b,false); };
 window.tcEnqBookSave=function(){
  if(!BF) return;
  var d=BF.draft;
  if(!V("bkName")||!V("bkMob")){ say(B("Enter customer name and mobile","പേരും മൊബൈലും നൽകുക")); return; }
  var dt=tcReadDateInput("bkDate");
  if(!dt){ say(B("Enter the trip date as DD-MM-YYYY","യാത്രാ തീയതി DD-MM-YYYY ആയി നൽകുക")); return; }
  var x=readExtras("bk"), own=V("bkOwn");
  if(x.source==="via"&&!x.viaName){ say(B("Enter the name of the person it came through","ആര് വഴി വന്നു എന്ന പേര് നൽകുക")); return; }
  if(own==="no"&&!V("bkPName")){ say(B("Enter the partner's name","പാർട്ണറുടെ പേര് നൽകുക")); return; }
  d.name=V("bkName"); d.mobile=V("bkMob"); d.date=dt; d.time=V("bkTime"); d.pickup=V("bkPick"); d.dest=V("bkDest");
  d.categoryId=V("bkCat")===""?undefined:+V("bkCat"); d.pax=parseInt(V("bkPax"),10)||0; d.note=V("bkNote");
  d.source=x.source; d.viaName=x.viaName; d.viaMobile=x.viaMobile; d.commAmount=x.commAmount; d.commPct=x.commPct; d.commText=x.commText;
  if(own==="yes"){
   d.own=true; d.partner=null;
   var k=V("bkVeh"), vs=ownVehicles(), v=vs.filter(function(z){ return z.key===k; })[0];
   if(v){ d.vehId=v.id; d.vehNo=v.no; d.vehName=v.name; } else { d.vehId=""; d.vehNo=V("bkVehNo"); d.vehName=""; }
   d.driver=V("bkDrv");
  }else if(own==="no"){
   d.own=false; d.vehId=""; d.vehNo=""; d.vehName=""; d.driver="";
   var old=d.partner||{};
   d.partner={name:V("bkPName"),mobile:V("bkPMob"),vehNo:V("bkPVeh"),margin:parseFloat(V("bkPMargin"))||0,received:old.received||[]};
  }else{ d.own=null; }
  if(BF.isNew){ BL().unshift(d); }
  var e=d.enquiryId?eById(d.enquiryId):null;
  if(e){ e.outcome="booked"; e.bookingId=d.id; e.lostReason=""; e.callback=""; if(!e.date) e.date=d.date; }
  BF=null; persist(); closeModal(); say(B("Booking saved - see Booking Schedule","ബുക്കിംഗ് സേവ് ചെയ്തു - ഷെഡ്യൂളിൽ കാണാം"));
  refreshList();
  if($("bkSchedBox")) schedRefresh();
 };

 /* quotation flow: Create Quotation from an enquiry remembers the enquiry; saved quote gets enquiryId */
 var origE2Q=window.enquiryToQuote;
 window.enquiryToQuote=function(id){
  window._tcEnqQ=id;
  var r=origE2Q.apply(this,arguments);
  setTimeout(function(){
   try{
    var e=eById(id); if(!e) return;
    if(e.time&&$("qStartTime")&&!$("qStartTime").value) $("qStartTime").value=e.time;
    var b=BL().filter(function(z){ return z.enquiryId===id&&z.status!=="cancelled"; })[0];
    if(b&&b.own&&(b.vehNo||b.vehName)){
     if($("qVehicleNo")&&!$("qVehicleNo").value) $("qVehicleNo").value=b.vehNo||"";
     if($("qVehicle")&&!$("qVehicle").value) $("qVehicle").value=b.vehName||"";
    }
   }catch(er){}
  },80);
  return r;
 };
 var origSaveQuote=window.saveQuote;
 window.saveQuote=function(){
  var before=(db.quotes||[]).length, eid=window._tcEnqQ;
  var r=origSaveQuote.apply(this,arguments);
  try{
   if(eid&&(db.quotes||[]).length>before){
    var q=db.quotes[0], e=eById(eid);
    if(q&&e&&digits(q.mobile)===digits(e.mobile)){ q.enquiryId=eid; persist(); }
    window._tcEnqQ=null;
   }
  }catch(er){}
  return r;
 };
 /* Quotation "Confirm & Create Trip": the booking is made/updated and its details asked */
 var origConvert=window.convertTrip;
 window.convertTrip=function(id){
  var tb=(db.trips||[]).length;
  var r=origConvert.apply(this,arguments);
  try{
   var q=qById(id), t=(db.trips||[]).length>tb?db.trips[0]:null; if(!q) return r;
   var b=BL().filter(function(z){ return z.status!=="cancelled"&&(z.quoteId===id||(q.enquiryId&&z.enquiryId===q.enquiryId)); })[0];
   var e=q.enquiryId?eById(q.enquiryId):null;
   if(b){
    b.quoteId=id; if(t) b.tripId=t.id;
    if(!b.date&&q.startDate) b.date=q.startDate;
    if(!b.time&&q.startTime) b.time=q.startTime;
    if(e){ e.outcome="booked"; e.bookingId=b.id; }
    persist();
    if(b.own===null||b.own===undefined) setTimeout(function(){ openForm(b,false); },350);
   }else{
    var nb=e?draftFromEnq(e):{id:uid(),name:q.customer,mobile:q.mobile,source:"direct",own:null,status:"booked",created:new Date().toISOString()};
    nb.quoteId=id; if(t) nb.tripId=t.id;
    nb.name=q.customer||nb.name; nb.mobile=q.mobile||nb.mobile;
    nb.date=q.startDate||nb.date||""; nb.time=q.startTime||nb.time||"";
    nb.pickup=q.pickup||nb.pickup||""; nb.dest=((q.destinations&&q.destinations.length)?q.destinations.join(" → "):(q.destination||""))||nb.dest||"";
    if(q.categoryId!=null&&q.categoryId!=="") nb.categoryId=q.categoryId;
    if(q.vehicleNo){ nb.own=true; nb.vehNo=q.vehicleNo; nb.vehName=q.vehicle||""; var av=(db.accVehicles||[]).filter(function(v){ return !v.deleted&&v.no===q.vehicleNo; })[0]; if(av) nb.vehId=av.id; }
    if(!nb.enquiryId&&q.enquiryId) nb.enquiryId=q.enquiryId;
    if(nb.enquiryId&&e){ e.outcome="booked"; e.bookingId=nb.id; }
    BL().unshift(nb); persist();
    setTimeout(function(){ openForm(nb,false); },350);
   }
  }catch(er){ if(window.console) console.error("tc-enq",er); }
  return r;
 };

 /* ---------- Booking Schedule page ---------- */
 var SC={tab:"up"};
 function upcoming(){ var t=today(); return BL().filter(function(b){ return b.status!=="cancelled"&&(b.date||"")>=t; }); }
 var origRender=window.render;
 window.render=function(){
  try{
   if(location.hash==="#schedule"){
    var u=null; try{ u=getCurrentUser(); }catch(e){}
    if(u&&u.role==="owner"){ schedPage(); return; }
   }
  }catch(e){}
  return origRender.apply(this,arguments);
 };
 window.tcSchedule=function(){ view("schedule"); };
 function dayLabel(d){
  var t=today();
  var wd=""; try{ wd=new Date(d+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"}); }catch(e){}
  if(d===t) return B("Today","ഇന്ന്")+" · "+dF(d);
  if(d===shift(t,1)) return B("Tomorrow","നാളെ")+" · "+dF(d);
  return wd+" · "+dF(d);
 }
 function schedPage(){
  app().innerHTML=card(B("Booking Schedule","ബുക്കിംഗ് ഷെഡ്യൂൾ"),'<div id="bkSchedBox">'+schedHtml()+'</div>');
 }
 function schedRefresh(){ var b=$("bkSchedBox"); if(b) b.innerHTML=schedHtml(); else if(location.hash==="#schedule") schedPage(); }
 window.tcSchedTab=function(t){ SC.tab=t; schedRefresh(); };
 function schedHtml(){
  var t=today(), all=BL().slice();
  var up=all.filter(function(b){ return b.status!=="cancelled"&&(b.date||"")>=t; });
  var past=all.filter(function(b){ return b.status!=="cancelled"&&(b.date||"")<t; });
  var can=all.filter(function(b){ return b.status==="cancelled"; });
  var tabs=[["up",B("Upcoming","വരാനിരിക്കുന്നത്"),up.length],["past",B("Past","കഴിഞ്ഞത്"),past.length],["can",B("Cancelled","റദ്ദാക്കിയത്"),can.length]];
  var h='<div style="display:flex;gap:6px;margin:6px 0;flex-wrap:wrap">'+tabs.map(function(x){
   return '<button onclick="tcSchedTab(\''+x[0]+'\')" style="padding:5px 11px;font-size:12.5px;'+(SC.tab===x[0]?'background:#0b6b7a;color:#fff;border-color:#0b6b7a':'')+'">'+E(x[1])+' ('+x[2]+')</button>';
  }).join("")+'</div>';
  var list=SC.tab==="up"?up:SC.tab==="past"?past:can;
  list.sort(function(a,b){ var k=String(a.date||"").localeCompare(String(b.date||"")); if(!k) k=String(a.time||"").localeCompare(String(b.time||"")); return SC.tab==="up"?k:-k; });
  if(!list.length) return h+'<p class="muted">'+E(B("Nothing here yet. Confirm an enquiry to add a booking.","ഇവിടെ ഒന്നുമില്ല. ഒരു എൻക്വയറി കൺഫേം ചെയ്താൽ ബുക്കിംഗ് ഇവിടെ വരും."))+'</p>';
  var cur="";
  list.forEach(function(b){
   if(b.date!==cur){ cur=b.date; h+='<div style="font-weight:800;font-size:14px;margin:12px 0 4px;color:#0b4f5a;border-bottom:2px solid #cfe3e8">'+E(b.date?dayLabel(b.date):B("No date","തീയതിയില്ല"))+'</div>'; }
   h+=bkCard(b);
  });
  return h;
 }
 function ownLine(b){
  if(b.status==="cancelled") return "";
  if(b.own===true){
   var vv=(b.vehName||"")+(b.vehNo?" ("+b.vehNo+")":"");
   return chip("🚖 "+B("Own","സ്വന്തം")+(vv?": "+vv:""),"#e8f4ea","#1c6b2c")+(b.driver?chip("👤 "+b.driver,"#eef0f6","#3b4a7a"):"");
  }
  if(b.own===false){
   var p=b.partner||{}, got=(p.received||[]).reduce(function(s,r){ return s+(+r.amount||0); },0);
   return chip("🤝 "+B("Partner: ","പാർട്ണർ: ")+(p.name||"")+(p.vehNo?" ("+p.vehNo+")":""),"#fff4e0","#8a5a00")+
    (p.margin>0?chip(B("Margin ","മാർജിൻ ")+M(p.margin)+(got>0?" · "+B("received ","കിട്ടി ")+M(got):""),got>=p.margin?"#e8f4ea":"#fdecec",got>=p.margin?"#1c6b2c":"#a12d2d"):"");
  }
  return chip("⚠ "+B("Own / partner not set","സ്വന്തം / പാർട്ണർ തീരുമാനിച്ചിട്ടില്ല"),"#fdecec","#a12d2d");
 }
 function commPaidSum(b){ return (b.commPaid||[]).reduce(function(s,r){ return s+(+r.amount||0); },0); }
 function bkCard(b){
  var cn=b.status==="cancelled";
  var old=oldCust(b.mobile,b.enquiryId,b.id);
  var place=[b.pickup,b.dest].filter(Boolean).join(" → ");
  var meta=[catName(b.categoryId),b.pax?b.pax+" "+B("pax","പേർ"):""].filter(Boolean).join(" · ");
  var wa=tcWaNumber?tcWaNumber(b.mobile):"";
  var h='<div class="listitem" style="'+(cn?'opacity:.65':'')+'"><div style="display:flex;justify-content:space-between;gap:6px"><div><b style="font-size:15px">'+(b.time?E(tF(b.time))+' · ':'')+E(b.name)+'</b><br><a href="tel:'+E(b.mobile)+'">'+E(b.mobile)+'</a></div>'+
   '<div style="text-align:right">'+(cn?chip("✖ "+B("Cancelled","റദ്ദാക്കി"),"#fdecec","#a12d2d"):'')+'</div></div>'+
   '<div style="font-size:13px;word-break:break-word">'+E(place)+'</div>'+
   (meta?'<div class="muted" style="font-size:12.5px">'+E(meta)+'</div>':'')+
   '<div style="margin-top:3px">'+ownLine(b)+srcChip(b)+(old?chip("🔁 "+old,"#eef0f6","#3b4a7a"):'')+'</div>';
  if(b.note) h+='<div class="muted" style="font-size:12px">📝 '+E(b.note)+'</div>';
  if(cn) h+='<div class="muted" style="font-size:12.5px">'+E(B("Reason: ","കാരണം: "))+E(b.cancelReason||"-")+' · '+E(b.advRefunded===true?B("advance refunded","അഡ്വാൻസ് തിരികെ കൊടുത്തു"):b.advRefunded===false?B("advance not refunded","അഡ്വാൻസ് തിരികെ കൊടുത്തിട്ടില്ല"):"")+'</div>';
  if(!cn&&b.source==="via"&&(b.commAmount>0||b.commPct>0)){
   var paid=commPaidSum(b);
   h+='<div class="muted" style="font-size:12.5px">👤 '+E(B("Commission to ","കമ്മീഷൻ ")+(b.viaName||""))+': <b>'+E(commLabel(b))+'</b>'+(paid>0?' · '+E(B("paid ","കൊടുത്തത് "))+E(M(paid)):'')+'</div>';
  }
  h+='<div class="actions" style="margin-top:4px">';
  if(!cn){
   h+='<button onclick="tcEnqBookEdit(\''+b.id+'\')">'+E(B("Edit","തിരുത്തുക"))+'</button>';
   if(!b.quoteId) h+='<button onclick="tcEnqBookQuote(\''+b.id+'\')">'+E(B("Quotation","ക്വട്ടേഷൻ"))+'</button>';
   if(b.own===false&&(b.partner||{}).margin>0) h+='<button onclick="tcEnqMargin(\''+b.id+'\')">💰 '+E(B("Margin received","മാർജിൻ കിട്ടി"))+'</button>';
   if(b.source==="via"&&(b.commAmount>0||b.commPct>0)) h+='<button onclick="tcEnqCommPaid(\''+b.id+'\')">💸 '+E(B("Commission paid","കമ്മീഷൻ കൊടുത്തു"))+'</button>';
   if(wa) h+='<button onclick="window.open(\'https://wa.me/'+wa+'\',\'_blank\')">WhatsApp</button>';
   h+='<button class="danger" onclick="tcEnqCancel(\''+b.id+'\')">'+E(B("Cancel booking","റദ്ദാക്കുക"))+'</button>';
  }else{
   h+='<button onclick="tcEnqRestore(\''+b.id+'\')">↩ '+E(B("Restore","തിരികെ കൊണ്ടുവരിക"))+'</button>';
  }
  return h+'</div></div>';
 }
 /* quotation straight from a booking (carries the booking's details and links via enquiryId) */
 window.tcEnqBookQuote=function(id){
  var b=bById(id); if(!b) return;
  var eid=b.enquiryId;
  if(!eid||!eById(eid)){
   var ne={id:uid(),name:b.name,mobile:b.mobile,pickup:b.pickup,dest:b.dest,destinations:b.dest?[b.dest]:[],type:"local",date:b.date,time:b.time,entryDate:today(),status:"new",created:new Date().toISOString(),categoryId:b.categoryId,pax:b.pax,source:b.source,viaName:b.viaName,viaMobile:b.viaMobile,commAmount:b.commAmount,commPct:b.commPct,commText:b.commText,outcome:"booked",bookingId:b.id};
   (db.enquiries=db.enquiries||[]).unshift(ne); b.enquiryId=ne.id; eid=ne.id; persist();
  }
  enquiryToQuote(eid);
 };
 window.tcEnqCancel=function(id){
  var b=bById(id); if(!b) return;
  modal('<h2>'+E(B("Cancel this booking?","ബുക്കിംഗ് റദ്ദാക്കണോ?"))+'</h2><p class="muted">'+E(b.name)+' · '+E(dF(b.date))+'</p>'+
   '<label>'+E(B("Reason","കാരണം"))+'<select id="cnR">'+REASONS.map(function(r){ return '<option value="'+E(B(r[1],r[2]))+'">'+E(B(r[1],r[2]))+'</option>'; }).join("")+'<option value="'+E(B("Partner/vehicle problem","പാർട്ണർ/വാഹന പ്രശ്നം"))+'">'+E(B("Partner/vehicle problem","പാർട്ണർ/വാഹന പ്രശ്നം"))+'</option></select></label>'+
   '<label>'+E(B("Was any advance taken?","അഡ്വാൻസ് വാങ്ങിയിരുന്നോ?"))+'<select id="cnA"><option value="none">'+E(B("No advance","അഡ്വാൻസ് ഇല്ല"))+'</option><option value="yes">'+E(B("Advance refunded","അഡ്വാൻസ് തിരികെ കൊടുത്തു"))+'</option><option value="no">'+E(B("Advance NOT refunded (kept)","അഡ്വാൻസ് തിരികെ കൊടുത്തില്ല (നമ്മൾ എടുത്തു)"))+'</option></select></label>'+
   '<div class="actions"><button class="danger" onclick="tcEnqCancelSave(\''+id+'\')">'+E(B("Cancel booking","ബുക്കിംഗ് റദ്ദാക്കുക"))+'</button><button onclick="closeModal()">'+E(B("Back","പിന്നോട്ട്"))+'</button></div>');
 };
 window.tcEnqCancelSave=function(id){
  var b=bById(id); if(!b) return;
  var a=V("cnA");
  b.status="cancelled"; b.cancelReason=V("cnR"); b.advRefunded=a==="yes"?true:a==="no"?false:null; b.cancelledAt=new Date().toISOString();
  var e=b.enquiryId?eById(b.enquiryId):null;
  if(e){ e.outcome="lost"; e.lostReason="cancel"; e.lostAt=b.cancelledAt; }
  persist(); closeModal(); say(B("Booking cancelled","ബുക്കിംഗ് റദ്ദാക്കി")); schedRefresh();
 };
 window.tcEnqRestore=function(id){
  var b=bById(id); if(!b) return;
  b.status="booked"; b.cancelReason=""; b.advRefunded=null;
  var e=b.enquiryId?eById(b.enquiryId):null; if(e){ e.outcome="booked"; e.lostReason=""; }
  persist(); schedRefresh();
 };

 /* ---------- money into the Trip & Accounts book (cash basis: only when tapped) ---------- */
 function bookOk(){
  try{ var a=window.__tcAbApi; if(!a||!a.canWrite()){ say(B("The Trip & Accounts book needs Premium (or your 60 free days)","ട്രിപ്പ് & അക്കൗണ്ട്സ് ബുക്കിന് പ്രീമിയം (അല്ലെങ്കിൽ 60 സൗജന്യ ദിവസം) വേണം")); return false; } return true; }catch(e){ return false; }
 }
 function addEntry(o){
  if(!Array.isArray(db.accEntries)) db.accEntries=[];
  var rec={id:uid(),src:"manual",created:new Date().toISOString(),vehId:""};
  for(var k in o) rec[k]=o[k];
  db.accEntries.push(rec); persist(); return rec;
 }
 function moneyForm(title,sub,amt,btn,fn){
  modal('<h2>'+E(title)+'</h2><p class="muted">'+E(sub)+'</p><div class="grid">'+
   '<label>'+E(B("Amount (₹)","തുക (₹)"))+'<input id="mfAmt" type="number" inputmode="decimal" value="'+E(amt||"")+'"></label>'+
   '<label>'+E(B("Date","തീയതി"))+tcDateInputHtml("mfDate",today())+'</label>'+
   '<label>'+E(B("Paid by","എങ്ങനെ"))+'<select id="mfMode"><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Bank">Bank</option></select></label></div>'+
   '<div class="actions"><button class="primary" onclick="'+fn+'">'+E(btn)+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>');
 }
 function readMoney(){
  var a=parseFloat(V("mfAmt")); if(!(a>0)){ say(B("Enter the amount","തുക നൽകുക")); return null; }
  var d=tcReadDateInput("mfDate"); if(d===null){ say(B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക")); return null; }
  return {amount:Math.round(a*100)/100,date:d||today(),mode:V("mfMode")};
 }
 window.tcEnqMargin=function(id){
  var b=bById(id); if(!b||!b.partner) return; if(!bookOk()) return;
  var got=(b.partner.received||[]).reduce(function(s,r){ return s+(+r.amount||0); },0);
  moneyForm(B("Margin received","മാർജിൻ കിട്ടി"),(b.partner.name||"")+" · "+b.name+" · "+dF(b.date),Math.max(0,(b.partner.margin||0)-got),B("Add to book","ബുക്കിൽ ചേർക്കുക"),"tcEnqMarginSave('"+id+"')");
 };
 window.tcEnqMarginSave=function(id){
  var b=bById(id), m=readMoney(); if(!b||!m) return;
  var en=addEntry({type:"in",date:m.date,amount:m.amount,cat:"Partner margin",mode:m.mode,customer:b.name,route:[b.pickup,b.dest].filter(Boolean).join(" → "),note:B("Margin from ","മാർജിൻ: ")+(b.partner.name||""),bookingId:b.id});
  (b.partner.received=b.partner.received||[]).push({date:m.date,amount:m.amount,mode:m.mode,entryId:en.id});
  persist(); closeModal(); say(B("Added to the book as Partner margin","ബുക്കിൽ Partner margin ആയി ചേർത്തു")); schedRefresh();
 };
 window.tcEnqCommPaid=function(id){
  var b=bById(id); if(!b) return; if(!bookOk()) return;
  var q=b.quoteId?qById(b.quoteId):null, amt=b.commAmount||0;
  if(!amt&&b.commPct>0&&q&&q.quotedAmount) amt=Math.round(q.quotedAmount*b.commPct)/100;
  moneyForm(B("Commission paid","കമ്മീഷൻ കൊടുത്തു"),(b.viaName||"")+" · "+b.name+" · "+dF(b.date),amt,B("Add to book","ബുക്കിൽ ചേർക്കുക"),"tcEnqCommPaidSave('"+id+"')");
 };
 window.tcEnqCommPaidSave=function(id){
  var b=bById(id), m=readMoney(); if(!b||!m) return;
  var en=addEntry({type:"out",date:m.date,amount:m.amount,cat:"Commission paid",mode:m.mode,customer:b.name,route:[b.pickup,b.dest].filter(Boolean).join(" → "),note:B("Commission to ","കമ്മീഷൻ: ")+(b.viaName||""),bookingId:b.id,vehId:b.own&&b.vehId?b.vehId:""});
  (b.commPaid=b.commPaid||[]).push({date:m.date,amount:m.amount,mode:m.mode,entryId:en.id});
  persist(); closeModal(); say(B("Added to the book as Commission paid","ബുക്കിൽ Commission paid ആയി ചേർത്തു")); schedRefresh();
 };
 window.__tcEnqApi={bookings:BL,upcoming:upcoming,oldCust:oldCust,today:today};
})();
