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

/* ---------- SIMPLIFIED CUSTOMER PAGE (with English/Malayalam toggle) ----------
   New file - redesigns customerHome() for less scrolling and quicker
   scanning: essential fields visible immediately, advanced/rarely-used
   fields tucked into a collapsible "More options" section, the three
   notice boxes condensed into one small collapsible info line, and a
   language toggle (persisted in localStorage) that swaps the key labels/
   buttons between English and Malayalam. */

const TC_LANG_STRINGS={
 en:{
  title:"Fare Estimate & Vehicle Booking",
  subtitle:"Get a quick estimate for your trip, or find a vehicle nearby.",
  infoShort:"ℹ️ How this works / Important notes",
  howToUse:"How to use: Fill in your trip details, tap Calculate. Or tap \"Browse Available Vehicles\" to find and call a partner directly.",
  disclaimer:"Travel Connect only connects you with travel partners — it does not own vehicles, fix prices, or handle payments. Please confirm details by phone before your trip.",
  underDev:"This app is under active development — your feedback helps us improve it.",
  category:"Vehicle category",tripType:"Trip type",pickup:"Pickup point",dest:"Destination",
  addDest:"+ Add another destination",km:"Estimated KM",hours:"Estimated hours",
  calculate:"Calculate Estimate",moreOptions:"More trip details (optional)",
  vehicleStart:"Vehicle start point (garage)",vehicleClose:"Vehicle closing point",
  days:"Number of days",openMaps:"Open route in Google Maps (to check KM)",
  browseVehicles:"Browse Available Vehicles",directory:"Local Directory",
  feedback:"Feedback / Suggestions",feedbackSub:"Noticed an issue, or have an idea?",
  yourMsg:"Your message",send:"Send Feedback",logout:"Log out",
  local:"Local Trip",oneDay:"One Day",multiday:"Multi-day",drop:"Drop"
 },
 ml:{
  title:"ചാർജ് കണക്കാക്കലും വാഹന ബുക്കിംഗും",
  subtitle:"നിങ്ങളുടെ യാത്രയുടെ ഏകദേശ ചാർജ് അറിയാം, അല്ലെങ്കിൽ അടുത്തുള്ള വാഹനം കണ്ടെത്താം.",
  infoShort:"ℹ️ എങ്ങനെ ഉപയോഗിക്കാം / പ്രധാന കാര്യങ്ങൾ",
  howToUse:"എങ്ങനെ ഉപയോഗിക്കാം: യാത്രാ വിവരങ്ങൾ കൊടുത്ത് Calculate അമർത്തുക. അല്ലെങ്കിൽ \"Browse Available Vehicles\" അമർത്തി നേരിട്ട് ഒരു partner-നെ കണ്ടെത്തി വിളിക്കാം.",
  disclaimer:"Travel Connect വെറും ഒരു connecting platform മാത്രമാണ് — വാഹനങ്ങൾ ഞങ്ങളുടേതല്ല, price/payment ഞങ്ങൾ കൈകാര്യം ചെയ്യുന്നില്ല. യാത്രയ്ക്ക് മുൻപ് partner-നോട് നേരിട്ട് സംസാരിച്ച് ഉറപ്പിക്കുക.",
  underDev:"ഈ ആപ്പ് തുടർച്ചയായി develop ചെയ്തുകൊണ്ടിരിക്കുന്നു — നിങ്ങളുടെ feedback ഞങ്ങളെ സഹായിക്കും.",
  category:"വാഹന വിഭാഗം",tripType:"യാത്രാ തരം",pickup:"പിക്കപ്പ് സ്ഥലം",dest:"ലക്ഷ്യസ്ഥാനം",
  addDest:"+ വേറെ ലക്ഷ്യസ്ഥാനം ചേർക്കുക",km:"ഏകദേശ കിലോമീറ്റർ",hours:"ഏകദേശ മണിക്കൂർ",
  calculate:"ചാർജ് കാണിക്കുക",moreOptions:"കൂടുതൽ വിവരങ്ങൾ (ഓപ്ഷണൽ)",
  vehicleStart:"വാഹനം തുടങ്ങുന്ന സ്ഥലം (ഗാരേജ്)",vehicleClose:"വാഹനം അവസാനിക്കുന്ന സ്ഥലം",
  days:"ദിവസങ്ങളുടെ എണ്ണം",openMaps:"Google Maps-ൽ റൂട്ട് കാണുക (KM അറിയാൻ)",
  browseVehicles:"ലഭ്യമായ വാഹനങ്ങൾ കാണുക",directory:"ലോക്കൽ ഡയറക്ടറി",
  feedback:"അഭിപ്രായം / നിർദ്ദേശം",feedbackSub:"എന്തെങ്കിലും പ്രശ്നമോ ആശയമോ ഉണ്ടോ?",
  yourMsg:"നിങ്ങളുടെ സന്ദേശം",send:"അയക്കുക",logout:"ലോഗ് ഔട്ട്",
  local:"ലോക്കൽ ട്രിപ്പ്",oneDay:"ഒരു ദിവസം",multiday:"പല ദിവസം",drop:"ഡ്രോപ്പ്"
 }
};
function tcLang(){ return localStorage.getItem("tc_cust_lang")||"en"; }
function tcT(key){ return (TC_LANG_STRINGS[tcLang()]||TC_LANG_STRINGS.en)[key]||key; }
function tcSetLang(lang){ localStorage.setItem("tc_cust_lang",lang); customerHome(); }
function tcToggleInfo(){
 const box=document.querySelector("#custInfoBox");
 if(box) box.style.display=box.style.display==="none"?"":"none";
}
function tcToggleMoreOptions(){
 const box=document.querySelector("#custMoreOptions");
 const btn=document.querySelector("#custMoreBtn");
 if(!box) return;
 const hidden=box.style.display==="none";
 box.style.display=hidden?"":"none";
 if(btn) btn.textContent=(hidden?"▾ ":"▸ ")+tcT("moreOptions");
}

/* Redefines customerHome() (already in app-updates-2.js/3.js) - simplified
   layout: essentials visible immediately, advanced fields collapsed,
   notices condensed, language toggle added. */
function customerHome(){
 const t=tcT;
 const lang=tcLang();
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
 app().innerHTML=card(t("title"),`
  <div style="display:flex;justify-content:flex-end;gap:6px;margin-bottom:10px">
   <button onclick="tcSetLang('en')" style="padding:4px 10px;font-size:12px;border-radius:14px;border:1px solid #c9d4dc;background:${lang==="en"?"#0b6b78":"#fff"};color:${lang==="en"?"#fff":"#333"}">English</button>
   <button onclick="tcSetLang('ml')" style="padding:4px 10px;font-size:12px;border-radius:14px;border:1px solid #c9d4dc;background:${lang==="ml"?"#0b6b78":"#fff"};color:${lang==="ml"?"#fff":"#333"}">മലയാളം</button>
  </div>
  <p class="muted">${t("subtitle")}</p>
  <div style="cursor:pointer;color:#0b6b78;font-size:13px;font-weight:600;margin-bottom:8px" onclick="tcToggleInfo()">${t("infoShort")}</div>
  <div id="custInfoBox" style="display:none;margin-bottom:12px">
   <div class="notice" style="font-size:12.5px">${t("howToUse")}</div>
   <div class="danger" style="background:#fdeceb;border:1px solid #e6b0aa;border-radius:8px;padding:10px;margin:8px 0;font-size:12px">&#9888;&#65039; ${t("disclaimer")}</div>
   <p class="muted" style="font-size:11px">&#128736;&#65039; ${t("underDev")}</p>
  </div>

  <div class="grid">
   <label>${t("category")}<select id="custCat">${cat}</select></label>
   <label>${t("tripType")}<select id="custType" onchange="tcCustTypeChanged()">
     <option value="local">${t("local")}</option>
     <option value="one_day">${t("oneDay")}</option>
     <option value="multiday">${t("multiday")}</option>
     <option value="drop">${t("drop")}</option>
   </select></label>
   <label>${t("pickup")}<input id="custPickup" placeholder="e.g. Valayam"></label>
   <label>${t("dest")} 1<input id="custDest" placeholder="e.g. Vadakara"></label>
  </div>
  <div id="custStopsContainer"></div>
  <div class="actions"><button type="button" onclick="tcAddCustDestField()">${t("addDest")}</button></div>

  <div class="grid" style="margin-top:8px">
   <label>${t("km")} <span class="muted" style="font-weight:normal;font-size:11px">(garage→pickup→destinations→garage)</span><input id="custKm" type="number" value="80"></label>
   <label>${t("hours")}<input id="custHours" type="number" value="8"></label>
  </div>

  <div class="actions" style="margin-top:6px"><button id="custMoreBtn" type="button" onclick="tcToggleMoreOptions()" style="background:none;border:none;color:#0b6b78;font-weight:600;padding:4px 0">▸ ${t("moreOptions")}</button></div>
  <div id="custMoreOptions" style="display:none">
   <div class="grid">
    <label>${t("vehicleStart")}<input id="custVehicleStart" placeholder="e.g. Nadapuram"></label>
    <label>${t("vehicleClose")}<input id="custVehicleClose" placeholder="e.g. Nadapuram"></label>
    <label>${t("days")}<input id="custDays" type="number" value="1" min="1"></label>
   </div>
   <div class="actions"><button type="button" onclick="tcOpenCustomerRoute()">&#128663; ${t("openMaps")}</button></div>
  </div>

  <div class="actions" style="margin-top:12px"><button class="primary" onclick="tcCalcCustomerFare()">${t("calculate")}</button></div>
  <div id="custFareResult" class="ratebox"></div>
  <hr>
  <div class="actions"><button onclick="view('activeboard')">&#128663; ${t("browseVehicles")}</button></div>
  <div class="actions" style="margin-top:8px"><button onclick="tcOpenDirectory()">&#128269; ${t("directory")}</button></div>
  <hr>
  <h3>&#128172; ${t("feedback")}</h3>
  <p class="muted">${t("feedbackSub")}</p>
  <label>${t("yourMsg")}<textarea id="custFeedback" rows="3"></textarea></label>
  <div class="actions"><button onclick="tcSendFeedback()">${t("send")}</button></div>
  <div class="actions" style="margin-top:10px"><button class="danger" onclick="logout()">${t("logout")}</button></div>
 `);
}

/* ---------- STICKY SEARCH BOX ----------
   Redefines tcRenderDirectory()/activeBoard() again to wrap the search
   inputs in a sticky container - stays visible at the top while scrolling
   through a long results list, instead of needing to scroll back up to
   change the search. */
async function tcRenderDirectory(){
 const typeOptions=`<option value="">All types</option>`+Object.entries(TC_BUSINESS_TYPES).map(([k,label])=>`<option value="${k}">${label}</option>`).join("")+`<option value="other">Other</option>`;
 app().innerHTML=card("Local Directory",`
  <p class="muted">Search verified local businesses - taxis, autos, restaurants, workshops and more.</p>
  <div style="position:sticky;top:0;background:#fff;z-index:5;padding:8px 0;margin:-4px 0 8px">
   <div class="grid">
    <label>Category<select id="tcDirType" onchange="tcFilterDirectory()">${typeOptions}</select></label>
    <label>Business name, town or pincode<input id="tcDirSearch" placeholder="e.g. Hotel Anugraha, Vadakara, 673001" oninput="tcFilterDirectory()"></label>
   </div>
  </div>
  <div id="tcDirList">Loading...</div>`);
 try{
  const res=await fetch("/api/partners?action=directory");
  const data=await res.json();
  _tcDirectoryEntries=(data.ok&&data.partners)?data.partners:[];
  tcRenderDirectoryList(_tcDirectoryEntries);
 }catch(e){document.querySelector("#tcDirList").innerHTML="<p class='danger'>Network error.</p>"}
}
async function activeBoard(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("Active Vehicles Board",`<p class="muted">Vehicles other travel partners have marked ready for a trip right now.</p>
 <div style="position:sticky;top:0;background:#fff;z-index:5;padding:8px 0;margin:-4px 0 8px">
  <label>Search by town / pincode<input id="tcBoardSearch" placeholder="e.g. Kozhikode, Vadakara, 673001" oninput="tcFilterActiveBoard()"></label>
 </div>
 <div id="activeBoardList">Loading...</div>`);
 try{
  const res=await fetch("/api/vehicles?action=active");
  const data=await res.json();
  _tcActiveBoardVehicles=(data.ok&&data.vehicles)?data.vehicles:[];
  tcRenderActiveBoardList(_tcActiveBoardVehicles);
 }catch(e){document.querySelector("#activeBoardList").innerHTML="<p class='danger'>Network error.</p>"}
}

/* ---------- FIX: position:sticky WASN'T STICKING (use position:fixed instead) ----------
   position:sticky silently fails if ANY ancestor element has an overflow
   setting other than "visible" - a common, hard-to-spot CSS gotcha. This
   switches to position:fixed instead, calibrated via JS to sit exactly
   below the app's own persistent header (.top), which is reliable
   regardless of any ancestor's overflow setting. A spacer div of the same
   height is inserted right after it so the fixed bar never overlaps the
   content below it. */
function tcMakeFixedBar(barId,spacerId){
 const bar=document.querySelector("#"+barId);
 const header=document.querySelector(".top");
 if(!bar||!header) return;
 /* The spacer must be placed at the bar's ORIGINAL spot (inside #app,
    where it renders normally in the page flow) BEFORE the bar itself gets
    moved out to <body> below - otherwise the spacer would land in the
    wrong place and the content below would jump up under the fixed bar. */
 let spacer=document.querySelector("#"+spacerId);
 if(!spacer){
  spacer=document.createElement("div");
  spacer.id=spacerId;
  bar.after(spacer);
 }
 /* #app gets a CSS "transform" applied during page-transition animations
    (setupPageTransitions()) - ANY ancestor with a transform creates a new
    "containing block" for position:fixed descendants, silently turning
    "fixed" into "fixed relative to that ancestor" instead of the actual
    viewport. That's why this kept scrolling away with the page instead of
    staying put. Moving the bar to be a DIRECT CHILD OF <body> (outside
    #app entirely) sidesteps that ancestor and its transform completely. */
 if(bar.parentElement!==document.body) document.body.appendChild(bar);
 const headerHeight=header.getBoundingClientRect().height;
 bar.style.position="fixed";
 bar.style.top=headerHeight+"px";
 bar.style.left="0";
 bar.style.right="0";
 bar.style.zIndex="50";
 bar.style.background="#fff";
 bar.style.boxShadow="0 2px 6px rgba(0,0,0,.08)";
 bar.style.padding="10px 16px";
 bar.style.boxSizing="border-box";
 const barHeight=bar.getBoundingClientRect().height;
 spacer.style.height=barHeight+"px";
}

/* Redefines customerHome() again - language toggle now sits in a fixed bar
   at the very top (below the app header), not affected by page scroll. */
function customerHome(){
 /* Any fixed bar from a PREVIOUS page (moved out to <body> by
    tcMakeFixedBar) has to be explicitly removed here - it lives outside
    #app now, so simply re-rendering #app's content does not clear it on
    its own, and a stale bar/spacer left over from the last page could
    shadow or duplicate the new one. */
 document.querySelector("#custLangBar")?.remove();
 document.querySelector("#custLangBarSpacer")?.remove();
 document.querySelector("#custSearchBar")?.remove();
 document.querySelector("#custSearchBarSpacer")?.remove();
 const t=tcT;
 const lang=tcLang();
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
 app().innerHTML=card(t("title"),`
  <div id="custLangBar" style="display:flex;justify-content:flex-end;gap:6px">
   <button onclick="tcSetLang('en')" style="padding:4px 10px;font-size:12px;border-radius:14px;border:1px solid #c9d4dc;background:${lang==="en"?"#0b6b78":"#fff"};color:${lang==="en"?"#fff":"#333"}">English</button>
   <button onclick="tcSetLang('ml')" style="padding:4px 10px;font-size:12px;border-radius:14px;border:1px solid #c9d4dc;background:${lang==="ml"?"#0b6b78":"#fff"};color:${lang==="ml"?"#fff":"#333"}">മലയാളം</button>
  </div>
  <div id="custLangBarSpacer"></div>
  <p class="muted">${t("subtitle")}</p>
  <div style="cursor:pointer;color:#0b6b78;font-size:13px;font-weight:600;margin-bottom:8px" onclick="tcToggleInfo()">${t("infoShort")}</div>
  <div id="custInfoBox" style="display:none;margin-bottom:12px">
   <div class="notice" style="font-size:12.5px">${t("howToUse")}</div>
   <div class="danger" style="background:#fdeceb;border:1px solid #e6b0aa;border-radius:8px;padding:10px;margin:8px 0;font-size:12px">&#9888;&#65039; ${t("disclaimer")}</div>
   <p class="muted" style="font-size:11px">&#128736;&#65039; ${t("underDev")}</p>
  </div>

  <div class="grid">
   <label>${t("category")}<select id="custCat"><option value="" selected disabled>-- Select --</option>${cat}</select></label>
   <label>${t("tripType")}<select id="custType" onchange="tcCustTypeChanged()">
     <option value="local">${t("local")}</option>
     <option value="one_day">${t("oneDay")}</option>
     <option value="multiday">${t("multiday")}</option>
     <option value="drop">${t("drop")}</option>
   </select></label>
   <label>${t("pickup")}<input id="custPickup" placeholder="e.g. Valayam"></label>
   <label>${t("dest")} 1<input id="custDest" placeholder="e.g. Vadakara"></label>
  </div>
  <div id="custStopsContainer"></div>
  <div class="actions"><button type="button" onclick="tcAddCustDestField()">${t("addDest")}</button></div>

  <div class="grid" style="margin-top:8px">
   <label>${t("km")} <span class="muted" style="font-weight:normal;font-size:11px">(garage→pickup→destinations→garage)</span><input id="custKm" type="number" value="80"></label>
   <label>${t("hours")}<input id="custHours" type="number" value="8"></label>
  </div>

  <div class="actions" style="margin-top:6px"><button id="custMoreBtn" type="button" onclick="tcToggleMoreOptions()" style="background:#eef6ff;border:1px solid #3b7bbf;color:#3b7bbf;font-weight:700;padding:8px 14px;border-radius:8px">&#9660; ${t("moreOptions")}</button></div>
  <div id="custMoreOptions" style="display:none">
   <div class="grid">
    <label>${t("vehicleStart")}<input id="custVehicleStart" placeholder="e.g. Nadapuram"></label>
    <label>${t("vehicleClose")}<input id="custVehicleClose" placeholder="e.g. Nadapuram"></label>
    <label>${t("days")}<input id="custDays" type="number" value="1" min="1"></label>
   </div>
   <div class="actions"><button type="button" onclick="tcOpenCustomerRoute()">&#128663; ${t("openMaps")}</button></div>
  </div>

  <div class="actions" style="margin-top:12px"><button class="primary" onclick="tcCalcCustomerFare()">${t("calculate")}</button></div>
  <div id="custFareResult" class="ratebox"></div>
  <hr>
  <div class="actions"><button onclick="view('activeboard')">&#128663; ${t("browseVehicles")}</button></div>
  <div class="actions" style="margin-top:8px"><button onclick="tcOpenDirectory()">&#128269; ${t("directory")}</button></div>
  <hr>
  <h3>&#128172; ${t("feedback")}</h3>
  <p class="muted">${t("feedbackSub")}</p>
  <label>${t("yourMsg")}<textarea id="custFeedback" rows="3"></textarea></label>
  <div class="actions"><button onclick="tcSendFeedback()">${t("send")}</button></div>
  <div class="actions" style="margin-top:10px"><button class="danger" onclick="logout()">${t("logout")}</button></div>
 `);
 setTimeout(()=>tcMakeFixedBar("custLangBar","custLangBarSpacer"),0);
}

/* Redefines tcRenderDirectory()/activeBoard() again - search box now uses
   the same fixed-bar approach (position:sticky wasn't taking effect). */
async function tcRenderDirectory(){
 document.querySelector("#custLangBar")?.remove();
 document.querySelector("#custLangBarSpacer")?.remove();
 document.querySelector("#custSearchBar")?.remove();
 document.querySelector("#custSearchBarSpacer")?.remove();
 const typeOptions=`<option value="">All types</option>`+Object.entries(TC_BUSINESS_TYPES).map(([k,label])=>`<option value="${k}">${label}</option>`).join("")+`<option value="other">Other</option>`;
 app().innerHTML=card("Local Directory",`
  <div id="custSearchBar" class="grid">
   <label>Category<select id="tcDirType" onchange="tcFilterDirectory()">${typeOptions}</select></label>
   <label>Business name, town or pincode<input id="tcDirSearch" placeholder="e.g. Hotel Anugraha, Vadakara, 673001" oninput="tcFilterDirectory()"></label>
  </div>
  <div id="custSearchBarSpacer"></div>
  <p class="muted">Search verified local businesses - taxis, autos, restaurants, workshops and more.</p>
  <div id="tcDirList">Loading...</div>`);
 setTimeout(()=>tcMakeFixedBar("custSearchBar","custSearchBarSpacer"),0);
 try{
  const res=await fetch("/api/partners?action=directory");
  const data=await res.json();
  _tcDirectoryEntries=(data.ok&&data.partners)?data.partners:[];
  tcRenderDirectoryList(_tcDirectoryEntries);
 }catch(e){document.querySelector("#tcDirList").innerHTML="<p class='danger'>Network error.</p>"}
}
async function activeBoard(){
 if(!getCurrentUser()){renderLogin();return;}
 document.querySelector("#custLangBar")?.remove();
 document.querySelector("#custLangBarSpacer")?.remove();
 document.querySelector("#custSearchBar")?.remove();
 document.querySelector("#custSearchBarSpacer")?.remove();
 app().innerHTML=card("Active Vehicles Board",`
 <div id="custSearchBar">
  <label>Search by town / pincode<input id="tcBoardSearch" placeholder="e.g. Kozhikode, Vadakara, 673001" oninput="tcFilterActiveBoard()"></label>
 </div>
 <div id="custSearchBarSpacer"></div>
 <p class="muted">Vehicles other travel partners have marked ready for a trip right now.</p>
 <div id="activeBoardList">Loading...</div>`);
 setTimeout(()=>tcMakeFixedBar("custSearchBar","custSearchBarSpacer"),0);
 try{
  const res=await fetch("/api/vehicles?action=active");
  const data=await res.json();
  _tcActiveBoardVehicles=(data.ok&&data.vehicles)?data.vehicles:[];
  tcRenderActiveBoardList(_tcActiveBoardVehicles);
 }catch(e){document.querySelector("#activeBoardList").innerHTML="<p class='danger'>Network error.</p>"}
}

/* ---------- VEHICLE CATEGORY: NO SILENT DEFAULT + VALIDATION ----------
   The category dropdown now starts on a disabled "-- Select --" placeholder
   (not silently defaulting to the first real category) - a customer must
   consciously pick one. If they try to Calculate without picking, the
   field turns red with a warning instead of quietly calculating using
   whatever the first option happened to be. Wraps tcCalcCustomerFare()
   (defined earlier, in whichever file set up the customer fare calculator)
   using the same safe IIFE + function-expression pattern as the
   quotations()/loadBill() wrapper above - a plain "function
   tcCalcCustomerFare(){}" here would get hoisted and cause the same
   infinite-recursion bug we already fixed once. */
(function(){
 const orig=tcCalcCustomerFare;
 tcCalcCustomerFare=function(){
  const catEl=document.querySelector("#custCat");
  let warn=document.querySelector("#custCatWarn");
  if(catEl&&!catEl.value){
   catEl.style.border="2px solid #c0392b";
   catEl.style.background="#fdeceb";
   if(!warn){
    warn=document.createElement("div");
    warn.id="custCatWarn";
    warn.style.cssText="color:#c0392b;font-size:12px;margin-top:-8px;margin-bottom:8px;font-weight:600";
    catEl.parentElement.after(warn);
   }
   warn.textContent=(tcLang()==="ml")?"\u2b06\ufe0f \u0d26\u0dba\u0d35\u0d3e\u0d2f\u0d3f \u0d35\u0d3e\u0d39\u0d28 \u0d35\u0d3f\u0d2d\u0d3e\u0d17\u0d02 \u0d24\u0d3f\u0d30\u0d1e\u0d4d\u0d1e\u0d46\u0d1f\u0d41\u0d15\u0d4d\u0d15\u0d41\u0d15":"\u2b06\ufe0f Please select a vehicle category";
   catEl.scrollIntoView({behavior:"smooth",block:"center"});
   catEl.focus();
   return;
  }
  if(catEl){ catEl.style.border=""; catEl.style.background=""; }
  if(warn) warn.remove();
  orig();
 };
})();

/* ---------- EMERGENCY CONTACTS (Police / Ambulance / Fire / Hospitals etc.) ----------
   A small, admin-curated list (separate from the self-registered Local
   Directory, since a police station or fire service would never
   self-register) - shown with click-to-call numbers to EVERYONE
   (customers, partners, the owner), and manageable (add/remove) only by
   the admin. */
async function tcRenderEmergencyContacts(boxId){
 const box=document.querySelector("#"+boxId);
 if(!box) return;
 try{
  const res=await fetch("/api/emergency");
  const data=await res.json();
  if(!data.ok||!data.contacts.length){ box.innerHTML="<p class='muted' style='font-size:12px'>No emergency contacts added yet.</p>"; return; }
  box.innerHTML=data.contacts.map(c=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #eee">
   <div><b>${esc(c.name)}</b>${c.category?` <span class="muted" style="font-size:11px">(${esc(c.category)})</span>`:""}</div>
   <a href="tel:${esc(c.number)}"><button class="danger">&#128222; ${esc(c.number)}</button></a>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger' style='font-size:12px'>Could not load emergency contacts.</p>"; }
}

/* Redefines customerHome() again to add an Emergency Contacts card near
   the top (right after the language bar / subtitle), since this is
   safety-relevant and should not require scrolling to find. */
(function(){
 const orig=customerHome;
 customerHome=function(){
  orig();
  const anchor=document.querySelector("#custLangBarSpacer");
  if(anchor&&!document.querySelector("#custEmergencyBox")){
   const box=document.createElement("div");
   box.style.cssText="background:#fff5f5;border:2px solid #c0392b;border-radius:8px;padding:10px;margin:10px 0";
   box.innerHTML=`<div style="font-weight:bold;color:#c0392b;font-size:13px;margin-bottom:4px">&#9888;&#65039; Emergency Contacts</div><div id="custEmergencyList">Loading...</div>`;
   anchor.after(box);
   box.id="custEmergencyBox";
   tcRenderEmergencyContacts("custEmergencyList");
  }
 };
})();

/* Admin management UI: adds an "Emergency Contacts" section to the admin
   page (below the existing sections there) - list with delete, plus a
   simple add form. */
function tcOpenEmergencyAdmin(){ requireAdmin(tcRenderEmergencyAdmin); }
async function tcRenderEmergencyAdmin(){
 modal(`<h2>Emergency Contacts</h2>
  <p class="muted">Police, Ambulance, Fire Force, hospitals, or any other emergency/utility number - visible to everyone in the app.</p>
  <div class="grid">
   <label>Name<input id="ecName" placeholder="e.g. Police Control Room"></label>
   <label>Number<input id="ecNumber" placeholder="e.g. 100"></label>
   <label>Category (optional)<input id="ecCategory" placeholder="e.g. Police / Ambulance / Fire / Hospital"></label>
  </div>
  <div class="actions"><button class="primary" onclick="tcAddEmergencyContact()">Add</button></div>
  <div id="ecAdminList" style="margin-top:12px">Loading...</div>`);
 tcLoadEmergencyAdminList();
}
async function tcLoadEmergencyAdminList(){
 const box=document.querySelector("#ecAdminList");
 if(!box) return;
 try{
  const res=await fetch("/api/emergency");
  const data=await res.json();
  if(!data.ok||!data.contacts.length){ box.innerHTML="<p class='muted'>No contacts added yet.</p>"; return; }
  box.innerHTML=data.contacts.map(c=>`<div class="listitem">
   <b>${esc(c.name)}</b> - ${esc(c.number)} ${c.category?`<span class="muted">(${esc(c.category)})</span>`:""}
   <div class="actions"><button class="danger" onclick="tcDeleteEmergencyContact(${c.id})">Delete</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function tcAddEmergencyContact(){
 const name=document.querySelector("#ecName").value.trim();
 const number=document.querySelector("#ecNumber").value.trim();
 const category=document.querySelector("#ecCategory").value.trim();
 if(!name||!number){ toast("Enter name and number"); return; }
 try{
  await fetch("/api/emergency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"add",name,number,category,token:adminToken()})});
  toast("Contact added");
  document.querySelector("#ecName").value="";
  document.querySelector("#ecNumber").value="";
  document.querySelector("#ecCategory").value="";
  tcLoadEmergencyAdminList();
 }catch(e){ toast("Network error"); }
}
async function tcDeleteEmergencyContact(id){
 if(!confirm("Delete this contact?")) return;
 try{
  await fetch("/api/emergency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"delete",id,token:adminToken()})});
  toast("Deleted");
  tcLoadEmergencyAdminList();
 }catch(e){ toast("Network error"); }
}

/* Adds an "Emergency Contacts" management link to the admin page - wraps
   admin() (already defined elsewhere) the same safe way, appending a card
   rather than duplicating the whole large function. */
(function(){
 const orig=admin;
 admin=function(){
  orig();
  const container=document.querySelector(".card");
  if(container&&!document.querySelector("#ecAdminLinkCard")){
   const card=document.createElement("div");
   card.id="ecAdminLinkCard";
   card.className="card";
   card.innerHTML=`<h3>Emergency Contacts</h3><p class="muted">Police, Ambulance, Fire Force and other emergency/utility numbers shown to everyone in the app.</p><div class="actions"><button onclick="tcOpenEmergencyAdmin()">Manage Emergency Contacts</button></div>`;
   container.appendChild(document.createElement("hr"));
   container.appendChild(card);
  }
 };
})();

/* ---------- TRIP TYPE: SAME "NO SILENT DEFAULT" TREATMENT ----------
   Redefines customerHome() again to add a placeholder to the Trip Type
   dropdown too (it silently defaulted to "Local Trip" the same way
   Vehicle Category did), and extends the tcCalcCustomerFare() validation
   wrapper to also check Trip Type. */
(function(){
 const orig=customerHome;
 customerHome=function(){
  orig();
  const typeEl=document.querySelector("#custType");
  if(typeEl&&!document.querySelector("#custType option[value='']")){
   const placeholder=document.createElement("option");
   placeholder.value="";
   placeholder.disabled=true;
   placeholder.textContent="-- "+((tcLang()==="ml")?"തിരഞ്ഞെടുക്കുക":"Select")+" --";
   typeEl.insertBefore(placeholder,typeEl.firstChild);
   typeEl.value=""; /* reliably forces the placeholder to show as selected - see the same fix on the login page's dropdown for why */
  }
 };
})();
(function(){
 const orig=tcCalcCustomerFare;
 tcCalcCustomerFare=function(){
  const typeEl=document.querySelector("#custType");
  let typeWarn=document.querySelector("#custTypeWarn");
  if(typeEl&&!typeEl.value){
   typeEl.style.border="2px solid #c0392b";
   typeEl.style.background="#fdeceb";
   if(!typeWarn){
    typeWarn=document.createElement("div");
    typeWarn.id="custTypeWarn";
    typeWarn.style.cssText="color:#c0392b;font-size:12px;margin-top:-8px;margin-bottom:8px;font-weight:600";
    typeEl.parentElement.after(typeWarn);
   }
   typeWarn.textContent=(tcLang()==="ml")?"\u2b06\ufe0f \u0d26\u0dba\u0d35\u0d3e\u0d2f\u0d3f \u0d2f\u0d3e\u0d24\u0d4d\u0d30\u0d3e \u0d24\u0d30\u0d02 \u0d24\u0d3f\u0d30\u0d1e\u0d4d\u0d1e\u0d46\u0d1f\u0d41\u0d15\u0d4d\u0d15\u0d41\u0d15":"\u2b06\ufe0f Please select a trip type";
   typeEl.scrollIntoView({behavior:"smooth",block:"center"});
   typeEl.focus();
   return;
  }
  if(typeEl){ typeEl.style.border=""; typeEl.style.background=""; }
  if(typeWarn) typeWarn.remove();
  orig();
 };
})();

/* ---------- EMERGENCY CONTACTS on Owner/Partner pages too ----------
   Adds the same Emergency Contacts box to dashboard() (Taxi/Travel Agency
   owner) and renderPartnerDashboard() (every other business type) - not
   just the Customer page. */
(function(){
 const orig=dashboard;
 dashboard=function(){
  orig();
  const container=document.querySelector(".card");
  if(container&&!document.querySelector("#ownerEmergencyBox")){
   const box=document.createElement("div");
   box.id="ownerEmergencyBox";
   box.style.cssText="background:#fff5f5;border:2px solid #c0392b;border-radius:8px;padding:10px;margin-bottom:14px";
   box.innerHTML=`<div style="font-weight:bold;color:#c0392b;font-size:13px;margin-bottom:4px">&#9888;&#65039; Emergency Contacts</div><div id="ownerEmergencyList">Loading...</div>`;
   const firstChild=container.firstElementChild;
   if(firstChild) container.insertBefore(box,firstChild); else container.appendChild(box);
   tcRenderEmergencyContacts("ownerEmergencyList");
  }
 };
})();
(function(){
 const orig=renderPartnerDashboard;
 renderPartnerDashboard=function(p){
  orig(p);
  const box=document.querySelector("#partnerBox");
  if(box&&!document.querySelector("#ownerEmergencyBox")){
   const wrap=document.createElement("div");
   wrap.id="ownerEmergencyBox";
   wrap.style.cssText="background:#fff5f5;border:2px solid #c0392b;border-radius:8px;padding:10px;margin-bottom:14px";
   wrap.innerHTML=`<div style="font-weight:bold;color:#c0392b;font-size:13px;margin-bottom:4px">&#9888;&#65039; Emergency Contacts</div><div id="ownerEmergencyList">Loading...</div>`;
   box.insertBefore(wrap,box.firstChild);
   tcRenderEmergencyContacts("ownerEmergencyList");
  }
 };
})();

/* ---------- FIX: STALE CACHED BUSINESS TYPE AFTER CATEGORY CHANGE ----------
   dashboard() only called partnerView() (which re-fetches business_type
   from the server) when db.settings.myBusinessType was NULL/unset - once
   it had ANY value cached (e.g. "taxi_travel" from before), it trusted
   that cache forever, even after the category was later changed via Edit
   Details. This made a device stuck showing the old category's page
   indefinitely after a category change, until something else happened to
   trigger a fresh partnerView() call. Fix: verify against the server
   ONCE per app session (tracked in a plain JS variable, not persisted -
   so it naturally resets on every fresh app open/reload) instead of only
   on the very first-ever login. Subsequent dashboard() calls within the
   SAME session skip the extra round-trip, so this doesn't add a network
   call on every navigation - just once after each fresh app launch. */
let _tcSessionVerified=false;
(function(){
 const origDash=dashboard;
 dashboard=function(){
  if(!_tcSessionVerified){
   partnerView();
   return;
  }
  origDash();
 };
})();
(function(){
 const origPV=partnerView;
 partnerView=async function(){
  /* Set BEFORE the fetch, not after - partnerView() itself calls
     dashboard() internally when confirmedType is taxi_travel (to route to
     the full dashboard right after verifying) - if this flag were only
     set AFTER partnerView() finishes, that internal dashboard() call would
     see _tcSessionVerified still false and call partnerView() AGAIN,
     causing a redundant double-fetch (or worse, a loop). */
  _tcSessionVerified=true;
  await origPV();
 };
})();

/* ---------- FIX: taxi partners stuck on simple profile page ----------
   Yesterday's session-verification fix made dashboard() route through
   partnerView() on every fresh app session, not just the very first-ever
   login. partnerView()'s original "route to the full dashboard" branch
   only fired when wasUnknown was true (myBusinessType had never been
   cached before) - correct for a first-ever login, but wrong now: a
   RETURNING taxi partner already has "taxi_travel" cached from a previous
   session, so wasUnknown is false, and they fell through to the simple
   profile page instead of their actual Quotation/Billing dashboard (which
   is also why the Emergency Contacts box, added to dashboard() but not
   yet rendering, appeared to have vanished). Fix: partnerView() now takes
   an explicit "fromDashboardCheck" argument - true only when dashboard()
   itself calls it (meaning the user's actual intent is to see the
   dashboard) - and routes to the dashboard whenever that flag is set,
   regardless of whether the type was already cached. A direct navigation
   to "Travel Partner / Vehicles" (view('partner')) still calls
   partnerView() with no argument, so a taxi partner explicitly choosing
   that menu item still correctly sees their profile/vehicles page. This
   fully replaces both the dashboard() and partnerView() wrappers set up
   just above - defining them directly (not wrapping again) since their
   internal logic itself needs to change, not just have something added
   around it. */
const _tcRealDashboard=dashboard;
dashboard=function(){
 if(!_tcSessionVerified){
  partnerView(true);
  return;
 }
 _tcRealDashboard();
};
partnerView=async function(fromDashboardCheck){
 _tcSessionVerified=true;
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
   if(confirmedType==="taxi_travel"&&(wasUnknown||fromDashboardCheck)){
    _tcRealDashboard();
    return;
   }
   renderPartnerDashboard(data.partner);
  }
 }catch(e){
  document.querySelector("#partnerBox").innerHTML="<p class='danger'>Network error - check your connection and try again.</p>";
 }
};

/* ---------- LOGIN PAGE: BUSINESS TYPE - NO SILENT DEFAULT ----------
   The login page's "What kind of business?" dropdown always defaulted to
   "Taxi / Travel Agency" (tcBusinessTypeOptions()'s own fallback, shared
   with the registration/edit forms where a sensible default is fine since
   the person has already chosen to register by then). On the LOGIN page
   specifically, someone who hasn't consciously picked their category yet
   could submit with the wrong one silently selected. This adds a "--
   Select --" placeholder there (only there, not the registration/edit
   forms), and blocks login with a warning if a Business Owner tries to
   continue without picking one. */
(function(){
 const orig=renderLogin;
 renderLogin=function(){
  orig();
  const sel=document.querySelector("#loginBizType");
  if(sel&&!document.querySelector("#loginBizType option[value='']")){
   const placeholder=document.createElement("option");
   placeholder.value="";
   placeholder.disabled=true;
   placeholder.textContent="-- Select --";
   sel.insertBefore(placeholder,sel.firstChild);
   /* Setting .selected=true on a DETACHED option (before it's inserted
      into the <select>) is not guaranteed to correctly override an
      option that already has the "selected" HTML attribute (like
      "taxi_travel" here, from tcBusinessTypeOptions()'s own default) -
      setting sel.value AFTER insertion is the reliable, spec-guaranteed
      way to force which option is actually showing as selected. */
   sel.value="";
  }
 };
})();
(function(){
 const orig=submitLogin;
 submitLogin=function(inviteToken){
  const role=document.querySelector('input[name="loginRole"]:checked')?.value||"owner";
  const bizSel=document.querySelector("#loginBizType");
  if(role==="owner"&&bizSel&&!bizSel.value){
   let warn=document.querySelector("#loginBizTypeWarn");
   if(!warn){
    warn=document.createElement("div");
    warn.id="loginBizTypeWarn";
    warn.style.cssText="color:#c0392b;font-size:12px;margin-top:-6px;margin-bottom:8px;font-weight:600";
    bizSel.parentElement.after(warn);
   }
   warn.textContent="\u2b06\ufe0f Please select what kind of business you have";
   bizSel.style.border="2px solid #c0392b";
   bizSel.scrollIntoView({behavior:"smooth",block:"center"});
   return;
  }
  orig(inviteToken);
 };
})();

/* ---------- LOGIN PAGE: ROLE - NO SILENT DEFAULT EITHER ----------
   "Business Owner" was always pre-checked (radio, from the original
   renderLogin() template) - a Customer downloading the app and not paying
   close attention could accidentally submit as a Business Owner. This
   un-checks both radios on render, and blocks Continue with a warning
   until the person has consciously picked one. tcToggleLoginBizType()
   (already defined elsewhere) shows/hides the Business Type section based
   on the checked radio's value - with neither checked initially, it's
   called once here too so the Business Type section starts correctly
   hidden until a role is chosen, matching what it would already do if the
   person picked "Customer". */
(function(){
 const orig=renderLogin;
 renderLogin=function(){
  orig();
  document.querySelectorAll('input[name="loginRole"]').forEach(r=>{ r.checked=false; });
  if(typeof tcToggleLoginBizType==="function") tcToggleLoginBizType();
 };
})();
(function(){
 const orig=submitLogin;
 submitLogin=function(inviteToken){
  const checked=document.querySelector('input[name="loginRole"]:checked');
  if(!checked){
   let warn=document.querySelector("#loginRoleWarn");
   const roleGroup=document.querySelector('input[name="loginRole"]')?.closest("div");
   if(!warn&&roleGroup){
    warn=document.createElement("div");
    warn.id="loginRoleWarn";
    warn.style.cssText="color:#c0392b;font-size:12px;margin:6px 0;font-weight:600";
    roleGroup.after(warn);
   }
   if(warn){
    warn.textContent="\u2b06\ufe0f Please choose Business Owner or Customer";
    warn.scrollIntoView({behavior:"smooth",block:"center"});
   }
   return;
  }
  const warn=document.querySelector("#loginRoleWarn");
  if(warn) warn.remove();
  orig(inviteToken);
 };
})();

/* This file loads LAST, so this trailing render() call makes the very
   first page paint use EVERY override above (login page's "no silent
   default" fixes for role/business type, business category, etc.) instead
   of whatever render() call already ran earlier (app-updates-4.js's own
   trailing render()) before these fixes existed - same reasoning as that
   file's own trailing render() call for the same class of bug. */

/* ---------- DELETE PENDING PARTNER ----------
   Adds a Delete button next to Approve on the admin's "Pending Travel
   Partners" list - for cleaning up registrations the admin never intends
   to approve (e.g. an unauthorized number that somehow reached the
   register form). Wraps doLoadPendingPartners() (already in app.js) to
   inject the button, rather than duplicating that function. */
(function(){
 const orig=doLoadPendingPartners;
 doLoadPendingPartners=async function(){
  await orig();
  document.querySelectorAll('[onclick^="approvePartner("]').forEach(btn=>{
   const m=(btn.getAttribute("onclick")||"").match(/approvePartner\((\d+)\)/);
   if(m&&!btn.nextElementSibling){
    const delBtn=document.createElement("button");
    delBtn.className="danger";
    delBtn.textContent="Delete";
    delBtn.onclick=()=>tcDeletePendingPartner(m[1]);
    btn.after(delBtn);
   }
  });
 };
})();
async function tcDeletePendingPartner(id){
 if(!confirm("Delete this pending partner registration? This cannot be undone.")) return;
 try{
  await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"delete",partner_id:id,token:adminToken()})});
  toast("Partner registration deleted");
  doLoadPendingPartners();
 }catch(e){ toast("Network error"); }
}
/* ---------- FIX: CUSTOMERS SENT TO BUSINESS OWNER'S DASHBOARD ----------
   dashboard() (redefined above for the taxi-partner session-verification
   fix) never checked whether the CURRENT USER is actually a Customer - it
   always ran the business-owner routing chain (partnerView/full
   dashboard), regardless of role. A Customer tapping "Dashboard" in the
   top nav (or landing on the default empty hash, which resolves to
   "dashboard") ended up seeing the business owner's page (e.g. "Krishna
   Tours & Travels") instead of their own Fare Estimate page. This checks
   the logged-in user's role FIRST, before any of that business-owner
   logic, and routes straight to customerHome() when it's a customer. */
(function(){
 const origDash=dashboard;
 dashboard=function(){
  const user=getCurrentUser();
  if(user&&user.role==="customer"){ customerHome(); return; }
  origDash();
 };
})();

/* ---------- FIX: DELETE SHOWS "SUCCESS" EVEN WHEN IT FAILS ----------
   tcDeletePendingPartner() never checked the server's actual response -
   it always showed "Partner registration deleted" as long as the fetch
   request itself didn't throw (e.g. no network error), regardless of
   whether the server actually deleted anything. If the delete silently
   failed server-side (wrong/expired admin token, etc.), the person saw a
   false "success" message while the record stayed exactly where it was.
   This checks data.ok and shows the REAL error when it fails, instead of
   masking it - which will also help pin down why this specific delete is
   failing, once retried. */
async function tcDeletePendingPartner(id){
 if(!confirm("Delete this pending partner registration? This cannot be undone.")) return;
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"delete",partner_id:id,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){
   toast("Could not delete: "+(data.error||"unknown error"));
   return;
  }
  toast("Partner registration deleted");
  doLoadPendingPartners();
 }catch(e){ toast("Network error"); }
}

/* ---------- FIX: STALE FIXED SEARCH/LANGUAGE BAR FOLLOWS TO OTHER PAGES ----------
   tcMakeFixedBar() moves its bar out to a direct child of <body> (to escape
   #app's page-transition transform - see that function's own comment) -
   but the cleanup that removes it was only called at the START of
   customerHome()/tcRenderDirectory()/activeBoard() themselves. Navigating
   to any OTHER page (like "Travel Partner") skipped that cleanup entirely,
   so a bar left over from a previous visit to Directory/Customer stayed
   floating fixed at the top, overlapping that page's own content, until a
   full app reload. Wrapping render() - which runs on EVERY navigation, not
   just these three pages - to always clear them first is the correct,
   universal place for this cleanup. */
(function(){
 const origRender=render;
 render=function(){
  document.querySelector("#custLangBar")?.remove();
  document.querySelector("#custLangBarSpacer")?.remove();
  document.querySelector("#custSearchBar")?.remove();
  document.querySelector("#custSearchBarSpacer")?.remove();
  origRender();
 };
})();

/* ---------- ADMIN: ALL PARTNERS (edit category / details) ----------
   Once a partner is approved, they disappear from "Pending Travel
   Partners" - there was no way for the admin to find and fix a mistake
   (like a wrong business category) after that. Adds an "All Partners"
   admin section (same pattern as the existing "All Vehicles"), with an
   Edit button per partner that opens the same business-details form a
   partner uses on themselves, but admin-authorized instead of mobile-
   ownership-authorized. */
(function(){
 const orig=admin;
 admin=function(){
  orig();
  const container=document.querySelector(".card");
  if(container&&!document.querySelector("#allPartnersAdminCard")){
   const card=document.createElement("div");
   card.id="allPartnersAdminCard";
   card.className="card";
   card.innerHTML=`<h3>All Travel Partners <span class="muted">(owner only - password protected)</span></h3><p class="muted">Find and correct any partner's details, including business category, whether verified or not.</p><div class="actions"><button onclick="tcLoadAllPartnersAdmin()">Load all partners</button></div><div id="allPartnersAdminList"></div>`;
   container.appendChild(document.createElement("hr"));
   container.appendChild(card);
  }
 };
})();
async function tcLoadAllPartnersAdmin(){
 const box=document.querySelector("#allPartnersAdminList");
 box.innerHTML="<p class='muted'>Loading...</p>";
 try{
  const res=await fetch("/api/partners?action=all&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
  if(!data.partners.length){ box.innerHTML="<p class='muted'>No partners registered yet.</p>"; return; }
  box.innerHTML=data.partners.map(p=>`<div class="listitem">
   <b>${esc(p.business_name)}</b> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">Pending</span>'} <span class="muted">${esc(tcBizLabel(p.business_type))}</span><br>
   <span class="muted">${esc(p.owner_name)} - ${esc(p.mobile1)}${p.location?" - "+esc(p.location):""}</span>
   <div class="actions"><button onclick="tcOpenAdminEditPartner(${p.id})">Edit</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
function tcOpenAdminEditPartner(id){ requireAdmin(()=>tcDoOpenAdminEditPartner(id)); }
async function tcDoOpenAdminEditPartner(id){
 try{
  const res=await fetch("/api/partners?action=all&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  const p=(data.partners||[]).find(x=>x.id===id);
  if(!p){ toast("Partner not found"); return; }
  modal(`<h2>Edit Partner (Admin)</h2>
   <div class="grid">
    <label>Business type<div>${tcBizTypeFieldHtml("adBizType","adBizTypeOther",p.business_type)}</div></label>
    <label>Business name<input id="adBizName" value="${esc(p.business_name)}"></label>
    <label>Owner name<input id="adOwnerName" value="${esc(p.owner_name)}"></label>
    <label>Mobile 2<input id="adMobile2" value="${esc(p.mobile2||"")}"></label>
    <label>Email<input id="adEmail" value="${esc(p.email||"")}"></label>
    <label>Location<input id="adLocation" value="${esc(p.location||"")}"></label>
    <label>Pincode<input id="adPincode" value="${esc(p.pincode||"")}"></label>
   </div>
   <button class="primary" onclick="tcSaveAdminEditPartner(${p.id})">Save</button>`);
 }catch(e){ toast("Network error"); }
}
async function tcSaveAdminEditPartner(id){
 const body={action:"admin_update",partner_id:id,token:adminToken(),
  business_type:tcResolveBizType("adBizType","adBizTypeOther"),
  business_name:document.querySelector("#adBizName").value,
  owner_name:document.querySelector("#adOwnerName").value,
  mobile2:document.querySelector("#adMobile2").value,
  email:document.querySelector("#adEmail").value,
  location:document.querySelector("#adLocation").value,
  pincode:document.querySelector("#adPincode").value};
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!data.ok){ toast("Could not save: "+(data.error||"unknown error")); return; }
  toast("Partner updated");
  closeModal();
  tcLoadAllPartnersAdmin();
 }catch(e){ toast("Network error"); }
}

render();



