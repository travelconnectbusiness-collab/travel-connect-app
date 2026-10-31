/* My Accounts - optional PASSWORD LOCK for the copies that leave the phone (tc-perslock.js, loaded by tc-regdocs.js after tc-persrem.js).
   Owner's request (2026-10-30): people do not want anybody to see their accounts; whoever wants may keep ALL their account data encrypted, "maximum protection".
   WHAT IT DOES (only for the person who switches it on: My Accounts > Backup & export > "Password lock"):
   - the person chooses a password; AES-256-GCM key = PBKDF2-SHA256(password, random salt, 200,000 rounds). The key (not the password) is kept on THIS phone
     (localStorage tc_plk:<mobile>, salt/rounds in tc_plm:<mobile>) so the phone can lock the copies by itself without asking every time.
   - VAULT: all My Accounts lists of that person (every key of window.__tcPers.K, including deleted markers) are encrypted into ONE record in the list
     db.persVault ({id, u, ts, salt, iter, iv, ct, n}); it is re-made a few seconds after every change (wrapped save(), compared by a hash of the content).
   - the PLAIN lists are taken out of TC_BK_LISTS (Premium Cloud Backup, tc-backup.js) and out of the owners' backup file (tc-filebk.js skips window.__tcPersHide),
     persVault is added to TC_BK_LISTS: so the cloud copy and the backup files hold only the locked vault. The server (backup.js) is NOT changed; it counts only the lists
     it knows, so the missing plain lists never trigger its "would shrink" protection. The server keeps the previous backup as prev.json, so turning the lock on / off
     / changing the password makes two backups in a row (the old plain copy is replaced).
   - the My Accounts backup FILE (tpBkFile) is locked with the same key when the lock is on ({app:"travelconnect-personal", v:2, encrypted:true, salt, iter, iv, ct});
     restoring such a file asks for the password (wrapped tpRestoreFile; the plain file path is unchanged).
   - NEW PHONE / restored from cloud or from an owner's backup file: the vault arrives in db.persVault; My Accounts shows "Locked accounts found - enter password";
     the right password opens it (records are ADDED by id, nothing is overwritten) and the lock is switched on for this phone with the same password.
   - turn off / change password need the current password.
   - 2026-10-30 (owner: 'all data, not only the accounts'): for Premium owners the WHOLE cloud backup payload of tc-backup.js (bills, quotations, trips, customers, vehicles ...
     + the personal vault) is encrypted as ONE blob {__enc:1, vault:{salt,iter,iv,ct,ts,n}}; server backup.js stores it as sent and refuses a plain backup over it (locked_backup_exists).
     tcBkPayload / tcBackupNow / tcBkCall are wrapped (see the CLOUD section below); a plain payload is never sent while the lock is on.
   THE PASSWORD CANNOT BE RECOVERED by anybody (not by us): forgotten password = the locked copies cannot be opened (the accounts on the phone itself stay).
   NOT covered: the copy that lives on the phone itself (protected only by the phone's own lock and the app PIN), and the kind + date of each shop record (the server needs them).
   - 2026-10-30 (owner: 'encrypt the shop book too'): the same password also locks the SHOP BOOK on the server - see tc-shoplock.js (it listens to this module: P.lock.listen / fire,
     and uses P.lock.key / meta / pbk). This file only exposes the key tools, tells tc-shoplock.js when the lock is turned on / off / changed / opened on a new phone, and shows
     one state line of the shop book in the lock card (P.lock.extra) and on other pages (P.lock.line).
   core.js / cs.js / directory.js / tc-backup.js are NOT edited. */
(function(){
 var P=window.__tcPers;
 if(!P||!P.bills||P.lock) return;
 P.lock={};
 var K=P.K, B=P.B, E=P.E, $=P.$, me=P.me, say=P.say, SC=P.SC, L=P.L;
 var ITER=200000;

 /* ---------- tools ---------- */
 function sup(){ try{ return !!(window.crypto&&crypto.subtle&&window.TextEncoder&&crypto.getRandomValues); }catch(e){ return false; } }
 function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} return null; }
 function b64(buf){ var a=new Uint8Array(buf), s="", i; for(i=0;i<a.length;i+=8192) s+=String.fromCharCode.apply(null,a.subarray(i,i+8192)); return btoa(s); }
 function unb64(s){ var bin=atob(s), a=new Uint8Array(bin.length), i; for(i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i); return a; }
 function hash(s){ var h=5381,i; for(i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return String(h)+":"+s.length; }
 function pbk(pw,salt,iter){
  return crypto.subtle.importKey("raw",new TextEncoder().encode(String(pw).normalize("NFC")),"PBKDF2",false,["deriveBits"]).then(function(b){
   return crypto.subtle.deriveBits({name:"PBKDF2",salt:salt,iterations:iter,hash:"SHA-256"},b,256);
  }).then(function(x){ return new Uint8Array(x); });
 }
 function aes(raw){ return crypto.subtle.importKey("raw",raw,"AES-GCM",false,["encrypt","decrypt"]); }
 async function encObj(raw,obj){
  var k=await aes(raw), iv=crypto.getRandomValues(new Uint8Array(12));
  var ct=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},k,new TextEncoder().encode(JSON.stringify(obj)));
  return {iv:b64(iv),ct:b64(ct)};
 }
 async function decObj(raw,e){
  var k=await aes(raw), pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(e.iv)},k,unb64(e.ct));
  return JSON.parse(new TextDecoder().decode(pt));
 }

 /* ---------- state of this phone / this login ---------- */
 function meta(){ var m=me(); if(!m) return null; try{ return JSON.parse(ls("tc_plm:"+m)||"null"); }catch(e){ return null; } }
 function keyRaw(){ var m=me(), k=m?ls("tc_plk:"+m):null; try{ return k?unb64(k):null; }catch(e){ return null; } }
 function on(){ return !!(meta()&&keyRaw()); }
 P.lock.on=on;
 P.lock.key=keyRaw; P.lock.meta=meta; P.lock.pbk=pbk; P.lock.b64=b64; P.lock.unb64=unb64; P.lock.sup=sup; P.lock.ITER=ITER;
 P.lock.listeners=[];
 P.lock.listen=function(f){ P.lock.listeners.push(f); };
 P.lock.fire=function(kind,info){ P.lock.listeners.forEach(function(f){ try{ f(kind,info||{}); }catch(e){ if(window.console) console.error("tc-perslock listener",e); } }); };
 function vaults(){ var m=me(); return L("persVault").filter(function(r){ return r&&String(r.u||"")===m&&r.ct&&r.iv; }).sort(function(a,b){ return (b.ts||0)-(a.ts||0); }); }
 /* WHICH vaults were already opened on this phone: by id (31 Oct 2026). Before, only the newest vault was looked at and only if it was newer than the last applied time -
    so the vault of the FIRST phone (older than the second phone's own empty vault) was never opened on the second phone. */
 function applied(){ try{ return JSON.parse(ls("tc_plv:"+me())||"[]")||[]; }catch(e){ return []; } }
 function markApplied(id){ var a=applied(); if(a.indexOf(id)<0){ a.push(id); if(a.length>40) a=a.slice(-40); ls("tc_plv:"+me(),JSON.stringify(a)); } }
 function unapplied(){ var a=applied(); return vaults().filter(function(r){ return a.indexOf(r.id)<0; }); }
 function newVault(){ return unapplied()[0]||null; }
 function snapshot(){
  var m=me(), o={};
  Object.keys(K).forEach(function(c){ o[K[c]]=L(K[c]).filter(function(r){ return r&&String(r.u||"")===m; }); });
  return o;
 }
 function countOf(o){ var n=0; Object.keys(o).forEach(function(k){ n+=(o[k]||[]).filter(function(r){ return !r.del; }).length; }); return n; }

 /* which lists leave the phone in plain form */
 function hide(){
  var h=on()?Object.keys(K).map(function(c){ return K[c]; }):[];
  window.__tcPersHide=h;
  try{
   if(typeof TC_BK_LISTS!=="undefined"){
    Object.keys(K).forEach(function(c){
     var i=TC_BK_LISTS.indexOf(K[c]);
     if(h.length){ if(i>=0) TC_BK_LISTS.splice(i,1); } else if(i<0) TC_BK_LISTS.push(K[c]);
    });
    if(TC_BK_LISTS.indexOf("persVault")<0) TC_BK_LISTS.push("persVault");
   }
  }catch(e){}
 }
 P.lock.hide=hide;

 /* ---------- the vault ---------- */
 var tm=0, chain=Promise.resolve();
 async function sealOnce(force){
  if(!on()||!sup()) return;
  try{
   var m=me(), mt=meta(), raw=keyRaw(), snap=snapshot(), h=hash(JSON.stringify(snap));   /* key + salt are read together, before any await */
   if(!force&&ls("tc_pls:"+m)===h) return;
   var e=await encObj(raw,snap);
   var rec={id:"pv"+Date.now().toString(36),u:m,ts:Date.now(),salt:mt.salt,iter:mt.iter,iv:e.iv,ct:e.ct,n:countOf(snap)};
   var keep=unapplied().slice(0,3).map(function(r){ return r.id; });       /* vaults that came from another phone and are not opened yet stay */
   db.persVault=L("persVault").filter(function(r){ return String(r&&r.u||"")!==m||keep.indexOf(r.id)>=0; });
   db.persVault.push(rec);
   markApplied(rec.id);
   ls("tc_pls:"+m,h); ls("tc_pla:"+m,String(rec.ts));
   try{ save(); }catch(x){}
  }catch(e){ if(window.console) console.error("tc-perslock seal",e); }
 }
 /* one at a time, in order: a password change can never be skipped or overtaken by an older seal */
 function seal(force){ chain=chain.then(function(){ return sealOnce(force); }); return chain; }
 P.lock.seal=seal;
 function schedule(ms){ clearTimeout(tm); tm=setTimeout(function(){ seal(false); },ms||3000); }
 /* every save() of the app: re-make the vault when the accounts changed */
 (function(){
  var os=window.save;
  if(typeof os!=="function") return;
  window.save=function(){ var r=os.apply(this,arguments); try{ if(on()) schedule(3000); }catch(e){} return r; };
 })();

 /* ---------- CLOUD BACKUP of everything (Premium owners): the WHOLE payload of tc-backup.js is encrypted on the phone ----------
    Server (backup.js): accepts { __enc:1, vault:{salt,iter,iv,ct,ts,n} } as it is and never lets a plain backup replace it (locked_backup_exists).
    tcBkPayload() is wrapped (sync) - it hands out the last sealed blob; tcBackupNow() is wrapped (async) - it seals first; with the lock ON a plain payload is never sent
    (if the blob is not ready the payload function throws and the backup simply does not run). tcBkCall("get") is wrapped: an encrypted answer is opened with this phone's key
    or, on a new phone, with the password typed in a small window; the plain payload then goes through the ORIGINAL restore (merge by id). */
 var cBlob=null, cHash="", opay=window.tcBkPayload, obn=window.tcBackupNow, obc=window.tcBkCall;
 async function sealCloud(){
  if(!on()||!sup()||typeof opay!=="function") return null;
  await seal(false);                                   /* the personal vault first (it is part of the payload) */
  var plain=opay(), js=JSON.stringify(plain), h=hash(js);
  if(cBlob&&cHash===h) return cBlob;
  var mt=meta(), raw=keyRaw(), e=await encObj(raw,plain), n=0;
  /* n = real record count: the taxi lists + the personal records inside the vault (a vault is ONE record in the lists, its own n says how many it holds) */
  try{ if(typeof tcBkTotal==="function") n=tcBkTotal(plain); (plain.persVault||[]).forEach(function(r){ n+=Math.max(0,Math.floor(+r.n||0))-1; }); if(n<0) n=0; }catch(x){}
  cBlob={salt:mt.salt,iter:mt.iter,iv:e.iv,ct:e.ct,ts:Date.now(),n:n}; cHash=h;
  return cBlob;
 }
 P.lock.sealCloud=sealCloud;
 if(typeof opay==="function") window.tcBkPayload=function(){
  if(!on()) return opay.apply(this,arguments);
  if(!cBlob) throw new Error("locked backup not ready");
  return {__enc:1,v:1,vault:cBlob};
 };
 if(typeof obn==="function") window.tcBackupNow=async function(manual){
  try{ if(on()) await sealCloud(); }catch(e){}
  return obn.apply(this,arguments);
 };
 /* small password window for a restore on a phone that does not hold the key */
 function askPassword(vault){
  return new Promise(function(resolve){
   var old=$("tplOv"); if(old) old.remove();
   var d=document.createElement("div"); d.id="tplOv";
   d.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:18px";
   d.innerHTML='<div style="background:#fff;border-radius:16px;padding:16px;max-width:380px;width:100%;color:#12303f"><div style="font-weight:800;font-size:17px">🔒 '+E(B("Locked backup","ലോക്ക് ചെയ്ത ബാക്കപ്പ്"))+'</div>'+
    '<div style="font-size:13.5px;margin:6px 0 4px">'+E(B("Your backup is locked. Type the password you set.","നിങ്ങളുടെ ബാക്കപ്പ് ലോക്ക് ചെയ്തതാണ്. നിങ്ങൾ വെച്ച പാസ്‌വേഡ് ടൈപ്പ് ചെയ്യുക."))+'</div>'+
    '<input id="tplOvP" type="password" autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;font-size:17px;border:2px solid #b7cbd6;border-radius:10px">'+
    '<div id="tplOvE" style="color:#a12d2d;font-weight:700;font-size:13px;min-height:18px;margin-top:4px"></div>'+
    '<div style="display:flex;gap:8px;margin-top:6px"><button id="tplOvOk" style="flex:1;border:0;border-radius:12px;padding:12px;font-size:16px;font-weight:800;color:#fff;background:#0b6b78">'+E(B("Open","തുറക്കുക"))+'</button>'+
    '<button id="tplOvNo" style="flex:1;border:0;border-radius:12px;padding:12px;font-size:16px;font-weight:800;background:#dce9ef;color:#12303f">'+E(B("Cancel","വേണ്ട"))+'</button></div></div>';
   document.body.appendChild(d);
   function done(v){ d.remove(); resolve(v); }
   $("tplOvNo").onclick=function(){ done(null); };
   $("tplOvOk").onclick=async function(){
    var pw=$("tplOvP").value||"", er=$("tplOvE"); er.textContent=B("Opening ...","തുറക്കുന്നു ...");
    var r=await openVault(vault,pw);
    if(r) done({pw:pw,r:r}); else er.textContent=B("Wrong password","പാസ്‌വേഡ് തെറ്റാണ്");
   };
   setTimeout(function(){ try{ $("tplOvP").focus(); }catch(e){} },100);
  });
 }
 if(typeof obc==="function") window.tcBkCall=async function(action,extra){
  var r=await obc.apply(this,arguments);
  try{
   if(action==="get"&&r&&r.ok&&r.exists&&r.data&&r.data.__enc===1&&r.data.vault){
    var v=r.data.vault, plain=null, m=me();
    if(on()){ try{ plain=await decObj(keyRaw(),v); }catch(e){ plain=null; } }
    if(!plain){
     var got=await askPassword(v);
     if(!got) return {ok:false,error:"locked_cancelled"};
     plain=got.r.o;
     if(!on()){      /* this phone now holds the key too: its own copies get locked from now on */
      ls("tc_plm:"+m,JSON.stringify({salt:v.salt,iter:v.iter||ITER})); ls("tc_plk:"+m,b64(got.r.raw)); ls("tc_pls:"+m,null);
      hide(); P.lock.fire("key",{});
     }
    }
    r.data=plain; r.enc=false;
   }
  }catch(e){ return {ok:false,error:"locked_failed"}; }
  return r;
 };
 /* turning the lock on / off / changing the password: two backups in a row (the server keeps the previous one as prev.json), forced because plain and locked backups never replace each other otherwise */
 async function pushCloud(){
  try{
   if(typeof tcBkEligible!=="function"||!tcBkEligible()||typeof window.tcBkCall!=="function") return;
   if(on()) await sealCloud();
   for(var i=0;i<2;i++){
    var d=window.tcBkPayload();
    await window.tcBkCall("put",{data:d,force:true});
   }
   ls("tc_bk_hash",null);
  }catch(e){}
 }

 /* open a vault with a password; returns the snapshot or null */
 async function openVault(v,pw){
  try{
   var raw=await pbk(pw,unb64(v.salt),v.iter||ITER);
   var o=await decObj(raw,v);
   return {o:o,raw:raw};
  }catch(e){ return null; }
 }
 function mergeSnap(o){
  var add=0, m=me();
  Object.keys(K).forEach(function(c){
   var key=K[c], src=Array.isArray(o[key])?o[key]:[], have={};
   L(key).forEach(function(r){ have[r.id]=1; });
   src.forEach(function(r){
    if(!r||typeof r.id!=="string"||have[r.id]) return;
    r.u=m; have[r.id]=1; L(key).push(r); if(!r.del) add++;
   });
  });
  try{ save(); }catch(e){}
  return add;
 }

 /* ---------- sheets ---------- */
 function pwField(id,label){ return '<label class="tpL">'+E(label)+'<input id="'+id+'" type="password" autocomplete="off" autocapitalize="off" spellcheck="false"></label>'; }
 function sheetErr(t){ var e=$("tplErr"); if(e) e.textContent=t||""; }
 var WARN=function(){ return '<div class="tpNote" style="background:#fde8e6;color:#a12d2d">⚠ '+E(B("If you forget this password, NOBODY - not even us - can open your locked backups. Write it down somewhere safe. The accounts on this phone itself stay as they are.","ഈ പാസ്‌വേഡ് മറന്നാൽ ലോക്ക് ചെയ്ത ബാക്കപ്പുകൾ ആർക്കും - ഞങ്ങൾക്കും - തുറക്കാൻ പറ്റില്ല. സുരക്ഷിതമായ ഒരിടത്ത് എഴുതി വെക്കുക. ഈ ഫോണിലെ കണക്കുകൾക്ക് മാറ്റമില്ല."))+'</div>'; };
 window.tpLockAsk=function(){
  if(!sup()){ say(B("This browser cannot lock with a password","ഈ ബ്രൗസറിൽ പാസ്‌വേഡ് ലോക്ക് പറ്റില്ല")); return; }
  P.sheet('<h3>🔒 '+E(B("Password lock","പാസ്‌വേഡ് ലോക്ക്"))+'</h3>'+
   '<div class="tpM">'+E(B("Your accounts in the cloud backup and in backup files will be locked (AES-256). Only this password opens them.","ക്ലൗഡ് ബാക്കപ്പിലും ബാക്കപ്പ് ഫയലിലും ഉള്ള നിങ്ങളുടെ കണക്കുകൾ ലോക്ക് ചെയ്യും (AES-256). ഈ പാസ്‌വേഡ് കൊണ്ട് മാത്രമേ തുറക്കൂ."))+'</div>'+
   pwField("tplP1",B("New password (at least 6 characters)","പുതിയ പാസ്‌വേഡ് (കുറഞ്ഞത് 6 അക്ഷരം)"))+pwField("tplP2",B("Type it again","ഒന്നുകൂടി ടൈപ്പ് ചെയ്യുക"))+WARN()+
   '<div id="tplErr" class="tpM" style="color:#a12d2d;font-weight:700"></div>'+
   '<button class="tpBtn" onclick="tpLockSet()">🔒 '+E(B("Turn on lock","ലോക്ക് ഓൺ ചെയ്യുക"))+'</button><button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
 };
 window.tpCloseSheet=function(){ P.closeSheet(); };
 window.tpLockSet=async function(){
  var a=($("tplP1")||{}).value||"", b=($("tplP2")||{}).value||"";
  if(a.length<6){ sheetErr(B("Password needs at least 6 characters","പാസ്‌വേഡിന് കുറഞ്ഞത് 6 അക്ഷരം വേണം")); return; }
  if(a!==b){ sheetErr(B("The two passwords are not the same","രണ്ട് പാസ്‌വേഡും ഒരുപോലെ അല്ല")); return; }
  sheetErr(B("Locking ...","ലോക്ക് ചെയ്യുന്നു ..."));
  try{
   var salt=crypto.getRandomValues(new Uint8Array(16)), raw=await pbk(a,salt,ITER), m=me();
   ls("tc_plm:"+m,JSON.stringify({salt:b64(salt),iter:ITER})); ls("tc_plk:"+m,b64(raw)); ls("tc_pls:"+m,null);
   hide(); await seal(true); P.closeSheet(); P.refresh();
   say(B("Password lock is ON","പാസ്‌വേഡ് ലോക്ക് ഓൺ ആയി"));
   pushCloud(); P.lock.fire("on",{});
  }catch(e){ sheetErr(B("Could not lock - try again","ലോക്ക് ചെയ്യാൻ പറ്റിയില്ല - വീണ്ടും ശ്രമിക്കുക")); }
 };
 /* ask for the CURRENT password: what = "off" | "change" */
 window.tpLockAskCur=function(what){
  var change=what==="change";
  P.sheet('<h3>🔒 '+E(change?B("Change password","പാസ്‌വേഡ് മാറ്റുക"):B("Turn off the lock","ലോക്ക് ഓഫ് ചെയ്യുക"))+'</h3>'+
   pwField("tplC",B("Current password","ഇപ്പോഴത്തെ പാസ്‌വേഡ്"))+
   (change?pwField("tplP1",B("New password (at least 6 characters)","പുതിയ പാസ്‌വേഡ് (കുറഞ്ഞത് 6 അക്ഷരം)"))+pwField("tplP2",B("Type the new one again","പുതിയത് ഒന്നുകൂടി ടൈപ്പ് ചെയ്യുക"))+WARN():
    '<div class="tpNote">'+E(B("Your cloud backup and new backup files will be saved WITHOUT a lock again.","ക്ലൗഡ് ബാക്കപ്പും പുതിയ ബാക്കപ്പ് ഫയലുകളും വീണ്ടും ലോക്ക് ഇല്ലാതെ സേവ് ആകും."))+'</div>')+
   '<div id="tplErr" class="tpM" style="color:#a12d2d;font-weight:700"></div>'+
   '<button class="tpBtn'+(change?'':' r')+'" onclick="tpLockDoCur(\''+(change?"change":"off")+'\')">'+E(change?B("Change","മാറ്റുക"):B("Turn off","ഓഫ് ചെയ്യുക"))+'</button><button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
 };
 window.tpLockDoCur=async function(what){
  var cur=($("tplC")||{}).value||"", mt=meta(), m=me();
  if(!mt){ P.closeSheet(); return; }
  sheetErr(B("Checking ...","നോക്കുന്നു ..."));
  var raw=null; try{ raw=await pbk(cur,unb64(mt.salt),mt.iter||ITER); }catch(e){}
  if(!raw||b64(raw)!==ls("tc_plk:"+m)){ sheetErr(B("Wrong password","പാസ്‌വേഡ് തെറ്റാണ്")); return; }
  if(what==="off"){
   ls("tc_plm:"+m,null); ls("tc_plk:"+m,null); ls("tc_pls:"+m,null); ls("tc_pla:"+m,null); ls("tc_plv:"+m,null);
   db.persVault=L("persVault").filter(function(r){ return String(r&&r.u||"")!==m; });
   hide(); try{ save(); }catch(e){}
   P.closeSheet(); P.refresh(); say(B("Lock is OFF","ലോക്ക് ഓഫ് ആയി")); pushCloud(); P.lock.fire("off",{oldRaw:raw}); return;
  }
  var a=($("tplP1")||{}).value||"", b=($("tplP2")||{}).value||"";
  if(a.length<6){ sheetErr(B("Password needs at least 6 characters","പാസ്‌വേഡിന് കുറഞ്ഞത് 6 അക്ഷരം വേണം")); return; }
  if(a!==b){ sheetErr(B("The two passwords are not the same","രണ്ട് പാസ്‌വേഡും ഒരുപോലെ അല്ല")); return; }
  try{
   var salt=crypto.getRandomValues(new Uint8Array(16)), nr=await pbk(a,salt,ITER);
   ls("tc_plm:"+m,JSON.stringify({salt:b64(salt),iter:ITER})); ls("tc_plk:"+m,b64(nr)); ls("tc_pls:"+m,null);
   await seal(true); P.closeSheet(); P.refresh(); say(B("Password changed","പാസ്‌വേഡ് മാറ്റി")); pushCloud(); P.lock.fire("change",{oldRaw:raw});
  }catch(e){ sheetErr(B("Could not change - try again","മാറ്റാൻ പറ്റിയില്ല - വീണ്ടും ശ്രമിക്കുക")); }
 };
 /* a locked copy arrived (cloud restore / backup file of an owner): open it with the password */
 window.tpLockOpenAsk=function(){
  var v=newVault(); if(!v){ P.refresh(); return; }
  P.sheet('<h3>🔒 '+E(B("Open locked accounts","ലോക്ക് ചെയ്ത കണക്കുകൾ തുറക്കുക"))+'</h3>'+
   '<div class="tpM">'+E(B("A locked copy of your accounts was found in your backup. Type the password you set for it.","നിങ്ങളുടെ ബാക്കപ്പിൽ കണക്കുകളുടെ ലോക്ക് ചെയ്ത കോപ്പി കണ്ടു. അതിനായി നിങ്ങൾ വെച്ച പാസ്‌വേഡ് ടൈപ്പ് ചെയ്യുക."))+'</div>'+
   pwField("tplC",B("Password","പാസ്‌വേഡ്"))+'<div id="tplErr" class="tpM" style="color:#a12d2d;font-weight:700"></div>'+
   '<button class="tpBtn" onclick="tpLockOpenDo()">'+E(B("Open","തുറക്കുക"))+'</button><button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Later","പിന്നീട്"))+'</button>');
 };
 window.tpLockOpenDo=async function(){
  var v=newVault(); if(!v){ P.closeSheet(); return; }
  var pw=($("tplC")||{}).value||"";
  sheetErr(B("Opening ...","തുറക്കുന്നു ..."));
  var r=await openVault(v,pw);
  if(!r){ sheetErr(B("Wrong password","പാസ്‌വേഡ് തെറ്റാണ്")); return; }
  var add=mergeSnap(r.o), m=me();
  ls("tc_plm:"+m,JSON.stringify({salt:v.salt,iter:v.iter||ITER})); ls("tc_plk:"+m,b64(r.raw)); ls("tc_pla:"+m,String(v.ts||0)); ls("tc_pls:"+m,null); markApplied(v.id);
  hide(); schedule(500); setTimeout(function(){ try{ autoOpen(); }catch(e){} },300); P.lock.fire("key",{});
  P.closeSheet(); P.refresh();
  say(B(add+" entries added - lock is ON for this phone","ചേർത്തത്: "+add+" എൻട്രികൾ - ഈ ഫോണിലും ലോക്ക് ഓൺ"));
 };
 /* the same copy, but when this phone already holds the key: open silently */
 var opening=false;
 async function autoOpen(){
  if(!on()||!sup()||opening) return;
  var list=unapplied(); if(!list.length) return;
  opening=true; var add=0;
  try{
   for(var i=0;i<list.length;i++){
    try{ var o=await decObj(keyRaw(),list[i]); add+=mergeSnap(o); markApplied(list[i].id); }catch(e){}   /* another password: stays, the "Locked accounts found" card asks for it */
   }
  }finally{ opening=false; }
  if(add){
   say(B(add+" entries added from the locked backup","ലോക്ക് ചെയ്ത ബാക്കപ്പിൽ നിന്ന് "+add+" എൻട്രികൾ ചേർത്തു"));
   try{ schedule(800); }catch(e){}
   try{ if(P.S&&P.S.open) P.refresh(); }catch(e){}
  }
 }

 /* ---------- backup FILE ---------- */
 var obf=window.tpBkFile;
 window.tpBkFile=async function(){
  if(!on()||!sup()) return typeof obf==="function"?obf.apply(this,arguments):undefined;
  try{
   var o={app:"travelconnect-personal",v:1,at:new Date().toISOString(),mobile:me()};
   Object.keys(K).forEach(function(c){ o[K[c]]=P.mine(K[c]); });
   var mt=meta(), e=await encObj(keyRaw(),o), d=new Date(), p2=function(n){ return n<10?"0"+n:""+n; };
   var file={app:"travelconnect-personal",v:2,encrypted:true,mobile:me(),at:o.at,salt:mt.salt,iter:mt.iter,iv:e.iv,ct:e.ct};
   P.dl("my-accounts-locked-"+d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+".json","application/json",JSON.stringify(file));
   try{ db.settings=db.settings||{}; db.settings.persBkAt=Date.now(); save(); }catch(x){}
   say(B("Locked backup file ready - keep your password safe","ലോക്ക് ചെയ്ത ബാക്കപ്പ് ഫയൽ തയ്യാർ - പാസ്‌വേഡ് സൂക്ഷിക്കുക"));
  }catch(e){ say(B("Could not make the file","ഫയൽ ഉണ്ടാക്കാൻ പറ്റിയില്ല")); }
 };
 var orf=window.tpRestoreFile, pendingFile=null;
 window.tpRestoreFile=function(inp){
  var f=inp&&inp.files&&inp.files[0];
  if(!f||typeof orf!=="function") return typeof orf==="function"?orf.apply(this,arguments):undefined;
  var rd=new FileReader();
  rd.onload=function(){
   var o=null; try{ o=JSON.parse(String(rd.result||"")); }catch(e){}
   if(o&&o.app==="travelconnect-personal"&&o.encrypted&&o.ct){
    pendingFile=o; try{ inp.value=""; }catch(e){}
    P.sheet('<h3>🔒 '+E(B("Locked backup file","ലോക്ക് ചെയ്ത ബാക്കപ്പ് ഫയൽ"))+'</h3>'+pwField("tplC",B("Password of this file","ഈ ഫയലിന്റെ പാസ്‌വേഡ്"))+'<div id="tplErr" class="tpM" style="color:#a12d2d;font-weight:700"></div>'+
     '<button class="tpBtn" onclick="tpLockFileDo()">'+E(B("Open and add","തുറന്ന് ചേർക്കുക"))+'</button><button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
   }else{ orf.call(window,inp); }
  };
  rd.readAsText(f);
 };
 window.tpLockFileDo=async function(){
  var o=pendingFile; if(!o){ P.closeSheet(); return; }
  var pw=($("tplC")||{}).value||"";
  sheetErr(B("Opening ...","തുറക്കുന്നു ..."));
  var r=await openVault(o,pw);
  if(!r){ sheetErr(B("Wrong password","പാസ്‌വേഡ് തെറ്റാണ്")); return; }
  pendingFile=null; P.closeSheet();
  var fake={files:[new File([JSON.stringify(r.o)],"my-accounts.json",{type:"application/json"})],value:""};
  orf.call(window,fake);
 };

 /* ---------- screens ---------- */
 function cardHtml(){
  var s=on();
  var h='<div class="tpC" id="tplCard"><b>🔒 '+E(B("Password lock for backups","ബാക്കപ്പിന് പാസ്‌വേഡ് ലോക്ക്"))+'</b>';
  if(!sup()) return h+'<div class="tpM">'+E(B("This browser cannot lock with a password.","ഈ ബ്രൗസറിൽ പാസ്‌വേഡ് ലോക്ക് പറ്റില്ല."))+'</div></div>';
  if(s){
   h+='<div class="tpNote tpOkN">✅ '+E(B("ON - your accounts, your shop book, and (Premium owners) your whole cloud backup - bills, trips, customers - are locked (AES-256). Only your password opens them.","ഓൺ - നിങ്ങളുടെ കണക്കുകളും ഷോപ്പ് ബുക്കും (Premium ഓണർമാർക്ക്) ക്ലൗഡ് ബാക്കപ്പ് മുഴുവനും - ബില്ലുകൾ, ട്രിപ്പുകൾ, കസ്റ്റമർമാർ - ലോക്ക് ചെയ്തതാണ് (AES-256). നിങ്ങളുടെ പാസ്‌വേഡ് കൊണ്ട് മാത്രമേ തുറക്കൂ."))+'</div>'+
    '<div class="tpM">'+E(B("A forgotten password cannot be recovered by anybody.","മറന്ന പാസ്‌വേഡ് ആർക്കും തിരിച്ചെടുക്കാൻ പറ്റില്ല."))+'</div>'+
    '<button class="tpBtn g s" onclick="tpLockAskCur(\'change\')">'+E(B("Change password","പാസ്‌വേഡ് മാറ്റുക"))+'</button><button class="tpBtn r s" onclick="tpLockAskCur(\'off\')">'+E(B("Turn off","ഓഫ് ചെയ്യുക"))+'</button>';
  }else{
   h+='<div class="tpM">'+E(B("Optional. Lock your accounts, your shop book and - for Premium owners - the whole cloud backup (bills, trips, customers) with ONE password only you know. Nobody else, not even us, can read them then.","ഓപ്ഷണൽ. നിങ്ങളുടെ കണക്കുകൾ, ഷോപ്പ് ബുക്ക്, (Premium ഓണർമാർക്ക്) ക്ലൗഡ് ബാക്കപ്പ് മുഴുവനും - ബില്ലുകൾ, ട്രിപ്പുകൾ, കസ്റ്റമർമാർ - നിങ്ങൾക്ക് മാത്രം അറിയാവുന്ന ഒരൊറ്റ പാസ്‌വേഡ് കൊണ്ട് ലോക്ക് ചെയ്യാം. അപ്പോൾ മറ്റാർക്കും, ഞങ്ങൾക്കും, വായിക്കാൻ പറ്റില്ല."))+'</div>'+
    '<button class="tpBtn" onclick="tpLockAsk()">🔒 '+E(B("Turn on password lock","പാസ്‌വേഡ് ലോക്ക് ഓൺ ചെയ്യുക"))+'</button>';
  }
  return h+(P.lock.extra?P.lock.extra():"")+'</div>';
 }
 function foundHtml(){
  if(on()||!newVault()) return "";
  return '<div class="tpC" style="border:2px solid #0b6b78"><b>🔒 '+E(B("Locked accounts found in your backup","നിങ്ങളുടെ ബാക്കപ്പിൽ ലോക്ക് ചെയ്ത കണക്കുകൾ കണ്ടു"))+'</b><div class="tpM">'+E(B("Enter your password to bring them back on this phone.","ഈ ഫോണിലേക്ക് തിരികെ കൊണ്ടുവരാൻ പാസ്‌വേഡ് നൽകുക."))+'</div><button class="tpBtn" onclick="tpLockOpenAsk()">🔓 '+E(B("Enter password","പാസ്‌വേഡ് നൽകുക"))+'</button></div>';
 }
 var oh=SC.home;
 if(typeof oh==="function") SC.home=function(){
  hide();
  if(on()) autoOpen();
  oh.apply(this,arguments);
  try{
   var body=$("tpBody"); if(!body) return;
   var f=foundHtml(); if(f) body.insertAdjacentHTML("afterbegin",f);
  }catch(e){}
 };
 /* small one-line state on the My Accounts home */
 (P.homeCards=P.homeCards||[]).push(function(){
  return '<div class="tpC" onclick="tpGo(\'backup\')" style="cursor:pointer;padding:10px 14px"><b>🔒 '+E(B("Password lock","പാസ്‌വേഡ് ലോക്ക്"))+'</b> <span class="tpM">'+(on()?'✅ '+E(B("ON","ഓൺ")):E(B("off - tap to set (optional)","ഓഫ് - ഓൺ ചെയ്യാൻ ടാപ്പ് ചെയ്യുക (ഓപ്ഷണൽ)")))+'</span></div>';
 });
 var ob=SC.backup;
 if(typeof ob==="function") SC.backup=function(){
  ob.apply(this,arguments);
  try{ var body=$("tpBody"); if(body) body.insertAdjacentHTML("afterbegin",foundHtml()+cardHtml()); }catch(e){}
 };

 /* ---------- one line for other pages (Cloud Backup window, shop Settings): where the lock is and whether it is on ---------- */
 P.lock.line=function(){
  if(!sup()) return "";
  var st=on();
  return '<div style="margin:10px 0;padding:10px 12px;border-radius:10px;background:'+(st?"#e3f3ea":"#eef3f7")+';border:1px solid '+(st?"#b9dcc6":"#d3dee6")+';font-size:13px;color:#12303f;line-height:1.5">'+
   (st?'🔒 <b>'+E(B("Password lock is ON","പാസ്‌വേഡ് ലോക്ക് ഓൺ ആണ്"))+'</b> '+E(B("(accounts, shop book, cloud backup)","(കണക്കുകൾ, ഷോപ്പ് ബുക്ക്, ക്ലൗഡ് ബാക്കപ്പ്)"))
    :'🔓 '+E(B("Want to lock your data with a password? (optional)","ഡാറ്റ പാസ്‌വേഡ് കൊണ്ട് ലോക്ക് ചെയ്യണോ? (ഓപ്ഷണൽ)")))+
   ' <a href="javascript:void(0)" onclick="tpGo(\'backup\')" style="color:#0b6b78;font-weight:800">'+E(B("My Accounts › Backup","എന്റെ കണക്കുകൾ › Backup"))+'</a>'+
   (P.shopLock&&P.shopLock.stateText&&P.shopLock.stateText()?'<div style="margin-top:4px">🏪 '+E(P.shopLock.stateText())+(P.shopLock.needKey&&P.shopLock.needKey()?' <a href="javascript:void(0)" onclick="tslUnlock()" style="color:#a12d2d;font-weight:800">'+E(B("Enter password","പാസ്‌വേഡ് നൽകുക"))+'</a>':"")+'</div>':"")+'</div>';
 };
 var otb=window.tcOpenBackupPage;
 if(typeof otb==="function") window.tcOpenBackupPage=async function(){
  var r=await otb.apply(this,arguments);
  try{ var s=document.getElementById("tcBkStatus"); if(s&&!document.getElementById("tplLine")){ s.insertAdjacentHTML("afterend",'<div id="tplLine">'+P.lock.line()+'</div>'); } }catch(e){}
  return r;
 };

 /* ---------- start ---------- */
 hide();
 setTimeout(function(){ try{ if(on()){ hide(); autoOpen(); schedule(1500); } }catch(e){} },6000);
})();
