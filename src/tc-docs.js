/* Quotation / Invoice / Bill for shops and skilled works (tc-docs.js, loaded by tc-regdocs.js after tc-shopset.js; printing is in tc-docsprint.js).
   Owner's request (2026-10-27): a shop and a Skilled Work business (CCTV wiring, plumbing ... contract work) must be able to give the customer a
   QUOTATION, an INVOICE (tax invoice when GST) and a BILL (cash bill). business.js has this only for taxi / travel, so this is a separate, small module.
   Own full-screen layer (#tcDocs) - it does not touch the shop screens. Open it with tcDocsOpen().
   DATA: the documents live in the same append-only book as the shop (window.__tcShop, so they follow the login number to every phone and sync by
   themselves), as kind 'o' records the shop accounts ignore:
     {t:'doc', id, v:version, ty:'Q'|'I'|'B', no, cn,cm,ca,cg: customer name / mobile / address / GSTIN, tt: work title, L:[[text,qty,unit,rate]...],
      dc: discount, gp: GST %, vu: valid until (Q), ad: advance asked (Q), nt: notes, fr: id of the quotation it was made from}
       an edit = a new record with the same id and v+1 (the highest v wins)
     {t:'dp', doc, a, pm:'C'|'U'|'B'|'O'}  payment received (cancel it = book cancel)      {t:'dd', doc}  deleted document
   One record must stay under about 2900 bytes (server limit 3000), so a document holds roughly 25-30 lines; the form says so when it is too long.
   Bill = paid at once (the form offers "paid in full"); Invoice = payment later (balance shown); Quotation = price offer, can be made an invoice.
   GST (optional, added on top): usual % / GSTIN / CGST+SGST wording come from db.business (gstin, gstDef, gstSplit, gstAuto - see tc-gst.js).
   Totals are rounded to the whole rupee (Round off line). Numbers: QTN-0001, INV-0001, BILL-0001 (next free number of each kind).
   MY ITEMS (2026-11-13, owner: a CCTV / plumbing worker lists the things he uses once, then picks them by a tap): a business that is not a shop gets "My items" on the
   list screen. An item is an ordinary book product (name, unit, selling rate, optional buying rate, optional stock in hand; no stock number = not counted). The form of a
   quotation / invoice / bill has "From my list": tap an item = a line (tap again = qty + 1). An invoice / bill reduces the stock of counted items (tc-docslink.js).
   SERIAL NO. + WARRANTY (2026-11-13, owner: a CCTV camera is fitted with its serial number on the bill, so a later warranty question is answered from the number): every line of a
   document can carry l[4] = serial number(s) (several = comma separated; not on a quotation) and l[5] = warranty in months (a quotation prints the warranty, an invoice / bill
   counts it from the bill date). Opening a line's "Serial no. / warranty" box is optional. The warranty last used for an item is filled in again next time. "Warranty / serial no."
   on the list screen: type a serial number (or customer name / mobile / item) -> the bill, date, customer and "warranty valid till ... / over". Saving a bill whose serial number is
   already on another bill gives a warning. Shops use the same (their bills are these documents); the quick Sale screen has no serial box. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcDocs) return;
 var T=UI.T, E=UI.E, H=SH.H;
 /* an example that fits the business: [other work, workshop, aquarium shop, another shop] - each a [Malayalam, English] pair */
 function EX(o,w,a,g){ var k=SH.kind(), x=k==="workshop"?w:k==="aquarium"?a:k==="general"?g:o; return T(x[0],x[1]); }
 var $=function(id){ return document.getElementById(id); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var PRE={Q:"QTN",I:"INV",B:"BILL"};
 var NAME={Q:["ക്വട്ടേഷൻ","Quotation"],I:["ഇൻവോയ്സ്","Invoice"],B:["ബിൽ","Bill"]};
 var MAXB=2900, GSTIN_RE=/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
 var D={open:false,screen:"list",params:{},tab:"A",q:"",iq:"",wq:"",back:""}, F=null, SC={};
 function r2(n){ return Math.round((+n||0)*100)/100; }
 function mny(n){ return "₹"+r2(n).toLocaleString("en-IN",{maximumFractionDigits:2}); }
 function today(){ return H.today(); }
 function tn(ty){ return T(NAME[ty][0],NAME[ty][1]); }
 /* tc-docslink.js (shop) keeps the shop's Sales / Credit & dues / stock in step with an invoice or bill; it is called after every change of a document */
 function hook(id){ try{ if(typeof window.tcDocsRebuild==="function") window.tcDocsRebuild(id); }catch(e){ if(window.console) console.error("tc-docslink",e); } }
 function chip(on,fn,txt){ return '<span class="tdChip'+(on?" on":"")+'" onclick="'+fn+'">'+E(txt)+'</span>'; }
 function cap(s,n){ return String(s==null?"":s).replace(/\s+/g," ").trim().slice(0,n); }
 /* ---------- serial numbers and warranty ---------- */
 function dm(s){ return window.tcDateFmt?window.tcDateFmt(s):String(s||"").split("-").reverse().join("-"); }
 function pieces(s){ return String(s||"").split(/[,;\n]+/).map(function(z){ return z.replace(/\s+/g," ").trim(); }).filter(Boolean); }
 function snClean(s){ return pieces(s).join(", ").slice(0,300); }
 function normSn(s){ return String(s||"").toLowerCase().replace(/[\s\-_.\/]+/g,""); }
 function addMonths(ds,m){
  var a=String(ds).split("-"), y=+a[0], mo=(+a[1]-1)+(+m), dd=+a[2], last=new Date(Date.UTC(y,mo+1,0)).getUTCDate();
  return new Date(Date.UTC(y,mo,Math.min(dd,last))).toISOString().slice(0,10);
 }
 function daysTo(a,b){ var x=String(a).split("-"), y=String(b).split("-"); return Math.round((Date.UTC(+y[0],+y[1]-1,+y[2])-Date.UTC(+x[0],+x[1]-1,+x[2]))/864e5); }
 /* the warranty of one line: {m, end, left, ok, txt (app text), pt (printed text)}; null when none was given */
 function wInfo(d,l){
  var m=Math.round(+l[5]||0); if(!(m>0)) return null;
  if(d.ty==="Q") return {m:m,end:"",left:null,ok:true,txt:T(m+" മാസം വാറണ്ടി",m+" months warranty"),pt:m+" months"};
  var end=addMonths(d.d,m), left=daysTo(today(),end), ok=left>=0;
  return {m:m,end:end,left:left,ok:ok,
   txt:ok?T(m+" മാസം വാറണ്ടി · "+dm(end)+" വരെ ("+left+" ദിവസം ബാക്കി)",m+" months warranty · valid till "+dm(end)+" ("+left+" days left)"):T("വാറണ്ടി കഴിഞ്ഞു · "+dm(end)+" ന് അവസാനിച്ചു",m+" months warranty · over on "+dm(end)),
   pt:m+" months (valid till "+dm(end)+")"};
 }

 /* ---------- business details printed on the document ---------- */
 function biz(){
  var b=(typeof db!=="undefined"&&db.business)||{}, u=null; try{ u=getCurrentUser(); }catch(e){}
  var nm=(b.name&&b.name!=="Your Business Name")?b.name:"";
  return {name:nm||SH.cfg("name","")||"", addr:b.address||"", ph:[b.phone,b.phone2].filter(Boolean).join(" / ")||(u&&u.mobile)||"",
   gstin:String(b.gstin||SH.cfg("gstin","")||"").replace(/\s/g,"").toUpperCase(), upi:b.upiId||"", gstDef:+b.gstDef||0, split:!!b.gstSplit, auto:!!b.gstAuto};
 }

 /* ---------- documents from the book ---------- */
 function calcDoc(d){
  var sub=0; (d.L||[]).forEach(function(l){ sub+=r2((+l[1]||0)*(+l[3]||0)); });
  var dc=Math.min(Math.max(0,+d.dc||0),sub), base=r2(sub-dc), gp=+d.gp>0?+d.gp:0, gst=r2(base*gp/100), raw=r2(base+gst), tot=Math.round(raw);
  d.sub=r2(sub); d.disc=dc; d.base=base; d.gpct=gp; d.gst=gst; d.ro=r2(tot-raw); d.total=tot;
  var paid=0; (d.pays||[]).forEach(function(p){ paid+=+p.x.a||0; }); d.paid=r2(paid); d.bal=r2(tot-paid);
  return d;
 }
 function scan(){
  var by={}, pay={}, del={}, conv={};
  SH.calc().live.forEach(function(r){
   var x=r.x; if(r.k!=="o"||!x) return;
   if(x.t==="doc"){ var c=by[x.id]; if(!c||(+x.v||0)>(+c.x.v||0)||((+x.v||0)===(+c.x.v||0)&&r.ts>c.ts)) by[x.id]=r; }
   else if(x.t==="dp") (pay[x.doc]=pay[x.doc]||[]).push(r);
   else if(x.t==="dd") del[x.doc]=1;
  });
  var all=Object.keys(by).map(function(id){ return by[id]; }), list=[];
  all.forEach(function(r){ if(!del[r.x.id]&&r.x.fr) conv[r.x.fr]=1; });
  all.forEach(function(r){
   if(del[r.x.id]) return;
   var d=Object.assign({},r.x,{rid:r.id,d:r.d,ts:r.ts,L:r.x.L||[]});
   d.pays=(pay[d.id]||[]).sort(function(a,b){ return a.d<b.d?-1:a.d>b.d?1:(a.ts<b.ts?-1:1); });
   d.conv=!!conv[d.id]; calcDoc(d); list.push(d);
  });
  list.sort(function(a,b){ return a.d<b.d?1:a.d>b.d?-1:(a.ts<b.ts?1:-1); });
  return {list:list,all:all};
 }
 function get(id){ var L=scan().list; for(var i=0;i<L.length;i++) if(L[i].id===id) return L[i]; return null; }
 function nextNo(ty){
  var mx=0, re=new RegExp("^"+PRE[ty]+"-(\\d+)$");
  scan().all.forEach(function(r){ if(r.x.ty!==ty) return; var m=re.exec(r.x.no||""); if(m&&+m[1]>mx) mx=+m[1]; });
  return PRE[ty]+"-"+("0000"+(mx+1)).slice(-4);
 }
 function status(d){
  if(d.ty==="Q"){
   if(d.conv) return {k:"c",t:T("ഇൻവോയ്സ് ആക്കി","Made invoice")};
   if(d.vu&&d.vu<today()) return {k:"x",t:T("കാലാവധി കഴിഞ്ഞു","Expired")};
   return {k:"o",t:T("തുറന്നത്","Open")};
  }
  return d.bal<=0.5?{k:"p",t:T("പണം കിട്ടി","Paid")}:{k:"d",t:T("ബാക്കി ","Due ")+mny(d.bal)};
 }
 function known(){
  var M={}, ar=scan().list.slice().reverse();
  ar.forEach(function(d){ d.L.forEach(function(l){ if(l[0]){ var k=String(l[0]).toLowerCase(); M[k]={n:l[0],u:l[2],r:l[3],w:+l[5]||(M[k]&&M[k].w)||0}; } }); });
  try{ SH.products().forEach(function(p){ var k=String(p.n).toLowerCase(); if(p.pr&&!M[k]) M[k]={n:p.n,u:p.u||"",r:p.pr}; }); }catch(e){}
  return M;
 }
 function custs(){
  var M={}; scan().list.slice().reverse().forEach(function(d){ if(d.cn) M[d.cn.toLowerCase()]={n:d.cn,m:d.cm||"",a:d.ca||"",g:d.cg||""}; });
  return M;
 }

 /* ---------- layer ---------- */
 function css(){
  if($("tdCss")) return;
  var R="@@input,@@select,@@textarea{width:100%;font:inherit;font-size:17px;padding:11px;border:2px solid #b7cbd6;border-radius:12px;background:#fff;color:#12303f;box-sizing:border-box}"+
   "@@label{display:block;font-size:14px;font-weight:700;margin:10px 0 4px;color:#35566a}"+
   "@@.tdBtn{display:block;width:100%;border:0;border-radius:14px;padding:14px;font-size:18px;font-weight:800;background:#0b6b78;color:#fff;margin-top:10px}"+
   "@@.tdBtn.g{background:#dce9ef;color:#12303f}@@.tdBtn.r{background:#fde8e6;color:#a12d2d}@@.tdBtn.s{padding:9px 12px;font-size:15px;display:inline-block;width:auto;margin:4px 4px 0 0}"+
   "@@.tdChip{display:inline-block;border:2px solid #b7cbd6;border-radius:999px;padding:8px 13px;margin:4px 6px 0 0;font-size:15px;font-weight:700;background:#fff;color:#12303f}"+
   "@@.tdChip.on{background:#0b6b78;border-color:#0b6b78;color:#fff}"+
   "@@.tdC{background:#fff;border-radius:16px;padding:14px;margin:10px 0;box-shadow:0 2px 8px #0002}"+
   "@@.tdG3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}@@.tdG3 label{font-size:12px}"+
   "@@.tdRow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid #e3eef3;font-size:16px}"+
   "@@.tdM{color:#5b7787;font-size:13px}@@.tdX{border:0;background:#fde8e6;color:#a12d2d;border-radius:8px;padding:5px 10px;font-weight:800;font-size:15px}"+
   "@@.tdTot{font-size:26px;font-weight:900;color:#0b6b78}"+
   "@@.tdSt{border-radius:8px;padding:2px 8px;font-size:12px;font-weight:800;background:#dce9ef;white-space:nowrap}@@.tdSt.p{background:#d9f2e1;color:#157a3a}@@.tdSt.d{background:#fde8e6;color:#a12d2d}@@.tdSt.x{background:#fdf0d4;color:#8a5a00}"+
   "@@.tdLn{border:2px solid #dce9ef;border-radius:14px;padding:10px;margin:8px 0}";
  var s=document.createElement("style"); s.id="tdCss";
  s.textContent="#tcDocs{position:fixed;inset:0;z-index:72;background:#eef3f7;overflow:auto;-webkit-overflow-scrolling:touch;color:#12303f}"+
   "#tcDocs .tdH{position:sticky;top:0;z-index:5;background:#0b5d7a;color:#fff;padding:10px 12px;display:flex;align-items:center;gap:10px}"+
   "#tcDocs .tdH b{flex:1;font-size:18px}#tcDocs .tdH button{background:#ffffff26;color:#fff;border:0;border-radius:10px;padding:9px 13px;font-size:16px}"+
   "#tcDocs .tdB{padding:12px 12px 90px;max-width:640px;margin:0 auto}"+
   "#tdSheet{position:fixed;inset:0;z-index:76;background:#0008;display:flex;align-items:flex-end;justify-content:center;color:#12303f}"+
   "#tdSheet>div{background:#fff;width:100%;max-width:640px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:16px 16px 28px}"+
   R.replace(/@@/g,"#tcDocs ")+R.replace(/@@/g,"#tdSheet ");
  document.head.appendChild(s);
 }
 function build(){
  css();
  var d=document.createElement("div"); d.id="tcDocs"; d.className="hidden";
  d.innerHTML='<div class="tdH"><button id="tdBackB" onclick="tdBack()">←</button><b id="tdTitle"></b></div><div class="tdB" id="tdBody"></div>';
  document.body.appendChild(d);
 }
 function sheet(html){
  closeSheet();
  var d=document.createElement("div"); d.id="tdSheet"; d.innerHTML="<div>"+html+"</div>";
  d.addEventListener("click",function(ev){ if(ev.target===d) closeSheet(); });
  document.body.appendChild(d);
 }
 function closeSheet(){ var d=$("tdSheet"); if(d) d.remove(); }
 window.tdCloseSheet=closeSheet;
 function render(){
  if(!$("tcDocs")) build(); closeSheet();
  var tt={list:T("ക്വട്ടേഷൻ / ഇൻവോയ്സ് / ബിൽ","Quotation / Invoice / Bill"),form:"",view:"",items:T("എന്റെ സാധനങ്ങൾ","My items"),warranty:T("വാറണ്ടി / സീരിയൽ നമ്പർ","Warranty / serial no.")};
  var title=tt[D.screen]; if(D.screen==="form"&&F) title=(F.id?T("മാറ്റുക: ","Edit: "):T("പുതിയ ","New "))+tn(F.ty);
  if(D.screen==="view"){ var d=get(D.params.id); title=d?tn(d.ty)+" "+d.no:""; }
  $("tdTitle").textContent=title; $("tdBackB").textContent=D.screen==="list"?"✕":"←";
  $("tdBody").innerHTML=""; $("tcDocs").scrollTop=0;
  try{ (SC[D.screen]||SC.list)(D.params); }catch(e){ $("tdBody").innerHTML='<div class="tdC">'+E(T("സ്ക്രീൻ തുറക്കാൻ കഴിഞ്ഞില്ല","Could not open this screen"))+'</div>'; if(window.console) console.error("tc-docs",e); }
 }
 function go(name,params){ D.screen=name; D.params=params||{}; render(); }
 function openDocs(screen,params){
  if(!$("tcDocs")) build();
  if(!D.open){ D.open=true; $("tcDocs").classList.remove("hidden"); document.body.style.overflow="hidden"; try{ history.pushState({tcDocs:1},"",location.href); }catch(e){} }
  go(screen||"list",params);
 }
 function closeDocs(){
  if(!D.open) return;
  D.open=false; var d=$("tcDocs"); if(d) d.classList.add("hidden"); closeSheet();
  if(!window.__tcShopUi||!window.__tcShopUi.isOpen()) document.body.style.overflow="";
  try{ if(history.state&&history.state.tcDocs) history.back(); }catch(e){}
 }
 window.tcDocsOpen=function(screen,params){
  var m=document.querySelector("#modal");
  if(m&&!m.classList.contains("hidden")){ try{ closeModal(); }catch(e){} setTimeout(function(){ openDocs(screen,params); },420); }
  else openDocs(screen,params);
 };
 window.tdBack=function(){
  var s=D.screen;
  if(s==="list") closeDocs();
  else if(s==="form"&&D.params.id) go("view",{id:D.params.id});
  else if(s==="items"&&D.params.fromForm&&F) go("form",F.id?{id:F.id}:{});
  else if(s==="view"&&D.back==="warranty"){ D.back=""; go("warranty"); }
  else go("list");
 };
 window.addEventListener("popstate",function(){
  if(!D.open) return;
  if(history.state&&history.state.tcDocs) return;
  if(D.screen!=="list"){ try{ history.pushState({tcDocs:1},"",location.href); }catch(e){} go("list"); }
  else{ D.open=false; var d=$("tcDocs"); if(d) d.classList.add("hidden"); closeSheet(); if(!window.__tcShopUi||!window.__tcShopUi.isOpen()) document.body.style.overflow=""; }
 });

 /* ---------- list ---------- */
 function rowsHtml(){
  var L=scan().list, q=D.q.toLowerCase();
  L=L.filter(function(d){ return (D.tab==="A"||d.ty===D.tab)&&(!q||(d.cn||"").toLowerCase().indexOf(q)>=0||(d.no||"").toLowerCase().indexOf(q)>=0||(d.tt||"").toLowerCase().indexOf(q)>=0); });
  if(!L.length) return '<div class="tdC tdM" style="text-align:center">'+E(T("ഒന്നുമില്ല","Nothing here yet"))+'</div>';
  return '<div class="tdC" style="padding:4px 14px">'+L.map(function(d){
   var s=status(d);
   return '<div class="tdRow" onclick="tdOpen(\''+d.id+'\')" style="cursor:pointer"><div style="min-width:0"><b>'+E(d.no)+'</b> · '+E(d.cn)+'<div class="tdM">'+E(tn(d.ty))+' · '+E(H.dmy?H.dmy(d.d):d.d.split("-").reverse().join("-"))+(d.tt?' · '+E(d.tt):'')+'</div></div>'+
    '<div style="text-align:right"><b>'+mny(d.total)+'</b><div><span class="tdSt '+s.k+'">'+E(s.t)+'</span></div></div></div>';
  }).join("")+'</div>';
 }
 SC.list=function(){
  var L=scan().list, due=0, n=0;
  L.forEach(function(d){ if(d.ty!=="Q"&&d.bal>0.5){ due+=d.bal; n++; } });
  $("tdBody").innerHTML=
   '<div class="tdC"><div class="tdG3" style="grid-template-columns:1fr">'+
   '<button class="tdBtn" style="background:#2c5aa0;margin-top:0" onclick="tdNew(\'Q\')">➕ '+E(T("പുതിയ ക്വട്ടേഷൻ","New quotation"))+'</button>'+
   '<button class="tdBtn" style="background:#c9740c" onclick="tdNew(\'I\')">➕ '+E(T("പുതിയ ഇൻവോയ്സ്","New invoice"))+'</button>'+
   '<button class="tdBtn" style="background:#1a8f4a" onclick="tdNew(\'B\')">➕ '+E(T("പുതിയ ബിൽ (പണം കിട്ടിയത്)","New bill (paid now)"))+'</button></div></div>'+
   (n?'<div class="tdC" style="background:#fdf0d4"><b>'+E(T("കിട്ടാനുള്ള ബാക്കി: ","To get: "))+mny(due)+'</b> <span class="tdM">('+n+')</span></div>':'')+
   '<div>'+chip(D.tab==="A","tdTab('A')",T("എല്ലാം","All"))+chip(D.tab==="Q","tdTab('Q')",tn("Q"))+chip(D.tab==="I","tdTab('I')",tn("I"))+chip(D.tab==="B","tdTab('B')",tn("B"))+'</div>'+
   '<input id="tdQ" placeholder="'+E(T("പേര് / നമ്പർ തിരയുക","Search name / number"))+'" value="'+E(D.q)+'" oninput="tdSearch(this.value)" style="margin-top:8px">'+
   '<div id="tdRows">'+rowsHtml()+'</div>'+
   '<button class="tdBtn g" onclick="tdWarr()">🔖 '+E(T("വാറണ്ടി / സീരിയൽ നമ്പർ തിരയുക","Warranty / serial no. search"))+'</button>'+
   (itemsOn()?'<button class="tdBtn g" onclick="tdItems()">📦 '+E(T("എന്റെ സാധനങ്ങൾ (ലിസ്റ്റ് / സ്റ്റോക്ക്)","My items (list / stock)"))+' <span class="tdM">('+myItems().length+')</span></button>':'')+
   '<button class="tdBtn g" onclick="tdSetOpen()">⚙ '+E(T("എന്റെ വിവരങ്ങൾ / GST","My details / GST"))+'</button>';
 };
 window.tdTab=function(t){ D.tab=t; render(); };
 window.tdSearch=function(v){ D.q=v||""; var r=$("tdRows"); if(r) r.innerHTML=rowsHtml(); };
 window.tdOpen=function(id){ D.back=""; go("view",{id:id}); };

 /* ---------- form ---------- */
 function newF(ty){
  var b=biz(), auto=b.auto&&b.gstDef>0;
  return {id:"",v:0,ty:ty,no:"",cn:"",cm:"",ca:"",cg:"",tt:"",dt:today(),vu:H.addDays(today(),15),L:[["",1,"",""]],dc:"",gon:auto,gp:auto?b.gstDef:"",ad:"",
   nt:ty==="Q"?"Valid for 15 days. Advance payment required before the work starts.":"",pay:ty==="B"?"full":"none",pm:"C",pa:""};
 }
 window.tdNew=function(ty){ F=newF(ty); go("form",{}); };
 window.tdEdit=function(id){
  var d=get(id); if(!d) return;
  F={id:d.id,v:+d.v||1,ty:d.ty,no:d.no,cn:d.cn||"",cm:d.cm||"",ca:d.ca||"",cg:d.cg||"",tt:d.tt||"",dt:d.d,vu:d.vu||"",L:d.L.map(function(l){ return l.slice(); }),dc:d.dc||"",
   gon:+d.gp>0,gp:+d.gp>0?d.gp:"",ad:d.ad||"",nt:d.nt||"",fr:d.fr||"",pay:"none",pm:"C",pa:""};
  go("form",{id:id});
 };
 function tmp(){
  return calcDoc({L:F.L.map(function(l){ return [l[0],l[1],l[2],l[3]]; }),dc:F.dc,gp:F.gon?F.gp:0,pays:[]});
 }
 function totalsHtml(){
  var c=tmp();
  return '<div class="tdRow"><span>'+E(T("ഉപ-ആകെ","Subtotal"))+'</span><b>'+mny(c.sub)+'</b></div>'+
   (c.disc?'<div class="tdRow"><span>'+E(T("ഡിസ്കൗണ്ട്","Discount"))+'</span><b>- '+mny(c.disc)+'</b></div>':'')+
   (c.gst?'<div class="tdRow"><span>GST @ '+c.gpct+'%</span><b>+ '+mny(c.gst)+'</b></div>':'')+
   (c.ro?'<div class="tdRow"><span>'+E(T("റൗണ്ട് ഓഫ്","Round off"))+'</span><b>'+(c.ro>0?"+ ":"- ")+mny(Math.abs(c.ro))+'</b></div>':'')+
   '<div class="tdRow"><span><b>'+E(T("ആകെ","Total"))+'</b></span><span class="tdTot">'+mny(c.total)+'</span></div>';
 }
 function snBox(i){
  var l=F.L[i], q=F.ty!=="Q", has=!!(l[4]||+l[5]>0);
  return '<details style="margin-top:8px"'+(has?' open':'')+'><summary style="font-weight:700;font-size:14px;color:#35566a">🔖 '+E(q?T("സീരിയൽ നമ്പർ / വാറണ്ടി (വേണമെങ്കിൽ)","Serial no. / warranty (optional)"):T("വാറണ്ടി (വേണമെങ്കിൽ)","Warranty (optional)"))+'</summary>'+
   (q?'<label>'+E(T("സീരിയൽ നമ്പർ (ഒന്നിലധികം ഉണ്ടെങ്കിൽ കോമ ഇട്ട് എഴുതുക)","Serial no. (for several, separate with commas)"))+'</label><input id="tds'+i+'" value="'+E(l[4]||"")+'" placeholder="'+E(EX(["ഉദാ: HK2201A, HK2201B","e.g. HK2201A, HK2201B"],["ഉദാ: ബാറ്ററി / ഭാഗം നമ്പർ","e.g. battery / part no."],["ഉദാ: ഫിൽട്ടർ സീരിയൽ നമ്പർ","e.g. filter serial no."],["ഉദാ: സാധനത്തിന്റെ സീരിയൽ നമ്പർ","e.g. the item's serial no."]))+'" oninput="tdL('+i+',4,this.value)">':'')+
   '<label>'+E(T("വാറണ്ടി (മാസം)","Warranty (months)"))+'</label><input id="tdw'+i+'" type="number" inputmode="numeric" value="'+E(l[5]||"")+'" placeholder="e.g. 12" oninput="tdL('+i+',5,this.value)">'+
   '<div>'+[6,12,24,36].map(function(m){ return '<span class="tdChip" onclick="tdWm('+i+','+m+')">'+m+'</span>'; }).join("")+'<span class="tdChip" onclick="tdWm('+i+',0)">'+E(T("ഇല്ല","None"))+'</span></div></details>';
 }
 window.tdWm=function(i,m){ if(!F||!F.L[i]) return; F.L[i][5]=m||""; var e=$("tdw"+i); if(e) e.value=m||""; };
 function lineHtml(i){
  var l=F.L[i];
  return '<div class="tdLn"><div style="display:flex;justify-content:space-between;align-items:center"><b>'+(i+1)+'</b>'+(F.L.length>1?'<button class="tdX" onclick="tdDel('+i+')">✕</button>':'')+'</div>'+
   '<input id="tdd'+i+'" list="tdDl" placeholder="'+E(EX(["വിവരണം (ഉദാ: CCTV ക്യാമറ, പൈപ്പ് ഫിറ്റിംഗ്, ജോലിക്കൂലി)","Item / work (e.g. CCTV camera, labour)"],["വിവരണം (ഉദാ: ബ്രേക്ക് പാഡ്, ഓയിൽ, ജോലിക്കൂലി)","Item / work (e.g. brake pad, oil, labour)"],["വിവരണം (ഉദാ: ഫിഷ് ഫുഡ്, ഫിൽട്ടർ, ഡെലിവറി)","Item (e.g. fish food, filter, delivery)"],["വിവരണം (ഉദാ: സാധനത്തിന്റെ പേര്, ഡെലിവറി ചാർജ്)","Item (e.g. item name, delivery charge)"]))+'" value="'+E(l[0])+'" oninput="tdL('+i+',0,this.value)" onchange="tdPick('+i+',this.value)">'+
   '<div class="tdG3"><div><label>'+E(T("എണ്ണം","Qty"))+'</label><input id="tdq'+i+'" type="number" inputmode="decimal" value="'+E(l[1])+'" oninput="tdL('+i+',1,this.value)"></div>'+
   '<div><label>'+E(T("യൂണിറ്റ്","Unit"))+'</label><input id="tdu'+i+'" value="'+E(l[2])+'" placeholder="nos/m/hr" oninput="tdL('+i+',2,this.value)"></div>'+
   '<div><label>'+E(T("നിരക്ക്","Rate"))+'</label><input id="tdr'+i+'" type="number" inputmode="decimal" value="'+E(l[3])+'" oninput="tdL('+i+',3,this.value)"></div></div>'+
   '<div class="tdM" id="tdA'+i+'" style="text-align:right;margin-top:4px">'+lineAmt(i)+'</div>'+snBox(i)+'</div>';
 }
 function lineAmt(i){ var l=F.L[i], a=r2((+l[1]||0)*(+l[3]||0)); return a?mny(a):""; }
 SC.form=function(){
  var K=known(), C=custs(), edit=!!F.id, isQ=F.ty==="Q", b=biz();
  var dl='<datalist id="tdDl">'+Object.keys(K).slice(-300).map(function(k){ return '<option value="'+E(K[k].n)+'">'; }).join("")+'</datalist>'+
   '<datalist id="tdCl">'+Object.keys(C).slice(-200).map(function(k){ return '<option value="'+E(C[k].n)+'">'; }).join("")+'</datalist>';
  $("tdBody").innerHTML=dl+
   '<div class="tdC"><label style="margin-top:0">'+E(T("കസ്റ്റമറുടെ പേര്","Customer name"))+'</label><input id="tdcn" list="tdCl" value="'+E(F.cn)+'" oninput="tdS(\'cn\',this.value)" onchange="tdCust(this.value)">'+
   '<label>'+E(T("മൊബൈൽ (ഓപ്ഷണൽ)","Mobile (optional)"))+'</label><input id="tdcm" type="tel" inputmode="tel" value="'+E(F.cm)+'" oninput="tdS(\'cm\',this.value)">'+
   '<label>'+E(T("വിലാസം / സ്ഥലം (ഓപ്ഷണൽ)","Address / site (optional)"))+'</label><input id="tdca" value="'+E(F.ca)+'" oninput="tdS(\'ca\',this.value)">'+
   '<label>'+E(T("ജോലിയുടെ പേര് (ഓപ്ഷണൽ)","Work / subject (optional)"))+'</label><input id="tdtt" value="'+E(F.tt)+'" placeholder="'+E(EX(["ഉദാ: 4 ക്യാമറ CCTV സെറ്റ്","e.g. 4-camera CCTV set"],["ഉദാ: എൻജിൻ ഓയിൽ സർവീസ്","e.g. engine oil service"],["ഉദാ: ടാങ്ക് സെറ്റപ്പ്","e.g. tank set-up"],["ഉദാ: ഓർഡർ നമ്പർ / വിഷയം","e.g. order no. / subject"]))+'" oninput="tdS(\'tt\',this.value)">'+
   '<label>'+E(T("തീയതി","Date"))+'</label><input type="date" id="tddt" value="'+E(F.dt)+'" oninput="tdS(\'dt\',this.value)">'+
   (isQ?'<label>'+E(T("ക്വട്ടേഷൻ ബാധകമായ അവസാന തീയതി","Valid until"))+'</label><input type="date" id="tdvu" value="'+E(F.vu)+'" oninput="tdS(\'vu\',this.value)">':'')+'</div>'+
   '<div class="tdC"><b>'+E(T("ഇനങ്ങൾ","Items"))+'</b><div id="tdLines">'+F.L.map(function(l,i){ return lineHtml(i); }).join("")+'</div>'+
   '<button class="tdBtn g s" onclick="tdAdd()">➕ '+E(T("ഇനം ചേർക്കുക","Add item"))+'</button>'+
   (myItems().length||itemsOn()?'<button class="tdBtn s" onclick="tdPkOpen()">📦 '+E(T("എന്റെ ലിസ്റ്റിൽ നിന്ന്","From my list"))+'</button>':'')+
   (F.ty!=="Q"&&SH.products().length?'<div class="tdM" style="margin-top:6px">📦 '+E(T("സ്റ്റോക്കിലെ ഇനങ്ങൾ സെയിൽസിൽ ചേരും, സ്റ്റോക്ക് കുറയും. കിട്ടാത്ത തുക 'കടം / കിട്ടാനുള്ളത്' ൽ വരും.","Items from your stock go to Sales and reduce the stock. Money not received goes to 'Credit & dues'."))+'</div>':'')+'</div>'+
   '<div class="tdC"><label style="margin-top:0">'+E(T("ഡിസ്കൗണ്ട് (രൂപ, ഓപ്ഷണൽ)","Discount (Rs., optional)"))+'</label><input id="tddc" type="number" inputmode="decimal" value="'+E(F.dc)+'" oninput="tdS(\'dc\',this.value);tdTotals()">'+
   '<label>GST</label><div>'+chip(!F.gon,"tdGon(0)",T("GST ഇല്ല","No GST"))+chip(F.gon,"tdGon(1)",T("GST ഉണ്ട് (മുകളിൽ ചേർക്കും)","GST (added on top)"))+'</div>'+
   (F.gon?'<label>GST %</label><input id="tdgp" type="number" inputmode="decimal" value="'+E(F.gp)+'" placeholder="e.g. 18" oninput="tdS(\'gp\',this.value);tdTotals()">'+
    '<label>'+E(T("കസ്റ്റമറുടെ GSTIN (ഓപ്ഷണൽ)","Customer GSTIN (optional)"))+'</label><input id="tdcg" value="'+E(F.cg)+'" oninput="tdS(\'cg\',this.value)">'+
    (b.gstin?'':'<div class="tdM" style="color:#a12d2d">'+E(T("നിങ്ങളുടെ GSTIN ഇല്ല: താഴെ 'എന്റെ വിവരങ്ങൾ / GST' ൽ ചേർക്കുക.","Your GSTIN is not set: add it under 'My details / GST'."))+'</div>'):'')+
   '<div id="tdTot" style="margin-top:8px">'+totalsHtml()+'</div></div>'+
   (isQ?'<div class="tdC"><label style="margin-top:0">'+E(T("അഡ്വാൻസ് ആവശ്യപ്പെടുന്നത് (രൂപ, ഓപ്ഷണൽ)","Advance asked (Rs., optional)"))+'</label><input id="tdad" type="number" inputmode="decimal" value="'+E(F.ad)+'" oninput="tdS(\'ad\',this.value)"></div>':'')+
   (!edit&&!isQ?'<div class="tdC"><b>'+E(T("പണം","Payment"))+'</b><div>'+chip(F.pay==="full","tdPay('full')",T("മുഴുവൻ കിട്ടി","Paid in full"))+chip(F.pay==="part","tdPay('part')",T("കുറച്ച് കിട്ടി","Part paid"))+chip(F.pay==="none","tdPay('none')",T("ഇനിയും കിട്ടിയില്ല","Not paid yet"))+'</div>'+
    (F.pay!=="none"?'<div>'+chip(F.pm==="C","tdPm('C')",T("ക്യാഷ്","Cash"))+chip(F.pm==="U","tdPm('U')","UPI")+chip(F.pm==="B","tdPm('B')",T("ബാങ്ക്","Bank"))+'</div>':'')+
    (F.pay==="part"?'<label>'+E(T("ഇപ്പോൾ കിട്ടിയ തുക","Amount received now"))+'</label><input id="tdpa" type="number" inputmode="decimal" value="'+E(F.pa)+'" oninput="tdS(\'pa\',this.value)">':'')+'</div>':'')+
   '<div class="tdC"><label style="margin-top:0">'+E(T("കുറിപ്പ് / നിബന്ധനകൾ (ബില്ലിൽ വരും)","Notes / terms (printed)"))+'</label><textarea id="tdnt" rows="3" oninput="tdS(\'nt\',this.value)">'+E(F.nt)+'</textarea></div>'+
   '<button class="tdBtn" onclick="tdSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>';
 };
 window.tdS=function(k,v){ if(F) F[k]=v; };
 window.tdL=function(i,f,v){ if(!F||!F.L[i]) return; F.L[i][f]=v; var a=$("tdA"+i); if(a) a.textContent=lineAmt(i); tdTotals(); };
 window.tdTotals=function(){ var t=$("tdTot"); if(t&&F) t.innerHTML=totalsHtml(); };
 window.tdAdd=function(){ F.L.push(["",1,"",""]); SC.form(); var e=$("tdd"+(F.L.length-1)); if(e) e.focus(); };
 window.tdDel=function(i){ F.L.splice(i,1); if(!F.L.length) F.L.push(["",1,"",""]); SC.form(); };
 window.tdGon=function(on){
  F.gon=!!on; if(on&&!(+F.gp>0)){ var b=biz(); if(b.gstDef>0) F.gp=b.gstDef; }
  SC.form();
 };
 window.tdPay=function(p){ F.pay=p; SC.form(); };
 window.tdPm=function(m){ F.pm=m; SC.form(); };
 window.tdPick=function(i,v){
  var k=known()[String(v||"").toLowerCase()]; if(!k||!F||!F.L[i]) return;
  var l=F.L[i];
  if(String(l[3])===""){ l[3]=k.r; var r=$("tdr"+i); if(r) r.value=k.r; }
  if(String(l[2])===""&&k.u){ l[2]=k.u; var u=$("tdu"+i); if(u) u.value=k.u; }
  if(!(+l[5]>0)&&k.w){ l[5]=k.w; var w=$("tdw"+i); if(w) w.value=k.w; }
  var a=$("tdA"+i); if(a) a.textContent=lineAmt(i); tdTotals();
 };
 window.tdCust=function(v){
  var c=custs()[String(v||"").toLowerCase()]; if(!c||!F) return;
  [["cm","tdcm",c.m],["ca","tdca",c.a],["cg","tdcg",c.g]].forEach(function(p){ if(!F[p[0]]&&p[2]){ F[p[0]]=p[2]; var e=$(p[1]); if(e) e.value=p[2]; } });
 };
 function saveDoc(){
  var cn=cap(F.cn,60); if(!cn){ say(T("കസ്റ്റമറുടെ പേര് ചേർക്കുക","Add the customer's name")); return null; }
  var L=[]; F.L.forEach(function(l){
   var t=cap(l[0],80); if(!t) return;
   var a=[t,r2(l[1]===""?1:+l[1]),cap(l[2],10),r2(+l[3]||0)], sn=F.ty==="Q"?"":snClean(l[4]), wm=Math.round(+l[5]||0); if(wm<0||wm>240) wm=0;
   if(sn||wm>0){ a.push(sn); if(wm>0) a.push(wm); }
   L.push(a);
  });
  if(!L.length){ say(T("കുറഞ്ഞത് ഒരു ഇനം വേണം","Add at least one item")); return null; }
  if(L.some(function(l){ return !(l[1]>0); })){ say(T("എണ്ണം 0 ആകരുത്","Quantity cannot be 0")); return null; }
  var gp=F.gon?(+F.gp||0):0;
  if(F.gon&&!(gp>0&&gp<=100)){ say(T("GST % ചേർക്കുക (ഉദാ: 18)","Enter the GST % (for example 18)")); return null; }
  var cg=String(F.cg||"").replace(/\s/g,"").toUpperCase();
  if(cg&&!GSTIN_RE.test(cg)){ say(T("കസ്റ്റമറുടെ GSTIN ശരിയല്ല (15 അക്ഷരം)","Customer GSTIN should be 15 characters")); return null; }
  var x={t:"doc",id:F.id||H.uid(),v:(+F.v||0)+1,ty:F.ty,no:F.no||nextNo(F.ty),cn:cn,L:L};
  if(cap(F.cm,15)) x.cm=cap(F.cm,15); if(cap(F.ca,100)) x.ca=cap(F.ca,100); if(cg) x.cg=cg; if(cap(F.tt,80)) x.tt=cap(F.tt,80);
  if(+F.dc>0) x.dc=r2(F.dc); if(gp>0) x.gp=gp;
  if(F.ty==="Q"){ if(F.vu) x.vu=F.vu; if(+F.ad>0) x.ad=r2(F.ad); }
  if(cap(F.nt,300)) x.nt=String(F.nt).trim().slice(0,300);
  if(F.fr) x.fr=F.fr;
  if(JSON.stringify(x).length>MAXB){ say(T("ഇത് വളരെ നീളമുള്ളതാണ്: ഇനങ്ങൾ കുറയ്ക്കുക അല്ലെങ്കിൽ രണ്ട് രേഖകളായി ഉണ്ടാക്കുക","Too long: remove some items or make two documents")); return null; }
  return x;
 }
 /* serial numbers of this document that are already on another invoice / bill */
 function dupSn(x){
  if(x.ty==="Q") return [];
  var mine={}; x.L.forEach(function(l){ pieces(l[4]).forEach(function(p){ mine[normSn(p)]=p; }); });
  var out=[]; if(!Object.keys(mine).length) return out;
  scan().list.forEach(function(d){ if(d.ty==="Q"||d.id===x.id) return; d.L.forEach(function(l){ pieces(l[4]).forEach(function(p){ var k=normSn(p); if(mine[k]){ out.push(mine[k]+" ("+d.no+")"); delete mine[k]; } }); }); });
  return out;
 }
 window.tdSave=function(){
  var x=saveDoc(); if(!x) return;
  var dt=/^\d{4}-\d{2}-\d{2}$/.test(F.dt||"")?F.dt:today(), isNew=!F.id;
  SH.add("o",x,dt);
  if(isNew&&F.ty!=="Q"&&F.pay!=="none"){
   var tot=calcDoc({L:x.L,dc:x.dc,gp:x.gp,pays:[]}).total, a=F.pay==="full"?tot:Math.min(tot,r2(F.pa));
   if(a>0) SH.add("o",{t:"dp",doc:x.id,a:a,pm:F.pm},dt);
  }
  hook(x.id);
  var dup=dupSn(x);
  say(T("സേവ് ചെയ്തു","Saved")+(dup.length?T(" · ⚠ ഈ സീരിയൽ നമ്പർ മറ്റൊരു ബില്ലിലും ഉണ്ട്: "," · ⚠ This serial no. is on another bill: ")+dup.join(", "):"")); F=null; go("view",{id:x.id});
 };

 /* ---------- my items: the list a quotation / bill picks from ---------- */
 function bizType(){ try{ return window.__tcBizOnScreen?String(window.__tcBizOnScreen()||""):""; }catch(e){ return ""; } }
 /* a shop / workshop has its own stock screens; every other business gets this small list */
 function itemsOn(){ var b=bizType(); if(b==="shop"||b==="workshop") return false; var k=SH.kind(); return k!=="aquarium"&&k!=="general"&&k!=="workshop"; }
 function myItems(){ try{ return SH.products({noRc:true}); }catch(e){ return []; } }
 function itemSub(p){
  var s=E(p.pr>0?mny(p.pr)+(p.u?" / "+p.u:""):T("നിരക്ക് കൊടുത്തിട്ടില്ല","no rate yet"));
  if(p.stock!=null) s+=' · <span style="'+(p.stock<=0?"color:#a12d2d;font-weight:700":"")+'">'+E(T("സ്റ്റോക്ക് ","stock ")+H.qty(p.stock)+(p.u?" "+p.u:""))+'</span>';
  return s;
 }
 function itemRows(){
  var q=(D.iq||"").toLowerCase(), L=myItems().filter(function(p){ return !q||p.n.toLowerCase().indexOf(q)>=0; });
  if(!L.length) return '<div class="tdC tdM" style="text-align:center">'+E(T("ഒന്നുമില്ല","Nothing here yet"))+'</div>';
  return '<div class="tdC" style="padding:4px 14px">'+L.map(function(p){
   return '<div class="tdRow" onclick="tdItemOpen(\''+p.id+'\')" style="cursor:pointer"><div style="min-width:0"><b>'+E(p.n)+'</b><div class="tdM">'+itemSub(p)+'</div></div><span class="tdM">✎</span></div>';
  }).join("")+'</div>';
 }
 SC.items=function(){
  var ex=bizType()==="skilled_work"?T("ഉദാ: CCTV ക്യാമറ, ക്യാമറ വയർ, സ്വിച്ച്, പൈപ്പ്, ടാപ്പ്","e.g. camera, cable, switch, pipe, tap"):T("നിങ്ങൾ ഉപയോഗിക്കുന്ന / വിൽക്കുന്ന സാധനങ്ങൾ","the things you use or sell");
  $("tdBody").innerHTML=
   '<div class="tdC"><div class="tdM" style="font-size:14px;line-height:1.45">'+E(T("ഒരു തവണ ലിസ്റ്റ് ഉണ്ടാക്കിയാൽ മതി ("+ex+"). ക്വട്ടേഷൻ / ബിൽ ഉണ്ടാക്കുമ്പോൾ 'എന്റെ ലിസ്റ്റിൽ നിന്ന്' അമർത്തി ടാപ്പ് ചെയ്ത് ചേർക്കാം. സ്റ്റോക്ക് എണ്ണണമെങ്കിൽ എണ്ണം കൊടുക്കുക: ഇൻവോയ്സ് / ബിൽ ഉണ്ടാക്കുമ്പോൾ സ്റ്റോക്ക് തനിയെ കുറയും.",
    "Make the list once ("+ex+"). When you make a quotation or bill, tap 'From my list' and tap the items. To count stock, give the number in hand: an invoice or bill then reduces it by itself."))+'</div>'+
   '<button class="tdBtn" onclick="tdItemOpen(\'\')">➕ '+E(T("പുതിയ സാധനം","New item"))+'</button>'+
   '<button class="tdBtn g" onclick="tdItemMany()">📝 '+E(T("ഒരുമിച്ച് ഒരുപാട് ചേർക്കുക","Add many at once"))+'</button></div>'+
   (myItems().length>6?'<input id="tdIQ" placeholder="'+E(T("പേര് തിരയുക","Search name"))+'" value="'+E(D.iq)+'" oninput="tdItemSearch(this.value)">':'')+
   '<div id="tdIRows">'+itemRows()+'</div>';
 };
 window.tdItems=function(fromForm){ D.iq=""; go("items",fromForm?{fromForm:1}:{}); };
 window.tdItemSearch=function(v){ D.iq=v||""; var r=$("tdIRows"); if(r) r.innerHTML=itemRows(); };
 window.tdItU=function(u){ var e=$("tiU"); if(e) e.value=u; };
 window.tdItemOpen=function(id){
  var p=id?SH.prod(id):null; if(id&&!p) return;
  var ex=bizType()==="skilled_work"?T("ഉദാ: CCTV ക്യാമറ 2MP","e.g. CCTV camera 2MP"):T("സാധനത്തിന്റെ പേര്","Item name");
  sheet('<b style="font-size:19px">'+E(p?T("സാധനം മാറ്റുക","Edit item"):T("പുതിയ സാധനം","New item"))+'</b>'+
   '<label>'+E(T("പേര്","Name"))+'</label><input id="tiN" value="'+E(p?p.n:"")+'" placeholder="'+E(ex)+'">'+
   '<label>'+E(T("യൂണിറ്റ്","Unit"))+'</label><input id="tiU" value="'+E(p?p.u:"nos")+'" placeholder="nos / m / set">'+
   '<div>'+["nos","m","set","kg","pt","hr"].map(function(u){ return '<span class="tdChip" onclick="tdItU(\''+u+'\')">'+u+'</span>'; }).join("")+'</div>'+
   '<label>'+E(T("വിൽക്കുന്ന നിരക്ക് (ഒരു യൂണിറ്റിന്)","Selling rate (per unit)"))+'</label><input id="tiR" type="number" inputmode="decimal" value="'+E(p&&p.pr>0?p.pr:"")+'">'+
   '<label>'+E(T("വാങ്ങിയ നിരക്ക് (ഓപ്ഷണൽ)","Buying rate (optional)"))+'</label><input id="tiB" type="number" inputmode="decimal" value="'+E(p&&p.ec>0?p.ec:"")+'">'+
   '<label>'+E(T("സ്റ്റോക്കിൽ എത്ര ഉണ്ട് (ഓപ്ഷണൽ)","Stock in hand (optional)"))+'</label><input id="tiS" type="number" inputmode="decimal" value="'+E(p&&p.stock!=null?H.qty(p.stock):"")+'">'+
   '<div class="tdM">'+E(T("ഒഴിച്ചിട്ടാൽ സ്റ്റോക്ക് എണ്ണില്ല (ജോലിക്കൂലി, സർവീസ് ഇങ്ങനെയുള്ളവ).","Leave it empty and the stock is not counted (labour, services)."))+'</div>'+
   '<button class="tdBtn" onclick="tdItemSave(\''+(p?p.id:"")+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>'+
   (p?'<button class="tdBtn r" onclick="tdItemDelAsk(\''+p.id+'\')">🗑 '+E(T("ലിസ്റ്റിൽ നിന്ന് ഒഴിവാക്കുക","Remove from the list"))+'</button>':'')+
   '<button class="tdBtn g" onclick="tdCloseSheet()">'+E(T("വേണ്ട","Cancel"))+'</button>');
 };
 window.tdItemSave=function(id){
  var n=cap(($("tiN")||{}).value,60); if(!n){ say(T("പേര് ചേർക്കുക","Add the name")); return; }
  var u=cap($("tiU").value,10), r=r2(+$("tiR").value||0), ec=r2(+$("tiB").value||0), sv=String($("tiS").value||"").trim(), cnt=sv!==""&&!isNaN(+sv), nq=cnt?+sv:0;
  if(r<0||ec<0||(cnt&&nq<0)){ say(T("തുക 0-ൽ കുറയരുത്","Amounts cannot be below 0")); return; }
  var dup=null; try{ dup=SH.findName(n); }catch(e){}
  if(dup&&dup.id!==id&&!dup.off){ say(T("ഈ പേര് ലിസ്റ്റിൽ ഉണ്ട്","This name is already in the list")); return; }
  if(dup&&dup.off&&dup.id!==id) id=dup.id;   /* an item removed earlier with this name comes back */
  if(!SH.cfg("kind","")&&bizType()!=="shop"&&bizType()!=="workshop") SH.setCfg("kind","skilled");
  var p=id?SH.prod(id):null, x={n:n,u:u,pr:r,ec:ec,off:0};
  if(!p){
   x.t="i"; x.c="Other"; if(cnt) x.oq=nq; else x.nt=1;
   if(!SH.newProduct(x)) return;
  }else{
   x.i=p.id;
   if(!cnt) x.nt=1;
   else if(p.stock==null){ x.nt=0; x.oq=r2(nq-((p.pq||0)-(p.sq||0)-(p.dq||0)+(p.adj||0))); }
   if(!SH.saveProduct(x)) return;
   if(cnt&&p.stock!=null&&Math.abs(nq-p.stock)>0.0005) SH.add("a",{p:p.id,q:r2(nq-p.stock),r:"Stock updated"});
  }
  say(T("സേവ് ചെയ്തു","Saved")); render();
 };
 window.tdItemDelAsk=function(id){
  var p=SH.prod(id); if(!p) return;
  sheet('<b style="font-size:19px">'+E(p.n)+'</b><div style="margin:8px 0">'+E(T("ഈ സാധനം ലിസ്റ്റിൽ നിന്ന് ഒഴിവാക്കണോ? പഴയ ബില്ലുകൾക്ക് ഒരു മാറ്റവും വരില്ല.","Remove this item from the list? Old bills do not change."))+'</div>'+
   '<button class="tdBtn r" onclick="tdItemDel(\''+id+'\')">🗑 '+E(T("ഒഴിവാക്കുക","Remove"))+'</button><button class="tdBtn g" onclick="tdCloseSheet()">'+E(T("വേണ്ട","Cancel"))+'</button>');
 };
 window.tdItemDel=function(id){
  var used=0; try{ used=SH.usage(id); }catch(e){}
  if(!SH.saveProduct(used?{i:id,off:1}:{i:id,dl:1})) return;
  say(T("ഒഴിവാക്കി","Removed")); render();
 };
 window.tdItemMany=function(){
  sheet('<b style="font-size:19px">'+E(T("ഒരുമിച്ച് ചേർക്കുക","Add many at once"))+'</b>'+
   '<div class="tdM" style="margin:6px 0">'+E(T("ഓരോ വരിയിലും ഒരു സാധനം: പേര്, നിരക്ക്, യൂണിറ്റ്. (നിരക്കും യൂണിറ്റും ഓപ്ഷണൽ.) സ്റ്റോക്ക് പിന്നീട് ഓരോന്നിലും കൊടുക്കാം.","One item per line: name, rate, unit. (Rate and unit are optional.) Stock can be added to each item later."))+'</div>'+
   '<textarea id="tiM" rows="8" placeholder="'+E(bizType()==="skilled_work"?"CCTV camera 2MP, 1450, nos\nCamera cable, 22, m\nDVR 4 channel, 3200, nos\nLabour, 500, hr":"Item one, 100, nos\nItem two, 25, m")+'"></textarea>'+
   '<button class="tdBtn" onclick="tdItemManySave()">✔ '+E(T("ലിസ്റ്റിൽ ചേർക്കുക","Add to the list"))+'</button><button class="tdBtn g" onclick="tdCloseSheet()">'+E(T("വേണ്ട","Cancel"))+'</button>');
 };
 window.tdItemManySave=function(){
  var lines=String(($("tiM")||{}).value||"").split(/\n/), n=0, skip=0;
  if(!SH.cfg("kind","")&&bizType()!=="shop"&&bizType()!=="workshop") SH.setCfg("kind","skilled");
  for(var i=0;i<lines.length&&i<150;i++){
   var a=lines[i].split(/[,\t]/).map(function(z){ return z.trim(); }), nm=cap(a[0],60); if(!nm) continue;
   var dup=null; try{ dup=SH.findName(nm); }catch(e){}
   if(dup){ skip++; continue; }
   if(!SH.newProduct({n:nm,t:"i",c:"Other",nt:1,pr:r2(Math.max(0,+a[1]||0)),u:cap(a[2]||"",10)})) break;
   n++;
  }
  say(T(n+" സാധനം ചേർത്തു"+(skip?" ("+skip+" എണ്ണം ലിസ്റ്റിൽ ഉണ്ടായിരുന്നു)":""),n+" item(s) added"+(skip?" ("+skip+" already in the list)":""))); render();
 };
 /* the picker inside a quotation / invoice / bill form */
 function pkRows(q){
  q=String(q||"").toLowerCase();
  var L=myItems().filter(function(p){ return !q||p.n.toLowerCase().indexOf(q)>=0; });
  if(!L.length) return '<div class="tdM" style="text-align:center;padding:12px 0">'+E(T("ഒന്നുമില്ല","Nothing found"))+'</div>';
  return L.map(function(p){
   var c=0, k=p.n.toLowerCase(); if(F) F.L.forEach(function(l){ if(String(l[0]).trim().toLowerCase()===k) c+=(+l[1]||0); });
   return '<div class="tdRow" onclick="tdPkAdd(\''+p.id+'\')" style="cursor:pointer"><div style="min-width:0"><b>'+E(p.n)+'</b><div class="tdM">'+itemSub(p)+'</div></div>'+(c?'<span class="tdSt p">× '+E(H.qty(c))+'</span>':'<span class="tdM">＋</span>')+'</div>';
  }).join("");
 }
 window.tdPkOpen=function(){
  if(!F) return;
  if(!myItems().length){
   sheet('<b style="font-size:19px">'+E(T("ലിസ്റ്റ് ഇതുവരെ ഇല്ല","No list yet"))+'</b><div style="margin:8px 0">'+E(T("നിങ്ങൾ ഉപയോഗിക്കുന്ന സാധനങ്ങൾ ഒരു തവണ ലിസ്റ്റിൽ ചേർത്താൽ ഇവിടെ ടാപ്പ് ചെയ്ത് ചേർക്കാം.","Add the things you use to your list once, then tap them here."))+'</div>'+
    '<button class="tdBtn" onclick="tdCloseSheet();tdItems(1)">📦 '+E(T("ലിസ്റ്റ് ഉണ്ടാക്കുക","Make the list"))+'</button><button class="tdBtn g" onclick="tdCloseSheet()">'+E(T("വേണ്ട","Cancel"))+'</button>');
   return;
  }
  sheet('<b style="font-size:19px">'+E(T("എന്റെ ലിസ്റ്റിൽ നിന്ന്","From my list"))+'</b><div class="tdM">'+E(T("ടാപ്പ് ചെയ്യൂ: ഒരു വരി ചേരും. വീണ്ടും ടാപ്പ് ചെയ്താൽ എണ്ണം കൂടും.","Tap an item to add a line. Tap again for one more."))+'</div>'+
   (myItems().length>6?'<input id="tdPkQ" placeholder="'+E(T("പേര് തിരയുക","Search name"))+'" oninput="tdPkSearch(this.value)" style="margin-top:8px">':'')+
   '<div id="tdPkRows">'+pkRows("")+'</div>'+
   '<button class="tdBtn" onclick="tdCloseSheet()">✔ '+E(T("കഴിഞ്ഞു","Done"))+'</button>'+
   (itemsOn()?'<button class="tdBtn g" onclick="tdCloseSheet();tdItems(1)">📦 '+E(T("ലിസ്റ്റിൽ പുതിയ സാധനം / മാറ്റം","Change my list"))+'</button>':''));
 };
 window.tdPkSearch=function(v){ var r=$("tdPkRows"); if(r) r.innerHTML=pkRows(v); };
 window.tdPkAdd=function(id){
  var p=SH.prod(id); if(!p||!F) return;
  var k=p.n.toLowerCase(), i=-1; F.L.forEach(function(l,j){ if(String(l[0]).trim().toLowerCase()===k) i=j; });
  if(i>=0) F.L[i][1]=r2((+F.L[i][1]||0)+1);
  else{
   var kw=(known()[k]||{}).w, row=[p.n,1,p.u||"",p.pr>0?p.pr:"","",kw||""], last=F.L[F.L.length-1];
   if(last&&!String(last[0]).trim()&&String(last[3])==="") F.L[F.L.length-1]=row; else F.L.push(row);
  }
  var ln=$("tdLines"); if(ln) ln.innerHTML=F.L.map(function(l,j){ return lineHtml(j); }).join("");
  tdTotals();
  var r=$("tdPkRows"); if(r){ var q=$("tdPkQ"); r.innerHTML=pkRows(q?q.value:""); }
 };

 /* ---------- warranty / serial number search ---------- */
 function snView(d,l){
  var h=l[4]?'<div class="tdM">🔖 S/N: '+E(l[4])+'</div>':'', w=wInfo(d,l);
  if(w) h+='<div class="tdM" style="'+(w.ok?'':'color:#a12d2d;font-weight:700')+'">🛡 '+E(w.txt)+'</div>';
  return h;
 }
 function soldLines(){
  var out=[]; scan().list.forEach(function(d){ if(d.ty==="Q") return; d.L.forEach(function(l){ if(l[4]||+l[5]>0) out.push({d:d,l:l}); }); });
  return out;
 }
 function wRowsHtml(q){
  var raw=String(q||"").trim(), nq=normSn(raw), lq=raw.toLowerCase(), dg=raw.replace(/\D/g,""), all=soldLines(), hits=[], rest=[];
  if(!all.length) return '<div class="tdC tdM" style="text-align:center;line-height:1.5">'+E(T("സീരിയൽ നമ്പർ / വാറണ്ടി ഉള്ള ബിൽ ഇതുവരെ ഇല്ല. ബില്ലിൽ ഓരോ ഇനത്തിന്റെയും താഴെ '🔖 സീരിയൽ നമ്പർ / വാറണ്ടി' തുറന്ന് ചേർക്കുക.","No bill with a serial number or warranty yet. In a bill, open '🔖 Serial no. / warranty' under an item and fill it."))+'</div>';
  all.forEach(function(z){
   if(!nq){ rest.push({z:z,hit:[]}); return; }
   var hit=pieces(z.l[4]).filter(function(p){ return normSn(p).indexOf(nq)>=0; });
   if(hit.length) hits.push({z:z,hit:hit});
   else if((z.d.cn||"").toLowerCase().indexOf(lq)>=0||String(z.l[0]).toLowerCase().indexOf(lq)>=0||(dg.length>=3&&String(z.d.cm||"").replace(/\D/g,"").indexOf(dg)>=0)) rest.push({z:z,hit:[]});
  });
  var L=hits.concat(rest).slice(0,40);
  if(!L.length) return '<div class="tdC tdM" style="text-align:center">'+E(T("ഈ നമ്പർ / പേര് ഒരു ബില്ലിലും കണ്ടില്ല","Nothing found for this"))+'</div>';
  return L.map(function(r){
   var d=r.z.d, l=r.z.l, w=wInfo(d,l), sn=r.hit.length?r.hit.join(", "):(l[4]||"");
   var badge=w?'<span class="tdSt '+(w.ok?'p':'d')+'">'+E(w.ok?T("വാറണ്ടി ഉണ്ട്","In warranty"):T("വാറണ്ടി കഴിഞ്ഞു","Warranty over"))+'</span>':'<span class="tdSt">'+E(T("വാറണ്ടി ഇല്ല","No warranty"))+'</span>';
   return '<div class="tdC" onclick="tdWOpen(\''+d.id+'\')" style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>'+E(l[0])+'</b>'+badge+'</div>'+
    (sn?'<div style="margin-top:4px">🔖 S/N: <b>'+E(sn)+'</b></div>':'')+
    '<div style="margin-top:4px">'+E(d.cn)+(d.cm?' · <a href="tel:'+E(d.cm)+'" onclick="event.stopPropagation()">'+E(d.cm)+'</a>':'')+'</div>'+
    '<div class="tdM">'+E(d.no)+' · '+E(tn(d.ty))+' · '+E(dm(d.d))+'</div>'+
    (w?'<div style="margin-top:4px;font-weight:700;color:'+(w.ok?'#157a3a':'#a12d2d')+'">🛡 '+E(w.txt)+'</div>':'')+'</div>';
  }).join("");
 }
 SC.warranty=function(){
  $("tdBody").innerHTML=
   '<div class="tdC"><div class="tdM" style="font-size:14px;line-height:1.45">'+E(T("സീരിയൽ നമ്പർ ടൈപ്പ് ചെയ്യൂ: ഏത് ബില്ലിലാണ്, ആർക്കാണ്, ഏത് തീയതിയാണ്, വാറണ്ടി ബാക്കി ഉണ്ടോ എന്ന് കാണിക്കും. കസ്റ്റമറുടെ പേര് / മൊബൈൽ / സാധനത്തിന്റെ പേര് കൊണ്ടും തിരയാം.","Type a serial number: it shows the bill, the customer, the date and whether the warranty is still on. You can also search by customer name / mobile / item name."))+'</div>'+
   '<input id="tdWq" autocomplete="off" placeholder="'+E(T("സീരിയൽ നമ്പർ / പേര് / മൊബൈൽ","Serial no. / name / mobile"))+'" value="'+E(D.wq)+'" oninput="tdWSearch(this.value)" style="margin-top:8px"></div>'+
   '<div id="tdWRows">'+wRowsHtml(D.wq)+'</div>';
  var q=$("tdWq"); if(q&&!D.wq) q.focus();
 };
 window.tdWarr=function(){ D.wq=""; go("warranty"); };
 window.tdWSearch=function(v){ D.wq=v||""; var r=$("tdWRows"); if(r) r.innerHTML=wRowsHtml(D.wq); };
 window.tdWOpen=function(id){ D.back="warranty"; go("view",{id:id}); };

 /* ---------- one document ---------- */
 SC.view=function(p){
  var d=get(p.id); if(!d){ go("list"); return; }
  var s=status(d), b=biz();
  $("tdBody").innerHTML=
   '<div class="tdC"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:19px">'+E(d.no)+'</b><span class="tdSt '+s.k+'">'+E(s.t)+'</span></div>'+
   '<div class="tdM">'+E(tn(d.ty))+' · '+E(d.d.split("-").reverse().join("-"))+(d.ty==="Q"&&d.vu?' · '+E(T("ബാധകം: ","valid till "))+E(d.vu.split("-").reverse().join("-")):'')+'</div>'+
   '<div style="margin-top:8px;font-size:18px"><b>'+E(d.cn)+'</b></div>'+(d.cm?'<div><a href="tel:'+E(d.cm)+'">'+E(d.cm)+'</a></div>':'')+(d.ca?'<div class="tdM">'+E(d.ca)+'</div>':'')+(d.cg?'<div class="tdM">GSTIN: '+E(d.cg)+'</div>':'')+(d.tt?'<div class="tdM"><b>'+E(d.tt)+'</b></div>':'')+'</div>'+
   '<div class="tdC" style="padding:4px 14px">'+d.L.map(function(l){ return '<div class="tdRow"><div style="min-width:0">'+E(l[0])+'<div class="tdM">'+E(l[1])+(l[2]?' '+E(l[2]):'')+' × '+mny(l[3])+'</div>'+snView(d,l)+'</div><b>'+mny(r2(l[1]*l[3]))+'</b></div>'; }).join("")+
   '<div class="tdRow"><span>'+E(T("ഉപ-ആകെ","Subtotal"))+'</span><b>'+mny(d.sub)+'</b></div>'+
   (d.disc?'<div class="tdRow"><span>'+E(T("ഡിസ്കൗണ്ട്","Discount"))+'</span><b>- '+mny(d.disc)+'</b></div>':'')+
   (d.gst?'<div class="tdRow"><span>GST @ '+d.gpct+'%</span><b>+ '+mny(d.gst)+'</b></div>':'')+
   (d.ro?'<div class="tdRow"><span>'+E(T("റൗണ്ട് ഓഫ്","Round off"))+'</span><b>'+(d.ro>0?"+ ":"- ")+mny(Math.abs(d.ro))+'</b></div>':'')+
   '<div class="tdRow"><span><b>'+E(T("ആകെ","Total"))+'</b></span><span class="tdTot">'+mny(d.total)+'</span></div></div>'+
   (d.ty==="Q"?(d.ad?'<div class="tdC">'+E(T("അഡ്വാൻസ്: ","Advance asked: "))+'<b>'+mny(d.ad)+'</b></div>':''):
    '<div class="tdC"><b>'+E(T("പണം","Payments"))+'</b>'+(d.pays.length?d.pays.map(function(r){ return '<div class="tdRow"><div>'+mny(r.x.a)+' <span class="tdM">'+({C:"Cash",U:"UPI",B:"Bank"}[r.x.pm]||"")+' · '+E(r.d.split("-").reverse().join("-"))+'</span></div><button class="tdX" onclick="tdPayDel(\''+r.id+'\',\''+d.id+'\')">✕</button></div>'; }).join(""):'<div class="tdM">'+E(T("ഒന്നും കിട്ടിയിട്ടില്ല","Nothing received yet"))+'</div>')+
    '<div class="tdRow"><span>'+E(T("ബാക്കി","Balance"))+'</span><b style="color:'+(d.bal>0.5?'#a12d2d':'#157a3a')+'">'+mny(Math.max(0,d.bal))+'</b></div>'+
    (d.bal>0.5?'<button class="tdBtn s" onclick="tdPaySheet(\''+d.id+'\')">💰 '+E(T("പണം കിട്ടി","Add payment"))+'</button>':'')+'</div>')+
   (typeof window.tcDocsNote==="function"?window.tcDocsNote(d):'')+
   (d.nt?'<div class="tdC tdM" style="white-space:pre-wrap">'+E(d.nt)+'</div>':'')+
   '<div class="tdC"><button class="tdBtn" style="margin-top:0" onclick="tdPrint(\''+d.id+'\')">🖨 '+E(T("പ്രിന്റ് / PDF സേവ്","Print / Save PDF"))+'</button>'+
   '<button class="tdBtn g" onclick="tdPrint(\''+d.id+'\',1)">🖼 '+E(T("ചിത്രമായി ഷെയർ ചെയ്യുക","Share as picture"))+'</button>'+
   (d.cm?'<button class="tdBtn g" onclick="tdWa(\''+d.id+'\')">💬 WhatsApp</button>':'')+
   (d.ty==="Q"&&!d.conv?'<button class="tdBtn" style="background:#c9740c" onclick="tdConv(\''+d.id+'\')">🧾 '+E(T("ഇൻവോയ്സ് ആക്കുക","Make invoice"))+'</button>':'')+
   '<button class="tdBtn g" onclick="tdEdit(\''+d.id+'\')">✏ '+E(T("മാറ്റുക","Edit"))+'</button>'+
   '<button class="tdBtn r" onclick="tdDelAsk(\''+d.id+'\')">🗑 '+E(T("ഒഴിവാക്കുക","Delete"))+'</button></div>';
 };
 window.tdPaySheet=function(id){
  var d=get(id); if(!d) return;
  sheet('<h3 style="margin:0 0 6px">'+E(T("പണം കിട്ടി","Payment received"))+'</h3>'+
   '<label>'+E(T("തുക","Amount"))+'</label><input id="tdPa" type="number" inputmode="decimal" value="'+Math.max(0,d.bal)+'">'+
   '<label>'+E(T("രീതി","Mode"))+'</label><select id="tdPmS"><option value="C">'+E(T("ക്യാഷ്","Cash"))+'</option><option value="U">UPI</option><option value="B">'+E(T("ബാങ്ക്","Bank"))+'</option><option value="O">'+E(T("മറ്റുള്ളവ","Other"))+'</option></select>'+
   '<label>'+E(T("തീയതി","Date"))+'</label><input type="date" id="tdPd" value="'+today()+'">'+
   '<button class="tdBtn" onclick="tdPaySave(\''+id+'\')">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>');
 };
 window.tdPaySave=function(id){
  var a=r2(($("tdPa")||{}).value); if(!(a>0)){ say(T("തുക ചേർക്കുക","Enter the amount")); return; }
  var d=$("tdPd"), dt=d&&/^\d{4}-\d{2}-\d{2}$/.test(d.value)?d.value:today();
  SH.add("o",{t:"dp",doc:id,a:a,pm:$("tdPmS").value},dt); hook(id); closeSheet(); say(T("സേവ് ചെയ്തു","Saved")); render();
 };
 window.tdPayDel=function(rid,id){ SH.cancel(rid); hook(id); render(); };
 window.tdConv=function(id){
  var d=get(id); if(!d) return;
  sheet('<h3 style="margin:0 0 6px">'+E(T("ഇൻവോയ്സ് ആക്കട്ടെ?","Make an invoice?"))+'</h3><div class="tdM">'+E(T("ഈ ക്വട്ടേഷനിലെ ഇനങ്ങളും കസ്റ്റമറും ചേർത്ത് പുതിയ ഇൻവോയ്സ് ഉണ്ടാകും. ക്വട്ടേഷൻ അതേപടി നിൽക്കും.","A new invoice is made with this quotation's items and customer. The quotation stays."))+'</div>'+
   '<button class="tdBtn" style="background:#c9740c" onclick="tdConvGo(\''+id+'\')">🧾 '+E(T("ശരി, ഇൻവോയ്സ് ഉണ്ടാക്കുക","Yes, make the invoice"))+'</button><button class="tdBtn g" onclick="tdCloseSheet()">'+E(T("വേണ്ട","No"))+'</button>');
 };
 window.tdConvGo=function(id){
  var d=get(id); if(!d) return;
  var x={t:"doc",id:H.uid(),v:1,ty:"I",no:nextNo("I"),cn:d.cn,L:d.L,fr:d.id};
  ["cm","ca","cg","tt","dc","gp"].forEach(function(k){ if(d[k]) x[k]=d[k]; });
  SH.add("o",x,today()); hook(x.id); closeSheet(); say(T("ഇൻവോയ്സ് ഉണ്ടാക്കി","Invoice made")); go("view",{id:x.id});
 };
 window.tdDelAsk=function(id){
  var d=get(id); if(!d) return;
  sheet('<h3 style="margin:0 0 6px">'+E(T("ഒഴിവാക്കട്ടെ?","Delete this?"))+'</h3><div>'+E(d.no+" · "+d.cn+" · "+mny(d.total))+'</div>'+
   '<button class="tdBtn r" onclick="tdDelGo(\''+id+'\')">🗑 '+E(T("ശരി, ഒഴിവാക്കുക","Yes, delete"))+'</button><button class="tdBtn g" onclick="tdCloseSheet()">'+E(T("വേണ്ട","No"))+'</button>');
 };
 window.tdDelGo=function(id){ SH.add("o",{t:"dd",doc:id}); hook(id); closeSheet(); say(T("ഒഴിവാക്കി","Deleted")); go("list"); };

 /* ---------- my details / GST ---------- */
 window.tdSetOpen=function(){
  var b=biz(), bb=(typeof db!=="undefined"&&db.business)||{};
  sheet('<h3 style="margin:0 0 6px">'+E(T("എന്റെ വിവരങ്ങൾ (ബില്ലിൽ വരും)","My details (printed on documents)"))+'</h3>'+
   '<label>'+E(T("പേര്","Name"))+'</label><input id="tdsN" value="'+E(b.name)+'">'+
   '<label>'+E(T("വിലാസം","Address"))+'</label><input id="tdsA" value="'+E(b.addr)+'">'+
   '<label>'+E(T("ഫോൺ","Phone"))+'</label><input id="tdsP" value="'+E(bb.phone||"")+'">'+
   '<label>UPI ID ('+E(T("ബാക്കി തുകയ്ക്ക് QR","QR for the balance"))+')</label><input id="tdsU" value="'+E(b.upi)+'">'+
   '<label>GSTIN ('+E(T("GST ഉണ്ടെങ്കിൽ മാത്രം","only if GST-registered"))+')</label><input id="tdsG" value="'+E(b.gstin)+'" placeholder="32ABCDE1234F1Z5">'+
   '<label>'+E(T("സാധാരണ GST %","Usual GST %"))+'</label><input id="tdsR" type="number" inputmode="decimal" value="'+E(b.gstDef||"")+'" placeholder="e.g. 18">'+
   '<label>'+E(T("നികുതി കാണിക്കുന്നത്","Show the tax as"))+'</label><select id="tdsS"><option value="0">GST</option><option value="1"'+(b.split?" selected":"")+'>CGST + SGST</option></select>'+
   '<label>'+E(T("പുതിയ രേഖകളിൽ","On new documents"))+'</label><select id="tdsAu"><option value="0">'+E(T("GST ഞാൻ തിരഞ്ഞെടുക്കും","I choose GST each time"))+'</option><option value="1"'+(b.auto?" selected":"")+'>'+E(T("GST തനിയേ ചേർക്കുക","Add GST automatically"))+'</option></select>'+
   '<button class="tdBtn" onclick="tdSetSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>');
 };
 window.tdSetSave=function(){
  var g=String($("tdsG").value||"").replace(/\s/g,"").toUpperCase(), r=+$("tdsR").value||0;
  if(g&&!GSTIN_RE.test(g)){ say(T("GSTIN ശരിയല്ല (15 അക്ഷരം, ഉദാ: 32ABCDE1234F1Z5)","GSTIN should be 15 characters, like 32ABCDE1234F1Z5")); return; }
  if(r<0||r>100) r=0;
  var au=$("tdsAu").value==="1"&&r>0;
  Object.assign(db.business,{name:cap($("tdsN").value,60),address:cap($("tdsA").value,120),phone:cap($("tdsP").value,30),upiId:cap($("tdsU").value,60),gstin:g,gstDef:r||"",gstAuto:au,gstSplit:$("tdsS").value==="1"});
  try{ save(); }catch(e){}
  if($("tdsAu").value==="1"&&!r) say(T("GST തനിയേ ചേർക്കാൻ സാധാരണ GST % വേണം","Add GST automatically needs a usual GST %")); else say(T("സേവ് ചെയ്തു","Saved"));
  closeSheet();
 };

 window.__tcDocs={warr:wInfo,pieces:pieces,addMonths:addMonths,scan:scan,get:get,nextNo:nextNo,calcDoc:calcDoc,status:status,biz:biz,go:go,open:openDocs,close:closeDocs,isOpen:function(){ return D.open; },T:T,E:E,mny:mny,tn:tn,r2:r2};
})();
