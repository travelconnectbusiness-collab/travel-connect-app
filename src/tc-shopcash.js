/* Shop book - COUNT WHAT CAME IN (tc-shopcash.js, loaded by tc-regdocs.js after tc-shoprep.js). Needs tc-shop.js, tc-shopui.js, tc-shoprep.js.
   Owner's wish (2026-11-02): a shop does not count coins - only notes. At night he counts the notes and adds what came by Google Pay / UPI: that is the total that
   "came into the hand". It is often a little less than the day's sales (the rest is coins / change kept in the shop) and some days more (coins from before were
   changed into notes) or less because some money was used. So the book needs ONE box: "what came in today (notes + UPI)" and shows the rest as coins / change.
   "Account" (day) gets a small card: tap "Count what came in" -> type the total. The book compares it with what the sales brought in:
        sales - sales given on credit + credit money received - paid out of it (expenses / wage ... behind "More")
   and shows the difference: less = "kept as coins / change", more = "coins changed into notes (extra)". The month view adds the totals of the days counted.
   RUNNING COINS: every counted day left (+) or extra (-) is added up from the first day counted, so the book shows "coins / change in the shop now (about)"; the first days may show a
   minus (the shop had coins before the first count), later it settles near the real amount.
   Stored as shop settings (records k:'c', key "cc:YYYY-MM-DD", value JSON {c,x}: c = typed total, x = paid out); the latest save of a day wins; "Remove" saves an empty value.
   No server change. The Account screen (tc-shoprep.js) calls window.tsCashCard(d1,d2,isDay,R) and puts what it returns under the sales card. Nothing here is shop-specific. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcShopCash) return;
 window.__tcShopCash=1;
 var H=SH.H, T=UI.T, E=UI.E, say=UI.say, num=UI.num, r2=H.r2, $=function(id){ return document.getElementById(id); };
 function fm(n){ n=r2(+n||0); return (n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN",{maximumFractionDigits:2}); }
 function sg(n){ n=r2(+n||0); return (n>0?"+":n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN",{maximumFractionDigits:2}); }
 function parse(v){ try{ var o=JSON.parse(v); return (o&&typeof o==="object"&&o.c!=null&&o.c!=="")?{c:+o.c||0,x:+o.x||0}:null; }catch(e){ return null; } }
 function keys(){ var c=SH.calc().cfg||{}; return Object.keys(c).filter(function(k){ return k.indexOf("cc:")===0&&parse(c[k]); }).sort(); }
 function get(d){ return parse(SH.cfg("cc:"+d,"")); }
 /* what the day's sales brought in: sales that were not left on credit + credit money received - paid out of it */
 function expected(s,R){ return r2(R.sales-R.credit+R.recv-(s?s.x:0)); }
 /* the coins / change in the shop, worked out from the days counted: every day left (sales brought in - counted) adds to it, every day extra takes from it. It starts from 0 at the
    first day counted, so the first days can show a minus; with more days it settles near the real amount. Counted up to and including day d. */
 function running(d){
  var n=0, tot=0; keys().forEach(function(k){ var dd=k.slice(3); if(dd>d) return; var s2=get(dd); tot+=r2(expected(s2,SH.report(dd,dd))-s2.c); n++; });
  return {n:n,v:r2(tot)};
 }
 function runRow(d){
  var q=running(d); if(!q.n) return "";
  return '<div class="tsRow"><span><b>'+E(T("കടയിൽ ഇപ്പോൾ ഏകദേശം ചില്ലറ","Coins / change in the shop now (about)"))+'</b> <span class="tsM">('+E(T(q.n+" ദിവസത്തെ കണക്കിൽ നിന്ന്","from "+q.n+" day(s) counted"))+')</span></span><b style="font-size:20px;color:'+(q.v<0?'#a12d2d':'#0b6b78')+'">'+fm(q.v)+'</b></div>'+
   (q.v<0?'<div class="tsM">'+E(T("മൈനസ് ആണെങ്കിൽ: തുടക്കത്തിൽ കടയിൽ ചില്ലറ ഉണ്ടായിരുന്നു; കൂടുതൽ ദിവസം എണ്ണുമ്പോൾ ശരിയാകും","A minus means the shop had coins at the start; it settles as more days are counted"))+'</div>':'');
 }
 var CUR={d:"",R:null};

 window.tsCashCard=function(d1,d2,isDay,R){
  try{
   if(isDay){
    var s=get(d1), btn='<span class="tsChip" onclick="tsCashOpen(\''+d1+'\')">💵 '+E(s?T("തിരുത്തുക","Edit"):T("കയ്യിൽ വന്നത് എണ്ണി നോക്കുക","Count what came in"))+'</span>';
    if(!s) return '<div class="tsC" style="text-align:center">'+btn+'<div class="tsM" style="margin-top:4px">'+E(T("നോട്ട് + UPI എണ്ണിയാൽ ചില്ലറ (കോയിൻ) എത്ര എന്ന് കാണാം","Count notes + UPI to see how much is coins / change"))+'</div>'+(running(d1).n?'<div style="text-align:left;margin-top:6px">'+runRow(d1)+'</div>':'')+'</div>';
    var ex=expected(s,R), df=r2(s.c-ex);
    return '<div class="tsC"><b>💵 '+E(T("കയ്യിൽ വന്നത്","Came in"))+'</b>'+
     '<div class="tsRow"><span>'+E(T("വിൽപ്പനയിൽ നിന്ന്","From the sales"))+(s.x?' <span class="tsM">('+E(T("കൊടുത്തത് ","paid out "))+fm(s.x)+')</span>':'')+'</span><b>'+fm(ex)+'</b></div>'+
     '<div class="tsRow"><span>'+E(T("എണ്ണിയത് (നോട്ട് + UPI)","Counted (notes + UPI)"))+'</span><b>'+fm(s.c)+'</b></div>'+
     '<div class="tsRow"><span><b>'+E(df<0?T("ചില്ലറ / കോയിൻ ആയി ബാക്കി","Left as coins / change"):df>0?T("കൂടുതൽ (കോയിൻ നോട്ടായി മാറിയത്)","Extra (coins changed into notes)"):T("ശരി","Matches"))+'</b></span><b style="font-size:22px;color:'+(df===0?'#177044':df<0?'#7a5a14':'#0b6b78')+'">'+(df?fm(Math.abs(df)):"✔")+'</b></div>'+runRow(d1)+
     '<div style="margin-top:6px">'+btn+'</div></div>';
   }
   var ks=keys().filter(function(k){ return k.slice(3)>=d1&&k.slice(3)<=d2; }); if(!ks.length) return "";
   var coins=0, extra=0; ks.forEach(function(k){ var d=k.slice(3), s2=get(d), R2=SH.report(d,d), x=r2(s2.c-expected(s2,R2)); if(x<0) coins+=-x; else extra+=x; });
   return '<div class="tsC"><b>💵 '+E(T("കയ്യിൽ വന്നത്","Came in"))+'</b> <span class="tsM">'+E(T(ks.length+" ദിവസം എണ്ണി",ks.length+" day(s) counted"))+'</span>'+
    '<div class="tsRow"><span>'+E(T("ചില്ലറ / കോയിൻ ആയി ബാക്കി","Left as coins / change"))+'</span><b>'+fm(coins)+'</b></div>'+
    '<div class="tsRow"><span>'+E(T("കോയിൻ നോട്ടായി മാറിയത്","Coins changed into notes"))+'</span><b>'+fm(extra)+'</b></div>'+
    '<div class="tsRow"><span><b>'+E(coins>=extra?T("ആകെ ചില്ലറ കൂടിയത്","Coins up by"):T("ആകെ ചില്ലറ കുറഞ്ഞത്","Coins down by"))+'</b></span><b>'+fm(Math.abs(coins-extra))+'</b></div>'+runRow(d2)+'</div>';
  }catch(e){ return ""; }
 };

 window.tsCashOpen=function(d){
  var R=SH.report(d,d), s=get(d);
  CUR={d:d,R:R};
  UI.sheet('<h3 style="margin:0">💵 '+E(T("കയ്യിൽ വന്നത് എണ്ണി നോക്കുക","Count what came in"))+' · '+E(UI.dmy(d))+'</h3>'+
   '<div class="tsM">'+E(T("ഇന്നത്തെ വിൽപ്പന ","Sales today "))+fm(R.sales)+(R.credit>0?' · '+E(T("കടം കൊടുത്തത് ","on credit "))+fm(R.credit):'')+(R.recv>0?' · '+E(T("കടം കിട്ടിയത് ","credit received "))+fm(R.recv):'')+'</div>'+
   '<label>'+E(T("കയ്യിൽ വന്ന തുക (നോട്ട് എണ്ണിയത് + UPI / ഗൂഗിൾ പേ)","Total that came in (notes counted + UPI / Google Pay)"))+'</label><input id="ccC" type="number" inputmode="decimal" value="'+(s?s.c:"")+'" oninput="tsCashLive()">'+
   '<div class="tsChip" style="margin-top:6px" onclick="document.getElementById(\'ccMore\').style.display=\'block\';this.style.display=\'none\'">'+E(T("കൂടുതൽ ▾","More ▾"))+'</div>'+
   '<div id="ccMore" style="display:'+(s&&s.x?'block':'none')+'"><label>'+E(T("ഇതിൽ നിന്ന് കൊടുത്തത് (ചെലവ്, കൂലി, സപ്ലയർ, സ്വന്തം ആവശ്യം)","Paid out of it (expenses, wage, suppliers, own use)"))+'</label><input id="ccX" type="number" inputmode="decimal" value="'+(s&&s.x?s.x:"")+'" oninput="tsCashLive()"></div>'+
   '<div id="ccRes" class="tsM" style="margin:8px 0;font-size:15px"></div>'+
   '<button class="tsBtn" onclick="tsCashSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>'+(s?'<button class="tsBtn r" onclick="tsCashDel()">🗑 '+E(T("ഒഴിവാക്കുക","Remove"))+'</button>':'')+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
  window.tsCashLive();
 };
 window.tsCashLive=function(){
  var el=$("ccRes"); if(!el||!CUR.R) return;
  var c=$("ccC")&&$("ccC").value!==""?num("ccC"):null; if(c===null){ el.textContent=""; return; }
  var ex=expected({x:num("ccX")||0},CUR.R), df=r2(c-ex);
  el.innerHTML=E(T("വിൽപ്പനയിൽ നിന്ന് ","From the sales "))+'<b>'+fm(ex)+'</b> · '+E(df<0?T("ചില്ലറ / കോയിൻ ","Coins / change "):df>0?T("കൂടുതൽ ","Extra "):T("ശരി ","Matches "))+'<b>'+(df?fm(Math.abs(df)):"✔")+'</b>';
 };
 window.tsCashSave=function(){
  if($("ccC")&&$("ccC").value===""){ say(T("എണ്ണിയ തുക നൽകുക","Enter the counted amount")); return; }
  var v={c:r2(Math.max(0,num("ccC")||0)),x:r2(Math.max(0,num("ccX")||0))};
  SH.setCfg("cc:"+CUR.d,JSON.stringify(v)); UI.render(); say(T("സേവ് ചെയ്തു","Saved"));
  try{ window.tsCloseSheet(); }catch(e){}
 };
 window.tsCashDel=function(){
  SH.setCfg("cc:"+CUR.d,""); UI.render(); say(T("ഒഴിവാക്കി","Removed"));
  try{ window.tsCloseSheet(); }catch(e){}
 };
})();
