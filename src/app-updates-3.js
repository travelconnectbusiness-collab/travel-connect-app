function tcBrandingBox(partnerPhones){
 const isPaid=db.settings.myPlan==="paid"||db.settings.myPlan==="owner_free";
 if(isPaid){
  return `<div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
   <div style="font-weight:bold;font-size:21px;color:#0f5a55">${esc(db.business.name)}</div>
   ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
   ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
   ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
   ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
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
  advanceHtml=`<div style="background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
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
 ${totalSavings>0?`<div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:10px;margin:8px 0;color:#1c6b2c">
  <div style="font-weight:bold;font-size:15px">&#127881; You save: ${money(totalSavings)}</div>
 </div>`:""}
 `:""}
 ${sumExtraCharges(q.extraCharges)>0?`<table><tr><td style="padding:3px 0;color:#555">Other Charges${extraChargesShortLabel(q.extraCharges)}</td><td style="text-align:right;padding:3px 0;font-weight:bold">+${money(sumExtraCharges(q.extraCharges))}</td></tr></table>`:""}
 ${q.gstAmount>0?`<table><tr><td style="padding:3px 0;color:#555">GST @ ${q.gstPct}%</td><td style="text-align:right;padding:3px 0;font-weight:bold">+${money(q.gstAmount)}</td></tr></table>`:""}
 <div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:14px;text-align:center;margin-top:14px">
  <div style="font-size:14px;color:#1c6b2c">QUOTED AMOUNT (ESTIMATE)</div>
  <div style="font-size:30px;font-weight:bold;color:#1c6b2c">${money(q.quotedAmount)}</div>
 </div>
 ${advanceHtml}
 <div style="background:#f2f2f2;border-radius:6px;padding:10px;margin-top:10px;font-size:11.5px;color:#555">
  &#8505;&#65039; This is an estimated fare based on the KM/hours entered above and rates in effect today${q.validUntil?`, valid until <b>${esc(q.validUntil)}</b>`:""}. The <b>final bill</b> is calculated only after the trip, based on actual KM/hours travelled${q.validUntil?", and rates may change after the validity date above":""}.
  ${extraChargesHtml(q.extraCharges)}
 </div>
 <p style="text-align:center;color:#888;font-size:12px;margin-top:14px">Thank you for choosing ${esc(db.business.name)}.</p>
 `);
}

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

 const savingsHtml=totalSavings>0?`<div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:12px;margin:10px 0;color:#1c6b2c">
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
 <div style="background:#f2f2f2;border-radius:6px;padding:10px;margin-top:10px;font-size:11px;color:#555">
  ${extraChargesHtml(r.extraCharges)}
 </div>
 <p style="text-align:center;color:#888;font-size:12px;margin-top:14px">Thank you for travelling with ${esc(db.business.name)}.</p>
 `);
}

/* Owner-only preview shortcuts - shows exactly what a regular Travel Partner
   or a Customer sees, without logging out and back in as a different role.
   Uses history the same way tcAuthorizedUsersPage()/tcOpenFeedbackAdmin() do
   (reached only from the Menu, so Back reopens the Menu). The existing
   "<- Back to Dashboard" link on the previewed page returns to the owner's
   own dashboard normally. */
function tcPreviewPage(hashName,renderFn){
 if(!history.state||!history.state.tcPage){
  history.pushState({tcPage:true,fromMenu:true},"",location.pathname+location.search+"#"+hashName);
 }else{
  history.replaceState({tcPage:true,fromMenu:true},"",location.pathname+location.search+"#"+hashName);
 }
 tcCurrentIsFromMenu=true;
 tcMenuNavPending=false;
 const tabsEl=document.querySelector(".tabs");
 if(tabsEl) tabsEl.style.display="none";
 renderFn();
}
function tcPreviewPartnerPage(){ tcPreviewPage("previewpartner",partnerView); }
function tcPreviewCustomerPage(){ tcPreviewPage("previewcustomer",customerHome); }

/* Redefines openEditBillingIdentity()/saveBillingIdentity() (already in
   app.js) to add an Email field - used on the new dashboard identity card
   above, alongside the fields that already existed. */
function openEditBillingIdentity(){
 modal(`<h2>Edit Billing Details</h2>
  <p class="muted">Shown on your bills and quotations printed from this device.</p>
  <div class="grid">
   <label>Business name<input id="bizName" value="${esc(db.business.name)}"></label>
   <label>Tagline<input id="bizTagline" value="${esc(db.business.tagline||"")}"></label>
   <label>Address<input id="bizAddress" value="${esc(db.business.address||"")}"></label>
   <label>Email<input id="bizEmail" type="email" value="${esc(db.business.email||"")}"></label>
   <label>Contact number 1<input id="bizPhone1" value="${esc(db.business.phone||"")}"></label>
   <label>Contact number 2<input id="bizPhone2" value="${esc(db.business.phone2||"")}"></label>
   <label>UPI ID (for payment QR)<input id="bizUpiId" value="${esc(db.business.upiId||"")}"></label>
   <label>UPI name<input id="bizUpiName" value="${esc(db.business.upiName||"")}"></label>
  </div>
  <button class="primary" onclick="saveBillingIdentity()">Save</button>`);
}
function saveBillingIdentity(){
 Object.assign(db.business,{
  name:document.querySelector("#bizName").value,
  tagline:document.querySelector("#bizTagline").value,
  address:document.querySelector("#bizAddress").value,
  email:document.querySelector("#bizEmail").value,
  phone:document.querySelector("#bizPhone1").value,
  phone2:document.querySelector("#bizPhone2").value,
  upiId:document.querySelector("#bizUpiId").value,
  upiName:document.querySelector("#bizUpiName").value
 });
 save();
 closeModal();
 toast("Billing details saved");
 renderBillingIdentitySection(window._myPartner);
}

/* Redefines saveQuickBill() (already in app-updates.js) to fix a real crash:
   "billTrip.value=trip.id" relied on an implicit global (the #billTrip select
   element only exists as `window.billTrip` while the Billing page happens to
   be the one currently rendered) - if navigation landed anywhere else in
   between (e.g. a customer-role render intercepting it), this threw an
   uncaught ReferenceError that broke whatever ran right after it, which is
   what caused the erratic page-switching seen while testing. Using a proper
   querySelector with a null-check means this can never crash, regardless of
   what's currently on screen. */
function saveQuickBill(){
 const name=document.querySelector("#qbName").value, mobile=document.querySelector("#qbMobile").value;
 if(!name||!mobile){toast("Enter the customer's name and mobile number");return}
 const c=db.categories[+document.querySelector("#qbCat").value];
 const km=+document.querySelector("#qbKm").value||0, h=+document.querySelector("#qbHours").value||0;
 const days=+document.querySelector("#qbDays").value||1, restHours=+document.querySelector("#qbRestHours").value||0;
 const overrideAddKm=document.querySelector("#qbOverrideAddKm").value||"", overrideAddHour=document.querySelector("#qbOverrideAddHour").value||"";
 const ratePlan=document.querySelector("#qbRate").value;
 const r=calcFare(c,ratePlan,km,h,days,restHours,{addKm:overrideAddKm,addHour:overrideAddHour});
 if(r.invalid){toast("Correct Local Trip limits first");return}
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

/* Redefines submitAddVehicle() (already in app.js) to make the document
   photos mandatory instead of optional - RC, Insurance, Permit, Fitness and
   PUC (plus the front photo showing the plate) must all be uploaded before
   the vehicle can be saved, since a partial submission just makes admin
   verification slower/harder later. */
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
 if(saveBtn.disabled) return; /* prevents duplicate entries from double/rapid taps */
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

/* Redefines openAddVehicle() (already in app.js) purely to mark the document
   fields as required (*) in the label text, matching the new validation. */
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

/* ---------- LOCAL BUSINESS DIRECTORY ----------
   Every Travel Partner registration now picks a "Business Type" - Taxi/Travel
   Agency keeps the full internal Quotation/Billing tools (unchanged); every
   other type (Auto Rickshaw, Restaurant, Petrol Pump, Workshop, Hospital,
   Homestay/Resort/Hotel) is a much simpler LISTING - a searchable directory
   entry with location + contact, no rates/billing at all. This is what turns
   the app into a small local directory, not just a taxi-fare tool. */

/* Redefines renderPartnerRegisterForm() (already in app.js) to add the
   Business Type dropdown. */

/* The Directory search page - a category dropdown + town/pincode text search
   over every verified business of any type. Reachable from Dashboard, the
   Partner page, and the Customer page. */
let _tcDirectoryEntries=[];
function tcOpenDirectory(){
 /* Reached from several places (Dashboard, Partner page, Customer page) -
    NOT exclusively the [menu] Menu - so Back should just land on Dashboard/
    Customer-home normally, not try to reopen the owner-only Menu. */
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
 const typeOptions=`<option value="">All types</option>`+Object.entries(TC_BUSINESS_TYPES).map(([k,label])=>`<option value="${k}">${label}</option>`).join("");
 app().innerHTML=card("Local Directory",`
  <p class="muted">Search verified local businesses - taxis, autos, restaurants, workshops and more.</p>
  <div class="grid">
   <label>Category<select id="tcDirType" onchange="tcFilterDirectory()">${typeOptions}</select></label>
   <label>Town / pincode<input id="tcDirSearch" placeholder="e.g. Vadakara, 673001" oninput="tcFilterDirectory()"></label>
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
  const mapsQuery=[p.business_name,p.location,p.pincode].filter(Boolean).join(", ");
  const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapsQuery);
  return `<div class="listitem">
  <b>${esc(p.business_name)}</b> ${p.available?'<span class="ok">Available now</span>':''}<br>
  <span class="muted">${esc(TC_BUSINESS_TYPES[p.business_type]||"Taxi / Travel Agency")}${p.location?" * "+esc(p.location)+" "+esc(p.pincode||""):""}</span>
  <div class="actions">
   <a href="tel:${esc(p.mobile1)}"><button class="primary">&#128222; Call ${esc(p.mobile1)}</button></a>
   ${p.mobile2?`<a href="tel:${esc(p.mobile2)}"><button>&#128222; Call ${esc(p.mobile2)}</button></a>`:""}
   ${p.location?`<a href="${mapsUrl}" target="_blank"><button>&#128205; Directions</button></a>`:""}
  </div>
 </div>`;
 }).join("");
}
function tcFilterDirectory(){
 const type=document.querySelector("#tcDirType").value;
 const q=(document.querySelector("#tcDirSearch").value||"").trim().toLowerCase();
 let filtered=_tcDirectoryEntries;
 if(type) filtered=filtered.filter(p=>(p.business_type||"taxi_travel")===type);
 if(q) filtered=filtered.filter(p=>(p.location||"").toLowerCase().includes(q)||(p.pincode||"").toLowerCase().includes(q)||(p.business_name||"").toLowerCase().includes(q));
 tcRenderDirectoryList(filtered);
}

function tcToggleLoginBizType(){
 const role=document.querySelector('input[name="loginRole"]:checked')?.value||"owner";
 const wrap=document.querySelector("#loginBizTypeWrap");
 if(wrap) wrap.style.display=(role==="owner")?"":"none";
}

/* When someone finishes typing their mobile number on the login screen, look
   up whether it's logged in before - if so, pre-fill Name/Location/Pincode
   with what was saved LAST time (their "permanent" location), instead of
   leaving those blank and making a returning partner retype or re-GPS their
   location on every single login. Only fills fields that are still empty -
   never overwrites something the person already typed this session. The GPS
   "Use my current location" button stays available for the optional case
   (temporarily working from a different town) and simply overrides this. */
async function tcLookupReturningUser(){
 const mobile=document.querySelector("#loginMobile")?.value.trim();
 if(!mobile) return;
 try{
  const res=await fetch("/api/auth?action=lookup&mobile="+encodeURIComponent(mobile));
  const data=await res.json();
  if(!data.ok||!data.found) return;
  const nameEl=document.querySelector("#loginName");
  const locEl=document.querySelector("#loginLocation");
  const pinEl=document.querySelector("#loginPincode");
  if(nameEl&&!nameEl.value&&data.name) nameEl.value=data.name;
  if(locEl&&!locEl.value&&data.location) locEl.value=data.location;
  if(pinEl&&!pinEl.value&&data.pincode) pinEl.value=data.pincode;
  const status=document.querySelector("#loginLocStatus");
  if(status&&(data.location||data.pincode)) status.textContent="Filled in from your last login - tap [pin] only if you're somewhere different right now.";
 }catch(e){}
}

/* ---------- QUOTATION FORM FIX (CORRECTED) ----------
   Redefines quoteForm() (already in app-updates.js) to fix the premature
   "switched to One Day" popup: Estimated KM/Hours had a fixed default
   ("80"/"8", above localMaxKm) - so simply changing Vehicle Category
   (which fires handleTripTypeChange()) triggered the switch before the
   person had reached the KM field at all. This version is otherwise
   IDENTICAL to app-updates.js's quoteForm() (Days/Rest Hours/Override
   Rates/Entry Date/Valid Until/Extra Charges/GST/inline Print+PDF buttons
   all preserved) - only the two default values changed to blank
   placeholders, since a blank value can never exceed any limit. */
function quoteForm(){
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
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
 <div class="actions"><button class="primary" onclick="calcQuote()">Calculate</button><button onclick="printCurrentQuote()">Print</button><button onclick="downloadCurrentQuotePDF()">PDF</button><button onclick="saveQuote()">Save Quotation</button></div><div id="qCalc" class="ratebox"></div>`;
}

/* Redefines calcQuote() (already in app-updates.js) to show the actual
   excess KM/hours quantity next to the extra charge - e.g.
   "Extra KM: 5 KM = Rs.805" instead of just "Extra KM: Rs.805" - matching
   how the Final Bill screen already shows this. Everything else (Days,
   Rest Hours, Override rates, Extra Charges, GST) is unchanged. */
function calcQuote(){
 handleLocalCheck();
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

/* Redefines openEditBillingIdentity()/saveBillingIdentity() (already in
   app-updates-2.js) to restrict the UPI ID/name fields to Paid/Owner Free
   plan partners only - a Free-plan partner's own UPI QR isn't part of what
   they get on the free tier, matching the same free-vs-paid distinction
   already applied to print/PDF branding. Free-plan partners still fully
   edit their own name/tagline/address/email/contact numbers, which stay
   available to everyone regardless of plan. */
function openEditBillingIdentity(){
 const isPaid=db.settings.myPlan==="paid"||db.settings.myPlan==="owner_free";
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
  ${isPaid?`
  <div class="grid">
   <label>UPI ID (for payment QR)<input id="bizUpiId" value="${esc(db.business.upiId||"")}"></label>
   <label>UPI name<input id="bizUpiName" value="${esc(db.business.upiName||"")}"></label>
  </div>`:`
  <div style="background:#fff8e8;border:1px solid #d2b478;border-radius:8px;padding:10px;margin-top:8px;font-size:12.5px;color:#7a5a1e">
   Your own UPI payment QR is a Premium feature. Upgrade to Premium to accept payments directly via your own UPI ID on your bills.
  </div>`}
  <button class="primary" onclick="saveBillingIdentity()">Save</button>`);
}
function saveBillingIdentity(){
 const isPaid=db.settings.myPlan==="paid"||db.settings.myPlan==="owner_free";
 const update={
  name:document.querySelector("#bizName").value,
  tagline:document.querySelector("#bizTagline").value,
  address:document.querySelector("#bizAddress").value,
  email:document.querySelector("#bizEmail").value,
  phone:document.querySelector("#bizPhone1").value,
  phone2:document.querySelector("#bizPhone2").value
 };
 if(isPaid){
  update.upiId=document.querySelector("#bizUpiId").value;
  update.upiName=document.querySelector("#bizUpiName").value;
 }
 Object.assign(db.business,update);
 save();
 closeModal();
 toast("Billing details saved");
 renderBillingIdentitySection(window._myPartner);
}

/* ---------- THREE-TIER PLAN SYSTEM (Free / Paid / Premium) ----------
   Adds a shared helper for "does this plan get premium features" (Paid,
   Premium and Owner Free all count) and redefines the functions that need
   to use it. Also changes the UX pattern for Free-plan UPI fields: instead
   of hiding them entirely, they're now shown (greyed out / disabled) so a
   Free user can SEE what they're missing, with an "Unlock" button next to
   them that shows an upgrade prompt when tapped - this is what creates the
   upgrade temptation, rather than the feature being invisible. */
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

/* Redefines openEditBillingIdentity()/saveBillingIdentity() again - UPI
   fields are now always shown, but disabled with an "Unlock" button for
   Free-plan partners instead of being hidden outright. */
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
  name:document.querySelector("#bizName").value,
  tagline:document.querySelector("#bizTagline").value,
  address:document.querySelector("#bizAddress").value,
  email:document.querySelector("#bizEmail").value,
  phone:document.querySelector("#bizPhone1").value,
  phone2:document.querySelector("#bizPhone2").value
 };
 if(unlocked){
  update.upiId=document.querySelector("#bizUpiId").value;
  update.upiName=document.querySelector("#bizUpiName").value;
 }
 Object.assign(db.business,update);
 save();
 closeModal();
 toast("Billing details saved");
 renderBillingIdentitySection(window._myPartner);
}

/* Redefines tcBrandingBox() (already in app-updates-2.js) to use the shared
   three-tier check instead of its own inline "paid"/"owner_free" check. */
function tcBrandingBox(partnerPhones){
 if(tcIsPremiumPlan()){
  return `<div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
   <div style="font-weight:bold;font-size:21px;color:#0f5a55">${esc(db.business.name)}</div>
   ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
   ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
   ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
   ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
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

/* Redefines dashboard() (already in app-updates-2.js) purely for the
   plan-status line at the bottom of the identity card, to use the shared
   three-tier check and mention "Premium" as the upgrade target. */
function dashboard(){
 if(db.settings.myBusinessType&&db.settings.myBusinessType!=="taxi_travel"){
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
  <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Edit Business Details</button></div>
  ${tcIsPremiumPlan()?
   `<div style="margin-top:8px;font-size:11.5px;color:#0f5a55;font-weight:bold">Premium - your own business name/contact shown on every bill & quotation</div>`:
   `<div style="margin-top:8px;background:#fff8e8;border:1px solid #d2b478;border-radius:8px;padding:8px;font-size:11.5px;color:#7a5a1e">Free plan - bills currently show Travel Connect's contact details, with your name shown small. Upgrade to Paid or Premium to show YOUR business name & contact prominently on every bill/quotation, and unlock your own UPI payment QR. Contact Travel Connect to upgrade.</div>`}
 </div>
 <div class="actions">
  <button class="primary" style="background:#3b7bbf;border-color:#3b7bbf" onclick="view('enquiries')">New Enquiry</button>
  <button style="background:#148c76;color:#fff;border-color:#148c76" onclick="view('quotations')">New Quotation</button>
  <button style="background:#c9820d;color:#fff;border-color:#c9820d" onclick="goQuickBill()">Quick Bill</button>
  <button style="background:#6b7280;color:#fff;border-color:#6b7280" onclick="view('master')">Rate Master</button>
 </div>
 <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Travel Partner / Vehicles</button><button onclick="view('activeboard')">Active Vehicles Board</button></div>
 <div class="actions" style="margin-top:8px"><button onclick="tcOpenDirectory()">Local Directory (autos, restaurants, workshops...)</button></div>
 <hr>
 <div class="grid">
 <div class="metric">Customers<b>${db.customers.length}</b></div><div class="metric">Drivers<b>${db.drivers.length}</b></div>
 <div class="metric">Vehicles<b>${db.vehicles.length}</b></div><div class="metric">Saved Quotations<b>${db.quotes.length}</b></div>
 </div><div class="card"><h3>Business workflow</h3><p>Enquiry -> Quotation -> Confirmation -> Trip -> Final Bill -> Payment -> Accounts</p>
 <div class="notice"><b>Local Trip:</b> maximum ${db.settings.localMaxKm} KM AND ${db.settings.localMaxHours} hours. If either limit is exceeded, it automatically switches to a One Day tariff.</div></div>
 `);
}

/* Redefines tcRenderPartnerPlans()/tcLoadPartnerPlans() (already in
   app-updates-2.js) to add "Premium" as a third selectable tier alongside
   Free/Paid/Owner Free. */
async function tcRenderPartnerPlans(){
 app().innerHTML=card("Partner Plans",`<p class="muted">Free = Travel Connect branding shown on their bills/quotations, no own UPI QR. Paid/Premium = their own business branding + own UPI payment QR. Owner Free = your own account/staff - always free, full features.</p><div id="tcPlansList">Loading...</div>`);
 tcLoadPartnerPlans();
}
async function tcLoadPartnerPlans(){
 const box=document.querySelector("#tcPlansList");
 if(!box) return;
 try{
  const token=sessionStorage.getItem("tc_admin_token");
  const res=await fetch("/api/partner_plan?action=list&token="+encodeURIComponent(token));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load partners.</p>"; return; }
  if(!data.partners.length){ box.innerHTML="<p class='muted'>No partners registered yet.</p>"; return; }
  box.innerHTML=data.partners.map(p=>`<div class="listitem">
   <b>${esc(p.business_name)}</b> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>'}<br>
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

/* ---------- FIRST-LOGIN ROUTING FIX ----------
   Redefines dashboard() and partnerView() again. Previously, ANYONE with
   role "owner" landed on the full Quotation/Billing dashboard immediately
   on login, even before registering a business at all - confusing for a
   hotel/auto owner who briefly saw taxi-business tools before ever picking
   their own category. Now: dashboard() only shows once we've actually
   CONFIRMED (from the server, via partnerView()) that this mobile is
   registered as "taxi_travel". Until that's confirmed one way or the
   other, it routes to partnerView() instead, which shows either the
   neutral "Register your business" form (not registered yet) or the
   simple business-profile page (registered as a non-taxi type). Once
   partnerView() confirms taxi_travel, it calls dashboard() again so the
   full toolset appears - this only causes a brief one-time detour per
   device, since db.settings.myBusinessType is cached locally afterward. */
function dashboard(){
 if(db.settings.myBusinessType==null||db.settings.myBusinessType!=="taxi_travel"){
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
  <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Edit Business Details</button></div>
  ${tcIsPremiumPlan()?
   `<div style="margin-top:8px;font-size:11.5px;color:#0f5a55;font-weight:bold">Premium - your own business name/contact shown on every bill & quotation</div>`:
   `<div style="margin-top:8px;background:#fff8e8;border:1px solid #d2b478;border-radius:8px;padding:8px;font-size:11.5px;color:#7a5a1e">Free plan - bills currently show Travel Connect's contact details, with your name shown small. Upgrade to Paid or Premium to show YOUR business name & contact prominently on every bill/quotation, and unlock your own UPI payment QR. Contact Travel Connect to upgrade.</div>`}
 </div>
 <div class="actions">
  <button class="primary" style="background:#3b7bbf;border-color:#3b7bbf" onclick="view('enquiries')">New Enquiry</button>
  <button style="background:#148c76;color:#fff;border-color:#148c76" onclick="view('quotations')">New Quotation</button>
  <button style="background:#c9820d;color:#fff;border-color:#c9820d" onclick="goQuickBill()">Quick Bill</button>
  <button style="background:#6b7280;color:#fff;border-color:#6b7280" onclick="view('master')">Rate Master</button>
 </div>
 <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Travel Partner / Vehicles</button><button onclick="view('activeboard')">Active Vehicles Board</button></div>
 <div class="actions" style="margin-top:8px"><button onclick="tcOpenDirectory()">Local Directory (autos, restaurants, workshops...)</button></div>
 <hr>
 <div class="grid">
 <div class="metric">Customers<b>${db.customers.length}</b></div><div class="metric">Drivers<b>${db.drivers.length}</b></div>
 <div class="metric">Vehicles<b>${db.vehicles.length}</b></div><div class="metric">Saved Quotations<b>${db.quotes.length}</b></div>
 </div><div class="card"><h3>Business workflow</h3><p>Enquiry -> Quotation -> Confirmation -> Trip -> Final Bill -> Payment -> Accounts</p>
 <div class="notice"><b>Local Trip:</b> maximum ${db.settings.localMaxKm} KM AND ${db.settings.localMaxHours} hours. If either limit is exceeded, it automatically switches to a One Day tariff.</div></div>
 `);
}
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
   const confirmedType=data.partner.business_type||"taxi_travel";
   const wasUnknown=db.settings.myBusinessType==null;
   db.settings.myBusinessType=confirmedType;
   save();
   if(confirmedType==="taxi_travel"&&wasUnknown){
    /* Just confirmed this mobile is a taxi/travel agency for the first time
       on this device - send them to the real dashboard instead of the
       simple partner-profile page. */
    dashboard();
    return;
   }
   renderPartnerDashboard(data.partner);
  }
 }catch(e){
  document.querySelector("#partnerBox").innerHTML="<p class='danger'>Network error - check your connection and try again.</p>";
 }
}

/* Redefines tcRenderActiveBoardList() (already in app-updates-2.js) to add
   the same "Directions" button as the Local Directory listings. */
function tcRenderActiveBoardList(vehicles,append){
 const box=document.querySelector("#activeBoardList");
 if(!box) return;
 if(!vehicles.length){ if(!append) box.innerHTML="<p class='muted'>No matching vehicles found.</p>"; return; }
 const html=vehicles.map(v=>{
  const mapsQuery=[v.business_name,v.location,v.pincode].filter(Boolean).join(", ");
  const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapsQuery);
  return `<div class="listitem">
  <b>${esc(v.category||"Vehicle")}</b> - ${esc(v.vehicle_number)}<br>
  ${esc(v.business_name)}${v.location?` * ${esc(v.location)} ${esc(v.pincode||"")}`:""}
  <div class="actions">
   <a href="tel:${esc(v.mobile1)}"><button class="primary">&#128222; Call ${esc(v.mobile1)}</button></a>
   ${v.mobile2?`<a href="tel:${esc(v.mobile2)}"><button>&#128222; Call ${esc(v.mobile2)}</button></a>`:""}
   ${v.location?`<a href="${mapsUrl}" target="_blank"><button>&#128205; Directions</button></a>`:""}
  </div>
 </div>`;
 }).join("");
 if(append) box.innerHTML+=html; else box.innerHTML=html;
}

/* ---------- TEMPORARY LOCATION FOR ACTIVE VEHICLES ----------
   Redefines loadMyVehicles()/toggleVehicleActive() (already in app.js) to
   add an optional "Current location" field next to the Active Now toggle -
   a driver who just dropped off in a different town can mark themselves
   active THERE (for a return trip) without changing their permanent
   registered garage location. Also redefines the Active Board/Directory
   renderer to prefer this temporary location when shown. */
async function loadMyVehicles(partnerId){
 const box=document.querySelector("#myVehiclesList");
 try{
  const res=await fetch("/api/vehicles?action=list&partner_id="+partnerId);
  const data=await res.json();
  if(!data.ok||!data.vehicles.length){box.innerHTML="<p class='muted'>No vehicles added yet.</p>";return}
  box.innerHTML=data.vehicles.map(v=>`<div class="listitem">
   <b>${esc(v.vehicle_number)}</b> ${esc(v.category||"")} ${v.verified?'<span class="ok">Verified</span>':'<span class="muted">Pending verification</span>'}<br>
   ${v.driver_name?`Driver: ${esc(v.driver_name)}${v.driver_mobile1?` (${esc(v.driver_mobile1)})`:""}<br>`:""}
   ${vehicleExpiryWarnings(v)}
   <label style="display:inline-flex;align-items:center;gap:6px;margin-top:6px">
    <input type="checkbox" id="vActive_${v.id}" ${v.active?"checked":""} onchange="toggleVehicleActive(${v.id},this.checked)"> Active Now (ready for a trip)
   </label>
   <div style="margin-top:6px">
    <input id="vTempLoc_${v.id}" placeholder="Current location, if different from your registered garage (optional)" value="${esc(v.temp_location||"")}" style="width:100%;box-sizing:border-box">
   </div>
  </div>`).join("");
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

/* Prefers the vehicle's temporary location (set when marked Active) over
   the partner's permanent registered location, everywhere it's shown. */
function tcRenderActiveBoardList(vehicles,append){
 const box=document.querySelector("#activeBoardList");
 if(!box) return;
 if(!vehicles.length){ if(!append) box.innerHTML="<p class='muted'>No matching vehicles found.</p>"; return; }
 const html=vehicles.map(v=>{
  const shownLocation=v.temp_location||v.location;
  const mapsQuery=[v.business_name,shownLocation,v.temp_location?"":v.pincode].filter(Boolean).join(", ");
  const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapsQuery);
  return `<div class="listitem">
  <b>${esc(v.category||"Vehicle")}</b> - ${esc(v.vehicle_number)}<br>
  ${esc(v.business_name)}${shownLocation?` * ${esc(shownLocation)}${v.temp_location?' <span class="ok">(currently here)</span>':" "+esc(v.pincode||"")}`:""}
  <div class="actions">
   <a href="tel:${esc(v.mobile1)}"><button class="primary">&#128222; Call ${esc(v.mobile1)}</button></a>
   ${v.mobile2?`<a href="tel:${esc(v.mobile2)}"><button>&#128222; Call ${esc(v.mobile2)}</button></a>`:""}
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
  const contactLine=[db.platform.phone1?`<a href="tel:${esc(db.platform.phone1)}">&#128222; ${esc(db.platform.phone1)}</a>`:"",db.platform.email?`<a href="mailto:${esc(db.platform.email)}">&#9993;&#65039; ${esc(db.platform.email)}</a>`:""].filter(Boolean).join(" &nbsp;|&nbsp; ");
  box.innerHTML=`<div class="notice">No Travel Connect partners are registered in "${esc(document.querySelector("#tcBoardSearch").value)}" yet. Here are other currently available vehicles instead - or contact us directly: ${contactLine}</div>`;
  tcRenderActiveBoardList(_tcActiveBoardVehicles,true);
  return;
 }
 tcRenderActiveBoardList(filtered);
}

/* ---------- "OTHER" BUSINESS CATEGORY ----------
   Redefines tcBusinessTypeOptions() and adds helpers so any business type
   dropdown (login, registration, edit) can offer "Other (please specify)" -
   selecting it reveals a text field for a custom category name, which is
   stored directly as business_type (no schema change needed; any value not
   matching a known key is just displayed as typed everywhere). */
function tcBusinessTypeOptions(selected){
 const isKnown=selected==null||TC_BUSINESS_TYPES.hasOwnProperty(selected);
 let html=Object.entries(TC_BUSINESS_TYPES).map(([k,label])=>`<option value="${k}"${k===(selected||"taxi_travel")?" selected":""}>${label}</option>`).join("");
 html+=`<option value="other"${!isKnown?" selected":""}>Other (please specify)</option>`;
 return html;
}
function tcBizLabel(businessType){
 return TC_BUSINESS_TYPES[businessType]||businessType||"Taxi / Travel Agency";
}
function tcBizTypeFieldHtml(selectId,otherId,selected){
 const isKnown=selected==null||TC_BUSINESS_TYPES.hasOwnProperty(selected);
 const otherValue=isKnown?"":selected;
 return `<select id="${selectId}" onchange="tcToggleOtherBizType('${selectId}','${otherId}')">${tcBusinessTypeOptions(selected)}</select>
  <input id="${otherId}" placeholder="Enter your business category" value="${esc(otherValue)}" style="${isKnown?"display:none;":""}margin-top:6px;width:100%;box-sizing:border-box">`;
}
function tcToggleOtherBizType(selectId,otherId){
 const sel=document.querySelector("#"+selectId);
 const other=document.querySelector("#"+otherId);
 if(!sel||!other) return;
 other.style.display=sel.value==="other"?"":"none";
}
function tcResolveBizType(selectId,otherId){
 const sel=document.querySelector("#"+selectId)?.value||"taxi_travel";
 if(sel==="other"){
  const custom=(document.querySelector("#"+otherId)?.value||"").trim();
  return custom||"other";
 }
 return sel;
}

/* Redefines renderLogin() again - just the Business Type block, now using
   the shared "Other" field helper. */
function renderLogin(){
 const inviteToken=new URLSearchParams(location.search).get("invite")||"";
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 document.querySelector("#app").innerHTML=`
 <div style="display:flex;align-items:center;justify-content:center;padding:30px 16px">
  <div style="background:#fff;border-radius:18px;max-width:360px;width:100%;padding:30px 26px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.12)">
   ${logo?`<img src="${logo}" style="width:56px;height:56px;border-radius:12px;margin-bottom:10px">`:""}
   <div style="font-weight:800;letter-spacing:1.5px;color:#082b49;font-size:17px">TRAVEL CONNECT</div>
   <div style="color:#6a7a87;font-size:12px;margin-bottom:16px">Professional Travel Business Platform</div>
   <p id="loginIntro" style="color:#6a7a87;font-size:13px;margin:0 0 18px;text-align:left">Enter your name and mobile number to continue. Manage enquiries, quotations, trips and billing for your travel business - or book a vehicle and check fare estimates for your own trips.</p>
   <div style="text-align:left;margin-bottom:14px">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:6px;color:#172536">I am a...</label>
    <div style="display:flex;gap:8px">
     <label style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #c9d4dc;border-radius:9px;padding:10px;cursor:pointer;font-size:13px;font-weight:600"><input type="radio" name="loginRole" value="owner" checked onchange="tcUpdateLoginIntro();tcToggleLoginBizType()"> Business Owner</label>
     <label style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #c9d4dc;border-radius:9px;padding:10px;cursor:pointer;font-size:13px;font-weight:600"><input type="radio" name="loginRole" value="customer" onchange="tcUpdateLoginIntro();tcToggleLoginBizType()"> Customer</label>
    </div>
   </div>
   <div id="loginBizTypeWrap" style="text-align:left;margin-bottom:14px">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">What kind of business?</label>
    ${tcBizTypeFieldHtml("loginBizType","loginBizTypeOther")}
   </div>
   <div style="text-align:left">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">Your name</label>
    <input id="loginName" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:12px;font-size:15px;box-sizing:border-box">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">Mobile number</label>
    <input id="loginMobile" type="tel" onblur="tcLookupReturningUser()" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:12px;font-size:15px;box-sizing:border-box">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">Email (optional)</label>
    <input id="loginEmail" type="email" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:12px;font-size:15px;box-sizing:border-box">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">Location / town (optional)</label>
    <div style="display:flex;gap:6px;margin-bottom:12px">
     <input id="loginLocation" style="flex:1;padding:11px;border-radius:9px;border:1px solid #c9d4dc;font-size:15px;box-sizing:border-box">
     <button type="button" onclick="tcUseMyLocation()" title="Use my current location" style="padding:0 12px;border-radius:9px;border:1px solid #c9d4dc;background:#f5f8fa;font-size:16px">&#128205;</button>
    </div>
    <div id="loginLocStatus" style="font-size:11.5px;color:#6a7a87;margin:-8px 0 10px"></div>
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">Pincode (optional)</label>
    <input id="loginPincode" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:6px;font-size:15px;box-sizing:border-box">
   </div>
   <div id="loginError" style="color:#a12d2d;font-size:13px;min-height:18px;margin:6px 0 10px"></div>
   <button class="primary" onclick="submitLogin('${inviteToken}')" style="width:100%;padding:12px;border-radius:9px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:15px">Continue</button>
  </div>
 </div>`;
}

/* Redefines submitLogin() again - businessType now resolved via
   tcResolveBizType() so "Other" + custom text works at login time too. */
async function submitLogin(inviteToken){
 const name=document.querySelector("#loginName").value.trim();
 const mobile=document.querySelector("#loginMobile").value.trim();
 const role=document.querySelector('input[name="loginRole"]:checked')?.value||"owner";
 const businessType=(role==="owner")?tcResolveBizType("loginBizType","loginBizTypeOther"):"";
 const email=document.querySelector("#loginEmail")?.value.trim()||"";
 const location_=document.querySelector("#loginLocation")?.value.trim()||"";
 const pincode=document.querySelector("#loginPincode")?.value.trim()||"";
 const lat=window.tcLoginCoords?window.tcLoginCoords.lat:null;
 const lon=window.tcLoginCoords?window.tcLoginCoords.lon:null;
 const errBox=document.querySelector("#loginError");
 if(!name||!mobile){ errBox.textContent="Enter your name and mobile number."; return; }
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"login",name,mobile,email,location:location_,pincode,role,lat,lon,invite_token:inviteToken||undefined,device_token:getDeviceToken()})});
  const data=await res.json();
  if(!data.ok){
   if(data.error==="blocked") errBox.textContent="Access has been blocked for this number. Contact the app owner.";
   else if(data.error==="not_authorized") errBox.textContent="This mobile number is not authorized to use this app. Contact the app owner to be added.";
   else errBox.textContent="Login failed. Please try again.";
   return;
  }
  localStorage.setItem("tc_user",JSON.stringify({name,mobile,role,isAppOwner:!!data.isOwner}));
  if(businessType) localStorage.setItem("tc_chosen_business_type",businessType);
  await syncConfigFromServer();
  location.hash="dashboard";
  render();
 }catch(e){
  errBox.textContent="Network error - check your connection and try again.";
 }
}

/* Redefines renderPartnerRegisterForm()/submitPartnerRegister() again to
   use the shared "Other" business type field. */
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
  <label>Location<input id="pLocation" placeholder="Town / area"></label>
  <label>Pincode<input id="pPincode"></label>
 </div>
 <button class="primary" onclick="submitPartnerRegister()">Register</button>
 <div id="pRegErr" class="danger"></div>`;
}
async function submitPartnerRegister(){
 const business_name=document.querySelector("#pBizName").value.trim();
 const owner_name=document.querySelector("#pOwnerName").value.trim();
 const mobile1=document.querySelector("#pMobile1").value.trim();
 const errBox=document.querySelector("#pRegErr");
 if(!business_name||!owner_name||!mobile1){errBox.textContent="Fill in business name, owner name and mobile number.";return}
 const body={action:"register",business_name,owner_name,mobile1,
  business_type:tcResolveBizType("pBizType","pBizTypeOther"),
  mobile2:document.querySelector("#pMobile2").value.trim(),
  email:document.querySelector("#pEmail").value.trim(),
  location:document.querySelector("#pLocation").value.trim(),
  pincode:document.querySelector("#pPincode").value.trim()};
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!data.ok){
   errBox.textContent=data.error==="already_registered"?"This mobile number is already registered as a partner.":"Could not register. Please try again.";
   return;
  }
  toast("Registered - waiting for admin verification");
  partnerView();
 }catch(e){errBox.textContent="Network error - check your connection and try again.";}
}

/* Redefines tcOpenEditPartnerDetails()/tcSavePartnerDetails() again for the
   shared "Other" business type field. */
function tcOpenEditPartnerDetails(partnerId){
 const p=window._myPartner;
 modal(`<h2>Edit Business Details</h2>
  <div class="grid">
   <label>Business type<div>${tcBizTypeFieldHtml("peBizType","peBizTypeOther",p.business_type)}</div></label>
   <label>Business name<input id="peBizName" value="${esc(p.business_name)}"></label>
   <label>Owner name<input id="peOwnerName" value="${esc(p.owner_name)}"></label>
   <label>Mobile 2<input id="peMobile2" value="${esc(p.mobile2||"")}"></label>
   <label>Email<input id="peEmail" value="${esc(p.email||"")}"></label>
   <label>Location<input id="peLocation" value="${esc(p.location||"")}"></label>
   <label>Pincode<input id="pePincode" value="${esc(p.pincode||"")}"></label>
  </div>
  <button class="primary" onclick="tcSavePartnerDetails(${partnerId})">Save</button>`);
}
async function tcSavePartnerDetails(partnerId){
 const user=getCurrentUser();
 const body={action:"update",partner_id:partnerId,mobile:user.mobile,
  business_type:tcResolveBizType("peBizType","peBizTypeOther"),
  business_name:document.querySelector("#peBizName").value,
  owner_name:document.querySelector("#peOwnerName").value,
  mobile2:document.querySelector("#peMobile2").value,
  email:document.querySelector("#peEmail").value,
  location:document.querySelector("#peLocation").value,
  pincode:document.querySelector("#pePincode").value};
 try{
  await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  toast("Details updated");
  closeModal();
  partnerView();
 }catch(e){toast("Network error");}
}

/* Redefines tcRenderDirectoryList()/tcRenderPartnerPlans()/
   renderPartnerDashboard() display bits again, to use tcBizLabel() instead
   of the old fallback that wrongly showed "Taxi / Travel Agency" for a
   custom "Other" category. */
function tcRenderDirectoryList(entries){
 const box=document.querySelector("#tcDirList");
 if(!box) return;
 if(!entries.length){box.innerHTML="<p class='muted'>No matching businesses found.</p>";return}
 box.innerHTML=entries.map(p=>{
  const mapsQuery=[p.business_name,p.location,p.pincode].filter(Boolean).join(", ");
  const mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapsQuery);
  return `<div class="listitem">
  <b>${esc(p.business_name)}</b> ${p.available?'<span class="ok">Available now</span>':''}<br>
  <span class="muted">${esc(tcBizLabel(p.business_type))}${p.location?" * "+esc(p.location)+" "+esc(p.pincode||""):""}</span>
  <div class="actions">
   <a href="tel:${esc(p.mobile1)}"><button class="primary">&#128222; Call ${esc(p.mobile1)}</button></a>
   ${p.mobile2?`<a href="tel:${esc(p.mobile2)}"><button>&#128222; Call ${esc(p.mobile2)}</button></a>`:""}
   ${p.location?`<a href="${mapsUrl}" target="_blank"><button>&#128205; Directions</button></a>`:""}
  </div>
 </div>`;
 }).join("");
}
async function tcLoadPartnerPlans(){
 const box=document.querySelector("#tcPlansList");
 if(!box) return;
 try{
  const token=sessionStorage.getItem("tc_admin_token");
  const res=await fetch("/api/partner_plan?action=list&token="+encodeURIComponent(token));
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
function renderPartnerDashboard(p){
 const isTaxi=(p.business_type||"taxi_travel")==="taxi_travel";
 document.querySelector("#partnerBox").innerHTML=`
 <div class="card">
  <h3>${esc(p.business_name)} ${p.verified?'<span class="ok">&#9989; Verified</span>':'<span class="muted">(Pending admin verification)</span>'}</h3>
  <div class="muted">${esc(tcBizLabel(p.business_type))}</div>
  <div class="muted">Owner: ${esc(p.owner_name)} - ${esc(p.mobile1)}${p.mobile2?" / "+esc(p.mobile2):""}</div>
  ${p.email?`<div class="muted">${esc(p.email)}</div>`:""}
  ${p.location?`<div class="muted">${esc(p.location)} ${esc(p.pincode||"")}</div>`:""}
  ${p.verified?`<label style="display:inline-flex;align-items:center;gap:6px;margin-top:8px"><input type="checkbox" ${p.available?"checked":""} onchange="tcTogglePartnerAvailable(${p.id},this.checked)"> Available now (show in directory search)</label>`:""}
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
  <h3>Billing Details <span class="muted">(the name/phone/UPI shown if you ever bill someone)</span></h3>
  <div id="billingIdentityBody"></div>
 </div>`}
 <hr>
 <div class="actions"><button onclick="tcOpenDirectory()">&#128269; Search the Local Directory</button></div>`;
 renderBillingIdentitySection(p);
 if(isTaxi) loadMyVehicles(p.id);
}

/* ---------- SIMPLE PAY-BY-QR FOR NON-TAXI PARTNERS ----------
   Redefines renderPartnerDashboard() again to add a "Collect Payment" card
   for non-taxi business types (a hotel/restaurant/auto driver without their
   own printed QR sign can type an amount and show a UPI QR right on this
   phone screen for the customer to scan) - only shown once they've set a
   UPI ID via Billing Details. */
function renderPartnerDashboard(p){
 const isTaxi=(p.business_type||"taxi_travel")==="taxi_travel";
 document.querySelector("#partnerBox").innerHTML=`
 <div class="card">
  <h3>${esc(p.business_name)} ${p.verified?'<span class="ok">&#9989; Verified</span>':'<span class="muted">(Pending admin verification)</span>'}</h3>
  <div class="muted">${esc(tcBizLabel(p.business_type))}</div>
  <div class="muted">Owner: ${esc(p.owner_name)} - ${esc(p.mobile1)}${p.mobile2?" / "+esc(p.mobile2):""}</div>
  ${p.email?`<div class="muted">${esc(p.email)}</div>`:""}
  ${p.location?`<div class="muted">${esc(p.location)} ${esc(p.pincode||"")}</div>`:""}
  ${p.verified?`<label style="display:inline-flex;align-items:center;gap:6px;margin-top:8px"><input type="checkbox" ${p.available?"checked":""} onchange="tcTogglePartnerAvailable(${p.id},this.checked)"> Available now (show in directory search)</label>`:""}
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
  <div class="grid">
   <label>Amount<input id="ncAmount" type="number" placeholder="e.g. 500"></label>
  </div>
  <div class="actions"><button class="primary" onclick="tcGenerateNonTaxiQR()">Generate QR</button></div>
  <div id="ncQrBox" style="text-align:center;margin-top:10px"></div>`:
  `<p class="muted">Set your UPI ID in Billing Details above first, then come back here to collect payments by QR.</p>`}
 </div>`}
 <hr>
 <div class="actions"><button onclick="tcOpenDirectory()">&#128269; Search the Local Directory</button></div>`;
 renderBillingIdentitySection(p);
 if(isTaxi) loadMyVehicles(p.id);
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
