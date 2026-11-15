/* Shop insights (tc-insight.js, loaded by tc-regdocs.js after tc-capack.js).
   "AI insight" that works INSIDE the phone: it reads the shop book and says, in plain words, what needs attention - items about to run out,
   money lying in unsold stock, sales and profit against last month, an expense that jumped, customers who have not paid for a month, thin profit,
   the best day of the week, the GST to pay so far. Nothing is sent anywhere, no internet and no cost; every figure is worked out by the app itself.
   Platinum: the Home card and the "Insights" screen. Other plans see a locked card that only says how many insights are waiting.
   Staff phones never see it (it talks about profit and dues). The profit lines are hidden while "Hide profit" is on. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcInsight) return;
 window.__tcInsight=1;
 var T=UI.T, E=UI.E, H=SH.H, $=function(id){ return document.getElementById(id); };
 var money=function(n){ return H.money(Math.round(+n||0)); };

 function addDays(d,n){ return H.addDays(d,n); }
 function daysBetween(a,b){ var x=Date.parse(a), y=Date.parse(b); return isFinite(x)&&isFinite(y)?Math.round((y-x)/86400000):0; }
 function dayName(i){ return [T("ഞായർ","Sunday"),T("തിങ്കൾ","Monday"),T("ചൊവ്വ","Tuesday"),T("ബുധൻ","Wednesday"),T("വ്യാഴം","Thursday"),T("വെള്ളി","Friday"),T("ശനി","Saturday")][i]; }
 function names(L,n){ var s=L.slice(0,n).map(function(p){ return p.n; }).join(", "); return L.length>n?s+" +"+(L.length-n):s; }
 function prevMonth(t){ var y=+t.slice(0,4), m=+t.slice(5,7)-1; if(m<1){ m=12; y--; } return y+"-"+(m<10?"0":"")+m; }

 /* the list of insights, most important first. sev: 2 act now, 1 look at, 0 good news / information. money = a profit figure (hidden in "Hide profit" mode) */
 function compute(){
  var out=[], t=H.today(), M=SH.calc(), P=M.P, simple=UI.simple();
  function add(sev,ic,ml,en,o){ out.push(Object.assign({sev:sev,ic:ic,ml:ml,en:en},o||{})); }
  if(!M.live.length) return out;
  var d30=addDays(t,-29), rate={};   /* sold in the last 30 days, per item */
  M.live.forEach(function(r){ if(r.k==="s"&&r.d>=d30&&r.x&&r.x.p) rate[r.x.p]=(rate[r.x.p]||0)+(+r.x.q||0); });
  var prods=SH.products();

  /* 1. an item that sells but has run out */
  var out0=prods.filter(function(p){ return !p.nt&&!p.comp&&p.stock!=null&&p.stock<=0&&rate[p.id]>0; });
  if(out0.length) add(2,"🚫","വിൽക്കുന്ന സാധനം തീർന്നു: "+names(out0,5)+" - ഉടനെ വാങ്ങണം, കച്ചവടം നഷ്ടപ്പെടും.","Sold out but selling: "+names(out0,5)+" - buy now, sales are being lost.");
  /* 2. running out within a week at the present speed */
  var soon=prods.filter(function(p){ return !p.nt&&!p.comp&&p.stock>0&&rate[p.id]>0&&p.stock/(rate[p.id]/30)<=7; }).sort(function(a,b){ return a.stock/rate[a.id]-b.stock/rate[b.id]; });
  if(soon.length){ var f=soon[0], dl=Math.max(1,Math.round(f.stock/(rate[f.id]/30)));
   add(2,"⏳","ഒരാഴ്ചയ്ക്കുള്ളിൽ തീരും: "+names(soon,5)+" ("+f.n+" ഏകദേശം "+dl+" ദിവസത്തേക്ക് മാത്രം).","Will run out within a week: "+names(soon,5)+" ("+f.n+" has about "+dl+" day(s) left)."); }
  /* 3. money lying in stock that does not sell */
  var dead=[], locked=0;
  prods.forEach(function(p){ if(p.nt||p.comp||!(p.stock>0)||!(p.value>0)) return; var ref=(p.last||"")>(p.lb||"")?p.last:(p.lb||""); if(ref&&daysBetween(ref,t)>=60){ dead.push(p); locked+=p.value; } });
  if(dead.length&&locked>=500) add(1,"📦","60 ദിവസത്തിലേറെയായി വിറ്റിട്ടില്ല: "+names(dead,4)+" - "+money(locked)+" സ്റ്റോക്കിൽ കെട്ടിക്കിടക്കുന്നു. ഓഫർ വെച്ച് വിൽക്കുന്നത് ആലോചിക്കുക.","Not sold for 60+ days: "+names(dead,4)+" - "+money(locked)+" is lying in stock. Think of an offer to move it.");
  /* 4. this month against the same days of last month */
  var n=+t.slice(8,10), m0=t.slice(0,7), pm=prevMonth(t), cur=SH.report(m0+"-01",t), prv=SH.report(pm+"-01",pm+"-"+(n<10?"0":"")+n);
  if(n>=7&&prv.sales>0){
   var ch=Math.round((cur.sales-prv.sales)/prv.sales*100);
   if(ch<=-15) add(2,"📉","ഈ മാസം ഇതുവരെ വിൽപ്പന കഴിഞ്ഞ മാസത്തെ ഇതേ ദിവസങ്ങളെക്കാൾ "+Math.abs(ch)+"% കുറവാണ് ("+money(cur.sales)+" / "+money(prv.sales)+").","Sales this month are "+Math.abs(ch)+"% below the same days of last month ("+money(cur.sales)+" vs "+money(prv.sales)+").");
   else if(ch>=15) add(0,"📈","ഈ മാസം ഇതുവരെ വിൽപ്പന കഴിഞ്ഞ മാസത്തെക്കാൾ "+ch+"% കൂടുതലാണ് ("+money(cur.sales)+").","Sales this month are "+ch+"% above last month so far ("+money(cur.sales)+").");
   if(!simple&&cur.sales>0&&prv.sales>0){
    var mc=(cur.profit/(cur.sales-cur.gstOut||1))*100, mp=(prv.profit/(prv.sales-prv.gstOut||1))*100;
    if(mp-mc>=5&&cur.profit>0) add(1,"✂","ലാഭ ശതമാനം കുറഞ്ഞു: "+Math.round(mc)+"% (കഴിഞ്ഞ മാസം "+Math.round(mp)+"%). വില കൂട്ടിയതുകൊണ്ടോ വാങ്ങൽ വില കൂടിയതുകൊണ്ടോ ആകാം - ലാഭം കുറഞ്ഞ സാധനങ്ങൾ നോക്കുക.","Profit margin fell: "+Math.round(mc)+"% (last month "+Math.round(mp)+"%). Check the items with thin profit.");
   }
  }
  /* 5. an expense that jumped */
  if(!simple){
   var avg={}, k, i2, mm=m0;
   for(i2=0;i2<3;i2++){ mm=prevMonth(mm+"-01"); var e=SH.report(mm+"-01",mm+"-31").expBy; for(k in e) avg[k]=(avg[k]||0)+e[k]/3; }
   var jumps=[]; Object.keys(cur.expBy).forEach(function(c){ if(c!=="Wage"&&avg[c]>0&&cur.expBy[c]>=1000&&cur.expBy[c]>avg[c]*1.5) jumps.push({c:c,v:cur.expBy[c],a:avg[c]}); });
   jumps.sort(function(a,b){ return (b.v-b.a)-(a.v-a.a); });
   if(jumps.length) add(1,"🧾","ചെലവ് കൂടി: '"+jumps[0].c+"' ഈ മാസം ഇതുവരെ "+money(jumps[0].v)+" (കഴിഞ്ഞ 3 മാസത്തെ ശരാശരി "+money(jumps[0].a)+").","Expense jumped: '"+jumps[0].c+"' is "+money(jumps[0].v)+" this month so far (3-month average "+money(jumps[0].a)+").");
  }
  /* 6. customers who have not paid, and what the shop owes */
  var L=SH.ledger(), over=L.cust.filter(function(e){ return e.owed>0.004&&e.last&&daysBetween(e.last,t)>=30; });
  if(over.length){ var tot=over.reduce(function(a,e){ return a+e.owed; },0), big=over.slice().sort(function(a,b){ return b.owed-a.owed; })[0];
   add(2,"📒",over.length+" പേർ 30 ദിവസത്തിലേറെയായി പണം തരാനുണ്ട്: ആകെ "+money(tot)+" (ഏറ്റവും കൂടുതൽ "+big.n+" - "+money(big.owed)+"). ഓർമ്മപ്പെടുത്തുക.",over.length+" customer(s) have not paid for 30+ days: "+money(tot)+" in all (most: "+big.n+" - "+money(big.owed)+"). Remind them."); }
  else if(L.custTotal>0) add(0,"📒","കസ്റ്റമർമാരിൽ നിന്ന് "+money(L.custTotal)+" കിട്ടാനുണ്ട് (എല്ലാം 30 ദിവസത്തിനുള്ളിൽ).","Customers owe "+money(L.custTotal)+" (all within 30 days).");
  if(L.supTotal>0) add(0,"💸","സപ്ലൈയർമാർക്ക് "+money(L.supTotal)+" കൊടുക്കാനുണ്ട്.","You owe suppliers "+money(L.supTotal)+".");
  /* 7. the items that earn the most this month */
  if(!simple){
   var pf={}, cnt=0; cur.lines.forEach(function(l){ var x=l.r.x, tax=+x.gr>0?l.tot*x.gr/(100+ +x.gr):0, id=x.p; if(!id) return; cnt++; pf[id]=(pf[id]||0)+(l.tot-tax-l.costX); });
   var top=Object.keys(pf).filter(function(i){ return P[i]&&pf[i]>0; }).sort(function(a,b){ return pf[b]-pf[a]; }).slice(0,3);
   if(cnt>=5&&top.length>=2) add(0,"🏆","ഈ മാസം ഏറ്റവും ലാഭം തരുന്നത്: "+top.map(function(i){ return P[i].n+" ("+money(pf[i])+")"; }).join(", ")+". ഇവ എപ്പോഴും സ്റ്റോക്കിൽ വെക്കുക.","Earning the most this month: "+top.map(function(i){ return P[i].n+" ("+money(pf[i])+")"; }).join(", ")+". Never run out of these.");
   /* 8. thin profit on an item that sells */
   var thin=prods.filter(function(p){ if(p.nt||p.comp||!(p.pr>0)||!(p.avgx>0)||!(rate[p.id]>0)) return false; var px=p.g>0?p.pr*100/(100+p.g):p.pr; return (px-p.avgx)/p.avgx*100<10; });
   if(thin.length) add(1,"💰","ലാഭം 10%-ൽ താഴെയുള്ള സാധനങ്ങൾ: "+names(thin,4)+". വില കൂട്ടുന്നത് ആലോചിക്കുക"+(thin[0].sugg>0?" (ഉദാ: "+thin[0].n+" "+money(thin[0].sugg)+")":"")+".","Items with under 10% profit: "+names(thin,4)+". Consider raising the price"+(thin[0].sugg>0?" (e.g. "+thin[0].n+" to "+money(thin[0].sugg)+")":"")+".");
  }
  /* 9. the best day of the week (needs 4 weeks of sales) */
  var d56=addDays(t,-55), wd=[0,0,0,0,0,0,0], first=t;
  M.live.forEach(function(r){ if(r.k==="s"){ if(r.d<first) first=r.d; if(r.d>=d56) wd[new Date(r.d+"T00:00:00").getDay()]+=(+r.x.q||0)*(+r.x.pr||0); } });
  var wsum=wd.reduce(function(a,b){ return a+b; },0);
  if(daysBetween(first,t)>=28&&wsum>0){ var bi=0; wd.forEach(function(v,i){ if(v>wd[bi]) bi=i; });
   if(wd[bi]>wsum/7*1.3) add(0,"📅",dayName(bi)+" ആണ് നിങ്ങളുടെ ഏറ്റവും തിരക്കുള്ള ദിവസം ("+Math.round(wd[bi]/wsum*100)+"% വിൽപ്പന). അന്നത്തേക്ക് സ്റ്റോക്ക് ഉറപ്പാക്കുക.",dayName(bi)+" is your busiest day ("+Math.round(wd[bi]/wsum*100)+"% of sales). Have stock ready for it."); }
  /* 10. GST so far this month */
  if(SH.cfg("gst","0")==="1"&&(cur.gstOut>0||cur.gstIn>0)){ var gp=cur.gstOut-cur.gstIn;
   add(0,"🧮",gp>=0?"ഈ മാസം ഇതുവരെ അടയ്ക്കേണ്ട GST ഏകദേശം "+money(gp)+" (പിരിച്ചത് "+money(cur.gstOut)+", കൊടുത്തത് "+money(cur.gstIn)+").":"ഈ മാസം ഇതുവരെ GST "+money(-gp)+" തിരിച്ചു കിട്ടാനുണ്ട്.",gp>=0?"GST to pay so far this month is about "+money(gp)+" (collected "+money(cur.gstOut)+", paid "+money(cur.gstIn)+").":"GST of "+money(-gp)+" is to be claimed back this month so far."); }
  out.sort(function(a,b){ return b.sev-a.sev; });
  return out;
 }
 function txt(i){ return T(i.ml,i.en); }
 function row(i){ var c=i.sev===2?"#fdecec":i.sev===1?"#fff6df":"#eef6f1"; return '<div class="tsC" style="background:'+c+';margin:6px 0;padding:10px"><span style="font-size:20px">'+i.ic+'</span> '+E(txt(i))+'</div>'; }

 function allowed(){ return typeof window.tcIsPlatinumPlan==="function"?!!window.tcIsPlatinumPlan():true; }
 window.tsInsightList=compute;   /* used by the test */

 /* the Home card: top 3 insights (or the locked teaser) */
 window.tsInsightCard=function(){
  if(SH.isStaff()) return "";
  var L; try{ L=compute(); }catch(e){ return ""; }
  if(!L.length) return "";
  if(!allowed()) return '<div class="tsC" style="background:#f3f0fb" onclick="tsInsightLocked()"><b>💡 '+E(T("ഷോപ്പ് ഇൻസൈറ്റ്","Shop insights"))+' <span class="tsM">(Platinum)</span></b><div class="tsM">'+E(T("നിങ്ങളുടെ കണക്കിൽ "+L.length+" കാര്യങ്ങൾ ശ്രദ്ധിക്കാനുണ്ട്. Platinum പ്ലാനിൽ കാണാം.",L.length+" thing(s) in your book need a look. See them with the Platinum plan."))+'</div></div>';
  return '<div class="tsC"><b>💡 '+E(T("ഇൻസൈറ്റ്","Insights"))+'</b>'+L.slice(0,3).map(row).join("")+
   (L.length>3?'<button class="tsBtn g s" onclick="tsOpen(\'insight\')">'+E(T("എല്ലാം കാണുക","See all")+" ("+L.length+")")+'</button>':'')+'</div>';
 };
 window.tsInsightLocked=function(){ UI.say(T("ഷോപ്പ് ഇൻസൈറ്റ് Platinum പ്ലാനിൽ ലഭ്യമാണ് - അപ്ഗ്രേഡ് ചെയ്യുക","Shop insights are a Platinum feature - upgrade to use them")); };

 UI.screen("insight",function(){
  if(SH.isStaff()||!allowed()){ $("tsBody").innerHTML=''; UI.go("home"); return; }
  var L=compute();
  $("tsBody").innerHTML='<div class="tsC"><b>💡 '+E(T("ഇൻസൈറ്റ്","Insights"))+'</b><div class="tsM">'+E(T("നിങ്ങളുടെ കണക്കുകൾ നോക്കി ആപ്പ് തന്നെ കണ്ടെത്തിയത്. ഒന്നും പുറത്തേക്ക് അയക്കുന്നില്ല.","Found by the app from your own book. Nothing is sent anywhere."))+'</div></div>'+
   (L.length?L.map(row).join(""):'<div class="tsC tsM" style="text-align:center">'+E(T("ഇപ്പോൾ പ്രത്യേകിച്ച് ഒന്നുമില്ല - കണക്കുകൾ ചേർക്കുന്നത് തുടരുക.","Nothing special right now - keep adding your entries."))+'</div>');
 },function(){ return "💡 "+T("ഇൻസൈറ്റ്","Insights"); });
})();
