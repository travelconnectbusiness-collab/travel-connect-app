/* ======================================================================
   TRAVEL CONNECT - business.js
   Taxi / Travel Agency owner tools ONLY: Dashboard, Enquiries, Quotations,
   Trips, Billing, Rate Master, Accounts, and the Print/PDF output for
   quotations and bills. Every other business type (Auto Rickshaw,
   Restaurant, Skilled Work etc.) never sees any of this - core.js's
   dashboard-routing sends them to directory.js's simpler partner profile
   page instead. See core.js for the data model / db object these
   functions read and write.
   ====================================================================== */

/* ---------- SHARED: OTHER (EXTRA) CHARGES ---------- */
function extraChargeLabels(){
 return {toll:"Toll",permit:"Other State Permit",stateTax:"Other State Tax",parking:"Parking",driverFood:"Driver Food",driverStay:"Driver Overnight Stay"};
}
function extraChargesShortLabel(ec){
 const labels=extraChargeLabels();
 const included=Object.keys(labels).filter(k=>ec&&+ec[k]>0);
 return included.length?" ("+included.map(k=>labels[k]).join(" + ")+")":"";
}
function sumExtraCharges(ec){
 if(!ec) return 0;
 return Object.values(ec).reduce((a,v)=>a+(+v||0),0);
}
function extraChargesHtml(ec){
 const labels=extraChargeLabels();
 const included=Object.keys(labels).filter(k=>ec&&+ec[k]>0);
 const excluded=Object.keys(labels).filter(k=>!ec||!(+ec[k]>0));
 let html="";
 if(included.length){
  html+=`<div style="margin-top:8px"><b>Other Charges Included:</b> `+included.map(k=>`${labels[k]}: ${money(ec[k])}`).join(" &bull; ")+`</div>`;
 }
 if(excluded.length){
  html+=`<div style="margin-top:4px;font-size:11.5px;color:#555">&#128666; ${excluded.map(k=>labels[k]).join(", ")} ${excluded.length>1?"are":"is"} <b>NOT included</b> in this fare and will be billed extra as applicable.</div>`;
 }
 return html;
}
function extraChargesPdf(doc,y,ec){
 const labels=extraChargeLabels();
 const included=Object.keys(labels).filter(k=>ec&&+ec[k]>0);
 const excluded=Object.keys(labels).filter(k=>!ec||!(+ec[k]>0));
 if(included.length){
  doc.setFont(undefined,"bold");doc.setFontSize(9);doc.text("Other Charges Included:",15,y);y+=5;doc.setFont(undefined,"normal");
  included.forEach(k=>{y=pdfRow(doc,y,labels[k],pdfMoney(ec[k]));});
 }
 if(excluded.length){
  doc.setFontSize(7.5);doc.setTextColor(90);
  const wrapped=doc.splitTextToSize(excluded.map(k=>labels[k]).join(", ")+" "+(excluded.length>1?"are":"is")+" NOT included in this fare and will be billed extra as applicable.",180);
  doc.text(wrapped,15,y);y+=wrapped.length*4+3;
  doc.setTextColor(0);doc.setFontSize(10);
 }
 return y;
}
function extraChargeFieldsHtml(prefix,ec){
 ec=ec||{};
 const labels=extraChargeLabels();
 return `<h4>Other Charges (optional - fill in whichever are known)</h4><div class="grid">
  ${Object.keys(labels).map(k=>`<label>${labels[k]}<input id="${prefix}_${k}" type="number" value="${+ec[k]||0}"></label>`).join("")}
 </div>`;
}
function readExtraChargeFields(prefix){
 const labels=extraChargeLabels();
 const ec={};
 Object.keys(labels).forEach(k=>{ ec[k]=+document.querySelector("#"+prefix+"_"+k)?.value||0; });
 return ec;
}

/* ---------- FARE CALCULATION ---------- */
function calcFare(c,plan,km,h,days,restHours,overrides){
 days=days||1; restHours=restHours||0; overrides=overrides||{};
 const effectiveHours=Math.max(0,h-restHours);
 if(plan==="local"){
  if(km>db.settings.localMaxKm||h>db.settings.localMaxHours){
   return {invalid:true,reason:`Local limit exceeded: maximum ${db.settings.localMaxKm} KM and ${db.settings.localMaxHours} hours.`};
  }
  const L=c.local;
  const kmExtra=Math.max(0,km-L.incKm)*L.addKm;
  const hourExtra=Math.max(0,h-L.incHours)*L.addHour;
  const extra=Math.max(kmExtra,hourExtra);
  return {base:L.rate,extra,kmExtra,hourExtra,total:L.rate+extra,incKm:L.incKm,incHours:L.incHours,addKm:L.addKm,addHour:L.addHour,days:1,restHours:0};
 }
 if(plan==="custom"){
  const base=Number(document.querySelector("#qCustom")?.value||0);
  return {base,extra:0,kmExtra:0,hourExtra:0,total:base,incKm:null,incHours:null,addKm:null,addHour:null,days,restHours};
 }
 const R=c[plan];
 const addKm=overrides.addKm!=null&&overrides.addKm!==""?Number(overrides.addKm):R.addKm;
 const addHour=overrides.addHour!=null&&overrides.addHour!==""?Number(overrides.addHour):R.addHour;
 const incKm=R.incKm*days, incHours=R.incHours*days, base=R.rate*days;
 const kmExtra=Math.max(0,km-incKm)*addKm;
 const hourExtra=Math.max(0,effectiveHours-incHours)*addHour;
 const extra=Math.max(kmExtra,hourExtra);
 return {base,extra,kmExtra,hourExtra,total:base+extra,incKm,incHours,addKm,addHour,days,restHours,addKmOverridden:addKm!==R.addKm,addHourOverridden:addHour!==R.addHour};
}
function applyDiscountRound(subtotal,discType,discValue,roundStep){
 let discountAmount=0;
 if(discType==="percent") discountAmount=subtotal*(Number(discValue)||0)/100;
 else if(discType==="fixed") discountAmount=Number(discValue)||0;
 discountAmount=Math.min(discountAmount,subtotal);
 const afterDiscount=Math.max(0,subtotal-discountAmount);
 let roundAdjustment=0, final=afterDiscount;
 const step=Number(roundStep)||0;
 if(step>0){
  final=Math.round(afterDiscount/step)*step;
  roundAdjustment=final-afterDiscount;
 }
 return {discountAmount,afterDiscount,roundAdjustment,final};
}
/* Vehicle category dropdown - starts on a forced "-- Select --" placeholder
   rather than silently defaulting to the first category (Mini/Hatchback),
   same principle as the login page's role/business-type fix earlier this
   session: an unnoticed silent default here would calculate and save a
   fare for the WRONG vehicle without anyone realising. Used by the
   Quotation form, Quick Bill, and Quick Fare (Enquiries) - all three had
   this same bug. */
function tcCategoryOptions(){
 return `<option value="">-- Select --</option>`+db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
}
function rateOptions(){
 const labels={standard:"Standard Rate",competitive:"Competitive Rate",safety:"Minimum Safety Rate",drop:"Drop Rate",local:"Local Rate",custom:"Custom / Manual Amount"};
 const v=db.settings.visibleRates||{};
 let opts=Object.keys(labels).filter(k=>v[k]!==false).map(k=>`<option value="${k}"${k==="competitive"?" selected":""}>${labels[k]}</option>`).join("");
 if(!opts) opts=`<option value="custom">Custom / Manual Amount</option>`;
 return opts;
}

/* ---------- PRINT / PDF: BRANDING BOX (Free/Paid/Premium tiers) ---------- */
const TC_FONT_FAMILIES={
 helvetica:{label:"Standard (Helvetica)",css:"Arial, Helvetica, sans-serif"},
 times:{label:"Elegant Serif (Times)",css:"'Times New Roman', Times, serif"},
 courier:{label:"Typewriter (Courier)",css:"'Courier New', Courier, monospace"}
};
const TC_LOGO_SIZES={small:120,medium:220,large:320};
const TC_DETAIL_SIZES={small:10,medium:12,large:14};
function tcIsPremiumPlan(){
 return db.settings.myPlan==="paid"||db.settings.myPlan==="premium"||db.settings.myPlan==="owner_free";
}
function tcShowUpgradePrompt(feature){
 modal(`<h2>Premium Feature</h2>
  <p class="muted">${esc(feature||"This")} is available on Paid and Premium plans.</p>
  <p>Contact Travel Connect to upgrade your plan and unlock this and other features (your own branding on bills, your own UPI payment QR, and more).</p>
  ${db.platform.phone1?`<div><a href="tel:${esc(db.platform.phone1)}">Call ${esc(db.platform.phone1)}</a></div>`:""}
  ${db.platform.email?`<div><a href="mailto:${esc(db.platform.email)}">${esc(db.platform.email)}</a></div>`:""}
  <div class="actions" style="margin-top:10px"><button onclick="closeModal()">Close</button></div>`);
}
const TC_APP_URL="https://travel-connect-app.travelconnect-business.workers.dev/";
function tcAppDownloadBlockHtml(){
 const qrData=getQRDataURL(TC_APP_URL,140);
 return `<div style="page-break-inside:avoid;break-inside:avoid;text-align:center;margin-top:16px;padding-top:12px;border-top:1px dashed #ccc">
  <div style="font-size:12px;color:#444;font-weight:600;margin-bottom:6px">&#128241; Get the Travel Connect app - book vehicles, get fare estimates &amp; more</div>
  ${qrData?`<img src="${qrData}" style="width:110px;height:110px">`:""}
  <div style="font-size:11px;color:#888;margin-top:6px;word-break:break-all">${esc(TC_APP_URL)}</div>
 </div>`;
}
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
  const logoImg=hasLogo?`<img src="${location.origin}/api/partners?action=logo&partner_id=${db.settings.myPartnerId}" style="max-width:${logoPx}px;height:auto;margin-bottom:6px;display:block;margin-left:auto;margin-right:auto">`:"";
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
function tcPdfFontFamily(){
 const isPremiumTier=db.settings.myPlan==="premium"||db.settings.myPlan==="owner_free";
 const key=isPremiumTier?(db.settings.myBrandFontFamily||"helvetica"):"helvetica";
 return {helvetica:"helvetica",times:"times",courier:"courier"}[key]||"helvetica";
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

/* ---------- PRINT (HTML via hidden iframe) ---------- */
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
   await new Promise(r=>setTimeout(r,50));
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

/* ---------- PRINT: QUOTATION ---------- */
function printQuoteObj(q,asImage){
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
  advanceHtml=`<div style="page-break-inside:avoid;background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
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
 ${totalSavings>0?`<div style="page-break-inside:avoid;background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:10px;margin:8px 0;color:#1c6b2c">
  <div style="font-weight:bold;font-size:15px">&#127881; You save: ${money(totalSavings)}</div>
 </div>`:""}
 `:""}
 ${sumExtraCharges(q.extraCharges)>0?`<table><tr><td style="padding:3px 0;color:#555">Other Charges${extraChargesShortLabel(q.extraCharges)}</td><td style="text-align:right;padding:3px 0;font-weight:bold">+${money(sumExtraCharges(q.extraCharges))}</td></tr></table>`:""}
 ${q.gstAmount>0?`<table><tr><td style="padding:3px 0;color:#555">GST @ ${q.gstPct}%</td><td style="text-align:right;padding:3px 0;font-weight:bold">+${money(q.gstAmount)}</td></tr></table>`:""}
 <div style="page-break-inside:avoid;background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:14px;text-align:center;margin-top:14px">
  <div style="font-size:14px;color:#1c6b2c">QUOTED AMOUNT (ESTIMATE)</div>
  <div style="font-size:30px;font-weight:bold;color:#1c6b2c">${money(q.quotedAmount)}</div>
 </div>
 ${advanceHtml}
 <div style="background:#f2f2f2;border-radius:6px;padding:10px;margin-top:10px;font-size:11.5px;color:#555">
  &#8505;&#65039; This is an estimated fare based on the KM/hours entered above and rates in effect today${q.validUntil?`, valid until <b>${esc(q.validUntil)}</b>`:""}. The <b>final bill</b> is calculated only after the trip, based on actual KM/hours travelled${q.validUntil?", and rates may change after the validity date above":""}.
  ${extraChargesHtml(q.extraCharges)}
 </div>
 <p style="text-align:center;color:#888;font-size:12px;margin-top:14px">Thank you for choosing ${esc(db.business.name)}.</p>
 ${tcAppDownloadBlockHtml()}
 `,asImage);
}
function printQuote(id){ const q=db.quotes.find(x=>x.id===id); if(q) printQuoteObj(q); }
function imageQuote(id){ const q=db.quotes.find(x=>x.id===id); if(q) printQuoteObj(q,true); }

/* ---------- PRINT: FINAL BILL ---------- */
function printBill(tripId,asImage){
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
 const billDriverName=t.driverName||(driver?driver.name:"")||"";
 const billDriverMobile=t.driverMobile||(driver?driver.mobile:"")||"";
 if(billDriverName){detailRows+=row("Driver",billDriverName);}
 if(billDriverMobile){detailRows+=row("Driver Mobile",billDriverMobile);}
 if(q.service) detailRows+=row("Service",q.service);
 detailRows+=row("Bill Number",t.billNo||"-");
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

 const savingsHtml=totalSavings>0?`<div style="page-break-inside:avoid;background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:12px;margin:10px 0;color:#1c6b2c">
  <div style="font-weight:bold;font-size:18px">&#127881; Your Total Savings: ${money(totalSavings)}</div>
  <div style="font-size:12px">${rateSaving?`Offer discount ${money(rateSaving)}`:""}${manualDiscount?`${rateSaving?" + ":""}Additional discount ${money(manualDiscount)}`:""}</div>
 </div>`:"";

 let summaryRows="";
 summaryRows+=row("Base Rate",money(r.base));
 summaryRows+=row("Additional Charge (higher of KM/Hour)",money(r.extra||0));
 if(r.driverBata) summaryRows+=row("Driver Bata",money(r.driverBata));
 if(manualDiscount) summaryRows+=row("Manual Discount","- "+money(manualDiscount)+(r.manualAdjustmentNote?" ("+r.manualAdjustmentNote+")":""));
 if(manualAddition) summaryRows+=row("Manual Addition","+ "+money(manualAddition)+(r.manualAdjustmentNote?" ("+r.manualAdjustmentNote+")":""));
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
 <h3 style="margin:12px 0 4px;font-size:16px;color:#143c5a">3. Final Payment Summary</h3>
 <table>${summaryRows}</table>
 <div style="page-break-inside:avoid;background:#0f5a55;border-radius:8px;padding:14px;text-align:center;margin:12px 0">
  <div style="font-size:14px;color:#eafaf8">FINAL BILL AMOUNT</div>
  <div style="font-size:32px;font-weight:bold;color:#fff">${money(r.final)}</div>
 </div>
 <div style="page-break-inside:avoid;background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
  <div style="font-size:15px">
   Balance Due: <b style="font-size:18px">${balance>0?money(balance):"FULLY PAID"}</b>
  </div>
  ${qrHtml}
 </div>
 ${(t.payments||[]).length?`<h3 style="margin:10px 0 4px;font-size:16px;color:#143c5a">Payments Received</h3><table>${t.payments.map(p=>row(p.method+" ("+(p.at||"").slice(0,10)+")",money(p.amount))).join("")}${row("Total Paid",money(paid),true)}</table>`:""}
 <div style="background:#f2f2f2;border-radius:6px;padding:10px;margin-top:10px;font-size:11px;color:#555">
  ${extraChargesHtml(r.extraCharges)}
 </div>
 <p style="text-align:center;color:#888;font-size:12px;margin-top:14px">Thank you for travelling with ${esc(db.business.name)}.</p>
 ${tcAppDownloadBlockHtml()}
 `,asImage);
}
function imageBill(tripId){ printBill(tripId,true); }

/* ---------- PDF HELPERS ---------- */
function pdfDoc(){
 if(typeof window.jspdf==="undefined"||!window.jspdf.jsPDF){ toast("PDF library not loaded - try again in a moment"); return null; }
 return new window.jspdf.jsPDF();
}
function pdfMoney(n){ return "Rs."+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2}); }
function pdfRow(doc,y,label,value){
 if(y>272){doc.addPage();y=18;}
 doc.setTextColor(90);doc.text(String(label),15,y);
 doc.setTextColor(0);doc.text(String(value),195,y,{align:"right"});
 return y+5;
}
function pdfDivider(doc,y){
 if(y>272){doc.addPage();y=18;}
 doc.setDrawColor(220);doc.line(15,y,195,y);
 return y+5;
}
function tcPdfBrandedHeader(doc,titleText){
 const {isPremiumTier,rgb}=tcPdfBrandInfo();
 const font=tcPdfFontFamily();
 doc.setFont(font,"normal");
 let y=15;
 try{ doc.addImage(LOGO_DATA_URI,"PNG",15,y-3,11,11); }catch(e){}
 doc.setTextColor(70);doc.setFont(font,"bold");doc.setFontSize(10.5);
 doc.text((db.platform.name||"Travel Connect").toUpperCase(),29,y+1);
 doc.setFont(font,"normal");doc.setFontSize(7.5);doc.setTextColor(120);
 if(db.platform.tagline) doc.text(db.platform.tagline,29,y+5);
 if(db.platform.email) doc.text(db.platform.email,29,y+9);
 doc.setFont(font,"bold");doc.setFontSize(8);doc.setTextColor(70);
 const platformPhones=[db.platform.phone1,db.platform.phone2].filter(Boolean).join("  |  ");
 if(platformPhones) doc.text(platformPhones,195,y+1,{align:"right"});
 doc.setTextColor(0);
 y+=12;
 doc.setDrawColor(210);doc.line(15,y,195,y);y+=6;

 const isPaidTier=tcIsPremiumPlan();
 const partnerPhonesPdf=[db.business.phone,db.business.phone2].filter(Boolean);
 const partnerBoxTop=y;
 const partnerBoxHeight=15+(db.business.tagline?4.5:0)+(db.business.address?4.5:0)+(partnerPhonesPdf.length?5.5:0);
 doc.setFillColor(isPaidTier?255:232,isPaidTier?255:245,isPaidTier?255:244);
 doc.rect(15,partnerBoxTop,180,partnerBoxHeight,"F");
 doc.setDrawColor(rgb[0],rgb[1],rgb[2]);doc.rect(15,partnerBoxTop,180,partnerBoxHeight);doc.setDrawColor(210);
 let py=partnerBoxTop+7;
 doc.setFont(font,"bold");doc.setFontSize(14);doc.setTextColor(rgb[0],rgb[1],rgb[2]);
 doc.text(isPaidTier?(db.business.name||"Travel Partner"):(db.platform.name||"Travel Connect"),105,py,{align:"center"});py+=5;
 doc.setFont(font,"normal");doc.setFontSize(8.5);doc.setTextColor(60);
 if(isPaidTier){
  if(db.business.tagline){doc.text(db.business.tagline,105,py,{align:"center"});py+=4.5;}
  if(db.business.address){doc.text(db.business.address,105,py,{align:"center"});py+=4.5;}
  if(partnerPhonesPdf.length){
   doc.setFont(font,"bold");doc.setFontSize(10.5);doc.setTextColor(rgb[0],rgb[1],rgb[2]);
   doc.text("Contact: "+partnerPhonesPdf.join("   |   "),105,py,{align:"center"});py+=5.5;
  }
 }else{
  doc.text("Book your next trip directly - fast, reliable service",105,py,{align:"center"});py+=4.5;
  if(db.platform.phone1){doc.text("Call: "+db.platform.phone1,105,py,{align:"center"});py+=4.5;}
 }
 doc.setTextColor(0);
 y=partnerBoxTop+partnerBoxHeight+6;

 doc.setFont(font,"bold");doc.setFontSize(12.5);
 doc.text(titleText,105,y,{align:"center"});
 y+=9;
 doc.setFont(font,"normal");doc.setFontSize(10);
 return y;
}
function tcPdfAppDownloadBlock(doc,y){
 const font=tcPdfFontFamily();
 if(y+45>282){doc.addPage();y=18;}
 y+=6;
 doc.setDrawColor(210);doc.line(15,y,195,y);y+=8;
 doc.setFont(font,"bold");doc.setFontSize(9);doc.setTextColor(70);
 doc.text("Get the Travel Connect app - book vehicles, get fare estimates & more",105,y,{align:"center"});y+=4;
 const qrData=getQRDataURL(TC_APP_URL,140);
 if(qrData){ doc.addImage(qrData,"PNG",90,y,30,30); y+=34; }
 doc.setFont(font,"normal");doc.setFontSize(7.5);doc.setTextColor(120);
 doc.text(TC_APP_URL,105,y,{align:"center"});
 doc.setTextColor(0);
 return y+6;
}

/* ---------- QUOTATION PDF ---------- */
function downloadQuotePDFObj(q){
 const doc=pdfDoc();if(!doc)return;
 const font=tcPdfFontFamily();
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const c=db.categories[q.categoryId];
 let y=tcPdfBrandedHeader(doc,"QUOTATION "+q.no);

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
  doc.setFont(font,"bold");doc.setFontSize(11);doc.text("Standard vs Offer Rate",15,y);y+=6;doc.setFont(font,"normal");doc.setFontSize(9);
  doc.setTextColor(120);doc.text("Standard",140,y,{align:"right"});doc.text("Offer",195,y,{align:"right"});doc.setTextColor(0);y+=5;
  doc.text("Fare",15,y);doc.text(pdfMoney(stdFareTotal),140,y,{align:"right"});doc.setFont(font,"bold");doc.text(pdfMoney(offerFareTotal),195,y,{align:"right"});doc.setFont(font,"normal");y+=8;
  if(totalSavings>0){
   doc.setFillColor(230,247,233);doc.rect(15,y,180,12,"F");
   doc.setTextColor(28,107,44);doc.setFont(font,"bold");doc.setFontSize(10);
   doc.text("You save: "+pdfMoney(totalSavings),20,y+8);
   doc.setTextColor(0);doc.setFont(font,"normal");doc.setFontSize(10);
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
 const {rgb}=tcPdfBrandInfo();
 doc.setFillColor(rgb[0],rgb[1],rgb[2]);
 doc.rect(15,y,180,20,"F");
 doc.setTextColor(255,255,255);
 doc.setFont(font,"normal");doc.setFontSize(9);
 doc.text("QUOTED AMOUNT (ESTIMATE)",105,y+7,{align:"center"});
 doc.setFont(font,"bold");doc.setFontSize(16);
 doc.text(pdfMoney(q.quotedAmount),105,y+16,{align:"center"});
 doc.setTextColor(0);doc.setFont(font,"normal");doc.setFontSize(10);
 y+=26;

 if(q.advanceAmount>0){
  const boxH=q.advanceReceived?18:40;
  doc.setFillColor(255,248,232);doc.rect(15,y,180,boxH,"F");
  doc.setDrawColor(210,180,120);doc.rect(15,y,180,boxH);doc.setDrawColor(210);
  doc.setFont(font,"bold");doc.setFontSize(9.5);doc.text("ADVANCE "+(q.advanceReceived?"RECEIVED":"REQUESTED"),20,y+8);
  doc.setFont(font,"normal");doc.setFontSize(9);doc.text(pdfMoney(q.advanceAmount),20,y+14);
  if(!q.advanceReceived&&db.business.upiId){
   const qrData=getQRDataURL(buildUpiLink(q.advanceAmount,"Advance "+q.no),200);
   if(qrData){doc.setFontSize(7.5);doc.text("SCAN & PAY",170,y+6,{align:"center"});doc.addImage(qrData,"PNG",151,y+8,30,30);}
  }
  y+=boxH+6;
 }

 doc.setFont(font,"normal");doc.setFontSize(8);doc.setTextColor(90);
 const disclaimer="This is an estimated fare based on the KM/hours entered above and rates in effect today"+(q.validUntil?", valid until "+q.validUntil:"")+". The final bill is calculated only after the trip, based on actual KM/hours travelled"+(q.validUntil?", and rates may change after the validity date above":"")+".";
 const wrapped=doc.splitTextToSize(disclaimer,180);
 doc.text(wrapped,15,y);y+=wrapped.length*4+3;
 doc.setTextColor(0);doc.setFontSize(10);
 y=extraChargesPdf(doc,y,q.extraCharges);
 tcPdfAppDownloadBlock(doc,y);

 doc.save("Quotation-"+q.no+".pdf");
}
function downloadQuotePDF(id){ const q=db.quotes.find(x=>x.id===id); if(q) downloadQuotePDFObj(q); }

/* ---------- FINAL BILL PDF ---------- */
function downloadBillPDF(tripId){
 const t=db.trips.find(x=>x.id===tripId);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const bd=billBreakdown(t,q,c);
 const {km,h,standardRaw,r,rateSaving,manualDiscount,manualAddition,totalSavings}=bd;
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0), balance=Math.max(0,r.final-paid);
 const driver=findDriverForVehicleNo(q.vehicleNo);
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const billDate=billPrintDate();
 const font=tcPdfFontFamily();

 const doc=pdfDoc();if(!doc)return;
 let y=tcPdfBrandedHeader(doc,"FINAL TRIP BILL");
 doc.setFont(font,"normal");doc.setFontSize(7.5);doc.setTextColor(120);
 doc.text("Bill printed on: "+billDate,195,y-9,{align:"right"});doc.setTextColor(0);
 doc.setFontSize(8.5);

 const billDriverName=t.driverName||(driver?driver.name:"")||"";
 const billDriverMobile=t.driverMobile||(driver?driver.mobile:"")||"";
 const detailRows=[["Customer",t.customer||q.customer],["Customer Mobile",q.mobile||"-"],["Trip Type",q.type||"-"],["Vehicle Category",q.category||"-"],["Vehicle",q.vehicle||"Not specified"],["Vehicle Number",q.vehicleNo||"Not specified"]];
 if(billDriverName) detailRows.push(["Driver",billDriverName]);
 if(billDriverMobile) detailRows.push(["Driver Mobile",billDriverMobile]);
 if(q.service) detailRows.push(["Service",q.service]);
 detailRows.push(["Bill Number",t.billNo||"-"],["Bill Entry Date",t.entryDate||(t.created||"").slice(0,10)||"-"],["Trip Date",q.startDate||"-"],["Vehicle Start Point",q.vehicleStart||"-"],["Pickup Time",q.startTime||"-"],["Pickup Point",q.pickup||"-"],["Destination",dests[dests.length-1]||"-"],["Return / Closing Point",q.returnPoint||"-"]);

 detailRows.forEach(([label,value])=>{
  if(y>272){doc.addPage();y=18;}
  doc.setTextColor(90);doc.text(label,15,y);
  doc.setTextColor(0);doc.text(String(value),195,y,{align:"right"});
  y+=5;
 });

 y+=1;
 doc.setFont(font,"bold");doc.text("Route",15,y);y+=5;doc.setFont(font,"normal");
 const routeLine=[q.vehicleStart,q.pickup,...dests,q.returnPoint].filter(Boolean).join("  ->  ");
 const routeWrapped=doc.splitTextToSize(routeLine,180);
 doc.text(routeWrapped,15,y);y+=routeWrapped.length*4.5+3;

 y=pdfDivider(doc,y);
 doc.setFont(font,"bold");doc.text("1. Usage Details",15,y);y+=6;doc.setFont(font,"normal");
 y=pdfRow(doc,y,"Total KM / Total Hours",km+" KM / "+h+" hrs");
 if(r.days>1) y=pdfRow(doc,y,"Number of days",r.days+" days");
 if(r.restHours>0) y=pdfRow(doc,y,"Overnight rest hours (excluded)",r.restHours+" hrs");
 if(r.incKm!=null){
  y=pdfRow(doc,y,"Included Coverage",r.incKm+" KM / "+r.incHours+" hrs");
  y=pdfRow(doc,y,"Extra KM ("+pdfMoney(r.addKm)+"/KM)",Math.max(0,km-r.incKm)+" KM = "+pdfMoney(r.kmExtra||0));
  y=pdfRow(doc,y,"Extra Hours ("+pdfMoney(r.addHour)+"/hr)",Math.max(0,h-r.incHours)+" hrs = "+pdfMoney(r.hourExtra||0));
 }

 y=pdfDivider(doc,y);
 doc.setFont(font,"bold");doc.text("2. Standard vs Offer Rate",15,y);y+=6;
 doc.setFontSize(8);doc.setTextColor(120);
 doc.text("Standard",140,y,{align:"right"});doc.text("Offer",195,y,{align:"right"});
 doc.setTextColor(0);doc.setFontSize(8.5);y+=5;
 const stdBase=standardRaw.invalid?0:standardRaw.base, stdExtra=standardRaw.invalid?0:standardRaw.extra, stdTotal=standardRaw.invalid?0:standardRaw.total;
 const offBase=r.base, offExtra=r.extra||0, offTotal=r.base+(r.extra||0);
 doc.setFont(font,"normal");
 [["Base Rate",stdBase,offBase],["Additional Charge",stdExtra,offExtra]].forEach(([label,sv,ov])=>{
  doc.text(label,15,y);doc.text(pdfMoney(sv),140,y,{align:"right"});doc.text(pdfMoney(ov),195,y,{align:"right"});y+=5;
 });
 doc.setFont(font,"bold");
 doc.text("Total",15,y);doc.text(pdfMoney(stdTotal),140,y,{align:"right"});doc.text(pdfMoney(offTotal),195,y,{align:"right"});y+=6;
 doc.setFont(font,"normal");

 if(totalSavings>0){
  if(y+16+8>282){doc.addPage();y=18;}
  doc.setFillColor(230,247,233);doc.rect(15,y,180,16,"F");
  doc.setDrawColor(46,158,68);doc.rect(15,y,180,16);doc.setDrawColor(210);
  doc.setTextColor(28,107,44);doc.setFont(font,"bold");doc.setFontSize(11);
  doc.text("Your Total Savings: "+pdfMoney(totalSavings),20,y+7);
  doc.setFont(font,"normal");doc.setFontSize(8);
  let noteParts=[];
  if(rateSaving) noteParts.push("Offer discount "+pdfMoney(rateSaving));
  if(manualDiscount) noteParts.push("Additional discount "+pdfMoney(manualDiscount));
  if(noteParts.length) doc.text(noteParts.join(" + "),20,y+13);
  doc.setTextColor(0);
  y+=20;
 }

 y=pdfDivider(doc,y);
 doc.setFontSize(8.5);
 doc.setFont(font,"bold");doc.text("3. Final Payment Summary",15,y);y+=6;doc.setFont(font,"normal");
 y=pdfRow(doc,y,"Base Rate",pdfMoney(r.base));
 y=pdfRow(doc,y,"Additional Charge (higher of KM/Hour)",pdfMoney(r.extra||0));
 if(r.driverBata) y=pdfRow(doc,y,"Driver Bata",pdfMoney(r.driverBata));
 if(manualDiscount) y=pdfRow(doc,y,"Manual Discount","- "+pdfMoney(manualDiscount));
 if(manualAddition) y=pdfRow(doc,y,"Manual Addition","+ "+pdfMoney(manualAddition));
 if(r.roundAdjustment) y=pdfRow(doc,y,"Round off",(r.roundAdjustment>=0?"+":"")+pdfMoney(r.roundAdjustment));
 if(r.extraTotal>0) y=pdfRow(doc,y,"Other Charges"+extraChargesShortLabel(r.extraCharges),"+"+pdfMoney(r.extraTotal));
 if(r.gstAmount>0) y=pdfRow(doc,y,"GST @ "+r.gstPct+"%","+"+pdfMoney(r.gstAmount));
 y=pdfDivider(doc,y);
 y=pdfRow(doc,y,"FINAL BILL AMOUNT",pdfMoney(r.final));
 y+=3;

 const boxHeight=38;
 if(y+boxHeight+18>282){doc.addPage();y=18;}
 const boxTop=y;
 doc.setFillColor(255,248,232);
 doc.rect(15,boxTop,180,boxHeight,"F");
 doc.setDrawColor(210,180,120);doc.rect(15,boxTop,180,boxHeight);doc.setDrawColor(210);
 doc.setFont(font,"bold");doc.setFontSize(9.5);
 doc.text("PAYMENT INFORMATION",20,boxTop+7);
 doc.setFont(font,"normal");doc.setFontSize(8.5);
 doc.text("Final Bill Amount",20,boxTop+14);
 doc.text(pdfMoney(r.final),20,boxTop+19.5);
 doc.text("Balance Due",20,boxTop+27);
 doc.setFont(font,"bold");
 doc.text(balance>0?pdfMoney(balance):"FULLY PAID",20,boxTop+32.5);
 doc.setFont(font,"normal");

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
  doc.setFont(font,"bold");doc.text("Payments Received",15,y);y+=6;doc.setFont(font,"normal");
  t.payments.forEach(p=>{y=pdfRow(doc,y,p.method,pdfMoney(p.amount)+"  ("+(p.at||"").slice(0,10)+")");});
  y=pdfRow(doc,y,"Total Paid",pdfMoney(paid));
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
 y+=6;
 tcPdfAppDownloadBlock(doc,y);

 doc.save("Bill-"+(q.no||tripId.slice(0,8))+".pdf");
}

/* ---------- QUOTATION FORM ---------- */
function quoteForm(){
 const cat=tcCategoryOptions();
 return `<div class="grid">
 <label>Customer name<input id="qName"></label><label>Customer mobile<input id="qMobile"></label>
 <label>Trip type<select id="qType" onchange="handleTripTypeChange()">
   <option value="local">Local Trip</option>
   <option value="one_day">One Day</option>
   <option value="round">Round Trip</option>
   <option value="outstation">Outstation</option>
   <option value="drop">Drop</option>
 </select></label>
 <label>Vehicle category<select id="qCat" onchange="handleTripTypeChange()">${cat}</select></label>
 <label>Vehicle<input id="qVehicle"></label><label>Vehicle number<input id="qVehicleNo"></label>
 <label><b>&#128663; Vehicle start point (garage/office)</b><input id="qVehicleStart" value="${esc(db.business.officeLocation)}"></label>
 <label><b>Customer pickup point</b><input id="qPickup"></label>
 <label>Destination 1<input id="qDest"></label></div>
 <div id="qStopsContainer"></div>
 <div class="actions">
  <button type="button" onclick="addStopField()">+ Add another destination</button>
  <button type="button" onclick="openRoute()">Open route in Google Maps</button>
 </div>
 <div class="grid">
 <label><b>Vehicle closing point (where the trip ends)</b><input id="qReturn" value="${esc(db.business.officeLocation)}"></label>
 <label>Estimated KM<input id="qKm" type="number" placeholder="e.g. 40" oninput="handleLocalCheck()"></label>
 <button type="button" onclick="doubleKm()" style="align-self:flex-end">Double KM (for Drop / return trip)</button>
 <label>Estimated hours<input id="qHours" type="number" placeholder="e.g. 4" oninput="handleLocalCheck()"></label>
 <label>Number of days (for outstation trips)<input id="qDays" type="number" value="1" min="1"></label>
 <label>Overnight rest hours (excluded from billing - customer arranged own room)<input id="qRestHours" type="number" value="0"></label>
 <label>Override Extra KM Rate (optional - for high-range/heavy-traffic/bad-road trips)<input id="qOverrideAddKm" type="number" placeholder="Leave blank to use selected rate's own value"></label>
 <label>Override Extra Hour Rate (optional)<input id="qOverrideAddHour" type="number" placeholder="Leave blank to use selected rate's own value"></label>
 <label>Entry date (leave blank for today)<input id="qEntryDate" type="date"></label>
 <label>Start date<input id="qStart" type="date"></label>
 <label>Start time<input id="qStartTime" type="time"></label><label>Closing date<input id="qClose" type="date"></label>
 <label>Closing time<input id="qCloseTime" type="time"></label>
 <button type="button" onclick="calcHoursFromTimes()" style="align-self:flex-end">Calculate hours from Start/Closing time</button>
 <label>Service (optional, e.g. AC / Non-AC)<input id="qService"></label>
 <label>Rate<select id="qRate">${rateOptions()}</select></label>
 <label>Custom / Drop amount<input id="qCustom" type="number" oninput="qCustom.dataset.auto='0'"></label>
 <label><input type="checkbox" id="qBataOn" onchange="toggleBata()"> Include Driver Bata</label>
 <label>Driver Bata amount<input id="qBata" type="number" value="0" disabled></label>
 <label>Discount type<select id="qDiscType">
   <option value="none">No discount</option>
   <option value="percent">Percentage (%)</option>
   <option value="fixed">Fixed amount (Rs.)</option>
 </select></label>
 <label>Discount value<input id="qDiscValue" type="number" value="0"></label>
 <label>Round off to<select id="qRound">
   <option value="0">No rounding</option>
   <option value="10">Nearest Rs.10</option>
   <option value="50">Nearest Rs.50</option>
   <option value="100">Nearest Rs.100</option>
 </select></label>
 <label><b>Advance requested (optional)</b><select id="qAdvancePct" onchange="updateAdvanceAmount()">
   <option value="0">No advance</option>
   <option value="10">10%</option>
   <option value="25">25%</option>
   <option value="50">50%</option>
   <option value="manual">Manual amount</option>
 </select></label>
 <label>Advance amount<input id="qAdvanceAmount" type="number" value="0"></label>
 <label>Quotation valid until (optional)<input id="qValidUntil" type="date"></label>
 </div>
 ${extraChargeFieldsHtml("qExtra")}
 <div class="grid">
  <label><input type="checkbox" id="qGstOn" onchange="qGstPct.disabled=!qGstOn.checked"> Include GST (only if you're GST-registered)</label>
  <label>GST %<input id="qGstPct" type="number" value="0" disabled></label>
 </div>
 <div class="actions"><button class="primary" onclick="calcQuote()">Calculate</button><button onclick="printCurrentQuote()">Print</button><button onclick="downloadCurrentQuotePDF()">PDF</button><button onclick="imageCurrentQuote()">Image</button><button onclick="saveQuote()">Save Quotation</button></div><div id="qCalc" class="ratebox"></div>`;
}
function addStopField(value=""){
 const c=document.querySelector("#qStopsContainer");
 if(!c) return;
 const row=document.createElement("div");
 row.className="grid"; row.style.marginTop="4px";
 row.innerHTML=`<label style="flex:1">Additional destination<input class="q-stop-input" value="${esc(value)}"></label><button type="button" onclick="this.parentElement.remove()" style="align-self:flex-end">Remove</button>`;
 c.appendChild(row);
}
function collectDestinations(){
 const first=document.querySelector("#qDest")?.value||"";
 const rest=Array.from(document.querySelectorAll(".q-stop-input")).map(i=>i.value);
 return [first,...rest].map(v=>v.trim()).filter(Boolean);
}
function openRoute(){
 const start=document.querySelector("#qVehicleStart").value, pickup=document.querySelector("#qPickup").value;
 const stops=collectDestinations(), closing=document.querySelector("#qReturn").value;
 const points=[start,pickup,...stops,closing].map(v=>v.trim()).filter(Boolean);
 if(points.length<2){toast("Enter at least a pickup and destination first");return}
 const origin=points[0], destination=points[points.length-1], waypoints=points.slice(1,-1).join("|");
 let url="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination);
 if(waypoints) url+="&waypoints="+encodeURIComponent(waypoints);
 window.open(url,"_blank");
}
function doubleKm(){ const el=document.querySelector("#qKm"); el.value=(+el.value||0)*2; handleLocalCheck(); }
function calcHoursFromTimes(){
 const sd=document.querySelector("#qStart").value, st=document.querySelector("#qStartTime").value;
 const cd=document.querySelector("#qClose").value, ct=document.querySelector("#qCloseTime").value;
 if(!sd||!st||!cd||!ct){toast("Fill in start/closing date and time first");return}
 const start=new Date(sd+"T"+st), close=new Date(cd+"T"+ct);
 const diffH=(close-start)/3600000;
 if(diffH<=0){toast("Closing time must be after start time");return}
 document.querySelector("#qHours").value=Math.round(diffH*10)/10;
 handleLocalCheck();
}
function handleTripTypeChange(){
 const type=document.querySelector("#qType")?.value;
 const rateSel=document.querySelector("#qRate");
 if(!rateSel) return;
 if(type==="local") rateSel.value="local";
 else if(type==="drop"&&[...rateSel.options].some(o=>o.value==="drop")) rateSel.value="drop";
 handleLocalCheck();
}
function handleLocalCheck(){
 const type=document.querySelector("#qType")?.value;
 const km=+document.querySelector("#qKm")?.value||0, h=+document.querySelector("#qHours")?.value||0;
 if(type==="local"&&(km>db.settings.localMaxKm||h>db.settings.localMaxHours)){
  const typeSel=document.querySelector("#qType");
  if(typeSel){ typeSel.value="one_day"; toast(`Switched to One Day - exceeds Local limit (${db.settings.localMaxKm} KM / ${db.settings.localMaxHours} hrs)`); }
 }
}
function toggleBata(){
 const on=document.querySelector("#qBataOn").checked, catIdx=+document.querySelector("#qCat")?.value||0;
 const bataEl=document.querySelector("#qBata");
 bataEl.disabled=!on;
 if(on) bataEl.value=db.categories[catIdx]?.driverBata||0;
}
function updateAdvanceAmount(){
 const pct=document.querySelector("#qAdvancePct").value;
 const amtEl=document.querySelector("#qAdvanceAmount");
 if(pct==="manual"||pct==="0") return;
 const calc=calcQuote();
 if(!calc.invalid) amtEl.value=Math.round((calc.final||0)*(+pct)/100);
}

function calcQuote(){
 handleLocalCheck();
 if(qCat.value===""){
  qCalc.innerHTML=`<div class="danger"><b>&#11014; Please select a Vehicle Category first</b></div>`;
  return {invalid:true,reason:"Select a vehicle category"};
 }
 const c=db.categories[+qCat.value],days=+document.querySelector("#qDays").value||1,restHours=+document.querySelector("#qRestHours").value||0;
 const overrides={addKm:document.querySelector("#qOverrideAddKm").value,addHour:document.querySelector("#qOverrideAddHour").value};
 const km=+qKm.value||0, h=+qHours.value||0;
 const r=calcFare(c,qRate.value,km,h,days,restHours,overrides);
 if(r.invalid){
  qCalc.innerHTML=`<div class="danger"><b>${esc(r.reason)}</b><br>Select another trip type/rate.</div>`;
  return r;
 }
 const bata=(document.querySelector("#qBataOn")?.checked)?(+qBata.value||0):0;
 const preDiscount=r.total+bata;
 const dr=applyDiscountRound(preDiscount,qDiscType.value,+qDiscValue.value||0,+qRound.value||0);
 const extraCharges=readExtraChargeFields("qExtra");
 const extraTotal=sumExtraCharges(extraCharges);
 const gstOn=document.querySelector("#qGstOn")?.checked||false;
 const gstPct=gstOn?(+document.querySelector("#qGstPct").value||0):0;
 const preGst=dr.final+extraTotal;
 const gstAmount=gstOn?Math.round(preGst*gstPct/100):0;
 const finalWithExtras=preGst+gstAmount;
 qCalc.innerHTML=`<div>Base: <b>${money(r.base)}</b></div>
 ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours</div>
 <div>Extra KM: ${Math.max(0,km-r.incKm)} KM = ${money(r.kmExtra||0)}</div><div>Extra Hour: ${Math.max(0,h-r.incHours)} hrs = ${money(r.hourExtra||0)}</div>`:
 `<div>Extra KM: ${money(r.kmExtra||0)}</div><div>Extra Hour: ${money(r.hourExtra||0)}</div>`}
 ${(r.addKmOverridden||r.addHourOverridden)?`<div class="muted">Using overridden extra rate: Rs.${r.addKm}/KM, Rs.${r.addHour}/hr</div>`:""}
 <div>Applicable extra (higher): <b>${money(r.extra||0)}</b></div>
 <div>Fare Subtotal: ${money(r.total)}</div>
 ${bata?`<div>Driver Bata: ${money(bata)}</div>`:""}
 <div>Subtotal: ${money(preDiscount)}</div>
 ${dr.discountAmount?`<div>Discount: -${money(dr.discountAmount)}</div>`:""}
 ${dr.roundAdjustment?`<div>Round off: ${dr.roundAdjustment>=0?"+":""}${money(dr.roundAdjustment)}</div>`:""}
 ${extraTotal>0?`<div>Other Charges${extraChargesShortLabel(extraCharges)}: +${money(extraTotal)}</div>`:""}
 ${gstAmount>0?`<div>GST @ ${gstPct}%: +${money(gstAmount)}</div>`:""}
 <div class="total">Final quoted fare: ${money(finalWithExtras)}</div>
 ${extraChargesHtml(extraCharges)}`;
 return {...r,...dr,driverBata:bata,extraCharges,extraTotal,gstOn,gstPct,gstAmount,final:finalWithExtras};
}
function buildQuoteObjFromForm(r){
 const c=db.categories[+qCat.value];
 const existing=window._editingQuoteId?db.quotes.find(x=>x.id===window._editingQuoteId):null;
 return {
  id:existing?existing.id:"draft",
  no:existing?existing.no:"QTN-DRAFT",
  created:existing?existing.created:new Date().toISOString(),
  status:existing?existing.status:"quoted",
  customer:qName.value,mobile:qMobile.value,type:qType.value,category:c.name,categoryId:+qCat.value,vehicle:qVehicle.value,vehicleNo:qVehicleNo.value,
  pickup:qPickup.value,vehicleStart:qVehicleStart.value,destinations:collectDestinations(),destination:collectDestinations()[0]||"",returnPoint:qReturn.value,
  estimatedKm:+qKm.value||0,estimatedHours:+qHours.value||0,days:+document.querySelector("#qDays").value||1,restHours:+document.querySelector("#qRestHours").value||0,startDate:qStart.value,startTime:qStartTime.value,closeDate:qClose.value,closeTime:qCloseTime.value,
  service:qService.value,ratePlan:qRate.value,baseRate:r.base,kmRate:r.addKm,hourRate:r.addHour,includedKm:r.incKm,includedHours:r.incHours,
  driverBata:r.driverBata||0,
  discountType:qDiscType.value,discountValue:+qDiscValue.value||0,discountAmount:r.discountAmount,roundOff:+qRound.value||0,roundAdjustment:r.roundAdjustment,
  subtotal:r.total+(r.driverBata||0),quotedAmount:r.final,
  advanceAmount:+qAdvanceAmount.value||0,
  advanceReceived:existing?existing.advanceReceived:false,
  advanceMethod:existing?existing.advanceMethod:"",
  advanceReceivedAt:existing?existing.advanceReceivedAt:"",
  validUntil:document.querySelector("#qValidUntil").value||"",
  entryDate:document.querySelector("#qEntryDate").value||(existing?existing.entryDate:new Date().toISOString().slice(0,10)),
  extraCharges:r.extraCharges||readExtraChargeFields("qExtra"),
  gstOn:r.gstOn||false,gstPct:r.gstPct||0,gstAmount:r.gstAmount||0,
  overrideAddKm:document.querySelector("#qOverrideAddKm").value||"",
  overrideAddHour:document.querySelector("#qOverrideAddHour").value||""
 };
}
function saveQuote(){
 const r=calcQuote();if(r.invalid){toast(r.reason||"Correct the fare details first");return}
 const draft=buildQuoteObjFromForm(r);
 const existing=window._editingQuoteId?db.quotes.find(x=>x.id===window._editingQuoteId):null;
 if(existing){
  Object.assign(existing,draft,{id:existing.id,no:existing.no,created:existing.created});
  save();toast("Quotation updated: "+existing.no);quotations();
 }else{
  draft.id=crypto.randomUUID();draft.no="QTN-"+Date.now();draft.created=new Date().toISOString();draft.status="quoted";
  db.quotes.unshift(draft);window._editingQuoteId=draft.id;
  save();toast("Quotation saved: "+draft.no);quotations();
 }
}
function printCurrentQuote(){ const r=calcQuote(); if(r.invalid){toast(r.reason||"Correct the fare details first");return} printQuoteObj(buildQuoteObjFromForm(r)); }
function downloadCurrentQuotePDF(){ const r=calcQuote(); if(r.invalid){toast(r.reason||"Correct the fare details first");return} downloadQuotePDFObj(buildQuoteObjFromForm(r)); }
function imageCurrentQuote(){ const r=calcQuote(); if(r.invalid){toast(r.reason||"Correct the fare details first");return} printQuoteObj(buildQuoteObjFromForm(r),true); }

function quotations(){
 window._editingQuoteId=null;
 app().innerHTML=card("Quotations",`${quoteForm()}<hr><h3>Saved Quotations</h3>${db.quotes.map(q=>`<div class="listitem"><b>${esc(q.no)}</b> - ${esc(q.customer)} - ${money(q.quotedAmount)}<br>${esc(q.pickup)} &rarr; ${esc((q.destinations||[q.destination]).join(" &rarr; "))}
 ${q.advanceAmount>0?`<div class="${q.advanceReceived?"ok":"danger"}">${q.advanceReceived?`&#9989; Advance received: ${money(q.advanceAmount)} (${esc(q.advanceMethod||"")})`:`&#9888; Advance requested: ${money(q.advanceAmount)} - not yet received`}</div>`:""}
 <div class="actions"><button onclick="openQuote('${q.id}')">Open / Edit</button><button onclick="convertTrip('${q.id}')">Confirm & Create Trip</button><button onclick="downloadQuotePDF('${q.id}')">PDF</button><button onclick="printQuote('${q.id}')">Print</button><button onclick="imageQuote('${q.id}')">Image</button>${q.advanceAmount>0?`<button onclick="openAdvanceQR('${q.id}')">Advance QR</button>${q.advanceReceived?"":`<button class="primary" onclick="markAdvanceReceived('${q.id}')">Mark Advance Received</button>`}`:""}<button class="danger" onclick="deleteQuote('${q.id}')">Delete</button></div></div>`).join("")||"<p class='muted'>No quotations saved.</p>"}`);
}
function deleteQuote(id){
 if(!confirm("Delete this quotation?")) return;
 db.quotes=db.quotes.filter(x=>x.id!==id);
 save();toast("Quotation deleted");quotations();
}
function openAdvanceQR(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 if(!db.business.upiId){toast("Add a UPI ID in Billing Details to generate a payment QR code");return}
 modal(`<h2>Advance Payment QR</h2><p class="muted">${money(q.advanceAmount)} advance for ${esc(q.no)}</p><div id="advQrBox" style="text-align:center"></div>`);
 setTimeout(()=>{
  const box=document.querySelector("#advQrBox");
  if(box&&typeof QRCode!=="undefined") new QRCode(box,{text:buildUpiLink(q.advanceAmount,"Advance "+q.no),width:200,height:200});
 },0);
}
function markAdvanceReceived(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 modal(`<h2>Confirm Advance Received</h2>
  <p class="muted">${esc(q.no)} - Advance amount: ${money(q.advanceAmount)}</p>
  <label>Method<select id="advMethod"><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Other">Other</option></select></label>
  <div class="actions"><button class="primary" onclick="confirmAdvanceReceived('${id}')">Confirm Received</button></div>`);
}
function confirmAdvanceReceived(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 q.advanceReceived=true; q.advanceMethod=document.querySelector("#advMethod").value; q.advanceReceivedAt=new Date().toISOString();
 save();closeModal();toast("Advance marked as received");quotations();
}
function openQuote(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 view("quotations");
 setTimeout(()=>{
  window._editingQuoteId=id;
  qName.value=q.customer;qMobile.value=q.mobile;qType.value=q.type;qCat.value=q.categoryId;qVehicle.value=q.vehicle;qVehicleNo.value=q.vehicleNo;
  qPickup.value=q.pickup;qVehicleStart.value=q.vehicleStart||db.business.officeLocation||"";
  const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination||""];
  qDest.value=dests[0]||"";
  document.querySelector("#qStopsContainer").innerHTML="";
  dests.slice(1).forEach(d=>addStopField(d));
  qService.value=q.service||"";qReturn.value=q.returnPoint;qKm.value=q.estimatedKm;qHours.value=q.estimatedHours;qDays.value=q.days||1;qRestHours.value=q.restHours||0;qStart.value=q.startDate;qStartTime.value=q.startTime;qClose.value=q.closeDate;qCloseTime.value=q.closeTime;
  qRate.value=q.ratePlan;qCustom.value=q.quotedAmount;qDiscType.value=q.discountType||"none";qDiscValue.value=q.discountValue||0;qRound.value=q.roundOff||0;
  qBataOn.checked=!!(q.driverBata); qBata.value=q.driverBata||0; qBata.disabled=!qBataOn.checked;
  qAdvancePct.value="manual"; qAdvanceAmount.value=q.advanceAmount||0; qValidUntil.value=q.validUntil||""; qEntryDate.value=q.entryDate||"";
  const ecLabels=extraChargeLabels();
  Object.keys(ecLabels).forEach(k=>{ const el=document.querySelector("#qExtra_"+k); if(el) el.value=(q.extraCharges&&q.extraCharges[k])||0; });
  qGstOn.checked=!!q.gstOn; qGstPct.value=q.gstPct||0; qGstPct.disabled=!qGstOn.checked;
  qOverrideAddKm.value=q.overrideAddKm||""; qOverrideAddHour.value=q.overrideAddHour||"";
  calcQuote();
 },0);
}
function convertTrip(id){
 const q=db.quotes.find(x=>x.id===id);
 const payments=(q.advanceReceived&&q.advanceAmount>0)?[{amount:q.advanceAmount,method:q.advanceMethod||"Advance",at:q.advanceReceivedAt||new Date().toISOString()}]:[];
 db.trips.unshift({id:crypto.randomUUID(),quoteId:id,customer:q.customer,status:"confirmed",actualKm:0,actualHours:0,payments,extraCharges:q.extraCharges||{},created:new Date().toISOString()});
 q.status="confirmed";save();toast("Trip confirmed"+(payments.length?" - advance carried over as a payment":""));view("trips");
}

/* ---------- TRIPS ---------- */
function trips(){
 app().innerHTML=card("Trips",db.trips.map(t=>{
  const q=db.quotes.find(x=>x.id===t.quoteId);
  return `<div class="listitem"><b>${esc(t.customer)}</b> <span class="muted">${esc(t.status)}</span><br>
  ${q?esc(q.pickup)+" &rarr; "+esc((q.destinations||[q.destination]).join(" &rarr; ")):""}
  <div class="actions"><button onclick="editTrip('${t.id}')">Edit Actual Trip Details</button>${t.status==="completed"?`<button class="primary" onclick="view('billing');setTimeout(()=>{const bt=document.querySelector('#billTrip');if(bt){bt.value='${t.id}';loadBill();}},0)">Go to Billing</button>`:""}</div></div>`;
 }).join("")||"<p class='muted'>No trips yet. Confirm a Quotation to create one.</p>");
}
function findDriverForVehicleNo(vehicleNo){
 if(!vehicleNo) return null;
 const v=db.vehicles.find(x=>x.no===vehicleNo);
 if(!v) return null;
 return db.drivers.find(d=>d.vehicleIdx===db.vehicles.indexOf(v))||null;
}
function editTrip(id){
 const t=db.trips.find(x=>x.id===id);const q=db.quotes.find(x=>x.id===t.quoteId);
 modal(`<h2>Actual Trip Details</h2><div class="grid">
 <label>Bill entry date (leave blank for today)<input id="aEntryDate" type="date" value="${t.entryDate||""}"></label>
 <label>Actual start date<input id="aStart" type="date" value="${t.startDate||q.startDate||""}"></label>
 <label>Actual start time<input id="aTime" type="time" value="${t.startTime||q.startTime||""}"></label>
 <label>Actual closing date<input id="aClose" type="date" value="${t.closeDate||q.closeDate||""}"></label>
 <label>Actual closing time<input id="aCloseTime" type="time"></label>
 <label>Actual start point<input id="aPickup" value="${esc(t.pickup||q.pickup)}"></label>
 <label>Actual destinations<input id="aDest" value="${esc(t.dest||(q.destinations||[]).join(', ')||q.destination)}"></label>
 <label>Actual closing point<input id="aReturn" value="${esc(t.returnPoint||q.returnPoint)}"></label>
 <label>Actual KM<input id="aKm" type="number" value="${t.actualKm||0}"></label>
 <label>Actual Hours<input id="aHours" type="number" value="${t.actualHours||0}"></label>
 <label>Actual number of days<input id="aDays" type="number" value="${t.days||q.days||1}" min="1"></label>
 <label>Actual overnight rest hours (excluded)<input id="aRestHours" type="number" value="${t.restHours!=null?t.restHours:(q.restHours||0)}"></label>
 <label>Driver name (optional, this trip only)<input id="aDriverName" value="${esc(t.driverName||"")}"></label>
 <label>Driver mobile (optional, this trip only)<input id="aDriverMobile" value="${esc(t.driverMobile||"")}"></label>
 </div>${extraChargeFieldsHtml("aExtra",t.extraCharges||q.extraCharges)}<button class="primary" onclick="saveTrip('${id}')">Save Actual Trip</button>`);
}
function saveTrip(id){
 const t=db.trips.find(x=>x.id===id);
 Object.assign(t,{
  entryDate:document.querySelector("#aEntryDate").value||t.entryDate||new Date().toISOString().slice(0,10),
  startDate:aStart.value,startTime:aTime.value,closeDate:aClose.value,closeTime:aCloseTime.value,
  pickup:aPickup.value,dest:aDest.value,returnPoint:aReturn.value,
  actualKm:+aKm.value||0,actualHours:+aHours.value||0,
  days:+document.querySelector("#aDays").value||1,restHours:+document.querySelector("#aRestHours").value||0,
  driverName:document.querySelector("#aDriverName").value.trim(),driverMobile:document.querySelector("#aDriverMobile").value.trim(),
  status:"completed",extraCharges:readExtraChargeFields("aExtra")
 });
 save();closeModal();toast("Trip updated");
 if(document.querySelector("#billBox")&&document.querySelector("#billTrip")) loadBill();
}

/* ---------- BILL CALCULATION ---------- */
function billFinalAmount(t,q,c){
 const km=t.actualKm||q.estimatedKm, h=t.actualHours||q.estimatedHours;
 const days=t.days||q.days||1, restHours=t.restHours!=null?t.restHours:(q.restHours||0);
 const r=calcFare(c,q.ratePlan,km,h,days,restHours,{addKm:q.overrideAddKm,addHour:q.overrideAddHour});
 const fareSubtotal=r.invalid?(q.subtotal??q.quotedAmount):r.total;
 const bata=q.driverBata||0;
 const subtotal=fareSubtotal+bata;
 const dr=applyDiscountRound(subtotal,q.discountType||"none",q.discountValue||0,q.roundOff||0);
 const adjAmount=(t.adjustment&&Number(t.adjustment.amount))||0;
 const extraCharges=t.extraCharges||q.extraCharges||{};
 const extraTotal=sumExtraCharges(extraCharges);
 const preGst=dr.final+adjAmount+extraTotal;
 const gstOn=q.gstOn||false, gstPct=gstOn?(q.gstPct||0):0;
 const gstAmount=gstOn?Math.round(preGst*gstPct/100):0;
 const finalAdjusted=Math.max(0,preGst+gstAmount);
 return {...r,subtotal,driverBata:bata,...dr,final:finalAdjusted,manualAdjustment:adjAmount,manualAdjustmentNote:(t.adjustment&&t.adjustment.note)||"",extraCharges,extraTotal,gstOn,gstPct,gstAmount};
}
function billBreakdown(t,q,c){
 const km=t.actualKm||q.estimatedKm, h=t.actualHours||q.estimatedHours;
 const days=t.days||q.days||1, restHours=t.restHours!=null?t.restHours:(q.restHours||0);
 const standardRaw=calcFare(c,"standard",km,h,days,restHours);
 const r=billFinalAmount(t,q,c);
 const offerFareTotal=r.base+(r.extra||0);
 const rateSaving=(!standardRaw.invalid)?Math.max(0,standardRaw.total-offerFareTotal):0;
 const quoteDiscount=r.discountAmount||0;
 const manualDiscount=r.manualAdjustment<0?-r.manualAdjustment:0;
 const manualAddition=r.manualAdjustment>0?r.manualAdjustment:0;
 const totalSavings=rateSaving+quoteDiscount+manualDiscount;
 return {km,h,standardRaw,r,offerFareTotal,rateSaving,quoteDiscount,manualDiscount,manualAddition,totalSavings};
}
function billPrintDate(){
 const el=document.querySelector("#billDateInput");
 const v=el&&el.value?el.value:new Date().toISOString().slice(0,10);
 return v;
}
/* Each bill gets its own permanent sequential number, generated once the
   FIRST time it's calculated and kept from then on - separate from the
   Quotation Number, since a Quick Bill never had a formal quotation and
   otherwise had no proper reference number of its own at all. */
function ensureBillNo(t){
 if(!t.billNo) t.billNo="BILL-"+Date.now();
 return t.billNo;
}

/* ---------- UPI / QR HELPERS ---------- */
function buildUpiLink(amount,note){
 const params=new URLSearchParams({pa:db.business.upiId||"",pn:db.business.upiName||db.business.name||"Travel Connect",am:String(amount),cu:"INR",tn:note||""});
 return "upi://pay?"+params.toString();
}
/* Renders into an element genuinely attached to the live document (hidden
   off-screen) rather than a detached <div> - the QRCode library's on-
   screen modal usage (openAdvanceQR(), tcGenerateNonTaxiQR()) already
   works reliably because it renders into a box that's really in the page;
   a detached element was the difference, and why this same library call
   silently produced nothing for Print/PDF/balance-due QR codes even
   though the identical call worked for the live on-screen modal. */
function getQRDataURL(text,size){
 let tmp;
 try{
  tmp=document.createElement("div");
  tmp.style.cssText="position:fixed;left:-9999px;top:-9999px;";
  document.body.appendChild(tmp);
  new QRCode(tmp,{text,width:size||200,height:size||200});
  const img=tmp.querySelector("img")||tmp.querySelector("canvas");
  if(!img) return null;
  return img.tagName==="CANVAS"?img.toDataURL("image/png"):img.src;
 }catch(e){ return null; }
 finally{ if(tmp&&tmp.parentNode) tmp.parentNode.removeChild(tmp); }
}
function renderBillQR(amount,note){
 const box=document.querySelector("#billQR");
 if(!box) return;
 if(!db.business.upiId){ box.innerHTML=""; return; }
 box.innerHTML="";
 if(typeof QRCode==="undefined") return;
 new QRCode(box,{text:buildUpiLink(amount,note),width:180,height:180});
 box.insertAdjacentHTML("beforeend",`<div class="muted" style="text-align:center;margin-top:4px">Scan to pay balance: ${money(amount)}</div>`);
}

/* ---------- BILLING PAGE ---------- */
function billing(){
 app().innerHTML=card("Final Billing",`
 <div class="card" style="background:#eef6ff;border:2px solid #3b7bbf">
  <h3 style="margin-top:0">&#9889; Quick Bill (trip already done - no Enquiry/Quotation needed)</h3>
  <p class="muted">For when the trip is already over and you just need to bill it directly.</p>
  <div class="actions"><button class="primary" onclick="openQuickBillForm()">Create Quick Bill</button></div>
 </div>
 <hr>
 <label>Trip<select id="billTrip">${db.trips.map(t=>`<option value="${t.id}">${esc(t.customer)} - ${esc(t.id.slice(0,8))}</option>`).join("")}</select></label>
 <label>Bill print date (optional, defaults to today)<input id="billDateInput" type="date"></label>
 <div class="actions"><button class="primary" onclick="loadBill()">Calculate Final Bill</button></div><div id="billBox"></div>`);
}
function openQuickBillForm(){
 const cat=tcCategoryOptions();
 modal(`<h2>Quick Bill</h2>
 <div class="grid">
  <label>Customer name<input id="qbName"></label><label>Customer mobile<input id="qbMobile"></label>
  <label>Trip type<select id="qbType">
    <option value="local">Local Trip</option><option value="one_day">One Day</option>
    <option value="round">Round Trip</option><option value="outstation">Outstation</option><option value="drop">Drop</option>
  </select></label>
  <label>Vehicle category<select id="qbCat">${cat}</select></label>
  <label>Vehicle<input id="qbVehicle"></label><label>Vehicle number<input id="qbVehicleNo"></label>
  <label>Driver name (optional)<input id="qbDriverName"></label>
  <label>Driver mobile (optional)<input id="qbDriverMobile"></label>
  <label><b>&#128663; Vehicle start point</b><input id="qbVehicleStart" value="${esc(db.business.officeLocation)}"></label>
  <label><b>Customer pickup point</b><input id="qbPickup"></label>
  <label>Destination 1<input id="qbDest"></label>
 </div>
 <div id="qbStopsContainer"></div>
 <div class="actions"><button type="button" onclick="addQuickBillStopField()">+ Add another destination</button></div>
 <div class="grid">
  <label><b>Vehicle closing point</b><input id="qbReturn" value="${esc(db.business.officeLocation)}"></label>
  <label><b>Actual KM</b><input id="qbKm" type="number" value="0"></label>
  <label><b>Actual Hours</b><input id="qbHours" type="number" value="0"></label>
  <label>Number of days<input id="qbDays" type="number" value="1" min="1"></label>
  <label>Overnight rest hours (excluded)<input id="qbRestHours" type="number" value="0"></label>
  <label>Rate<select id="qbRate">${rateOptions()}</select></label>
  <label>Override Extra KM Rate (optional)<input id="qbOverrideAddKm" type="number"></label>
  <label>Override Extra Hour Rate (optional)<input id="qbOverrideAddHour" type="number"></label>
  <label>Trip date<input id="qbDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
 </div>
 ${extraChargeFieldsHtml("qbExtra")}
 <div class="actions"><button class="primary" onclick="calcQuickBillPreview()">Preview Fare</button></div>
 <div id="qbResult" class="ratebox"></div>
 <div class="actions"><button class="primary" onclick="saveQuickBill()">Create Bill</button></div>`);
}
function addQuickBillStopField(value=""){
 const c=document.querySelector("#qbStopsContainer");
 if(!c) return;
 const row=document.createElement("div");
 row.className="grid"; row.style.marginTop="4px";
 row.innerHTML=`<label style="flex:1">Additional destination<input class="qb-stop-input" value="${esc(value)}"></label><button type="button" onclick="this.parentElement.remove()" style="align-self:flex-end">Remove</button>`;
 c.appendChild(row);
}
function collectQuickBillDestinations(){
 const first=document.querySelector("#qbDest")?.value||"";
 const rest=Array.from(document.querySelectorAll(".qb-stop-input")).map(i=>i.value);
 return [first,...rest].map(v=>v.trim()).filter(Boolean);
}
function calcQuickBillPreview(){
 const catEl=document.querySelector("#qbCat");
 const box=document.querySelector("#qbResult");
 if(catEl.value===""){ box.innerHTML=`<div class="danger"><b>&#11014; Please select a Vehicle Category first</b></div>`; return; }
 const c=db.categories[+catEl.value];
 const plan=document.querySelector("#qbRate").value;
 const km=+document.querySelector("#qbKm").value||0, h=+document.querySelector("#qbHours").value||0;
 const days=+document.querySelector("#qbDays").value||1, restHours=+document.querySelector("#qbRestHours").value||0;
 const overrides={addKm:document.querySelector("#qbOverrideAddKm").value,addHour:document.querySelector("#qbOverrideAddHour").value};
 const r=calcFare(c,plan,km,h,days,restHours,overrides);
 if(r.invalid){ box.innerHTML=`<div class="danger"><b>${esc(r.reason)}</b></div>`; return; }
 const extraCharges=readExtraChargeFields("qbExtra");
 const extraTotal=sumExtraCharges(extraCharges);
 box.innerHTML=`<div>Base: <b>${money(r.base)}</b></div>
 ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours</div>`:""}
 <div>Extra (higher of KM/hour): <b>${money(r.extra||0)}</b></div>
 ${extraTotal>0?`<div>Other Charges${extraChargesShortLabel(extraCharges)}: +${money(extraTotal)}</div>`:""}
 <div class="total">Bill Amount: ${money(r.total+extraTotal)}</div>`;
}
function saveQuickBill(){
 const name=document.querySelector("#qbName").value, mobile=document.querySelector("#qbMobile").value;
 if(!name||!mobile){toast("Enter the customer's name and mobile number");return}
 if(document.querySelector("#qbCat").value===""){toast("Select a Vehicle Category first");return}
 const c=db.categories[+document.querySelector("#qbCat").value];
 const km=+document.querySelector("#qbKm").value||0, h=+document.querySelector("#qbHours").value||0;
 const days=+document.querySelector("#qbDays").value||1, restHours=+document.querySelector("#qbRestHours").value||0;
 const overrideAddKm=document.querySelector("#qbOverrideAddKm").value||"", overrideAddHour=document.querySelector("#qbOverrideAddHour").value||"";
 const ratePlan=document.querySelector("#qbRate").value;
 const r=calcFare(c,ratePlan,km,h,days,restHours,{addKm:overrideAddKm,addHour:overrideAddHour});
 if(r.invalid){toast(r.reason||"Correct the fare details first");return}
 const qId=crypto.randomUUID();
 const quote={
  id:qId,no:"QTN-"+Date.now(),created:new Date().toISOString(),status:"billed",
  customer:name,mobile,type:document.querySelector("#qbType").value,category:c.name,categoryId:+document.querySelector("#qbCat").value,
  vehicle:document.querySelector("#qbVehicle").value,vehicleNo:document.querySelector("#qbVehicleNo").value,
  pickup:document.querySelector("#qbPickup").value,vehicleStart:document.querySelector("#qbVehicleStart").value,
  destinations:collectQuickBillDestinations(),destination:collectQuickBillDestinations()[0]||"",
  returnPoint:document.querySelector("#qbReturn").value,
  estimatedKm:km,estimatedHours:h,days,restHours,startDate:document.querySelector("#qbDate").value,
  ratePlan,overrideAddKm,overrideAddHour,
  discountType:"none",discountValue:0,roundOff:0,
  subtotal:r.total,quotedAmount:r.total,
  advanceAmount:0,advanceReceived:false,
  extraCharges:readExtraChargeFields("qbExtra"),
  gstOn:false,gstPct:0,gstAmount:0
 };
 db.quotes.unshift(quote);
 const trip={id:crypto.randomUUID(),quoteId:qId,customer:name,status:"completed",actualKm:km,actualHours:h,days,restHours,
  driverName:document.querySelector("#qbDriverName").value.trim(),driverMobile:document.querySelector("#qbDriverMobile").value.trim(),
  entryDate:new Date().toISOString().slice(0,10),startDate:document.querySelector("#qbDate").value,
  pickup:document.querySelector("#qbPickup").value,dest:collectQuickBillDestinations().join(", "),returnPoint:document.querySelector("#qbReturn").value,
  payments:[],extraCharges:quote.extraCharges,created:new Date().toISOString()};
 db.trips.unshift(trip);
 save();closeModal();toast("Bill created");
 view("billing");
 setTimeout(()=>{
  const bt=document.querySelector("#billTrip");
  if(bt){ bt.value=trip.id; loadBill(); }
 },0);
}
function goQuickBill(){ view("billing"); setTimeout(openQuickBillForm,0); }

/* ---------- FINAL BILL CALCULATION + PAYMENT ---------- */
function loadBill(){
 const t=db.trips.find(x=>x.id===billTrip.value);if(!t)return;
 ensureBillNo(t); save();
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const bd=billBreakdown(t,q,c);
 const {km,h,standardRaw,r,rateSaving,manualDiscount,manualAddition,totalSavings}=bd;
 const final=r.final;
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0);
 const balance=Math.max(0,final-paid);
 billBox.innerHTML=`<div class="ratebox">
  <div class="muted">Bill Number: <b>${esc(t.billNo)}</b></div>
  <div class="actions"><button onclick="editTrip('${t.id}')">Edit trip details (KM / hours / dates / Driver / Other Charges)</button><button onclick="openAdjustBill('${t.id}')">Adjust Final Bill Amount</button></div>

  <h3>1. Usage Details</h3>
  <div>Total KM: <b>${km}</b> &nbsp; Total Hours: <b>${h}</b></div>
  ${r.days>1?`<div class="muted">${r.days} day trip</div>`:""}
  ${r.restHours>0?`<div class="muted">Overnight rest hours excluded: ${r.restHours} hrs</div>`:""}
  ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hrs</div>
  <div>Extra KM: ${Math.max(0,km-r.incKm)} (${money(r.kmExtra||0)}) &nbsp; Extra Hours: ${Math.max(0,h-r.incHours)} (${money(r.hourExtra||0)})</div>`:""}

  <h3>2. Standard vs Offer Rate</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
   <tr style="color:#666"><td></td><td style="text-align:right;padding:2px 4px">Standard Rate</td><td style="text-align:right;padding:2px 4px">Offer Rate</td></tr>
   <tr><td>Base Rate</td><td style="text-align:right;padding:2px 4px">${money(standardRaw.invalid?0:standardRaw.base)}</td><td style="text-align:right;padding:2px 4px">${money(r.base)}</td></tr>
   <tr><td>Additional Charge</td><td style="text-align:right;padding:2px 4px">${money(standardRaw.invalid?0:standardRaw.extra)}</td><td style="text-align:right;padding:2px 4px">${money(r.extra||0)}</td></tr>
   <tr style="border-top:1px solid #ccc;font-weight:bold"><td>Total</td><td style="text-align:right;padding:2px 4px">${money(standardRaw.invalid?0:standardRaw.total)}</td><td style="text-align:right;padding:2px 4px">${money(r.base+(r.extra||0))}</td></tr>
  </table>

  ${totalSavings>0?`<div style="background:#e6f7e9;border:1px solid #2e9e44;border-radius:8px;padding:10px;margin:10px 0;color:#1c6b2c">
   <div style="font-weight:bold;font-size:16px">&#127881; Your Total Savings: ${money(totalSavings)}</div>
   <div style="font-size:12px">${rateSaving?`Offer discount ${money(rateSaving)}`:""}${manualDiscount?`${rateSaving?" + ":""}Additional discount ${money(manualDiscount)}`:""}</div></div>`:""}

  <h3>3. Final Payment Summary</h3>
  <div>Base Rate: ${money(r.base)}</div>
  <div>Additional Charge (higher of KM/Hour): ${money(r.extra||0)}</div>
  ${r.driverBata?`<div>Driver Bata: ${money(r.driverBata)}</div>`:""}
  ${manualDiscount?`<div>Manual Discount: -${money(manualDiscount)}${r.manualAdjustmentNote?` <span class="muted">(${esc(r.manualAdjustmentNote)})</span>`:""}</div>`:""}
  ${manualAddition?`<div>Manual Addition: +${money(manualAddition)}${r.manualAdjustmentNote?` <span class="muted">(${esc(r.manualAdjustmentNote)})</span>`:""}</div>`:""}
  ${r.roundAdjustment?`<div>Round off: ${r.roundAdjustment>=0?"+":""}${money(r.roundAdjustment)}</div>`:""}
  ${r.extraTotal>0?`<div>Other Charges${extraChargesShortLabel(r.extraCharges)}: +${money(r.extraTotal)}</div>`:""}
  ${r.gstAmount>0?`<div>GST @ ${r.gstPct}%: +${money(r.gstAmount)}</div>`:""}
  <div class="total">FINAL BILL AMOUNT: ${money(final)}</div>
  ${extraChargesHtml(r.extraCharges)}

  ${(t.payments||[]).length?`<h3>Payments received</h3>${t.payments.map(p=>`<div>${esc(p.method)}: ${money(p.amount)} <span class="muted">(${(p.at||"").slice(0,16).replace("T"," ")})</span></div>`).join("")}<div class="actions"><button onclick="undoLastPayment('${t.id}')">Undo last payment</button></div>`:""}
  <div><b>Total paid: ${money(paid)}</b></div>
  <div class="total">Balance due: ${money(balance)}</div>
  ${balance>0?`
  <p class="danger" style="margin:6px 0"><b>&#9888; Enter only the amount actually received now - it does not fill in automatically.</b></p>
  <div class="grid" style="margin-top:8px">
   <label>Payment amount (max ${money(balance)})<input id="payAmt" type="number" placeholder="e.g. 500"></label>
   <label>Method<select id="payMethod"><option value="Advance">Advance</option><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Other">Other</option></select></label>
  </div>
  <div class="actions"><button class="primary" onclick="recordPayment('${t.id}')">Record Payment</button></div>
  <div id="billQR" style="margin-top:10px"></div>
  `:`<div class="ok" style="margin-top:8px"><b>&#9989; Fully Settled - no balance due</b></div>`}
  <div class="actions"><button onclick="downloadBillPDF('${t.id}')">PDF</button><button onclick="printBill('${t.id}')">Print</button><button onclick="imageBill('${t.id}')">Image</button></div>
 </div>`;
 if(balance>0) renderBillQR(balance,q.no||t.id.slice(0,8));
}
function recordPayment(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 const amt=+document.querySelector("#payAmt").value||0;
 if(amt<=0){toast("Enter a valid payment amount");return}
 t.payments=t.payments||[];
 t.payments.push({amount:amt,method:document.querySelector("#payMethod").value,at:new Date().toISOString()});
 save();toast("Payment recorded");loadBill();
}
function undoLastPayment(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 if(!t.payments||!t.payments.length) return;
 if(!confirm("Remove the last recorded payment?")) return;
 t.payments.pop(); save();toast("Last payment removed");loadBill();
}
function openAdjustBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 modal(`<h2>Adjust Final Bill Amount</h2>
  <p class="muted">Add or subtract a manual amount from the final bill, with a reason (shown on the printed bill).</p>
  <div class="grid">
   <label>Amount (negative to subtract, e.g. -200)<input id="adjAmt" type="number" value="${t.adjustment?t.adjustment.amount:0}"></label>
   <label>Reason<input id="adjNote" value="${esc(t.adjustment?t.adjustment.note:"")}" placeholder="e.g. Goodwill discount"></label>
  </div>
  <div class="actions"><button class="primary" onclick="saveAdjustment('${tripId}')">Save</button></div>`);
}
function saveAdjustment(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 const amt=+document.querySelector("#adjAmt").value||0, note=document.querySelector("#adjNote").value.trim();
 if(amt===0) t.adjustment=null;
 else t.adjustment={amount:amt,note};
 save();closeModal();toast("Bill amount adjusted");loadBill();
}

/* ---------- ENQUIRIES + QUICK FARE ---------- */
function enquiries(){
 const cat=tcCategoryOptions();
 app().innerHTML=card("Enquiry Management",`
 <div class="card" style="background:#eef6ff;border:2px solid #3b7bbf">
  <h3 style="margin-top:0">&#9889; Quick Fare (during a call - no save needed)</h3>
  <p class="muted">Type the route/KM and read out the fare instantly. Nothing here is saved unless you tap "Save as Enquiry" below.</p>
  <div class="grid">
   <label>Customer name<input id="qqName"></label>
   <label>Customer mobile<input id="qqMobile"></label>
  </div>
  <div class="grid">
   <label><b>&#128663; Vehicle start point (garage/office)</b><input id="qqVehicleStart" value="${esc(db.business.officeLocation)}"></label>
   <label><b>Customer pickup point</b><input id="qqPickup"></label>
   <label>Destination 1<input id="qqDest"></label>
  </div>
  <div id="qqStopsContainer"></div>
  <div class="actions"><button type="button" onclick="addQuickStopField()">+ Add another destination</button></div>
  <div class="grid"><label><b>Vehicle closing point (where the trip ends)</b><input id="qqReturn" value="${esc(db.business.officeLocation)}"></label></div>
  <div class="actions"><button type="button" onclick="openQuickRoute()">&#128663; Open route in Google Maps</button></div>
  <div class="grid">
   <label>Vehicle category<select id="qqCat">${cat}</select></label>
   <label>Rate<select id="qqRate">${rateOptions()}</select></label>
   <label>Estimated KM<input id="qqKm" type="number" value="80"></label>
   <label>Estimated hours<input id="qqHours" type="number" value="8"></label>
   <label>Number of days (for outstation trips)<input id="qqDays" type="number" value="1" min="1"></label>
   <label>Overnight rest hours (excluded from billing)<input id="qqRestHours" type="number" value="0"></label>
   <label>Override Extra KM Rate (optional)<input id="qqOverrideAddKm" type="number" placeholder="Leave blank for selected rate's own value"></label>
   <label>Override Extra Hour Rate (optional)<input id="qqOverrideAddHour" type="number" placeholder="Leave blank for selected rate's own value"></label>
  </div>
  ${extraChargeFieldsHtml("qqExtra")}
  <div class="actions"><button class="primary" onclick="calcQuickFare()">Calculate Fare</button></div>
  <div id="qqResult" class="ratebox"></div>
  <div class="actions"><button onclick="saveQuickAsEnquiry()">Save as Enquiry</button></div>
 </div>
 <hr>
 <div class="grid">
 <label>Customer name<input id="enqName"></label><label>Mobile<input id="enqMobile"></label>
 <label>Pickup<input id="enqPickup"></label><label>Destination<input id="enqDest"></label>
 <label>Trip type<select id="enqType"><option value="local">Local Trip</option><option value="one_day">One Day</option><option value="round">Round Trip</option><option value="outstation">Outstation</option><option value="drop">Drop</option></select></label>
 <label>Required date<input id="enqDate" type="date"></label>
 <label>Entry date (leave blank for today)<input id="enqEntryDate" type="date"></label></div>
 <div class="actions"><button class="primary" onclick="saveEnquiry()">Save Enquiry</button></div>
 <div id="enqList">${db.enquiries.map(e=>`<div class="listitem"><b>${esc(e.name)}</b> &bull; ${esc(e.mobile)}<br>${esc(e.pickup)} &rarr; ${esc(e.dest)}<br><span class="muted">${esc(e.type)} &bull; Required: ${esc(e.date)} &bull; Entered: ${esc(e.entryDate||(e.created||"").slice(0,10))} &bull; ${esc(e.status)}</span>
 <div class="actions"><button class="primary" onclick="enquiryToQuote('${e.id}')">Create Quotation</button></div></div>`).join("")||"<p class='muted'>No enquiries.</p>"}</div>`);
}
function addQuickStopField(value=""){
 const c=document.querySelector("#qqStopsContainer");
 if(!c) return;
 const row=document.createElement("div");
 row.className="grid"; row.style.marginTop="4px";
 row.innerHTML=`<label style="flex:1">Additional destination<input class="qq-stop-input" value="${esc(value)}"></label><button type="button" onclick="this.parentElement.remove()" style="align-self:flex-end">Remove</button>`;
 c.appendChild(row);
}
function collectQuickDestinations(){
 const first=document.querySelector("#qqDest")?.value||"";
 const rest=Array.from(document.querySelectorAll(".qq-stop-input")).map(i=>i.value);
 return [first,...rest].map(v=>v.trim()).filter(Boolean);
}
function openQuickRoute(){
 const start=document.querySelector("#qqVehicleStart").value, pickup=document.querySelector("#qqPickup").value;
 const stops=collectQuickDestinations(), closing=document.querySelector("#qqReturn").value;
 const points=[start,pickup,...stops,closing].map(v=>v.trim()).filter(Boolean);
 if(points.length<2){toast("Enter at least a pickup and destination first");return}
 const origin=points[0], destination=points[points.length-1], waypoints=points.slice(1,-1).join("|");
 let url="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination);
 if(waypoints) url+="&waypoints="+encodeURIComponent(waypoints);
 window.open(url,"_blank");
}
function calcQuickFare(){
 const catEl=document.querySelector("#qqCat");
 const box=document.querySelector("#qqResult");
 if(catEl.value===""){ box.innerHTML=`<div class="danger"><b>&#11014; Please select a Vehicle Category first</b></div>`; return; }
 const c=db.categories[+catEl.value];
 const plan=document.querySelector("#qqRate").value;
 const km=+document.querySelector("#qqKm").value||0, h=+document.querySelector("#qqHours").value||0;
 const days=+document.querySelector("#qqDays").value||1;
 const restHours=+document.querySelector("#qqRestHours").value||0;
 const overrides={addKm:document.querySelector("#qqOverrideAddKm").value,addHour:document.querySelector("#qqOverrideAddHour").value};
 const r=calcFare(c,plan,km,h,days,restHours,overrides);
 if(r.invalid){ box.innerHTML=`<div class="danger"><b>${esc(r.reason)}</b></div>`; return; }
 const extraCharges=readExtraChargeFields("qqExtra");
 const extraTotal=sumExtraCharges(extraCharges);
 if(plan==="standard"){
  box.innerHTML=`<div>Base: <b>${money(r.base)}</b></div>
  ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours</div>`:""}
  <div>Extra (higher of KM/hour): <b>${money(r.extra||0)}</b></div>
  ${days>1?`<div class="muted">${days} day trip</div>`:""}
  ${extraTotal>0?`<div>Other Charges${extraChargesShortLabel(extraCharges)}: +${money(extraTotal)}</div>`:""}
  <div class="total">Standard Fare: ${money(r.total+extraTotal)}</div>
  ${extraChargesHtml(extraCharges)}`;
  return;
 }
 const standardRaw=calcFare(c,"standard",km,h,days,restHours);
 const stdTotal=standardRaw.invalid?0:standardRaw.total;
 const savings=(!standardRaw.invalid)?Math.max(0,stdTotal-r.total):0;
 box.innerHTML=`
 ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours</div>`:""}
 ${days>1?`<div class="muted">${days} day trip</div>`:""}
 <table style="width:100%;margin-top:6px">
  <tr style="color:#888;font-size:12px"><td></td><td style="text-align:right">Standard</td><td style="text-align:right">Offer</td></tr>
  <tr><td>Fare</td><td style="text-align:right">${money(stdTotal)}</td><td style="text-align:right;font-weight:bold">${money(r.total)}</td></tr>
 </table>
 ${savings>0?`<div class="ok" style="margin-top:6px">&#127881; Customer saves: ${money(savings)}</div>`:""}
 ${extraTotal>0?`<div style="margin-top:6px">Other Charges${extraChargesShortLabel(extraCharges)}: +${money(extraTotal)}</div>`:""}
 <div class="total" style="margin-top:6px">Offer Fare: ${money(r.total+extraTotal)}</div>
 ${extraChargesHtml(extraCharges)}`;
}
function saveEnquiry(){
 if(!enqName.value||!enqMobile.value){toast("Enter customer name and mobile");return}
 const entryDate=document.querySelector("#enqEntryDate").value||new Date().toISOString().slice(0,10);
 db.enquiries.unshift({id:crypto.randomUUID(),name:enqName.value,mobile:enqMobile.value,pickup:enqPickup.value,dest:enqDest.value,type:enqType.value,date:enqDate.value,entryDate,status:"new",created:new Date().toISOString()});
 save();toast("Enquiry saved");enquiries();
}
function saveQuickAsEnquiry(){
 const pickup=document.querySelector("#qqPickup").value;
 const stops=collectQuickDestinations();
 const name=document.querySelector("#qqName").value, mobile=document.querySelector("#qqMobile").value;
 if(!name||!mobile){toast("Enter the customer's name and mobile number first");return}
 if(!pickup&&!stops.length){toast("Enter at least a pickup or destination first");return}
 if(document.querySelector("#qqCat").value===""){toast("Select a Vehicle Category first");return}
 const entryDate=new Date().toISOString().slice(0,10);
 db.enquiries.unshift({
  id:crypto.randomUUID(),name,mobile,pickup,dest:stops.join(" &rarr; "),destinations:stops,
  vehicleStart:document.querySelector("#qqVehicleStart").value,returnPoint:document.querySelector("#qqReturn").value,
  type:"local",date:"",entryDate,status:"new",created:new Date().toISOString(),
  categoryId:+document.querySelector("#qqCat").value,ratePlan:document.querySelector("#qqRate").value,
  estimatedKm:+document.querySelector("#qqKm").value||0,estimatedHours:+document.querySelector("#qqHours").value||0,
  days:+document.querySelector("#qqDays").value||1,restHours:+document.querySelector("#qqRestHours").value||0,
  overrideAddKm:document.querySelector("#qqOverrideAddKm").value||"",overrideAddHour:document.querySelector("#qqOverrideAddHour").value||"",
  extraCharges:readExtraChargeFields("qqExtra")
 });
 save();toast("Saved as a new Enquiry");enquiries();
}
function enquiryToQuote(id){
 const e=db.enquiries.find(x=>x.id===id);
 if(!e){toast("Enquiry not found");return}
 e.status="quoted";save();
 view("quotations");
 setTimeout(()=>{
  qName.value=e.name;qMobile.value=e.mobile;qPickup.value=e.pickup;
  if(e.vehicleStart) qVehicleStart.value=e.vehicleStart;
  if(e.returnPoint) qReturn.value=e.returnPoint;
  const dests=(e.destinations&&e.destinations.length)?e.destinations:(e.dest?[e.dest]:[]);
  qDest.value=dests[0]||"";
  document.querySelector("#qStopsContainer").innerHTML="";
  dests.slice(1).forEach(d=>addStopField(d));
  if(["local","one_day","round","outstation","drop"].includes(e.type)) qType.value=e.type;
  qStart.value=e.date||"";
  if(e.categoryId!=null) qCat.value=e.categoryId;
  if(e.ratePlan) qRate.value=e.ratePlan;
  if(e.estimatedKm) qKm.value=e.estimatedKm;
  if(e.estimatedHours) qHours.value=e.estimatedHours;
  if(e.days) qDays.value=e.days;
  if(e.restHours) qRestHours.value=e.restHours;
  if(e.overrideAddKm) qOverrideAddKm.value=e.overrideAddKm;
  if(e.overrideAddHour) qOverrideAddHour.value=e.overrideAddHour;
  if(e.extraCharges){
   const ecLabels=extraChargeLabels();
   Object.keys(ecLabels).forEach(k=>{ const el=document.querySelector("#qExtra_"+k); if(el&&e.extraCharges[k]) el.value=e.extraCharges[k]; });
  }
  handleTripTypeChange();
  calcQuote();
  toast("Enquiry details loaded - complete and save the quotation");
 },0);
}

/* ---------- DASHBOARD (Taxi / Travel Agency owner only) ----------
   core.js's render() calls this unconditionally for any role:"owner" -
   the check below is what actually splits a confirmed non-taxi owner off
   to directory.js's simpler partnerView() instead. Until the business
   type is confirmed from the server (myBusinessType still null), this
   also defers to partnerView(), which shows the registration form - so a
   brand-new owner never briefly flashes the full taxi toolset before
   picking their own category. */
function dashboard(){
 if(db.settings.myBusinessType==null||!tcIsTaxiType(db.settings.myBusinessType)){
  partnerView();
  return;
 }
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean).join(" / ");
 app().innerHTML=card("Travel Connect Dashboard",`
 <div style="background:#e8f5f4;border:2px solid #148c76;border-radius:10px;padding:14px;text-align:center;margin-bottom:14px">
  <div style="font-weight:800;font-size:19px;color:#0f5a55">${esc(db.business.name||"Your Business Name")}</div>
  ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
  ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
  ${db.business.email?`<div style="font-size:12px;color:#555">${esc(db.business.email)}</div>`:""}
  ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:14px;margin-top:4px">${esc(partnerPhones)}</div>`:""}
  <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Edit Business Details</button>${(window._myBusinesses||[]).length>1?`<button onclick="sessionStorage.removeItem('tc_chosen_partner_id');view('partner')">&#8646; Switch Business</button>`:""}</div>
  ${tcIsPremiumPlan()?
   `<div style="margin-top:8px;font-size:11.5px;color:#0f5a55;font-weight:bold">Premium - your own business name/contact shown on every bill &amp; quotation</div>`:
   `<div style="margin-top:8px;background:#fff8e8;border:1px solid #d2b478;border-radius:8px;padding:8px;font-size:11.5px;color:#7a5a1e">Free plan - bills currently show Travel Connect's contact details, with your name shown small. Upgrade to Paid or Premium to show YOUR business name &amp; contact prominently on every bill/quotation, and unlock your own UPI payment QR. Contact Travel Connect to upgrade.</div>`}
 </div>
 <div class="actions">
  <button class="primary" style="background:#3b7bbf;border-color:#3b7bbf" onclick="view('enquiries')">New Enquiry</button>
  <button style="background:#148c76;color:#fff;border-color:#148c76" onclick="view('quotations')">New Quotation</button>
    <button style="background:#148c76;color:#fff;border-color:#148c76" onclick="view('quotations')">New Quotation</button>
  <button style="background:#c9820d;color:#fff;border-color:#c9820d" onclick="goQuickBill()">Quick Bill</button>
  <button style="background:#6b7280;color:#fff;border-color:#6b7280" onclick="view('trips')">Trips</button>
 </div>
 <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Travel Partner / Vehicles</button><button onclick="view('activeboard')">Active Vehicles Board</button></div>
 <div class="actions" style="margin-top:8px"><button onclick="tcOpenDirectory()">Local Directory (autos, restaurants, workshops...)</button></div>
 <hr>
 <div class="grid">
 <div class="metric">Customers<b>${db.customers.length}</b></div><div class="metric">Drivers<b>${db.drivers.length}</b></div>
 <div class="metric">Vehicles<b>${db.vehicles.length}</b></div><div class="metric">Saved Quotations<b>${db.quotes.length}</b></div>
 </div><div class="card"><h3>Business workflow</h3><p>Enquiry -&gt; Quotation -&gt; Confirmation -&gt; Trip -&gt; Final Bill -&gt; Payment -&gt; Accounts</p>
 <div class="notice"><b>Local Trip:</b> maximum ${db.settings.localMaxKm} KM AND ${db.settings.localMaxHours} hours. If either limit is exceeded, it automatically switches to a One Day tariff.</div></div>
 ${tcCollapsibleBox("custUsefulPlaces","&#128205; Useful Places",`<div id="custPlacesList">Loading...</div>`,false)}
 ${tcCollapsibleBox("custEmergency","&#9888; Emergency Contacts",`<div id="custEmergencyList">Loading...</div>`,false)}
 `);
 tcRenderCustEmergencyContacts();
 tcRenderCustUsefulPlaces();
}

/* ---------- BILLING IDENTITY (shared by Taxi dashboard AND non-taxi
   partner page - directory.js's renderPartnerDashboard() calls this same
   pair of functions for the "Billing Details" card on every business
   type's own page). UPI ID/name and (Premium tier) logo/brand-colour/
   font fields are gated to Paid/Premium - a Free-plan partner sees them
   greyed out with an Unlock prompt, rather than hidden outright. ---------- */
function renderBillingIdentitySection(p){
 const box=document.querySelector("#billingIdentityBody");
 if(!box) return;
 const unlocked=tcIsPremiumPlan();
 box.innerHTML=`
 <div>${esc(db.business.name||"-")}</div>
 ${db.business.tagline?`<div class="muted">${esc(db.business.tagline)}</div>`:""}
 ${db.business.address?`<div class="muted">${esc(db.business.address)}</div>`:""}
 ${db.business.email?`<div class="muted">${esc(db.business.email)}</div>`:""}
 <div class="muted">${[db.business.phone,db.business.phone2].filter(Boolean).join(" / ")||"No contact number set"}</div>
 ${unlocked?`<div class="muted">UPI: ${esc(db.business.upiId||"Not set")}</div>`:`<div class="muted">UPI payment QR: <span style="color:#a12d2d">Paid/Premium feature</span></div>`}
 <div class="actions" style="margin-top:8px"><button onclick="openEditBillingIdentity()">Edit Billing Details</button>${unlocked?`<button onclick="tcOpenBrandCustomize()">Customize Bill Appearance</button>`:""}</div>`;
}
function openEditBillingIdentity(){
 const unlocked=tcIsPremiumPlan();
 modal(`<h2>Edit Billing Details</h2>
  <p class="muted">Shown on your bills and quotations printed from this device.</p>
  <div class="grid">
   <label>Business name<input id="bizName" value="${esc(db.business.name)}"></label>
   <label>Tagline<input id="bizTagline" value="${esc(db.business.tagline||"")}"></label>
   <label>Address<input id="bizAddress" value="${esc(db.business.address||"")}"></label>
   <label>Email<input id="bizEmail" type="email" value="${esc(db.business.email||"")}"></label>
   <label>Contact number 1<input id="bizPhone1" value="${esc(db.business.phone||"")}"></label>
   <label>Contact number 2<input id="bizPhone2" value="${esc(db.business.phone2||"")}"></label>
  </div>
  <div class="grid">
   <label>UPI ID (for payment QR) ${unlocked?"":'<span style="color:#a12d2d;font-size:11px">(Paid/Premium)</span>'}
    <input id="bizUpiId" value="${esc(db.business.upiId||"")}" ${unlocked?"":"disabled"}></label>
   <label>UPI name ${unlocked?"":'<span style="color:#a12d2d;font-size:11px">(Paid/Premium)</span>'}
    <input id="bizUpiName" value="${esc(db.business.upiName||"")}" ${unlocked?"":"disabled"}></label>
  </div>
  ${unlocked?"":`<div class="actions"><button onclick="tcShowUpgradePrompt('Your own UPI payment QR')">&#128274; Unlock UPI payment QR</button></div>`}
  <button class="primary" onclick="saveBillingIdentity()">Save</button>`);
}
function saveBillingIdentity(){
 const unlocked=tcIsPremiumPlan();
 const update={
  name:document.querySelector("#bizName").value,tagline:document.querySelector("#bizTagline").value,
  address:document.querySelector("#bizAddress").value,email:document.querySelector("#bizEmail").value,
  phone:document.querySelector("#bizPhone1").value,phone2:document.querySelector("#bizPhone2").value
 };
 if(unlocked){ update.upiId=document.querySelector("#bizUpiId").value; update.upiName=document.querySelector("#bizUpiName").value; }
 Object.assign(db.business,update);
 save(); closeModal(); toast("Billing details saved");
 renderBillingIdentitySection(window._myPartner);
}
function tcOpenBrandCustomize(){
 const isPremiumTier=db.settings.myPlan==="premium"||db.settings.myPlan==="owner_free";
 if(!isPremiumTier){
  modal(`<h2>Premium Feature</h2><p class="muted">Logo upload, brand colour and font customization are available on the Premium plan.</p>
   ${db.platform.phone1?`<div><a href="tel:${esc(db.platform.phone1)}">Call ${esc(db.platform.phone1)}</a></div>`:""}
   <div class="actions" style="margin-top:10px"><button onclick="closeModal()">Close</button></div>`);
  return;
 }
 modal(`<h2>Customize Bill Appearance</h2>
  <div class="grid">
   <label>Logo (shown instead of your business name on bills)<input id="brandLogoFile" type="file" accept="image/*"></label>
   <label>Logo size<select id="brandLogoSize">
    <option value="small" ${db.settings.myBrandLogoSize==="small"?"selected":""}>Small</option>
    <option value="medium" ${(!db.settings.myBrandLogoSize||db.settings.myBrandLogoSize==="medium")?"selected":""}>Medium</option>
    <option value="large" ${db.settings.myBrandLogoSize==="large"?"selected":""}>Large</option>
   </select></label>
   <label>Brand colour<input id="brandColor" type="color" value="${db.settings.myBrandColor||"#148c76"}"></label>
   <label>Business name font size<input id="brandFontSize" type="number" value="${db.settings.myBrandFontSize||21}"></label>
   <label>Font family<select id="brandFontFamily">
    ${Object.entries(TC_FONT_FAMILIES).map(([k,v])=>`<option value="${k}" ${(db.settings.myBrandFontFamily||"helvetica")===k?"selected":""}>${v.label}</option>`).join("")}
   </select></label>
   <label>Tagline/address/contact text size<select id="brandDetailSize">
    <option value="small" ${db.settings.myBrandDetailSize==="small"?"selected":""}>Small</option>
    <option value="medium" ${(!db.settings.myBrandDetailSize||db.settings.myBrandDetailSize==="medium")?"selected":""}>Medium</option>
    <option value="large" ${db.settings.myBrandDetailSize==="large"?"selected":""}>Large</option>
   </select></label>
  </div>
  <div class="actions"><button class="primary" onclick="tcSaveBrandCustomize()">Save</button></div>
  <div id="brandErr" class="danger"></div>`);
}
async function tcSaveBrandCustomize(){
 db.settings.myBrandLogoSize=document.querySelector("#brandLogoSize").value;
 db.settings.myBrandColor=document.querySelector("#brandColor").value;
 db.settings.myBrandFontSize=document.querySelector("#brandFontSize").value;
 db.settings.myBrandFontFamily=document.querySelector("#brandFontFamily").value;
 db.settings.myBrandDetailSize=document.querySelector("#brandDetailSize").value;
 const errBox=document.querySelector("#brandErr");
 const user=getCurrentUser();
 const fileEl=document.querySelector("#brandLogoFile");
 if(fileEl&&fileEl.files&&fileEl.files[0]&&db.settings.myPartnerId){
  const fd=new FormData();
  fd.append("partner_id",db.settings.myPartnerId);
  fd.append("mobile",user?.mobile||"");
  fd.append("logo",fileEl.files[0]);
  try{
   const res=await fetch("/api/partners?action=upload_logo",{method:"POST",body:fd});
   const data=await res.json();
   if(!data.ok){ errBox.textContent="Could not upload logo. Please try again."; return; }
   db.settings.myLogoKey=data.logo_key||"1";
  }catch(e){ errBox.textContent="Network error uploading logo."; return; }
 }
 /* Persists the colour/font/size choices server-side too (via the same
    "update" action the basic Edit Details form uses) - not just locally -
    so they survive a reinstall or apply consistently if this partner ever
    uses more than one device. partners.js only actually stores these for
    Premium/Owner-Free plans; sending them on a lower plan is harmless, the
    server just leaves its own copy unchanged. */
 if(db.settings.myPartnerId&&window._myPartner){
  const p=window._myPartner;
  try{
   await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    action:"update",partner_id:db.settings.myPartnerId,mobile:user?.mobile||"",
    business_name:p.business_name,owner_name:p.owner_name,mobile2:p.mobile2,email:p.email,
    location:p.location,pincode:p.pincode,business_type:p.business_type,
    description:p.description,business_hours:p.business_hours,
    brand_color:db.settings.myBrandColor,brand_font_size:db.settings.myBrandFontSize,
    brand_font_family:db.settings.myBrandFontFamily,brand_detail_size:db.settings.myBrandDetailSize,
    brand_logo_size:db.settings.myBrandLogoSize
   })});
  }catch(e){}
 }
 save(); closeModal(); toast("Bill appearance updated");
 renderBillingIdentitySection(window._myPartner);
}


/* ---------- RATE MASTER ---------- */
function master(){
 const rows=db.categories.map((c,i)=>`<tr>
  <td>${esc(c.name)}</td>
  <td>${c.driverBata?money(c.driverBata):"-"}</td>
  <td>${money(c.standard.rate)}</td><td>${money(c.competitive.rate)}</td><td>${money(c.safety.rate)}</td><td>${money(c.drop.rate)}</td><td>${money(c.local.rate)}</td>
  <td><button onclick="viewCatDetails(${i})">View</button> <button onclick="editCat(${i})">Edit</button></td>
 </tr>`).join("");
 app().innerHTML=card("Vehicle Categories & Rate Master",`<p class="muted">Password-protected. Tap "View" to see the full breakdown without a password - only "Edit" needs it.</p><div class="tablewrap"><table class="table"><thead><tr><th>Category</th><th>Driver Bata</th><th>Standard</th><th>Competitive</th><th>Min. Safety</th><th>Drop</th><th>Local</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="actions"><button class="primary" onclick="addCat()">+ Add vehicle category</button><button onclick="exportRates()">Export rate sheet</button><button onclick="importRates()">Import rate sheet</button></div>
 <hr><h3>Vehicles</h3><div class="grid"><label>Vehicle name<input id="vName"></label><label>Vehicle number<input id="vNo"></label><label>Category<select id="vCat">${db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("")}</select></label><label>Seats<input id="vSeats" type="number"></label></div><button class="primary" onclick="addVehicle()">Add Vehicle</button>${db.vehicles.map(v=>`<div class="listitem">${esc(v.name)} &bull; ${esc(v.no)} &bull; ${esc(db.categories[v.cat]?.name||"")} &bull; ${v.seats||""} seats</div>`).join("")}
 <hr><h3>Drivers</h3><div class="grid"><label>Name<input id="dName"></label><label>Mobile<input id="dMobile"></label><label>Vehicle<select id="dVehicle"><option value="">None</option>${db.vehicles.map((v,i)=>`<option value="${i}">${esc(v.name)} ${esc(v.no)}</option>`).join("")}</select></label></div><button class="primary" onclick="addDriver()">Add Driver</button>${db.drivers.map(d=>`<div class="listitem">${esc(d.name)} &bull; ${esc(d.mobile)}</div>`).join("")}`);
}
function viewCatDetails(i){
 const c=db.categories[i];
 const plan=(label,key)=>{
  const r=c[key]; if(!r) return "";
  return `<tr><td style="font-weight:bold">${label}</td><td>${money(r.rate)}</td><td>${r.incKm}</td><td>${r.incHours}</td><td>${money(r.addKm)}</td><td>${money(r.addHour)}</td></tr>`;
 };
 modal(`<h2>${esc(c.name)}</h2>
 ${c.driverBata?`<p>Driver Bata: <b>${money(c.driverBata)}</b></p>`:""}
 <div class="tablewrap"><table class="table">
  <thead><tr><th>Rate</th><th>Base</th><th>Inc. KM</th><th>Inc. Hours</th><th>Extra/KM</th><th>Extra/Hour</th></tr></thead>
  <tbody>${plan("Standard","standard")}${plan("Competitive","competitive")}${plan("Minimum Safety","safety")}${plan("Drop","drop")}${plan("Local","local")}</tbody>
 </table></div>`);
}
function editCat(i){
 requireAdmin(()=>{
  const c=db.categories[i];
  const planFields=(key,label)=>{
   const r=c[key];
   return `<h4>${label}</h4><div class="grid">
   <label>Base rate<input id="ec_${key}_rate" type="number" value="${r.rate}"></label>
   <label>Included KM<input id="ec_${key}_incKm" type="number" value="${r.incKm}"></label>
   <label>Included Hours<input id="ec_${key}_incHours" type="number" value="${r.incHours}"></label>
   <label>Extra/KM<input id="ec_${key}_addKm" type="number" value="${r.addKm}"></label>
   <label>Extra/Hour<input id="ec_${key}_addHour" type="number" value="${r.addHour}"></label>
   </div>`;
  };
  modal(`<h2>Edit ${esc(c.name)}</h2>
   <div class="grid"><label>Category name<input id="ecName" value="${esc(c.name)}"></label><label>Driver Bata<input id="ecBata" type="number" value="${c.driverBata||0}"></label></div>
   ${planFields("standard","Standard Rate")}${planFields("competitive","Competitive Rate")}${planFields("safety","Minimum Safety Rate")}${planFields("drop","Drop Rate")}${planFields("local","Local Rate")}
   <div class="actions"><button class="primary" onclick="saveCat(${i})">Save</button><button class="danger" onclick="deleteCat(${i})">Delete Category</button></div>`);
 });
}
function saveCat(i){
 const c=db.categories[i];
 c.name=document.querySelector("#ecName").value; c.driverBata=+document.querySelector("#ecBata").value||0;
 ["standard","competitive","safety","drop","local"].forEach(key=>{
  c[key]={
   rate:+document.querySelector("#ec_"+key+"_rate").value||0,
   incKm:+document.querySelector("#ec_"+key+"_incKm").value||0,
   incHours:+document.querySelector("#ec_"+key+"_incHours").value||0,
   addKm:+document.querySelector("#ec_"+key+"_addKm").value||0,
   addHour:+document.querySelector("#ec_"+key+"_addHour").value||0
  };
 });
 save(); pushConfigToServer(); closeModal(); toast("Category updated"); master();
}
function deleteCat(i){
 if(!confirm("Delete this vehicle category?")) return;
 db.categories.splice(i,1); save(); pushConfigToServer(); closeModal(); toast("Category deleted"); master();
}
function addCat(){
 requireAdmin(()=>{
  db.categories.push({name:"New Category",driverBata:0,
   standard:rateBlock(1000,80,8,15,150),competitive:rateBlock(900,80,8,15,150),
   safety:rateBlock(950,80,8,15,150),drop:rateBlock(600,10,1,15,150),local:rateBlock(600,10,1,15,150)});
  save(); pushConfigToServer(); toast("New category added - edit its rates"); master();
 });
}
function exportRates(){
 requireAdmin(()=>{
  modal(`<h2>Export Rate Sheet</h2><p class="muted">Copy this text to save or transfer to another device.</p><textarea readonly style="width:100%;height:220px;font-family:monospace;font-size:11px">${esc(JSON.stringify(db.categories))}</textarea>`);
 });
}
function importRates(){
 requireAdmin(()=>{
  modal(`<h2>Import Rate Sheet</h2><p class="muted">Paste previously exported rate sheet text.</p><textarea id="importText" style="width:100%;height:220px;font-family:monospace;font-size:11px"></textarea><div class="actions"><button class="primary" onclick="doImportRates()">Import</button></div><div id="importErr" class="danger"></div>`);
 });
}
function doImportRates(){
 try{
  const parsed=JSON.parse(document.querySelector("#importText").value);
  if(!Array.isArray(parsed)) throw new Error("bad format");
  db.categories=parsed; save(); pushConfigToServer(); closeModal(); toast("Rate sheet imported"); master();
 }catch(e){ document.querySelector("#importErr").textContent="Could not parse - check the pasted text."; }
}
function addVehicle(){
 if(!vName.value||!vNo.value){toast("Enter vehicle name and number");return}
 db.vehicles.push({name:vName.value,no:vNo.value,cat:+vCat.value,seats:+vSeats.value||0});
 save(); toast("Vehicle added"); master();
}
function addDriver(){
 if(!dName.value||!dMobile.value){toast("Enter driver name and mobile");return}
 db.drivers.push({name:dName.value,mobile:dMobile.value,vehicleIdx:dVehicle.value?+dVehicle.value:null});
 save(); toast("Driver added"); master();
}

/* ---------- ACCOUNTS ---------- */
function accounts(){
 const totalIncome=db.trips.reduce((a,t)=>a+(t.payments||[]).reduce((s,p)=>s+p.amount,0),0);
 const totalExpense=(db.expenses||[]).reduce((a,e)=>a+(+e.amount||0),0);
 app().innerHTML=card("Accounts",`
 <div class="grid"><div class="metric">Total Income<b>${money(totalIncome)}</b></div><div class="metric">Total Expenses<b>${money(totalExpense)}</b></div><div class="metric">Net<b>${money(totalIncome-totalExpense)}</b></div></div>
 <hr><h3>Add Expense</h3>
 <div class="grid"><label>Description<input id="expDesc"></label><label>Amount<input id="expAmt" type="number"></label><label>Date<input id="expDate" type="date" value="${new Date().toISOString().slice(0,10)}"></label></div>
 <div class="actions"><button class="primary" onclick="addExpense()">Add Expense</button></div>
 <h3>Expenses</h3>${(db.expenses||[]).map((e,i)=>`<div class="listitem">${esc(e.desc)} - ${money(e.amount)} <span class="muted">(${esc(e.date)})</span> <button class="danger" onclick="deleteExpense(${i})">Delete</button></div>`).join("")||"<p class='muted'>No expenses recorded.</p>"}`);
}
function addExpense(){
 if(!expDesc.value||!(+expAmt.value>0)){toast("Enter a description and amount");return}
 db.expenses=db.expenses||[];
 db.expenses.unshift({desc:expDesc.value,amount:+expAmt.value,date:expDate.value||new Date().toISOString().slice(0,10)});
 save(); toast("Expense added"); accounts();
}
function deleteExpense(i){
 db.expenses.splice(i,1); save(); toast("Expense deleted"); accounts();
}
