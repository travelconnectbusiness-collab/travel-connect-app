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
  ["members","pays","led","mins","acts"].forEach(function(x){ if(!Array.isArray(a[x])) a[x]=[]; });
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
 function perOf(date,per){ date=String(date||today()); return per==="y"?date.slice(0,4):date.slice(0,7); }
 function curPer(){ return perOf(today(),A().cfg.per); }
 function perLabel(p){ p=String(p||""); if(p.length===4) return p; var m=+p.slice(5,7)-1; return T(MNML[m],MN[m])+" "+p.slice(0,4); }
 function perNext(p){ if(p.length===4) return String(+p+1); var y=+p.slice(0,4), m=+p.slice(5,7)+1; if(m>12){ m=1; y++; } return y+"-"+("0"+m).slice(-2); }
 function perList(from,to){ var out=[], p=from, n=0; if(!from||!to||from>to) return out; while(p<=to&&n<600){ out.push(p); p=perNext(p); n++; } return out; }
 function live(arr){ return arr.filter(function(x){ return !x.del; }); }
 function members(){ return live(A().members).sort(function(a,b){ return (+a.no||0)-(+b.no||0); }); }
 function memberById(id){ return A().members.filter(function(m){ return m.id===id; })[0]||null; }
 function paidSet(mid){ var s={}; live(A().pays).forEach(function(p){ if(p.mid===mid) (p.periods||[]).forEach(function(x){ s[x]=1; }); }); return s; }
 /* periods this member still has to pay: from the later of (book start, joining) to now; members who left owe nothing new */
 function dues(m,upto){
  var c=A().cfg; if(!m||m.status==="l"||!(+c.amt>0)) return [];
  var st=c.start||perOf(m.joined||today(),c.per), j=perOf(m.joined||st,c.per); if(c.per==="m"&&st.length===4) st=st+"-01"; if(c.per==="y"&&st.length>4) st=st.slice(0,4);
  var from=j>st?j:st, paid=paidSet(m.id);
  return perList(from,upto||curPer()).filter(function(p){ return !paid[p]; });
 }
 function orgName(){ var c=A().cfg, p=window._myPartner; return c.org||(p&&p.business_name)||T("സംഘടന","Association"); }
 function freeLimit(){ var n=25; try{ var v=parseInt(localStorage.getItem("tc_assoc_free"),10); if(v>=0) n=v; }catch(e){} return n; }
 function premOk(){
  try{ if(typeof tcIsPlatinumPlan==="function"&&tcIsPlatinumPlan()) return true; }catch(e){}
  var s=(DB()||{}).settings||{};
  if(s.myPlan==="owner_free"||s.myPlan==="owner_plus") return true;
  if(s.myPlan!=="premium") return false;
  return !s.myPlanExpiresAt||new Date(s.myPlanExpiresAt).getTime()>Date.now();
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
  if(!(+c.amt>0)&&canWrite()) h+='<div class="asC" style="background:#fff6df;color:#7a4f00;font-weight:600">'+E(T("ആദ്യം വരിസംഖ്യ തുകയും കാലയളവും സെറ്റ് ചെയ്യുക.","First set the subscription amount and period."))+' <span class="asBtn" onclick="tcAsGo(\'settings\')">'+E(T("സെറ്റിംഗ്സ്","Settings"))+'</span></div>';
  h+='<div class="asC"><div style="font-weight:800;font-size:16px">'+E(orgName())+'</div><div class="asM">'+E(+c.amt>0?(T("വരിസംഖ്യ","Subscription")+": "+money(c.amt)+" / "+(c.per==="y"?T("വർഷം","year"):T("മാസം","month"))):"")+'</div>'+
   '<div style="display:flex;gap:8px;margin-top:10px;text-align:center">'+
   '<div style="flex:1;background:#f4f7f8;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:18px">'+act.length+'</div><div class="asM">'+E(T("മെമ്പർമാർ","Members"))+'</div></div>'+
   '<div style="flex:1;background:#eef8f0;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:18px;color:#1c6b2c">'+paidNow+'</div><div class="asM">'+E(perLabel(cp)+" "+T("അടച്ചു","paid"))+'</div></div>'+
   '<div style="flex:1;background:#fdecec;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:18px;color:#a12d2d">'+dueN+'</div><div class="asM">'+E(T("ബാക്കിയുള്ളവർ","With dues"))+'</div></div></div>'+
   (bal?'<div class="asM" style="margin-top:8px">'+E(T("ബാക്കി","Balance"))+': <b style="color:#0b4f5a">'+money(bal.cash+bal.bank)+'</b> ('+E(T("കയ്യിൽ","cash"))+' '+money(bal.cash)+' · '+E(T("ബാങ്ക്","bank"))+' '+money(bal.bank)+')</div>':'')+'</div>';
  h+='<div class="asG">'+tile("&#128176;",T("വരിസംഖ്യ വാങ്ങുക","Collect subscription"),"tcAsGo('collect')","",true,1)+tile("&#9888;&#65039;",T("അടയ്ക്കാത്തവർ","Dues list"),"tcAsGo('dues')",dueN+" "+T("പേർ","members"))+
   tile("&#128101;",T("മെമ്പർമാർ","Members"),"tcAsGo('members')",act.length+"")+tile("&#128210;",T("വരവ്-ചെലവ്","Ledger"),"tcAsGo('ledger')")+
   tile("&#128221;",T("മിനിറ്റ്സ് / നടപടി","Minutes & actions"),"tcAsGo('minutes')")+tile("&#128202;",T("റിപ്പോർട്ട്","Reports"),"tcAsGo('reports')")+
   tile("&#9881;&#65039;",T("സെറ്റിംഗ്സ്","Settings"),"tcAsGo('settings')","",false,1)+(typeof window.__tcAsHomeTiles==="function"?window.__tcAsHomeTiles():"")+'</div>';
  if(!premOk()&&!a.cloud) h+='<div class="asM" style="text-align:center">'+E(T(freeLimit()+" മെമ്പർ വരെ സൗജന്യം. കൂടുതൽ മെമ്പർമാർക്ക് Premium / Platinum (Menu › Verification & Plan).",
   "Free up to "+freeLimit()+" members. More members: Premium / Platinum (Menu › Verification & Plan)."))+'</div>';
  return {title:T("സംഘടനാ പുസ്തകം","Association book"),html:h};
 };
 window.tcAsGo=function(n,a){ if(!S.open||!$("tcAs")){ open(n,a); return; } go(n,a); };

 /* ---------- members ---------- */
 var mFilter={q:"",area:""};
 SC.members=function(){
  var a=A(), ms=members(), areas=(a.cfg.areas||[]).slice();
  ms.forEach(function(m){ if(m.area&&areas.indexOf(m.area)<0) areas.push(m.area); });
  var h='<div class="asC"><input id="tcAsMq" placeholder="'+E(T("പേര്, ഫോൺ, നമ്പർ തിരയുക","Search name, phone, number"))+'" value="'+E(mFilter.q)+'">'+
   (areas.length?'<div>'+chips("mar",[["",T("എല്ലാം","All")]].concat(areas.map(function(x){ return [x,x]; })),mFilter.area)+'</div>':'')+
   '<span class="asBtn" data-w="1" onclick="tcAsGo(\'mform\')">+ '+E(T("മെമ്പറെ ചേർക്കുക","Add member"))+'</span></div><div class="asC" id="tcAsMl"></div>';
  return {title:T("മെമ്പർമാർ","Members"),html:h,after:function(){
   var draw=function(){
    var q=mFilter.q.toLowerCase(), list=members().filter(function(m){ return (!mFilter.area||m.area===mFilter.area)&&(!q||(m.name+" "+(m.ph||"")+" "+(m.no||"")+" "+(m.veh||"")).toLowerCase().indexOf(q)>=0); });
    $("tcAsMl").innerHTML=list.length?list.map(function(m){ var d=dues(m).length;
     return '<div class="asR" onclick="tcAsGo(\'member\',\''+m.id+'\')"><div style="width:38px;font-weight:800;color:#0b6f7d">'+E(m.no||"")+'</div><div style="flex:1;min-width:0"><div style="font-weight:700">'+E(m.name)+' '+stBadge(m)+'</div><div class="asM">'+E([m.area,m.ph].filter(Boolean).join(" · "))+'</div></div>'+
      (d?'<span class="asBd" style="background:#fdecec;color:#a12d2d">'+d+' '+E(T("ബാക്കി","due"))+'</span>':'<span class="asBd" style="background:#eef8f0;color:#1c6b2c">&#10003;</span>')+'</div>'; }).join(""):'<div class="asM">'+E(T("മെമ്പർമാർ ഇല്ല.","No members yet."))+'</div>';
   };
   window.tcAsChip_mar=function(x){ mFilter.area=x; draw(); };
   $("tcAsMq").oninput=function(){ mFilter.q=this.value; draw(); }; draw();
  }};
 };
 SC.mform=function(id){
  var a=A(), m=id?memberById(id):null, n=m||{no:String(a.cfg.nextNo||(members().length+1)),joined:today(),status:"a"};
  var areas=(a.cfg.areas||[]).map(function(x){ return '<option value="'+E(x)+'">'; }).join("");
  var h='<div class="asC"><label>'+E(T("പേര് *","Name *"))+'</label><input id="tcAsFn" value="'+E(n.name||"")+'">'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("ഫോൺ","Phone"))+'</label><input id="tcAsFp" type="tel" value="'+E(n.ph||"")+'"></div><div style="width:34%"><label>'+E(T("മെമ്പർ നമ്പർ","Member no."))+'</label><input id="tcAsFno" value="'+E(n.no||"")+'"></div></div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("ഏരിയ / യൂണിറ്റ്","Area / unit"))+'</label><input id="tcAsFa" list="tcAsAreas" value="'+E(n.area||"")+'"><datalist id="tcAsAreas">'+areas+'</datalist></div><div style="flex:1"><label>'+E(T("ചേർന്ന തീയതി","Joined on"))+'</label><input id="tcAsFj" type="date" value="'+E(n.joined||"")+'"></div></div>'+
   '<details'+(m&&(m.veh||m.note||m.status!=="a")?' open':'')+'><summary class="asM" style="margin-top:8px;cursor:pointer">'+E(T("കൂടുതൽ (വണ്ടി നമ്പർ, കുറിപ്പ്, നില)","More (vehicle no., note, status)"))+'</summary>'+
   '<label>'+E(T("വണ്ടി നമ്പർ","Vehicle no."))+'</label><input id="tcAsFv" value="'+E(n.veh||"")+'"><label>'+E(T("കുറിപ്പ്","Note"))+'</label><input id="tcAsFnt" value="'+E(n.note||"")+'">'+
   '<label>'+E(T("നില","Status"))+'</label><div>'+chips("mst",[["a",T("സജീവം","Active")],["s",T("സസ്പെൻഡ്","Suspended")],["l",T("ഒഴിവായി","Left")]],n.status||"a")+'</div></details>'+
   '<span class="asBtn g" onclick="tcAsSaveMember(\''+(m?m.id:"")+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span>'+(m?'<span class="asBtn r" onclick="tcAsDelMember(\''+m.id+'\')">'+E(T("നീക്കം ചെയ്യുക","Remove"))+'</span>':'')+'</div>';
  return {title:m?T("മെമ്പർ മാറ്റുക","Edit member"):T("പുതിയ മെമ്പർ","New member"),html:h};
 };
 window.tcAsSaveMember=function(id){
  var a=A(), name=v("tcAsFn"); if(!name){ say(T("പേര് നൽകുക","Enter the name")); return; }
  var m=id?memberById(id):null;
  var lim=a.cloud&&a.limits?a.limits.members:(premOk()?1e9:freeLimit());
  if(!m&&members().length>=lim){ say(a.cloud?T("ഈ പ്ലാനിൽ "+lim+" മെമ്പർ വരെ - കൂടുതലിന് പ്ലാൻ മാറ്റുക.","This plan allows "+lim+" members - change the plan for more."):T(freeLimit()+" മെമ്പർ വരെ സൗജന്യം - കൂടുതൽ ചേർക്കാൻ Premium / Platinum എടുക്കുക (Menu › Verification & Plan).","Free up to "+freeLimit()+" members - take Premium / Platinum to add more (Menu › Verification & Plan).")); return; }
  var no=v("tcAsFno"); if(no&&members().some(function(x){ return x.no===no&&(!m||x.id!==m.id); })){ say(T("ഈ മെമ്പർ നമ്പർ വേറെ ഒരാൾക്കുണ്ട്","This member number is already used")); return; }
  if(!m){ m={id:uid(),created:today()}; a.members.push(m); }
  m.name=name.slice(0,80); m.ph=v("tcAsFp").slice(0,20); m.no=no.slice(0,12); m.area=v("tcAsFa").slice(0,40); m.joined=v("tcAsFj")||today(); m.veh=v("tcAsFv").slice(0,20); m.note=v("tcAsFnt").slice(0,200); m.status=chipVal("mst")||m.status||"a";
  if(m.area&&(a.cfg.areas||[]).indexOf(m.area)<0){ a.cfg.areas=(a.cfg.areas||[]).concat([m.area]); }
  var nn=parseInt(m.no,10); if(nn>=(+a.cfg.nextNo||1)) a.cfg.nextNo=nn+1;
  op("member",m); sv(); say(T("സേവ് ചെയ്തു","Saved")); go("member",m.id,true);
 };
 window.tcAsDelMember=function(id){ var m=memberById(id); if(!m) return; if(!confirm(T(m.name+" - നീക്കം ചെയ്യട്ടെ? (അടവുകൾ കണക്കിൽ തുടരും)",m.name+" - remove? (payments stay in the accounts)"))) return; m.del=today(); op("member",m,true); sv(); S.stack.pop(); go("members",null,true); };
 SC.member=function(id){
  var m=memberById(id); if(!m) return {html:""};
  var d=dues(m), c=A().cfg, pays=live(A().pays).filter(function(p){ return p.mid===id; }).sort(function(a,b){ return a.date<b.date?1:-1; }), acts=live(A().acts).filter(function(x){ return x.mid===id; });
  var h='<div class="asC"><div style="font-weight:800;font-size:17px">'+E(m.name)+' '+stBadge(m)+'</div><div class="asM">'+E(T("നമ്പർ","No.")+" "+(m.no||"-")+(m.area?" · "+m.area:"")+" · "+T("ചേർന്നത്","joined")+" "+dmy(m.joined)+(m.veh?" · "+m.veh:""))+'</div>'+(m.note?'<div class="asM">'+E(m.note)+'</div>':'')+
   (m.ph?'<a class="asBtn l" href="tel:'+E(phone10(m.ph)||m.ph)+'">&#128222; '+E(m.ph)+'</a>':'')+'<span class="asBtn l" data-w="1" onclick="tcAsGo(\'mform\',\''+id+'\')">'+E(T("മാറ്റുക","Edit"))+'</span></div>';
  h+='<div class="asC"><div style="font-weight:700">'+E(T("ബാക്കി വരിസംഖ്യ","Subscription due"))+': <span style="color:'+(d.length?"#a12d2d":"#1c6b2c")+'">'+(d.length?d.length+" × "+money(c.amt)+" = "+money(d.length*c.amt):T("ഇല്ല ✓","none ✓"))+'</span></div>'+
   (d.length?'<div class="asM">'+E(d.slice(0,12).map(perLabel).join(", ")+(d.length>12?" …":""))+'</div>':'')+
   '<span class="asBtn g" onclick="tcAsGo(\'collect\',\''+id+'\')">&#128176; '+E(T("വരിസംഖ്യ വാങ്ങുക","Collect"))+'</span>'+
   (d.length&&m.ph?'<a class="asBtn l" target="_blank" rel="noopener" href="'+E(wa(m.ph,remindText(m,d)))+'">'+E(T("WhatsApp ഓർമ്മപ്പെടുത്തൽ","WhatsApp reminder"))+'</a>':'')+
   '<span class="asBtn l" data-w="1" onclick="tcAsGo(\'aform\',\''+id+'\')">'+E(T("നടപടി ചേർക്കുക","Add action"))+'</span></div>';
  h+='<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("അടവുകൾ","Payments"))+'</div>'+(pays.length?pays.map(function(p){
   return '<div class="asR" onclick="tcAsGo(\'receipt\',\''+p.id+'\')"><div style="flex:1"><div>'+E((p.periods||[]).map(perLabel).join(", "))+'</div><div class="asM">'+E(dmy(p.date)+" · "+(p.rc||"")+" · "+modeTxt(p.mode))+'</div></div><b>'+money(p.amt)+'</b></div>'; }).join(""):'<div class="asM">'+E(T("ഇല്ല","None"))+'</div>')+'</div>';
  if(acts.length) h+='<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("നടപടികൾ","Actions"))+'</div>'+acts.map(function(x){ return '<div class="asR"><div style="flex:1"><div>'+E(actTxt(x.type)+(x.amt>0?" · "+money(x.amt):""))+'</div><div class="asM">'+E(dmy(x.date)+(x.note?" · "+x.note:""))+'</div></div></div>'; }).join("")+'</div>';
  return {title:m.name,html:h};
 };
 function modeTxt(md){ return md==="b"?T("ബാങ്ക്","Bank"):(md==="u"?"UPI":T("കാഷ്","Cash")); }
 function actTxt(t){ return {warn:T("താക്കീത്","Warning"),fine:T("പിഴ","Fine"),susp:T("സസ്പെൻഷൻ","Suspension")}[t]||T("മറ്റുള്ളവ","Other"); }
 function remindText(m,d){ var c=A().cfg; return T("നമസ്കാരം "+m.name+", "+orgName()+" വരിസംഖ്യ ബാക്കി: "+d.map(perLabel).join(", ")+" - ആകെ "+money(d.length*c.amt)+". ദയവായി അടയ്ക്കുക. നന്ദി.",
  "Hello "+m.name+", "+orgName()+" subscription due: "+d.map(perLabel).join(", ")+" - total "+money(d.length*c.amt)+". Please pay. Thank you."); }

 /* ---------- collect subscription ---------- */
 SC.collect=function(id){
  var c=A().cfg; if(!(+c.amt>0)) return {title:T("വരിസംഖ്യ വാങ്ങുക","Collect subscription"),html:'<div class="asC">'+E(T("ആദ്യം സെറ്റിംഗ്സിൽ വരിസംഖ്യ തുക നൽകുക.","First set the subscription amount in Settings."))+' <span class="asBtn" onclick="tcAsGo(\'settings\')">'+E(T("സെറ്റിംഗ്സ്","Settings"))+'</span></div>'};
  var m=id?memberById(id):null;
  if(!m){
   var h='<div class="asC"><input id="tcAsCq" placeholder="'+E(T("മെമ്പറുടെ പേര് / നമ്പർ","Member name / number"))+'"><div id="tcAsCl"></div></div>';
   return {title:T("വരിസംഖ്യ വാങ്ങുക","Collect subscription"),html:h,after:function(){
    var draw=function(){ var q=v("tcAsCq").toLowerCase(), list=members().filter(function(x){ return x.status!=="l"&&(!q||(x.name+" "+(x.no||"")+" "+(x.ph||"")).toLowerCase().indexOf(q)>=0); }).slice(0,40);
     $("tcAsCl").innerHTML=list.map(function(x){ var d=dues(x).length; return '<div class="asR" onclick="tcAsGo(\'collect\',\''+x.id+'\')"><div style="width:34px;font-weight:800;color:#0b6f7d">'+E(x.no||"")+'</div><div style="flex:1">'+E(x.name)+'<div class="asM">'+E(x.area||"")+'</div></div>'+(d?'<span class="asBd" style="background:#fdecec;color:#a12d2d">'+d+'</span>':'')+'</div>'; }).join("")||'<div class="asM">'+E(T("മെമ്പർ ഇല്ല","No member"))+'</div>'; };
    $("tcAsCq").oninput=draw; draw(); try{ $("tcAsCq").focus(); }catch(e){}
   }};
  }
  var d=dues(m), paid=paidSet(m.id), fut=[], p=perNext(curPer()); while(fut.length<12){ if(!paid[p]) fut.push(p); p=perNext(p); }
  var opts=d.concat(fut), pre={}; (d.length?d.slice(0,1):fut.slice(0,1)).forEach(function(x){ pre[x]=1; });
  var h='<div class="asC"><div style="font-weight:800">'+E(m.name)+'</div><div class="asM">'+E(T("നമ്പർ","No.")+" "+(m.no||"-")+" · "+money(c.amt)+" / "+(c.per==="y"?T("വർഷം","year"):T("മാസം","month")))+'</div>'+
   '<label>'+E(T("ഏതൊക്കെ "+(c.per==="y"?"വർഷം":"മാസം"),"Which "+(c.per==="y"?"years":"months")))+' <span style="color:#a12d2d">('+E(d.length?d.length+" "+T("ബാക്കി","due"):T("ബാക്കിയില്ല - മുൻകൂർ","nothing due - advance"))+')</span></label><div id="tcAsPer">'+
   opts.map(function(x){ var due=d.indexOf(x)>=0; return '<span class="asCh'+(pre[x]?' on':'')+'" data-p="'+x+'" style="'+(due?'border-color:#e3a3a3':'')+'" onclick="this.classList.toggle(\'on\');tcAsAmt()">'+E(perLabel(x))+'</span>'; }).join("")+'</div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തുക","Amount"))+'</label><input id="tcAsCa" type="number" inputmode="numeric"></div><div style="flex:1"><label>'+E(T("തീയതി","Date"))+'</label><input id="tcAsCd" type="date" value="'+today()+'"></div></div>'+
   '<div>'+chips("cmd",[["c",T("കാഷ്","Cash")],["u","UPI"],["b",T("ബാങ്ക്","Bank")]],"c")+'</div>'+
   '<span class="asBtn g" onclick="tcAsSavePay(\''+m.id+'\')">'+E(T("സേവ് ചെയ്ത് രസീത്","Save & receipt"))+'</span></div>';
  return {title:T("വരിസംഖ്യ വാങ്ങുക","Collect subscription"),html:h,after:function(){ window.tcAsAmt(); }};
 };
 window.tcAsAmt=function(){ var n=document.querySelectorAll("#tcAsPer .asCh.on").length, a=$("tcAsCa"); if(a) a.value=n*(+A().cfg.amt||0); };
 window.tcAsSavePay=function(mid){
  var a=A(), per=[].map.call(document.querySelectorAll("#tcAsPer .asCh.on"),function(e){ return e.getAttribute("data-p"); }).sort(), amt=+v("tcAsCa");
  if(!per.length){ say(T("മാസം / വർഷം തിരഞ്ഞെടുക്കുക","Choose the months / years")); return; }
  if(!(amt>0)){ say(T("തുക നൽകുക","Enter the amount")); return; }
  var p={id:uid(),mid:mid,periods:per,amt:Math.round(amt*100)/100,mode:chipVal("cmd")||"c",date:v("tcAsCd")||today(),rc:a.cloud?"":(a.cfg.prefix||"R")+"-"+(a.cfg.nextRc||1)};   /* in the cloud the server gives the number */
  if(!a.cloud) a.cfg.nextRc=(+a.cfg.nextRc||1)+1; a.pays.push(p); op("pay",p); sv(); say(T("വരിസംഖ്യ സേവ് ചെയ്തു","Subscription saved")); go("receipt",p.id,true);
 };

 /* ---------- receipt ---------- */
 function payById(id){ return A().pays.filter(function(p){ return p.id===id; })[0]||null; }
 function receiptText(p){
  var m=memberById(p.mid)||{name:"?"};
  return orgName()+"\n"+T("രസീത്","RECEIPT")+" "+(p.rc||T("(നമ്പർ സിങ്ക് ആയ ശേഷം)","(number after sync)"))+"   "+dmy(p.date)+"\n"+T("ലഭിച്ചത്","Received from")+": "+m.name+(m.no?" ("+T("നമ്പർ","No.")+" "+m.no+")":"")+"\n"+
   T("വരിസംഖ്യ","Subscription")+": "+(p.periods||[]).map(perLabel).join(", ")+"\n"+T("തുക","Amount")+": "+money(p.amt)+" ("+modeTxt(p.mode)+")\n"+T("നന്ദി","Thank you")+" - "+T("ട്രഷറർ","Treasurer");
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
  var c=A().cfg, list=members().filter(function(m){ return m.status!=="l"&&(!dArea||m.area===dArea); }).map(function(m){ return {m:m,d:dues(m)}; }).filter(function(x){ return x.d.length; });
  list.sort(function(a,b){ return b.d.length-a.d.length; });
  var areas=[]; members().forEach(function(m){ if(m.area&&areas.indexOf(m.area)<0) areas.push(m.area); });
  var tot=list.reduce(function(s,x){ return s+x.d.length*(+c.amt||0); },0);
  var h='<div class="asC"><div style="font-weight:700">'+E(list.length+" "+T("പേർ","members")+" · "+T("ആകെ ബാക്കി","total due")+" "+money(tot))+'</div>'+
   (areas.length?'<div>'+chips("dar",[["",T("എല്ലാം","All")]].concat(areas.map(function(x){ return [x,x]; })),dArea)+'</div>':'')+
   (list.length?'<span class="asBtn l" onclick="tcAsShareDues()">'+E(T("ലിസ്റ്റ് ഷെയർ ചെയ്യുക","Share the list"))+'</span>':'')+'</div><div class="asC">'+
   (list.length?list.map(function(x){ var m=x.m; return '<div class="asR"><div style="flex:1;min-width:0" onclick="tcAsGo(\'member\',\''+m.id+'\')"><div style="font-weight:700">'+E((m.no?m.no+". ":"")+m.name)+'</div><div class="asM">'+E((m.area?m.area+" · ":"")+x.d.length+" × "+money(c.amt)+" = "+money(x.d.length*c.amt))+'</div></div>'+
    (m.ph?'<a class="asBtn l" style="margin:0" target="_blank" rel="noopener" href="'+E(wa(m.ph,remindText(m,x.d)))+'">WhatsApp</a>':'')+'</div>'; }).join(""):'<div class="asM">'+E(T("ആർക്കും ബാക്കിയില്ല ✓","Nobody has dues ✓"))+'</div>')+'</div>';
  return {title:T("അടയ്ക്കാത്തവർ","Dues list"),html:h,after:function(){ window.tcAsChip_dar=function(x){ dArea=x; render(); }; }};
 };
 window.tcAsShareDues=function(){
  var c=A().cfg, t=orgName()+" - "+T("വരിസംഖ്യ ബാക്കി","subscription dues")+" ("+dmy(today())+")\n"+members().filter(function(m){ return m.status!=="l"&&(!dArea||m.area===dArea); }).map(function(m){ var d=dues(m); return d.length?((m.no?m.no+". ":"")+m.name+(m.area?" ("+m.area+")":"")+" - "+money(d.length*c.amt)):""; }).filter(Boolean).join("\n");
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
 window.__tcAs={A:A,sv:sv,uid:uid,today:today,dmy:dmy,money:money,perOf:perOf,curPer:curPer,perLabel:perLabel,perNext:perNext,perList:perList,live:live,members:members,memberById:memberById,
  paidSet:paidSet,dues:dues,orgName:orgName,premOk:premOk,freeLimit:freeLimit,screen:function(n,f){ SC[n]=f; },go:go,back:back,render:render,close:close,v:v,chips:chips,chipVal:chipVal,
  tile:tile,E:E,T:T,say:say,op:op,canWrite:canWrite,setPid:function(p){ PIDO=p?String(p):""; },pid:pid,open:open,modeTxt:modeTxt,actTxt:actTxt,printHtml:printHtml,wa:wa,biz:biz,TYPE:TYPE,isOpen:function(){ return S.open; }};
})();
