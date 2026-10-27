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
   Totals are rounded to the whole rupee (Round off line). Numbers: QTN-0001, INV-0001, BILL-0001 (next free number of each kind). */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcDocs) return;
 var T=UI.T, E=UI.E, H=SH.H;
 var $=function(id){ return document.getElementById(id); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var PRE={Q:"QTN",I:"INV",B:"BILL"};
 var NAME={Q:["ക്വട്ടേഷൻ","Quotation"],I:["ഇൻവോയ്സ്","Invoice"],B:["ബിൽ","Bill"]};
 var MAXB=2900, GSTIN_RE=/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
 var D={open:false,screen:"list",params:{},tab:"A",q:""}, F=null, SC={};
 function r2(n){ return Math.round((+n||0)*100)/100; }
 function mny(n){ return "₹"+r2(n).toLocaleString("en-IN",{maximumFractionDigits:2}); }
 function today(){ return H.today(); }
 function tn(ty){ return T(NAME[ty][0],NAME[ty][1]); }
 /* tc-docslink.js (shop) keeps the shop's Sales / Credit & dues / stock in step with an invoice or bill; it is called after every change of a document */
 function hook(id){ try{ if(typeof window.tcDocsRebuild==="function") window.tcDocsRebuild(id); }catch(e){ if(window.console) console.error("tc-docslink",e); } }
 function chip(on,fn,txt){ return '<span class="tdChip'+(on?" on":"")+'" onclick="'+fn+'">'+E(txt)+'</span>'; }
 function cap(s,n){ return String(s==null?"":s).replace(/\s+/g," ").trim().slice(0,n); }

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
  ar.forEach(function(d){ d.L.forEach(function(l){ if(l[0]) M[String(l[0]).toLowerCase()]={n:l[0],u:l[2],r:l[3]}; }); });
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
  var tt={list:T("ക്വട്ടേഷൻ / ഇൻവോയ്സ് / ബിൽ","Quotation / Invoice / Bill"),form:"",view:""};
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
   '<button class="tdBtn g" onclick="tdSetOpen()">⚙ '+E(T("എന്റെ വിവരങ്ങൾ / GST","My details / GST"))+'</button>';
 };
 window.tdTab=function(t){ D.tab=t; render(); };
 window.tdSearch=function(v){ D.q=v||""; var r=$("tdRows"); if(r) r.innerHTML=rowsHtml(); };
 window.tdOpen=function(id){ go("view",{id:id}); };

 /* ---------- form ---------- */
 function newF(ty){
  var b=biz(), auto=b.auto&&b.gstDef>0;
  return {id:"",v:0,ty:ty,no:"",cn:"",cm:"",ca:"",cg:"",tt:"",dt:today(),vu:H.addDays(today(),15),L:[["",1,"",""]],dc:"",gon:auto,gp:auto?b.gstDef:"",ad:"",
   nt:ty==="Q"?"Valid for 15 days. Advance payment required before the work starts.":"",pay:ty==="B"?"full":"none",pm:"C",pa:""};
 }
 window.tdNew=function(ty){ F=newF(ty); go("form",{}); };
 window.tdEdit=function(id){
  var d=get(id); if(!d) return;
  F={id:d.id,v:+d.v||1,ty:d.ty,no:d.no,cn:d.cn||"",cm:d.cm||"",ca:d.ca||"",cg:d.cg||"",tt:d.tt||"",dt:d.d,vu:d.vu||"",L:d.L.map(function(l){ return [l[0],l[1],l[2],l[3]]; }),dc:d.dc||"",
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
 function lineHtml(i){
  var l=F.L[i];
  return '<div class="tdLn"><div style="display:flex;justify-content:space-between;align-items:center"><b>'+(i+1)+'</b>'+(F.L.length>1?'<button class="tdX" onclick="tdDel('+i+')">✕</button>':'')+'</div>'+
   '<input id="tdd'+i+'" list="tdDl" placeholder="'+E(T("വിവരണം (ഉദാ: CCTV ക്യാമറ, പൈപ്പ് ഫിറ്റിംഗ്, ജോലിക്കൂലി)","Item / work (e.g. CCTV camera, labour)"))+'" value="'+E(l[0])+'" oninput="tdL('+i+',0,this.value)" onchange="tdPick('+i+',this.value)">'+
   '<div class="tdG3"><div><label>'+E(T("എണ്ണം","Qty"))+'</label><input id="tdq'+i+'" type="number" inputmode="decimal" value="'+E(l[1])+'" oninput="tdL('+i+',1,this.value)"></div>'+
   '<div><label>'+E(T("യൂണിറ്റ്","Unit"))+'</label><input id="tdu'+i+'" value="'+E(l[2])+'" placeholder="nos/m/hr" oninput="tdL('+i+',2,this.value)"></div>'+
   '<div><label>'+E(T("നിരക്ക്","Rate"))+'</label><input id="tdr'+i+'" type="number" inputmode="decimal" value="'+E(l[3])+'" oninput="tdL('+i+',3,this.value)"></div></div>'+
   '<div class="tdM" id="tdA'+i+'" style="text-align:right;margin-top:4px">'+lineAmt(i)+'</div></div>';
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
   '<label>'+E(T("ജോലിയുടെ പേര് (ഓപ്ഷണൽ)","Work / subject (optional)"))+'</label><input id="tdtt" value="'+E(F.tt)+'" placeholder="'+E(T("ഉദാ: 4 ക്യാമറ CCTV സെറ്റ്","e.g. 4-camera CCTV set"))+'" oninput="tdS(\'tt\',this.value)">'+
   '<label>'+E(T("തീയതി","Date"))+'</label><input type="date" id="tddt" value="'+E(F.dt)+'" oninput="tdS(\'dt\',this.value)">'+
   (isQ?'<label>'+E(T("ക്വട്ടേഷൻ ബാധകമായ അവസാന തീയതി","Valid until"))+'</label><input type="date" id="tdvu" value="'+E(F.vu)+'" oninput="tdS(\'vu\',this.value)">':'')+'</div>'+
   '<div class="tdC"><b>'+E(T("ഇനങ്ങൾ","Items"))+'</b><div id="tdLines">'+F.L.map(function(l,i){ return lineHtml(i); }).join("")+'</div>'+
   '<button class="tdBtn g s" onclick="tdAdd()">➕ '+E(T("ഇനം ചേർക്കുക","Add item"))+'</button>'+
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
  var k=known()[String(v||"").toLowerCase()]; if(!k||!F.L[i]) return;
  var l=F.L[i];
  if(String(l[3])===""){ l[3]=k.r; var r=$("tdr"+i); if(r) r.value=k.r; }
  if(String(l[2])===""&&k.u){ l[2]=k.u; var u=$("tdu"+i); if(u) u.value=k.u; }
  var a=$("tdA"+i); if(a) a.textContent=lineAmt(i); tdTotals();
 };
 window.tdCust=function(v){
  var c=custs()[String(v||"").toLowerCase()]; if(!c) return;
  [["cm","tdcm",c.m],["ca","tdca",c.a],["cg","tdcg",c.g]].forEach(function(p){ if(!F[p[0]]&&p[2]){ F[p[0]]=p[2]; var e=$(p[1]); if(e) e.value=p[2]; } });
 };
 function saveDoc(){
  var cn=cap(F.cn,60); if(!cn){ say(T("കസ്റ്റമറുടെ പേര് ചേർക്കുക","Add the customer's name")); return null; }
  var L=[]; F.L.forEach(function(l){ var t=cap(l[0],80); if(!t) return; L.push([t,r2(l[1]===""?1:+l[1]),cap(l[2],10),r2(+l[3]||0)]); });
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
 window.tdSave=function(){
  var x=saveDoc(); if(!x) return;
  var dt=/^\d{4}-\d{2}-\d{2}$/.test(F.dt||"")?F.dt:today(), isNew=!F.id;
  SH.add("o",x,dt);
  if(isNew&&F.ty!=="Q"&&F.pay!=="none"){
   var tot=calcDoc({L:x.L,dc:x.dc,gp:x.gp,pays:[]}).total, a=F.pay==="full"?tot:Math.min(tot,r2(F.pa));
   if(a>0) SH.add("o",{t:"dp",doc:x.id,a:a,pm:F.pm},dt);
  }
  hook(x.id);
  say(T("സേവ് ചെയ്തു","Saved")); F=null; go("view",{id:x.id});
 };

 /* ---------- one document ---------- */
 SC.view=function(p){
  var d=get(p.id); if(!d){ go("list"); return; }
  var s=status(d), b=biz();
  $("tdBody").innerHTML=
   '<div class="tdC"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:19px">'+E(d.no)+'</b><span class="tdSt '+s.k+'">'+E(s.t)+'</span></div>'+
   '<div class="tdM">'+E(tn(d.ty))+' · '+E(d.d.split("-").reverse().join("-"))+(d.ty==="Q"&&d.vu?' · '+E(T("ബാധകം: ","valid till "))+E(d.vu.split("-").reverse().join("-")):'')+'</div>'+
   '<div style="margin-top:8px;font-size:18px"><b>'+E(d.cn)+'</b></div>'+(d.cm?'<div><a href="tel:'+E(d.cm)+'">'+E(d.cm)+'</a></div>':'')+(d.ca?'<div class="tdM">'+E(d.ca)+'</div>':'')+(d.cg?'<div class="tdM">GSTIN: '+E(d.cg)+'</div>':'')+(d.tt?'<div class="tdM"><b>'+E(d.tt)+'</b></div>':'')+'</div>'+
   '<div class="tdC" style="padding:4px 14px">'+d.L.map(function(l){ return '<div class="tdRow"><div style="min-width:0">'+E(l[0])+'<div class="tdM">'+E(l[1])+(l[2]?' '+E(l[2]):'')+' × '+mny(l[3])+'</div></div><b>'+mny(r2(l[1]*l[3]))+'</b></div>'; }).join("")+
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

 window.__tcDocs={scan:scan,get:get,nextNo:nextNo,calcDoc:calcDoc,status:status,biz:biz,go:go,open:openDocs,close:closeDocs,isOpen:function(){ return D.open; },T:T,E:E,mny:mny,tn:tn,r2:r2};
})();
