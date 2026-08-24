const KEY="tcp_v1";
const ADMIN_PASSWORD="Krishna@123";

/* ---------- DEFAULT DATA ---------- */
function rateBlock(rate,incKm,incHours,addKm,addHour){
 return {rate:+rate,incKm:+incKm,incHours:+incHours,addKm:+addKm,addHour:+addHour};
}

const defaults={
 business:{name:"Krishna Tours & Travels",phone:"",gstin:"",upiId:"",upiName:"Krishna Tours & Travels"},
 categories:[
  {name:"Mini / Hatchback",
   standard:rateBlock(2200,80,8,18,220), competitive:rateBlock(1900,80,8,18,220),
   safety:rateBlock(2050,80,8,18,220),   local:rateBlock(1500,40,4,18,220)},
  {name:"Sedan",
   standard:rateBlock(2500,80,8,21,250), competitive:rateBlock(2200,80,8,21,250),
   safety:rateBlock(2350,80,8,21,250),   local:rateBlock(1700,40,4,21,250)},
  {name:"Taxi Jeep / Off-road",
   standard:rateBlock(2800,80,8,22,250), competitive:rateBlock(2400,80,8,22,250),
   safety:rateBlock(2600,80,8,22,250),   local:rateBlock(1900,40,4,22,250)},
  {name:"Standard MUV",
   standard:rateBlock(3000,80,8,22,300), competitive:rateBlock(2600,80,8,22,300),
   safety:rateBlock(2800,80,8,22,300),   local:rateBlock(2100,40,4,22,300)},
  {name:"Premium MUV",
   standard:rateBlock(3200,80,8,24,300), competitive:rateBlock(2800,80,8,24,300),
   safety:rateBlock(3000,80,8,24,300),   local:rateBlock(2300,40,4,24,300)},
  {name:"Innova Crysta / Innova Hycross",
   standard:rateBlock(3800,80,8,26,350), competitive:rateBlock(3400,80,8,26,350),
   safety:rateBlock(3600,80,8,26,350),   local:rateBlock(2800,40,4,26,350)},
  {name:"Compact SUV",
   standard:rateBlock(3300,80,8,24,300), competitive:rateBlock(2900,80,8,24,300),
   safety:rateBlock(3100,80,8,24,300),   local:rateBlock(2500,40,4,24,300)},
  {name:"Premium SUV",
   standard:rateBlock(4800,80,8,30,400), competitive:rateBlock(4300,80,8,30,400),
   safety:rateBlock(4550,80,8,30,400),   local:rateBlock(3600,40,4,30,400)},
  {name:"Traveller / Urbania (12-17 seater)",
   standard:rateBlock(6500,80,8,35,450), competitive:rateBlock(5800,80,8,35,450),
   safety:rateBlock(6100,80,8,35,450),   local:rateBlock(4800,40,4,35,450)},
  {name:"Mini Bus (20-25 seater)",
   standard:rateBlock(9000,80,8,45,600), competitive:rateBlock(8200,80,8,45,600),
   safety:rateBlock(8600,80,8,45,600),   local:rateBlock(6800,40,4,45,600)},
  {name:"Bus (32-40 seater)",
   standard:rateBlock(13000,80,8,60,800), competitive:rateBlock(12000,80,8,60,800),
   safety:rateBlock(12500,80,8,60,800),  local:rateBlock(10000,40,4,60,800)},
  {name:"Bus (49 seater)",
   standard:rateBlock(16000,80,8,70,900), competitive:rateBlock(14800,80,8,70,900),
   safety:rateBlock(15400,80,8,70,900),  local:rateBlock(12500,40,4,70,900)}
 ],
 settings:{localMaxKm:50,localMaxHours:5}
};

let db=JSON.parse(localStorage.getItem(KEY)||"null")||{...defaults,vehicles:[],drivers:[],customers:[],enquiries:[],quotes:[],trips:[],bills:[],expenses:[]};

/* ---------- MIGRATION ---------- */
function migrate(){
 let changed=false;
 (db.categories||[]).forEach(c=>{
  if(typeof c.standard==="number"){
   const incKm=c.incKm??80, incHours=c.incHours??8, addKm=c.addKm??0, addHour=c.addHour??0;
   const localIncKm=Math.min(incKm, db.settings?.localMaxKm||50);
   const localIncHours=Math.min(incHours, db.settings?.localMaxHours||5);
   const std=c.standard, comp=c.competitive, saf=c.safety, loc=c.local;
   c.standard=rateBlock(std,incKm,incHours,addKm,addHour);
   c.competitive=rateBlock(comp,incKm,incHours,addKm,addHour);
   c.safety=rateBlock(saf,incKm,incHours,addKm,addHour);
   c.local=rateBlock(loc,localIncKm,localIncHours,addKm,addHour);
   delete c.incKm;delete c.incHours;delete c.addKm;delete c.addHour;
   changed=true;
  }
 });
 if(!db.settings) db.settings={localMaxKm:50,localMaxHours:5};
 (db.trips||[]).forEach(t=>{ if(!Array.isArray(t.payments)) t.payments = t.payment ? [{...t.payment}] : []; });
 (db.quotes||[]).forEach(q=>{ if(!Array.isArray(q.destinations)) q.destinations = q.destination ? [q.destination] : []; });
 if(changed) save();
}

function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function toast(s){let e=document.querySelector("#toast");e.textContent=s;e.style.display="block";setTimeout(()=>e.style.display="none",2600)}
function app(){return document.querySelector("#app")}
function card(title,body){return `<section class="container"><div class="card"><h2>${title}</h2>${body}</div></section>`}
function view(v){location.hash=v;render()}
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>view(b.dataset.view));
document.querySelector("#networkBtn").onclick=()=>network();

function render(){
 const v=location.hash.slice(1)||"dashboard";
 if(v==="dashboard") dashboard();
 else if(v==="enquiries") enquiries();
 else if(v==="quotations") quotations();
 else if(v==="trips") trips();
 else if(v==="billing") billing();
 else if(v==="master") master();
 else if(v==="accounts") accounts();
 else if(v==="admin") admin();
 else network();
}

/* ---------- ADMIN PASSWORD GATE ---------- */
/* Protects rate-master edits and business/local-trip-rule settings.
   Unlocks once per browser session after the correct password is entered. */
function requireAdmin(action){
 if(sessionStorage.getItem("tc_admin")==="1"){ action(); return; }
 window._pendingAdminAction=action;
 modal(`<h2>Admin Password Required</h2>
  <p class="muted">Enter the admin password to edit rates or business rules.</p>
  <input id="apPass" type="password" placeholder="Password" onkeydown="if(event.key==='Enter')verifyAdmin()">
  <div class="actions"><button class="primary" onclick="verifyAdmin()">Unlock</button></div>
  <div id="apErr" class="danger"></div>`);
}
function verifyAdmin(){
 if(document.querySelector("#apPass").value===ADMIN_PASSWORD){
  sessionStorage.setItem("tc_admin","1");
  closeModal();
  const action=window._pendingAdminAction; window._pendingAdminAction=null;
  if(action) action();
 }else{
  document.querySelector("#apErr").textContent="Incorrect password.";
 }
}

function dashboard(){
 app().innerHTML=card("Travel Connect Dashboard",`<div class="grid">
 <div class="metric">Customers<b>${db.customers.length}</b></div><div class="metric">Drivers<b>${db.drivers.length}</b></div>
 <div class="metric">Vehicles<b>${db.vehicles.length}</b></div><div class="metric">Saved Quotations<b>${db.quotes.length}</b></div>
 </div><div class="card"><h3>Business workflow</h3><p>Enquiry → Quotation → Confirmation → Trip → Final Bill → Payment → Accounts</p>
 <div class="notice"><b>Local Trip:</b> maximum ${db.settings.localMaxKm} KM AND ${db.settings.localMaxHours} hours. If either limit is exceeded, it automatically switches to a One Day tariff.</div></div>
 <div class="actions"><button class="primary" onclick="view('enquiries')">New Enquiry</button><button onclick="view('quotations')">New Quotation</button><button onclick="view('master')">Rate Master</button></div>`);
}

function enquiries(){
 app().innerHTML=card("Enquiry Management",`<div class="grid">
 <label>Customer name<input id="enqName"></label><label>Mobile<input id="enqMobile"></label>
 <label>Pickup<input id="enqPickup"></label><label>Destination<input id="enqDest"></label>
 <label>Trip type<select id="enqType"><option value="local">Local Trip</option><option value="one_day">One Day</option><option value="round">Round Trip</option><option value="outstation">Outstation</option><option value="drop">Drop</option></select></label>
 <label>Required date<input id="enqDate" type="date"></label></div>
 <div class="actions"><button class="primary" onclick="saveEnquiry()">Save Enquiry</button></div>
 <div id="enqList">${db.enquiries.map(e=>`<div class="listitem"><b>${esc(e.name)}</b> • ${esc(e.mobile)}<br>${esc(e.pickup)} → ${esc(e.dest)}<br><span class="muted">${esc(e.type)} • ${esc(e.date)} • ${esc(e.status)}</span>
 <div class="actions"><button class="primary" onclick="enquiryToQuote('${e.id}')">Create Quotation</button></div></div>`).join("")||"<p class='muted'>No enquiries.</p>"}</div>`);
}
function saveEnquiry(){
 if(!enqName.value||!enqMobile.value){toast("Enter customer name and mobile");return}
 db.enquiries.unshift({id:crypto.randomUUID(),name:enqName.value,mobile:enqMobile.value,pickup:enqPickup.value,dest:enqDest.value,type:enqType.value,date:enqDate.value,status:"new",created:new Date().toISOString()});
 save();toast("Enquiry saved");enquiries();
}
function enquiryToQuote(id){
 const e=db.enquiries.find(x=>x.id===id);
 if(!e){toast("Enquiry not found");return}
 e.status="quoted";save();
 view("quotations");
 setTimeout(()=>{
  qName.value=e.name;qMobile.value=e.mobile;qPickup.value=e.pickup;qDest.value=e.dest;
  if(["local","one_day","round","outstation","drop"].includes(e.type)) qType.value=e.type;
  qStart.value=e.date||"";
  handleTripTypeChange();
  toast("Enquiry details loaded — complete and save the quotation");
 },0);
}

/* ---------- QUOTATION FORM ---------- */
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
 <label>Pickup<input id="qPickup"></label>
 <label>Destination 1<input id="qDest"></label></div>
 <div id="qStopsContainer"></div>
 <div class="actions">
  <button type="button" onclick="addStopField()">+ Add another destination</button>
  <button type="button" onclick="openRoute()">🗺️ Open route in Google Maps</button>
 </div>
 <div class="grid">
 <label>Return / closing point<input id="qReturn"></label>
 <label>Estimated KM<input id="qKm" type="number" value="80" oninput="handleLocalCheck()"></label>
 <label>Estimated hours<input id="qHours" type="number" value="8" oninput="handleLocalCheck()"></label>
 <label>Start date<input id="qStart" type="date"></label>
 <label>Start time<input id="qStartTime" type="time"></label><label>Closing date<input id="qClose" type="date"></label>
 <label>Closing time<input id="qCloseTime" type="time"></label>
 <label>Rate<select id="qRate">
   <option value="standard">Standard Rate</option>
   <option value="competitive" selected>Competitive Rate</option>
   <option value="safety">Minimum Safety Rate</option>
   <option value="local">Local Rate</option>
   <option value="custom">Custom / Manual Amount</option>
 </select></label>
 <label>Custom / Drop amount<input id="qCustom" type="number" oninput="qCustom.dataset.auto='0'"></label>
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
 </div>
 <div class="actions"><button class="primary" onclick="calcQuote()">Calculate</button><button onclick="saveQuote()">Save Quotation</button></div><div id="qCalc" class="ratebox"></div>`;
}

function addStopField(value=""){
 const c=document.querySelector("#qStopsContainer");
 if(!c) return;
 const row=document.createElement("div");
 row.className="grid";
 row.style.marginTop="4px";
 row.innerHTML=`<label style="flex:1">Additional destination<input class="stop-input" value="${esc(value)}"></label><button type="button" onclick="this.parentElement.remove()" style="align-self:flex-end">✕ Remove</button>`;
 c.appendChild(row);
}
function collectDestinations(){
 const first=document.querySelector("#qDest")?.value||"";
 const rest=Array.from(document.querySelectorAll(".stop-input")).map(i=>i.value);
 return [first,...rest].map(v=>v.trim()).filter(Boolean);
}
function openRoute(){
 const origin=qPickup.value, stops=collectDestinations();
 if(!origin||!stops.length){toast("Enter pickup and at least one destination first");return}
 const destination=stops[stops.length-1], waypoints=stops.slice(0,-1).join("|");
 let url="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination);
 if(waypoints) url+="&waypoints="+encodeURIComponent(waypoints);
 window.open(url,"_blank");
}

/* When trip type or category changes: sync rate plan + auto-fill Drop amount */
function handleTripTypeChange(){
 const type=qType.value;
 const c=db.categories[+qCat.value];
 if(type==="local"){
  qRate.value="local";
 }else if(type==="drop"){
  qRate.value="custom";
  if(qCustom.dataset.auto!=="0"||!qCustom.value){
   qCustom.value=c.safety.rate;
   qCustom.dataset.auto="1";
  }
 }else if(qRate.value==="local"){
  qRate.value="competitive";
 }
 handleLocalCheck();
 calcQuote();
}

function handleLocalCheck(){
 if(!document.getElementById("qType")) return;
 if(qType.value==="local"){
  const km=+qKm.value||0, h=+qHours.value||0;
  if(km>db.settings.localMaxKm||h>db.settings.localMaxHours){
   qType.value="one_day";
   qRate.value="standard";
   toast(`Exceeds Local Trip limit (${db.settings.localMaxKm} KM / ${db.settings.localMaxHours} hrs) — switched to One Day tariff.`);
  }
 }
}

/* ---------- FARE CALCULATION ---------- */
function calcFare(c,plan,km,h){
 if(plan==="local"){
  if(km>db.settings.localMaxKm||h>db.settings.localMaxHours){
   return {invalid:true,reason:`Local limit exceeded: maximum ${db.settings.localMaxKm} KM and ${db.settings.localMaxHours} hours.`};
  }
  const L=c.local;
  const kmExtra=Math.max(0,km-L.incKm)*L.addKm;
  const hourExtra=Math.max(0,h-L.incHours)*L.addHour;
  const extra=Math.max(kmExtra,hourExtra);
  return {base:L.rate,extra,kmExtra,hourExtra,total:L.rate+extra,incKm:L.incKm,incHours:L.incHours,addKm:L.addKm,addHour:L.addHour};
 }
 if(plan==="custom"){
  const base=Number(document.querySelector("#qCustom")?.value||0);
  return {base,extra:0,kmExtra:0,hourExtra:0,total:base,incKm:null,incHours:null,addKm:null,addHour:null};
 }
 const R=c[plan];
 const kmExtra=Math.max(0,km-R.incKm)*R.addKm;
 const hourExtra=Math.max(0,h-R.incHours)*R.addHour;
 const extra=Math.max(kmExtra,hourExtra);
 return {base:R.rate,extra,kmExtra,hourExtra,total:R.rate+extra,incKm:R.incKm,incHours:R.incHours,addKm:R.addKm,addHour:R.addHour};
}

/* Applies discount then round-off on top of a subtotal; used by both quotation and billing */
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

function calcQuote(){
 handleLocalCheck();
 const c=db.categories[+qCat.value],r=calcFare(c,qRate.value,+qKm.value||0,+qHours.value||0);
 if(r.invalid){
  qCalc.innerHTML=`<div class="danger"><b>${esc(r.reason)}</b><br>Select another trip type/rate.</div>`;
  return r;
 }
 const dr=applyDiscountRound(r.total,qDiscType.value,+qDiscValue.value||0,+qRound.value||0);
 qCalc.innerHTML=`<div>Base: <b>${money(r.base)}</b></div>
 ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours</div>`:""}
 <div>Extra KM: ${money(r.kmExtra||0)}</div><div>Extra Hour: ${money(r.hourExtra||0)}</div>
 <div>Applicable extra (higher): <b>${money(r.extra||0)}</b></div>
 <div>Subtotal: ${money(r.total)}</div>
 ${dr.discountAmount?`<div>Discount: -${money(dr.discountAmount)}</div>`:""}
 ${dr.roundAdjustment?`<div>Round off: ${dr.roundAdjustment>=0?"+":""}${money(dr.roundAdjustment)}</div>`:""}
 <div class="total">Final quoted fare: ${money(dr.final)}</div>`;
 return {...r,...dr};
}

function saveQuote(){
 const r=calcQuote();if(r.invalid){toast("Correct Local Trip limits first");return}
 const c=db.categories[+qCat.value];
 const q={id:crypto.randomUUID(),no:"QTN-"+Date.now(),customer:qName.value,mobile:qMobile.value,type:qType.value,category:c.name,categoryId:+qCat.value,vehicle:qVehicle.value,vehicleNo:qVehicleNo.value,
  pickup:qPickup.value,destinations:collectDestinations(),destination:collectDestinations()[0]||"",returnPoint:qReturn.value,
  estimatedKm:+qKm.value||0,estimatedHours:+qHours.value||0,startDate:qStart.value,startTime:qStartTime.value,closeDate:qClose.value,closeTime:qCloseTime.value,
  ratePlan:qRate.value,baseRate:r.base,kmRate:r.addKm,hourRate:r.addHour,includedKm:r.incKm,includedHours:r.incHours,
  discountType:qDiscType.value,discountValue:+qDiscValue.value||0,discountAmount:r.discountAmount,roundOff:+qRound.value||0,roundAdjustment:r.roundAdjustment,
  subtotal:r.total,quotedAmount:r.final,created:new Date().toISOString(),status:"quoted"};
 db.quotes.unshift(q);save();toast("Quotation saved: "+q.no);quotations();
}

function quotations(){
 app().innerHTML=card("Quotations",`${quoteForm()}<hr><h3>Saved Quotations</h3>${db.quotes.map(q=>`<div class="listitem"><b>${esc(q.no)}</b> — ${esc(q.customer)} — ${money(q.quotedAmount)}<br>${esc(q.pickup)} → ${esc((q.destinations||[q.destination]).join(" → "))}
 <div class="actions"><button onclick="openQuote('${q.id}')">Open / Edit</button><button onclick="convertTrip('${q.id}')">Confirm & Create Trip</button><button onclick="downloadQuotePDF('${q.id}')">PDF</button><button onclick="printQuote('${q.id}')">Print</button></div></div>`).join("")||"<p class='muted'>No quotations saved.</p>"}`);
}
function openQuote(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 view("quotations");
 setTimeout(()=>{
  qName.value=q.customer;qMobile.value=q.mobile;qType.value=q.type;qCat.value=q.categoryId;qVehicle.value=q.vehicle;qVehicleNo.value=q.vehicleNo;
  qPickup.value=q.pickup;
  const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination||""];
  qDest.value=dests[0]||"";
  dests.slice(1).forEach(d=>addStopField(d));
  qReturn.value=q.returnPoint;qKm.value=q.estimatedKm;qHours.value=q.estimatedHours;qStart.value=q.startDate;qStartTime.value=q.startTime;qClose.value=q.closeDate;qCloseTime.value=q.closeTime;
  qRate.value=q.ratePlan;qCustom.value=q.quotedAmount;qDiscType.value=q.discountType||"none";qDiscValue.value=q.discountValue||0;qRound.value=q.roundOff||0;
  calcQuote();
 },0);
}
function convertTrip(id){const q=db.quotes.find(x=>x.id===id);db.trips.unshift({id:crypto.randomUUID(),quoteId:id,customer:q.customer,status:"confirmed",actualKm:0,actualHours:0,payments:[],created:new Date().toISOString()});q.status="confirmed";save();toast("Trip confirmed");trips()}

function trips(){
 app().innerHTML=card("Trip Management",`${db.trips.map(t=>{const q=db.quotes.find(x=>x.id===t.quoteId)||{};return `<div class="listitem"><b>${esc(q.no||"Trip")}</b> — ${esc(t.customer)}<br>Status: <b>${esc(t.status)}</b><div class="actions"><button onclick="editTrip('${t.id}')">Open Trip</button><button onclick="makeBillFromTrip('${t.id}')">Final Bill</button></div></div>`}).join("")||"<p class='muted'>Confirm a quotation to create a trip.</p>"}`);
}
function editTrip(id){const t=db.trips.find(x=>x.id===id);const q=db.quotes.find(x=>x.id===t.quoteId);modal(`<h2>Actual Trip Details</h2><div class="grid"><label>Actual start date<input id="aStart" type="date" value="${t.startDate||q.startDate||""}"></label><label>Actual start time<input id="aTime" type="time" value="${t.startTime||q.startTime||""}"></label><label>Actual closing date<input id="aClose" type="date" value="${t.closeDate||q.closeDate||""}"></label><label>Actual closing time<input id="aCloseTime" type="time"></label><label>Actual start point<input id="aPickup" value="${esc(t.pickup||q.pickup)}"></label><label>Actual destinations<input id="aDest" value="${esc(t.dest||(q.destinations||[]).join(', ')||q.destination)}"></label><label>Actual closing point<input id="aReturn" value="${esc(t.returnPoint||q.returnPoint)}"></label><label>Actual KM<input id="aKm" type="number" value="${t.actualKm||0}"></label><label>Actual Hours<input id="aHours" type="number" value="${t.actualHours||0}"></label></div><button class="primary" onclick="saveTrip('${id}')">Save Actual Trip</button>`)}
function saveTrip(id){const t=db.trips.find(x=>x.id===id);Object.assign(t,{startDate:aStart.value,startTime:aTime.value,closeDate:aClose.value,closeTime:aCloseTime.value,pickup:aPickup.value,dest:aDest.value,returnPoint:aReturn.value,actualKm:+aKm.value||0,actualHours:+aHours.value||0,status:"completed"});save();closeModal();toast("Trip updated")}
function makeBillFromTrip(id){view("billing");setTimeout(()=>{billTrip.value=id;loadBill()},0)}

/* ---------- BILLING (advance / balance tracking + UPI QR + PDF/Print) ---------- */
function billing(){
 app().innerHTML=card("Final Billing",`<label>Trip<select id="billTrip">${db.trips.map(t=>`<option value="${t.id}">${esc(t.customer)} — ${esc(t.id.slice(0,8))}</option>`).join("")}</select></label><div class="actions"><button class="primary" onclick="loadBill()">Calculate Final Bill</button></div><div id="billBox"></div>`);
}

function billFinalAmount(t,q,c){
 const km=t.actualKm||q.estimatedKm, h=t.actualHours||q.estimatedHours;
 const r=calcFare(c,q.ratePlan,km,h);
 const subtotal=r.invalid?(q.subtotal??q.quotedAmount):r.total;
 const dr=applyDiscountRound(subtotal,q.discountType||"none",q.discountValue||0,q.roundOff||0);
 return {...r,subtotal,...dr};
}

function loadBill(){
 const t=db.trips.find(x=>x.id===billTrip.value);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const r=billFinalAmount(t,q,c);
 const final=r.final;
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0);
 const balance=Math.max(0,final-paid);
 billBox.innerHTML=`<div class="ratebox">
  ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours • Additional KM: ${money(r.addKm)}/KM • Additional Hour: ${money(r.addHour)}/hour</div>`:""}
  <div>Subtotal: ${money(r.subtotal)}</div>
  ${r.discountAmount?`<div>Discount: -${money(r.discountAmount)}</div>`:""}
  ${r.roundAdjustment?`<div>Round off: ${r.roundAdjustment>=0?"+":""}${money(r.roundAdjustment)}</div>`:""}
  <div class="total">FINAL BILL: ${money(final)}</div>
  ${(t.payments||[]).length?`<h3>Payments received</h3>${t.payments.map(p=>`<div>${esc(p.method)}: ${money(p.amount)} <span class="muted">(${(p.at||"").slice(0,16).replace("T"," ")})</span></div>`).join("")}`:""}
  <div><b>Total paid: ${money(paid)}</b></div>
  <div class="total">Balance due: ${money(balance)}</div>
  ${balance>0?`
  <div class="grid" style="margin-top:8px">
   <label>Payment amount<input id="payAmt" type="number" value="${balance}"></label>
   <label>Method<select id="payMethod"><option value="Advance">Advance</option><option value="Cash">Cash</option><option value="UPI">UPI</option><option value="Other">Other</option></select></label>
  </div>
  <div class="actions"><button class="primary" onclick="recordPayment('${t.id}')">Record Payment</button></div>
  <div id="billQR" style="margin-top:10px"></div>
  `:`<div class="ok" style="margin-top:8px"><b>&#9989; Fully Settled — no balance due</b></div>`}
  <div class="actions"><button onclick="downloadBillPDF('${t.id}')">PDF</button><button onclick="printBill('${t.id}')">Print</button></div>
 </div>`;
 if(balance>0) renderBillQR(balance,q.no||t.id.slice(0,8));
}

function recordPayment(tripId){
 const amt=+document.querySelector("#payAmt").value||0;
 const method=document.querySelector("#payMethod").value;
 if(amt<=0){toast("Enter a valid amount");return}
 const t=db.trips.find(x=>x.id===tripId);
 t.payments=t.payments||[];
 t.payments.push({amount:amt,method,at:new Date().toISOString()});
 db.bills.unshift({id:crypto.randomUUID(),tripId,amount:amt,method,created:new Date().toISOString()});
 save();
 toast("Payment recorded: "+money(amt));
 loadBill();
}

/* Shows a UPI QR only for the current remaining balance; once settled it disappears
   automatically so an old QR/screenshot can never be reused to overpay. */
function renderBillQR(amount,billNo){
 const box=document.querySelector("#billQR");
 if(!box) return;
 box.innerHTML="";
 if(!db.business.upiId){
  box.innerHTML="<p class='muted'>Add a UPI ID in Admin settings to generate a payment QR code.</p>";
  return;
 }
 if(typeof QRCode==="undefined"){
  box.innerHTML="<p class='muted'>QR library not loaded.</p>";
  return;
 }
 const upiLink="upi://pay?pa="+encodeURIComponent(db.business.upiId)+"&pn="+encodeURIComponent(db.business.upiName||db.business.name)+"&am="+amount+"&cu=INR&tn="+encodeURIComponent("Bill "+billNo);
 new QRCode(box,{text:upiLink,width:180,height:180});
 box.insertAdjacentHTML("beforeend",`<div class="muted" style="margin-top:6px">Scan to pay balance: ${money(amount)}</div>`);
}

/* ---------- PDF EXPORT ---------- */
function pdfFromLines(filename,title,lines){
 if(!window.jspdf){toast("PDF library not loaded");return}
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF();
 let y=15;
 doc.setFontSize(14);doc.text(title,15,y);y+=8;
 doc.setFontSize(10);
 lines.filter(l=>l!=="").forEach(l=>{ if(y>280){doc.addPage();y=15;} doc.text(String(l),15,y); y+=6; });
 doc.save(filename);
}
function downloadQuotePDF(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 pdfFromLines("Quotation-"+q.no+".pdf","Travel Quotation",[
  db.business.name, db.business.phone?("Phone: "+db.business.phone):"", db.business.gstin?("GSTIN: "+db.business.gstin):"","",
  "QUOTATION "+q.no,"Date: "+(q.created||"").slice(0,10),"",
  "Customer: "+q.customer,"Mobile: "+q.mobile,
  "Vehicle Category: "+q.category,"Vehicle: "+(q.vehicle||"-")+" "+(q.vehicleNo||""),
  "Pickup: "+q.pickup,
  ...dests.map((d,i)=>"Destination "+(i+1)+": "+d),
  "Return point: "+(q.returnPoint||"-"),
  "Trip type: "+q.type+"  |  Rate plan: "+q.ratePlan,
  "Estimated KM: "+q.estimatedKm+"  |  Estimated Hours: "+q.estimatedHours,"",
  "Subtotal: "+money(q.subtotal??q.quotedAmount),
  q.discountAmount?("Discount: -"+money(q.discountAmount)):"",
  q.roundAdjustment?("Round off: "+(q.roundAdjustment>=0?"+":"")+money(q.roundAdjustment)):"","",
  "QUOTED AMOUNT: "+money(q.quotedAmount)
 ]);
}
function downloadBillPDF(tripId){
 const t=db.trips.find(x=>x.id===tripId);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const r=billFinalAmount(t,q,c);
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0), balance=Math.max(0,r.final-paid);
 pdfFromLines("Bill-"+(q.no||tripId.slice(0,8))+".pdf","Final Bill",[
  db.business.name, db.business.phone?("Phone: "+db.business.phone):"","",
  "Customer: "+t.customer,"Trip: "+(q.no||""),"",
  "Subtotal: "+money(r.subtotal),
  r.discountAmount?("Discount: -"+money(r.discountAmount)):"",
  r.roundAdjustment?("Round off: "+(r.roundAdjustment>=0?"+":"")+money(r.roundAdjustment)):"",
  "FINAL BILL: "+money(r.final),"",
  ...(t.payments||[]).map(p=>p.method+": "+money(p.amount)+" ("+(p.at||"").slice(0,10)+")"),
  "","Total paid: "+money(paid),"Balance due: "+money(balance)
 ]);
}

/* ---------- PRINT ---------- */
function printContent(title,html){
 const w=window.open("","_blank");
 if(!w){toast("Please allow pop-ups to print");return}
 w.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:20px;color:#111}h2,h3{margin:6px 0}hr{margin:10px 0}</style></head><body>${html}</body></html>`);
 w.document.close();w.focus();
 setTimeout(()=>w.print(),300);
}
function printQuote(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 printContent("Quotation "+q.no,`<h2>${esc(db.business.name)}</h2><p>${esc(db.business.phone||"")}</p><hr>
 <h3>Quotation ${esc(q.no)}</h3>
 <p>Customer: ${esc(q.customer)} (${esc(q.mobile)})</p>
 <p>Pickup: ${esc(q.pickup)}</p>
 ${dests.map((d,i)=>`<p>Destination ${i+1}: ${esc(d)}</p>`).join("")}
 <p>Vehicle: ${esc(q.category)} ${esc(q.vehicle||"")} ${esc(q.vehicleNo||"")}</p>
 <p>Estimated KM/Hours: ${q.estimatedKm} KM / ${q.estimatedHours} hrs</p>
 <h3>Quoted Amount: ${money(q.quotedAmount)}</h3>`);
}
function printBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const r=billFinalAmount(t,q,c);
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0), balance=Math.max(0,r.final-paid);
 printContent("Bill "+(q.no||""),`<h2>${esc(db.business.name)}</h2><p>${esc(db.business.phone||"")}</p><hr>
 <h3>Final Bill — ${esc(q.no||"")}</h3><p>Customer: ${esc(t.customer)}</p>
 <p>Final Bill Amount: <b>${money(r.final)}</b></p>
 ${(t.payments||[]).map(p=>`<p>${esc(p.method)}: ${money(p.amount)}</p>`).join("")}
 <p>Total paid: ${money(paid)}</p><h3>Balance due: ${money(balance)}</h3>`);
}

/* ---------- MASTER RATE TABLE (password protected) ---------- */
function master(){
 const rows=db.categories.map((c,i)=>`<tr>
  <td>${esc(c.name)}</td>
  <td>${money(c.standard.rate)}</td>
  <td>${money(c.competitive.rate)}</td>
  <td>${money(c.safety.rate)}</td>
  <td>${money(c.local.rate)}</td>
  <td><button onclick="editCat(${i})">Edit</button></td>
 </tr>`).join("");
 app().innerHTML=card("Vehicle Categories & Rate Master",`<p class="muted">Password-protected. Each rate (Standard, Competitive, Minimum Safety, Local) has its own Included KM/Hours and Additional KM/Hour charge.</p><div class="tablewrap"><table class="table"><thead><tr><th>Category</th><th>Standard</th><th>Competitive</th><th>Minimum Safety</th><th>Local Rate</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="actions"><button class="primary" onclick="addCat()">+ Add vehicle category</button></div><hr><h3>Vehicles</h3><div class="grid"><label>Vehicle name<input id="vName"></label><label>Vehicle number<input id="vNo"></label><label>Category<select id="vCat">${db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("")}</select></label><label>Seats<input id="vSeats" type="number"></label></div><button class="primary" onclick="addVehicle()">Add Vehicle</button>${db.vehicles.map((v,i)=>`<div class="listitem">${esc(v.name)} • ${esc(v.no)} • ${esc(db.categories[v.cat]?.name||"")} • ${v.seats||""} seats</div>`).join("")}<hr><h3>Drivers</h3><div class="grid"><label>Name<input id="dName"></label><label>Mobile<input id="dMobile"></label><label>Vehicle<select id="dVehicle"><option value="">None</option>${db.vehicles.map((v,i)=>`<option value="${i}">${esc(v.name)} ${esc(v.no)}</option>`).join("")}</select></label></div><button class="primary" onclick="addDriver()">Add Driver</button>${db.drivers.map(d=>`<div class="listitem">${esc(d.name)} • ${esc(d.mobile)}</div>`).join("")}`);
}

function rateFields(prefix,label,r){
 return `<div class="card" style="margin:8px 0;background:#f5f8fa">
  <h3 style="margin:0 0 8px">${label}</h3>
  <div class="grid">
   <label>Rate (₹)<input id="${prefix}_rate" type="number" value="${r.rate}"></label>
   <label>Included KM<input id="${prefix}_incKm" type="number" value="${r.incKm}"></label>
   <label>Included Hours<input id="${prefix}_incHours" type="number" value="${r.incHours}"></label>
   <label>Additional KM charge (₹/KM)<input id="${prefix}_addKm" type="number" value="${r.addKm}"></label>
   <label>Additional Hour charge (₹/hr)<input id="${prefix}_addHour" type="number" value="${r.addHour}"></label>
  </div>
 </div>`;
}
function readRateFields(prefix){
 return rateBlock(
  document.querySelector("#"+prefix+"_rate").value,
  document.querySelector("#"+prefix+"_incKm").value,
  document.querySelector("#"+prefix+"_incHours").value,
  document.querySelector("#"+prefix+"_addKm").value,
  document.querySelector("#"+prefix+"_addHour").value
 );
}

function editCat(i){ requireAdmin(()=>openEditCatModal(i)); }
function openEditCatModal(i){
 const c=db.categories[i];
 modal(`<h2>Edit Rate: ${esc(c.name)}</h2>
  <label>Category name<input id="ec_name" value="${esc(c.name)}"></label>
  ${rateFields("ec_std","Standard Rate",c.standard)}
  ${rateFields("ec_comp","Competitive Rate",c.competitive)}
  ${rateFields("ec_saf","Minimum Safety Rate",c.safety)}
  ${rateFields("ec_loc","Local Rate (capped at "+db.settings.localMaxKm+" KM / "+db.settings.localMaxHours+" hrs)",c.local)}
  <button class="primary" onclick="saveCat(${i})">Save Rate</button>`);
}
function saveCat(i){
 const c=db.categories[i];
 c.name=document.querySelector("#ec_name").value;
 c.standard=readRateFields("ec_std");
 c.competitive=readRateFields("ec_comp");
 c.safety=readRateFields("ec_saf");
 c.local=readRateFields("ec_loc");
 save();closeModal();master();toast("Rate updated");
}

function addCat(){ requireAdmin(openAddCatModal); }
function openAddCatModal(){
 const blank=rateBlock(0,80,8,0,0), blankLocal=rateBlock(0,40,4,0,0);
 modal(`<h2>New Vehicle Category</h2>
  <label>Category name<input id="nc_name"></label>
  ${rateFields("nc_std","Standard Rate",blank)}
  ${rateFields("nc_comp","Competitive Rate",blank)}
  ${rateFields("nc_saf","Minimum Safety Rate",blank)}
  ${rateFields("nc_loc","Local Rate (capped at "+db.settings.localMaxKm+" KM / "+db.settings.localMaxHours+" hrs)",blankLocal)}
  <button class="primary" onclick="saveNewCat()">Add Category</button>`);
}
function saveNewCat(){
 const c={
  name:document.querySelector("#nc_name").value,
  standard:readRateFields("nc_std"),
  competitive:readRateFields("nc_comp"),
  safety:readRateFields("nc_saf"),
  local:readRateFields("nc_loc")
 };
 db.categories.push(c);save();closeModal();master();toast("Category added");
}

function addVehicle(){db.vehicles.push({name:vName.value,no:vNo.value,cat:+vCat.value,seats:+vSeats.value||0});save();master();toast("Vehicle added")}
function addDriver(){db.drivers.push({name:dName.value,mobile:dMobile.value,vehicle:+dVehicle.value});save();master();toast("Driver added")}

function accounts(){const income=db.bills.reduce((a,b)=>a+b.amount,0),expense=db.expenses.reduce((a,e)=>a+e.amount,0);app().innerHTML=card("Accounts",`<div class="grid"><div class="metric">Recorded billing<b>${money(income)}</b></div><div class="metric">Expenses<b>${money(expense)}</b></div><div class="metric">Net before other adjustments<b>${money(income-expense)}</b></div></div><p class="muted">This is the foundation. GST, tax reports, driver payments, fuel, toll, parking and profit reports will use the same ledger.</p><div class="grid"><label>Expense category<input id="exCat"></label><label>Description<input id="exDesc"></label><label>Amount<input id="exAmt" type="number"></label></div><button class="primary" onclick="addExpense()">Add expense</button>`)}
function addExpense(){db.expenses.push({category:exCat.value,description:exDesc.value,amount:+exAmt.value||0,created:new Date().toISOString()});save();toast("Expense recorded");accounts()}

function admin(){app().innerHTML=card("Admin / Business Settings",`<p class="muted">Password-protected — changes save instantly for this device.</p><div class="grid"><label>Business name<input id="bName" value="${esc(db.business.name)}"></label><label>Business phone<input id="bPhone" value="${esc(db.business.phone)}"></label><label>GSTIN (optional)<input id="bGst" value="${esc(db.business.gstin)}"></label><label>UPI ID<input id="bUpi" value="${esc(db.business.upiId)}"></label><label>UPI name<input id="bUpiName" value="${esc(db.business.upiName)}"></label><label>Local maximum KM<input id="lKm" type="number" value="${db.settings.localMaxKm}"></label><label>Local maximum hours<input id="lHr" type="number" value="${db.settings.localMaxHours}"></label></div><button class="primary" onclick="saveAdmin()">Save settings</button><hr><h3>Planned next phase</h3><p>Multi-device sync, driver network alerts, and user access control.</p>`)}
function saveAdmin(){ requireAdmin(doSaveAdmin); }
function doSaveAdmin(){Object.assign(db.business,{name:bName.value,phone:bPhone.value,gstin:bGst.value,upiId:bUpi.value,upiName:bUpiName.value});db.settings.localMaxKm=+lKm.value||50;db.settings.localMaxHours=+lHr.value||5;save();toast("Settings saved");admin();}

function network(){app().innerHTML=card("Travel Connect Network",`<p class="muted">Network foundation: driver request, message, location and SOS. Live multi-user alerts will be connected to the Cloudflare backend in the next backend phase.</p><label>Message<textarea id="nMsg" rows="4" placeholder="Need a vehicle / driver / food / help..."></textarea></label><div class="actions"><button class="primary" onclick="getLocation()">Share current location</button><button onclick="sendNetwork()">Send request</button><button class="danger" onclick="sos()">🆘 SOS</button></div><div id="nStatus"></div>`)}
function getLocation(){if(!navigator.geolocation){nStatus.textContent="GPS not supported";return}navigator.geolocation.getCurrentPosition(p=>{window.tcLoc={lat:p.coords.latitude,lon:p.coords.longitude};nStatus.innerHTML=`<p class="ok">Location captured: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}</p><a target="_blank" href="https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}">Open in Maps</a>`},()=>nStatus.textContent="Location permission denied")}
function sendNetwork(){const p={message:nMsg.value,location:window.tcLoc||null,created:new Date().toISOString()};fetch("/api/network",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)}).catch(()=>{});toast("Network request submitted (not yet delivered to other devices — multi-user sync is a future phase)")}
function sos(){getLocation();setTimeout(()=>{const msg=`TRAVEL CONNECT SOS. I need urgent assistance. Location: ${window.tcLoc?`https://maps.google.com/?q=${window.tcLoc.lat},${window.tcLoc.lon}`:"Please check my live location."}`;navigator.share?.({title:"Travel Connect SOS",text:msg}).catch(()=>{});toast("SOS message prepared")},800)}

function modal(html){modalBody.innerHTML=html;document.querySelector("#modal").classList.remove("hidden")}
function closeModal(){document.querySelector("#modal").classList.add("hidden")}

window.onerror=function(msg){try{toast("Something went wrong: "+msg)}catch(e){}return false};

migrate();
render();
