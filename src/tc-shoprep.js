/* Shop book - screens, part 2 (tc-shoprep.js, loaded by tc-regdocs.js after tc-shopui.js).
   Stock (fish / items / running low, tap an item for price, cost, history, "correct the count"), Expenses, and "Today's account"
   (day and month: sales, cash / UPI, profit, expenses, dead-fish cost, net, the mother's wage = Rs.10 for every full Rs.100 sold,
   Excel of the whole book). Data and sums from window.__tcShop; screens are added to window.__tcShopUi.
   "Hide profit" (home screen) hides cost, profit and stock value on this phone - for the shop's phone. */
(function(){
 if(window.__tcShopRep) return;
 var SH=window.__tcShop, UI=window.__tcShopUi; if(!SH||!UI) return;
 window.__tcShopRep=1;
 var H=SH.H, money=H.money, qty=H.qty, T=UI.T, E=UI.E, say=UI.say, num=UI.num, $=function(id){ return document.getElementById(id); };
 var ML=function(){ return UI.lang()==="ml"; };
 var V={tab:"f",q:"",rep:null};

 /* ================= STOCK ================= */
 UI.screen("stock",function(){
  UI.body().innerHTML=
   '<div class="tsC"><div>'+tabs()+'</div><input id="stQ" placeholder="'+E(T("തിരയുക...","Search..."))+'" oninput="tsStQ(this.value)" value="'+E(V.q)+'" style="margin-top:8px">'+
   '<button class="tsBtn g s" onclick="tsStNew()">➕ '+E(T("പുതിയ ഇനം","New item"))+'</button></div><div class="tsC" id="stList"></div>';
  stList();
 },function(){ return "📦 "+T("സ്റ്റോക്ക്","Stock"); });
 function tabs(){
  var L=[["f",T("🐟 മീൻ","🐟 Fish")],["i",T("📦 സാധനങ്ങൾ","📦 Items")],["l",T("⚠ തീരാറായവ","⚠ Low")],["h",T("🙈 മറച്ചവ","🙈 Hidden")]];
  return L.map(function(t){ return '<span class="tsChip'+(V.tab===t[0]?" on":"")+'" onclick="tsStTab(\''+t[0]+'\')">'+E(t[1])+'</span>'; }).join("");
 }
 window.tsStTab=function(t){ V.tab=t; UI.render(); };
 window.tsStQ=function(v){ V.q=v; stList(); };
 window.tsStNew=function(){ UI.prodSheet(null,{t:V.tab==="f"?"f":"i"},function(){ UI.render(); }); };
 function stList(){
  var simple=UI.simple(), L=SH.search(V.q,{t:V.tab==="l"||V.tab==="h"?"":V.tab,all:V.tab==="h"});
  if(V.tab==="l") L=L.filter(function(p){ return p.low; });
  if(V.tab==="h") L=L.filter(function(p){ return p.off; });
  var tot=0; L.forEach(function(p){ tot+=p.value; });
  $("stList").innerHTML=!L.length?'<div class="tsM" style="text-align:center">'+E(T("ഒന്നുമില്ല","Nothing here"))+'</div>':
   L.map(function(p){
    return '<div class="tsRow" onclick="tsStOpen(\''+p.id+'\')"><div><b>'+E(p.n)+'</b>'+(p.low?' <span class="tsLow">LOW</span>':'')+'<div class="tsM">'+E(SH.catName(p.c,ML()))+(p.pr>0?' · '+money(p.pr):'')+'</div></div>'+
     '<div style="text-align:right;font-size:20px;font-weight:800">'+(p.comp?(p.can==null?"—":qty(p.can))+'<div class="tsM" style="font-weight:600">'+E(T("ഉണ്ടാക്കാം","can make"))+'</div>':(p.stock==null?"—":qty(p.stock))+(simple||p.stock==null?'':'<div class="tsM" style="font-weight:600">'+money(p.value)+'</div>'))+'</div></div>';
   }).join("")+(simple?'':'<div class="tsRow"><b>'+E(T("സ്റ്റോക്ക് വില","Stock value"))+'</b><b>'+money(tot)+'</b></div>');
 }
 window.tsStOpen=function(id){
  var p=SH.prod(id); if(!p) return;
  var simple=UI.simple(), M=SH.calc();
  var last=""; if(p.last) last=UI.dmy(p.last);
  UI.sheet('<h3 style="margin:0">'+E(p.n)+'</h3><div class="tsM">'+E(SH.catName(p.c,ML()))+'</div>'+
   (p.comp?'<div class="tsRow"><span>'+E(T("ഉണ്ടാക്കാൻ പറ്റുന്നത്","Can make"))+'</span><b style="font-size:24px">'+(p.can==null?"—":qty(p.can))+'</b></div><div class="tsM">= '+E((p.rc||[]).map(function(c){ var q=SH.prod(c.i); return qty(+c.q||0)+" "+(q?q.n:"?"); }).join(" + "))+'</div>':'<div class="tsRow"><span>'+E(T("സ്റ്റോക്ക്","In stock"))+'</span><b style="font-size:24px">'+(p.stock==null?"—":qty(p.stock))+'</b></div>')+
   '<div class="tsRow"><span>'+E(T("വിൽപ്പന വില","Selling price"))+'</span><b>'+(p.pr>0?money(p.pr):"—")+'</b></div>'+
   (simple?'':'<div class="tsRow"><span>'+E(T("വാങ്ങിയ വില (ശരാശരി)","Average cost"))+'</span><b>'+(p.avg>0?"₹"+p.avg.toFixed(2):"—")+'</b></div>'+
    '<div class="tsRow"><span>'+E(T("നിർദേശിക്കുന്ന വില","Suggested price"))+' ('+p.mg+'%)</span><b>'+(p.sugg>0?money(p.sugg):"—")+'</b></div>')+
   '<div class="tsRow"><span>'+E(T("അവസാനം വിറ്റത്","Last sold"))+'</span><b>'+E(last||"—")+'</b></div>'+
   (p.comp?'':'<button class="tsBtn" onclick="tsStAdj(\''+id+'\')">🔢 '+E(T("എണ്ണം ശരിയാക്കുക","Correct the count"))+'</button>')+
   '<button class="tsBtn g" onclick="tsCloseSheet();tsStEdit(\''+id+'\')">✏ '+E(T("വിലയും വിവരങ്ങളും മാറ്റുക","Edit price / details"))+'</button>'+
   '<button class="tsBtn g" onclick="tsStHist(\''+id+'\')">📜 '+E(T("ചരിത്രം","History"))+'</button>'+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 };
 window.tsStEdit=function(id){ UI.prodSheet(id,null,function(){ UI.render(); }); };
 window.tsStAdj=function(id){
  var p=SH.prod(id); if(!p) return;
  UI.sheet('<h3 style="margin:0">'+E(p.n)+'</h3><div class="tsM">'+E(T("ഇപ്പോൾ ആപ്പിൽ ","In the app now: "))+qty(p.stock)+'</div>'+
   '<label>'+E(T("കടയിൽ ശരിക്കും എത്ര ഉണ്ട്? (എണ്ണിനോക്കിയത്)","How many are really there? (counted)"))+'</label><input id="adQ" type="number" inputmode="decimal">'+
   '<button class="tsBtn" onclick="tsStAdjSave(\''+id+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
  var q=$("adQ"); if(q) q.focus();
 };
 window.tsStAdjSave=function(id){
  var p=SH.prod(id), e=$("adQ"); if(!p||!e||e.value==="") { say(T("എണ്ണം നൽകുക","Enter the count")); return; }
  var real=parseFloat(e.value), d=Math.round((real-p.stock)*1000)/1000;
  if(d!==0) SH.add("a",{p:id,q:d,r:"count"});
  say(T("ശരിയാക്കി","Corrected")); UI.render();
 };
 window.tsStHist=function(id){
  var M=SH.calc(), rows=M.live.filter(function(r){ return r.x&&r.x.p===id&&(r.k==="b"||r.k==="s"||r.k==="m"||r.k==="a"); }).sort(function(a,b){ return a.d<b.d?1:a.d>b.d?-1:(a.ts<b.ts?1:-1); }).slice(0,25);
  var nm={b:T("വാങ്ങി","Bought"),s:T("വിറ്റു","Sold"),m:T("നഷ്ടം","Loss"),a:T("തിരുത്തൽ","Correction")};
  UI.sheet('<h3 style="margin:0">'+E(T("ചരിത്രം","History"))+'</h3>'+(rows.length?rows.map(function(r){
   var q=r.x.q; return '<div class="tsRow"><div>'+E(nm[r.k])+' <b>'+qty(q)+'</b><div class="tsM">'+E(UI.dmy(r.d))+(r.k==="s"?' · '+money(r.x.pr):'')+(r.k==="b"?' · ₹'+(+r.x.rt).toFixed(2):'')+'</div></div><div><button class="tsX" onclick="tsCancel(\''+r.id+'\')">✕</button></div></div>';
  }).join(""):'<div class="tsM">'+E(T("ഒന്നുമില്ല","Nothing"))+'</div>')+'<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 };

 /* ================= EXPENSES ================= */
 var EC=[["Rent","വാടക","Rent"],["Electricity","വൈദ്യുതി","Electricity"],["Wage","കൂലി","Wage"],["Packing","പാക്കിംഗ്","Packing"],["Loan EMI","ലോൺ EMI","Loan EMI"],["Miscellaneous","മറ്റ്","Other"]];
 function ecName(k){ for(var i=0;i<EC.length;i++) if(EC[i][0]===k) return T(EC[i][1],EC[i][2]); return k; }
 var X={c:"Miscellaneous"};
 UI.screen("expense",function(){
  var t=H.today(), mo=t.slice(0,7), R=SH.report(mo+"-01",t);
  UI.body().innerHTML=
   '<div class="tsC"><label style="margin-top:0">'+E(T("എന്തിന്?","For what?"))+'</label><div id="exC">'+EC.map(function(c){ return '<span class="tsChip'+(X.c===c[0]?" on":"")+'" onclick="tsExC(\''+c[0]+'\')">'+E(T(c[1],c[2]))+'</span>'; }).join("")+'</div>'+
   '<label>'+E(T("തുക","Amount"))+'</label><input id="exA" type="number" inputmode="decimal">'+
   '<label>'+E(T("കുറിപ്പ് (വേണമെങ്കിൽ)","Note (optional)"))+'</label><input id="exN">'+UI.dateRow("exD",t)+
   '<button class="tsBtn" onclick="tsExSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button></div>'+
   '<div class="tsC"><b>'+E(T("ഈ മാസത്തെ ചെലവ് ","This month: "))+money(R.exp)+'</b>'+
   R.expList.slice().reverse().slice(0,15).map(function(r){ return '<div class="tsRow"><div>'+E(ecName(r.x.c))+'<div class="tsM">'+E(UI.dmy(r.d))+(r.x.t?' · '+E(r.x.t):'')+'</div></div><div><b>'+money(r.x.a)+'</b> <button class="tsX" onclick="tsCancel(\''+r.id+'\')">✕</button></div></div>'; }).join("")+'</div>';
 },function(){ return "🧾 "+T("ചെലവ്","Expenses"); });
 window.tsExC=function(c){ X.c=c; var ch=document.querySelectorAll("#exC .tsChip"); for(var i=0;i<ch.length;i++) ch[i].classList.toggle("on",EC[i][0]===c); };
 window.tsExSave=function(){
  var a=num("exA"); if(!(a>0)){ say(T("തുക നൽകുക","Enter the amount")); return; }
  SH.add("e",{c:X.c,a:a,t:($("exN").value||"").trim()},UI.dateVal("exD"));
  say(T("സേവ് ചെയ്തു","Saved")); UI.render();
 };

 /* ================= TODAY'S ACCOUNT ================= */
 function mname(m){ var N=ML()?["ജനുവരി","ഫെബ്രുവരി","മാർച്ച്","ഏപ്രിൽ","മേയ്","ജൂൺ","ജൂലൈ","ഓഗസ്റ്റ്","സെപ്റ്റംബർ","ഒക്ടോബർ","നവംബർ","ഡിസംബർ"]:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return N[+m.slice(5,7)-1]+" "+m.slice(0,4); }
 function addMonth(m,n){ var y=+m.slice(0,4), k=+m.slice(5,7)-1+n; y+=Math.floor(k/12); k=((k%12)+12)%12; return y+"-"+H.pad(k+1); }
 function monthEnd(m){ var y=+m.slice(0,4), k=+m.slice(5,7); return m+"-"+H.pad(new Date(y,k,0).getDate()); }
 UI.screen("report",function(){
  var r=V.rep=V.rep||{mode:"day",d:H.today(),m:H.today().slice(0,7)};
  var simple=UI.simple(), isDay=r.mode==="day", d1=isDay?r.d:r.m+"-01", d2=isDay?r.d:monthEnd(r.m), R=SH.report(d1,d2);
  var nav=isDay?'<span class="tsChip" onclick="tsRpD(-1)">◀</span><b style="font-size:19px"> '+E(UI.dmy(r.d))+' </b><span class="tsChip" onclick="tsRpD(1)">▶</span>'
   :'<span class="tsChip" onclick="tsRpM(-1)">◀</span><b style="font-size:19px"> '+E(mname(r.m))+' </b><span class="tsChip" onclick="tsRpM(1)">▶</span>';
  var h='<div class="tsC" style="text-align:center"><div><span class="tsChip'+(isDay?" on":"")+'" onclick="tsRpMode(\'day\')">'+E(T("ദിവസം","Day"))+'</span><span class="tsChip'+(!isDay?" on":"")+'" onclick="tsRpMode(\'month\')">'+E(T("മാസം","Month"))+'</span></div><div style="margin-top:8px">'+nav+'</div></div>';
  h+='<div class="tsC"><div class="tsRow"><span>'+E(T("വിൽപ്പന","Sales"))+'</span><span class="tsTot">'+money(R.sales)+'</span></div>'+
   '<div class="tsRow"><span>💵 '+E(T("പണം","Cash"))+'</span><b>'+money(R.cash)+'</b></div><div class="tsRow"><span>📱 UPI</span><b>'+money(R.upi)+'</b></div>';
  if(!simple){
   h+='<div class="tsRow"><span>'+E(T("ലാഭം (വിൽപ്പനയിൽ)","Gross profit"))+'</span><b>'+money(R.profit)+'</b></div>'+
    '<div class="tsRow"><span>'+E(T("ചെലവ്","Expenses"))+'</span><b>'+money(R.exp)+'</b></div>'+
    '<div class="tsRow"><span>'+E(T("ചത്ത മീൻ / നഷ്ടം","Dead fish / loss"))+(R.deadQty?' ('+qty(R.deadQty)+')':'')+'</span><b>'+money(R.dead)+'</b></div>'+
    '<div class="tsRow"><span><b>'+E(R.net>=0?T("അറ്റ ലാഭം","Net profit"):T("അറ്റ നഷ്ടം","Net loss"))+'</b></span><b style="font-size:24px;color:'+(R.net>=0?'#177044':'#a12d2d')+'">'+money(R.net)+'</b></div>';
  }
  h+='</div>';
  if(isDay){
   var left=Math.max(0,R.wage-R.wagePaid);
   h+='<div class="tsC"><b>'+E(T("അമ്മയുടെ കൂലി","Wage"))+'</b> <span class="tsM">('+E(T("100 രൂപയ്ക്ക് 10","10 per 100"))+')</span><div class="tsRow"><span>'+E(T("ഇന്നത്തെ കൂലി","Wage for the day"))+'</span><b>'+money(R.wage)+'</b></div>'+
    (R.wagePaid?'<div class="tsRow"><span>'+E(T("കൊടുത്തത്","Paid"))+'</span><b>'+money(R.wagePaid)+'</b></div>':'')+
    (left>0?'<button class="tsBtn" onclick="tsRpWage('+left+')">'+E(T("കൂലി കൊടുത്തു","Wage paid"))+' · '+money(left)+'</button>':'')+'</div>';
   var by={}; R.lines.forEach(function(l){ var k=l.r.x.p; (by[k]=by[k]||{n:l.p?l.p.n:"?",q:0,t:0}); by[k].q+=+l.r.x.q||0; by[k].t+=l.tot; });
   var items=Object.keys(by).map(function(k){ return by[k]; }).sort(function(a,b){ return b.t-a.t; });
   if(items.length) h+='<div class="tsC"><b>'+E(T("വിറ്റവ","Sold"))+'</b>'+items.map(function(i){ return '<div class="tsRow"><span>'+E(i.n)+' <span class="tsM">× '+qty(i.q)+'</span></span><b>'+money(i.t)+'</b></div>'; }).join("")+'</div>';
   if(R.expList.length) h+='<div class="tsC"><b>'+E(T("ചെലവുകൾ","Expenses"))+'</b>'+R.expList.map(function(e){ return '<div class="tsRow"><span>'+E(ecName(e.x.c))+(e.x.t?' <span class="tsM">'+E(e.x.t)+'</span>':'')+'</span><b>'+money(e.x.a)+'</b></div>'; }).join("")+'</div>';
  }else{
   var cats=Object.keys(R.expBy);
   if(cats.length) h+='<div class="tsC"><b>'+E(T("ചെലവ് വിവരം","Expenses by kind"))+'</b>'+cats.map(function(c){ return '<div class="tsRow"><span>'+E(ecName(c))+'</span><b>'+money(R.expBy[c])+'</b></div>'; }).join("")+'</div>';
   var days=Object.keys(R.days).sort();
   if(days.length) h+='<div class="tsC"><b>'+E(T("ദിവസം തോറും വിൽപ്പന","Sales by day"))+'</b>'+days.map(function(d){ return '<div class="tsRow"><span>'+E(UI.dmy(d))+'</span><b>'+money(R.days[d])+'</b></div>'; }).join("")+'</div>';
   h+='<div class="tsC"><div class="tsRow"><span>'+E(T("ഈ മാസം വാങ്ങിയത്","Bought this month"))+'</span><b>'+money(R.bought)+'</b></div>'+(simple?'':'<div class="tsRow"><span>'+E(T("ഇപ്പോഴത്തെ സ്റ്റോക്ക് വില","Stock value now"))+'</span><b>'+money(SH.stockValue())+'</b></div>')+'</div>';
  }
  h+='<button class="tsBtn g" onclick="tsRpXlsx()">📤 '+E(T("Excel (എല്ലാ കണക്കും)","Excel (the whole book)"))+'</button>';
  UI.body().innerHTML=h;
 },function(){ return "📊 "+T("കണക്ക്","Account"); });
 window.tsRpMode=function(m){ V.rep.mode=m; UI.render(); };
 window.tsRpD=function(n){ var r=V.rep, d=H.addDays(r.d,n); if(d>H.today()) return; r.d=d; UI.render(); };
 window.tsRpM=function(n){ var r=V.rep, m=addMonth(r.m,n); if(m>H.today().slice(0,7)) return; r.m=m; UI.render(); };
 window.tsRpWage=function(left){
  UI.sheet('<h3 style="margin:0">'+E(T("കൂലി കൊടുത്തു","Wage paid"))+'</h3><label>'+E(T("തുക","Amount"))+'</label><input id="wgA" type="number" inputmode="decimal" value="'+left+'">'+
   '<button class="tsBtn" onclick="tsRpWageSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
 };
 window.tsRpWageSave=function(){
  var a=num("wgA"); if(!(a>0)) return;
  SH.add("e",{c:"Wage",a:a,t:T("അമ്മയുടെ കൂലി","Wage")},V.rep.d); UI.render(); say(T("സേവ് ചെയ്തു","Saved"));
 };

 /* ================= EXCEL ================= */
 var HD={b:true,bg:"0B5D7A",color:"FFFFFF",border:1,wrap:true}, MON="₹#,##0.00;[Red]-₹#,##0.00";
 function hdr(L){ return L.map(function(t){ return {v:t,s:HD}; }); }
 function c(v,o){ return {v:v==null?"":v,s:Object.assign({border:1},o||{})}; }
 function m(v){ return c(Math.round((+v||0)*100)/100,{fmt:MON}); }
 window.tsRpXlsx=async function(){
  var wb=window.__tcXlsxWorkbook; if(typeof wb!=="function"){ say(T("Excel തയ്യാറായിട്ടില്ല","Excel is not ready")); return; }
  var M=SH.calc(), P=M.P, out=[];
  /* monthly */
  var months={}; M.live.forEach(function(r){ if(r.d&&(r.k==="s"||r.k==="e"||r.k==="m"||r.k==="b")) months[r.d.slice(0,7)]=1; });
  var ml=Object.keys(months).sort(), rows=[hdr(["Month / മാസം","Sales / വിൽപ്പന","Gross profit / ലാഭം","Expenses / ചെലവ്","Dead fish cost / നഷ്ടം","Net / അറ്റം","Bought / വാങ്ങിയത്"])];
  var tot=[0,0,0,0,0,0];
  ml.forEach(function(k){ var R=SH.report(k+"-01",monthEnd(k)); var v=[R.sales,R.profit,R.exp,R.dead,R.net,R.bought]; v.forEach(function(x,i){ tot[i]+=x; }); rows.push([c(k)].concat(v.map(m))); });
  rows.push([c("Total",{b:true})].concat(tot.map(function(x){ return m(x); })));
  out.push({name:"Monthly",rows:rows,widths:[14,16,16,16,18,16,16],freeze:"B2"});
  /* sales */
  rows=[hdr(["Date","Item","Qty","Price","Total","Paid by","Cost / unit","Profit"])];
  M.live.filter(function(r){ return r.k==="s"; }).sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; }).forEach(function(r){ var p=P[r.x.p], q=+r.x.q||0, pr=+r.x.pr||0, av=SH.unitCost(r.x,P);
   rows.push([c(UI.dmy(r.d)),c(p?p.n:"?"),c(q),m(pr),m(q*pr),c(r.x.pm==="U"?"UPI":"Cash"),m(av),m(q*pr-q*av)]); });
  out.push({name:"Sales",rows:rows,widths:[12,34,8,10,12,9,11,11],freeze:"A2",filter:"A1:H"+rows.length});
  /* purchases */
  rows=[hdr(["Date","Supplier","Bill no.","Item","Qty (units)","Rate / unit","Transport share","Landing / unit","Total"])];
  M.live.filter(function(r){ return r.k==="b"; }).sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; }).forEach(function(r){ var p=P[r.x.p], q=+r.x.q||0, rt=+r.x.rt||0, tr=+r.x.tr||0;
   rows.push([c(UI.dmy(r.d)),c(r.x.su||""),c(r.x.bn||""),c(p?p.n:"?"),c(q),m(rt),m(tr),m(q>0?(q*rt+tr)/q:0),m(q*rt+tr)]); });
  out.push({name:"Purchases",rows:rows,widths:[12,24,10,34,10,11,11,12,12],freeze:"A2",filter:"A1:I"+rows.length});
  /* expenses */
  rows=[hdr(["Date","Kind","Note","Amount"])];
  M.live.filter(function(r){ return r.k==="e"; }).sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; }).forEach(function(r){ rows.push([c(UI.dmy(r.d)),c(r.x.c||""),c(r.x.t||""),m(r.x.a)]); });
  out.push({name:"Expenses",rows:rows,widths:[12,16,40,12],freeze:"A2",filter:"A1:D"+rows.length});
  /* dead */
  rows=[hdr(["Date","Item","Qty","Reason","Cost"])];
  M.live.filter(function(r){ return r.k==="m"; }).sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; }).forEach(function(r){ var p=P[r.x.p], q=+r.x.q||0; rows.push([c(UI.dmy(r.d)),c(p?p.n:"?"),c(q),c(r.x.r||""),m(q*(p?p.avg:0))]); });
  out.push({name:"Dead-Loss",rows:rows,widths:[12,34,8,14,12],freeze:"A2",filter:"A1:E"+rows.length});
  /* stock */
  rows=[hdr(["Item","Kind","Category","Stock","Avg cost","Stock value","Selling price","Low?"])];
  SH.products().forEach(function(p){ rows.push([c(p.n),c(p.t==="f"?"Fish":"Item"),c(p.c),c(p.comp?(p.can==null?"":"can make "+p.can):p.stock==null?"":Math.round(p.stock*1000)/1000),m(p.avg),m(p.value),m(p.pr),c(p.low?"LOW":"")]); });
  out.push({name:"Stock",rows:rows,widths:[34,8,14,9,11,12,12,8],freeze:"A2",filter:"A1:H"+rows.length});
  var bytes;
  try{ bytes=wb(out); }catch(e){ if(window.console) console.error(e); say(T("Excel ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല","Could not make the Excel")); return; }
  var name="Shop_Book_"+H.today()+".xlsx", type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  window.__tcShopLastXlsx={name:name,bytes:bytes};
  try{
   var file=new File([bytes],name,{type:type});
   if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); return; }
  }catch(e){ if(e&&e.name==="AbortError") return; }
  try{
   var url=URL.createObjectURL(new Blob([bytes],{type:type})), l=document.createElement("a"); l.href=url; l.download=name; document.body.appendChild(l); l.click();
   setTimeout(function(){ try{ document.body.removeChild(l); URL.revokeObjectURL(url); }catch(e){} },1500);
   say(T("Excel ഡൗൺലോഡ്സിൽ സേവ് ചെയ്തു","Excel saved to downloads"));
  }catch(e){ say(T("എക്സ്പോർട്ട് ചെയ്യാൻ കഴിഞ്ഞില്ല","Could not export")); }
 };
})();
