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
  <div style="color:#555;font-size:12px">Book your next trip directly — fast, reliable service</div>
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
  <div style="font-weight:bold;font-size:18px">🎉 Your Total Savings: ${money(totalSavings)}</div>
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

/* Owner-only preview shortcuts — shows exactly what a regular Travel Partner
   or a Customer sees, without logging out and back in as a different role.
   Uses history the same way tcAuthorizedUsersPage()/tcOpenFeedbackAdmin() do
   (reached only from the Menu, so Back reopens the Menu). The existing
   "← Back to Dashboard" link on the previewed page returns to the owner's
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
   app.js) to add an Email field — used on the new dashboard identity card
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
   be the one currently rendered) — if navigation landed anywhere else in
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
   photos mandatory instead of optional — RC, Insurance, Permit, Fitness and
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
  errBox.textContent="Please upload: "+missing.join(", ")+" — all vehicle documents are required for verification.";
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
  toast("Vehicle added — waiting for admin verification");
  loadMyVehicles(partnerId);
 }catch(e){errBox.textContent="Network error — check your connection and try again.";saveBtn.disabled=false;saveBtn.textContent="Save Vehicle";}
}

/* Redefines openAddVehicle() (already in app.js) purely to mark the document
   fields as required (*) in the label text, matching the new validation. */
function openAddVehicle(partnerId){
 modal(`<h2>Add Vehicle</h2>
 <div class="grid">
  <label>Vehicle number<input id="vNoNew" placeholder="e.g. KL 07 AB 1234"></label>
  <label>Category<input id="vCatNew" placeholder="e.g. Sedan, 17 Seat Urbania"></label>
 </div>
 <h4>Driver (optional — leave blank if same as RC owner)</h4>
 <div class="grid">
  <label>Driver name<input id="vDriverName"></label>
  <label>Driver mobile 1<input id="vDriverMobile1"></label>
  <label>Driver mobile 2<input id="vDriverMobile2"></label>
  <label>Driving License number<input id="vLicNo"></label>
  <label>License expiry<input id="vLicExp" type="date"></label>
  <label>License photo (optional)<input id="vLicPhoto" type="file" accept="image/*"></label>
 </div>
 <h4>Vehicle documents — all required for verification</h4>
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
   Every Travel Partner registration now picks a "Business Type" — Taxi/Travel
   Agency keeps the full internal Quotation/Billing tools (unchanged); every
   other type (Auto Rickshaw, Restaurant, Petrol Pump, Workshop, Hospital,
   Homestay/Resort/Hotel) is a much simpler LISTING — a searchable directory
   entry with location + contact, no rates/billing at all. This is what turns
   the app into a small local directory, not just a taxi-fare tool. */

/* Redefines renderPartnerRegisterForm() (already in app.js) to add the
   Business Type dropdown. */

/* The Directory search page — a category dropdown + town/pincode text search
   over every verified business of any type. Reachable from Dashboard, the
   Partner page, and the Customer page. */
let _tcDirectoryEntries=[];
function tcOpenDirectory(){
 /* Reached from several places (Dashboard, Partner page, Customer page) —
    NOT exclusively the ☰ Menu — so Back should just land on Dashboard/
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
  <p class="muted">Search verified local businesses — taxis, autos, restaurants, workshops and more.</p>
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
 box.innerHTML=entries.map(p=>`<div class="listitem">
  <b>${esc(p.business_name)}</b> ${p.available?'<span class="ok">Available now</span>':''}<br>
  <span class="muted">${esc(TC_BUSINESS_TYPES[p.business_type]||"Taxi / Travel Agency")}${p.location?" • "+esc(p.location)+" "+esc(p.pincode||""):""}</span>
  <div class="actions">
   <a href="tel:${esc(p.mobile1)}"><button class="primary">&#128222; Call ${esc(p.mobile1)}</button></a>
   ${p.mobile2?`<a href="tel:${esc(p.mobile2)}"><button>&#128222; Call ${esc(p.mobile2)}</button></a>`:""}
  </div>
 </div>`).join("");
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
   up whether it's logged in before — if so, pre-fill Name/Location/Pincode
   with what was saved LAST time (their "permanent" location), instead of
   leaving those blank and making a returning partner retype or re-GPS their
   location on every single login. Only fills fields that are still empty —
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
  if(status&&(data.location||data.pincode)) status.textContent="Filled in from your last login — tap 📍 only if you're somewhere different right now.";
 }catch(e){}
}
