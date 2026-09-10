/* app-updates.js — loaded AFTER app.js. Redefines/extends the functions below.
   JavaScript lets a later function declaration override an earlier one with the
   same name, so this file can patch app.js without ever touching that big file
   again — only this smaller file grows with future updates. */

function extraChargeLabels(){
 return {toll:"Toll",permit:"Other State Permit",stateTax:"Other State Tax",parking:"Parking",driverFood:"Driver Food",driverStay:"Driver Overnight Stay"};
}
/* Short "(Toll + Parking)" style label listing which specific charges make up an
   "Other Charges" total — used right next to the amount itself, not just in the
   separate itemized box, so the customer never has to wonder what it covers. */


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
  html+=`<div style="margin-top:8px"><b>Other Charges Included:</b> `+included.map(k=>`${labels[k]}: ${money(ec[k])}`).join(" &nbsp;•&nbsp; ")+`</div>`;
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
 return `<h4>Other Charges (optional — fill in whichever are known)</h4><div class="grid">
  ${Object.keys(labels).map(k=>`<label>${labels[k]}<input id="${prefix}_${k}" type="number" value="${+ec[k]||0}"></label>`).join("")}
 </div>`;
}


function readExtraChargeFields(prefix){
 const labels=extraChargeLabels();
 const ec={};
 Object.keys(labels).forEach(k=>{ ec[k]=+document.querySelector("#"+prefix+"_"+k)?.value||0; });
 return ec;
}


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
 /* Multi-day trips (everything except Local — a Local trip is same-day by
    definition) multiply the minimum charge and included KM/hours by the number
    of days, same as if you booked that many separate single-day minimums back
    to back. restHours (overnight vehicle-standing time the customer arranged
    their own room for) is subtracted from the hours actually billed, but never
    from KM. overrides.addKm/addHour let the owner charge a discounted plan's
    base rate but a DIFFERENT plan's per-KM/per-hour extra rate — e.g. offering
    the Competitive base for a high-range/heavy-traffic/bad-road trip while still
    charging Standard's higher extra-KM rate, since the discounted rate alone
    isn't profitable on tough routes. */
 const R=c[plan];
 const addKm=overrides.addKm!=null&&overrides.addKm!==""?Number(overrides.addKm):R.addKm;
 const addHour=overrides.addHour!=null&&overrides.addHour!==""?Number(overrides.addHour):R.addHour;
 const incKm=R.incKm*days, incHours=R.incHours*days, base=R.rate*days;
 const kmExtra=Math.max(0,km-incKm)*addKm;
 const hourExtra=Math.max(0,effectiveHours-incHours)*addHour;
 const extra=Math.max(kmExtra,hourExtra);
 return {base,extra,kmExtra,hourExtra,total:base+extra,incKm,incHours,addKm,addHour,days,restHours,addKmOverridden:addKm!==R.addKm,addHourOverridden:addHour!==R.addHour};
}

/* Applies discount then round-off on top of a subtotal; used by both quotation and billing */


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
 setTimeout(()=>{
  frame.contentWindow.focus();
  frame.contentWindow.print();
 },300);
}


function printQuoteObj(q){
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const c=db.categories[q.categoryId];
 const platformPhones=[db.platform.phone1,db.platform.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const row=(label,value,big)=>`<tr><td style="padding:4px 0;color:#555;font-size:${big?"16px":"14px"}">${esc(label)}</td><td style="padding:4px 0;text-align:right;font-weight:bold;font-size:${big?"18px":"14px"}">${esc(value)}</td></tr>`;

 /* Standard-vs-offer comparison, same idea as the final bill's — lets the customer
    see the discount being offered right at the quotation stage, not just at billing. */
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
 <div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
  <div style="font-weight:bold;font-size:21px;color:#0f5a55">${esc(db.business.name)}</div>
  ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
  ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
  ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
  ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
 </div>
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


function printQuote(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 printQuoteObj(q);
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

 /* SECTION 1: Usage Details */
 let usageRows="";
 usageRows+=row("Total KM / Total Hours",km+" KM / "+h+" hrs",true);
 if(r.days>1) usageRows+=row("Number of days",r.days+" days");
 if(r.restHours>0) usageRows+=row("Overnight rest hours (excluded)",r.restHours+" hrs");
 if(r.incKm!=null){
  usageRows+=row("Included Coverage",r.incKm+" KM / "+r.incHours+" hrs");
  usageRows+=row("Extra KM ("+money(r.addKm)+"/KM)",Math.max(0,km-r.incKm)+" KM = "+money(r.kmExtra||0));
  usageRows+=row("Extra Hours ("+money(r.addHour)+"/hr)",Math.max(0,h-r.incHours)+" hrs = "+money(r.hourExtra||0));
 }

 /* SECTION 2: Standard vs Offer Rate */
 const stdBase=standardRaw.invalid?0:standardRaw.base, stdExtra=standardRaw.invalid?0:standardRaw.extra, stdTotal=standardRaw.invalid?0:standardRaw.total;
 const offBase=r.base, offExtra=r.extra||0, offTotal=r.base+(r.extra||0);
 const cmpRow=(label,sv,ov,bold)=>`<tr><td style="padding:3px 0;font-weight:${bold?"bold":"normal"};font-size:14px">${esc(label)}</td><td style="padding:3px 0;text-align:right;font-weight:${bold?"bold":"normal"};font-size:14px">${money(sv)}</td><td style="padding:3px 0;text-align:right;font-weight:${bold?"bold":"normal"};font-size:14px">${money(ov)}</td></tr>`;
 const compareTable=`<table>
  <tr style="color:#888;font-size:12px"><td></td><td style="text-align:right">Standard</td><td style="text-align:right">Offer</td></tr>
  ${cmpRow("Base Rate",stdBase,offBase)}
  ${cmpRow("Additional Charge",stdExtra,offExtra)}
  <tr style="border-top:2px solid #ccc">${cmpRow("Total",stdTotal,offTotal,true).replace(/<tr>|<\/tr>/g,"")}</tr>
 </table>`;

 /* SECTION 3: Savings highlight */
 const savingsHtml=totalSavings>0?`<div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:12px;margin:10px 0;color:#1c6b2c">
  <div style="font-weight:bold;font-size:18px">🎉 Your Total Savings: ${money(totalSavings)}</div>
  <div style="font-size:12px">${rateSaving?`Offer discount ${money(rateSaving)}`:""}${manualDiscount?`${rateSaving?" + ":""}Additional discount ${money(manualDiscount)}`:""}</div>
 </div>`:"";

 /* SECTION 4: Final Payment Summary */
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
 <div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
  <div style="font-weight:bold;font-size:21px;color:#0f5a55">${esc(db.business.name)}</div>
  ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
  ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
  ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
  ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
 </div>
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

/* ---------- MASTER RATE TABLE (password protected) ---------- */


function pdfHeader(doc,title){
 let y=18;
 doc.setFont(undefined,"bold");doc.setFontSize(16);
 doc.text(db.business.name||"Travel Connect",15,y);y+=7;
 doc.setFont(undefined,"normal");doc.setFontSize(10);
 if(db.business.address){doc.text(db.business.address,15,y);y+=5;}
 if(db.business.phone){doc.text("Phone: "+db.business.phone,15,y);y+=5;}
 if(db.business.gstin){doc.text("GSTIN: "+db.business.gstin,15,y);y+=5;}
 y+=2;doc.setDrawColor(180);doc.line(15,y,195,y);y+=9;
 doc.setFont(undefined,"bold");doc.setFontSize(13);doc.text(title,15,y);y+=9;
 doc.setFont(undefined,"normal");doc.setFontSize(10);
 return y;
}


function downloadQuotePDFObj(q){
 const doc=pdfDoc();if(!doc)return;
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const c=db.categories[q.categoryId];

 /* Manual platform+business header — same construction as downloadBillPDF() uses,
    so the Quotation PDF's branding matches the Bill PDF's instead of falling back
    to the plain pdfHeader() helper, which never showed the platform tagline/email
    at all. */
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

 const partnerBoxTop=y;
 const partnerPhonesPdf=[db.business.phone,db.business.phone2].filter(Boolean);
 const partnerBoxHeight=15+(db.business.tagline?4.5:0)+(db.business.address?4.5:0)+(partnerPhonesPdf.length?5.5:0);
 doc.setFillColor(232,245,244);
 doc.rect(15,partnerBoxTop,180,partnerBoxHeight,"F");
 doc.setDrawColor(20,120,110);doc.rect(15,partnerBoxTop,180,partnerBoxHeight);doc.setDrawColor(210);
 let py=partnerBoxTop+7;
 doc.setFont(undefined,"bold");doc.setFontSize(14);doc.setTextColor(15,90,85);
 doc.text(db.business.name||"Travel Partner",105,py,{align:"center"});py+=5;
 doc.setFont(undefined,"normal");doc.setFontSize(8.5);doc.setTextColor(60);
 if(db.business.tagline){doc.text(db.business.tagline,105,py,{align:"center"});py+=4.5;}
 if(db.business.address){doc.text(db.business.address,105,py,{align:"center"});py+=4.5;}
 if(partnerPhonesPdf.length){
  doc.setFont(undefined,"bold");doc.setFontSize(10.5);doc.setTextColor(15,90,85);
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

 /* Standard-vs-offer comparison, same idea as the final bill's. */
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


function downloadQuotePDF(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 downloadQuotePDFObj(q);
}


function downloadBillPDF(tripId){
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

 const partnerBoxTop=y;
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean);
 const partnerBoxHeight=15+(db.business.tagline?4.5:0)+(db.business.address?4.5:0)+(partnerPhones.length?5.5:0);
 doc.setFillColor(232,245,244);
 doc.rect(15,partnerBoxTop,180,partnerBoxHeight,"F");
 doc.setDrawColor(20,120,110);doc.rect(15,partnerBoxTop,180,partnerBoxHeight);doc.setDrawColor(210);
 let py=partnerBoxTop+7;
 doc.setFont(undefined,"bold");doc.setFontSize(14);doc.setTextColor(15,90,85);
 doc.text(db.business.name||"Travel Partner",105,py,{align:"center"});py+=5;
 doc.setFont(undefined,"normal");doc.setFontSize(8.5);doc.setTextColor(60);
 if(db.business.tagline){doc.text(db.business.tagline,105,py,{align:"center"});py+=4.5;}
 if(db.business.address){doc.text(db.business.address,105,py,{align:"center"});py+=4.5;}
 if(partnerPhones.length){
  doc.setFont(undefined,"bold");doc.setFontSize(10.5);doc.setTextColor(15,90,85);
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

 /* SECTION 1: Usage Details */
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

 /* SECTION 2: Standard vs Offer Rate */
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

 /* SECTION 3: Customer Savings (green highlight) */
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

 /* SECTION 4: Final Payment Summary */
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
/* ---------- PRINT ---------- */
/* Prints via a hidden same-page iframe instead of window.open() — opening a separate
   tab/window causes some mobile browsers (notably Chrome on Android) to show a reduced
   print dialog without the full printer/destination chooser. A same-page iframe reliably
   shows the complete native print sheet, including nearby Bluetooth/USB printers. */


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
  <button type="button" onclick="openRoute()">🗺️ Open route in Google Maps</button>
 </div>
 <div class="grid">
 <label><b>Vehicle closing point (where the trip ends)</b><input id="qReturn" value="${esc(db.business.officeLocation)}"></label>
 <label>Estimated KM<input id="qKm" type="number" value="80" oninput="handleLocalCheck()"></label>
 <button type="button" onclick="doubleKm()" style="align-self:flex-end">&harr; Double KM (for Drop / return trip)</button>
 <label>Estimated hours<input id="qHours" type="number" value="8" oninput="handleLocalCheck()"></label>
 <label>Number of days (for outstation trips)<input id="qDays" type="number" value="1" min="1"></label>
 <label>Overnight rest hours (excluded from billing — customer arranged own room)<input id="qRestHours" type="number" value="0"></label>
 <label>Override Extra KM Rate (optional — for high-range/heavy-traffic/bad-road trips)<input id="qOverrideAddKm" type="number" placeholder="Leave blank to use selected rate's own value"></label>
 <label>Override Extra Hour Rate (optional)<input id="qOverrideAddHour" type="number" placeholder="Leave blank to use selected rate's own value"></label>
 <label>Entry date (leave blank for today)<input id="qEntryDate" type="date"></label>
 <label>Start date<input id="qStart" type="date"></label>
 <label>Start time<input id="qStartTime" type="time"></label><label>Closing date<input id="qClose" type="date"></label>
 <label>Closing time<input id="qCloseTime" type="time"></label>
 <button type="button" onclick="calcHoursFromTimes()" style="align-self:flex-end">&#8635; Calculate hours from Start/Closing time</button>
 <label>Service (optional, e.g. AC / Non-AC)<input id="qService"></label>
 <label>Rate<select id="qRate">${rateOptions()}</select></label>
 <label>Custom / Drop amount<input id="qCustom" type="number" oninput="qCustom.dataset.auto='0'"></label>
 <label><input type="checkbox" id="qBataOn" onchange="toggleBata()"> Include Driver Bata</label>
 <label>Driver Bata amount<input id="qBata" type="number" value="0" disabled></label>
 <label>Discount type<select id="qDiscType">
   <option value="none">No discount</option>
   <option value="percent">Percentage (%)</option>
   <option value="fixed">Fixed amount (₹)</option>
 </select></label>
 <label>Discount value<input id="qDiscValue" type="number" value="0"></label>
 <label>Round off to<select id="qRound">
   <option value="0">No rounding</option>
   <option value="10">Nearest ₹10</option>
   <option value="50">Nearest ₹50</option>
   <option value="100">Nearest ₹100</option>
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
/* Recomputes the advance amount from the currently calculated fare whenever the
   percentage dropdown changes — "Manual amount" leaves the field alone for the
   owner to type a specific figure instead. */


function calcQuote(){
 handleLocalCheck();
 const c=db.categories[+qCat.value],days=+document.querySelector("#qDays").value||1,restHours=+document.querySelector("#qRestHours").value||0;
 const overrides={addKm:document.querySelector("#qOverrideAddKm").value,addHour:document.querySelector("#qOverrideAddHour").value};
 const r=calcFare(c,qRate.value,+qKm.value||0,+qHours.value||0,days,restHours,overrides);
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
 ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours</div>`:""}
 ${(r.addKmOverridden||r.addHourOverridden)?`<div class="muted">Using overridden extra rate: ₹${r.addKm}/KM, ₹${r.addHour}/hr</div>`:""}
 <div>Extra KM: ${money(r.kmExtra||0)}</div><div>Extra Hour: ${money(r.hourExtra||0)}</div>
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

/* Builds a quote-shaped object straight from the current on-screen form fields (plus
   the already-computed fare r) — used both to persist a quotation AND to print/PDF
   the current numbers without requiring a save first. If a saved quotation is
   currently being edited (window._editingQuoteId), its id/no/created/advance-received
   status are preserved so printing shows the correct existing quotation number even
   before the edit is explicitly saved. */


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
/* Saving now UPDATES the existing record in place when editing a previously-saved
   quotation (tracked via window._editingQuoteId, set by openQuote()) instead of
   always inserting a new one — this is what was creating duplicate entries every
   time someone edited-then-saved a quotation more than once. */


function saveQuote(){
 const r=calcQuote();if(r.invalid){toast("Correct Local Trip limits first");return}
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
/* Print/PDF straight off the currently-calculated numbers on screen — no save
   required first, so a mid-call fare check or edit can be read out / printed
   immediately. "Save Quotation" remains a separate, explicit, optional action. */


function printCurrentQuote(){
 const r=calcQuote();
 if(r.invalid){toast("Correct Local Trip limits first");return}
 printQuoteObj(buildQuoteObjFromForm(r));
}


function downloadCurrentQuotePDF(){
 const r=calcQuote();
 if(r.invalid){toast("Correct Local Trip limits first");return}
 downloadQuotePDFObj(buildQuoteObjFromForm(r));
}


function quotations(){
 window._editingQuoteId=null;
 app().innerHTML=card("Quotations",`${quoteForm()}<hr><h3>Saved Quotations</h3>${db.quotes.map(q=>`<div class="listitem"><b>${esc(q.no)}</b> — ${esc(q.customer)} — ${money(q.quotedAmount)}<br>${esc(q.pickup)} → ${esc((q.destinations||[q.destination]).join(" → "))}
 ${q.advanceAmount>0?`<div class="${q.advanceReceived?"ok":"danger"}">${q.advanceReceived?`&#9989; Advance received: ${money(q.advanceAmount)} (${esc(q.advanceMethod||"")})`:`&#9888; Advance requested: ${money(q.advanceAmount)} — not yet received`}</div>`:""}
 <div class="actions"><button onclick="openQuote('${q.id}')">Open / Edit</button><button onclick="convertTrip('${q.id}')">Confirm & Create Trip</button><button onclick="downloadQuotePDF('${q.id}')">PDF</button><button onclick="printQuote('${q.id}')">Print</button>${q.advanceAmount>0?`<button onclick="openAdvanceQR('${q.id}')">Advance QR</button>${q.advanceReceived?"":`<button class="primary" onclick="markAdvanceReceived('${q.id}')">Mark Advance Received</button>`}`:""}<button class="danger" onclick="deleteQuote('${q.id}')">Delete</button></div></div>`).join("")||"<p class='muted'>No quotations saved.</p>"}`);
}
/* Shows a UPI QR for just the advance amount — separate from the balance-due QR on
   the final bill, so a customer paying an advance ahead of the trip has a clear,
   correctly-labelled QR to scan. */


function openAdvanceQR(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 if(!db.business.upiId){toast("Add a UPI ID in Admin settings to generate a payment QR code");return}
 modal(`<h2>Advance Payment QR</h2><p class="muted">₹${money(q.advanceAmount).replace("₹","")} advance for ${esc(q.no)}</p><div id="advQrBox" style="text-align:center"></div>`);
 setTimeout(()=>{
  const box=document.querySelector("#advQrBox");
  if(box&&typeof QRCode!=="undefined"){
   new QRCode(box,{text:buildUpiLink(q.advanceAmount,"Advance "+q.no),width:200,height:200});
  }
 },0);
}
/* Since there's no payment gateway wired up, the app cannot detect a UPI payment
   automatically — the owner confirms receipt manually here after checking their own
   UPI app / bank SMS. This is intentionally a deliberate manual step, not automatic. */


function markAdvanceReceived(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 modal(`<h2>Confirm Advance Received</h2>
  <p class="muted">${esc(q.no)} — Advance amount: ${money(q.advanceAmount)}</p>
  <label>Method<select id="advMethod"><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Other">Other</option></select></label>
  <div class="actions"><button class="primary" onclick="confirmAdvanceReceived('${id}')">Confirm Received</button></div>`);
}


function confirmAdvanceReceived(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 q.advanceReceived=true;
 q.advanceMethod=document.querySelector("#advMethod").value;
 q.advanceReceivedAt=new Date().toISOString();
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
 q.status="confirmed";save();toast("Trip confirmed"+(payments.length?" — advance carried over as a payment":""));trips()
}


function editTrip(id){const t=db.trips.find(x=>x.id===id);const q=db.quotes.find(x=>x.id===t.quoteId);modal(`<h2>Actual Trip Details</h2><div class="grid"><label>Bill entry date (leave blank for today)<input id="aEntryDate" type="date" value="${t.entryDate||""}"></label><label>Actual start date<input id="aStart" type="date" value="${t.startDate||q.startDate||""}"></label><label>Actual start time<input id="aTime" type="time" value="${t.startTime||q.startTime||""}"></label><label>Actual closing date<input id="aClose" type="date" value="${t.closeDate||q.closeDate||""}"></label><label>Actual closing time<input id="aCloseTime" type="time"></label><label>Actual start point<input id="aPickup" value="${esc(t.pickup||q.pickup)}"></label><label>Actual destinations<input id="aDest" value="${esc(t.dest||(q.destinations||[]).join(', ')||q.destination)}"></label><label>Actual closing point<input id="aReturn" value="${esc(t.returnPoint||q.returnPoint)}"></label><label>Actual KM<input id="aKm" type="number" value="${t.actualKm||0}"></label><label>Actual Hours<input id="aHours" type="number" value="${t.actualHours||0}"></label><label>Actual number of days<input id="aDays" type="number" value="${t.days||q.days||1}" min="1"></label><label>Actual overnight rest hours (excluded)<input id="aRestHours" type="number" value="${t.restHours!=null?t.restHours:(q.restHours||0)}"></label></div>${extraChargeFieldsHtml("aExtra",t.extraCharges||q.extraCharges)}<button class="primary" onclick="saveTrip('${id}')">Save Actual Trip</button>`)}


function saveTrip(id){const t=db.trips.find(x=>x.id===id);Object.assign(t,{entryDate:document.querySelector("#aEntryDate").value||t.entryDate||new Date().toISOString().slice(0,10),startDate:aStart.value,startTime:aTime.value,closeDate:aClose.value,closeTime:aCloseTime.value,pickup:aPickup.value,dest:aDest.value,returnPoint:aReturn.value,actualKm:+aKm.value||0,actualHours:+aHours.value||0,days:+document.querySelector("#aDays").value||1,restHours:+document.querySelector("#aRestHours").value||0,status:"completed",extraCharges:readExtraChargeFields("aExtra")});save();closeModal();toast("Trip updated");if(document.querySelector("#billBox")&&document.querySelector("#billTrip")) loadBill();}


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

/* Lets the owner manually correct a bill's final amount after the fact — e.g. a rate-sheet
   mistake discovered later, or a goodwill adjustment — without reopening the quotation or
   category rates. Stored on the trip, applied on top of the normal calculation everywhere
   (screen, PDF, print) so it always stays visible and reversible. */


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


function loadBill(){
 const t=db.trips.find(x=>x.id===billTrip.value);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const bd=billBreakdown(t,q,c);
 const {km,h,standardRaw,r,rateSaving,manualDiscount,manualAddition,totalSavings}=bd;
 const final=r.final;
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0);
 const balance=Math.max(0,final-paid);
 billBox.innerHTML=`<div class="ratebox">
  <div class="actions"><button onclick="editTrip('${t.id}')">Edit trip details (KM / hours / dates / Other Charges)</button><button onclick="openAdjustBill('${t.id}')">Adjust Final Bill Amount</button></div>

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
   <div style="font-weight:bold;font-size:16px">🎉 Your Total Savings: ${money(totalSavings)}</div>
   <div style="font-size:12px">${rateSaving?`Offer discount ${money(rateSaving)}`:""}${manualDiscount?`${rateSaving?" + ":""}Additional discount ${money(manualDiscount)}`:""}</div></div>`:""}

  <h3>4. Final Payment Summary</h3>
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
  <p class="danger" style="margin:6px 0"><b>⚠️ Enter only the amount actually received now — it does not fill in automatically.</b></p>
  <div class="grid" style="margin-top:8px">
   <label>Payment amount (max ${money(balance)})<input id="payAmt" type="number" placeholder="e.g. 500"></label>
   <label>Method<select id="payMethod"><option value="Advance">Advance</option><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Other">Other</option></select></label>
  </div>
  <div class="actions"><button class="primary" onclick="recordPayment('${t.id}')">Record Payment</button></div>
  <div id="billQR" style="margin-top:10px"></div>
  `:`<div class="ok" style="margin-top:8px"><b>&#9989; Fully Settled — no balance due</b></div>`}
  <div class="actions"><button onclick="downloadBillPDF('${t.id}')">PDF</button><button onclick="printBill('${t.id}')">Print</button></div>
 </div>`;
 if(balance>0) renderBillQR(balance,q.no||t.id.slice(0,8));
}


function enquiries(){
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
 app().innerHTML=card("Enquiry Management",`
 <div class="card" style="background:#eef6ff;border:2px solid #3b7bbf">
  <h3 style="margin-top:0">&#9889; Quick Fare (during a call — no save needed)</h3>
  <p class="muted">Type the route/KM and read out the fare instantly. Nothing here is saved unless you tap "Save as Enquiry" below. "Local Rate" is one of the Rate options below for same-day local trips.</p>
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
  <div class="actions">
   <button type="button" onclick="addQuickStopField()">+ Add another destination</button>
  </div>
  <div class="grid">
   <label><b>Vehicle closing point (where the trip ends)</b><input id="qqReturn" value="${esc(db.business.officeLocation)}"></label>
  </div>
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
 <div id="enqList">${db.enquiries.map(e=>`<div class="listitem"><b>${esc(e.name)}</b> • ${esc(e.mobile)}<br>${esc(e.pickup)} → ${esc(e.dest)}<br><span class="muted">${esc(e.type)} • Required: ${esc(e.date)} • Entered: ${esc(e.entryDate||(e.created||"").slice(0,10))} • ${esc(e.status)}</span>
 <div class="actions"><button class="primary" onclick="enquiryToQuote('${e.id}')">Create Quotation</button></div></div>`).join("")||"<p class='muted'>No enquiries.</p>"}</div>`);
}


function addQuickStopField(value=""){
 const c=document.querySelector("#qqStopsContainer");
 if(!c) return;
 const row=document.createElement("div");
 row.className="grid";
 row.style.marginTop="4px";
 row.innerHTML=`<label style="flex:1">Additional destination<input class="qq-stop-input" value="${esc(value)}"></label><button type="button" onclick="this.parentElement.remove()" style="align-self:flex-end">✕ Remove</button>`;
 c.appendChild(row);
}


function collectQuickDestinations(){
 const first=document.querySelector("#qqDest")?.value||"";
 const rest=Array.from(document.querySelectorAll(".qq-stop-input")).map(i=>i.value);
 return [first,...rest].map(v=>v.trim()).filter(Boolean);
}
/* Same Google-Maps-route trick as the Quotation form — includes the vehicle's own
   start/closing point so the owner can check the FULL live distance/route (not just
   pickup-to-drop) while still on the phone with the customer. */


function saveEnquiry(){
 if(!enqName.value||!enqMobile.value){toast("Enter customer name and mobile");return}
 const entryDate=document.querySelector("#enqEntryDate").value||new Date().toISOString().slice(0,10);
 db.enquiries.unshift({id:crypto.randomUUID(),name:enqName.value,mobile:enqMobile.value,pickup:enqPickup.value,dest:enqDest.value,type:enqType.value,date:enqDate.value,entryDate,status:"new",created:new Date().toISOString()});
 save();toast("Enquiry saved");enquiries();
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
  if(e.categoryId!=null){ qCat.value=e.categoryId; }
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
  toast("Enquiry details loaded — complete and save the quotation");
 },0);
}

/* ---------- QUOTATION FORM ---------- */


function openQuickRoute(){
 const start=document.querySelector("#qqVehicleStart").value;
 const pickup=document.querySelector("#qqPickup").value;
 const stops=collectQuickDestinations();
 const closing=document.querySelector("#qqReturn").value;
 const points=[start,pickup,...stops,closing].map(v=>v.trim()).filter(Boolean);
 if(points.length<2){toast("Enter at least a pickup and destination first");return}
 const origin=points[0], destination=points[points.length-1], waypoints=points.slice(1,-1).join("|");
 let url="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination);
 if(waypoints) url+="&waypoints="+encodeURIComponent(waypoints);
 window.open(url,"_blank");
}
/* Uses the exact same rate engine as the Quotation form (calcFare) — just without
   any of the save/discount/round-off machinery, for speed during a live call. */
/* Updated: now shows Standard rate first, then the selected Offer rate (if
   different) — same comparison style as the Quotation/Bill screens — so the
   owner can read out both figures to the customer live on a call. */


function calcQuickFare(){
 const c=db.categories[+document.querySelector("#qqCat").value];
 const plan=document.querySelector("#qqRate").value;
 const km=+document.querySelector("#qqKm").value||0, h=+document.querySelector("#qqHours").value||0;
 const box=document.querySelector("#qqResult");
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
 ${savings>0?`<div class="ok" style="margin-top:6px">🎉 Customer saves: ${money(savings)}</div>`:""}
 ${extraTotal>0?`<div style="margin-top:6px">Other Charges${extraChargesShortLabel(extraCharges)}: +${money(extraTotal)}</div>`:""}
 <div class="total" style="margin-top:6px">Offer Fare: ${money(r.total+extraTotal)}</div>
 ${extraChargesHtml(extraCharges)}`;
}

/* Only saves an Enquiry record if the owner explicitly wants one kept — the whole
   point of Quick Fare is that a phone call doesn't have to end in a saved record. */


function saveQuickAsEnquiry(){
 const pickup=document.querySelector("#qqPickup").value;
 const stops=collectQuickDestinations();
 const name=document.querySelector("#qqName").value, mobile=document.querySelector("#qqMobile").value;
 if(!name||!mobile){toast("Enter the customer's name and mobile number first — otherwise you won't be able to tell this enquiry apart later");return}
 if(!pickup&&!stops.length){toast("Enter at least a pickup or destination first");return}
 const entryDate=new Date().toISOString().slice(0,10);
 /* Carries over EVERYTHING entered in Quick Fare (category, KM/hours, rate plan,
    days, rest hours, rate overrides, other charges) — not just the route — so
    converting this enquiry into a Quotation later doesn't lose any of it. */
 db.enquiries.unshift({
  id:crypto.randomUUID(),name,mobile,pickup,dest:stops.join(" → "),destinations:stops,
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


function billing(){
 app().innerHTML=card("Final Billing",`
 <div class="card" style="background:#eef6ff;border:2px solid #3b7bbf">
  <h3 style="margin-top:0">&#9889; Quick Bill (trip already done — no Enquiry/Quotation needed)</h3>
  <p class="muted">For when the trip is already over and you just need to bill it directly.</p>
  <div class="actions"><button class="primary" onclick="openQuickBillForm()">Create Quick Bill</button></div>
 </div>
 <hr>
 <label>Trip<select id="billTrip">${db.trips.map(t=>`<option value="${t.id}">${esc(t.customer)} — ${esc(t.id.slice(0,8))}</option>`).join("")}</select></label><label>Bill print date (optional, defaults to today)<input id="billDateInput" type="date"></label><div class="actions"><button class="primary" onclick="loadBill()">Calculate Final Bill</button></div><div id="billBox"></div>`);
}
/* Quick Bill skips Enquiry → Quotation → Confirm entirely: it builds a normal quote
   record (so all the existing bill/print/PDF code keeps working unchanged) AND a
   completed trip record in one step, for a trip that's already finished and just
   needs billing right now. */


function openQuickBillForm(){
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
 modal(`<h2>Quick Bill</h2>
 <div class="grid">
  <label>Customer name<input id="qbName"></label><label>Customer mobile<input id="qbMobile"></label>
  <label>Trip type<select id="qbType">
    <option value="local">Local Trip</option>
    <option value="one_day">One Day</option>
    <option value="round">Round Trip</option>
    <option value="outstation">Outstation</option>
    <option value="drop">Drop</option>
  </select></label>
  <label>Vehicle category<select id="qbCat">${cat}</select></label>
  <label>Vehicle<input id="qbVehicle"></label><label>Vehicle number<input id="qbVehicleNo"></label>
  <label><b>&#128663; Vehicle start point</b><input id="qbVehicleStart" value="${esc(db.business.officeLocation)}"></label>
  <label><b>Customer pickup point</b><input id="qbPickup"></label>
  <label>Destination<input id="qbDest"></label>
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


function calcQuickBillPreview(){
 const c=db.categories[+document.querySelector("#qbCat").value];
 const plan=document.querySelector("#qbRate").value;
 const km=+document.querySelector("#qbKm").value||0, h=+document.querySelector("#qbHours").value||0;
 const days=+document.querySelector("#qbDays").value||1, restHours=+document.querySelector("#qbRestHours").value||0;
 const overrides={addKm:document.querySelector("#qbOverrideAddKm").value,addHour:document.querySelector("#qbOverrideAddHour").value};
 const box=document.querySelector("#qbResult");
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
  destinations:[document.querySelector("#qbDest").value].filter(Boolean),destination:document.querySelector("#qbDest").value,
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
  pickup:document.querySelector("#qbPickup").value,dest:document.querySelector("#qbDest").value,returnPoint:document.querySelector("#qbReturn").value,
  payments:[],extraCharges:quote.extraCharges,created:new Date().toISOString()};
 db.trips.unshift(trip);
 save();closeModal();toast("Bill created");
 view("billing");
 setTimeout(()=>{billTrip.value=trip.id;loadBill()},0);
}

