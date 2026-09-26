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
 return `<div id="${id}_row" data-checked="${checked?"1":"0"}" data-onchange="${esc(onToggleExpr)}" onclick="tcHandleToggleClick('${id}')" style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:12px;margin-top:8px;padding:12px;background:${checked?"#e6f7e9":"#f5f6f7"};border:2px solid ${checked?"#2e9e44":"#c9d4dc"};border-radius:12px">
  <div id="${id}_track" style="width:58px;height:32px;border-radius:32px;background:${checked?"#2e9e44":"#b7c2ca"};position:relative;flex-shrink:0;transition:.2s;box-shadow:inset 0 1px 3px rgba(0,0,0,.15)">
   <div id="${id}_knob" style="position:absolute;top:3px;left:${checked?"29px":"3px"};width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,.35);transition:.2s"></div>
  </div>
  <div>
   <div id="${id}_label" style="font-weight:800;font-size:15px;color:${checked?"#1c6b2c":"#172536"}">${checked?"Active now":(label||"Mark as Active")}</div>
   <div id="${id}_sub" style="font-size:12px;color:#6a7a87;font-weight:600">${checked?"Customers searching nearby will see you as Active":"Turn on so customers can find you right now"}</div>
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
 if(labelEl){ labelEl.textContent=newChecked?"Active now":"Mark as Active"; labelEl.style.color=newChecked?"#1c6b2c":"#172536"; }
 if(subEl) subEl.textContent=newChecked?"Customers searching nearby will see you as Active":"Turn on so customers can find you right now";
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
  <label>Business type<div>${tcBizTypeFieldHtml("pBizType","pBizTypeOther",localStorage.getItem("tc_chosen_business_type"))}</div></label>
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
   <label>Business type<div>${tcBizTypeFieldHtml("peBizType","peBizTypeOther",p.business_type)}</div></label>
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
  await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
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
   <b>${esc(p.business_name)}</b> <span class="muted">${esc(tcBizLabel(p.business_type))}</span> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">(Pending)</span>'}
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
 const confirmedType=partner.business_type||"taxi_travel";
 const wasUnknown=db.settings.myBusinessType==null;
 db.settings.myBusinessType=confirmedType;
 save();
 if(confirmedType==="taxi_travel"&&wasUnknown&&(window._myBusinesses||[]).length<=1){
  dashboard();
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
 const hasMultiple=(window._myBusinesses||[]).length>1;
 let hours={};
 try{ hours=JSON.parse(p.business_hours||"{}"); }catch(e){}
 document.querySelector("#partnerBox").innerHTML=`
 ${hasMultiple?`<div class="actions"><button onclick="tcSwitchBusiness()">&#8646; Switch to another of my businesses</button></div>`:""}
 <div class="card">
  <h3>${esc(p.business_name)} ${p.verified?'<span class="ok">&#9989; Verified</span>':'<span class="muted">(Pending admin verification)</span>'}</h3>
  <div class="muted">${esc(tcBizLabel(p.business_type))}</div>
  <div class="muted">Owner: ${esc(p.owner_name)} - ${esc(p.mobile1)}${p.mobile2?" / "+esc(p.mobile2):""}</div>
  ${p.email?`<div class="muted">${esc(p.email)}</div>`:""}
  ${p.location?`<div class="muted">${esc(p.location)} ${esc(p.pincode||"")}</div>`:""}
  ${p.description?`<div style="margin-top:6px;font-size:13px">${esc(p.description)}</div>`:""}
  ${hours.enabled?`<div class="muted" style="margin-top:4px">&#128337; Business hours: ${esc(hours.open)} - ${esc(hours.close)} (Active status follows these automatically)</div>`:""}
  ${p.verified?tcActiveToggleHtml("partnerAvailToggle",!!p.available,`tcTogglePartnerAvailable(${p.id},checked)`):""}
  <div class="actions" style="margin-top:8px"><button onclick="tcOpenEditPartnerDetails(${p.id})">Edit Details</button></div>
 </div>
 ${isTaxi?`
 <div class="card" id="billingIdentityCard">
  <h3>Billing Details <span class="muted">(the name/phone/UPI shown on YOUR bills)</span></h3>
  <div id="billingIdentityBody"></div>
 </div>
 <div class="actions"><button class="primary" onclick="openAddVehicle(${p.id})">+ Add Vehicle</button></div>
 <h3>My Vehicles</h3>
 <div id="myVehiclesList">Loading...</div>`:`
 <div class="card" id="billingIdentityCard">
  <h3>Billing Details <span class="muted">(your UPI ID, used below to collect payments)</span></h3>
  <div id="billingIdentityBody"></div>
 </div>
 <div class="card">
  <h3>&#128241; Collect Payment</h3>
  ${db.business.upiId?`
  <p class="muted">Type the amount and show the QR on this screen for your customer to scan.</p>
  <div class="grid"><label>Amount<input id="ncAmount" type="number" placeholder="e.g. 500"></label></div>
  <div class="actions"><button class="primary" onclick="tcGenerateNonTaxiQR()">Generate QR</button></div>
  <div id="ncQrBox" style="text-align:center;margin-top:10px"></div>`:
  `<p class="muted">Set your UPI ID in Billing Details above first, then come back here to collect payments by QR.</p>`}
 </div>`}
 <div class="card">
  <h3>&#128222; Recent Contacts <span class="muted">(customers who called you through the app)</span></h3>
  <div id="tcRecentContacts">Loading...</div>
 </div>
 <hr>
 <div class="actions"><button onclick="tcOpenDirectory()">&#128269; Search the Local Directory</button></div>`;
 renderBillingIdentitySection(p);
 if(isTaxi) loadMyVehicles(p.id);
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
  <label>License expiry<input id="vLicExp" type="date"></label>
  <label>License photo (optional)<input id="vLicPhoto" type="file" accept="image/*"></label>
 </div>
 <h4>Vehicle documents - all required for verification</h4>
 <div class="grid">
  <label>Front photo * (vehicle number must be clearly visible)<input id="vFrontPhoto" type="file" accept="image/*"></label>
  <label>RC photo *<input id="vRcPhoto" type="file" accept="image/*"></label>
  <label>RC expiry<input id="vRcExp" type="date"></label>
  <label>Insurance photo *<input id="vInsPhoto" type="file" accept="image/*"></label>
  <label>Insurance expiry<input id="vInsExp" type="date"></label>
  <label>Permit photo *<input id="vPermitPhoto" type="file" accept="image/*"></label>
  <label>Permit expiry<input id="vPermitExp" type="date"></label>
  <label>Fitness photo *<input id="vFitnessPhoto" type="file" accept="image/*"></label>
  <label>Fitness expiry<input id="vFitnessExp" type="date"></label>
  <label>PUC photo *<input id="vPucPhoto" type="file" accept="image/*"></label>
  <label>PUC expiry<input id="vPucExp" type="date"></label>
 </div>
 <button class="primary" id="vSaveBtn" onclick="submitAddVehicle(${partnerId})">Save Vehicle</button>
 <div id="vAddErr" class="danger"></div>`);
}
async function submitAddVehicle(partnerId){
 const no=document.querySelector("#vNoNew").value.trim();
 const errBox=document.querySelector("#vAddErr");
 if(!no){errBox.textContent="Enter the vehicle number.";return}
 const requiredPhotos={vFrontPhoto:"Front photo",vRcPhoto:"RC photo",vInsPhoto:"Insurance photo",vPermitPhoto:"Permit photo",vFitnessPhoto:"Fitness photo",vPucPhoto:"PUC photo"};
 const missing=Object.entries(requiredPhotos).filter(([elId])=>{
  const el=document.querySelector("#"+elId);
  return !(el&&el.files&&el.files[0]);
 }).map(([,label])=>label);
 if(missing.length){
  errBox.textContent="Please upload: "+missing.join(", ")+" - all vehicle documents are required for verification.";
  return;
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
 fd.append("driver_license_expiry",document.querySelector("#vLicExp").value);
 fd.append("rc_expiry",document.querySelector("#vRcExp").value);
 fd.append("insurance_expiry",document.querySelector("#vInsExp").value);
 fd.append("permit_expiry",document.querySelector("#vPermitExp").value);
 fd.append("fitness_expiry",document.querySelector("#vFitnessExp").value);
 fd.append("puc_expiry",document.querySelector("#vPucExp").value);
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
 return `<div class="danger" style="font-size:12px;margin-top:4px">&#9888; Expiring soon: ${soon.map(([label,d])=>label+" ("+d+")").join(", ")}</div>`;
}
async function loadMyVehicles(partnerId){
 const box=document.querySelector("#myVehiclesList");
 try{
  const res=await fetch("/api/vehicles?action=list&partner_id="+partnerId);
  const data=await res.json();
  if(!data.ok||!data.vehicles.length){box.innerHTML="<p class='muted'>No vehicles added yet.</p>";return}
  box.innerHTML=data.vehicles.map(v=>{
   let hours={};
   try{ hours=JSON.parse(v.business_hours||"{}"); }catch(e){}
   return `<div class="listitem">
   <b>${esc(v.vehicle_number)}</b> ${esc(v.category||"")} ${v.verified?'<span class="ok">Verified</span>':'<span class="muted">Pending verification</span>'}<br>
   ${v.driver_name?`Driver: ${esc(v.driver_name)}${v.driver_mobile1?` (${esc(v.driver_mobile1)})`:""}<br>`:""}
   ${vehicleExpiryWarnings(v)}
   ${tcActiveToggleHtml("vActive_"+v.id,!!v.active,`toggleVehicleActive(${v.id},checked)`,"Mark this vehicle Active")}
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
 const typeOptions=`<option value="">All types</option>`+Object.entries(TC_BUSINESS_TYPES).map(([k,label])=>`<option value="${k}">${label}</option>`).join("")+`<option value="other">Other</option>`;
 app().innerHTML=card("Local Directory",`
  <p class="muted">Search verified local businesses - taxis, autos, restaurants, workshops, skilled work and more.</p>
  <div class="grid">
   <label>Category<select id="tcDirType" onchange="tcFilterDirectory()">${typeOptions}</select></label>
   <label>Business name, town or pincode<input id="tcDirSearch" placeholder="e.g. Hotel Anugraha, Vadakara, 673001" oninput="tcFilterDirectory()"></label>
  </div>
  <div id="tcDirList">Loading...</div>`);
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
 if(!entries.length){box.innerHTML="<p class='muted'>No matching businesses found.</p>";return}
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
  <span class="muted">${esc(tcBizLabel(p.business_type))}${p.location?" &bull; "+esc(p.location)+" "+esc(p.pincode||""):""}</span>${tcBusinessHoursNote(hours)}
  ${p.description?`<div style="font-size:12.5px;margin-top:4px;color:#333">${esc(p.description)}</div>`:""}
  <div class="actions">
   ${tcCallButtonHtml(p.mobile1,"partner",p.id,p.business_name,true)}
   ${p.mobile2?tcCallButtonHtml(p.mobile2,"partner",p.id,p.business_name,false):""}
   ${(p.location||hasPin)?`<a href="${mapsUrl}" target="_blank"><button>&#128205; Directions</button></a>`:""}
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
   const haystack=[(p.location||""),(p.pincode||""),(p.business_name||""),tcBizLabel(p.business_type),(p.description||"")].join(" ").toLowerCase();
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
 app().innerHTML=card("Active Vehicles Board",`
  <p class="muted">Taxi vehicles currently marked ready for a trip.</p>
  <label>Search by location, business name or category<input id="tcBoardSearch" oninput="tcFilterActiveBoard()"></label>
  <div id="activeBoardList">Loading...</div>`);
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
 if(!visible.length){ if(!append) box.innerHTML="<p class='muted'>No matching vehicles found.</p>"; return; }
 const html=visible.map(v=>{
  const shownLocation=v.temp_location||v.location;
  const mapsQuery=[v.business_name,shownLocation,v.temp_location?"":v.pincode].filter(Boolean).join(", ");
  const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapsQuery);
  return `<div class="listitem">
  <b>${esc(v.category||"Vehicle")}</b> - ${esc(v.vehicle_number)} <span class="ok">&#9679; Active</span><br>
  ${esc(v.business_name)}${shownLocation?` &bull; ${esc(shownLocation)}${v.temp_location?' <span class="ok">(currently here)</span>':" "+esc(v.pincode||"")}`:""}
  <div class="actions">
   ${tcCallButtonHtml(v.mobile1,"vehicle",v.id,(v.business_name||"")+" - "+(v.vehicle_number||""),true)}
   ${v.mobile2?tcCallButtonHtml(v.mobile2,"vehicle",v.id,(v.business_name||"")+" - "+(v.vehicle_number||""),false):""}
   ${shownLocation?`<a href="${mapsUrl}" target="_blank"><button>&#128205; Directions</button></a>`:""}
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
  (v.category||"").toLowerCase().includes(q)
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
   <b>${esc(p.business_name)}</b> <span class="muted">${esc(tcBizLabel(p.business_type))}</span><br>
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
    ${["front_photo","rc_photo","insurance_photo","permit_photo","fitness_photo","puc_photo"].filter(f=>v[f+"_key"]).map(f=>`<a href="/api/vehicles?action=file&key=${encodeURIComponent(v[f+"_key"])}&token=${encodeURIComponent(adminToken())}" target="_blank"><button>${f.replace("_photo","").toUpperCase()}</button></a>`).join("")}
   </div>
   <div class="actions" style="margin-top:6px"><button class="primary" onclick="tcApproveVehicle(${v.id})">Approve</button><button class="danger" onclick="tcDeleteVehicle(${v.id})">Delete</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
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
   ${["front_photo","rc_photo","insurance_photo","permit_photo","fitness_photo","puc_photo"].filter(f=>v[f+"_key"]).map(f=>`<a href="/api/vehicles?action=file&key=${encodeURIComponent(v[f+"_key"])}&token=${encodeURIComponent(adminToken())}" target="_blank"><button>${f.replace("_photo","").toUpperCase()}</button></a>`).join("")}
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
  <b>${esc(p.business_name)}</b> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>'} <span class="muted">${esc(tcBizLabel(p.business_type))}</span><br>
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
   <label>Business type<div>${tcBizTypeFieldHtml("aeBizType","aeBizTypeOther",p.business_type)}</div></label>
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
   <b>${esc(p.business_name)}</b> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>'} <span class="muted">${esc(tcBizLabel(p.business_type))}</span><br>
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
 if(navigator.geolocation){
  try{
   const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{timeout:4000,enableHighAccuracy:true}));
   lat=pos.coords.latitude; lon=pos.coords.longitude;
  }catch(e){}
 }
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

/* ---------- PARTNER: RECENT CONTACTS (who called me, from where) ---------- */
async function tcRenderRecentContacts(partnerId){
 const box=document.querySelector("#tcRecentContacts");
 if(!box) return;
 try{
  const res=await fetch("/api/calls?action=received&partner_id="+partnerId);
  const data=await res.json();
  if(!data.ok||!data.calls||!data.calls.length){ box.innerHTML="<p class='muted'>No calls logged through the app yet.</p>"; return; }
  box.innerHTML=data.calls.map(c=>{
   const when=new Date(c.created_at).toLocaleString();
   const mapLink=(c.lat!=null&&c.lon!=null)?`<a href="https://maps.google.com/?q=${c.lat},${c.lon}" target="_blank">&#128205; View their location (accurate to their phone's GPS)</a>`:"";
   return `<div class="listitem"><b>${esc(c.caller_name||"A customer")}</b> - <a href="tel:${esc(c.caller_mobile)}">${esc(c.caller_mobile)}</a><br>
   <span class="muted">Called via Travel Connect &bull; ${esc(when)}</span>
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
