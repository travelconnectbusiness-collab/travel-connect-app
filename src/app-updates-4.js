/* ---------- PREMIUM BRANDING: LOGO UPLOAD + BRAND COLOR ----------
   New file (app-updates-3.js was getting close to the mobile-paste size
   risk zone) - loaded after app-updates-3.js. Adds a "Custom Branding"
   card to the Premium/Owner Free partner's Billing Details area (logo
   upload + a brand color picker), and updates tcBrandingBox() to use
   the logo/color when available - Paid stays plain text, Free stays
   Travel-Connect-prominent, exactly as already decided. */

/* Redefines renderBillingIdentitySection() (already in app.js) to add the
   Custom Branding card for Premium/Owner Free partners, right after the
   existing UPI section. */
function renderBillingIdentitySection(p){
 const box=document.querySelector("#billingIdentityBody");
 if(!p.verified){
  box.innerHTML=`<p class="muted">Your registration is pending owner verification. Once approved, you'll be able to set a password and enter your own business name/phone/UPI here.</p>`;
  return;
 }
 if(!window._myPartnerHasPassword){
  box.innerHTML=`
  <p class="muted">Set a password (choose your own - the owner does not need to know it) to control your billing details on this device.</p>
  <label>Choose a password (min 4 characters)<input id="bizPassNew" type="password"></label>
  <button class="primary" onclick="submitSetPartnerPassword(${p.id})">Set Password</button>
  <div id="bizPassErr" class="danger"></div>`;
  return;
 }
 const isPremium=tcIsPremiumPlan()&&(db.settings.myPlan==="premium"||db.settings.myPlan==="owner_free");
 box.innerHTML=`
 <div class="muted">Currently showing on your bills: <b>${esc(db.business.name||"-")}</b> ${db.business.phone?"* "+esc(db.business.phone):""}</div>
 <button onclick="openUnlockBillingIdentity(${p.id})">Unlock to edit (your password)</button>
 ${isPremium?`<hr><h4>&#127912; Custom Branding (Premium)</h4>
  ${p.logo_key?`<img src="/api/partners?action=logo&partner_id=${p.id}" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid #c9d4dc;display:block;margin-bottom:8px">`:`<p class="muted" style="font-size:12px">No logo uploaded yet.</p>`}
  <input type="file" id="bizLogoFile" accept="image/*">
  <div class="actions" style="margin-top:6px"><button onclick="tcUploadPartnerLogo(${p.id})">Upload Logo</button></div>
  <label style="margin-top:8px;display:block">Brand color (used on your bills)<input type="color" id="bizBrandColor" value="${esc(p.brand_color||"#148c76")}" style="width:60px;height:36px;padding:2px"></label>
  <div class="actions"><button onclick="tcSaveBrandColor(${p.id})">Save Color</button></div>
  <div id="bizBrandErr" class="danger"></div>`:""}
 `;
}

async function tcUploadPartnerLogo(partnerId){
 const fileInput=document.querySelector("#bizLogoFile");
 const errBox=document.querySelector("#bizBrandErr");
 if(!fileInput.files||!fileInput.files[0]){ if(errBox) errBox.textContent="Choose an image first."; return; }
 const user=getCurrentUser();
 const fd=new FormData();
 fd.append("partner_id",partnerId);
 fd.append("mobile",user.mobile);
 fd.append("logo",fileInput.files[0]);
 try{
  const res=await fetch("/api/partners?action=upload_logo",{method:"POST",body:fd});
  const data=await res.json();
  if(!data.ok){ if(errBox) errBox.textContent="Could not upload logo. Please try again."; return; }
  toast("Logo uploaded");
  partnerView();
 }catch(e){ if(errBox) errBox.textContent="Network error."; }
}

async function tcSaveBrandColor(partnerId){
 const user=getCurrentUser();
 const color=document.querySelector("#bizBrandColor").value;
 try{
  await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"update",partner_id:partnerId,mobile:user.mobile,
   business_name:window._myPartner.business_name,owner_name:window._myPartner.owner_name,
   mobile2:window._myPartner.mobile2,email:window._myPartner.email,
   location:window._myPartner.location,pincode:window._myPartner.pincode,
   business_type:window._myPartner.business_type,brand_color:color})});
  toast("Brand color saved");
  window._myPartner.brand_color=color;
 }catch(e){ toast("Network error"); }
}

/* Redefines tcBrandingBox() again - Premium/Owner Free partners with a
   logo/brand_color now use them; Paid stays plain text (unchanged); Free
   stays Travel-Connect-prominent (unchanged). */
function tcBrandingBox(partnerPhones){
 const plan=db.settings.myPlan;
 const isPremiumTier=plan==="premium"||plan==="owner_free";
 const isPaidTier=tcIsPremiumPlan(); /* paid, premium, or owner_free */
 if(isPaidTier){
  const p=window._myPartner||{};
  const color=(isPremiumTier&&p.brand_color)?p.brand_color:"#148c76";
  const logoImg=(isPremiumTier&&p.logo_key)?`<img src="/api/partners?action=logo&partner_id=${p.id}" style="max-width:56px;max-height:56px;border-radius:8px;margin-bottom:4px">`:"";
  return `<div style="background:#e8f5f4;border:2px solid ${color};border-radius:8px;padding:12px;text-align:center;margin:10px 0">
   ${logoImg}
   <div style="font-weight:bold;font-size:21px;color:${color}">${esc(db.business.name)}</div>
   ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
   ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
   ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
   ${partnerPhones?`<div style="font-weight:bold;color:${color};font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
  </div>`;
 }
 return `<div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
  <div style="font-weight:bold;font-size:19px;color:#0f5a55">${esc(db.platform.name||"Travel Connect")}</div>
  <div style="color:#555;font-size:12px">Book your next trip directly - fast, reliable service</div>
  ${db.platform.phone1?`<div style="font-weight:bold;color:#0f5a55;font-size:14px;margin-top:4px">Call: ${esc(db.platform.phone1)}${db.platform.phone2?" / "+esc(db.platform.phone2):""}</div>`:""}
  ${db.platform.email?`<div style="font-size:12px;color:#555">${esc(db.platform.email)}</div>`:""}
  <div style="font-size:10.5px;color:#888;margin-top:6px">Trip arranged via ${esc(db.business.name)}${partnerPhones?" ("+partnerPhones+")":""}</div>
 </div>`;
}

/* ---------- FIX: LOGO/COLOR NOT SHOWING ON PRINT ----------
   Root cause: window._myPartner (holding logo_key/brand_color) is only
   populated by visiting the "Travel Partner" page - if a bill/quotation is
   printed without having done that first in the CURRENT session (e.g. app
   was reopened and Billing was opened directly), window._myPartner is
   empty and the logo/color silently don't appear. Fix: cache the id/
   logo_key/brand_color into db.settings (persisted to localStorage, same
   as myPlan/myBusinessType already are) whenever partnerView() fetches
   fresh data, and have tcBrandingBox() read from THAT instead - so it
   survives across page navigation and app reopens, not just within one
   still-open Partner-page visit. */
async function partnerView(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("Travel Partner",`<div id="partnerBox">Checking your registration...</div>`);
 const user=getCurrentUser();
 try{
  const res=await fetch("/api/partners?action=mine&mobile="+encodeURIComponent(user.mobile));
  const data=await res.json();
  if(!data.ok||!data.partner){
   db.settings.myBusinessType="none"; save();
   renderPartnerRegisterForm();
  }
  else{
   window._myPartner=data.partner; window._myPartnerHasPassword=data.has_password;
   db.settings.myPlan=data.partner.plan||"free";
   db.settings.myPartnerId=data.partner.id;
   db.settings.myLogoKey=data.partner.logo_key||null;
   db.settings.myBrandColor=data.partner.brand_color||null;
   const confirmedType=data.partner.business_type||"taxi_travel";
   const wasUnknown=db.settings.myBusinessType==null;
   db.settings.myBusinessType=confirmedType;
   save();
   if(confirmedType==="taxi_travel"&&wasUnknown){
    dashboard();
    return;
   }
   renderPartnerDashboard(data.partner);
  }
 }catch(e){
  document.querySelector("#partnerBox").innerHTML="<p class='danger'>Network error - check your connection and try again.</p>";
 }
}

/* Redefines tcBrandingBox() again to read the persisted db.settings cache
   instead of the transient window._myPartner. */
function tcBrandingBox(partnerPhones){
 const plan=db.settings.myPlan;
 const isPremiumTier=plan==="premium"||plan==="owner_free";
 const isPaidTier=tcIsPremiumPlan();
 if(isPaidTier){
  const color=(isPremiumTier&&db.settings.myBrandColor)?db.settings.myBrandColor:"#148c76";
  const logoImg=(isPremiumTier&&db.settings.myLogoKey&&db.settings.myPartnerId)?`<img src="/api/partners?action=logo&partner_id=${db.settings.myPartnerId}" style="max-width:56px;max-height:56px;border-radius:8px;margin-bottom:4px">`:"";
  return `<div style="background:#e8f5f4;border:2px solid ${color};border-radius:8px;padding:12px;text-align:center;margin:10px 0">
   ${logoImg}
   <div style="font-weight:bold;font-size:21px;color:${color}">${esc(db.business.name)}</div>
   ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
   ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
   ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
   ${partnerPhones?`<div style="font-weight:bold;color:${color};font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
  </div>`;
 }
 return `<div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
  <div style="font-weight:bold;font-size:19px;color:#0f5a55">${esc(db.platform.name||"Travel Connect")}</div>
  <div style="color:#555;font-size:12px">Book your next trip directly - fast, reliable service</div>
  ${db.platform.phone1?`<div style="font-weight:bold;color:#0f5a55;font-size:14px;margin-top:4px">Call: ${esc(db.platform.phone1)}${db.platform.phone2?" / "+esc(db.platform.phone2):""}</div>`:""}
  ${db.platform.email?`<div style="font-size:12px;color:#555">${esc(db.platform.email)}</div>`:""}
  <div style="font-size:10.5px;color:#888;margin-top:6px">Trip arranged via ${esc(db.business.name)}${partnerPhones?" ("+partnerPhones+")":""}</div>
 </div>`;
}
