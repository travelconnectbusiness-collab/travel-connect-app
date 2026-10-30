/* Vehicle-document prompts, Approve-page category + vehicle documents, Verification deadline preview, All Users filter tiles, Authorized-Users switch.
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
      dh+='<div style="margin:4px 0;padding:4px 6px;border:1px solid #dde;border-radius:8px"><b>'+E(v.vehicle_number)+'</b> '+E(v.category||"")+(v.seats&&(p.business_type||'taxi_travel')==='taxi_travel'?' &middot; '+(v.seats-1)+' passengers + driver ('+v.seats+' seats, '+VC[v.vclass]+')':'')+' '+(v.verified?'<span class="ok">Verified</span>':'<span class="muted">pending</span>')+
       '<br>Permit: '+E(v.permit_expiry||"-")+(v.permit_expiry?' ('+dleft(v.permit_expiry)+')':'')+' &middot; Insurance: '+E(v.insurance_expiry||"-")+(v.insurance_expiry?' ('+dleft(v.insurance_expiry)+')':'')+
       ((p.business_type||'taxi_travel')==='taxi_travel'&&v.seats?'<span class="tcrc-mark" data-vid="'+v.id+'" data-seats="'+E(v.seats)+'" data-cat="'+E(v.rate_cat==null?"":v.rate_cat)+'" data-catn="'+E(v.rate_cat_name||"")+'" style="display:block"></span>':'')+
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

 /* ---------- admin: Verification deadline preview (top of Pending Approvals) ---------- */
 var oldPending=window.tcRenderPendingApprovals;
 if(typeof oldPending==="function") window.tcRenderPendingApprovals=async function(){
  var r=await oldPending.apply(this,arguments);
  try{
   var box=document.querySelector("#tcPendingPartners"), h=box&&box.previousElementSibling;
   if(h&&!document.querySelector("#tcEnf")){
    h.insertAdjacentHTML("beforebegin",'<div id="tcEnf" style="border:2px solid #e0a526;background:#fff8e6;border-radius:12px;padding:10px;margin:0 0 12px">Loading deadline preview...</div>');
    tcEnfLoad();
   }
  }catch(e){}
  return r;
 };
 function tomorrow(){ var d=new Date(Date.now()+86400000); return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2); }
 window.tcEnfLoad=async function(){
  var box=document.querySelector("#tcEnf"); if(!box) return;
  try{
   var d=await (await fetch("/api/regdocs?action=enforce_preview&token="+encodeURIComponent(adminToken()))).json();
   if(!d.ok){ box.textContent="Could not load the deadline preview."; return; }
   window._enfOwners=d.owners;
   var t=d.totals, h='<b>Verification deadline: '+E(d.enforce_date)+'</b> <span class="muted">('+(d.enforced?'already in force':d.days_left+' days left')+')</span>'+
    '<div style="margin:6px 0;font-size:12.5px">Change date: <input type="date" id="enfDate" min="'+tomorrow()+'" value="'+(d.enforced?"":E(d.enforce_date))+'"> <button onclick="tcEnfSetDate()">Change</button></div>';
   if(!d.owners.length){
    h+='<div style="color:#1b7a2f"><b>'+(d.enforced?'Nobody is waiting to lose Verified.':'Everyone is ready - no one will lose Verified on this date.')+'</b></div>';
   }else{
    h+='<div style="font-size:13.5px"><b>'+(d.enforced?'Today':'On '+E(d.enforce_date))+': '+t.owners+' owner(s), '+t.vehicles+' vehicle(s) with incomplete documents.</b><br>'+t.owners_losing_verified+' auto/goods business(es) would lose Verified completely; the others lose only those vehicles (Motor Cab / Contract Carriage alerts).</div>'+
     '<div class="actions" style="margin:8px 0"><button class="primary" onclick="tcEnfRemind()">Send reminder to all ('+d.owners.length+')</button></div>'+
     '<div id="enfProg" class="muted" style="font-size:12.5px"></div>'+
     '<details style="margin-top:6px"><summary><b>Show the list</b></summary>'+d.owners.map(function(o){
      return '<div style="margin:6px 0;padding:6px 8px;border:1px solid #e3d3a5;border-radius:8px;background:#fff">'+
       '<b>'+E(o.business_name)+'</b> <span class="muted">'+E(TC_BUSINESS_TYPES[o.business_type]||o.business_type)+(o.owner_name?' - '+E(o.owner_name):'')+'</span><br>'+
       (o.loses_verified?'<span style="color:#a12d2d"><b>Loses Verified</b></span>':'<span style="color:#c60"><b>Vehicle(s) only</b></span>')+
       ' &middot; <a href="tel:'+E(o.mobile1)+'">'+E(o.mobile1)+'</a>'+(o.mobile2?' / <a href="tel:'+E(o.mobile2)+'">'+E(o.mobile2)+'</a>':'')+
       (o.no_vehicle?'<br>No vehicle added yet':'')+
       o.vehicles.map(function(v){ return '<br><b>'+E(v.vehicle_number||"vehicle")+'</b>: '+E(v.missing.join(", ")); }).join("")+
       '<div class="actions" style="margin-top:4px"><button onclick="tcEnfRemind(['+o.partner_id+'])">Remind this owner</button></div></div>';
     }).join("")+'</details>';
   }
   box.innerHTML=h;
  }catch(e){ box.textContent="Network error."; }
 };
 window.tcEnfSetDate=async function(){
  var el=document.querySelector("#enfDate"), v=el&&el.value; if(!v){ say("Pick a date first"); return; }
  if(!confirm("Change the verification deadline to "+v+"?\nFrom that day vehicles with incomplete documents lose Verified. Owners see the new date in their reminders.")) return;
  try{
   var d=await (await fetch("/api/regdocs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"set_enforce_date",date:v,token:adminToken()})})).json();
   if(!d.ok){ say(d.error==="must_be_future"?"The date must be after today":d.error==="too_far"?"Date is too far away (max 2 years)":"Could not change"); return; }
   say("Deadline changed to "+d.enforce_date); tcEnfLoad();
  }catch(e){ say("Network error"); }
 };
 /* ids omitted = everyone on the list; sent 3 owners at a time (free-plan limit per request) */
 window.tcEnfRemind=async function(ids){
  var all=!ids; ids=ids||(window._enfOwners||[]).map(function(o){ return o.partner_id; });
  if(!ids.length) return;
  if(all&&!confirm("Send the reminder message + notification to "+ids.length+" owner(s)?")) return;
  var prog=document.querySelector("#enfProg"), sent=0, already=0, none=0;
  try{
   for(var i=0;i<ids.length;i+=3){
    if(prog) prog.textContent="Sending... "+Math.min(i+3,ids.length)+" / "+ids.length;
    var d=await (await fetch("/api/regdocs",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"remind",partner_ids:ids.slice(i,i+3),token:adminToken()})})).json();
    if(!d.ok) throw new Error("fail");
    sent+=d.sent; already+=d.already_today; none+=d.nothing_to_fix;
   }
   var m="Sent to "+sent+(already?" - "+already+" already reminded today":"")+(none?" - "+none+" had nothing to fix":"");
   if(prog) prog.textContent=m; say(m);
  }catch(e){ if(prog) prog.textContent="Stopped after "+sent+" sent - network/server error. Tap again to continue (already-sent owners are skipped)."; say("Could not finish"); }
 };

 /* ---------- admin: All Users - tap a tile to see only that group ---------- */
 var AU_TILES=[["all","Total users"],["owner","Business Owners"],["customer","Customers"],["app","Installed the app"],["web","Website only"],["unknown","Not known yet"]];
 function auMatch(u,f){
  if(f==="owner") return u.role==="owner";
  if(f==="customer") return u.role!=="owner";
  if(f==="app"||f==="web") return u.app_mode===f;
  if(f==="unknown") return !u.app_mode;
  return true;
 }
 var oldOpenAU=window.tcOpenAllUsersAdmin;
 if(typeof oldOpenAU==="function") window.tcOpenAllUsersAdmin=function(){ window._tcAuFilter="all"; return oldOpenAU.apply(this,arguments); };
 window.tcAuSetFilter=function(f){
  window._tcAuFilter=(window._tcAuFilter===f&&f!=="all")?"all":f; /* tap the same tile again = show everyone */
  tcRenderAllUsersSummary(window._tcAllUsers||[]);
  tcFilterAllUsers();
 };
 window.tcRenderAllUsersSummary=function(all){
  var box=document.querySelector("#tcAllUsersSummary"); if(!box) return;
  var f=window._tcAuFilter||"all";
  var cnt=function(list,m){ return list.filter(function(u){ return u.app_mode===m; }).length; };
  var owners=all.filter(function(u){ return u.role==="owner"; }), custs=all.filter(function(u){ return u.role!=="owner"; });
  var vals={all:all.length,owner:owners.length,customer:custs.length,app:cnt(all,"app"),web:cnt(all,"web"),unknown:all.filter(function(u){ return !u.app_mode; }).length};
  var subs={owner:"&#128241; "+cnt(owners,"app")+" app &bull; &#127760; "+cnt(owners,"web")+" web",customer:"&#128241; "+cnt(custs,"app")+" app &bull; &#127760; "+cnt(custs,"web")+" web"};
  box.innerHTML='<div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">'+AU_TILES.map(function(t){
   var on=f===t[0];
   return '<div class="metric" role="button" onclick="tcAuSetFilter(\''+t[0]+'\')" style="cursor:pointer;'+(on?'outline:3px solid #1d6fa5;background:#eaf4fb':'')+'">'+t[1]+'<b>'+vals[t[0]]+'</b>'+(subs[t[0]]?'<div class="muted" style="font-size:11px">'+subs[t[0]]+'</div>':'')+(on&&t[0]!=="all"?'<div style="font-size:11px;color:#1d6fa5"><b>Showing only this</b></div>':'')+'</div>';
  }).join("")+'</div><p class="muted" style="font-size:11.5px;margin:4px 0 10px">Tap a box to see only those users; tap it again (or "Total users") to see everyone. "Installed the app" = opened Travel Connect from the home-screen app at least once. "Not known yet" = hasn\'t opened the app since this feature was added; it fills in as people open it.</p>';
 };
 window.tcRenderAllUsersList=function(list){
  var box=document.querySelector("#tcAllUsersList"); if(!box) return;
  var f=window._tcAuFilter||"all";
  list=list.filter(function(u){ return auMatch(u,f); });
  var owners=list.filter(function(u){ return u.role==="owner"; }), custs=list.filter(function(u){ return u.role!=="owner"; });
  var none="<p class='muted'>None.</p>", h="";
  if(f!=="customer") h+="<h3>Business Owners ("+owners.length+")</h3>"+(owners.map(tcUserRowHtml).join("")||none);
  if(f!=="owner") h+='<h3 style="margin-top:'+(f==="customer"?"0":"16px")+'">Customers ('+custs.length+")</h3>"+(custs.map(tcUserRowHtml).join("")||none);
  box.innerHTML=h;
 };
})();

/* Extra scripts that are loaded from here, so index.html never has to change (bump ?v= when a file changes).
   guard.js also syntax-checks every src/tc-*.js file. */
(function(){
 ["/src/tc-img.js?v=20261016b","/src/tc-abuse.js?v=20261015a","/src/tc-trips.js?v=20261015a","/src/tc-media.js?v=20261016b","/src/tc-share.js?v=20261017a","/src/tc-dash.js?v=20261017a","/src/tc-livetrip.js?v=20261017b","/src/tc-ratecat.js?v=20261017b","/src/tc-pushtest.js?v=20261017a","/src/tc-accbook.js?v=20261022e","/src/tc-bills.js?v=20261022a","/src/tc-tripcards.js?v=20261025a","/src/tc-tripform.js?v=20261025a","/src/tc-daybook.js?v=20261020a","/src/tc-xlsx.js?v=20261022a","/src/tc-import.js?v=20261025a","/src/tc-pkg.js?v=20261025a","/src/tc-digest.js?v=20261025a","/src/tc-sharecard.js?v=20261029b","/src/tc-drivers.js?v=20261022a","/src/tc-enq.js?v=20261022a","/src/tc-home.js?v=20261022a","/src/tc-wait.js?v=20261021a","/src/tc-demand.js?v=20261021a","/src/tc-bkflow.js?v=20261022a","/src/tc-dropbill.js?v=20261024a","/src/tc-dropmin.js?v=20261022a","/src/tc-bankdet.js?v=20261022a","/src/tc-billedit.js?v=20261022a","/src/tc-custfare.js?v=20261022a","/src/tc-filebk.js?v=20261030a","/src/tc-devhdr.js?v=20261023b","/src/tc-acctsec.js?v=20261023b","/src/tc-emaillogin.js?v=20261024b","/src/tc-odo.js?v=20261025c","/src/tc-ltloc.js?v=20261027b","/src/tc-cost.js?v=20261025b","/src/tc-profit.js?v=20261022a","/src/tc-restore.js?v=20261026a","/src/tc-shop.js?v=20261026f","/src/tc-shopui.js?v=20261028c","/src/tc-shoprep.js?v=20261026f","/src/tc-shopcr.js?v=20261028a","/src/tc-shoppur.js?v=20261028c","/src/tc-shopday.js?v=20261028b","/src/tc-shopset.js?v=20261026a","/src/tc-shopprice.js?v=20261029b","/src/tc-docs.js?v=20261027a","/src/tc-docsprint.js?v=20261027a","/src/tc-docslink.js?v=20261027a","/src/tc-gst.js?v=20261027a","/src/tc-shopimp.js?v=20261026b","/src/tc-pers.js?v=20261029c","/src/tc-persgift.js?v=20261028a","/src/tc-perschit.js?v=20261028a","/src/tc-persbill.js?v=20261029d","/src/tc-persrem.js?v=20261029a","/src/tc-perslock.js?v=20261030b","/src/tc-custhome.js?v=20261029a","/src/tc-admindata.js?v=20261029b","/src/tc-menu.js?v=20261026f","/src/tc-nav.js?v=20261020b"].forEach(function(src){
  try{ var s=document.createElement("script"); s.src=src; s.async=false; document.head.appendChild(s); }catch(e){}
 });
})();
