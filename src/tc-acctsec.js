/* Account security (tc-acctsec.js, loaded by tc-regdocs.js).
   Works with functions/api/_loginotp.js (server). What the person sees:
   1) LOGIN PAGE: a notice - "full privacy protection works only after you verify your e-mail; without it anybody who knows your
      mobile number can log in as you on another phone".
   2) NEW PHONE on a protected account (verified e-mail): the login is answered "otp_required". This file catches that answer,
      asks the server to e-mail a 6-digit code, shows a small box to type it, and repeats the login when the code was right.
      (core.js is not changed - the login request is intercepted in window.fetch, only while the login page is on screen.)
   3) DASHBOARD (business owners with a listing whose e-mail is NOT verified): a yellow bar "Your account is not fully protected"
      with [Verify e-mail] and [Later] (hidden for 3 days). It is placed just above the dashboard box (a sibling of it, not inside it), so it never fights the
      order of the dashboard boxes.
   4) MENU > "My account security": e-mail state, how many phones are signed in, [Verify e-mail], [Sign out all other phones].
   Nothing is stored except a 6-hour copy of the server's answer (localStorage tc_sec_info) and the "Later" time (tc_sec_snooze). */
(function(){
 if(window.__tcAcctSec) return;
 window.__tcAcctSec=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var of=window.fetch;
 var LS={
  get:function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set:function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
 };
 function user(){ try{ return JSON.parse(localStorage.getItem("tc_user")||"null"); }catch(e){ return null; } }
 function dev(){ try{ return typeof getDeviceToken==="function"?getDeviceToken():(localStorage.getItem("tc_device_token")||""); }catch(e){ return ""; } }
 function api(action,extra){
  var body=Object.assign({action:action},extra||{});
  return of.call(window,"/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(function(r){
   return r.json().then(function(j){ j=j||{}; j.__status=r.status; return j; });
  });
 }

 /* ------------------------------------------------------------------ 1) login page notice */
 function loginNotice(){
  var err=$("loginError");
  if(!err||!$("loginName")||$("tcLoginWarn")) return;
  var d=document.createElement("div"); d.id="tcLoginWarn";
  d.style.cssText="text-align:left;font-size:12px;line-height:1.45;color:#5c4400;background:#fff6e0;border:1px solid #e0a526;border-radius:10px;padding:8px 10px;margin:8px 0 2px";
  d.innerHTML="&#128274; <b>"+E(B("Privacy notice","സ്വകാര്യത"))+"</b><br>"+
   E(B("Your data is fully protected only after you verify your e-mail (Dashboard > More > Verification & Plan). With a verified e-mail, a new phone can log in to your account only with a code sent to that e-mail. Without it, anybody who knows your mobile number can log in as you on another phone.",
       "ഇമെയിൽ വെരിഫൈ ചെയ്താൽ മാത്രമേ നിങ്ങളുടെ വിവരങ്ങൾ പൂർണ്ണമായും സുരക്ഷിതമാകൂ (ഡാഷ്ബോർഡ് > More > Verification & Plan). വെരിഫൈ ചെയ്ത അക്കൗണ്ടിൽ പുതിയ ഫോണിൽ ലോഗിൻ ചെയ്യാൻ ആ ഇമെയിലിൽ വരുന്ന കോഡ് വേണം. അല്ലെങ്കിൽ നിങ്ങളുടെ മൊബൈൽ നമ്പർ അറിയുന്ന ആർക്കും മറ്റൊരു ഫോണിൽ നിങ്ങളായി ലോഗിൻ ചെയ്യാം."));
  err.parentNode.insertBefore(d,err);
 }

 /* ------------------------------------------------------------------ 2) e-mailed code for a new phone */
 var asking=null;
 function askCode(mobile,hint){
  if(asking) return asking;
  asking=new Promise(function(resolve){
   var old=$("tcOtpAsk"); if(old) old.remove();
   var d=document.createElement("div"); d.id="tcOtpAsk";
   d.style.cssText="position:fixed;left:0;top:0;right:0;bottom:0;z-index:100000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px";
   d.innerHTML='<div style="background:#fff;border-radius:16px;max-width:340px;width:100%;padding:20px 18px;box-shadow:0 8px 30px rgba(0,0,0,.3)">'+
    '<div style="font-weight:800;font-size:16px;color:#082b49;margin-bottom:6px">&#128274; '+E(B("New phone - enter the code","പുതിയ ഫോൺ - കോഡ് നൽകുക"))+'</div>'+
    '<div id="tcOtpText" class="muted" style="font-size:13px;margin-bottom:10px">'+E(B("This account is protected. We are sending a 6-digit code to its verified e-mail","ഈ അക്കൗണ്ട് സംരക്ഷിതമാണ്. വെരിഫൈ ചെയ്ത ഇമെയിലിലേക്ക് 6 അക്ക കോഡ് അയയ്ക്കുന്നു"))+' <b>'+E(hint||"")+'</b>.</div>'+
    '<input id="tcOtpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="------" style="width:100%;box-sizing:border-box;font-size:24px;text-align:center;letter-spacing:8px;padding:10px;border-radius:10px;border:1px solid #c9d4dc;margin-bottom:8px">'+
    '<div id="tcOtpMsg" style="min-height:18px;font-size:12.5px;color:#a12d2d;margin-bottom:8px"></div>'+
    '<button id="tcOtpGo" class="primary" style="width:100%;padding:11px;border-radius:10px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:15px;margin-bottom:6px">'+E(B("Verify and log in","വെരിഫൈ ചെയ്ത് ലോഗിൻ"))+'</button>'+
    '<div style="display:flex;gap:6px"><button id="tcOtpResend" style="flex:1;padding:9px;border-radius:10px;border:1px solid #c9d4dc;background:#f5f8fa">'+E(B("Send code again","കോഡ് വീണ്ടും അയയ്ക്കുക"))+'</button>'+
    '<button id="tcOtpCancel" style="flex:1;padding:9px;border-radius:10px;border:1px solid #c9d4dc;background:#f5f8fa">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>'+
    '<div class="muted" style="font-size:11.5px;margin-top:8px">'+E(B("Not your account? Cancel - nobody can log in without the code.","നിങ്ങളുടെ അക്കൗണ്ട് അല്ലേ? റദ്ദാക്കുക - കോഡ് ഇല്ലാതെ ആർക്കും ലോഗിൻ ചെയ്യാനാവില്ല."))+'</div></div>';
   document.body.appendChild(d);
   var msg=function(t,good){ var m=$("tcOtpMsg"); if(m){ m.textContent=t||""; m.style.color=good?"#1c6b2c":"#a12d2d"; } };
   var cool=null;
   function startCool(sec){
    var b=$("tcOtpResend"); if(!b) return; clearInterval(cool); var n=sec;
    b.disabled=true;
    cool=setInterval(function(){ n--; if(!$("tcOtpResend")){ clearInterval(cool); return; } if(n<=0){ clearInterval(cool); b.disabled=false; b.textContent=B("Send code again","കോഡ് വീണ്ടും അയയ്ക്കുക"); } else b.textContent=B("Send again in ","വീണ്ടും അയയ്ക്കാൻ ")+n+"s"; },1000);
   }
   function finish(v){ clearInterval(cool); var x=$("tcOtpAsk"); if(x) x.remove(); asking=null; resolve(v); }
   function send(){
    msg("");
    return api("login_otp_send",{mobile:mobile,device_token:dev()}).then(function(j){
     if(j.ok&&j.not_needed){ finish(true); return; }
     if(j.ok){ msg(B("Code sent. Check your e-mail (also the spam folder).","കോഡ് അയച്ചു. ഇമെയിൽ നോക്കുക (സ്പാം ഫോൾഡറും)."),true); startCool(60); return; }
     if(j.error==="wait"){ msg(B("A code was sent a moment ago. Use it, or wait to send again.","കോഡ് ഇപ്പോൾ അയച്ചിട്ടുണ്ട്. അത് ഉപയോഗിക്കുക, അല്ലെങ്കിൽ കാത്തിരിക്കുക."),true); startCool(j.retry_in||60); return; }
     if(j.error==="too_many"){ msg(B("Too many codes were asked for. Try again after an hour.","ഒരുപാട് കോഡുകൾ ചോദിച്ചു. ഒരു മണിക്കൂറിന് ശേഷം ശ്രമിക്കുക.")); return; }
     msg(B("The code could not be sent now. Try again later, or contact the app owner.","കോഡ് ഇപ്പോൾ അയയ്ക്കാനായില്ല. പിന്നീട് ശ്രമിക്കുക, അല്ലെങ്കിൽ ആപ്പ് ഉടമയെ ബന്ധപ്പെടുക."));
    }).catch(function(){ msg(B("No connection. Check the internet and try again.","കണക്ഷൻ ഇല്ല. ഇന്റർനെറ്റ് നോക്കി വീണ്ടും ശ്രമിക്കുക.")); });
   }
   $("tcOtpGo").onclick=function(){
    var code=($("tcOtpCode").value||"").replace(/\D/g,"");
    if(code.length!==6){ msg(B("Enter the 6-digit code.","6 അക്ക കോഡ് നൽകുക.")); return; }
    $("tcOtpGo").disabled=true;
    api("login_otp_verify",{mobile:mobile,device_token:dev(),code:code}).then(function(j){
     if(j.ok){ finish(true); return; }
     $("tcOtpGo")&&($("tcOtpGo").disabled=false);
     if(j.error==="wrong_code") msg(B("Wrong code. Tries left: ","കോഡ് തെറ്റാണ്. ശ്രമങ്ങൾ ബാക്കി: ")+(j.attempts_left==null?"":j.attempts_left));
     else if(j.error==="expired") msg(B("The code has expired. Send a new one.","കോഡിന്റെ സമയം കഴിഞ്ഞു. പുതിയത് അയയ്ക്കുക."));
     else if(j.error==="too_many_attempts") msg(B("Too many wrong tries. Send a new code.","ഒരുപാട് തെറ്റായ ശ്രമങ്ങൾ. പുതിയ കോഡ് അയയ്ക്കുക."));
     else if(j.error==="no_code") msg(B("No code was sent from this phone yet. Tap 'Send code again'.","ഈ ഫോണിൽ നിന്ന് കോഡ് അയച്ചിട്ടില്ല. 'കോഡ് വീണ്ടും അയയ്ക്കുക' അമർത്തുക."));
     else msg(B("Could not check the code. Try again.","കോഡ് പരിശോധിക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക."));
    }).catch(function(){ $("tcOtpGo")&&($("tcOtpGo").disabled=false); msg(B("No connection. Check the internet and try again.","കണക്ഷൻ ഇല്ല. ഇന്റർനെറ്റ് നോക്കി വീണ്ടും ശ്രമിക്കുക.")); });
   };
   $("tcOtpResend").onclick=function(){ send(); };
   $("tcOtpCancel").onclick=function(){ finish(false); };
   send();
  });
  return asking;
 }

 /* catches the "otp_required" answer of a login made from the login page and repeats the login after the code */
 function isLogin(input,init){
  try{
   var url=typeof input==="string"?input:(input&&input.url)||"";
   if(url.indexOf("/api/auth")<0) return null;
   var method=((init&&init.method)||(typeof input!=="string"&&input&&input.method)||"GET").toUpperCase();
   if(method!=="POST") return null;
   var raw=init&&typeof init.body==="string"?init.body:"";
   if(raw.indexOf('"login"')<0) return null;
   var o=JSON.parse(raw);
   return o&&o.action==="login"?o:null;
  }catch(e){ return null; }
 }
 if(typeof of==="function") window.fetch=function(input,init){
  var p=of.apply(this,arguments), lo=isLogin(input,init);
  if(!lo) return p;
  var self=this;
  return p.then(function(res){
   if(res.status!==403) return res;
   return res.clone().json().then(function(j){
    if(!j||j.error!=="otp_required"||!$("loginName")) return res;
    return askCode(String(lo.mobile||""),j.hint).then(function(okc){
     if(okc) return of.call(self,input,init);
     setTimeout(function(){ var e=$("loginError"); if(e) e.textContent=B("This account is protected - log in on a new phone needs the e-mailed code.","ഈ അക്കൗണ്ട് സംരക്ഷിതമാണ് - പുതിയ ഫോണിൽ ലോഗിൻ ചെയ്യാൻ ഇമെയിലിൽ വരുന്ന കോഡ് വേണം."); },30);
     return res;
    });
   }).catch(function(){ return res; });
  });
 };

 /* ------------------------------------------------------------------ server state of my account */
 function cachedInfo(){
  try{ var c=JSON.parse(LS.get("tc_sec_info")||"null"); if(c&&c.mobile===(user()||{}).mobile) return c; }catch(e){}
  return null;
 }
 function loadInfo(force){
  var u=user(); if(!u||!u.mobile||!dev()) return Promise.resolve(null);
  var c=cachedInfo();
  if(!force&&c&&Date.now()-c.at<6*3600*1000) return Promise.resolve(c);
  return api("security_info",{mobile:u.mobile,device_token:dev()}).then(function(j){
   if(!j.ok) return c;
   var o={at:Date.now(),mobile:u.mobile,verified:!!j.email_verified,hint:j.email_hint||"",devices:j.devices||1,enforce:!!j.enforce};
   LS.set("tc_sec_info",JSON.stringify(o)); return o;
  }).catch(function(){ return c; });
 }
 function hasListing(){ try{ return !!(db&&db.settings&&db.settings.myPartnerId); }catch(e){ return false; } }
 function goVerify(){
  try{ if(typeof closeModal==="function") closeModal(); }catch(e){}
  if(typeof window.tcUpOpenEmail==="function"){ window.tcUpOpenEmail(); return; }
  say(B("Open Dashboard > More > Verification & Plan and tap Verify e-mail","ഡാഷ്ബോർഡ് > More > Verification & Plan തുറന്ന് Verify e-mail അമർത്തുക"));
 }
 window.tcSecVerify=goVerify;

 /* ------------------------------------------------------------------ 3) dashboard bar */
 function snoozed(){ var t=parseInt(LS.get("tc_sec_snooze")||"0",10); return t&&Date.now()-t<3*86400000; }
 window.tcSecLater=function(){ LS.set("tc_sec_snooze",String(Date.now())); var b=$("tcSecBar"); if(b) b.remove(); };
 var busy=false;
 function bar(){
  var a=$("app"); if(!a) return;
  var u=user(), h2=a.querySelector(".card>h2"), cur=$("tcSecBar");
  var onDash=h2&&/Travel Connect Dashboard|ഡാഷ്ബോർഡ്/i.test(h2.textContent);
  if(!u||u.role!=="owner"||!onDash||!hasListing()||snoozed()){ if(cur) cur.remove(); return; }
  if(cur||busy) return;
  busy=true;
  loadInfo(false).then(function(info){
   busy=false;
   if(!info||info.verified||$("tcSecBar")) return;
   var host=a.querySelector(".card>h2"); host=host&&host.parentNode; if(!host||!host.parentNode) return;
   var d=document.createElement("div"); d.id="tcSecBar";
   d.style.cssText="padding:8px 12px;margin:0 0 10px;border-radius:12px;border:2px solid #e0a526;background:#fff6e0;color:#5c4400;font-size:12.5px;line-height:1.4";
   d.innerHTML='<b>&#128274; '+E(B("Your account is not fully protected","നിങ്ങളുടെ അക്കൗണ്ട് പൂർണ്ണമായി സംരക്ഷിതമല്ല"))+'</b><br>'+
    E(B("Verify your e-mail. Then a new phone can log in as you only with a code sent to your e-mail - nobody can use just your mobile number.","ഇമെയിൽ വെരിഫൈ ചെയ്യുക. അതിനുശേഷം പുതിയ ഫോണിൽ ലോഗിൻ ചെയ്യാൻ ഇമെയിലിൽ വരുന്ന കോഡ് വേണം - മൊബൈൽ നമ്പർ മാത്രം വച്ച് ആർക്കും കഴിയില്ല."))+
    '<div style="display:flex;gap:6px;margin-top:6px"><button class="primary" onclick="tcSecVerify()" style="padding:6px 11px;font-size:12px;border-radius:9px">&#9993; '+E(B("Verify e-mail","ഇമെയിൽ വെരിഫൈ ചെയ്യുക"))+'</button>'+
    '<button onclick="tcSecLater()" style="padding:6px 11px;font-size:12px;border-radius:9px">'+E(B("Later","പിന്നീട്"))+'</button></div>';
   host.parentNode.insertBefore(d,host);
  }).catch(function(){ busy=false; });
 }
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ loginNotice(); bar(); }catch(e){} },160); }
 function start(){
  var a=$("app"); if(!a||!window.MutationObserver) return;
  new MutationObserver(later).observe(a,{childList:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();

 /* ------------------------------------------------------------------ 4) My account security screen */
 window.tcAcctSecOpen=function(){
  var u=user();
  if(!u||!u.mobile){ return; }
  modal('<h3 style="margin:0 0 6px">'+E(B("My account security","എന്റെ അക്കൗണ്ട് സുരക്ഷ"))+'</h3><p class="muted">...</p>');
  loadInfo(true).then(function(info){
   if(!info){ modal('<h3>'+E(B("My account security","എന്റെ അക്കൗണ്ട് സുരക്ഷ"))+'</h3><p class="danger">'+E(B("Could not load. Check the internet.","ലോഡ് ചെയ്യാനായില്ല. ഇന്റർനെറ്റ് നോക്കുക."))+'</p><button onclick="closeModal()" style="width:100%">'+E(B("Close","അടയ്ക്കുക"))+'</button>'); return; }
   var good=info.verified;
   modal('<h3 style="margin:0 0 8px">'+E(B("My account security","എന്റെ അക്കൗണ്ട് സുരക്ഷ"))+'</h3>'+
    '<div style="padding:8px 10px;border-radius:10px;border:2px solid '+(good?'#2e8b57':'#e0a526')+';background:'+(good?'#eaf7f0':'#fff6e0')+';margin-bottom:8px">'+
    (good?'<b>&#10003; '+E(B("Protected","സംരക്ഷിതം"))+'</b><br>'+E(B("A new phone can log in to your account only with a code sent to ","പുതിയ ഫോണിൽ ലോഗിൻ ചെയ്യാൻ കോഡ് വേണം, കോഡ് പോകുന്നത്: "))+'<b>'+E(info.hint)+'</b>'
         :'<b>&#9888; '+E(B("Not fully protected","പൂർണ്ണമായി സംരക്ഷിതമല്ല"))+'</b><br>'+E(B("Your e-mail is not verified. Anybody who knows your mobile number can log in as you on another phone. Verify your e-mail to protect the account.","നിങ്ങളുടെ ഇമെയിൽ വെരിഫൈ ചെയ്തിട്ടില്ല. മൊബൈൽ നമ്പർ അറിയുന്ന ആർക്കും മറ്റൊരു ഫോണിൽ നിങ്ങളായി ലോഗിൻ ചെയ്യാം. അക്കൗണ്ട് സംരക്ഷിക്കാൻ ഇമെയിൽ വെരിഫൈ ചെയ്യുക.")))+
    '</div>'+
    '<div style="font-size:13px;margin-bottom:8px">'+E(B("Phones signed in to this account: ","ഈ അക്കൗണ്ടിൽ ലോഗിൻ ചെയ്ത ഫോണുകൾ: "))+'<b>'+E(info.devices)+'</b></div>'+
    (good?'':'<button class="primary" onclick="tcSecVerify()" style="width:100%;margin-bottom:6px">&#9993; '+E(B("Verify e-mail","ഇമെയിൽ വെരിഫൈ ചെയ്യുക"))+'</button>')+
    '<button onclick="tcSecSignOutOthers()" style="width:100%;margin-bottom:6px"'+(info.devices>1?'':' disabled')+'>'+E(B("Sign out all other phones","മറ്റെല്ലാ ഫോണുകളും സൈൻ ഔട്ട് ചെയ്യുക"))+'</button>'+
    '<div class="muted" style="font-size:11.5px;margin-bottom:8px">'+E(B("Use this if you lost a phone or somebody else logged in as you. The other phones will have to log in again"+(good?" with the e-mailed code.":"."),"ഫോൺ നഷ്ടപ്പെടുകയോ മറ്റൊരാൾ നിങ്ങളായി ലോഗിൻ ചെയ്യുകയോ ചെയ്താൽ ഇത് ഉപയോഗിക്കുക. മറ്റ് ഫോണുകൾ വീണ്ടും ലോഗിൻ ചെയ്യേണ്ടി വരും"+(good?" (ഇമെയിൽ കോഡ് വേണം).":".")))+'</div>'+
    '<button onclick="closeModal()" style="width:100%">'+E(B("Close","അടയ്ക്കുക"))+'</button>');
  });
 };
 window.tcSecSignOutOthers=function(){
  var u=user(); if(!u) return;
  if(!confirm(B("Sign out every other phone from this account?","ഈ അക്കൗണ്ടിൽ നിന്ന് മറ്റെല്ലാ ഫോണുകളും സൈൻ ഔട്ട് ചെയ്യട്ടെ?"))) return;
  api("revoke_others",{mobile:u.mobile,device_token:dev()}).then(function(j){
   if(j.ok){ say(B("Other phones signed out","മറ്റ് ഫോണുകൾ സൈൻ ഔട്ട് ആയി")); try{ LS.set("tc_sec_info",""); }catch(e){} window.tcAcctSecOpen(); }
   else say(B("Could not sign out the other phones","മറ്റ് ഫോണുകൾ സൈൻ ഔട്ട് ചെയ്യാനായില്ല"));
  }).catch(function(){ say(B("No connection","കണക്ഷൻ ഇല്ല")); });
 };

 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var u=user(), body=$("modalBody");
   if(u&&u.mobile&&body&&!body.querySelector("#tcAcctSecMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcAcctSecMenu";
    wrap.innerHTML=tcMenuItem('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path>',B("My account security","എന്റെ അക്കൗണ്ട് സുരക്ഷ"),"closeModal();tcAcctSecOpen()");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };
})();
