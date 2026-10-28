/* Chitty / Kuri book - part of "My Accounts" (tc-perschit.js, loaded by tc-regdocs.js right after tc-persgift.js).
   Owner's request (2026-10-28): record the chitties (kuri) he has joined - what he pays every month, the month he wins ("kuri kitti") and what he got.
   Kerala chitty = a group of N members, each pays an instalment every month, each month one member takes the pot (by auction or lot); in an auction
   chitty the winner gives up a discount which is shared back to the others as dividend, so the instalment a member really pays can be LESS than the
   face instalment - therefore every payment is typed (default = the face instalment).
   This first version is for the MEMBER (subscriber). Running a chitty as the foreman (many members) is not built.
   DATA (phone only / Premium cloud backup / backup file - same rules as tc-pers.js):
     db.persChits    {id,u,ts, nm: name, v: chit value, a: face instalment, n: months, d: date of the FIRST instalment}
     db.persChitPay  {id,u,ts, c: chit id, t:'pay'|'prize', d, a, n: note}     pay = an instalment paid, prize = the pot received
   Next due date = first date + (instalments paid) months (the same day; a 31st becomes the month end). Deleting a chit hides its payments too. */
(function(){
 var P=window.__tcPers;
 if(!P||P.chits) return;
 P.chits=1;
 var B=P.B, E=P.E, KC=P.K.c, KP=P.K.cp, S=P.S, SC=P.SC, $=P.$, mny=P.mny, dmy=P.dmy, oc=P.oc, val=P.val, num=P.num, say=P.say, cap=P.cap;
 function pad(n){ return (n<10?"0":"")+n; }
 function addMonths(d,k){
  var p=d.split("-"), y=+p[0], m=+p[1]-1+k, day=+p[2];
  y+=Math.floor(m/12); m=((m%12)+12)%12;
  var last=new Date(y,m+1,0).getDate();
  return y+"-"+pad(m+1)+"-"+pad(Math.min(day,last));
 }
 function chits(){
  var pays=P.mine(KP);
  return P.mine(KC).map(function(c){
   var my=pays.filter(function(x){ return x.c===c.id; }), paid=0, cnt=0, prize=null;
   my.forEach(function(x){ if(x.t==="prize"){ if(!prize||(x.d||"")>(prize.d||"")) prize=x; } else{ paid+=x.a; cnt++; } });
   var done=cnt>=c.n;
   return {c:c,rows:my,paid:P.r2(paid),cnt:cnt,prize:prize,done:done,next:done?"":addMonths(c.d,cnt)};
  });
 }
 function find(id){ return chits().filter(function(x){ return x.c.id===id; })[0]; }
 P.chitList=chits;

 /* ---------- home card ---------- */
 P.homeCards=(P.homeCards||[]);
 P.homeCards.push(function(){
  var L=chits().filter(function(x){ return !x.done; }), mon=P.today().slice(0,7), due=0, n=0;
  L.forEach(function(x){ if(x.next.slice(0,7)<=mon){ due+=x.c.a; n++; } });
  return '<div class="tpC" onclick="tpGo(\'chits\')" style="cursor:pointer"><b>💵 '+E(B("Chitty / Kuri","ചിട്ടി / കുറി"))+'</b>'+
   '<div class="tpG2"><div><div class="tpM">'+E(B("Running","നടക്കുന്നവ"))+'</div><div class="tpBig">'+L.length+'</div></div><div><div class="tpM">'+E(B("To pay this month","ഈ മാസം അടയ്ക്കാനുള്ളത്"))+'</div><div class="tpBig tpOut">'+mny(due)+'</div></div></div></div>';
 });

 /* ---------- list ---------- */
 SC.chits=function(){
  var L=chits(), t=P.today();
  L.sort(function(a,b){ return (a.done-b.done)||((a.next||"9")<(b.next||"9")?-1:1); });
  $("tpBody").innerHTML=
   '<button class="tpBtn in" style="margin-top:0" onclick="tpCAdd()">➕ '+E(B("New chitty","പുതിയ ചിട്ടി"))+'</button>'+
   (L.length?L.map(function(x){
     var late=!x.done&&x.next<t;
     return '<div class="tpC" '+oc("tpChit",x.c.id)+' style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:18px">'+E(x.c.nm)+'</b><b>'+mny(x.c.a)+'</b></div>'+
      '<div class="tpM">'+E(B("Chit value ","ചിട്ടി തുക "))+mny(x.c.v)+' · '+x.c.n+' '+E(B("months","മാസം"))+'</div>'+
      '<div style="margin-top:6px">'+x.cnt+'/'+x.c.n+' '+E(B("paid","അടച്ചു"))+' · '+mny(x.paid)+'</div>'+
      '<div style="margin-top:4px;font-weight:700;color:'+(x.prize?"#157a3a":"#5b7787")+'">'+(x.prize?'🎉 '+E(B("Got the kuri ","കുറി കിട്ടി "))+mny(x.prize.a):E(B("Kuri not got yet","കുറി കിട്ടിയിട്ടില്ല")))+'</div>'+
      (x.done?'<div class="tpM">✓ '+E(B("Finished","കഴിഞ്ഞു"))+'</div>':'<div style="margin-top:4px;color:'+(late?"#b03a2e":"#12303f")+';font-weight:700">'+E(B("Next: ","അടുത്ത തവണ: "))+E(dmy(x.next))+(late?' ⚠ '+E(B("overdue","കഴിഞ്ഞു")):"")+'</div>')+'</div>';
    }).join(""):'<div class="tpC tpM" style="text-align:center">'+E(B("No chitty added yet","ചിട്ടി ഒന്നും ചേർത്തിട്ടില്ല"))+'</div>')+
   '<button class="tpBtn g" onclick="tpCsv(\'c\')">📤 '+E(B("Export to Excel (CSV)","Excel-ലേക്ക് (CSV)"))+'</button>';
 };
 window.tpChit=function(id){ var x=find(id); if(x) P.go("chit",{id:id,title:x.c.nm}); };

 /* ---------- one chitty ---------- */
 SC.chit=function(prm){
  var x=find(prm.id); if(!x){ P.go("chits"); return; }
  var left=Math.max(x.c.n-x.cnt,0), t=P.today(), late=!x.done&&x.next<t;
  var rows=P.srt(x.rows);
  $("tpBody").innerHTML=
   '<div class="tpC"><div style="display:flex;justify-content:space-between"><b style="font-size:19px">'+E(x.c.nm)+'</b><button class="tpBtn g s" style="margin:0" onclick="tpCEdit(\''+x.c.id+'\')">✎ '+E(B("Edit","മാറ്റുക"))+'</button></div>'+
    '<div class="tpM">'+E(B("Chit value ","ചിട്ടി തുക "))+mny(x.c.v)+' · '+E(B("instalment ","തവണ "))+mny(x.c.a)+' · '+x.c.n+' '+E(B("months","മാസം"))+' · '+E(B("from ","തുടക്കം "))+E(dmy(x.c.d))+'</div>'+
    '<div class="tpG2" style="margin-top:8px"><div><div class="tpM">'+E(B("Paid so far","ഇതുവരെ അടച്ചത്"))+'</div><div class="tpBig tpOut">'+mny(x.paid)+'</div><div class="tpM">'+x.cnt+'/'+x.c.n+'</div></div>'+
    '<div><div class="tpM">'+E(B("Kuri received","കുറി കിട്ടിയത്"))+'</div><div class="tpBig tpIn">'+(x.prize?mny(x.prize.a):"-")+'</div><div class="tpM">'+(x.prize?E(dmy(x.prize.d)):E(B("not yet","ഇല്ല")))+'</div></div></div>'+
    (x.prize?'<div style="margin-top:8px">'+E(B("Received - paid: ","കിട്ടിയത് - അടച്ചത്: "))+'<b>'+mny(x.prize.a-x.paid)+'</b></div>':"")+
    (x.done?'<div style="margin-top:8px"><b>✓ '+E(B("All instalments paid","എല്ലാ തവണയും അടച്ചു"))+'</b></div>':
     '<div style="margin-top:8px">'+E(B("Instalments left: ","ബാക്കി തവണകൾ: "))+'<b>'+left+'</b> (≈ '+mny(left*x.c.a)+' <span class="tpM">'+E(B("full instalment, dividend may reduce it","പൂർണ്ണ തവണ കണക്കിൽ; ഡിവിഡന്റ് കുറയാം"))+'</span>)</div>'+
     '<div style="margin-top:4px;font-weight:700;color:'+(late?"#b03a2e":"#12303f")+'">'+E(B("Next due: ","അടുത്ത തവണ: "))+E(dmy(x.next))+(late?' ⚠':"")+'</div>')+'</div>'+
   '<div class="tpG2"><button class="tpBtn out" onclick="tpCPay(\''+x.c.id+'\')">➕ '+E(B("Instalment paid","തവണ അടച്ചു"))+'</button><button class="tpBtn in" onclick="tpCPrize(\''+x.c.id+'\')">🎉 '+E(B("Got the kuri","കുറി കിട്ടി"))+'</button></div>'+
   '<div class="tpC" style="padding:4px 14px">'+(rows.length?rows.map(function(r){
     return '<div class="tpRow" '+oc("tpCpEdit",r.id)+'><div style="min-width:0"><b>'+E(r.t==="prize"?B("Kuri received","കുറി കിട്ടി"):B("Instalment paid","തവണ അടച്ചു"))+'</b><div class="tpM">'+E(dmy(r.d))+(r.n?" · "+E(r.n):"")+'</div></div><b class="'+(r.t==="prize"?"tpIn":"tpOut")+'">'+mny(r.a)+'</b></div>';
    }).join(""):'<div class="tpM" style="text-align:center;padding:16px 0">'+E(B("Nothing recorded","ഒന്നും ചേർത്തിട്ടില്ല"))+'</div>')+'</div>';
 };

 /* ---------- chitty add / edit ---------- */
 function chitSheet(c){
  P.sheet('<h3>'+E(c?B("Edit chitty","ചിട്ടി മാറ്റുക"):B("New chitty","പുതിയ ചിട്ടി"))+'</h3>'+
   P.fld("tpcN",B("Name of the chitty","ചിട്ടിയുടെ പേര്"),"text",c?c.nm:"",'maxlength="60" placeholder="'+E(B("e.g. KSFE 5 lakh, Raman's kuri","ഉദാ: KSFE 5 ലക്ഷം, രാമന്റെ കുറി"))+'"')+
   P.fld("tpcV",B("Chit value (₹)","ചിട്ടി തുക (₹)"),"number",c?c.v:"",'inputmode="decimal" min="0" step="any"')+
   P.fld("tpcA",B("Monthly instalment (₹)","മാസത്തവണ (₹)"),"number",c?c.a:"",'inputmode="decimal" min="0" step="any"')+
   P.fld("tpcM",B("Number of months","മാസങ്ങൾ"),"number",c?c.n:"",'inputmode="numeric" min="1" max="240" step="1"')+
   P.fld("tpcD",B("Date of the first instalment","ആദ്യ തവണയുടെ തീയതി"),"date",c?c.d:P.today())+
   '<button class="tpBtn" onclick="tpCSave(\''+(c?c.id:"")+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   (c?'<button class="tpBtn r" onclick="tpCDel(\''+c.id+'\')">'+E(B("Delete","ഡിലീറ്റ്"))+'</button>':"")+
   '<button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
 }
 window.tpCAdd=function(){ chitSheet(null); };
 window.tpCEdit=function(id){ var c=P.rec(KC,id); if(c) chitSheet(c); };
 window.tpCSave=function(id){
  var nm=cap(val("tpcN"),60), v=num(val("tpcV")), a=num(val("tpcA")), n=Math.round(num(val("tpcM"))), d=val("tpcD");
  if(!nm){ say(B("Enter the name","പേര് നൽകുക")); return; }
  if(!(a>0)||a>=1e9){ say(B("Enter the monthly instalment","മാസത്തവണ നൽകുക")); return; }
  if(!(n>=1&&n<=240)){ say(B("Enter the number of months","മാസങ്ങൾ നൽകുക")); return; }
  if(!P.okDate(d)){ say(B("Check the date","തീയതി നോക്കുക")); return; }
  if(!(v>0)) v=P.r2(a*n);
  var cid=id;
  if(id){ var c=P.rec(KC,id); if(!c) return; c.nm=nm; c.v=v; c.a=a; c.n=n; c.d=d; P.touch(c); }
  else cid=P.put(KC,{nm:nm,v:v,a:a,n:n,d:d}).id;
  P.closeSheet(); P.go("chit",{id:cid,title:nm}); say(B("Saved","സേവ് ചെയ്തു"));
 };
 window.tpCDel=function(id){
  if(!confirm(B("Delete this chitty with all its payments?","ഈ ചിട്ടിയും അതിലെ എല്ലാ എൻട്രികളും ഡിലീറ്റ് ചെയ്യട്ടേ?"))) return;
  var c=P.rec(KC,id); if(c){ c.del=1; P.touch(c); }
  P.closeSheet(); P.go("chits");
 };

 /* ---------- instalment / kuri ---------- */
 function paySheet(r,cid,t){
  var x=find(r?r.c:cid); if(!x) return; t=r?r.t:t;
  P.sheet('<h3>'+E((r?B("Edit: ","മാറ്റുക: "):"")+x.c.nm+" - "+(t==="prize"?B("Got the kuri","കുറി കിട്ടി"):B("Instalment paid","തവണ അടച്ചു")))+'</h3>'+
   P.fld("tpcpA",t==="prize"?B("Amount received (₹)","കിട്ടിയ തുക (₹)"):B("Amount paid (₹) - after dividend","അടച്ച തുക (₹) - ഡിവിഡന്റ് കുറച്ചത്"),"number",r?r.a:(t==="prize"?x.c.v:x.c.a),'inputmode="decimal" min="0" step="any"')+
   P.fld("tpcpD",B("Date","തീയതി"),"date",r?r.d:P.today())+
   P.fld("tpcpN",B("Note (optional)","കുറിപ്പ് (വേണമെങ്കിൽ)"),"text",r?r.n:"",'maxlength="80"')+
   '<button class="tpBtn" onclick="tpCpSave(\''+(r?r.id:"")+'\',\''+x.c.id+'\',\''+t+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   (r?'<button class="tpBtn r" onclick="tpDel(\''+KP+'\',\''+r.id+'\')">'+E(B("Delete","ഡിലീറ്റ്"))+'</button>':"")+
   '<button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
 }
 window.tpCPay=function(id){ paySheet(null,id,"pay"); };
 window.tpCPrize=function(id){ paySheet(null,id,"prize"); };
 window.tpCpEdit=function(id){ var r=P.rec(KP,id); if(r) paySheet(r); };
 window.tpCpSave=function(id,cid,t){
  var x=find(cid); if(!x) return;
  var a=num(val("tpcpA")), d=val("tpcpD")||P.today(), n=cap(val("tpcpN"),80);
  if(!(a>0)||a>=1e9){ say(B("Enter the amount","തുക നൽകുക")); return; }
  if(!P.okDate(d)){ say(B("Check the date","തീയതി നോക്കുക")); return; }
  var others=x.rows.filter(function(r){ return r.id!==id; });
  if(t==="pay"){
   if(!id&&x.done&&!confirm(B("All "+x.c.n+" instalments are already paid. Add one more?","എല്ലാ "+x.c.n+" തവണയും അടച്ചു കഴിഞ്ഞു. ഒന്നുകൂടി ചേർക്കട്ടേ?"))) return;
   if(others.some(function(r){ return r.t==="pay"&&String(r.d).slice(0,7)===d.slice(0,7); })&&!confirm(B("An instalment of this month is already recorded. Save another?","ഈ മാസത്തെ തവണ നേരത്തേ ചേർത്തിട്ടുണ്ട്. ഒന്നുകൂടി ചേർക്കട്ടേ?"))) return;
  }else if(others.some(function(r){ return r.t==="prize"; })&&!confirm(B("The kuri is already recorded as received. Save another?","കുറി കിട്ടിയതായി നേരത്തേ ചേർത്തിട്ടുണ്ട്. ഒന്നുകൂടി ചേർക്കട്ടേ?"))) return;
  if(id){ var r=P.rec(KP,id); if(!r) return; r.a=a; r.d=d; r.n=n; P.touch(r); }
  else P.put(KP,{c:cid,t:t,d:d,a:a,n:n});
  P.closeSheet(); P.refresh(); say(B("Saved","സേവ് ചെയ്തു"));
 };

 P.CSVS.c=function(){
  var out=[["Chitty","Date","Type","Amount","Note"]];
  chits().forEach(function(x){ P.srt(x.rows).forEach(function(r){ out.push([x.c.nm,r.d,r.t==="prize"?"Kuri received":"Instalment paid",r.a,r.n||""]); }); });
  return out;
 };
})();
