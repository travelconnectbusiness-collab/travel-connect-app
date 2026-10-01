/* ======================================================================
   TRAVEL CONNECT - directory.js
   Partner registration/verification, the Local Directory (search across
   every business type), the Active Vehicles Board, non-taxi partners' own
   simple profile page, and every admin tool for managing partners/
   vehicles/plans. See core.js for TC_BUSINESS_TYPES / tcBizLabel() etc.
   ====================================================================== */

/* ---------- BUSINESS HOURS (all business types) ----------
   Optional per-business opening/closing time. Once set, "Active"/
   "Available" status is computed at DISPLAY time against the current
   clock - outside the set hours, a listing simply stops appearing as
   Active in the Directory/Active Board, and automatically reappears
   within hours the next day, with no manual daily toggle needed. The
   underlying Available/Active flag itself is untouched - only how it's
   shown is affected, which is what makes this reliable without needing
   a server-side scheduled job. */
function tcBusinessHoursFieldsHtml(prefix,hours){
 hours=hours||{};
 return `<div class="grid">
  <label><input type="checkbox" id="${prefix}HoursOn" ${hours.enabled?"checked":""} onchange="document.querySelector('#${prefix}HoursRow').style.display=this.checked?'':'none'"> Set business hours (Active status auto-hides outside these hours)</label>
 </div>
 <div id="${prefix}HoursRow" class="grid" style="${hours.enabled?"":"display:none"}">
  <label>Opens at<input id="${prefix}HoursOpen" type="time" value="${esc(hours.open||"09:00")}"></label>
  <label>Closes at<input id="${prefix}HoursClose" type="time" value="${esc(hours.close||"21:00")}"></label>
 </div>`;
}
function tcReadBusinessHoursFields(prefix){
 const on=document.querySelector("#"+prefix+"HoursOn")?.checked||false;
 if(!on) return {enabled:false};
 return {enabled:true,open:document.querySelector("#"+prefix+"HoursOpen")?.value||"09:00",close:document.querySelector("#"+prefix+"HoursClose")?.value||"21:00"};
}
/* Handles hours that cross midnight (e.g. open 18:00, close 02:00) as well
   as same-day hours. */
function tcIsWithinBusinessHours(hours){
 if(!hours||!hours.enabled||!hours.open||!hours.close) return true;
 const now=new Date();
 const nowMinutes=now.getHours()*60+now.getMinutes();
 const [oh,om]=hours.open.split(":").map(Number), [ch,cm]=hours.close.split(":").map(Number);
 const openMinutes=oh*60+om, closeMinutes=ch*60+cm;
 if(openMinutes<=closeMinutes) return nowMinutes>=openMinutes&&nowMinutes<closeMinutes;
 return nowMinutes>=openMinutes||nowMinutes<closeMinutes;
}
function tcBusinessHoursNote(hours){
 if(!hours||!hours.enabled) return "";
 return ` <span class="muted" style="font-size:11px">(Hours: ${esc(hours.open)}-${esc(hours.close)})</span>`;
}

/* ---------- PREMIUM-STYLE ACTIVE/AVAILABLE TOGGLE ----------
   Rebuilt as a plain clickable div (no checkbox input at all) after the
   checkbox+overlaid-span version proved unreliable - clicks either landed
   wrong or didn't register at all depending on the device/browser, likely
   from some interaction with a global input styling rule that a hidden,
   zero-sized checkbox is unusually sensitive to. This version has no
   native form control to fight with: tcHandleToggleClick() below flips a
   plain data-attribute, updates the visible pieces directly, and calls
   the real handler itself - nothing here depends on checkbox/label
   browser quirks. onToggleExpr is a JS expression string using the bound
   name "checked" for the NEW state (e.g. "tcTogglePartnerAvailable(5,
   checked)"), not "this.checked" as the old checkbox version used. */
function tcActiveToggleHtml(id,checked,onToggleExpr,label){
 return `<div id="${id}_row" data-checked="${checked?"1":"0"}" data-onchange="${esc(onToggleExpr)}" data-label="${esc(label||"")}" onclick="tcHandleToggleClick('${id}')" style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:12px;margin-top:8px;padding:12px;background:${checked?"#e6f7e9":"#f5f6f7"};border:2px solid ${checked?"#2e9e44":"#c9d4dc"};border-radius:12px">
  <div id="${id}_track" style="width:58px;height:32px;border-radius:32px;background:${checked?"#2e9e44":"#b7c2ca"};position:relative;flex-shrink:0;transition:.2s;box-shadow:inset 0 1px 3px rgba(0,0,0,.15)">
   <div id="${id}_knob" style="position:absolute;top:3px;left:${checked?"29px":"3px"};width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.35);transition:.2s"></div>
  </div>
  <div>
   <div id="${id}_label" style="font-weight:800;font-size:15px;color:${checked?"#1c6b2c":"#172536"}">${checked?tcT("available_now"):(label?tcT(label):tcT("mark_as_active"))}</div>
   <div id="${id}_sub" style="font-size:12px;color:#6a7a87;font-weight:600">${checked?tcT("available_sub_on"):tcT("available_sub_off")}</div>
  </div>
 </div>`;
}
function tcHandleToggleClick(id){
 const row=document.querySelector("#"+id+"_row");
 if(!row) return;
 const newChecked=row.dataset.checked!=="1";
 row.dataset.checked=newChecked?"1":"0";
 row.style.background=newChecked?"#e6f7e9":"#f5f6f7";
 row.style.borderColor=newChecked?"#2e9e44":"#c9d4dc";
 const track=document.querySelector("#"+id+"_track"), knob=document.querySelector("#"+id+"_knob");
 if(track) track.style.background=newChecked?"#2e9e44":"#b7c2ca";
 if(knob) knob.style.left=newChecked?"29px":"3px";
 const labelEl=document.querySelector("#"+id+"_label"), subEl=document.querySelector("#"+id+"_sub");
 const savedLabel=row.dataset.label;
 if(labelEl){ labelEl.textContent=newChecked?tcT("available_now"):(savedLabel?tcT(savedLabel):tcT("mark_as_active")); labelEl.style.color=newChecked?"#1c6b2c":"#172536"; }
 if(subEl) subEl.textContent=newChecked?tcT("available_sub_on"):tcT("available_sub_off");
 try{
  const fn=new Function("checked",row.dataset.onchange);
  fn(newChecked);
 }catch(e){}
}

/* ---------- GPS PIN CAPTURE (precise location for Directions) ---------- */
async function tcCapturePartnerLocation(locInputId,pinInputId,statusId){
 const status=document.querySelector("#"+statusId);
 if(!navigator.geolocation){ if(status) status.textContent="Location isn't supported on this browser."; return; }
 if(status) status.textContent="Getting your location...";
 navigator.geolocation.getCurrentPosition(async (pos)=>{
  const lat=pos.coords.latitude, lon=pos.coords.longitude;
  const pinEl=document.querySelector("#"+pinInputId);
  if(pinEl) pinEl.value=lat+","+lon;
  if(status) status.textContent="Looking up address...";
  try{
   const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`);
   const data=await res.json();
   const a=data.address||{};
   const place=a.suburb||a.town||a.city||a.village||a.county||"";
   const district=a.state_district||a.county||"";
   const combined=[place,district].filter(Boolean).filter((v,i,arr)=>arr.indexOf(v)===i).join(", ");
   const locEl=document.querySelector("#"+locInputId);
   if(locEl&&combined&&!locEl.value) locEl.value=combined;
   if(status) status.textContent="\u2705 Exact location pinned - directions will go straight here.";
  }catch(e){
   if(status) status.textContent="\u2705 Exact location pinned (address lookup failed, but the pin itself is saved).";
  }
 },()=>{
  if(status) status.textContent="Location permission denied - directions will use the typed town name instead.";
 },{timeout:10000});
}
function tcReadPin(pinInputId){
 const v=document.querySelector("#"+pinInputId)?.value||"";
 const parts=v.split(",");
 if(parts.length===2){
  const lat=parseFloat(parts[0]), lon=parseFloat(parts[1]);
  if(!isNaN(lat)&&!isNaN(lon)) return {lat,lon};
 }
 return null;
}

/* ---------- PARTNER REGISTRATION ---------- */
function renderPartnerRegisterForm(){
 const user=getCurrentUser();
 document.querySelector("#partnerBox").innerHTML=`
 <p class="muted">Register your business to appear in the local directory and (for Taxi/Travel Agency) use the full quotation/billing tools. An admin will verify your details first.</p>
 <div class="grid">
  <label>Business type<div>${tcBizTypeFieldHtml("pBizType","pBizTypeOther",localStorage.getItem("tc_chosen_business_type"),"pSkillType")}</div></label>
  <label>Business name<input id="pBizName"></label>
  <label>Owner name<input id="pOwnerName" value="${esc(user.name)}"></label>
  <label>Mobile 1<input id="pMobile1" value="${esc(user.mobile)}"></label>
  <label>Mobile 2 (optional)<input id="pMobile2"></label>
  <label>Email (optional)<input id="pEmail"></label>
  <label>Location<div style="display:flex;gap:6px"><input id="pLocation" placeholder="Town / area" style="flex:1"><button type="button" onclick="tcCapturePartnerLocation('pLocation','pPin','pLocStatus')">&#128205;</button></div></label>
  <label>Pincode<input id="pPincode"></label>
 </div>
 <input type="hidden" id="pPin">
 <div id="pLocStatus" class="muted" style="font-size:11.5px;margin:-6px 0 6px">Tap &#128205; to pin your exact location - makes Directions accurate for customers.</div>
 <label>About your business (optional)<textarea id="pDescription" rows="3" placeholder="What you offer, vehicles/services, specialities etc. - customers see this before calling."></textarea></label>
 ${tcBusinessHoursFieldsHtml("p",null)}
 <button class="primary" onclick="submitPartnerRegister()">Register</button>
 <div id="pRegErr" class="danger"></div>`;
}
async function submitPartnerRegister(){
 const business_name=document.querySelector("#pBizName").value.trim();
 const owner_name=document.querySelector("#pOwnerName").value.trim();
 const mobile1=document.querySelector("#pMobile1").value.trim();
 const errBox=document.querySelector("#pRegErr");
 if(!business_name||!owner_name||!mobile1){errBox.textContent="Fill in business name, owner name and mobile number.";return}
 const pin=tcReadPin("pPin");
 const body={action:"register",business_name,owner_name,mobile1,
  business_type:tcResolveBizType("pBizType","pBizTypeOther"),
  business_subtype:document.querySelector("#pSkillType").value.trim(),
  mobile2:document.querySelector("#pMobile2").value.trim(),
  email:document.querySelector("#pEmail").value.trim(),
  location:document.querySelector("#pLocation").value.trim(),
  pincode:document.querySelector("#pPincode").value.trim(),
  description:document.querySelector("#pDescription").value.trim(),
  business_hours:JSON.stringify(tcReadBusinessHoursFields("p")),
  lat:pin?pin.lat:null,lon:pin?pin.lon:null};
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!data.ok){
   if(data.error==="category_not_authorized"){
    errBox.textContent="Your number isn't authorized for this business category yet. Please contact the app owner to get "+esc(tcBizLabel(body.business_type))+" added for your number, then try again.";
   }else if(data.error==="already_registered"){
    errBox.textContent="You've already registered a "+esc(tcBizLabel(body.business_type))+" business with this number.";
   }else{
    errBox.textContent="Could not register. Please try again.";
   }
   return;
  }
  toast("Registered - waiting for admin verification");
  partnerView();
 }catch(e){errBox.textContent="Network error - check your connection and try again.";}
}

/* ---------- EDIT PARTNER DETAILS ---------- */
function tcOpenEditPartnerDetails(partnerId){
 const p=window._myPartner;
 let hours={};
 try{ hours=JSON.parse(p.business_hours||"{}"); }catch(e){}
 modal(`<h2>Edit Business Details</h2>
  <div class="grid">
   <label>Business type<div>${tcBizTypeFieldHtml("peBizType","peBizTypeOther",p.business_type,"peSkillType",p.business_subtype)}</div></label>
   <label>Business name<input id="peBizName" value="${esc(p.business_name)}"></label>
   <label>Owner name<input id="peOwnerName" value="${esc(p.owner_name)}"></label>
   <label>Mobile 2<input id="peMobile2" value="${esc(p.mobile2||"")}"></label>
   <label>Email<input id="peEmail" value="${esc(p.email||"")}"></label>
   <label>Location<div style="display:flex;gap:6px"><input id="peLocation" value="${esc(p.location||"")}" style="flex:1"><button type="button" onclick="tcCapturePartnerLocation('peLocation','pePin','peLocStatus')">&#128205;</button></div></label>
   <label>Pincode<input id="pePincode" value="${esc(p.pincode||"")}"></label>
  </div>
  <input type="hidden" id="pePin">
  <div id="peLocStatus" class="muted" style="font-size:11.5px;margin:-6px 0 6px">${p.lat!=null?"\u2705 Exact location already pinned. Tap \ud83d\udccd again only if this business has moved.":"Tap \ud83d\udccd to pin your exact location - makes Directions accurate for customers."}</div>
  <label>About your business (optional)<textarea id="peDescription" rows="3" placeholder="What you offer, vehicles/services, specialities etc.">${esc(p.description||"")}</textarea></label>
  ${tcBusinessHoursFieldsHtml("pe",hours)}
  <button class="primary" onclick="tcSavePartnerDetails(${partnerId})">Save</button>`);
}
async function tcSavePartnerDetails(partnerId){
 const user=getCurrentUser();
 const pin=tcReadPin("pePin");
 const body={action:"update",partner_id:partnerId,mobile:user.mobile,
  business_type:tcResolveBizType("peBizType","peBizTypeOther"),
  business_subtype:document.querySelector("#peSkillType").value.trim(),
  business_name:document.querySelector("#peBizName").value,
  owner_name:document.querySelector("#peOwnerName").value,
  mobile2:document.querySelector("#peMobile2").value,
  email:document.querySelector("#peEmail").value,
  location:document.querySelector("#peLocation").value,
  pincode:document.querySelector("#pePincode").value,
  description:document.querySelector("#peDescription").value.trim(),
  business_hours:JSON.stringify(tcReadBusinessHoursFields("pe")),
  lat:pin?pin.lat:null,lon:pin?pin.lon:null};
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!data.ok){ toast("Could not save ("+(data.error||"unknown")+")"); return; }
  toast("Details updated");
  closeModal();
  partnerView();
 }catch(e){toast("Network error");}
}

/* ---------- PARTNER VIEW (routing + own profile page) ---------- */
async function partnerView(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("Travel Partner",`<div id="partnerBox">Checking your registration...</div>`);
 const user=getCurrentUser();
 try{
  const res=await fetch("/api/partners?action=mine_list&mobile="+encodeURIComponent(user.mobile));
  const data=await res.json();
  const list=(data.ok&&data.partners)?data.partners:[];
  window._myBusinesses=list;
  if(!list.length){
   db.settings.myBusinessType="none"; db.settings.myPartnerId=null; save();
   renderPartnerRegisterForm();
   return;
  }
  /* If the person just picked a business category at login that they don't
     already have registered under this mobile (e.g. they have an existing
     Taxi business, but chose "Skilled Work" this time round, meaning they
     want to add THAT as a new, separate business) - go straight to the
     registration form for it, instead of silently reopening whichever
     existing business happens to be first/only. Cleared right after so it
     only affects the login that actually made this choice, not every
     future one. */
  const justChosen=localStorage.getItem("tc_chosen_business_type");
  if(justChosen&&!list.some(p=>(p.business_type||"taxi_travel")===justChosen)){
   localStorage.removeItem("tc_chosen_business_type");
   renderPartnerRegisterForm();
   return;
  }
  localStorage.removeItem("tc_chosen_business_type");
  if(list.length>1){
   const chosenId=sessionStorage.getItem("tc_chosen_partner_id");
   const chosen=chosenId?list.find(p=>String(p.id)===chosenId):null;
   if(!chosen){ tcRenderBusinessPicker(list); return; }
   tcOpenOneBusiness(chosen);
   return;
  }
  tcOpenOneBusiness(list[0]);
 }catch(e){
  document.querySelector("#partnerBox").innerHTML="<p class='danger'>Network error - check your connection and try again.</p>";
 }
}
/* Shown only when a mobile has registered MORE than one business (e.g. a
   taxi business and a separate auto-rickshaw or shop, all under one
   number) - lets them pick which one to open, or start registering
   another. A mobile with just one business skips straight past this,
   exactly as before. */
function tcRenderBusinessPicker(list){
 document.querySelector("#partnerBox").innerHTML=`
  <p class="muted">You have more than one business registered on this number. Choose one to open.</p>
  ${list.map(p=>`<div class="listitem">
   <b>${esc(p.business_name)}</b> <span class="muted">${esc(tcBizLabel(p.business_type))}${p.business_subtype?" - "+esc(p.business_subtype):""}</span> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">(Pending)</span>'}
   <div class="actions" style="margin-top:6px"><button class="primary" onclick='tcSelectBusiness(${p.id})'>Open</button></div>
  </div>`).join("")}
  <div class="actions" style="margin-top:10px"><button onclick="renderPartnerRegisterForm()">+ Register Another Business</button></div>`;
}
function tcSelectBusiness(partnerId){
 sessionStorage.setItem("tc_chosen_partner_id",String(partnerId));
 partnerView();
}
function tcSwitchBusiness(){
 sessionStorage.removeItem("tc_chosen_partner_id");
 partnerView();
}
function tcOpenOneBusiness(partner){
 window._myPartner=partner; window._myPartnerHasPassword=!!partner.portal_password_hash;
 db.settings.myPlan=partner.plan||"free";
 db.settings.myPartnerId=partner.id;
 db.settings.myLogoKey=partner.logo_key||null;
 if(partner.brand_settings){
  try{ Object.assign(db.settings,JSON.parse(partner.brand_settings)); }catch(e){}
 }
 /* db.business (this device's local billing-identity cache) is shared by
    whichever business is currently open on THIS device - it is NOT scoped
    per-partner. Without this, opening a different partner's business on a
    device previously used for someone else's (e.g. a shared test phone,
    or the owner's own device used to check several registrations) would
    keep showing the PREVIOUS partner's name/phone/tagline/logo everywhere
    db.business is read (dashboard header, prints, bills) until this new
    partner happened to overwrite it themselves via Edit Billing Details.
    Resetting it here, every time a DIFFERENT partner is opened, to sane
    defaults drawn from that partner's own server record keeps each
    business's identity from leaking into another's. */
 if(db.settings.myBillingIdentityFor!==partner.id){
  db.business={name:partner.business_name||"Your Business Name",tagline:"",address:partner.location||"",
   officeLocation:partner.location||"",phone:partner.mobile1||"",phone2:partner.mobile2||"",
   email:partner.email||"",gstin:"",upiId:"",upiName:partner.business_name||"",description:partner.description||""};
  db.settings.myBillingIdentityFor=partner.id;
 }
 const confirmedType=partner.business_type||"taxi_travel";
 const wasUnknown=db.settings.myBusinessType==null;
 db.settings.myBusinessType=confirmedType;
 save();
 if(confirmedType==="taxi_travel"&&wasUnknown&&(window._myBusinesses||[]).length<=1){
  dashboard();
  tcInjectDashboardMsgCard();
  return;
 }
 renderPartnerDashboard(partner);
}

/* Combined dashboard for every non-taxi business type - a simple profile
   card (with the premium Active toggle + business-hours note), Billing
   Details (shared with business.js's renderBillingIdentitySection), and
   (once a UPI ID is set) a simple type-an-amount payment-QR collector. */
function renderPartnerDashboard(p){
 const isTaxi=tcIsTaxiType(p.business_type);
 /* Auto Rickshaw and Pickup/Goods Carrier are vehicle-based businesses too
    (unlike a restaurant or workshop) - without their own "Add Vehicle",
    the only way to signal availability was a single partner-level toggle,
    so their actual vehicle never had a category/number of its own and
    could never appear on the Active Vehicles Board the way a taxi does.
    Giving them the same Vehicles section (not the full Taxi
    quotation/billing tools - just vehicle registration + the per-vehicle
    Active toggle) fixes both at once. */
 const hasVehicles=isTaxi||p.business_type==="auto_rickshaw"||p.business_type==="pickup_goods";
 const hasMultiple=(window._myBusinesses||[]).length>1;
 let hours={};
 try{ hours=JSON.parse(p.business_hours||"{}"); }catch(e){}
 const collectPaymentHtml=`
  ${db.business.upiId?`
  <p class="muted">${tcT("collect_payment_hint")}</p>
  <div class="grid"><label>${tcT("collect_payment_amount_label")}<input id="ncAmount" type="number" placeholder="e.g. 500"></label></div>
  <div class="actions"><button class="primary" onclick="tcGenerateNonTaxiQR()">${tcT("generate_qr")}</button></div>
  <div id="ncQrBox" style="text-align:center;margin-top:10px"></div>`:
  `<p class="muted">${tcT("set_upi_first")}</p>`}`;
 document.querySelector("#partnerBox").innerHTML=`
 ${tcMessagesCardHtml()}
 ${hasMultiple?`<div class="actions"><button onclick="tcSwitchBusiness()">&#8646; ${tcT("switch_business")}</button></div>`:""}
 <div class="card">
  <h3>${esc(p.business_name)} ${p.verified?'<span class="ok">&#9989; '+tcT("verified_badge")+'</span>':'<span class="muted">'+tcT("pending_verification")+'</span>'}</h3>
  <div class="muted">${esc(tcBizLabel(p.business_type))}${p.business_subtype?" - "+esc(p.business_subtype):""}</div>
  <div class="muted">${tcT("owner_label")}: ${esc(p.owner_name)} - ${esc(p.mobile1)}${p.mobile2?" / "+esc(p.mobile2):""}</div>
  ${p.email?`<div class="muted">${esc(p.email)}</div>`:""}
  ${p.location?`<div class="muted">${esc(p.location)} ${esc(p.pincode||"")}</div>`:""}
  ${p.description?`<div style="margin-top:6px;font-size:13px">${esc(p.description)}</div>`:""}
  ${hours.enabled?`<div class="muted" style="margin-top:4px">${tcBusinessHoursNoteText(hours.open,hours.close)}</div>`:""}
  ${p.verified?tcActiveToggleHtml("partnerAvailToggle",!!p.available,`tcTogglePartnerAvailable(${p.id},checked)`):""}
  <div class="actions" style="margin-top:8px"><button onclick="tcOpenEditPartnerDetails(${p.id})">${tcT("edit_details")}</button></div>
 </div>
 ${hasVehicles?`
 <div class="card" id="billingIdentityCard">
  <h3>${tcT("billing_details_title")} <span class="muted">(${tcT("billing_details_sub")})</span></h3>
  <div id="billingIdentityBody"></div>
 </div>
 <div class="actions"><button class="primary" onclick="openAddVehicle(${p.id})">${tcT("add_vehicle")}</button></div>
 <h3>${tcT("my_vehicles")}</h3>
 <div id="myVehiclesList">${tcT("loading")}</div>${isTaxi?"":`
 <div class="card">
  <h3>&#128241; ${tcT("collect_payment_title")}</h3>
  ${collectPaymentHtml}
 </div>`}`:`
 <div class="card" id="billingIdentityCard">
  <h3>${tcT("billing_details_title")} <span class="muted">(${tcT("billing_sub_nontaxi")})</span></h3>
  <div id="billingIdentityBody"></div>
 </div>
 <div class="card">
  <h3>&#128241; ${tcT("collect_payment_title")}</h3>
  ${collectPaymentHtml}
 </div>`}
 <div class="card">
  <h3>&#128222; ${tcT("recent_contacts_title")} <span class="muted">(${tcT("recent_contacts_sub")})</span></h3>
  <div id="tcRecentContacts">${tcT("loading")}</div>
 </div>
 <hr>
 <div class="actions"><button onclick="tcOpenDirectory()">&#128269; ${tcT("search_local_directory")}</button></div>`;
 renderBillingIdentitySection(p);
 if(hasVehicles) loadMyVehicles(p.id);
 tcRenderRecentContacts(p.id);
}
async function tcTogglePartnerAvailable(partnerId,available){
 const user=getCurrentUser();
 try{
  const res=await fetch("/api/partners?action=set_available",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"set_available",partner_id:partnerId,mobile:user.mobile,available})});
  const data=await res.json();
  if(!data.ok){ toast("Could not update - try again."); return; }
  toast(available?"You're now shown as Active":"Marked inactive");
  if(window._myPartner) window._myPartner.available=available;
 }catch(e){ toast("Network error"); }
}
function tcGenerateNonTaxiQR(){
 const amt=+document.querySelector("#ncAmount").value||0;
 const box=document.querySelector("#ncQrBox");
 if(amt<=0){ toast("Enter an amount first"); return; }
 if(!db.business.upiId){ toast("Set your UPI ID first"); return; }
 box.innerHTML="";
 if(typeof QRCode==="undefined"){ box.innerHTML="<p class='muted'>QR library not loaded.</p>"; return; }
 new QRCode(box,{text:buildUpiLink(amt,db.business.name||"Payment"),width:200,height:200});
 box.insertAdjacentHTML("beforeend",`<div class="muted" style="margin-top:6px">Scan to pay: ${money(amt)}</div>`);
}

/* ---------- VEHICLE REGISTRATION (Taxi/Travel Agency only) ---------- */
function openAddVehicle(partnerId){
 const isTaxiVehicle=(window._myPartner?.business_type||"taxi_travel")==="taxi_travel";
 const reqPhoto=isTaxiVehicle?" *":" (optional)";
 const optPhoto=" (optional)"; /* RC/Fitness/PUC - date is enough, even for Taxi */
 modal(`<h2>Add Vehicle</h2>
 <div class="grid">
  <label>Vehicle number<input id="vNoNew" placeholder="e.g. KL 07 AB 1234"></label>
  <label>Category<input id="vCatNew" placeholder="e.g. Sedan, 17 Seat Urbania"></label>
 </div>
 <h4>Driver (optional - leave blank if same as RC owner)</h4>
 <div class="grid">
  <label>Driver name<input id="vDriverName"></label>
  <label>Driver mobile 1<input id="vDriverMobile1"></label>
  <label>Driver mobile 2<input id="vDriverMobile2"></label>
  <label>Driving License number<input id="vLicNo"></label>
  <label>License expiry${tcDateInputHtml("vLicExp","")}</label>
  <label>License photo (optional)<input id="vLicPhoto" type="file" accept="image/*"></label>
 </div>
 <h4>Vehicle documents${isTaxiVehicle?" - Front/Insurance/Permit photos are required; RC/Fitness/PUC just need their expiry date":" - the expiry date is enough; a photo is optional"}</h4>
 <div class="grid">
  <label>Front photo${reqPhoto} (vehicle number must be clearly visible - shown to customers when they search)<input id="vFrontPhoto" type="file" accept="image/*"></label>
  <label>RC photo${optPhoto}<input id="vRcPhoto" type="file" accept="image/*"></label>
  <label>RC expiry${tcDateInputHtml("vRcExp","")}</label>
  <label>Insurance photo${reqPhoto}<input id="vInsPhoto" type="file" accept="image/*"></label>
  <label>Insurance expiry${tcDateInputHtml("vInsExp","")}</label>
  <label>Permit photo${reqPhoto}<input id="vPermitPhoto" type="file" accept="image/*"></label>
  <label>Permit expiry${tcDateInputHtml("vPermitExp","")}</label>
  <label>Fitness photo${optPhoto}<input id="vFitnessPhoto" type="file" accept="image/*"></label>
  <label>Fitness expiry${tcDateInputHtml("vFitnessExp","")}</label>
  <label>PUC photo${optPhoto}<input id="vPucPhoto" type="file" accept="image/*"></label>
  <label>PUC expiry${tcDateInputHtml("vPucExp","")}</label>
 </div>
 <button class="primary" id="vSaveBtn" onclick="submitAddVehicle(${partnerId})">Save Vehicle</button>
 <div id="vAddErr" class="danger"></div>`);
}
async function submitAddVehicle(partnerId){
 const no=document.querySelector("#vNoNew").value.trim();
 const errBox=document.querySelector("#vAddErr");
 if(!no){errBox.textContent="Enter the vehicle number.";return}
 const dateVals={};
 for(const id of ["vLicExp","vRcExp","vInsExp","vPermitExp","vFitnessExp","vPucExp"]){
  const r=tcReadDateInput(id);
  if(r===null){errBox.textContent="Enter dates as DD-MM-YYYY (for example 25-12-2026).";return}
  dateVals[id]=r;
 }
 /* Photo uploads are only required for Taxi/Travel Agency vehicles - for
    Auto Rickshaw/Pickup-Goods, entering just the document EXPIRY DATES is
    enough (front photo is still welcome if they want to add it, just not
    required). Two reasons: R2 storage has a free-tier cap the owner pays
    past, and an auto driver's documents typically aren't checked as
    rigorously as a full taxi fleet's - dates alone still let expiry
    warnings work correctly. */
 const isTaxiVehicle=(window._myPartner?.business_type||"taxi_travel")==="taxi_travel";
 if(isTaxiVehicle){
  const requiredPhotos={vFrontPhoto:"Front photo",vInsPhoto:"Insurance photo",vPermitPhoto:"Permit photo"};
  const missing=Object.entries(requiredPhotos).filter(([elId])=>{
   const el=document.querySelector("#"+elId);
   return !(el&&el.files&&el.files[0]);
  }).map(([,label])=>label);
  if(missing.length){
   errBox.textContent="Please upload: "+missing.join(", ")+" - all vehicle documents are required for verification.";
   return;
  }
 }
 const saveBtn=document.querySelector("#vSaveBtn");
 if(saveBtn.disabled) return;
 saveBtn.disabled=true; saveBtn.textContent="Saving...";
 const fd=new FormData();
 fd.append("partner_id",partnerId);
 fd.append("vehicle_number",no);
 fd.append("category",document.querySelector("#vCatNew").value);
 fd.append("driver_name",document.querySelector("#vDriverName").value);
 fd.append("driver_mobile1",document.querySelector("#vDriverMobile1").value);
 fd.append("driver_mobile2",document.querySelector("#vDriverMobile2").value);
 fd.append("driver_license_number",document.querySelector("#vLicNo").value);
 fd.append("driver_license_expiry",dateVals.vLicExp);
 fd.append("rc_expiry",dateVals.vRcExp);
 fd.append("insurance_expiry",dateVals.vInsExp);
 fd.append("permit_expiry",dateVals.vPermitExp);
 fd.append("fitness_expiry",dateVals.vFitnessExp);
 fd.append("puc_expiry",dateVals.vPucExp);
 const fileMap={vLicPhoto:"driver_license_photo",vFrontPhoto:"front_photo",vRcPhoto:"rc_photo",vInsPhoto:"insurance_photo",vPermitPhoto:"permit_photo",vFitnessPhoto:"fitness_photo",vPucPhoto:"puc_photo"};
 Object.entries(fileMap).forEach(([elId,field])=>{
  const el=document.querySelector("#"+elId);
  if(el&&el.files&&el.files[0]) fd.append(field,el.files[0]);
 });
 try{
  const res=await fetch("/api/vehicles?action=register",{method:"POST",body:fd});
  const data=await res.json();
  if(!data.ok){errBox.textContent="Could not save vehicle. Please try again.";saveBtn.disabled=false;saveBtn.textContent="Save Vehicle";return}
  closeModal();
  toast("Vehicle added - waiting for admin verification");
  loadMyVehicles(partnerId);
 }catch(e){errBox.textContent="Network error - check your connection and try again.";saveBtn.disabled=false;saveBtn.textContent="Save Vehicle";}
}
function vehicleExpiryWarnings(v){
 const items=[["RC",v.rc_expiry],["Insurance",v.insurance_expiry],["Permit",v.permit_expiry],["Fitness",v.fitness_expiry],["PUC",v.puc_expiry],["License",v.driver_license_expiry]];
 const soon=items.filter(([,d])=>{
  if(!d) return false;
  const days=(new Date(d)-new Date())/86400000;
  return days<30;
 });
 if(!soon.length) return "";
 return `<div class="danger" style="font-size:12px;margin-top:4px">&#9888; Expiring soon: ${soon.map(([label,d])=>label+" ("+tcFormatDate(d)+")").join(", ")}</div>`;
}
async function loadMyVehicles(partnerId){
 const box=document.querySelector("#myVehiclesList");
 try{
  const res=await fetch("/api/vehicles?action=list&partner_id="+partnerId);
  const data=await res.json();
  if(!data.ok||!data.vehicles.length){box.innerHTML="<p class='muted'>No vehicles added yet.</p>";return}
  window._myVehicles=data.vehicles;
  box.innerHTML=data.vehicles.map(v=>{
   let hours={};
   try{ hours=JSON.parse(v.business_hours||"{}"); }catch(e){}
   return `<div class="listitem">
   <b>${esc(v.vehicle_number)}</b> ${esc(v.category||"")} ${v.verified?'<span class="ok">Verified</span>':'<span class="muted">Pending verification</span>'}<br>
   ${v.driver_name?`Driver: ${esc(v.driver_name)}${v.driver_mobile1?` (${esc(v.driver_mobile1)})`:""}<br>`:""}
   ${vehicleExpiryWarnings(v)}
   <div class="actions" style="margin-top:4px"><button onclick="tcOpenEditVehicle(${v.id})">Edit Vehicle / Documents</button></div>
   ${tcActiveToggleHtml("vActive_"+v.id,!!v.active,`toggleVehicleActive(${v.id},checked)`,"mark_vehicle_active")}
   <div style="margin-top:6px">
    <input id="vTempLoc_${v.id}" placeholder="Current location, if different from your registered garage (optional)" value="${esc(v.temp_location||"")}" style="width:100%;box-sizing:border-box">
   </div>
   <details style="margin-top:6px"><summary style="cursor:pointer;font-size:12px;color:#0b6b78">Set this vehicle's own active hours (optional)</summary>
    <div style="margin-top:6px">${tcBusinessHoursFieldsHtml("vh_"+v.id,hours)}
     <button type="button" onclick="tcSaveVehicleHours(${v.id})" style="margin-top:4px">Save Hours</button></div>
   </details>
  </div>`;
  }).join("");
 }catch(e){box.innerHTML="<p class='danger'>Network error.</p>"}
}
/* Lets the owner add/replace document photos or correct expiry dates any
   time after the vehicle was first registered - most useful for a
   vehicle (often Auto Rickshaw, where photos are optional) that was
   registered with just dates and no photos yet, or a document that has
   since been renewed. Existing dates pre-fill; leaving a file input
   empty keeps that document's existing photo untouched (only a newly
   chosen file replaces it). */
function tcOpenEditVehicle(vehicleId){
 const v=(window._myVehicles||[]).find(x=>x.id===vehicleId);
 if(!v) return;
 modal(`<h2>Edit Vehicle / Documents</h2>
 <div class="grid">
  <label>Vehicle number<input id="evNo" value="${esc(v.vehicle_number||"")}"></label>
  <label>Category<input id="evCat" value="${esc(v.category||"")}"></label>
 </div>
 <h4>Driver</h4>
 <div class="grid">
  <label>Driver name<input id="evDriverName" value="${esc(v.driver_name||"")}"></label>
  <label>Driver mobile 1<input id="evDriverMobile1" value="${esc(v.driver_mobile1||"")}"></label>
  <label>Driver mobile 2<input id="evDriverMobile2" value="${esc(v.driver_mobile2||"")}"></label>
  <label>Driving License number<input id="evLicNo" value="${esc(v.driver_license_number||"")}"></label>
  <label>License expiry${tcDateInputHtml("evLicExp",v.driver_license_expiry)}</label>
  <label>License photo (leave blank to keep current)<input id="evLicPhoto" type="file" accept="image/*"></label>
 </div>
 <h4>Vehicle documents</h4>
 <p class="muted" style="font-size:12px">Leave a photo field blank to keep the one already on file. Choose a new photo only to add or replace it.</p>
 <div class="grid">
  <label>Front photo${v.front_photo_key?" (already on file)":""}<input id="evFrontPhoto" type="file" accept="image/*"></label>
  <label>RC photo${v.rc_photo_key?" (already on file)":""}<input id="evRcPhoto" type="file" accept="image/*"></label>
  <label>RC expiry${tcDateInputHtml("evRcExp",v.rc_expiry)}</label>
  <label>Insurance photo${v.insurance_photo_key?" (already on file)":""}<input id="evInsPhoto" type="file" accept="image/*"></label>
  <label>Insurance expiry${tcDateInputHtml("evInsExp",v.insurance_expiry)}</label>
  <label>Permit photo${v.permit_photo_key?" (already on file)":""}<input id="evPermitPhoto" type="file" accept="image/*"></label>
  <label>Permit expiry${tcDateInputHtml("evPermitExp",v.permit_expiry)}</label>
  <label>Fitness photo${v.fitness_photo_key?" (already on file)":""}<input id="evFitnessPhoto" type="file" accept="image/*"></label>
  <label>Fitness expiry${tcDateInputHtml("evFitnessExp",v.fitness_expiry)}</label>
  <label>PUC photo${v.puc_photo_key?" (already on file)":""}<input id="evPucPhoto" type="file" accept="image/*"></label>
  <label>PUC expiry${tcDateInputHtml("evPucExp",v.puc_expiry)}</label>
 </div>
 <button class="primary" id="evSaveBtn" onclick="tcSubmitEditVehicle(${vehicleId})">Save Changes</button>
 <div id="evErr" class="danger"></div>`);
}
async function tcSubmitEditVehicle(vehicleId){
 const user=getCurrentUser();
 const errBox=document.querySelector("#evErr");
 const dateVals={};
 for(const id of ["evLicExp","evRcExp","evInsExp","evPermitExp","evFitnessExp","evPucExp"]){
  const r=tcReadDateInput(id);
  if(r===null){errBox.textContent="Enter dates as DD-MM-YYYY (for example 25-12-2026).";return}
  dateVals[id]=r;
 }
 const saveBtn=document.querySelector("#evSaveBtn");
 if(saveBtn.disabled) return;
 saveBtn.disabled=true; saveBtn.textContent="Saving...";
 const fd=new FormData();
 fd.append("vehicle_id",vehicleId);
 fd.append("mobile",user.mobile);
 fd.append("category",document.querySelector("#evCat").value);
 fd.append("driver_name",document.querySelector("#evDriverName").value);
 fd.append("driver_mobile1",document.querySelector("#evDriverMobile1").value);
 fd.append("driver_mobile2",document.querySelector("#evDriverMobile2").value);
 fd.append("driver_license_number",document.querySelector("#evLicNo").value);
 fd.append("driver_license_expiry",dateVals.evLicExp);
 fd.append("rc_expiry",dateVals.evRcExp);
 fd.append("insurance_expiry",dateVals.evInsExp);
 fd.append("permit_expiry",dateVals.evPermitExp);
 fd.append("fitness_expiry",dateVals.evFitnessExp);
 fd.append("puc_expiry",dateVals.evPucExp);
 const fileMap={evLicPhoto:"driver_license_photo",evFrontPhoto:"front_photo",evRcPhoto:"rc_photo",evInsPhoto:"insurance_photo",evPermitPhoto:"permit_photo",evFitnessPhoto:"fitness_photo",evPucPhoto:"puc_photo"};
 Object.entries(fileMap).forEach(([elId,field])=>{
  const el=document.querySelector("#"+elId);
  if(el&&el.files&&el.files[0]) fd.append(field,el.files[0]);
 });
 try{
  const res=await fetch("/api/vehicles?action=update",{method:"POST",body:fd});
  const data=await res.json();
  if(!data.ok){errBox.textContent="Could not save. Please try again.";saveBtn.disabled=false;saveBtn.textContent="Save Changes";return}
  closeModal();
  toast("Vehicle updated");
  loadMyVehicles(window._myPartner?.id);
 }catch(e){errBox.textContent="Network error - check your connection and try again.";saveBtn.disabled=false;saveBtn.textContent="Save Changes";}
}
async function toggleVehicleActive(vehicleId,active){
 const user=getCurrentUser();
 const locEl=document.querySelector("#vTempLoc_"+vehicleId);
 const location=locEl?locEl.value.trim():"";
 try{
  await fetch("/api/vehicles?action=toggle_active",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:vehicleId,mobile:user.mobile,active,location})});
  toast(active?(location?"Marked active near "+location:"Marked Active Now"):"Marked inactive");
 }catch(e){toast("Network error");}
}
async function tcSaveVehicleHours(vehicleId){
 const user=getCurrentUser();
 const hours=tcReadBusinessHoursFields("vh_"+vehicleId);
 try{
  await fetch("/api/vehicles?action=set_hours",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:vehicleId,mobile:user.mobile,business_hours:JSON.stringify(hours)})});
  toast("Vehicle hours saved");
 }catch(e){toast("Network error");}
}

/* ---------- LOCAL DIRECTORY ---------- */
let _tcDirectoryEntries=[];
function tcOpenDirectory(){
 if(!history.state||!history.state.tcPage){
  history.pushState({tcPage:true,fromMenu:false},"",location.pathname+location.search+"#directory");
 }else{
  history.replaceState({tcPage:true,fromMenu:false},"",location.pathname+location.search+"#directory");
 }
 tcCurrentIsFromMenu=false;
 tcMenuNavPending=false;
 tcRenderDirectory();
}
async function tcRenderDirectory(){
 const typeOptions=`<option value="">${tcT("all_types")}</option>`+Object.keys(TC_BUSINESS_TYPES).map(k=>`<option value="${k}">${tcBizLabel(k)}</option>`).join("")+`<option value="other">${tcT("other_type")}</option>`;
 app().innerHTML=card("&#128269; "+tcT("local_directory_title"),`
  <p class="muted">${tcT("directory_search_hint")}</p>
  <div class="grid">
   <label>${tcT("category_label")}<select id="tcDirType" onchange="tcFilterDirectory()">${typeOptions}</select></label>
   <label>${tcT("business_search_label")}<input id="tcDirSearch" placeholder="e.g. Hotel Anugraha, Vadakara, 673001" oninput="tcFilterDirectory()"></label>
  </div>
  <div id="tcDirList">${tcT("loading")}</div>`);
 try{
  const res=await fetch("/api/partners?action=directory");
  const data=await res.json();
  _tcDirectoryEntries=(data.ok&&data.partners)?data.partners:[];
  tcRenderDirectoryList(_tcDirectoryEntries);
 }catch(e){document.querySelector("#tcDirList").innerHTML="<p class='danger'>Network error.</p>"}
}
function tcRenderDirectoryList(entries){
 const box=document.querySelector("#tcDirList");
 if(!box) return;
 if(!entries.length){box.innerHTML="<p class='muted'>"+tcT("no_matching_businesses")+"</p>";return}
 box.innerHTML=entries.map(p=>{
  let hours={};
  try{ hours=JSON.parse(p.business_hours||"{}"); }catch(e){}
  const effectivelyActive=!!p.available&&tcIsWithinBusinessHours(hours);
  const hasPin=p.lat!=null&&p.lon!=null;
  const mapsUrl=hasPin
   ?"https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lon
   :"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([p.business_name,p.location,p.pincode].filter(Boolean).join(", "));
  return `<div class="listitem">
  <b>${esc(p.business_name)}</b> ${effectivelyActive?'<span class="ok">&#9679; Active now</span>':''}<br>
  <span class="muted">${esc(tcBizLabel(p.business_type))}${p.business_subtype?" - "+esc(p.business_subtype):""}${p.location?" &bull; "+esc(p.location)+" "+esc(p.pincode||""):""}</span>${tcBusinessHoursNote(hours)}
  ${p.description?`<div style="font-size:12.5px;margin-top:4px;color:#333">${esc(p.description)}</div>`:""}
  <div class="actions">
   ${tcCallButtonHtml(p.mobile1,"partner",p.id,p.business_name,true)}
   ${p.mobile2?tcCallButtonHtml(p.mobile2,"partner",p.id,p.business_name,false):""}
   ${tcWhatsAppButtonHtml(p.mobile1,"partner",p.id,p.business_name)}
   ${tcMessageButtonHtml(p.id,p.business_name,p.mobile1,p.mobile2)}
   ${(p.location||hasPin)?`<a href="${mapsUrl}" target="_blank"><button>&#128205; ${tcT("directions")}</button></a>`:""}
  </div>
 </div>`;
 }).join("");
}
const TC_SEARCH_SYNONYMS=[
 ["textiles","readymade","readymade shop","garments","clothes","clothing","tailor","tailoring"],
 ["barber","barber shop","salon","beauty parlour","beauty parlor","hair salon","hair cutting","spa"],
 ["supermarket","grocery","grocery store","provision store","kirana","general store","pala charakku","palachakku"],
 ["hospital","clinic","medical","doctor","pharmacy","medical store","medicals"],
 ["hotel","restaurant","food","eatery","dine","dining","tea shop","bakery"],
 ["auto","auto rickshaw","rickshaw","three wheeler","autorickshaw"],
 ["pickup","goods carrier","load carrier","mini truck","tempo","packers and movers","shifting"],
 ["workshop","garage","service center","service centre","mechanic","car service","bike service"],
 ["petrol pump","fuel station","gas station","bunk","diesel"],
 ["homestay","resort","lodge","guest house","hotel stay"],
 ["pet shop","pet store","animal shop","aquarium"],
 ["taxi","cab","travel agency","tour operator","tours and travels"],
 ["plumber","plumbing","electrician","electrical","carpenter","carpentry","painter","painting","mason","welding","welder","ac repair","appliance repair","skilled work"]
];
function tcExpandSearchTerms(q){
 const terms=new Set([q]);
 TC_SEARCH_SYNONYMS.forEach(group=>{
  const matches=group.some(term=>term.includes(q)||q.includes(term));
  if(matches) group.forEach(term=>terms.add(term));
 });
 return [...terms];
}
function tcFilterDirectory(){
 const type=document.querySelector("#tcDirType").value;
 const q=(document.querySelector("#tcDirSearch").value||"").trim().toLowerCase();
 let filtered=_tcDirectoryEntries;
 if(type==="other") filtered=filtered.filter(p=>!TC_BUSINESS_TYPES.hasOwnProperty(p.business_type||"taxi_travel"));
 else if(type) filtered=filtered.filter(p=>(p.business_type||"taxi_travel")===type);
 if(q){
  const terms=tcExpandSearchTerms(q);
  filtered=filtered.filter(p=>{
   const haystack=[(p.location||""),(p.pincode||""),(p.business_name||""),tcBizLabel(p.business_type),(p.business_subtype||""),(p.description||"")].join(" ").toLowerCase();
   return terms.some(t=>haystack.includes(t));
  });
 }
 const box=document.querySelector("#tcDirList");
 if(!filtered.length&&q&&box){
  const areaHint=document.querySelector("#loginLocation")?.value||"";
  const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q+(areaHint?", "+areaHint:""));
  box.innerHTML=`<div class="notice">No Travel Connect partners registered under "${esc(document.querySelector("#tcDirSearch").value)}" yet.
   <div class="actions" style="margin-top:8px"><a href="${mapsUrl}" target="_blank"><button>&#128269; Search on Google Maps instead</button></a></div>
  </div>`;
  return;
 }
 tcRenderDirectoryList(filtered);
}

/* ---------- ACTIVE VEHICLES BOARD ---------- */
let _tcActiveBoardVehicles=[];
async function activeBoard(){
 app().innerHTML=card(tcT("active_board_title"),`
  <p class="muted">${tcT("active_board_hint")}</p>
  <label>${tcT("active_board_search_label")}<input id="tcBoardSearch" oninput="tcFilterActiveBoard()"></label>
  <div id="activeBoardList">${tcT("loading")}</div>`);
 try{
  const res=await fetch("/api/vehicles?action=active");
  const data=await res.json();
  _tcActiveBoardVehicles=(data.ok&&data.vehicles)?data.vehicles:[];
  tcRenderActiveBoardList(_tcActiveBoardVehicles);
 }catch(e){document.querySelector("#activeBoardList").innerHTML="<p class='danger'>Network error.</p>"}
}
function tcRenderActiveBoardList(vehicles,append){
 const box=document.querySelector("#activeBoardList");
 if(!box) return;
 const visible=vehicles.filter(v=>{
  let hours={};
  try{ hours=JSON.parse(v.business_hours||"{}"); }catch(e){}
  return tcIsWithinBusinessHours(hours);
 });
 if(!visible.length){ if(!append) box.innerHTML="<p class='muted'>"+tcT("no_matching_vehicles")+"</p>"; return; }
 const html=visible.map(v=>{
  const shownLocation=v.temp_location||v.location;
  const mapsQuery=[v.business_name,shownLocation,v.temp_location?"":v.pincode].filter(Boolean).join(", ");
  const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapsQuery);
  const targetType=v.isPartnerEntry?"partner":"vehicle";
  return `<div class="listitem">
  <div class="row">
   ${v.front_photo_key?`<img src="/api/vehicles?action=public_front_photo&vehicle_id=${v.id}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0">`:""}
   <div>
    <b>${esc(v.category||"Vehicle")}</b>${v.vehicle_number?" - "+esc(v.vehicle_number):""} <span class="ok">&#9679; Active</span> <span class="chip">${esc(tcBizLabel(v.business_type))}</span><br>
    ${esc(v.business_name)}${shownLocation?` &bull; ${esc(shownLocation)}${v.temp_location?' <span class="ok">(currently here)</span>':" "+esc(v.pincode||"")}`:""}
   </div>
  </div>
  <div class="actions">
   ${tcCallButtonHtml(v.mobile1,targetType,v.id,(v.business_name||"")+(v.vehicle_number?" - "+v.vehicle_number:""),true)}
   ${v.mobile2?tcCallButtonHtml(v.mobile2,targetType,v.id,(v.business_name||"")+(v.vehicle_number?" - "+v.vehicle_number:""),false):""}
   ${tcWhatsAppButtonHtml(v.mobile1,targetType,v.id,(v.business_name||"")+(v.vehicle_number?" - "+v.vehicle_number:""))}
   ${tcMessageButtonHtml(v.partner_id,v.business_name,v.mobile1,v.mobile2)}
   ${shownLocation?`<a href="${mapsUrl}" target="_blank"><button>&#128205; ${tcT("directions")}</button></a>`:""}
  </div>
 </div>`;
 }).join("");
 if(append) box.innerHTML+=html; else box.innerHTML=html;
}
function tcFilterActiveBoard(){
 const q=(document.querySelector("#tcBoardSearch")?.value||"").trim().toLowerCase();
 const box=document.querySelector("#activeBoardList");
 if(!q){ tcRenderActiveBoardList(_tcActiveBoardVehicles); return; }
 const filtered=_tcActiveBoardVehicles.filter(v=>
  (v.temp_location||"").toLowerCase().includes(q) ||
  (v.location||"").toLowerCase().includes(q) ||
  (v.pincode||"").toLowerCase().includes(q) ||
  (v.business_name||"").toLowerCase().includes(q) ||
  (v.category||"").toLowerCase().includes(q) ||
  (tcBizLabel(v.business_type)||"").toLowerCase().includes(q)
 );
 if(!filtered.length&&_tcActiveBoardVehicles.length&&box){
  const contactLine=[db.platform.phone1?`<a href="tel:${esc(db.platform.phone1)}">&#128222; ${esc(db.platform.phone1)}</a>`:"",db.platform.email?`<a href="mailto:${esc(db.platform.email)}">&#9993; ${esc(db.platform.email)}</a>`:""].filter(Boolean).join(" &nbsp;|&nbsp; ");
  box.innerHTML=`<div class="notice">No Travel Connect partners are registered in "${esc(document.querySelector("#tcBoardSearch").value)}" yet. Here are other currently available vehicles instead - or contact us directly: ${contactLine}</div>`;
  tcRenderActiveBoardList(_tcActiveBoardVehicles,true);
  return;
 }
 tcRenderActiveBoardList(filtered);
}

/* ---------- ADMIN: PENDING APPROVALS (Partners & Vehicles) ---------- */
function tcOpenPendingApprovals(){
 requireAdmin(()=>{
  tcOpenMenuPage("pending",tcRenderPendingApprovals);
 });
}
async function tcRenderPendingApprovals(){
 app().innerHTML=card("Pending Approvals",`
  <h3>Pending Travel Partners</h3><div id="tcPendingPartners">Loading...</div>
  <hr><h3>Pending Vehicles</h3><div id="tcPendingVehicles">Loading...</div>`);
 tcLoadPendingPartners();
 tcLoadPendingVehicles();
}
async function tcLoadPendingPartners(){
 const box=document.querySelector("#tcPendingPartners");
 if(!box) return;
 try{
  const res=await fetch("/api/partners?action=pending&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
  if(!data.partners.length){ box.innerHTML="<p class='muted'>No pending partner registrations.</p>"; return; }
  box.innerHTML=data.partners.map(p=>`<div class="listitem">
   <b>${esc(p.business_name)}</b> <span class="muted">${esc(tcBizLabel(p.business_type))}${p.business_subtype?" - "+esc(p.business_subtype):""}</span><br>
   <span class="muted">${esc(p.owner_name)} - ${esc(p.mobile1)}${p.location?" - "+esc(p.location):""}</span>
   ${p.description?`<div style="font-size:12px;margin-top:2px">${esc(p.description)}</div>`:""}
   <div class="actions" style="margin-top:6px"><button class="primary" onclick="tcApprovePartner(${p.id})">Approve</button><button class="danger" onclick="tcDeletePartner(${p.id})">Delete</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function tcApprovePartner(id){
 try{
  const res=await fetch("/api/partners?action=verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"verify",partner_id:id,verified:true,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not approve - try again."); return; }
  toast("Partner approved"); tcLoadPendingPartners();
 }catch(e){ toast("Network error"); }
}
async function tcDeletePartner(id){
 if(!confirm("Delete this partner registration? This also removes any vehicles they've added.")) return;
 try{
  const res=await fetch("/api/partners?action=delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"delete",partner_id:id,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not delete - "+(data.error||"try again.")); return; }
  toast("Partner deleted"); tcLoadPendingPartners();
 }catch(e){ toast("Network error"); }
}
async function tcLoadPendingVehicles(){
 const box=document.querySelector("#tcPendingVehicles");
 if(!box) return;
 try{
  const res=await fetch("/api/vehicles?action=pending&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
  if(!data.vehicles.length){ box.innerHTML="<p class='muted'>No pending vehicle registrations.</p>"; return; }
  box.innerHTML=data.vehicles.map(v=>`<div class="listitem">
   <b>${esc(v.vehicle_number)}</b> ${esc(v.category||"")} <span class="muted">- ${esc(v.business_name||"")}</span>
   <div class="actions" style="margin-top:4px;flex-wrap:wrap">
    ${["front_photo","rc_photo","insurance_photo","permit_photo","fitness_photo","puc_photo"].filter(f=>v[f+"_key"]).map(f=>`<button onclick="tcViewDoc('${esc(v[f+"_key"])}','${f.replace("_photo","").toUpperCase()}')">${f.replace("_photo","").toUpperCase()}</button>`).join("")}
   </div>
   <div class="actions" style="margin-top:6px"><button class="primary" onclick="tcApproveVehicle(${v.id})">Approve</button><button class="danger" onclick="tcDeleteVehicle(${v.id})">Delete</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
/* Shows a document photo inside an in-app modal instead of an <a
   target="_blank"> link - opening a new browser tab took the admin fully
   out of the PWA to view it, with no easy way back into the app once
   they were done looking. */
function tcViewDoc(key,label){
 modal(`<h2>${esc(label)}</h2><div style="text-align:center"><img src="/api/vehicles?action=file&key=${encodeURIComponent(key)}&token=${encodeURIComponent(adminToken())}" style="max-width:100%;border-radius:8px"></div>`);
}
async function tcApproveVehicle(id){
 try{
  const res=await fetch("/api/vehicles?action=verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:id,verified:true,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not approve - try again."); return; }
  toast("Vehicle approved"); tcLoadPendingVehicles();
 }catch(e){ toast("Network error"); }
}
async function tcDeleteVehicle(id){
 if(!confirm("Delete this vehicle?")) return;
 try{
  await fetch("/api/vehicles?action=delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:id,token:adminToken()})});
  toast("Vehicle deleted"); tcLoadPendingVehicles();
 }catch(e){ toast("Network error"); }
}

/* ---------- ADMIN: ALL VEHICLES (verified or not, look up documents) ---------- */
function tcOpenAllVehiclesAdmin(){
 requireAdmin(()=>{ tcOpenMenuPage("allvehicles",tcRenderAllVehiclesAdmin); });
}
async function tcRenderAllVehiclesAdmin(){
 app().innerHTML=card("All Vehicles",`<label>Search by number, category or business<input id="tcAllVehSearch" oninput="tcFilterAllVehicles()"></label><div id="tcAllVehList">Loading...</div>`);
 try{
  const res=await fetch("/api/vehicles?action=all&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  window._tcAllVehicles=(data.ok&&data.vehicles)?data.vehicles:[];
  tcRenderAllVehiclesList(window._tcAllVehicles);
 }catch(e){document.querySelector("#tcAllVehList").innerHTML="<p class='danger'>Network error.</p>"}
}
function tcRenderAllVehiclesList(list){
 const box=document.querySelector("#tcAllVehList");
 if(!box) return;
 box.innerHTML=list.map(v=>`<div class="listitem">
  <b>${esc(v.vehicle_number)}</b> ${esc(v.category||"")} ${v.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>'}<br>
  <span class="muted">${esc(v.business_name||"")}</span>
  <div class="actions" style="margin-top:4px;flex-wrap:wrap">
   ${["front_photo","rc_photo","insurance_photo","permit_photo","fitness_photo","puc_photo"].filter(f=>v[f+"_key"]).map(f=>`<button onclick="tcViewDoc('${esc(v[f+"_key"])}','${f.replace("_photo","").toUpperCase()}')">${f.replace("_photo","").toUpperCase()}</button>`).join("")}
  </div>
  <div class="actions" style="margin-top:6px">${v.verified?`<button class="danger" onclick="tcUnverifyVehicle(${v.id})">Un-verify</button>`:`<button class="primary" onclick="tcApproveVehicle(${v.id})">Approve</button>`}<button class="danger" onclick="tcDeleteVehicle(${v.id})">Delete</button></div>
 </div>`).join("")||"<p class='muted'>No vehicles found.</p>";
}
function tcFilterAllVehicles(){
 const q=(document.querySelector("#tcAllVehSearch").value||"").toLowerCase();
 tcRenderAllVehiclesList((window._tcAllVehicles||[]).filter(v=>[v.vehicle_number,v.category,v.business_name].filter(Boolean).join(" ").toLowerCase().includes(q)));
}
async function tcUnverifyVehicle(id){
 if(!confirm("Remove verification from this vehicle?")) return;
 try{
  await fetch("/api/vehicles?action=verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:id,verified:false,token:adminToken()})});
  toast("Vehicle un-verified"); tcRenderAllVehiclesAdmin();
 }catch(e){ toast("Network error"); }
}

/* ---------- ADMIN: ALL TRAVEL PARTNERS (find+correct any partner) ---------- */
function tcOpenAllPartnersAdmin(){
 requireAdmin(()=>{ tcOpenMenuPage("allpartners",tcRenderAllPartnersAdmin); });
}
async function tcRenderAllPartnersAdmin(){
 app().innerHTML=card("All Travel Partners",`<label>Search by name, owner, mobile or location<input id="tcAllPartSearch" oninput="tcFilterAllPartners()"></label><div id="tcAllPartList">Loading...</div>`);
 try{
  const res=await fetch("/api/partners?action=all&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  window._tcAllPartners=(data.ok&&data.partners)?data.partners:[];
  tcRenderAllPartnersList(window._tcAllPartners);
 }catch(e){document.querySelector("#tcAllPartList").innerHTML="<p class='danger'>Network error.</p>"}
}
function tcRenderAllPartnersList(list){
 const box=document.querySelector("#tcAllPartList");
 if(!box) return;
 box.innerHTML=list.map(p=>`<div class="listitem">
  <b>${esc(p.business_name)}</b> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>'} <span class="muted">${esc(tcBizLabel(p.business_type))}${p.business_subtype?" - "+esc(p.business_subtype):""}</span><br>
  <span class="muted">${esc(p.owner_name)} - ${esc(p.mobile1)}${p.location?" - "+esc(p.location):""}</span>
  <div class="actions" style="margin-top:6px"><button onclick="tcOpenAdminEditPartner(${p.id})">Edit</button><button class="danger" onclick="tcDeletePartner(${p.id})">Delete</button></div>
 </div>`).join("")||"<p class='muted'>No partners found.</p>";
}
function tcFilterAllPartners(){
 const q=(document.querySelector("#tcAllPartSearch").value||"").toLowerCase();
 tcRenderAllPartnersList((window._tcAllPartners||[]).filter(p=>[p.business_name,p.owner_name,p.mobile1,p.location].filter(Boolean).join(" ").toLowerCase().includes(q)));
}
function tcOpenAdminEditPartner(id){
 const p=(window._tcAllPartners||[]).find(x=>x.id===id);
 if(!p) return;
 modal(`<h2>Edit Partner (Admin)</h2>
  <div class="grid">
   <label>Business type<div>${tcBizTypeFieldHtml("aeBizType","aeBizTypeOther",p.business_type,"aeSkillType",p.business_subtype)}</div></label>
   <label>Business name<input id="aeBizName" value="${esc(p.business_name)}"></label>
   <label>Owner name<input id="aeOwnerName" value="${esc(p.owner_name)}"></label>
   <label>Mobile 1<input id="aeMobile1" value="${esc(p.mobile1)}"></label>
   <label>Mobile 2<input id="aeMobile2" value="${esc(p.mobile2||"")}"></label>
   <label>Location<input id="aeLocation" value="${esc(p.location||"")}"></label>
   <label>Pincode<input id="aePincode" value="${esc(p.pincode||"")}"></label>
  </div>
  <div class="actions"><button class="primary" onclick="tcSaveAdminEditPartner(${id})">Save</button></div>`);
}
async function tcSaveAdminEditPartner(id){
 const body={action:"admin_update",partner_id:id,token:adminToken(),
  business_type:tcResolveBizType("aeBizType","aeBizTypeOther"),
  business_subtype:document.querySelector("#aeSkillType").value.trim(),
  business_name:document.querySelector("#aeBizName").value,
  owner_name:document.querySelector("#aeOwnerName").value,
  mobile1:document.querySelector("#aeMobile1").value,
  mobile2:document.querySelector("#aeMobile2").value,
  location:document.querySelector("#aeLocation").value,
  pincode:document.querySelector("#aePincode").value};
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!data.ok){ toast("Could not save - try again."); return; }
  toast("Partner updated"); closeModal(); tcRenderAllPartnersAdmin();
 }catch(e){ toast("Network error"); }
}

/* ---------- ADMIN: PARTNER PLANS (Free / Paid / Premium / Owner Free) ---------- */
function tcOpenPartnerPlans(){
 requireAdmin(()=>{ tcOpenMenuPage("plans",tcRenderPartnerPlans); });
}
async function tcRenderPartnerPlans(){
 app().innerHTML=card("Partner Plans",`<p class="muted">Free = Travel Connect branding shown on their bills/quotations, no own UPI QR. Paid/Premium = their own business branding + own UPI payment QR (Premium also unlocks logo/colour/font customization). Owner Free = your own account/staff - always free, full features.</p><div id="tcPlansList">Loading...</div>`);
 tcLoadPartnerPlans();
}
async function tcLoadPartnerPlans(){
 const box=document.querySelector("#tcPlansList");
 if(!box) return;
 try{
  const res=await fetch("/api/partner_plan?action=list&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load partners.</p>"; return; }
  if(!data.partners.length){ box.innerHTML="<p class='muted'>No partners registered yet.</p>"; return; }
  box.innerHTML=data.partners.map(p=>`<div class="listitem">
   <b>${esc(p.business_name)}</b> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>'} <span class="muted">${esc(tcBizLabel(p.business_type))}${p.business_subtype?" - "+esc(p.business_subtype):""}</span><br>
   <span class="muted">${esc(p.owner_name)} - ${esc(p.mobile1)}${p.location?" - "+esc(p.location):""}</span>
   <div class="actions" style="margin-top:6px">
    <select id="plan_${p.id}">
     <option value="free" ${(!p.plan||p.plan==="free")?"selected":""}>Free</option>
     <option value="paid" ${p.plan==="paid"?"selected":""}>Paid</option>
     <option value="premium" ${p.plan==="premium"?"selected":""}>Premium</option>
     <option value="owner_free" ${p.plan==="owner_free"?"selected":""}>Owner Free</option>
    </select>
    <button class="primary" onclick="tcSetPartnerPlan(${p.id})">Save</button>
   </div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function tcSetPartnerPlan(id){
 const plan=document.querySelector("#plan_"+id).value;
 try{
  const res=await fetch("/api/partner_plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"set_plan",partner_id:id,plan,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not save - try again."); return; }
  toast("Plan updated"); tcLoadPartnerPlans();
 }catch(e){ toast("Network error"); }
}

/* ---------- OWNER PREVIEW SHORTCUTS ---------- */
function tcPreviewPartnerPage(){ tcOpenMenuPage("previewpartner",partnerView); }
function tcPreviewCustomerPage(){ tcOpenMenuPage("previewcustomer",customerHome); }

/* ---------- CALL LOGGING (precise location + caller ID) ----------
   A plain tel: link opens the phone's own dialer with no way for the app
   to attach anything to the call itself - phone calls are OS-level, not
   something a web app can see inside. This works around that: right
   before dialing, it captures the caller's current GPS (best-effort - if
   permission is denied or unavailable, the call still goes through, just
   without a location attached) and saves a small log entry via a new
   /api/calls endpoint FIRST, then opens the dialer. Both sides can then
   see that log afterward: the partner's own page shows "who called me,
   when, from where" (see tcRenderRecentContacts below), and the customer
   side (customer-safety.js) shows their own "calls I made" history -
   giving each side a caller-ID-like record the phone call itself can't
   provide, and a location fix as accurate as the caller's GPS allows
   (typically a few metres to a few tens of metres outdoors, less precise
   indoors - real GPS accuracy varies and can't be guaranteed to an exact
   figure). Requires the small calls.js backend addition. */
async function tcCallWithLog(mobile,targetType,targetId,targetLabel){
 const user=getCurrentUser();
 let lat=null,lon=null;
 const loc=await tcGetLocation(true);
 if(loc.lat!==undefined){ lat=loc.lat; lon=loc.lon; }
 try{
  await fetch("/api/calls",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   caller_name:user?.name||"",caller_mobile:user?.mobile||"",callee_mobile:mobile,
   target_type:targetType,target_id:targetId,target_label:targetLabel,lat,lon
  })});
 }catch(e){}
 location.href="tel:"+mobile;
}
function tcCallButtonHtml(mobile,targetType,targetId,targetLabel,primary){
 if(!mobile) return "";
 return `<button ${primary?'class="primary"':""} onclick="tcCallWithLog('${esc(mobile)}','${targetType}',${targetId||"null"},'${esc((targetLabel||"").replace(/'/g,"\\'"))}')">&#128222; Call ${esc(mobile)}</button>`;
}

/* ---------- IN-APP MESSAGES ----------
   Short text messages between a customer and a business, inside the app.
   A customer taps "Message" on a business in the Local Directory / Active
   Vehicles Board; the business sees it under Messages (with a count on
   the button) and can reply. Only works while the app is open - the
   count refreshes every 30 seconds, and a new message shows a short
   notice. Backend: functions/api/messages.js. */
let _tcMsgUnread=0, _tcMsgPollTimer=null, _tcMsgFirstPoll=true, _tcMsgUser="";
window._tcMsgItems=[];
/* The old small Messages button is gone - Messages is now a large card at
   the very top of the Dashboard, the customer home and the partner page
   (tcMessagesCardHtml below). This stub stays only so any page still
   calling it simply shows nothing there. */
function tcMessagesButtonHtml(){ return ""; }
function tcMessagesCardHtml(){
 const n=_tcMsgUnread;
 const user=getCurrentUser();
 const sub=(user&&user.role==="customer")?tcT("msg_card_sub_customer"):tcT("msg_card_sub_owner");
 return `<div id="tcMsgCard" onclick="tcOpenMessages()" style="cursor:pointer;display:flex;align-items:center;gap:14px;padding:16px;margin:2px 0 14px;border-radius:18px;color:#fff;background:linear-gradient(135deg,#0a5f6c 0%,#0f8a8f 55%,#1fb0a6 100%);box-shadow:0 8px 18px rgba(11,107,120,.38)">
  <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:25px;flex-shrink:0">&#9993;</div>
  <div style="flex:1;min-width:0">
   <div style="font-weight:800;font-size:18px;letter-spacing:.3px">${tcT("msg_card_title")}</div>
   <div class="tcMsgSub" style="font-size:12.5px;opacity:.95">${n>0?tcMsgCountText(n):esc(sub)}</div>
  </div>
  <span class="tcMsgPill" style="${n>0?"":"display:none;"}min-width:28px;height:28px;padding:0 8px;box-sizing:border-box;border-radius:14px;background:#e74c3c;color:#fff;font-weight:900;font-size:14px;display:${n>0?"inline-flex":"none"};align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(255,255,255,.55)">${n>0?n:""}</span>
  <div style="font-size:26px;opacity:.9;line-height:1">&rsaquo;</div>
 </div>`;
}
/* Puts the Messages card at the top of the taxi owner's Dashboard (its page
   is drawn by business.js; this adds the card right under the title once
   that page is on screen). */
function tcInjectDashboardMsgCard(){
 if(document.querySelector("#tcMsgCard")) return;
 const h2=document.querySelector("#app h2");
 if(!h2||h2.textContent.trim()!=="Travel Connect Dashboard") return;
 h2.insertAdjacentHTML("afterend",tcMessagesCardHtml());
}
function tcPaintMsgBadge(){
 const n=_tcMsgUnread;
 document.querySelectorAll(".tcMsgPill").forEach(el=>{ el.textContent=n>0?String(n):""; el.style.display=n>0?"inline-flex":"none"; });
 document.querySelectorAll(".tcMsgSub").forEach(el=>{
  const user=getCurrentUser();
  const sub=(user&&user.role==="customer")?tcT("msg_card_sub_customer"):tcT("msg_card_sub_owner");
  el.textContent=n>0?tcMsgCountText(n):sub;
 });
 /* The number on the app icon, on phones/launchers that support it. */
 try{
  if(navigator.setAppBadge){ if(n>0) navigator.setAppBadge(n); else navigator.clearAppBadge&&navigator.clearAppBadge(); }
 }catch(e){}
}
/* A short two-note chime + vibration when a new message arrives while the
   app is open (a phone only lets a web page play sound after the person has
   touched the screen once, which they always have by then). When the app is
   closed the phone's own notification sound is used instead. */
function tcPlayMsgTone(){
 try{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const note=(freq,start,dur)=>{
   const osc=ctx.createOscillator(), gain=ctx.createGain();
   osc.type="sine"; osc.frequency.value=freq;
   gain.gain.setValueAtTime(0.0001,ctx.currentTime+start);
   gain.gain.exponentialRampToValueAtTime(0.35,ctx.currentTime+start+0.02);
   gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+start+dur);
   osc.connect(gain); gain.connect(ctx.destination);
   osc.start(ctx.currentTime+start); osc.stop(ctx.currentTime+start+dur+0.05);
  };
  note(880,0,0.28); note(1174.7,0.18,0.45);
 }catch(e){}
 try{ if(navigator.vibrate) navigator.vibrate([120,70,160]); }catch(e){}
}
async function tcFetchMsgUnread(){
 const user=getCurrentUser();
 if(!user) return;
 if(_tcMsgUser!==user.mobile){ _tcMsgUser=user.mobile; _tcMsgUnread=0; _tcMsgFirstPoll=true; }
 try{
  const res=await fetch("/api/messages?action=unread&mobile="+encodeURIComponent(user.mobile));
  const data=await res.json();
  if(!data.ok) return;
  const total=(data.partner_unread||0)+(data.customer_unread||0);
  if(!_tcMsgFirstPoll&&total>_tcMsgUnread){ toast("New message received"); tcPlayMsgTone(); }
  _tcMsgFirstPoll=false;
  _tcMsgUnread=total;
  tcPaintMsgBadge();
 }catch(e){}
}
async function tcRefreshMsgUnread(){
 await tcFetchMsgUnread();
 const modalHidden=document.querySelector("#modal")?.classList.contains("hidden");
 if(!modalHidden&&window._tcOpenThread&&document.querySelector("#msgThread")) tcLoadThread(true);
 else if(modalHidden&&document.querySelector("#tcMsgInbox")) tcLoadInbox();
}
function tcStartMsgPolling(){
 if(_tcMsgPollTimer) return;
 tcFetchMsgUnread();
 _tcMsgPollTimer=setInterval(tcRefreshMsgUnread,30000);
 /* A push reaching the phone while the app is on screen, or a tap on a
    message notification, is passed to the page by the service worker. */
 try{
  navigator.serviceWorker&&navigator.serviceWorker.addEventListener("message",e=>{
   const m=e.data||{};
   if(m.tcMsgPush) tcRefreshMsgUnread();
   if(m.tcOpen==="messages") tcOpenMessages();
  });
 }catch(e){}
 document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") tcRefreshMsgUnread(); });
 if(typeof tcSyncPushSubscription==="function") tcSyncPushSubscription();
}
/* Removes message notifications from the phone's notification shade once
   the person has opened Messages - they have now seen them. */
function tcCloseMsgNotifications(){
 try{
  navigator.serviceWorker&&navigator.serviceWorker.getRegistration().then(reg=>{
   if(!reg||!reg.getNotifications) return;
   reg.getNotifications().then(list=>list.forEach(n=>{ if((n.tag||"").indexOf("tc-msg")===0) n.close(); }));
  });
 }catch(e){}
}
/* "Message" button on a business in the directory / active board. Hidden
   for the person's own business (you cannot message yourself). */
function tcMessageButtonHtml(partnerId,name,mobile1,mobile2){
 const user=getCurrentUser();
 if(!partnerId||!user) return "";
 if(user.mobile&&(user.mobile===mobile1||user.mobile===mobile2)) return "";
 return `<button data-name="${esc(name||"")}" onclick="tcOpenMessageToPartner(${partnerId},this.dataset.name)">&#9993; Message</button>`;
}
function tcOpenMessageToPartner(partnerId,name){
 const user=getCurrentUser();
 if(!user) return;
 tcOpenThread(partnerId,user.mobile,"customer",name||"Business","");
}
function tcOpenThread(partnerId,customerMobile,viewer,title,callMobile){
 window._tcOpenThread={partnerId,customerMobile,viewer,title};
 window._tcMsgLoc=null;
 modal(`<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
   <h2 style="margin:0">${esc(title)}</h2>
   <button onclick="tcConfirmHideChat()" title="Removes this chat from your phone only - the other person keeps theirs" style="background:none;color:#6a7a87;box-shadow:none;padding:4px 6px;font-size:11.5px;line-height:1.3;text-align:right">&#128465; ${tcT("delete_for_me")}</button>
  </div>
  ${callMobile?`<div style="margin-bottom:6px"><a href="tel:${esc(callMobile)}">&#128222; ${tcT("call_label")} ${esc(callMobile)}</a></div>`:""}
  <div id="msgThread" style="max-height:45vh;overflow:auto;background:#f5f8fa;border-radius:10px;padding:8px;margin-bottom:8px"><p class="muted">${tcT("loading")}</p></div>
  <textarea id="msgText" rows="2" maxlength="500" placeholder="${tcT("msg_type_placeholder")}" style="width:100%;box-sizing:border-box"></textarea>
  ${viewer==="customer"?`<label style="flex-direction:row;align-items:center;gap:6px;font-weight:600;margin-top:6px"><input type="checkbox" id="msgShareLoc" onchange="tcPrepareMsgLocation(this)"> ${tcT("msg_share_location")}</label><div id="msgLocStatus" style="font-size:12px;margin-top:2px"></div>`:""}
  <div class="actions"><button class="primary" id="msgSendBtn" onclick="tcSendMessage()">${tcT("send_label")}</button></div>
  <div id="msgErr" class="danger"></div>
  <div id="msgPushHint"></div>`);
 tcCloseMsgNotifications();
 tcPaintMsgPushHint();
 tcLoadThread(false);
}
async function tcLoadThread(silent){
 const t=window._tcOpenThread;
 const user=getCurrentUser();
 if(!t||!user) return;
 try{
  const res=await fetch("/api/messages?action=thread&partner_id="+t.partnerId+"&customer_mobile="+encodeURIComponent(t.customerMobile)+"&mobile="+encodeURIComponent(user.mobile)+"&viewer="+t.viewer);
  const data=await res.json();
  const box=document.querySelector("#msgThread");
  if(!box) return;
  if(!data.ok){ if(!silent) box.innerHTML="<p class='danger'>Could not load messages.</p>"; return; }
  if(!data.messages.length){ box.innerHTML="<p class='muted'>No messages yet. Write the first one below.</p>"; return; }
  const nearBottom=(box.scrollHeight-box.scrollTop-box.clientHeight)<40;
  box.innerHTML=data.messages.map(m=>{
   const mine=(t.viewer==="customer")?m.from_customer===1:m.from_customer===0;
   const map=(m.lat!=null&&m.lon!=null)?`<div><a href="https://maps.google.com/?q=${m.lat},${m.lon}" target="_blank">&#128205; View location</a></div>`:"";
   return `<div style="display:flex;justify-content:${mine?"flex-end":"flex-start"};margin:4px 0"><div style="max-width:82%;background:${mine?"#d9f2e6":"#fff"};border:1px solid #dce4ea;border-radius:12px;padding:8px 10px"><div style="white-space:pre-wrap;word-break:break-word">${esc(m.body)}</div>${map}<div class="muted" style="font-size:11px;text-align:right">${esc(tcFormatDateTime(m.created_at))}</div></div></div>`;
  }).join("");
  if(!silent||nearBottom) box.scrollTop=box.scrollHeight;
  tcFetchMsgUnread();
 }catch(e){}
}
/* Reminder inside the chat: without notifications turned on, a reply (or a
   new customer message) is only noticed when the app happens to be open. */
function tcPaintMsgPushHint(){
 const box=document.querySelector("#msgPushHint");
 if(!box) return;
 const supported=("serviceWorker" in navigator)&&("PushManager" in window)&&("Notification" in window);
 const on=supported&&Notification.permission==="granted"&&localStorage.getItem("tc_push_confirmed")==="1";
 if(!supported||on||Notification.permission==="denied"){ box.innerHTML=""; return; }
 box.innerHTML=`<div style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#fff8e8;border:1px solid #e2c27a;font-size:12.5px;color:#7a5a1e">&#128276; <b>Turn on notifications</b> so you know the moment a reply arrives - even when the app is closed.<div class="actions" style="margin-top:6px"><button class="primary" onclick="enablePushNotifications()">Turn on notifications</button></div></div>`;
}
/* Ticking "Share my current location" fetches it straight away (so the
   phone's permission prompt appears right then) and says clearly whether
   it worked - instead of only finding out after Send. */
async function tcPrepareMsgLocation(cb){
 const status=document.querySelector("#msgLocStatus");
 window._tcMsgLoc=null;
 if(!cb.checked){ if(status) status.textContent=""; return; }
 if(status){ status.style.color=""; status.textContent="Getting your location..."; }
 const loc=await tcGetLocation(false);
 if(!cb.checked) return;
 if(loc.lat!==undefined){
  window._tcMsgLoc=loc;
  if(status){ status.style.color="#177044"; status.textContent="Location ready - it will be sent with your message."; }
 }else if(status){
  status.style.color="#a12d2d";
  status.textContent=tcLocationErrorText(loc.error);
 }
}
/* "Delete chat" only removes it from THIS person's own list - see
   messages.js's action=hide for why (a call/message can matter as proof
   later, e.g. "I never contacted this driver"), and it comes straight
   back if the other side writes again. */
function tcConfirmHideChat(){
 modal(`<h2>Delete for me only?</h2><p style="font-weight:700;color:#a12d2d">This removes the chat from YOUR phone only.</p><p class="muted">The other person's copy is not affected - they will still see everything you sent, and it stays in Travel Connect's records too. If they write again, this chat comes back here.</p><div class="actions"><button onclick="tcReopenThread()">Cancel</button><button class="danger" onclick="tcHideChat()">Yes, delete for me only</button></div>`);
}
function tcReopenThread(){
 const t=window._tcOpenThread;
 if(!t) return;
 tcOpenThread(t.partnerId,t.customerMobile,t.viewer,t.title,"");
}
async function tcHideChat(){
 const t=window._tcOpenThread;
 const user=getCurrentUser();
 if(!t||!user) return;
 try{
  await fetch("/api/messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"hide",partner_id:t.partnerId,customer_mobile:t.customerMobile,viewer:t.viewer,mobile:user.mobile})});
 }catch(e){}
 closeModal();
 toast("Chat deleted");
 if(document.querySelector("#tcMsgInbox")) tcLoadInbox();
 tcFetchMsgUnread();
}
async function tcSendMessage(){
 const t=window._tcOpenThread;
 const user=getCurrentUser();
 if(!t||!user) return;
 const input=document.querySelector("#msgText"), errBox=document.querySelector("#msgErr"), btn=document.querySelector("#msgSendBtn");
 const body=input.value.trim();
 if(!body){ errBox.textContent="Type a message first."; return; }
 btn.disabled=true; btn.textContent="Sending...";
 errBox.textContent="";
 let lat=null,lon=null,locNote="";
 if(t.viewer==="customer"&&document.querySelector("#msgShareLoc")?.checked){
  let loc=window._tcMsgLoc;
  if(!loc) loc=await tcGetLocation(false);
  if(loc&&loc.lat!==undefined){ lat=loc.lat; lon=loc.lon; }
  else locNote="Message sent without your location. "+tcLocationErrorText(loc&&loc.error);
 }
 try{
  const res=await fetch("/api/messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   action:"send",partner_id:t.partnerId,customer_mobile:t.customerMobile,
   customer_name:t.viewer==="customer"?user.name:"",from_customer:t.viewer==="customer"?1:0,
   sender_mobile:user.mobile,body,lat,lon})});
  const data=await res.json();
  if(!data.ok){
   const msgs={unauthorized:"You cannot send this message.",cannot_message_self:"You cannot message your own business.",too_many:"Too many messages - please wait a little.",no_conversation:"You can reply only after the customer has written first.",not_available:"This business is not available for messages right now.",too_long:"Message is too long (500 characters at most)."};
   errBox.textContent=msgs[data.error]||"Could not send. Please try again.";
  }else{
   input.value="";
   const cb=document.querySelector("#msgShareLoc"); if(cb) cb.checked=false;
   window._tcMsgLoc=null; const ls=document.querySelector("#msgLocStatus"); if(ls) ls.textContent="";
   errBox.textContent=locNote;
   await tcLoadThread(false);
  }
 }catch(e){ errBox.textContent="Network error - check your connection and try again."; }
 btn.disabled=false; btn.textContent="Send";
}
/* Messages page: conversations where customers wrote to MY business
   (I can reply) and conversations I started with other businesses. */
function tcOpenMessages(){
 if(!history.state||!history.state.tcPage){
  history.pushState({tcPage:true,fromMenu:false},"",location.pathname+location.search+"#messages");
 }else{
  history.replaceState({tcPage:true,fromMenu:false},"",location.pathname+location.search+"#messages");
 }
 tcCurrentIsFromMenu=false;
 tcMenuNavPending=false;
 tcRenderMessages();
}
function tcRenderMessages(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("&#9993; "+tcT("msg_card_title"),`<div id="pushPermNote"></div><p class="muted">${tcT("msg_page_hint")}</p><div id="tcMsgInbox">${tcT("loading")}</div>`);
 tcCloseMsgNotifications();
 if(typeof updatePushNoteUI==="function") updatePushNoteUI();
 tcLoadInbox();
}
async function tcLoadInbox(){
 const user=getCurrentUser();
 const box=document.querySelector("#tcMsgInbox");
 if(!user||!box) return;
 try{
  const res=await fetch("/api/messages?action=inbox&mobile="+encodeURIComponent(user.mobile));
  const data=await res.json();
  const target=document.querySelector("#tcMsgInbox");
  if(!target) return;
  if(!data.ok){ target.innerHTML="<p class='danger'>Could not load messages.</p>"; return; }
  window._tcMsgItems=[];
  const row=(g,viewer)=>{
   const idx=window._tcMsgItems.length;
   const title=viewer==="partner"?((g.customer_name||"Customer")+" - "+g.customer_mobile):g.business_name;
   window._tcMsgItems.push({partnerId:g.partner_id,customerMobile:viewer==="partner"?g.customer_mobile:user.mobile,viewer,title,callMobile:viewer==="partner"?g.customer_mobile:""});
   const mine=(viewer==="partner")?g.last_from_customer===0:g.last_from_customer===1;
   const preview=(g.last_body||"").length>70?g.last_body.slice(0,70)+"...":(g.last_body||"");
   const initial=(String(title).trim()[0]||"?").toUpperCase();
   return `<div onclick="tcOpenThreadByIndex(${idx})" style="cursor:pointer;display:flex;gap:12px;align-items:center;padding:12px;margin:8px 0;border:1px solid #dce4ea;border-radius:14px;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.06)">
    <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0b6b78,#1fb0a6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex-shrink:0">${esc(initial)}</div>
    <div style="flex:1;min-width:0">
     <div style="display:flex;justify-content:space-between;gap:8px"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(title)}</b><span class="muted" style="font-size:11px;flex-shrink:0">${esc(tcFormatDateTime(g.last_at))}</span></div>
     ${viewer==="partner"?`<div class="muted" style="font-size:11px">For your business: ${esc(g.business_name)}</div>`:""}
     <div class="muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${mine?"You: ":""}${esc(preview)}</div>
    </div>
    ${g.unread>0?`<span style="min-width:24px;height:24px;padding:0 7px;box-sizing:border-box;border-radius:12px;background:#e74c3c;color:#fff;font-weight:900;font-size:12.5px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0">${g.unread}</span>`:""}
   </div>`;
  };
  const ap=data.as_partner||[], ac=data.as_customer||[];
  let html="";
  if(ap.length) html+=`<h3>Customers who wrote to my business</h3>${ap.map(g=>row(g,"partner")).join("")}`;
  if(ac.length) html+=`<h3>My conversations with businesses</h3>${ac.map(g=>row(g,"customer")).join("")}`;
  target.innerHTML=html||"<p class='muted'>No messages yet.</p>";
 }catch(e){ const b=document.querySelector("#tcMsgInbox"); if(b) b.innerHTML="<p class='danger'>Network error.</p>"; }
}
function tcOpenThreadByIndex(i){
 const t=window._tcMsgItems[i];
 if(!t) return;
 tcOpenThread(t.partnerId,t.customerMobile,t.viewer,t.title,t.callMobile);
}

/* WhatsApp contact - opens a chat with the partner with a ready-written
   message ("need a vehicle urgently") that already includes the person's
   own name, mobile and, if they allow location, a Google Maps link to
   exactly where they are - so the partner can act without asking. Logged
   the same way as a call (as "whatsapp_<type>") so it also appears in the
   partner's Recent Contacts and the customer's own history. The person can
   still edit the text in WhatsApp before sending. */
function tcWaNumber(mobile){
 let d=String(mobile||"").replace(/\D/g,"");
 if(d.length===10) d="91"+d;
 else if(d.length===11&&d[0]==="0") d="91"+d.slice(1);
 return d;
}
async function tcWhatsAppWithLog(mobile,targetType,targetId,targetLabel){
 const user=getCurrentUser();
 let lat=null,lon=null;
 const loc=await tcGetLocation(true);
 if(loc.lat!==undefined){ lat=loc.lat; lon=loc.lon; }
 try{
  await fetch("/api/calls",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   caller_name:user?.name||"",caller_mobile:user?.mobile||"",callee_mobile:mobile,
   target_type:"whatsapp_"+targetType,target_id:targetId,target_label:targetLabel,lat,lon
  })});
 }catch(e){}
 const locLine=(lat!=null&&lon!=null)?"\nMy location: https://maps.google.com/?q="+lat+","+lon:"";
 const text="Hello, I found you on Travel Connect. I need a vehicle urgently."+locLine+"\nName: "+(user?.name||"")+"\nMobile: "+(user?.mobile||"");
 location.href="https://wa.me/"+tcWaNumber(mobile)+"?text="+encodeURIComponent(text);
}
function tcWhatsAppButtonHtml(mobile,targetType,targetId,targetLabel){
 if(!mobile) return "";
 return `<button style="background:#25a244;color:#fff" onclick="tcWhatsAppWithLog('${esc(mobile)}','${targetType}',${targetId||"null"},'${esc((targetLabel||"").replace(/'/g,"\\'"))}')">WhatsApp: need a vehicle now</button>`;
}

/* ---------- PARTNER: RECENT CONTACTS (who called me, from where) ---------- */
async function tcRenderRecentContacts(partnerId){
 const box=document.querySelector("#tcRecentContacts");
 if(!box) return;
 try{
  const res=await fetch("/api/calls?action=received&partner_id="+partnerId);
  const data=await res.json();
  if(!data.ok||!data.calls||!data.calls.length){ box.innerHTML="<p class='muted'>No calls logged through the app yet.</p>"; return; }
  box.innerHTML=data.calls.map(c=>{
   const when=tcFormatDateTime(c.created_at);
   const mapLink=(c.lat!=null&&c.lon!=null)?`<a href="https://maps.google.com/?q=${c.lat},${c.lon}" target="_blank">&#128205; View their location (accurate to their phone's GPS)</a>`:"";
   return `<div class="listitem"><b>${esc(c.caller_name||"A customer")}</b> - <a href="tel:${esc(c.caller_mobile)}">${esc(c.caller_mobile)}</a><br>
   <span class="muted">${(c.target_type||"").indexOf("whatsapp")===0?"WhatsApp message":"Called"} via Travel Connect &bull; ${esc(when)}</span>
   ${mapLink?`<div style="margin-top:4px">${mapLink}</div>`:`<div class="muted" style="margin-top:2px">Location not shared for this call.</div>`}
   </div>`;
  }).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Could not load recent contacts.</p>"; }
}

/* ---------- ADMIN: ALL USERS (every logged-in mobile - owners & customers) ---------- */
function tcOpenAllUsersAdmin(){
 requireAdmin(()=>{ tcOpenMenuPage("allusers",tcRenderAllUsersAdmin); });
}
async function tcRenderAllUsersAdmin(){
 app().innerHTML=card("All Users",`<p class="muted">Every mobile number that has ever logged in - business owners and customers alike. Edit their saved name, block their access, or remove their record entirely.</p><label>Search by name or mobile<input id="tcAllUsersSearch" oninput="tcFilterAllUsers()"></label><div id="tcAllUsersList">Loading...</div>`);
 try{
  const res=await fetch("/api/auth?action=users&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  window._tcAllUsers=(data.ok&&data.users)?data.users:[];
  tcRenderAllUsersList(window._tcAllUsers);
 }catch(e){document.querySelector("#tcAllUsersList").innerHTML="<p class='danger'>Network error.</p>"}
}
function tcRenderAllUsersList(list){
 const box=document.querySelector("#tcAllUsersList");
 if(!box) return;
 box.innerHTML=list.map(u=>`<div class="listitem">
  <b>${esc(u.name||"(no name)")}</b> ${u.blocked?'<span class="danger">Blocked</span>':'<span class="ok">Active</span>'} <span class="muted">${u.role==="owner"?"Business Owner":"Customer"}</span><br>
  <span class="muted">${esc(u.mobile)}${u.location?" - "+esc(u.location):""}</span>
  <div class="actions" style="margin-top:6px">
   <button onclick="tcOpenAdminEditUser('${esc(u.mobile)}')">Edit Name</button>
   <button class="${u.blocked?"primary":"danger"}" onclick="tcToggleUserBlock('${esc(u.mobile)}',${!u.blocked})">${u.blocked?"Unblock":"Block"}</button>
   <button class="danger" onclick="tcDeleteUserRecord('${esc(u.mobile)}')">Delete</button>
  </div>
 </div>`).join("")||"<p class='muted'>No users found.</p>";
}
function tcFilterAllUsers(){
 const q=(document.querySelector("#tcAllUsersSearch").value||"").toLowerCase();
 tcRenderAllUsersList((window._tcAllUsers||[]).filter(u=>[u.name,u.mobile].filter(Boolean).join(" ").toLowerCase().includes(q)));
}
function tcOpenAdminEditUser(mobile){
 const u=(window._tcAllUsers||[]).find(x=>x.mobile===mobile);
 if(!u) return;
 modal(`<h2>Edit User</h2><div class="grid"><label>Name<input id="aeuName" value="${esc(u.name||"")}"></label></div><div class="actions"><button class="primary" onclick="tcSaveAdminEditUser('${esc(mobile)}')">Save</button></div>`);
}
async function tcSaveAdminEditUser(mobile){
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"admin_update_user",mobile,name:document.querySelector("#aeuName").value,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not save - try again."); return; }
  toast("User updated"); closeModal(); tcRenderAllUsersAdmin();
 }catch(e){ toast("Network error"); }
}
async function tcToggleUserBlock(mobile,blocked){
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:blocked?"block":"unblock",mobile,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not update - try again."); return; }
  toast(blocked?"User blocked":"User unblocked"); tcRenderAllUsersAdmin();
 }catch(e){ toast("Network error"); }
}
async function tcDeleteUserRecord(mobile){
 if(!confirm("Delete this user's record entirely? They can log in again afterward as a new user.")) return;
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"admin_delete_user",mobile,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not delete - try again."); return; }
  toast("User record deleted"); tcRenderAllUsersAdmin();
 }catch(e){ toast("Network error"); }
}
