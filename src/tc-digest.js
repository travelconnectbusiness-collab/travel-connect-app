/* Reminder summary for the server (tc-digest.js, loaded by tc-regdocs.js after tc-pkg.js).
   So that tomorrow's bookings and driving-licence dates can be reminded by phone notification even when the app is closed, the phone sends the
   server a SMALL summary - never the whole book:
     bookings of today, tomorrow and the day after (date, time, customer name, short route, vehicle),
     drivers whose licence ends within a month (or ended in the last 2 months): name + date.
   It is sent only when it changed (or every 12 hours), at most once a minute, while the app is open; only for a logged-in Taxi / Travel owner.
   The server (owner_digest.js + docs_expiry.js) sends the message + notification: mornings "today / tomorrow", evenings "tomorrow", and
   licence reminders 30 / 7 / 1 day before and when expired - each only once. Nothing is shown on the phone by this module. */
(function(){
 if(window.__tcDigest) return;
 window.__tcDigest=1;
 var KEY="tcDigestSent", busy=false, last=0;
 var p2=function(n){ return String(n).padStart(2,"0"); };
 var ymd=function(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); };
 function shift(n){ var d=new Date(); d.setDate(d.getDate()+n); return ymd(d); }
 function short(t,n){ t=String(t||"").trim(); return t.length>n?t.slice(0,n-1)+"…":t; }
 function eligible(){
  try{
   var u=getCurrentUser();
   return !!(u&&u.mobile&&db&&db.settings&&db.settings.myBusinessType==="taxi_travel"&&typeof getDeviceToken==="function"&&getDeviceToken());
  }catch(e){ return false; }
 }
 function build(){
  var t0=shift(0), t2=shift(2), bk=[], lic=[];
  (db.bookings||[]).forEach(function(b){
   if(!b||b.status==="cancelled"||!b.date||b.date<t0||b.date>t2) return;
   var who=b.own===true?((b.vehName||"")+(b.vehNo?" "+b.vehNo:"")).trim():(b.own===false?((b.partner&&b.partner.name)||"Partner"):"");
   bk.push({d:b.date,t:String(b.time||"").slice(0,5),n:short(b.name,40),r:short([b.pickup,b.dest].filter(Boolean).join(" - "),60),w:short(who,40)});
  });
  bk.sort(function(a,b){ return (a.d+a.t)<(b.d+b.t)?-1:1; });
  var hi=shift(31), lo=shift(-60);
  (db.drivers||[]).forEach(function(d){
   var e=String((d&&d.licExpiry)||"").slice(0,10);
   if(/^\d{4}-\d{2}-\d{2}$/.test(e)&&e<=hi&&e>=lo) lic.push({n:short(d.name,40),e:e});
  });
  return {bookings:bk.slice(0,40),lic:lic.slice(0,30)};
 }
 function seen(){ try{ return JSON.parse(localStorage.getItem(KEY)||"null")||{}; }catch(e){ return {}; } }
 function mark(h){ try{ localStorage.setItem(KEY,JSON.stringify({h:h,at:Date.now()})); }catch(e){} }
 async function run(force){
  if(busy||!eligible()) return "skip";
  if(!force&&Date.now()-last<55000) return "wait";
  last=Date.now();
  var dg=build(), h=JSON.stringify(dg), s=seen();
  if(!force&&s.h===h&&Date.now()-(s.at||0)<12*3600*1000) return "same";
  if(!dg.bookings.length&&!dg.lic.length&&!s.h) return "empty";   /* nothing to remind and never sent anything: stay quiet */
  busy=true;
  try{
   var u=getCurrentUser();
   var res=await fetch("/api/owner_digest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mobile:u.mobile,device:getDeviceToken(),digest:dg})});
   var j=null; try{ j=await res.json(); }catch(e){}
   if(j&&j.ok){ mark(h); return "sent"; }
   return "fail";
  }catch(e){ return "offline"; }
  finally{ busy=false; }
 }
 window.__tcDigestRun=run;
 window.__tcDigestBuild=build;
 function start(){
  setTimeout(function(){ run(false); },6000);
  setInterval(function(){ run(false); },60000);
  document.addEventListener("visibilitychange",function(){ if(document.visibilityState==="hidden") run(false); });
  window.addEventListener("pagehide",function(){ run(false); });
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
