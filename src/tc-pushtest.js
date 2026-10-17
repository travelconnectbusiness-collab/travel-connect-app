/* "Test Notification" for business owners (tc-pushtest.js, loaded by tc-regdocs.js).
   A small card on the owner dashboard (under "Verification & Plan"): the owner taps "Send test", the server (/api/regdocs, action
   push_test - max 3 tests per hour per business) sends ONE harmless notification to the owner's own registered phones, and this
   page waits up to 30 seconds for it. If nothing arrives a checklist explains the usual reasons (notifications blocked, app not
   installed, battery saver, app not opened for days). Nothing else in the app is changed. */
(function(){
 if(window.__tcPushTest) return; window.__tcPushTest=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); };
 var BL=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var $=function(id){ return document.getElementById(id); };
 var WAIT=30, timer=null, onMsg=null;
 var waitOpen=function(){ var m=$("modal"); return !!$("tcPtWait")&&!!m&&!m.classList.contains("hidden"); };   /* the waiting screen is still on the phone's screen */

 function clean(){
  if(timer){ clearInterval(timer); timer=null; }
  if(onMsg&&navigator.serviceWorker){ try{ navigator.serviceWorker.removeEventListener("message",onMsg); }catch(e){} }
  onMsg=null;
 }
 var supported=function(){ return ("Notification" in window)&&("serviceWorker" in navigator)&&("PushManager" in window); };
 var spinner=function(t){ return '<div style="text-align:center;padding:12px 0"><div style="font-size:15px;font-weight:700;margin-bottom:10px">'+E(t)+'</div><div class="spinner" style="margin:0 auto"></div></div>'; };

 /* ---------- dashboard card ---------- */
 function cardHtml(){
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
   '<div style="min-width:170px;flex:1 1 170px"><div style="font-weight:800;font-size:14px;color:#0b4f5a">&#128276; '+E(BL("Test Notification","ടെസ്റ്റ് നോട്ടിഫിക്കേഷൻ"))+'</div>'+
   '<div class="muted" style="font-size:12px;line-height:1.35">'+E(BL("Check that trip alerts will reach this phone.","ട്രിപ്പ് അലർട്ടുകൾ ഈ ഫോണിൽ എത്തുമോ എന്ന് പരിശോധിക്കാം."))+'</div></div>'+
   '<button class="primary" type="button" onclick="tcPtRun()" style="padding:8px 14px;font-size:13px;border-radius:10px">'+E(BL("Send test","ടെസ്റ്റ് അയയ്ക്കുക"))+'</button></div>'+
   '<div style="margin-top:4px"><a href="#" onclick="tcPtChecklist(\'manual\');return false" style="font-size:12px;color:#0b6b78;font-weight:700">'+E(BL("Not getting alerts? See the checklist","അലർട്ട് കിട്ടുന്നില്ലേ? ചെക്ക്‌ലിസ്റ്റ് കാണുക"))+'</a></div>';
 }
 function arrange(){
  var up=$("tcUpCard"); if(!up) return;            /* only the owner dashboard has this card */
  var c=$("tcPtCard");
  if(c){ return; }
  c=document.createElement("div"); c.className="card"; c.id="tcPtCard";
  c.style.cssText="padding:9px 12px;margin:0 0 10px;border-radius:12px;border:1px solid #cfe0e3";
  c.innerHTML=cardHtml();
  up.parentNode.insertBefore(c,up.nextSibling);
 }
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ arrange(); }catch(e){} },120); }
 function start(){
  var app=$("app"); if(!app||!window.MutationObserver) return;
  new MutationObserver(later).observe(app,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();

 /* ---------- screens ---------- */
 var STEPS=[
  ["Allow notifications for this site","ഈ സൈറ്റിന് നോട്ടിഫിക്കേഷൻ അനുവദിക്കുക",
   "Chrome: tap the lock / settings icon next to the address (or the 3 dots > Settings > Site settings > Notifications), find travelconnect.dev and choose Allow. Also check that Chrome's own notifications are ON in the phone's Settings > Apps > Chrome > Notifications.",
   "Chrome: അഡ്രസ് ബാറിനടുത്തുള്ള ലോക്ക് / സെറ്റിംഗ്സ് ചിഹ്നം (അല്ലെങ്കിൽ 3 കുത്തുകൾ > Settings > Site settings > Notifications) തുറന്ന് travelconnect.dev കണ്ടെത്തി Allow തിരഞ്ഞെടുക്കുക. ഫോണിലെ Settings > Apps > Chrome > Notifications-ഉം ഓൺ ആണോ എന്ന് നോക്കുക."],
  ["Install the app on the Home screen","ആപ്പ് ഹോം സ്ക്രീനിൽ ഇൻസ്റ്റാൾ ചെയ്യുക",
   "Chrome menu (3 dots) > Add to Home screen / Install app. Then open Travel Connect from that icon.",
   "Chrome മെനു (3 കുത്തുകൾ) > Add to Home screen / Install app. ശേഷം ആ ഐക്കണിൽ നിന്ന് Travel Connect തുറക്കുക."],
  ["Turn off battery saver for Chrome","Chrome-ന് ബാറ്ററി സേവർ ഓഫ് ചെയ്യുക",
   "Settings > Battery > Chrome (or Travel Connect) > choose Unrestricted / No restrictions, and switch off Battery saver. On Oppo, Realme, Vivo, Xiaomi, Samsung phones also allow 'Auto-start' / 'Background activity' for Chrome.",
   "Settings > Battery > Chrome (അല്ലെങ്കിൽ Travel Connect) > Unrestricted / No restrictions തിരഞ്ഞെടുക്കുക, Battery saver ഓഫ് ചെയ്യുക. Oppo, Realme, Vivo, Xiaomi, Samsung ഫോണുകളിൽ Chrome-ന് 'Auto-start' / 'Background activity' കൂടി അനുവദിക്കുക."],
  ["Open the app at least once a day","ദിവസത്തിൽ ഒരിക്കലെങ്കിലും ആപ്പ് തുറക്കുക",
   "Some phones stop apps that are never opened. Open Travel Connect once a day so alerts keep coming. Also check Do Not Disturb is off and the notification volume is on.",
   "ദിവസങ്ങളോളം തുറക്കാത്ത ആപ്പുകൾ ചില ഫോണുകൾ നിർത്തിവയ്ക്കും. അലർട്ട് തുടർന്ന് കിട്ടാൻ ദിവസവും ഒരിക്കൽ Travel Connect തുറക്കുക. Do Not Disturb ഓഫ് ആണെന്നും നോട്ടിഫിക്കേഷൻ വോളിയം ഉണ്ടെന്നും ഉറപ്പാക്കുക."]
 ];
 var INTRO={
  unsupported:["This browser cannot receive notifications. Please open Travel Connect in Chrome and install it on the Home screen.","ഈ ബ്രൗസറിൽ നോട്ടിഫിക്കേഷൻ ലഭിക്കില്ല. Chrome-ൽ Travel Connect തുറന്ന് ഹോം സ്ക്രീനിൽ ഇൻസ്റ്റാൾ ചെയ്യുക."],
  blocked:["Notifications are blocked for Travel Connect on this phone. Please allow them (step 1) and send the test again.","ഈ ഫോണിൽ Travel Connect-ന്റെ നോട്ടിഫിക്കേഷൻ ബ്ലോക്ക് ചെയ്തിരിക്കുന്നു. ഒന്നാമത്തെ കാര്യം പ്രകാരം അനുവദിച്ച ശേഷം വീണ്ടും ടെസ്റ്റ് അയയ്ക്കുക."],
  notgranted:["Notification permission was not given. Please tap Allow when the phone asks, then send the test again.","നോട്ടിഫിക്കേഷൻ അനുമതി നൽകിയില്ല. ഫോൺ ചോദിക്കുമ്പോൾ Allow അമർത്തിയ ശേഷം വീണ്ടും ടെസ്റ്റ് അയയ്ക്കുക."],
  nodevice:["This phone is not registered for notifications yet. Please allow notifications (step 1), then send the test again.","ഈ ഫോൺ ഇതുവരെ നോട്ടിഫിക്കേഷന് രജിസ്റ്റർ ആയിട്ടില്ല. നോട്ടിഫിക്കേഷൻ അനുവദിച്ച ശേഷം (ഒന്നാമത്തെ കാര്യം) വീണ്ടും ടെസ്റ്റ് അയയ്ക്കുക."],
  nosend:["The test could not be delivered to the phone's notification service. Please check the points below and try again.","ടെസ്റ്റ് ഫോണിന്റെ നോട്ടിഫിക്കേഷൻ സേവനത്തിലേക്ക് എത്തിക്കാൻ കഴിഞ്ഞില്ല. താഴെയുള്ള കാര്യങ്ങൾ നോക്കി വീണ്ടും ശ്രമിക്കുക."],
  timeout:["Nothing arrived within "+WAIT+" seconds. Please check these points and send the test again.",WAIT+" സെക്കൻഡിനുള്ളിൽ ഒന്നും വന്നില്ല. ഈ കാര്യങ്ങൾ നോക്കിയ ശേഷം വീണ്ടും ടെസ്റ്റ് അയയ്ക്കുക."],
  noarrive:["Nothing arrived. Please check these points and send the test again.","ഒന്നും വന്നില്ല. ഈ കാര്യങ്ങൾ നോക്കിയ ശേഷം വീണ്ടും ടെസ്റ്റ് അയയ്ക്കുക."],
  network:["Could not reach the server. Please check your internet connection and try again.","സെർവറുമായി ബന്ധപ്പെടാൻ കഴിഞ്ഞില്ല. ഇന്റർനെറ്റ് പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക."],
  manual:["If trip alerts do not reach this phone, check these points.","ട്രിപ്പ് അലർട്ടുകൾ ഈ ഫോണിൽ എത്തുന്നില്ലെങ്കിൽ ഈ കാര്യങ്ങൾ നോക്കുക."]
 };
 window.tcPtChecklist=function(reason){
  clean();
  var it=INTRO[reason]||INTRO.manual;
  var h='<h2>&#128276; '+E(BL("Notification checklist","നോട്ടിഫിക്കേഷൻ ചെക്ക്‌ലിസ്റ്റ്"))+'</h2>'+
   '<div style="padding:9px 11px;border-radius:10px;background:'+(reason==="manual"?'#eef6f7':'#fdeeee')+';border:1px solid '+(reason==="manual"?'#cfe0e3':'#efc4c4')+';font-weight:700;font-size:13.5px;line-height:1.5">'+E(BL(it[0],it[1]))+'</div>'+
   '<ol style="padding-left:20px;margin:10px 0">'+STEPS.map(function(s){ return '<li style="margin:8px 0"><b>'+E(BL(s[0],s[1]))+'</b><div class="muted" style="font-size:12.5px;line-height:1.5">'+E(BL(s[2],s[3]))+'</div></li>'; }).join("")+'</ol>'+
   '<div class="actions"><button class="primary" onclick="tcPtRun()">'+E(BL("Send test again","വീണ്ടും ടെസ്റ്റ് അയയ്ക്കുക"))+'</button><button onclick="closeModal()">'+E(BL("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(h);
 };
 function success(){
  clean();
  modal('<h2>&#9989; '+E(BL("Notifications are working","നോട്ടിഫിക്കേഷൻ പ്രവർത്തിക്കുന്നു"))+'</h2>'+
   '<p>'+E(BL("The test notification reached this phone. Trip alerts will reach you here too.","ടെസ്റ്റ് നോട്ടിഫിക്കേഷൻ ഈ ഫോണിൽ എത്തി. ട്രിപ്പ് അലർട്ടുകളും ഇവിടെ എത്തും."))+'</p>'+
   '<p class="muted" style="font-size:12.5px">'+E(BL("Tip: if you use more than one phone, test each of them once.","ഒന്നിലധികം ഫോൺ ഉപയോഗിക്കുന്നെങ്കിൽ ഓരോന്നിലും ഒരിക്കൽ ടെസ്റ്റ് ചെയ്യുക."))+'</p>'+
   '<div class="actions"><button class="primary" onclick="closeModal()">OK</button></div>');
 }
 function waiting(n){
  clean();
  var left=WAIT;
  modal('<h2>&#128276; '+E(BL("Test sent","ടെസ്റ്റ് അയച്ചു"))+'</h2>'+
   '<p>'+E(BL("A notification should appear on your phone within "+WAIT+" seconds"+(n>1?" (sent to "+n+" phones)":"")+".",WAIT+" സെക്കൻഡിനുള്ളിൽ നിങ്ങളുടെ ഫോണിൽ ഒരു നോട്ടിഫിക്കേഷൻ വരണം"+(n>1?" ("+n+" ഫോണുകളിലേക്ക് അയച്ചു)":"")+"."))+'</p>'+
   '<div id="tcPtWait" style="text-align:center;font-size:30px;font-weight:800;color:#0b6b78;margin:6px 0"><span id="tcPtLeft">'+left+'</span><span style="font-size:13px;font-weight:600"> s</span></div>'+
   '<p class="muted" style="font-size:12.5px;text-align:center">'+E(BL("You can also pull down the phone's notification bar to look for it.","ഫോണിന്റെ നോട്ടിഫിക്കേഷൻ ബാർ താഴേക്ക് വലിച്ചും നോക്കാം."))+'</p>'+
   '<div class="actions"><button class="primary" onclick="tcPtYes()">&#9989; '+E(BL("It arrived","വന്നു"))+'</button><button onclick="tcPtChecklist(\'noarrive\')">&#10060; '+E(BL("Nothing arrived","ഒന്നും വന്നില്ല"))+'</button></div>');
  /* an open page is told by the service worker when the test arrives */
  try{
   onMsg=function(ev){ if(ev&&ev.data&&ev.data.tcMsgPush&&waitOpen()) success(); };
   navigator.serviceWorker.addEventListener("message",onMsg);
  }catch(e){}
  timer=setInterval(function(){
   if(!waitOpen()){ clean(); return; }            /* the person closed or left this screen */
   left--; var s=$("tcPtLeft"); if(s) s.textContent=Math.max(0,left);
   if(left<=0){ clean(); window.tcPtChecklist("timeout"); }
  },1000);
 }
 window.tcPtYes=function(){ success(); };

 /* ---------- run the test ---------- */
 async function callServer(u,pid){
  try{
   var r=await fetch("/api/regdocs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"push_test",partner_id:pid,mobile:u.mobile,device:(typeof getDeviceToken==="function"?getDeviceToken():"")})});
   var d=await r.json().catch(function(){ return {}; });
   if(r.status===401) return {ok:false,error:"unauthorized"};
   return d&&typeof d==="object"?d:{ok:false,error:"bad"};
  }catch(e){ return {ok:false,error:"network"}; }
 }
 window.tcPtRun=async function(){
  var u=null; try{ u=getCurrentUser(); }catch(e){}
  var pid=null; try{ pid=(db&&db.settings&&db.settings.myPartnerId)||(window._myPartner&&window._myPartner.id); }catch(e){}
  if(!u||!pid){ say(BL("Please open your business first.","ആദ്യം നിങ്ങളുടെ ബിസിനസ് തുറക്കുക.")); return; }
  clean();
  modal(spinner(BL("Sending test...","ടെസ്റ്റ് അയയ്ക്കുന്നു...")));
  if(!supported()) return window.tcPtChecklist("unsupported");
  if(Notification.permission==="denied") return window.tcPtChecklist("blocked");
  if(Notification.permission==="default"){
   try{ if(typeof enablePushNotifications==="function") await enablePushNotifications(); else await Notification.requestPermission(); }catch(e){}
   if(Notification.permission!=="granted") return window.tcPtChecklist(Notification.permission==="denied"?"blocked":"notgranted");
   modal(spinner(BL("Sending test...","ടെസ്റ്റ് അയയ്ക്കുന്നു...")));
  }
  var d=await callServer(u,pid);
  if(d&&d.ok&&d.devices===0){
   /* permission is on but this phone is not saved on the server yet: register it once and try again */
   try{ if(typeof enablePushNotifications==="function") await enablePushNotifications(); }catch(e){}
   d=await callServer(u,pid);
  }
  if(d.error==="limited"){
   var n=d.retry_after_min||60;
   modal('<h2>&#128276; '+E(BL("Test Notification","ടെസ്റ്റ് നോട്ടിഫിക്കേഷൻ"))+'</h2><p>'+E(BL("You have already sent 3 tests in the last hour. Please try again after about "+n+" minute"+(n===1?"":"s")+".","കഴിഞ്ഞ ഒരു മണിക്കൂറിൽ 3 ടെസ്റ്റ് അയച്ചുകഴിഞ്ഞു. ഏകദേശം "+n+" മിനിറ്റിന് ശേഷം വീണ്ടും ശ്രമിക്കുക."))+'</p><div class="actions"><button onclick="tcPtChecklist(\'manual\')">'+E(BL("Checklist","ചെക്ക്‌ലിസ്റ്റ്"))+'</button><button class="primary" onclick="closeModal()">OK</button></div>');
   return;
  }
  if(d.error==="network") return window.tcPtChecklist("network");
  if(!d.ok){
   modal('<h2>&#128276; '+E(BL("Test Notification","ടെസ്റ്റ് നോട്ടിഫിക്കേഷൻ"))+'</h2><p>'+E(BL("Could not send the test. Please log in again or try later.","ടെസ്റ്റ് അയയ്ക്കാൻ കഴിഞ്ഞില്ല. വീണ്ടും ലോഗിൻ ചെയ്യുകയോ പിന്നീട് ശ്രമിക്കുകയോ ചെയ്യുക."))+'</p><div class="actions"><button class="primary" onclick="closeModal()">OK</button></div>');
   return;
  }
  if(!d.devices) return window.tcPtChecklist("nodevice");
  if(!d.sent) return window.tcPtChecklist("nosend");
  waiting(d.sent);
 };
})();
