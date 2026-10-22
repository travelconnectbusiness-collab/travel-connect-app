/* Device headers + "Security" screen (tc-devhdr.js, loaded by tc-regdocs.js).
   1) Every request to /api/... now carries two headers: X-TC-Mobile (the mobile this phone is logged in with) and X-TC-Device (the
      device token of this phone). The server (functions/api/_devauth.js) uses them to check that the request really comes from that
      logged-in phone - before, many actions only looked at a mobile number, and business numbers are public.
      Nothing is sent when nobody is logged in. Works for fetch(url, init), fetch(Request) and file uploads (FormData).
   2) Menu > "Security: device check" (only for the app owner, after the admin password): shows whether the server check is ON, what
      the "soft mode" saw during the last 3 days (requests that would have been refused), and a button to switch the check ON / OFF.
      Switch it ON only after every user has updated the app (the table then shows no "no_header" lines any more). */
(function(){
 if(window.__tcDevHdr) return;
 window.__tcDevHdr=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };

 /* ---- 1) headers on every /api call ---- */
 var of=window.fetch;
 function me(){
  try{
   var u=JSON.parse(localStorage.getItem("tc_user")||"null"), d=localStorage.getItem("tc_device_token");
   if(u&&u.mobile&&d) return {m:String(u.mobile),d:String(d)};
  }catch(e){}
  return null;
 }
 function isApi(url){
  if(!url) return false;
  if(url.charAt(0)==="/") return /^\/api\//.test(url);
  try{ var u=new URL(url,location.href); return u.origin===location.origin&&/^\/api\//.test(u.pathname); }catch(e){ return false; }
 }
 if(typeof of==="function") window.fetch=function(input,init){
  try{
   var url=typeof input==="string"?input:(input&&input.url)||"";
   var who=isApi(url)?me():null;
   if(who){
    var h=new Headers((init&&init.headers)||(typeof input!=="string"&&input&&input.headers)||undefined);
    h.set("X-TC-Mobile",who.m); h.set("X-TC-Device",who.d);
    init=Object.assign({},init||{},{headers:h});
   }
  }catch(e){}
  return of.call(this,input,init);
 };

 /* ---- 2) Security screen (app owner only) ---- */
 function token(){ try{ return adminToken(); }catch(e){ return ""; } }
 window.tcDevSecOpen=function(){
  var t=token();
  if(!t){ try{ requireAdmin(window.tcDevSecOpen); }catch(e){} return; }
  modal('<h3 style="margin:0 0 6px">Security: device check</h3><p class="muted">Loading...</p>');
  of("/api/auth?action=devauth_status&token="+encodeURIComponent(t)).then(function(r){ return r.json().then(function(j){ return {s:r.status,j:j}; }); }).then(function(x){
   if(x.s===401){ try{ sessionStorage.removeItem("tc_admin_token"); }catch(e){} closeModal(); say("Admin session ended - enter the password again"); try{ requireAdmin(window.tcDevSecOpen); }catch(e){} return; }
   if(!x.j||!x.j.ok){ modal('<h3>Security: device check</h3><p class="danger">Could not load.</p><button onclick="closeModal()" style="width:100%">Close</button>'); return; }
   draw(x.j);
  }).catch(function(){ modal('<h3>Security: device check</h3><p class="danger">No connection.</p><button onclick="closeModal()" style="width:100%">Close</button>'); });
 };
 function draw(j){
  var rows=(j.soft||[]), nohdr=0, other=0;
  rows.forEach(function(r){ if(r.why==="no_header") nohdr+=r.n; else other+=r.n; });
  var table=rows.length?'<table style="width:100%;font-size:12px;border-collapse:collapse">'+rows.slice(0,30).map(function(r){
   return '<tr><td style="padding:2px 4px;border-bottom:1px solid #eee">'+E(r.day.slice(5))+'</td><td style="padding:2px 4px;border-bottom:1px solid #eee">'+E(r.path)+'</td><td style="padding:2px 4px;border-bottom:1px solid #eee">'+E(r.why)+'</td><td style="padding:2px 4px;border-bottom:1px solid #eee;text-align:right"><b>'+E(r.n)+'</b></td></tr>';
  }).join("")+'</table>':'<div class="muted">Nothing recorded in the last 3 days.</div>';
  modal('<h3 style="margin:0 0 6px">Security: device check</h3>'+
   '<div style="padding:8px 10px;border-radius:10px;border:2px solid '+(j.enforce?'#2e8b57':'#e0a526')+';background:'+(j.enforce?'#eaf7f0':'#fff6e0')+';margin-bottom:8px"><b>'+(j.enforce?'ON - requests that fail the check are refused':'OFF (soft mode) - only counting, nothing is refused')+'</b></div>'+
   '<p class="muted" style="font-size:12.5px">The server checks that call logs, SOS, push, business edits and uploads come from the phone that is logged in with that mobile number. In soft mode it only counts what it would have refused.</p>'+
   '<div class="muted" style="font-size:12.5px;margin-bottom:4px">Last 3 days: <b>'+nohdr+'</b> from apps that do not send the device headers yet (old version) - <b>'+other+'</b> other mismatches.</div>'+
   '<div style="max-height:200px;overflow:auto;margin-bottom:8px">'+table+'</div>'+
   '<button class="primary" onclick="tcDevSecSet('+(j.enforce?'false':'true')+')" style="width:100%;margin-bottom:6px">'+(j.enforce?'Switch OFF (back to soft mode)':'Switch ON')+'</button>'+
   '<div class="muted" style="font-size:11.5px;margin-bottom:6px">Switch ON only when the "no header" number has stayed at 0 for a few days, i.e. everybody has updated the app. If something stops working, switch OFF here.</div>'+
   '<button onclick="closeModal()" style="width:100%">Close</button>');
 }
 window.tcDevSecSet=function(on){
  if(on&&!confirm("Switch the device check ON? Anybody whose app is old (does not send the device headers) will be refused until they update.")) return;
  of("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"set_devauth",token:token(),on:!!on})}).then(function(r){ return r.json(); }).then(function(j){
   if(j&&j.ok){ say(on?"Device check is ON":"Device check is OFF"); window.tcDevSecOpen(); } else say("Could not change");
  }).catch(function(){ say("No connection"); });
 };

 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var u=JSON.parse(localStorage.getItem("tc_user")||"null"), body=$("modalBody");
   if(u&&u.isAppOwner&&body&&!body.querySelector("#tcDevSecMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcDevSecMenu";
    wrap.innerHTML=tcMenuItem('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',"Security: device check","closeModal();requireAdmin(tcDevSecOpen)");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };
})();
