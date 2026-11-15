/* Travel insights (tc-trinsight.js, loaded by tc-regdocs.js).
   The same "AI insight" idea as the shop, for the taxi / travel owner's Dashboard. It reads the owner's own bills, payments, live trips and expenses and says,
   in plain words, what needs attention: money still to collect, trips ended but not billed, a regular customer who has not travelled for two months,
   trips coming up, this month against last month, the best vehicle / weekday / route, an expense that jumped.
   Everything is worked out inside the phone - nothing is sent anywhere, no internet and no cost.
   Shown to the business owner only (never to a customer). */
(function(){
 if(window.__tcTrInsight) return;
 window.__tcTrInsight=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var $=function(id){ return document.getElementById(id); };
 var p2=function(n){ return (n<10?"0":"")+n; };
 function money0(n){ n=Math.round(+n||0); try{ return typeof money==="function"?money(n):"Rs."+n; }catch(e){ return "Rs."+n; } }
 function ymd(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
 function today(){ return ymd(new Date()); }
 function addDays(s,n){ var d=new Date(s+"T00:00:00"); d.setDate(d.getDate()+n); return ymd(d); }
 function daysBetween(a,b){ var x=Date.parse(a), y=Date.parse(b); return isFinite(x)&&isFinite(y)?Math.round((y-x)/86400000):0; }
 function prevMonth(m){ var y=+m.slice(0,4), k=+m.slice(5,7)-1; if(k<1){ k=12; y--; } return y+"-"+p2(k); }
 function dayName(i){ return B(["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][i],["ഞായർ","തിങ്കൾ","ചൊവ്വ","ബുധൻ","വ്യാഴം","വെള്ളി","ശനി"][i]); }
 function names(L,n){ var s=L.slice(0,n).join(", "); return L.length>n?s+" +"+(L.length-n):s; }
 function okDate(s){ return /^\d{4}-\d{2}-\d{2}$/.test(s||""); }

 /* one row per bill (a completed trip with its quotation): date, customer, vehicle, route, billed, paid, balance */
 function bills(){
  var out=[];
  (window.db&&db.trips||[]).forEach(function(t){
   if(!t||t.status!=="completed") return;
   var q=(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]||null;
   var d=String(t.entryDate||t.startDate||(q&&q.startDate)||(t.created||"")).slice(0,10);
   if(!okDate(d)) return;
   var fin=0;
   try{ if(q&&typeof window.billFinalAmount==="function"){ var r=window.billFinalAmount(t,q,(db.categories||[])[q.categoryId]); fin=+(r&&r.final)||0; } }catch(e){}
   var paid=0; (t.payments||[]).forEach(function(p){ paid+=+p.amount||0; });
   var nm=String(t.customer||(q&&q.customer)||"").trim(), mb=String(t.mobile||(q&&q.mobile)||"").replace(/\D/g,"").slice(-10);
   var from=String((q&&q.pickup)||"").trim(), to=String((q&&q.destination)||"").trim();
   out.push({d:d,nm:nm,mb:mb,key:mb||nm.toLowerCase(),veh:String(t.vehicleNo||(q&&q.vehicleNo)||"").trim(),from:from,to:to,fin:fin,paid:paid,bal:Math.max(0,fin-paid)});
  });
  return out;
 }
 function sum(L,f){ return L.reduce(function(a,x){ return a+(+f(x)||0); },0); }

 /* the list of insights, most important first. sev: 2 act now, 1 look at, 0 good news / information */
 function compute(){
  var out=[], t=today(), mon=t.slice(0,7), B0=bills(), live=(window.db&&db.liveTrips)||[], i;
  function add(sev,ic,ml,en){ out.push({sev:sev,ic:ic,ml:ml,en:en}); }
  var cap=function(s){ return s||"-"; };

  /* 1. trips ended on the road but not billed yet */
  var unb=live.filter(function(x){ return x&&x.status==="ended"; });
  if(unb.length){
   var old=unb.filter(function(x){ return x.endAt&&daysBetween(String(x.endAt).slice(0,10),t)>=1; });
   add(old.length?2:1,"🧾",unb.length+" ട്രിപ്പ് തീർന്നു, ബില്ല് ഉണ്ടാക്കിയിട്ടില്ല"+(old.length?" ("+old.length+" എണ്ണം ഇന്നലെയോ അതിനു മുൻപോ തീർന്നത്)":"")+": "+names(unb.map(function(x){ return cap(x.customer); }),3)+". ബില്ല് ഉണ്ടാക്കാതെ പണം ചോദിക്കാൻ പറ്റില്ല.",
    unb.length+" trip(s) ended but not billed"+(old.length?" ("+old.length+" ended yesterday or earlier)":"")+": "+names(unb.map(function(x){ return cap(x.customer); }),3)+". Create the bill so you can collect the money.");
  }

  /* 2. money still to collect */
  var owing=B0.filter(function(b){ return b.bal>=1; });
  if(owing.length){
   var tot=sum(owing,function(b){ return b.bal; }), byC={};
   owing.forEach(function(b){ var c=byC[b.key]||(byC[b.key]={nm:b.nm,v:0,last:b.d}); c.v+=b.bal; if(b.d>c.last) c.last=b.d; });
   var cl=Object.keys(byC).map(function(k){ return byC[k]; }).sort(function(a,b){ return b.v-a.v; });
   var late=owing.filter(function(b){ return daysBetween(b.d,t)>=30; });
   if(late.length) add(2,"📒",late.length+" ബില്ലിൽ 30 ദിവസത്തിലേറെയായി പണം കിട്ടാനുണ്ട്. ആകെ കിട്ടാനുള്ളത് "+money0(tot)+" (ഏറ്റവും കൂടുതൽ: "+cap(cl[0].nm)+" "+money0(cl[0].v)+").","Money pending for over 30 days on "+late.length+" bill(s). Total to collect "+money0(tot)+" (most: "+cap(cl[0].nm)+" "+money0(cl[0].v)+").");
   else add(0,"📒","കസ്റ്റമർമാരിൽ നിന്ന് "+money0(tot)+" കിട്ടാനുണ്ട് ("+cl.length+" പേർ). ഏറ്റവും കൂടുതൽ: "+cap(cl[0].nm)+" "+money0(cl[0].v)+".","You have "+money0(tot)+" to collect from "+cl.length+" customer(s). Most: "+cap(cl[0].nm)+" "+money0(cl[0].v)+".");
  }

  /* 3. trips coming up (today and tomorrow) */
  var tm=addDays(t,1), up=[];
  (window.db&&db.trips||[]).forEach(function(x){
   if(!x||x.status!=="confirmed") return;
   var q=(db.quotes||[]).filter(function(y){ return y.id===x.quoteId; })[0]||null;
   var d=String(x.startDate||(q&&q.startDate)||"").slice(0,10);
   if(d===t||d===tm) up.push({d:d,nm:String(x.customer||(q&&q.customer)||"").trim()});
  });
  if(up.length) add(1,"🚖","ഇന്നും നാളെയുമായി "+up.length+" ട്രിപ്പ് ഉണ്ട്: "+names(up.map(function(u){ return cap(u.nm)+(u.d===t?" (ഇന്ന്)":" (നാളെ)"); }),3)+".","You have "+up.length+" trip(s) today and tomorrow: "+names(up.map(function(u){ return cap(u.nm)+(u.d===t?" (today)":" (tomorrow)"); }),3)+".");

  /* 4. regular customers: 3 or more trips. Lapsed = no trip for 60+ days */
  var byK={};
  B0.forEach(function(b){ if(!b.key) return; var c=byK[b.key]||(byK[b.key]={nm:b.nm,mb:b.mb,n:0,v:0,last:b.d}); c.n++; c.v+=b.fin; if(b.d>c.last){ c.last=b.d; if(b.nm) c.nm=b.nm; } });
  var reg=Object.keys(byK).map(function(k){ return byK[k]; }).filter(function(c){ return c.n>=3; });
  var lapsed=reg.filter(function(c){ return daysBetween(c.last,t)>=60; }).sort(function(a,b){ return b.v-a.v; });
  if(lapsed.length) add(1,"📞","സ്ഥിരം കസ്റ്റമർ ഒരുപാട് ദിവസമായി ബുക്ക് ചെയ്തിട്ടില്ല: "+names(lapsed.map(function(c){ return cap(c.nm)+" ("+daysBetween(c.last,t)+" ദിവസം)"; }),3)+". ഒന്ന് വിളിച്ച് നോക്കൂ.",
   "Regular customer(s) who have not booked for a long time: "+names(lapsed.map(function(c){ return cap(c.nm)+" ("+daysBetween(c.last,t)+" days)"; }),3)+". Give them a call.");
  var top=reg.slice().sort(function(a,b){ return b.n-a.n||b.v-a.v; }).slice(0,3);
  if(top.length) add(0,"⭐","നിങ്ങളുടെ സ്ഥിരം കസ്റ്റമർമാർ: "+top.map(function(c){ return cap(c.nm)+" ("+c.n+" ട്രിപ്പ്, "+money0(c.v)+")"; }).join(", ")+".","Your regular customers: "+top.map(function(c){ return cap(c.nm)+" ("+c.n+" trips, "+money0(c.v)+")"; }).join(", ")+".");

  /* 5. this month so far against the same days of last month */
  var n=+t.slice(8,10), pm=prevMonth(mon), pmEnd=pm+"-"+p2(n);
  var cur=B0.filter(function(b){ return b.d>=mon+"-01"&&b.d<=t; }), prv=B0.filter(function(b){ return b.d>=pm+"-01"&&b.d<=pmEnd; });
  var cv=sum(cur,function(b){ return b.fin; }), pv=sum(prv,function(b){ return b.fin; });
  if(n>=7&&pv>0){
   var ch=Math.round((cv-pv)/pv*100);
   if(ch<=-15) add(2,"📉","ഈ മാസം ഇതുവരെ ബില്ല് "+money0(cv)+" - കഴിഞ്ഞ മാസത്തെ ഇതേ ദിവസങ്ങളെക്കാൾ "+(-ch)+"% കുറവ് ("+money0(pv)+").","Billing this month so far is "+money0(cv)+" - "+(-ch)+"% below the same days last month ("+money0(pv)+").");
   else if(ch>=15) add(0,"📈","ഈ മാസം ഇതുവരെ ബില്ല് "+money0(cv)+" - കഴിഞ്ഞ മാസത്തെക്കാൾ "+ch+"% കൂടുതൽ.","Billing this month so far is "+money0(cv)+" - "+ch+"% more than last month.");
  }
  /* 5b. the month in one line: trips, billed, spent */
  var ex=(window.db&&db.expenses)||[], exM=0;
  ex.forEach(function(e){ if(String(e.created||"").slice(0,7)===mon) exM+=+e.amount||0; });
  if(cur.length||exM>0) add(0,"🧮","ഈ മാസം ഇതുവരെ: "+cur.length+" ട്രിപ്പ്, ബില്ല് "+money0(cv)+", ചെലവ് "+money0(exM)+(cv>0?(cv>=exM?", ബാക്കി "+money0(cv-exM):", ചെലവ് ബില്ലിനെക്കാൾ "+money0(exM-cv)+" കൂടുതൽ"):"")+".","This month so far: "+cur.length+" trip(s), billed "+money0(cv)+", spent "+money0(exM)+(cv>0?(cv>=exM?", left "+money0(cv-exM):", spending is "+money0(exM-cv)+" more than billed"):"")+".");

  /* 6. an expense that jumped (against the last 3 months' average) */
  var avg={}, cm={}, k, mm=mon;
  ex.forEach(function(e){ if(String(e.created||"").slice(0,7)===mon){ var c=String(e.category||"Other").trim()||"Other"; cm[c]=(cm[c]||0)+(+e.amount||0); } });
  var mons={}; for(i=0;i<3;i++){ mm=prevMonth(mm); mons[mm]=1; }
  ex.forEach(function(e){ var m=String(e.created||"").slice(0,7); if(mons[m]){ var c=String(e.category||"Other").trim()||"Other"; avg[c]=(avg[c]||0)+(+e.amount||0)/3; } });
  var jumps=[]; Object.keys(cm).forEach(function(c){ if(avg[c]>0&&cm[c]>=1000&&cm[c]>avg[c]*1.5) jumps.push({c:c,v:cm[c],a:avg[c]}); });
  jumps.sort(function(a,b){ return (b.v-b.a)-(a.v-a.a); });
  if(jumps.length) add(1,"⛽","ചെലവ് കൂടി: '"+jumps[0].c+"' ഈ മാസം ഇതുവരെ "+money0(jumps[0].v)+" (കഴിഞ്ഞ 3 മാസത്തെ ശരാശരി "+money0(jumps[0].a)+").","Expense jumped: '"+jumps[0].c+"' is "+money0(jumps[0].v)+" so far this month (3-month average "+money0(jumps[0].a)+").");

  /* 7. the vehicle that earned the most this month (needs 2 vehicles with bills) */
  var bv={}; cur.forEach(function(b){ if(b.veh) bv[b.veh]=(bv[b.veh]||0)+b.fin; });
  var vl=Object.keys(bv).sort(function(a,b){ return bv[b]-bv[a]; });
  if(vl.length>=2) add(0,"🚗","ഈ മാസം ഏറ്റവും വരുമാനം "+vl[0]+" ("+money0(bv[vl[0]])+"). ഏറ്റവും കുറവ് "+vl[vl.length-1]+" ("+money0(bv[vl[vl.length-1]])+").","Best vehicle this month: "+vl[0]+" ("+money0(bv[vl[0]])+"). Lowest: "+vl[vl.length-1]+" ("+money0(bv[vl[vl.length-1]])+").");

  /* 8. the busiest weekday (last 90 days, at least 8 trips) */
  var d90=addDays(t,-89), wd=[0,0,0,0,0,0,0], wn=0;
  B0.forEach(function(b){ if(b.d>=d90&&b.d<=t){ wd[new Date(b.d+"T00:00:00").getDay()]++; wn++; } });
  if(wn>=8){ var bi=0; wd.forEach(function(v,j){ if(v>wd[bi]) bi=j; });
   if(wd[bi]>wn/7*1.5) add(0,"📅",dayName(bi)+" ആണ് ഏറ്റവും തിരക്കുള്ള ദിവസം ("+Math.round(wd[bi]/wn*100)+"% ട്രിപ്പ്). അന്ന് വണ്ടിയും ഡ്രൈവറും ഒഴിച്ചിടുക.",dayName(bi)+" is your busiest day ("+Math.round(wd[bi]/wn*100)+"% of trips). Keep a vehicle and driver free for it."); }

  /* 9. the route driven most often (3 or more times) */
  var rt={}; B0.forEach(function(b){ if(b.from&&b.to){ var kk=b.from.toLowerCase()+">"+b.to.toLowerCase(), r=rt[kk]||(rt[kk]={a:b.from,b:b.to,n:0}); r.n++; } });
  var rl=Object.keys(rt).map(function(x){ return rt[x]; }).sort(function(a,b){ return b.n-a.n; });
  if(rl.length&&rl[0].n>=3) add(0,"🛣","ഏറ്റവും കൂടുതൽ ഓടിയ റൂട്ട്: "+rl[0].a+" → "+rl[0].b+" ("+rl[0].n+" തവണ).","Most driven route: "+rl[0].a+" → "+rl[0].b+" ("+rl[0].n+" times).");

  out.sort(function(a,b){ return b.sev-a.sev; });
  return out;
 }
 function txt(i){ return B(i.en,i.ml); }
 function row(i){ var c=i.sev===2?"#fdecec":i.sev===1?"#fff6df":"#eef6f1"; return '<div style="background:'+c+';border-radius:10px;margin:6px 0;padding:9px 10px;font-size:13.5px;line-height:1.4"><span style="font-size:18px">'+i.ic+'</span> '+E(txt(i))+'</div>'; }
 window.tcTrBills=bills;   /* used by the voice questions (tc-voice.js) */
 window.tcTrInsightList=compute;   /* used by the test */

 function isOwner(){ try{ var u=getCurrentUser(); return !!u&&u.role!=="customer"; }catch(e){ return false; } }
 function cardHtml(L){
  return '<h3 style="margin:0 0 4px;font-size:15px;color:#4a2a8a">💡 '+E(B("Insights","ഇൻസൈറ്റ്"))+'</h3>'+L.slice(0,3).map(row).join("")+
   (L.length>3?'<div class="actions"><button onclick="tcTrInsightAll()">'+E(B("See all","എല്ലാം കാണുക")+" ("+L.length+")")+'</button></div>':'');
 }
 window.tcTrInsightAll=function(){
  var L=[]; try{ L=compute(); }catch(e){}
  var h='<h2>💡 '+E(B("Insights","ഇൻസൈറ്റ്"))+'</h2><p class="muted" style="font-size:12.5px">'+E(B("Found by the app from your own bills and trips. Nothing is sent anywhere.","നിങ്ങളുടെ ബില്ലുകളും ട്രിപ്പുകളും നോക്കി ആപ്പ് തന്നെ കണ്ടെത്തിയത്. ഒന്നും പുറത്തേക്ക് അയയ്ക്കുന്നില്ല."))+'</p>'+
   (L.length?L.map(row).join(""):'<p class="muted">'+E(B("Nothing special right now - keep adding trips and bills.","ഇപ്പോൾ പ്രത്യേകിച്ച് ഒന്നുമില്ല - ട്രിപ്പുകളും ബില്ലുകളും ചേർക്കുന്നത് തുടരുക."))+'</p>')+
   '<div class="actions"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(h);
 };

 function refresh(){
  var c=$("tcTrInsight"); if(!c) return;
  var L=[]; try{ L=compute(); }catch(e){}
  if(!L.length){ c.style.display="none"; return; }
  c.style.display=""; c.innerHTML=cardHtml(L);
 }
 function arrange(){
  var app=$("app"); if(!app||!isOwner()) return;
  var h2=app.querySelector(".card>h2");
  if(!h2||!/Travel Connect Dashboard|ഡാഷ്ബോർഡ്/i.test(h2.textContent)) return;
  var anchor=$("tcLiveCard")||h2, c=$("tcTrInsight");
  if(!c){
   c=document.createElement("div"); c.className="card"; c.id="tcTrInsight";
   c.style.cssText="border:2px solid #8a6fd1;padding:10px 12px;margin:0 0 12px";
   var L=[]; try{ L=compute(); }catch(e){}
   if(!L.length) return;
   c.innerHTML=cardHtml(L);
  }
  if(anchor.nextElementSibling!==c) anchor.parentNode.insertBefore(c,anchor.nextSibling);
 }
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ arrange(); }catch(e){} },140); }
 function start(){
  var app=$("app"); if(!app||!window.MutationObserver) return;
  new MutationObserver(later).observe(app,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 window.tcTrInsightRefresh=refresh;
})();
