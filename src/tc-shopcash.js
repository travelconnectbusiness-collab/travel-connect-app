/* Shop book - CASH COUNT (tc-shopcash.js, loaded by tc-regdocs.js after tc-shoprep.js). Needs tc-shop.js, tc-shopui.js, tc-shoprep.js.
   Owner's wish (2026-11-02): the cash in the drawer is often a little more (change / coins kept) or less (no coins to give back) than the day's cash sales; UPI is always exact.
   "Account" (day) gets a small card: tap "Count the cash" -> counted cash in the drawer. The book works out what the drawer should hold:
        opening cash + cash sales + cash received on credit - cash paid out,
   and shows the difference (+ extra / - short). Small differences from coins are normal. Opening cash = what was kept the day before (counted - taken home / banked), editable.
   "Paid out" and "Took home / banked" are behind "More". The month view adds the total difference of the days counted.
   Stored as shop settings (records k:'c', key "cc:YYYY-MM-DD", value JSON {o,c,x,t}); the latest save of a day wins; "Remove" saves an empty value. No server change.
   The Account screen (tc-shoprep.js) calls window.tsCashCard(d1,d2,isDay,R) and puts what it returns under the sales card. Nothing here is shop-specific. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcShopCash) return;
 window.__tcShopCash=1;
 var H=SH.H, T=UI.T, E=UI.E, say=UI.say, num=UI.num, r2=H.r2, $=function(id){ return document.getElementById(id); };
 function fm(n){ n=r2(+n||0); return (n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN",{maximumFractionDigits:2}); }
 function sg(n){ n=r2(+n||0); return (n>0?"+":n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN",{maximumFractionDigits:2}); }
 function parse(v){ try{ var o=JSON.parse(v); return (o&&typeof o==="object"&&o.c!=null&&o.c!=="")?{o:+o.o||0,c:+o.c||0,x:+o.x||0,t:+o.t||0}:null; }catch(e){ return null; } }
 function keys(){ var c=SH.calc().cfg||{}; return Object.keys(c).filter(function(k){ return k.indexOf("cc:")===0&&parse(c[k]); }).sort(); }
 function get(d){ return parse(SH.cfg("cc:"+d,"")); }
 /* what was kept in the drawer at the end of the latest counted day before d */
 function openingFor(d){
  var ks=keys().filter(function(k){ return k<"cc:"+d; }); if(!ks.length) return 0;
  var p=get(ks[ks.length-1].slice(3)); return p?Math.max(0,r2(p.c-p.t)):0;
 }
 function expected(s,R){ return r2(s.o+R.cash+R.recvCash-s.x); }
 var CUR={d:"",R:null};

 window.tsCashCard=function(d1,d2,isDay,R){
  try{
   if(isDay){
    var s=get(d1), btn='<span class="tsChip" onclick="tsCashOpen(\''+d1+'\')">💵 '+E(s?T("തിരുത്തുക","Edit"):T("ക്യാഷ് എണ്ണി നോക്കുക","Count the cash"))+'</span>';
    if(!s) return '<div class="tsC" style="text-align:center">'+btn+'<div class="tsM" style="margin-top:4px">'+E(T("UPI കൃത്യമാണ്; ഡ്രോയറിലെ ക്യാഷ് എണ്ണി വ്യത്യാസം നോക്കാം","UPI is exact; count the drawer cash to see the difference"))+'</div></div>';
    var ex=expected(s,R), df=r2(s.c-ex), col=df===0?"#177044":Math.abs(df)<=20?"#7a5a14":"#a12d2d";
    return '<div class="tsC"><b>💵 '+E(T("ഡ്രോയറിലെ ക്യാഷ്","Cash in the drawer"))+'</b>'+
     '<div class="tsRow"><span>'+E(T("ഉണ്ടാകേണ്ടത്","Should be"))+' <span class="tsM">('+E(T("തുടക്കം ","opening "))+fm(s.o)+' + '+E(T("ക്യാഷ് ","cash "))+fm(R.cash+R.recvCash)+(s.x?' − '+fm(s.x):'')+')</span></span><b>'+fm(ex)+'</b></div>'+
     '<div class="tsRow"><span>'+E(T("എണ്ണിയത്","Counted"))+'</span><b>'+fm(s.c)+'</b></div>'+
     '<div class="tsRow"><span><b>'+E(df>0?T("കൂടുതൽ","Extra"):df<0?T("കുറവ്","Short"):T("ശരി","Matches"))+'</b></span><b style="font-size:22px;color:'+col+'">'+(df?sg(df):"✔")+'</b></div>'+
     (df&&Math.abs(df)<=20?'<div class="tsM">'+E(T("ചില്ലറ / കോയിൻ കൊണ്ടുള്ള ചെറിയ വ്യത്യാസം സാധാരണമാണ്","A small difference from coins / change is normal"))+'</div>':'')+
     '<div style="margin-top:6px">'+btn+'</div></div>';
   }
   var ks=keys().filter(function(k){ return k.slice(3)>=d1&&k.slice(3)<=d2; }); if(!ks.length) return "";
   var tot=0, over=0, under=0; ks.forEach(function(k){ var d=k.slice(3), s2=get(d), R2=SH.report(d,d), x=r2(s2.c-expected(s2,R2)); tot+=x; if(x>0) over+=x; else under+=x; });
   return '<div class="tsC"><b>💵 '+E(T("ക്യാഷ് വ്യത്യാസം","Cash difference"))+'</b> <span class="tsM">'+E(T(ks.length+" ദിവസം എണ്ണി",ks.length+" day(s) counted"))+'</span>'+
    '<div class="tsRow"><span>'+E(T("കൂടുതൽ","Extra"))+'</span><b>'+sg(over)+'</b></div><div class="tsRow"><span>'+E(T("കുറവ്","Short"))+'</span><b>'+sg(under)+'</b></div>'+
    '<div class="tsRow"><span><b>'+E(T("ആകെ","Total"))+'</b></span><b style="color:'+(Math.abs(tot)<=20?'#177044':'#7a5a14')+'">'+sg(tot)+'</b></div></div>';
  }catch(e){ return ""; }
 };

 window.tsCashOpen=function(d){
  var R=SH.report(d,d), s=get(d), o=s?s.o:openingFor(d);
  CUR={d:d,R:R};
  UI.sheet('<h3 style="margin:0">💵 '+E(T("ക്യാഷ് എണ്ണി നോക്കുക","Count the cash"))+' · '+E(UI.dmy(d))+'</h3>'+
   '<div class="tsM">'+E(T("ഇന്നത്തെ ക്യാഷ് വിൽപ്പന ","Cash sales today "))+fm(R.cash)+(R.recvCash>0?' · '+E(T("കടം കിട്ടിയത് ","credit received "))+fm(R.recvCash):'')+'</div>'+
   '<label>'+E(T("തുടക്കത്തിൽ ഡ്രോയറിൽ ഉണ്ടായിരുന്നത് (ചില്ലറ)","In the drawer at the start (change)"))+'</label><input id="ccO" type="number" inputmode="decimal" value="'+(o||o===0?o:"")+'" oninput="tsCashLive()">'+
   '<label>'+E(T("ഇപ്പോൾ ഡ്രോയറിൽ എണ്ണിയത്","Counted in the drawer now"))+'</label><input id="ccC" type="number" inputmode="decimal" value="'+(s?s.c:"")+'" oninput="tsCashLive()">'+
   '<div class="tsChip" style="margin-top:6px" onclick="document.getElementById(\'ccMore\').style.display=\'block\';this.style.display=\'none\'">'+E(T("കൂടുതൽ ▾","More ▾"))+'</div>'+
   '<div id="ccMore" style="display:'+(s&&(s.x||s.t)?'block':'none')+'"><label>'+E(T("ഡ്രോയറിൽ നിന്ന് കൊടുത്തത് (ചെലവ്, കൂലി, സപ്ലയർ)","Paid out of the drawer (expenses, wage, suppliers)"))+'</label><input id="ccX" type="number" inputmode="decimal" value="'+(s&&s.x?s.x:"")+'" oninput="tsCashLive()">'+
   '<label>'+E(T("വീട്ടിലേക്ക് എടുത്തത് / ബാങ്കിൽ ഇട്ടത് (നാളത്തെ തുടക്കത്തിൽ കൂട്ടില്ല)","Taken home / banked (not counted in tomorrow's opening)"))+'</label><input id="ccT" type="number" inputmode="decimal" value="'+(s&&s.t?s.t:"")+'"></div>'+
   '<div id="ccRes" class="tsM" style="margin:8px 0;font-size:15px"></div>'+
   '<button class="tsBtn" onclick="tsCashSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>'+(s?'<button class="tsBtn r" onclick="tsCashDel()">🗑 '+E(T("ഒഴിവാക്കുക","Remove"))+'</button>':'')+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
  window.tsCashLive();
 };
 window.tsCashLive=function(){
  var el=$("ccRes"); if(!el||!CUR.R) return;
  var c=$("ccC")&&$("ccC").value!==""?num("ccC"):null; if(c===null){ el.textContent=""; return; }
  var ex=expected({o:num("ccO")||0,x:num("ccX")||0},CUR.R), df=r2(c-ex);
  el.innerHTML=E(T("ഉണ്ടാകേണ്ടത് ","Should be "))+'<b>'+fm(ex)+'</b> · '+E(df>0?T("കൂടുതൽ ","Extra "):df<0?T("കുറവ് ","Short "):T("ശരി ","Matches "))+'<b>'+(df?sg(df):"✔")+'</b>';
 };
 window.tsCashSave=function(){
  if($("ccC")&&$("ccC").value===""){ say(T("എണ്ണിയ തുക നൽകുക","Enter the counted amount")); return; }
  var v={o:r2(Math.max(0,num("ccO")||0)),c:r2(Math.max(0,num("ccC")||0)),x:r2(Math.max(0,num("ccX")||0)),t:r2(Math.max(0,num("ccT")||0))};
  SH.setCfg("cc:"+CUR.d,JSON.stringify(v)); UI.render(); say(T("സേവ് ചെയ്തു","Saved"));
  try{ window.tsCloseSheet(); }catch(e){}
 };
 window.tsCashDel=function(){
  SH.setCfg("cc:"+CUR.d,""); UI.render(); say(T("ഒഴിവാക്കി","Removed"));
  try{ window.tsCloseSheet(); }catch(e){}
 };
})();
