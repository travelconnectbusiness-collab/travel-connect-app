/* Shop book - PASSWORD LOCK (tc-shoplock.js, loaded by tc-regdocs.js right after tc-perslock.js).
   Owner's request (2026-10-30): the shop's stock / purchase / sales book must be kept encrypted on the server too. The shop module already computes everything on the phone
   (tc-shop.js): the server (functions/api/shop.js) is only an append-only store of small records {id, k kind, d date, ts, x payload}. So the lock is done at the phone / server border:
   - ONE password for everything: the same key as the My Accounts lock (tc-perslock.js, "Password lock" switch). Nothing new to learn, nothing new to switch on.
   - PUSH: when the server says the book is LOCKED, the payload x of every record is encrypted on the phone (AES-256-GCM, record id as additional data) and sent as
     x = {__e:1, iv, ct}. The kind (what sort of record) and the date stay readable; names, amounts, quantities, customers, suppliers do not.
   - PULL: encrypted rows are opened on the phone before the shop module sees them. The shop module (tc-shop.js, tc-shop*.js, reports, Excel ...) is NOT changed: it still
     keeps its normal copy on the phone (localStorage) and calculates everything there.
   - A phone that does not hold the key (another phone of the shop, a new phone) gets the answer {ok:false,error:"locked"} and a small password window; the right password is
     turned into the key with the salt / rounds kept on the server (public values) and the key is stored on that phone (the My Accounts lock is then on there too: one password).
   - TURNING ON (or the first time a phone with the lock already ON meets a shop book): job "on" - the old plain records on the server are read page by page and replaced by encrypted
     ones (server action reseal, 30 per call); it continues by itself after an interruption (job kept in localStorage tc_shl_job:<mobile>), new records go out encrypted at once.
     TURNING OFF: job "off" (the server first accepts plain records again, then the old encrypted ones are replaced by plain ones). CHANGING THE PASSWORD: job "change" (server gets the
     new salt; every record is opened with the old key and sealed with the new one). The old key(s) are kept in tc_shl_old:<mobile> only until the job is finished.
   - the book on the phone itself is not encrypted (phone lock / app PIN), exactly like My Accounts. A forgotten password cannot be recovered by anybody; a phone that already holds the
     book keeps its copy.
   Server state of the book (locked or not, salt, rounds) comes with every push / pull answer (lock:{locked,salt,iter}); the server refuses a plain record while the book is locked
   (locked_book), so a phone without the key can not mix plain records into a locked book. */
(function(){
 var P=window.__tcPers, SH=window.__tcShop;
 if(!P||!P.lock||!P.lock.listen||P.shopLock||!SH||!SH._S) return;
 var L=P.lock, B=P.B, E=P.E, $=P.$, me=P.me, say=P.say;
 var SL=P.shopLock={};
 var ofetch=window.fetch;
 var srv={known:false,locked:0,salt:"",iter:0};
 var running=false, asked=0, retryT=0;

 function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} return null; }
 function jobKey(){ return "tc_shl_job:"+me(); }
 function oldKey(){ return "tc_shl_old:"+me(); }
 function seenKey(){ return "tc_shl_seen:"+me(); }
 function getJob(){ try{ return JSON.parse(ls(jobKey())||"null"); }catch(e){ return null; } }
 function setJob(j){ ls(jobKey(),j?JSON.stringify(j):null); }
 function olds(){ try{ return (JSON.parse(ls(oldKey())||"[]")||[]).map(function(s){ return L.unb64(s); }); }catch(e){ return []; } }
 function addOld(raw){ if(!raw) return; var a=[]; try{ a=JSON.parse(ls(oldKey())||"[]")||[]; }catch(e){} var s=L.b64(raw); if(a.indexOf(s)<0) a.push(s); ls(oldKey(),JSON.stringify(a)); }
 function hasShop(){ try{ var S=SH._S(); return Object.keys(S.recs||{}).length>0||(S.q||[]).length>0; }catch(e){ return false; } }
 function note(j){ if(j&&j.lock){ srv.known=true; srv.locked=j.lock.locked?1:0; srv.salt=j.lock.salt||""; srv.iter=j.lock.iter||0; if(srv.locked) ls(seenKey(),"1"); } }
 function fake(j,st){ return new Response(JSON.stringify(j),{status:st||200,headers:{"Content-Type":"application/json"}}); }

 /* ---------- crypto (key = the My Accounts key) ---------- */
 var kc={};
 async function ck(raw){ var id=L.b64(raw); if(!kc[id]) kc[id]=await crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]); return kc[id]; }
 async function encX(raw,id,x){
  var k=await ck(raw), iv=crypto.getRandomValues(new Uint8Array(12));
  var ct=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv,additionalData:new TextEncoder().encode(String(id))},k,new TextEncoder().encode(JSON.stringify(x||{})));
  return {__e:1,iv:L.b64(iv),ct:L.b64(ct)};
 }
 async function decX(raw,id,x){
  var k=await ck(raw), pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:L.unb64(x.iv),additionalData:new TextEncoder().encode(String(id))},k,L.unb64(x.ct));
  return JSON.parse(new TextDecoder().decode(pt));
 }
 /* the key of this phone, only when it belongs to the salt the server knows */
 function curKey(){
  if(!L.sup()) return null;
  var mt=L.meta(), k=L.key(); if(!mt||!k) return null;
  if(srv.salt&&mt.salt!==srv.salt) return null;
  return k;
 }
 function allKeys(){ var a=[], c=curKey(); if(c) a.push(c); olds().forEach(function(o){ a.push(o); }); return a; }
 async function tryOpen(keys,id,x){
  for(var i=0;i<keys.length;i++){ try{ return {ok:true,v:await decX(keys[i],id,x)}; }catch(e){} }
  return {ok:false};
 }

 /* ---------- the border: push / pull of tc-shop.js go through here ---------- */
 async function doPush(input,init,retried){
  var body; try{ body=JSON.parse(init.body); }catch(e){ return ofetch.call(window,input,init); }
  if(srv.locked&&Array.isArray(body.records)){
   var key=curKey();
   if(!key){ askLater(); return fake({ok:false,error:"locked"},423); }
   try{
    body.records=await Promise.all(body.records.map(async function(r){
     if(r&&r.x&&r.x.__e===1) return r;
     return {id:r.id,k:r.k,d:r.d,ts:r.ts,x:await encX(key,r.id,r.x)};
    }));
   }catch(e){ return fake({ok:false,error:"lock_failed"},500); }
  }
  var res=await ofetch.call(window,input,Object.assign({},init,{body:JSON.stringify(body)}));
  var j=null; try{ j=await res.clone().json(); }catch(e){ return res; }
  note(j);
  if(res.status===409&&j&&j.error==="locked_book"&&!retried) return doPush(input,init,true);
  autoCheck();
  return res;
 }
 async function doPull(input,init){
  var res=await ofetch.call(window,input,init), j=null;
  try{ j=await res.clone().json(); }catch(e){ return res; }
  note(j);
  if(!j||!j.ok||!Array.isArray(j.rows)) return res;
  var any=j.rows.some(function(r){ return r&&r.x&&r.x.__e===1; });
  if(!any){ autoCheck(); return res; }
  {
   var keys=allKeys(), bad=0;
   if(!keys.length) bad=1;
   else{
    for(var i=0;i<j.rows.length;i++){
     var r=j.rows[i]; if(!(r&&r.x&&r.x.__e===1)) continue;
     var o=await tryOpen(keys,r.id,r.x);
     if(o.ok) r.x=o.v; else bad++;
    }
   }
   if(bad){ askLater(); return fake({ok:false,error:"locked"},423); }
  }
  autoCheck();
  return fake(j,200);
 }
 window.fetch=function(input,init){
  try{
   var u=typeof input==="string"?input:(input&&input.url)||"";
   var m=/\/api\/shop\?action=(push|pull)\b/.exec(u);
   if(m&&init&&typeof init.body==="string") return m[1]==="push"?doPush(input,init):doPull(input,init);
  }catch(e){}
  return ofetch.apply(this,arguments);
 };
 async function post(action,body){
  try{
   var r=await ofetch.call(window,"/api/shop?action="+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   var j=await r.json(); note(j); return j;
  }catch(e){ return {ok:false,error:"net"}; }
 }

 /* ---------- the jobs ---------- */
 async function runJob(){
  if(running) return;
  var job=getJob(); if(!job||!L.sup()) return;
  running=true; clearTimeout(retryT);
  var again=false;
  try{
   if(!job.srv){
    if(!srv.known) await post("pull",{since:2147483647});          /* learn the state of the book first */
    if(job.mode!=="on"&&srv.known&&!srv.locked&&!hasShop()){ setJob(null); ls(oldKey(),null); return; }   /* nothing was ever locked here */
   }
   var mt=L.meta(), cur=L.key(), target=null;
   if(job.mode!=="off"){
    if(!mt||!cur){ setJob(null); ls(oldKey(),null); running=false; return; }   /* the lock was turned off meanwhile */
    target=cur;
   }
   if(!job.srv){
    var j0=job.mode==="off"?await post("lock",{locked:false}):await post("lock",{locked:true,salt:mt.salt,iter:mt.iter});
    if(!j0.ok) throw new Error(j0.error||"lock");
    job.srv=1; setJob(job);
   }
   var openKeys=[]; if(cur) openKeys.push(cur); olds().forEach(function(o){ openKeys.push(o); });
   var since=job.cur||0, more=true, guard=0;
   while(more&&guard++<4000){
    var cj=getJob(); if(!cj||cj.id!==job.id){ again=true; break; }       /* a newer job replaced this one */
    var p=await post("pull",{since:since});
    if(!p.ok) throw new Error(p.error||"pull");
    var out=[];
    for(var i=0;i<p.rows.length;i++){
     var row=p.rows[i]; if(row.seq>since) since=row.seq;
     var x=row.x, plain=null;
     if(x&&x.__e===1){
      if(target){ try{ await decX(target,row.id,x); continue; }catch(e){} }   /* already sealed with the target key */
      var o=await tryOpen(openKeys,row.id,x);
      if(!o.ok){ job.bad=(job.bad||0)+1; continue; }
      plain=o.v;
     }else plain=x||{};
     out.push({id:row.id,ts:row.ts||"",x:target?await encX(target,row.id,plain):plain});
    }
    for(var c=0;c<out.length;c+=30){
     var rs=await post("reseal",{records:out.slice(c,c+30)});
     if(!rs.ok) throw new Error(rs.error||"reseal");
     job.done=(job.done||0)+(rs.updated||0);
    }
    job.cur=since; setJob(job); more=!!p.more;
    redraw();
   }
   if(!again){
    setJob(null); ls(oldKey(),null);
    if(job.bad) say(B("Shop book: "+job.bad+" records could not be opened with the passwords known on this phone","ഷോപ്പ് ബുക്ക്: "+job.bad+" രേഖകൾ ഈ ഫോണിലുള്ള പാസ്‌വേഡ് കൊണ്ട് തുറക്കാൻ പറ്റിയില്ല"));
    else say(job.mode==="off"?B("Shop book is unlocked","ഷോപ്പ് ബുക്ക് ലോക്ക് മാറ്റി"):B("Shop book is locked","ഷോപ്പ് ബുക്ക് ലോക്ക് ചെയ്തു"));
   }
  }catch(e){
   retryT=setTimeout(runJob,5*60*1000);
  }finally{
   running=false; redraw();
   if(again) setTimeout(runJob,50);
  }
 }
 SL.run=runJob;
 function startJob(mode){
  setJob({id:"j"+Date.now().toString(36),mode:mode,cur:0,done:0,bad:0,srv:0});
  runJob();
 }
 function redraw(){
  try{ if(P.S&&P.S.open&&P.S.screen==="backup") P.refresh(); }catch(e){}
  try{ var U=window.__tcShopUi; if(U&&U.screenName&&U.screenName()==="home") U.render(); }catch(e){}
 }

 /* the lock of this phone was turned on / off / changed, or a key arrived from a restore */
 L.listen(function(kind,info){
  try{
   if(kind==="on"||kind==="change"){ var mt0=L.meta(); if(mt0&&(srv.locked||hasShop())){ srv.salt=mt0.salt; srv.iter=mt0.iter; srv.locked=1; } }
   if(kind==="on"){ if(hasShop()){ ls(seenKey(),"1"); startJob("on"); } }
   else if(kind==="off"){ if(info.oldRaw) addOld(info.oldRaw); ls(seenKey(),"1"); if(srv.locked||!srv.known||hasShop()) startJob("off"); else ls(oldKey(),null); }
   else if(kind==="change"){ if(info.oldRaw) addOld(info.oldRaw); ls(seenKey(),"1"); if(srv.locked||!srv.known||hasShop()) startJob("change"); else ls(oldKey(),null); }
   else if(kind==="key"){ ls(seenKey(),"1"); try{ SH.sync(); }catch(e){} }
  }catch(e){}
 });
 /* this phone has the lock ON and meets a shop book that was never locked: lock it once (never again after another phone turned it off) */
 function autoCheck(){
  try{
   if(running) return;
   if(getJob()){ setTimeout(runJob,300); return; }
   if(srv.known&&!srv.locked&&L.on()&&!ls(seenKey())&&hasShop()){ ls(seenKey(),"1"); startJob("on"); }
  }catch(e){}
 }

 /* ---------- password window for a phone without the key ---------- */
 function askLater(){
  var now=Date.now(); if(now-asked<10*60*1000) return; asked=now;
  setTimeout(function(){ if(!document.hidden) showUnlock(); },200);
 }
 /* a record of the book that is encrypted, to check a typed password against: {row} | {empty:true} (nothing in the book) | {unknown:true} (none found) */
 async function findSample(){
  var since=0;
  for(var n=0;n<8;n++){
   var p=await post("pull",{since:since}); if(!p.ok) return {unknown:true};
   if(!p.rows.length) return n===0?{empty:true}:{unknown:true};
   for(var i=0;i<p.rows.length;i++){ if(p.rows[i].x&&p.rows[i].x.__e===1) return {row:p.rows[i]}; }
   since=p.rows[p.rows.length-1].seq; if(!p.more) return {unknown:true};
  }
  return {unknown:true};
 }
 function showUnlock(){
  if(!srv.salt||!L.sup()) return;
  var old=$("tslOv"); if(old) return;
  var d=document.createElement("div"); d.id="tslOv";
  d.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:18px";
  d.innerHTML='<div style="background:#fff;border-radius:16px;padding:16px;max-width:380px;width:100%;color:#12303f"><div style="font-weight:800;font-size:17px">🔒 '+E(B("Shop book is locked","ഷോപ്പ് ബുക്ക് ലോക്ക് ചെയ്തതാണ്"))+'</div>'+
   '<div style="font-size:13.5px;margin:6px 0 4px">'+E(B("Type the password you set (the same as for My Accounts) to open it on this phone.","ഈ ഫോണിൽ തുറക്കാൻ നിങ്ങൾ വെച്ച പാസ്‌വേഡ് (എന്റെ കണക്കുകളുടെ അതേ പാസ്‌വേഡ്) ടൈപ്പ് ചെയ്യുക."))+'</div>'+
   '<input id="tslOvP" type="password" autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;font-size:17px;border:2px solid #b7cbd6;border-radius:10px">'+
   '<div id="tslOvE" style="color:#a12d2d;font-weight:700;font-size:13px;min-height:18px;margin-top:4px"></div>'+
   '<div style="display:flex;gap:8px;margin-top:6px"><button id="tslOvOk" style="flex:1;border:0;border-radius:12px;padding:12px;font-size:16px;font-weight:800;color:#fff;background:#0b6b78">'+E(B("Open","തുറക്കുക"))+'</button>'+
   '<button id="tslOvNo" style="flex:1;border:0;border-radius:12px;padding:12px;font-size:16px;font-weight:800;background:#dce9ef;color:#12303f">'+E(B("Later","പിന്നീട്"))+'</button></div></div>';
  document.body.appendChild(d);
  $("tslOvNo").onclick=function(){ d.remove(); };
  $("tslOvOk").onclick=async function(){
   var pw=$("tslOvP").value||"", er=$("tslOvE"); er.textContent=B("Opening ...","തുറക്കുന്നു ...");
   var ok=await unlockWith(pw);
   if(ok){ d.remove(); say(B("Shop book opened on this phone","ഈ ഫോണിൽ ഷോപ്പ് ബുക്ക് തുറന്നു")); } else er.textContent=B("Wrong password","പാസ്‌വേഡ് തെറ്റാണ്");
  };
  setTimeout(function(){ try{ $("tslOvP").focus(); }catch(e){} },100);
 }
 SL.unlock=showUnlock;
 window.tslUnlock=function(){ asked=0; showUnlock(); };
 async function unlockWith(pw){
  try{
   var raw=await L.pbk(pw,L.unb64(srv.salt),srv.iter||L.ITER), s=await findSample();
   if(s.row){ try{ await decX(raw,s.row.id,s.row.x); }catch(e){ return false; } }
   else if(!s.empty) return false;     /* nothing to check the password against: do not guess */
   var m=me();
   ls("tc_plm:"+m,JSON.stringify({salt:srv.salt,iter:srv.iter||L.ITER})); ls("tc_plk:"+m,L.b64(raw)); ls("tc_pls:"+m,null); ls(seenKey(),"1");
   try{ L.hide(); L.seal(true); }catch(e){}
   try{ SH.sync(); }catch(e){}
   redraw();
   return true;
  }catch(e){ return false; }
 }

 /* ---------- state of the book on THIS phone: text for Settings / lock card, and a small card on the shop Home ---------- */
 var learning=false;
 function learn(){
  if(learning) return; learning=true;
  post("pull",{since:2147483647}).then(function(){ learning=false; autoCheck(); redraw(); },function(){ learning=false; });
 }
 function needKey(){ return !!(srv.known&&srv.locked&&!curKey()); }
 SL.needKey=needKey;
 SL.stateText=function(){
  if(!L.sup()) return "";
  if(getJob()) return B("Shop book: locking ...","ഷോപ്പ് ബുക്ക്: ലോക്ക് ചെയ്യുന്നു ...");
  if(!srv.known){ learn(); return ""; }
  if(srv.locked&&curKey()) return B("Shop book: locked - opens on this phone","ഷോപ്പ് ബുക്ക്: ലോക്ക് ചെയ്തതാണ് - ഈ ഫോണിൽ തുറക്കും");
  if(srv.locked) return B("Shop book: LOCKED - this phone cannot open it yet (enter the password)","ഷോപ്പ് ബുക്ക്: ലോക്ക് ചെയ്തതാണ് - ഈ ഫോണിൽ ഇതുവരെ തുറക്കാൻ പറ്റില്ല (പാസ്‌വേഡ് നൽകുക)");
  return B("Shop book: not locked","ഷോപ്പ് ബുക്ക്: ലോക്ക് ചെയ്തിട്ടില്ല");
 };
 SL.homeLine=function(){
  var U=window.__tcShopUi, T=(U&&U.T)||function(ml,en){ return en; };
  var j=getJob(), h="", bg="#eef3f7", btn="";
  if(!L.sup()) return "";
  if(j){ h="🔒 "+T("ഷോപ്പ് ബുക്ക് ലോക്ക് ചെയ്യുന്നു… ഇന്റർനെറ്റ് ഓണാക്കി വെക്കുക","Locking the shop book… keep the internet on")+(j.done?" ("+j.done+")":""); bg="#fff6df"; }
  else if(!srv.known){ learn(); return ""; }
  else if(srv.locked&&curKey()){ h="🔒 "+T("ഷോപ്പ് ബുക്ക് പാസ്‌വേഡ് കൊണ്ട് ലോക്ക് ചെയ്തതാണ്","The shop book is locked with your password"); bg="#e3f3ea"; }
  else if(srv.locked){ h="🔒 "+T("ഷോപ്പ് ബുക്ക് ലോക്ക് ചെയ്തതാണ്. ഈ ഫോണിൽ തുറക്കാൻ പാസ്‌വേഡ് നൽകുക","The shop book is locked. Enter the password to open it on this phone"); bg="#fff6df"; btn='<button class="tsBtn g s" onclick="tslUnlock()">🔓 '+E(T("പാസ്‌വേഡ് നൽകുക","Enter password"))+'</button>'; }
  else return "";                       /* not locked: nothing to say on the Home screen (the Settings screen tells) */
  return '<div class="tsC" style="margin-top:10px;background:'+bg+';font-size:13px;line-height:1.5">'+E(h)+btn+'</div>';
 };

 /* ---------- records that an OLD version of the app stored while the book was already locked ----------
    (an old app pulled the encrypted rows as if they were normal records and moved its cursor past them): throw those out, start the pull from 0 again */
 function repairJunk(){
  try{
   var S=SH._S(), bad=[], id;
   for(id in S.recs){ var r=S.recs[id]; if(r&&r.x&&r.x.__e===1) bad.push(id); }
   if(!bad.length) return false;
   bad.forEach(function(i){ delete S.recs[i]; });
   S.q=(S.q||[]).filter(function(i){ return bad.indexOf(i)<0; });
   S.cur=0; S.ver=(S.ver||0)+1;
   try{ localStorage.setItem("tc_shop_v1:"+me(),JSON.stringify({recs:S.recs,q:S.q,cur:S.cur,cfg:S.cfg})); }catch(e){}
   return true;
  }catch(e){ return false; }
 }
 SL.repair=repairJunk;

 /* ---------- one state line for the lock card ---------- */
 L.extra=function(){
  var j=getJob(), h="";
  if(j) h='<div class="tpM" style="margin-top:6px">🏪 '+E(B("Shop book: ","ഷോപ്പ് ബുക്ക്: ")+(j.mode==="off"?B("unlocking ...","ലോക്ക് മാറ്റുന്നു ..."):B("locking ...","ലോക്ക് ചെയ്യുന്നു ...")))+(j.done?" ("+j.done+")":"")+'</div>';
  else if(srv.known&&srv.locked){
   h=curKey()?'<div class="tpM" style="margin-top:6px">🏪 '+E(B("Shop book is locked too","ഷോപ്പ് ബുക്കും ലോക്ക് ചെയ്തതാണ്"))+'</div>'
    :'<div class="tpNote" style="margin-top:6px">🏪 '+E(B("The shop book is locked and cannot be read on this phone.","ഷോപ്പ് ബുക്ക് ലോക്ക് ചെയ്തതാണ്, ഈ ഫോണിൽ തുറക്കാൻ പറ്റില്ല."))+'</div><button class="tpBtn" onclick="tslUnlock()">🔓 '+E(B("Enter password","പാസ്‌വേഡ് നൽകുക"))+'</button>';
  }
  return h;
 };
 SL.state=function(){ return {srv:srv,job:getJob(),running:running}; };

 /* ---------- start: learn the state of the book once (cheap), continue an interrupted job ---------- */
 setTimeout(function(){ try{ if(repairJunk()) SH.sync(); }catch(e){} },2500);
 setTimeout(function(){
  try{
   if(!(hasShop()||L.on()||getJob())) return;
   post("pull",{since:2147483647}).then(function(){ autoCheck(); if(getJob()) runJob(); });
  }catch(e){}
 },7000);
 try{ window.addEventListener("online",function(){ if(getJob()) setTimeout(runJob,800); }); }catch(e){}
})();
