/* Shop book - credit customers and supplier dues (tc-shopcr.js, loaded by tc-regdocs.js after tc-shoprep.js).
   Home > "Credit & dues": two lists - what customers still owe (sales paid by "Credit" with a name) and what the shop still owes
   suppliers (purchases where "Paid now" was less than the bill). Tap a name: the history, "Money received" / "Money paid" (cash or UPI, any date).
   Stored as ordinary book records (see tc-shop.js: kind "o" t:'rc' / t:'sp'; nothing new on the server). Sums come from SH.ledger(). */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi; if(!SH||!UI||!SH.ledger||window.__tcShopCr) return;
 window.__tcShopCr=1;
 var H=SH.H, money=H.money, qty=H.qty, T=UI.T, E=UI.E, say=UI.say, num=UI.num, $=function(id){ return document.getElementById(id); };
 var V={tab:"c",cur:null,pm:"C"};

 function enc(k){ return encodeURIComponent(k).replace(/'/g,"%27"); }
 function ent(t,k){ var L=SH.ledger(); var A=t==="c"?L.cust:L.sup; for(var i=0;i<A.length;i++) if(A[i].k===k) return A[i]; return null; }
 UI.screen("dues",function(){
  var L=SH.ledger(), isC=V.tab==="c", A=(isC?L.cust:L.sup).filter(function(e){ return e.owed>0.004; });
  UI.body().innerHTML=
   '<div class="tsC"><div><span class="tsChip'+(isC?" on":"")+'" onclick="tsCrTab(\'c\')">👥 '+E(T("കിട്ടാനുള്ളത്","To get"))+' '+money(L.custTotal)+'</span>'+
   '<span class="tsChip'+(!isC?" on":"")+'" onclick="tsCrTab(\'s\')">🏪 '+E(T("കൊടുക്കാനുള്ളത്","To pay"))+' '+money(L.supTotal)+'</span></div>'+
   '<div class="tsM" style="margin-top:8px;line-height:1.5">'+E(isC?T("വിൽപ്പനയിൽ 'കടം' തിരഞ്ഞ് പേര് നൽകിയാൽ ഇവിടെ വരും.","Sales saved as 'Credit' with a name show here.")
    :T("വാങ്ങലിൽ 'ഇപ്പോൾ കൊടുത്തത്' കുറച്ച് നൽകിയാൽ ബാക്കി ഇവിടെ വരും.","When 'Paid now' is less than the bill, the rest shows here."))+'</div></div>'+
   '<div class="tsC">'+(!A.length?'<div class="tsM" style="text-align:center">'+E(T("ഒന്നുമില്ല","Nothing pending"))+'</div>':
    A.map(function(e){ return '<div class="tsRow" onclick="tsCrOpen(\''+(isC?"c":"s")+'\',\''+enc(e.k)+'\')"><div><b style="font-size:18px">'+E(e.n)+'</b><div class="tsM">'+E(T("അവസാനം ","Last "))+E(UI.dmy(e.last))+'</div></div><b style="font-size:22px;color:'+(isC?'#a12d2d':'#7a5a14')+'">'+money(e.owed)+'</b></div>'; }).join(""))+'</div>';
 },function(){ return "📒 "+T("കടം / കിട്ടാനുള്ളത്","Credit & dues"); });
 window.tsCrTab=function(t){ V.tab=t; UI.render(); };

 window.tsCrOpen=function(t,k){
  var e=ent(t,decodeURIComponent(k)); if(!e) return; V.cur={t:t,k:e.k};
  var isC=t==="c", P=SH.calc().P;
  var rows=e.rows.slice().sort(function(a,b){ return a.d<b.d?1:a.d>b.d?-1:(a.ts<b.ts?1:-1); }).slice(0,40);
  UI.sheet('<h3 style="margin:0">'+E(e.n)+'</h3><div class="tsTot" style="color:'+(isC?'#a12d2d':'#7a5a14')+'">'+money(Math.max(0,e.owed))+'</div><div class="tsM">'+E(isC?T("ഇത്രയും കിട്ടാനുണ്ട്","still to get"):T("ഇത്രയും കൊടുക്കാനുണ്ട്","still to pay"))+(e.owed<-0.004?' · '+E(T("മുൻകൂർ കിട്ടി/കൊടുത്തത് ","advance "))+money(-e.owed):'')+'</div>'+
   '<button class="tsBtn" style="background:#1a8f4a" onclick="tsCrPay()">'+(isC?'💰 '+E(T("പണം കിട്ടി","Money received")):'💸 '+E(T("പണം കൊടുത്തു","Money paid")))+'</button>'+
   '<div style="margin-top:10px">'+rows.map(function(r){
     var x=r.x||{}, pay=r.k==="o", p=P[x.p], amt=pay?-(+x.a||0):(r.k==="s"?(+x.q||0)*(+x.pr||0):(+x.cr||0));
     var what=pay?(isC?T("പണം കിട്ടി","Received"):T("പണം കൊടുത്തു","Paid"))+(x.pm==="U"?" · UPI":""):(p?p.n:"?")+" × "+qty(x.q)+(r.k==="b"&&x.bn?" · "+E(x.bn):"");
     return '<div class="tsRow"><div>'+E(what)+'<div class="tsM">'+E(UI.dmy(r.d))+(x.n?" · "+E(x.n):"")+'</div></div><div><b style="color:'+(amt<0?'#177044':'inherit')+'">'+(amt<0?"−":"")+money(Math.abs(amt))+'</b> <button class="tsX" onclick="tsCrCancel(\''+r.id+'\')">✕</button></div></div>'; }).join("")+'</div>'+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 };
 window.tsCrCancel=function(id){
  if(!confirm(T("ഈ എൻട്രി റദ്ദാക്കട്ടേ?","Cancel this entry?"))) return;
  SH.cancel(id); say(T("റദ്ദാക്കി","Cancelled")); var c=V.cur; UI.closeSheet(); UI.render(); if(c) setTimeout(function(){ var e=ent(c.t,c.k); if(e) tsCrOpen(c.t,e.k); },30);
 };
 window.tsCrPay=function(){
  var c=V.cur, e=c&&ent(c.t,c.k); if(!e) return; V.pm="C"; var isC=c.t==="c";
  UI.sheet('<h3 style="margin:0">'+E(e.n)+'</h3><div class="tsM">'+E(isC?T("കിട്ടിയ തുക","Amount received"):T("കൊടുത്ത തുക","Amount paid"))+'</div>'+
   '<input id="crA" type="number" inputmode="decimal" value="'+E(e.owed>0?e.owed:"")+'" style="font-size:26px">'+
   '<div id="crPm"><span class="tsChip on" onclick="tsCrPm(\'C\')">💵 '+E(T("പണം","Cash"))+'</span><span class="tsChip" onclick="tsCrPm(\'U\')">📱 UPI</span></div>'+
   UI.dateRow("crD",H.today())+
   '<button class="tsBtn" style="background:#1a8f4a;font-size:21px;padding:17px" onclick="tsCrPaySave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button><button class="tsBtn g" onclick="tsCrOpen(\''+c.t+'\',\''+enc(e.k)+'\')">← '+E(T("പിന്നോട്ട്","Back"))+'</button>');
  var a=$("crA"); if(a){ a.focus(); a.select(); }
 };
 window.tsCrPm=function(m){ V.pm=m; var c=document.querySelectorAll("#crPm .tsChip"); if(c.length>1){ c[0].classList.toggle("on",m==="C"); c[1].classList.toggle("on",m==="U"); } };
 window.tsCrPaySave=function(){
  var c=V.cur, e=c&&ent(c.t,c.k); if(!e) return;
  var a=num("crA"); if(!(a>0)){ say(T("തുക നൽകുക","Enter the amount")); return; }
  var x=c.t==="c"?{t:"rc",cu:e.n,a:a,pm:V.pm}:{t:"sp",su:e.n,a:a,pm:V.pm};
  SH.add("o",x,UI.dateVal("crD"));
  say(T("സേവ് ചെയ്തു · ","Saved · ")+money(a)); UI.closeSheet(); UI.render();
 };
})();
