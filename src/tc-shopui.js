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
  /* the pop-up sheets sit outside #tcShop: give them the same look */
  s.textContent+=s.textContent.split("}").filter(function(r){ return /^#tcShop (input|label|\.ts(Btn|Chip|PkL|Row|M|X|Tot|Low))/.test(r); }).map(function(r){ return r.replace(/#tcShop /g,"#tsSheet ")+"}"; }).join("");
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
 /* The shop gets its own history entry so the phone's Back button returns to the Dashboard. When the shop opens by itself at app start
    (no tap yet) Chrome would mark a pushed entry "skippable" and Back would leave the app - so for those automatic opens the entry
    is added at the first tap/key instead. */
 function pushEntry(){ try{ history.pushState({tcShop:1},"",location.href); }catch(e){} }
 function hadTap(){ try{ return !navigator.userActivation||navigator.userActivation.hasBeenActive; }catch(e){ return true; } }
 function deferEntry(){
  if(U.pend) return; U.pend=true;
  var evs=["pointerup","touchend","click","keydown"];
  function off(){ U.pend=false; evs.forEach(function(n){ document.removeEventListener(n,h,true); }); }
  function h(){
   if(!U.open){ off(); return; }
   if(!hadTap()) return;
   off();
   if(!(history.state&&history.state.tcShop)) pushEntry();
  }
  evs.forEach(function(n){ document.addEventListener(n,h,true); });
 }
 function openShop(screen,reuse,auto){
  if(U.open){ go(screen||"home"); return; }
  U.open=true; show();
  if(!reuse){ if(auto&&!hadTap()) deferEntry(); else pushEntry(); }
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
 SH.onChange(function(w){
  if(!U.open) return; syncMark();
  if(w==="status") return;
  try{ if(U.screen==="home") SC.home(); else if(U.screen==="sale") saDay(); else if(U.screen==="dead") deDay(); }catch(e){}
 });
 /* the other phone's entries arrive without pressing anything: while the shop is open the book is asked for news every 7 seconds (and when the app comes back to the front) */
 try{
  setInterval(function(){ try{ if(U.open&&!document.hidden&&SH.status.s!=="busy"&&SH.status.s!=="auth") SH.sync(); }catch(e){} },7000);
  document.addEventListener("visibilitychange",function(){ try{ if(U.open&&!document.hidden) SH.later(150); }catch(e){} });
 }catch(e){}

 /* ---------- small UI parts ---------- */
 function sheet(html){
  closeSheet();
  var d=document.createElement("div"); d.id="tsSheet";
  d.innerHTML='<div>'+html+'</div>'; d.addEventListener("click",function(ev){ if(ev.target===d) closeSheet(); });
  document.body.appendChild(d);
 }
 function closeSheet(){ var d=$("tsSheet"); if(d) d.remove(); }
 window.tsCloseSheet=closeSheet;
 /* The entry date is STICKY: once another day is chosen on a new-entry screen, every following entry (sale, purchase, loss, expense, money) uses that day until
    "Today" is pressed (or 90 minutes pass without use) - so a whole evening's notes of an earlier day need the date picked only once. */
 var STK={d:"",ts:0}, STKIDS=/^(saD|puD|deD|exD|crD)$/;
 function stick(){ if(STK.d&&(Date.now()-STK.ts>90*60000||STK.d>=H.today())) STK.d=""; return STK.d; }
 function stickSet(d){ if(/^\d{4}-\d{2}-\d{2}$/.test(d||"")&&d<H.today()){ STK.d=d; STK.ts=Date.now(); } else STK.d=""; }
 function dateRow(id,v){
  if(window.__tcDayPick&&v===H.today()) v=window.__tcDayPick;   /* Day book: entering for another day (tc-shopday.js) */
  else if(v===H.today()&&STKIDS.test(id)&&stick()){ v=stick(); STK.ts=Date.now(); }
  return '<label>'+E(T("തീയതി","Date"))+'</label><input type="date" id="'+id+'" value="'+E(v)+'" max="'+H.today()+'" onchange="tsDateWarn(this)">'+
   '<div id="'+id+'W" class="tsM" style="color:#a12d2d;font-weight:700"></div>';
 }
 window.tsDateWarn=function(el){
  var w=$(el.id+"W"); if(w) w.textContent=(el.value&&el.value!==H.today())?T("ഇന്നത്തെ തീയതി അല്ല!","Not today's date!"):"";
  if(STKIDS.test(el.id)&&/^\d{4}-\d{2}-\d{2}$/.test(el.value||"")){ stickSet(el.value); stkRefresh(); }
 };
 function stkInner(){
  var d=stick();
  if(d) return '<div class="tsC" style="background:#fff6df;border:2px solid #c9740c;padding:10px 12px;display:flex;align-items:center;gap:8px"><div style="flex:1"><b>📅 '+E(dmy(d))+'</b> <span class="tsM">'+E(T("ഈ തീയതിക്ക് എഴുതുന്നു","writing for this date"))+'</span></div><button class="tsBtn g s" style="margin:0" onclick="tsStkClear()">'+E(T("ഇന്നത്തേക്ക്","Today"))+'</button></div>';
  return '<div style="text-align:right;margin:2px 0 -4px"><span class="tsChip" style="padding:5px 11px;font-size:14px;margin:0" onclick="tsStkAsk()">📅 '+E(T("മറ്റൊരു ദിവസത്തെ കണക്കാണോ?","Another day's entries?"))+'</span><div id="stkAsk" class="hidden" style="margin-top:6px"><input type="date" id="stkIn" max="'+H.today()+'" onchange="tsStkPick(this.value)"></div></div>';
 }
 function stkBox(){ return '<div id="stkBox">'+stkInner()+'</div>'; }
 function stkRefresh(){ var b=$("stkBox"); if(b) b.innerHTML=stkInner(); }
 function stkApply(v,old){
  ["saD","puD","deD","exD","crD"].forEach(function(id){ var e=$(id); if(e&&(e.value===H.today()||(old&&e.value===old))){ e.value=v||H.today(); var w=$(id+"W"); if(w) w.textContent=(e.value!==H.today())?T("ഇന്നത്തെ തീയതി അല്ല!","Not today's date!"):""; } });
  if(U.sale) U.sale.date=v||""; if(U.pur&&U.pur.date) U.pur.date=v||H.today();
 }
 window.tsStkAsk=function(){ var a=$("stkAsk"); if(a) a.classList.toggle("hidden"); };
 window.tsStkPick=function(v){ var old=STK.d; if(!/^\d{4}-\d{2}-\d{2}$/.test(v||"")||v>=H.today()){ stickSet(""); stkApply("",old); } else { stickSet(v); stkApply(v,old); } stkRefresh(); if(U.screen==="home") render(); };
 window.tsStkClear=function(){ var old=STK.d; stickSet(""); stkApply("",old); stkRefresh(); if(U.screen==="home") render(); };
 function dateVal(id){ var e=$(id), v=e&&e.value; return /^\d{4}-\d{2}-\d{2}$/.test(v||"")?v:H.today(); }
 function dmy(iso){ var p=String(iso||"").split("-"); return p.length===3?p[2]+"-"+p[1]+"-"+p[0]:iso; }
 function num(id){ var e=$(id); var v=parseFloat(e&&e.value); return isNaN(v)?0:v; }
 function setv(id,v){ var e=$(id); if(e) e.value=v; }
 function un(p){ return p&&p.u?" "+p.u:""; }
 function stockTxt(p){ return p.comp?(p.can==null?"":T("ഉണ്ടാക്കാൻ പറ്റുന്നത് ","Can make ")+qty(p.can)):(p.stock==null?(p.nt?T("എണ്ണുന്നില്ല","Stock not counted"):""):T("സ്റ്റോക്ക് ","In stock ")+qty(p.stock)+un(p)); }
 function avail(p){ return p.comp?p.can:p.stock; }
 function partsTxt(p){ return (p.rc||[]).map(function(c){ var q=SH.prod(c.i); return qty(+c.q||0)+(q&&q.u?" "+q.u:"")+" "+(q?q.n:"?"); }).join(" + "); }

 /* ---------- product picker ---------- */
 var PK={};
 function picker(id,opt){
  PK[id]=opt||{};
  return '<div id="pk_'+id+'"><input id="pk_'+id+'_i" autocomplete="off" placeholder="'+E(opt.ph||T("പേര് ടൈപ്പ് ചെയ്യൂ...","Type the name..."))+'" oninput="tsPkIn(\''+id+'\')" onfocus="tsPkIn(\''+id+'\')"><div class="tsPkL hidden" id="pk_'+id+'_l"></div></div>';
 }
 window.tsPkIn=function(id){
  var i=$("pk_"+id+"_i"), l=$("pk_"+id+"_l"); if(!i||!l) return;
  var q=i.value.trim(), o=PK[id]||{};
  var L=SH.search(q,{t:o.t,noRc:o.noRc}); if(o.skip) L=L.filter(function(p){ return !o.skip(p); }); L=L.slice(0,q?8:0);
  if(!q&&o.recent) L=o.recent();
  var h=L.map(function(p){ return '<div onclick="tsPkSel(\''+id+'\',\''+p.id+'\')"><span>'+E(p.n)+'</span><small>'+E(p.comp?(p.can!=null?qty(p.can):""):(p.stock!=null?qty(p.stock):""))+(p.low?' ⚠':'')+'</small></div>'; }).join("");
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
  var AQ=SH.kind()==="aquarium", t=x.t||(AQ&&preset&&preset.t)||"i";
  var OPENMORE=!!(x.u||x.nt||x.ec||x.g||(x.rc&&x.rc.length)||x.pk>1||(x.lo!==undefined&&x.lo!==""&&x.lo!=null));
  PS={pid:pid,cb:cb,t:t,c:x.c||(t==="f"?"Fish":"Other"),rc:(x.rc||[]).map(function(c){ return {i:c.i,q:+c.q||1}; })};
  var cats=SH.categories();
  sheet('<h3 style="margin:0 0 6px">'+E(pid?T("ഇനം മാറ്റുക","Edit item"):T("പുതിയ ഇനം","New item"))+'</h3>'+
   '<label>'+E(T("പേര്","Name"))+'</label><input id="psN" value="'+E(x.n||"")+'">'+
   (AQ?'<label>'+E(T("തരം","Kind"))+'</label><div id="psT"><span class="tsChip'+(t==="f"?" on":"")+'" onclick="tsPsT(\'f\')">🐟 '+E(T("മീൻ","Fish"))+'</span><span class="tsChip'+(t!=="f"?" on":"")+'" onclick="tsPsT(\'i\')">📦 '+E(T("സാധനം","Item"))+'</span></div>':'')+
   '<label>'+E(T("വിഭാഗം","Category"))+'</label><select id="psC">'+cats.map(function(c){ return '<option value="'+E(c)+'"'+(c===PS.c?" selected":"")+'>'+E(SH.catName(c,lang==="ml"))+'</option>'; }).join("")+'</select><input id="psCN" placeholder="'+E(T("പുതിയ വിഭാഗത്തിന്റെ പേര് (വേണമെങ്കിൽ)","New category name (optional)"))+'" style="margin-top:6px">'+
   '<label>'+E(T("ഇത് എങ്ങനെയാണ് വിൽക്കുന്നത്?","How is it sold?"))+'</label><div id="psUn">'+unitChips(x.u||"","tsPsUnit")+'</div>'+
   '<label id="psPL">'+E(T("വിൽപ്പന വില ","Selling price ")+"("+perTxt(x.u||"")+")")+'</label><input id="psP" type="number" inputmode="decimal" value="'+E(x.pr||"")+'">'+
   '<details id="psMore" style="margin-top:10px"'+(OPENMORE?' open':'')+'><summary style="font-weight:800;font-size:16px;padding:8px 0">'+E(T("⚙ കൂടുതൽ ഓപ്ഷനുകൾ (അളവ്, GST, കോമ്പോ...)","⚙ More options (unit, GST, combo...)"))+'</summary>'+
   (SH.cfg("gst","0")==="1"?'<label>GST %</label><select id="psG">'+[0,5,12,18,28].map(function(g){ return '<option value="'+g+'"'+(+x.g===g?" selected":"")+'>'+g+'%</option>'; }).join("")+'</select>':'')+
   '<label>'+E(T("ഒരു പാക്കിൽ എത്ര എണ്ണം / മീറ്റർ / കിലോ? (ഒറ്റയാണെങ്കിൽ 1)","Units in one pack (1 if single)"))+'</label><input id="psK" type="number" inputmode="decimal" value="'+E(x.pk||1)+'">'+
   '<label>'+E(T("അളവിന്റെ പേര് (m, kg, ml... ; എണ്ണമാണെങ്കിൽ ഒഴിച്ചിടുക)","Unit name (m, kg, ml... leave empty for pieces)"))+'</label><input id="psU" maxlength="8" value="'+E(x.u||"")+'">'+
   '<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="psNt"'+(x.nt?" checked":"")+' style="width:auto"> '+E(T("ഇതിന്റെ സ്റ്റോക്ക് എണ്ണുന്നില്ല (തൂക്കി / അളന്ന് വാങ്ങുന്നത്)","Do not count the stock (weighed / measured)"))+'</label>'+
   '<label>'+E(T("കണക്കാക്കിയ വാങ്ങൽ വില (ഒന്നിന്) - വാങ്ങൽ ചേർക്കുന്നതുവരെ ഉപയോഗിക്കും","Estimated cost each - used until real purchases are entered"))+'</label><input id="psE" type="number" inputmode="decimal" value="'+E(x.ec||"")+'">'+
   '<label>'+E(T("സ്റ്റോക്ക് ഇതിൽ കുറഞ്ഞാൽ അടയാളം കാണിക്കുക","Mark LOW when stock is at or below"))+'</label><input id="psL" type="number" inputmode="numeric" value="'+E(x.lo==null?"":x.lo)+'">'+
   '<div style="margin-top:12px;padding:8px;border:1px dashed #9bb;border-radius:10px"><b>'+E(T("🧩 ഒന്നിലധികം സാധനങ്ങൾ ചേർന്നതാണോ? (ഉദാ: സോഡ + നാരങ്ങ)","🧩 Made of other items? (e.g. soda + lime)"))+'</b><div class="tsM">'+E(T("ഇതിൽ ഉൾപ്പെടുന്ന സാധനങ്ങൾ ചേർത്താൽ ഇത് വിൽക്കുമ്പോൾ അവയുടെ സ്റ്റോക്ക് തനിയേ കുറയും. അല്ലെങ്കിൽ ഒന്നും ചേർക്കേണ്ട.","Add the parts and each sale will take them out of stock by itself. Leave empty for a normal item."))+'</div><div id="psRc"></div>'+picker("rcp",{noRc:true,allowNew:false,ph:T("ഉൾപ്പെടുന്ന സാധനം തിരയുക...","Search a part..."),pick:psRcAdd})+'</div>'+'</details>'+
   (pid?'':'<label>'+E(T("ഇപ്പോൾ ഉള്ള സ്റ്റോക്ക് (എണ്ണം)","Stock now (count)"))+'</label><input id="psQ" type="number" inputmode="decimal" placeholder="0">'+
    '<label>'+E(T("ആ സ്റ്റോക്കിന്റെ ആകെ വാങ്ങിയ വില (അറിയാമെങ്കിൽ)","Cost of that stock (if known)"))+'</label><input id="psV" type="number" inputmode="decimal">')+
   '<button class="tsBtn" onclick="tsPsSave()">'+E(T("സേവ് ചെയ്യുക","Save"))+'</button>'+
   (pid?'<button class="tsBtn g" onclick="tsPsMerge()">🔀 '+E(T("ഇതേ ഇനം വേറെ പേരിൽ ഉണ്ട് - ഒന്നാക്കുക","Same item under another name - merge"))+'</button>'+
    '<button class="tsBtn r" onclick="tsPsDel()">🗑 '+E(T("ഡിലീറ്റ് ചെയ്യുക","Delete"))+'</button>':'')+
   (pid?'<button class="tsBtn r" onclick="tsPsHide()">'+E(p.off?T("വീണ്ടും കാണിക്കുക","Show again"):T("ഇനി വിൽക്കുന്നില്ല (മറയ്ക്കുക)","Hide (not sold any more)"))+'</button>':'')+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
  psRcDraw();
 }
 function psRcDraw(){
  var d=$("psRc"); if(!d) return;
  var cost=0, ok=true;
  var h=PS.rc.map(function(c,i){ var q=SH.prod(c.i); if(q) cost+=q.avg*(+c.q||0); return '<div class="tsRow"><div>'+E(q?q.n:"?")+(q&&q.u?' <span class="tsM">('+E(q.u)+')</span>':'')+'</div><div><input type="number" inputmode="decimal" value="'+E(c.q)+'" style="width:70px" onchange="tsPsRcQ('+i+',this.value)"> <button class="tsX" onclick="tsPsRcDel('+i+')">✕</button></div></div>'; }).join("");
  if(PS.rc.length&&cost>0) h+='<div class="tsM">'+E(T("ഇതിന്റെ ചെലവ് ≈ ₹","Cost of one ≈ ₹"))+cost.toFixed(2)+'</div>';
  d.innerHTML=h;
 }
 function psRcAdd(p){
  if(p.id===PS.pid){ say(T("ഇതിൽ തന്നെ ചേർക്കാൻ പറ്റില്ല","An item cannot contain itself")); return; }
  var f=PS.rc.filter(function(c){ return c.i===p.id; })[0];
  if(f) f.q=(+f.q||0)+1; else PS.rc.push({i:p.id,q:1});
  psRcDraw();
 }
 window.tsPsRcQ=function(i,v){ var n=parseFloat(v); if(PS.rc[i]) PS.rc[i].q=n>0?n:1; psRcDraw(); };
 window.tsPsRcDel=function(i){ PS.rc.splice(i,1); psRcDraw(); };
 window.tsPsUnit=function(u){
  var e=$("psU"); if(e) e.value=u;
  var c=document.querySelectorAll("#psUn .tsChip"); for(var i=0;i<c.length;i++){ var v=(c[i].getAttribute("onclick").match(/'([^']*)'/)||[])[1]||""; c[i].classList.toggle("on",v===u); }
  var l=$("psPL"); if(l) l.textContent=T("വിൽപ്പന വില ","Selling price ")+"("+perTxt(u)+")";
 };
 window.tsPsT=function(t){
  PS.t=t; var c=$("psC");
  if(c&&(c.value==="Fish"||c.value==="Other")) c.value=t==="f"?"Fish":"Other";
  var ct=$("psT"), ch=ct&&ct.children; if(ch&&ch.length>1){ ch[0].classList.toggle("on",t==="f"); ch[1].classList.toggle("on",t!=="f"); }
 };
 window.tsPsSave=function(){
  var n=($("psN").value||"").replace(/\s+/g," ").trim();
  if(!n){ say(T("പേര് വേണം","Enter the name")); return; }
  var dup=SH.findName(n); if(dup&&dup.id!==PS.pid){ say(T("ഈ പേരിൽ ഒരു ഇനം ഉണ്ട്","An item with this name exists")); return; }
  var cn=($("psCN").value||"").replace(/\s+/g," ").trim();
  var x={n:n,t:PS.t,c:cn||$("psC").value,pr:num("psP"),pk:Math.max(1,num("psK")||1),u:($("psU").value||"").trim().slice(0,8),nt:$("psNt").checked?1:0,ec:num("psE")>0?num("psE"):""};
  if($("psG")) x.g=+$("psG").value||0;
  var lo=$("psL").value; x.lo=lo===""?"":Math.max(0,parseFloat(lo)||0);
  var cb=PS.cb, pid=PS.pid, np, rc=PS.rc.filter(function(c){ return c.i&&(+c.q||0)>0; });
  if(rc.length&&pid&&SH.products({all:true}).some(function(o){ return o.rc&&o.rc.some(function(c){ return c.i===pid; }); })){ say(T("ഇത് വേറെ ഒരു കോമ്പോയുടെ ഭാഗമാണ്; ഇതിൽ ഭാഗങ്ങൾ ചേർക്കാൻ പറ്റില്ല","This item is a part of another combo, so it cannot have parts")); return; }
  if(rc.length&&pid){ var cur=SH.prod(pid); if(cur&&!cur.comp&&cur.stock>0&&!confirm(T("ഇതിനു സ്വന്തം സ്റ്റോക്ക് ("+qty(cur.stock)+") ഉണ്ട്. ഭാഗങ്ങൾ ചേർത്താൽ ഇത് ഇനി സ്റ്റോക്ക് ആയി കണക്കാക്കില്ല. തുടരട്ടേ?","This item has its own stock ("+qty(cur.stock)+"). With parts it is no longer counted as stock. Continue?"))) return; }
  if(pid){ x.i=pid; x.rc=rc; SH.saveProduct(x); np=SH.prod(pid); }
  else { var oq=num("psQ"), ov=num("psV"); if(rc.length) x.rc=rc; else if(oq>0&&!x.nt){ x.oq=oq; if(ov>0) x.ov=ov; } np=SH.newProduct(x); }
  closeSheet(); say(T("സേവ് ചെയ്തു","Saved"));
  if(cb) cb(np); else render();
 };
 function sim(a,b){
  function bg(x){ x=String(x||"").toLowerCase().replace(/[^a-z0-9\u0d00-\u0d7f]/g,""); var m={}, n=0; for(var i=0;i<x.length-1;i++){ m[x.substr(i,2)]=(m[x.substr(i,2)]||0)+1; n++; } return {m:m,n:n}; }
  var A=bg(a), B=bg(b); if(!A.n||!B.n) return 0; var c=0; Object.keys(A.m).forEach(function(k){ if(B.m[k]) c+=Math.min(A.m[k],B.m[k]); }); return 2*c/(A.n+B.n);
 }
 window.tsPsMerge=function(){
  var p=SH.prod(PS.pid); if(!p) return;
  var cand=SH.products().filter(function(q){ return q.id!==p.id; }).map(function(q){ return {q:q,s:sim(p.n,q.n)}; }).filter(function(o){ return o.s>=0.4; }).sort(function(x,y){ return y.s-x.s; }).slice(0,4);
  sheet('<h3 style="margin:0 0 6px">'+E(p.n)+'</h3><div class="tsM" style="line-height:1.5">'+E(T("ഇത് ഏത് ഇനത്തിന്റെ തന്നെ മറ്റൊരു പേരാണ്? അതിൽ തൊടുക.","Which item is this the same as? Tap it."))+'</div>'+
   cand.map(function(o){ return '<button class="tsBtn g" onclick="tsPsMergeTo(\''+o.q.id+'\')">'+E(o.q.n)+'</button>'; }).join("")+
   '<label>'+E(T("വേറെ ഇനം ആണെങ്കിൽ പേര് തിരയുക","Or search for another item"))+'</label>'+
   picker("mg",{noRc:false,skip:function(q){ return q.id===p.id; },allowNew:false,ph:T("ശരിയായ ഇനം തിരയുക...","Search the right item..."),pick:function(t){ tsPsMergeTo(t.id); }})+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
 };
 window.tsPsMergeTo=function(tid){
  var p=SH.prod(PS.pid), t=SH.prod(tid); if(!p||!t) return;
  sheet('<h3 style="margin:0 0 10px;line-height:1.4">'+E(p.n)+' <span style="color:#0b6b78">→</span> '+E(t.n)+'</h3>'+
   '<div class="tsM" style="line-height:1.6;font-size:15px">'+E(T("'"+p.n+"' ന്റെ എല്ലാ വിൽപ്പനയും വാങ്ങലും സ്റ്റോക്കും '"+t.n+"' ൽ ചേരും. '"+p.n+"' ലിസ്റ്റിൽ നിന്ന് മാറും.","Everything of '"+p.n+"' joins '"+t.n+"'. '"+p.n+"' leaves the list."))+'</div>'+
   '<button class="tsBtn" style="background:#1a8f4a;font-size:22px;padding:18px" onclick="tsPsMergeGo(\''+tid+'\')">✔ '+E(T("ശരി, ഒന്നാക്കുക","Yes, merge"))+'</button>'+
   '<button class="tsBtn g" onclick="tsPsMerge()">← '+E(T("പിന്നോട്ട്","Back"))+'</button>');
 };
 window.tsPsMergeGo=function(tid){
  var p=SH.prod(PS.pid), t=SH.prod(tid); if(!p||!t) return;
  SH.saveProduct({i:p.id,mg:t.id}); closeSheet(); say(T("ഒന്നാക്കി","Merged")); var cb=PS&&PS.cb; if(cb) cb(t); else render();
 };
 window.tsPsDel=function(){
  var p=SH.prod(PS.pid); if(!p) return;
  if(SH.usage(p.id)>0){ say(T("ഇതിൽ കണക്കുകൾ ഉണ്ട്. ഡിലീറ്റ് ചെയ്യാതെ 'ഒന്നാക്കുക' ഉപയോഗിക്കൂ","It has entries. Use merge, or hide it")); return; }
  if(!confirm(T("'"+p.n+"' ഡിലീറ്റ് ചെയ്യട്ടേ?","Delete '"+p.n+"'?"))) return;
  SH.saveProduct({i:p.id,dl:1}); closeSheet(); say(T("ഡിലീറ്റ് ചെയ്തു","Deleted")); render();
 };
 window.tsPsHide=function(){
  var p=SH.prod(PS.pid); if(!p) return;
  SH.saveProduct({i:p.id,off:p.off?0:1}); closeSheet(); render();
 };

 function duesSub(){ try{ var L=SH.ledger(); return (L.custTotal>0?E(T("കിട്ടാനുള്ളത് ","To get "))+money(L.custTotal):"")+(L.custTotal>0&&L.supTotal>0?" · ":"")+(L.supTotal>0?E(T("കൊടുക്കാനുള്ളത് ","To pay "))+money(L.supTotal):""); }catch(e){ return ""; } }

 /* ---------- HOME ---------- */
 function shopName(){
  var n=SH.cfg("name","");
  if(n) return n;
  if(!SH.cfg("kind","")&&SH.kind()==="aquarium") return "മൃതസഞ്ജീവനി";   /* the first shop: a book from before the settings existed */
  try{ var pn=window._myPartner&&(window._myPartner.business_name||window._myPartner.name); if(pn) return pn; }catch(e){}
  return T("എന്റെ ഷോപ്പ്","My shop");
 }
 TITLE.home=function(){ return shopName(); };
 SC.home=function(){
  var t=H.today(), R=SH.report(t,t), low=SH.products().filter(function(p){ return p.low; });
  var simple=LS.get("tc_shop_simple")==="1";
  function big(bg,ic,ml,en,fn,sub){ return '<button class="tsBig" style="background:'+bg+'" onclick="'+fn+'">'+ic+' '+E(T(ml,en))+(sub?'<small>'+sub+'</small>':'')+'</button>'; }
  $("tsBody").innerHTML=
   (stick()?stkBox():"")+
   (SH.kind()===""?'<div class="tsC" style="background:#fff6df"><b>'+E(T("ഇത് ഏത് തരം ഷോപ്പ് ആണ്?","What kind of shop is this?"))+'</b>'+
    '<button class="tsBtn" onclick="tsKind(\'aquarium\')">🐠 '+E(T("അക്വേറിയം / വളർത്തുമൃഗങ്ങൾ","Aquarium / pets"))+'</button>'+
    '<button class="tsBtn g" onclick="tsKind(\'general\')">🏪 '+E(T("മറ്റ് കട (സാധനങ്ങൾ വിൽക്കുന്ന)","Another shop (goods)"))+'</button></div>':'')+
   '<div class="tsC" style="text-align:center"><div class="tsM">'+E(T("ഇന്നത്തെ വിൽപ്പന","Today's sales"))+' · '+E(dmy(t))+'</div><div class="tsTot">'+money(R.sales)+'</div>'+
   (low.length?'<div style="margin-top:6px"><span class="tsLow" onclick="tsOpen(\'stock\')">⚠ '+low.length+' '+E(T("സാധനങ്ങൾ തീരാറായി","items running low"))+'</span></div>':'')+'</div>'+
   '<div class="tsG">'+
   big("#1a8f4a","🛒","വിൽപ്പന","Sale","tsOpen('sale')")+
   big("#c9740c","📥","വാങ്ങൽ","Purchase","tsOpen('purchase')")+
   big("#0b6b78","📦","സ്റ്റോക്ക്","Stock","tsOpen('stock')")+
   big("#a12d2d","💀",lossName(),lossName(),"tsOpen('dead')")+
   big("#6a4aa5","🧾","ചെലവ്","Expenses","tsOpen('expense')")+
   big("#2c5aa0","📊","ഇന്നത്തെ കണക്ക്","Today's account","tsOpen('report')")+
   (SC.dues?big("#7a5a14","📒","കടം / കിട്ടാനുള്ളത്","Credit & dues","tsOpen('dues')",duesSub()):'')+
   '</div>'+
   (SH.products({all:true}).length?'':'<div class="tsC" style="background:#fff6df"><b>'+E(T("തുടക്കം","Getting started"))+'</b><div>'+E(T("ആദ്യം 'വാങ്ങൽ' അമർത്തി സാധനങ്ങൾ / മീനുകൾ ചേർക്കുക. പിന്നെ 'വിൽപ്പന' ഉപയോഗിക്കാം.","First press 'Purchase' and add your items / fish. Then use 'Sale'."))+'</div></div>')+
   '<div class="tsC" style="margin-top:16px">'+(SC["import"]?'<button class="tsBtn g s" onclick="tsOpen(\'import\')">📥 '+E(T("Excel-ൽ നിന്ന് ചേർക്കുക","Import from Excel"))+'</button>':'')+
   '<button class="tsBtn g s" onclick="tsLang()">'+(lang==="ml"?"English":"മലയാളം")+'</button>'+
   '<button class="tsBtn g s" onclick="tsSimple()">'+E(simple?T("ലാഭം കാണിക്കുക","Show profit"):T("ലാഭം മറയ്ക്കുക","Hide profit"))+'</button>'+
   (SC.settings?'<button class="tsBtn g s" onclick="tsOpen(\'settings\')">⚙ '+E(T("സെറ്റിങ്സ്","Settings"))+'</button>':'')+
   '<button class="tsBtn g s" onclick="tsSyncNow()">⟳ '+E(T("സിങ്ക്","Sync"))+'</button></div>'+
   (window.__tcPers&&window.__tcPers.shopLock&&window.__tcPers.shopLock.homeLine?window.__tcPers.shopLock.homeLine():"");
  syncMark();
 };
 window.tsKind=function(k){ SH.setCfg("kind",k); render(); };
 window.tsLang=function(){ lang=lang==="ml"?"en":"ml"; LS.set("tc_shop_lang",lang); render(); };
 window.tsSimple=function(){ LS.set("tc_shop_simple",LS.get("tc_shop_simple")==="1"?"0":"1"); render(); };

/* ---------- units: how an item is sold ---------- */
 var UNITS=[["","എണ്ണം","Count","ഒന്നിന്","each"],["kg","കിലോ","kg","ഒരു കിലോയ്ക്ക്","per kg"],["g","ഗ്രാം","g","ഒരു ഗ്രാമിന്","per g"],["L","ലിറ്റർ","L","ഒരു ലിറ്ററിന്","per L"],["ml","മില്ലി","ml","ഒരു മില്ലിക്ക്","per ml"],["m","മീറ്റർ","m","ഒരു മീറ്ററിന്","per m"]];
 function perTxt(u){ for(var i=0;i<UNITS.length;i++) if(UNITS[i][0]===(u||"")) return T(UNITS[i][3],UNITS[i][4]); return T("ഒന്നിന്","each"); }
 function unitChips(cur,fn){
  cur=cur||""; var L=UNITS.slice(), known=L.some(function(x){ return x[0]===cur; });
  if(!known) L.push([cur,cur,cur,"",""]);
  return L.map(function(x){ return '<span class="tsChip'+(x[0]===cur?" on":"")+'" style="padding:6px 12px;font-size:15px" onclick="'+fn+'(\''+E(x[0])+'\')">'+E(T(x[1],x[2]))+'</span>'; }).join("");
 }
 function rt(n){ return "₹"+(Math.round((+n||0)*100)/100).toLocaleString("en-IN"); }   /* a RATE keeps its paise: 176.47 is not shown as 176 */
 function enc(k){ return encodeURIComponent(k).replace(/'/g,"%27"); }

/* ---------- how it was paid: one way (chips) or in parts (cash + UPI + card + bank + credit) ---------- */
 /* payment chips for money received / paid: Cash, UPI, Card, Bank (the chip's data-m is the code) */
 var MK=["C","U","D","B"];
 function mchips(id,on,fn){
  return '<div id="'+id+'">'+MK.map(function(m){ var p=pmOf(m); return '<span class="tsChip'+(on===m?" on":"")+'" data-m="'+m+'" onclick="'+fn+'(\''+m+'\')">'+p[1]+" "+E(T(p[2],p[3]))+'</span>'; }).join("")+'</div>';
 }
 function mchipSet(id,m){ var c=document.querySelectorAll("#"+id+" .tsChip"); for(var i=0;i<c.length;i++) c[i].classList.toggle("on",c[i].getAttribute("data-m")===m); }
 function mchipOk(m){ return MK.indexOf(m)>=0?m:"C"; }
 var PMS=[["C","💵","പണം","Cash"],["U","📱","UPI","UPI"],["D","💳","കാർഡ്","Card"],["B","🏦","ബാങ്ക് ട്രാൻസ്ഫർ","Bank transfer"],["K","📒","കടം","Credit"]];
 function pmList(){ return PMS.filter(function(m){ return m[0]!=="K"||SH.ledger; }); }
 function pmOf(c){ for(var i=0;i<PMS.length;i++) if(PMS[i][0]===c) return PMS[i]; return PMS[0]; }
 /* text of how a sale was paid; plain = no icons (Excel) */
 function pmTxt(x,plain){
  x=x||{}; var ic=function(c){ return plain?"":pmOf(c)[1]+" "; }, nm=function(c){ return plain?pmOf(c)[3]:T(pmOf(c)[2],pmOf(c)[3]); };
  if(x.sp){ return Object.keys(x.sp).map(function(m){ return ic(m)+nm(m)+" "+(plain?Math.round(x.sp[m]*100)/100:money(x.sp[m])); }).join(" + ")+(x.sp.K>0&&x.cu?" · "+x.cu:""); }
  var m=x.pm||"C";
  if(m==="K") return (plain?"Credit: "+(x.cu||""):"📒 "+T("കടം","Credit")+(x.cu?" · "+x.cu:""));
  if(m==="O") return plain?"Other":T("മറ്റ്","Other");
  return ic(m)+nm(m);
 }
 var PW={};
 function pwNew(id,o){ PW[id]={pm:o.pm||"C",split:!!o.split,sp:o.sp||{},cu:o.cu||"",cuId:o.cuId,tot:o.tot||0}; return PW[id]; }
 function pwNum(v){ var n=parseFloat(v); return n>0?Math.round(n*100)/100:0; }
 function pwSum(w){ var t=0; pmList().forEach(function(m){ t+=pwNum(w.sp[m[0]]); }); return Math.round(t*100)/100; }
 function pwCu(w){
  return '<div id="pw_'+w.id+'_cu" style="display:'+(w.split?(pwNum(w.sp.K)>0?"block":"none"):"block")+'"><label>'+E(T("ആർക്കാണ് കടം? (പേര്)","Credit to whom? (name)"))+'</label><input id="'+w.cuId+'" list="'+w.cuId+'L" value="'+E(w.cu||"")+'" onchange="tsPwCu(\''+w.id+'\')"><datalist id="'+w.cuId+'L">'+SH.ledger().cust.map(function(c){ return '<option value="'+E(c.n)+'">'; }).join("")+'</datalist></div>';
 }
 function pwInner(id){
  var w=PW[id], h="";
  if(!w.split){
   h+='<div>'+pmList().map(function(m){ return '<span class="tsChip'+(w.pm===m[0]?" on":"")+'" onclick="tsPwPm(\''+id+'\',\''+m[0]+'\')">'+m[1]+' '+E(T(m[2],m[3]))+'</span>'; }).join("")+'</div>';
   if(w.pm==="K"&&SH.ledger) h+=pwCu(w);
   h+='<div style="margin-top:6px"><span class="tsChip" style="padding:5px 11px;font-size:14px;margin:0" onclick="tsPwSplit(\''+id+'\')">➗ '+E(T("പല രീതിയിൽ കിട്ടി (ഭാഗികമായി)","Paid in parts (cash + UPI...)"))+'</span></div>';
  }else{
   h+='<div class="tsM" style="margin-top:8px;font-weight:700">'+E(T("ഓരോ രീതിയിലും എത്ര കിട്ടി? (പേരിൽ അമർത്തിയാൽ ബാക്കി തുക വരും)","How much came each way? (tap a name to put the rest)"))+'</div>'+
    pmList().map(function(m){ return '<div class="tsRow" style="border:0;padding:3px 0"><span style="min-width:150px" onclick="tsPwFill(\''+id+'\',\''+m[0]+'\')">'+m[1]+' <b>'+E(T(m[2],m[3]))+'</b></span><input id="pw_'+id+'_'+m[0]+'" type="number" inputmode="decimal" value="'+E(w.sp[m[0]]||"")+'" oninput="tsPwIn(\''+id+'\')" style="width:120px;padding:8px"></div>'; }).join("")+
    '<div id="pw_'+id+'_rest" class="tsM" style="font-weight:800;margin-top:4px"></div>'+(SH.ledger?pwCu(w):"")+
    '<div style="margin-top:6px"><span class="tsChip" style="padding:5px 11px;font-size:14px;margin:0" onclick="tsPwSplit(\''+id+'\')">← '+E(T("ഒറ്റ രീതി","One way"))+'</span></div>';
  }
  return h;
 }
 function payHtml(id){ return '<div id="pw_'+id+'">'+pwInner(id)+'</div>'; }
 function pwRest(id){
  var w=PW[id], e=$("pw_"+id+"_rest"); if(!w||!e) return;
  var rest=Math.round((w.tot-pwSum(w))*100)/100, ok=Math.abs(rest)<0.5;
  e.textContent=T("ആകെ ","Total ")+money(w.tot)+" · "+T("ഇട്ടത് ","entered ")+money(pwSum(w))+" · "+(ok?"✔":T("ബാക്കി ","rest ")+money(rest)); e.style.color=ok?"#177044":"#a12d2d";
  var c=$("pw_"+id+"_cu"); if(c) c.style.display=pwNum(w.sp.K)>0?"block":"none";
 }
 function pwRedraw(id){ var e=$("pw_"+id); if(e) e.innerHTML=pwInner(id); pwRest(id); }
 function pwReadCu(w){ var c=w.cuId&&$(w.cuId); if(c) w.cu=(c.value||"").replace(/\s+/g," ").trim(); }
 function pwReadIn(w){ pmList().forEach(function(m){ var e=$("pw_"+w.id+"_"+m[0]); if(e) w.sp[m[0]]=e.value; }); }
 window.tsPwPm=function(id,m){ var w=PW[id]; if(!w) return; pwReadCu(w); w.pm=m; pwRedraw(id); };
 window.tsPwCu=function(id){ var w=PW[id]; if(w) pwReadCu(w); };
 window.tsPwSplit=function(id){
  var w=PW[id]; if(!w) return; pwReadCu(w);
  if(!w.split){ w.split=true; w.sp={}; if(w.tot>0) w.sp[w.pm]=String(Math.round(w.tot*100)/100); }
  else { pwReadIn(w); var best=w.pm, bv=-1; pmList().forEach(function(m){ var v=pwNum(w.sp[m[0]]); if(v>bv){ bv=v; best=m[0]; } }); if(bv>0) w.pm=best; w.split=false; }
  pwRedraw(id);
 };
 window.tsPwIn=function(id){ var w=PW[id]; if(!w) return; pwReadIn(w); pwRest(id); };
 window.tsPwFill=function(id,m){
  var w=PW[id]; if(!w) return; pwReadIn(w); var others=0;
  pmList().forEach(function(x){ if(x[0]!==m) others+=pwNum(w.sp[x[0]]); });
  var rest=Math.max(0,Math.round((w.tot-others)*100)/100); w.sp[m]=rest?String(rest):""; var e=$("pw_"+id+"_"+m); if(e) e.value=w.sp[m]; pwRest(id);
 };
 function payInit(id,o){ o=o||{}; o.cuId=o.cuId||("pw"+id+"Cu"); var w=pwNew(id,o); w.id=id; return w; }
 function payTot(id,tot){ var w=PW[id]; if(!w) return; w.tot=Math.round((+tot||0)*100)/100; pwRest(id); }
 /* what to store: {ok,pm,sp,bt,cu} or {ok:false,msg} */
 function payRes(id,tot){
  var w=PW[id]; if(!w) return {ok:true,pm:"C",cu:""}; pwReadCu(w);
  if(w.split){
   pwReadIn(w); var sp={}, keys=[], sum=0;
   pmList().forEach(function(m){ var v=pwNum(w.sp[m[0]]); if(v>0){ sp[m[0]]=v; keys.push(m[0]); sum+=v; } });
   sum=Math.round(sum*100)/100;
   if(!keys.length||Math.abs(sum-tot)>0.5) return {ok:false,msg:T("തുക ചേരുന്നില്ല - ബാക്കി ","Amounts do not add up - rest ")+money(Math.round((tot-sum)*100)/100)};
   if(sp.K>0&&!w.cu) return {ok:false,msg:T("കടം വാങ്ങുന്ന ആളുടെ പേര് നൽകുക","Enter the customer's name")};
   keys.sort(function(a,b){ return sp[b]-sp[a]; });
   if(keys.length===1) return {ok:true,pm:keys[0],cu:keys[0]==="K"?w.cu:""};
   return {ok:true,pm:keys[0],sp:sp,bt:sum,cu:sp.K>0?w.cu:""};
  }
  if(w.pm==="K"&&!w.cu) return {ok:false,msg:T("കടം വാങ്ങുന്ന ആളുടെ പേര് നൽകുക","Enter the customer's name")};
  return {ok:true,pm:w.pm,cu:w.pm==="K"?w.cu:""};
 }

 /* customers of earlier sales (optional name + mobile on a sale, like a bill): the last mobile used with a name is offered again */
 function custList(){
  var seen={}, out=[], L=SH.calc().live;
  for(var i=L.length-1;i>=0&&out.length<80;i--){ var r=L[i]; if(r.k==="s"&&r.x&&r.x.cn){ var k=H.nm(r.x.cn); if(!seen[k]){ seen[k]=1; out.push({n:r.x.cn,m:r.x.cm||""}); } } }
  return out;
 }
 function custOpts(){ return custList().map(function(c){ return '<option value="'+E(c.n)+'">'; }).join(""); }
 function cleanMob(v){ return String(v||"").replace(/[^0-9+ ]/g,"").replace(/\s+/g," ").trim().slice(0,15); }
 function cleanName(v){ return String(v||"").replace(/\s+/g," ").trim().slice(0,40); }
 function custMobile(name){ var k=H.nm(name), L=custList(); for(var i=0;i<L.length;i++) if(H.nm(L[i].n)===k) return L[i].m; return ""; }
 window.tsCustFill=function(nameId,mobId){ var n=$(nameId), m=$(mobId); if(n&&m&&!m.value.trim()){ var v=custMobile(n.value); if(v) m.value=v; } };

 /* ---------- SALE ---------- */
 TITLE.sale=function(){ return "🛒 "+T("വിൽപ്പന","Sale"); };
 SC.sale=function(){
  var fresh=!(U.sale&&U.sale.cart.length), s=U.sale=fresh?{cart:[],pm:"C",sel:null}:U.sale;
  if(fresh||!PW.sa) payInit("sa",{cuId:"saCu"});
  s.sel=null;
  $("tsBody").innerHTML=stkBox()+
   '<div class="tsC">'+picker("sa",{pick:saSelect,recent:function(){ return SH.topSellers(8); },ph:T("സാധനം / മീൻ തിരയുക...","Search item / fish...")})+
   '<div id="saSel"></div></div><div class="tsC" id="saCart"></div><div id="saDay"></div>';
  saCart(); saDay();
 };
 function saSelect(p){
  U.sale.sel=p.id;
  $("saSel").innerHTML='<div style="margin-top:10px;font-size:20px;font-weight:800">'+E(p.n)+'</div><div class="tsM">'+E(stockTxt(p))+(p.low?' <span class="tsLow">LOW</span>':'')+'</div>'+(p.comp?'<div class="tsM">= '+E(partsTxt(p))+'</div>':'')+
   (p.comp?'':'<div class="tsM" style="margin-top:8px">'+E(T("വിൽക്കുന്നത്:","Sold by:"))+'</div><div id="saUn">'+unitChips(p.u,"tsSaUnit")+'</div>')+
   '<div class="tsG"><div><label>'+E(T("വില ","Price ")+"("+perTxt(p.u)+")")+'</label><input id="saPr" type="number" inputmode="decimal" value="'+E(p.pr||"")+'" oninput="tsSaCalc(\'p\')"></div>'+
   '<div><label>'+E(T("എണ്ണം","Quantity")+(p.u?" ("+p.u+")":""))+'</label><input id="saQ" type="number" inputmode="decimal" value="1" oninput="tsSaCalc(\'q\')"></div></div>'+
   '<label>'+E(T("ആകെ തുക","Total"))+'</label><input id="saT" type="number" inputmode="decimal" oninput="tsSaCalc(\'t\')">'+
   '<div class="tsM" id="saHint" style="margin-top:4px"></div>'+
   '<button class="tsBtn" onclick="tsSaAdd()">➕ '+E(T("ചേർക്കുക","Add"))+'</button>';
  tsSaCalc("q"); var q=$("saQ"); if(q){ q.focus(); q.select(); }
 }
 /* the unit can be set right here (count / kg / g / L / ml / m); typed numbers stay */
 window.tsSaUnit=function(u){
  var s=U.sale, p=s&&s.sel?SH.prod(s.sel):null; if(!p) return;
  var pr=$("saPr").value, q=$("saQ").value, t=$("saT").value, src=s.src;
  SH.saveProduct({i:p.id,u:(u||"").slice(0,8)});
  saSelect(SH.prod(p.id)); $("saPr").value=pr; $("saQ").value=q; $("saT").value=t; s.src=src; hint();
 };
 /* counted items (no unit, stock counted): typing the TOTAL changes the price of each, never the count (80 for 4 fish = 20 each, not 2.667 fish);
    weighed / measured items (unit set or "not counted") still get quantity = total / price.
    A small difference (30.6 -> 30, 99 -> 100) is only a ROUND-OFF: quantity AND the rate as typed (180 per kg) stay, only the total differs. */
 function counted(){ var p=U.sale&&U.sale.sel?SH.prod(U.sale.sel):null; return !!p&&!p.u&&!p.nt; }
 function near(pr,q,t){ return q>0&&pr>0&&t>0&&Math.abs(t-pr*q)<=Math.max(2,pr*q*0.03); }
 function hint(){
  var h=$("saHint"); if(!h) return; var q=num("saQ");
  h.textContent=(counted()&&q>0&&Math.abs(q-Math.round(q))>1e-9)?T("⚠ എണ്ണം പൂർണ്ണസംഖ്യ അല്ല - കിലോ / ലിറ്റർ ആണെങ്കിൽ മുകളിൽ അത് അമർത്തുക","⚠ Not a whole number - if it is sold by kg / litre, press it above"):"";
  h.style.color="#c9740c"; h.style.fontWeight="700";
 }
 window.tsSaCalc=function(src){
  var pr=num("saPr"), q=num("saQ"), t=num("saT");
  if(U.sale) U.sale.src=src;
  if(src==="t"){
   if(near(pr,q,t)){ /* round-off only: nothing else changes */ }
   else if(counted()){ if(q>0&&t>0) setv("saPr",Math.round(t/q*100)/100); }
   else if(pr>0) setv("saQ",Math.round(t/pr*1000)/1000);
  }
  else setv("saT",Math.round(pr*q*100)/100||"");
  hint();
 };
 window.tsSaAdd=function(){
  var s=U.sale, p=SH.prod(s.sel); if(!p) return;
  var q=num("saQ"), pr=num("saPr"), rp=null;
  if(!(q>0)){ say(T("എണ്ണം നൽകുക","Enter the quantity")); return; }
  if(!(pr>0)){ say(T("വില നൽകുക","Enter the price")); return; }
  var tt=num("saT");
  if(s.src==="t"&&tt>0&&Math.abs(tt-pr*q)>0.004){
   if(near(pr,q,tt)){ rp=pr; pr=tt/q; }          /* round-off: the total is exactly what was typed, the rate shown stays as typed */
   else if(counted()) pr=tt/q;                      /* total typed last: keep it exact (80 stays 80, not 80.01) */
  }
  if(counted()&&Math.abs(q-Math.round(q))>1e-9&&!confirm(T("എണ്ണം "+qty(q)+" ആണ് - പൂർണ്ണസംഖ്യ അല്ല. ഇങ്ങനെ തന്നെ ചേർക്കട്ടേ?","The count is "+qty(q)+" - not a whole number. Add it like this?"))) return;
  var have=s.cart.filter(function(l){ return l.p===p.id; }).reduce(function(a,l){ return a+l.q; },0);
  var av=avail(p);
  if(av!=null&&q+have>av+1e-9&&!confirm(p.comp?T("സ്റ്റോക്കിലുള്ളതുകൊണ്ട് "+qty(av)+" എണ്ണം മാത്രമേ ഉണ്ടാക്കാൻ പറ്റൂ. എങ്ങിലും ചേർക്കട്ടേ?","Only "+qty(av)+" can be made from the stock. Add anyway?"):T("സ്റ്റോക്കിൽ "+qty(av)+" മാത്രമേ ഉള്ളൂ. എങ്ങിലും ചേർക്കട്ടേ?","Only "+qty(av)+" in stock. Add anyway?"))) return;
  var ln={p:p.id,n:p.n,q:q,pr:pr}; if(rp) ln.rp=rp;
  s.cart.push(ln);
  s.sel=null; $("saSel").innerHTML=""; saCart();
  var i=$("pk_sa_i"); if(i) i.focus();
 };
 function saCart(){
  var s=U.sale, tot=s.cart.reduce(function(a,l){ return a+l.q*l.pr; },0);
  $("saCart").innerHTML=!s.cart.length?'<div class="tsM" style="text-align:center">'+E(T("വിൽക്കുന്ന സാധനം തിരഞ്ഞെടുക്കൂ","Pick the items sold"))+'</div>':
   s.cart.map(function(l,i){ var p=SH.prod(l.p), u=p&&p.u?" "+p.u:""; return '<div class="tsRow"><div>'+E(l.n)+'<div class="tsM">'+qty(l.q)+E(u)+' × '+rt(l.rp||l.pr)+(p&&p.u?' / '+E(p.u):'')+'</div></div><div><b>'+money(l.q*l.pr)+'</b> <button class="tsX" onclick="tsSaDel('+i+')">✕</button></div></div>'; }).join("")+
   '<div class="tsRow"><span>'+E(T("ആകെ","Total"))+'</span><span class="tsTot">'+money(tot)+'</span></div>'+
   payHtml("sa")+
   dateRow("saD",s.date||H.today())+
   '<details style="margin-top:8px"'+((s.no||s.cn||s.cm)?' open':'')+'><summary style="font-weight:700;font-size:15px;color:#35566a">👤 '+E(T("കസ്റ്റമർ / കുറിപ്പ് (വേണമെങ്കിൽ)","Customer / note (optional)"))+'</summary>'+
   '<label>'+E(T("കസ്റ്റമറുടെ പേര്","Customer name"))+'</label><input id="saCn" list="saCnL" maxlength="40" value="'+E(s.cn||"")+'" onchange="tsSaCn(this.value)"><datalist id="saCnL">'+custOpts()+'</datalist>'+
   '<label>'+E(T("മൊബൈൽ നമ്പർ","Mobile number"))+'</label><input id="saCm" type="tel" inputmode="tel" maxlength="15" value="'+E(s.cm||"")+'" onchange="tsSaCm(this.value)">'+
   '<label>'+E(T("കുറിപ്പ്","Note"))+'</label><input id="saNo" maxlength="80" value="'+E(s.no||"")+'" placeholder="'+E(T("ഉദാ: 2 അടി ടാങ്ക്, ₹1500","e.g. 2 ft tank, ₹1500"))+'" onchange="tsSaNo(this.value)"></details>'+
   '<button class="tsBtn" onclick="tsSaSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save sale"))+'</button>';
  if(s.cart.length){ tsDateWarn0($("saD")); payTot("sa",tot); }
 }
 function tsDateWarn0(el){ var w=el&&$(el.id+"W"); if(w) w.textContent=(el.value&&el.value!==H.today())?T("ഇന്നത്തെ തീയതി അല്ല!","Not today's date!"):""; }
 window.tsSaDel=function(i){ U.sale.cart.splice(i,1); saCart(); };
 window.tsSaCu=function(v){ U.sale.cu=(v||"").replace(/\s+/g," ").trim(); if(PW.sa) PW.sa.cu=U.sale.cu; };
 window.tsSaCn=function(v){ U.sale.cn=cleanName(v); tsCustFill("saCn","saCm"); var m=$("saCm"); if(m) U.sale.cm=cleanMob(m.value); var cu=$("saCu"); if(cu&&!cu.value.trim()&&U.sale.cn){ cu.value=U.sale.cn; if(PW.sa) PW.sa.cu=U.sale.cn; } };
 window.tsSaCm=function(v){ U.sale.cm=cleanMob(v); };
 window.tsSaNo=function(v){ U.sale.no=(v||"").replace(/\s+/g," ").trim().slice(0,80); };
 window.tsSaPm=function(m){ var d=$("saD"); if(d) U.sale.date=d.value; var n=$("saNo"); if(n) tsSaNo(n.value); U.sale.pm=m; tsPwPm("sa",m); };
 window.tsSaSave=function(){
  var s=U.sale; if(!s.cart.length) return;
  var nn=$("saNo"); if(nn) tsSaNo(nn.value);
  var cn0=$("saCn"); if(cn0) U.sale.cn=cleanName(cn0.value); var cm0=$("saCm"); if(cm0) U.sale.cm=cleanMob(cm0.value);
  { var cin=$("saCu"); if(cin&&!cin.value.trim()&&s.cn) cin.value=s.cn; }
  var d=dateVal("saD"), g=H.uid(), tot=0, all=s.cart.reduce(function(a,l){ return a+l.q*l.pr; },0);
  var pr0=payRes("sa",all); if(!pr0.ok){ say(pr0.msg); return; }
  s.pm=pr0.pm; s.cu=pr0.cu;
  s.cart.forEach(function(l){
   var p=SH.prod(l.p), rec={p:l.p,q:l.q,pr:l.pr,pm:s.pm,g:g};
   if(pr0.sp){ rec.sp=pr0.sp; rec.bt=pr0.bt; }
   if(l.rp) rec.rp=l.rp;
   if(s.no) rec.no=s.no;
   if(s.cn) rec.cn=s.cn;
   if(s.cm) rec.cm=s.cm;
   if(s.cu) rec.cu=s.cu;
   if(p&&p.g>0&&SH.cfg("gst","0")==="1") rec.gr=p.g;
   if(p&&p.comp) rec.rc=p.rc.map(function(c){ return {i:c.i,q:+c.q||0}; });
   SH.add("s",rec,d); tot+=l.q*l.pr; if(p&&!(p.pr>0)) SH.saveProduct({i:p.id,pr:l.rp||l.pr});
  });
  U.sale={cart:[],pm:"C",sel:null}; payInit("sa",{cuId:"saCu"});
  say(T("സേവ് ചെയ്തു · ","Saved · ")+money(tot)+(s.cu?" · "+s.cu:"")+(d!==H.today()?" · "+dmy(d):""));
  render();
 };
 function saDay(){
  var box=$("saDay"); if(!box) return;
  var t=H.today(), R=SH.report(t,t), L=R.lines.slice().reverse().slice(0,12);
  /* one row per BILL (lines of one sale share x.g): the items under each other, customer, payment, note */
  var G={}, order=[];
  R.lines.forEach(function(l){ var k=l.r.x.g||l.r.id; if(!G[k]){ G[k]={k:k,ls:[],tot:0}; order.push(G[k]); } G[k].ls.push(l); G[k].tot+=l.tot; });
  order=order.slice().reverse().slice(0,12);
  box.innerHTML=!order.length?"":'<div class="tsC"><b>'+E(T("ഇന്നത്തെ വിൽപ്പന","Today's sales"))+' ('+money(R.sales)+')</b><div class="tsM">'+E(T("തിരുത്താൻ ഒരു വരിയിൽ അമർത്തുക","Tap a line to edit"))+'</div>'+
   order.map(function(g){ var x=g.ls[0].r.x;
    return '<div class="tsRow" onclick="tsEntry(\''+enc(g.k)+'\')"><div>'+g.ls.map(function(l){ var y=l.r.x, u=l.p&&l.p.u?" "+l.p.u:""; return '<div>'+E(l.p?l.p.n:"?")+' <span class="tsM">'+qty(y.q)+E(u)+' × '+rt(y.rp||y.pr)+'</span></div>'; }).join("")+
     ((x.pm&&x.pm!=="C")||x.sp?'<div class="tsM">'+E(pmTxt(x))+'</div>':'')+(x.cn||x.cm?'<div class="tsM">👤 '+E(x.cn||"")+(x.cn&&x.cm?" · ":"")+E(x.cm||"")+'</div>':'')+(x.no?'<div class="tsM">📝 '+E(x.no)+'</div>':'')+'</div><div style="white-space:nowrap"><b>'+money(g.tot)+'</b> ✏ <button class="tsX" onclick="event.stopPropagation();tsCancelBill(\''+enc(g.k)+'\')">✕</button></div></div>'; }).join("")+'</div>';
 }
 /* tap an entry in a list: the Day book's edit sheet (tc-shopday.js) - quantity, price, total, payment, date, note - or cancel */
 window.tsEntry=function(k){ if(typeof window.tsDySaleGo==="function") window.tsDySaleGo(k); else if(typeof window.tsDySale==="function") window.tsDySale(k); };
 window.tsCancelBill=function(k){
  var key=decodeURIComponent(k), recs=SH.calc().live.filter(function(r){ return r.k==="s"&&(r.x.g||r.id)===key; });
  if(!recs.length) return;
  if(!confirm(recs.length>1?T("ഈ വിൽപ്പന മുഴുവനും ("+recs.length+" ഇനങ്ങൾ) റദ്ദാക്കട്ടേ?","Cancel this whole sale ("+recs.length+" items)?"):T("ഈ എൻട്രി റദ്ദാക്കട്ടേ?","Cancel this entry?"))) return;
  recs.forEach(function(r){ SH.cancel(r.id); }); say(T("റദ്ദാക്കി","Cancelled")); render();
 };
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
   '<div class="tsC">'+picker("pu",{noRc:true,pick:puSelect,ph:T("വാങ്ങിയ സാധനം / മീൻ...","Item / fish bought...")})+'<div id="puSel"></div></div>'+
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
  var q=num("puQ"), k=Math.max(1,num("puK")||1), r=num("puR");
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
   (SH.ledger?'<div class="tsC"><div class="tsRow"><span>'+E(T("ബില്ലിന്റെ ആകെ തുക","Bill total"))+'</span><b>'+money(puBill())+'</b></div><label>'+E(T("ഇപ്പോൾ കൊടുത്തത് (മുഴുവനും കൊടുത്തെങ്കിൽ ഒഴിച്ചിടുക; ബാക്കി കടമായി കണക്കാക്കും)","Paid now (leave empty if paid in full; the rest is kept as due)"))+'</label><input id="puPaid" type="number" inputmode="decimal" placeholder="'+E(Math.round(puBill()))+'" value="'+E(s.paid==null?"":s.paid)+'" onchange="U_puPaid(this.value)"></div>':'')+
   '<button class="tsBtn" onclick="tsPuSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save purchase"))+'</button><button class="tsBtn g" onclick="tsPuBack()">← '+E(T("പിന്നോട്ട്","Back"))+'</button>';
  s.lines.forEach(function(l,i){ tsPuMg(i); });
 }
 function puBill(){ return U.pur.lines.reduce(function(a,l){ return a+l.total+(l.tr||0); },0); }
 window.U_puPaid=function(v){ U.pur.paid=v===""?null:Math.max(0,parseFloat(v)||0); };
 window.tsPuMg=function(i){
  var l=U.pur.lines[i], pr=num("puP"+i), e=$("puM"+i); l.price=pr;
  if(e) e.textContent=l.land>0&&pr>0?T("ലാഭം ഒന്നിന് ","Profit each ")+money(pr-l.land)+" ("+Math.round((pr-l.land)/l.land*100)+"%)":"";
 };
 window.tsPuBack=function(){ U.pur.stage=1; render(); };
 window.tsPuSave=function(){
  var s=U.pur, g=H.uid(), d=s.date||H.today();
  var pe=$("puPaid"); if(pe) U_puPaid(pe.value);
  var bill=puBill(), unpaid=s.paid==null?0:Math.max(0,bill-s.paid);
  if(unpaid<0.5) unpaid=0;
  if(unpaid>0&&!s.sup){ say(T("കടം ഉള്ളതുകൊണ്ട് കടയുടെ പേര് (സപ്ലൈയർ) നൽകണം - പിന്നോട്ട് പോയി നൽകുക","The supplier's name is needed for a due - go back and enter it")); return; }
  for(var i=0;i<s.lines.length;i++){ if(!(s.lines[i].price>0)&&!confirm(T("ചില സാധനങ്ങൾക്ക് വില ഇല്ല. തുടരട്ടേ?","Some items have no selling price. Continue?"))) return; }
  s.lines.forEach(function(l){
   var br={p:l.p,q:l.units,rt:l.perUnit,tr:l.tr||0,su:s.sup,bn:s.bn,g:g};
   var gp=SH.prod(l.p); if(gp&&gp.g>0&&SH.cfg("gst","0")==="1") br.gr=gp.g;
   if(unpaid>0&&bill>0) br.cr=Math.round((l.total+(l.tr||0))*unpaid/bill*100)/100;
   SH.add("b",br,d);
   var p=SH.prod(l.p), ch={};
   if(p){ if(l.price>0&&Math.abs(l.price-p.pr)>0.001) ch.pr=l.price; if(l.pk>1&&l.pk!==p.pk) ch.pk=l.pk; if(Object.keys(ch).length){ ch.i=p.id; SH.saveProduct(ch); } }
  });
  var n=s.lines.length; U.pur=null;
  say(T("സേവ് ചെയ്തു · ","Saved · ")+n+" "+T("ഇനങ്ങൾ","items"));
  go("home");
 };

 /* ---------- DEAD / LOSS ---------- */
 TITLE.dead=function(){ return "💀 "+lossName(); };
 var REASONS_ALL=[["ചത്തു","Died"],["തീയതി കഴിഞ്ഞു","Expired"],["കേടായി","Damaged"],["പ്രവർത്തിക്കുന്നില്ല","Not working"],["നഷ്ടപ്പെട്ടു","Lost"],["മറ്റ്","Other"]];
 function reasons(){ return SH.kind()==="aquarium"?REASONS_ALL:REASONS_ALL.slice(1); }
 function lossName(){ return SH.kind()==="aquarium"?T("ചത്തത് / നഷ്ടം / കേടായത്","Dead / lost / damaged"):T("നഷ്ടം / കേടായത്","Lost / damaged"); }
 SC.dead=function(){
  var s=U.dead={sel:null,reason:0};
  $("tsBody").innerHTML=stkBox()+'<div class="tsC">'+picker("de",{noRc:true,pick:deSelect,ph:T("മീൻ / സാധനം തിരയുക...","Search fish / item...")})+'<div id="deSel"></div></div><div id="deDay"></div>';
  deDay();
 };
 function deSelect(p){
  U.dead.sel=p.id;
  $("deSel").innerHTML='<div style="margin-top:10px;font-size:20px;font-weight:800">'+E(p.n)+'</div><div class="tsM">'+E(stockTxt(p))+'</div>'+
   '<label>'+E(T("എത്ര എണ്ണം?","How many?"))+'</label><input id="deQ" type="number" inputmode="decimal" value="1">'+
   '<div style="margin-top:8px">'+reasons().map(function(r,i){ return '<span class="tsChip'+(i===U.dead.reason?" on":"")+'" onclick="tsDeR('+i+')">'+E(T(r[0],r[1]))+'</span>'; }).join("")+'</div>'+
   dateRow("deD",H.today())+
   '<button class="tsBtn r" onclick="tsDeSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>';
  var q=$("deQ"); if(q){ q.focus(); q.select(); }
 }
 window.tsDeR=function(i){ U.dead.reason=i; var c=document.querySelectorAll("#deSel .tsChip"); for(var k=0;k<c.length;k++) c[k].classList.toggle("on",k===i); };
 window.tsDeSave=function(){
  var s=U.dead, p=SH.prod(s.sel); if(!p) return;
  var q=num("deQ"); if(!(q>0)){ say(T("എണ്ണം നൽകുക","Enter the count")); return; }
  SH.add("m",{p:p.id,q:q,r:reasons()[s.reason][1]},dateVal("deD"));
  say(T("സേവ് ചെയ്തു · നഷ്ടം ","Saved · loss ")+money(q*p.avg));
  render();
 };
 function deDay(){
  var t=H.today(), R=SH.report(t,t), L=R.deadList.slice().reverse();
  if(!$("deDay")) return;
  $("deDay").innerHTML=!L.length?"":'<div class="tsC"><b>'+E(T("ഇന്നത്തെ","Today"))+'</b><div class="tsM">'+E(T("തിരുത്താൻ ഒരു വരിയിൽ അമർത്തുക","Tap a line to edit"))+'</div>'+L.map(function(l){ return '<div class="tsRow" onclick="if(window.tsDyLoss)tsDyLoss(\''+l.r.id+'\')"><div>'+E(l.p?l.p.n:"?")+'<div class="tsM">'+qty(l.r.x.q)+' · '+E(l.r.x.r||"")+'</div></div><div>✏ <button class="tsX" onclick="event.stopPropagation();tsCancel(\''+l.r.id+'\')">✕</button></div></div>'; }).join("")+'</div>';
 }

 /* ---------- big button on the dashboard (so nobody has to look in the Menu) ---------- */
 (function(){
  var tm=null;
  function isShopBox(pb){
   /* the app itself knows which business is open (core: db.settings.myBusinessType, window._myPartner); label text is the last fallback */
   var t=window.__tcBizOnScreen?window.__tcBizOnScreen():"";
   if(t){
    if(t==="shop") return true;
    var p=window._myPartner;
    return !!(p&&/aquarium|\bpets?\b/i.test((p.business_subtype||"")+" "+(p.business_name||"")));   /* a pet shop registered under another category */
   }
   var m=pb&&pb.querySelector(".card .muted"); if(!m) return false;
   return /^\s*(shop|ഷോപ്പ്)|\bshop \/ store|aquarium|\bpets?\b/i.test(m.textContent||"");
  }
  window.__tcShopIsShopPage=function(){ return isShopBox($("partnerBox")); };
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
    if(pb&&msg&&isShopBox(pb)){ anchor=msg; mode="before"; }   /* directly ABOVE Messages: the Share card must stay directly BELOW it (tc-sharecard.js), two cards fighting for the same slot flicker */
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
   else if(location.hash==="#shop") setTimeout(function(){ openShop("home",false,true); },900);
  }
 }catch(e){}

 window.__tcShopUi={screen:function(name,fn,title){ SC[name]=fn; if(title) TITLE[name]=title; },go:go,pur:function(){ return U.pur; },render:render,sheet:sheet,closeSheet:closeSheet,picker:picker,prodSheet:prodSheet,
  T:T,E:E,say:say,num:num,setv:setv,mchips:mchips,mchipSet:mchipSet,mchipOk:mchipOk,dateRow:dateRow,stkBox:stkBox,rt:rt,pmTxt:pmTxt,custOpts:custOpts,cleanMob:cleanMob,cleanName:cleanName,payInit:payInit,payHtml:payHtml,payTot:payTot,payRes:payRes,enc:enc,perTxt:perTxt,unitChips:unitChips,dateVal:dateVal,dmy:dmy,stockTxt:stockTxt,lang:function(){ return lang; },simple:function(){ return LS.get("tc_shop_simple")==="1"; },
  open:openShop,close:closeShop,body:function(){ return $("tsBody"); },isOpen:function(){ return U.open; },screenName:function(){ return U.screen; }};
})();
