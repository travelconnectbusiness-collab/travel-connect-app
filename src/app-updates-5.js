/* ---------- EXTENDED BRANDING CONTROLS (logo size, font family, detail
   text size) ---------- new file, app-updates-4.js was getting large. */

const TC_FONT_FAMILIES={
 helvetica:{label:"Standard (Helvetica)",css:"Arial, Helvetica, sans-serif"},
 times:{label:"Elegant Serif (Times)",css:"'Times New Roman', Times, serif"},
 courier:{label:"Typewriter (Courier)",css:"'Courier New', Courier, monospace"}
};
const TC_LOGO_SIZES={small:120,medium:220,large:320};
const TC_DETAIL_SIZES={small:10,medium:12,large:14};

/* Redefines renderBillingIdentitySection() again to add the 3 new controls
   below the existing color/name-size ones. */
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
 const fontOpts=Object.entries(TC_FONT_FAMILIES).map(([k,v])=>`<option value="${k}" ${(p.brand_font_family||"helvetica")===k?"selected":""}>${v.label}</option>`).join("");
 box.innerHTML=`
 <div class="muted">Currently showing on your bills: <b>${esc(db.business.name||"-")}</b> ${db.business.phone?"* "+esc(db.business.phone):""}</div>
 <button onclick="openUnlockBillingIdentity(${p.id})">Unlock to edit (your password)</button>
 ${isPremium?`<hr><h4>&#127912; Custom Branding (Premium)</h4>
  ${p.logo_key?`<img src="/api/partners?action=logo&partner_id=${p.id}" style="max-width:120px;max-height:120px;border-radius:8px;border:1px solid #c9d4dc;display:block;margin-bottom:8px">`:`<p class="muted" style="font-size:12px">No logo uploaded yet.</p>`}
  <input type="file" id="bizLogoFile" accept="image/*">
  <div class="actions" style="margin-top:6px"><button onclick="tcUploadPartnerLogo(${p.id})">Upload Logo</button></div>
  <label style="margin-top:8px;display:block">Logo size on bills<select id="bizLogoSize">
    <option value="small" ${p.brand_logo_size=="small"?"selected":""}>Small</option>
    <option value="medium" ${(!p.brand_logo_size||p.brand_logo_size=="medium")?"selected":""}>Medium (default)</option>
    <option value="large" ${p.brand_logo_size=="large"?"selected":""}>Large</option>
  </select></label>
  <label style="margin-top:8px;display:block">Brand color (business name + contact line)<input type="color" id="bizBrandColor" value="${esc(p.brand_color||"#148c76")}" style="width:60px;height:36px;padding:2px"></label>
  <label style="margin-top:8px;display:block">Business name size (when no logo is used)<select id="bizFontSize">
    <option value="18" ${p.brand_font_size==18?"selected":""}>Small</option>
    <option value="21" ${(!p.brand_font_size||p.brand_font_size==21)?"selected":""}>Medium (default)</option>
    <option value="26" ${p.brand_font_size==26?"selected":""}>Large</option>
    <option value="32" ${p.brand_font_size==32?"selected":""}>Extra Large</option>
  </select></label>
  <label style="margin-top:8px;display:block">Font style (tagline/address/contact)<select id="bizFontFamily">${fontOpts}</select></label>
  <label style="margin-top:8px;display:block">Tagline/address/contact text size<select id="bizDetailSize">
    <option value="small" ${p.brand_detail_size=="small"?"selected":""}>Small</option>
    <option value="medium" ${(!p.brand_detail_size||p.brand_detail_size=="medium")?"selected":""}>Medium (default)</option>
    <option value="large" ${p.brand_detail_size=="large"?"selected":""}>Large</option>
  </select></label>
  <div class="actions"><button class="primary" onclick="tcSaveBrandColor(${p.id})">Save All Branding Settings</button></div>
  <div id="bizBrandErr" class="danger"></div>`:""}
 `;
}

async function tcSaveBrandColor(partnerId){
 const user=getCurrentUser();
 const color=document.querySelector("#bizBrandColor").value;
 const fontSize=document.querySelector("#bizFontSize")?.value||"21";
 const fontFamily=document.querySelector("#bizFontFamily")?.value||"helvetica";
 const detailSize=document.querySelector("#bizDetailSize")?.value||"medium";
 const logoSize=document.querySelector("#bizLogoSize")?.value||"medium";
 try{
  await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"update",partner_id:partnerId,mobile:user.mobile,
   business_name:window._myPartner.business_name,owner_name:window._myPartner.owner_name,
   mobile2:window._myPartner.mobile2,email:window._myPartner.email,
   location:window._myPartner.location,pincode:window._myPartner.pincode,
   business_type:window._myPartner.business_type,brand_color:color,brand_font_size:fontSize,
   brand_font_family:fontFamily,brand_detail_size:detailSize,brand_logo_size:logoSize})});
  toast("Branding settings saved");
  Object.assign(window._myPartner,{brand_color:color,brand_font_size:fontSize,brand_font_family:fontFamily,brand_detail_size:detailSize,brand_logo_size:logoSize});
  Object.assign(db.settings,{myBrandColor:color,myBrandFontSize:fontSize,myBrandFontFamily:fontFamily,myBrandDetailSize:detailSize,myBrandLogoSize:logoSize});
  save();
 }catch(e){ toast("Network error"); }
}

/* Redefines partnerView() again to also cache the 3 new fields. */
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
   db.settings.myBrandFontSize=data.partner.brand_font_size||null;
   db.settings.myBrandFontFamily=data.partner.brand_font_family||null;
   db.settings.myBrandDetailSize=data.partner.brand_detail_size||null;
   db.settings.myBrandLogoSize=data.partner.brand_logo_size||null;
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

/* Redefines tcBrandingBox() (Print/HTML) again to apply font family, logo
   size and detail text size. */
function tcBrandingBox(partnerPhones){
 const plan=db.settings.myPlan;
 const isPremiumTier=plan==="premium"||plan==="owner_free";
 const isPaidTier=tcIsPremiumPlan();
 if(isPaidTier){
  const color=(isPremiumTier&&db.settings.myBrandColor)?db.settings.myBrandColor:"#148c76";
  const fontSize=(isPremiumTier&&db.settings.myBrandFontSize)?db.settings.myBrandFontSize:"21";
  const fontCss=(isPremiumTier&&TC_FONT_FAMILIES[db.settings.myBrandFontFamily])?TC_FONT_FAMILIES[db.settings.myBrandFontFamily].css:"inherit";
  const detailPx=(isPremiumTier&&TC_DETAIL_SIZES[db.settings.myBrandDetailSize])?TC_DETAIL_SIZES[db.settings.myBrandDetailSize]:12;
  const logoPx=(isPremiumTier&&TC_LOGO_SIZES[db.settings.myBrandLogoSize])?TC_LOGO_SIZES[db.settings.myBrandLogoSize]:220;
  const hasLogo=isPremiumTier&&db.settings.myLogoKey&&db.settings.myPartnerId;
  const logoImg=hasLogo?`<img src="${location.origin}/api/partners?action=logo&partner_id=${db.settings.myPartnerId}" style="max-width:${logoPx}px;max-height:${Math.round(logoPx/2)}px;margin-bottom:6px">`:"";
  return `<div style="background:#e8f5f4;border:2px solid ${color};border-radius:8px;padding:12px;text-align:center;margin:10px 0;font-family:${fontCss}">
   ${hasLogo?logoImg:`<div style="font-weight:bold;font-size:${fontSize}px;color:${color}">${esc(db.business.name)}</div>`}
   ${db.business.tagline?`<div style="color:#555;font-size:${detailPx}px">${esc(db.business.tagline)}</div>`:""}
   ${db.business.address?`<div style="font-size:${detailPx}px;color:#555">${esc(db.business.address)}</div>`:""}
   ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
   ${partnerPhones?`<div style="font-weight:bold;color:${color};font-size:${detailPx+3}px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
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

/* jsPDF only ships Helvetica/Times/Courier as built-in fonts (no custom TTF
   embedding without extra setup) - this maps our 3 CSS choices to jsPDF's
   matching built-in font names, and scales point sizes for logo/detail text
   the same way the HTML version does. */
function tcPdfFontFamily(){
 const isPremiumTier=db.settings.myPlan==="premium"||db.settings.myPlan==="owner_free";
 const key=isPremiumTier?(db.settings.myBrandFontFamily||"helvetica"):"helvetica";
 return {helvetica:"helvetica",times:"times",courier:"courier"}[key]||"helvetica";
}
function tcPdfLogoDims(){
 const isPremiumTier=db.settings.myPlan==="premium"||db.settings.myPlan==="owner_free";
 const size=isPremiumTier?(db.settings.myBrandLogoSize||"medium"):"medium";
 return {small:[45,14],medium:[70,22],large:[95,30]}[size]||[70,22];
}
function tcPdfDetailFontSize(){
 const isPremiumTier=db.settings.myPlan==="premium"||db.settings.myPlan==="owner_free";
 const size=isPremiumTier?(db.settings.myBrandDetailSize||"medium"):"medium";
 return {small:7,medium:8.5,large:10.5}[size]||8.5;
}
