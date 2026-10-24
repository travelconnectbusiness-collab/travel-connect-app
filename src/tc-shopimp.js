/* Shop book - import of the old Google Sheet (tc-shopimp.js, loaded by tc-regdocs.js after tc-shoprep.js).
   Home > "Import from Excel": choose the .xlsx saved from the sheet "Mrithasanjeevani Aquarium Management" (Google Sheets: File > Download >
   Microsoft Excel). It reads the sheets Purchase Register, Sales Register, Expense Register, Fish Mortality, Fish Stock, Product Stock
   (the numbers the sheet had worked out are only read, never trusted) and adds:  products (opening stock, low-stock mark, selling price),
   purchases (the transport of a bill is shared over its lines by value - the sheet's own rule), sales, expenses, dead fish.
   NAMES: the sheet only counts a sale if the name is spelled exactly as in the stock list, so many names do not match. Names that are not
   in the stock lists are shown in a list with the best guess already chosen (the closest stock-list name when it is clearly the same thing,
   otherwise "new item"); each can be changed or skipped. Items that were only ever sold get an opening stock equal to what was sold, so
   they do not show a minus stock.
   Safe to repeat: every record gets an id made from its row, so the same file twice adds nothing twice. "Undo this import" cancels all of
   the records it added. Reads the file with window.__tcImportApi.readXlsx (tc-import.js). */
(function(){
 if(window.__tcShopImp) return;
 var SH=window.__tcShop, UI=window.__tcShopUi; if(!SH||!UI) return;
 window.__tcShopImp=1;
 var H=SH.H, nm0=H.nm, money=H.money, qty=H.qty, T=UI.T, E=UI.E, say=UI.say, $=function(id){ return document.getElementById(id); };
 var IM=null;      /* {plan, map} while the screen is open */
 var LSK="tc_shop_imp_last";

 /* ---------- names ---------- */
 function norm(s){
  s=String(s==null?"":s).toLowerCase().replace(/ /g," ");
  s=s.replace(/(\d)\.\s*mm/g,"$1mm").replace(/(^|[\s(])\.(\d)/g,"$10.$2").replace(/(\d)\s+mm/g,"$1mm");
  return s.replace(/\s+/g," ").trim();
 }
 function key(s){ return norm(s).replace(/[^a-z0-9ഀ-ൿ ]+/g,"").replace(/\s+/g," ").trim(); }
 function toks(s){ var o={}; key(s).split(" ").forEach(function(t){ if(t) o[t]=1; }); return o; }
 function dice(a,b){
  var A=toks(a), B=toks(b), na=Object.keys(A).length, nb=Object.keys(B).length, c=0;
  Object.keys(A).forEach(function(t){ if(B[t]) c++; });
  return na+nb?2*c/(na+nb):0;
 }
 function clean(s){ return String(s==null?"":s).replace(/\s+/g," ").trim(); }
 function hash(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*16777619)>>>0; } return h.toString(36); }
 function numv(v){ var n=parseFloat(String(v==null?"":v).replace(/[^\d.\-]/g,"")); return isNaN(n)?0:n; }
 function dateOf(v){ var a=window.__tcImportApi; return a?a.parseDate(v):""; }

 /* ---------- read the sheets ---------- */
 function findSheet(sheets,re){ for(var i=0;i<sheets.length;i++) if(re.test(sheets[i].name.toLowerCase().replace(/\s+/g,""))) return sheets[i]; return null; }
 function table(sh,firstRe){
  if(!sh) return null;
  for(var i=0;i<Math.min(12,sh.rows.length);i++){
   if(firstRe.test(String(sh.rows[i][0]||"").toLowerCase().replace(/\s+/g," ").trim())) return {h:sh.rows[i].map(function(x){ return String(x||"").toLowerCase().replace(/\s+/g," ").trim(); }),rows:sh.rows.slice(i+1)};
  }
  return null;
 }
 function col(t,re){ for(var i=0;i<t.h.length;i++) if(re.test(t.h[i])) return i; return -1; }
 function cell(r,i){ return i>=0&&i<r.length?r[i]:""; }

 function parseBook(sheets){
  var P={prods:{},official:{},purchases:[],sales:[],expenses:[],deads:[],skipped:{p:0,s:0,e:0,m:0},names:{},sheetStock:{},from:"",to:""};
  function seen(d){ if(!d) return; if(!P.from||d<P.from) P.from=d; if(!P.to||d>P.to) P.to=d; }
  function prod(name,t,c){
   var k=key(name); if(!k) return null;
   var p=P.prods[k]||(P.prods[k]={k:k,n:clean(name),t:t||"i",c:c||"",pr:0,lo:"",oq:0,ov:0,priceAt:""});
   if(t==="f") p.t="f"; if(c&&!p.c) p.c=c;
   return p;
  }
  /* stock lists = the official names */
  var ft=table(findSheet(sheets,/^fishstock/),/^fish name/), pt=table(findSheet(sheets,/^productstock/),/^item name/);
  if(ft){
   var fn=col(ft,/^fish name/), fo=col(ft,/^opening/), fl=col(ft,/low stock/), fp=col(ft,/current selling price - manual/), fc=col(ft,/^current stock/);
   ft.rows.forEach(function(r){
    var n=clean(cell(r,fn)); if(!n) return;
    var p=prod(n,"f","Fish"); P.official[p.k]=1;
    p.n=n; p.oq=numv(cell(r,fo)); if(cell(r,fl)!=="") p.lo=numv(cell(r,fl)); if(numv(cell(r,fp))>0) p.pr=numv(cell(r,fp)); p.listed=1;
    if(cell(r,fc)!=="") P.sheetStock[p.k]=numv(cell(r,fc));
   });
  }
  if(pt){
   var pn=col(pt,/^item name/), pc=col(pt,/^category/), po=col(pt,/^opening stock$/), pl=col(pt,/low stock/), pv=col(pt,/opening stock value/), pp=col(pt,/current selling price - manual/), pcs=col(pt,/^current stock/);
   pt.rows.forEach(function(r){
    var n=clean(cell(r,pn)); if(!n) return;
    var p=prod(n,"i",clean(cell(r,pc))); P.official[p.k]=1;
    p.n=n; p.oq=numv(cell(r,po)); p.ov=numv(cell(r,pv)); if(cell(r,pl)!=="") p.lo=numv(cell(r,pl)); if(numv(cell(r,pp))>0) p.pr=numv(cell(r,pp)); p.listed=1;
    if(cell(r,pcs)!=="") P.sheetStock[p.k]=numv(cell(r,pcs));
   });
  }
  /* purchases */
  var bt=table(findSheet(sheets,/^purchaseregister/),/^date/);
  if(bt){
   var cD=col(bt,/^date/), cS=col(bt,/^supplier/), cB=col(bt,/^bill number/), cC=col(bt,/^category/), cI=col(bt,/^item name/), cQ=col(bt,/^quantity/), cR=col(bt,/^purchase rate/), cT=col(bt,/^transport charge/), cP=col(bt,/^current selling price/);
   var billVal={}, billTr={};
   bt.rows.forEach(function(r,ri){
    var d=dateOf(cell(r,cD)), name=clean(cell(r,cI)), q=numv(cell(r,cQ)), rt=numv(cell(r,cR));
    if(!d||!name||!(q>0)||!(rt>0)){ if(clean(cell(r,cI))||d) P.skipped.p++; return; }
    var bn=clean(cell(r,cB)); seen(d);
    var o={i:ri,d:d,sup:clean(cell(r,cS)),bn:bn,cat:clean(cell(r,cC)),name:name,k:key(name),q:q,rt:rt,tr:numv(cell(r,cT)),sell:numv(cell(r,cP))};
    P.purchases.push(o);
    var bk=bn?key(bn):"~"+ri; billVal[bk]=(billVal[bk]||0)+q*rt; billTr[bk]=(billTr[bk]||0)+o.tr; o.bk=bk;
   });
   P.purchases.forEach(function(o){ o.share=billVal[o.bk]>0?billTr[o.bk]*(o.q*o.rt)/billVal[o.bk]:0; });
  }
  /* sales */
  var st=table(findSheet(sheets,/^salesregister/),/^date/);
  if(st){
   var sD=col(st,/^date/), sI=col(st,/^item/), sQ=col(st,/^quantity/), sP=col(st,/selling price/), sM=col(st,/payment/);
   st.rows.forEach(function(r,ri){
    var d=dateOf(cell(r,sD)), name=clean(cell(r,sI)), q=numv(cell(r,sQ)), pr=numv(cell(r,sP));
    if(!d||!name||!(q>0)||!(pr>0)){ if(name||d) P.skipped.s++; return; }
    seen(d); P.sales.push({i:ri,d:d,name:name,k:key(name),q:q,pr:pr,pm:/upi|gpay|phonepe|paytm|card/i.test(String(cell(r,sM)))?"U":"C"});
   });
  }
  /* expenses */
  var et=table(findSheet(sheets,/^expenseregister/),/^date/);
  if(et){
   var eD=col(et,/^date/), eC=col(et,/^category/), eN=col(et,/^description/), eA=col(et,/^amount/);
   et.rows.forEach(function(r,ri){
    var d=dateOf(cell(r,eD)), a=numv(cell(r,eA));
    if(!d||!(a>0)){ if(d||clean(cell(r,eC))) P.skipped.e++; return; }
    var c0=clean(cell(r,eC)).toLowerCase(), c=/wage|salary|labour|കൂലി/.test(c0)?"Wage":/rent|വാടക/.test(c0)?"Rent":/electric|eb|current|വൈദ്യുതി/.test(c0)?"Electricity":/pack/.test(c0)?"Packing":/loan|emi/.test(c0)?"Loan EMI":"Miscellaneous";
    seen(d); P.expenses.push({i:ri,d:d,c:c,t:clean(cell(r,eN)),a:a});
   });
  }
  /* dead fish */
  var mt=table(findSheet(sheets,/^fishmortality/),/^date/);
  if(mt){
   var mD=col(mt,/^date/), mI=col(mt,/^fish name/), mQ=col(mt,/^quantity/), mR=col(mt,/^reason/);
   mt.rows.forEach(function(r,ri){
    var d=dateOf(cell(r,mD)), name=clean(cell(r,mI)), q=numv(cell(r,mQ));
    if(!d||!name||!(q>0)){ if(name||d) P.skipped.m++; return; }
    seen(d); P.deads.push({i:ri,d:d,name:name,k:key(name),q:q,r:clean(cell(r,mR))});
   });
  }
  /* names that are not in the stock lists */
  function note(o,kind,amt){
   if(P.official[o.k]) return;
   var u=P.names[o.k]||(P.names[o.k]={k:o.k,n:o.name,b:0,s:0,m:0,qty:0,amt:0,cat:"",fish:false});
   u[kind]++; u.qty+=o.q||0; u.amt+=amt||0; if(o.cat&&!u.cat) u.cat=o.cat; if(kind==="m"||/^fish$/i.test(o.cat||"")) u.fish=true;
   if(kind==="b"&&amt){ /* names bought are real products */ }
  }
  P.purchases.forEach(function(o){ note(o,"b",o.q*o.rt); });
  P.sales.forEach(function(o){ note(o,"s",o.q*o.pr); });
  P.deads.forEach(function(o){ note(o,"m",0); });
  var offKeys=Object.keys(P.official);
  Object.keys(P.names).forEach(function(k){
   var u=P.names[k], best="", bs=0, second=0;
   offKeys.forEach(function(ok){ var s=dice(u.n,P.prods[ok].n); if(s>bs){ second=bs; bs=s; best=ok; } else if(s>second) second=s; });
   u.guess=(bs>=0.7&&bs-second>=0.12)?best:""; u.score=bs;
  });
  return P;
 }

 /* ---------- build the records ---------- */
 function build(P,map){
  var out=[], appByKey={}, TS0="2000-01-01T00:00:00.";
  SH.products({all:true}).forEach(function(p){ appByKey[key(p.n)]=p.id; });
  var target={};   /* name key -> product key (or "" = skip) */
  Object.keys(P.official).forEach(function(k){ target[k]=k; });
  Object.keys(P.names).forEach(function(k){
   var c=map[k]; if(c==null) c=P.names[k].guess||"@new";
   target[k]=c==="@new"?k:(c==="@skip"?"":c);
  });
  /* which product keys are needed */
  var need={};
  Object.keys(P.official).forEach(function(k){ need[k]=1; });
  Object.keys(P.names).forEach(function(k){ if(target[k]===k) need[k]=1; });
  /* products */
  var pid={}, firstSell={};
  var priceMap={};   /* newest selling price typed in the Purchase Register (the sheet's "Auto" price) */
  P.purchases.forEach(function(o){ var t=target[o.k]; if(t&&o.sell>0){ var q=priceMap[t]; if(!q||o.d>=q.d) priceMap[t]={d:o.d,pr:o.sell}; } });
  var soldOnly={};   /* new items never bought: opening stock = what was sold, so the stock is 0 */
  P.sales.forEach(function(o){ var t=target[o.k]; if(t) soldOnly[t]=(soldOnly[t]||0)+o.q; });
  P.deads.forEach(function(o){ var t=target[o.k]; if(t) soldOnly[t]=(soldOnly[t]||0)+o.q; });
  P.purchases.forEach(function(o){ var t=target[o.k]; if(t) soldOnly[t]=(soldOnly[t]||0); });
  var bought={}; P.purchases.forEach(function(o){ var t=target[o.k]; if(t) bought[t]=1; });
  Object.keys(need).forEach(function(k){
   var u=P.names[k], src=P.prods[k];
   var name=src?src.n:(u?u.n:k);
   var ex=appByKey[key(name)];
   if(ex){ pid[k]=ex; return; }
   var id="ip-"+hash(k); pid[k]=id;
   var isFish=src?src.t==="f":(u?u.fish:false), cat=src&&src.c?src.c:(u&&u.cat?u.cat:(isFish?"Fish":"Other"));
   if(isFish&&!cat) cat="Fish";
   var x={i:id,n:name,t:isFish?"f":"i",c:cat||"Other",pk:1,pr:priceMap[k]?priceMap[k].pr:(src?src.pr:0),lo:src&&src.lo!==""?src.lo:"",oq:src?src.oq:0,ov:src?src.ov:0,imp:1};
   if(!src&&!bought[k]&&soldOnly[k]>0) x.oq=Math.round(soldOnly[k]*1000)/1000;
   if(!(x.pr>0)) x.pr=0;
   out.push({id:id,k:"p",d:P.from||H.today(),ts:TS0+"000Z",x:x});
  });
  function P2(k){ var t=target[k]; return t?pid[t]:null; }
  function ts(d,i){ return d+"T06:00:00."+String(i%1000).padStart(3,"0")+"Z"; }
  P.purchases.forEach(function(o){
   var p=P2(o.k); if(!p) return;
   out.push({id:"ib"+hash("b|"+o.i+"|"+o.d+"|"+o.name+"|"+o.q+"|"+o.rt)+"-"+o.i,k:"b",d:o.d,ts:ts(o.d,o.i),x:{p:p,q:o.q,rt:o.rt,tr:Math.round(o.share*1e6)/1e6,su:o.sup,bn:o.bn,g:"imp",imp:1}});
  });
  P.sales.forEach(function(o){
   var p=P2(o.k); if(!p) return;
   out.push({id:"is"+hash("s|"+o.i+"|"+o.d+"|"+o.name+"|"+o.q+"|"+o.pr)+"-"+o.i,k:"s",d:o.d,ts:ts(o.d,o.i),x:{p:p,q:o.q,pr:o.pr,pm:o.pm,g:"imp",imp:1}});
  });
  P.expenses.forEach(function(o){
   out.push({id:"ie"+hash("e|"+o.i+"|"+o.d+"|"+o.c+"|"+o.a)+"-"+o.i,k:"e",d:o.d,ts:ts(o.d,o.i),x:{c:o.c,a:o.a,t:o.t,imp:1}});
  });
  P.deads.forEach(function(o){
   var p=P2(o.k); if(!p) return;
   out.push({id:"im"+hash("m|"+o.i+"|"+o.d+"|"+o.name+"|"+o.q)+"-"+o.i,k:"m",d:o.d,ts:ts(o.d,o.i),x:{p:p,q:o.q,r:o.r||"Died",imp:1}});
  });
  return out;
 }

 /* ---------- screen ---------- */
 UI.screen("import",function(){
  UI.body().innerHTML=
   '<div class="tsC"><b>'+E(T("പഴയ Google Sheet ആപ്പിലേക്ക് ചേർക്കാം","Bring the old Google Sheet into the app"))+'</b>'+
   '<div class="tsM" style="margin-top:6px;line-height:1.5">'+E(T("Google Sheet-ൽ File → Download → Microsoft Excel (.xlsx) അമർത്തുക. ആ ഫയൽ ഇവിടെ തിരഞ്ഞെടുക്കുക. വിൽപ്പന, വാങ്ങൽ, ചെലവ്, ചത്ത മീൻ, സ്റ്റോക്ക് എല്ലാം ചേർക്കും. ഒരേ ഫയൽ രണ്ടുതവണ ചേർത്താലും ഇരട്ടിക്കില്ല.","In Google Sheets: File → Download → Microsoft Excel (.xlsx). Choose that file here. Sales, purchases, expenses, dead fish and stock are added. The same file twice adds nothing twice."))+'</div>'+
   '<input id="imF" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none" onchange="tsImFile(this)">'+
   '<button class="tsBtn" onclick="document.getElementById(\'imF\').click()">📂 '+E(T("ഫയൽ തിരഞ്ഞെടുക്കുക","Choose the file"))+'</button></div>'+
   '<div id="imOut"></div>'+lastBlock();
 },function(){ return "📥 "+T("Excel-ൽ നിന്ന് ചേർക്കുക","Import from Excel"); });
 function lastBlock(){
  var ids=null; try{ ids=JSON.parse(localStorage.getItem(LSK)||"null"); }catch(e){}
  if(!ids||!ids.length) return "";
  return '<div class="tsC"><div class="tsM">'+E(T("അവസാനം ചേർത്തത്: ","Last import: "))+ids.length+' '+E(T("എൻട്രികൾ","records"))+'</div><button class="tsBtn r" onclick="tsImUndo()">↩ '+E(T("ഈ ഇറക്കുമതി റദ്ദാക്കുക","Undo this import"))+'</button></div>';
 }
 window.tsImFile=function(inp){
  var f=inp.files&&inp.files[0]; if(!f) return;
  var out=$("imOut"); out.innerHTML='<div class="tsC">'+E(T("വായിക്കുന്നു...","Reading..."))+'</div>';
  var api=window.__tcImportApi; if(!api||!api.readXlsx){ out.innerHTML='<div class="tsC">'+E(T("ഇറക്കുമതി തയ്യാറായിട്ടില്ല","Import is not ready"))+'</div>'; return; }
  f.arrayBuffer().then(function(buf){ return api.readXlsx(buf); }).then(function(sheets){
   var P=parseBook(sheets);
   if(!P.sales.length&&!P.purchases.length&&!P.expenses.length&&!Object.keys(P.official).length){ out.innerHTML='<div class="tsC">'+E(T("ഈ ഫയലിൽ ഷോപ്പ് ഷീറ്റ് കണ്ടില്ല (Purchase Register, Sales Register ...)","This file has no shop sheets (Purchase Register, Sales Register ...)"))+'</div>'; return; }
   IM={plan:P,map:{}}; draw();
  }).catch(function(e){ if(window.console) console.error(e); out.innerHTML='<div class="tsC">'+E(T("ഫയൽ വായിക്കാൻ കഴിഞ്ഞില്ല","Could not read the file"))+'</div>'; });
 };
 function draw(){
  var P=IM.plan, out=$("imOut"); if(!out) return;
  var sumS=P.sales.reduce(function(a,o){ return a+o.q*o.pr; },0), sumE=P.expenses.reduce(function(a,o){ return a+o.a; },0), sumB=P.purchases.reduce(function(a,o){ return a+o.q*o.rt+o.share; },0);
  var names=Object.keys(P.names).map(function(k){ return P.names[k]; }).sort(function(a,b){ return b.amt-a.amt||b.qty-a.qty; });
  var known=Object.keys(P.official).map(function(k){ return P.prods[k]; }).sort(function(a,b){ return a.n.toLowerCase()<b.n.toLowerCase()?-1:1; });
  var h='<div class="tsC"><b>'+E(T("ഫയലിൽ ഉള്ളത്","In the file"))+'</b>'+
   row(T("ഇനങ്ങൾ (സ്റ്റോക്ക് ലിസ്റ്റ്)","Items (stock lists)"),Object.keys(P.official).length)+
   row(T("വിൽപ്പന","Sales"),P.sales.length+" · "+money(sumS))+row(T("വാങ്ങൽ","Purchases"),P.purchases.length+" · "+money(sumB))+
   row(T("ചെലവ്","Expenses"),P.expenses.length+" · "+money(sumE))+row(T("ചത്തത്","Dead / loss"),P.deads.length)+
   (P.from?row(T("തീയതി","Dates"),UI.dmy(P.from)+" → "+UI.dmy(P.to)):"")+
   ((P.skipped.s+P.skipped.p+P.skipped.e+P.skipped.m)?'<div class="tsM" style="margin-top:6px">'+E(T("ഒഴിവാക്കിയ ശൂന്യ വരികൾ: ","Empty rows left out: "))+(P.skipped.s+P.skipped.p+P.skipped.e+P.skipped.m)+'</div>':'')+'</div>';
  if(names.length){
   h+='<div class="tsC"><b>'+E(T("ഈ പേരുകൾ സ്റ്റോക്ക് ലിസ്റ്റിൽ ഇല്ല","These names are not in the stock lists"))+' ('+names.length+')</b><div class="tsM" style="margin:4px 0 8px">'+
    E(T("ഏത് ഇനത്തിന്റെ പേരാണെന്ന് തിരഞ്ഞെടുക്കുക. മിക്കതും ആപ്പ് ഊഹിച്ചിട്ടുണ്ട്; തെറ്റിയാൽ മാത്രം മാറ്റുക.","Pick which item each name is. The app has guessed most; change only the wrong ones."))+'</div>'+
    names.map(function(u,i){
     var cur=IM.map[u.k]!=null?IM.map[u.k]:(u.guess||"@new");
     var use=[]; if(u.s) use.push(T("വിൽപ്പന ","sold ")+u.s); if(u.b) use.push(T("വാങ്ങൽ ","bought ")+u.b); if(u.m) use.push(T("ചത്തത് ","dead ")+u.m);
     return '<div style="padding:8px 0;border-top:1px solid #e3eef3"><b>'+E(u.n)+'</b> <span class="tsM">'+E(use.join(" · "))+(u.amt?" · "+money(u.amt):"")+'</span>'+
      '<select onchange="tsImMap(\''+E(u.k)+'\',this.value)" style="margin-top:4px"><option value="@new"'+(cur==="@new"?" selected":"")+'>➕ '+E(T("പുതിയ ഇനമായി","As a new item"))+'</option>'+
      (u.s||u.m?'<option value="@skip"'+(cur==="@skip"?" selected":"")+'>🚫 '+E(T("ഒഴിവാക്കുക","Leave out"))+'</option>':'')+
      known.map(function(p){ return '<option value="'+E(p.k)+'"'+(cur===p.k?" selected":"")+'>'+E(p.n)+'</option>'; }).join("")+'</select></div>';
    }).join("")+'</div>';
  }
  h+='<button class="tsBtn" onclick="tsImGo()">✔ '+E(T("ആപ്പിലേക്ക് ചേർക്കുക","Add to the app"))+'</button>';
  out.innerHTML=h;
 }
 function row(a,b){ return '<div class="tsRow"><span>'+E(a)+'</span><b>'+E(b)+'</b></div>'; }
 window.tsImMap=function(k,v){ IM.map[k]=v; };
 window.tsImGo=function(){
  if(!IM) return;
  var recs=build(IM.plan,IM.map), n=SH.addMany(recs);
  var ids=recs.map(function(r){ return r.id; });
  try{ var old=JSON.parse(localStorage.getItem(LSK)||"[]"); localStorage.setItem(LSK,JSON.stringify(old.concat(ids.filter(function(i){ return true; })).filter(function(v,i,a){ return a.indexOf(v)===i; }))); }catch(e){}
  var P=IM.plan; IM=null;
  var out=$("imOut");
  if(out) out.innerHTML='<div class="tsC" style="background:#e6f7e9"><b>✔ '+E(T("ചേർത്തു","Added"))+': '+n+' '+E(T("പുതിയ എൻട്രികൾ","new records"))+'</b>'+(n<recs.length?'<div class="tsM">'+E(T("ബാക്കി ഇതിനു മുമ്പേ ചേർത്തിരുന്നു.","The rest were added before."))+'</div>':'')+
   '<button class="tsBtn" onclick="tsOpen(\'stock\')">📦 '+E(T("സ്റ്റോക്ക് നോക്കാം","See the stock"))+'</button><button class="tsBtn g" onclick="tsOpen(\'report\')">📊 '+E(T("കണക്ക് നോക്കാം","See the account"))+'</button></div>';
  SH.later(300);
 };
 window.tsImUndo=function(){
  var ids=[]; try{ ids=JSON.parse(localStorage.getItem(LSK)||"[]"); }catch(e){}
  if(!ids.length) return;
  if(!confirm(T("ഇറക്കുമതി ചെയ്ത "+ids.length+" എൻട്രികളും റദ്ദാക്കട്ടേ? (പിന്നീട് കൈ കൊണ്ട് ചേർത്തവ മാറില്ല)","Cancel all "+ids.length+" imported records? (Entries you made by hand stay)"))) return;
  var M=SH.calc(), list=[], by={};
  M.recs.forEach(function(x){ by[x.id]=x; });
  ids.forEach(function(id){ var r=by[id]; if(r&&!M.voided[id]) list.push({id:"x"+id,k:"v",d:r.d,x:{r:id}}); });
  SH.addMany(list);
  try{ localStorage.removeItem(LSK); }catch(e){}
  say(T("റദ്ദാക്കി","Cancelled")); UI.render();
 };
 window.__tcShopImpApi={parseBook:parseBook,build:build,key:key,dice:dice,norm:norm};
})();
