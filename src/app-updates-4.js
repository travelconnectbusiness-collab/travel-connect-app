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
  const logoImg=(isPremiumTier&&db.settings.myLogoKey&&db.settings.myPartnerId)?`<img src="${location.origin}/api/partners?action=logo&partner_id=${db.settings.myPartnerId}" style="max-width:56px;max-height:56px;border-radius:8px;margin-bottom:4px">`:"";
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

/* ---------- LOGO/COLOR IN PDF DOWNLOADS (separate from Print) ----------
   The PDF downloads (downloadQuotePDFObj/downloadBillPDF) use their own
   jsPDF drawing code, entirely separate from tcBrandingBox()'s HTML - so
   fixing Print didn't touch PDF at all. This adds the same logo/color
   logic there: fetches the logo image as a data URL (jsPDF needs that, not
   a plain URL) and converts the brand hex color to RGB for jsPDF's color
   functions. */
async function tcFetchLogoDataUrl(){
 if(!(db.settings.myLogoKey&&db.settings.myPartnerId)) return null;
 try{
  const res=await fetch("/api/partners?action=logo&partner_id="+db.settings.myPartnerId);
  if(!res.ok) return null;
  const blob=await res.blob();
  return await new Promise(resolve=>{
   const reader=new FileReader();
   reader.onloadend=()=>resolve(reader.result);
   reader.onerror=()=>resolve(null);
   reader.readAsDataURL(blob);
  });
 }catch(e){ return null; }
}
function tcHexToRgb(hex){
 hex=(hex||"#148c76").replace("#","");
 const r=parseInt(hex.substring(0,2),16)||15, g=parseInt(hex.substring(2,4),16)||90, b=parseInt(hex.substring(4,6),16)||85;
 return [r,g,b];
}
function tcPdfBrandInfo(){
 const plan=db.settings.myPlan;
 const isPremiumTier=plan==="premium"||plan==="owner_free";
 const rgb=(isPremiumTier&&db.settings.myBrandColor)?tcHexToRgb(db.settings.myBrandColor):[15,90,85];
 return {isPremiumTier,rgb};
}

/* Redefines downloadQuotePDFObj() (already in app-updates.js) - now async,
   to await the logo image fetch before drawing the partner box. Everything
   else is unchanged from the original. */
async function downloadQuotePDFObj(q){
 const doc=pdfDoc();if(!doc)return;
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const c=db.categories[q.categoryId];

 let y=15;
 try{ doc.addImage(LOGO_DATA_URI,"PNG",15,y-3,11,11); }catch(e){}
 doc.setTextColor(70);doc.setFont(undefined,"bold");doc.setFontSize(10.5);
 doc.text((db.platform.name||"Travel Connect").toUpperCase(),29,y+1);
 doc.setFont(undefined,"normal");doc.setFontSize(7.5);doc.setTextColor(120);
 if(db.platform.tagline) doc.text(db.platform.tagline,29,y+5);
 if(db.platform.email) doc.text(db.platform.email,29,y+9);
 doc.setFont(undefined,"bold");doc.setFontSize(8);doc.setTextColor(70);
 const platformPhonesPdf=[db.platform.phone1,db.platform.phone2].filter(Boolean).join("  |  ");
 if(platformPhonesPdf) doc.text(platformPhonesPdf,195,y+1,{align:"right"});
 doc.setTextColor(0);
 y+=12;
 doc.setDrawColor(210);doc.line(15,y,195,y);y+=6;

 const {isPremiumTier,rgb}=tcPdfBrandInfo();
 const logoDataUrl=isPremiumTier?await tcFetchLogoDataUrl():null;
 const partnerBoxTop=y;
 const partnerPhonesPdf=[db.business.phone,db.business.phone2].filter(Boolean);
 const logoSpace=logoDataUrl?16:0;
 const partnerBoxHeight=15+logoSpace+(db.business.tagline?4.5:0)+(db.business.address?4.5:0)+(partnerPhonesPdf.length?5.5:0);
 doc.setFillColor(232,245,244);
 doc.rect(15,partnerBoxTop,180,partnerBoxHeight,"F");
 doc.setDrawColor(rgb[0],rgb[1],rgb[2]);doc.rect(15,partnerBoxTop,180,partnerBoxHeight);doc.setDrawColor(210);
 let py=partnerBoxTop+7;
 if(logoDataUrl){
  try{ doc.addImage(logoDataUrl,105-7,py-5,14,14); }catch(e){}
  py+=14;
 }
 doc.setFont(undefined,"bold");doc.setFontSize(14);doc.setTextColor(rgb[0],rgb[1],rgb[2]);
 doc.text(db.business.name||"Travel Partner",105,py,{align:"center"});py+=5;
 doc.setFont(undefined,"normal");doc.setFontSize(8.5);doc.setTextColor(60);
 if(db.business.tagline){doc.text(db.business.tagline,105,py,{align:"center"});py+=4.5;}
 if(db.business.address){doc.text(db.business.address,105,py,{align:"center"});py+=4.5;}
 if(partnerPhonesPdf.length){
  doc.setFont(undefined,"bold");doc.setFontSize(10.5);doc.setTextColor(rgb[0],rgb[1],rgb[2]);
  doc.text("Contact: "+partnerPhonesPdf.join("   |   "),105,py,{align:"center"});py+=5.5;
 }
 doc.setTextColor(0);
 y=partnerBoxTop+partnerBoxHeight+6;

 doc.setFont(undefined,"bold");doc.setFontSize(12.5);
 doc.text("QUOTATION "+q.no,105,y,{align:"center"});
 y+=9;
 doc.setFont(undefined,"normal");doc.setFontSize(10);

 y=pdfRow(doc,y,"Date",q.entryDate||(q.created||"").slice(0,10));
 y=pdfRow(doc,y,"Customer",q.customer);
 y=pdfRow(doc,y,"Mobile",q.mobile);
 y=pdfDivider(doc,y);
 y=pdfRow(doc,y,"Vehicle Category",q.category);
 y=pdfRow(doc,y,"Vehicle",(q.vehicle||"-")+" "+(q.vehicleNo||""));
 y=pdfRow(doc,y,"Vehicle Start Point",q.vehicleStart||"-");
 y=pdfRow(doc,y,"Pickup",q.pickup);
 dests.forEach((d,i)=>{y=pdfRow(doc,y,"Destination "+(i+1),d);});
 if(q.returnPoint) y=pdfRow(doc,y,"Return point",q.returnPoint);
 y=pdfRow(doc,y,"Trip type",q.type+" / "+q.ratePlan);
 if(q.days>1) y=pdfRow(doc,y,"Number of days",q.days+" days");
 if(q.restHours>0) y=pdfRow(doc,y,"Overnight rest hours (excluded)",q.restHours+" hrs");
 y=pdfRow(doc,y,"Estimated KM / Hours",q.estimatedKm+" KM / "+q.estimatedHours+" hrs");
 y=pdfDivider(doc,y);

 const offerRaw=calcFare(c,q.ratePlan,q.estimatedKm,q.estimatedHours,q.days||1,q.restHours||0,{addKm:q.overrideAddKm,addHour:q.overrideAddHour});
 const standardRaw=calcFare(c,"standard",q.estimatedKm,q.estimatedHours,q.days||1,q.restHours||0);
 const offerFareTotal=offerRaw.invalid?(q.subtotal??q.quotedAmount):offerRaw.total;
 const stdFareTotal=standardRaw.invalid?0:standardRaw.total;
 const rateSaving=(!standardRaw.invalid&&!offerRaw.invalid&&q.ratePlan!=="standard")?Math.max(0,stdFareTotal-offerFareTotal):0;
 const totalSavings=rateSaving+(q.discountAmount||0);
 if(!standardRaw.invalid&&!offerRaw.invalid&&q.ratePlan!=="standard"){
  doc.setFont(undefined,"bold");doc.setFontSize(11);doc.text("Standard vs Offer Rate",15,y);y+=6;doc.setFont(undefined,"normal");doc.setFontSize(9);
  doc.setTextColor(120);doc.text("Standard",140,y,{align:"right"});doc.text("Offer",195,y,{align:"right"});doc.setTextColor(0);y+=5;
  doc.text("Fare",15,y);doc.text(pdfMoney(stdFareTotal),140,y,{align:"right"});doc.setFont(undefined,"bold");doc.text(pdfMoney(offerFareTotal),195,y,{align:"right"});doc.setFont(undefined,"normal");y+=8;
  if(totalSavings>0){
   doc.setFillColor(230,247,233);doc.rect(15,y,180,12,"F");
   doc.setTextColor(28,107,44);doc.setFont(undefined,"bold");doc.setFontSize(10);
   doc.text("You save: "+pdfMoney(totalSavings),20,y+8);
   doc.setTextColor(0);doc.setFont(undefined,"normal");doc.setFontSize(10);
   y+=18;
  }
  y=pdfDivider(doc,y);
 }

 y=pdfRow(doc,y,"Subtotal",pdfMoney(q.subtotal??q.quotedAmount));
 if(q.discountAmount) y=pdfRow(doc,y,"Discount","-"+pdfMoney(q.discountAmount));
 if(q.roundAdjustment) y=pdfRow(doc,y,"Round off",(q.roundAdjustment>=0?"+":"")+pdfMoney(q.roundAdjustment));
 const qExtraTotal=sumExtraCharges(q.extraCharges);
 if(qExtraTotal>0) y=pdfRow(doc,y,"Other Charges"+extraChargesShortLabel(q.extraCharges),"+"+pdfMoney(qExtraTotal));
 if(q.gstAmount>0) y=pdfRow(doc,y,"GST @ "+q.gstPct+"%","+"+pdfMoney(q.gstAmount));
 y=pdfDivider(doc,y);
 y+=2;
 doc.setFillColor(15,90,85);
 doc.rect(15,y,180,20,"F");
 doc.setTextColor(255,255,255);
 doc.setFont(undefined,"normal");doc.setFontSize(9);
 doc.text("QUOTED AMOUNT (ESTIMATE)",105,y+7,{align:"center"});
 doc.setFont(undefined,"bold");doc.setFontSize(16);
 doc.text(pdfMoney(q.quotedAmount),105,y+16,{align:"center"});
 doc.setTextColor(0);doc.setFont(undefined,"normal");doc.setFontSize(10);
 y+=26;

 if(q.advanceAmount>0){
  const boxH=q.advanceReceived?18:40;
  doc.setFillColor(255,248,232);doc.rect(15,y,180,boxH,"F");
  doc.setDrawColor(210,180,120);doc.rect(15,y,180,boxH);doc.setDrawColor(210);
  doc.setFont(undefined,"bold");doc.setFontSize(9.5);doc.text("ADVANCE "+(q.advanceReceived?"RECEIVED":"REQUESTED"),20,y+8);
  doc.setFont(undefined,"normal");doc.setFontSize(9);doc.text(pdfMoney(q.advanceAmount),20,y+14);
  if(!q.advanceReceived&&db.business.upiId){
   const qrData=getQRDataURL(buildUpiLink(q.advanceAmount,"Advance "+q.no),200);
   if(qrData){doc.setFontSize(7.5);doc.text("SCAN & PAY",170,y+6,{align:"center"});doc.addImage(qrData,"PNG",151,y+8,30,30);}
  }
  y+=boxH+6;
 }

 doc.setFont(undefined,"normal");doc.setFontSize(8);doc.setTextColor(90);
 const disclaimer="This is an estimated fare based on the KM/hours entered above and rates in effect today"+(q.validUntil?", valid until "+q.validUntil:"")+". The final bill is calculated only after the trip, based on actual KM/hours travelled"+(q.validUntil?", and rates may change after the validity date above":"")+".";
 const wrapped=doc.splitTextToSize(disclaimer,180);
 doc.text(wrapped,15,y);y+=wrapped.length*4+3;
 doc.setTextColor(0);doc.setFontSize(10);
 y=extraChargesPdf(doc,y,q.extraCharges);

 doc.save("Quotation-"+q.no+".pdf");
}

/* Redefines downloadBillPDF() (already in app-updates.js) - same fix,
   now async to await the logo fetch. */
async function downloadBillPDF(tripId){
 const t=db.trips.find(x=>x.id===tripId);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const bd=billBreakdown(t,q,c);
 const {km,h,standardRaw,r,rateSaving,manualDiscount,manualAddition,totalSavings}=bd;
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0), balance=Math.max(0,r.final-paid);
 const driver=findDriverForVehicleNo(q.vehicleNo);
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const billDate=billPrintDate();

 const doc=pdfDoc();if(!doc)return;
 let y=15;
 try{ doc.addImage(LOGO_DATA_URI,"PNG",15,y-3,11,11); }catch(e){}
 doc.setTextColor(70);doc.setFont(undefined,"bold");doc.setFontSize(10.5);
 doc.text((db.platform.name||"Travel Connect").toUpperCase(),29,y+1);
 doc.setFont(undefined,"normal");doc.setFontSize(7.5);doc.setTextColor(120);
 if(db.platform.tagline) doc.text(db.platform.tagline,29,y+5);
 if(db.platform.email) doc.text(db.platform.email,29,y+9);
 doc.setFont(undefined,"bold");doc.setFontSize(8);doc.setTextColor(70);
 const platformPhones=[db.platform.phone1,db.platform.phone2].filter(Boolean).join("  |  ");
 if(platformPhones) doc.text(platformPhones,195,y+1,{align:"right"});
 doc.setTextColor(0);
 y+=12;
 doc.setDrawColor(210);doc.line(15,y,195,y);y+=6;

 const {isPremiumTier,rgb}=tcPdfBrandInfo();
 const logoDataUrl=isPremiumTier?await tcFetchLogoDataUrl():null;
 const partnerBoxTop=y;
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean);
 const logoSpace=logoDataUrl?16:0;
 const partnerBoxHeight=15+logoSpace+(db.business.tagline?4.5:0)+(db.business.address?4.5:0)+(partnerPhones.length?5.5:0);
 doc.setFillColor(232,245,244);
 doc.rect(15,partnerBoxTop,180,partnerBoxHeight,"F");
 doc.setDrawColor(rgb[0],rgb[1],rgb[2]);doc.rect(15,partnerBoxTop,180,partnerBoxHeight);doc.setDrawColor(210);
 let py=partnerBoxTop+7;
 if(logoDataUrl){
  try{ doc.addImage(logoDataUrl,105-7,py-5,14,14); }catch(e){}
  py+=14;
 }
 doc.setFont(undefined,"bold");doc.setFontSize(14);doc.setTextColor(rgb[0],rgb[1],rgb[2]);
 doc.text(db.business.name||"Travel Partner",105,py,{align:"center"});py+=5;
 doc.setFont(undefined,"normal");doc.setFontSize(8.5);doc.setTextColor(60);
 if(db.business.tagline){doc.text(db.business.tagline,105,py,{align:"center"});py+=4.5;}
 if(db.business.address){doc.text(db.business.address,105,py,{align:"center"});py+=4.5;}
 if(partnerPhones.length){
  doc.setFont(undefined,"bold");doc.setFontSize(10.5);doc.setTextColor(rgb[0],rgb[1],rgb[2]);
  doc.text("Contact: "+partnerPhones.join("   |   "),105,py,{align:"center"});py+=5.5;
 }
 doc.setTextColor(0);
 y=partnerBoxTop+partnerBoxHeight+6;

 doc.setFont(undefined,"bold");doc.setFontSize(12.5);
 doc.text("FINAL TRIP BILL",105,y,{align:"center"});
 doc.setFont(undefined,"normal");doc.setFontSize(7.5);doc.setTextColor(120);
 doc.text("Bill printed on: "+billDate,195,y,{align:"right"});doc.setTextColor(0);
 y+=7;
 doc.setFontSize(8.5);

 const detailRows=[["Customer",t.customer||q.customer],["Customer Mobile",q.mobile||"-"],["Trip Type",q.type||"-"],["Vehicle Category",q.category||"-"],["Vehicle",q.vehicle||"Not specified"],["Vehicle Number",q.vehicleNo||"Not specified"]];
 if(driver){detailRows.push(["Driver",driver.name||"-"]);detailRows.push(["Driver Mobile",driver.mobile||"-"]);}
 if(q.service) detailRows.push(["Service",q.service]);
 detailRows.push(["Bill Entry Date",t.entryDate||(t.created||"").slice(0,10)||"-"],["Trip Date",q.startDate||"-"],["Vehicle Start Point",q.vehicleStart||"-"],["Pickup Time",q.startTime||"-"],["Pickup Point",q.pickup||"-"],["Destination",dests[dests.length-1]||"-"],["Return / Closing Point",q.returnPoint||"-"]);

 detailRows.forEach(([label,value])=>{
  if(y>272){doc.addPage();y=18;}
  doc.setTextColor(90);doc.text(label,15,y);
  doc.setTextColor(0);doc.text(String(value),195,y,{align:"right"});
  y+=5;
 });

 y+=1;
 doc.setFont(undefined,"bold");doc.text("Route",15,y);y+=5;doc.setFont(undefined,"normal");
 const routeLine=[q.vehicleStart,q.pickup,...dests,q.returnPoint].filter(Boolean).join("  ->  ");
 const routeWrapped=doc.splitTextToSize(routeLine,180);
 doc.text(routeWrapped,15,y);y+=routeWrapped.length*4.5+3;

 y=pdfDivider(doc,y);
 doc.setFont(undefined,"bold");doc.text("1. Usage Details",15,y);y+=6;doc.setFont(undefined,"normal");
 y=pdfRow(doc,y,"Total KM / Total Hours",km+" KM / "+h+" hrs");
 if(r.days>1) y=pdfRow(doc,y,"Number of days",r.days+" days");
 if(r.restHours>0) y=pdfRow(doc,y,"Overnight rest hours (excluded)",r.restHours+" hrs");
 if(r.incKm!=null){
  y=pdfRow(doc,y,"Included Coverage",r.incKm+" KM / "+r.incHours+" hrs");
  y=pdfRow(doc,y,"Extra KM ("+pdfMoney(r.addKm)+"/KM)",Math.max(0,km-r.incKm)+" KM = "+pdfMoney(r.kmExtra||0));
  y=pdfRow(doc,y,"Extra Hours ("+pdfMoney(r.addHour)+"/hr)",Math.max(0,h-r.incHours)+" hrs = "+pdfMoney(r.hourExtra||0));
 }

 y=pdfDivider(doc,y);
 doc.setFont(undefined,"bold");doc.text("2. Standard vs Offer Rate",15,y);y+=6;
 doc.setFontSize(8);doc.setTextColor(120);
 doc.text("Standard",140,y,{align:"right"});doc.text("Offer",195,y,{align:"right"});
 doc.setTextColor(0);doc.setFontSize(8.5);y+=5;
 const stdBase=standardRaw.invalid?0:standardRaw.base, stdExtra=standardRaw.invalid?0:standardRaw.extra, stdTotal=standardRaw.invalid?0:standardRaw.total;
 const offBase=r.base, offExtra=r.extra||0, offTotal=r.base+(r.extra||0);
 doc.setFont(undefined,"normal");
 [["Base Rate",stdBase,offBase],["Additional Charge",stdExtra,offExtra]].forEach(([label,sv,ov])=>{
  doc.text(label,15,y);doc.text(pdfMoney(sv),140,y,{align:"right"});doc.text(pdfMoney(ov),195,y,{align:"right"});y+=5;
 });
 doc.setFont(undefined,"bold");
 doc.text("Total",15,y);doc.text(pdfMoney(stdTotal),140,y,{align:"right"});doc.text(pdfMoney(offTotal),195,y,{align:"right"});y+=6;
 doc.setFont(undefined,"normal");

 if(totalSavings>0){
  if(y+16+8>282){doc.addPage();y=18;}
  doc.setFillColor(230,247,233);doc.rect(15,y,180,16,"F");
  doc.setDrawColor(46,158,68);doc.rect(15,y,180,16);doc.setDrawColor(210);
  doc.setTextColor(28,107,44);doc.setFont(undefined,"bold");doc.setFontSize(11);
  doc.text("Your Total Savings: "+pdfMoney(totalSavings),20,y+7);
  doc.setFont(undefined,"normal");doc.setFontSize(8);
  let noteParts=[];
  if(rateSaving) noteParts.push("Offer discount "+pdfMoney(rateSaving));
  if(manualDiscount) noteParts.push("Additional discount "+pdfMoney(manualDiscount));
  if(noteParts.length) doc.text(noteParts.join(" + "),20,y+13);
  doc.setTextColor(0);
  y+=20;
 }

 y=pdfDivider(doc,y);
 doc.setFontSize(8.5);
 doc.setFont(undefined,"bold");doc.text("4. Final Payment Summary",15,y);y+=6;doc.setFont(undefined,"normal");
 y=pdfRow(doc,y,"Base Rate",pdfMoney(r.base));
 y=pdfRow(doc,y,"Additional Charge (higher of KM/Hour)",pdfMoney(r.extra||0));
 if(r.driverBata) y=pdfRow(doc,y,"Driver Bata",pdfMoney(r.driverBata));
 if(manualDiscount) y=pdfRow(doc,y,"Manual Discount","- "+pdfMoney(manualDiscount));
 if(manualAddition) y=pdfRow(doc,y,"Manual Addition","+ "+pdfMoney(manualAddition));
 if(r.roundAdjustment) y=pdfRow(doc,y,"Round off",(r.roundAdjustment>=0?"+":"")+pdfMoney(r.roundAdjustment));
 if(r.extraTotal>0) y=pdfRow(doc,y,"Other Charges"+extraChargesShortLabel(r.extraCharges),"+"+pdfMoney(r.extraTotal));
 if(r.gstAmount>0) y=pdfRow(doc,y,"GST @ "+r.gstPct+"%","+"+pdfMoney(r.gstAmount));
 y=pdfDivider(doc,y);
 y=pdfRow(doc,y,"FINAL BILL AMOUNT",pdfMoney(r.final),true);
 y+=3;

 const boxHeight=38;
 if(y+boxHeight+18>282){doc.addPage();y=18;}
 const boxTop=y;
 doc.setFillColor(255,248,232);
 doc.rect(15,boxTop,180,boxHeight,"F");
 doc.setDrawColor(210,180,120);doc.rect(15,boxTop,180,boxHeight);doc.setDrawColor(210);
 doc.setFont(undefined,"bold");doc.setFontSize(9.5);
 doc.text("PAYMENT INFORMATION",20,boxTop+7);
 doc.setFont(undefined,"normal");doc.setFontSize(8.5);
 doc.text("Final Bill Amount",20,boxTop+14);
 doc.text(pdfMoney(r.final),20,boxTop+19.5);
 doc.text("Balance Due",20,boxTop+27);
 doc.setFont(undefined,"bold");
 doc.text(balance>0?pdfMoney(balance):"FULLY PAID",20,boxTop+32.5);
 doc.setFont(undefined,"normal");

 if(balance>0&&db.business.upiId){
  const qrData=getQRDataURL(buildUpiLink(balance,q.no||tripId.slice(0,8)),220);
  if(qrData){
   doc.setFontSize(7.5);doc.text("SCAN & PAY",170,boxTop+6,{align:"center"});
   doc.addImage(qrData,"PNG",151,boxTop+8,36,36);
  }
 }
 y=boxTop+boxHeight+6;

 if((t.payments||[]).length){
  if(y>265){doc.addPage();y=18;}
  doc.setFont(undefined,"bold");doc.text("Payments Received",15,y);y+=6;doc.setFont(undefined,"normal");
  t.payments.forEach(p=>{y=pdfRow(doc,y,p.method,pdfMoney(p.amount)+"  ("+(p.at||"").slice(0,10)+")");});
  y=pdfRow(doc,y,"Total Paid",pdfMoney(paid),true);
  y+=3;
 }

 if(y>270){doc.addPage();y=18;}
 doc.setFontSize(10);doc.setTextColor(0);
 y=extraChargesPdf(doc,y,r.extraCharges);
 y+=2;

 if(y>276){doc.addPage();y=18;}
 doc.setFontSize(8);doc.setTextColor(120);
 doc.text("Thank you for travelling with "+(db.business.name||"us")+".",105,y,{align:"center"});
 doc.setTextColor(0);

 doc.save("Bill-"+(q.no||tripId.slice(0,8))+".pdf");
}

/* This file loads LAST, so its trailing render() call is what makes the
   very first paint use every override above (plan tier check, logo/color
   cache, etc.) instead of a now-stale version from an earlier-loaded file -
   same reasoning as the similar trailing render() calls in app-updates.js
   and app-updates-2.js. Without this, the dashboard briefly shows using
   whichever dashboard()/tcBrandingBox() was current when THAT file's own
   trailing render() ran, which can be an outdated version (e.g. one that
   doesn't yet know about the "premium" plan tier) until the next
   navigation happens to call render() again. */
/* ---------- BRAND FONT SIZE (Premium) ----------
   While the logo image issue is being diagnosed separately, this adds a
   guaranteed-working customization: business name font size on bills/
   quotations (Print + PDF), stored as brand_font_size on the partner
   record (reuses the same "update" action + COALESCE pattern as
   brand_color, gated the same way to Premium/Owner Free). */
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
  <label style="margin-top:8px;display:block">Business name size on bills<select id="bizFontSize">
    <option value="18" ${p.brand_font_size==18?"selected":""}>Small</option>
    <option value="21" ${(!p.brand_font_size||p.brand_font_size==21)?"selected":""}>Medium (default)</option>
    <option value="26" ${p.brand_font_size==26?"selected":""}>Large</option>
    <option value="32" ${p.brand_font_size==32?"selected":""}>Extra Large</option>
  </select></label>
  <div class="actions"><button onclick="tcSaveBrandColor(${p.id})">Save Color &amp; Size</button></div>
  <div id="bizBrandErr" class="danger"></div>`:""}
 `;
}
async function tcSaveBrandColor(partnerId){
 const user=getCurrentUser();
 const color=document.querySelector("#bizBrandColor").value;
 const fontSize=document.querySelector("#bizFontSize")?.value||"21";
 try{
  await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"update",partner_id:partnerId,mobile:user.mobile,
   business_name:window._myPartner.business_name,owner_name:window._myPartner.owner_name,
   mobile2:window._myPartner.mobile2,email:window._myPartner.email,
   location:window._myPartner.location,pincode:window._myPartner.pincode,
   business_type:window._myPartner.business_type,brand_color:color,brand_font_size:fontSize})});
  toast("Saved");
  window._myPartner.brand_color=color;
  window._myPartner.brand_font_size=fontSize;
  db.settings.myBrandColor=color;
  db.settings.myBrandFontSize=fontSize;
  save();
 }catch(e){ toast("Network error"); }
}
function tcBrandingBox(partnerPhones){
 const plan=db.settings.myPlan;
 const isPremiumTier=plan==="premium"||plan==="owner_free";
 const isPaidTier=tcIsPremiumPlan();
 if(isPaidTier){
  const color=(isPremiumTier&&db.settings.myBrandColor)?db.settings.myBrandColor:"#148c76";
  const fontSize=(isPremiumTier&&db.settings.myBrandFontSize)?db.settings.myBrandFontSize:"21";
  const logoImg=(isPremiumTier&&db.settings.myLogoKey&&db.settings.myPartnerId)?`<img src="${location.origin}/api/partners?action=logo&partner_id=${db.settings.myPartnerId}" style="max-width:56px;max-height:56px;border-radius:8px;margin-bottom:4px">`:"";
  return `<div style="background:#e8f5f4;border:2px solid ${color};border-radius:8px;padding:12px;text-align:center;margin:10px 0">
   ${logoImg}
   <div style="font-weight:bold;font-size:${fontSize}px;color:${color}">${esc(db.business.name)}</div>
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

/* Redefines partnerView() again to also cache the new font size setting. */
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


/* ---------- FIX: LOGO NOT SHOWING IN PRINT/SAVE-AS-PDF ----------
   Root cause: printContent() (already in app-updates.js) opens the print
   dialog after a FIXED 300ms delay - enough time for CSS (the brand color)
   to apply instantly, but not always enough for the logo IMAGE to finish
   its network fetch, especially on a slower connection. The print dialog
   then captures whatever was on screen at that moment - a broken/blank
   image if it hadn't loaded yet. This waits for every <img> in the printed
   content to actually finish loading (or fail, after a safety timeout)
   before opening the print dialog, instead of guessing a fixed delay. */
function printContent(title,html){
 let frame=document.querySelector("#printFrame");
 if(frame) frame.remove();
 frame=document.createElement("iframe");
 frame.id="printFrame";
 frame.style.position="fixed";frame.style.right="0";frame.style.bottom="0";frame.style.width="0";frame.style.height="0";frame.style.border="0";
 document.body.appendChild(frame);
 const doc=frame.contentWindow.document;
 doc.open();
 doc.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:20px;color:#111;font-size:15px;line-height:1.5}h2,h3{margin:8px 0}hr{margin:12px 0}table{width:100%}td{padding:3px 0}</style></head><body>${html}</body></html>`);
 doc.close();
 const images=Array.from(doc.images||[]);
 const waitForImages=Promise.all(images.map(img=>{
  if(img.complete) return Promise.resolve();
  return new Promise(resolve=>{
   img.addEventListener("load",resolve,{once:true});
   img.addEventListener("error",resolve,{once:true});
   setTimeout(resolve,3000); /* safety net - never block printing forever on a slow/broken image */
  });
 }));
 waitForImages.then(()=>{
  frame.contentWindow.focus();
  frame.contentWindow.print();
 });
}


render();
