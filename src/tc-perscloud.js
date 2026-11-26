/* My Accounts - CLOUD BACKUP for everybody (customers too) (tc-perscloud.js, loaded by tc-regdocs.js after tc-perslock.js).
   Owner 2026-11-17: an encrypted cloud copy - Rs.99 a year, or Rs.10 for a 30-day copy when changing the phone. Paid by UPI, switched on by the admin.
   - Only the PASSWORD-LOCKED vault of tc-perslock.js goes to the cloud (server /api/perscloud refuses anything else), so the password lock must be ON.
     Nobody can read the copy without the person's password - not even the admin. The password cannot be recovered.
   - with an active plan the newest vault of this phone is sent by itself (a few seconds after a change, at most every 2 minutes) and with "Back up now".
   - "Bring back from cloud" (new phone): the vault is added to db.persVault; My Accounts then shows "Locked accounts found - enter password" (tc-perslock.js);
     records are ADDED by id, nothing is overwritten.
   - the free way stays: backup FILE (share to WhatsApp / Drive / Bluetooth) and restore from it (tc-pers.js).
   - Premium owners whose Premium Cloud Backup already includes My Accounts (tcBkEligible) do not see this card.
   - Admin: Menu > Admin > "My Accounts cloud: requests" (tcPcAdmin): approve / reject, give a plan, stop, prices.
   tc-pers.js / tc-perslock.js are NOT edited (SC.backup and the home cards are wrapped / added to). */
(function(){
 var P=window.__tcPers;
 if(!P||!P.SC||!P.lock||window.__tcPersCloud) return;
 window.__tcPersCloud=1;
 var B=P.B, E=P.E, SC=P.SC;
 var $=function(id){ return document.getElementById(id); };
 function me(){ try{ return P.me?P.me():String((getCurrentUser()||{}).mobile||""); }catch(e){ return ""; } }
 function dev(){ try{ return typeof getDeviceToken==="function"?getDeviceToken():(localStorage.getItem("tc_device_token")||""); }catch(e){ return ""; } }
 function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k); if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} return null; }
 function say(m){ try{ if(P.say) P.say(m); else if(typeof toast==="function") toast(m); }catch(e){} }
 function dmy(iso){ var s=String(iso||"").slice(0,10).split("-"); return s.length===3?s[2]+"-"+s[1]+"-"+s[0]:""; }
 function premiumCloud(){ try{ return typeof tcBkEligible==="function"&&!!tcBkEligible(); }catch(e){ return false; } }
 function api(action,body){
  body=body||{}; body.mobile=me(); body.device_token=dev();
  return fetch("/api/perscloud?action="+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
   .then(function(r){ return r.json().catch(function(){ return {ok:false,error:"bad_answer"}; }); },function(){ return {ok:false,error:"offline"}; });
 }
 var ST=null;   /* last status from the server */
 function cache(s){ ST=s; try{ ls("tc_pcs:"+me(),JSON.stringify({at:Date.now(),s:s})); }catch(e){} }
 function cached(){ try{ var o=JSON.parse(ls("tc_pcs:"+me())||"null"); return o&&o.s?o:null; }catch(e){ return null; } }

 /* the vault this phone made last (tc-perslock.js marks it as applied on this phone) */
 function myVault(){
  var m=me(), ap=[]; try{ ap=JSON.parse(ls("tc_plv:"+m)||"[]")||[]; }catch(e){}
  var L=((typeof db!=="undefined"&&db&&db.persVault)||[]).filter(function(r){ return r&&String(r.u||"")===m&&r.ct&&r.iv&&ap.indexOf(r.id)>=0; });
  L.sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
  return L[0]||null;
 }

 /* ---------- send ---------- */
 var busy=false;
 async function upload(manual,force){
  if(busy) return; busy=true;
  try{
   if(!P.lock.on()){ if(manual) say(B("Turn on the password lock first.","ആദ്യം പാസ്‌വേഡ് ലോക്ക് ഓൺ ചെയ്യുക.")); return; }
   try{ await P.lock.seal(false); }catch(e){}
   var v=myVault(); if(!v){ if(manual) say(B("Nothing to back up yet.","ബാക്കപ്പ് ചെയ്യാൻ ഒന്നുമില്ല.")); return; }
   if(!manual&&ls("tc_pcv:"+me())===v.id) return;
   var r=await api("put",{vault:v,force:!!force});
   if(r.ok){ ls("tc_pcv:"+me(),v.id); ls("tc_pct:"+me(),String(Date.now())); if(manual) say(B("Backed up to the cloud","ക്ലൗഡിൽ ബാക്കപ്പ് ആയി")); }
   else if(r.error==="would_shrink"&&manual){
    if(confirm(B("The cloud copy has "+r.stored_n+" records, this phone only "+r.n+". Replace the cloud copy with this phone's copy?","ക്ലൗഡ് കോപ്പിയിൽ "+r.stored_n+" എണ്ണം ഉണ്ട്, ഈ ഫോണിൽ "+r.n+" മാത്രം. ക്ലൗഡ് കോപ്പി ഈ ഫോണിലേത് കൊണ്ട് മാറ്റണോ?"))){ busy=false; return upload(true,true); }
   }
   else if(manual) say(msgOf(r.error));
  }finally{ busy=false; if(manual) refresh(); }
 }
 window.tpPcBackup=function(){ upload(true,false); };
 function msgOf(e){
  return ({no_plan:B("The cloud plan is not active.","ക്ലൗഡ് പ്ലാൻ ആക്ടീവ് അല്ല."),offline:B("No internet connection.","ഇന്റർനെറ്റ് ഇല്ല."),unauthorized:B("Please log in again on this phone.","ഈ ഫോണിൽ വീണ്ടും ലോഗിൻ ചെയ്യുക."),
   wait:B("Just backed up - try again in a minute.","ഇപ്പോൾ ബാക്കപ്പ് ആയതേയുള്ളൂ - ഒരു മിനിറ്റ് കഴിഞ്ഞ് നോക്കൂ."),not_locked:B("Only a password-locked copy can go to the cloud.","പാസ്‌വേഡ് ലോക്ക് ചെയ്ത കോപ്പി മാത്രമേ ക്ലൗഡിൽ പോകൂ."),
   nothing_stored:B("Nothing is stored in the cloud yet.","ക്ലൗഡിൽ ഇതുവരെ ഒന്നുമില്ല."),bad_utr:B("Type the UPI reference number (UTR) correctly.","UPI റഫറൻസ് നമ്പർ (UTR) ശരിയായി ടൈപ്പ് ചെയ്യുക."),
   already_pending:B("Your earlier request is still waiting.","മുമ്പത്തെ അപേക്ഷ ഇപ്പോഴും കാത്തിരിക്കുന്നു."),too_many:B("Too many requests today.","ഇന്ന് ഒരുപാട് അപേക്ഷകളായി.")})[e]||B("Could not do it. Try again.","ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കുക.");
 }
 /* automatic: a few seconds after a change of the accounts (the vault is re-made by tc-perslock.js), at most every 2 minutes */
 var at=0;
 function autoLater(){
  clearTimeout(at);
  at=setTimeout(function(){
   var s=ST||(cached()||{}).s; if(!s||!s.plan||!s.plan.active||!P.lock.on()) return;
   var last=+ls("tc_pct:"+me())||0; if(Date.now()-last<120000){ autoLater(); return; }
   upload(false,false);
  },15000);
 }
 (function(){ var os=window.save; if(typeof os!=="function") return; window.save=function(){ var r=os.apply(this,arguments); try{ autoLater(); }catch(e){} return r; }; })();

 /* ---------- bring back ---------- */
 window.tpPcRestore=async function(which){
  var r=await api("get",{which:which||""});
  if(!r.ok){ say(msgOf(r.error)); return; }
  var v=r.vault;
  if(!v||String(v.u||"")!==me()){ say(B("This copy is not for this number.","ഈ കോപ്പി ഈ നമ്പറിന്റേതല്ല.")); return; }
  if(!Array.isArray(db.persVault)) db.persVault=[];
  if(!db.persVault.some(function(x){ return x&&x.id===v.id; })) db.persVault.push(v);
  try{ save(); }catch(e){}
  say(B("Cloud copy brought here - enter your password to open it","ക്ലൗഡ് കോപ്പി എത്തി - തുറക്കാൻ പാസ്‌വേഡ് നൽകുക"));
  try{ P.go("home"); }catch(e){}
 };

 /* ---------- ask for a plan ---------- */
 window.tpPcBuy=function(kind){
  if(typeof window.tcInPlayApp==="function"&&window.tcInPlayApp()){ say(B("Plans cannot be bought in the Play Store app.","Play Store ആപ്പിൽ പ്ലാൻ വാങ്ങാൻ സൗകര്യമില്ല.")); return; }   /* Play Store app */
  var s=ST||{}, pr=(s.prices||{})[kind]||(kind==="year"?"99":"10"), upi=(s.upi||{}).id||"", nm=(s.upi||{}).name||"Travel Connect";
  var link=upi?"upi://pay?pa="+encodeURIComponent(upi)+"&pn="+encodeURIComponent(nm)+"&am="+encodeURIComponent(pr)+"&cu=INR&tn="+encodeURIComponent("TC cloud "+me()):"";
  var box=$("tpPcBuyBox"); if(!box) return;
  box.innerHTML='<div class="tpC" style="border:2px solid #0b6b78"><b>'+E(kind==="year"?B("Cloud backup for 1 year","1 വർഷത്തെ ക്ലൗഡ് ബാക്കപ്പ്"):B("Phone change: cloud copy for 30 days","ഫോൺ മാറ്റം: 30 ദിവസത്തെ ക്ലൗഡ് കോപ്പി"))+' - ₹'+E(pr)+'</b>'+
   '<div class="tpM" style="margin-top:6px;line-height:1.5">1. '+E(B("Pay ₹"+pr+" by UPI to: ","₹"+pr+" UPI വഴി അടയ്ക്കുക: "))+'<b>'+E(upi||B("(UPI id not set yet - contact admin)","(UPI ഐഡി ഇതുവരെ ഇല്ല - അഡ്മിനെ ബന്ധപ്പെടുക)"))+'</b><br>2. '+
   E(B("Type the UPI reference number (UTR, 12 digits) of the payment and send. The admin switches it on after checking.","പണമടച്ചതിന്റെ UPI റഫറൻസ് നമ്പർ (UTR, 12 അക്കം) ടൈപ്പ് ചെയ്ത് അയക്കുക. പരിശോധിച്ച ശേഷം അഡ്മിൻ ഓൺ ചെയ്യും."))+'</div>'+
   (link?'<a class="tpBtn g" style="text-align:center;text-decoration:none" href="'+E(link)+'">'+E(B("Open a UPI app to pay","പണമടയ്ക്കാൻ UPI ആപ്പ് തുറക്കുക"))+'</a>':'')+
   '<input id="tpPcUtr" inputmode="numeric" placeholder="UTR" style="margin-top:10px;width:100%;font-size:18px;padding:12px;border:1.5px solid #cdd8e0;border-radius:12px">'+
   '<button class="tpBtn" onclick="tpPcSend(\''+kind+'\')">'+E(B("Send","അയക്കുക"))+'</button></div>';
 };
 window.tpPcSend=async function(kind){
  var u=String(($("tpPcUtr")||{}).value||"").replace(/\s+/g,"");
  if(!/^[A-Za-z0-9]{6,30}$/.test(u)){ say(msgOf("bad_utr")); return; }
  var r=await api("request",{kind:kind,utr:u});
  if(r.ok){ say(B("Sent - the admin will switch it on","അയച്ചു - അഡ്മിൻ ഓൺ ചെയ്യും")); refresh(); }
  else say(msgOf(r.error));
 };
 window.tpPcRemove=async function(){
  if(!confirm(B("Delete your cloud copy? The accounts on this phone stay.","ക്ലൗഡ് കോപ്പി ഡിലീറ്റ് ചെയ്യണോ? ഈ ഫോണിലെ കണക്കുകൾ അതുപോലെ നിൽക്കും."))) return;
  var r=await api("remove",{}); if(r.ok){ ls("tc_pcv:"+me(),null); say(B("Cloud copy deleted","ക്ലൗഡ് കോപ്പി ഡിലീറ്റ് ചെയ്തു")); refresh(); } else say(msgOf(r.error));
 };

 /* ---------- the card on My Accounts > Backup ---------- */
 function cardHtml(s){
  var h='<div class="tpC" id="tpPcCard"><b>☁ '+E(B("Cloud backup (locked with your password)","ക്ലൗഡ് ബാക്കപ്പ് (നിങ്ങളുടെ പാസ്‌വേഡ് കൊണ്ട് ലോക്ക്)"))+'</b>';
  if(!s){ return h+'<div class="tpM" style="margin-top:6px">'+E(B("Checking...","നോക്കുന്നു..."))+'</div></div>'; }
  if(s.error){ return h+'<div class="tpM" style="margin-top:6px">'+E(msgOf(s.error))+'</div></div>'; }
  var pl=s.plan, act=pl&&pl.active, lockOn=P.lock.on();
  if(act){
   h+='<div class="tpNote tpOkN" style="margin:8px 0 0">✅ '+E(B("Active till ","ആക്ടീവ്: "))+E(dmy(pl.until))+(pl.kind==="move"?E(B(" (phone change)"," വരെ (ഫോൺ മാറ്റം)")):E(B(""," വരെ")))+'</div>';
   if(!lockOn) h+='<div class="tpNote" style="margin:8px 0 0">🔒 '+E(B("Turn on the password lock above - only a locked copy goes to the cloud.","മുകളിലെ പാസ്‌വേഡ് ലോക്ക് ഓൺ ചെയ്യുക - ലോക്ക് ചെയ്ത കോപ്പി മാത്രമേ ക്ലൗഡിൽ പോകൂ."))+'</div>';
   else h+='<button class="tpBtn" onclick="tpPcBackup()">☁ '+E(B("Back up now","ഇപ്പോൾ ബാക്കപ്പ് ചെയ്യുക"))+'</button>';
  }
  if(s.stored){
   h+='<div class="tpM" style="margin-top:8px">'+E(B("In the cloud: ","ക്ലൗഡിൽ: "))+E(String(s.stored.n||0))+E(B(" records, saved ","എണ്ണം, സേവ് ചെയ്തത് "))+E(dmy(new Date(s.stored.ts||Date.parse(s.stored.updated_at)||Date.now()).toISOString()))+'</div>';
   if(pl&&pl.readable) h+='<button class="tpBtn g" onclick="tpPcRestore()">⬇ '+E(B("Bring back from cloud (new phone)","ക്ലൗഡിൽ നിന്ന് തിരികെ കൊണ്ടുവരിക (പുതിയ ഫോൺ)"))+'</button>'+
    '<div class="tpM" style="margin-top:4px">'+E(B("Adds only what is missing. You need your password.","ഇല്ലാത്തവ മാത്രം ചേർക്കും. പാസ്‌വേഡ് വേണം."))+'</div>';
   if(pl&&!pl.active&&pl.readable) h+='<div class="tpNote" style="margin:8px 0 0">'+E(B("The plan has ended - the copy is kept for 30 more days. Renew to keep it.","പ്ലാൻ കഴിഞ്ഞു - കോപ്പി 30 ദിവസം കൂടി ഉണ്ടാകും. തുടരാൻ പുതുക്കുക."))+'</div>';
  }
  var rq=s.request;
  if(rq&&rq.status==="pending") h+='<div class="tpNote" style="margin:8px 0 0">⏳ '+E(B("Payment sent (UTR "+rq.utr+") - waiting for the admin to switch it on.","പണമടച്ചു (UTR "+rq.utr+") - അഡ്മിൻ ഓൺ ചെയ്യാൻ കാത്തിരിക്കുന്നു."))+'</div>';
  else{
   if(rq&&rq.status==="rejected") h+='<div class="tpNote" style="margin:8px 0 0">'+E(B("Last request was not accepted","അവസാന അപേക്ഷ സ്വീകരിച്ചില്ല"))+(rq.admin_note?": "+E(rq.admin_note):"")+'</div>';
   var pr=s.prices||{};
   if((!act||pl.kind==="move")&&typeof window.tcInPlayApp==="function"&&window.tcInPlayApp()){
    h+='<div class="tpM" style="margin-top:8px">'+E(B("Plans cannot be bought in the Play Store app.","Play Store ആപ്പിൽ പ്ലാൻ വാങ്ങാൻ സൗകര്യമില്ല."))+'</div>';   /* Google Play billing rule (owner 2026-11-26) */
   }
   else if(!act||pl.kind==="move"){
    h+='<div class="tpM" style="margin-top:8px;line-height:1.5">'+E(B("Keeps a locked copy of all your accounts in the cloud. If the phone is lost or changed, bring it back on the new phone.","നിങ്ങളുടെ എല്ലാ കണക്കുകളുടെയും ലോക്ക് ചെയ്ത കോപ്പി ക്ലൗഡിൽ സൂക്ഷിക്കും. ഫോൺ നഷ്ടപ്പെട്ടാലോ മാറ്റിയാലോ പുതിയ ഫോണിൽ തിരികെ കൊണ്ടുവരാം."))+'</div>'+
     '<div style="display:flex;gap:8px;margin-top:8px"><button class="tpBtn s" style="flex:1;margin-top:0" onclick="tpPcBuy(\'year\')">₹'+E(pr.year||"99")+' / '+E(B("year","വർഷം"))+'</button>'+
     (act?'':'<button class="tpBtn g s" style="flex:1;margin-top:0" onclick="tpPcBuy(\'move\')">₹'+E(pr.move||"10")+' · '+E(B("phone change, 30 days","ഫോൺ മാറ്റം, 30 ദിവസം"))+'</button>')+'</div>';
   }
  }
  h+='<div id="tpPcBuyBox"></div>';
  if(s.stored) h+='<div style="margin-top:10px"><a href="javascript:void(0)" onclick="tpPcRemove()" class="tpM" style="color:#a12d2d">'+E(B("Delete my cloud copy","എന്റെ ക്ലൗഡ് കോപ്പി ഡിലീറ്റ് ചെയ്യുക"))+'</a></div>';
  h+='<div class="tpM" style="margin-top:8px">'+E(B("The password cannot be recovered by anybody (not by us). Free way: take a backup file below and keep it in WhatsApp / Google Drive.","പാസ്‌വേഡ് മറന്നാൽ ആർക്കും (ഞങ്ങൾക്കും) തിരികെ എടുക്കാൻ പറ്റില്ല. സൗജന്യ വഴി: താഴെ ബാക്കപ്പ് ഫയൽ എടുത്ത് WhatsApp / Google Drive-ൽ സൂക്ഷിക്കുക."))+'</div>';
  return h+'</div>';
 }
 function paint(){
  var c=$("tpPcCard"); if(!c) return;
  c.outerHTML=cardHtml(ST);
 }
 function refresh(){
  return api("status",{}).then(function(r){ if(r&&r.ok){ cache(r); ST=r; } else ST={error:(r&&r.error)||"offline"}; paint(); return r; });
 }
 var ob=SC.backup;
 if(typeof ob==="function") SC.backup=function(){
  ob.apply(this,arguments);
  try{
   if(premiumCloud()) return;
   var body=$("tpBody"); if(!body) return;
   var after=$("tplFound")||null, lockCard=body.querySelector(".tpC:not(#tplFound)");
   var html=cardHtml((cached()||{}).s||null);
   if(lockCard&&lockCard.nextSibling) lockCard.insertAdjacentHTML("afterend",html); else body.insertAdjacentHTML("afterbegin",html);
   refresh();
  }catch(e){}
 };
 /* My Accounts home: a short line when a cloud copy waits to be brought to this (new) phone */
 (P.homeCards=P.homeCards||[]).push(function(){
  if(premiumCloud()) return "";
  var c=cached(), s=c&&c.s; if(!s||!s.stored||!s.plan||!s.plan.readable) return "";
  if(myVault()) return "";   /* this phone already has its own vault */
  return '<div class="tpC" onclick="tpGo(\'backup\')" style="cursor:pointer;border:2px solid #0b6b78"><b>☁ '+E(B("Your cloud backup is ready - tap to bring it to this phone","നിങ്ങളുടെ ക്ലൗഡ് ബാക്കപ്പ് തയ്യാർ - ഈ ഫോണിലേക്ക് കൊണ്ടുവരാൻ തൊടുക"))+'</b></div>';
 });
 /* once a day (and on a new phone), ask the server so the home line above can show */
 setTimeout(function(){
  try{
   if(!me()||premiumCloud()) return;
   var c=cached(); if(c&&Date.now()-c.at<20*3600000) return;
   refresh();
  }catch(e){}
 },8000);

 /* ---------- ADMIN ---------- */
 function adm(){ try{ return typeof adminToken==="function"?adminToken():""; }catch(e){ return ""; } }
 function aapi(action,body){ body=body||{}; body.token=adm(); return fetch("/api/perscloud?action="+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){ return r.json(); }).catch(function(){ return {ok:false,error:"offline"}; }); }
 window.tcPcAdmin=async function(){
  var d=await aapi("admin_list",{});
  if(!d.ok){ say(d.error==="unauthorized"?B("Admin login needed","അഡ്മിൻ ലോഗിൻ വേണം"):B("Could not load","ലോഡ് ചെയ്യാനായില്ല")); return; }
  var k=function(x){ return x==="year"?B("1 year","1 വർഷം"):B("phone change 30 days","ഫോൺ മാറ്റം 30 ദിവസം"); };
  var h='<h3 style="margin:0 0 8px">'+E(B("My Accounts cloud backup","എന്റെ കണക്കുകൾ - ക്ലൗഡ് ബാക്കപ്പ്"))+'</h3>';
  h+='<div style="font-weight:800;margin:10px 0 4px">'+E(B("Waiting for you","കാത്തിരിക്കുന്നവ"))+' ('+d.pending.length+')</div>';
  if(!d.pending.length) h+='<div class="muted">'+E(B("Nothing waiting.","ഒന്നുമില്ല."))+'</div>';
  d.pending.forEach(function(r){
   h+='<div style="border:1px solid #d3dee6;border-radius:12px;padding:10px;margin:6px 0"><b>'+E(r.name||"")+'</b> '+E(r.mobile)+'<br>'+E(k(r.kind))+' · ₹'+E(r.amount||"")+' · UTR <b>'+E(r.utr||"")+'</b><br><span class="muted">'+E(dmy(r.created_at))+'</span>'+
    '<div style="display:flex;gap:6px;margin-top:6px"><button class="primary" onclick="tcPcDecide('+(+r.id)+',\'approve\')">'+E(B("Payment received - switch on","പണം കിട്ടി - ഓൺ ചെയ്യുക"))+'</button><button onclick="tcPcDecide('+(+r.id)+',\'reject\')">'+E(B("Reject","നിരസിക്കുക"))+'</button></div></div>';
  });
  h+='<div style="font-weight:800;margin:14px 0 4px">'+E(B("Plans","പ്ലാനുകൾ"))+' ('+d.plans.length+')</div>';
  d.plans.slice(0,60).forEach(function(p){
   var on=Date.parse(p.until)>Date.now();
   h+='<div style="padding:6px 0;border-bottom:1px solid #eef2f5;font-size:14px"><b>'+E(p.name||"")+'</b> '+E(p.mobile)+' · '+E(k(p.kind))+' · '+(on?E(B("till ","വരെ "))+E(dmy(p.until)):'<span style="color:#a12d2d">'+E(B("ended ","കഴിഞ്ഞു "))+E(dmy(p.until))+'</span>')+(p.size!=null?' · ☁ '+E(String(p.n||0)):'')+
    (on?' <a href="javascript:void(0)" onclick="tcPcStop(\''+E(p.mobile)+'\')" style="color:#a12d2d">'+E(B("stop","നിർത്തുക"))+'</a>':'')+'</div>';
  });
  h+='<div style="font-weight:800;margin:14px 0 4px">'+E(B("Give a plan by mobile number","മൊബൈൽ നമ്പർ നൽകി പ്ലാൻ കൊടുക്കുക"))+'</div><input id="tcPcGm" inputmode="numeric" placeholder="Mobile" style="width:100%"><div style="display:flex;gap:6px;margin-top:6px"><button onclick="tcPcGrant(\'year\')">'+E(B("1 year","1 വർഷം"))+'</button><button onclick="tcPcGrant(\'move\')">'+E(B("30 days","30 ദിവസം"))+'</button></div>';
  h+='<div style="font-weight:800;margin:14px 0 4px">'+E(B("Prices (₹)","വില (₹)"))+'</div><div style="display:flex;gap:6px"><input id="tcPcPy" inputmode="numeric" value="'+E(d.prices.year)+'" style="flex:1" placeholder="year"><input id="tcPcPm" inputmode="numeric" value="'+E(d.prices.move)+'" style="flex:1" placeholder="30 days"><button onclick="tcPcPrices()">'+E(B("Save","സേവ്"))+'</button></div>';
  h+='<div class="muted" style="margin-top:10px">'+E(B("The UPI id is the same as for the partner plans (Partner Plans › Prices & UPI). The copies are locked with each person's password - nobody here can read them.","UPI ഐഡി പാർട്ണർ പ്ലാനുകളുടേത് തന്നെ (Partner Plans › Prices & UPI). കോപ്പികൾ ഓരോരുത്തരുടെയും പാസ്‌വേഡ് കൊണ്ട് ലോക്ക് ചെയ്തതാണ് - ഇവിടെ ആർക്കും വായിക്കാനാകില്ല."))+'</div>';
  if(typeof modal==="function") modal(h);
 };
 window.tcPcDecide=async function(id,dec){ var note=dec==="reject"?(prompt(B("Reason (optional)","കാരണം (ഓപ്ഷണൽ)"))||""):""; var r=await aapi("admin_decide",{id:id,decision:dec,note:note}); say(r.ok?B("Done","ചെയ്തു"):B("Could not do it","ചെയ്യാനായില്ല")); tcPcAdmin(); };
 window.tcPcGrant=async function(kind){ var m=String(($("tcPcGm")||{}).value||"").replace(/\D/g,""); if(!m) return; var r=await aapi("admin_grant",{mobile:m,kind:kind}); say(r.ok?B("Plan given","പ്ലാൻ കൊടുത്തു"):(r.error==="no_user"?B("No user with this number","ഈ നമ്പറിൽ ആളില്ല"):B("Could not do it","ചെയ്യാനായില്ല"))); if(r.ok) tcPcAdmin(); };
 window.tcPcStop=async function(m){ if(!confirm(B("Stop this plan now?","ഈ പ്ലാൻ ഇപ്പോൾ നിർത്തണോ?"))) return; var r=await aapi("admin_stop",{mobile:m}); say(r.ok?B("Stopped","നിർത്തി"):B("Could not do it","ചെയ്യാനായില്ല")); tcPcAdmin(); };
 window.tcPcPrices=async function(){ var r=await aapi("admin_prices",{year:($("tcPcPy")||{}).value,move:($("tcPcPm")||{}).value}); say(r.ok?B("Saved","സേവ് ചെയ്തു"):B("Could not save","സേവ് ചെയ്യാനായില്ല")); };
})();
