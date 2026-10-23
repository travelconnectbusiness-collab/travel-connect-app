/* E-mail first login (tc-emaillogin.js, loaded by tc-regdocs.js after tc-acctsec.js).
   Works with functions/api/_loginotp.js + auth.js (server). Identity = the verified e-mail; the mobile number is only a contact.
   1) LOGIN PAGE: a box "Your e-mail" comes first. The person types the e-mail, gets a 6-digit code, types it.
      - e-mail already belongs to an account -> name / mobile / role are filled in (mobile and e-mail locked), this phone becomes trusted,
        the person creates the PIN for this phone and presses Continue. Nobody can enter another person's account with only a number.
      - new e-mail -> the e-mail is locked as "verified", the person fills name + mobile; the login request carries "email_proof" so the
        server creates the account with the e-mail already verified. A mobile that belongs to an account verified with another e-mail is refused.
      - link "Continue without e-mail (own risk)": the old login form (name + mobile) for people who cannot / will not use an e-mail.
   2) FORGOT PIN (app lock screen): if the account has a verified e-mail, a code is mailed to it and only then a new PIN can be set;
      the person stays logged in. (Before: "Forgot PIN" logged the phone out and anyone could log in again with the number.)
      Accounts without a verified e-mail keep the old behaviour.
   core.js is not changed: the login form is hidden/filled from outside and the login request is completed in window.fetch. */
(function(){
 if(window.__tcEmailLogin) return;
 window.__tcEmailLogin=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var of=window.fetch;
 function dev(){ try{ return typeof getDeviceToken==="function"?getDeviceToken():(localStorage.getItem("tc_device_token")||""); }catch(e){ return ""; } }
 function user(){ try{ return JSON.parse(localStorage.getItem("tc_user")||"null"); }catch(e){ return null; } }
 function api(action,extra){
  var body=Object.assign({action:action},extra||{});
  return of.call(window,"/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(function(r){
   return r.json().then(function(j){ j=j||{}; j.__status=r.status; return j; });
  });
 }
 var NOCONN=B("No connection. Check the internet and try again.","കണക്ഷൻ ഇല്ല. ഇന്റർനെറ്റ് നോക്കി വീണ്ടും ശ്രമിക്കുക.");
 function sendErr(j){
  if(j.error==="bad_email") return B("Enter a correct e-mail address.","ശരിയായ ഇമെയിൽ വിലാസം നൽകുക.");
  if(j.error==="wait") return B("A code was sent a moment ago. Use it, or wait a minute.","കോഡ് ഇപ്പോൾ അയച്ചിട്ടുണ്ട്. അത് ഉപയോഗിക്കുക, അല്ലെങ്കിൽ ഒരു മിനിറ്റ് കാത്തിരിക്കുക.");
  if(j.error==="too_many") return B("Too many codes were asked for. Try again after an hour.","ഒരുപാട് കോഡുകൾ ചോദിച്ചു. ഒരു മണിക്കൂറിന് ശേഷം ശ്രമിക്കുക.");
  if(j.error==="blocked") return B("This account is blocked. Contact the app owner.","ഈ അക്കൗണ്ട് ബ്ലോക്ക് ചെയ്തിരിക്കുന്നു. ആപ്പ് ഉടമയെ ബന്ധപ്പെടുക.");
  return B("The code could not be sent now. Try again later.","കോഡ് ഇപ്പോൾ അയയ്ക്കാനായില്ല. പിന്നീട് ശ്രമിക്കുക.");
 }
 function codeErr(j){
  if(j.error==="wrong_code") return B("Wrong code. Tries left: ","കോഡ് തെറ്റാണ്. ശ്രമങ്ങൾ ബാക്കി: ")+(j.attempts_left==null?"":j.attempts_left);
  if(j.error==="expired") return B("The code has expired. Send a new one.","കോഡിന്റെ സമയം കഴിഞ്ഞു. പുതിയത് അയയ്ക്കുക.");
  if(j.error==="too_many_attempts") return B("Too many wrong tries. Send a new code.","ഒരുപാട് തെറ്റായ ശ്രമങ്ങൾ. പുതിയ കോഡ് അയയ്ക്കുക.");
  if(j.error==="no_code") return B("No code was sent from this phone yet. Send the code again.","ഈ ഫോണിൽ നിന്ന് കോഡ് അയച്ചിട്ടില്ല. കോഡ് വീണ്ടും അയയ്ക്കുക.");
  if(j.error==="blocked") return B("This account is blocked. Contact the app owner.","ഈ അക്കൗണ്ട് ബ്ലോക്ക് ചെയ്തിരിക്കുന്നു. ആപ്പ് ഉടമയെ ബന്ധപ്പെടുക.");
  return B("Could not check the code. Try again.","കോഡ് പരിശോധിക്കാനായില്ല. വീണ്ടും ശ്രമിക്കുക.");
 }
 (function css(){
  var s=document.createElement("style");
  s.textContent=".tc-el-hide{display:none!important}";
  (document.head||document.documentElement).appendChild(s);
 })();

 /* ------------------------------------------------------------------ 1) login page */
 var S={step:"email",unlocked:false,email:"",proof:"",exists:false,risk:false};
 function resetState(){ S={step:"email",unlocked:false,email:"",proof:"",exists:false,risk:false}; }
 function card(){ var i=$("loginIntro"); return i?i.parentNode:null; }
 function setFormHidden(hide){
  var c=card(), p=$("tcElPanel"); if(!c||!p) return;
  var seen=false;
  for(var n=c.firstElementChild;n;n=n.nextElementSibling){
   if(n===p){ seen=true; continue; }
   if(!seen) continue;
   if(n.id==="tcElSkipWrap") continue;
   n.classList[hide?"add":"remove"]("tc-el-hide");
  }
 }
 function panelHtml(){
  var h='<div style="text-align:left;background:#eef7f7;border:1px solid #bcdcdc;border-radius:12px;padding:12px 12px 10px;margin:0 0 14px">';
  if(S.step==="done"){
   h+='<div style="font-size:13px;color:#1c6b2c;font-weight:700">&#9989; '+E(B("E-mail verified","ഇമെയിൽ വെരിഫൈ ചെയ്തു"))+'</div>'+
      '<div style="font-size:13px;color:#172536;word-break:break-all;margin:2px 0 4px"><b>'+E(S.email)+'</b></div>'+
      '<div style="font-size:12px;color:#556;line-height:1.4">'+(S.exists
        ?E(B("Your account was found. Check your details, create a PIN for this phone and press Continue.","നിങ്ങളുടെ അക്കൗണ്ട് കണ്ടെത്തി. വിവരങ്ങൾ നോക്കി, ഈ ഫോണിനുള്ള PIN ഉണ്ടാക്കി Continue അമർത്തുക."))
        :E(B("New account. Fill your name and mobile number below. Your mobile number is only a contact number.","പുതിയ അക്കൗണ്ട്. പേരും മൊബൈൽ നമ്പറും താഴെ നൽകുക. മൊബൈൽ നമ്പർ വെറും ബന്ധപ്പെടാനുള്ള നമ്പർ മാത്രമാണ്.")))+'</div>'+
      '<div style="margin-top:6px"><a href="#" id="tcElChange" style="font-size:12px;color:#0b6b78;font-weight:600">'+E(B("Use another e-mail","മറ്റൊരു ഇമെയിൽ ഉപയോഗിക്കുക"))+'</a></div>';
  }else if(S.risk){
   h+='<div style="font-size:12.5px;color:#7a4b00;line-height:1.4">&#9888;&#65039; '+E(B("Without a verified e-mail your account is not fully protected: anybody who knows your mobile number can log in as you on another phone. You continue at your own risk.","വെരിഫൈ ചെയ്ത ഇമെയിൽ ഇല്ലാതെ നിങ്ങളുടെ അക്കൗണ്ട് പൂർണ്ണമായി സുരക്ഷിതമല്ല: നിങ്ങളുടെ മൊബൈൽ നമ്പർ അറിയുന്ന ആർക്കും മറ്റൊരു ഫോണിൽ നിങ്ങളായി ലോഗിൻ ചെയ്യാം. സ്വന്തം റിസ്കിൽ തുടരുന്നു."))+'</div>'+
      '<div style="margin-top:6px"><a href="#" id="tcElBack" style="font-size:12px;color:#0b6b78;font-weight:600">'+E(B("Log in with e-mail instead","പകരം ഇമെയിൽ ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക"))+'</a></div>';
  }else if(S.step==="code"){
   h+='<div style="font-size:13px;font-weight:700;color:#082b49;margin-bottom:4px">'+E(B("Enter the code","കോഡ് നൽകുക"))+'</div>'+
      '<div style="font-size:12px;color:#556;margin-bottom:8px;word-break:break-all">'+E(B("A 6-digit code was sent to ","6 അക്ക കോഡ് അയച്ചത്: "))+'<b>'+E(S.email)+'</b> '+E(B("(check the spam folder too)","(സ്പാം ഫോൾഡറും നോക്കുക)"))+'</div>'+
      '<input id="tcElCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="------" style="width:100%;box-sizing:border-box;font-size:22px;text-align:center;letter-spacing:8px;padding:9px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:6px">'+
      '<div id="tcElMsg" style="min-height:16px;font-size:12.5px;color:#a12d2d;margin-bottom:6px"></div>'+
      '<button id="tcElVerify" type="button" style="width:100%;padding:10px;border-radius:9px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:14px;margin-bottom:6px">'+E(B("Verify code","കോഡ് വെരിഫൈ ചെയ്യുക"))+'</button>'+
      '<div style="display:flex;gap:6px"><button id="tcElResend" type="button" style="flex:1;padding:8px;border-radius:9px;border:1px solid #c9d4dc;background:#fff;font-size:12.5px">'+E(B("Send again","വീണ്ടും അയയ്ക്കുക"))+'</button>'+
      '<button id="tcElChange" type="button" style="flex:1;padding:8px;border-radius:9px;border:1px solid #c9d4dc;background:#fff;font-size:12.5px">'+E(B("Change e-mail","ഇമെയിൽ മാറ്റുക"))+'</button></div>';
  }else{
   h+='<div style="font-size:13px;font-weight:700;color:#082b49;margin-bottom:2px">&#9993;&#65039; '+E(B("Your e-mail","നിങ്ങളുടെ ഇമെയിൽ"))+'</div>'+
      '<div style="font-size:12px;color:#556;line-height:1.4;margin-bottom:8px">'+E(B("Your e-mail is your identity in this app, like Instagram or Facebook. We send a 6-digit code to it - no password to remember, and nobody can log in as you with just your mobile number. Your mobile number is only a contact number.","ഈ ആപ്പിൽ നിങ്ങളുടെ ഐഡന്റിറ്റി നിങ്ങളുടെ ഇമെയിൽ ആണ് (Instagram, Facebook പോലെ). അതിലേക്ക് 6 അക്ക കോഡ് അയയ്ക്കും - മൊബൈൽ നമ്പർ മാത്രം വെച്ച് ആർക്കും നിങ്ങളായി ലോഗിൻ ചെയ്യാനാവില്ല. മൊബൈൽ നമ്പർ വെറും ബന്ധപ്പെടാനുള്ള നമ്പർ മാത്രം."))+'</div>'+
      '<input id="tcElEmail" type="email" autocomplete="email" inputmode="email" placeholder="name@gmail.com" style="width:100%;box-sizing:border-box;font-size:15px;padding:10px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:6px">'+
      '<div id="tcElMsg" style="min-height:16px;font-size:12.5px;color:#a12d2d;margin-bottom:6px"></div>'+
      '<button id="tcElSend" type="button" style="width:100%;padding:10px;border-radius:9px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:14px">'+E(B("Send code","കോഡ് അയയ്ക്കുക"))+'</button>';
  }
  return h+'</div>';
 }
 function msg(t,good){ var m=$("tcElMsg"); if(m){ m.textContent=t||""; m.style.color=good?"#1c6b2c":"#a12d2d"; } }
 function drawPanel(){
  var p=$("tcElPanel"); if(!p) return;
  p.innerHTML=panelHtml();
  var g=function(id,fn){ var e=$(id); if(e) e.onclick=function(ev){ if(ev&&ev.preventDefault) ev.preventDefault(); fn(); }; };
  g("tcElSend",doSend); g("tcElResend",doSend); g("tcElVerify",doVerify);
  g("tcElChange",function(){ unlockUndo(); S.step="email"; S.exists=false; S.proof=""; S.risk=false; drawPanel(); });
  g("tcElBack",function(){ unlockUndo(); S.risk=false; S.step="email"; drawPanel(); setFormHidden(true); var s=$("tcElSkipWrap"); if(s) s.classList.remove("tc-el-hide"); });
  var c=$("tcElCode"); if(c){ c.onkeydown=function(e){ if(e.key==="Enter") doVerify(); }; setTimeout(function(){ try{ c.focus(); }catch(e){} },30); }
  var m=$("tcElEmail"); if(m){ m.value=S.email||""; m.onkeydown=function(e){ if(e.key==="Enter") doSend(); }; }
 }
 function unlockUndo(){
  S.unlocked=false; S.proof="";
  var em=$("loginEmail"); if(em){ em.readOnly=false; em.value=""; }
  var mo=$("loginMobile"); if(mo){ mo.readOnly=false; }
  setFormHidden(true);
  var s=$("tcElSkipWrap"); if(s) s.classList.remove("tc-el-hide");
 }
 function doSend(){
  var e=$("tcElEmail"); var email=(e?e.value:S.email||"").trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){ msg(B("Enter a correct e-mail address.","ശരിയായ ഇമെയിൽ വിലാസം നൽകുക.")); return; }
  var btn=$("tcElSend")||$("tcElResend"); if(btn) btn.disabled=true;
  api("email_login_send",{email:email,device_token:dev()}).then(function(j){
   if(btn) btn.disabled=false;
   if(j.ok){ S.email=email; var was=S.step; S.step="code"; drawPanel(); msg(was==="code"?B("Code sent again.","കോഡ് വീണ്ടും അയച്ചു."):"",true); return; }
   msg(sendErr(j));
  }).catch(function(){ if(btn) btn.disabled=false; msg(NOCONN); });
 }
 function setVal(id,v){ var e=$(id); if(e){ e.value=v; } }
 function doVerify(){
  var code=(($("tcElCode")||{}).value||"").replace(/\D/g,"");
  if(code.length!==6){ msg(B("Enter the 6-digit code.","6 അക്ക കോഡ് നൽകുക.")); return; }
  var btn=$("tcElVerify"); if(btn) btn.disabled=true;
  api("email_login_verify",{email:S.email,device_token:dev(),code:code}).then(function(j){
   if(btn) btn.disabled=false;
   if(!j.ok){ msg(codeErr(j)); return; }
   S.step="done"; S.unlocked=true; S.exists=!!j.exists; S.proof=j.exists?"":S.email;
   S.risk=false;
   drawPanel(); setFormHidden(false);
   var sk=$("tcElSkipWrap"); if(sk) sk.classList.add("tc-el-hide");
   var em=$("loginEmail"); if(em){ em.value=S.email; em.readOnly=true; }
   if(j.exists){
    var role=j.role==="customer"?"customer":"owner";
    var r=document.querySelector('input[name="loginRole"][value="'+role+'"]');
    if(r){ r.checked=true; try{ r.dispatchEvent(new Event("change",{bubbles:true})); }catch(e){} }
    if(role==="owner"&&j.business_type){
     var bt=$("loginBizType");
     if(bt){ for(var i=0;i<bt.options.length;i++) if(bt.options[i].value===j.business_type){ bt.value=j.business_type; try{ bt.dispatchEvent(new Event("change",{bubbles:true})); }catch(e){} break; } }
    }
    setVal("loginName",j.name||""); setVal("loginMobile",j.mobile||"");
    var mo=$("loginMobile"); if(mo) mo.readOnly=true;
    try{ if(typeof tcLookupReturningUser==="function") tcLookupReturningUser(); }catch(e){}
   }else{
    var mo2=$("loginMobile"); if(mo2) mo2.readOnly=false;
   }
  }).catch(function(){ if(btn) btn.disabled=false; msg(NOCONN); });
 }
 function loginPage(){
  var intro=$("loginIntro");
  if(!intro||!$("loginName")) return;
  if($("tcElPanel")) return;
  var c=intro.parentNode;
  var p=document.createElement("div"); p.id="tcElPanel";
  c.insertBefore(p,intro);
  var sk=document.createElement("div"); sk.id="tcElSkipWrap"; sk.style.cssText="text-align:center;margin:4px 0 2px";
  sk.innerHTML='<a href="#" id="tcElSkip" style="font-size:12.5px;color:#7a5a00;font-weight:600">'+E(B("Continue without e-mail (own risk)","ഇമെയിൽ ഇല്ലാതെ തുടരുക (സ്വന്തം റിസ്കിൽ)"))+'</a>';
  c.insertBefore(sk,intro);
  sk.querySelector("#tcElSkip").onclick=function(ev){
   ev.preventDefault();
   S.risk=true; S.unlocked=true; S.proof="";
   drawPanel(); setFormHidden(false); sk.classList.add("tc-el-hide");
  };
  drawPanel();
  if(S.unlocked){ setFormHidden(false); sk.classList.add("tc-el-hide"); var em=$("loginEmail"); if(em&&S.email&&!S.risk){ em.value=S.email; em.readOnly=true; } }
  else setFormHidden(true);
 }

 /* the login request carries the e-mail proof; the answers are explained in plain words */
 function parseLogin(input,init){
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
  var lo=parseLogin(input,init), args=arguments;
  if(lo&&S.proof&&$("loginName")){
   lo.email_proof=S.proof;
   var ni=Object.assign({},init,{body:JSON.stringify(lo)});
   args=[input,ni];
  }
  var p=of.apply(this,args);
  if(!lo) return p;
  return p.then(function(res){
   if(res.status===200){ if($("loginName")) setTimeout(resetState,0); return res; }
   if(res.status!==409&&res.status!==403) return res;
   res.clone().json().then(function(j){
    var t="";
    if(j&&j.error==="number_taken") t=B("This mobile number belongs to an account verified with another e-mail. Use that e-mail to log in, or use another number.","ഈ മൊബൈൽ നമ്പർ മറ്റൊരു ഇമെയിൽ വെരിഫൈ ചെയ്ത അക്കൗണ്ടിന്റേതാണ്. ആ ഇമെയിൽ ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക, അല്ലെങ്കിൽ മറ്റൊരു നമ്പർ നൽകുക.");
    else if(j&&j.error==="email_taken") t=B("This e-mail is already used with another mobile number. Log in with the e-mail code instead.","ഈ ഇമെയിൽ മറ്റൊരു മൊബൈൽ നമ്പറിൽ ഉപയോഗത്തിലുണ്ട്. ഇമെയിൽ കോഡ് ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക.");
    else if(j&&j.error==="proof_expired"){
     t=B("The e-mail verification has expired. Verify the e-mail again.","ഇമെയിൽ വെരിഫിക്കേഷന്റെ സമയം കഴിഞ്ഞു. ഇമെയിൽ വീണ്ടും വെരിഫൈ ചെയ്യുക.");
     unlockUndo(); S.step="email"; drawPanel();
    }
    if(t) setTimeout(function(){ var e=$("loginError"); if(e) e.textContent=t; },150);
    if(j&&j.error==="email_taken"){ unlockUndo(); S.step="email"; drawPanel(); }
   }).catch(function(){});
   return res;
  });
 };

 /* ------------------------------------------------------------------ 2) forgot PIN with an e-mailed code */
 var origForgot=window.tcForgotPin;
 function cachedVerified(){
  try{ var c=JSON.parse(localStorage.getItem("tc_sec_info")||"null"); var u=user(); return !!(c&&u&&c.mobile===u.mobile&&c.verified); }catch(e){ return false; }
 }
 function pinOverlay(u){
  var old=$("tcElPin"); if(old) old.remove();
  var d=document.createElement("div"); d.id="tcElPin";
  d.style.cssText="position:fixed;left:0;top:0;right:0;bottom:0;z-index:100001;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px";
  d.innerHTML='<div style="background:#fff;border-radius:16px;max-width:340px;width:100%;padding:20px 18px;box-shadow:0 8px 30px rgba(0,0,0,.3)">'+
   '<div style="font-weight:800;font-size:16px;color:#082b49;margin-bottom:6px">&#128274; '+E(B("Reset your PIN","PIN റീസെറ്റ് ചെയ്യുക"))+'</div>'+
   '<div id="tcElPText" style="font-size:13px;color:#556;margin-bottom:10px">'+E(B("Sending a 6-digit code to your verified e-mail...","വെരിഫൈ ചെയ്ത ഇമെയിലിലേക്ക് 6 അക്ക കോഡ് അയയ്ക്കുന്നു..."))+'</div>'+
   '<input id="tcElPCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="------" style="width:100%;box-sizing:border-box;font-size:24px;text-align:center;letter-spacing:8px;padding:10px;border-radius:10px;border:1px solid #c9d4dc;margin-bottom:8px">'+
   '<div id="tcElPMsg" style="min-height:18px;font-size:12.5px;color:#a12d2d;margin-bottom:8px"></div>'+
   '<button id="tcElPGo" style="width:100%;padding:11px;border-radius:10px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:15px;margin-bottom:6px">'+E(B("Verify and set a new PIN","വെരിഫൈ ചെയ്ത് പുതിയ PIN സജ്ജമാക്കുക"))+'</button>'+
   '<div style="display:flex;gap:6px"><button id="tcElPResend" style="flex:1;padding:9px;border-radius:10px;border:1px solid #c9d4dc;background:#f5f8fa">'+E(B("Send code again","കോഡ് വീണ്ടും അയയ്ക്കുക"))+'</button>'+
   '<button id="tcElPCancel" style="flex:1;padding:9px;border-radius:10px;border:1px solid #c9d4dc;background:#f5f8fa">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div></div>';
  document.body.appendChild(d);
  var pm=function(t,good){ var m=$("tcElPMsg"); if(m){ m.textContent=t||""; m.style.color=good?"#1c6b2c":"#a12d2d"; } };
  function send(first){
   pm("");
   return api("pin_reset_send",{mobile:u.mobile,device_token:dev()}).then(function(j){
    if(j.ok){
     var t=$("tcElPText");
     if(t) t.innerHTML=E(B("A 6-digit code was sent to ","6 അക്ക കോഡ് അയച്ചത്: "))+"<b>"+E(j.hint||"")+"</b> "+E(B("(check the spam folder too). Enter it to set a new PIN. You stay logged in.","(സ്പാം ഫോൾഡറും നോക്കുക). പുതിയ PIN സജ്ജമാക്കാൻ അത് നൽകുക. നിങ്ങൾ ലോഗിൻ ആയിത്തന്നെ തുടരും."));
     if(!first) pm(B("Code sent again.","കോഡ് വീണ്ടും അയച്ചു."),true); return;
    }
    if(j.error==="no_verified_email"||(j.error==="unauthorized"&&first&&!cachedVerified())){ d.remove(); if(typeof origForgot==="function") origForgot(); return; }
    if(j.error==="wait"||j.error==="too_many"){ var t2=$("tcElPText"); if(t2&&first) t2.textContent=B("A code was sent a moment ago, or too many codes were asked for. Enter the last code, or try later.","കോഡ് ഇപ്പോൾ അയച്ചിട്ടുണ്ട് (അല്ലെങ്കിൽ ഒരുപാട് കോഡുകൾ ചോദിച്ചു). അവസാനത്തെ കോഡ് നൽകുക, അല്ലെങ്കിൽ പിന്നീട് ശ്രമിക്കുക."); pm(sendErr(j)); return; }
    pm(B("The code could not be sent now. Try again later.","കോഡ് ഇപ്പോൾ അയയ്ക്കാനായില്ല. പിന്നീട് ശ്രമിക്കുക."));
   }).catch(function(){
    /* offline: when the phone knows the account has a verified e-mail, do NOT fall back to the old logout-and-relogin way */
    if(first&&!cachedVerified()){ d.remove(); if(typeof origForgot==="function") origForgot(); return; }
    pm(NOCONN);
   });
  }
  $("tcElPCancel").onclick=function(){ d.remove(); };
  $("tcElPResend").onclick=function(){ send(false); };
  $("tcElPGo").onclick=function(){
   var code=(($("tcElPCode")||{}).value||"").replace(/\D/g,"");
   if(code.length!==6){ pm(B("Enter the 6-digit code.","6 അക്ക കോഡ് നൽകുക.")); return; }
   $("tcElPGo").disabled=true;
   api("pin_reset_verify",{mobile:u.mobile,device_token:dev(),code:code}).then(function(j){
    if(j.ok){
     try{ localStorage.removeItem("tc_pin_hash"); sessionStorage.removeItem("tc_pin_unlocked"); }catch(e){}
     d.remove();
     try{ if(typeof tcShowPinOverlay==="function") tcShowPinOverlay("setup"); }catch(e){}
     return;
    }
    $("tcElPGo")&&($("tcElPGo").disabled=false); pm(codeErr(j));
   }).catch(function(){ $("tcElPGo")&&($("tcElPGo").disabled=false); pm(NOCONN); });
  };
  send(true);
 }
 window.tcForgotPin=function(){
  var u=user();
  if(!u||!u.mobile){ return typeof origForgot==="function"?origForgot():undefined; }
  pinOverlay(u);
 };

 /* ------------------------------------------------------------------ keep the login page prepared whenever it is drawn */
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ loginPage(); }catch(e){} },120); }
 function watch(){
  var a=$("app"); if(!a||!window.MutationObserver){ setTimeout(watch,400); return; }
  new MutationObserver(later).observe(a,{childList:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",watch); else watch();
})();
