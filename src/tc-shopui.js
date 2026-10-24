/* Shop book - screens, part 1 (tc-shopui.js, loaded by tc-regdocs.js after tc-shop.js).
   A full-screen layer #tcShop (opened from Menu > "Shop accounts", or by the address ...#shop) with Malayalam-first, big-button screens made
   for a person who has never used an app: Home (6 big buttons), Sale, Purchase, Dead / loss, and the product picker + "new product" form.
   Stock, expenses, the day's account and the Excel are in tc-shoprep.js, the import of the old Google Sheet in tc-shopimp.js; they add their
   screens with window.__tcShopUi.screen(name, fn). Data and sums: window.__tcShop (tc-shop.js).
   Rules: a sale / purchase / dead-fish entry can only use a product that exists (type a few letters, tap the name) or "+ add new product";
   a wrong entry is cancelled with the X next to it (a cancel record, nothing is overwritten). The phone Back button goes Home, then closes. */
(function(){
 if(window.__tcShopUi) return;
 var SH=window.__tcShop; if(!SH) return;
 var H=SH.H, money=H.money, qty=H.qty;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var LS={ get:function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set:function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };
 var lang=LS.get("tc_shop_lang")||"ml";
 var T=function(ml,en){ return lang==="en"?en:ml; };
 var say=function(m){ try{ toast(m); }catch(e){} };
 var SC={}, TITLE={}, U={stack:[],screen:"",sale:null,pur:null,dead:null,open:false};

 /* ---------- style ---------- */
 function css(){
  if($("tsCss")) return;
  var s=document.createElement("style"); s.id="tsCss";
  s.textContent="#tcShop{position:fixed;inset:0;z-index:70;background:#eaf4f8;overflow:auto;-webkit-overflow-scrolling:touch;color:#12303f}"+
  "#tcShop .tsH{position:sticky;top:0;z-index:5;background:#0b5d7a;color:#fff;padding:10px 12px;display:flex;align-items:center;gap:10px}"+
  "#tcShop .tsH b{flex:1;font-size:18px}#tcShop .tsH button{background:#ffffff26;color:#fff;border:0;border-radius:10px;padding:9px 13px;font-size:16px}"+
  "#tcShop .tsB{padding:12px 12px 90px;max-width:640px;margin:0 auto}"+
  "#tcShop .tsC{background:#fff;border-radius:16px;padding:14px;margin:10px 0;box-shadow:0 2px 8px #0002}"+
  "#tcShop .tsG{display:grid;grid-template-columns:1fr 1fr;gap:12px}"+
  "#tcShop .tsBig{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:112px;border-radius:18px;font-size:22px;font-weight:800;color:#fff;border:0;padding:8px;text-align:center;line-height:1.25}"+
  "#tcShop .tsBig small{font-size:13px;font-weight:600;opacity:.9}"+
  "#tcShop input,#tcShop select{width:100%;font:inherit;font-size:18px;padding:12px;border:2px solid #b7cbd6;border-radius:12px;background:#fff;color:#12303f}"+
  "#tcShop label{display:block;font-size:14px;font-weight:700;margin:10px 0 4px;color:#35566a}"+
  "#tcShop .tsBtn{display:block;width:100%;border:0;border-radius:14px;padding:15px;font-size:19px;font-weight:800;background:#0b6b78;color:#fff;margin-top:10px}"+
  "#tcShop .tsBtn.g{background:#dce9ef;color:#12303f}#tcShop .tsBtn.r{background:#fde8e6;color:#a12d2d}#tcShop .tsBtn.s{padding:9px 12px;font-size:15px;display:inline-block;width:auto;margin:4px 4px 0 0}"+
  "#tcShop .tsChip{display:inline-block;border:2px solid #b7cbd6;border-radius:999px;padding:9px 14px;margin:4px 6px 0 0;font-size:16px;font-weight:700;background:#fff;color:#12303f}"+
  "#tcShop .tsChip.on{background:#0b6b78;border-color:#0b6b78;color:#fff}"+
  "#tcShop .tsPkL{background:#fff;border:2px solid #b7cbd6;border-radius:12px;margin-top:4px;max-height:46vh;overflow:auto}"+
  "#tcShop .tsPkL div{padding:12px;border-bottom:1px solid #e3eef3;font-size:17px;display:flex;justify-content:space-between;gap:8px}"+
  "#tcShop .tsPkL div small{color:#5b7787;white-space:nowrap}#tcShop .tsPkL div.n{color:#0b6b78;font-weight:800}"+
  "#tcShop .tsRow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e3eef3;font-size:16px}"+
  "#tcShop .tsM{color:#5b7787;font-size:13px}#tcShop .tsLow{background:#fde8e6;color:#a12d2d;border-radius:8px;padding:2px 7px;font-size:12px;font-weight:800}"+
  "#tcShop .tsTot{font-size:30px;font-weight:900;color:#0b6b78}"+
  "#tsSheet{position:fixed;inset:0;z-index:75;background:#0008;display:flex;align-items:flex-end;justify-content:center}"+
  "#tsSheet>div{background:#fff;width:100%;max-width:640px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:16px 16px 28px}"+
  "#tcShop .tsX{border:0;background:#fde8e6;color:#a12d2d;border-radius:8px;padding:5px 10px;font-weight:800;font-size:15px}"+
  "@media(min-width:700px){#tcShop .tsB{padding-top:20px}}";
  document.head.appendChild(s);
 }

 /* ---------- layer, screens, Back ---------- */
 function build(){
  css();
  var d=document.createElement("div"); d.id="tcShop"; d.className="hidden";
  d.innerHTML='<div class="tsH"><button id="tsBack" onclick="tsBack()">←</button><b id="tsTitle"></b><span id="tsSync" class="tsM" style="color:#fff" onclick="tsSyncNow()"></span></div><div class="tsB" id="tsBody"></div>';
  document.body.appendChild(d);
 }
 function show(){ build0(); $("tcShop").classList.remove("hidden"); document.body.style.overflow="hidden"; }
 function build0(){ if(!$("tcShop")) build(); }
 function hide(){ var d=$("tcShop"); if(d) d.classList.add("hidden"); document.body.style.overflow=""; closeSheet(); }
 function go(name,params){
  U.screen=name; U.params=params||{};
  if(name==="home") U.stack=[]; else U.stack.push(name);
  render();
 }
 function render(){
  build0(); closeSheet();
  var fn=SC[U.screen]||SC.home;
  $("tsTitle").textContent=(TITLE[U.screen]&&TITLE[U.screen]())||T("ഷോപ്പ് കണക്ക്","Shop accounts");
  $("tsBack").textContent=U.screen==="home"?"✕":"←";
  $("tsBody").innerHTML=""; $("tcShop").scrollTop=0;
  try{ fn(U.params); }catch(e){ $("tsBody").innerHTML='<div class="tsC">'+E(T("സ്ക്രീൻ തുറക്കാൻ കഴിഞ്ഞില്ല","Could not open this screen"))+'</div>'; }
  syncMark();
 }
 function openShop(screen,reuse){
  if(U.open){ go(screen||"home"); return; }
  U.open=true; show();
  if(!reuse){ try{ history.pushState({tcShop:1},"",location.href); }catch(e){} }
  go(screen||"home");
  SH.later(300);
 }
 function closeShop(){
  if(!U.open) return;
  U.open=false; hide();
  try{ if(history.state&&history.state.tcShop) history.back(); }catch(e){}
 }
 window.tsOpen=function(screen){
  /* from the Menu: let the pop-up close first (the navigation code removes its leftover history entry) */
  var m=document.querySelector("#modal");
  if(m&&!m.classList.contains("hidden")){ try{ closeModal(); }catch(e){} setTimeout(function(){ openShop(screen); },420); }
  else openShop(screen);
 };
 window.tsBack=function(){ if(U.screen==="home") closeShop(); else go("home"); };
 window.addEventListener("popstate",function(){
  if(!U.open) return;
  if(history.state&&history.state.tcShop) return;
  if(U.screen!=="home"){ try{ history.pushState({tcShop:1},"",location.href); }catch(e){} go("home"); }
  else { U.open=false; hide(); }
 });
 window.tsSyncNow=function(){ SH.sync(); };
 function syncMark(){
  var e=$("tsSync"); if(!e) return;
  var s=SH.status, n=(SH._S().q||[]).length;
  e.textContent=s.s==="busy"?"⟳":s.s==="ok"&&!n?"●":s.s==="auth"?"⚠ login":(n?"⏳ "+n:"○");
  e.title=s.s;
 }
 SH.onChange(function(w){ if(!U.open) return; syncMark(); if(w!=="status"&&U.screen==="home") try{ SC.home(); }catch(e){} });

 /* ---------- small UI parts ---------- */
 function sheet(html){
  closeSheet();
  var d=document.createElement("div"); d.id="tsSheet";
  d.innerHTML='<div>'+html+'</div>'; d.addEventListener("click",function(ev){ if(ev.target===d) closeSheet(); });
  document.body.appendChild(d);
 }
 function closeSheet(){ var d=$("tsSheet"); if(d) d.remove(); }
 window.tsCloseSheet=closeSheet;
 function dateRow(id,v){
  return '<label>'+E(T("തീയതി","Date"))+'</label><input type="date" id="'+id+'" value="'+E(v)+'" max="'+H.today()+'" onchange="tsDateWarn(this)">'+
   '<div id="'+id+'W" class="tsM" style="color:#a12d2d;font-weight:700"></div>';
 }
 window.tsDateWarn=function(el){ var w=$(el.id+"W"); if(w) w.textContent=(el.value&&el.value!==H.today())?T("ഇന്നത്തെ തീയതി അല്ല!","Not today's date!"):""; };
 function dateVal(id){ var e=$(id), v=e&&e.value; return /^\d{4}-\d{2}-\d{2}$/.test(v||"")?v:H.today(); }
 function dmy(iso){ var p=String(iso||"").split("-"); return p.length===3?p[2]+"-"+p[1]+"-"+p[0]:iso; }
 function num(id){ var e=$(id); var v=parseFloat(e&&e.value); return isNaN(v)?0:v; }
 function setv(id,v){ var e=$(id); if(e) e.value=v; }
 function stockTxt(p){ return p.stock==null?"":T("സ്റ്റോക്ക് ","In stock ")+qty(p.stock); }

 /* ---------- product picker ---------- */
 var PK={};
 function picker(id,opt){
  PK[id]=opt||{};
  return '<div id="pk_'+id+'"><input id="pk_'+id+'_i" autocomplete="off" placeholder="'+E(opt.ph||T("പേര് ടൈപ്പ് ചെയ്യൂ...","Type the name..."))+'" oninput="tsPkIn(\''+id+'\')" onfocus="tsPkIn(\''+id+'\')"><div class="tsPkL hidden" id="pk_'+id+'_l"></div></div>';
 }
 window.tsPkIn=function(id){
  var i=$("pk_"+id+"_i"), l=$("pk_"+id+"_l"); if(!i||!l) return;
  var q=i.value.trim(), o=PK[id]||{};
  var L=SH.search(q,{t:o.t}).slice(0,q?8:0);
  if(!q&&o.recent) L=o.recent();
  var h=L.map(function(p){ return '<div onclick="tsPkSel(\''+id+'\',\''+p.id+'\')"><span>'+E(p.n)+'</span><small>'+E(p.stock!=null?qty(p.stock):"")+(p.low?' ⚠':'')+'</small></div>'; }).join("");
  if(q&&o.allowNew!==false&&!SH.findName(q)) h+='<div class="n" onclick="tsPkNew(\''+id+'\')">➕ "'+E(q)+'" '+E(T("പുതിയ ഇനമായി ചേർക്കുക","add as new item"))+'</div>';
  if(!h&&q) h='<div><span class="tsM">'+E(T("ഒന്നുമില്ല","Nothing found"))+'</span></div>';
  l.innerHTML=h; l.classList.toggle("hidden",!h);
 };
 window.tsPkSel=function(id,pid){
  var p=SH.prod(pid), o=PK[id]||{}; if(!p) return;
  var i=$("pk_"+id+"_i"), l=$("pk_"+id+"_l"); if(i) i.value=""; if(l){ l.innerHTML=""; l.classList.add("hidden"); }
  if(o.pick) o.pick(p);
 };
 window.tsPkNew=function(id){
  var i=$("pk_"+id+"_i"), name=i?i.value.trim():"";
  prodSheet(null,{n:name,t:(PK[id]||{}).t||""},function(p){ window.tsPkSel(id,p.id); });
 };

 /* ---------- product form (new / edit) ---------- */
 var PS=null;
 function prodSheet(pid,preset,cb){
  var p=pid?SH.prod(pid):null, x=p?p.raw:(preset||{});
  var t=x.t||"i";
  PS={pid:pid,cb:cb,t:t,c:x.c||(t==="f"?"Fish":"Other")};
  var cats=SH.categories();
  sheet('<h3 style="margin:0 0 6px">'+E(pid?T("ഇനം മാറ്റുക","Edit item"):T("പുതിയ ഇനം","New item"))+'</h3>'+
   '<label>'+E(T("പേര്","Name"))+'</label><input id="psN" value="'+E(x.n||"")+'">'+
   '<label>'+E(T("തരം","Kind"))+'</label><div id="psT"><span class="tsChip'+(t==="f"?" on":"")+'" onclick="tsPsT(\'f\')">🐟 '+E(T("മീൻ","Fish"))+'</span><span class="tsChip'+(t!=="f"?" on":"")+'" onclick="tsPsT(\'i\')">📦 '+E(T("സാധനം","Item"))+'</span></div>'+
   '<label>'+E(T("വിഭാഗം","Category"))+'</label><select id="psC">'+cats.map(function(c){ return '<option value="'+E(c)+'"'+(c===PS.c?" selected":"")+'>'+E(SH.catName(c,lang==="ml"))+'</option>'; }).join("")+'</select>'+
   '<label>'+E(T("വിൽപ്പന വില (ഒന്നിന്)","Selling price (each)"))+'</label><input id="psP" type="number" inputmode="decimal" value="'+E(x.pr||"")+'">'+
   '<label>'+E(T("ഒരു പാക്കിൽ എത്ര എണ്ണം? (ഒറ്റയാണെങ്കിൽ 1)","Units in one pack (1 if single)"))+'</label><input id="psK" type="number" inputmode="numeric" value="'+E(x.pk||1)+'">'+
   '<label>'+E(T("സ്റ്റോക്ക് ഇതിൽ കുറഞ്ഞാൽ അടയാളം കാണിക്കുക","Mark LOW when stock is at or below"))+'</label><input id="psL" type="number" inputmode="numeric" value="'+E(x.lo==null?"":x.lo)+'">'+
   (pid?'':'<label>'+E(T("ഇപ്പോൾ ഉള്ള സ്റ്റോക്ക് (എണ്ണം)","Stock now (count)"))+'</label><input id="psQ" type="number" inputmode="decimal" placeholder="0">'+
    '<label>'+E(T("ആ സ്റ്റോക്കിന്റെ ആകെ വാങ്ങിയ വില (അറിയാമെങ്കിൽ)","Cost of that stock (if known)"))+'</label><input id="psV" type="number" inputmode="decimal">')+
   '<button class="tsBtn" onclick="tsPsSave()">'+E(T("സേവ് ചെയ്യുക","Save"))+'</button>'+
   (pid?'<button class="tsBtn r" onclick="tsPsHide()">'+E(p.off?T("വീണ്ടും കാണിക്കുക","Show again"):T("ഇനി വിൽക്കുന്നില്ല (മറയ്ക്കുക)","Hide (not sold any more)"))+'</button>':'')+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
 }
 window.tsPsT=function(t){
  PS.t=t; var c=$("psC");
  if(c&&(c.value==="Fish"||c.value==="Other")) c.value=t==="f"?"Fish":"Other";
  var ch=$("psT").children; ch[0].classList.toggle("on",t==="f"); ch[1].classList.toggle("on",t!=="f");
 };
 window.tsPsSave=function(){
  var n=($("psN").value||"").replace(/\s+/g," ").trim();
  if(!n){ say(T("പേര് വേണം","Enter the name")); return; }
  var dup=SH.findName(n); if(dup&&dup.id!==PS.pid){ say(T("ഈ പേരിൽ ഒരു ഇനം ഉണ്ട്","An item with this name exists")); return; }
  var x={n:n,t:PS.t,c:$("psC").value,pr:num("psP"),pk:Math.max(1,Math.round(num("psK"))||1)};
  var lo=$("psL").value; x.lo=lo===""?"":Math.max(0,parseFloat(lo)||0);
  var cb=PS.cb, pid=PS.pid, np;
  if(pid){ x.i=pid; SH.saveProduct(x); np=SH.prod(pid); }
  else { var oq=num("psQ"), ov=num("psV"); if(oq>0){ x.oq=oq; if(ov>0) x.ov=ov; } np=SH.newProduct(x); }
  closeSheet(); say(T("സേവ് ചെയ്തു","Saved"));
  if(cb) cb(np); else render();
 };
 window.tsPsHide=function(){
  var p=SH.prod(PS.pid); if(!p) return;
  SH.saveProduct({i:p.id,off:p.off?0:1}); closeSheet(); render();
 };

 /* ---------- HOME ---------- */
 TITLE.home=function(){ return "മൃതസഞ്ജീവനി"; };
 SC.home=function(){
  var t=H.today(), R=SH.report(t,t), low=SH.products().filter(function(p){ return p.low; });
  var simple=LS.get("tc_shop_simple")==="1";
  function big(bg,ic,ml,en,fn,sub){ return '<button class="tsBig" style="background:'+bg+'" onclick="'+fn+'">'+ic+' '+E(T(ml,en))+(sub?'<small>'+sub+'</small>':'')+'</button>'; }
  $("tsBody").innerHTML=
   '<div class="tsC" style="text-align:center"><div class="tsM">'+E(T("ഇന്നത്തെ വിൽപ്പന","Today's sales"))+' · '+E(dmy(t))+'</div><div class="tsTot">'+money(R.sales)+'</div>'+
   (low.length?'<div style="margin-top:6px"><span class="tsLow" onclick="tsOpen(\'stock\')">⚠ '+low.length+' '+E(T("സാധനങ്ങൾ തീരാറായി","items running low"))+'</span></div>':'')+'</div>'+
   '<div class="tsG">'+
   big("#1a8f4a","🛒","വിൽപ്പന","Sale","tsOpen('sale')")+
   big("#c9740c","📥","വാങ്ങൽ","Purchase","tsOpen('purchase')")+
   big("#0b6b78","📦","സ്റ്റോക്ക്","Stock","tsOpen('stock')")+
   big("#a12d2d","💀","ചത്തത് / നഷ്ടം","Dead / loss","tsOpen('dead')")+
   big("#6a4aa5","🧾","ചെലവ്","Expenses","tsOpen('expense')")+
   big("#2c5aa0","📊","ഇന്നത്തെ കണക്ക്","Today's account","tsOpen('report')")+
   '</div>'+
   (SH.products({all:true}).length?'':'<div class="tsC" style="background:#fff6df"><b>'+E(T("തുടക്കം","Getting started"))+'</b><div>'+E(T("ആദ്യം 'വാങ്ങൽ' അമർത്തി സാധനങ്ങൾ / മീനുകൾ ചേർക്കുക. പിന്നെ 'വിൽപ്പന' ഉപയോഗിക്കാം.","First press 'Purchase' and add your items / fish. Then use 'Sale'."))+'</div></div>')+
   '<div class="tsC" style="margin-top:16px">'+(SC["import"]?'<button class="tsBtn g s" onclick="tsOpen(\'import\')">📥 '+E(T("Excel-ൽ നിന്ന് ചേർക്കുക","Import from Excel"))+'</button>':'')+
   '<button class="tsBtn g s" onclick="tsLang()">'+(lang==="ml"?"English":"മലയാളം")+'</button>'+
   '<button class="tsBtn g s" onclick="tsSimple()">'+E(simple?T("ലാഭം കാണിക്കുക","Show profit"):T("ലാഭം മറയ്ക്കുക","Hide profit"))+'</button>'+
   '<button class="tsBtn g s" onclick="tsSyncNow()">⟳ '+E(T("സിങ്ക്","Sync"))+'</button></div>';
  syncMark();
 };
 window.tsLang=function(){ lang=lang==="ml"?"en":"ml"; LS.set("tc_shop_lang",lang); render(); };
 window.tsSimple=function(){ LS.set("tc_shop_simple",LS.get("tc_shop_simple")==="1"?"0":"1"); render(); };

 /* ---------- SALE ---------- */
 TITLE.sale=function(){ return "🛒 "+T("വിൽപ്പന","Sale"); };
 SC.sale=function(){
  var s=U.sale=U.sale&&U.sale.cart.length?U.sale:{cart:[],pm:"C",sel:null};
  s.sel=null;
  $("tsBody").innerHTML=
   '<div class="tsC">'+picker("sa",{pick:saSelect,recent:function(){ return SH.topSellers(8); },ph:T("സാധനം / മീൻ തിരയുക...","Search item / fish...")})+
   '<div id="saSel"></div></div><div class="tsC" id="saCart"></div><div id="saDay"></div>';
  saCart(); saDay();
 };
 function saSelect(p){
  U.sale.sel=p.id;
  $("saSel").innerHTML='<div style="margin-top:10px;font-size:20px;font-weight:800">'+E(p.n)+'</div><div class="tsM">'+E(stockTxt(p))+(p.low?' <span class="tsLow">LOW</span>':'')+'</div>'+
   '<div class="tsG"><div><label>'+E(T("വില (ഒന്നിന്)","Price (each)"))+'</label><input id="saPr" type="number" inputmode="decimal" value="'+E(p.pr||"")+'" oninput="tsSaCalc(\'p\')"></div>'+
   '<div><label>'+E(T("എണ്ണം","Quantity"))+'</label><input id="saQ" type="number" inputmode="decimal" value="1" oninput="tsSaCalc(\'q\')"></div></div>'+
   '<label>'+E(T("ആകെ തുക","Total"))+'</label><input id="saT" type="number" inputmode="decimal" oninput="tsSaCalc(\'t\')">'+
   '<button class="tsBtn" onclick="tsSaAdd()">➕ '+E(T("ചേർക്കുക","Add"))+'</button>';
  tsSaCalc("q"); var q=$("saQ"); if(q){ q.focus(); q.select(); }
 }
 window.tsSaCalc=function(src){
  var pr=num("saPr"), q=num("saQ"), t=num("saT");
  if(src==="t"){ if(pr>0) setv("saQ",Math.round(t/pr*1000)/1000); }
  else setv("saT",Math.round(pr*q*100)/100||"");
 };
 window.tsSaAdd=function(){
  var s=U.sale, p=SH.prod(s.sel); if(!p) return;
  var q=num("saQ"), pr=num("saPr");
  if(!(q>0)){ say(T("എണ്ണം നൽകുക","Enter the quantity")); return; }
  if(!(pr>0)){ say(T("വില നൽകുക","Enter the price")); return; }
  var have=s.cart.filter(function(l){ return l.p===p.id; }).reduce(function(a,l){ return a+l.q; },0);
  if(p.stock!=null&&q+have>p.stock+1e-9&&!confirm(T("സ്റ്റോക്കിൽ "+qty(p.stock)+" മാത്രമേ ഉള്ളൂ. എങ്ങിലും ചേർക്കട്ടേ?","Only "+qty(p.stock)+" in stock. Add anyway?"))) return;
  s.cart.push({p:p.id,n:p.n,q:q,pr:pr});
  s.sel=null; $("saSel").innerHTML=""; saCart();
  var i=$("pk_sa_i"); if(i) i.focus();
 };
 function saCart(){
  var s=U.sale, tot=s.cart.reduce(function(a,l){ return a+l.q*l.pr; },0);
  $("saCart").innerHTML=!s.cart.length?'<div class="tsM" style="text-align:center">'+E(T("വിൽക്കുന്ന സാധനം തിരഞ്ഞെടുക്കൂ","Pick the items sold"))+'</div>':
   s.cart.map(function(l,i){ return '<div class="tsRow"><div>'+E(l.n)+'<div class="tsM">'+qty(l.q)+' × '+money(l.pr)+'</div></div><div><b>'+money(l.q*l.pr)+'</b> <button class="tsX" onclick="tsSaDel('+i+')">✕</button></div></div>'; }).join("")+
   '<div class="tsRow"><span>'+E(T("ആകെ","Total"))+'</span><span class="tsTot">'+money(tot)+'</span></div>'+
   '<div><span class="tsChip'+(s.pm==="C"?" on":"")+'" onclick="tsSaPm(\'C\')">💵 '+E(T("പണം","Cash"))+'</span><span class="tsChip'+(s.pm==="U"?" on":"")+'" onclick="tsSaPm(\'U\')">📱 UPI</span></div>'+
   dateRow("saD",s.date||H.today())+
   '<button class="tsBtn" onclick="tsSaSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save sale"))+'</button>';
  if(s.cart.length) tsDateWarn($("saD"));
 }
 window.tsSaDel=function(i){ U.sale.cart.splice(i,1); saCart(); };
 window.tsSaPm=function(m){ var d=$("saD"); if(d) U.sale.date=d.value; U.sale.pm=m; saCart(); };
 window.tsSaSave=function(){
  var s=U.sale; if(!s.cart.length) return;
  var d=dateVal("saD"), g=H.uid(), tot=0;
  s.cart.forEach(function(l){
   SH.add("s",{p:l.p,q:l.q,pr:l.pr,pm:s.pm,g:g},d); tot+=l.q*l.pr;
   var p=SH.prod(l.p); if(p&&!(p.pr>0)) SH.saveProduct({i:p.id,pr:l.pr});
  });
  U.sale={cart:[],pm:"C",sel:null};
  say(T("സേവ് ചെയ്തു · ","Saved · ")+money(tot));
  render();
 };
 function saDay(){
  var t=H.today(), R=SH.report(t,t), L=R.lines.slice().reverse().slice(0,12);
  $("saDay").innerHTML=!L.length?"":'<div class="tsC"><b>'+E(T("ഇന്നത്തെ വിൽപ്പന","Today's sales"))+' ('+money(R.sales)+')</b>'+
   L.map(function(l){ return '<div class="tsRow"><div>'+E(l.p?l.p.n:"?")+'<div class="tsM">'+qty(l.r.x.q)+' × '+money(l.r.x.pr)+(l.r.x.pm==="U"?" · UPI":"")+'</div></div><div><b>'+money(l.tot)+'</b> <button class="tsX" onclick="tsCancel(\''+l.r.id+'\')">✕</button></div></div>'; }).join("")+'</div>';
 }
 window.tsCancel=function(id){
  if(!confirm(T("ഈ എൻട്രി റദ്ദാക്കട്ടേ?","Cancel this entry?"))) return;
  SH.cancel(id); say(T("റദ്ദാക്കി","Cancelled")); render();
 };

 /* ---------- PURCHASE ---------- */
 TITLE.purchase=function(){ return "📥 "+T("വാങ്ങൽ","Purchase"); };
 function newPur(){ return {sup:"",bn:"",tr:"",date:H.today(),lines:[],sel:null,stage:1}; }
 SC.purchase=function(){
  var s=U.pur=U.pur&&U.pur.lines.length?U.pur:newPur(); s.sel=null;
  if(s.stage===2){ puStage2(); return; }
  var sups=SH.suppliers();
  $("tsBody").innerHTML=
   '<div class="tsC"><label style="margin-top:0">'+E(T("വാങ്ങിയ കട (സപ്ലൈയർ)","Supplier"))+'</label><input id="puS" list="puSL" value="'+E(s.sup)+'" onchange="tsPuHead()"><datalist id="puSL">'+sups.map(function(x){ return '<option value="'+E(x)+'">'; }).join("")+'</datalist>'+
   '<div class="tsG"><div><label>'+E(T("ബിൽ നമ്പർ","Bill no."))+'</label><input id="puB" value="'+E(s.bn)+'" onchange="tsPuHead()"></div><div>'+dateRow("puD",s.date)+'</div></div></div>'+
   '<div class="tsC">'+picker("pu",{pick:puSelect,ph:T("വാങ്ങിയ സാധനം / മീൻ...","Item / fish bought...")})+'<div id="puSel"></div></div>'+
   '<div class="tsC" id="puLines"></div>';
  puLines();
 };
 window.tsPuHead=function(){ var s=U.pur; s.sup=($("puS").value||"").trim(); s.bn=($("puB").value||"").trim(); var d=$("puD"); if(d) s.date=d.value; var t=$("puT"); if(t) s.tr=t.value; };
 function puSelect(p){
  tsPuHead(); U.pur.sel=p.id;
  $("puSel").innerHTML='<div style="margin-top:10px;font-size:20px;font-weight:800">'+E(p.n)+'</div><div class="tsM">'+E(stockTxt(p))+'</div>'+
   '<div class="tsG"><div><label>'+E(T("എണ്ണം (പാക്ക്)","Count (packs)"))+'</label><input id="puQ" type="number" inputmode="decimal" oninput="tsPuCalc()"></div>'+
   '<div><label>'+E(T("ഒരു പാക്കിൽ എത്ര","Units per pack"))+'</label><input id="puK" type="number" inputmode="numeric" value="'+E(p.pk||1)+'" oninput="tsPuCalc()"></div></div>'+
   '<label id="puRL">'+E(T("ഒന്നിന്റെ വില","Price each"))+'</label><input id="puR" type="number" inputmode="decimal" oninput="tsPuCalc()">'+
   '<div class="tsM" id="puInfo" style="margin-top:6px"></div>'+
   '<button class="tsBtn" onclick="tsPuAdd()">➕ '+E(T("ചേർക്കുക","Add"))+'</button>';
  tsPuCalc(); var q=$("puQ"); if(q) q.focus();
 };
 window.tsPuCalc=function(){
  var k=Math.max(1,num("puK")), q=num("puQ"), r=num("puR");
  var l=$("puRL"); if(l) l.textContent=k>1?T("ഒരു പാക്കിന്റെ വില","Price of one pack"):T("ഒന്നിന്റെ വില","Price each");
  var i=$("puInfo"); if(i) i.textContent=(q>0&&r>0)?(qty(q*k)+" "+T("എണ്ണം","units")+" · "+T("ഒന്നിന് ","each ")+"₹"+(r/k).toFixed(2)+" · "+T("ആകെ ","total ")+money(q*r)):"";
 };
 window.tsPuAdd=function(){
  var s=U.pur, p=SH.prod(s.sel); if(!p) return;
  var q=num("puQ"), k=Math.max(1,Math.round(num("puK"))||1), r=num("puR");
  if(!(q>0)){ say(T("എണ്ണം നൽകുക","Enter the count")); return; }
  if(!(r>0)){ say(T("വില നൽകുക","Enter the price")); return; }
  s.lines.push({p:p.id,n:p.n,units:q*k,perUnit:r/k,total:q*r,pk:k});
  s.sel=null; $("puSel").innerHTML=""; puLines();
  var i=$("pk_pu_i"); if(i) i.focus();
 };
 function puLines(){
  var s=U.pur, tot=s.lines.reduce(function(a,l){ return a+l.total; },0);
  $("puLines").innerHTML=!s.lines.length?'<div class="tsM" style="text-align:center">'+E(T("വാങ്ങിയ സാധനങ്ങൾ ഒന്ന് ഒന്നായി ചേർക്കുക","Add the items bought one by one"))+'</div>':
   s.lines.map(function(l,i){ return '<div class="tsRow"><div>'+E(l.n)+'<div class="tsM">'+qty(l.units)+' × '+l.perUnit.toFixed(2)+'</div></div><div><b>'+money(l.total)+'</b> <button class="tsX" onclick="tsPuDel('+i+')">✕</button></div></div>'; }).join("")+
   '<div class="tsRow"><span>'+E(T("സാധനങ്ങൾ","Items"))+'</span><b>'+money(tot)+'</b></div>'+
   '<label>'+E(T("കൊണ്ടുവരാനുള്ള ചെലവ് (ട്രാൻസ്പോർട്ട്) - ബില്ലിൽ ഒരു തവണ മാത്രം","Transport for the whole bill (once)"))+'</label><input id="puT" type="number" inputmode="decimal" value="'+E(s.tr)+'" onchange="tsPuHead()">'+
   '<button class="tsBtn" onclick="tsPuNext()">'+E(T("അടുത്തത് → വില ഉറപ്പിക്കുക","Next → selling prices"))+'</button>';
 }
 window.tsPuDel=function(i){ tsPuHead(); U.pur.lines.splice(i,1); puLines(); };
 /* transport shared over the lines by value; landing cost per unit */
 function puLand(){
  var s=U.pur, tot=s.lines.reduce(function(a,l){ return a+l.total; },0), tr=Math.max(0,parseFloat(s.tr)||0);
  s.lines.forEach(function(l){ l.tr=tot>0?tr*l.total/tot:0; l.land=l.units>0?(l.total+l.tr)/l.units:0; });
 }
 window.tsPuNext=function(){
  tsPuHead(); var s=U.pur; if(!s.lines.length) return;
  puLand(); s.stage=2; render();
 };
 function puStage2(){
  var s=U.pur; puLand();
  $("tsBody").innerHTML='<div class="tsC"><b>'+E(T("വിൽപ്പന വില കൊടുക്കുക","Set the selling prices"))+'</b><div class="tsM">'+E(T("ട്രാൻസ്പോർട്ട് ഉൾപ്പെടെയുള്ള വാങ്ങൽ വില നോക്കി നിർദേശിക്കുന്ന വിൽപ്പന വിലയാണ് ഇത്. വേണമെങ്കിൽ മാറ്റാം.","Suggested price from the full cost (with transport). You can change it."))+'</div></div>'+
   s.lines.map(function(l,i){
    var p=SH.prod(l.p), mg=p?p.mg:50, sug=Math.round(l.land*(1+mg/100)), cur=p&&p.pr>0?p.pr:sug;
    l.price=l.price||cur;
    return '<div class="tsC"><b>'+E(l.n)+'</b><div class="tsM">'+qty(l.units)+' · '+E(T("ചെലവ് ","cost "))+l.land.toFixed(2)+' · '+E(T("നിർദേശിച്ചത് ","suggested "))+money(sug)+' ('+mg+'%)</div>'+
     '<label>'+E(T("വിൽപ്പന വില","Selling price"))+'</label><input id="puP'+i+'" type="number" inputmode="decimal" value="'+E(l.price)+'" oninput="tsPuMg('+i+')"><div class="tsM" id="puM'+i+'"></div></div>';
   }).join("")+
   '<button class="tsBtn" onclick="tsPuSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save purchase"))+'</button><button class="tsBtn g" onclick="tsPuBack()">← '+E(T("പിന്നോട്ട്","Back"))+'</button>';
  s.lines.forEach(function(l,i){ tsPuMg(i); });
 }
 window.tsPuMg=function(i){
  var l=U.pur.lines[i], pr=num("puP"+i), e=$("puM"+i); l.price=pr;
  if(e) e.textContent=l.land>0&&pr>0?T("ലാഭം ഒന്നിന് ","Profit each ")+money(pr-l.land)+" ("+Math.round((pr-l.land)/l.land*100)+"%)":"";
 };
 window.tsPuBack=function(){ U.pur.stage=1; render(); };
 window.tsPuSave=function(){
  var s=U.pur, g=H.uid(), d=s.date||H.today();
  for(var i=0;i<s.lines.length;i++){ if(!(s.lines[i].price>0)&&!confirm(T("ചില സാധനങ്ങൾക്ക് വില ഇല്ല. തുടരട്ടേ?","Some items have no selling price. Continue?"))) return; }
  s.lines.forEach(function(l){
   SH.add("b",{p:l.p,q:l.units,rt:l.perUnit,tr:l.tr||0,su:s.sup,bn:s.bn,g:g},d);
   var p=SH.prod(l.p), ch={};
   if(p){ if(l.price>0&&Math.abs(l.price-p.pr)>0.001) ch.pr=l.price; if(l.pk>1&&l.pk!==p.pk) ch.pk=l.pk; if(Object.keys(ch).length){ ch.i=p.id; SH.saveProduct(ch); } }
  });
  var n=s.lines.length; U.pur=null;
  say(T("സേവ് ചെയ്തു · ","Saved · ")+n+" "+T("ഇനങ്ങൾ","items"));
  go("home");
 };

 /* ---------- DEAD / LOSS ---------- */
 TITLE.dead=function(){ return "💀 "+T("ചത്തത് / നഷ്ടം","Dead / loss"); };
 var REASONS=[["ചത്തു","Died"],["കേടായി","Damaged"],["തീയതി കഴിഞ്ഞു","Expired"],["മറ്റ്","Other"]];
 SC.dead=function(){
  var s=U.dead={sel:null,reason:0};
  $("tsBody").innerHTML='<div class="tsC">'+picker("de",{pick:deSelect,ph:T("മീൻ / സാധനം തിരയുക...","Search fish / item...")})+'<div id="deSel"></div></div><div id="deDay"></div>';
  deDay();
 };
 function deSelect(p){
  U.dead.sel=p.id;
  $("deSel").innerHTML='<div style="margin-top:10px;font-size:20px;font-weight:800">'+E(p.n)+'</div><div class="tsM">'+E(stockTxt(p))+'</div>'+
   '<label>'+E(T("എത്ര എണ്ണം?","How many?"))+'</label><input id="deQ" type="number" inputmode="decimal" value="1">'+
   '<div style="margin-top:8px">'+REASONS.map(function(r,i){ return '<span class="tsChip'+(i===U.dead.reason?" on":"")+'" onclick="tsDeR('+i+')">'+E(T(r[0],r[1]))+'</span>'; }).join("")+'</div>'+
   dateRow("deD",H.today())+
   '<button class="tsBtn r" onclick="tsDeSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>';
  var q=$("deQ"); if(q){ q.focus(); q.select(); }
 }
 window.tsDeR=function(i){ U.dead.reason=i; var c=document.querySelectorAll("#deSel .tsChip"); for(var k=0;k<c.length;k++) c[k].classList.toggle("on",k===i); };
 window.tsDeSave=function(){
  var s=U.dead, p=SH.prod(s.sel); if(!p) return;
  var q=num("deQ"); if(!(q>0)){ say(T("എണ്ണം നൽകുക","Enter the count")); return; }
  SH.add("m",{p:p.id,q:q,r:REASONS[s.reason][1]},dateVal("deD"));
  say(T("സേവ് ചെയ്തു · നഷ്ടം ","Saved · loss ")+money(q*p.avg));
  render();
 };
 function deDay(){
  var t=H.today(), R=SH.report(t,t), L=R.deadList.slice().reverse();
  $("deDay").innerHTML=!L.length?"":'<div class="tsC"><b>'+E(T("ഇന്നത്തെ","Today"))+'</b>'+L.map(function(l){ return '<div class="tsRow"><div>'+E(l.p?l.p.n:"?")+'<div class="tsM">'+qty(l.r.x.q)+' · '+E(l.r.x.r||"")+'</div></div><div><button class="tsX" onclick="tsCancel(\''+l.r.id+'\')">✕</button></div></div>'; }).join("")+'</div>';
 }

 /* ---------- big button on the dashboard (so nobody has to look in the Menu) ---------- */
 (function(){
  var tm=null;
  function isShopBox(pb){
   var m=pb.querySelector(".card .muted"); if(!m) return false;
   return /^\s*(shop|ഷോപ്പ്)|\bshop \/ store|aquarium|\bpets?\b/i.test(m.textContent||"");
  }
  window.__tcShopIsShopPage=function(){ var pb=$("partnerBox"); return !!(pb&&isShopBox(pb)); };
  function make(){
   var c=document.createElement("div"); c.id="tcShopCard";
   c.style.cssText="cursor:pointer;display:flex;align-items:center;gap:14px;padding:16px;margin:2px 0 14px;border-radius:18px;color:#fff;background:linear-gradient(135deg,#0b7a8a,#0b5f6b);box-shadow:0 2px 8px rgba(11,95,107,.3)";
   c.setAttribute("onclick","tsOpen('home')");
   c.innerHTML='<div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">&#128722;</div>'+
    '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px">'+E(T("ഷോപ്പ് കണക്ക്","Shop accounts"))+'</div>'+
    '<div style="font-size:12.5px;opacity:.95;line-height:1.35">'+E(T("വിൽപ്പന, വാങ്ങൽ, സ്റ്റോക്ക്, ചെലവ്, ഇന്നത്തെ കണക്ക്","Sales, purchases, stock, expenses, today's account"))+'</div></div>'+
    '<div style="font-size:22px">&#8250;</div>';
   return c;
  }
  function place(){
   var app=$("app"); if(!app) return;
   var u=null; try{ u=getCurrentUser(); }catch(e){}
   var c=$("tcShopCard"), anchor=null, mode="";
   if(u&&u.role!=="customer"){
    var pb=$("partnerBox"), msg=pb?pb.querySelector("#tcMsgCard"):null;
    if(pb&&msg&&isShopBox(pb)){ anchor=msg; mode="after"; }
   }
   if(!anchor){ if(c&&c.parentNode) c.remove(); return; }
   if(!c) c=make();
   if(mode==="before"){ if(c.nextElementSibling!==anchor||c.parentNode!==anchor.parentNode) anchor.parentNode.insertBefore(c,anchor); }
   else if(c.previousElementSibling!==anchor||c.parentNode!==anchor.parentNode) anchor.parentNode.insertBefore(c,anchor.nextSibling);
  }
  function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ place(); }catch(e){ if(window.console) console.error("tc-shopcard",e); } },120); }
  function start(){ var app=$("app"); if(!app||!window.MutationObserver) return; new MutationObserver(later).observe(app,{childList:true,subtree:true}); later(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();

 /* ---------- Menu entry + address #shop ---------- */
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var u=getCurrentUser(), body=$("modalBody");
   if(u&&u.role!=="customer"&&body&&!body.querySelector("#tcShopMenu")&&typeof tcMenuItem==="function"&&window.__tcShopIsShopPage&&window.__tcShopIsShopPage()){
    var wrap=document.createElement("div"); wrap.id="tcShopMenu";
    wrap.innerHTML=tcMenuItem('<path d="M3 9l1-5h16l1 5"></path><path d="M4 9v11h16V9"></path><path d="M9 20v-6h6v6"></path>',(typeof tcBl==="function"?tcBl("Shop accounts (stock, sales, purchase)","ഷോപ്പ് കണക്ക് (സ്റ്റോക്ക്, വിൽപ്പന, വാങ്ങൽ)"):"Shop accounts"),"tsOpen('home')");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };
 try{
  if(localStorage.getItem("tc_user")){
   /* the page was reloaded while the shop was open: open it again on its own history entry */
   if(history.state&&history.state.tcShop) setTimeout(function(){ if(!U.open) openShop("home",true); },900);
   else if(location.hash==="#shop") setTimeout(function(){ openShop("home"); },900);
  }
 }catch(e){}

 window.__tcShopUi={screen:function(name,fn,title){ SC[name]=fn; if(title) TITLE[name]=title; },go:go,render:render,sheet:sheet,closeSheet:closeSheet,picker:picker,prodSheet:prodSheet,
  T:T,E:E,say:say,num:num,setv:setv,dateRow:dateRow,dateVal:dateVal,dmy:dmy,stockTxt:stockTxt,lang:function(){ return lang; },simple:function(){ return LS.get("tc_shop_simple")==="1"; },
  open:openShop,close:closeShop,body:function(){ return $("tsBody"); },isOpen:function(){ return U.open; },screenName:function(){ return U.screen; }};
})();
