/* Vehicle-document prompts, Approve-page category + vehicle documents, Authorized-Users switch.
   Loaded last; overrides / wraps older functions by name. */
(function(){
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var VEH=["taxi_travel","auto_rickshaw","pickup_goods"];

 /* ---------- owner: what is missing on my vehicles? ---------- */
 function dleft(s){ var n=Math.round((new Date(s+"T00:00:00")-new Date(new Date().toDateString()))/86400000); return n<0?'<b style="color:#b00">expired</b>':(n<=30?'<b style="color:#c60">'+n+' days left</b>':n+' days left'); }
 window.tcFixVehicleDocs=async function(partnerId,vehicleId){
  try{
   var d=await (await fetch("/api/vehicles?action=list&partner_id="+encodeURIComponent(partnerId))).json();
   window._myVehicles=d.vehicles||[];
   if(vehicleId) tcOpenEditVehicle(vehicleId); else openAddVehicle(partnerId);
  }catch(e){ say("Network error"); }
 };
 async function check(p){
  if(!p||VEH.indexOf(p.business_type||"taxi_travel")<0) return;
  var u=getCurrentUser(); if(!u) return;
  try{
   var r=await fetch("/api/regdocs?action=status&partner_id="+encodeURIComponent(p.id)+"&mobile="+encodeURIComponent(u.mobile)+"&device="+encodeURIComponent(getDeviceToken()));
   var d=await r.json(); if(!d.ok) return;
   if(d.required&&!d.vehicles.length){
    app().innerHTML=card("Add your vehicle / വാഹനം ചേർക്കൂ",'<p>To finish your registration, add your vehicle with its documents: front photo, RC photo, insurance photo and expiry date, permit photo and expiry date.</p><p class="muted">രജിസ്ട്രേഷൻ പൂർത്തിയാക്കാൻ വാഹനവും രേഖകളും ചേർക്കണം: മുൻവശത്തെ ഫോട്ടോ, RC ഫോട്ടോ, ഇൻഷുറൻസ് ഫോട്ടോയും തീയതിയും, പെർമിറ്റ് ഫോട്ടോയും തീയതിയും.</p><div class="actions"><button class="primary" onclick="tcFixVehicleDocs('+p.id+')">Add vehicle</button></div>');
    return;
   }
   var bad=d.vehicles.filter(function(v){ return v.missing.length; });
   var none=!d.vehicles.length&&p.business_type!=="taxi_travel";
   if(!bad.length&&!none) return;
   if(document.querySelector("#rdBanner")) return;
   var b='<div id="rdBanner" style="border:2px solid #e0a526;background:#fff8e6;border-radius:12px;padding:8px 10px;margin:0 0 10px;font-size:13px"><b>Complete your vehicle documents</b><br>From '+E(d.enforce_date)+' only vehicles with all documents stay Verified and get trip alerts. / '+E(d.enforce_date)+' മുതൽ രേഖകൾ പൂർണ്ണമായ വാഹനങ്ങൾക്ക് മാത്രമേ Verified, ട്രിപ്പ് അലേർട്ട് ലഭിക്കൂ.';
   bad.forEach(function(v){ b+='<div style="margin-top:6px"><b>'+E(v.vehicle_number)+'</b>: '+E(v.missing.join(", "))+' <button onclick="tcFixVehicleDocs('+p.id+','+v.id+')">Complete</button></div>'; });
   if(none) b+='<div style="margin-top:6px">No vehicle added yet. <button class="primary" onclick="tcFixVehicleDocs('+p.id+')">Add vehicle</button></div>';
   app().insertAdjacentHTML("afterbegin",b+'</div>');
  }catch(e){}
 }
 var oldOpen=window.tcOpenOneBusiness;
 if(typeof oldOpen==="function") window.tcOpenOneBusiness=function(p){ var r=oldOpen.apply(this,arguments); try{ check(p); }catch(e){} return r; };

 /* owners can no longer change the business category themselves */
 var oldEdit=window.tcOpenEditPartnerDetails;
 if(typeof oldEdit==="function") window.tcOpenEditPartnerDetails=function(){
  var r=oldEdit.apply(this,arguments);
  setTimeout(function(){
   ["#peBizType","#peBizTypeOther"].forEach(function(s){ var e=document.querySelector(s); if(e) e.disabled=true; });
   var sel=document.querySelector("#peBizType");
   if(sel&&sel.parentNode) sel.parentNode.insertAdjacentHTML("beforeend",'<div class="muted" style="font-size:11.5px;margin-top:4px">Category is fixed after approval. To change it, contact the admin.</div>');
  },0);
  return r;
 };


 /* ---------- admin: Pending Approvals with category + vehicle documents ---------- */
 function typeOptions(cur){
  var keys=Object.keys(TC_BUSINESS_TYPES), h="";
  if(keys.indexOf(cur)<0&&cur) h+='<option value="'+E(cur)+'" selected>'+E(cur)+'</option>';
  keys.forEach(function(k){ h+='<option value="'+k+'"'+(k===cur?" selected":"")+'>'+E(TC_BUSINESS_TYPES[k])+'</option>'; });
  return h;
 }
 var VC={cab:"Motor Cab",carriage:"Contract Carriage"};
 window.tcLoadPendingPartners=async function(){
  var box=document.querySelector("#tcPendingPartners"); if(!box) return;
  try{
   var res=await fetch("/api/partners?action=pending&token="+encodeURIComponent(adminToken())), data=await res.json();
   if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
   if(!data.partners.length){ box.innerHTML="<p class='muted'>No pending partner registrations.</p>"; return; }
   var sums={};
   await Promise.all(data.partners.map(function(p){
    if(VEH.indexOf(p.business_type||"taxi_travel")<0) return null;
    return fetch("/api/regdocs?action=admin_summary&partner_id="+p.id+"&token="+encodeURIComponent(adminToken())).then(function(r){return r.json();}).then(function(d){ sums[p.id]=d.ok?d.vehicles:[]; }).catch(function(){});
   }));
   var t=encodeURIComponent(adminToken());
   box.innerHTML=data.partners.map(function(p){
    var isVeh=VEH.indexOf(p.business_type||"taxi_travel")>=0, vs=sums[p.id]||[], dh="";
    if(isVeh){
     dh='<div style="margin-top:6px;font-size:13px"><b>Vehicles ('+vs.length+')</b>'+(vs.length?"":' <span style="color:#a12d2d">none added yet</span>');
     vs.forEach(function(v){
      dh+='<div style="margin:4px 0;padding:4px 6px;border:1px solid #dde;border-radius:8px"><b>'+E(v.vehicle_number)+'</b> '+E(v.category||"")+(v.seats?' &middot; '+(v.seats-1)+' passengers + driver ('+v.seats+' seats, '+VC[v.vclass]+')':'')+' '+(v.verified?'<span class="ok">Verified</span>':'<span class="muted">pending</span>')+
       '<br>Permit: '+E(v.permit_expiry||"-")+(v.permit_expiry?' ('+dleft(v.permit_expiry)+')':'')+' &middot; Insurance: '+E(v.insurance_expiry||"-")+(v.insurance_expiry?' ('+dleft(v.insurance_expiry)+')':'')+
       (v.missing.length?'<br><span style="color:#a12d2d">Missing: '+E(v.missing.join(", "))+'</span>':'<br><span style="color:#1b7a2f">Documents complete</span>')+
       '<div>'+Object.keys(v.keys).filter(function(k){return v.keys[k];}).map(function(k){ return '<a href="/api/vehicles?action=file&key='+encodeURIComponent(v.keys[k])+'&token='+t+'" target="_blank" style="margin-right:8px">'+k+'</a>'; }).join("")+'</div></div>';
     });
     dh+='<div class="muted" style="font-size:11.5px">Approve the vehicles under Pending Vehicles below.</div></div>';
    }
    return '<div class="listitem"><b>'+E(p.business_name)+'</b> <span class="muted">'+E(tcBizDisplayLabel(p.business_type,p.business_subtype))+'</span><br>'+
     '<span class="muted">'+E(p.owner_name)+' - '+E(p.mobile1)+(p.location?' - '+E(p.location):'')+'</span>'+
     (p.description?'<div style="font-size:12px;margin-top:2px">'+E(p.description)+'</div>':'')+
     '<label style="display:block;margin-top:6px">Category (fixed after approval)<select id="apCat'+p.id+'">'+typeOptions(p.business_type||"taxi_travel")+'</select></label>'+dh+
     '<div class="actions" style="margin-top:6px"><button class="primary" onclick="tcApprovePartner('+p.id+')">Approve</button><button class="danger" onclick="tcDeletePartner('+p.id+')">Delete</button></div></div>';
   }).join("");
  }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
 };
 window.tcApprovePartner=async function(id,force){
  var sel=document.querySelector("#apCat"+id), body={action:"verify",partner_id:id,verified:true,token:adminToken()};
  if(sel) body.business_type=sel.value;
  if(force) body.force=true;
  try{
   var res=await fetch("/api/partners?action=verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}), data=await res.json();
   if(!data.ok){
    if(data.error==="docs_missing"){ if(confirm("This owner has no vehicle with complete documents. Approve anyway?")) return tcApprovePartner(id,true); return; }
    if(data.error==="category_conflict"){ say("This number already has a business in that category."); return; }
    say("Could not approve - try again."); return;
   }
   say("Partner approved - category locked"); tcLoadPendingPartners();
  }catch(e){ say("Network error"); }
 };

 /* ---------- admin: Authorized Users switch ---------- */
 var oldAu=window.tcRenderAuthorizedUsers;
 if(typeof oldAu==="function") window.tcRenderAuthorizedUsers=async function(){
  await oldAu.apply(this,arguments);
  var anchor=document.querySelector("#auMobile"); anchor=anchor&&anchor.closest(".grid"); if(!anchor) return;
  anchor.insertAdjacentHTML("beforebegin",'<div id="auMode" style="border:2px solid #c8d3dc;border-radius:12px;padding:10px;margin:0 0 12px">Loading switch...</div>');
  tcAuModeLoad();
 };
 window.tcAuModeLoad=async function(){
  var box=document.querySelector("#auMode"); if(!box) return;
  try{
   var d=await (await fetch("/api/authorized?action=mode&token="+encodeURIComponent(adminToken()))).json();
   if(!d.ok){ box.textContent="Could not load."; return; }
   var on=!!d.require_allowlist;
   box.innerHTML='<b>Business owner access: '+(on?'<span style="color:#b00">LIMITED to this list</span>':'<span style="color:#1b7a2f">OPEN to everyone</span>')+'</b>'+
    '<div class="muted" style="margin:4px 0 8px;font-size:12.5px">'+(on?'ON: only the numbers listed below can log in or register as business owners.':'OFF: anyone can register as a business owner (they stay unverified until you approve; vehicle owners must upload documents).')+'</div>'+
    '<div class="actions"><button class="'+(on?'':'primary')+'" onclick="tcAuModeSet('+(on?'false':'true')+')">'+(on?'Turn OFF (open registration)':'Turn ON (list only)')+'</button>'+
    '<button onclick="tcAuAddOwners()">Add all current owners to list</button></div>';
  }catch(e){ box.textContent="Network error."; }
 };
 window.tcAuModeSet=async function(on){
  if(on&&!confirm("Turn ON? Only numbers on the list can be business owners. Tip: first tap 'Add all current owners to list' so nobody gets locked out.")) return;
  try{ await fetch("/api/authorized",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"set_mode",on:on,token:adminToken()})}); }catch(e){ say("Network error"); return; }
  say(on?"List-only mode ON":"Open registration ON"); tcAuModeLoad();
 };
 window.tcAuAddOwners=async function(){
  try{
   var d=await (await fetch("/api/authorized",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"add_all_owners",token:adminToken()})})).json();
   say(d.ok?(d.added+" numbers added to the list"):"Could not add"); if(d.ok&&typeof tcLoadAuthorized==="function") tcLoadAuthorized();
  }catch(e){ say("Network error"); }
 };
})();
