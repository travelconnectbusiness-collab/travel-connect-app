/* ASSOCIATION BOOK - unions, Kudumbashree, self-help groups, clubs, residents' associations, temple / church committees
   (tc-assoc.js, loaded by tc-regdocs.js; part 2 = tc-assoc2.js: ledger, minutes, reports, settings, voice answers).
   Owner 2026-11-20 (a Kerala Taxi Drivers' organisation office-bearer asked on WhatsApp): "members, their details, area, subscription
   (വരിസംഖ്യ), a ledger, a minutes book with actions taken against members - for organisations, Kudumbashree and small self-help groups,
   as one more business category, yearly Premium / Platinum".
   - New business type "association" (added to TC_BUSINESS_TYPES at run time: registration, directory, admin and the TEST pages see it).
   - The book lives in the app's own data (db.assoc[business id]) on this phone, so the normal backup keeps it. Nothing is sent anywhere.
   - Free up to N members (default 25; the admin sets N in the Plan settings, sent with the plan status); above that Premium / Platinum.
   - A card "Association book" on the owner dashboard (directly above Messages, like the shop card) opens a full-screen book.
   Screens here: home, members, member, member form, collect subscription (+ receipt), dues list. core.js / business.js are NOT edited. */
(function(){
 if(window.__tcAssoc) return;
 window.__tcAssoc=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var T=function(ml,en){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){} };
 var TYPE="association";
 try{ if(typeof TC_BUSINESS_TYPES!=="undefined"&&!TC_BUSINESS_TYPES[TYPE]) TC_BUSINESS_TYPES[TYPE]="Association / Union / Kudumbashree / Club"; }catch(e){}
 try{ if(typeof TC_BUSINESS_TYPES_ML!=="undefined"&&!TC_BUSINESS_TYPES_ML[TYPE]) TC_BUSINESS_TYPES_ML[TYPE]="സംഘടന / യൂണിയൻ / കുടുംബശ്രീ / ക്ലബ്"; }catch(e){}

 /* ---------- data ---------- */
 function DB(){ try{ return (typeof db!=="undefined")?db:null; }catch(e){ return null; } }
 function biz(){ try{ return window.__tcBizOnScreen?String(window.__tcBizOnScreen()||""):""; }catch(e){ return ""; } }
 var PIDO="";   /* an organisation opened from "My organisations" (I am an office bearer there, it is not my own business) */
 function pid(){ if(PIDO) return PIDO; var d=DB(); return String((d&&d.settings&&d.settings.myPartnerId)||"x"); }
 function A(){
  var d=DB(); if(!d) return null;
  if(!d.assoc||typeof d.assoc!=="object") d.assoc={};
  var k=pid(), a=d.assoc[k];
  if(!a) a=d.assoc[k]={cfg:{amt:0,per:"m",start:"",areas:[],prefix:"R",nextNo:1,nextRc:1,openCash:0,openBank:0,org:""},members:[],pays:[],led:[],mins:[],acts:[]};
  ["members","pays","led","mins","acts","coms"].forEach(function(x){ if(!Array.isArray(a[x])) a[x]=[]; });
  return a;
 }
 function sv(){ try{ if(typeof save==="function") save(); }catch(e){} }
 /* every change is also queued for the cloud book (tc-assoc3.js sends it when the book is in the cloud) */
 function op(kind,rec,del){ var a=A(); if(!a||!a.cloud) return; if(!Array.isArray(a.q)) a.q=[]; var id=kind==="cfg"?"cfg":rec.id; a.q=a.q.filter(function(x){ return !(x.kind===kind&&x.id===id); }); a.q.push({kind:kind,id:id,data:JSON.parse(JSON.stringify(rec)),del:del?1:0}); try{ if(typeof window.__tcAsSyncSoon==="function") window.__tcAsSyncSoon(); }catch(e){} }
 function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
 function today(){ var d=new Date(); return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); }
 function dmy(s){ s=String(s||""); return s.length>=10?s.slice(8,10)+"-"+s.slice(5,7)+"-"+s.slice(0,4):s; }
 function money(n){ n=Math.round(+n||0); return "₹"+n.toLocaleString("en-IN"); }
 var MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], MNML=["ജനു","ഫെബ്രു","മാർച്ച്","ഏപ്രിൽ","മേയ്","ജൂൺ","ജൂലൈ","ഓഗ","സെപ്","ഒക്ടോ","നവം","ഡിസം"];
 function isoWeek(ds){ var d=new Date(String(ds).slice(0,10)+"T00:00:00Z"), day=(d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-day+3); var y=d.getUTCFullYear(), f=new Date(Date.UTC(y,0,4)); var w=1+Math.round(((d-f)/86400000-3+((f.getUTCDay()+6)%7))/7); return y+"-W"+("0"+w).slice(-2); }
 function weekMon(p){ var y=+p.slice(0,4), w=+p.slice(6), j4=new Date(Date.UTC(y,0,4)); j4.setUTCDate(j4.getUTCDate()-((j4.getUTCDay()+6)%7)+(w-1)*7); return j4; }
 function perOf(date,per){ date=String(date||today()); return per==="y"?date.slice(0,4):(per==="w"?isoWeek(date):date.slice(0,7)); }
 function curPer(){ return perOf(today(),A().cfg.per); }
 function perLabel(p){ p=String(p||""); if(p.length===4) return p; if(p.charAt(5)==="W"){ var mo=weekMon(p); return T("ആഴ്ച ","Week ")+(+p.slice(6))+" ("+("0"+mo.getUTCDate()).slice(-2)+"-"+("0"+(mo.getUTCMonth()+1)).slice(-2)+")"; } var m=+p.slice(5,7)-1; return T(MNML[m],MN[m])+" "+p.slice(0,4); }
 function perNext(p){ if(p.length===4) return String(+p+1); if(p.charAt(5)==="W"){ var d=weekMon(p); d.setUTCDate(d.getUTCDate()+7); return isoWeek(d.toISOString()); } var y=+p.slice(0,4), m=+p.slice(5,7)+1; if(m>12){ m=1; y++; } return y+"-"+("0"+m).slice(-2); }
 function perList(from,to){ var out=[], p=from, n=0; if(!from||!to||from>to) return out; while(p<=to&&n<600){ out.push(p); p=perNext(p); n++; } return out; }
 /* ---------- kinds of organisation (owner 2026-11-20: a taxi union is not a club, a club is not a Kudumbashree ...) - each book shows only its own words and fields ---------- */
 var TYPES={
  taxi:{ml:"ടാക്സി / ഓട്ടോ തൊഴിലാളി യൂണിയൻ",en:"Taxi / auto workers' union",area:["യൂണിറ്റ്","Unit"],sub:["വരിസംഖ്യ","Subscription"],pers:["m","y"],veh:1},
  shg:{ml:"കുടുംബശ്രീ / അയൽക്കൂട്ടം / സ്വയംസഹായ സംഘം",en:"Kudumbashree / neighbourhood / self-help group",area:["യൂണിറ്റ് / വാർഡ്","Unit / ward"],sub:["നിക്ഷേപം","Thrift"],pers:["w","m"],save:1},
  club:{ml:"ക്ലബ്",en:"Club",area:["ഏരിയ","Area"],sub:["അംഗത്വ ഫീസ്","Membership fee"],pers:["y","m"],mtype:1},
  res:{ml:"റെസിഡന്റ്സ് അസോസിയേഷൻ",en:"Residents' association",area:["റോഡ് / ലെയ്ൻ","Road / lane"],sub:["മെയിന്റനൻസ് ഫീസ്","Maintenance fee"],pers:["m","y"],house:1},
  other:{ml:"മറ്റ് സംഘടന",en:"Other organisation",area:["ഏരിയ / യൂണിറ്റ്","Area / unit"],sub:["വരിസംഖ്യ","Subscription"],pers:["m","y"]}
 };
 function TYc(c){ return TYPES[(c||{}).type]||TYPES.other; }
 function TY(){ return TYc(A().cfg); }
 function subName(){ var t=TY(); return T(t.sub[0],t.sub[1]); }
 function areaName(){ var t=TY(); return T(t.area[0],t.area[1]); }
 function perWord(per){ return per==="y"?T("വർഷം","year"):(per==="w"?T("ആഴ്ച","week"):T("മാസം","month")); }
 function vehs(m){ var x=Array.isArray(m&&m.vehs)?m.vehs:((m&&m.veh)?String(m.veh).split(","):[]); return x.map(function(y){ return String(y).trim(); }).filter(Boolean); }
 /* what one member pays for one period: special rate > type rule (life / honorary members of a club pay nothing; a union: base + each vehicle above the included ones) */
 function memAmtC(c,m){
  var t=TYc(c); c=c||{}; if(!m) return +c.amt||0;
  if(t.mtype&&(m.mtype==="life"||m.mtype==="hon")) return 0;
  if(+m.amt>0) return +m.amt;
  var a=+c.amt||0;
  if(t.veh){ var n=vehs(m).length, inc=Math.max(0,parseInt(c.inclVeh,10)||0); if(+c.extraVeh>0&&inc>0&&n>inc) a+=(n-inc)*(+c.extraVeh); }
  return a;
 }
 function memAmt(m){ return memAmtC(A().cfg,m); }
 function startPer(c){ var st=String(c.start||""); if(!st) return ""; if(c.per==="y") return st.slice(0,4); var mo=st.length===4?st+"-01":st.slice(0,7); return c.per==="w"?isoWeek(mo+"-01"):mo; }
 function duesC(c,m,paid,upto){
  if(!m||m.status==="l"||!(memAmtC(c,m)>0)) return [];
  var j=perOf(m.joined||today(),c.per), st=startPer(c)||j, from=j>st?j:st;
  return perList(from,upto||perOf(today(),c.per)).filter(function(p){ return !paid[p]; });
 }
 function live(arr){ return arr.filter(function(x){ return !x.del; }); }
 /* ---------- committees (phase 4): state › district › zone › unit ... ("" = the organisation itself, the top committee) ---------- */
 function coms(){ return live(A().coms||[]); }
 function comMap(){ var o={}; coms().forEach(function(c){ o[c.id]=c; }); return o; }
 function comOf(r){ var c=r&&r.com; return c&&comMap()[c]?c:""; }
 function kidsOf(id){ return coms().filter(function(c){ return (c.parent||"")===(id||""); }).sort(function(x,y){ return String(x.name).localeCompare(String(y.name)); }); }
 function subOf(id){ var s={}, st=[id||""], n=0; while(st.length&&n<20000){ var x=st.pop(); n++; if(s[x]) continue; s[x]=1; kidsOf(x).forEach(function(k){ st.push(k.id); }); } return s; }
 function myRoots(){ var a=A(), m=comMap(), sc=Array.isArray(a.scope)?a.scope.filter(function(x){ return m[x]; }):[]; return sc.length?sc:[""]; }
 function myRoot(){ return myRoots()[0]; }
 function scopeSet(){ var o={}; myRoots().forEach(function(r){ var s=subOf(r); for(var k in s) o[k]=1; }); return o; }
 function comName(id){ return id&&comMap()[id]?comMap()[id].name:orgName(); }
 function comPath(id){ var m=comMap(), out=[], n=0; while(id&&m[id]&&n<30){ out.unshift(m[id].name); id=m[id].parent||""; n++; } return out.join(" › "); }
 /* committees this person can choose, in tree order: [[id, label]] (top = "_") */
 function comChoices(){ var out=[], roots=myRoots();
  var walk=function(id,d){ out.push([id||"_",(d?new Array(d+1).join("· "):"")+comName(id)]); kidsOf(id).forEach(function(k){ walk(k.id,d+1); }); };
  roots.forEach(function(r){ walk(r,0); }); return out; }
 function comSelect(elId,cur,extra){ var ch=comChoices(); cur=cur||"_"; return '<select id="'+elId+'">'+(extra||[]).concat(ch).map(function(o){ return '<option value="'+E(o[0])+'"'+(o[0]===cur?' selected':'')+'>'+E(o[1])+'</option>'; }).join("")+'</select>'; }
 function comVal(elId){ var x=v(elId); return x==="_"?"":x; }
 function areaOf(m){ var c=m&&m.com&&comMap()[m.com]; return c?c.name:((m&&m.area)||""); }
 /* filter chips, or a list when there are many (a big union has hundreds of units) */
 function areaPick(g,list,cur){ if(list.length<=12) return chips(g,[["",T("എല്ലാം","All")]].concat(list.map(function(x){ return [x,x]; })),cur);
  return '<select onchange="window.tcAsChip_'+g+'&&window.tcAsChip_'+g+'(this.value)"><option value="">'+E(T("എല്ലാം","All"))+'</option>'+list.map(function(x){ return '<option'+(x===cur?' selected':'')+'>'+E(x)+'</option>'; }).join("")+'</select>'; }
 function members(){ return live(A().members).sort(function(a,b){ return (+a.no||0)-(+b.no||0); }); }
 function memberById(id){ return A().members.filter(function(m){ return m.id===id; })[0]||null; }
 function paidSet(mid){ var s={}; live(A().pays).forEach(function(p){ if(p.mid===mid) (p.periods||[]).forEach(function(x){ s[x]=1; }); }); return s; }
 /* periods this member still has to pay: from the later of (book start, joining) to now; members who left owe nothing new */
 function dues(m,upto){ return duesC(A().cfg,m,m?paidSet(m.id):{},upto); }
 function orgName(){ var c=A().cfg, p=window._myPartner; return c.org||(p&&p.business_name)||T("സംഘടന","Association"); }
 function freeLimit(){ var n=25; try{ var v=parseInt(localStorage.getItem("tc_assoc_free"),10); if(v>=0) n=v; }catch(e){} return n; }
 /* plan level for the book: 3 Platinum, 2 Premium, 1 Plus (Rs 100 - 100 members with the cloud, owner 2026-11-20), 0 Free */
 function planLvl(){
  try{ if(typeof tcIsPlatinumPlan==="function"&&tcIsPlatinumPlan()) return 3; }catch(e){}
  var s=(DB()||{}).settings||{};
  if(s.myPlan==="owner_free"||s.myPlan==="owner_plus") return 3;
  var run=!s.myPlanExpiresAt||new Date(s.myPlanExpiresAt).getTime()>Date.now();
  return !run?0:(s.myPlan==="premium"?2:(s.myPlan==="paid"?1:0));
 }
 function planLimit(){ var l=planLvl(), o={}; try{ o=JSON.parse(localStorage.getItem("tc_assoc_lims")||"{}")||{}; }catch(e){}
  return l>=3?(+o.platinum||100000):(l>=2?(+o.premium||10000):(l>=1?(+o.paid||100):freeLimit())); }
 function premOk(){   /* may keep the book in the cloud (Plus and above) */
  return planLvl()>=1;
 }
 function phone10(p){ var d=String(p||"").replace(/\D/g,""); if(d.length===12&&d.slice(0,2)==="91") d=d.slice(2); return d.length===10?d:""; }
 function wa(ph,text){ var p=phone10(ph); return "https://wa.me/"+(p?"91"+p:"")+"?text="+encodeURIComponent(text); }

 /* ---------- the full-screen book ---------- */
 var S={open:false,stack:[]}, SC={};
 var css='#tcAs{position:fixed;inset:0;z-index:9000;background:#f4f7f8;display:flex;flex-direction:column;font-size:15px}'+
  '#tcAs .asH{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,#0b7a8a,#0b5f6b);color:#fff}'+
  '#tcAs .asH b{font-size:17px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
  '#tcAs .asH button{background:rgba(255,255,255,.18);color:#fff;border:0;border-radius:10px;padding:7px 11px;font-size:15px;margin:0;min-height:0}'+
  '#tcAs .asB{flex:1;overflow:auto;padding:12px 12px 90px}'+
  '#tcAs .asC{background:#fff;border-radius:14px;padding:12px;margin:0 0 10px;box-shadow:0 1px 3px rgba(0,0,0,.06)}'+
  '#tcAs .asG{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 10px}'+
  '#tcAs .asT{background:#fff;border-radius:14px;padding:13px 12px;box-shadow:0 1px 3px rgba(0,0,0,.06);cursor:pointer;display:flex;align-items:center;gap:10px;font-weight:700;font-size:14.5px;color:#0b4f5a}'+
  '#tcAs .asT.p{background:linear-gradient(135deg,#0b7a8a,#0b5f6b);color:#fff}'+
  '#tcAs .asT i{font-style:normal;font-size:20px;width:36px;height:36px;border-radius:50%;background:#e9f3f4;display:flex;align-items:center;justify-content:center;flex-shrink:0}'+
  '#tcAs .asT.p i{background:rgba(255,255,255,.22)}'+
  '#tcAs .asR{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid #edf1f2;cursor:pointer}'+
  '#tcAs .asR:last-child{border-bottom:0}'+
  '#tcAs .asM{color:#6b7c85;font-size:12.5px}'+
  '#tcAs .asBd{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11.5px;font-weight:700}'+
  '#tcAs label{display:block;font-size:12.5px;color:#4a5a67;margin:8px 0 3px;font-weight:600}'+
  '#tcAs input,#tcAs select,#tcAs textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid #cfdde0;border-radius:10px;font-size:15px;background:#fff;margin:0}'+
  '#tcAs .asBtn{display:inline-block;padding:10px 14px;border-radius:10px;border:0;background:#0b6f7d;color:#fff;font-weight:700;font-size:14.5px;margin:8px 6px 0 0;min-height:0;cursor:pointer;text-decoration:none}'+
  '#tcAs .asBtn.l{background:#e9f3f4;color:#0b4f5a}#tcAs .asBtn.r{background:#fdecec;color:#a12d2d}#tcAs .asBtn.g{background:#1c8c3a}'+
  '#tcAs .asCh{display:inline-block;padding:7px 12px;border-radius:999px;border:1px solid #cfdde0;background:#fff;margin:4px 6px 0 0;font-size:13.5px;cursor:pointer}'+
  '#tcAs .asCh.on{background:#0b6f7d;color:#fff;border-color:#0b6f7d}'+
  '#tcAs.ro .asBtn.g,#tcAs.ro .asBtn.r,#tcAs.ro [data-w]{display:none!important}'+
  '#tcAsCard{cursor:pointer;display:flex;align-items:center;gap:14px;padding:16px;margin:2px 0 14px;border-radius:18px;color:#fff;background:linear-gradient(135deg,#0b7a8a,#0b5f6b);box-shadow:0 2px 8px rgba(11,95,107,.3)}';
 try{ var st=document.createElement("style"); st.id="tcAssocCss"; st.textContent=css; document.head.appendChild(st); }catch(e){}

 function open(name,arg){
  if(!A()) return;
  var o=$("tcAs");
  if(!o){ o=document.createElement("div"); o.id="tcAs"; o.innerHTML='<div class="asH"><button type="button" id="tcAsBack">&#8592;</button><b id="tcAsTitle"></b><button type="button" id="tcAsClose">&#10005;</button></div><div class="asB" id="tcAsBody"></div>'; document.body.appendChild(o);
   $("tcAsBack").onclick=function(){ back(); }; $("tcAsClose").onclick=function(){ close(); }; }
  if(!S.open){ S.open=true; S.stack=[]; try{ history.pushState({tcAs:1},""); }catch(e){} }
  go(name||"home",arg);
 }
 function canWrite(){ var a=A(); return !a||!a.cloud||a.acc==="admin"||a.acc==="edit"; }
 function close(fromPop){ var o=$("tcAs"); if(o) o.remove(); var was=S.open; S.open=false; S.stack=[]; PIDO=""; if(was&&!fromPop){ try{ if(history.state&&history.state.tcAs) history.back(); }catch(e){} } }
 function go(name,arg,replace){ if(replace) S.stack.pop(); S.stack.push({n:name,a:arg}); render(); }
 function back(){ if(S.stack.length>1){ S.stack.pop(); render(); } else close(); }
 function render(){
  var top=S.stack[S.stack.length-1], b=$("tcAsBody"), t=$("tcAsTitle"); if(!top||!b) return;
  var f=SC[top.n]; if(!f){ b.innerHTML=""; return; }
  var r=f(top.a)||{}; t.textContent=r.title||orgName(); b.innerHTML=r.html||""; b.scrollTop=0;
  var o=$("tcAs"); if(o) o.classList.toggle("ro",!canWrite());
  if(typeof r.after==="function") try{ r.after(b); }catch(e){ if(window.console) console.error("tc-assoc",e); }
 }
 window.addEventListener("popstate",function(){ if(!S.open) return; if(S.stack.length>1){ S.stack.pop(); render(); try{ history.pushState({tcAs:1},""); }catch(e){} } else close(true); });
 function tile(ic,label,fn,sub,primary,w){ return '<div class="asT'+(primary?' p':'')+'"'+(w?' data-w="1"':'')+' onclick="'+fn+'"><i>'+ic+'</i><div style="min-width:0">'+E(label)+(sub?'<div style="font-weight:500;font-size:12px;opacity:.85">'+E(sub)+'</div>':'')+'</div></div>'; }
 function v(id){ var e=$(id); return e?String(e.value||"").trim():""; }
 function chips(name,opts,cur){ return opts.map(function(o){ return '<span class="asCh'+(o[0]===cur?' on':'')+'" data-g="'+name+'" data-v="'+E(o[0])+'" onclick="tcAsChip(this)">'+E(o[1])+'</span>'; }).join(""); }
 window.tcAsChip=function(el){ var g=el.getAttribute("data-g"); document.querySelectorAll('#tcAs .asCh[data-g="'+g+'"]').forEach(function(x){ x.classList.toggle("on",x===el); }); if(typeof window["tcAsChip_"+g]==="function") window["tcAsChip_"+g](el.getAttribute("data-v")); };
 function chipVal(g){ var e=document.querySelector('#tcAs .asCh.on[data-g="'+g+'"]'); return e?e.getAttribute("data-v"):""; }
 function stBadge(m){ return m.status==="s"?'<span class="asBd" style="background:#fff3cd;color:#7a5a00">'+E(T("സസ്പെൻഡ്","Suspended"))+'</span>':(m.status==="l"?'<span class="asBd" style="background:#eee;color:#666">'+E(T("ഒഴിവായി","Left"))+'</span>':""); }

 /* ---------- home ---------- */
 SC.home=function(){
  var a=A(), c=a.cfg, ms=members(), act=ms.filter(function(m){ return m.status!=="l"; }), cp=curPer();
  var paidNow=act.filter(function(m){ return paidSet(m.id)[cp]; }).length, dueN=act.filter(function(m){ return dues(m).length; }).length;
  var bal=typeof window.__tcAsBal==="function"?window.__tcAsBal():null;
  var h='';
  if(typeof window.__tcAsHomeExtra==="function") h+=window.__tcAsHomeExtra();
  if(!(+c.amt>0)&&canWrite()) h+='<div class="asC" style="background:#fff6df;color:#7a4f00;font-weight:600">'+E(T("ആദ്യം സംഘടനയുടെ തരം, "+TY().sub[0]+" തുക, കാലയളവ് എന്നിവ സെറ്റ് ചെയ്യുക.","First set the kind of organisation, the "+TY().sub[1].toLowerCase()+" amount and period."))+' <span class="asBtn" onclick="tcAsGo(\'settings\')">'+E(T("സെറ്റിംഗ്സ്","Settings"))+'</span></div>';
  h+='<div class="asC"><div style="font-weight:800;font-size:16px">'+E(orgName())+'</div><div class="asM">'+E(T(TY().ml,TY().en)+(+c.amt>0?" · "+subName()+": "+money(c.amt)+" / "+perWord(c.per)+(TY().veh&&+c.extraVeh>0&&+c.inclVeh>0?" ("+c.inclVeh+" "+T("വണ്ടി വരെ; അധികം ഓരോന്നിനും","vehicles; each extra")+" "+money(c.extraVeh)+")":""):""))+'</div>'+
   '<div style="display:flex;gap:8px;margin-top:10px;text-align:center">'+
   '<div style="flex:1;background:#f4f7f8;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:18px">'+act.length+'</div><div class="asM">'+E(TY().house?T("വീടുകൾ","Houses"):T("മെമ്പർമാർ","Members"))+'</div></div>'+
   '<div style="flex:1;background:#eef8f0;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:18px;color:#1c6b2c">'+paidNow+'</div><div class="asM">'+E(perLabel(cp)+" "+T("അടച്ചു","paid"))+'</div></div>'+
   '<div style="flex:1;background:#fdecec;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:18px;color:#a12d2d">'+dueN+'</div><div class="asM">'+E(T("ബാക്കിയുള്ളവർ","With dues"))+'</div></div></div>'+
   (bal?'<div class="asM" style="margin-top:8px">'+E(T("ബാക്കി","Balance"))+': <b style="color:#0b4f5a">'+money(bal.cash+bal.bank)+'</b> ('+E(T("കയ്യിൽ","cash"))+' '+money(bal.cash)+' · '+E(T("ബാങ്ക്","bank"))+' '+money(bal.bank)+')</div>':'')+'</div>';
  h+='<div class="asG">'+tile("&#128176;",T(TY().sub[0]+" വാങ്ങുക","Collect "+TY().sub[1].toLowerCase()),"tcAsGo('collect')","",true,1)+tile("&#9888;&#65039;",T("അടയ്ക്കാത്തവർ","Dues list"),"tcAsGo('dues')",dueN+" "+T("പേർ","members"))+
   tile(TY().house?"&#127968;":"&#128101;",TY().house?T("വീടുകൾ","Houses"):T("മെമ്പർമാർ","Members"),"tcAsGo('members')",act.length+"")+tile("&#128210;",T("വരവ്-ചെലവ്","Ledger"),"tcAsGo('ledger')")+
   tile("&#128221;",T("മിനിറ്റ്സ് / നടപടി","Minutes & actions"),"tcAsGo('minutes')")+tile("&#128202;",T("റിപ്പോർട്ട്","Reports"),"tcAsGo('reports')")+
   tile("&#9881;&#65039;",T("സെറ്റിംഗ്സ്","Settings"),"tcAsGo('settings')","",false,1)+(typeof window.__tcAsHomeTiles==="function"?window.__tcAsHomeTiles():"")+'</div>';
  if(!premOk()&&!a.cloud) h+='<div class="asM" style="text-align:center">'+E(T(freeLimit()+" മെമ്പർ വരെ സൗജന്യം (ഈ ഫോണിൽ മാത്രം). 100 മെമ്പർ വരെ ക്ലൗഡോടെ Plus ₹100 / വർഷം; കൂടുതലിന് Premium / Platinum (Menu › Verification & Plan).",
   "Free up to "+freeLimit()+" members (this phone only). Up to 100 members with the cloud: Plus Rs 100 / year; more: Premium / Platinum (Menu › Verification & Plan)."))+'</div>';
  return {title:T("സംഘടനാ പുസ്തകം","Association book"),html:h};
 };
 window.tcAsGo=function(n,a){ if(!S.open||!$("tcAs")){ open(n,a); return; } go(n,a); };

 /* ---------- members ---------- */
 var mFilter={q:"",area:"",com:""};
 SC.members=function(){
  var a=A(), ms=members(), areas=coms().length?[]:(a.cfg.areas||[]).slice();
  ms.forEach(function(m){ var ar=areaOf(m); if(ar&&areas.indexOf(ar)<0) areas.push(ar); });
  var h='<div class="asC"><input id="tcAsMq" placeholder="'+E(T("പേര്, ഫോൺ, നമ്പർ"+(TY().veh?", വണ്ടി":"")+(TY().house?", വീട്ടുനമ്പർ":"")+" തിരയുക","Search name, phone, number"+(TY().veh?", vehicle":"")+(TY().house?", house no.":"")))+'" value="'+E(mFilter.q)+'">'+
   (mFilter.com&&comMap()[mFilter.com]?'<div><span class="asCh on" onclick="tcAsMcom()">'+E(comName(mFilter.com))+' &#10005;</span></div>':(areas.length?'<div>'+areaPick("mar",areas,mFilter.area)+'</div>':''))+
   '<span class="asBtn" data-w="1" onclick="tcAsGo(\'mform\')">+ '+E(TY().house?T("വീട് ചേർക്കുക","Add house"):T("മെമ്പറെ ചേർക്കുക","Add member"))+'</span></div><div class="asC" id="tcAsMl"></div>';
  return {title:T("മെമ്പർമാർ","Members"),html:h,after:function(){
   var draw=function(){
    var q=mFilter.q.toLowerCase(), cs=mFilter.com&&comMap()[mFilter.com]?subOf(mFilter.com):null, list=members().filter(function(m){ return (!cs||cs[comOf(m)])&&(cs||!mFilter.area||areaOf(m)===mFilter.area)&&(!q||(m.name+" "+(m.ph||"")+" "+(m.no||"")+" "+vehs(m).join(" ")+" "+(m.hno||"")).toLowerCase().indexOf(q)>=0); });
    $("tcAsMl").innerHTML=list.length?list.map(function(m){ var d=dues(m).length;
     return '<div class="asR" onclick="tcAsGo(\'member\',\''+m.id+'\')"><div style="width:38px;font-weight:800;color:#0b6f7d">'+E(m.no||"")+'</div><div style="flex:1;min-width:0"><div style="font-weight:700">'+E((TY().house&&m.hno?m.hno+" · ":"")+m.name)+' '+stBadge(m)+'</div><div class="asM">'+E([areaOf(m),m.ph,extraLine(m)].filter(Boolean).join(" · "))+'</div></div>'+
      (d?'<span class="asBd" style="background:#fdecec;color:#a12d2d">'+d+' '+E(T("ബാക്കി","due"))+'</span>':'<span class="asBd" style="background:#eef8f0;color:#1c6b2c">&#10003;</span>')+'</div>'; }).join(""):'<div class="asM">'+E(T("മെമ്പർമാർ ഇല്ല.","No members yet."))+'</div>';
   };
   window.tcAsChip_mar=function(x){ mFilter.area=x; draw(); };
   $("tcAsMq").oninput=function(){ mFilter.q=this.value; draw(); }; draw();
  }};
 };
 window.tcAsMcom=function(){ mFilter.com=""; render(); };
 SC.mform=function(id){
  var a=A(), t=TY(), m=id?memberById(id):null, n=m||{no:String(a.cfg.nextNo||(members().length+1)),joined:today(),status:"a",mtype:"o"};
  var areas=(a.cfg.areas||[]).map(function(x){ return '<option value="'+E(x)+'">'; }).join("");
  var h='<div class="asC">'+
   (t.house?'<label>'+E(T("വീട്ടുനമ്പർ / വീട്ടുപേര് *","House no. / name *"))+'</label><input id="tcAsFh" value="'+E(n.hno||"")+'">':'')+
   '<label>'+E(t.house?T("കുടുംബനാഥന്റെ / ഉടമയുടെ പേര് *","Head of family / owner *"):T("പേര് *","Name *"))+'</label><input id="tcAsFn" value="'+E(n.name||"")+'">'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("ഫോൺ","Phone"))+'</label><input id="tcAsFp" type="tel" value="'+E(n.ph||"")+'"></div><div style="width:34%"><label>'+E(T("മെമ്പർ നമ്പർ","Member no."))+'</label><input id="tcAsFno" value="'+E(n.no||"")+'"></div></div>'+
   (coms().length?'<label>'+E(T("കമ്മിറ്റി / യൂണിറ്റ്","Committee / unit"))+'</label>'+comSelect("tcAsFc",m?(comOf(m)||"_"):(mFilter.com||myRoot()||"_"))+'<label>'+E(T("ചേർന്ന തീയതി","Joined on"))+'</label><input id="tcAsFj" type="date" value="'+E(n.joined||"")+'">':
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(areaName())+'</label><input id="tcAsFa" list="tcAsAreas" value="'+E(n.area||"")+'"><datalist id="tcAsAreas">'+areas+'</datalist></div><div style="flex:1"><label>'+E(T("ചേർന്ന തീയതി","Joined on"))+'</label><input id="tcAsFj" type="date" value="'+E(n.joined||"")+'"></div></div>')+
   (t.veh?'<label>'+E(T("വണ്ടി നമ്പറുകൾ (കോമ ഇട്ട്)","Vehicle numbers (comma separated)"))+'</label><input id="tcAsFv" value="'+E(vehs(n).join(", "))+'" placeholder="KL 18 A 1234, KL 18 B 5678">':'')+
   (t.mtype?'<label>'+E(T("മെമ്പർ തരം","Member type"))+'</label><div>'+chips("mty",[["o",T("സാധാരണം","Ordinary")],["life",T("ആജീവനാന്തം","Life")],["hon",T("ഓണററി","Honorary")]],n.mtype||"o")+'</div>':'')+
   '<details'+(m&&(+m.amt>0||m.note||m.status!=="a")?' open':'')+'><summary class="asM" style="margin-top:8px;cursor:pointer">'+E(T("കൂടുതൽ (ഇളവ് തുക, കുറിപ്പ്, നില)","More (special rate, note, status)"))+'</summary>'+
   '<label>'+E(T("ഇളവ് / പ്രത്യേക തുക ₹ (ഓരോ "+perWord(a.cfg.per)+"; ഒഴിച്ചിട്ടാൽ സാധാരണ നിരക്ക്)","Special rate ₹ per "+perWord(a.cfg.per)+" (empty = normal rate)"))+'</label><input id="tcAsFam" type="number" inputmode="numeric" value="'+E(+n.amt>0?n.amt:"")+'">'+
   '<label>'+E(T("കുറിപ്പ്","Note"))+'</label><input id="tcAsFnt" value="'+E(n.note||"")+'">'+
   '<label>'+E(T("നില","Status"))+'</label><div>'+chips("mst",[["a",T("സജീവം","Active")],["s",T("സസ്പെൻഡ്","Suspended")],["l",T("ഒഴിവായി","Left")]],n.status||"a")+'</div></details>'+
   '<span class="asBtn g" onclick="tcAsSaveMember(\''+(m?m.id:"")+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span>'+(m?'<span class="asBtn r" onclick="tcAsDelMember(\''+m.id+'\')">'+E(T("നീക്കം ചെയ്യുക","Remove"))+'</span>':'')+'</div>';
  return {title:m?(t.house?T("വീട് മാറ്റുക","Edit house"):T("മെമ്പർ മാറ്റുക","Edit member")):(t.house?T("പുതിയ വീട്","New house"):T("പുതിയ മെമ്പർ","New member")),html:h};
 };
 window.tcAsSaveMember=function(id){
  var a=A(), name=v("tcAsFn"); if(!name){ say(T("പേര് നൽകുക","Enter the name")); return; }
  if(TY().house&&!v("tcAsFh")){ say(T("വീട്ടുനമ്പർ / വീട്ടുപേര് നൽകുക","Enter the house no. / name")); return; }
  var m=id?memberById(id):null;
  var lim=a.cloud&&a.limits?a.limits.members:planLimit();
  if(!m&&members().length>=lim){ say(a.cloud||premOk()?T("ഈ പ്ലാനിൽ "+lim+" മെമ്പർ വരെ - കൂടുതലിന് പ്ലാൻ മാറ്റുക (Menu › Verification & Plan).","This plan allows "+lim+" members - change the plan for more (Menu › Verification & Plan)."):T(freeLimit()+" മെമ്പർ വരെ സൗജന്യം - കൂടുതൽ ചേർക്കാൻ Plus (₹100: 100 മെമ്പർ) / Premium / Platinum എടുക്കുക (Menu › Verification & Plan).","Free up to "+freeLimit()+" members - take Plus (Rs 100: 100 members) / Premium / Platinum to add more (Menu › Verification & Plan).")); return; }
  var no=v("tcAsFno"); if(no&&members().some(function(x){ return x.no===no&&(!m||x.id!==m.id); })){ say(T("ഈ മെമ്പർ നമ്പർ വേറെ ഒരാൾക്കുണ്ട്","This member number is already used")); return; }
  if(!m){ m={id:uid(),created:today()}; a.members.push(m); }
  var t=TY();
  m.name=name.slice(0,80); m.ph=v("tcAsFp").slice(0,20); m.no=no.slice(0,12);
  if(coms().length){ m.com=comVal("tcAsFc"); m.area=m.com?comName(m.com).slice(0,40):""; } else m.area=v("tcAsFa").slice(0,40);
  m.joined=v("tcAsFj")||today(); m.note=v("tcAsFnt").slice(0,200); m.status=chipVal("mst")||m.status||"a";
  if(t.veh){ m.vehs=v("tcAsFv").split(",").map(function(x){ return x.trim().toUpperCase().slice(0,16); }).filter(Boolean).slice(0,50); delete m.veh; }
  if(t.house) m.hno=v("tcAsFh").slice(0,40);
  if(t.mtype) m.mtype=chipVal("mty")||"o";
  var sa=+v("tcAsFam"); if(sa>0) m.amt=Math.round(sa*100)/100; else delete m.amt;
  if(!coms().length&&m.area&&(a.cfg.areas||[]).indexOf(m.area)<0){ a.cfg.areas=(a.cfg.areas||[]).concat([m.area]); }
  var nn=parseInt(m.no,10); if(nn>=(+a.cfg.nextNo||1)) a.cfg.nextNo=nn+1;
  op("member",m); sv(); say(T("സേവ് ചെയ്തു","Saved")); go("member",m.id,true);
 };
 window.tcAsDelMember=function(id){ var m=memberById(id); if(!m) return; if(!confirm(T(m.name+" - നീക്കം ചെയ്യട്ടെ? (അടവുകൾ കണക്കിൽ തുടരും)",m.name+" - remove? (payments stay in the accounts)"))) return; m.del=today(); op("member",m,true); sv(); S.stack.pop(); go("members",null,true); };
 SC.member=function(id){
  var m=memberById(id); if(!m) return {html:""};
  var d=dues(m), c=A().cfg, pays=live(A().pays).filter(function(p){ return p.mid===id; }).sort(function(a,b){ return a.date<b.date?1:-1; }), acts=live(A().acts).filter(function(x){ return x.mid===id; });
  var h='<div class="asC"><div style="font-weight:800;font-size:17px">'+E(m.name)+' '+stBadge(m)+'</div><div class="asM">'+E((TY().house&&m.hno?m.hno+" · ":"")+T("നമ്പർ","No.")+" "+(m.no||"-")+(areaOf(m)?" · "+(m.com?comPath(m.com):areaOf(m)):"")+" · "+T("ചേർന്നത്","joined")+" "+dmy(m.joined)+(extraLine(m)?" · "+extraLine(m):""))+(vehs(m).length?'<div class="asM">'+E(vehs(m).join(", "))+'</div>':'')+'</div>'+(m.note?'<div class="asM">'+E(m.note)+'</div>':'')+
   (m.ph?'<a class="asBtn l" href="tel:'+E(phone10(m.ph)||m.ph)+'">&#128222; '+E(m.ph)+'</a>':'')+'<span class="asBtn l" data-w="1" onclick="tcAsGo(\'mform\',\''+id+'\')">'+E(T("മാറ്റുക","Edit"))+'</span></div>';
  h+='<div class="asC"><div style="font-weight:700">'+E(T(TY().sub[0]+" ബാക്കി",TY().sub[1]+" due"))+': <span style="color:'+(d.length?"#a12d2d":"#1c6b2c")+'">'+(d.length?d.length+" × "+money(memAmt(m))+" = "+money(d.length*memAmt(m)):(memAmt(m)>0?T("ഇല്ല ✓","none ✓"):T("ബാധകമല്ല","not applicable")))+'</span></div>'+
   (TY().save?'<div class="asM">'+E(T("ആകെ നിക്ഷേപം","Total saved"))+': <b>'+money(saved(m.id))+'</b></div>':'')+
   (d.length?'<div class="asM">'+E(d.slice(0,12).map(perLabel).join(", ")+(d.length>12?" …":""))+'</div>':'')+
   '<span class="asBtn g" onclick="tcAsGo(\'collect\',\''+id+'\')">&#128176; '+E(T("വാങ്ങുക","Collect"))+'</span>'+
   (d.length&&m.ph?'<a class="asBtn l" target="_blank" rel="noopener" href="'+E(wa(m.ph,remindText(m,d)))+'">'+E(T("WhatsApp ഓർമ്മപ്പെടുത്തൽ","WhatsApp reminder"))+'</a>':'')+
   '<span class="asBtn l" data-w="1" onclick="tcAsGo(\'aform\',\''+id+'\')">'+E(T("നടപടി ചേർക്കുക","Add action"))+'</span></div>';
  h+='<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("അടവുകൾ","Payments"))+'</div>'+(pays.length?pays.map(function(p){
   return '<div class="asR" onclick="tcAsGo(\'receipt\',\''+p.id+'\')"><div style="flex:1"><div>'+E((p.periods||[]).map(perLabel).join(", "))+'</div><div class="asM">'+E(dmy(p.date)+" · "+(p.rc||"")+" · "+modeTxt(p.mode))+'</div></div><b>'+money(p.amt)+'</b></div>'; }).join(""):'<div class="asM">'+E(T("ഇല്ല","None"))+'</div>')+'</div>';
  if(acts.length) h+='<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("നടപടികൾ","Actions"))+'</div>'+acts.map(function(x){ return '<div class="asR"><div style="flex:1"><div>'+E(actTxt(x.type)+(x.amt>0?" · "+money(x.amt):""))+'</div><div class="asM">'+E(dmy(x.date)+(x.note?" · "+x.note:""))+'</div></div></div>'; }).join("")+'</div>';
  return {title:m.name,html:h};
 };
 function saved(mid){ return live(A().pays).filter(function(p){ return p.mid===mid; }).reduce(function(t,p){ return t+(+p.amt||0); },0); }
 function extraLine(m){ var t=TY(), out=[];
  if(t.veh){ var n=vehs(m).length; if(n) out.push(n+" "+T("വണ്ടി","vehicle"+(n>1?"s":""))); }
  if(t.mtype&&m.mtype==="life") out.push(T("ആജീവനാന്ത മെമ്പർ","Life member")); if(t.mtype&&m.mtype==="hon") out.push(T("ഓണററി","Honorary"));
  if(t.save) out.push(T("നിക്ഷേപം","Saved")+" "+money(saved(m.id)));
  if(+m.amt>0) out.push(T("പ്രത്യേക നിരക്ക്","Special rate")+" "+money(m.amt));
  return out.join(" · "); }
 function modeTxt(md){ return md==="b"?T("ബാങ്ക്","Bank"):(md==="u"?"UPI":T("കാഷ്","Cash")); }
 function actTxt(t){ return {warn:T("താക്കീത്","Warning"),fine:T("പിഴ","Fine"),susp:T("സസ്പെൻഷൻ","Suspension")}[t]||T("മറ്റുള്ളവ","Other"); }
 function remindText(m,d){ var t=TY(), amt=memAmt(m); return T("നമസ്കാരം "+m.name+", "+orgName()+" "+t.sub[0]+" ബാക്കി: "+d.map(perLabel).join(", ")+" - ആകെ "+money(d.length*amt)+". ദയവായി അടയ്ക്കുക. നന്ദി.",
  "Hello "+m.name+", "+orgName()+" "+t.sub[1].toLowerCase()+" due: "+d.map(perLabel).join(", ")+" - total "+money(d.length*amt)+". Please pay. Thank you."); }

 /* ---------- collect subscription ---------- */
 SC.collect=function(id){
  var c=A().cfg; if(!(+c.amt>0)) return {title:T(TY().sub[0]+" വാങ്ങുക","Collect "+TY().sub[1].toLowerCase()),html:'<div class="asC">'+E(T("ആദ്യം സെറ്റിംഗ്സിൽ "+TY().sub[0]+" തുക നൽകുക.","First set the "+TY().sub[1].toLowerCase()+" amount in Settings."))+' <span class="asBtn" onclick="tcAsGo(\'settings\')">'+E(T("സെറ്റിംഗ്സ്","Settings"))+'</span></div>'};
  var m=id?memberById(id):null;
  if(!m){
   var h='<div class="asC"><input id="tcAsCq" placeholder="'+E(T("മെമ്പറുടെ പേര് / നമ്പർ","Member name / number"))+'"><div id="tcAsCl"></div></div>';
   return {title:T(TY().sub[0]+" വാങ്ങുക","Collect "+TY().sub[1].toLowerCase()),html:h,after:function(){
    var draw=function(){ var q=v("tcAsCq").toLowerCase(), list=members().filter(function(x){ return x.status!=="l"&&(!q||(x.name+" "+(x.no||"")+" "+(x.ph||"")).toLowerCase().indexOf(q)>=0); }).slice(0,40);
     $("tcAsCl").innerHTML=list.map(function(x){ var d=dues(x).length; return '<div class="asR" onclick="tcAsGo(\'collect\',\''+x.id+'\')"><div style="width:34px;font-weight:800;color:#0b6f7d">'+E(x.no||"")+'</div><div style="flex:1">'+E(x.name)+'<div class="asM">'+E(areaOf(x))+'</div></div>'+(d?'<span class="asBd" style="background:#fdecec;color:#a12d2d">'+d+'</span>':'')+'</div>'; }).join("")||'<div class="asM">'+E(T("മെമ്പർ ഇല്ല","No member"))+'</div>'; };
    $("tcAsCq").oninput=draw; draw(); try{ $("tcAsCq").focus(); }catch(e){}
   }};
  }
  var d=dues(m), paid=paidSet(m.id), fut=[], p=perNext(curPer()); while(fut.length<12){ if(!paid[p]) fut.push(p); p=perNext(p); }
  var opts=d.concat(fut), pre={}; (d.length?d.slice(0,1):fut.slice(0,1)).forEach(function(x){ pre[x]=1; });
  var h='<div class="asC"><div style="font-weight:800">'+E(m.name)+'</div><div class="asM">'+E(T("നമ്പർ","No.")+" "+(m.no||"-")+" · "+money(memAmt(m))+" / "+perWord(c.per)+(extraLine(m)?" · "+extraLine(m):""))+'</div>'+
   '<label>'+E(T("ഏതൊക്കെ "+perWord(c.per),"Which "+perWord(c.per)+"s"))+' <span style="color:#a12d2d">('+E(d.length?d.length+" "+T("ബാക്കി","due"):T("ബാക്കിയില്ല - മുൻകൂർ","nothing due - advance"))+')</span></label><div id="tcAsPer">'+
   opts.map(function(x){ var due=d.indexOf(x)>=0; return '<span class="asCh'+(pre[x]?' on':'')+'" data-p="'+x+'" style="'+(due?'border-color:#e3a3a3':'')+'" onclick="this.classList.toggle(\'on\');tcAsAmt()">'+E(perLabel(x))+'</span>'; }).join("")+'</div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തുക","Amount"))+'</label><input id="tcAsCa" type="number" inputmode="numeric"></div><div style="flex:1"><label>'+E(T("തീയതി","Date"))+'</label><input id="tcAsCd" type="date" value="'+today()+'"></div></div>'+
   '<div>'+chips("cmd",[["c",T("കാഷ്","Cash")],["u","UPI"],["b",T("ബാങ്ക്","Bank")]],"c")+'</div>'+
   '<span class="asBtn g" onclick="tcAsSavePay(\''+m.id+'\')">'+E(T("സേവ് ചെയ്ത് രസീത്","Save & receipt"))+'</span></div>';
  return {title:T(TY().sub[0]+" വാങ്ങുക","Collect "+TY().sub[1].toLowerCase()),html:h,after:function(){ curAmt=memAmt(m); window.tcAsAmt(); }};
 };
 var curAmt=0;
 window.tcAsAmt=function(){ var n=document.querySelectorAll("#tcAsPer .asCh.on").length, a=$("tcAsCa"); if(a) a.value=Math.round(n*curAmt*100)/100; };
 window.tcAsSavePay=function(mid){
  var a=A(), per=[].map.call(document.querySelectorAll("#tcAsPer .asCh.on"),function(e){ return e.getAttribute("data-p"); }).sort(), amt=+v("tcAsCa");
  if(!per.length){ say(T("മാസം / വർഷം തിരഞ്ഞെടുക്കുക","Choose the months / years")); return; }
  if(!(amt>0)){ say(T("തുക നൽകുക","Enter the amount")); return; }
  var p={id:uid(),mid:mid,periods:per,amt:Math.round(amt*100)/100,mode:chipVal("cmd")||"c",date:v("tcAsCd")||today(),rc:a.cloud?"":(a.cfg.prefix||"R")+"-"+(a.cfg.nextRc||1),com:comOf(memberById(mid))};   /* in the cloud the server gives the number */
  if(!a.cloud) a.cfg.nextRc=(+a.cfg.nextRc||1)+1; a.pays.push(p); op("pay",p); sv(); say(T("വരിസംഖ്യ സേവ് ചെയ്തു","Subscription saved")); go("receipt",p.id,true);
 };

 /* ---------- receipt ---------- */
 function payById(id){ return A().pays.filter(function(p){ return p.id===id; })[0]||null; }
 function receiptText(p){
  var m=memberById(p.mid)||{name:"?"};
  return orgName()+"\n"+T("രസീത്","RECEIPT")+" "+(p.rc||T("(നമ്പർ സിങ്ക് ആയ ശേഷം)","(number after sync)"))+"   "+dmy(p.date)+"\n"+T("ലഭിച്ചത്","Received from")+": "+m.name+(m.no?" ("+T("നമ്പർ","No.")+" "+m.no+")":"")+"\n"+
   (TY().house&&m.hno?T("വീട്","House")+": "+m.hno+"\n":"")+(TY().veh&&vehs(m).length?T("വണ്ടികൾ","Vehicles")+": "+vehs(m).length+"\n":"")+subName()+": "+(p.periods||[]).map(perLabel).join(", ")+"\n"+T("തുക","Amount")+": "+money(p.amt)+" ("+modeTxt(p.mode)+")\n"+T("നന്ദി","Thank you")+" - "+T("ട്രഷറർ","Treasurer");
 }
 SC.receipt=function(id){
  var p=payById(id); if(!p) return {html:""}; var m=memberById(p.mid)||{};
  var h='<div class="asC" style="white-space:pre-line;font-family:inherit;line-height:1.55;border:1px dashed #9cc">'+E(receiptText(p))+'</div>'+
   '<div class="asC">'+(m.ph?'<a class="asBtn g" target="_blank" rel="noopener" href="'+E(wa(m.ph,receiptText(p)))+'">WhatsApp</a>':'')+
   '<span class="asBtn l" onclick="tcAsPrint(\''+p.id+'\')">'+E(T("പ്രിന്റ്","Print"))+'</span><span class="asBtn l" onclick="tcAsGo(\'member\',\''+p.mid+'\')">'+E(T("മെമ്പർ","Member"))+'</span>'+
   (p.del?'<div class="asM" style="color:#a12d2d">'+E(T("റദ്ദാക്കിയ രസീത്","Cancelled receipt"))+'</div>':'<span class="asBtn r" onclick="tcAsDelPay(\''+p.id+'\')">'+E(T("റദ്ദാക്കുക","Cancel receipt"))+'</span>')+'</div>';
  return {title:T("രസീത്","Receipt")+" "+(p.rc||""),html:h};
 };
 window.tcAsDelPay=function(id){ var p=payById(id); if(!p||!confirm(T("ഈ രസീത് റദ്ദാക്കട്ടെ? തുക കണക്കിൽ നിന്ന് മാറും.","Cancel this receipt? The amount leaves the accounts."))) return; p.del=today(); op("pay",p,true); sv(); say(T("റദ്ദാക്കി","Cancelled")); back(); };
 window.tcAsPrint=function(id){ var p=payById(id); if(p) printHtml('<pre style="font:15px/1.6 sans-serif;white-space:pre-wrap">'+E(receiptText(p))+'</pre>'); };
 function printHtml(body){
  var f=document.createElement("iframe"); f.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0"; document.body.appendChild(f);
  var d=f.contentWindow.document; d.open(); d.write('<!doctype html><html><head><meta charset="utf-8"><title>'+E(orgName())+'</title></head><body style="font-family:sans-serif">'+body+'</body></html>'); d.close();
  setTimeout(function(){ try{ f.contentWindow.focus(); f.contentWindow.print(); }catch(e){} setTimeout(function(){ try{ f.remove(); }catch(e){} },2000); },300);
 }

 /* ---------- dues list ---------- */
 var dArea="";
 SC.dues=function(){
  var c=A().cfg, list=members().filter(function(m){ return m.status!=="l"&&(!dArea||areaOf(m)===dArea); }).map(function(m){ return {m:m,d:dues(m)}; }).filter(function(x){ return x.d.length; });
  list.sort(function(a,b){ return b.d.length-a.d.length; });
  var areas=[]; members().forEach(function(m){ var ar=areaOf(m); if(ar&&areas.indexOf(ar)<0) areas.push(ar); });
  var tot=list.reduce(function(s,x){ return s+x.d.length*memAmt(x.m); },0);
  var h='<div class="asC"><div style="font-weight:700">'+E(list.length+" "+T("പേർ","members")+" · "+T("ആകെ ബാക്കി","total due")+" "+money(tot))+'</div>'+
   (areas.length?'<div>'+areaPick("dar",areas,dArea)+'</div>':'')+
   (list.length?'<span class="asBtn l" onclick="tcAsShareDues()">'+E(T("ലിസ്റ്റ് ഷെയർ ചെയ്യുക","Share the list"))+'</span>':'')+'</div><div class="asC">'+
   (list.length?list.map(function(x){ var m=x.m; return '<div class="asR"><div style="flex:1;min-width:0" onclick="tcAsGo(\'member\',\''+m.id+'\')"><div style="font-weight:700">'+E((m.no?m.no+". ":"")+m.name)+'</div><div class="asM">'+E((areaOf(m)?areaOf(m)+" · ":"")+x.d.length+" × "+money(memAmt(m))+" = "+money(x.d.length*memAmt(m)))+'</div></div>'+
    (m.ph?'<a class="asBtn l" style="margin:0" target="_blank" rel="noopener" href="'+E(wa(m.ph,remindText(m,x.d)))+'">WhatsApp</a>':'')+'</div>'; }).join(""):'<div class="asM">'+E(T("ആർക്കും ബാക്കിയില്ല ✓","Nobody has dues ✓"))+'</div>')+'</div>';
  return {title:T("അടയ്ക്കാത്തവർ","Dues list"),html:h,after:function(){ window.tcAsChip_dar=function(x){ dArea=x; render(); }; }};
 };
 window.tcAsShareDues=function(){
  var c=A().cfg, t=orgName()+" - "+T(TY().sub[0]+" ബാക്കി",TY().sub[1].toLowerCase()+" dues")+" ("+dmy(today())+")\n"+members().filter(function(m){ return m.status!=="l"&&(!dArea||areaOf(m)===dArea); }).map(function(m){ var d=dues(m); return d.length?((m.no?m.no+". ":"")+m.name+(areaOf(m)?" ("+areaOf(m)+")":"")+" - "+money(d.length*memAmt(m))):""; }).filter(Boolean).join("\n");
  try{ if(navigator.share){ navigator.share({text:t}).catch(function(){}); return; } }catch(e){}
  location.href="https://wa.me/?text="+encodeURIComponent(t);
 };

 /* ---------- the dashboard card ---------- */
 (function(){
  var tm=0;
  function place(){
   var u=null; try{ u=getCurrentUser(); }catch(e){}
   var c=$("tcAsCard"), pb=$("partnerBox"), msg=pb?pb.querySelector("#tcMsgCard"):null;
   if(!(u&&u.role!=="customer"&&biz()===TYPE&&msg&&location.hash!=="#previewcustomer")){ if(c) c.remove(); return; }
   if(!c){ c=document.createElement("div"); c.id="tcAsCard"; c.setAttribute("onclick","tcAssocOpen()");
    c.innerHTML='<div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">&#128101;</div>'+
     '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:17px">'+E(T("സംഘടനാ പുസ്തകം","Association book"))+'</div><div style="font-size:12.5px;opacity:.95;line-height:1.35">'+E(T("മെമ്പർമാർ, വരിസംഖ്യ, രസീത്, വരവ്-ചെലവ്, മിനിറ്റ്സ്","Members, subscription, receipts, ledger, minutes"))+'</div></div><div style="font-size:22px">&#8250;</div>'; }
   if(c.nextElementSibling!==msg||c.parentNode!==msg.parentNode) msg.parentNode.insertBefore(c,msg);   /* directly ABOVE Messages (the Share card stays directly below it) */
  }
  function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ place(); }catch(e){ if(window.console) console.error("tc-assoc card",e); } },120); }
  function start(){ var app=$("app"); if(!app||!window.MutationObserver) return; new MutationObserver(later).observe(app,{childList:true,subtree:true}); later(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();
 window.tcAssocOpen=function(n,a){ open(n||"home",a); };
 /* for part 2 (tc-assoc2.js) and the tests */
 window.__tcAs={TYPES:TYPES,TY:TY,TYc:TYc,subName:subName,areaName:areaName,perWord:perWord,vehs:vehs,memAmt:memAmt,memAmtC:memAmtC,duesC:duesC,startPer:startPer,saved:saved,extraLine:extraLine,isoWeek:isoWeek,A:A,sv:sv,uid:uid,today:today,dmy:dmy,money:money,perOf:perOf,curPer:curPer,perLabel:perLabel,perNext:perNext,perList:perList,live:live,members:members,memberById:memberById,
  paidSet:paidSet,dues:dues,orgName:orgName,coms:coms,comMap:comMap,comOf:comOf,kidsOf:kidsOf,subOf:subOf,myRoots:myRoots,myRoot:myRoot,scopeSet:scopeSet,comName:comName,comPath:comPath,comChoices:comChoices,comSelect:comSelect,comVal:comVal,areaOf:areaOf,areaPick:areaPick,mFilter:mFilter,setDArea:function(x){ dArea=x||""; },premOk:premOk,freeLimit:freeLimit,screen:function(n,f){ SC[n]=f; },go:go,back:back,render:render,close:close,v:v,chips:chips,chipVal:chipVal,
  tile:tile,E:E,T:T,say:say,op:op,canWrite:canWrite,setPid:function(p){ PIDO=p?String(p):""; },pid:pid,open:open,modeTxt:modeTxt,actTxt:actTxt,printHtml:printHtml,wa:wa,biz:biz,TYPE:TYPE,planLvl:planLvl,planLimit:planLimit,isOpen:function(){ return S.open; }};
})();
