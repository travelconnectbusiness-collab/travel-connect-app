/* Trip report (tc-tripcards.js, loaded by tc-regdocs.js).
   A "Trips" tab inside Trip & Accounts: ONE CARD PER TRIP (date, customer, short route, profit, status chip).
   Tap a card -> the full trip report in a pop-up (Back closes it):
     1 Trip details  2 Income  3 Expenses by category  4 Total expense and PROFIT  5 Payment  6 Driver tips (info)
     7 buttons: Edit trip / Payment received / + Expense / Share (WhatsApp text WITHOUT profit and expenses) / Open bill.
   Numbers come from the Trip & Accounts book (entries linked to the trip) and the bill - nothing new is stored.
   Uses the period + vehicle filters of the Accounts page (trip date). Needs tc-accbook.js (window.__tcAbApi). */
(function(){
 if(window.__tcTripCards) return;
 window.__tcTripCards=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var mny=function(n){
  n=Math.round((+n||0)*100)/100;
  if(!Number.isInteger(n)) return (n<0?"-":"")+"\u20b9"+Math.abs(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
  try{ return (n<0?"-":"")+money(Math.abs(n)); }catch(e){ return "Rs."+n; }
 };
 var dd=function(iso){ try{ return tcFormatDate(String(iso||"").slice(0,10)); }catch(e){ return String(iso||"").slice(0,10); } };
 var A=function(){ return window.__tcAbApi||null; };
 var LIMIT=20, shown=LIMIT;

 function quoteOf(t){ return (db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]||null; }
 function tripDate(t,q){ return String(t.startDate||q.startDate||t.entryDate||t.created||"").slice(0,10); }
 function dests(q){ return (q.destinations&&q.destinations.length)?q.destinations.filter(Boolean):(q.destination?[q.destination]:[]); }
 /* "Start -> ... -> Drop, +N places" */
 function shortRoute(t,q){
  var start=t.pickup||q.pickup||"", ds=dests(q), drop=q.returnPoint||(ds.length?ds[ds.length-1]:"");
  var mid=ds.slice(0,q.returnPoint?ds.length:Math.max(0,ds.length-1));
  if(mid.length<=1) return [start].concat(mid).concat(drop&&drop!==mid[mid.length-1]?[drop]:[]).filter(Boolean).join(" → ");
  return [start,drop].filter(Boolean).join(" → ")+", +"+mid.length+" "+B("places","സ്ഥലങ്ങൾ");
 }

 /* everything about one trip (never throws) */
 function build(t,byTrip){
  try{
   var q=quoteOf(t); if(!q) return null;
   var a=A(), es=byTrip[t.id]||[];
   var c=db.categories&&db.categories[q.categoryId];
   var bill=0; try{ bill=c?billFinalAmount(t,q,c).final:0; }catch(e){}
   var pays=t.payments||[];
   var paid=pays.reduce(function(s,p){ return s+(+p.amount||0); },0);
   var disc=pays.reduce(function(s,p){ return s+(p&&p.method==="Discount"?(+p.amount||0):0); },0);
   var bal=Math.max(0,Math.round((bill-paid)*100)/100); if(bal<=0.5) bal=0;
   var inc=0,out=0,tip=0,drvVia=0,drvViaOwed=0,drvDirect=0;
   es.forEach(function(e){
    var x=+e.amount||0;
    if(a.isDrv(e)){ if(e.direct) drvDirect+=x; else{ drvVia+=x; if(!e.drvPaid) drvViaOwed+=x; } return; }
    if(e.type==="in"){ inc+=x; if(e.cat==="Tip") tip+=x; } else out+=x;
   });
   var vehId=""; es.forEach(function(e){ if(!vehId&&e.vehId) vehId=e.vehId; });
   if(!vehId){ var v=a.matchVehicle(q.vehicleNo,q.vehicle); if(v) vehId=v.id; }
   return {t:t,q:q,es:es,date:tripDate(t,q),bill:bill,paid:paid,disc:disc,bal:bal,inc:inc,out:out,tip:tip,profit:inc-out,
    drvVia:drvVia,drvViaOwed:drvViaOwed,drvDirect:drvDirect,vehId:vehId,billed:!!(t.billNo||t.status==="completed")};
  }catch(e){ return null; }
 }
 function allTrips(){
  var a=A(); if(!a) return [];
  var r=a.periodRange(a.ST.period), veh=a.ST.veh, byTrip={}, out=[];
  a.entries().forEach(function(e){ if(e.tripId) (byTrip[e.tripId]=byTrip[e.tripId]||[]).push(e); });
  (db.trips||[]).forEach(function(t){
   if(!t) return;
   if(!(byTrip[t.id]||t.billNo||t.status==="completed"||(t.payments||[]).length)) return;
   var x=build(t,byTrip); if(!x) return;
   if(x.date<r[0]||x.date>r[1]) return;
   if(veh==="none"){ if(x.vehId&&a.vById(x.vehId)) return; }
   else if(veh!=="all"&&x.vehId!==veh) return;
   out.push(x);
  });
  out.sort(function(p,q){ return p.date<q.date?1:p.date>q.date?-1:0; });
  return out;
 }
 function one(id){
  var t=(db.trips||[]).filter(function(x){ return x.id===id; })[0]; if(!t) return null;
  var byTrip={}; A().entries().forEach(function(e){ if(e.tripId===id) (byTrip[id]=byTrip[id]||[]).push(e); });
  return build(t,byTrip);
 }

 function chip(x){
  var g='background:#e6f7e9;color:#1c6b2c', r='background:#fdeaea;color:#b3261e', st='border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700;white-space:nowrap';
  var h;
  if(!x.billed&&x.bal<=0&&x.paid<=0) h='<span style="background:#eef1f4;color:#555;'+st+'">'+E(B("No bill yet","ബിൽ ആയിട്ടില്ല"))+'</span>';
  else if(x.bal>0) h='<span style="'+r+';'+st+'">&#128308; '+E(B("Pending","ബാക്കി"))+' '+mny(x.bal)+'</span>';
  else if(x.disc>0) h='<span style="'+g+';'+st+'">&#9989; '+E(B("Settled (discount ","തീർന്നു (ഡിസ്കൗണ്ട് "))+mny(x.disc)+')</span>';
  else h='<span style="'+g+';'+st+'">&#9989; '+E(B("Fully received","പൂർണ്ണമായും കിട്ടി"))+'</span>';
  if(x.tip>0) h+=' <span style="'+g+';'+st+'">+'+mny(x.tip)+' '+E(B("tip","ടിപ്പ്"))+'</span>';
  return h;
 }

 /* ---------- the Trips tab (called from tc-accbook.js) ---------- */
 window.tcTrListHtml=function(){
  var list=allTrips(), tot=list.reduce(function(s,x){ return s+x.profit; },0);
  var h='<p class="muted" style="font-size:12px;margin:6px 0">'+E(B("One card per trip (by trip date, for the period and vehicle chosen above). Tap a card for the full report.","ഒരു ട്രിപ്പിന് ഒരു കാർഡ് (മുകളിൽ തിരഞ്ഞെടുത്ത കാലയളവും വാഹനവും, ട്രിപ്പ് തീയതി പ്രകാരം). മുഴുവൻ റിപ്പോർട്ട് കാണാൻ കാർഡിൽ അമർത്തുക."))+'</p>';
  if(list.length) h+='<div style="font-size:13px;margin:4px 0">'+E(B("Trips: ","ട്രിപ്പുകൾ: "))+'<b>'+list.length+'</b> &middot; '+E(B("Profit of these trips: ","ഈ ട്രിപ്പുകളുടെ ലാഭം: "))+'<b style="color:'+(tot>=0?'#1c6b2c':'#a12d2d')+'">'+mny(tot)+'</b></div>';
  h+=list.slice(0,shown).map(function(x){
   var q=x.q;
   return '<div class="listitem" onclick="tcTrOpen(\''+x.t.id+'\')" style="cursor:pointer">'+
    '<div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(x.t.customer||q.customer||"-")+'</b><span style="text-align:right;white-space:nowrap"><span class="muted" style="display:block;font-size:10.5px;line-height:1.1">'+E(B("Profit","ലാഭം"))+'</span><b style="color:'+(x.profit>=0?'#1c6b2c':'#a12d2d')+'">'+mny(x.profit)+'</b></span></div>'+
    '<div class="muted" style="font-size:12px">'+E([dd(x.date),shortRoute(x.t,q)].filter(Boolean).join(" · "))+'</div>'+
    '<div style="font-size:12.5px;margin-top:2px">'+E(B("Received ","കിട്ടിയത് "))+'<b style="color:#1c6b2c">'+mny(x.inc)+'</b> &middot; '+E(B("Expense ","ചെലവ് "))+'<b style="color:#a12d2d">'+mny(x.out)+'</b></div>'+
    '<div style="margin-top:4px">'+chip(x)+'</div></div>';
  }).join("")||'<p class="muted">'+E(B("No trips for this selection.","ഈ തിരഞ്ഞെടുപ്പിൽ ട്രിപ്പുകളില്ല."))+'</p>';
  if(list.length>shown) h+='<div class="actions"><button onclick="tcTrMore()">'+E(B("Show more","കൂടുതൽ കാണിക്കുക"))+'</button></div>';
  return h;
 };
 window.tcTrMore=function(){ shown+=LIMIT; try{ tcAbRefresh(); }catch(e){} };

 /* ---------- the full report ---------- */
 function sec(n,title,body){
  return '<div style="border-top:1px solid #e1e6ea;margin-top:10px;padding-top:6px"><div style="font-weight:800;color:#0b6b78;font-size:13px">'+n+'. '+E(title)+'</div>'+body+'</div>';
 }
 function row(l,v,bold){
  return '<div style="display:flex;justify-content:space-between;gap:10px;padding:2px 0;font-size:13.5px"><span>'+l+'</span><span style="text-align:right;'+(bold?'font-weight:800':'')+'">'+v+'</span></div>';
 }
 function kv(l,v){ return '<div style="padding:2px 0;font-size:13.5px"><span class="muted" style="font-size:12px">'+E(l)+'</span><br><span style="word-break:break-word">'+v+'</span></div>'; }
 window.tcTrOpen=function(id){
  var x=one(id); if(!x) return;
  var t=x.t, q=x.q, a=A(), ds=dests(q), drop=q.returnPoint||"";
  var tm=t.startTime||q.startTime||"";
  var veh=[q.vehicle,q.vehicleNo].filter(Boolean).join(" · ");
  var drvName=t.driverName||"", drvMob=t.driverMobile||"";
  var h='<h2 style="margin-bottom:2px">&#129523; '+E(t.customer||q.customer||"-")+'</h2><div style="margin-bottom:4px">'+chip(x)+'</div>';
  /* 1 trip details */
  var d1=kv(B("Customer","കസ്റ്റമർ"),E(t.customer||q.customer||"-"))+
   (q.mobile?kv(B("Mobile","മൊബൈൽ"),E(q.mobile)+' <a href="tel:'+E(String(q.mobile).replace(/[^\d+]/g,""))+'" style="display:inline-block;margin-left:8px;padding:3px 12px;border-radius:14px;background:#0b6b78;color:#fff;text-decoration:none;font-size:13px;font-weight:700">&#128222; '+E(B("Call","വിളിക്കുക"))+'</a>'):"")+
   kv(B("Pickup date and time","പിക്കപ്പ് തീയതിയും സമയവും"),E(dd(x.date)+(tm?" "+(function(){ try{ return tcFormatTime(tm); }catch(e){ return tm; } })():"")))+
   kv(B("Pickup point","പിക്കപ്പ് സ്ഥലം"),E(t.pickup||q.pickup||"-"))+
   kv(B("Destinations","സ്ഥലങ്ങൾ"),ds.length?'<ol style="margin:2px 0 0 18px;padding:0">'+ds.map(function(p){ return '<li>'+E(p)+'</li>'; }).join("")+'</ol>':"-")+
   kv(B("Drop point","ഡ്രോപ്പ് സ്ഥലം"),E(drop||(ds.length?ds[ds.length-1]:"-")))+
   kv(B("Days","ദിവസം"),E(String(t.days||q.days||1)))+
   kv(B("Vehicle","വാഹനം"),E(veh||"-"))+
   kv(B("Driver","ഡ്രൈവർ"),E(drvName||"-")+(drvMob?' &middot; '+E(drvMob):""));
  h+=sec(1,B("Trip details","ട്രിപ്പ് വിവരങ്ങൾ"),d1);
  /* 2 income */
  var ins=x.es.filter(function(e){ return e.type==="in"&&!a.isDrv(e); }).sort(function(p,q2){ return p.date<q2.date?-1:p.date>q2.date?1:0; });
  var d2=row(E(B("Bill amount","ബിൽ തുക")),'<b>'+mny(x.bill)+'</b>');
  ins.forEach(function(e){ d2+=row(E(a.catLabel(e.cat))+' <span class="muted" style="font-size:11.5px">'+E([dd(e.date),e.mode].filter(Boolean).join(" · "))+'</span>',mny(e.amount)); });
  if(!ins.length) d2+='<div class="muted" style="font-size:12.5px">'+E(B("No money received yet.","പണം ഒന്നും കിട്ടിയിട്ടില്ല."))+'</div>';
  if(x.disc>0) d2+=row(E(B("Discount given","ഡിസ്കൗണ്ട് കൊടുത്തത്")),mny(x.disc));
  d2+=row(E(B("Total income (money received)","ആകെ വരവ് (കിട്ടിയ പണം)")),'<b style="color:#1c6b2c">'+mny(x.inc)+'</b>',true);
  h+=sec(2,B("Income","വരവ്"),d2);
  /* 3 expenses */
  var by={}, order=[];
  x.es.filter(function(e){ return e.type==="out"; }).forEach(function(e){ if(!(e.cat in by)){ by[e.cat]=0; order.push(e.cat); } by[e.cat]+=(+e.amount||0); });
  var d3=order.map(function(c){ return row(E(a.catLabel(c)),mny(by[c])); }).join("")||'<div class="muted" style="font-size:12.5px">'+E(B("No expense added for this trip.","ഈ ട്രിപ്പിന് ചെലവ് ചേർത്തിട്ടില്ല."))+'</div>';
  h+=sec(3,B("Expenses","ചെലവ്"),d3);
  /* 4 result */
  h+=sec(4,B("Result","ഫലം"),row(E(B("Total expense","ആകെ ചെലവ്")),'<b style="color:#a12d2d">'+mny(x.out)+'</b>')+
   '<div style="text-align:center;margin:6px 0 2px;padding:8px;border-radius:10px;background:'+(x.profit>=0?'#e6f7e9':'#fdeaea')+'"><div style="font-size:12px;color:#555">'+E(B("PROFIT","ലാഭം"))+'</div><div style="font-size:26px;font-weight:800;color:'+(x.profit>=0?'#1c6b2c':'#a12d2d')+'">'+mny(x.profit)+'</div></div>');
  /* 5 payment */
  var modes=[]; ins.forEach(function(e){ if(e.mode&&modes.indexOf(e.mode)<0) modes.push(e.mode); });
  h+=sec(5,B("Payment","പേയ്മെന്റ്"),row(E(B("Paid by","എങ്ങനെ")),E(modes.join(", ")||"-"))+row(E(B("Pending","ബാക്കി")),'<b style="color:'+(x.bal>0?'#b3261e':'#1c6b2c')+'">'+mny(x.bal)+'</b>')+
   (x.bal>0&&t.dueDate?row(E(B("Promised on","തരാമെന്ന് പറഞ്ഞത്")),E(dd(t.dueDate))):"")+'<div style="margin-top:4px">'+chip(x)+'</div>');
  /* 6 driver tips */
  if(x.drvVia>0||x.drvDirect>0){
   h+=sec(6,B("Driver tips (information - not in profit)","ഡ്രൈവർ ടിപ്പ് (അറിയാൻ മാത്രം - ലാഭത്തിൽ ഇല്ല)"),
    (x.drvVia>0?row(E(B("Via me: paid ","എന്റെ വഴി: കൊടുത്തത് "))+mny(x.drvVia-x.drvViaOwed),E(B("to pay ","കൊടുക്കാനുള്ളത് "))+'<b style="color:'+(x.drvViaOwed>0?'#b3261e':'#1c6b2c')+'">'+mny(x.drvViaOwed)+'</b>'):"")+
    (x.drvDirect>0?row(E(B("Customer gave the driver directly","കസ്റ്റമർ ഡ്രൈവർക്ക് നേരിട്ട് കൊടുത്തത്")),mny(x.drvDirect)):""));
  }
  /* 7 buttons */
  var bs='font-size:13px;padding:6px 12px';
  h+='<div class="actions" style="margin-top:12px;flex-wrap:wrap">'+
   (a.canWrite()?'<button onclick="tcTrDo(\'edit\',\''+id+'\')" style="'+bs+'">&#9998; '+E(B("Edit trip","ട്രിപ്പ് തിരുത്തുക"))+'</button>':'')+
   (x.bal>0&&a.canWrite()?'<button class="primary" onclick="tcTrDo(\'recv\',\''+id+'\')" style="'+bs+'">&#10004; '+E(B("Payment received","പണം കിട്ടി"))+'</button>':'')+
   (a.canWrite()?'<button onclick="tcTrDo(\'exp\',\''+id+'\')" style="'+bs+'">- '+E(B("Expense","ചെലവ്"))+'</button>':'')+
   '<button onclick="tcTrShare(\''+id+'\')" style="'+bs+'">&#128172; '+E(B("Share","ഷെയർ"))+'</button>'+
   '<button onclick="tcTrDo(\'bill\',\''+id+'\')" style="'+bs+'">'+E(B("Open bill","ബിൽ തുറക്കുക"))+'</button>'+
   '<button onclick="closeModal()" style="'+bs+'">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(h);
 };
 window.tcTrDo=function(what,id){
  closeModal();
  try{
   if(what==="edit"&&typeof editTrip==="function") editTrip(id);
   else if(what==="recv"&&typeof tcBlRecv==="function") tcBlRecv(id);
   else if(what==="exp"&&typeof tcAbTripExpFor==="function") tcAbTripExpFor(id);
   else if(what==="bill"&&typeof tcAbOpenBill==="function") tcAbOpenBill(id);
  }catch(e){}
 };

 /* WhatsApp text for the customer: NO profit, NO expenses, NO driver tips */
 window.tcTrShare=function(id){
  var x=one(id); if(!x) return;
  var t=x.t, q=x.q, ds=dests(q), tm=t.startTime||q.startTime||"";
  var biz=(db.business&&db.business.name)||"";
  var L=[];
  L.push((biz?biz+" - ":"")+B("Trip details","ട്രിപ്പ് വിവരങ്ങൾ"));
  L.push(B("Customer: ","കസ്റ്റമർ: ")+(t.customer||q.customer||""));
  L.push(B("Date: ","തീയതി: ")+dd(x.date)+(tm?" "+tm:""));
  var pts=[t.pickup||q.pickup].concat(ds); if(q.returnPoint) pts.push(q.returnPoint);
  L.push(B("Route: ","റൂട്ട്: ")+pts.filter(Boolean).join(" → "));
  var veh=[q.vehicle,q.vehicleNo].filter(Boolean).join(" "); if(veh) L.push(B("Vehicle: ","വാഹനം: ")+veh);
  L.push(B("Bill amount: ","ബിൽ തുക: ")+mny(x.bill));
  var rec=x.paid-x.disc; if(rec>0) L.push(B("Received: ","കിട്ടിയത്: ")+mny(rec));
  if(x.disc>0) L.push(B("Discount: ","ഡിസ്കൗണ്ട്: ")+mny(x.disc));
  L.push(x.bal>0?B("Balance: ","ബാക്കി: ")+mny(x.bal):B("Fully paid. Thank you!","പൂർണ്ണമായും അടച്ചു. നന്ദി!"));
  var txt=L.join("\n"), url="https://wa.me/";
  try{ if(q.mobile&&typeof tcWaNumber==="function") url+=tcWaNumber(q.mobile); }catch(e){}
  url+="?text="+encodeURIComponent(txt);
  try{ window.open(url,"_blank"); }catch(e){ location.href=url; }
 };
})();
