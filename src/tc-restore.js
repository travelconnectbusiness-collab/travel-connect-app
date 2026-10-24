/* Deleted bills - bring one back (tc-restore.js, loaded by tc-regdocs.js).
   tc-bills.js keeps a copy of every deleted bill in db.deletedBills (last 30). This module adds:
     1. On the Billing page, under "My Bills": "Deleted bills (n)" - opens a list with a "Bring back" button for each.
     2. Bring back = the bill (trip) returns, its quotation returns if the delete had removed it, the booking / live trip
        it was linked to are linked again, and its money entries come back in Trip & Accounts (the accounts book does that itself).
     3. The copies are part of the Premium Cloud Backup too (TC_BK_LISTS), so they survive a lost phone.
   tc-bills.js is not changed: the delete function is wrapped to also note which booking / live trip was linked. */
(function(){
 if(window.__tcRestore) return;
 window.__tcRestore=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var $=function(id){ return document.getElementById(id); };
 var mny=function(n){ try{ return money(n); }catch(e){ return "Rs."+Math.round(n); } };
 var say=function(m){ try{ toast(m); }catch(e){} };

 function list(){ return Array.isArray(db.deletedBills)?db.deletedBills.filter(function(e){ return e&&e.trip&&e.trip.id; }):[]; }
 /* every copy gets an id (the cloud restore merges by id) */
 function norm(){
  var ch=false;
  (db.deletedBills||[]).forEach(function(e){ if(e&&e.trip&&e.trip.id&&!e.id){ e.id="del_"+e.trip.id; ch=true; } });
  return ch;
 }
 try{ if(typeof TC_BK_LISTS!=="undefined"&&TC_BK_LISTS.indexOf("deletedBills")<0) TC_BK_LISTS.push("deletedBills"); }catch(e){}
 try{ norm(); }catch(e){}

 /* ---------- note the links before the old delete runs ---------- */
 var origDel=window.tcBlDelete;
 if(typeof origDel==="function"){
  window.tcBlDelete=function(id){
   var links=null;
   try{
    var t=(db.trips||[]).filter(function(x){ return x.id===id; })[0];
    var q=t&&(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0];
    links={
     qs:q?q.status:"",
     bk:(db.bookings||[]).filter(function(b){ return b&&b.tripId===id; }).map(function(b){ return {id:b.id,quoteId:b.quoteId||""}; }),
     lv:(db.liveTrips||[]).filter(function(l){ return l&&l.tripId===id; }).map(function(l){ return {id:l.id,status:l.status||""}; })
    };
   }catch(e){}
   var r=origDel.apply(this,arguments);
   try{
    var top=(db.deletedBills||[])[0];
    if(links&&top&&top.trip&&top.trip.id===id&&!top.links){ top.links=links; }
    norm(); save();
   }catch(e){}
   return r;
  };
 }

 /* ---------- the list ---------- */
 function totalOf(e){
  try{
   var q=e.quote||(db.quotes||[]).filter(function(x){ return x.id===e.trip.quoteId; })[0];
   var c=db.categories[q.categoryId];
   return billFinalAmount(e.trip,q,c).final;
  }catch(x){ return null; }
 }
 function dt(iso){ try{ return tcFormatDateTime(iso); }catch(e){ return String(iso||"").slice(0,10); } }
 function row(e){
  var t=e.trip, q=e.quote||(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]||{};
  var tot=totalOf(e), paid=(t.payments||[]).reduce(function(a,p){ return a+(+p.amount||0); },0);
  var exists=(db.trips||[]).some(function(x){ return x.id===t.id; });
  return '<div style="border:1px solid #d9d9d9;border-radius:10px;padding:8px 10px;margin:7px 0;background:#fff">'+
   '<div><b>'+E(t.customer||q.customer||"-")+'</b>'+(t.billNo?' <span class="muted" style="font-size:12px">'+E(t.billNo)+'</span>':'')+'</div>'+
   '<div style="font-size:13px;margin-top:2px">'+(tot!=null?E(B("Total","ആകെ"))+' <b>'+mny(tot)+'</b> &middot; ':'')+E(B("Received","കിട്ടിയത്"))+' <b>'+mny(paid)+'</b></div>'+
   '<div class="muted" style="font-size:12px">'+E(B("Deleted on ","ഡിലീറ്റ് ചെയ്തത് "))+E(dt(e.at))+'</div>'+
   '<div class="actions" style="margin-top:6px"><button class="primary" onclick="tcRsBack(\''+E(e.id)+'\')" style="font-size:12px;padding:4px 9px"'+(exists?' disabled':'')+'>&#8617; '+E(exists?B("Already in the list","ലിസ്റ്റിൽ ഉണ്ട്"):B("Bring back","തിരിച്ചെടുക്കുക"))+'</button></div></div>';
 }
 window.tcRsOpen=function(){
  norm();
  var l=list();
  modal('<h2>&#128465; '+E(B("Deleted bills","ഡിലീറ്റ് ചെയ്ത ബില്ലുകൾ"))+'</h2>'+
   '<p class="muted" style="font-size:12px">'+E(B("The last 30 deleted bills are kept. Bring one back if you deleted it by mistake.","ഡിലീറ്റ് ചെയ്ത അവസാന 30 ബില്ലുകൾ സൂക്ഷിക്കുന്നു. തെറ്റി ഡിലീറ്റ് ചെയ്തെങ്കിൽ തിരിച്ചെടുക്കാം."))+'</p>'+
   (l.length?l.map(row).join(""):'<p class="muted">'+E(B("No deleted bills.","ഡിലീറ്റ് ചെയ്ത ബില്ലുകൾ ഇല്ല."))+'</p>')+
   '<div class="actions"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>');
 };
 window.tcRsBack=function(id){
  var e=list().filter(function(x){ return x.id===id; })[0]; if(!e) return;
  var t=e.trip;
  if((db.trips||[]).some(function(x){ return x.id===t.id; })){ say(B("This bill is already in the list","ഈ ബിൽ ലിസ്റ്റിൽ ഉണ്ട്")); return; }
  var back=JSON.parse(JSON.stringify(t));
  var q=(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0];
  if(!q&&e.quote){ q=JSON.parse(JSON.stringify(e.quote)); (db.quotes=db.quotes||[]).push(q); }
  if(!q){ say(B("The quotation of this bill is missing - it cannot be brought back","ഈ ബില്ലിന്റെ കൊട്ടേഷൻ ഇല്ല - തിരിച്ചെടുക്കാനായില്ല")); return; }
  (db.trips=db.trips||[]).push(back);
  var L=e.links||{};
  if(L.qs&&q.status!==L.qs&&(q.status==="quoted"||q.status==="confirmed")) q.status=L.qs;
  (L.bk||[]).forEach(function(k){
   var b=(db.bookings||[]).filter(function(x){ return x&&x.id===k.id; })[0];
   if(b&&!b.tripId){ b.tripId=t.id; if(!b.quoteId&&k.quoteId) b.quoteId=k.quoteId; }
  });
  (L.lv||[]).forEach(function(k){
   var l=(db.liveTrips||[]).filter(function(x){ return x&&x.id===k.id; })[0];
   if(l&&!l.tripId){ l.tripId=t.id; if(k.status) l.status=k.status; }
  });
  db.deletedBills=(db.deletedBills||[]).filter(function(x){ return x!==e; });
  try{ save(); }catch(x){}
  try{ if(typeof window.tcAbRefresh==="function") window.tcAbRefresh(); }catch(x){}
  closeModal();
  say(B("Bill brought back","ബിൽ തിരിച്ചെടുത്തു"));
  try{ if(typeof window.billing==="function") window.billing(); }catch(x){}
 };

 /* ---------- link on the Billing page ---------- */
 function inject(){
  var card=$("tcBlList"); if(!card) return;
  norm();
  var n=list().length;
  var old=$("tcRsLink");
  if(!n){ if(old) old.remove(); return; }
  if(old){ var b0=old.querySelector("button"); if(b0) b0.textContent="🗑 "+B("Deleted bills","ഡിലീറ്റ് ചെയ്ത ബില്ലുകൾ")+" ("+n+")"; return; }
  var inner=card.querySelector(".card")||card;
  var d=document.createElement("div"); d.id="tcRsLink"; d.style.marginTop="8px";
  d.innerHTML='<button onclick="tcRsOpen()" style="font-size:12px;padding:5px 10px">&#128465; '+E(B("Deleted bills","ഡിലീറ്റ് ചെയ്ത ബില്ലുകൾ"))+' ('+n+')</button>';
  inner.appendChild(d);
 }
 var origBilling=window.billing;
 if(typeof origBilling==="function"){
  window.billing=function(){
   var r=origBilling.apply(this,arguments);
   try{ inject(); }catch(e){}
   return r;
  };
 }
})();
