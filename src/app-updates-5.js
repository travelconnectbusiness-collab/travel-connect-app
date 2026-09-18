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
  /* max-height was previously capped at half the width (logoPx/2), which
     visually cropped/cut off taller graphics (like a peacock-feather mark
     above the text) whose natural height exceeds a 2:1 width:height ratio -
     max-width alone (no max-height cap) lets the browser scale it to its
     own natural proportions instead. page-break-inside:avoid on the whole
     box (added below) is the main fix though - the image was actually
     being split across a print page boundary, not just squeezed. */
  const logoImg=hasLogo?`<img src="${location.origin}/api/partners?action=logo&partner_id=${db.settings.myPartnerId}" style="max-width:${logoPx}px;height:auto;margin-bottom:6px;display:block;margin-left:auto;margin-right:auto">`:"";
  /* Logos are usually saved with a plain WHITE background (not
     transparent) - against the box's light-teal fill, that shows up as a
     visible rectangle around the logo, like it was "pasted on". Using a
     plain white box background whenever a logo is present makes the
     logo's own white background blend in seamlessly instead - the colored
     border still carries the brand color. */
  return `<div style="page-break-inside:avoid;break-inside:avoid;background:${hasLogo?"#ffffff":"#e8f5f4"};border:2px solid ${color};border-radius:8px;padding:12px;text-align:center;margin:10px 0;font-family:${fontCss}">
   ${hasLogo?logoImg:`<div style="font-weight:bold;font-size:${fontSize}px;color:${color}">${esc(db.business.name)}</div>`}
   ${db.business.tagline?`<div style="color:#555;font-size:${detailPx}px">${esc(db.business.tagline)}</div>`:""}
   ${db.business.address?`<div style="font-size:${detailPx}px;color:#555">${esc(db.business.address)}</div>`:""}
   ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
   ${partnerPhones?`<div style="font-weight:bold;color:${color};font-size:${detailPx+3}px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
  </div>`;
 }
 return `<div style="page-break-inside:avoid;break-inside:avoid;background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
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

/* ---------- FIX: PAGE-BREAK SPLITTING (Print / Save-as-PDF) ----------
   The browser's own print pagination can split a block mid-way across two
   pages if it doesn't know any better - the disclaimer+thank-you text and
   the "Your Total Savings" box were both getting cut in half this way.
   page-break-inside:avoid (plus the modern break-inside:avoid) tells the
   browser to move the WHOLE block to the next page instead of splitting
   it, exactly as requested. Also makes that closing block a bit bolder/
   larger so it's easy to read whichever page it lands on. */
function printQuoteObj(q){
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const c=db.categories[q.categoryId];
 const platformPhones=[db.platform.phone1,db.platform.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const row=(label,value,big)=>`<tr><td style="padding:4px 0;color:#555;font-size:${big?"16px":"14px"}">${esc(label)}</td><td style="padding:4px 0;text-align:right;font-weight:bold;font-size:${big?"18px":"14px"}">${esc(value)}</td></tr>`;

 const offerRaw=calcFare(c,q.ratePlan,q.estimatedKm,q.estimatedHours,q.days||1,q.restHours||0,{addKm:q.overrideAddKm,addHour:q.overrideAddHour});
 const standardRaw=calcFare(c,"standard",q.estimatedKm,q.estimatedHours,q.days||1,q.restHours||0);
 const offerFareTotal=offerRaw.invalid?(q.subtotal??q.quotedAmount):offerRaw.total;
 const stdFareTotal=standardRaw.invalid?0:standardRaw.total;
 const rateSaving=(!standardRaw.invalid&&!offerRaw.invalid&&q.ratePlan!=="standard")?Math.max(0,stdFareTotal-offerFareTotal):0;
 const totalSavings=rateSaving+(q.discountAmount||0);
 const showCompare=!standardRaw.invalid&&!offerRaw.invalid&&q.ratePlan!=="standard";

 let advanceHtml="";
 if(q.advanceAmount>0){
  let qrImg="";
  if(db.business.upiId){
   const qrData=getQRDataURL(buildUpiLink(q.advanceAmount,"Advance "+q.no),160);
   if(qrData) qrImg=`<img src="${qrData}" style="width:110px;height:110px">`;
  }
  advanceHtml=`<div style="page-break-inside:avoid;break-inside:avoid;background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
   <div>
    <div style="font-weight:bold;font-size:15px;color:#7a5a1e">ADVANCE REQUESTED</div>
    <div style="font-size:22px;font-weight:bold">${money(q.advanceAmount)}</div>
    <div style="font-size:12px;color:#7a5a1e">${q.advanceReceived?"&#9989; Received":"Please pay in advance to confirm this trip"}</div>
   </div>
   ${!q.advanceReceived&&qrImg?`<div style="text-align:center"><b style="font-size:11px">SCAN &amp; PAY ADVANCE</b><br>${qrImg}</div>`:""}
  </div>`;
 }

 printContent("Quotation "+q.no,`
 <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:6px">
  <div style="display:flex;align-items:center;gap:8px">
   <img src="${LOGO_DATA_URI}" style="width:28px;height:28px">
   <div>
    <div style="font-weight:bold;color:#444;font-size:13px">${esc((db.platform.name||"Travel Connect").toUpperCase())}</div>
    ${db.platform.tagline?`<div style="color:#888;font-size:10px">${esc(db.platform.tagline)}</div>`:""}
    ${db.platform.email?`<div style="color:#888;font-size:10px">${esc(db.platform.email)}</div>`:""}
   </div>
  </div>
  <div style="color:#444;font-weight:bold;font-size:12px;text-align:right">${platformPhones}</div>
 </div>
 ${tcBrandingBox(partnerPhones)}
 <h2 style="text-align:center;color:#143c5a;margin:10px 0;font-size:20px">QUOTATION ${esc(q.no)}</h2>
 <table>${row("Date",q.entryDate||(q.created||"").slice(0,10))}${row("Customer",q.customer)}${row("Mobile",q.mobile)}${row("Vehicle Category",q.category+" "+(q.vehicle||"")+" "+(q.vehicleNo||""))}</table>
 <div style="background:#fdf6e3;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:12px 0">
  <div style="font-weight:bold;font-size:15px;color:#7a5a1e;margin-bottom:6px">&#128663; ROUTE</div>
  <div style="font-size:15px;font-weight:600">${[q.vehicleStart,q.pickup,...dests,q.returnPoint].filter(Boolean).map(esc).join(" &rarr; ")}</div>
 </div>
 <table>
  ${row("Trip Type",q.type,true)}
  ${q.days>1?row("Number of days",q.days+" days",true):""}
  ${q.restHours>0?row("Overnight rest hours (excluded)",q.restHours+" hrs"):""}
  ${row("Estimated KM / Hours",q.estimatedKm+" KM / "+q.estimatedHours+" hrs",true)}
 </table>
 ${showCompare?`
 <h3 style="margin:12px 0 4px;font-size:15px;color:#143c5a">Standard vs Offer Rate</h3>
 <table>
  <tr style="color:#888;font-size:12px"><td></td><td style="text-align:right">Standard</td><td style="text-align:right">Offer</td></tr>
  <tr><td style="padding:3px 0">Fare</td><td style="text-align:right;padding:3px 0">${money(stdFareTotal)}</td><td style="text-align:right;padding:3px 0;font-weight:bold">${money(offerFareTotal)}</td></tr>
 </table>
 ${totalSavings>0?`<div style="page-break-inside:avoid;break-inside:avoid;background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:10px;margin:8px 0;color:#1c6b2c">
  <div style="font-weight:bold;font-size:16px">&#127881; You save: ${money(totalSavings)}</div>
 </div>`:""}
 `:""}
 ${sumExtraCharges(q.extraCharges)>0?`<table><tr><td style="padding:3px 0;color:#555">Other Charges${extraChargesShortLabel(q.extraCharges)}</td><td style="text-align:right;padding:3px 0;font-weight:bold">+${money(sumExtraCharges(q.extraCharges))}</td></tr></table>`:""}
 ${q.gstAmount>0?`<table><tr><td style="padding:3px 0;color:#555">GST @ ${q.gstPct}%</td><td style="text-align:right;padding:3px 0;font-weight:bold">+${money(q.gstAmount)}</td></tr></table>`:""}
 <div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:14px;text-align:center;margin-top:14px">
  <div style="font-size:14px;color:#1c6b2c">QUOTED AMOUNT (ESTIMATE)</div>
  <div style="font-size:30px;font-weight:bold;color:#1c6b2c">${money(q.quotedAmount)}</div>
 </div>
 ${advanceHtml}
 <div style="page-break-inside:avoid;break-inside:avoid;margin-top:10px">
  <div style="background:#f2f2f2;border-radius:6px;padding:12px;font-size:13px;font-weight:600;color:#333;line-height:1.5">
   &#8505;&#65039; This is an estimated fare based on the KM/hours entered above and rates in effect today${q.validUntil?`, valid until <b>${esc(q.validUntil)}</b>`:""}. The <b>final bill</b> is calculated only after the trip, based on actual KM/hours travelled${q.validUntil?", and rates may change after the validity date above":""}.
   ${extraChargesHtml(q.extraCharges)}
  </div>
  <p style="text-align:center;color:#444;font-size:14px;font-weight:600;margin-top:14px">Thank you for choosing ${esc(db.business.name)}.</p>
 </div>
 `);
}

/* Same page-break fix applied to printBill(). */
function printBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const bd=billBreakdown(t,q,c);
 const {km,h,standardRaw,r,rateSaving,manualDiscount,manualAddition,totalSavings}=bd;
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0), balance=Math.max(0,r.final-paid);
 const driver=findDriverForVehicleNo(q.vehicleNo);
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const billDate=billPrintDate();

 let qrHtml="";
 if(balance>0&&db.business.upiId){
  const qrData=getQRDataURL(buildUpiLink(balance,q.no||tripId.slice(0,8)),220);
  if(qrData) qrHtml=`<div style="text-align:center"><b>SCAN &amp; PAY</b><br><img src="${qrData}" style="width:140px;height:140px"><br><small>UPI: ${esc(db.business.upiId)}</small></div>`;
 }

 const row=(label,value,bold)=>`<tr><td style="padding:3px 0;color:${bold?"#111":"#555"};font-weight:${bold?"bold":"normal"};font-size:${bold?"15px":"14px"}">${esc(label)}</td><td style="padding:3px 0;text-align:right;font-weight:${bold?"bold":"normal"};font-size:${bold?"15px":"14px"}">${esc(value)}</td></tr>`;

 let detailRows="";
 detailRows+=row("Customer",t.customer||q.customer);
 detailRows+=row("Customer Mobile",q.mobile||"-");
 detailRows+=row("Trip Type",q.type||"-");
 detailRows+=row("Vehicle Category",q.category||"-");
 detailRows+=row("Vehicle",q.vehicle||"Not specified");
 detailRows+=row("Vehicle Number",q.vehicleNo||"Not specified");
 if(driver){detailRows+=row("Driver",driver.name||"-");detailRows+=row("Driver Mobile",driver.mobile||"-");}
 if(q.service) detailRows+=row("Service",q.service);
 detailRows+=row("Bill Entry Date",t.entryDate||(t.created||"").slice(0,10)||"-");
 detailRows+=row("Trip Date",q.startDate||"-");

 let usageRows="";
 usageRows+=row("Total KM / Total Hours",km+" KM / "+h+" hrs",true);
 if(r.days>1) usageRows+=row("Number of days",r.days+" days");
 if(r.restHours>0) usageRows+=row("Overnight rest hours (excluded)",r.restHours+" hrs");
 if(r.incKm!=null){
  usageRows+=row("Included Coverage",r.incKm+" KM / "+r.incHours+" hrs");
  usageRows+=row("Extra KM ("+money(r.addKm)+"/KM)",Math.max(0,km-r.incKm)+" KM = "+money(r.kmExtra||0));
  usageRows+=row("Extra Hours ("+money(r.addHour)+"/hr)",Math.max(0,h-r.incHours)+" hrs = "+money(r.hourExtra||0));
 }

 const stdBase=standardRaw.invalid?0:standardRaw.base, stdExtra=standardRaw.invalid?0:standardRaw.extra, stdTotal=standardRaw.invalid?0:standardRaw.total;
 const offBase=r.base, offExtra=r.extra||0, offTotal=r.base+(r.extra||0);
 const cmpRow=(label,sv,ov,bold)=>`<tr><td style="padding:3px 0;font-weight:${bold?"bold":"normal"};font-size:14px">${esc(label)}</td><td style="padding:3px 0;text-align:right;font-weight:${bold?"bold":"normal"};font-size:14px">${money(sv)}</td><td style="padding:3px 0;text-align:right;font-weight:${bold?"bold":"normal"};font-size:14px">${money(ov)}</td></tr>`;
 const compareTable=`<table>
  <tr style="color:#888;font-size:12px"><td></td><td style="text-align:right">Standard</td><td style="text-align:right">Offer</td></tr>
  ${cmpRow("Base Rate",stdBase,offBase)}
  ${cmpRow("Additional Charge",stdExtra,offExtra)}
  <tr style="border-top:2px solid #ccc">${cmpRow("Total",stdTotal,offTotal,true).replace(/<tr>|<\/tr>/g,"")}</tr>
 </table>`;

 const savingsHtml=totalSavings>0?`<div style="page-break-inside:avoid;break-inside:avoid;background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:12px;margin:10px 0;color:#1c6b2c">
  <div style="font-weight:bold;font-size:18px">&#127881; Your Total Savings: ${money(totalSavings)}</div>
  <div style="font-size:12px">${rateSaving?`Offer discount ${money(rateSaving)}`:""}${manualDiscount?`${rateSaving?" + ":""}Additional discount ${money(manualDiscount)}`:""}</div>
 </div>`:"";

 let summaryRows="";
 summaryRows+=row("Base Rate",money(r.base));
 summaryRows+=row("Additional Charge (higher of KM/Hour)",money(r.extra||0));
 if(r.driverBata) summaryRows+=row("Driver Bata",money(r.driverBata));
 if(manualDiscount) summaryRows+=row("Manual Discount","- "+money(manualDiscount));
 if(manualAddition) summaryRows+=row("Manual Addition","+ "+money(manualAddition));
 if(r.roundAdjustment) summaryRows+=row("Round off",(r.roundAdjustment>=0?"+":"")+money(r.roundAdjustment));
 if(r.extraTotal>0) summaryRows+=row("Other Charges"+extraChargesShortLabel(r.extraCharges),"+"+money(r.extraTotal));
 if(r.gstAmount>0) summaryRows+=row("GST @ "+r.gstPct+"%","+"+money(r.gstAmount));

 const platformPhones=[db.platform.phone1,db.platform.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 printContent("Bill "+(q.no||""),`
 <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:6px">
  <div style="display:flex;align-items:center;gap:8px">
   <img src="${LOGO_DATA_URI}" style="width:28px;height:28px">
   <div>
    <div style="font-weight:bold;color:#444;font-size:13px">${esc((db.platform.name||"Travel Connect").toUpperCase())}</div>
    ${db.platform.tagline?`<div style="color:#888;font-size:10px">${esc(db.platform.tagline)}</div>`:""}
    ${db.platform.email?`<div style="color:#888;font-size:10px">${esc(db.platform.email)}</div>`:""}
   </div>
  </div>
  <div style="color:#444;font-weight:bold;font-size:12px;text-align:right">${platformPhones}</div>
 </div>
 ${tcBrandingBox(partnerPhones)}
 <div style="display:flex;justify-content:space-between;align-items:baseline">
  <h2 style="color:#143c5a;margin:4px 0;font-size:20px">FINAL TRIP BILL</h2>
  <span style="color:#888;font-size:12px">Bill printed on: ${esc(billDate)}</span>
 </div>
 <table>${detailRows}</table>
 <div style="background:#fdf6e3;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:10px 0">
  <div style="font-weight:bold;font-size:14px;color:#7a5a1e;margin-bottom:6px">&#128663; ROUTE</div>
  <div style="font-size:15px;font-weight:600">${[q.vehicleStart,q.pickup,...dests,q.returnPoint].filter(Boolean).map(esc).join(" &rarr; ")}</div>
 </div>
 <hr>
 <h3 style="margin:6px 0;font-size:16px;color:#143c5a">1. Usage Details</h3>
 <table>${usageRows}</table>
 <h3 style="margin:12px 0 4px;font-size:16px;color:#143c5a">2. Standard vs Offer Rate</h3>
 ${compareTable}
 ${savingsHtml}
 <h3 style="margin:12px 0 4px;font-size:16px;color:#143c5a">4. Final Payment Summary</h3>
 <table>${summaryRows}</table>
 <div style="background:#0f5a55;border-radius:8px;padding:14px;text-align:center;margin:12px 0">
  <div style="font-size:14px;color:#eafaf8">FINAL BILL AMOUNT</div>
  <div style="font-size:32px;font-weight:bold;color:#fff">${money(r.final)}</div>
 </div>
 <div style="background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
  <div style="font-size:15px">
   Balance Due: <b style="font-size:18px">${balance>0?money(balance):"FULLY PAID"}</b>
  </div>
  ${qrHtml}
 </div>
 ${(t.payments||[]).length?`<h3 style="margin:10px 0 4px;font-size:16px;color:#143c5a">Payments Received</h3><table>${t.payments.map(p=>row(p.method+" ("+(p.at||"").slice(0,10)+")",money(p.amount))).join("")}${row("Total Paid",money(paid),true)}</table>`:""}
 <div style="page-break-inside:avoid;break-inside:avoid;margin-top:10px">
  <div style="background:#f2f2f2;border-radius:6px;padding:12px;font-size:13px;font-weight:600;color:#333;line-height:1.5">
   ${extraChargesHtml(r.extraCharges)}
  </div>
  <p style="text-align:center;color:#444;font-size:14px;font-weight:600;margin-top:14px">Thank you for travelling with ${esc(db.business.name)}.</p>
 </div>
 `);
}

/* ---------- IMAGE EXPORT (Quotation / Bill as PNG) ----------
   Redefines printContent() again to accept an optional 3rd parameter -
   when true, instead of opening the print dialog, it waits for images to
   load (same logic as before) then uses html2canvas to capture the SAME
   hidden iframe's content as a PNG and triggers a download, cleaning up
   the iframe afterward. This reuses printQuoteObj()/printBill()'s existing
   HTML-building - only the very last step (print vs. image) differs. */
function printContent(title,html,asImage){
 let frame=document.querySelector("#printFrame");
 if(frame) frame.remove();
 frame=document.createElement("iframe");
 frame.id="printFrame";
 frame.style.position="fixed";frame.style.right="0";frame.style.bottom="0";frame.style.width=asImage?"800px":"0";frame.style.height=asImage?"1px":"0";frame.style.border="0";
 frame.style.visibility="hidden";
 document.body.appendChild(frame);
 const doc=frame.contentWindow.document;
 doc.open();
 doc.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:20px;color:#111;font-size:15px;line-height:1.5;background:#fff}h2,h3{margin:8px 0}hr{margin:12px 0}table{width:100%}td{padding:3px 0}</style></head><body>${html}</body></html>`);
 doc.close();
 const images=Array.from(doc.images||[]);
 const waitForImages=Promise.all(images.map(img=>{
  if(img.complete) return Promise.resolve();
  return new Promise(resolve=>{
   img.addEventListener("load",resolve,{once:true});
   img.addEventListener("error",resolve,{once:true});
   setTimeout(resolve,3000);
  });
 }));
 waitForImages.then(async ()=>{
  if(!asImage){
   frame.contentWindow.focus();
   frame.contentWindow.print();
   return;
  }
  if(typeof html2canvas==="undefined"){
   toast("Image export library not loaded - try again in a moment");
   frame.remove();
   return;
  }
  try{
   const bodyHeight=doc.body.scrollHeight;
   frame.style.height=bodyHeight+"px";
   await new Promise(r=>setTimeout(r,50)); /* let the resize settle before capture */
   const canvas=await html2canvas(doc.body,{backgroundColor:"#ffffff",useCORS:true,scale:2});
   const link=document.createElement("a");
   link.download=title.replace(/[^a-z0-9]+/gi,"-")+".png";
   link.href=canvas.toDataURL("image/png");
   link.click();
   toast("Image downloaded");
  }catch(e){
   toast("Could not create image - try Print instead");
  }
  frame.remove();
 });
}

/* Wrappers that reuse printQuoteObj()/printBill()'s HTML-building by
   temporarily intercepting printContent() calls - avoids duplicating those
   large functions a second time just to swap the output mode. */
function downloadQuoteImage(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 const original=printContent;
 window.printContent=(title,html)=>original(title,html,true);
 try{ printQuoteObj(q); } finally { window.printContent=original; }
}
function downloadCurrentQuoteImage(){
 const r=calcQuote();
 if(r.invalid){toast("Correct Local Trip limits first");return}
 const original=printContent;
 window.printContent=(title,html)=>original(title,html,true);
 try{ printQuoteObj(buildQuoteObjFromForm(r)); } finally { window.printContent=original; }
}
function downloadBillImage(tripId){
 const original=printContent;
 window.printContent=(title,html)=>original(title,html,true);
 try{ printBill(tripId); } finally { window.printContent=original; }
}

/* ---------- "Image" BUTTONS next to existing PDF buttons ----------
   Wraps quotations()/loadBill() (whichever versions are currently active
   after every earlier file has loaded) to inject an "Image" button right
   next to each existing PDF button, instead of duplicating those large
   list-rendering functions just to add one button. Uses an IIFE with a
   function EXPRESSION assignment (quotations = function(){...}) rather
   than a "function quotations(){}" declaration - a plain declaration here
   would get hoisted to the top of this file's execution, meaning "const
   orig = quotations" would capture THIS new function instead of the real
   previous one, causing infinite self-recursion (exactly what happened -
   RangeError: Maximum call stack size exceeded). An IIFE with an
   assignment avoids that, since "orig" is captured only when this line
   actually runs, after every earlier file's own quotations()/loadBill()
   is already in place. */
(function(){
 const orig=quotations;
 quotations=function(){
  orig();
  document.querySelectorAll('[onclick^="downloadQuotePDF("]').forEach(btn=>{
   const m=(btn.getAttribute("onclick")||"").match(/downloadQuotePDF\('([^']+)'\)/);
   if(m){
    const imgBtn=document.createElement("button");
    imgBtn.textContent="Image";
    imgBtn.onclick=()=>downloadQuoteImage(m[1]);
    btn.after(imgBtn);
   }
  });
  const formPdfBtn=document.querySelector('[onclick="downloadCurrentQuotePDF()"]');
  if(formPdfBtn&&!document.querySelector('[onclick="downloadCurrentQuoteImage()"]')){
   const imgBtn=document.createElement("button");
   imgBtn.textContent="Image";
   imgBtn.setAttribute("onclick","downloadCurrentQuoteImage()");
   imgBtn.onclick=downloadCurrentQuoteImage;
   formPdfBtn.after(imgBtn);
  }
 };
})();
(function(){
 const orig=loadBill;
 loadBill=function(){
  orig();
  const pdfBtn=document.querySelector('[onclick^="downloadBillPDF("]');
  if(pdfBtn){
   const m=(pdfBtn.getAttribute("onclick")||"").match(/downloadBillPDF\('([^']+)'\)/);
   if(m&&!document.querySelector('[onclick^="downloadBillImage("]')){
    const imgBtn=document.createElement("button");
    imgBtn.textContent="Image";
    imgBtn.onclick=()=>downloadBillImage(m[1]);
    pdfBtn.after(imgBtn);
   }
  }
 };
})();

