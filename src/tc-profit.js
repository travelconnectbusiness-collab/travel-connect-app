/* Profit report (tc-profit.js, loaded by tc-regdocs.js).
   A "Profit report" button in Trip & Accounts opens a pop-up with, for a chosen year (or all time):
     By vehicle  - one card per vehicle: trips, income, expense, profit, profit per trip (best first) + total.
                   Tap a vehicle -> its month-by-month figures and where its money went (expense by category).
     By month    - Jan..Dec: income, expense, profit, trips, with a small bar for the profit.
   Buttons: Excel (3 sheets: By vehicle, By month, Vehicle x Month) and CSV (one clean table: month, vehicle, trips, income,
   expense, profit - ready for a pivot table).
   Numbers are the Trip & Accounts book exactly as it is (driver tips are not counted, same as the book's profit).
   A trip counts in the month of its trip date, with the vehicle of its book entries (or the vehicle on the bill).
   Nothing is stored. Needs tc-accbook.js (window.__tcAbApi) and, for Excel, tc-xlsx.js (window.__tcXlsxWorkbook). */
(function(){
 if(window.__tcProfit) return;
 window.__tcProfit=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var mny=function(n){
  n=Math.round((+n||0)*100)/100;
  if(!Number.isInteger(n)) return (n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
  try{ return (n<0?"-":"")+money(Math.abs(n)); }catch(e){ return "Rs."+n; }
 };
 var r2=function(n){ return Math.round((+n||0)*100)/100; };
 var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 var PR={year:null,view:"veh",veh:null};
 var GRN="#1c6b2c", RED="#a12d2d";

 function A(){ return window.__tcAbApi||null; }
 function monthLabel(m){ var p=String(m).split("-"); return (MON[(+p[1]||1)-1]||p[1])+" "+p[0]; }
 function vname(a,k){
  if(k==="none") return B("No vehicle chosen","വാഹനം തിരഞ്ഞെടുത്തിട്ടില്ല");
  var v=a.vById(k); return v?(v.name||"")+(v.no?" ("+v.no+")":""):String(k);
 }
 function vno(a,k){ var v=k==="none"?null:a.vById(k); return v?(v.no||""):""; }
 function vkey(a,e){ var v=a.vById(e.vehId); return v?v.id:"none"; }
 function quoteOf(t){ return (db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]||null; }
 function years(a){
  var s={}, cur=String(new Date().getFullYear());
  s[cur]=1;
  a.entries().forEach(function(e){ if(e.date) s[String(e.date).slice(0,4)]=1; });
  (db.trips||[]).forEach(function(t){ var d=String(t&&(t.startDate||t.entryDate||t.created)||"").slice(0,4); if(/^\d{4}$/.test(d)) s[d]=1; });
  return Object.keys(s).sort().reverse();
 }
 function inRange(d){ return PR.year==="all"||String(d||"").slice(0,4)===PR.year; }

 /* trips: [{month, veh}] - same rule as the Trips tab: a trip with entries, a bill number, completed status or payments */
 function tripList(a){
  var byTrip={}, out=[];
  a.entries().forEach(function(e){ if(e.tripId&&!byTrip[e.tripId]) byTrip[e.tripId]=[]; if(e.tripId) byTrip[e.tripId].push(e); });
  (db.trips||[]).forEach(function(t){
   try{
    if(!t) return;
    if(!(byTrip[t.id]||t.billNo||t.status==="completed"||(t.payments||[]).length)) return;
    var q=quoteOf(t); if(!q) return;
    var d=String(t.startDate||q.startDate||t.entryDate||t.created||"").slice(0,10);
    if(!inRange(d)) return;
    var vid=""; (byTrip[t.id]||[]).forEach(function(e){ if(!vid&&e.vehId&&a.vById(e.vehId)) vid=e.vehId; });
    if(!vid){ var v=a.matchVehicle(q.vehicleNo,q.vehicle); if(v) vid=v.id; }
    out.push({month:d.slice(0,7),veh:vid||"none"});
   }catch(e){}
  });
  return out;
 }
 function cell(o,k){ return o[k]||(o[k]={inc:0,out:0,trips:0}); }
 function compute(){
  var a=A(); if(!a) return null;
  var vehs={}, months={}, tot={inc:0,out:0,trips:0};
  a.entries().forEach(function(e){
   if(a.isDrv(e)||!inRange(e.date)) return;
   var m=String(e.date).slice(0,7), k=vkey(a,e), x=+e.amount||0, isIn=e.type==="in";
   var V=vehs[k]||(vehs[k]={inc:0,out:0,trips:0,months:{},cats:{}});
   var M=months[m]||(months[m]={inc:0,out:0,trips:0});
   var VM=cell(V.months,m);
   if(isIn){ V.inc+=x; M.inc+=x; VM.inc+=x; tot.inc+=x; }
   else{ V.out+=x; M.out+=x; VM.out+=x; tot.out+=x; V.cats[e.cat]=(V.cats[e.cat]||0)+x; }
  });
  tripList(a).forEach(function(t){
   var V=vehs[t.veh]||(vehs[t.veh]={inc:0,out:0,trips:0,months:{},cats:{}});
   var M=months[t.month]||(months[t.month]={inc:0,out:0,trips:0});
   V.trips++; M.trips++; cell(V.months,t.month).trips++; tot.trips++;
  });
  return {a:a,vehs:vehs,months:months,tot:tot};
 }
 function profit(o){ return r2(o.inc-o.out); }
 /* best profit first; "no vehicle chosen" always last */
 function vehOrder(d){ return function(x,y){ if(x==='none') return 1; if(y==='none') return -1; return profit(d.vehs[y])-profit(d.vehs[x]); }; }
 function sortedKeys(o,f){ return Object.keys(o).sort(f); }

 /* ---------- screen ---------- */
 function metric(label,val,col){
  return '<div style="flex:1;min-width:0"><div class="muted" style="font-size:11px">'+E(label)+'</div><b style="color:'+(col||"inherit")+';font-size:14px">'+mny(val)+'</b></div>';
 }
 function bar(p,max){
  var w=max>0?Math.min(100,Math.round(Math.abs(p)/max*100)):0;
  return '<div style="height:6px;background:#eef1f4;border-radius:3px;margin-top:5px"><div style="height:6px;width:'+w+'%;background:'+(p>=0?GRN:RED)+';border-radius:3px"></div></div>';
 }
 function tabBtn(id,label){
  return '<button class="'+(PR.view===id&&!PR.veh?"primary":"")+'" onclick="tcPrSet(\'view\',\''+id+'\')">'+E(label)+'</button>';
 }
 function head(d){
  var a=d.a, ys=years(a);
  var opts=ys.map(function(y){ return '<option value="'+y+'"'+(PR.year===y?' selected':'')+'>'+y+'</option>'; }).join("")+'<option value="all"'+(PR.year==="all"?' selected':'')+'>'+E(B("All time","എല്ലാ കാലവും"))+'</option>';
  return '<h2>&#128200; '+E(B("Profit report","ലാഭ റിപ്പോർട്ട്"))+'</h2>'+
   '<div class="grid"><label>'+E(B("Year","വർഷം"))+'<select id="prYear" onchange="tcPrSet(\'year\',this.value)">'+opts+'</select></label></div>'+
   '<div class="actions" style="margin-top:6px">'+tabBtn("veh",B("By vehicle","വാഹനം തിരിച്ച്"))+tabBtn("month",B("By month","മാസം തിരിച്ച്"))+'</div>';
 }
 function totalCard(t){
  var p=profit(t);
  return '<div class="ratebox" style="margin-top:8px"><b>'+E(B("Total","ആകെ"))+'</b> <span class="muted">('+t.trips+' '+E(B("trips","ട്രിപ്പുകൾ"))+')</span>'+
   '<div style="display:flex;gap:8px;margin-top:4px">'+metric(B("Income","വരവ്"),t.inc,GRN)+metric(B("Expense","ചെലവ്"),t.out,RED)+metric(B("Profit","ലാഭം"),p,p>=0?GRN:RED)+'</div></div>';
 }
 function vehView(d){
  var a=d.a, keys=sortedKeys(d.vehs,vehOrder(d));
  if(!keys.length) return '<p class="muted">'+E(B("No entries for this year yet.","ഈ വർഷം എൻട്രികളൊന്നുമില്ല."))+'</p>';
  var max=0; keys.forEach(function(k){ max=Math.max(max,Math.abs(profit(d.vehs[k]))); });
  var h=totalCard(d.tot);
  keys.forEach(function(k){
   var V=d.vehs[k], p=profit(V), per=V.trips>0?r2(p/V.trips):0;
   h+='<div class="ratebox" style="margin-top:8px;cursor:pointer" onclick="tcPrVeh(\''+E(k)+'\')">'+
    '<div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(vname(a,k))+'</b><span class="muted">'+V.trips+' '+E(B("trips","ട്രിപ്പുകൾ"))+'</span></div>'+
    '<div style="display:flex;gap:8px;margin-top:4px">'+metric(B("Income","വരവ്"),V.inc,GRN)+metric(B("Expense","ചെലവ്"),V.out,RED)+metric(B("Profit","ലാഭം"),p,p>=0?GRN:RED)+'</div>'+
    bar(p,max)+
    (V.trips>0?'<div class="muted" style="font-size:11.5px;margin-top:3px">'+E(B("Profit per trip","ഒരു ട്രിപ്പിന്റെ ലാഭം"))+': '+mny(per)+'</div>':'')+
    '<div class="muted" style="font-size:11.5px">&#128073; '+E(B("Tap for month-by-month","മാസം തിരിച്ച് കാണാൻ തൊടുക"))+'</div></div>';
  });
  return h;
 }
 function monthRows(map){
  var keys=sortedKeys(map,function(x,y){ return x<y?-1:x>y?1:0; });
  var max=0; keys.forEach(function(k){ max=Math.max(max,Math.abs(profit(map[k]))); });
  return keys.map(function(k){
   var M=map[k], p=profit(M);
   return '<div style="padding:7px 0;border-bottom:1px solid #eee"><div style="display:flex;justify-content:space-between"><b>'+E(monthLabel(k))+'</b><span class="muted">'+M.trips+' '+E(B("trips","ട്രിപ്പുകൾ"))+'</span></div>'+
    '<div style="display:flex;gap:8px;margin-top:2px">'+metric(B("Income","വരവ്"),M.inc,GRN)+metric(B("Expense","ചെലവ്"),M.out,RED)+metric(B("Profit","ലാഭം"),p,p>=0?GRN:RED)+'</div>'+bar(p,max)+'</div>';
  }).join("");
 }
 function monthView(d){
  if(!Object.keys(d.months).length) return '<p class="muted">'+E(B("No entries for this year yet.","ഈ വർഷം എൻട്രികളൊന്നുമില്ല."))+'</p>';
  return totalCard(d.tot)+'<div style="margin-top:6px">'+monthRows(d.months)+'</div>';
 }
 function vehDetail(d){
  var a=d.a, V=d.vehs[PR.veh];
  var h='<div class="actions"><button onclick="tcPrSet(\'veh\',null)">&larr; '+E(B("Back","തിരികെ"))+'</button></div><h3 style="margin:6px 0">'+E(PR.veh?vname(a,PR.veh):"")+'</h3>';
  if(!V) return h+'<p class="muted">'+E(B("No entries.","എൻട്രികളില്ല."))+'</p>';
  h+=totalCard(V)+'<div style="margin-top:6px">'+monthRows(V.months)+'</div>';
  var ck=sortedKeys(V.cats,function(x,y){ return V.cats[y]-V.cats[x]; });
  if(ck.length){
   h+='<h4 style="margin:12px 0 4px">'+E(B("Where the money went","ചെലവ് എവിടെ പോയി"))+'</h4>';
   ck.forEach(function(c){
    var pc=V.out>0?Math.round(V.cats[c]/V.out*100):0;
    h+='<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span>'+E(a.catLabel?a.catLabel(c):c)+' <span class="muted">'+pc+'%</span></span><b>'+mny(V.cats[c])+'</b></div>';
   });
  }
  return h;
 }
 function render(){
  var d=compute();
  if(!d){ say(B("Please open Accounts first","ആദ്യം അക്കൗണ്ട്സ് തുറക്കുക")); return; }
  if(!PR.year) PR.year=String(new Date().getFullYear());
  var body=PR.veh?vehDetail(d):(PR.view==="month"?monthView(d):vehView(d));
  var btn='<div class="actions" style="margin-top:10px">'+
   '<button class="primary" style="background:#1d6f42;border-color:#1d6f42" onclick="tcPrXlsx()">&#128202; Excel</button>'+
   '<button onclick="tcPrCsv()">&#128190; CSV</button><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(head(d)+'<div id="prBody">'+body+'</div>'+btn);
 }
 window.tcPrOpen=function(){ PR.veh=null; PR.view="veh"; PR.year=String(new Date().getFullYear()); render(); };
 window.tcPrSet=function(k,v){ if(k==="veh"){ PR.veh=v; } else { PR[k]=v; if(k==="view") PR.veh=null; } render(); };
 window.tcPrVeh=function(id){ PR.veh=id; render(); };

 /* ---------- Excel + CSV ---------- */
 var INK="1F2D5A", GRN2="1E7B34", RED2="B42318", TOT="EEF1F8", MONEY="₹#,##0;[Red]-₹#,##0";
 var hd=function(v){ return {v:v,s:{b:1,color:"FFFFFF",bg:INK,border:1,al:"center"}}; };
 var tx=function(v,o){ return {v:v==null?"":v,s:Object.assign({border:1},o||{})}; };
 var mo=function(n,o){ return {v:r2(n),s:Object.assign({fmt:MONEY,border:1},o||{})}; };
 var nu=function(n,o){ return {v:+n||0,s:Object.assign({border:1},o||{})}; };
 function yearLabel(){ return PR.year==="all"?B("All time","എല്ലാ കാലവും"):PR.year; }
 function sheets(d){
  var a=d.a, biz=(db.business&&db.business.name)||"Travel Connect", sh=[];
  var vk=sortedKeys(d.vehs,vehOrder(d));
  /* 1 By vehicle */
  var rows=[[{v:biz+" - "+B("Profit by vehicle","വാഹനം തിരിച്ചുള്ള ലാഭം")+" - "+yearLabel(),s:{b:1,sz:14,color:INK}}],[],[]];
  rows.push([hd("Vehicle / വാഹനം"),hd("Vehicle No"),hd("Trips / ട്രിപ്പ്"),hd("Income / വരവ്"),hd("Expense / ചെലവ്"),hd("Profit / ലാഭം"),hd("Profit per trip")]);
  var f=rows.length+1;
  vk.forEach(function(k,i){
   var V=d.vehs[k], r=f+i, p=profit(V);
   rows.push([tx(vname(a,k)),tx(vno(a,k)),nu(V.trips),mo(V.inc),mo(V.out),{f:"D"+r+"-E"+r,v:p,s:{fmt:MONEY,border:1,b:1,color:p>=0?GRN2:RED2}},{f:"IF(C"+r+">0,F"+r+"/C"+r+",0)",v:V.trips>0?r2(p/V.trips):0,s:{fmt:MONEY,border:1}}]);
  });
  var l=rows.length, tp=profit(d.tot), ts={b:1,bg:TOT,border:1};
  if(vk.length) rows.push([tx(B("Total","ആകെ"),ts),tx("",ts),{f:"SUM(C"+f+":C"+l+")",v:d.tot.trips,s:ts},{f:"SUM(D"+f+":D"+l+")",v:r2(d.tot.inc),s:Object.assign({fmt:MONEY},ts)},{f:"SUM(E"+f+":E"+l+")",v:r2(d.tot.out),s:Object.assign({fmt:MONEY},ts)},{f:"SUM(F"+f+":F"+l+")",v:tp,s:Object.assign({fmt:MONEY},ts)},tx("",ts)]);
  sh.push({name:"By vehicle - വാഹനം",rows:rows,widths:[28,16,10,15,15,15,16],freeze:"A5"});
  /* 2 By month */
  var mk=sortedKeys(d.months,function(x,y){ return x<y?-1:x>y?1:0; });
  rows=[[{v:biz+" - "+B("Profit by month","മാസം തിരിച്ചുള്ള ലാഭം")+" - "+yearLabel(),s:{b:1,sz:14,color:INK}}],[],[]];
  rows.push([hd("Month / മാസം"),hd("Trips / ട്രിപ്പ്"),hd("Income / വരവ്"),hd("Expense / ചെലവ്"),hd("Profit / ലാഭം")]);
  f=rows.length+1;
  mk.forEach(function(k,i){ var M=d.months[k], r=f+i, p=profit(M);
   rows.push([tx(monthLabel(k)),nu(M.trips),mo(M.inc),mo(M.out),{f:"C"+r+"-D"+r,v:p,s:{fmt:MONEY,border:1,b:1,color:p>=0?GRN2:RED2}}]); });
  l=rows.length;
  if(mk.length) rows.push([tx(B("Total","ആകെ"),ts),{f:"SUM(B"+f+":B"+l+")",v:d.tot.trips,s:ts},{f:"SUM(C"+f+":C"+l+")",v:r2(d.tot.inc),s:Object.assign({fmt:MONEY},ts)},{f:"SUM(D"+f+":D"+l+")",v:r2(d.tot.out),s:Object.assign({fmt:MONEY},ts)},{f:"SUM(E"+f+":E"+l+")",v:tp,s:Object.assign({fmt:MONEY},ts)}]);
  sh.push({name:"By month - മാസം",rows:rows,widths:[16,10,15,15,15],freeze:"A5"});
  /* 3 Vehicle x Month (a clean table: filter / pivot) */
  var long=longRows(d);
  rows=[[{v:biz+" - "+B("Vehicle x Month","വാഹനം x മാസം")+" - "+yearLabel(),s:{b:1,sz:14,color:INK}}],[],[]];
  rows.push([hd("Month"),hd("Vehicle"),hd("Vehicle No"),hd("Trips"),hd("Income"),hd("Expense"),hd("Profit")]);
  f=rows.length+1;
  long.forEach(function(x,i){ var r=f+i;
   rows.push([tx(x.month),tx(x.veh),tx(x.no),nu(x.trips),mo(x.inc),mo(x.out),{f:"E"+r+"-F"+r,v:r2(x.inc-x.out),s:{fmt:MONEY,border:1}}]); });
  sh.push({name:"Vehicle x Month",rows:rows,widths:[12,28,16,8,15,15,15],freeze:"A5",filter:"A4:G"+Math.max(5,rows.length)});
  return sh;
 }
 /* rows of the long table: month (YYYY-MM) ascending, vehicle by name */
 function longRows(d){
  var a=d.a, out=[];
  Object.keys(d.vehs).forEach(function(k){
   var V=d.vehs[k];
   Object.keys(V.months).forEach(function(m){ var c=V.months[m]; out.push({month:m,veh:vname(a,k),no:vno(a,k),trips:c.trips,inc:r2(c.inc),out:r2(c.out)}); });
  });
  out.sort(function(p,q){ return p.month<q.month?-1:p.month>q.month?1:(p.veh<q.veh?-1:p.veh>q.veh?1:0); });
  return out;
 }
 async function deliver(data,name,type,doneMsg){
  try{
   var file=new File([data],name,{type:type});
   if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); return; }
  }catch(e){ if(e&&e.name==="AbortError") return; }
  try{
   var url=URL.createObjectURL(new Blob([data],{type:type}));
   var l=document.createElement("a"); l.href=url; l.download=name; document.body.appendChild(l); l.click();
   setTimeout(function(){ try{ document.body.removeChild(l); URL.revokeObjectURL(url); }catch(e){} },1500);
   say(doneMsg);
  }catch(e){ say(B("Could not export","എക്സ്പോർട്ട് ചെയ്യാൻ കഴിഞ്ഞില്ല")); }
 }
 function stamp(){ var a=A(); return (a&&a.todayIso)?a.todayIso():new Date().toISOString().slice(0,10); }
 window.tcPrXlsx=async function(){
  var d=compute();
  if(!d||!Object.keys(d.vehs).length){ say(B("Nothing to export for this year","ഈ വർഷം എക്സ്പോർട്ട് ചെയ്യാൻ ഒന്നുമില്ല")); return; }
  if(typeof window.__tcXlsxWorkbook!=="function"){ say(B("Excel is not ready - please reopen Accounts","Excel തയ്യാറായിട്ടില്ല - അക്കൗണ്ട്സ് വീണ്ടും തുറക്കുക")); return; }
  var bytes;
  try{ bytes=window.__tcXlsxWorkbook(sheets(d)); }catch(e){ if(window.console) console.error(e); say(B("Could not make the Excel file","Excel ഫയൽ ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല")); return; }
  await deliver(bytes,"TravelConnect_Profit_"+(PR.year==="all"?"all":PR.year)+"_"+stamp()+".xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",B("Excel saved to your downloads","Excel ഡൗൺലോഡ്സിൽ സേവ് ചെയ്തു"));
 };
 function csvCell(v){ var s=String(v==null?"":v); return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
 window.tcPrCsv=async function(){
  var d=compute();
  if(!d||!Object.keys(d.vehs).length){ say(B("Nothing to export for this year","ഈ വർഷം എക്സ്പോർട്ട് ചെയ്യാൻ ഒന്നുമില്ല")); return; }
  var rows=[["Month","Vehicle","Vehicle No","Trips","Income","Expense","Profit"]];
  longRows(d).forEach(function(x){ rows.push([x.month,x.veh,x.no,x.trips,x.inc,x.out,r2(x.inc-x.out)]); });
  var text="﻿"+rows.map(function(r){ return r.map(csvCell).join(","); }).join("\r\n");
  await deliver(text,"TravelConnect_Profit_"+(PR.year==="all"?"all":PR.year)+"_"+stamp()+".csv","text/csv",B("CSV saved to your downloads","CSV ഡൗൺലോഡ്സിൽ സേവ് ചെയ്തു"));
 };
 window.__tcPrApi={compute:compute,state:PR,sheets:sheets,longRows:longRows};
})();
