/* "Waiting for a driver" screen explained (tc-wait.js, loaded by tc-regdocs.js).
   Problem (owner's own test, 2026-10-20): after "Find Nearby Vehicle" the customer saw only a spinner and
   "11 nearby drivers notified" for minutes and could not tell what was happening or what to do.
   This adds, inside the same pop-up (under the spinner line), a live clock and three plain steps:
     1) the request was sent to N drivers  2) waiting for one of them to accept (clock)
     3) what happens next: a notification when someone accepts, and the nearby drivers' phone numbers
        appear here after the admin-set number of minutes (the existing help panel of tc-trips.js).
   Nothing else about the request, the polling or the cancel button changes. */
(function(){
 if(window.__tcWait) return;
 var old=window.tcShowTripWaiting;
 if(typeof old!=="function") return;
 window.__tcWait=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var clock=null;
 function mmss(s){ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); }
 function begin(alertId,count){
  var box=document.getElementById("tripWaitStatus"); if(!box) return;
  var t0=Date.now(), helpAt=null;
  var step=function(ok,txt){ return '<div style="display:flex;gap:8px;align-items:flex-start;margin:5px 0"><span style="font-size:15px">'+ok+'</span><span>'+txt+'</span></div>'; };
  var h='<div style="text-align:left;font-size:13px;line-height:1.4;margin-top:6px">';
  if(count>0){
   h+=step("✅",E(B("Your request was sent to "+count+" nearby driver"+(count>1?"s":"")+".","നിങ്ങളുടെ അഭ്യർത്ഥന അടുത്തുള്ള "+count+" ഡ്രൈവർമാർക്ക് അയച്ചു.")));
   h+=step("⏳",E(B("Waiting for one of them to accept: ","അവരിൽ ആരെങ്കിലും സ്വീകരിക്കാൻ കാത്തിരിക്കുന്നു: "))+'<b id="tcWaitClock">0:00</b> <span id="tcWaitHelp" class="muted"></span>');
   h+=step("🔔",E(B("The moment a driver accepts, you will see his name and a Call button here. If you leave this screen, you will get a notification (if notifications are on).","ഒരു ഡ്രൈവർ സ്വീകരിച്ചാൽ ഉടൻ അയാളുടെ പേരും Call ബട്ടണും ഇവിടെ വരും. ഈ സ്ക്രീൻ വിട്ടാലും നോട്ടിഫിക്കേഷൻ വരും (നോട്ടിഫിക്കേഷൻ ഓൺ ആണെങ്കിൽ).")));
   h+=step("📞",E(B("If nobody accepts after a few minutes, the numbers of those drivers appear here so you can call them directly.","കുറച്ച് മിനിറ്റിനുള്ളിൽ ആരും സ്വീകരിച്ചില്ലെങ്കിൽ ആ ഡ്രൈവർമാരുടെ നമ്പറുകൾ ഇവിടെ വരും; നേരിട്ട് വിളിക്കാം.")));
  }else{
   h+=step("⚠️",E(B("No drivers are Active nearby right now. You can cancel and call a vehicle from the Local Directory or the Active Vehicles Board.","ഇപ്പോൾ അടുത്ത് ആക്ടീവ് ആയ ഡ്രൈവർമാർ ഇല്ല. Cancel അമർത്തി Local Directory / Active Vehicles Board-ൽ നിന്ന് നേരിട്ട് വിളിക്കാം.")));
  }
  h+='</div>';
  box.innerHTML=h;
  if(count>0){
   try{
    var u=getCurrentUser();
    fetch("/api/trip_alerts?action=fallback&alert_id="+alertId+"&mobile="+encodeURIComponent(u.mobile)).then(function(r){ return r.json(); }).then(function(d){
     if(d&&d.ok&&!d.ready&&d.seconds_left>0) helpAt=Date.now()+d.seconds_left*1000;
    }).catch(function(){});
   }catch(e){}
  }
  clearInterval(clock);
  clock=setInterval(function(){
   var c=document.getElementById("tcWaitClock");
   if(!c||window._tcActiveTripAlertId!==alertId){ clearInterval(clock); return; }
   c.textContent=mmss((Date.now()-t0)/1000);
   var hp=document.getElementById("tcWaitHelp");
   if(hp&&helpAt){ var left=(helpAt-Date.now())/1000; hp.textContent=left>0?"("+B("driver numbers appear in ","ഡ്രൈവർ നമ്പറുകൾ വരാൻ ")+mmss(left)+")":""; }
  },1000);
 }
 window.tcShowTripWaiting=function(alertId,notifiedCount){
  var r=old.apply(this,arguments);
  try{ begin(alertId,+notifiedCount||0); }catch(e){}
  return r;
 };
})();
