/* My purchases - where each thing was bought (tc-docspur.js, loaded by tc-regdocs.js right after tc-docslink.js).
   Owner's request (2026-11-13): a CCTV / plumbing worker buys things, fits them at a customer's house or office, and when a complaint comes the thing must go back to the shop
   it was bought from - for repair or a warranty replacement. So every purchase keeps: supplier (shop) name, phone, place, bill no, date, and per item the serial number(s)
   and the supplier's warranty. The serial number links the two sides: type it in "Warranty / serial no." and the app shows the customer's bill AND where it was bought.
   WHERE: Quotation / Invoice / Bill > "My purchases (where bought)" (for a business that is not a shop; a shop has its own Purchase screen).
   DATA: ordinary shop-book purchase records (kind b) {p,q,rt,tr,su,bn,g} + ser (serial numbers, comma separated), sw (supplier warranty months), sph (supplier phone),
   spl (supplier place), ln (line number on the form, keeps the order). So stock goes up and the cost is counted like every other purchase. One bill = the records sharing x.g.
   SCREENS: list (search by supplier / bill no / item / serial) > a purchase (supplier with phone to call, items, each serial number: sold to whom / still in stock, supplier
   warranty valid / over; Edit, Delete) > the form (supplier, phone, place, bill no, date, items From my list with qty, rate, serial numbers, supplier warranty; transport
   for the whole bill, shared over the items by value). Edit = the new records are made first, then the old ones are cancelled (nothing is lost if it is refused).
   Hooks used by tc-docs.js: window.tdPurHtml(serials) = the "Bought from" box, window.tdPurStockHtml(query) = serials bought but not sold yet. Needs tc-docs.js. */
(function(){
 var SH=window.__tcShop, DX=window.__tcDocs;
 if(!SH||!DX||!DX.SC||!DX.u||window.__tcDocsPur) return;
 window.__tcDocsPur=1;
 var SC=DX.SC, U=DX.u, T=DX.T, E=DX.E, mny=DX.mny, r2=DX.r2, pieces=DX.pieces, nS=DX.normSn, say=U.say, sheet=U.sheet, H=SH.H;
 var $=function(id){ return document.getElementById(id); };
 var P=null, Q="";
 function enc(g){ return encodeURIComponent(g).replace(/'/g,"%27"); }
 function dec(g){ try{ return decodeURIComponent(g); }catch(e){ return g; } }

 /* ---------- the purchase bills from the book ---------- */
 function bills(){
  var M={}, out=[];
  SH.calc().live.forEach(function(r){
   if(r.k!=="b"||!r.x) return;
   var x=r.x, key=x.g||((x.su||"")+"|"+(x.bn||"")+"|"+r.d), b=M[key];
   if(!b){ b=M[key]={g:key,d:r.d,ts:r.ts,su:x.su||"",bn:x.bn||"",ph:"",pl:"",tr:0,L:[],total:0}; out.push(b); }
   if(x.sph&&!b.ph) b.ph=x.sph;
   if(x.spl&&!b.pl) b.pl=x.spl;
   var p=null; try{ p=SH.prod(x.p); }catch(e){}
   var q=+x.q||0, rt=+x.rt||0, tr=+x.tr||0;
   b.L.push({r:r,p:x.p,n:p?p.n:"?",u:p&&p.u?p.u:"",q:q,rt:rt,tr:tr,sn:x.ser||"",sw:+x.sw||0,ln:+x.ln||0});
   b.tr+=tr; b.total+=q*rt+tr;
  });
  /* records made in the same millisecond have no fixed order: x.ln (the line number on the form) keeps the order they were entered in */
  out.forEach(function(b){ b.tr=r2(b.tr); b.total=r2(b.total); b.L.sort(function(a,c){ return a.ln-c.ln; }); });
  out.sort(function(a,b){ return a.d<b.d?1:a.d>b.d?-1:(a.ts<b.ts?1:-1); });
  return out;
 }
 function bill(g){ var L=bills(); for(var i=0;i<L.length;i++) if(L[i].g===g) return L[i]; return null; }
 /* serial number (cleaned) -> the purchase lines that carry it */
 function idx(){
  var M={};
  bills().forEach(function(b){ b.L.forEach(function(l){ pieces(l.sn).forEach(function(p){ var k=nS(p); if(k) (M[k]=M[k]||[]).push({b:b,l:l,p:p}); }); }); });
  return M;
 }
 /* serial number -> the invoice / bill line it was sold on */
 function soldMap(){
  var M={};
  DX.scan().list.forEach(function(d){ if(d.ty==="Q") return; d.L.forEach(function(l){ pieces(l[4]).forEach(function(p){ var k=nS(p); if(k&&!M[k]) M[k]={d:d,l:l}; }); }); });
  return M;
 }
 function swInfo(b,l){
  var m=l.sw; if(!(m>0)) return null;
  var end=DX.addMonths(b.d,m), left=U.daysTo(U.today(),end), ok=left>=0;
  return {end:end,left:left,ok:ok,txt:ok?T("സപ്ലൈയർ വാറണ്ടി "+m+" മാസം · "+U.dm(end)+" വരെ ("+left+" ദിവസം ബാക്കി)","Supplier warranty "+m+" months · till "+U.dm(end)+" ("+left+" days left)"):T("സപ്ലൈയർ വാറണ്ടി കഴിഞ്ഞു · "+U.dm(end)+" ന് അവസാനിച്ചു","Supplier warranty "+m+" months · over on "+U.dm(end))};
 }
 function from(b){
  return '<b>'+E(b.su||"?")+'</b>'+(b.ph?' · <a href="tel:'+E(b.ph)+'" onclick="event.stopPropagation()">'+E(b.ph)+'</a>':'')+(b.pl?' · '+E(b.pl):'');
 }

 /* ---------- the "Bought from" box (warranty search, bill view) ---------- */
 window.tdPurHtml=function(ps){
  var I=idx(), seen={}, order=[];
  ps.forEach(function(p){
   var hits=I[nS(p)]; if(!hits) return;
   var z=hits[hits.length-1], key=z.b.g+"#"+z.b.L.indexOf(z.l);
   if(seen[key]) seen[key].ps.push(p); else{ seen[key]={z:z,ps:[p]}; order.push(key); }
  });
  return order.map(function(k){
   var z=seen[k].z, w=swInfo(z.b,z.l);
   return '<div style="margin-top:6px;padding:7px 9px;background:#eaf3f8;border-radius:10px;font-size:14px;line-height:1.5;color:#12303f" onclick="event.stopPropagation()">🛒 <b>'+E(T("വാങ്ങിയത്: ","Bought from: "))+'</b>'+from(z.b)+
    '<div class="tdM">'+E((z.b.bn?T("ബിൽ ","Bill ")+z.b.bn+" · ":"")+U.dm(z.b.d))+'</div>'+
    (w?'<div style="font-weight:700;color:'+(w.ok?'#157a3a':'#a12d2d')+'">🛡 '+E(w.txt)+'</div>':'')+'</div>';
  }).join("");
 };
 /* serials that match the search and were bought but are not on any invoice / bill yet */
 window.tdPurStockHtml=function(raw){
  var nq=nS(raw); if(!nq) return "";
  var sold=soldMap(), h="", n=0;
  bills().forEach(function(b){
   b.L.forEach(function(l){
    var hit=pieces(l.sn).filter(function(p){ var k=nS(p); return k.indexOf(nq)>=0&&!sold[k]; });
    if(!hit.length||n>=20) return; n++;
    h+='<div class="tdC" onclick="tdPurOpen(\''+enc(b.g)+'\')" style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>'+E(l.n)+'</b><span class="tdSt x">'+E(T("സ്റ്റോക്കിൽ (വിറ്റിട്ടില്ല)","In stock (not sold)"))+'</span></div>'+
     '<div style="margin-top:4px">🔖 S/N: <b>'+E(hit.join(", "))+'</b></div>'+window.tdPurHtml(hit)+'</div>';
   });
  });
  return h;
 };

 /* ---------- list ---------- */
 function itemsTxt(b){
  var s=b.L.slice(0,2).map(function(l){ return l.n+" ×"+H.qty(l.q); }).join(", ");
  return s+(b.L.length>2?" +"+(b.L.length-2):"");
 }
 function rowsHtml(){
  var q=Q.trim().toLowerCase(), nq=nS(Q), L=bills().filter(function(b){
   if(!q) return true;
   if((b.su||"").toLowerCase().indexOf(q)>=0||(b.bn||"").toLowerCase().indexOf(q)>=0) return true;
   return b.L.some(function(l){ return l.n.toLowerCase().indexOf(q)>=0||(nq&&nS(l.sn).indexOf(nq)>=0); });
  });
  if(!L.length) return '<div class="tdC tdM" style="text-align:center">'+E(T("ഒന്നുമില്ല","Nothing here yet"))+'</div>';
  return '<div class="tdC" style="padding:4px 14px">'+L.map(function(b){
   return '<div class="tdRow" onclick="tdPurOpen(\''+enc(b.g)+'\')" style="cursor:pointer"><div style="min-width:0"><b>'+E(b.su||"?")+'</b><div class="tdM">'+E(U.dm(b.d))+(b.bn?' · '+E(b.bn):'')+' · '+E(itemsTxt(b))+'</div></div><b>'+mny(b.total)+'</b></div>';
  }).join("")+'</div>';
 }
 SC.purchases=function(){
  var L=bills(), tot=0; L.forEach(function(b){ tot+=b.total; });
  $("tdBody").innerHTML=
   '<div class="tdC"><div class="tdM" style="font-size:14px;line-height:1.45">'+E(T("സാധനം എവിടെ നിന്ന് വാങ്ങി എന്ന് ഇവിടെ സൂക്ഷിക്കാം: കടയുടെ പേര്, ഫോൺ, ബിൽ നമ്പർ, സീരിയൽ നമ്പർ, സപ്ലൈയർ വാറണ്ടി. കസ്റ്റമർക്ക് ഫിറ്റ് ചെയ്ത സാധനത്തിന് പരാതി വന്നാൽ ഏത് കടയിൽ തിരിച്ചു കൊടുക്കണം എന്ന് സീരിയൽ നമ്പർ വച്ച് കാണാം.","Keep where each thing was bought: shop name, phone, bill no., serial numbers, supplier warranty. When a thing fitted at a customer's gives trouble, the serial number shows which shop to take it back to."))+'</div>'+
   '<button class="tdBtn" onclick="tdPurNew()">➕ '+E(T("പുതിയ പർച്ചേസ്","New purchase"))+'</button>'+
   (L.length?'<div class="tdM" style="margin-top:8px">'+E(T(L.length+" പർച്ചേസ് · ആകെ "+mny(tot),L.length+" purchase(s) · total "+mny(tot)))+'</div>':'')+'</div>'+
   (L.length>5?'<input id="tdPuQ" placeholder="'+E(T("കട / ബിൽ നമ്പർ / സാധനം / സീരിയൽ തിരയുക","Search shop / bill no. / item / serial"))+'" value="'+E(Q)+'" oninput="tdPurSearch(this.value)">':'')+
   '<div id="tdPuRows">'+rowsHtml()+'</div>';
 };
 window.tdPurList=function(){ Q=""; DX.go("purchases"); };
 window.tdPurSearch=function(v){ Q=v||""; var r=$("tdPuRows"); if(r) r.innerHTML=rowsHtml(); };
 window.tdPurOpen=function(g){ DX.go("purview",{g:dec(g)}); };

 /* ---------- one purchase ---------- */
 SC.purview=function(p){
  var b=bill(p.g); if(!b){ DX.go("purchases"); return; }
  var S=soldMap();
  var lines=b.L.map(function(l){
   var w=swInfo(b,l), sn=pieces(l.sn);
   return '<div class="tdRow" style="align-items:flex-start"><div style="min-width:0"><b>'+E(l.n)+'</b><div class="tdM">'+E(H.qty(l.q))+(l.u?' '+E(l.u):'')+' × '+mny(l.rt)+'</div>'+
    sn.map(function(x){
     var z=S[nS(x)];
     return '<div class="tdM" style="margin-top:2px">🔖 <b>'+E(x)+'</b> → '+(z?'<a href="#" onclick="tdOpen(\''+z.d.id+'\');return false">'+E(T("വിറ്റു: ","sold to "))+E(z.d.cn)+' · '+E(z.d.no)+' · '+E(U.dm(z.d.d))+'</a>':E(T("സ്റ്റോക്കിൽ (വിറ്റിട്ടില്ല)","in stock (not sold)")))+'</div>';
    }).join("")+
    (w?'<div class="tdM" style="font-weight:700;color:'+(w.ok?'#157a3a':'#a12d2d')+'">🛡 '+E(w.txt)+'</div>':'')+'</div><b>'+mny(l.q*l.rt)+'</b></div>';
  }).join("");
  $("tdBody").innerHTML=
   '<div class="tdC"><div style="font-size:19px">'+from(b)+'</div><div class="tdM">'+(b.bn?E(T("ബിൽ നമ്പർ ","Bill no. "))+E(b.bn)+' · ':'')+E(U.dm(b.d))+'</div></div>'+
   '<div class="tdC" style="padding:4px 14px">'+lines+
   (b.tr>0?'<div class="tdRow"><span>'+E(T("കൊണ്ടുവരാനുള്ള ചെലവ് (ട്രാൻസ്പോർട്ട്)","Transport"))+'</span><b>'+mny(b.tr)+'</b></div>':'')+
   '<div class="tdRow"><span><b>'+E(T("ആകെ","Total"))+'</b></span><span class="tdTot">'+mny(b.total)+'</span></div></div>'+
   '<div class="tdC"><button class="tdBtn g" style="margin-top:0" onclick="tdPurEdit(\''+enc(b.g)+'\')">✏ '+E(T("മാറ്റുക (ട്രാൻസ്പോർട്ട്, വില, സീരിയൽ ...)","Edit (transport, rate, serial ...)"))+'</button>'+
   '<button class="tdBtn r" onclick="tdPurDelAsk(\''+enc(b.g)+'\')">🗑 '+E(T("ഒഴിവാക്കുക","Delete"))+'</button></div>';
 };
 window.tdPurDelAsk=function(g){
  var b=bill(dec(g)); if(!b) return;
  sheet('<h3 style="margin:0 0 6px">'+E(T("ഈ പർച്ചേസ് ഒഴിവാക്കട്ടെ?","Delete this purchase?"))+'</h3><div>'+E(b.su+" · "+U.dm(b.d)+" · "+mny(b.total))+'</div><div class="tdM" style="margin-top:6px">'+E(T("സ്റ്റോക്ക് ആ എണ്ണം കുറയും. സീരിയൽ നമ്പറും കടയുടെ വിവരവും പോകും.","The stock goes down by these items. The serial numbers and the shop details go too."))+'</div>'+
   '<button class="tdBtn r" onclick="tdPurDel(\''+enc(b.g)+'\')">🗑 '+E(T("ശരി, ഒഴിവാക്കുക","Yes, delete"))+'</button><button class="tdBtn g" onclick="tdCloseSheet()">'+E(T("വേണ്ട","No"))+'</button>');
 };
 window.tdPurDel=function(g){
  var b=bill(dec(g)); if(!b) return;
  b.L.forEach(function(l){ SH.cancel(l.r.id); });
  U.closeSheet(); say(T("ഒഴിവാക്കി","Deleted")); DX.go("purchases");
 };

 /* ---------- the form ---------- */
 function newP(){ return {g:"",old:[],sup:"",ph:"",pl:"",bn:"",dt:U.today(),tr:"",L:[]}; }
 window.tdPurNew=function(){ P=newP(); DX.go("purform",{}); };
 window.tdPurEdit=function(g){
  var b=bill(dec(g)); if(!b) return;
  P={g:b.g,old:b.L.map(function(l){ return l.r.id; }),sup:b.su,ph:b.ph,pl:b.pl,bn:b.bn,dt:b.d,tr:b.tr>0?b.tr:"",
   L:b.L.map(function(l){ return {p:l.p,n:l.n,u:l.u,q:l.q,rt:l.rt,sn:l.sn,sw:l.sw||""}; })};
  DX.go("purform",{g:b.g});
 };
 function lastSw(pid){ var w=""; bills().forEach(function(b){ b.L.forEach(function(l){ if(l.p===pid&&l.sw) w=w||l.sw; }); }); return w; }
 function snHint(i){
  var l=P.L[i], n=pieces(l.sn).length, q=+l.q||0; if(!n) return "";
  var bad=q>0&&Math.abs(n-q)>1e-9;
  return '<span style="'+(bad?'color:#c9740c;font-weight:700':'')+'">'+n+' / '+H.qty(q)+' '+E(T("നമ്പർ","numbers"))+(bad?' ⚠':'')+'</span>';
 }
 function totHtml(){
  var it=0; P.L.forEach(function(l){ it+=(+l.q||0)*(+l.rt||0); });
  var tr=Math.max(0,+P.tr||0);
  return '<div class="tdRow"><span>'+E(T("സാധനങ്ങൾ","Items"))+'</span><b>'+mny(it)+'</b></div>'+(tr?'<div class="tdRow"><span>'+E(T("ട്രാൻസ്പോർട്ട്","Transport"))+'</span><b>+ '+mny(tr)+'</b></div>':'')+
   '<div class="tdRow"><span><b>'+E(T("ആകെ","Total"))+'</b></span><span class="tdTot">'+mny(it+tr)+'</span></div>';
 }
 function lineHtml(i){
  var l=P.L[i];
  return '<div class="tdLn"><div style="display:flex;justify-content:space-between;align-items:center"><b>'+E(l.n)+'</b><button class="tdX" onclick="tdPuDel('+i+')">✕</button></div>'+
   '<div class="tdG3" style="grid-template-columns:1fr 1fr"><div><label>'+E(T("എണ്ണം","Qty"))+(l.u?' ('+E(l.u)+')':'')+'</label><input id="tdPq'+i+'" type="number" inputmode="decimal" value="'+E(l.q)+'" oninput="tdPuL('+i+',\'q\',this.value)"></div>'+
   '<div><label>'+E(T("ഒന്നിന്റെ വില","Rate each"))+'</label><input id="tdPr'+i+'" type="number" inputmode="decimal" value="'+E(l.rt)+'" oninput="tdPuL('+i+',\'rt\',this.value)"></div></div>'+
   '<label>🔖 '+E(T("സീരിയൽ നമ്പർ (ഒന്നിലധികം ഉണ്ടെങ്കിൽ കോമ ഇട്ട് എഴുതുക)","Serial no. (several: separate with commas)"))+'</label><input id="tdPs'+i+'" value="'+E(l.sn)+'" oninput="tdPuL('+i+',\'sn\',this.value)"><div class="tdM" id="tdPsH'+i+'">'+snHint(i)+'</div>'+
   '<label>🛡 '+E(T("സപ്ലൈയർ വാറണ്ടി (മാസം)","Supplier warranty (months)"))+'</label><input id="tdPw'+i+'" type="number" inputmode="numeric" value="'+E(l.sw)+'" placeholder="e.g. 12" oninput="tdPuL('+i+',\'sw\',this.value)">'+
   '<div>'+[6,12,24,36].map(function(m){ return '<span class="tdChip" onclick="tdPuWm('+i+','+m+')">'+m+'</span>'; }).join("")+'<span class="tdChip" onclick="tdPuWm('+i+',0)">'+E(T("ഇല്ല","None"))+'</span></div></div>';
 }
 function linesHtml(){ return P.L.length?P.L.map(function(l,i){ return lineHtml(i); }).join(""):'<div class="tdM" style="text-align:center;padding:10px 0">'+E(T("താഴെ 'എന്റെ ലിസ്റ്റിൽ നിന്ന്' അമർത്തി വാങ്ങിയ സാധനം ചേർക്കുക","Press 'From my list' below and add what you bought"))+'</div>'; }
 SC.purform=function(){
  if(!P) P=newP();
  var sups={}, sl="";
  bills().forEach(function(b){ if(b.su&&!sups[b.su.toLowerCase()]){ sups[b.su.toLowerCase()]=1; sl+='<option value="'+E(b.su)+'">'; } });
  $("tdBody").innerHTML='<datalist id="tdPuSl">'+sl+'</datalist>'+
   '<div class="tdC"><label style="margin-top:0">'+E(T("വാങ്ങിയ കട (സപ്ലൈയർ)","Bought from (shop / supplier)"))+'</label><input id="tdPsu" list="tdPuSl" value="'+E(P.sup)+'" placeholder="'+E(T("ഉദാ: ഡിജിറ്റൽ ഹബ്, വടകര","e.g. Digital Hub, Vadakara"))+'" oninput="tdPuS(\'sup\',this.value)" onchange="tdPuSup(this.value)">'+
   '<label>'+E(T("കടയുടെ ഫോൺ (ഓപ്ഷണൽ)","Shop phone (optional)"))+'</label><input id="tdPph" type="tel" inputmode="tel" value="'+E(P.ph)+'" oninput="tdPuS(\'ph\',this.value)">'+
   '<label>'+E(T("സ്ഥലം (ഓപ്ഷണൽ)","Place (optional)"))+'</label><input id="tdPpl" value="'+E(P.pl)+'" oninput="tdPuS(\'pl\',this.value)">'+
   '<label>'+E(T("ബിൽ നമ്പർ (ഓപ്ഷണൽ)","Bill no. (optional)"))+'</label><input id="tdPbn" value="'+E(P.bn)+'" oninput="tdPuS(\'bn\',this.value)">'+
   '<label>'+E(T("തീയതി","Date"))+'</label><input type="date" id="tdPdt" value="'+E(P.dt)+'" oninput="tdPuS(\'dt\',this.value)"></div>'+
   '<div class="tdC"><b>'+E(T("വാങ്ങിയ സാധനങ്ങൾ","Items bought"))+'</b><div id="tdPuLines">'+linesHtml()+'</div>'+
   '<button class="tdBtn s" onclick="tdPuPick()">📦 '+E(T("എന്റെ ലിസ്റ്റിൽ നിന്ന്","From my list"))+'</button></div>'+
   '<div class="tdC"><label style="margin-top:0">'+E(T("കൊണ്ടുവരാനുള്ള ചെലവ് - ട്രാൻസ്പോർട്ട് (ബില്ലിൽ ഒരു തവണ, ഓപ്ഷണൽ)","Transport for the whole bill (once, optional)"))+'</label><input id="tdPtr" type="number" inputmode="decimal" value="'+E(P.tr)+'" oninput="tdPuS(\'tr\',this.value);tdPuTot()">'+
   '<div id="tdPuTot" style="margin-top:8px">'+totHtml()+'</div></div>'+
   '<button class="tdBtn" onclick="tdPuSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>';
 };
 window.tdPuS=function(k,v){ if(P) P[k]=v; };
 window.tdPuTot=function(){ var t=$("tdPuTot"); if(t&&P) t.innerHTML=totHtml(); };
 window.tdPuL=function(i,f,v){
  if(!P||!P.L[i]) return; P.L[i][f]=v;
  if(f==="sn"||f==="q"){ var h=$("tdPsH"+i); if(h) h.innerHTML=snHint(i); }
  tdPuTot();
 };
 window.tdPuWm=function(i,m){ if(!P||!P.L[i]) return; P.L[i].sw=m||""; var e=$("tdPw"+i); if(e) e.value=m||""; };
 window.tdPuDel=function(i){ if(!P) return; P.L.splice(i,1); var l=$("tdPuLines"); if(l) l.innerHTML=linesHtml(); tdPuTot(); };
 /* a shop used before: its phone and place come back */
 window.tdPuSup=function(v){
  if(!P) return; var k=String(v||"").trim().toLowerCase(); if(!k) return;
  var hit=null; bills().forEach(function(b){ if(!hit&&b.su.toLowerCase()===k) hit=b; });
  if(!hit) return;
  [["ph","tdPph",hit.ph],["pl","tdPpl",hit.pl]].forEach(function(z){ if(!P[z[0]]&&z[2]){ P[z[0]]=z[2]; var e=$(z[1]); if(e) e.value=z[2]; } });
 };
 function pkRows(q){
  q=String(q||"").toLowerCase();
  var L=U.myItems().filter(function(p){ return !q||p.n.toLowerCase().indexOf(q)>=0; });
  if(!L.length) return '<div class="tdM" style="text-align:center;padding:12px 0">'+E(T("ഒന്നുമില്ല","Nothing found"))+'</div>';
  return L.map(function(p){
   var c=0; P.L.forEach(function(l){ if(l.p===p.id) c+=(+l.q||0); });
   return '<div class="tdRow" onclick="tdPuAdd(\''+p.id+'\')" style="cursor:pointer"><div style="min-width:0"><b>'+E(p.n)+'</b><div class="tdM">'+U.itemSub(p)+'</div></div>'+(c?'<span class="tdSt p">× '+E(H.qty(c))+'</span>':'<span class="tdM">＋</span>')+'</div>';
  }).join("");
 }
 window.tdPuPick=function(){
  if(!P) return;
  if(!U.myItems().length){
   sheet('<b style="font-size:19px">'+E(T("ലിസ്റ്റ് ഇതുവരെ ഇല്ല","No list yet"))+'</b><div style="margin:8px 0">'+E(T("ആദ്യം 'എന്റെ സാധനങ്ങൾ' ൽ സാധനങ്ങൾ ചേർക്കുക, പിന്നെ ഇവിടെ ടാപ്പ് ചെയ്ത് ചേർക്കാം.","First add your things under 'My items', then tap them here."))+'</div><button class="tdBtn g" onclick="tdCloseSheet()">'+E(T("ശരി","OK"))+'</button>');
   return;
  }
  sheet('<b style="font-size:19px">'+E(T("എന്റെ ലിസ്റ്റിൽ നിന്ന്","From my list"))+'</b><div class="tdM">'+E(T("ടാപ്പ് ചെയ്യൂ: ഒരു വരി ചേരും. വീണ്ടും ടാപ്പ് ചെയ്താൽ എണ്ണം കൂടും.","Tap an item to add a line. Tap again for one more."))+'</div>'+
   (U.myItems().length>6?'<input id="tdPuPq" placeholder="'+E(T("പേര് തിരയുക","Search name"))+'" oninput="tdPuPkS(this.value)" style="margin-top:8px">':'')+
   '<div id="tdPuPk">'+pkRows("")+'</div><button class="tdBtn" onclick="tdCloseSheet()">✔ '+E(T("കഴിഞ്ഞു","Done"))+'</button>');
 };
 window.tdPuPkS=function(v){ var r=$("tdPuPk"); if(r) r.innerHTML=pkRows(v); };
 window.tdPuAdd=function(id){
  var p=null; try{ p=SH.prod(id); }catch(e){} if(!p||!P) return;
  var at=-1; P.L.forEach(function(l,i){ if(l.p===id) at=i; });
  if(at>=0) P.L[at].q=r2((+P.L[at].q||0)+1);
  else P.L.push({p:id,n:p.n,u:p.u||"",q:1,rt:p.ec>0?p.ec:"",sn:"",sw:lastSw(id)});
  var ln=$("tdPuLines"); if(ln) ln.innerHTML=linesHtml();
  tdPuTot();
  var r=$("tdPuPk"); if(r){ var q=$("tdPuPq"); r.innerHTML=pkRows(q?q.value:""); }
 };
 function dupSn(g){
  var I=idx(), out=[], seen={};
  P.L.forEach(function(l){ pieces(l.sn).forEach(function(p){
   var k=nS(p), hit=(I[k]||[]).filter(function(z){ return z.b.g!==g; })[0];
   if(hit&&!seen[k]){ seen[k]=1; out.push(p+" ("+hit.b.su+(hit.b.bn?" "+hit.b.bn:"")+")"); }
  }); });
  return out;
 }
 window.tdPuSave=function(){
  if(!P) return;
  var sup=U.cap(P.sup,60);
  if(!sup){ say(T("കടയുടെ (സപ്ലൈയറുടെ) പേര് ചേർക്കുക","Add the shop's (supplier's) name")); return; }
  if(!P.L.length){ say(T("കുറഞ്ഞത് ഒരു സാധനം ചേർക്കുക","Add at least one item")); return; }
  for(var i=0;i<P.L.length;i++){
   var l=P.L[i];
   if(!(+l.q>0)){ say(T(l.n+": എണ്ണം ചേർക്കുക",l.n+": enter the quantity")); return; }
   if(!(+l.rt>0)){ say(T(l.n+": വില ചേർക്കുക",l.n+": enter the rate")); return; }
  }
  var it=0; P.L.forEach(function(l){ it+=(+l.q)*(+l.rt); });
  var tr=Math.max(0,+P.tr||0), g=P.g||H.uid(), dt=/^\d{4}-\d{2}-\d{2}$/.test(P.dt||"")?P.dt:U.today();
  var ph=U.cap(P.ph,20), pl=U.cap(P.pl,40), bn=U.cap(P.bn,30), made=[];
  for(var j=0;j<P.L.length;j++){
   var m=P.L[j], q=r2(+m.q), rt=+m.rt;
   var x={p:m.p,q:q,rt:rt,tr:it>0?r2(tr*(q*rt)/it):0,su:sup,bn:bn,g:g,ln:j+1};
   var sn=U.snClean(m.sn); if(sn) x.ser=sn;
   var w=Math.round(+m.sw||0); if(w>0&&w<=240) x.sw=w;
   if(ph) x.sph=ph; if(pl) x.spl=pl;
   var rec=SH.add("b",x,dt);
   if(!rec){ made.forEach(function(r){ SH.cancel(r.id); }); return; }   /* refused (view-only plan): nothing changes */
   made.push(rec);
  }
  (P.old||[]).forEach(function(id){ SH.cancel(id); });
  var dup=dupSn(g);
  say(T("സേവ് ചെയ്തു","Saved")+(dup.length?T(" · ⚠ ഈ സീരിയൽ നമ്പർ മറ്റൊരു പർച്ചേസിലും ഉണ്ട്: "," · ⚠ This serial no. is in another purchase: ")+dup.join(", "):""));
  P=null; DX.go("purview",{g:g});
 };
})();
