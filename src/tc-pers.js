/* My Accounts - personal book for EVERYONE (tc-pers.js, loaded by tc-regdocs.js; the ceremony-gift ledger is in tc-persgift.js).
   Owner's request (2026-10-28): every user, customers too, should be able to keep PERSONAL accounts:
     1. income / expense with a description          (db.persMoney)
     2. loans given / taken, per person              (db.persLoans)
     3. ceremony cover money (wedding, panappayattu, housewarming ...) given / received with name + address   (db.persGifts, tc-persgift.js)
   STORAGE: inside the app's own saved data (db, written by save()) = ON THE PHONE ONLY, free for everybody.
     Premium accounts: the three lists are part of the automatic Cloud Backup (TC_BK_LISTS, tc-backup.js) - no server change.
     Everyone else: "Backup file" (JSON, can be shared to WhatsApp / Drive) + restore from that file (merge by id), and CSV for Excel.
     A paid cloud backup for customers needs a separate customer-plan step (not built yet).
   Every record: {id, u: mobile of the login that made it (several logins can share one phone - each sees only its own), d: 'YYYY-MM-DD', ts, ...}
     money  : {t:'in'|'out', a, n: description}
     loans  : {ph: mobile (optional, 2026-10-30), t:'g' lent | 'bk' got back | 't' borrowed | 'rp' repaid, p: person, a, n}     balance of a person = lent + repaid - gotBack - borrowed  (+ = he owes me)
     A deleted record stays as {del:1} so that restoring an old backup never brings it back.
   Own full-screen layer #tcPers (history state {tcPers:1}); opened from Menu (all roles) and from the customer home page (a card). */
(function(){
 if(window.__tcPers) return;
 var P=window.__tcPers={};
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var $=function(id){ return document.getElementById(id); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var K={m:"persMoney",l:"persLoans",g:"persGifts",c:"persChits",cp:"persChitPay"};
 var S={open:false,screen:"home",params:{},mon:""}, SC={}, UP={money:"home",loans:"home",person:"loans",backup:"home",gifts:"home",gperson:"gifts",gevents:"gifts",gevent:"gevents",chits:"home",chit:"chits"};
 var TITLE={home:["My Accounts","എന്റെ കണക്കുകൾ"],money:["Income & expense","വരവ് ചെലവ്"],loans:["Loans","കടം"],person:["",""],backup:["Backup & export","ബാക്കപ്പ് / എക്സ്പോർട്ട്"],
  gifts:["Ceremony covers","ചടങ്ങ് കവർ"],chits:["Chitty / Kuri","ചിട്ടി / കുറി"],chit:["",""],gperson:["",""],gevents:["By ceremony","ചടങ്ങ് തിരിച്ച്"],gevent:["",""]};
 P.digits=digits; P.tail=tail; P.cleanPh=cleanPh;
 P.S=S; P.SC=SC; P.UP=UP; P.TITLE=TITLE; P.B=B; P.E=E; P.K=K;

 /* ---------- small helpers ---------- */
 function r2(n){ return Math.round((+n||0)*100)/100; }
 function mny(n){
  n=r2(n);
  if(!Number.isInteger(n)) return (n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
  return (n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN");
 }
 function pad(n){ return (n<10?"0":"")+n; }
 function today(){ var d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
 function dmy(d){ var p=String(d||"").split("-"); return p.length===3?p[2]+"-"+p[1]+"-"+p[0]:String(d||""); }
 function norm(s){ return String(s==null?"":s).replace(/\s+/g," ").trim().toLowerCase(); }
 function cap(s,n){ return String(s==null?"":s).replace(/\s+/g," ").trim().slice(0,n); }
 function digits(s){ return String(s==null?"":s).replace(/\D/g,""); }
 function tail(s){ return digits(s).slice(-10); }   /* +91 98.. and 98.. are the same number */
 function cleanPh(s){ return cap(s,20).replace(/[^\d+ ]/g,"").trim(); }
 function enc(s){ return encodeURIComponent(s).replace(/'/g,"%27"); }
 function oc(fn){ var a=[].slice.call(arguments,1).map(function(x){ return "'"+String(x).replace(/'/g,"%27")+"'"; }).join(","); return 'onclick="'+fn+'('+a+')"'; }
 function me(){ try{ var u=getCurrentUser(); return String((u&&u.mobile)||""); }catch(e){ return ""; } }
 function L(k){ if(typeof db==="undefined") return []; if(!Array.isArray(db[k])) db[k]=[]; return db[k]; }
 function mine(k){ var m=me(); return L(k).filter(function(r){ return r&&!r.del&&String(r.u||"")===m; }); }
 function rec(k,id){ var a=L(k); for(var i=0;i<a.length;i++) if(a[i].id===id) return a[i]; return null; }
 function uid(){ return "p"+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
 function put(k,r){ r.id=r.id||uid(); r.u=me(); r.ts=Date.now(); L(k).push(r); try{ save(); }catch(e){} return r; }
 function touch(r){ r.ts=Date.now(); try{ save(); }catch(e){} }
 function num(v){ var n=parseFloat(String(v==null?"":v).replace(/,/g,"")); return isFinite(n)?r2(n):NaN; }
 function val(id){ var e=$(id); return e?String(e.value||"").trim():""; }
 function okDate(d){ return /^\d{4}-\d{2}-\d{2}$/.test(d||""); }
 function srt(a){ return a.slice().sort(function(x,y){ return (y.d||"")<(x.d||"")?-1:(y.d||"")>(x.d||"")?1:(y.ts||0)-(x.ts||0); }); }
 function uniq(a){ var s={},o=[]; a.forEach(function(x){ x=String(x||"").trim(); var k=norm(x); if(x&&!s[k]){ s[k]=1; o.push(x); } }); return o; }
 function dlist(id,a){ return '<datalist id="'+id+'">'+a.slice(0,60).map(function(x){ return '<option value="'+E(x)+'">'; }).join("")+'</datalist>'; }
 function chip(on,fn,txt){ return '<span class="tpChip'+(on?" on":"")+'" onclick="'+fn+'">'+E(txt)+'</span>'; }
 function fld(id,label,type,value,extra){ return '<label class="tpL">'+E(label)+'<input id="'+id+'" type="'+type+'" value="'+E(value==null?"":value)+'" '+(extra||"")+'></label>'; }
 Object.assign(P,{r2:r2,mny:mny,today:today,dmy:dmy,norm:norm,cap:cap,enc:enc,oc:oc,me:me,L:L,mine:mine,rec:rec,put:put,touch:touch,num:num,val:val,okDate:okDate,srt:srt,uniq:uniq,dlist:dlist,chip:chip,fld:fld,say:say,$:$});

 /* ---------- layer ---------- */
 function css(){
  if($("tpCss")) return;
  var R="@@ *{box-sizing:border-box}@@ h3{margin:0 0 6px;font-size:19px}"+
   "@@ .tpBtn{display:block;width:100%;border:0;border-radius:14px;padding:14px;margin-top:10px;font-size:17px;font-weight:800;color:#fff;background:#0b6b78}"+
   "@@ .tpBtn.g{background:#dce9ef;color:#12303f}@@ .tpBtn.r{background:#fde8e6;color:#a12d2d}@@ .tpBtn.in{background:#1a8f4a}@@ .tpBtn.out{background:#c0392b}@@ .tpBtn.s{width:auto;display:inline-block;padding:9px 12px;font-size:15px;margin:4px 4px 0 0}"+
   "@@ .tpC{background:#fff;border-radius:16px;padding:14px;margin:10px 0;box-shadow:0 2px 8px #0002}"+
   "@@ .tpL{display:block;font-size:13px;color:#4c6676;margin-top:10px;font-weight:700}"+
   "@@ input,@@ select{display:block;width:100%;margin-top:4px;padding:12px;font-size:17px;border:2px solid #b7cbd6;border-radius:10px;background:#fff;color:#12303f}"+
   "@@ .tpRow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid #e3eef3;font-size:16px;cursor:pointer}"+
   "@@ .tpM{color:#5b7787;font-size:13px}@@ .tpBig{font-size:24px;font-weight:900}"+
   "@@ .tpChip{display:inline-block;border:2px solid #b7cbd6;border-radius:999px;padding:8px 13px;margin:4px 6px 0 0;font-size:15px;font-weight:700;background:#fff;color:#12303f}@@ .tpChip.on{background:#0b6b78;border-color:#0b6b78;color:#fff}"+
   "@@ .tpG2{display:grid;grid-template-columns:1fr 1fr;gap:8px}@@ .tpIn{color:#157a3a}@@ .tpOut{color:#b03a2e}"+
   "@@ .tpNote{background:#fdf0d4;border-radius:12px;padding:10px 12px;margin:10px 0;font-size:14px;color:#6b4a00}@@ .tpOkN{background:#d9f2e1;color:#157a3a}";
  var s=document.createElement("style"); s.id="tpCss";
  s.textContent="#tcPers{position:fixed;inset:0;z-index:72;background:#eef3f7;overflow:auto;-webkit-overflow-scrolling:touch;color:#12303f}"+
   "#tcPers .tpH{position:sticky;top:0;z-index:5;background:#0b6b78;color:#fff;padding:10px 12px;display:flex;align-items:center;gap:10px}"+
   "#tcPers .tpH b{flex:1;font-size:18px}#tcPers .tpH button{background:#ffffff26;color:#fff;border:0;border-radius:10px;padding:9px 13px;font-size:16px}"+
   "#tcPers .tpB{padding:12px 12px 90px;max-width:640px;margin:0 auto}"+
   "#tpSheet{position:fixed;inset:0;z-index:76;background:#0008;display:flex;align-items:flex-end;justify-content:center;color:#12303f}"+
   "#tpSheet>div{background:#fff;width:100%;max-width:640px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:16px 16px 28px}"+
   R.replace(/@@/g,"#tcPers")+R.replace(/@@/g,"#tpSheet");
  document.head.appendChild(s);
 }
 function build(){
  css();
  var d=document.createElement("div"); d.id="tcPers"; d.className="hidden"; d.style.display="none";
  d.innerHTML='<div class="tpH"><button id="tpBackB" onclick="tpBack()">←</button><b id="tpTitle"></b></div><div class="tpB" id="tpBody"></div>';
  document.body.appendChild(d);
 }
 function sheet(html){
  closeSheet();
  var d=document.createElement("div"); d.id="tpSheet"; d.innerHTML="<div>"+html+"</div>";
  d.addEventListener("click",function(ev){ if(ev.target===d) closeSheet(); });
  document.body.appendChild(d);
 }
 function closeSheet(){ var d=$("tpSheet"); if(d) d.remove(); }
 window.tpCloseSheet=closeSheet;
 function title(){
  var t=TITLE[S.screen]||["",""], s=B(t[0],t[1]);
  if(S.screen==="person") s=S.params.name||"";
  if(S.screen==="gperson"||S.screen==="gevent"||S.screen==="chit") s=S.params.title||"";
  return s;
 }
 function render(){
  if(!$("tcPers")) build(); closeSheet();
  var root=$("tcPers"); root.classList.remove("hidden"); root.style.display="";
  $("tpTitle").textContent=title(); $("tpBackB").textContent=S.screen==="home"?"✕":"←";
  $("tpBody").innerHTML=""; root.scrollTop=0;
  try{ (SC[S.screen]||SC.home)(S.params); }catch(e){ $("tpBody").innerHTML='<div class="tpC">'+E(B("Could not open this screen","സ്ക്രീൻ തുറക്കാൻ കഴിഞ്ഞില്ല"))+'</div>'; if(window.console) console.error("tc-pers",e); }
 }
 function go(name,params){ S.screen=name; S.params=params||{}; render(); }
 function refresh(){ var t=$("tpBody"), root=$("tcPers"), y=root?root.scrollTop:0; render(); if(root) root.scrollTop=y; }
 P.go=go; P.refresh=refresh; P.sheet=sheet; P.closeSheet=closeSheet;
 function hide(){ var d=$("tcPers"); if(d){ d.classList.add("hidden"); d.style.display="none"; } closeSheet(); document.body.style.overflow=""; }
 function openPers(screen,params){
  if(!$("tcPers")) build();
  if(!S.open){ S.open=true; document.body.style.overflow="hidden"; try{ history.pushState({tcPers:1},"",location.href); }catch(e){} }
  go(screen||"home",params);
 }
 function closePers(){
  if(!S.open) return;
  S.open=false; hide();
  try{ if(history.state&&history.state.tcPers) history.back(); }catch(e){}
 }
 window.tcPersOpen=function(screen,params){
  var m=document.querySelector("#modal");
  if(m&&!m.classList.contains("hidden")){ try{ closeModal(); }catch(e){} setTimeout(function(){ openPers(screen,params); },420); }
  else openPers(screen,params);
 };
 window.tpBack=function(){
  if(S.screen==="home") closePers();
  else go(UP[S.screen]||"home");
 };
 window.addEventListener("popstate",function(){
  if(!S.open) return;
  if(history.state&&history.state.tcPers) return;
  if(S.screen!=="home"){ try{ history.pushState({tcPers:1},"",location.href); }catch(e){} go(UP[S.screen]||"home"); }
  else{ S.open=false; hide(); }
 });
 window.tpGo=function(name){ go(name); };

 /* ---------- home ---------- */
 function monthKey(d){ return String(d||"").slice(0,7); }
 SC.home=function(){
  var mon=today().slice(0,7), mi=0, mo=0;
  mine(K.m).forEach(function(r){ if(monthKey(r.d)===mon){ if(r.t==="in") mi+=r.a; else mo+=r.a; } });
  var pe=persons(), owedMe=0, iOwe=0;
  pe.forEach(function(p){ if(p.bal>0) owedMe+=p.bal; else if(p.bal<0) iOwe-=p.bal; });
  var gv=0,gt=0,gn=0; mine(K.g).forEach(function(r){ gn++; if(r.w==="gave") gv+=r.a; else gt+=r.a; });
  var cloud=(typeof tcBkEligible==="function")&&tcBkEligible(), n=mine(K.m).length+mine(K.l).length+gn;
  var last=(typeof db!=="undefined"&&db.settings&&db.settings.persBkAt)||0, old=!last||(Date.now()-last)>30*86400000;
  var note=cloud?'<div class="tpNote tpOkN">☁ '+E(B("Your Premium Cloud Backup keeps these accounts safe automatically.","നിങ്ങളുടെ Premium ക്ലൗഡ് ബാക്കപ്പ് ഈ കണക്കുകൾ തനിയെ സുരക്ഷിതമായി സൂക്ഷിക്കും."))+'</div>':
   '<div class="tpNote">📱 '+E(B("These accounts are stored only on THIS phone (free). If the phone is lost or the app data is cleared, they are lost - take a backup file now and then.","ഈ കണക്കുകൾ ഈ ഫോണിൽ മാത്രമാണ് സൂക്ഷിക്കുന്നത് (സൗജന്യം). ഫോൺ നഷ്ടപ്പെട്ടാലോ ആപ്പ് ഡാറ്റ ക്ലിയർ ചെയ്താലോ പോകും - ഇടയ്ക്കിടെ ബാക്കപ്പ് ഫയൽ എടുത്തുവയ്ക്കൂ."))+'</div>'+
   (n&&old?'<div class="tpNote" style="background:#fde8e6;color:#a12d2d">'+E(B("No backup file in the last 30 days.","30 ദിവസമായി ബാക്കപ്പ് ഫയൽ എടുത്തിട്ടില്ല."))+'</div>':"");
  $("tpBody").innerHTML=note+
   '<div class="tpC" onclick="tpGo(\'money\')" style="cursor:pointer"><b>💰 '+E(B("Income & expense","വരവ് ചെലവ്"))+'</b><div class="tpM">'+E(B("This month","ഈ മാസം"))+'</div>'+
    '<div class="tpG2"><div><div class="tpM">'+E(B("Income","വരവ്"))+'</div><div class="tpBig tpIn">'+mny(mi)+'</div></div><div><div class="tpM">'+E(B("Expense","ചെലവ്"))+'</div><div class="tpBig tpOut">'+mny(mo)+'</div></div></div></div>'+
   '<div class="tpC" onclick="tpGo(\'loans\')" style="cursor:pointer"><b>🤝 '+E(B("Loans","കടം"))+'</b>'+
    '<div class="tpG2"><div><div class="tpM">'+E(B("To get","എനിക്ക് കിട്ടാനുള്ളത്"))+'</div><div class="tpBig tpIn">'+mny(owedMe)+'</div></div><div><div class="tpM">'+E(B("To give","ഞാൻ കൊടുക്കാനുള്ളത്"))+'</div><div class="tpBig tpOut">'+mny(iOwe)+'</div></div></div></div>'+
   '<div class="tpC" onclick="tpGo(\'gifts\')" style="cursor:pointer"><b>🎁 '+E(B("Ceremony covers (wedding, panappayattu, housewarming)","ചടങ്ങ് കവർ (വിവാഹം, പണപ്പയറ്റ്, ഗൃഹപ്രവേശം)"))+'</b>'+
    '<div class="tpG2"><div><div class="tpM">'+E(B("I gave","ഞാൻ കൊടുത്തത്"))+'</div><div class="tpBig">'+mny(gv)+'</div></div><div><div class="tpM">'+E(B("I received","എനിക്ക് കിട്ടിയത്"))+'</div><div class="tpBig">'+mny(gt)+'</div></div></div></div>'+
   (P.homeCards||[]).map(function(f){ try{ return f(); }catch(e){ return ""; } }).join("")+
   '<button class="tpBtn g" onclick="tpGo(\'backup\')">💾 '+E(B("Backup file / export","ബാക്കപ്പ് ഫയൽ / എക്സ്പോർട്ട്"))+'</button>';
 };

 /* ---------- income / expense ---------- */
 function monthLabel(m){
  var p=m.split("-"), ml=["ജനുവരി","ഫെബ്രുവരി","മാർച്ച്","ഏപ്രിൽ","മേയ്","ജൂൺ","ജൂലൈ","ഓഗസ്റ്റ്","സെപ്റ്റംബർ","ഒക്ടോബർ","നവംബർ","ഡിസംബർ"], en=["January","February","March","April","May","June","July","August","September","October","November","December"];
  return B(en[+p[1]-1],ml[+p[1]-1])+" "+p[0];
 }
 window.tpMon=function(dl){
  var p=(S.mon||today().slice(0,7)).split("-"), y=+p[0], m=+p[1]+dl;
  while(m<1){ m+=12; y--; } while(m>12){ m-=12; y++; }
  S.mon=y+"-"+pad(m); refresh();
 };
 /* the book is DAY-wise (owner 2026-10-28: 'every day's date has to be put and written'): Day view = one chosen day, Month view = the month grouped by day */
 function addDays(d,n){ var x=new Date(d+"T12:00:00"); x.setDate(x.getDate()+n); return x.getFullYear()+"-"+pad(x.getMonth()+1)+"-"+pad(x.getDate()); }
 window.tpDayMove=function(n){ S.day=addDays(S.day||today(),n); S.mon=S.day.slice(0,7); refresh(); };
 window.tpDayPick=function(v){ if(okDate(v)){ S.day=v; S.mon=v.slice(0,7); refresh(); } };
 window.tpMMode=function(m){ S.mm=m; if(m==="d"&&S.mon&&monthKey(S.day||"")!==S.mon) S.day=(S.mon===today().slice(0,7)?today():S.mon+"-01"); refresh(); };
 window.tpDayOpen=function(d){ S.day=d; S.mm="d"; refresh(); };
 function sums(L1){ var i=0,o=0; L1.forEach(function(r){ if(r.t==="in") i+=r.a; else o+=r.a; }); return [i,o]; }
 function mrow(r){
  return '<div class="tpRow" '+oc("tpMEdit",r.id)+'><div style="min-width:0"><b>'+E(r.n||(r.t==="in"?B("Income","വരവ്"):B("Expense","ചെലവ്")))+'</b></div><b class="'+(r.t==="in"?"tpIn":"tpOut")+'">'+(r.t==="in"?"+":"-")+mny(r.a)+'</b></div>';
 }
 SC.money=function(){
  if(!S.mm) S.mm="d"; if(!S.day) S.day=today();
  var mon=S.mm==="d"?S.day.slice(0,7):(S.mon||(S.mon=today().slice(0,7))), all=mine(K.m), LM=all.filter(function(r){ return monthKey(r.d)===mon; }), m=sums(LM), h;
  var modes='<div>'+chip(S.mm==="d","tpMMode('d')",B("Day","ദിവസം"))+chip(S.mm==="m","tpMMode('m')",B("Month","മാസം"))+'</div>';
  if(S.mm==="d"){
   var LD=srt(all.filter(function(r){ return r.d===S.day; })), dd=sums(LD);
   h='<div class="tpC" style="display:flex;align-items:center;gap:8px"><button class="tpBtn g s" style="margin:0" onclick="tpDayMove(-1)">◀</button>'+
    '<input type="date" value="'+E(S.day)+'" onchange="tpDayPick(this.value)" style="margin:0;text-align:center;font-weight:800"><button class="tpBtn g s" style="margin:0" onclick="tpDayMove(1)">▶</button></div>'+
    (S.day!==today()?'<button class="tpBtn g s" style="margin:0 0 6px" onclick="tpDayPick(\''+today()+'\')">'+E(B("Today","ഇന്ന്"))+'</button>':"")+
    '<div class="tpC"><div class="tpG2"><div><div class="tpM">'+E(B("Income","വരവ്"))+'</div><div class="tpBig tpIn">'+mny(dd[0])+'</div></div><div><div class="tpM">'+E(B("Expense","ചെലവ്"))+'</div><div class="tpBig tpOut">'+mny(dd[1])+'</div></div></div>'+
    '<div class="tpM" style="margin-top:6px">'+E(B("Balance of the day","ദിവസത്തെ ബാക്കി"))+': <b>'+mny(dd[0]-dd[1])+'</b></div></div>'+
    '<div class="tpG2"><button class="tpBtn in" onclick="tpMAdd(\'in\')">➕ '+E(B("Income","വരവ്"))+'</button><button class="tpBtn out" onclick="tpMAdd(\'out\')">➕ '+E(B("Expense","ചെലവ്"))+'</button></div>'+
    '<div class="tpC" style="padding:4px 14px">'+(LD.length?LD.map(mrow).join(""):'<div class="tpM" style="text-align:center;padding:16px 0">'+E(B("Nothing on this day","ഈ ദിവസം ഒന്നുമില്ല"))+'</div>')+'</div>'+
    '<div class="tpM" style="text-align:center">'+E(monthLabel(mon))+': '+E(B("income ","വരവ് "))+mny(m[0])+' · '+E(B("expense ","ചെലവ് "))+mny(m[1])+'</div>';
  }else{
   var days={}; LM.forEach(function(r){ (days[r.d]=days[r.d]||[]).push(r); });
   var keys=Object.keys(days).sort().reverse();
   h='<div class="tpC" style="display:flex;align-items:center;justify-content:space-between"><button class="tpBtn g s" onclick="tpMon(-1)">◀</button><b>'+E(monthLabel(mon))+'</b><button class="tpBtn g s" onclick="tpMon(1)">▶</button></div>'+
    '<div class="tpC"><div class="tpG2"><div><div class="tpM">'+E(B("Income","വരവ്"))+'</div><div class="tpBig tpIn">'+mny(m[0])+'</div></div><div><div class="tpM">'+E(B("Expense","ചെലവ്"))+'</div><div class="tpBig tpOut">'+mny(m[1])+'</div></div></div>'+
    '<div class="tpM" style="margin-top:6px">'+E(B("Balance","ബാക്കി"))+': <b>'+mny(m[0]-m[1])+'</b></div></div>'+
    (keys.length?keys.map(function(d){
      var ds=sums(days[d]);
      return '<div class="tpC" style="padding:6px 14px"><div class="tpRow" style="border-bottom:2px solid #dce9ef" '+oc("tpDayOpen",d)+'><b>'+E(dmy(d))+'</b><span class="tpM"><span class="tpIn">+'+mny(ds[0])+'</span> · <span class="tpOut">-'+mny(ds[1])+'</span> ›</span></div>'+srt(days[d]).map(mrow).join("")+'</div>';
     }).join(""):'<div class="tpC tpM" style="text-align:center">'+E(B("Nothing this month","ഈ മാസം ഒന്നുമില്ല"))+'</div>');
  }
  $("tpBody").innerHTML=modes+h;
 };
 function moneySheet(r,t){
  t=r?r.t:t; var d=r?r.d:(S.mm==="m"?(monthKey(today())===(S.mon||monthKey(today()))?today():(S.mon+"-01")):(S.day||today()));
  sheet('<h3>'+E((r?B("Edit: ","മാറ്റുക: "):"")+(t==="in"?B("Income","വരവ്"):B("Expense","ചെലവ്")))+'</h3>'+
   fld("tpA",B("Amount (₹)","തുക (₹)"),"number",r?r.a:"",'inputmode="decimal" min="0" step="any"')+
   fld("tpN",B("Description","വിവരണം"),"text",r?r.n:"",'maxlength="80" list="tpNotes" placeholder="'+E(B("e.g. salary, petrol, groceries","ഉദാ: ശമ്പളം, പെട്രോൾ, പലചരക്ക്"))+'"')+dlist("tpNotes",uniq(mine(K.m).filter(function(x){ return x.t===t; }).map(function(x){ return x.n; })))+
   fld("tpD",B("Date","തീയതി"),"date",d)+
   '<button class="tpBtn" onclick="tpMSave(\''+(r?r.id:"")+'\',\''+t+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   (r?'<button class="tpBtn r" onclick="tpDel(\''+K.m+'\',\''+r.id+'\')">'+E(B("Delete","ഡിലീറ്റ്"))+'</button>':"")+
   '<button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
  setTimeout(function(){ var e=$("tpA"); if(e&&!r) e.focus(); },60);
 }
 window.tpMAdd=function(t){ moneySheet(null,t); };
 window.tpMEdit=function(id){ var r=rec(K.m,id); if(r) moneySheet(r); };
 window.tpMSave=function(id,t){
  var a=num(val("tpA")), d=val("tpD")||today(), n=cap(val("tpN"),80);
  if(!(a>0)||a>=1e9){ say(B("Enter the amount","തുക നൽകുക")); return; }
  if(!okDate(d)){ say(B("Check the date","തീയതി നോക്കുക")); return; }
  if(id){ var r=rec(K.m,id); if(!r) return; r.a=a; r.d=d; r.n=n; touch(r); }
  else put(K.m,{d:d,t:t,a:a,n:n});
  S.mon=d.slice(0,7); if(S.mm!=="m") S.day=d; closeSheet(); refresh(); say(B("Saved","സേവ് ചെയ്തു"));
 };
 window.tpDel=function(k,id){
  if(!confirm(B("Delete this entry?","ഈ എൻട്രി ഡിലീറ്റ് ചെയ്യട്ടേ?"))) return;
  var r=rec(k,id); if(r){ r.del=1; touch(r); }
  closeSheet(); refresh();
 };

 /* ---------- loans ---------- */
 var SIGN={g:1,rp:1,bk:-1,t:-1};
 var LNAME={g:["Lent","കടം കൊടുത്തു"],bk:["Got back","തിരിച്ചു കിട്ടി"],t:["Borrowed","കടം വാങ്ങി"],rp:["Repaid","തിരിച്ചു കൊടുത്തു"]};
 function persons(){
  var m={};
  mine(K.l).forEach(function(r){
   var k=norm(r.p); if(!k||!SIGN[r.t]) return;
   var o=m[k]||(m[k]={k:k,name:r.p,ph:"",bal:0,last:"",n:0});
   o.bal+=SIGN[r.t]*r.a; o.n++; if((r.d||"")>=o.last){ o.last=r.d||""; o.name=r.p; if(r.ph) o.ph=r.ph; } else if(!o.ph&&r.ph) o.ph=r.ph;
  });
  return Object.keys(m).map(function(k){ var o=m[k]; o.bal=r2(o.bal); if(Math.abs(o.bal)<0.005) o.bal=0; return o; });
 }
 function phOf(k){ var o=persons().filter(function(x){ return x.k===k; })[0]; return o?o.ph:""; }
 function balOf(name,skipId){
  var k=norm(name), b=0;
  mine(K.l).forEach(function(r){ if(norm(r.p)===k&&r.id!==skipId&&SIGN[r.t]) b+=SIGN[r.t]*r.a; });
  return r2(b);
 }
 P.persons=persons;
 var LQ="";
 function loanRows(){
  var q=norm(LQ), qd=/^[\d\s+\-]+$/.test(LQ)?digits(LQ):"", all=persons(), pe=all.filter(function(p){ return !q||norm(p.name).indexOf(q)>=0||(qd.length>=3&&digits(p.ph).indexOf(qd)>=0); });
  pe.sort(function(a,b){ return (a.bal===0)-(b.bal===0)||Math.abs(b.bal)-Math.abs(a.bal); });
  return '<div class="tpC" style="padding:4px 14px">'+(pe.length?pe.map(function(p){
     var t=p.bal>0?B("will give me","എനിക്ക് തരാനുണ്ട്"):p.bal<0?B("I must give","ഞാൻ കൊടുക്കാനുണ്ട്"):B("settled","തീർന്നു");
     return '<div class="tpRow" '+oc("tpPerson",enc(p.name))+(p.bal===0?' style="opacity:.55"':"")+'><div style="min-width:0"><b>'+E(p.name)+'</b><div class="tpM">'+E(t)+(p.last?" · "+E(dmy(p.last)):"")+(p.ph?" · "+E(p.ph):"")+'</div></div><b class="'+(p.bal>0?"tpIn":p.bal<0?"tpOut":"")+'">'+(p.bal===0?"✓":mny(Math.abs(p.bal)))+'</b></div>';
    }).join(""):'<div class="tpM" style="text-align:center;padding:16px 0">'+E(q?B("No such person","ഈ പേരിൽ ആരുമില്ല"):B("No loans recorded","കടം ഒന്നും ചേർത്തിട്ടില്ല"))+'</div>')+'</div>';
 }
 window.tplSearch=function(v){ LQ=v||""; var r=$("tplRows"); if(r) r.innerHTML=loanRows(); };
 SC.loans=function(){
  var pe=persons(), owedMe=0, iOwe=0;
  pe.forEach(function(p){ if(p.bal>0) owedMe+=p.bal; else if(p.bal<0) iOwe-=p.bal; });
  $("tpBody").innerHTML=
   '<div class="tpC"><div class="tpG2"><div><div class="tpM">'+E(B("I will get","എനിക്ക് കിട്ടാനുള്ളത്"))+'</div><div class="tpBig tpIn">'+mny(owedMe)+'</div></div><div><div class="tpM">'+E(B("I must give","ഞാൻ കൊടുക്കാനുള്ളത്"))+'</div><div class="tpBig tpOut">'+mny(iOwe)+'</div></div></div></div>'+
   '<div class="tpG2"><button class="tpBtn in" onclick="tpLAdd(\'g\')">➕ '+E(B("Lent money","കടം കൊടുത്തു"))+'</button><button class="tpBtn out" onclick="tpLAdd(\'t\')">➕ '+E(B("Borrowed","കടം വാങ്ങി"))+'</button></div>'+
   (pe.length?'<input id="tplQ" placeholder="🔍 '+E(B("Search name / phone","പേര് / ഫോൺ തിരയുക"))+'" value="'+E(LQ)+'" oninput="tplSearch(this.value)" style="margin-top:12px">':"")+
   '<div id="tplRows">'+loanRows()+'</div>';
 };
 window.tpPerson=function(e){ var n=decodeURIComponent(e); go("person",{name:n,key:norm(n)}); };
 SC.person=function(p){
  var name=p.name, k=p.key, rows=srt(mine(K.l).filter(function(r){ return norm(r.p)===k; })), bal=balOf(name);
  var msg=bal>0?B("He/she must give you","ഇവർ നിങ്ങൾക്ക് തരാനുള്ളത്"):bal<0?B("You must give","നിങ്ങൾ കൊടുക്കാനുള്ളത്"):B("Account settled","കണക്ക് തീർന്നു");
  $("tpBody").innerHTML=
   '<div class="tpC" style="text-align:center"><div class="tpM">'+E(msg)+'</div><div class="tpBig '+(bal>0?"tpIn":bal<0?"tpOut":"")+'">'+(bal===0?"✓":mny(Math.abs(bal)))+'</div>'+(phOf(k)?'<div class="tpM" style="margin-top:6px">📞 <a href="tel:'+E((/^\s*\+/.test(phOf(k))?"+":"")+digits(phOf(k)))+'">'+E(phOf(k))+'</a></div>':"")+'</div>'+
   (bal>0?'<button class="tpBtn in" onclick="tpLAdd(\'bk\',\''+enc(name)+'\')">✔ '+E(B("Got money back","തിരിച്ചു കിട്ടി"))+'</button>':"")+
   (bal<0?'<button class="tpBtn out" onclick="tpLAdd(\'rp\',\''+enc(name)+'\')">✔ '+E(B("Paid back","തിരിച്ചു കൊടുത്തു"))+'</button>':"")+
   '<div class="tpG2"><button class="tpBtn g" onclick="tpLAdd(\'g\',\''+enc(name)+'\')">➕ '+E(B("Lent more","വീണ്ടും കൊടുത്തു"))+'</button><button class="tpBtn g" onclick="tpLAdd(\'t\',\''+enc(name)+'\')">➕ '+E(B("Borrowed more","വീണ്ടും വാങ്ങി"))+'</button></div>'+
   '<div class="tpC" style="padding:4px 14px">'+rows.map(function(r){
     var pos=SIGN[r.t]>0;
     return '<div class="tpRow" '+oc("tpLEdit",r.id)+'><div style="min-width:0"><b>'+E(B(LNAME[r.t][0],LNAME[r.t][1]))+'</b><div class="tpM">'+E(dmy(r.d))+(r.n?" · "+E(r.n):"")+'</div></div><b>'+mny(r.a)+'</b></div>';
    }).join("")+'</div>';
 };
 function loanSheet(r,t,name){
  t=r?r.t:t; var bal=name?balOf(name):0, ph0=r?(r.ph||""):(name?phOf(norm(name)):""), pre=r?r.a:((t==="bk"&&bal>0)?bal:(t==="rp"&&bal<0)?-bal:"");
  sheet('<h3>'+E((r?B("Edit: ","മാറ്റുക: "):"")+B(LNAME[t][0],LNAME[t][1]))+'</h3>'+
   fld("tpP",B("Person's name","ആളുടെ പേര്"),"text",r?r.p:(name||""),'maxlength="60" list="tpPpl" autocomplete="off" onchange="tpLFillPh()"')+dlist("tpPpl",uniq(mine(K.l).map(function(x){ return x.p; })))+
   fld("tpPh",B("Mobile (optional)","മൊബൈൽ നമ്പർ (വേണമെങ്കിൽ)"),"tel",ph0,'inputmode="tel" maxlength="20" autocomplete="off" oninput="tpLByPh()"')+
   fld("tpA",B("Amount (₹)","തുക (₹)"),"number",pre,'inputmode="decimal" min="0" step="any"')+
   fld("tpD",B("Date","തീയതി"),"date",r?r.d:today())+
   fld("tpN",B("Note (optional)","കുറിപ്പ് (വേണമെങ്കിൽ)"),"text",r?r.n:"",'maxlength="80"')+
   '<button class="tpBtn" onclick="tpLSave(\''+(r?r.id:"")+'\',\''+t+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   (r?'<button class="tpBtn r" onclick="tpDel(\''+K.l+'\',\''+r.id+'\')">'+E(B("Delete","ഡിലീറ്റ്"))+'</button>':"")+
   '<button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
 }
 window.tpLFillPh=function(){   /* a known name -> fill the number */
  var f=$("tpPh"); if(!f||f.value.trim()) return; var x=phOf(norm(val("tpP"))); if(x) f.value=x;
 };
 window.tpLByPh=function(){   /* a known number (10 digits) -> fill the name, only while the name is empty */
  var n=$("tpP"), f=$("tpPh"); if(!n||!f||n.value.trim()) return;
  var t=tail(f.value); if(t.length<10) return;
  var x=persons().filter(function(o){ return tail(o.ph)===t; })[0]; if(x) n.value=x.name;
 };
 window.tpLAdd=function(t,e){ loanSheet(null,t,e?decodeURIComponent(e):""); };
 window.tpLEdit=function(id){ var r=rec(K.l,id); if(r) loanSheet(r); };
 window.tpLSave=function(id,t){
  var p=cap(val("tpP"),60), ph=cleanPh(val("tpPh")), a=num(val("tpA")), d=val("tpD")||today(), n=cap(val("tpN"),80);
  if(!p){ say(B("Enter the name","പേര് നൽകുക")); return; }
  if(ph&&digits(ph).length<7){ say(B("Check the mobile number","മൊബൈൽ നമ്പർ നോക്കുക")); return; }
  if(!(a>0)||a>=1e9){ say(B("Enter the amount","തുക നൽകുക")); return; }
  if(!okDate(d)){ say(B("Check the date","തീയതി നോക്കുക")); return; }
  var bal=balOf(p,id);
  if(t==="bk"&&a>Math.max(bal,0)+0.005&&!confirm(B("He/she owes you only "+mny(Math.max(bal,0))+". Save "+mny(a)+" anyway?","ഇവർ തരാനുള്ളത് "+mny(Math.max(bal,0))+" മാത്രമാണ്. എന്നാലും "+mny(a)+" സേവ് ചെയ്യട്ടേ?"))) return;
  if(t==="rp"&&a>Math.max(-bal,0)+0.005&&!confirm(B("You owe only "+mny(Math.max(-bal,0))+". Save "+mny(a)+" anyway?","നിങ്ങൾ കൊടുക്കാനുള്ളത് "+mny(Math.max(-bal,0))+" മാത്രമാണ്. എന്നാലും "+mny(a)+" സേവ് ചെയ്യട്ടേ?"))) return;
  if(id){ var r=rec(K.l,id); if(!r) return; r.p=p; r.ph=ph; r.a=a; r.d=d; r.n=n; touch(r); }
  else put(K.l,{d:d,t:t,p:p,ph:ph,a:a,n:n});
  closeSheet();
  if(S.screen==="person"||S.screen==="loans") go("person",{name:p,key:norm(p)}); else refresh();
  say(B("Saved","സേവ് ചെയ്തു"));
 };

 /* ---------- backup file / restore / CSV ---------- */
 function stamp(){ var d=new Date(); return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate()); }
 function dl(name,mime,text){
  var blob=new Blob([text],{type:mime}), done=false;
  function plain(){
   var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; a.style.display="none"; document.body.appendChild(a); a.click();
   setTimeout(function(){ try{ URL.revokeObjectURL(a.href); a.remove(); }catch(e){} },4000);
  }
  try{
   var f=new File([blob],name,{type:mime});
   if(navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})){
    navigator.share({files:[f],title:name}).catch(function(e){ if(!e||e.name!=="AbortError") plain(); });
    return;
   }
  }catch(e){}
  plain();
 }
 P.dl=dl;
 function csvCell(v){ v=String(v==null?"":v); return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
 function csv(rows){ return "﻿"+rows.map(function(r){ return r.map(csvCell).join(","); }).join("\r\n")+"\r\n"; }
 P.csv=csv;
 var CSVS={
  m:function(){ return [["Date","Type","Amount","Description"]].concat(srt(mine(K.m)).map(function(r){ return [r.d,r.t==="in"?"Income":"Expense",r.a,r.n||""]; })); },
  l:function(){ return [["Date","Person","Type","Amount","Note","Mobile"]].concat(srt(mine(K.l)).map(function(r){ return [r.d,r.p,LNAME[r.t]?LNAME[r.t][0]:r.t,r.a,r.n||"",r.ph||""]; })); }
 };
 P.CSVS=CSVS;
 window.tpCsv=function(w){ var f=CSVS[w]; if(!f) return; dl({m:"income-expense",l:"loans",g:"ceremony-covers",c:"chitty"}[w]+"-"+stamp()+".csv","text/csv",csv(f())); };
 window.tpBkFile=function(){
  var o={app:"travelconnect-personal",v:1,at:new Date().toISOString(),mobile:me()};
  Object.keys(K).forEach(function(c){ o[K[c]]=mine(K[c]); });
  dl("my-accounts-"+stamp()+".json","application/json",JSON.stringify(o));
  try{ db.settings=db.settings||{}; db.settings.persBkAt=Date.now(); save(); }catch(e){}
  say(B("Backup file ready - save it in WhatsApp / Drive","ബാക്കപ്പ് ഫയൽ തയ്യാർ - WhatsApp / Drive-ൽ സൂക്ഷിക്കൂ"));
 };
 window.tpRestoreFile=function(inp){
  var f=inp&&inp.files&&inp.files[0]; if(!f) return;
  var rd=new FileReader();
  rd.onload=function(){
   try{
    var o=JSON.parse(String(rd.result||"")), add=0;
    if(!o||o.app!=="travelconnect-personal") throw new Error("bad");
    Object.keys(K).forEach(function(c){
     var key=K[c], src=Array.isArray(o[key])?o[key]:[], have={};
     L(key).forEach(function(r){ have[r.id]=1; });
     src.forEach(function(r){
      if(!r||typeof r.id!=="string"||have[r.id]||r.del||!(r.a>0)) return;
      r.u=me(); have[r.id]=1; L(key).push(r); add++;
     });
    });
    try{ save(); }catch(e){}
    say(B(add+" entries added","ചേർത്തത്: "+add+" എൻട്രികൾ")); refresh();
   }catch(e){ say(B("This is not a valid backup file","ഇത് ശരിയായ ബാക്കപ്പ് ഫയൽ അല്ല")); }
   inp.value="";
  };
  rd.readAsText(f);
 };
 /* Premium: the Cloud Backup entry is hidden from the Menu while a shop is open (tc-menu.js), so My Accounts has its own way in */
 window.tpCloudRestore=function(){
  closePers();
  setTimeout(function(){ try{ if(typeof tcOpenBackupPage==="function") tcOpenBackupPage(); }catch(e){} },450);
 };
 SC.backup=function(){
  var cloud=(typeof tcBkEligible==="function")&&tcBkEligible(), last=(db.settings&&db.settings.persBkAt)||0;
  $("tpBody").innerHTML=
   (cloud?'<div class="tpNote tpOkN">☁ '+E(B("Premium Cloud Backup is ON - these accounts are included automatically. A backup file is still a good extra copy.","Premium ക്ലൗഡ് ബാക്കപ്പ് ഓണാണ് - ഈ കണക്കുകൾ തനിയെ ഉൾപ്പെടും. എന്നാലും ഒരു ഫയൽ കോപ്പി കൂടി എടുക്കുന്നത് നല്ലതാണ്."))+'</div>':
    '<div class="tpNote">📱 '+E(B("Stored only on this phone. Take a backup file and keep it in WhatsApp / Google Drive.","ഈ ഫോണിൽ മാത്രം. ബാക്കപ്പ് ഫയൽ എടുത്ത് WhatsApp / Google Drive-ൽ സൂക്ഷിക്കൂ."))+'</div>')+
   '<div class="tpC"><button class="tpBtn" style="margin-top:0" onclick="tpBkFile()">💾 '+E(B("Take backup file","ബാക്കപ്പ് ഫയൽ എടുക്കുക"))+'</button>'+
    '<div class="tpM" style="margin-top:6px">'+E(B("Last backup file: ","അവസാന ബാക്കപ്പ് ഫയൽ: "))+(last?E(dmy(new Date(last).toISOString().slice(0,10))):E(B("never","ഇല്ല")))+'</div></div>'+
   (cloud?'<div class="tpC"><button class="tpBtn g" style="margin-top:0" onclick="tpCloudRestore()">☁ '+E(B("Cloud Backup: restore on this phone","ക്ലൗഡ് ബാക്കപ്പ്: ഈ ഫോണിൽ തിരികെ ചേർക്കുക"))+'</button>'+
    '<div class="tpM" style="margin-top:6px">'+E(B("Use this on a new / second phone to bring your accounts here. Adds only what is missing.","പുതിയ / രണ്ടാമത്തെ ഫോണിൽ നിങ്ങളുടെ കണക്കുകൾ കൊണ്ടുവരാൻ ഇത് ഉപയോഗിക്കുക. ഇല്ലാത്തവ മാത്രം ചേർക്കും."))+'</div></div>':'')+
   '<div class="tpC"><b>'+E(B("Restore from a backup file","ബാക്കപ്പ് ഫയലിൽ നിന്ന് തിരികെ ചേർക്കുക"))+'</b><div class="tpM">'+E(B("Adds only what is missing; nothing is overwritten.","ഇല്ലാത്തവ മാത്രം ചേർക്കും; നിലവിലുള്ളത് മാറില്ല."))+'</div>'+
    '<input type="file" accept=".json,application/json" onchange="tpRestoreFile(this)" style="margin-top:8px"></div>'+
   '<div class="tpC"><b>'+E(B("Export for Excel (CSV)","Excel-ന് (CSV)"))+'</b><div>'+
    '<button class="tpBtn g s" onclick="tpCsv(\'m\')">'+E(B("Income & expense","വരവ് ചെലവ്"))+'</button><button class="tpBtn g s" onclick="tpCsv(\'l\')">'+E(B("Loans","കടം"))+'</button><button class="tpBtn g s" onclick="tpCsv(\'g\')">'+E(B("Ceremony covers","ചടങ്ങ് കവർ"))+'</button><button class="tpBtn g s" onclick="tpCsv(\'c\')">'+E(B("Chitty","ചിട്ടി"))+'</button></div></div>';
 };

 /* ---------- Premium cloud backup includes the lists ---------- */
 try{ Object.keys(K).forEach(function(c){ if(typeof TC_BK_LISTS!=="undefined"&&TC_BK_LISTS.indexOf(K[c])<0) TC_BK_LISTS.push(K[c]); }); }catch(e){}

 /* ---------- entry points: Menu (every role) and the customer home page ---------- */
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var body=$("modalBody");
   if(body&&!body.querySelector("#tcPersMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcPersMenu";
    wrap.innerHTML=tcMenuItem('<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 9h10"></path><path d="M7 13h6"></path><circle cx="16.5" cy="15.5" r="1.3" fill="#0b6b78" stroke="none"></circle>',B("My Accounts (income, loans, ceremony covers)","എന്റെ കണക്കുകൾ (വരവ് ചെലവ്, കടം, ചടങ്ങ് കവർ)"),"tcPersOpen()");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };
 (function(){
  var tm=0;
  function card(){
   var c=document.createElement("div"); c.id="tcPersCard"; c.setAttribute("onclick","tcPersOpen()");
   c.style.cssText="cursor:pointer;display:flex;align-items:center;gap:14px;padding:14px 16px;margin:0 0 12px;border-radius:16px;color:#fff;background:linear-gradient(135deg,#0b6b78,#1a8f8a);box-shadow:0 6px 14px rgba(11,107,120,.25)";
   c.innerHTML='<div style="font-size:26px">📒</div><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:16px"></div><div style="font-size:12.5px;opacity:.95"></div></div><div style="font-size:24px;opacity:.9">&rsaquo;</div>';
   return c;
  }
  function place(){
   var c=$("tcPersCard"), u=null; try{ u=getCurrentUser(); }catch(e){}
   var app=$("app"), btn=app&&app.querySelector('button[onclick*="activeboard"]'), anchor=btn&&btn.closest?btn.closest(".actions"):null;
   if(!u||(u.role!=="customer"&&location.hash!=="#previewcustomer")||!anchor){ if(c&&!anchor&&c.parentNode) c.remove(); return; }
   if(!c) c=card();
   var a=c.children[1].children[0], b=c.children[1].children[1], t1=B("My Accounts","എന്റെ കണക്കുകൾ"), t2=B("Income, expense, loans, bills, ceremony covers","വരവ് ചെലവ്, കടം, ബില്ലുകൾ, ചടങ്ങ് കവർ"), dt=""; try{ dt=P.dueText?P.dueText():""; }catch(e){} if(dt) t2="🔔 "+dt;
   if(a.textContent!==t1) a.textContent=t1; if(b.textContent!==t2) b.textContent=t2;
   if(c.previousElementSibling!==anchor||c.parentNode!==anchor.parentNode) anchor.parentNode.insertBefore(c,anchor.nextSibling);
  }
  function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ place(); }catch(e){ if(window.console) console.error("tc-pers card",e); } },150); }
  function start(){ var app=$("app"); if(!app||!window.MutationObserver) return; new MutationObserver(later).observe(app,{childList:true,subtree:true}); later(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();
})();
