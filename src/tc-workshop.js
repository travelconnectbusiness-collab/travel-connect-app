/* Workshop: VEHICLE JOBS + vehicle history (tc-workshop.js, loaded by tc-regdocs.js after tc-docslink.js).
   Owner (2026-11-12): a person registered as a Workshop - the vehicles that come in, the spare parts used (stock must go down), the labour charge,
   the bill / quotation, and a history of every vehicle. A Workshop is a shop with spare parts, so it uses the SAME book as the shop (tc-shop.js):
   Sale / Purchase / Stock / Expenses / Day book / Credit & dues are already there (tc-shopui.js shows the card and big buttons for a Workshop too,
   kind "workshop" = spare-part categories). This file adds the two things a workshop needs on top:
   1) JOB CARD (Home > Vehicle jobs): vehicle number, owner, mobile, problem / work, date in, status In workshop / Ready / Delivered (+ date out),
      parts used (picked from the stock list with qty and rate; rate starts as the item's selling price), labour / work charges, total, optional
      model, KM and notes. Stored in the book as kind 'o' records the shop accounts ignore:
        {t:'job', id, v:version, vn, vm, on, om, km, cm, st:'in'|'rdy'|'out', din, dout, P:[[productId,name,qty,rate]], LB:[[text,amount]], nt}
        an edit = a new record with the same id and v+1 (the highest v wins)      {t:'jd', job}  deleted job      {t:'jb', job, doc}  bill made from the job
      One record must stay under about 2900 bytes (server limit 3000): about 25 lines of parts + labour.
   2) BILL FROM THE JOB: "Quotation / Invoice / Bill" opens the existing tc-docs.js form already filled in (customer, vehicle number in the title,
      parts at their rate, labour lines). Saving it goes through tc-docslink.js as every shop invoice does: the parts go to Sales and the STOCK GOES DOWN,
      the money received is income, what is not received is "to get" in Credit & dues. The job remembers its bill (balance / paid shown on the job).
   3) VEHICLE HISTORY (Home > Vehicle history): search a vehicle number -> every job of that vehicle (date, work, KM, total, bill state) and the
      total spent. Typing a known vehicle number in a new job fills the owner, mobile and model of its last job.
   Everything follows the login to every phone like the rest of the shop book. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcWorkshop) return;
 window.__tcWorkshop=1;
 var T=UI.T, E=UI.E, say=UI.say, H=SH.H;
 var $=function(id){ return document.getElementById(id); };
 var MAXB=2900;
 function r2(n){ return Math.round((+n||0)*100)/100; }
 function mny(n){ n=r2(n); return "₹"+n.toLocaleString("en-IN",{maximumFractionDigits:2}); }
 function cap(s,n){ return String(s==null?"":s).replace(/\s+/g," ").trim().slice(0,n); }
 function vkey(v){ return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
 function vshow(v){ return String(v||"").toUpperCase().replace(/\s+/g," ").trim(); }
 function dmy(d){ try{ return UI.dmy(d); }catch(e){ return d; } }
 function DX(){ return window.__tcDocs||null; }
 var ST={in:["വർക്ക്ഷോപ്പിൽ","In workshop","#c9740c"],rdy:["റെഡി","Ready","#2c5aa0"],out:["കൊടുത്തു","Delivered","#1a8f4a"]};
 function stT(k){ var s=ST[k]||ST.in; return T(s[0],s[1]); }

 /* ---------- jobs from the book ---------- */
 function calcJob(j){
  var pt=0, lt=0;
  (j.P||[]).forEach(function(p){ pt+=r2((+p[2]||0)*(+p[3]||0)); });
  (j.LB||[]).forEach(function(l){ lt+=+l[1]||0; });
  j.pt=r2(pt); j.lt=r2(lt); j.tot=r2(pt+lt); return j;
 }
 function scan(){
  var by={}, del={}, link={};
  SH.calc().live.forEach(function(r){
   var x=r.x; if(r.k!=="o"||!x) return;
   if(x.t==="job"&&x.id){ var c=by[x.id]; if(!c||(+x.v||0)>(+c.x.v||0)||((+x.v||0)===(+c.x.v||0)&&r.ts>c.ts)) by[x.id]=r; }
   else if(x.t==="jd") del[x.job]=1;
   else if(x.t==="jb"){ var l=link[x.job]; if(!l||r.ts>l.ts) link[x.job]=r; }
  });
  var list=[];
  Object.keys(by).forEach(function(id){
   if(del[id]) return;
   var r=by[id], j=Object.assign({},r.x,{rid:r.id,d:r.d,ts:r.ts,P:r.x.P||[],LB:r.x.LB||[]});
   j.doc=link[id]?link[id].x.doc:""; calcJob(j); list.push(j);
  });
  list.sort(function(a,b){ return a.d<b.d?1:a.d>b.d?-1:(a.ts<b.ts?1:-1); });
  return list;
 }
 function get(id){ var L=scan(); for(var i=0;i<L.length;i++) if(L[i].id===id) return L[i]; return null; }
 /* the bill of a job: the document if it still exists */
 function billOf(j){ var dx=DX(); if(!dx||!j.doc) return null; try{ return dx.get(j.doc); }catch(e){ return null; } }
 function billChip(j){
  var d=billOf(j);
  if(!d) return '<span class="tsLow" style="background:#fdf0d4;color:#8a5a00">'+E(T("ബിൽ ഇല്ല","No bill"))+'</span>';
  if(d.ty==="Q") return '<span class="tsLow" style="background:#dce9ef;color:#2c5aa0">'+E(T("ക്വട്ടേഷൻ","Quotation"))+'</span>';
  return d.bal<=0.5?'<span class="tsLow" style="background:#d9f2e1;color:#157a3a">'+E(T("പണം കിട്ടി","Paid"))+'</span>':'<span class="tsLow">'+E(T("ബാക്കി ","Due "))+mny(d.bal)+'</span>';
 }
 function vehicles(){
  var M={}, L=scan();
  L.forEach(function(j){ var k=vkey(j.vn); if(!k) return; var v=M[k]||(M[k]={k:k,vn:vshow(j.vn),jobs:[],tot:0}); v.jobs.push(j); v.tot+=j.tot; });
  return Object.keys(M).map(function(k){ var v=M[k]; v.last=v.jobs[0]; v.tot=r2(v.tot); return v; }).sort(function(a,b){ return a.last.d<b.last.d?1:a.last.d>b.last.d?-1:0; });
 }
 function owners(){ var M={}; scan().slice().reverse().forEach(function(j){ if(j.on) M[j.on.toLowerCase()]=j.on; }); return Object.keys(M).map(function(k){ return M[k]; }); }
 window.tcWsSub=function(){
  try{
   var n=scan().filter(function(j){ return j.st!=="out"; }).length;
   return n?E(n+" "+T("വണ്ടി വർക്ക്ഷോപ്പിൽ","in workshop")):"";
  }catch(e){ return ""; }
 };

 /* ---------- style (the shop's own look + a text area) ---------- */
 function css(){
  if($("wsCss")) return;
  var s=document.createElement("style"); s.id="wsCss";
  s.textContent="#tcShop textarea,#tsSheet textarea{width:100%;font:inherit;font-size:17px;padding:12px;border:2px solid #b7cbd6;border-radius:12px;background:#fff;color:#12303f;box-sizing:border-box}"+
   "#tcShop .wsPart{border:2px solid #dce9ef;border-radius:14px;padding:9px;margin:8px 0}"+
   "#tcShop .wsG{display:grid;grid-template-columns:1fr 1fr;gap:8px}#tcShop .wsG label{font-size:12px;margin-top:4px}"+
   "#tcShop .wsSt{border-radius:8px;padding:2px 9px;font-size:13px;font-weight:800;color:#fff;white-space:nowrap}";
  document.head.appendChild(s);
 }
 function chip(on,fn,txt){ return '<span class="tsChip'+(on?" on":"")+'" onclick="'+fn+'">'+E(txt)+'</span>'; }
 function stBadge(k){ var s=ST[k]||ST.in; return '<span class="wsSt" style="background:'+s[2]+'">'+E(T(s[0],s[1]))+'</span>'; }

 /* ---------- job list ---------- */
 var W={tab:"in",q:""};
 function rowsHtml(){
  var q=W.q.toLowerCase(), qk=vkey(W.q);
  var L=scan().filter(function(j){
   if(W.tab!=="all"&&j.st!==W.tab&&!(W.tab==="in"&&!j.st)) return false;
   return !q||(qk&&vkey(j.vn).indexOf(qk)>=0)||(j.on||"").toLowerCase().indexOf(q)>=0||(j.cm||"").toLowerCase().indexOf(q)>=0;
  });
  if(!L.length) return '<div class="tsC tsM" style="text-align:center">'+E(T("ഒന്നുമില്ല","Nothing here yet"))+'</div>';
  return '<div class="tsC" style="padding:4px 14px">'+L.map(function(j){
   return '<div class="tsRow" onclick="wsOpenJob(\''+j.id+'\')" style="cursor:pointer"><div style="min-width:0"><b>'+E(vshow(j.vn))+'</b> · '+E(j.on||"")+
    '<div class="tsM">'+E(dmy(j.d))+(j.cm?' · '+E(cap(j.cm,40)):'')+'</div></div>'+
    '<div style="text-align:right"><b>'+mny(j.tot)+'</b><div>'+stBadge(j.st||"in")+'</div><div style="margin-top:3px">'+billChip(j)+'</div></div></div>';
  }).join("")+'</div>';
 }
 UI.screen("jobs",function(){
  css();
  var all=scan(), nin=all.filter(function(j){ return j.st!=="out"; }).length, unb=all.filter(function(j){ return j.st==="out"&&!billOf(j); }).length;
  $("tsBody").innerHTML=
   '<button class="tsBtn" style="margin-top:0;background:#8a3b12" onclick="wsNew()">➕ '+E(T("പുതിയ വണ്ടി / പണി","New vehicle / job"))+'</button>'+
   (unb?'<div class="tsC" style="background:#fdf0d4"><b>'+E(T(unb+" കൊടുത്ത പണികൾക്ക് ബിൽ ഇല്ല",unb+" delivered job(s) have no bill"))+'</b></div>':'')+
   '<div style="margin-top:8px">'+chip(W.tab==="in","wsTab('in')",T("വർക്ക്ഷോപ്പിൽ","In workshop")+" ("+nin+")")+chip(W.tab==="rdy","wsTab('rdy')",T("റെഡി","Ready"))+chip(W.tab==="out","wsTab('out')",T("കൊടുത്തു","Delivered"))+chip(W.tab==="all","wsTab('all')",T("എല്ലാം","All"))+'</div>'+
   '<input id="wsQ" placeholder="'+E(T("വണ്ടി നമ്പർ / പേര് തിരയുക","Search vehicle no. / name"))+'" value="'+E(W.q)+'" oninput="wsSearch(this.value)" style="margin-top:8px">'+
   '<div id="wsRows">'+rowsHtml()+'</div>'+
   '<button class="tsBtn g" onclick="wsHist(\'\')">🚗 '+E(T("വണ്ടിയുടെ ഹിസ്റ്ററി","Vehicle history"))+'</button>';
 },function(){ return "🔧 "+T("വണ്ടികൾ / പണികൾ","Vehicle jobs"); });
 window.wsTab=function(t){ W.tab=t; UI.render(); };
 window.wsSearch=function(v){ W.q=v||""; var r=$("wsRows"); if(r) r.innerHTML=rowsHtml(); };
 window.wsOpenJob=function(id){ UI.go("job",{id:id}); };

 /* ---------- job form ---------- */
 var J=null;
 function blank(vn){
  var o={id:"",v:0,vn:vn||"",vm:"",on:"",om:"",km:"",cm:"",st:"in",din:H.today(),dout:"",P:[],LB:[["",""]],nt:""};
  if(vn){ var v=vehicles().filter(function(x){ return x.k===vkey(vn); })[0]; if(v){ var l=v.last; o.vn=v.vn; o.vm=l.vm||""; o.on=l.on||""; o.om=l.om||""; } }
  return o;
 }
 window.wsNew=function(vn){ J=blank(vn); UI.go("jobform",{}); };
 window.wsEdit=function(id){
  var j=get(id); if(!j) return;
  J={id:j.id,v:+j.v||1,vn:j.vn||"",vm:j.vm||"",on:j.on||"",om:j.om||"",km:j.km||"",cm:j.cm||"",st:j.st||"in",din:j.din||j.d,dout:j.dout||"",
   P:j.P.map(function(p){ return [p[0],p[1],p[2],p[3]]; }),LB:(j.LB.length?j.LB:[["",""]]).map(function(l){ return [l[0],l[1]]; }),nt:j.nt||""};
  UI.go("jobform",{});
 };
 function partRow(i){
  var p=J.P[i], pr=p[0]?SH.prod(p[0]):null, q=+p[2]||0, low=pr&&pr.stock!=null&&q>pr.stock;
  return '<div class="wsPart"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>'+E(p[1])+'</b><button class="tsX" onclick="wsPdel('+i+')">✕</button></div>'+
   '<div class="tsM" id="wsPs'+i+'" style="'+(low?'color:#a12d2d;font-weight:700':'')+'">'+E(pr?UI.stockTxt(pr):"")+'</div>'+
   '<div class="wsG"><div><label>'+E(T("എണ്ണം","Qty"))+'</label><input type="number" inputmode="decimal" value="'+E(p[2])+'" oninput="wsPq('+i+',this.value)"></div>'+
   '<div><label>'+E(T("നിരക്ക് ₹","Rate Rs."))+'</label><input type="number" inputmode="decimal" value="'+E(p[3])+'" oninput="wsPr('+i+',this.value)"></div></div>'+
   '<div class="tsM" id="wsPa'+i+'" style="text-align:right;margin-top:3px">'+mny((+p[2]||0)*(+p[3]||0))+'</div></div>';
 }
 function labRow(i){
  var l=J.LB[i];
  return '<div class="wsPart"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>'+(i+1)+'</b>'+(J.LB.length>1?'<button class="tsX" onclick="wsLdel('+i+')">✕</button>':'')+'</div>'+
   '<input list="wsLl" placeholder="'+E(T("പണി (ഉദാ: ബ്രേക്ക് പാഡ് മാറ്റൽ, ഓയിൽ സർവീസ്)","Work (e.g. brake pad change, oil service)"))+'" value="'+E(l[0])+'" oninput="wsLt('+i+',this.value)">'+
   '<label>'+E(T("കൂലി ₹","Labour Rs."))+'</label><input type="number" inputmode="decimal" value="'+E(l[1])+'" oninput="wsLa('+i+',this.value)"></div>';
 }
 function totHtml(){
  var c=calcJob({P:J.P,LB:J.LB});
  return '<div class="tsRow"><span>'+E(T("സ്പെയർ പാർട്സ്","Spare parts"))+'</span><b>'+mny(c.pt)+'</b></div>'+
   '<div class="tsRow"><span>'+E(T("കൂലി","Labour"))+'</span><b>'+mny(c.lt)+'</b></div>'+
   '<div class="tsRow"><span><b>'+E(T("ആകെ","Total"))+'</b></span><span class="tsTot" style="font-size:26px">'+mny(c.tot)+'</span></div>';
 }
 function drawParts(){ var e=$("wsPL"); if(e) e.innerHTML=J.P.map(function(p,i){ return partRow(i); }).join(""); var t=$("wsTot"); if(t) t.innerHTML=totHtml(); }
 function drawLab(){ var e=$("wsLL"); if(e) e.innerHTML=J.LB.map(function(l,i){ return labRow(i); }).join(""); var t=$("wsTot"); if(t) t.innerHTML=totHtml(); }
 function labNames(){ var M={}; scan().forEach(function(j){ j.LB.forEach(function(l){ if(l[0]) M[String(l[0]).toLowerCase()]=l[0]; }); }); return Object.keys(M).slice(-80).map(function(k){ return '<option value="'+E(M[k])+'">'; }).join(""); }
 UI.screen("jobform",function(){
  css();
  if(!J) J=blank("");
  var V=vehicles(), more=!!(J.vm||J.km||J.nt||J.dout);
  $("tsBody").innerHTML=
   '<datalist id="wsVl">'+V.map(function(v){ return '<option value="'+E(v.vn)+'">'; }).join("")+'</datalist><datalist id="wsOl">'+owners().map(function(n){ return '<option value="'+E(n)+'">'; }).join("")+'</datalist><datalist id="wsLl">'+labNames()+'</datalist>'+
   '<div class="tsC"><label style="margin-top:0">'+E(T("വണ്ടി നമ്പർ","Vehicle number"))+'</label><input id="wsVn" list="wsVl" autocapitalize="characters" placeholder="KL 58 A 1234" value="'+E(J.vn)+'" oninput="wsS(\'vn\',this.value)" onchange="wsVeh(this.value)">'+
   '<label>'+E(T("ഉടമയുടെ പേര്","Owner name"))+'</label><input id="wsOn" list="wsOl" value="'+E(J.on)+'" oninput="wsS(\'on\',this.value)">'+
   '<label>'+E(T("മൊബൈൽ (ഓപ്ഷണൽ)","Mobile (optional)"))+'</label><input id="wsOm" type="tel" inputmode="tel" value="'+E(J.om)+'" oninput="wsS(\'om\',this.value)">'+
   '<label>'+E(T("പരാതി / ചെയ്യേണ്ട പണി","Problem / work to do"))+'</label><textarea rows="2" oninput="wsS(\'cm\',this.value)">'+E(J.cm)+'</textarea>'+
   '<label>'+E(T("വന്ന തീയതി","Date in"))+'</label><input type="date" id="wsDin" value="'+E(J.din)+'" max="'+H.today()+'" oninput="wsS(\'din\',this.value)"></div>'+
   '<div class="tsC"><b>🔩 '+E(T("ഉപയോഗിച്ച സ്പെയർ പാർട്സ്","Spare parts used"))+'</b><div class="tsM">'+E(T("സ്റ്റോക്കിലെ ഇനം തിരഞ്ഞെടുക്കുക. ബിൽ ഉണ്ടാക്കുമ്പോൾ സ്റ്റോക്ക് കുറയും.","Pick from your stock. Stock goes down when the bill is made."))+'</div>'+
   UI.picker("wsP",{ph:T("സ്പെയർ പാർട്ടിന്റെ പേര് ടൈപ്പ് ചെയ്യൂ...","Type the spare part name..."),pick:function(p){ J.P.push([p.id,p.n,1,+p.pr>0?+p.pr:(+p.sugg>0?+p.sugg:"")]); drawParts(); }})+
   '<div id="wsPL">'+J.P.map(function(p,i){ return partRow(i); }).join("")+'</div></div>'+
   '<div class="tsC"><b>🛠 '+E(T("കൂലി / പണിക്കൂലി","Labour / work charges"))+'</b><div id="wsLL">'+J.LB.map(function(l,i){ return labRow(i); }).join("")+'</div>'+
   '<button class="tsBtn g s" onclick="wsLadd()">➕ '+E(T("മറ്റൊരു കൂലി","Another charge"))+'</button>'+
   '<div id="wsTot" style="margin-top:8px">'+totHtml()+'</div></div>'+
   '<div class="tsC"><b>'+E(T("അവസ്ഥ","Status"))+'</b><div>'+["in","rdy","out"].map(function(k){ return chip(J.st===k,"wsSt('"+k+"')",stT(k)); }).join("")+'</div></div>'+
   '<details class="tsC"'+(more?' open':'')+'><summary style="font-weight:800;font-size:16px">'+E(T("കൂടുതൽ വിവരങ്ങൾ (ഓപ്ഷണൽ)","More details (optional)"))+'</summary>'+
   '<label>'+E(T("വണ്ടിയുടെ മോഡൽ","Vehicle make / model"))+'</label><input value="'+E(J.vm)+'" oninput="wsS(\'vm\',this.value)" placeholder="'+E(T("ഉദാ: Maruti Swift","e.g. Maruti Swift"))+'">'+
   '<label>'+E(T("ഓടിയ KM (മീറ്റർ)","Odometer KM"))+'</label><input type="number" inputmode="decimal" value="'+E(J.km)+'" oninput="wsS(\'km\',this.value)">'+
   '<label>'+E(T("കൊടുത്ത തീയതി","Date out"))+'</label><input type="date" value="'+E(J.dout)+'" oninput="wsS(\'dout\',this.value)">'+
   '<label>'+E(T("കുറിപ്പ്","Notes"))+'</label><textarea rows="2" oninput="wsS(\'nt\',this.value)">'+E(J.nt)+'</textarea></details>'+
   '<button class="tsBtn" style="background:#8a3b12" onclick="wsSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>';
 },function(){ return "🔧 "+(J&&J.id?T("പണി മാറ്റുക","Edit job"):T("പുതിയ പണി","New job")); });
 window.wsS=function(k,v){ if(J) J[k]=v; };
 window.wsSt=function(k){
  if(!J) return; J.st=k; if(k==="out"&&!J.dout) J.dout=H.today(); if(k!=="out") J.dout="";
  var c=document.querySelectorAll("#tsBody .tsChip"); for(var i=0;i<c.length;i++){ var m=/wsSt\('(\w+)'\)/.exec(c[i].getAttribute("onclick")||""); if(m) c[i].classList.toggle("on",m[1]===k); }
 };
 /* a vehicle number that is already in the book fills the owner, mobile and model */
 window.wsVeh=function(v){
  if(!J) return; var k=vkey(v); if(!k) return;
  var h=vehicles().filter(function(x){ return x.k===k; })[0]; if(!h) return;
  var l=h.last, f=[["on","wsOn",l.on],["om","wsOm",l.om]];
  f.forEach(function(a){ if(!J[a[0]]&&a[2]){ J[a[0]]=a[2]; var e=$(a[1]); if(e) e.value=a[2]; } });
  if(!J.vm&&l.vm) J.vm=l.vm;
  say(T("ഈ വണ്ടിയുടെ മുൻ വിവരങ്ങൾ ചേർത്തു","Earlier details of this vehicle filled in"));
 };
 window.wsPq=function(i,v){ if(!J||!J.P[i]) return; J.P[i][2]=v; var a=$("wsPa"+i); if(a) a.textContent=mny((+v||0)*(+J.P[i][3]||0)); var pr=J.P[i][0]?SH.prod(J.P[i][0]):null, s=$("wsPs"+i); if(s&&pr){ var low=pr.stock!=null&&(+v||0)>pr.stock; s.style.color=low?"#a12d2d":""; s.style.fontWeight=low?"700":""; } var t=$("wsTot"); if(t) t.innerHTML=totHtml(); };
 window.wsPr=function(i,v){ if(!J||!J.P[i]) return; J.P[i][3]=v; var a=$("wsPa"+i); if(a) a.textContent=mny((+J.P[i][2]||0)*(+v||0)); var t=$("wsTot"); if(t) t.innerHTML=totHtml(); };
 window.wsPdel=function(i){ if(!J) return; J.P.splice(i,1); drawParts(); };
 window.wsLt=function(i,v){ if(J&&J.LB[i]) J.LB[i][0]=v; };
 window.wsLa=function(i,v){ if(J&&J.LB[i]){ J.LB[i][1]=v; var t=$("wsTot"); if(t) t.innerHTML=totHtml(); } };
 window.wsLadd=function(){ if(!J) return; J.LB.push(["",""]); drawLab(); };
 window.wsLdel=function(i){ if(!J) return; J.LB.splice(i,1); if(!J.LB.length) J.LB.push(["",""]); drawLab(); };

 /* build the record of a job (also used by the status buttons) */
 function recOf(o){
  var P=[], LB=[];
  (o.P||[]).forEach(function(p){ var q=r2(p[2]===""?1:+p[2]), rt=r2(+p[3]||0); if(p[1]&&q>0) P.push([p[0]||"",cap(p[1],50),q,rt]); });
  (o.LB||[]).forEach(function(l){ var t=cap(l[0],60), a=r2(+l[1]||0); if(t||a>0) LB.push([t||"Labour",a]); });
  var x={t:"job",id:o.id||H.uid(),v:(+o.v||0)+1,vn:vshow(o.vn).slice(0,20),on:cap(o.on,40),st:o.st||"in",din:o.din||H.today(),P:P,LB:LB};
  if(cap(o.vm,30)) x.vm=cap(o.vm,30); if(cap(o.om,15)) x.om=cap(o.om,15); if(+o.km>0) x.km=r2(o.km);
  if(cap(o.cm,200)) x.cm=cap(o.cm,200); if(o.dout) x.dout=o.dout; if(cap(o.nt,200)) x.nt=cap(o.nt,200);
  return x;
 }
 window.wsSave=function(){
  if(!J) return;
  if(!vshow(J.vn)){ say(T("വണ്ടി നമ്പർ ചേർക്കുക","Add the vehicle number")); return; }
  if(!cap(J.on,40)){ say(T("ഉടമയുടെ പേര് ചേർക്കുക","Add the owner's name")); return; }
  if(J.P.some(function(p){ return !(r2(p[2]===""?1:+p[2])>0); })){ say(T("എണ്ണം 0 ആകരുത്","Quantity cannot be 0")); return; }
  var x=recOf(J);
  if(JSON.stringify(x).length>MAXB){ say(T("ഇത് വളരെ നീളമുള്ളതാണ്: ചില ഇനങ്ങൾ കുറയ്ക്കുക അല്ലെങ്കിൽ രണ്ട് പണികളായി സേവ് ചെയ്യുക","Too long: remove some lines or save as two jobs")); return; }
  SH.add("o",x,x.din);
  say(T("സേവ് ചെയ്തു","Saved")); J=null; UI.go("job",{id:x.id});
 };

 /* ---------- one job ---------- */
 UI.screen("job",function(p){
  css();
  var j=get(p.id); if(!j){ UI.go("jobs"); return; }
  var d=billOf(j), dx=DX();
  $("tsBody").innerHTML=
   '<div class="tsC"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b style="font-size:22px">'+E(vshow(j.vn))+'</b>'+stBadge(j.st||"in")+'</div>'+
   (j.vm?'<div class="tsM">'+E(j.vm)+'</div>':'')+
   '<div style="margin-top:6px;font-size:18px"><b>'+E(j.on||"")+'</b></div>'+(j.om?'<div><a href="tel:'+E(j.om)+'">'+E(j.om)+'</a></div>':'')+
   '<div class="tsM" style="margin-top:4px">'+E(T("വന്നത്: ","In: "))+E(dmy(j.din||j.d))+(j.dout?' · '+E(T("കൊടുത്തത്: ","Out: "))+E(dmy(j.dout)):'')+(j.km?' · '+E(j.km)+' km':'')+'</div>'+
   (j.cm?'<div style="margin-top:6px;white-space:pre-wrap">'+E(j.cm)+'</div>':'')+(j.nt?'<div class="tsM" style="white-space:pre-wrap">'+E(j.nt)+'</div>':'')+'</div>'+
   '<div class="tsC" style="padding:4px 14px">'+
   (j.P.length?'<div class="tsM" style="margin-top:8px"><b>'+E(T("സ്പെയർ പാർട്സ്","Spare parts"))+'</b></div>'+j.P.map(function(q){ return '<div class="tsRow"><div style="min-width:0">'+E(q[1])+'<div class="tsM">'+E(q[2])+' × '+mny(q[3])+'</div></div><b>'+mny(r2(q[2]*q[3]))+'</b></div>'; }).join(""):'')+
   (j.LB.length?'<div class="tsM" style="margin-top:8px"><b>'+E(T("കൂലി","Labour"))+'</b></div>'+j.LB.map(function(l){ return '<div class="tsRow"><div style="min-width:0">'+E(l[0])+'</div><b>'+mny(l[1])+'</b></div>'; }).join(""):'')+
   (!j.P.length&&!j.LB.length?'<div class="tsM" style="padding:10px 0">'+E(T("സ്പെയറോ കൂലിയോ ചേർത്തിട്ടില്ല (മാറ്റുക അമർത്തി ചേർക്കാം)","No parts or labour yet (use Edit to add)"))+'</div>':'')+
   '<div class="tsRow"><span><b>'+E(T("ആകെ","Total"))+'</b></span><span class="tsTot" style="font-size:26px">'+mny(j.tot)+'</span></div></div>'+
   /* bill */
   '<div class="tsC"><b>🧾 '+E(T("ബിൽ","Bill"))+'</b>'+
   (d?'<div class="tsRow"><div><b>'+E(d.no)+'</b> · '+E(dx?dx.tn(d.ty):"")+'<div class="tsM">'+mny(d.total)+'</div></div><div>'+billChip(j)+'</div></div><button class="tsBtn g s" onclick="wsOpenBill(\''+j.id+'\')">📄 '+E(T("ബിൽ തുറക്കുക","Open the bill"))+'</button>'
    :'<div class="tsM">'+E(T("ബിൽ ഉണ്ടാക്കുമ്പോൾ സ്പെയർ സ്റ്റോക്കിൽ നിന്ന് കുറയും, ഇൻകം കണക്കിൽ വരും, കിട്ടാത്ത തുക 'കടം / കിട്ടാനുള്ളത്' ൽ വരും.","Making the bill takes the parts out of stock, counts the income, and any unpaid part goes to 'Credit & dues'."))+'</div>'+
    '<button class="tsBtn s" style="background:#1a8f4a" onclick="wsMk(\'B\',\''+j.id+'\')">🧾 '+E(T("ബിൽ (പണം കിട്ടി)","Bill (paid now)"))+'</button>'+
    '<button class="tsBtn s" style="background:#c9740c" onclick="wsMk(\'I\',\''+j.id+'\')">🧾 '+E(T("ഇൻവോയ്സ് (പിന്നെ)","Invoice (pay later)"))+'</button>'+
    '<button class="tsBtn s" style="background:#2c5aa0" onclick="wsMk(\'Q\',\''+j.id+'\')">📝 '+E(T("ക്വട്ടേഷൻ","Quotation"))+'</button>')+'</div>'+
   '<div class="tsC"><b>'+E(T("അവസ്ഥ മാറ്റുക","Change status"))+'</b><div>'+["in","rdy","out"].map(function(k){ return chip((j.st||"in")===k,"wsSetSt('"+j.id+"','"+k+"')",stT(k)); }).join("")+'</div></div>'+
   '<button class="tsBtn g" onclick="wsEdit(\''+j.id+'\')">✏ '+E(T("മാറ്റുക (സ്പെയർ / കൂലി ചേർക്കാം)","Edit (add parts / labour)"))+'</button>'+
   '<button class="tsBtn g" onclick="wsHist(\''+vkey(j.vn)+'\')">🚗 '+E(T("ഈ വണ്ടിയുടെ ഹിസ്റ്ററി","History of this vehicle"))+'</button>'+
   '<button class="tsBtn r" onclick="wsDelAsk(\''+j.id+'\')">🗑 '+E(T("ഒഴിവാക്കുക","Delete"))+'</button>';
 },function(){ return "🔧 "+T("പണി","Job"); });
 window.wsSetSt=function(id,k){
  var j=get(id); if(!j) return;
  var o={id:j.id,v:+j.v||1,vn:j.vn,vm:j.vm,on:j.on,om:j.om,km:j.km,cm:j.cm,st:k,din:j.din||j.d,dout:k==="out"?(j.dout||H.today()):"",P:j.P,LB:j.LB,nt:j.nt};
  SH.add("o",recOf(o),o.din); say(T("സേവ് ചെയ്തു","Saved")); UI.render();
 };
 window.wsDelAsk=function(id){
  var j=get(id); if(!j) return;
  UI.sheet('<h3 style="margin:0 0 6px">'+E(T("ഒഴിവാക്കട്ടെ?","Delete this?"))+'</h3><div>'+E(vshow(j.vn)+" · "+(j.on||"")+" · "+mny(j.tot))+'</div>'+
   '<div class="tsM" style="margin-top:6px">'+E(T("ഇതിൽ നിന്ന് ഉണ്ടാക്കിയ ബിൽ ഉണ്ടെങ്കിൽ അത് അതേപടി നിൽക്കും.","A bill made from it stays as it is."))+'</div>'+
   '<button class="tsBtn r" onclick="wsDelGo(\''+id+'\')">🗑 '+E(T("ശരി, ഒഴിവാക്കുക","Yes, delete"))+'</button><button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("വേണ്ട","No"))+'</button>');
 };
 window.wsDelGo=function(id){ SH.add("o",{t:"jd",job:id}); UI.closeSheet(); say(T("ഒഴിവാക്കി","Deleted")); UI.go("jobs"); };
 window.wsOpenBill=function(id){ var j=get(id), dx=DX(); if(j&&j.doc&&dx) dx.open("view",{id:j.doc}); };

 /* ---------- bill / invoice / quotation made from the job (tc-docs.js form, already filled in) ---------- */
 var pend=null;
 window.wsMk=function(ty,id){
  var j=get(id), dx=DX(); if(!j) return;
  if(!dx||typeof window.tdNew!=="function"){ say(T("ബിൽ സൗകര്യം ഇപ്പോൾ ലഭ്യമല്ല","Bills are not available now")); return; }
  var L=[];
  j.P.forEach(function(p){ var pr=p[0]?SH.prod(p[0]):null; L.push([pr?pr.n:p[1],+p[2]||1,pr&&pr.u?pr.u:"",+p[3]||0]); });
  j.LB.forEach(function(l){ L.push([l[0]||"Labour",1,"labour",+l[1]||0]); });   /* unit "labour": tc-docslink.js records it as income (item "Labour charges") */
  if(!L.length){ say(T("ആദ്യം സ്പെയറോ കൂലിയോ ചേർക്കുക (മാറ്റുക)","Add parts or labour first (Edit)")); return; }
  dx.open("list"); window.tdNew(ty);
  for(var i=1;i<L.length;i++) window.tdAdd();
  var veh=T("വണ്ടി: ","Vehicle: ")+vshow(j.vn)+(j.vm?" ("+j.vm+")":"")+(j.km?", "+j.km+" km":"");
  window.tdS("cn",j.on||""); window.tdS("cm",j.om||""); window.tdS("tt",cap(vshow(j.vn)+(j.cm?" - "+j.cm:""),80));
  window.tdS("nt",ty==="Q"?veh+"\nValid for 15 days. Advance payment required before the work starts.":veh);
  L.forEach(function(l,k){ window.tdL(k,0,l[0]); window.tdL(k,1,l[1]); window.tdL(k,2,l[2]); window.tdL(k,3,l[3]); });
  window.tdAdd(); window.tdDel(L.length);     /* redraw the form with the values (the extra empty line is removed again) */
  pend={job:id,cn:String(j.on||"").toLowerCase(),ts:Date.now()};
 };
 function newest(){
  var dx=DX(); if(!dx) return null;
  var best=null; try{ dx.scan().all.forEach(function(r){ if(!best||r.ts>best.ts) best={ts:r.ts,id:r.x.id,cn:String(r.x.cn||"").toLowerCase()}; }); }catch(e){}
  return best;
 }
 var oSave=window.tdSave;
 if(typeof oSave==="function") window.tdSave=function(){
  var before=pend?newest():null, r=oSave.apply(this,arguments);
  try{
   if(pend&&Date.now()-pend.ts<3600000){
    var n=newest();
    if(n&&(!before||n.ts!==before.ts)&&n.cn===pend.cn){ SH.add("o",{t:"jb",job:pend.job,doc:n.id}); pend=null; }
   }
  }catch(e){ if(window.console) console.error("tc-workshop",e); }
  return r;
 };

 /* ---------- vehicle history ---------- */
 var VQ="", VK="";
 function vRows(){
  var V=vehicles(), k=vkey(VQ), q=VQ.toLowerCase();
  V=V.filter(function(v){ return !VQ||(k&&v.k.indexOf(k)>=0)||(v.last.on||"").toLowerCase().indexOf(q)>=0; });
  if(!V.length) return '<div class="tsC tsM" style="text-align:center">'+E(T("ഒന്നുമില്ല","Nothing here yet"))+'</div>';
  return '<div class="tsC" style="padding:4px 14px">'+V.map(function(v){
   return '<div class="tsRow" onclick="wsHist(\''+v.k+'\')" style="cursor:pointer"><div style="min-width:0"><b>'+E(v.vn)+'</b> · '+E(v.last.on||"")+'<div class="tsM">'+E(v.jobs.length+" "+T("പണി","job(s)"))+' · '+E(T("അവസാനം ","last "))+E(dmy(v.last.d))+'</div></div><b>'+mny(v.tot)+'</b></div>';
  }).join("")+'</div>';
 }
 UI.screen("vhist",function(){
  css();
  var v=VK?vehicles().filter(function(x){ return x.k===VK; })[0]:null;
  if(!v){
   VK="";
   $("tsBody").innerHTML='<input id="wsVq" placeholder="'+E(T("വണ്ടി നമ്പർ / ഉടമയുടെ പേര് തിരയുക","Search vehicle no. / owner"))+'" value="'+E(VQ)+'" oninput="wsVsearch(this.value)">'+
    '<div id="wsVr">'+vRows()+'</div>'+
    '<button class="tsBtn" style="background:#8a3b12" onclick="wsNew()">➕ '+E(T("പുതിയ വണ്ടി / പണി","New vehicle / job"))+'</button>';
   return;
  }
  var l=v.last, kms=v.jobs.map(function(j){ return +j.km||0; }), mk=Math.max.apply(null,kms);
  $("tsBody").innerHTML=
   '<div class="tsC"><b style="font-size:22px">'+E(v.vn)+'</b>'+(l.vm?'<div class="tsM">'+E(l.vm)+'</div>':'')+
   '<div style="margin-top:6px;font-size:18px"><b>'+E(l.on||"")+'</b></div>'+(l.om?'<div><a href="tel:'+E(l.om)+'">'+E(l.om)+'</a></div>':'')+
   '<div class="tsRow" style="margin-top:6px"><span>'+E(T("ആകെ പണികൾ","Jobs"))+'</span><b>'+v.jobs.length+'</b></div>'+
   '<div class="tsRow"><span>'+E(T("ആകെ തുക","Total billed"))+'</span><b>'+mny(v.tot)+'</b></div>'+(mk>0?'<div class="tsRow"><span>'+E(T("അവസാനത്തെ KM","Last KM"))+'</span><b>'+E(mk)+'</b></div>':'')+'</div>'+
   '<button class="tsBtn" style="margin-top:0;background:#8a3b12" onclick="wsNew(\''+v.k+'\')">➕ '+E(T("ഈ വണ്ടിക്ക് പുതിയ പണി","New job for this vehicle"))+'</button>'+
   '<div class="tsC" style="padding:4px 14px">'+v.jobs.map(function(j){
    return '<div class="tsRow" onclick="wsOpenJob(\''+j.id+'\')" style="cursor:pointer"><div style="min-width:0"><b>'+E(dmy(j.d))+'</b>'+(j.km?' · '+E(j.km)+' km':'')+
     '<div class="tsM">'+E(cap(j.cm||j.LB.map(function(x){ return x[0]; }).join(", "),70))+'</div>'+
     (j.P.length?'<div class="tsM">🔩 '+E(cap(j.P.map(function(x){ return x[1]; }).join(", "),70))+'</div>':'')+'</div>'+
     '<div style="text-align:right"><b>'+mny(j.tot)+'</b><div>'+stBadge(j.st||"in")+'</div><div style="margin-top:3px">'+billChip(j)+'</div></div></div>';
   }).join("")+'</div>'+
   '<button class="tsBtn g" onclick="wsHist(\'\')">← '+E(T("എല്ലാ വണ്ടികളും","All vehicles"))+'</button>';
 },function(){ return "🚗 "+T("വണ്ടിയുടെ ഹിസ്റ്ററി","Vehicle history"); });
 window.wsVsearch=function(v){ VQ=v||""; var r=$("wsVr"); if(r) r.innerHTML=vRows(); };
 window.wsHist=function(k){ VK=k||""; UI.go("vhist",{}); };
 /* the open job / list shows the bill state again after the bill was made or paid in the documents layer */
 SH.onChange(function(w){
  if(w==="status") return;
  try{ var sc=UI.screenName(); if(UI.isOpen()&&(sc==="job"||sc==="jobs")) UI.render(); }catch(e){}
 });
 window.__tcWorkshopApi={scan:scan,get:get,vehicles:vehicles,recOf:recOf,vkey:vkey};
})();
