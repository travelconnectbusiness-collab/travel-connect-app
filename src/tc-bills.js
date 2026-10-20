/* My Bills (tc-bills.js, loaded by tc-regdocs.js).
   Adds to the Billing page, for EVERY plan (Free too - everything stays on the phone):
     1. A "Bills" list: every bill with customer, date, total, received, balance and a status chip
        (Paid / Pending), filter (Pending / Paid / All) and a search by customer name.
     2. For each bill: Open (the full bill), Received (money received later: amount, UPI / Cash / Other, date),
        Print / PDF / Image (print the bill again whenever needed) and the payment history (date and mode).
     3. Inside an open bill, next to the UPI QR: a clear "Money received" button.
   Money received is added to the bill's own payments (db.trips[].payments) - the same place Billing already uses -
   so the totals, the printed bill and the Trip & Accounts book always agree. The old billing code is not changed. */
(function(){
 if(window.__tcBills) return;
 window.__tcBills=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var $=function(id){ return document.getElementById(id); };
 var mny=function(n){ try{ return money(n); }catch(e){ return "Rs."+n; } };
 var PAGE=12;
 var st={filter:"all",q:"",shown:PAGE};

 function tripOf(id){ return (db.trips||[]).filter(function(t){ return t.id===id; })[0]||null; }
 function pd(iso){ try{ return tcFormatDateTime(iso); }catch(e){ return String(iso||"").slice(0,10); } }
 function dd(iso){ try{ return tcFormatDate(String(iso||"").slice(0,10)); }catch(e){ return String(iso||"").slice(0,10); } }

 /* one bill's numbers (never throws) */
 function info(t){
  try{
   var q=(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]; if(!q) return null;
   var c=db.categories[q.categoryId];
   var total=billFinalAmount(t,q,c).final;
   var paid=(t.payments||[]).reduce(function(a,p){ return a+(+p.amount||0); },0);
   var disc=(t.payments||[]).reduce(function(a,p){ return a+(p&&p.method==="Discount"?(+p.amount||0):0); },0);
   var bal=Math.max(0,total-paid);
   return {t:t,q:q,total:total,paid:paid,disc:disc,cash:paid-disc,bal:bal>0.5?bal:0};
  }catch(e){ return null; }
 }
 function rows(){
  var out=[];
  (db.trips||[]).forEach(function(t){
   if(!(t.billNo||t.status==="completed")) return;
   var i=info(t); if(i) out.push(i);
  });
  out.sort(function(a,b){ return String(b.t.created||b.t.startDate||b.t.entryDate||"").localeCompare(String(a.t.created||a.t.startDate||a.t.entryDate||"")); });
  return out;
 }
 function dateOf(i){ return i.t.startDate||i.t.entryDate||String(i.t.created||"").slice(0,10); }

 /* ---------- the list on the Billing page ---------- */
 function chip(i){
  if(i.bal<=0&&i.disc>0) return '<span style="background:#e6f7e9;color:#1c6b2c;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700;white-space:nowrap">&#9989; '+E(B("Settled (discount ","തീർന്നു (ഡിസ്കൗണ്ട് "))+mny(i.disc)+')</span>';
  return i.bal>0
   ? '<span style="background:#fdeaea;color:#b3261e;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700;white-space:nowrap">'+E(B("Pending","ബാക്കി"))+' '+mny(i.bal)+'</span>'
   : '<span style="background:#e6f7e9;color:#1c6b2c;border-radius:10px;padding:2px 8px;font-size:12px;font-weight:700;white-space:nowrap">&#9989; '+E(B("Paid","പൂർണ്ണം"))+'</span>';
 }
 function rowHtml(i){
  var id=i.t.id, pay=i.t.payments||[];
  var hist=pay.length
   ? '<details style="margin-top:4px"><summary style="font-size:12px;color:#555">'+E(B("Payment history","പേയ്മെന്റ് ചരിത്രം"))+' ('+pay.length+')</summary>'+
     pay.map(function(p){ return '<div style="font-size:12px;padding:2px 0">'+E(pd(p.at))+' &middot; <b>'+E(p.method||"")+'</b>'+(p.note?' ('+E(p.note)+')':'')+' &middot; '+mny(p.amount)+'</div>'; }).join("")+'</details>'
   : '<div class="muted" style="font-size:12px;margin-top:4px">'+E(B("No payment recorded yet","പേയ്മെന്റ് ഒന്നും രേഖപ്പെടുത്തിയിട്ടില്ല"))+'</div>';
  var btn='font-size:12px;padding:4px 9px';
  return '<div style="border:1px solid #d9d9d9;border-radius:10px;padding:8px 10px;margin:7px 0;background:#fff">'+
   '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>'+E(i.t.customer||i.q.customer||"-")+'</b>'+chip(i)+'</div>'+
   '<div class="muted" style="font-size:12px">'+[i.t.billNo?E(i.t.billNo):"",dateOf(i)?E(dd(dateOf(i))):""].filter(Boolean).join(" &middot; ")+'</div>'+
   '<div style="font-size:13px;margin-top:3px">'+E(B("Total","ആകെ"))+' <b>'+mny(i.total)+'</b> &middot; '+E(B("Received","കിട്ടിയത്"))+' <b>'+mny(i.cash)+'</b>'+(i.disc>0?' &middot; '+E(B("Discount","ഡിസ്കൗണ്ട്"))+' <b>'+mny(i.disc)+'</b>':'')+'</div>'+
   hist+
   '<div class="actions" style="margin-top:6px;flex-wrap:wrap">'+
   '<button onclick="tcBlOpen(\''+id+'\')" style="'+btn+'">'+E(B("Open","തുറക്കുക"))+'</button>'+
   (i.bal>0?'<button class="primary" onclick="tcBlRecv(\''+id+'\')" style="'+btn+'">&#10004; '+E(B("Received","കിട്ടി"))+'</button>':'')+
   '<button onclick="tcBlPrint(\''+id+'\',\'print\')" style="'+btn+'">'+E(B("Print","പ്രിന്റ്"))+'</button>'+
   '<button onclick="tcBlPrint(\''+id+'\',\'pdf\')" style="'+btn+'">PDF</button>'+
   '<button onclick="tcBlPrint(\''+id+'\',\'img\')" style="'+btn+'">'+E(B("Image","ഇമേജ്"))+'</button>'+
   '</div></div>';
 }
 function paintRows(){
  var box=$("tcBlRows"); if(!box) return;
  var all=rows(), due=all.filter(function(i){ return i.bal>0; });
  var list=all.filter(function(i){
   if(st.filter==="due"&&!(i.bal>0)) return false;
   if(st.filter==="paid"&&i.bal>0) return false;
   if(st.q){ var h=((i.t.customer||"")+" "+(i.q.customer||"")+" "+(i.t.billNo||"")+" "+(i.q.mobile||"")).toLowerCase(); if(h.indexOf(st.q)<0) return false; }
   return true;
  });
  var sum=due.reduce(function(a,i){ return a+i.bal; },0);
  var tabs=[["due",B("Pending","ബാക്കിയുള്ളവ")+" ("+due.length+")"],["paid",B("Paid","പൂർത്തിയായവ")+" ("+(all.length-due.length)+")"],["all",B("All","എല്ലാം")+" ("+all.length+")"]];
  var h='<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">'+tabs.map(function(t){
   return '<button onclick="tcBlFilter(\''+t[0]+'\')" style="font-size:12px;padding:5px 10px;'+(st.filter===t[0]?'background:#1f6feb;color:#fff;border-color:#1f6feb':'')+'">'+E(t[1])+'</button>';
  }).join("")+'</div>';
  if(due.length) h+='<div style="font-size:13px;margin:2px 0 4px"><b>'+E(B("To receive","കിട്ടാനുള്ളത്"))+': '+mny(sum)+'</b> <span class="muted">('+due.length+' '+E(B("bills","ബില്ലുകൾ"))+')</span></div>';
  if(!all.length) h+='<p class="muted" style="font-size:13px">'+E(B("No bills yet. Create a Quick Bill or complete a trip - it will appear here.","ബില്ലുകൾ ഇല്ല. Quick Bill ഉണ്ടാക്കുകയോ ട്രിപ്പ് പൂർത്തിയാക്കുകയോ ചെയ്താൽ ഇവിടെ കാണും."))+'</p>';
  else if(!list.length) h+='<p class="muted" style="font-size:13px">'+E(B("Nothing to show here.","ഇവിടെ കാണിക്കാൻ ഒന്നുമില്ല."))+'</p>';
  h+=list.slice(0,st.shown).map(rowHtml).join("");
  if(list.length>st.shown) h+='<div class="actions"><button onclick="tcBlMore()">'+E(B("Show more","കൂടുതൽ കാണുക"))+' ('+(list.length-st.shown)+')</button></div>';
  box.innerHTML=h;
 }
 window.tcBlFilter=function(f){ st.filter=f; st.shown=PAGE; paintRows(); };
 window.tcBlSearch=function(v){ st.q=String(v||"").trim().toLowerCase(); st.shown=PAGE; paintRows(); };
 window.tcBlMore=function(){ st.shown+=PAGE; paintRows(); };

 function injectList(){
  if($("tcBlList")) return;
  var sel=$("billTrip"); if(!sel) return;
  var anchor=sel.closest?sel.closest("label"):sel.parentNode; if(!anchor||!anchor.parentNode) return;
  var d=document.createElement("div"); d.id="tcBlList";
  d.innerHTML='<div class="card" style="border:2px solid #2e9e44;background:#f6fcf7"><h3 style="margin-top:0">&#128203; '+E(B("My Bills","എന്റെ ബില്ലുകൾ"))+'</h3>'+
   '<p class="muted" style="font-size:12px;margin:0 0 4px">'+E(B("Open an old bill, mark money received, or print it again.","പഴയ ബില്ല് തുറക്കാം, പണം കിട്ടിയത് രേഖപ്പെടുത്താം, വീണ്ടും പ്രിന്റ് ചെയ്യാം."))+'</p>'+
   '<input type="search" placeholder="'+E(B("Search customer / bill no.","കസ്റ്റമറുടെ പേര് / ബിൽ നമ്പർ തിരയുക"))+'" oninput="tcBlSearch(this.value)" style="width:100%;box-sizing:border-box">'+
   '<div id="tcBlRows"></div></div><hr>';
  anchor.parentNode.insertBefore(d,anchor);
  var any=rows().some(function(i){ return i.bal>0; });
  st.filter=any?"due":"all"; st.q=""; st.shown=PAGE;
  paintRows();
 }

 /* ---------- open / print ---------- */
 window.tcBlOpen=function(id){
  var bt=$("billTrip"); if(!bt) return;
  bt.value=id;
  try{ loadBill(); }catch(e){}
  var bx=$("billBox"); if(bx&&bx.scrollIntoView) bx.scrollIntoView({behavior:"smooth",block:"start"});
 };
 window.tcBlPrint=function(id,kind){
  var t=tripOf(id); if(!t) return;
  try{ if(!t.billNo){ ensureBillNo(t); save(); } }catch(e){}
  try{
   if(kind==="pdf") downloadBillPDF(id);
   else if(kind==="img") imageBill(id);
   else printBill(id);
  }catch(e){ say(B("Could not open the bill","ബില്ല് തുറക്കാനായില്ല")); }
 };

 /* ---------- money received ---------- */
 var RC=null;   /* the extra money waiting for "what is it?" */
 function todayStr(){ var t0=new Date(); return t0.getFullYear()+"-"+String(t0.getMonth()+1).padStart(2,"0")+"-"+String(t0.getDate()).padStart(2,"0"); }
 window.tcBlRecv=function(id){
  var t=tripOf(id), i=t&&info(t); if(!i) return;
  if(!(i.bal>0)){ say(B("This bill is fully paid","ഈ ബില്ല് പൂർണ്ണമായി അടച്ചു")); return; }
  modal('<h2>'+E(B("Money received","പണം കിട്ടി"))+'</h2>'+
   '<p class="muted" style="font-size:13px">'+E(i.t.customer||i.q.customer||"")+' &middot; '+E(B("Balance due","ബാക്കി"))+' <b>'+mny(i.bal)+'</b></p>'+
   '<div class="grid">'+
   '<label>'+E(B("Amount received","കിട്ടിയ തുക"))+'<input id="blAmt" type="number" inputmode="decimal" min="0" value="'+i.bal+'"></label>'+
   '<label>'+E(B("Received by","എങ്ങനെ കിട്ടി"))+'<select id="blMode"><option value="UPI">UPI</option><option value="Cash">Cash</option><option value="Other">'+E(B("Other (bank / cheque...)","മറ്റ് (ബാങ്ക് / ചെക്ക്...)"))+'</option></select></label>'+
   '<label>'+E(B("Date received","പണം കിട്ടിയ തീയതി"))+tcDateInputHtml("blDate",todayStr())+'</label>'+
   '<label>'+E(B("If less than the balance","ബാക്കിയേക്കാൾ കുറവാണെങ്കിൽ"))+'<select id="blLess"><option value="pend">'+E(B("Rest is still to receive","ബാക്കി കിട്ടാനുണ്ട് (ബില്ലിൽ തുടരും)"))+'</option><option value="disc">'+E(B("Close the bill - rest is a discount","ബാക്കി ഡിസ്കൗണ്ട് ആയി ബിൽ അവസാനിപ്പിക്കുക"))+'</option></select></label>'+
   '<label>'+E(B("Note (optional)","കുറിപ്പ് (ഓപ്ഷണൽ)"))+'<input id="blNote" placeholder="'+E(B("e.g. bank transfer","ഉദാ: ബാങ്ക് ട്രാൻസ്ഫർ"))+'"></label>'+
   '</div>'+
   '<p class="muted" style="font-size:12px">'+E(B("If the customer gave MORE than the balance, you can type the full amount - you will be asked what the extra is (tip).","കസ്റ്റമർ ബാക്കിയേക്കാൾ കൂടുതൽ തന്നെങ്കിൽ മുഴുവൻ തുകയും ടൈപ്പ് ചെയ്യാം - അധികം എന്താണെന്ന് (ടിപ്പ്) ചോദിക്കും."))+'</p>'+
   '<div class="actions"><button class="primary" onclick="tcBlRecvSave(\''+id+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>');
 };
 function afterRecv(id){
  var bt=$("billTrip");
  if(bt&&bt.value===id&&$("billBox")&&$("billBox").innerHTML){ try{ loadBill(); }catch(e){} }
  paintRows();
  try{ if(typeof window.tcAbRefresh==="function") window.tcAbRefresh(); }catch(e){}
 }
 window.tcBlRecvSave=function(id){
  var t=tripOf(id), i=t&&info(t); if(!i) return;
  var amt=parseFloat(($("blAmt")||{}).value);
  if(!(amt>0)){ say(B("Enter the amount","തുക നൽകുക")); return; }
  var d=tcReadDateInput("blDate");
  if(d===null){ say(B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക")); return; }
  var at=new Date().toISOString();
  if(d&&d!==todayStr()){ var x=new Date(d+"T12:00:00"); if(!isNaN(x)) at=x.toISOString(); }
  var mode=($("blMode")||{}).value||"UPI", note=String(($("blNote")||{}).value||"").trim(), less=($("blLess")||{}).value;
  var extra=amt>i.bal+0.5?Math.round((amt-i.bal)*100)/100:0;
  var payAmt=extra>0?i.bal:Math.round(amt*100)/100;
  var pay={amount:payAmt,method:mode,at:at}; if(note) pay.note=note;
  t.payments=t.payments||[]; t.payments.push(pay);
  var rest=Math.round((i.bal-payAmt)*100)/100;
  if(rest>0.5&&less==="disc") t.payments.push({amount:rest,method:"Discount",at:at,note:"Discount"});
  save(); closeModal();
  if(extra>0){
   RC={id:id,extra:extra,date:d||todayStr(),mode:mode,note:note};
   modal('<h2>&#127873; '+E(B("Extra money received","അധികം പണം കിട്ടി"))+': '+mny(extra)+'</h2>'+
    '<p class="muted" style="font-size:13px">'+E(B("The bill amount is saved. What is the extra "+mny(extra)+"?","ബിൽ തുക സേവ് ചെയ്തു. അധികം കിട്ടിയ "+mny(extra)+" എന്താണ്?"))+'</p>'+
    '<div class="actions" style="flex-direction:column;align-items:stretch">'+
    '<button class="primary" onclick="tcBlTip(\'veh\')">'+E(B("Vehicle tip - my income","വാഹന ടിപ്പ് - എന്റെ വരവ്"))+'</button>'+
    '<button onclick="tcBlTip(\'drv\')">'+E(B("Driver tip - money to give the driver","ഡ്രൈവർ ടിപ്പ് - ഡ്രൈവർക്ക് കൊടുക്കാനുള്ള പണം"))+'</button>'+
    '<button onclick="tcBlTip(\'no\')">'+E(B("Not a tip - do not record","ടിപ്പ് അല്ല - രേഖപ്പെടുത്തേണ്ട"))+'</button></div>');
   afterRecv(id);
   return;
  }
  say(B("Saved - payment added to the bill","സേവ് ചെയ്തു - ബില്ലിൽ ചേർത്തു"));
  afterRecv(id);
 };
 window.tcBlTip=function(kind){
  var c=RC; RC=null; if(!c){ closeModal(); return; }
  var ok=true;
  if(kind!=="no"){
   try{ ok=typeof window.tcAbAddTip==="function"&&window.tcAbAddTip({tripId:c.id,amount:c.extra,forDriver:kind==="drv",date:c.date,mode:c.mode,note:c.note}); }catch(e){ ok=false; }
  }
  closeModal();
  say(kind==="no"?B("Saved","സേവ് ചെയ്തു"):ok?B("Tip saved in Trip & Accounts","ടിപ്പ് ട്രിപ്പ് & അക്കൗണ്ട്സിൽ സേവ് ചെയ്തു"):B("The tip could not be saved (Trip & Accounts needs Premium / the free trial)","ടിപ്പ് സേവ് ചെയ്യാനായില്ല (ട്രിപ്പ് & അക്കൗണ്ട്സിന് Premium / സൗജന്യ കാലയളവ് വേണം)"));
  afterRecv(c.id);
 };

 /* ---------- hook into the existing Billing page ---------- */
 var origBilling=window.billing;
 if(typeof origBilling==="function"){
  window.billing=function(){
   var r=origBilling.apply(this,arguments);
   try{ injectList(); }catch(e){}
   return r;
  };
 }
 var origLoad=window.loadBill;
 if(typeof origLoad==="function"){
  window.loadBill=function(){
   var r=origLoad.apply(this,arguments);
   try{
    var bt=$("billTrip"), qr=$("billQR");
    var t=bt&&tripOf(bt.value), i=t&&info(t);
    if(i&&i.bal>0&&qr&&!$("tcBlRecvBox")){
     qr.insertAdjacentHTML("afterend",'<div id="tcBlRecvBox" style="margin-top:10px;padding:10px;border:2px solid #2e9e44;border-radius:10px;background:#f1fbf3">'+
      '<div style="font-size:13px;margin-bottom:6px">'+E(B("Customer paid? Mark it here - UPI, Cash or Other. It is saved in this bill's payment history.","കസ്റ്റമർ പണം തന്നോ? ഇവിടെ രേഖപ്പെടുത്തുക - UPI, Cash അല്ലെങ്കിൽ മറ്റ്. ഈ ബില്ലിന്റെ പേയ്മെന്റ് ചരിത്രത്തിൽ സേവ് ആകും."))+'</div>'+
      '<div class="actions"><button class="primary" onclick="tcBlRecv(\''+t.id+'\')">&#10004; '+E(B("Money received","പണം കിട്ടി"))+' ('+mny(i.bal)+')</button></div></div>');
    }
    paintRows();
   }catch(e){}
   return r;
  };
 }
})();
