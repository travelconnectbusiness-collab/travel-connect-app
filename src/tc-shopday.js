/* Shop book - DAY BOOK (tc-shopday.js, loaded by tc-regdocs.js after tc-shoppur.js). Needs tc-shop.js, tc-shopui.js, tc-shoprep.js, tc-shopcr.js, tc-shoppur.js.
   Owner's wish (2026-10-28): "choose a date and that date stays at the top; I must be able to see EVERYTHING of that date - purchases, sales, expenses ... - and also ADD
   (even small things) and EDIT them for that date, whenever I want".
   Home > "Day book": a screen with the date on top (< date picker >, Today) and
     - the day's figures (sales: cash / UPI / credit, credit money received, bought, paid to suppliers, expenses, loss, profit),
     - buttons to ADD a Sale / Purchase / Expense / Loss FOR THAT DATE (the normal entry screens open with that date already filled; a banner on them says so and has
       "<- Day book"; saving a purchase comes back here),
     - lists of everything of that day: Sales (one row per sale bill), Purchase bills, Expenses, Loss / dead, Money received / paid to suppliers.
       Tap a row: Sale -> lines, Edit (quantity, price, date, Cash / UPI / Credit + name; quantity 0 removes a line) or Cancel; Purchase -> the bill sheet of the Purchase bills
       screen (payments, change, edit, delete); Expense / Loss / Money -> edit (amount, category / reason, note, date) or delete.
   Edits follow the book's rule (append only): the old record is cancelled and a new one made with the changed values (stock, sales and dues all recalculate by themselves).
   Sales made from a quotation / invoice / bill (records carrying x.dk) are shown but must be changed in that document (they are rebuilt from it).
   The date of the entry screens comes from window.__tcDayPick (tc-shopui.js dateRow uses it instead of "today" while it is set; set only when the day is not today,
   cleared when the Day book is shown, when any other screen is opened from Home / Menu, or after 45 minutes). window.__tcDayFrom = the day the add was started from. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||!SH.report||window.__tcShopDay) return;
 window.__tcShopDay=1;
 var H=SH.H, money=H.money, qty=H.qty, r2=H.r2, T=UI.T, E=UI.E, say=UI.say, num=UI.num, dmy=UI.dmy, $=function(id){ return document.getElementById(id); };
 var V={d:H.today(),pm:"C",ec:"Miscellaneous",lr:0};
 var tmr=null, via=false, oOpen=window.tsOpen;
 function enc(k){ return encodeURIComponent(k).replace(/'/g,"%27"); }
 function setFrom(d){
  window.__tcDayFrom=d||null; clearTimeout(tmr);
  window.__tcDayPick=(d&&d!==H.today())?d:null;
  if(d) tmr=setTimeout(function(){ window.__tcDayFrom=null; window.__tcDayPick=null; },45*60000);
 }
 function openScreen(s){ via=true; try{ if(typeof oOpen==="function") oOpen(s); else UI.go(s); }finally{ via=false; } }
 if(typeof oOpen==="function") window.tsOpen=function(s){ if(!via) setFrom(null); return oOpen.apply(this,arguments); };
 var uOpen=UI.open; if(typeof uOpen==="function") UI.open=function(s){ if(!via) setFrom(null); return uOpen.apply(this,arguments); };

 var WD_ML=["ഞായർ","തിങ്കൾ","ചൊവ്വ","ബുധൻ","വ്യാഴം","വെള്ളി","ശനി"], WD_EN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
 function wday(d){ var w=new Date(d+"T00:00:00").getDay(); return T(WD_ML[w],WD_EN[w]); }
 function addD(d,n){ return H.addDays(d,n); }
 function lday(ts){ var x=new Date(ts); if(isNaN(x)) return ""; return x.getFullYear()+"-"+H.pad(x.getMonth()+1)+"-"+H.pad(x.getDate()); }
 function pmTxt(x){ return x.pm==="U"?"📱 UPI":x.pm==="K"?"📒 "+T("കടം","Credit")+(x.cu?" · "+x.cu:""):x.pm==="O"?T("മറ്റ്","Other"):"💵 "+T("പണം","Cash"); }
 function late(r){ var l=lday(r.ts); return l&&l!==r.d?'<div class="tsM" style="color:#7a5a14">'+E(T("ചേർത്തത് ","added on "))+E(dmy(l))+'</div>':""; }

 /* ---------- the screen ---------- */
 UI.screen("day",function(){
  setFrom(null);
  var D=V.d, t=H.today(), R=SH.report(D,D), M=SH.calc(), P=M.P, simple=UI.simple();
  var live=M.live.filter(function(r){ return r.d===D; });
  var G={}, goList=[];
  live.forEach(function(r){ if(r.k==="s"){ var k=r.x.g||r.id; if(!G[k]){ G[k]={key:k,recs:[]}; goList.push(G[k]); } G[k].recs.push(r); } });
  var exp=live.filter(function(r){ return r.k==="e"; }), loss=live.filter(function(r){ return r.k==="m"; }), mon=live.filter(function(r){ return r.k==="o"&&(r.x.t==="rc"||r.x.t==="sp"); });
  var PB=window.__tcShopPurApi, bl=PB?PB.bills().filter(function(b){ return b.d===D; }):[];
  var h='<div class="tsC" style="text-align:center"><div style="display:flex;align-items:center;justify-content:center;gap:10px"><span class="tsChip" onclick="tsDyMove(-1)">◀</span>'+
   '<b style="font-size:26px">'+E(dmy(D))+'</b><span class="tsChip" style="'+(D>=t?'opacity:.35':'')+'" onclick="tsDyMove(1)">▶</span></div>'+
   '<div class="tsM">'+E(wday(D))+(D===t?" · "+E(T("ഇന്ന്","Today")):"")+'</div>'+
   '<input type="date" id="dyD" value="'+E(D)+'" max="'+t+'" onchange="tsDyPick(this.value)" style="margin-top:8px"><div>'+(D!==t?'<span class="tsChip" onclick="tsDyPick(\''+t+'\')">'+E(T("ഇന്നത്തേക്ക്","Go to today"))+'</span>':"")+'</div></div>';
  /* figures */
  var row=function(a,b,c){ return '<div class="tsRow"><span>'+a+'</span><b'+(c?' style="color:'+c+'"':"")+'>'+b+'</b></div>'; };
  h+='<div class="tsC"><div class="tsRow"><span>'+E(T("വിൽപ്പന","Sales"))+'</span><span class="tsTot">'+money(R.sales)+'</span></div>'+
   (R.sales>0?'<div class="tsM">💵 '+money(R.cash)+' · 📱 '+money(R.upi)+(R.credit>0?' · 📒 '+money(R.credit):'')+(R.other>0?' · '+money(R.other):'')+'</div>':'')+
   (R.recv>0?row('💰 '+E(T("കടം തിരിച്ചു കിട്ടിയത്","Credit money received")),money(R.recv)):'')+
   (R.bought>0?row('📥 '+E(T("വാങ്ങിയത്","Bought")),money(R.bought)):'')+
   (R.supPaid>0?row('💸 '+E(T("സപ്ലയർക്ക് കൊടുത്തത്","Paid to suppliers")),money(R.supPaid)):'')+
   (R.exp>0?row('🧾 '+E(T("ചെലവ്","Expenses")),money(R.exp)):'')+
   (R.dead>0?row('💀 '+E(T("നഷ്ടം","Loss")),money(R.dead)):'')+
   (!simple&&(R.sales>0||R.exp>0||R.dead>0)?row('<b>'+E(R.net>=0?T("അറ്റ ലാഭം","Net profit"):T("അറ്റ നഷ്ടം","Net loss"))+'</b>',money(R.net),R.net>=0?'#177044':'#a12d2d'):'')+'</div>';
  /* add for this date */
  h+='<div class="tsC"><b>➕ '+E(T("ഈ തീയതിയിൽ ചേർക്കുക","Add for this date"))+'</b><div class="tsG" style="margin-top:6px">'+
   '<button class="tsBtn" style="background:#1a8f4a;margin:0" onclick="tsDyAdd(\'sale\')">🛒 '+E(T("വിൽപ്പന","Sale"))+'</button>'+
   '<button class="tsBtn" style="background:#c9740c;margin:0" onclick="tsDyAdd(\'purchase\')">📥 '+E(T("വാങ്ങൽ","Purchase"))+'</button>'+
   '<button class="tsBtn" style="background:#6a4aa5;margin:0" onclick="tsDyAdd(\'expense\')">🧾 '+E(T("ചെലവ്","Expense"))+'</button>'+
   '<button class="tsBtn" style="background:#a12d2d;margin:0" onclick="tsDyAdd(\'dead\')">💀 '+E(T("നഷ്ടം","Loss"))+'</button></div></div>';
  /* sales */
  if(goList.length){
   var st=0; goList.forEach(function(g){ g.tot=0; g.recs.forEach(function(r){ g.tot+=(+r.x.q||0)*(+r.x.pr||0); }); st+=g.tot; });
   h+='<div class="tsC"><div class="tsRow" style="border:0"><b>🛒 '+E(T("വിൽപ്പന","Sales"))+' ('+goList.length+')</b><b>'+money(st)+'</b></div>'+goList.map(function(g){
    var names=g.recs.map(function(r){ var p=P[r.x.p]; return (p?p.n:"?")+(+r.x.q!==1?" ×"+qty(r.x.q):""); }).join(", "); if(names.length>70) names=names.slice(0,68)+"…";
    return '<div class="tsRow" onclick="tsDySale(\''+enc(g.key)+'\')"><div>'+E(names)+'<div class="tsM">'+E(pmTxt(g.recs[0].x))+'</div>'+late(g.recs[0])+'</div><div><b>'+money(g.tot)+'</b> ›</div></div>';
   }).join("")+'</div>';
  }
  if(bl.length){
   var bt=0; bl.forEach(function(b){ bt+=b.total; });
   h+='<div class="tsC"><div class="tsRow" style="border:0"><b>📥 '+E(T("വാങ്ങിയ ബില്ലുകൾ","Purchase bills"))+' ('+bl.length+')</b><b>'+money(bt)+'</b></div>'+bl.map(function(b){
    return '<div class="tsRow" onclick="tsPbOpen(\''+enc(b.key)+'\')"><div><b>'+E(b.su||"—")+'</b><div class="tsM">'+(b.bn?E(T("ബിൽ ","Bill "))+E(b.bn)+" · ":"")+b.recs.length+" "+E(T("ഇനം","item(s)"))+'</div></div><div style="text-align:right"><b>'+money(b.total)+'</b><div class="tsM" style="color:'+(b.due>0.5?'#a12d2d':'#177044')+'">'+(b.due>0.5?E(T("ബാക്കി ","Due "))+money(b.due):"✔")+'</div></div></div>';
   }).join("")+'</div>';
  }
  if(exp.length){
   var et=0; exp.forEach(function(r){ et+=+r.x.a||0; });
   h+='<div class="tsC"><div class="tsRow" style="border:0"><b>🧾 '+E(T("ചെലവ്","Expenses"))+' ('+exp.length+')</b><b>'+money(et)+'</b></div>'+exp.map(function(r){
    return '<div class="tsRow" onclick="tsDyExp(\''+r.id+'\')"><div>'+E(ecName(r.x.c))+(r.x.t?'<div class="tsM">'+E(r.x.t)+'</div>':'')+late(r)+'</div><div><b>'+money(r.x.a)+'</b> ›</div></div>';
   }).join("")+'</div>';
  }
  if(loss.length){
   h+='<div class="tsC"><div class="tsRow" style="border:0"><b>💀 '+E(T("നഷ്ടം","Loss"))+' ('+loss.length+')</b><b>'+money(R.dead)+'</b></div>'+loss.map(function(r){ var p=P[r.x.p];
    return '<div class="tsRow" onclick="tsDyLoss(\''+r.id+'\')"><div>'+E(p?p.n:"?")+' × '+qty(r.x.q)+'<div class="tsM">'+E(r.x.r||"")+'</div>'+late(r)+'</div><div><b>'+money((+r.x.q||0)*(p?p.avg:0))+'</b> ›</div></div>';
   }).join("")+'</div>';
  }
  if(mon.length){
   h+='<div class="tsC"><div class="tsRow" style="border:0"><b>💰 '+E(T("പണം കിട്ടിയത് / കൊടുത്തത്","Money received / paid"))+' ('+mon.length+')</b></div>'+mon.map(function(r){ var rc=r.x.t==="rc";
    return '<div class="tsRow" onclick="tsDyMoney(\''+r.id+'\')"><div>'+E(rc?T("കിട്ടി: ","Received: "):T("കൊടുത്തു: ","Paid: "))+E((rc?r.x.cu:r.x.su)||"")+'<div class="tsM">'+(r.x.pm==="U"?"UPI":E(T("പണം","Cash")))+'</div>'+late(r)+'</div><div><b style="color:'+(rc?'#177044':'#7a5a14')+'">'+money(r.x.a)+'</b> ›</div></div>';
   }).join("")+'</div>';
  }
  if(!goList.length&&!bl.length&&!exp.length&&!loss.length&&!mon.length) h+='<div class="tsC tsM" style="text-align:center">'+E(T("ഈ ദിവസം എൻട്രികൾ ഒന്നുമില്ല","Nothing entered for this day"))+'</div>';
  UI.body().innerHTML=h;
 },function(){ return "📅 "+T("ദിവസത്തെ കണക്ക്","Day book"); });
 window.tsDyPick=function(v){ if(/^\d{4}-\d{2}-\d{2}$/.test(v||"")&&v<=H.today()){ V.d=v; UI.render(); } };
 window.tsDyMove=function(n){ var d=addD(V.d,n); if(d>H.today()) return; V.d=d; UI.render(); };
 window.tsDyHome=function(){ V.d=H.today(); openScreen("day"); };
 window.tsDyAdd=function(kind){ setFrom(V.d); openScreen(kind); };
 window.tsDyBack=function(){ openScreen("day"); };

 /* ---------- a sale bill ---------- */
 function saleGroup(key){
  var M=SH.calc(), recs=M.live.filter(function(r){ return r.k==="s"&&(r.x.g||r.id)===key; });
  return recs.length?{key:key,recs:recs,P:M.P,dk:recs.some(function(r){ return r.x.dk; })}:null;
 }
 window.tsDySale=function(k){
  var key=decodeURIComponent(k), g=saleGroup(key); if(!g){ UI.closeSheet(); return; }
  var tot=0, x0=g.recs[0].x;
  var lines=g.recs.map(function(r){ var p=g.P[r.x.p], t=(+r.x.q||0)*(+r.x.pr||0); tot+=t; return '<div class="tsRow"><div>'+E(p?p.n:"?")+'<div class="tsM">'+qty(r.x.q)+' × '+money(r.x.pr)+'</div></div><b>'+money(t)+'</b></div>'; }).join("");
  UI.sheet('<h3 style="margin:0">🛒 '+E(T("വിൽപ്പന","Sale"))+' · '+E(dmy(g.recs[0].d))+'</h3><div class="tsM">'+E(pmTxt(x0))+'</div><div style="margin-top:8px">'+lines+'</div>'+
   '<div class="tsRow"><span><b>'+E(T("ആകെ","Total"))+'</b></span><span class="tsTot">'+money(tot)+'</span></div>'+
   (g.dk?'<div class="tsM" style="margin:8px 0">'+E(T("ഇത് ഒരു ഇൻവോയ്സ് / ബില്ലിൽ നിന്ന് വന്നതാണ് - മാറ്റം ആ ഇൻവോയ്സിൽ വരുത്തുക.","This came from an invoice / bill - change it in that document."))+'</div>'+
     (typeof window.tcDocsOpen==="function"?'<button class="tsBtn" onclick="tsCloseSheet();tcDocsOpen(\'view\',{id:\''+E(x0.dk)+'\'})">🧾 '+E(T("ഇൻവോയ്സ് തുറക്കുക","Open the document"))+'</button>':""):
     '<button class="tsBtn" onclick="tsDySaleEdit(\''+enc(key)+'\')">✏ '+E(T("തിരുത്തുക","Edit"))+'</button><button class="tsBtn g" style="color:#a12d2d" onclick="tsDySaleDel(\''+enc(key)+'\')">🗑 '+E(T("വിൽപ്പന റദ്ദാക്കുക","Cancel this sale"))+'</button>')+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 };
 window.tsDySaleDel=function(k){
  var g=saleGroup(decodeURIComponent(k)); if(!g) return;
  if(!confirm(T("ഈ വിൽപ്പന റദ്ദാക്കട്ടേ? സാധനങ്ങൾ സ്റ്റോക്കിലേക്ക് തിരിച്ചു വരും.","Cancel this sale? The items go back to stock."))) return;
  g.recs.forEach(function(r){ SH.cancel(r.id); }); say(T("റദ്ദാക്കി","Cancelled")); UI.closeSheet(); UI.render();
 };
 function pmChips(on,fn){
  return '<div id="dyPm"><span class="tsChip'+(on==="C"?" on":"")+'" onclick="'+fn+'(\'C\')">💵 '+E(T("പണം","Cash"))+'</span><span class="tsChip'+(on==="U"?" on":"")+'" onclick="'+fn+'(\'U\')">📱 UPI</span>'+
   (fn==="tsDyPm"?'<span class="tsChip'+(on==="K"?" on":"")+'" onclick="'+fn+'(\'K\')">📒 '+E(T("കടം","Credit"))+'</span>':"")+'</div>';
 }
 window.tsDyPm=function(m){
  V.pm=m; var c=document.querySelectorAll("#dyPm .tsChip"), ks=["C","U","K"];
  for(var i=0;i<c.length;i++) c[i].classList.toggle("on",ks[i]===m);
  var w=$("dyCuW"); if(w) w.style.display=m==="K"?"block":"none";
 };
 window.tsDySaleEdit=function(k){
  var key=decodeURIComponent(k), g=saleGroup(key); if(!g) return; var x0=g.recs[0].x; V.pm=x0.pm==="U"||x0.pm==="K"?x0.pm:"C";
  var lines=g.recs.map(function(r,i){ var p=g.P[r.x.p];
   return '<div style="margin-top:8px"><b>'+E(p?p.n:"?")+'</b><div class="tsG"><div><label>'+E(T("എണ്ണം","Quantity"))+'</label><input id="dyQ'+i+'" type="number" inputmode="decimal" value="'+E(r.x.q)+'"></div><div><label>'+E(T("വില (ഒന്നിന്)","Price (each)"))+'</label><input id="dyP'+i+'" type="number" inputmode="decimal" value="'+E(r.x.pr)+'"></div></div></div>'; }).join("");
  UI.sheet('<h3 style="margin:0">✏ '+E(T("വിൽപ്പന തിരുത്തുക","Edit sale"))+'</h3><div class="tsM">'+E(T("ഒരു സാധനം ഒഴിവാക്കാൻ എണ്ണം 0 ആക്കുക","Set the quantity to 0 to remove an item"))+'</div>'+lines+
   '<div style="margin-top:8px">'+pmChips(V.pm,"tsDyPm")+'</div>'+
   '<div id="dyCuW" style="display:'+(V.pm==="K"?"block":"none")+'"><label>'+E(T("ആർക്കാണ് കടം? (പേര്)","Credit to whom? (name)"))+'</label><input id="dyCu" list="dyCuL" value="'+E(x0.cu||"")+'"><datalist id="dyCuL">'+SH.ledger().cust.map(function(c){ return '<option value="'+E(c.n)+'">'; }).join("")+'</datalist></div>'+
   UI.dateRow("dyDt",g.recs[0].d)+
   '<button class="tsBtn" onclick="tsDySaleSave(\''+enc(key)+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" onclick="tsDySale(\''+enc(key)+'\')">← '+E(T("പിന്നോട്ട്","Back"))+'</button>');
 };
 window.tsDySaleSave=function(k){
  var key=decodeURIComponent(k), g=saleGroup(key); if(!g) return;
  var cu=($("dyCu")&&$("dyCu").value||"").replace(/\s+/g," ").trim(), d=UI.dateVal("dyDt"), keep=[];
  for(var i=0;i<g.recs.length;i++){
   var q=num("dyQ"+i), pr=num("dyP"+i);
   if(isNaN(q)||q<0||isNaN(pr)||pr<0){ say(T("എണ്ണമോ വിലയോ ശരിയല്ല","Quantity or price is not valid")); return; }
   if(q>0){ if(!(pr>0)){ say(T("വില നൽകുക","Enter the price")); return; } keep.push({r:g.recs[i],q:q,pr:pr}); }
  }
  if(!keep.length){ say(T("എല്ലാ സാധനങ്ങളും ഒഴിവാക്കി - 'വിൽപ്പന റദ്ദാക്കുക' ഉപയോഗിക്കുക","All items removed - use 'Cancel this sale'")); return; }
  if(V.pm==="K"&&!cu){ say(T("കടം വാങ്ങുന്ന ആളുടെ പേര് നൽകുക","Enter the customer's name")); return; }
  g.recs.forEach(function(r){ SH.cancel(r.id); });
  var gid=H.uid();
  keep.forEach(function(z){ var x=Object.assign({},z.r.x,{q:z.q,pr:z.pr,pm:V.pm,g:gid}); if(V.pm==="K") x.cu=cu; else delete x.cu; SH.add("s",x,d); });
  say(T("സേവ് ചെയ്തു","Saved")); UI.closeSheet(); UI.render();
 };

 /* ---------- expense ---------- */
 var EC=[["Rent","വാടക","Rent"],["Electricity","വൈദ്യുതി","Electricity"],["Wage","കൂലി","Wage"],["Packing","പാക്കിംഗ്","Packing"],["Loan EMI","ലോൺ EMI","Loan EMI"],["Miscellaneous","മറ്റ്","Other"]];
 function ecName(k){ for(var i=0;i<EC.length;i++) if(EC[i][0]===k) return T(EC[i][1],EC[i][2]); return k||"?"; }
 function rec(id){ var a=SH.calc().live; for(var i=0;i<a.length;i++) if(a[i].id===id) return a[i]; return null; }
 window.tsDyExp=function(id){
  var r=rec(id); if(!r){ UI.closeSheet(); return; } V.ec=r.x.c||"Miscellaneous";
  var known=EC.some(function(c){ return c[0]===V.ec; });
  UI.sheet('<h3 style="margin:0">🧾 '+E(T("ചെലവ് തിരുത്തുക","Edit expense"))+'</h3><div id="dyEc" style="margin-top:6px">'+EC.concat(known?[]:[[V.ec,V.ec,V.ec]]).map(function(c,i){ return '<span class="tsChip'+(V.ec===c[0]?" on":"")+'" onclick="tsDyEc('+i+')">'+E(T(c[1],c[2]))+'</span>'; }).join("")+'</div>'+
   '<label>'+E(T("തുക","Amount"))+'</label><input id="dyA" type="number" inputmode="decimal" value="'+E(r.x.a)+'" style="font-size:24px">'+
   '<label>'+E(T("കുറിപ്പ് (വേണമെങ്കിൽ)","Note (optional)"))+'</label><input id="dyN" value="'+E(r.x.t||"")+'">'+UI.dateRow("dyDt",r.d)+
   '<button class="tsBtn" onclick="tsDyExpSave(\''+id+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" style="color:#a12d2d" onclick="tsDyDel(\''+id+'\')">🗑 '+E(T("ഒഴിവാക്കുക","Delete"))+'</button><button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
  window.__dyEcList=EC.concat(known?[]:[[V.ec,V.ec,V.ec]]);
 };
 window.tsDyEc=function(i){ var c=(window.__dyEcList||EC)[i]; if(!c) return; V.ec=c[0]; var ch=document.querySelectorAll("#dyEc .tsChip"); for(var k=0;k<ch.length;k++) ch[k].classList.toggle("on",k===i); };
 window.tsDyExpSave=function(id){
  var r=rec(id); if(!r) return; var a=num("dyA"); if(!(a>0)){ say(T("തുക നൽകുക","Enter the amount")); return; }
  SH.replace(id,Object.assign({},r.x,{c:V.ec,a:a,t:($("dyN").value||"").trim()}),UI.dateVal("dyDt")); say(T("സേവ് ചെയ്തു","Saved")); UI.closeSheet(); UI.render();
 };
 window.tsDyDel=function(id){
  if(!confirm(T("ഈ എൻട്രി ഒഴിവാക്കട്ടേ?","Delete this entry?"))) return;
  SH.cancel(id); say(T("ഒഴിവാക്കി","Deleted")); UI.closeSheet(); UI.render();
 };

 /* ---------- loss ---------- */
 var REASONS=[["ചത്തു","Died"],["തീയതി കഴിഞ്ഞു","Expired"],["കേടായി","Damaged"],["പ്രവർത്തിക്കുന്നില്ല","Not working"],["നഷ്ടപ്പെട്ടു","Lost"],["മറ്റ്","Other"]];
 function reasons(){ return SH.kind()==="aquarium"?REASONS:REASONS.slice(1); }
 window.tsDyLoss=function(id){
  var r=rec(id); if(!r){ UI.closeSheet(); return; } var p=SH.calc().P[r.x.p], R=reasons(); V.lr=0;
  for(var i=0;i<R.length;i++) if(R[i][1]===r.x.r) V.lr=i;
  UI.sheet('<h3 style="margin:0">💀 '+E(p?p.n:"?")+'</h3>'+
   '<label>'+E(T("എത്ര എണ്ണം?","How many?"))+'</label><input id="dyQ" type="number" inputmode="decimal" value="'+E(r.x.q)+'" style="font-size:24px">'+
   '<div id="dyLr" style="margin-top:8px">'+R.map(function(x,i){ return '<span class="tsChip'+(i===V.lr?" on":"")+'" onclick="tsDyLr('+i+')">'+E(T(x[0],x[1]))+'</span>'; }).join("")+'</div>'+UI.dateRow("dyDt",r.d)+
   '<button class="tsBtn" onclick="tsDyLossSave(\''+id+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" style="color:#a12d2d" onclick="tsDyDel(\''+id+'\')">🗑 '+E(T("ഒഴിവാക്കുക","Delete"))+'</button><button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 };
 window.tsDyLr=function(i){ V.lr=i; var ch=document.querySelectorAll("#dyLr .tsChip"); for(var k=0;k<ch.length;k++) ch[k].classList.toggle("on",k===i); };
 window.tsDyLossSave=function(id){
  var r=rec(id); if(!r) return; var q=num("dyQ"); if(!(q>0)){ say(T("എണ്ണം നൽകുക","Enter the count")); return; }
  SH.replace(id,Object.assign({},r.x,{q:q,r:reasons()[V.lr][1]}),UI.dateVal("dyDt")); say(T("സേവ് ചെയ്തു","Saved")); UI.closeSheet(); UI.render();
 };

 /* ---------- money received from a customer / paid to a supplier ---------- */
 window.tsDyMoney=function(id){
  var r=rec(id); if(!r){ UI.closeSheet(); return; } var rc=r.x.t==="rc"; V.pm=r.x.pm==="U"?"U":"C";
  UI.sheet('<h3 style="margin:0">'+(rc?'💰 '+E(T("പണം കിട്ടി","Money received")):'💸 '+E(T("പണം കൊടുത്തു","Money paid")))+'</h3><div class="tsM">'+E((rc?r.x.cu:r.x.su)||"")+'</div>'+
   '<label>'+E(T("തുക","Amount"))+'</label><input id="dyA" type="number" inputmode="decimal" value="'+E(r.x.a)+'" style="font-size:24px">'+pmChips(V.pm,"tsDyPm2")+UI.dateRow("dyDt",r.d)+
   '<button class="tsBtn" onclick="tsDyMoneySave(\''+id+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" style="color:#a12d2d" onclick="tsDyDel(\''+id+'\')">🗑 '+E(T("ഒഴിവാക്കുക","Delete"))+'</button><button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 };
 window.tsDyPm2=function(m){ V.pm=m; var c=document.querySelectorAll("#dyPm .tsChip"), ks=["C","U"]; for(var i=0;i<c.length;i++) c[i].classList.toggle("on",ks[i]===m); };
 window.tsDyMoneySave=function(id){
  var r=rec(id); if(!r) return; var a=num("dyA"); if(!(a>0)){ say(T("തുക നൽകുക","Enter the amount")); return; }
  SH.replace(id,Object.assign({},r.x,{a:a,pm:V.pm}),UI.dateVal("dyDt")); say(T("സേവ് ചെയ്തു","Saved")); UI.closeSheet(); UI.render();
 };

 /* ---------- banner on the entry screens + the Home button ---------- */
 function ensure(){
  var bd=UI.body(); if(!bd||!UI.isOpen()) return;
  var sc=UI.screenName();
  if(sc==="home"){
   if($("tsDayBtn")) return;
   var g=bd.querySelector(".tsG"); if(!g) return;
   var b=document.createElement("button"); b.id="tsDayBtn"; b.className="tsBtn"; b.style.cssText="background:#2c5aa0;margin:0 0 12px";
   b.setAttribute("onclick","tsDyHome()"); b.textContent="📅 "+T("ഏത് ദിവസത്തെയും കണക്ക് കാണുക / ചേർക്കുക","See / add any day's accounts"); g.parentNode.insertBefore(b,g);
  }else if(window.__tcDayFrom&&(sc==="sale"||sc==="purchase"||sc==="expense"||sc==="dead")){
   if($("tsDayBn")) return;
   var d=window.__tcDayFrom;
   bd.insertAdjacentHTML("afterbegin",'<div class="tsC" id="tsDayBn" style="background:#fff6df;border:2px solid #c9740c"><b>📅 '+E(dmy(d))+'</b> <span class="tsM">'+E(T("ഈ തീയതിയിലേക്ക് ചേർക്കുന്നു","adding for this date"))+'</span>'+
    '<button class="tsBtn g s" style="margin:6px 0 0" onclick="tsDyBack()">← '+E(T("ദിവസത്തെ കണക്ക്","Day book"))+'</button></div>');
  }
 }
 var tm=null;
 function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ ensure(); }catch(e){ if(window.console) console.error("tc-shopday",e); } },40); }
 function boot(){ var b=document.body; if(b&&window.MutationObserver) new MutationObserver(later).observe(b,{childList:true,subtree:true}); }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
 window.__tcShopDayApi={state:function(){ return V; }};
})();
