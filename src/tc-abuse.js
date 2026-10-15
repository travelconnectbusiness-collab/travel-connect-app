/* Trip-request abuse protection (client side). Loaded by tc-regdocs.js (no index.html change needed).
   1) Sends the device token with every trip request and shows a clear message when the server refuses
      (too many requests / blocked). Replaces tcSendTripBroadcast from customer-safety.js.
   2) Admin: All Users page > "Trip request spam check" - recent requests with counts, Block number/device/IP,
      list of blocks, blocked attempts. Server side: trip_abuse.js. */
(function(){
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var BL=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };

 /* ---------- customer: send the request ---------- */
 if(typeof window.tcSendTripBroadcast==="function") window.tcSendTripBroadcast=async function(businessType,lat,lon,vclass){
  var user=getCurrentUser();
  if(!user) return;
  var pickupText=(document.querySelector("#tripPickupText")||{value:""}).value.trim();
  var note=(document.querySelector("#tripNote")||{value:""}).value.trim();
  var destinations=tcCollectTripDestinations();
  modal('<div style="text-align:center;padding:10px 0"><div class="spinner" style="margin:0 auto"></div></div>');
  try{
   var res=await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    action:"broadcast",business_type:businessType,vclass:vclass||null,customer_name:user.name,customer_mobile:user.mobile,device:(typeof getDeviceToken==="function"?getDeviceToken():""),lat:lat,lon:lon,pickup_text:pickupText,destinations:destinations,message:note})});
   var data=await res.json();
   if(!data.ok){
    var h, p;
    if(data.error==="rate_limited"){
     var n=data.retry_after_min||60;
     h=BL("Too many requests","വളരെയധികം റിക്വസ്റ്റുകൾ");
     p=BL("You have sent several trip requests recently. Please try again in about "+n+" minute"+(n===1?"":"s")+". If it is urgent, call a driver directly from the Active Vehicles Board or the Local Directory.",
          "കുറച്ചുനേരത്തിനുള്ളിൽ ധാരാളം ട്രിപ്പ് റിക്വസ്റ്റുകൾ അയച്ചു. ഏകദേശം "+n+" മിനിറ്റിനു ശേഷം വീണ്ടും ശ്രമിക്കുക. അത്യാവശ്യമാണെങ്കിൽ Active Vehicles Board / Local Directory-യിൽ നിന്ന് ഡ്രൈവറെ നേരിട്ട് വിളിക്കാം.");
    }else if(data.error==="blocked"){
     h=BL("Trip requests not available","ട്രിപ്പ് റിക്വസ്റ്റ് ലഭ്യമല്ല");
     p=BL("Trip requests are not available for this number. Please contact the admin.","ഈ നമ്പറിൽ നിന്ന് ട്രിപ്പ് റിക്വസ്റ്റ് അയക്കാൻ കഴിയില്ല. അഡ്മിനെ ബന്ധപ്പെടുക.");
    }else{
     h="Could not send"; p="Please check your connection and try again.";
    }
    modal('<h2>'+E(h)+'</h2><p class="muted">'+E(p)+'</p><div class="actions"><button onclick="closeModal()">OK</button></div>');
    return;
   }
   tcShowTripWaiting(data.alert_id,data.notified_count,businessType,vclass);
  }catch(e){ modal('<h2>Network error</h2><p class="muted">Please check your connection and try again.</p><div class="actions"><button onclick="closeModal()">OK</button></div>'); }
 };

 /* ---------- admin: spam check panel on the All Users page ---------- */
 var VC={cab:"Motor Cab",carriage:"Contract Carriage",agency:"Travel Agency"};
 var oldRender=window.tcRenderAllUsersAdmin;
 if(typeof oldRender==="function") window.tcRenderAllUsersAdmin=async function(){
  var r=await oldRender.apply(this,arguments);
  try{
   var box=document.querySelector("#tcAllUsersSummary");
   if(box&&!document.querySelector("#tcAbuse")){
    box.insertAdjacentHTML("afterend",'<details id="tcAbuse" style="margin:0 0 12px;border:2px solid #c8d3dc;border-radius:12px;padding:8px 10px"><summary><b>Trip request spam check</b> <span class="muted" style="font-size:12px">(recent requests, block abusers)</span></summary><div id="tcAbuseBody" class="muted">Tap to load...</div></details>');
    document.querySelector("#tcAbuse").addEventListener("toggle",function(){ if(this.open) tcAbuseLoad(); });
   }
  }catch(e){}
  return r;
 };
 function when(iso){ try{ return new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); }catch(e){ return iso; } }
 function isBlocked(kind,value,blocks){ return blocks.some(function(b){ return b.kind===kind&&b.value===value; }); }
 window.tcAbuseLoad=async function(){
  var box=document.querySelector("#tcAbuseBody"); if(!box) return;
  box.textContent="Loading...";
  try{
   var d=await (await fetch("/api/trip_alerts?action=abuse_recent&token="+encodeURIComponent(adminToken()))).json();
   if(!d.ok){ box.textContent="Could not load."; return; }
   window._abuse=d;
   var L=d.limits, h='<div style="font-size:12.5px;margin:6px 0">Trip requests in the last 24 hours: <b>'+d.total_24h+'</b><br>Limits: '+L.mobile_hour+'/hour and '+L.mobile_day+'/day per number, '+L.device_hour+'/hour per device, '+L.ip_hour+'/hour per network. The same request tapped twice within 90 seconds is sent only once.</div>';
   h+='<b>Recent requests</b>'+(d.recent.length?"":'<div class="muted">None yet.</div>');
   d.recent.forEach(function(a,i){
    var many=a.count_24h>=6;
    h+='<div style="margin:6px 0;padding:6px 8px;border:1px solid '+(many?'#e0a0a0':'#dde')+';border-radius:8px;background:'+(many?'#fff3f3':'#fff')+'">'+
     '<b>'+E(a.customer_name)+'</b> &middot; <a href="tel:'+E(a.customer_mobile)+'">'+E(a.customer_mobile)+'</a>'+(many?' <span style="color:#a12d2d"><b>'+a.count_24h+' requests in 24h</b></span>':(a.count_24h>1?' <span class="muted">('+a.count_24h+' in 24h)</span>':''))+'<br>'+
     '<span class="muted" style="font-size:12px">'+E(when(a.created_at))+' &middot; '+E(VC[a.vclass]||(typeof TC_BUSINESS_TYPES!=="undefined"&&TC_BUSINESS_TYPES[a.business_type])||a.business_type)+' &middot; '+a.notified_count+' notified &middot; '+E(a.status)+'</span><br>'+
     '<span class="muted" style="font-size:11.5px">Device: '+E(a.device?String(a.device).slice(0,8):"-")+' &middot; IP: '+E(a.ip||"-")+'</span>'+
     '<div class="actions" style="margin-top:4px">'+
      (a.mobile10&&!isBlocked("mobile",a.mobile10,d.blocks)?'<button class="danger" onclick="tcAbuseBlock('+i+',\'mobile\')">Block number</button>':(a.mobile10?'<span class="muted">number blocked</span>':''))+
      (a.device&&!isBlocked("device",a.device,d.blocks)?'<button onclick="tcAbuseBlock('+i+',\'device\')">Block device</button>':'')+
      (a.ip&&!isBlocked("ip",a.ip,d.blocks)?'<button onclick="tcAbuseBlock('+i+',\'ip\')">Block IP</button>':'')+
     '</div></div>';
   });
   h+='<b style="display:block;margin-top:10px">Blocked ('+d.blocks.length+')</b>'+(d.blocks.length?"":'<div class="muted">Nothing blocked.</div>');
   d.blocks.forEach(function(b,i){
    h+='<div style="margin:4px 0;font-size:13px">'+E(b.kind)+': <b>'+E(String(b.value).slice(0,24))+'</b> '+(b.reason?'<span class="muted">'+E(b.reason)+'</span> ':'')+'<button onclick="tcAbuseUnblock('+i+')">Unblock</button></div>';
   });
   h+='<b style="display:block;margin-top:10px">Refused attempts (last 20)</b>'+(d.log.length?"":'<div class="muted">None.</div>');
   d.log.forEach(function(l){ h+='<div class="muted" style="font-size:12px">'+E(when(l.created_at))+' &middot; '+E(l.mobile10||"-")+' &middot; '+E(l.why)+'</div>'; });
   box.innerHTML=h;
  }catch(e){ box.textContent="Network error."; }
 };
 async function post(body){
  body.token=adminToken();
  var d=await (await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)})).json();
  return d;
 }
 window.tcAbuseBlock=async function(i,kind){
  var a=(window._abuse&&window._abuse.recent||[])[i]; if(!a) return;
  var value=kind==="mobile"?a.mobile10:kind==="device"?a.device:a.ip;
  var msg=kind==="ip"?"Block this network (IP "+value+")?\nMany phones on the same mobile network can share one IP - block it only for clear spam.":"Block this "+kind+" ("+String(value).slice(0,20)+") from sending trip requests?";
  if(!confirm(msg)) return;
  try{ var d=await post({action:"abuse_block",kind:kind,value:value,reason:"blocked from request #"+a.id}); say(d.ok?"Blocked":"Could not block"); tcAbuseLoad(); }catch(e){ say("Network error"); }
 };
 window.tcAbuseUnblock=async function(i){
  var b=(window._abuse&&window._abuse.blocks||[])[i]; if(!b) return;
  try{ var d=await post({action:"abuse_unblock",kind:b.kind,value:b.value}); say(d.ok?"Unblocked":"Could not unblock"); tcAbuseLoad(); }catch(e){ say("Network error"); }
 };
})();
