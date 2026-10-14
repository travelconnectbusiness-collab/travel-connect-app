/* Vehicle documents + Approve-page category/documents + Authorized-Users switch.
   Loaded last; overrides / wraps older functions by name. */
(function(){
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var VEH=["taxi_travel","auto_rickshaw","pickup_goods"];
 var MSG={
  photo_missing:"One of the photos is missing.",image_too_big:"A photo is too big - try again.",
  vehicle_no_required:"Enter the vehicle number.",permit_date_required:"Enter the permit expiry date.",ins_date_required:"Enter the insurance expiry date.",
  permit_expired:"The permit has already expired.",ins_expired:"The insurance has already expired.",rc_date_bad:"RC date is not valid.",unauthorized:"Please log in again."
 };

 /* ---------- shrink a phone photo so the upload is quick ---------- */
 function shrink(file){
  return new Promise(function(resolve){
   if(!file||!file.type||file.type.indexOf("image/")!==0){ resolve(null); return; }
   var url=URL.createObjectURL(file), img=new Image();
   img.onload=function(){
    var s=Math.min(1,1600/Math.max(img.width,img.height)), c=document.createElement("canvas");
    c.width=Math.round(img.width*s); c.height=Math.round(img.height*s);
    c.getContext("2d").drawImage(img,0,0,c.width,c.height);
    c.toBlob(function(b){ URL.revokeObjectURL(url); resolve(b||file); },"image/jpeg",0.8);
   };
   img.onerror=function(){ URL.revokeObjectURL(url); resolve(file); };
   img.src=url;
  });
 }

 /* ---------- owner: documents page ---------- */
 var SLOTS=[
  ["front","Vehicle front photo","വാഹനത്തിന്റെ മുൻഭാഗത്തിന്റെ ഫോട്ടോ"],
  ["rc","RC book photo","ആർസി ബുക്കിന്റെ ഫോട്ടോ"],
  ["permit","Permit photo","പെർമിറ്റിന്റെ ഫോട്ടോ"],
  ["ins","Insurance first page photo (shows vehicle number and your address)","ഇൻഷുറൻസിന്റെ ഒന്നാം പേജ് (വണ്ടി നമ്പറും അഡ്രസ്സും കാണണം)"]
 ];
 window.tcRegDocsOpen=function(p,existing){
  var h='<p class="muted" style="margin-top:0">To finish your registration, upload your vehicle documents. All photos are required.<br>രജിസ്ട്രേഷൻ പൂർത്തിയാക്കാൻ വാഹനത്തിന്റെ രേഖകൾ നൽകണം. എല്ലാ ഫോട്ടോയും നിർബന്ധമാണ്.</p>'+
   '<label>Vehicle number / വാഹന നമ്പർ<input id="rdVno" placeholder="KL 00 A 0000" value="'+E(existing&&existing.vehicle_no||"")+'" autocapitalize="characters"></label>';
  SLOTS.forEach(function(s){
   h+='<label style="display:block;margin-top:10px"><b>'+s[1]+'</b><br><span class="muted">'+s[2]+'</span>'+
    '<input type="file" accept="image/*" id="rd_'+s[0]+'" onchange="tcRegDocsPreview(\''+s[0]+'\')">'+
    '<img id="rdp_'+s[0]+'" style="display:none;max-width:100%;max-height:160px;margin-top:6px;border-radius:8px;border:1px solid #ccd"></label>';
   if(s[0]==="rc") h+='<label>RC date (optional) / ആർസി തീയതി (ഓപ്ഷണൽ)<input type="date" id="rdRcDate" value="'+E(existing&&existing.rc_date||"")+'"></label>';
   if(s[0]==="permit") h+='<label>Permit expiry date * / പെർമിറ്റ് കാലാവധി തീരുന്ന തീയതി<input type="date" id="rdPermitDate"></label>';
   if(s[0]==="ins") h+='<label>Insurance expiry date * / ഇൻഷുറൻസ് കാലാവധി തീരുന്ന തീയതി<input type="date" id="rdInsDate"></label>';
  });
  h+='<div class="actions" style="margin-top:12px"><button class="primary" id="rdSend" onclick="tcRegDocsSubmit('+p.id+')">Submit documents</button></div><div id="rdErr" class="danger"></div>';
  app().innerHTML=card("Vehicle documents / വാഹന രേഖകൾ",h);
 };
 window.tcRegDocsPreview=function(k){
  var f=document.querySelector("#rd_"+k).files[0], im=document.querySelector("#rdp_"+k);
  if(f){ im.src=URL.createObjectURL(f); im.style.display=""; }
 };
 window.tcRegDocsSubmit=async function(pid){
  var err=document.querySelector("#rdErr"), btn=document.querySelector("#rdSend");
  err.textContent="";
  var u=getCurrentUser(); if(!u){ renderLogin(); return; }
  var vno=document.querySelector("#rdVno").value.trim();
  if(vno.length<4){ err.textContent=MSG.vehicle_no_required; return; }
  var haveOld=!!window._rdHasOld;
  for(var i=0;i<SLOTS.length;i++){ if(!document.querySelector("#rd_"+SLOTS[i][0]).files[0]&&!haveOld){ err.textContent="Add the photo: "+SLOTS[i][1]; return; } }
  var pd=document.querySelector("#rdPermitDate").value, idt=document.querySelector("#rdInsDate").value;
  if(!pd){ err.textContent=MSG.permit_date_required; return; }
  if(!idt){ err.textContent=MSG.ins_date_required; return; }
  btn.disabled=true; btn.textContent="Uploading...";
  try{
   var fd=new FormData();
   fd.set("action","submit"); fd.set("partner_id",pid); fd.set("mobile",u.mobile); fd.set("device_token",getDeviceToken());
   fd.set("vehicle_no",vno); fd.set("rc_date",document.querySelector("#rdRcDate").value); fd.set("permit_expiry",pd); fd.set("ins_expiry",idt);
   for(var j=0;j<SLOTS.length;j++){
    var f=document.querySelector("#rd_"+SLOTS[j][0]).files[0];
    if(f){ var b=await shrink(f); fd.set(SLOTS[j][0],b,SLOTS[j][0]+".jpg"); }
   }
   var r=await fetch("/api/regdocs",{method:"POST",body:fd}), d=await r.json();
   if(!d.ok){ err.textContent=MSG[d.error]||("Could not upload ("+(d.error||"error")+")"); btn.disabled=false; btn.textContent="Submit documents"; return; }
   say("Documents submitted - waiting for admin approval"); partnerView();
  }catch(e){ err.textContent="Network error - try again."; btn.disabled=false; btn.textContent="Submit documents"; }
 };
 async function check(p){
  if(!p||p.verified||VEH.indexOf(p.business_type||"taxi_travel")<0) return;
  var u=getCurrentUser(); if(!u) return;
  try{
   var r=await fetch("/api/regdocs?action=status&partner_id="+encodeURIComponent(p.id)+"&mobile="+encodeURIComponent(u.mobile)+"&device="+encodeURIComponent(getDeviceToken()));
   var d=await r.json();
   if(d.ok&&d.required&&!d.submitted){ window._rdHasOld=false; tcRegDocsOpen(p,null); }
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

 /* ---------- admin: Pending Approvals with category + documents ---------- */
 function typeOptions(cur){
  var keys=Object.keys(TC_BUSINESS_TYPES), h="";
  if(keys.indexOf(cur)<0&&cur) h+='<option value="'+E(cur)+'" selected>'+E(cur)+'</option>';
  keys.forEach(function(k){ h+='<option value="'+k+'"'+(k===cur?" selected":"")+'>'+E(TC_BUSINESS_TYPES[k])+'</option>'; });
  return h;
 }
 function dayLeft(s){ if(!s) return ""; var d=Math.ceil((new Date(s+"T23:59:59")-new Date())/86400000); return d<0?'<b style="color:#b00">expired</b>':(d<=30?'<b style="color:#c60">'+d+' days left</b>':d+" days left"); }
 window.tcLoadPendingPartners=async function(){
  var box=document.querySelector("#tcPendingPartners"); if(!box) return;
  try{
   var res=await fetch("/api/partners?action=pending&token="+encodeURIComponent(adminToken())), data=await res.json();
   if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
   if(!data.partners.length){ box.innerHTML="<p class='muted'>No pending partner registrations.</p>"; return; }
   var docs={};
   await Promise.all(data.partners.map(function(p){
    if(VEH.indexOf(p.business_type||"taxi_travel")<0) return null;
    return fetch("/api/regdocs?action=get&partner_id="+p.id+"&token="+encodeURIComponent(adminToken())).then(function(r){return r.json();}).then(function(d){ docs[p.id]=d.ok?d.docs:null; }).catch(function(){});
   }));
   box.innerHTML=data.partners.map(function(p){
    var isVeh=VEH.indexOf(p.business_type||"taxi_travel")>=0, d=docs[p.id], dh="";
    if(isVeh){
     dh=d?'<div style="margin-top:6px;font-size:13px"><b style="color:#1b7a2f">Documents submitted</b> - Vehicle '+E(d.vehicle_no)+'<br>Permit expiry: '+E(d.permit_expiry)+' ('+dayLeft(d.permit_expiry)+') &middot; Insurance expiry: '+E(d.ins_expiry)+' ('+dayLeft(d.ins_expiry)+')'+(d.rc_date?' &middot; RC date: '+E(d.rc_date):'')+
      '<div><button onclick="tcApViewDocs('+p.id+')">View photos</button></div><div id="apImgs'+p.id+'"></div></div>'
      :'<div style="margin-top:6px;font-size:13px;color:#a12d2d"><b>Documents not submitted yet</b> (needed if the number is not on the Authorized list)</div>';
    }
    return '<div class="listitem"><b>'+E(p.business_name)+'</b> <span class="muted">'+E(tcBizDisplayLabel(p.business_type,p.business_subtype))+'</span><br>'+
     '<span class="muted">'+E(p.owner_name)+' - '+E(p.mobile1)+(p.location?' - '+E(p.location):'')+'</span>'+
     (p.description?'<div style="font-size:12px;margin-top:2px">'+E(p.description)+'</div>':'')+
     '<label style="display:block;margin-top:6px">Category (fixed after approval)<select id="apCat'+p.id+'">'+typeOptions(p.business_type||"taxi_travel")+'</select></label>'+dh+
     '<div class="actions" style="margin-top:6px"><button class="primary" onclick="tcApprovePartner('+p.id+')">Approve</button><button class="danger" onclick="tcDeletePartner('+p.id+')">Delete</button></div></div>';
   }).join("");
  }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
 };
 window.tcApViewDocs=async function(id){
  var box=document.querySelector("#apImgs"+id); if(!box) return;
  try{
   var d=(await (await fetch("/api/regdocs?action=get&partner_id="+id+"&token="+encodeURIComponent(adminToken()))).json()).docs; if(!d) return;
   var t=encodeURIComponent(adminToken());
   var items=[["Front",d.front_key],["RC book",d.rc_key],["Permit",d.permit_key],["Insurance",d.ins_key]];
   box.innerHTML=items.map(function(x){ var u="/api/regdocs?action=file&key="+encodeURIComponent(x[1])+"&token="+t; return '<div style="margin-top:6px"><b>'+x[0]+'</b><br><a href="'+u+'" target="_blank"><img src="'+u+'" style="max-width:100%;max-height:220px;border-radius:8px;border:1px solid #ccd"></a></div>'; }).join("");
  }catch(e){ say("Could not load photos"); }
 };
 window.tcApprovePartner=async function(id,force){
  var sel=document.querySelector("#apCat"+id), body={action:"verify",partner_id:id,verified:true,token:adminToken()};
  if(sel) body.business_type=sel.value;
  if(force) body.force=true;
  try{
   var res=await fetch("/api/partners?action=verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}), data=await res.json();
   if(!data.ok){
    if(data.error==="docs_missing"){ if(confirm("This owner has not uploaded the vehicle documents. Approve anyway?")) return tcApprovePartner(id,true); return; }
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
