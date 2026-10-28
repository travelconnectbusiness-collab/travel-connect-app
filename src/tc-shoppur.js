/* Shop book - PURCHASE BILLS (tc-shoppur.js, loaded by tc-regdocs.js after tc-shopcr.js). Needs tc-shop.js + tc-shopui.js (+ tc-shopcr.js for the dues).
   Owner's problem (2026-10-28): after a purchase was saved there was nowhere to SEE it, the "paid to the supplier" box was hidden on the second page, and a payment
   made on a LATER day (bought on the 25th, paid on the 27th) could not be dated. This adds:
   1) Home > "Purchase bills": every purchase bill (newest first; search by supplier / bill no. / item; "unpaid only"): date, supplier, bill no., items, total, paid / balance.
      Tap a bill: items with rate and amount, transport, bill total, what was paid (with the dates) and the balance, and the buttons
        "Add payment" (amount, Cash/UPI, any date -> a 'money paid' record of that supplier, tagged with the bill: {t:'sp',su,a,pm,bg:bill id}),
        "Change payment" (re-do the payment of this bill: amount + date; a payment dated AFTER the bill keeps the bill fully "due" on its day and records the payment on its own day),
        "Edit details" (date / supplier / bill no.), "Delete bill" (stock goes back).
   2) The Purchase form shows the payment choice on the FIRST page, below the items: Paid in full / Part paid / Not paid yet (due) + the day it was paid (+ Cash / UPI) and a live
      line "Bill total - Paid - Balance". Saving takes you straight to the Purchase bills list. (The old single "Paid now" box on page 2 is replaced by the same block.)
   Records are the ordinary shop-book records (kind b with cr = still due when the bill was made, kind o t:'sp' for payments) - the Credit & dues "To pay" list, Today's account
   and the Excel export need no change. A bill saved with a later payment date is stored as: b records with cr = full amount + one sp record dated the payment day.
   Nothing in tc-shop.js is edited; tc-shopui.js only exports pur() (the purchase being typed). */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||!UI.pur||window.__tcShopPur) return;
 window.__tcShopPur=1;
 var H=SH.H, money=H.money, qty=H.qty, r2=H.r2, T=UI.T, E=UI.E, say=UI.say, num=UI.num, dmy=UI.dmy, $=function(id){ return document.getElementById(id); };
 var V={q:"",unpaid:false,pm:"C"};
 function enc(k){ return encodeURIComponent(k).replace(/'/g,"%27"); }

 /* ---------- bills from the book ---------- */
 function bills(){
  var M=SH.calc(), G={};
  M.live.forEach(function(r){
   var x=r.x||{}; if(r.k!=="b") return;
   var key=x.g||("n|"+H.nm(x.su)+"|"+(x.bn||"")+"|"+r.d);
   var b=G[key]||(G[key]={key:key,hasG:!!x.g,d:r.d,su:"",bn:"",recs:[],pays:[],total:0,cr:0,ts:""});
   b.recs.push(r); if(x.su) b.su=x.su; if(x.bn) b.bn=x.bn; if(r.d<b.d) b.d=r.d; if(r.ts>b.ts) b.ts=r.ts;
   b.total+=(+x.q||0)*(+x.rt||0)+(+x.tr||0); b.cr+=(+x.cr||0);
  });
  M.live.forEach(function(r){ var x=r.x||{}; if(r.k==="o"&&x.t==="sp"&&x.bg&&G[x.bg]) G[x.bg].pays.push(r); });
  return Object.keys(G).map(function(k){
   var b=G[k], pd=0; b.total=r2(b.total); b.cr=r2(b.cr);
   b.pays.sort(function(a,c){ return a.d<c.d?-1:a.d>c.d?1:(a.ts<c.ts?-1:1); });
   b.pays.forEach(function(r){ pd+=+r.x.a||0; });
   b.due=r2(Math.max(0,b.cr-pd)); b.paid=r2(b.total-b.due); b.atBill=r2(Math.max(0,b.total-b.cr)); b.P=M.P;
   return b;
  });
 }
 function find(key){ var A=bills(); for(var i=0;i<A.length;i++) if(A[i].key===key) return A[i]; return null; }
 function pname(P,id){ var p=P&&P[id]; return p?p.n:"?"; }

 /* ---------- the list ---------- */
 UI.screen("purchases",function(){
  UI.body().innerHTML=
   '<div class="tsC"><input id="pbQ" placeholder="'+E(T("തിരയുക: കടയുടെ പേര് / ബിൽ നമ്പർ / സാധനം","Search: supplier / bill no. / item"))+'" value="'+E(V.q)+'" oninput="tsPbQ(this.value)">'+
   '<div style="margin-top:6px"><span class="tsChip'+(V.unpaid?" on":"")+'" onclick="tsPbUnpaid()">⏳ '+E(T("ബാക്കി ഉള്ളവ മാത്രം","Unpaid only"))+'</span></div>'+
   '<div class="tsM" id="pbSum" style="margin-top:6px"></div></div><div class="tsC" id="pbList"></div>'+
   '<button class="tsBtn" onclick="tsOpen(\'purchase\')">📥 '+E(T("പുതിയ വാങ്ങൽ ചേർക്കുക","Add a new purchase"))+'</button>';
  draw();
 },function(){ return "🧾 "+T("വാങ്ങിയ ബില്ലുകൾ","Purchase bills"); });
 function draw(){
  var l=$("pbList"); if(!l) return;
  var q=H.nm(V.q), A=bills().filter(function(b){
   if(V.unpaid&&b.due<=0.5) return false;
   if(!q) return true;
   if(H.nm(b.su).indexOf(q)>=0||H.nm(b.bn).indexOf(q)>=0) return true;
   return b.recs.some(function(r){ return H.nm(pname(b.P,r.x.p)).indexOf(q)>=0; });
  }).sort(function(a,c){ return a.d<c.d?1:a.d>c.d?-1:(a.ts<c.ts?1:-1); });
  var tot=0,due=0; A.forEach(function(b){ tot+=b.total; due+=b.due; });
  var s=$("pbSum"); if(s) s.textContent=A.length+" "+T("ബിൽ","bills")+" · "+T("ആകെ ","total ")+money(tot)+" · "+T("ബാക്കി കൊടുക്കാൻ ","still to pay ")+money(due);
  l.innerHTML=!A.length?'<div class="tsM" style="text-align:center">'+E(T("വാങ്ങിയ ബില്ലുകൾ ഒന്നുമില്ല","No purchase bills"))+'</div>':
   A.slice(0,100).map(function(b){
    var n=b.recs.length;
    return '<div class="tsRow" onclick="tsPbOpen(\''+enc(b.key)+'\')"><div><b style="font-size:17px">'+E(b.su||"—")+'</b><div class="tsM">'+E(dmy(b.d))+(b.bn?" · "+E(T("ബിൽ ","Bill "))+E(b.bn):"")+" · "+n+" "+E(T("ഇനം","item(s)"))+'</div></div>'+
     '<div style="text-align:right"><b style="font-size:18px">'+money(b.total)+'</b><div class="tsM" style="color:'+(b.due>0.5?'#a12d2d':'#177044')+';font-weight:700">'+(b.due>0.5?E(T("ബാക്കി ","Due "))+money(b.due):"✔ "+E(T("കൊടുത്തു","Paid")))+'</div></div></div>';
   }).join("")+(A.length>100?'<div class="tsM" style="text-align:center">'+E(T("ആദ്യത്തെ 100 മാത്രം - തിരയുക","First 100 only - use search"))+'</div>':"");
 }
 window.tsPbQ=function(v){ V.q=v||""; draw(); };
 window.tsPbUnpaid=function(){ V.unpaid=!V.unpaid; UI.render(); };

 /* ---------- one bill ---------- */
 function again(key){ UI.render(); setTimeout(function(){ if(find(key)) window.tsPbOpen(enc(key)); },30); }
 window.tsPbOpen=function(k){
  var key=decodeURIComponent(k), b=find(key); if(!b){ UI.closeSheet(); return; }
  var lines=b.recs.slice().sort(function(a,c){ return a.ts<c.ts?-1:1; }).map(function(r){
   var x=r.x, t=(+x.q||0)*(+x.rt||0), tr=+x.tr||0;
   return '<div class="tsRow"><div>'+E(pname(b.P,x.p))+'<div class="tsM">'+qty(x.q)+' × '+(+x.rt||0).toFixed(2)+(tr>0?' + '+E(T("ട്രാൻസ്പോർട്ട് ","transport "))+money(tr):'')+'</div></div><b>'+money(t+tr)+'</b></div>';
  }).join("");
  var pays=b.pays.map(function(r){
   return '<div class="tsRow"><div>'+E(T("പണം കൊടുത്തു","Paid"))+(r.x.pm==="U"?" · UPI":"")+'<div class="tsM">'+E(dmy(r.d))+'</div></div><div><b style="color:#177044">'+money(r.x.a)+'</b> <button class="tsX" onclick="tsPbPayCancel(\''+r.id+'\',\''+enc(key)+'\')">✕</button></div></div>';
  }).join("");
  UI.sheet('<h3 style="margin:0">'+E(b.su||"—")+'</h3><div class="tsM">'+E(dmy(b.d))+(b.bn?" · "+E(T("ബിൽ ","Bill "))+E(b.bn):"")+'</div>'+
   '<div style="margin-top:8px">'+lines+'</div>'+
   '<div class="tsRow"><span><b>'+E(T("ബില്ലിന്റെ ആകെ തുക","Bill total"))+'</b></span><b style="font-size:20px">'+money(b.total)+'</b></div>'+
   (b.atBill>0.5?'<div class="tsRow"><div>'+E(T("ബിൽ ദിവസം കൊടുത്തത്","Paid with the bill"))+'<div class="tsM">'+E(dmy(b.d))+'</div></div><b style="color:#177044">'+money(b.atBill)+'</b></div>':"")+pays+
   '<div class="tsRow"><span><b>'+E(b.due>0.5?T("ബാക്കി കൊടുക്കാനുള്ളത്","Balance to pay"):T("ബാക്കി ഇല്ല - മുഴുവനും കൊടുത്തു","Nothing due - fully paid"))+'</b></span><b style="font-size:20px;color:'+(b.due>0.5?'#a12d2d':'#177044')+'">'+money(b.due)+'</b></div>'+
   (b.due>0.5?'<button class="tsBtn" style="background:#1a8f4a" onclick="tsPbPay(\''+enc(key)+'\')">💸 '+E(T("പണം കൊടുത്തു (ചേർക്കുക)","Add a payment"))+'</button>':"")+
   '<button class="tsBtn g" onclick="tsPbChg(\''+enc(key)+'\')">✏ '+E(T("പണം കൊടുത്തത് മാറ്റുക (തുക / തീയതി)","Change payment (amount / date)"))+'</button>'+
   '<button class="tsBtn g" onclick="tsPbEdit(\''+enc(key)+'\')">✏ '+E(T("തീയതി / കട / ബിൽ നമ്പർ മാറ്റുക","Edit date / supplier / bill no."))+'</button>'+
   '<button class="tsBtn g" style="color:#a12d2d" onclick="tsPbDel(\''+enc(key)+'\')">🗑 '+E(T("ഈ ബിൽ ഒഴിവാക്കുക","Delete this bill"))+'</button>'+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 };
 window.tsPbPayCancel=function(id,k){
  if(!confirm(T("ഈ പണം കൊടുത്ത എൻട്രി റദ്ദാക്കട്ടേ?","Cancel this payment entry?"))) return;
  SH.cancel(id); say(T("റദ്ദാക്കി","Cancelled")); again(decodeURIComponent(k));
 };
 /* a bill from an older version has no bill id: give it one (re-making its records) before payments are tagged to it */
 function remake(b,patch,newD){
  var g=b.hasG?b.key:H.uid();
  b.recs.forEach(function(r){ SH.cancel(r.id); });
  b.recs.forEach(function(r){ var x=Object.assign({},r.x,{g:g},patch&&patch(r)||{}); Object.keys(x).forEach(function(k){ if(x[k]===undefined) delete x[k]; }); SH.add("b",x,newD||r.d); });
  return g;
 }
 function chips(id,on){ return '<div id="'+id+'"><span class="tsChip'+(on==="C"?" on":"")+'" onclick="tsPbPm(\'C\')">💵 '+E(T("പണം","Cash"))+'</span><span class="tsChip'+(on==="U"?" on":"")+'" onclick="tsPbPm(\'U\')">📱 UPI</span></div>'; }
 window.tsPbPm=function(m){ V.pm=m; var c=document.querySelectorAll("#pbPm .tsChip"); if(c.length>1){ c[0].classList.toggle("on",m==="C"); c[1].classList.toggle("on",m==="U"); } };
 window.tsPbPay=function(k){
  var key=decodeURIComponent(k), b=find(key); if(!b) return; V.pm="C";
  UI.sheet('<h3 style="margin:0">'+E(b.su||"—")+'</h3><div class="tsM">'+E(T("ബാക്കി ","Balance "))+money(b.due)+'</div>'+
   (b.su?'':'<label>'+E(T("കടയുടെ പേര് (സപ്ലൈയർ)","Supplier"))+'</label><input id="pbSu">')+
   '<label>'+E(T("കൊടുത്ത തുക","Amount paid"))+'</label><input id="pbA" type="number" inputmode="decimal" value="'+E(b.due>0?b.due:"")+'" style="font-size:26px">'+chips("pbPm","C")+
   UI.dateRow("pbD",H.today())+
   '<button class="tsBtn" style="background:#1a8f4a" onclick="tsPbPaySave(\''+enc(key)+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" onclick="tsPbOpen(\''+enc(key)+'\')">← '+E(T("പിന്നോട്ട്","Back"))+'</button>');
  var a=$("pbA"); if(a){ a.focus(); a.select(); }
 };
 window.tsPbPaySave=function(k){
  var key=decodeURIComponent(k), b=find(key); if(!b) return;
  var a=num("pbA"), su=b.su||($("pbSu")&&$("pbSu").value.trim())||"";
  if(!(a>0)){ say(T("തുക നൽകുക","Enter the amount")); return; }
  if(!su){ say(T("കടയുടെ പേര് നൽകുക","Enter the supplier's name")); return; }
  var g=key; if(!b.hasG||!b.su) g=remake(b,function(){ return {su:su}; });
  SH.add("o",{t:"sp",su:su,a:a,pm:V.pm,bg:g},UI.dateVal("pbD"));
  say(T("സേവ് ചെയ്തു · ","Saved · ")+money(a)); again(g);
 };
 window.tsPbChg=function(k){
  var key=decodeURIComponent(k), b=find(key); if(!b) return; V.pm=(b.pays.length&&b.pays[b.pays.length-1].x.pm)||"C";
  var last=b.pays.length?b.pays[b.pays.length-1].d:b.d;
  UI.sheet('<h3 style="margin:0">'+E(b.su||"—")+'</h3><div class="tsM">'+E(T("ബില്ലിന്റെ ആകെ ","Bill total "))+money(b.total)+'</div>'+
   '<div class="tsM" style="margin:6px 0">'+E(T("ഇത് ഈ ബില്ലിലെ പണം കൊടുത്തത് മുഴുവൻ മാറ്റി പുതിയത് രേഖപ്പെടുത്തും. കൊടുത്തിട്ടില്ലെങ്കിൽ 0 നൽകുക.","This replaces everything paid on this bill. Enter 0 if nothing was paid."))+'</div>'+
   (b.su?'':'<label>'+E(T("കടയുടെ പേര് (സപ്ലൈയർ)","Supplier"))+'</label><input id="pbSu">')+
   '<label>'+E(T("ആകെ കൊടുത്ത തുക","Total paid"))+'</label><input id="pbA" type="number" inputmode="decimal" value="'+E(b.paid)+'" style="font-size:26px">'+chips("pbPm",V.pm)+
   UI.dateRow("pbD",last)+
   '<button class="tsBtn" style="background:#1a8f4a" onclick="tsPbChgSave(\''+enc(key)+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" onclick="tsPbOpen(\''+enc(key)+'\')">← '+E(T("പിന്നോട്ട്","Back"))+'</button>');
 };
 /* the records of one bill for a given total paid A on day D */
 function applyPay(b,A,D,pm,su){
  var T0=b.total, later=A>0&&D>b.d, g=b.hasG?b.key:H.uid();
  A=Math.min(Math.max(0,A),T0);
  var crs=b.recs.map(function(r){ var lt=(+r.x.q||0)*(+r.x.rt||0)+(+r.x.tr||0); return later||A<=0?lt:(T0>0?lt*(T0-A)/T0:0); }).map(r2);
  var want=later||A<=0?T0:r2(T0-A), got=r2(crs.reduce(function(s,v){ return s+v; },0));
  if(crs.length&&want>0&&Math.abs(got-want)>0.004) crs[crs.length-1]=r2(crs[crs.length-1]+want-got);
  b.recs.forEach(function(r){ SH.cancel(r.id); }); b.pays.forEach(function(r){ SH.cancel(r.id); });
  b.recs.forEach(function(r,i){
   var x=Object.assign({},r.x,{g:g}); if(su) x.su=su;
   if(crs[i]>0.004) x.cr=crs[i]; else delete x.cr;
   SH.add("b",x,r.d);
  });
  if(later) SH.add("o",{t:"sp",su:su||b.su,a:r2(A),pm:pm,bg:g},D);
  return g;
 }
 window.tsPbChgSave=function(k){
  var key=decodeURIComponent(k), b=find(key); if(!b) return;
  var a=num("pbA"), D=UI.dateVal("pbD"), su=b.su||($("pbSu")&&$("pbSu").value.trim())||"";
  if(a<0||isNaN(a)){ say(T("തുക ശരിയല്ല","The amount is not valid")); return; }
  if(a>b.total+0.5){ say(T("ബില്ലിനേക്കാൾ കൂടുതൽ തുക കൊടുക്കാൻ പറ്റില്ല","The amount is more than the bill")); return; }
  if(a<b.total-0.5||D>b.d){ if(!su){ say(T("കടയുടെ പേര് (സപ്ലൈയർ) നൽകുക","Enter the supplier's name")); return; } }
  var g=applyPay(b,a,D,V.pm,su);
  say(T("സേവ് ചെയ്തു","Saved")); again(g);
 };
 window.tsPbEdit=function(k){
  var key=decodeURIComponent(k), b=find(key); if(!b) return;
  UI.sheet('<h3 style="margin:0">'+E(T("ബിൽ വിവരങ്ങൾ","Bill details"))+'</h3>'+
   '<label>'+E(T("കടയുടെ പേര് (സപ്ലൈയർ)","Supplier"))+'</label><input id="pbSu" list="pbSuL" value="'+E(b.su)+'"><datalist id="pbSuL">'+SH.suppliers().map(function(s){ return '<option value="'+E(s)+'">'; }).join("")+'</datalist>'+
   '<label>'+E(T("ബിൽ നമ്പർ","Bill no."))+'</label><input id="pbBn" value="'+E(b.bn)+'">'+UI.dateRow("pbD",b.d)+
   '<div class="tsM">'+E(T("തീയതി മാറ്റിയാൽ ആ ദിവസത്തെ കണക്കിലേക്ക് മാറും.","Changing the date moves the bill to that day."))+'</div>'+
   '<button class="tsBtn" onclick="tsPbEditSave(\''+enc(key)+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" onclick="tsPbOpen(\''+enc(key)+'\')">← '+E(T("പിന്നോട്ട്","Back"))+'</button>');
 };
 window.tsPbEditSave=function(k){
  var key=decodeURIComponent(k), b=find(key); if(!b) return;
  var su=($("pbSu").value||"").trim(), bn=($("pbBn").value||"").trim(), D=UI.dateVal("pbD");
  if(!su&&b.due>0.5){ say(T("ബാക്കി ഉള്ളതുകൊണ്ട് കടയുടെ പേര് വേണം","A supplier name is needed while something is due")); return; }
  var pays=b.pays.slice(), g=remake(b,function(){ return {su:su||undefined,bn:bn||undefined}; },D);
  pays.forEach(function(r){ SH.cancel(r.id); SH.add("o",Object.assign({},r.x,{su:su,bg:g}),r.d); });
  say(T("സേവ് ചെയ്തു","Saved")); again(g);
 };
 window.tsPbDel=function(k){
  var key=decodeURIComponent(k), b=find(key); if(!b) return;
  if(!confirm(T("ഈ ബിൽ ഒഴിവാക്കട്ടേ? സ്റ്റോക്കിൽ നിന്ന് ഈ സാധനങ്ങൾ കുറയും, പണം കൊടുത്ത എൻട്രികളും റദ്ദാകും.","Delete this bill? The stock it added is removed and its payments are cancelled."))) return;
  b.recs.forEach(function(r){ SH.cancel(r.id); }); b.pays.forEach(function(r){ SH.cancel(r.id); });
  say(T("ഒഴിവാക്കി","Deleted")); UI.closeSheet(); UI.render();
 };

 /* ---------- the payment block on the Purchase form ---------- */
 var P={mode:"full",amt:"",on:"",pm:"C",ref:null};
 function purDate(s){ var e=$("puD"); return (e&&/^\d{4}-\d{2}-\d{2}$/.test(e.value)&&e.value)||s.date||H.today(); }
 function billSum(s){
  var tot=0; s.lines.forEach(function(l){ tot+=l.total; });
  var te=$("puT"), tr=Math.max(0,parseFloat(te?te.value:s.tr)||0);
  return tot+tr;
 }
 function paidAmt(s){ var b=billSum(s); return P.mode==="full"?b:P.mode==="part"?Math.min(b,Math.max(0,parseFloat(P.amt)||0)):0; }
 function sumTxt(s){
  var b=billSum(s), p=paidAmt(s), d=purDate(s), on=P.on&&P.on>d?P.on:d;
  var t=T("ബില്ലിന്റെ ആകെ ","Bill total ")+money(b)+" · "+T("കൊടുത്തത് ","Paid ")+money(p)+" · "+T("ബാക്കി (കടം) ","Balance (due) ")+money(Math.max(0,b-p));
  if(p>0&&on>d) t+="\n"+T("പണം കൊടുത്ത ദിവസം ബില്ലിന്റെ ദിവസത്തിനു ശേഷമായതിനാൽ ബിൽ ദിവസം കടമായും, പണം കൊടുത്ത ദിവസം 'കൊടുത്തത്' ആയും രേഖപ്പെടുത്തും.","The payment is after the bill day, so the bill is kept as due and the payment is recorded on its own day.");
  if(b-p>0.5&&!(($("puS")&&$("puS").value.trim())||s.sup)) t+="\n⚠ "+T("ബാക്കി ഉള്ളതുകൊണ്ട് മുകളിൽ കടയുടെ പേര് (സപ്ലൈയർ) നൽകണം.","A supplier name is needed above while something is due.");
  return t;
 }
 function payHtml(s){
  var d=purDate(s), ch=function(m,ic,ml,en){ return '<span class="tsChip'+(P.mode===m?" on":"")+'" onclick="tsPayMode(\''+m+'\')">'+ic+" "+E(T(ml,en))+'</span>'; };
  return '<b>💸 '+E(T("സപ്ലൈയർക്ക് പണം കൊടുത്തത്","Paid to the supplier"))+'</b>'+
   '<div style="margin-top:6px">'+ch("full","✔","മുഴുവനും കൊടുത്തു","Paid in full")+ch("part","◐","കുറച്ച് കൊടുത്തു","Part paid")+ch("none","⏳","കൊടുത്തിട്ടില്ല (കടം)","Not paid yet (due)")+'</div>'+
   (P.mode==="part"?'<label>'+E(T("ഇതുവരെ കൊടുത്ത തുക","Amount paid"))+'</label><input id="tsPayA" type="number" inputmode="decimal" value="'+E(P.amt)+'" oninput="tsPayIn()">':"")+
   (P.mode!=="none"?'<label>'+E(T("പണം കൊടുത്ത തീയതി","Paid on"))+'</label><input id="tsPayD" type="date" value="'+E(P.on||d)+'" max="'+H.today()+'" onchange="tsPayIn()">'+
    '<div id="tsPayPm"><span class="tsChip'+(P.pm==="C"?" on":"")+'" onclick="tsPayPm(\'C\')">💵 '+E(T("പണം","Cash"))+'</span><span class="tsChip'+(P.pm==="U"?" on":"")+'" onclick="tsPayPm(\'U\')">📱 UPI</span></div>':"")+
   '<div class="tsM" id="tsPaySum" style="margin-top:6px;white-space:pre-line;font-weight:700"></div>';
 }
 function paint(){
  var s=UI.pur(), box=$("tsPay"); if(!s||!box) return;
  box.innerHTML=payHtml(s); refresh();
 }
 function refresh(){ var s=UI.pur(), e=$("tsPaySum"); if(!s||!e) return; var t=sumTxt(s); if(e.textContent!==t) e.textContent=t; }
 window.tsPayMode=function(m){ P.mode=m; paint(); };
 window.tsPayIn=function(){ var a=$("tsPayA"), d=$("tsPayD"); if(a) P.amt=a.value; if(d) P.on=d.value; refresh(); };
 window.tsPayPm=function(m){ P.pm=m; var c=document.querySelectorAll("#tsPayPm .tsChip"); if(c.length>1){ c[0].classList.toggle("on",m==="C"); c[1].classList.toggle("on",m==="U"); } };
 function purchaseForm(bd){
  var s=UI.pur(); if(!s) return;
  if(P.ref!==s){ P.ref=s; P.mode="full"; P.amt=""; P.on=""; P.pm="C"; }
  if($("puS")&&!$("tsPbLink")){
   bd.insertAdjacentHTML("afterbegin",'<div class="tsC" id="tsPbLink" style="padding:8px 12px"><button class="tsBtn g s" style="margin:0" onclick="tsOpen(\'purchases\')">📋 '+E(T("വാങ്ങിയ ബില്ലുകൾ കാണുക","See purchase bills"))+'</button></div>');
  }
  var box=$("tsPay");
  if(s.stage===2){
   var pe=$("puPaid"); if(!pe){ return; }
   if(box&&box.parentNode&&box.parentNode.contains(pe)) return;
   var c=pe.parentNode; pe.style.display="none"; if(pe.previousElementSibling) pe.previousElementSibling.style.display="none";
   if(box) box.remove();
   box=document.createElement("div"); box.id="tsPay"; box.style.cssText="margin-top:8px"; c.appendChild(box); paint();
   return;
  }
  var pl=$("puLines"); if(!pl||!s.lines.length){ if(box) box.remove(); return; }
  if(box&&pl.contains(box)){ refresh(); return; }
  var nx=pl.querySelector('button[onclick="tsPuNext()"]'); if(!nx) return;
  box=document.createElement("div"); box.id="tsPay"; box.className="tsC"; box.style.cssText="border:2px solid #c9740c;margin:10px 0 0";
  pl.insertBefore(box,nx); paint();
  var te=$("puT"); if(te&&!te.dataset.pw){ te.dataset.pw="1"; te.addEventListener("input",refresh); }
  var de=$("puD"); if(de&&!de.dataset.pw){ de.dataset.pw="1"; de.addEventListener("change",function(){ paint(); }); }
 }
 var oSave=window.tsPuSave;
 if(typeof oSave==="function") window.tsPuSave=function(){
  var s=UI.pur();
  if(!s||!s.lines||!s.lines.length) return oSave.apply(this,arguments);
  var bill=0; s.lines.forEach(function(l){ bill+=l.total+(l.tr||0); });
  var d=s.date||H.today(), on=P.on&&P.on>d?P.on:d, paid=P.mode==="full"?bill:P.mode==="part"?Math.min(bill,Math.max(0,parseFloat(P.amt)||0)):0;
  if(P.mode==="part"&&!(paid>0)){ say(T("കൊടുത്ത തുക നൽകുക","Enter the amount paid")); return; }
  var later=paid>0&&on>d;
  if(P.mode==="full"&&!later) s.paid=null; else s.paid=later?0:paid;
  var pe=$("puPaid"); if(pe) pe.remove();   /* the old single box must not overwrite this */
  var before={}; SH.calc().live.forEach(function(r){ if(r.k==="b") before[r.id]=1; });
  var r=oSave.apply(this,arguments);
  try{
   var fresh=SH.calc().live.filter(function(x){ return x.k==="b"&&!before[x.id]; });
   if(!fresh.length) return r;      /* refused (e.g. supplier name missing): nothing saved, stay on the form */
   if(later) SH.add("o",{t:"sp",su:s.sup,a:r2(paid),pm:P.pm,bg:fresh[0].x.g},on);
   P.ref=null;
   UI.go(window.__tcDayFrom?"day":"purchases");
  }catch(e){}
  return r;
 };

 /* ---------- Home button ---------- */
 function homeBtn(bd){
  if($("tsPurBtn")) return;
  var g=bd.querySelector(".tsG"); if(!g) return;
  var b=document.createElement("button"); b.id="tsPurBtn"; b.className="tsBig"; b.style.background="#8a4b00"; b.setAttribute("onclick","tsOpen('purchases')");
  b.textContent="🧾 "+T("വാങ്ങിയ ബില്ലുകൾ","Purchase bills"); g.appendChild(b);
 }
 var tm=null;
 function later(){ clearTimeout(tm); tm=setTimeout(function(){
  try{
   var bd=UI.body(); if(!bd||!UI.isOpen()) return;
   var sc=UI.screenName();
   if(sc==="purchase") purchaseForm(bd); else if(sc==="home") homeBtn(bd);
  }catch(e){ if(window.console) console.error("tc-shoppur",e); }
 },40); }
 function boot(){
  var b=document.body; if(!b||!window.MutationObserver) return;
  new MutationObserver(later).observe(b,{childList:true,subtree:true});
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
 window.__tcShopPurApi={bills:bills,find:find,billSum:billSum};
})();
