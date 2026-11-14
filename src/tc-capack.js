/* CA pack - one Excel for the accountant, for ONE month (tc-capack.js, loaded by tc-regdocs.js after tc-shopstaff.js).
   Owner's request (2026-11-14): "a CA monthly Excel / GST summary (including the taxi-bill GST) and a simple profit-loss and dues report".
   Button "CA pack" - Shop > Account > Month, and the taxi "GST report" window. window.tcCaPack("YYYY-MM") builds a real .xlsx on the phone (tc-xlsx.js writer),
   nothing is sent anywhere. Sheets:
     Summary          - business, GSTIN, month; shop sales / purchases / expenses; GST out - GST in = GST to pay (shop + taxi bills together); profit; dues
     Profit & Loss    - one simple statement of the month
     Sales            - every sale line of the month: GST %, taxable value, GST (formulas total at the bottom)
     Purchases        - supplier, bill no., GST %, taxable value, GST
     Expenses, Dead-Loss
     Taxi GST bills   - the taxi / travel bills with GST of that month (from tc-gst.js tcGstRows), taxable value, GST, total
     Dues             - what customers still owe / what the shop still owes suppliers, today, with the last date and the days since
   A phone that works as shop STAFF has no access (the pack shows profit, cost and dues). Plans: Platinum (tcIsPlatinumPlan when it exists; until then every plan). */
(function(){
 if(window.__tcCaPack) return;
 window.__tcCaPack=1;
 var SH=window.__tcShop, UI=window.__tcShopUi;
 var say=function(m){ try{ toast(m); }catch(e){ try{ UI&&UI.say(m); }catch(x){} } };
 var Lang=function(){ try{ return UI&&UI.lang?UI.lang():"en"; }catch(e){ return "en"; } };
 var T=function(ml,en){ return Lang()==="ml"?ml:en; };
 var HD={b:true,bg:"0B5D7A",color:"FFFFFF",border:1,wrap:true}, MON="₹#,##0.00;[Red]-₹#,##0.00", TOT="E8F1F5";
 function hdr(L){ return L.map(function(t){ return {v:t,s:HD}; }); }
 function c(v,o){ return {v:v==null?"":v,s:Object.assign({border:1},o||{})}; }
 function r2(v){ return Math.round((+v||0)*100)/100; }
 function m(v,o){ return {v:r2(v),s:Object.assign({border:1,fmt:MON},o||{})}; }
 function col(n){ var s=""; n++; while(n>0){ var k=(n-1)%26; s=String.fromCharCode(65+k)+s; n=Math.floor((n-1)/26); } return s; }
 function pad(n){ return (n<10?"0":"")+n; }
 function monthEnd(mon){ var y=+mon.slice(0,4), k=+mon.slice(5,7); return mon+"-"+pad(new Date(y,k,0).getDate()); }
 function mname(mon){ var N=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return N[+mon.slice(5,7)-1]+" "+mon.slice(0,4); }
 function dmy(d){ try{ return UI&&UI.dmy?UI.dmy(d):d; }catch(e){ return d; } }
 function today(){ try{ return SH.H.today(); }catch(e){ return new Date().toISOString().slice(0,10); } }
 function daysBetween(a,b){ var x=Date.parse(a), y=Date.parse(b); return isFinite(x)&&isFinite(y)?Math.max(0,Math.round((y-x)/86400000)):""; }
 function bizName(){ var n=""; try{ n=SH.cfg("name",""); }catch(e){} if(!n){ try{ n=(db.business&&db.business.name)||""; }catch(e){} } return n; }
 function gstin(){ var g=""; try{ g=SH.cfg("gstin",""); }catch(e){} if(!g){ try{ g=(db.business&&db.business.gstin)||""; }catch(e){} } return String(g||"").toUpperCase(); }
 function allowed(){
  try{ if(SH&&SH.isStaff&&SH.isStaff()) return false; }catch(e){}
  if(typeof window.tcIsPlatinumPlan==="function"){ try{ return !!window.tcIsPlatinumPlan(); }catch(e){ return true; } }
  return true;
 }
 /* a total row with SUM formulas: cols = column numbers (0-based) to add up, rows first..last are 1-based sheet rows */
 function totalRow(width,label,cols,first,last,sums){
  var row=[]; for(var i=0;i<width;i++) row.push(c("",{bg:TOT,b:true}));
  row[0]=c(label,{b:true,bg:TOT});
  cols.forEach(function(ci,k){ row[ci]=last>=first?{f:"SUM("+col(ci)+first+":"+col(ci)+last+")",v:r2(sums[k]),s:{b:true,bg:TOT,border:1,fmt:MON}}:m(0,{b:true,bg:TOT}); });
  return row;
 }
 function line(a,b,o){ return [c(a,Object.assign({b:true},o||{})),b]; }

 window.tcCaPack=async function(mon){
  if(!/^\d{4}-\d{2}$/.test(String(mon||""))) mon=today().slice(0,7);
  if(!allowed()){ say(T("CA പാക്ക് ഈ ഫോണിൽ ലഭ്യമല്ല","The CA pack is not available here")); return; }
  var wb=window.__tcXlsxWorkbook; if(typeof wb!=="function"){ say(T("Excel തയ്യാറായിട്ടില്ല","Excel is not ready")); return; }
  var d1=mon+"-01", d2=monthEnd(mon), out=[], i;
  var M=null, P={}, R=null, haveShop=false, live=[];
  try{ M=SH.calc(); P=M.P; live=M.live.filter(function(r){ return r.d>=d1&&r.d<=d2; }); R=SH.report(d1,d2); haveShop=M.live.length>0; }catch(e){ haveShop=false; }
  var gstOn=false; try{ gstOn=SH.cfg("gst","0")==="1"; }catch(e){}
  var taxi={list:[],none:0}; if(typeof window.tcGstRows==="function"){ try{ taxi=window.tcGstRows(mon); }catch(e){} }
  var txTaxable=0, txGst=0, txTotal=0; taxi.list.forEach(function(x){ txTaxable+=x.tx; txGst+=x.gs; txTotal+=x.tot; });
  var haveTaxi=taxi.list.length>0||taxi.none>0;
  if(!haveShop&&!haveTaxi){ say(T("ഈ മാസം കണക്കൊന്നുമില്ല","Nothing to export for this month")); return; }

  /* ---------- Summary ---------- */
  var rows=[], L, sh=live.filter(function(r){ return r.k==="s"; }), pu=live.filter(function(r){ return r.k==="b"; });
  rows.push([c(bizName()||"Business",{b:true,sz:14,border:0}),c("",{border:0})]);
  rows.push([c("Month / മാസം",{border:0}),c(mname(mon),{b:true,border:0})]);
  if(gstin()) rows.push([c("GSTIN",{border:0}),c(gstin(),{b:true,border:0})]);
  rows.push([c("Prepared on / തയ്യാറാക്കിയത്",{border:0}),c(dmy(today()),{border:0})]);
  rows.push([c("",{border:0}),c("",{border:0})]);
  var outGst=0, inGst=0;
  if(haveShop&&R){
   rows.push([c("SHOP / ഷോപ്പ്",{b:true,bg:HD.bg,color:"FFFFFF"}),c("",{bg:HD.bg})]);
   rows.push(line("Sales (as billed, with GST) / വിൽപ്പന",m(R.sales)));
   rows.push(line("  of which taxable value / GST ഇല്ലാത്ത തുക",m(R.sales-R.gstOut)));
   rows.push(line("  of which GST collected / പിരിച്ച GST",m(R.gstOut)));
   rows.push(line("Purchases (with GST) / വാങ്ങൽ",m(R.bought)));
   rows.push(line("  of which GST paid on purchases / വാങ്ങലിലെ GST",m(R.gstIn)));
   rows.push(line("Expenses / ചെലവ്",m(R.exp)));
   rows.push(line("Dead / damaged stock / നഷ്ടം",m(R.dead)));
   rows.push(line("Gross profit on sales / ലാഭം",m(R.profit)));
   rows.push(line("NET PROFIT / അറ്റ ലാഭം",m(R.net,{b:true,color:R.net>=0?"177044":"A12D2D"}),{color:R.net>=0?"177044":"A12D2D"}));
   outGst+=R.gstOut; inGst+=R.gstIn;
   rows.push([c("",{border:0}),c("",{border:0})]);
  }
  if(haveTaxi){
   rows.push([c("TAXI / TRAVEL BILLS / ടാക്സി ബില്ലുകൾ",{b:true,bg:HD.bg,color:"FFFFFF"}),c("",{bg:HD.bg})]);
   rows.push(line("Bills with GST (count) / GST ഉള്ള ബില്ലുകൾ",c(taxi.list.length)));
   rows.push(line("Taxable value / GST ഇല്ലാത്ത തുക",m(txTaxable)));
   rows.push(line("GST collected / പിരിച്ച GST",m(txGst)));
   rows.push(line("Total billed (with GST) / ആകെ ബിൽ",m(txTotal)));
   if(taxi.none) rows.push(line("Bills without GST (count) / GST ഇല്ലാത്തവ",c(taxi.none)));
   outGst+=txGst;
   rows.push([c("",{border:0}),c("",{border:0})]);
  }
  if(outGst>0||inGst>0){
   rows.push([c("GST SUMMARY / GST സംഗ്രഹം",{b:true,bg:HD.bg,color:"FFFFFF"}),c("",{bg:HD.bg})]);
   rows.push(line("GST collected on sales and taxi bills (output) / പിരിച്ചത്",m(outGst)));
   rows.push(line("GST paid on purchases (input) / കൊടുത്തത്",m(inGst)));
   var pay=outGst-inGst;
   rows.push(line((pay>=0?"GST TO PAY / അടയ്ക്കേണ്ടത്":"GST TO CLAIM BACK / തിരിച്ചു കിട്ടാനുള്ളത്"),m(Math.abs(pay),{b:true})));
   rows.push([c("",{border:0}),c("",{border:0})]);
  }
  var Lg=null; try{ Lg=SH.ledger(); }catch(e){}
  if(Lg){
   rows.push([c("DUES TODAY / ഇപ്പോഴത്തെ കടം",{b:true,bg:HD.bg,color:"FFFFFF"}),c("",{bg:HD.bg})]);
   rows.push(line("Customers still owe the shop / കിട്ടാനുള്ളത്",m(Lg.custTotal)));
   rows.push(line("The shop still owes suppliers / കൊടുക്കാനുള്ളത്",m(Lg.supTotal)));
  }
  rows.push([c("",{border:0}),c("",{border:0})]);
  rows.push([c("Prices and purchase rates are taken as GST-inclusive. Figures are as entered in the Travel Connect book - please verify before filing.",{border:0,color:"666666",wrap:true}),c("",{border:0})]);
  out.push({name:"Summary",rows:rows,widths:[62,22]});

  /* ---------- Profit & Loss (simple) ---------- */
  if(haveShop&&R){
   rows=[hdr(["Profit & Loss - "+mname(mon)+" / ലാഭ-നഷ്ടം","Amount / തുക"])];
   var sales=R.sales, cost=R.cost;
   rows.push([c("Sales (as billed) / വിൽപ്പന"),m(sales)]);
   rows.push([c("Cost of the goods sold / വിറ്റ സാധനങ്ങളുടെ വില"),m(-cost)]);
   rows.push([c("Gross profit / ലാഭം",{b:true,bg:TOT}),m(sales-cost,{b:true,bg:TOT})]);
   Object.keys(R.expBy).sort().forEach(function(k){ rows.push([c("  Expense - "+k),m(-R.expBy[k])]); });
   rows.push([c("Total expenses / ആകെ ചെലവ്"),m(-R.exp)]);
   rows.push([c("Dead / damaged stock / നഷ്ടം"),m(-R.dead)]);
   var net=sales-cost-R.exp-R.dead;
   rows.push([c("NET PROFIT / (LOSS)  അറ്റ ലാഭം / നഷ്ടം",{b:true,bg:TOT}),m(net,{b:true,bg:TOT,color:net>=0?"177044":"A12D2D"})]);
   rows.push([c("",{border:0}),c("",{border:0})]);
   rows.push([c("Sales and costs are as entered in the book (GST-inclusive); GST collected and paid is shown in the Summary sheet. Taxi bills are not part of this statement - see 'Taxi GST bills'.",{border:0,color:"666666",wrap:true}),c("",{border:0})]);
   out.push({name:"Profit & Loss",rows:rows,widths:[62,22]});
  }

  /* ---------- Sales register ---------- */
  if(haveShop){
   rows=[hdr(["Date","Item","Qty","Rate","Amount (with GST)","GST %","Taxable value","GST","Paid by","Customer","Mobile","Sold by"])];
   var f0=2, s1=0, s2=0, s3=0;
   sh.sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:(a.ts<b.ts?-1:1); }).forEach(function(r){
    var x=r.x||{}, p=P[x.p], q=+x.q||0, pr=+x.pr||0, tot=q*pr, gr=+x.gr>0?+x.gr:0, gs=gr?tot*gr/(100+gr):0;
    s1+=tot; s2+=tot-gs; s3+=gs;
    var rn=rows.length+1;
    rows.push([c(dmy(r.d)),c(p?p.n:"?"),c(q),m(pr),m(tot),c(gr||""),{f:"E"+rn+"-H"+rn,v:r2(tot-gs),s:{border:1,fmt:MON}},m(gs),c(UI.pmTxt(x,true)),c(x.cn||""),c(x.cm||""),c(UI.sellerName(x))]);
   });
   var lastS=rows.length;
   var tr=totalRow(12,"Total",[4,6,7],f0,lastS,[s1,s2,s3]); rows.push(tr);
   out.push({name:"Sales",rows:rows,widths:[12,34,8,10,16,8,15,12,22,18,14,16],freeze:"A2",filter:"A1:L"+Math.max(2,lastS)});

   /* ---------- Purchases ---------- */
   rows=[hdr(["Date","Supplier","Bill no.","Item","Qty (units)","Rate / unit","Transport","GST %","Total (with GST)","Taxable value","GST","Unpaid part"])];
   var p1=0, p2=0, p3=0;
   pu.sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; }).forEach(function(r){
    var x=r.x||{}, p=P[x.p], q=+x.q||0, rt=+x.rt||0, tr2=+x.tr||0, am=q*rt+tr2, gr=+x.gr>0?+x.gr:0, gs=gr?am*gr/(100+gr):0;
    p1+=am; p2+=am-gs; p3+=gs;
    var rn=rows.length+1;
    rows.push([c(dmy(r.d)),c(x.su||""),c(x.bn||""),c(p?p.n:"?"),c(q),m(rt),m(tr2),c(gr||""),m(am),{f:"I"+rn+"-K"+rn,v:r2(am-gs),s:{border:1,fmt:MON}},m(gs),m(+x.cr||0)]);
   });
   var lastP=rows.length;
   rows.push(totalRow(12,"Total",[8,9,10],2,lastP,[p1,p2,p3]));
   out.push({name:"Purchases",rows:rows,widths:[12,24,10,34,10,11,11,8,16,15,12,12],freeze:"A2",filter:"A1:L"+Math.max(2,lastP)});

   /* ---------- Expenses / Dead ---------- */
   rows=[hdr(["Date","Kind","Note","Amount"])];
   var e1=0;
   live.filter(function(r){ return r.k==="e"; }).sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; }).forEach(function(r){ e1+=+r.x.a||0; rows.push([c(dmy(r.d)),c(r.x.c||""),c(r.x.t||""),m(r.x.a)]); });
   var lastE=rows.length; rows.push(totalRow(4,"Total",[3],2,lastE,[e1]));
   out.push({name:"Expenses",rows:rows,widths:[12,16,40,14],freeze:"A2"});
   rows=[hdr(["Date","Item","Qty","Reason","Cost"])];
   var m1=0;
   live.filter(function(r){ return r.k==="m"; }).sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:0; }).forEach(function(r){ var p=P[r.x.p], q=+r.x.q||0, cs=q*(p?p.avg:0); m1+=cs; rows.push([c(dmy(r.d)),c(p?p.n:"?"),c(q),c(r.x.r||""),m(cs)]); });
   var lastM=rows.length; rows.push(totalRow(5,"Total",[4],2,lastM,[m1]));
   out.push({name:"Dead-Loss",rows:rows,widths:[12,34,8,14,14],freeze:"A2"});
  }

  /* ---------- Taxi GST bills ---------- */
  if(haveTaxi){
   rows=[hdr(["Bill no.","Date","Customer","Taxable value","GST %","GST","Total"])];
   taxi.list.forEach(function(x){ rows.push([c(x.no),c(dmy(x.d)),c(x.cu),m(x.tx),c(x.pc),m(x.gs),m(x.tot)]); });
   var lastT=rows.length;
   var trT=totalRow(7,"Total",[3,5,6],2,lastT,[txTaxable,txGst,txTotal]); rows.push(trT);
   if(taxi.none) rows.push([c(taxi.none+" bill(s) in this month without GST are not listed.",{border:0,color:"666666"})]);
   out.push({name:"Taxi GST bills",rows:rows,widths:[14,12,28,15,8,13,15],freeze:"A2"});
  }

  /* ---------- Dues ---------- */
  if(Lg){
   var td=today();
   rows=[hdr(["Customers still owe / കിട്ടാനുള്ളത്","Amount","Last entry","Days since"])];
   var d3=0; Lg.cust.filter(function(e){ return e.owed>0.004; }).sort(function(a,b){ return b.owed-a.owed; }).forEach(function(e){ d3+=e.owed; rows.push([c(e.n),m(e.owed),c(dmy(e.last)),c(daysBetween(e.last,td))]); });
   rows.push(totalRow(4,"Total",[1],2,rows.length,[d3]));
   rows.push([c("",{border:0})]);
   rows.push(hdr(["The shop still owes / കൊടുക്കാനുള്ളത്","Amount","Last entry","Days since"]));
   var d4=0, st=rows.length+1; Lg.sup.filter(function(e){ return e.owed>0.004; }).sort(function(a,b){ return b.owed-a.owed; }).forEach(function(e){ d4+=e.owed; rows.push([c(e.n),m(e.owed),c(dmy(e.last)),c(daysBetween(e.last,td))]); });
   rows.push(totalRow(4,"Total",[1],st,rows.length,[d4]));
   out.push({name:"Dues",rows:rows,widths:[34,16,14,12]});
  }

  var bytes;
  try{ bytes=wb(out); }catch(e){ if(window.console) console.error(e); say(T("Excel ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല","Could not make the Excel")); return; }
  var name="CA_pack_"+mon+".xlsx", type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  window.__tcCaLast={name:name,bytes:bytes,sheets:out.map(function(s){ return s.name; })};
  try{
   var file=new File([bytes],name,{type:type});
   if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); return; }
  }catch(e){ if(e&&e.name==="AbortError") return; }
  try{
   var url=URL.createObjectURL(new Blob([bytes],{type:type})), l=document.createElement("a"); l.href=url; l.download=name; document.body.appendChild(l); l.click();
   setTimeout(function(){ try{ document.body.removeChild(l); URL.revokeObjectURL(url); }catch(e){} },1500);
   say(T("CA പാക്ക് ഡൗൺലോഡ്സിൽ സേവ് ചെയ്തു","CA pack saved to downloads"));
  }catch(e){ say(T("എക്സ്പോർട്ട് ചെയ്യാൻ കഴിഞ്ഞില്ല","Could not export")); }
 };
})();
