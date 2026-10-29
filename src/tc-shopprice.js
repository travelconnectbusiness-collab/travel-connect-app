/* Shop book - Price list to print + "open the shop first" on this phone (tc-shopprice.js, loaded by tc-regdocs.js after tc-shopset.js).
   1) Price list: Shop Home > "Price list" button. Every item that is on sale (not hidden) and has a selling price, grouped by category,
      as a clean page for the shop wall / counter: shop name, address and phone at the top, the date ("Prices as on"), item name and price
      (price per kg / m / ... when the item has a unit). The owner can switch categories on or off, show the other name of an item,
      leave out items that are out of stock. "Print / PDF" uses the phone's print window (Save as PDF), "Share as picture" gives an image
      for WhatsApp. Malayalam prints correctly because it goes through business.js's printContent() like the quotation / invoice.
      Items without a price are never printed - the screen says how many are left out.
   2) "Open the shop first": a switch on Shop Home. When ON (kept in THIS phone only), opening the app on this phone goes straight into the
      shop screens - made for the shop's own phone, where the app icon on the home screen then works as the shop's icon. Back closes the shop
      and the normal app is behind it. OFF by default. Nothing is sent to the server.
   3) Long-press shortcut: manifest.webmanifest has a "Shop accounts" shortcut (url /#shop); this file opens the shop when the app is already open and the address becomes #shop. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcShopPrice) return;
 window.__tcShopPrice=1;
 var T=UI.T, E=UI.E, say=UI.say, H=SH.H, $=function(id){ return document.getElementById(id); };
 var LSK="tc_shop_pl", AOK="tc_shop_autoopen";
 var PL=null;

 /* ---------- small storage helpers (a private window may refuse localStorage) ---------- */
 function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
 function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
 function loadPrefs(){
  var j=null; try{ j=JSON.parse(lsGet(LSK)||"null"); }catch(e){}
  j=j||{};
  return { off:Array.isArray(j.off)?j.off:[], other:!!j.other, stock:!!j.stock };
 }
 function savePrefs(){ lsSet(LSK,JSON.stringify({off:PL.off,other:PL.other,stock:PL.stock})); }
 function ml(){ return UI.lang()==="ml"; }

 /* ---------- what goes on the list ---------- */
 function shopTitle(){
  var n=SH.cfg("name","");
  if(n) return n;
  if(!SH.cfg("kind","")&&SH.kind()==="aquarium") return "മൃതസഞ്ജീവനി";
  try{ var b=window.__tcDocs&&window.__tcDocs.biz&&window.__tcDocs.biz(); if(b&&b.name) return b.name; }catch(e){}
  try{ var pn=window._myPartner&&(window._myPartner.business_name||window._myPartner.name); if(pn) return pn; }catch(e){}
  return "";
 }
 function inStock(p){ return p.comp?(p.can==null||p.can>0):(p.nt||p.stock==null||p.stock>0); }
 function rows(){
  var all=SH.products().filter(function(p){ return !p.off; });
  var cats=SH.categories();
  var groups={}, noPrice=0, order=[];
  all.forEach(function(p){
   var c=p.c||"Other";
   if(PL.off.indexOf(c)>=0) return;
   if(!(+p.pr>0)){ noPrice++; return; }
   if(PL.stock&&!inStock(p)) return;
   if(!groups[c]){ groups[c]=[]; }
   groups[c].push(p);
  });
  cats.forEach(function(c){ if(groups[c]) order.push(c); });
  Object.keys(groups).forEach(function(c){ if(order.indexOf(c)<0) order.push(c); });
  return { order:order, groups:groups, noPrice:noPrice, count:order.reduce(function(a,c){ return a+groups[c].length; },0) };
 }
 function priceTxt(p){ return H.money(+p.pr)+(p.u?" / "+p.u:""); }
 function nameTxt(p){ return p.n+(PL.other&&p.al&&p.al!==p.n?" ("+p.al+")":""); }

 /* ---------- screen ---------- */
 function chip(on,fn,txt){ return '<span class="tsChip'+(on?" on":"")+'" onclick="'+fn+'">'+E(txt)+'</span>'; }
 function draw(){
  var R=rows(), cats=SH.categories().filter(function(c){ return SH.products().some(function(p){ return !p.off&&(p.c||"Other")===c; }); });
  var h='<div class="tsC"><b>'+E(T("ഏതൊക്കെ വിഭാഗം വേണം","Which categories"))+'</b><div>'+
   cats.map(function(c,i){ return chip(PL.off.indexOf(c)<0,"tsPlCat("+i+")",SH.catName(c,ml())); }).join("")+'</div>'+
   '<div style="margin-top:8px">'+chip(PL.other,"tsPlOpt('other')",T("മറ്റേ പേരും കാണിക്കുക","Show other name"))+chip(PL.stock,"tsPlOpt('stock')",T("സ്റ്റോക്ക് ഇല്ലാത്തത് ഒഴിവാക്കുക","Leave out out-of-stock"))+'</div></div>';
  if(R.noPrice) h+='<div class="tsC" style="background:#fff6df">'+E(R.noPrice+" "+T("സാധനങ്ങൾക്ക് വില ഇല്ല - അവ ലിസ്റ്റിൽ വരില്ല. (സ്റ്റോക്ക് > ഇനം തൊട്ട് വില നൽകാം)","items have no price - they are left out. (Stock > tap the item to set the price)"))+'</div>';
  if(!R.count){
   h+='<div class="tsC"><b>'+E(T("പ്രിന്റ് ചെയ്യാൻ വിലയുള്ള സാധനങ്ങൾ ഇല്ല","No priced items to print"))+'</b></div>';
  }else{
   h+='<div class="tsC"><div class="tsM">'+E(R.count+" "+T("സാധനങ്ങൾ","items"))+' · '+E(T("തീയതി","Prices as on"))+' '+E(UI.dmy(H.today()))+'</div>'+
    R.order.map(function(c){
     return '<div style="margin-top:10px"><b>'+E(SH.catName(c,ml()))+'</b>'+R.groups[c].map(function(p){
      return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid #e3edf2"><span>'+E(nameTxt(p))+'</span><b style="white-space:nowrap">'+E(priceTxt(p))+'</b></div>';
     }).join("")+'</div>';
    }).join("")+'</div>'+
    '<button class="tsBtn" onclick="tsPlPrint(0)">🖨 '+E(T("പ്രിന്റ് / PDF","Print / PDF"))+'</button>'+
    '<button class="tsBtn g" onclick="tsPlPrint(1)">🖼 '+E(T("ചിത്രമായി ഷെയർ ചെയ്യുക","Share as picture"))+'</button>';
  }
  $("tsBody").innerHTML=h;
 }
 UI.screen("pricelist",function(){ PL=loadPrefs(); draw(); },function(){ return "🏷 "+T("വില വിവരം","Price list"); });
 window.tsPlCat=function(i){
  var cats=SH.categories().filter(function(c){ return SH.products().some(function(p){ return !p.off&&(p.c||"Other")===c; }); });
  var c=cats[i]; if(c==null) return;
  var k=PL.off.indexOf(c); if(k>=0) PL.off.splice(k,1); else PL.off.push(c);
  savePrefs(); draw();
 };
 window.tsPlOpt=function(k){ if(k!=="other"&&k!=="stock") return; PL[k]=!PL[k]; savePrefs(); draw(); };

 /* ---------- the printed page ---------- */
 function pageHtml(R){
  var b={name:"",addr:"",ph:""}; try{ if(window.__tcDocs&&window.__tcDocs.biz) b=window.__tcDocs.biz(); }catch(e){}
  var name=shopTitle();
  var th='padding:7px 8px;font-size:17px;border-bottom:1px solid #d9e2e8;vertical-align:top';
  var out='<div style="text-align:center;border-bottom:3px solid #0b5d7a;padding-bottom:8px;margin-bottom:6px">'+
   (name?'<div style="font-size:26px;font-weight:800;color:#0b3d52">'+E(name)+'</div>':'')+
   (b.addr?'<div style="font-size:14px;color:#333">'+E(b.addr)+'</div>':'')+
   (b.ph?'<div style="font-size:14px;color:#333">'+E(b.ph)+'</div>':'')+'</div>'+
   '<div style="display:flex;justify-content:space-between;align-items:baseline;margin:8px 0"><span style="font-size:21px;font-weight:800">'+E(T("വില വിവരം","PRICE LIST"))+'</span>'+
   '<span style="font-size:13px;color:#555">'+E(T("തീയതി","Prices as on"))+' '+E(UI.dmy(H.today()))+'</span></div>';
  R.order.forEach(function(c){
   out+='<div style="page-break-inside:avoid"><div style="background:#e6f1f6;color:#0b3d52;font-weight:800;font-size:17px;padding:6px 8px;margin-top:10px;page-break-after:avoid">'+E(SH.catName(c,ml()))+'</div>'+
    '<table style="width:100%;border-collapse:collapse">'+R.groups[c].map(function(p){
     return '<tr style="page-break-inside:avoid"><td style="'+th+'">'+E(p.n)+(PL.other&&p.al&&p.al!==p.n?' <span style="color:#666;font-size:14px">('+E(p.al)+')</span>':'')+'</td>'+
      '<td style="'+th+';text-align:right;white-space:nowrap"><b>'+E(H.money(+p.pr))+'</b>'+(p.u?' <span style="color:#555;font-size:14px">/ '+E(p.u)+'</span>':'')+'</td></tr>';
    }).join("")+'</table></div>';
  });
  out+='<p style="text-align:center;color:#777;font-size:12px;margin-top:14px">'+E(T("വിലകളിൽ മാറ്റം വരാം","Prices may change without notice"))+'</p>';
  return out;
 }
 window.tsPlPrint=function(asImage){
  if(!PL) PL=loadPrefs();
  var R=rows();
  if(!R.count){ say(T("പ്രിന്റ് ചെയ്യാൻ സാധനങ്ങൾ ഇല്ല","Nothing to print")); return; }
  try{ printContent((shopTitle()||"Shop")+" "+T("വില വിവരം","Price list"),pageHtml(R),!!asImage); }
  catch(e){ say(T("പ്രിന്റ് പേജ് തുറക്കാനായില്ല","Could not open the print page")); if(window.console) console.error("tc-shopprice",e); }
 };

 /* ---------- Shop Home: price list button + "open the shop first" switch ---------- */
 function homeCard(){
  var on=lsGet(AOK)==="1";
  var d=document.createElement("div"); d.id="tsPlCard"; d.className="tsC";
  d.innerHTML='<button class="tsBtn g" style="margin-top:0" onclick="tsOpen(\'pricelist\')">🏷 '+E(T("വില വിവരം (പ്രിന്റ്)","Price list (print)"))+'</button>'+
   '<div style="margin-top:12px"><b>'+E(T("ഈ ഫോണിൽ ആപ്പ് തുറക്കുമ്പോൾ നേരെ ഷോപ്പ്","Open the shop first on this phone"))+'</b>'+
   '<div>'+chip(on,"tsPlAuto(1)",T("വേണം","On"))+chip(!on,"tsPlAuto(0)",T("വേണ്ട","Off"))+'</div>'+
   '<div class="tsM" style="margin-top:4px">'+E(T("ഇത് ഈ ഫോണിൽ മാത്രം. ആപ്പ് ഐക്കൺ ഹോം സ്ക്രീനിൽ ഇട്ടാൽ അത് തൊടുമ്പോൾ നേരെ ഷോപ്പ് തുറക്കും; Back അമർത്തിയാൽ സാധാരണ ആപ്പ്.","Only on this phone. With the app icon on the home screen, tapping it opens the shop straight away; Back goes to the normal app."))+'</div></div>';
  return d;
 }
 window.tsPlAuto=function(v){ lsSet(AOK,v?"1":"0"); say(v?T("ഇനി ആപ്പ് തുറക്കുമ്പോൾ ഷോപ്പ് തുറക്കും","The shop will open first"):T("ശരി, സാധാരണ പോലെ","OK, back to normal")); place(); };
 function place(){
  try{
   var body=$("tsBody"); if(!body||!UI.isOpen()||UI.screenName()!=="home") return;
   var old=$("tsPlCard"); if(old) old.remove();
   var cards=body.querySelectorAll(".tsC"), last=cards.length?cards[cards.length-1]:null, c=homeCard();
   if(last&&last.parentNode===body) body.insertBefore(c,last); else body.appendChild(c);
  }catch(e){ if(window.console) console.error("tc-shopprice",e); }
 }
 var obs=null, obsT=null;
 function watch(){
  var body=$("tsBody");
  if(!body) return false;
  if(obs) obs.disconnect();
  obs=new MutationObserver(function(){
   clearTimeout(obsT);
   obsT=setTimeout(function(){
    var b=$("tsBody");
    if(b&&UI.isOpen()&&UI.screenName()==="home"&&!b.querySelector("#tsPlCard")) place();
   },80);
  });
  obs.observe(body,{childList:true});
  return true;
 }
 /* #tsBody is created the first time the shop opens, and may be rebuilt: look again every second until it is watched */
 var watched=null;
 setInterval(function(){
  try{
   var b=$("tsBody");
   if(b&&b!==watched){ watched=b; watch(); if(UI.isOpen()&&UI.screenName()==="home"&&!b.querySelector("#tsPlCard")) place(); }
  }catch(e){}
 },1000);

 /* ---------- the app icon's long-press shortcut "Shop accounts" (manifest.webmanifest, url /#shop) ----------
    A fresh start with #shop is handled by tc-shopui.js; this covers the app being open already (the address changes to #shop without a reload) */
 window.addEventListener("hashchange",function(){
  try{ if(location.hash==="#shop"&&lsGet("tc_user")&&!UI.isOpen()){ var u=getCurrentUser(); if(u&&u.role!=="customer") UI.open("home"); } }catch(e){}
 });

 /* ---------- open the shop first (this phone only) ---------- */
 (function(){
  if(lsGet(AOK)!=="1") return;
  var tries=0, done=false;
  var t=setInterval(function(){
   tries++;
   try{
    if(done||tries>24){ clearInterval(t); return; }
    if(!lsGet("tc_user")) return;                   /* not signed in yet */
    if(UI.isOpen()){ done=true; clearInterval(t); return; }
    var u=getCurrentUser();
    if(!u||u.role==="customer"){ clearInterval(t); return; }
    if(window.__tcShopIsShopPage&&window.__tcShopIsShopPage()){ done=true; clearInterval(t); UI.open("home"); }
   }catch(e){}
  },500);
 })();
})();
