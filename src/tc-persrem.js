/* Bills & reminders - the NOTIFICATION part (tc-persrem.js, loaded by tc-regdocs.js right after tc-persbill.js; server: functions/api/bill_reminders.js).
   Owner's request (2026-10-29): the reminder of a bill must come from the app itself (a phone notification even when the app is closed), not from another app.
   WHAT LEAVES THE PHONE: for a bill with "Remind me by notification" switched ON (b.rm===1) only its NAME (40 characters), its NEXT DUE DATE and the language -
   never the amount, the payments or any other account data. The phone sends its whole list to POST /api/bill_reminders?action=sync after every change
   (bill saved / deleted, payment saved / deleted, backup restored) and once when the app opens; nothing is sent again when the list did not change
   (signature kept in localStorage tc_prem_sig:<mobile>). Switching all bills off sends an empty list, which removes the rows from the server.
   The server pushes (normal "message" push, sw.js unchanged) the day before, on the day and once when late, from 07:00 IST on the first API request of the day.
   TAP on that notification: the service worker opens /#bills (or navigates the open page to it). tc-persrem.js catches "#bills" inside a wrapped window.render() (core.js calls it
   from its popstate + hashchange listeners; a capture listener with stopImmediatePropagation is the safety net) and also at a fresh start, clears the hash and opens My Accounts > Bills.
   Needs the phone's notification permission: the bill form shows "Turn on notifications on this phone" (calls cs.js enablePushNotifications) when it is not on. */
(function(){
 var P=window.__tcPers;
 if(!P||!P.bills||P.rem) return;
 P.rem=1;
 var B=P.B, E=P.E, $=P.$, SC=P.SC;
 var KB=P.K.b;

 /* ---------- is this phone able to show notifications ---------- */
 function supported(){ try{ return ("serviceWorker" in navigator)&&("PushManager" in window)&&("Notification" in window); }catch(e){ return false; } }
 function pushState(){
  if(!supported()) return "na";
  try{
   if(Notification.permission==="denied") return "blocked";
   if(Notification.permission==="granted"&&localStorage.getItem("tc_push_confirmed")==="1") return "on";
  }catch(e){}
  return "off";
 }
 P.pushState=pushState;
 function hintInner(){
  var s=pushState();
  if(s==="on") return '<div class="tpM" style="margin-top:4px">✅ '+E(B("Notifications are on for this phone.","ഈ ഫോണിൽ നോട്ടിഫിക്കേഷൻ ഓണാണ്."))+'</div>';
  if(s==="na") return '<div class="tpNote" style="margin-top:6px">'+E(B("This browser cannot show notifications. The reminder will show only inside the app.","ഈ ബ്രൗസറിന് നോട്ടിഫിക്കേഷൻ കാണിക്കാൻ പറ്റില്ല. ഓർമ്മപ്പെടുത്തൽ ആപ്പിനുള്ളിൽ മാത്രം കാണും."))+'</div>';
  if(s==="blocked") return '<div class="tpNote" style="margin-top:6px;background:#fde8e6;color:#a12d2d">'+E(B("Notifications are blocked for this site. Allow them in the phone / browser settings.","ഈ സൈറ്റിന് നോട്ടിഫിക്കേഷൻ തടഞ്ഞിരിക്കുന്നു. ഫോൺ / ബ്രൗസർ സെറ്റിങ്സിൽ അനുവദിക്കുക."))+'</div>';
  return '<button type="button" class="tpBtn g s" style="margin-top:6px" onclick="tpRemEnable()">🔔 '+E(B("Turn on notifications on this phone","ഈ ഫോണിൽ നോട്ടിഫിക്കേഷൻ ഓണാക്കുക"))+'</button>';
 }
 P.remHintHtml=function(){ return '<div id="tpbRh">'+hintInner()+'</div>'; };
 window.tpRemEnable=async function(){
  try{ if(typeof enablePushNotifications==="function") await enablePushNotifications(); }catch(e){}
  var h=$("tpbRh"); if(h) h.innerHTML=hintInner();
  try{ var w=$("tpRemWarn"); if(w){ w.remove(); } }catch(e){}
  schedule(500);
 };

 /* ---------- the list that goes to the server ---------- */
 function items(){
  return P.mine(KB).filter(function(b){ return b.rm===1&&b.nx&&P.okDate(b.nx); }).slice(0,30).map(function(b){
   return {i:String(b.id).replace(/[^A-Za-z0-9_-]/g,"").slice(0,40),t:String(b.nm||"").replace(/\s+/g," ").trim().slice(0,40),d:b.nx};
  });
 }
 var tm=0, busy=false;
 function schedule(ms){ clearTimeout(tm); tm=setTimeout(sync,ms||1500); }
 P.remSchedule=schedule;
 async function sync(){
  if(busy) return;
  var mob=P.me(); if(!mob) return;
  var list=items(), l=B("en","ml")==="ml"?"ml":"en", sig=JSON.stringify([l,list]), key="tc_prem_sig:"+mob, last=null;
  try{ last=localStorage.getItem(key); }catch(e){}
  if(last===sig) return;
  if(last===null&&!list.length) return;               /* nothing was ever sent and there is nothing to send */
  busy=true;
  try{
   var res=await fetch("/api/bill_reminders?action=sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:list,l:l})});
   var j=await res.json().catch(function(){ return {}; });
   if(j&&j.ok){ try{ localStorage.setItem(key,sig); }catch(e){} }
  }catch(e){}
  busy=false;
 }
 P.remSync=sync;
 ["tpBSave","tpBDel","tpBpSave","tpBpDel"].forEach(function(n){
  var o=window[n];
  if(typeof o==="function") window[n]=function(){ var r=o.apply(this,arguments); schedule(1500); return r; };
 });
 var orf=window.tpRestoreFile;
 if(typeof orf==="function") window.tpRestoreFile=function(){ var r=orf.apply(this,arguments); schedule(4000); return r; };
 setTimeout(function(){ try{ if(localStorage.getItem("tc_user")) schedule(100); }catch(e){} },8000);

 /* ---------- Bills list: a warning when a bill wants a notification and this phone cannot show one ---------- */
 var ob=SC.bills;
 if(typeof ob==="function") SC.bills=function(){
  ob.apply(this,arguments);
  try{
   var on=P.mine(KB).some(function(b){ return b.rm===1&&b.nx; }), s=pushState(), body=$("tpBody");
   if(on&&s!=="on"&&s!=="na"&&body){
    body.insertAdjacentHTML("afterbegin",'<div class="tpNote" id="tpRemWarn" style="background:#fff6df;color:#7a4f00">🔔 '+E(B("Some bills have a notification reminder, but notifications are not on for this phone.","ചില ബില്ലുകൾക്ക് നോട്ടിഫിക്കേഷൻ ഓർമ്മപ്പെടുത്തൽ ഉണ്ട്, പക്ഷേ ഈ ഫോണിൽ നോട്ടിഫിക്കേഷൻ ഓണല്ല."))+
     (s==="off"?'<br><button type="button" class="tpBtn g s" onclick="tpRemEnable()">🔔 '+E(B("Turn on","ഓണാക്കുക"))+'</button>':'<br>'+E(B("Allow them in the phone / browser settings.","ഫോൺ / ബ്രൗസർ സെറ്റിങ്സിൽ അനുവദിക്കുക.")))+'</div>');
   }
  }catch(e){}
 };

 /* ---------- a tap on the notification: /#bills ---------- */
 function openBills(){
  try{ if(typeof tcPersOpen==="function"){ tcPersOpen(); setTimeout(function(){ try{ P.go("bills"); }catch(e){} },150); } }catch(e){}
 }
 function neutral(){ try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){} }
 /* core.js listens to popstate AND hashchange and calls the global render() first (its listeners were added before ours), so the tap is caught inside render():
    render() with "#bills" is not run - the address is cleaned and My Accounts > Bills is opened; the hashchange render() that follows (clean address) is skipped once. */
 P.remSkip=0;
 var swallow=false, orr=window.render;
 function tapped(){
  neutral();
  swallow=true; setTimeout(function(){ swallow=false; },400);
  try{ if(localStorage.getItem("tc_user")) openBills(); }catch(x){}
 }
 if(typeof orr==="function"){
  window.render=function(){
   if(location.hash==="#bills"){ P.remSkip++; tapped(); return; }
   if(swallow){ swallow=false; P.remSkip++; return; }
   return orr.apply(this,arguments);
  };
 }
 function catchBills(e){                /* safety net if render() was not called first */
  if(location.hash==="#bills"){ try{ e.stopImmediatePropagation(); }catch(x){} P.remSkip++; tapped(); }
 }
 window.addEventListener("popstate",catchBills,true);
 window.addEventListener("hashchange",catchBills,true);
 if(location.hash==="#bills"){
  setTimeout(function(){
   neutral();
   try{ if(typeof orr==="function") orr(); }catch(e){}
   try{ if(localStorage.getItem("tc_user")) openBills(); }catch(e){}
  },900);
 }
})();
