const KEY="tcp_v1";
const ADMIN_PASSWORD="Krishna@123";
/* Travel Connect logo mark, embedded so PDFs/prints work without a network request. */
const LOGO_DATA_URI="data:image/png;base64,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";

/* ---------- DEFAULT DATA ---------- */
function rateBlock(rate,incKm,incHours,addKm,addHour){
 return {rate:+rate,incKm:+incKm,incHours:+incHours,addKm:+addKm,addHour:+addHour};
}

const defaults={
 platform:{name:"Travel Connect",tagline:"Travel & Trip Management Platform",address:"",phone1:"",phone2:"",email:"travelconnect.business@gmail.com"},
 business:{name:"Krishna Tours & Travels",tagline:"Your Best Travel Partner",address:"",officeLocation:"",phone:"",phone2:"",gstin:"",upiId:"",upiName:"Krishna Tours & Travels"},
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
 settings:{localMaxKm:50,localMaxHours:5,businessProfileLocked:true}
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
 if(db.business.address===undefined){db.business.address="";changed=true;}
 if(db.business.tagline===undefined){db.business.tagline="Your Best Travel Partner";changed=true;}
 if(db.business.phone2===undefined){db.business.phone2="";changed=true;}
 if(!db.platform){db.platform={name:"Travel Connect",tagline:"Travel & Trip Management Platform",phone1:"",phone2:"",email:"travelconnect.business@gmail.com"};changed=true;}
 if(db.platform&&db.platform.email===undefined){db.platform.email="travelconnect.business@gmail.com";changed=true;}
 if(db.platform&&db.platform.address===undefined){db.platform.address="";changed=true;}
 if(db.settings.businessProfileLocked===undefined){db.settings.businessProfileLocked=true;changed=true;}
 if(db.business.officeLocation===undefined){db.business.officeLocation="";changed=true;}
 if(changed) save();
}

function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function toast(s){let e=document.querySelector("#toast");e.textContent=s;e.style.display="block";setTimeout(()=>e.style.display="none",2600)}
function app(){return document.querySelector("#app")}
/* Every page gets a "← Back" link (except Dashboard itself) so the user is
   never stuck on a page with no way back, regardless of how they arrived. */
function card(title,body){
 const isDashboard=(location.hash===""||location.hash==="#dashboard");
 const back=isDashboard?"":`<button class="backbtn" onclick="goBack()">&larr; Back to Dashboard</button>`;
 return `<section class="container"><div class="card">${back}<h2>${title}</h2>${body}</div></section>`;
}
function goBack(){ view("dashboard") }
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
/* Makes the phone's/browser's own Back button work correctly inside the app too. */
window.addEventListener("hashchange",render);

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
 <label>Return / closing point<input id="qReturn" value="${esc(db.business.officeLocation)}"></label>
 <label>Estimated KM<input id="qKm" type="number" value="80" oninput="handleLocalCheck()"></label>
 <button type="button" onclick="doubleKm()" style="align-self:flex-end">&harr; Double KM (for Drop / return trip)</button>
 <label>Estimated hours<input id="qHours" type="number" value="8" oninput="handleLocalCheck()"></label>
 <label>Start date<input id="qStart" type="date"></label>
 <label>Start time<input id="qStartTime" type="time"></label><label>Closing date<input id="qClose" type="date"></label>
 <label>Closing time<input id="qCloseTime" type="time"></label>
 <label>Service (optional, e.g. AC / Non-AC)<input id="qService"></label>
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
/* One tap to turn a one-way distance into a round-trip distance — handy for Drop
   trips, where the vehicle still has to drive back empty. */
function doubleKm(){
 const current=+qKm.value||0;
 if(current<=0){toast("Enter the one-way KM first");return}
 qKm.value=current*2;
 toast("KM doubled to "+qKm.value+" (up & down)");
 handleLocalCheck();calcQuote();
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
  if(qRate.value==="local"||qRate.value==="custom") qRate.value="safety";
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
  service:qService.value,ratePlan:qRate.value,baseRate:r.base,kmRate:r.addKm,hourRate:r.addHour,includedKm:r.incKm,includedHours:r.incHours,
  discountType:qDiscType.value,discountValue:+qDiscValue.value||0,discountAmount:r.discountAmount,roundOff:+qRound.value||0,roundAdjustment:r.roundAdjustment,
  subtotal:r.total,quotedAmount:r.final,created:new Date().toISOString(),status:"quoted"};
 db.quotes.unshift(q);save();toast("Quotation saved: "+q.no);quotations();
}

function quotations(){
 app().innerHTML=card("Quotations",`${quoteForm()}<hr><h3>Saved Quotations</h3>${db.quotes.map(q=>`<div class="listitem"><b>${esc(q.no)}</b> — ${esc(q.customer)} — ${money(q.quotedAmount)}<br>${esc(q.pickup)} → ${esc((q.destinations||[q.destination]).join(" → "))}
 <div class="actions"><button onclick="openQuote('${q.id}')">Open / Edit</button><button onclick="convertTrip('${q.id}')">Confirm & Create Trip</button><button onclick="downloadQuotePDF('${q.id}')">PDF</button><button onclick="printQuote('${q.id}')">Print</button><button class="danger" onclick="deleteQuote('${q.id}')">Delete</button></div></div>`).join("")||"<p class='muted'>No quotations saved.</p>"}`);
}
function deleteQuote(id){
 if(!confirm("Delete this quotation? This cannot be undone.")) return;
 db.quotes=db.quotes.filter(x=>x.id!==id);
 save();toast("Quotation deleted");quotations();
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
  qService.value=q.service||"";qReturn.value=q.returnPoint;qKm.value=q.estimatedKm;qHours.value=q.estimatedHours;qStart.value=q.startDate;qStartTime.value=q.startTime;qClose.value=q.closeDate;qCloseTime.value=q.closeTime;
  qRate.value=q.ratePlan;qCustom.value=q.quotedAmount;qDiscType.value=q.discountType||"none";qDiscValue.value=q.discountValue||0;qRound.value=q.roundOff||0;
  calcQuote();
 },0);
}
function convertTrip(id){const q=db.quotes.find(x=>x.id===id);db.trips.unshift({id:crypto.randomUUID(),quoteId:id,customer:q.customer,status:"confirmed",actualKm:0,actualHours:0,payments:[],created:new Date().toISOString()});q.status="confirmed";save();toast("Trip confirmed");trips()}

function trips(){
 app().innerHTML=card("Trip Management",`${db.trips.map(t=>{const q=db.quotes.find(x=>x.id===t.quoteId)||{};return `<div class="listitem"><b>${esc(q.no||"Trip")}</b> — ${esc(t.customer)}<br>Status: <b>${esc(t.status)}</b><div class="actions"><button onclick="editTrip('${t.id}')">Open Trip</button><button onclick="makeBillFromTrip('${t.id}')">Final Bill</button><button class="danger" onclick="deleteTrip('${t.id}')">Delete</button></div></div>`}).join("")||"<p class='muted'>Confirm a quotation to create a trip.</p>"}`);
}
function deleteTrip(id){
 if(!confirm("Delete this trip? Payment history already recorded will stay in Accounts, but this trip and its bill link will be removed.")) return;
 db.trips=db.trips.filter(x=>x.id!==id);
 save();toast("Trip deleted");trips();
}
function editTrip(id){const t=db.trips.find(x=>x.id===id);const q=db.quotes.find(x=>x.id===t.quoteId);modal(`<h2>Actual Trip Details</h2><div class="grid"><label>Actual start date<input id="aStart" type="date" value="${t.startDate||q.startDate||""}"></label><label>Actual start time<input id="aTime" type="time" value="${t.startTime||q.startTime||""}"></label><label>Actual closing date<input id="aClose" type="date" value="${t.closeDate||q.closeDate||""}"></label><label>Actual closing time<input id="aCloseTime" type="time"></label><label>Actual start point<input id="aPickup" value="${esc(t.pickup||q.pickup)}"></label><label>Actual destinations<input id="aDest" value="${esc(t.dest||(q.destinations||[]).join(', ')||q.destination)}"></label><label>Actual closing point<input id="aReturn" value="${esc(t.returnPoint||q.returnPoint)}"></label><label>Actual KM<input id="aKm" type="number" value="${t.actualKm||0}"></label><label>Actual Hours<input id="aHours" type="number" value="${t.actualHours||0}"></label></div><button class="primary" onclick="saveTrip('${id}')">Save Actual Trip</button>`)}
function saveTrip(id){const t=db.trips.find(x=>x.id===id);Object.assign(t,{startDate:aStart.value,startTime:aTime.value,closeDate:aClose.value,closeTime:aCloseTime.value,pickup:aPickup.value,dest:aDest.value,returnPoint:aReturn.value,actualKm:+aKm.value||0,actualHours:+aHours.value||0,status:"completed"});save();closeModal();toast("Trip updated");if(document.querySelector("#billBox")&&document.querySelector("#billTrip")) loadBill();}
function makeBillFromTrip(id){view("billing");setTimeout(()=>{billTrip.value=id;loadBill()},0)}

/* ---------- BILLING (advance / balance tracking + UPI QR + PDF/Print) ---------- */
function billing(){
 app().innerHTML=card("Final Billing",`<label>Trip<select id="billTrip">${db.trips.map(t=>`<option value="${t.id}">${esc(t.customer)} — ${esc(t.id.slice(0,8))}</option>`).join("")}</select></label><label>Bill print date (optional, defaults to today)<input id="billDateInput" type="date"></label><div class="actions"><button class="primary" onclick="loadBill()">Calculate Final Bill</button></div><div id="billBox"></div>`);
}
function billPrintDate(){
 const v=document.querySelector("#billDateInput")?.value;
 return v||new Date().toISOString().slice(0,10);
}

function billFinalAmount(t,q,c){
 const km=t.actualKm||q.estimatedKm, h=t.actualHours||q.estimatedHours;
 const r=calcFare(c,q.ratePlan,km,h);
 const subtotal=r.invalid?(q.subtotal??q.quotedAmount):r.total;
 const dr=applyDiscountRound(subtotal,q.discountType||"none",q.discountValue||0,q.roundOff||0);
 const adjAmount=(t.adjustment&&Number(t.adjustment.amount))||0;
 const finalAdjusted=Math.max(0,dr.final+adjAmount);
 return {...r,subtotal,...dr,final:finalAdjusted,manualAdjustment:adjAmount,manualAdjustmentNote:(t.adjustment&&t.adjustment.note)||""};
}

/* Lets the owner manually correct a bill's final amount after the fact — e.g. a rate-sheet
   mistake discovered later, or a goodwill adjustment — without reopening the quotation or
   category rates. Stored on the trip, applied on top of the normal calculation everywhere
   (screen, PDF, print) so it always stays visible and reversible. */
function openAdjustBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 const adj=t.adjustment||{amount:0,note:""};
 modal(`<h2>Adjust Final Bill Amount</h2>
  <p class="muted">This adds to (or subtracts from) the automatically calculated amount — it does not replace the calculation. Use a negative number to reduce the bill.</p>
  <label>Adjustment amount (e.g. -1000 or 250)<input id="adjAmt" type="number" value="${adj.amount||0}"></label>
  <label>Reason / note<input id="adjNote" value="${esc(adj.note||"")}" placeholder="e.g. Corrected rate sheet mistake"></label>
  <div class="actions"><button class="primary" onclick="saveAdjustBill('${tripId}')">Apply Adjustment</button>${adj.amount?`<button onclick="clearAdjustBill('${tripId}')">Remove Adjustment</button>`:""}</div>`);
}
function saveAdjustBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 const amt=+document.querySelector("#adjAmt").value||0;
 const note=document.querySelector("#adjNote").value;
 t.adjustment=amt?{amount:amt,note}:null;
 save();closeModal();toast("Bill amount adjusted");loadBill();
}
function clearAdjustBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 t.adjustment=null;
 save();closeModal();toast("Adjustment removed");loadBill();
}

function loadBill(){
 const t=db.trips.find(x=>x.id===billTrip.value);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const r=billFinalAmount(t,q,c);
 const final=r.final;
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0);
 const balance=Math.max(0,final-paid);
 billBox.innerHTML=`<div class="ratebox">
  <div class="actions"><button onclick="editTrip('${t.id}')">Edit trip details (KM / hours / dates)</button><button onclick="openAdjustBill('${t.id}')">Adjust Final Bill Amount</button></div>
  ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours • Additional KM: ${money(r.addKm)}/KM • Additional Hour: ${money(r.addHour)}/hour</div>`:""}
  <div>Subtotal: ${money(r.subtotal)}</div>
  ${r.discountAmount?`<div>Discount: -${money(r.discountAmount)}</div>`:""}
  ${r.roundAdjustment?`<div>Round off: ${r.roundAdjustment>=0?"+":""}${money(r.roundAdjustment)}</div>`:""}
  ${r.manualAdjustment?`<div>Manual adjustment: ${r.manualAdjustment>=0?"+":""}${money(r.manualAdjustment)}${r.manualAdjustmentNote?` <span class="muted">(${esc(r.manualAdjustmentNote)})</span>`:""}</div>`:""}
  <div class="total">FINAL BILL: ${money(final)}</div>
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

function recordPayment(tripId){
 const amt=+document.querySelector("#payAmt").value||0;
 const method=document.querySelector("#payMethod").value;
 if(amt<=0){toast("Enter a valid amount");return}
 const t=db.trips.find(x=>x.id===tripId);
 t.payments=t.payments||[];
 const at=new Date().toISOString();
 t.payments.push({amount:amt,method,at});
 db.bills.unshift({id:crypto.randomUUID(),tripId,amount:amt,method,created:at});
 save();
 toast("Payment recorded: "+money(amt));
 loadBill();
}
/* Removes the most recent payment entry — for correcting an accidental or wrong entry. */
function undoLastPayment(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 if(!t||!t.payments||!t.payments.length){toast("No payment to undo");return}
 const removed=t.payments.pop();
 const idx=db.bills.findIndex(b=>b.tripId===tripId&&b.created===removed.at&&b.amount===removed.amount);
 if(idx>-1) db.bills.splice(idx,1);
 save();
 toast("Removed: "+money(removed.amount)+" ("+removed.method+")");
 loadBill();
}

/* Looks up the driver currently assigned to a vehicle (by vehicle number) so the
   bill can show driver name/mobile the same way the reference invoice does. */
function findDriverForVehicleNo(vehicleNo){
 if(!vehicleNo) return null;
 const vIdx=db.vehicles.findIndex(v=>v.no===vehicleNo);
 if(vIdx<0) return null;
 return db.drivers.find(d=>+d.vehicle===vIdx)||null;
}
function buildUpiLink(amount,billNo){
 return "upi://pay?pa="+encodeURIComponent(db.business.upiId)+"&pn="+encodeURIComponent(db.business.upiName||db.business.name)+"&am="+amount+"&cu=INR&tn="+encodeURIComponent("Bill "+billNo);
}
/* Renders a QR into an offscreen element and returns it as a PNG data URL, so the
   same QR image can be embedded in the PDF and the Print output — not just shown
   on screen. Returns null if the QR library isn't ready or no UPI ID is set. */
function getQRDataURL(text,size){
 if(typeof QRCode==="undefined"||!text) return null;
 const holder=document.createElement("div");
 holder.style.position="absolute";holder.style.left="-9999px";
 document.body.appendChild(holder);
 new QRCode(holder,{text,width:size||220,height:size||220});
 const canvas=holder.querySelector("canvas");
 const dataUrl=canvas?canvas.toDataURL("image/png"):null;
 document.body.removeChild(holder);
 return dataUrl;
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
 const upiLink=buildUpiLink(amount,billNo);
 new QRCode(box,{text:upiLink,width:180,height:180});
 box.insertAdjacentHTML("beforeend",`<div class="muted" style="margin-top:6px">Scan to pay balance: ${money(amount)}</div>`);
}

/* ---------- PDF EXPORT ---------- */
/* jsPDF's built-in fonts cannot render the ₹ glyph (it prints as a broken
   character), so PDF/print-safe amounts use "Rs." instead. On-screen the app
   still shows ₹ via money(), since the browser renders that fine. */
function pdfMoney(n){return "Rs. "+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}

function pdfDoc(){ if(!window.jspdf){toast("PDF library not loaded");return null} return new window.jspdf.jsPDF(); }

function pdfHeader(doc,title){
 let y=18;
 doc.setFont(undefined,"bold");doc.setFontSize(16);
 doc.text(db.business.name||"Travel Connect",15,y);y+=7;
 doc.setFont(undefined,"normal");doc.setFontSize(10);
 if(db.business.phone){doc.text("Phone: "+db.business.phone,15,y);y+=5;}
 if(db.business.gstin){doc.text("GSTIN: "+db.business.gstin,15,y);y+=5;}
 y+=2;doc.setDrawColor(180);doc.line(15,y,195,y);y+=9;
 doc.setFont(undefined,"bold");doc.setFontSize(13);doc.text(title,15,y);y+=9;
 doc.setFont(undefined,"normal");doc.setFontSize(10);
 return y;
}
function pdfRow(doc,y,label,value,bold){
 if(y>280){doc.addPage();y=18;}
 doc.setFont(undefined,bold?"bold":"normal");doc.setFontSize(bold?12:10);
 doc.text(String(label),15,y);
 doc.text(String(value),195,y,{align:"right"});
 return y+(bold?8:6);
}
function pdfDivider(doc,y){doc.setDrawColor(210);doc.line(15,y,195,y+0.01);return y+6}

function downloadQuotePDF(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 const doc=pdfDoc();if(!doc)return;
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 let y=pdfHeader(doc,"QUOTATION "+q.no);
 y=pdfRow(doc,y,"Date",(q.created||"").slice(0,10));
 y=pdfRow(doc,y,"Customer",q.customer);
 y=pdfRow(doc,y,"Mobile",q.mobile);
 y=pdfDivider(doc,y);
 y=pdfRow(doc,y,"Vehicle Category",q.category);
 y=pdfRow(doc,y,"Vehicle",(q.vehicle||"-")+" "+(q.vehicleNo||""));
 y=pdfRow(doc,y,"Pickup",q.pickup);
 dests.forEach((d,i)=>{y=pdfRow(doc,y,"Destination "+(i+1),d);});
 if(q.returnPoint) y=pdfRow(doc,y,"Return point",q.returnPoint);
 y=pdfRow(doc,y,"Trip type",q.type+" / "+q.ratePlan);
 y=pdfRow(doc,y,"Estimated KM / Hours",q.estimatedKm+" KM / "+q.estimatedHours+" hrs");
 y=pdfDivider(doc,y);
 y=pdfRow(doc,y,"Subtotal",pdfMoney(q.subtotal??q.quotedAmount));
 if(q.discountAmount) y=pdfRow(doc,y,"Discount","-"+pdfMoney(q.discountAmount));
 if(q.roundAdjustment) y=pdfRow(doc,y,"Round off",(q.roundAdjustment>=0?"+":"")+pdfMoney(q.roundAdjustment));
 y=pdfDivider(doc,y);
 y=pdfRow(doc,y,"QUOTED AMOUNT",pdfMoney(q.quotedAmount),true);
 doc.save("Quotation-"+q.no+".pdf");
}

function downloadBillPDF(tripId){
 const t=db.trips.find(x=>x.id===tripId);if(!t)return;
 const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const km=t.actualKm||q.estimatedKm, h=t.actualHours||q.estimatedHours;
 const standardRaw=calcFare(c,"standard",km,h);
 const r=billFinalAmount(t,q,c);
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0), balance=Math.max(0,r.final-paid);
 const driver=findDriverForVehicleNo(q.vehicleNo);
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const saving=(!standardRaw.invalid)?(standardRaw.total-r.subtotal):0;
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
 detailRows.push(["Trip Date",q.startDate||"-"],["Pickup Time",q.startTime||"-"],["Pickup Point",q.pickup||"-"],["Destination",dests[dests.length-1]||"-"],["Return / Closing Point",q.returnPoint||"-"]);

 detailRows.forEach(([label,value])=>{
  if(y>272){doc.addPage();y=18;}
  doc.setTextColor(90);doc.text(label,15,y);
  doc.setTextColor(0);doc.text(String(value),195,y,{align:"right"});
  y+=5;
 });

 y+=1;
 doc.setFont(undefined,"bold");doc.text("Route",15,y);y+=5;doc.setFont(undefined,"normal");
 const routeLine=[q.pickup,...dests,q.returnPoint].filter(Boolean).join("  ->  ");
 const routeWrapped=doc.splitTextToSize(routeLine,180);
 doc.text(routeWrapped,15,y);y+=routeWrapped.length*4.5+3;

 y=pdfDivider(doc,y);
 doc.setFont(undefined,"bold");doc.text("Fare Details",15,y);y+=6;doc.setFont(undefined,"normal");
 y=pdfRow(doc,y,"Standard Rate (for comparison)",pdfMoney(standardRaw.invalid?0:standardRaw.total));
 y=pdfRow(doc,y,"Base Rate (Selected / Agreed Plan)",pdfMoney(r.base));
 if(r.incKm!=null){
  y=pdfRow(doc,y,"Included Coverage",r.incKm+" KM / "+r.incHours+" hrs");
  y=pdfRow(doc,y,"Actual Usage",km+" KM / "+h+" hrs");
  y=pdfRow(doc,y,"Additional KM Charge ("+pdfMoney(r.addKm)+"/KM)",pdfMoney(r.kmExtra||0));
  y=pdfRow(doc,y,"Additional Hour Charge ("+pdfMoney(r.addHour)+"/hr)",pdfMoney(r.hourExtra||0));
  y=pdfRow(doc,y,"Applicable Additional Charge (higher of the two)",pdfMoney(r.extra||0),true);
 }
 if(saving>0) y=pdfRow(doc,y,"Customer Saving vs Standard","- "+pdfMoney(saving));
 y=pdfRow(doc,y,"Subtotal (Base + Additional)",pdfMoney(r.subtotal));
 if(r.discountAmount) y=pdfRow(doc,y,"Discount","- "+pdfMoney(r.discountAmount));
 if(r.roundAdjustment) y=pdfRow(doc,y,"Round off",(r.roundAdjustment>=0?"+":"")+pdfMoney(r.roundAdjustment));
 if(r.manualAdjustment) y=pdfRow(doc,y,"Manual Adjustment"+(r.manualAdjustmentNote?" ("+r.manualAdjustmentNote+")":""),(r.manualAdjustment>=0?"+":"")+pdfMoney(r.manualAdjustment));
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

 if(y>276){doc.addPage();y=18;}
 doc.setFontSize(8);doc.setTextColor(120);
 doc.text("Thank you for travelling with "+(db.business.name||"us")+".",105,y,{align:"center"});
 doc.setTextColor(0);

 doc.save("Bill-"+(q.no||tripId.slice(0,8))+".pdf");
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
 const km=t.actualKm||q.estimatedKm, h=t.actualHours||q.estimatedHours;
 const standardRaw=calcFare(c,"standard",km,h);
 const r=billFinalAmount(t,q,c);
 const paid=(t.payments||[]).reduce((a,p)=>a+p.amount,0), balance=Math.max(0,r.final-paid);
 const driver=findDriverForVehicleNo(q.vehicleNo);
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const saving=(!standardRaw.invalid)?(standardRaw.total-r.subtotal):0;
 const billDate=billPrintDate();

 let qrHtml="";
 if(balance>0&&db.business.upiId){
  const qrData=getQRDataURL(buildUpiLink(balance,q.no||tripId.slice(0,8)),220);
  if(qrData) qrHtml=`<div style="text-align:center"><b>SCAN &amp; PAY</b><br><img src="${qrData}" style="width:140px;height:140px"><br><small>UPI: ${esc(db.business.upiId)}</small></div>`;
 }

 const row=(label,value,bold)=>`<tr><td style="padding:2px 0;color:${bold?"#111":"#555"};font-weight:${bold?"bold":"normal"}">${esc(label)}</td><td style="padding:2px 0;text-align:right;font-weight:${bold?"bold":"normal"}">${esc(value)}</td></tr>`;

 let detailRows="";
 detailRows+=row("Customer",t.customer||q.customer);
 detailRows+=row("Customer Mobile",q.mobile||"-");
 detailRows+=row("Trip Type",q.type||"-");
 detailRows+=row("Vehicle Category",q.category||"-");
 detailRows+=row("Vehicle",q.vehicle||"Not specified");
 detailRows+=row("Vehicle Number",q.vehicleNo||"Not specified");
 if(driver){detailRows+=row("Driver",driver.name||"-");detailRows+=row("Driver Mobile",driver.mobile||"-");}
 if(q.service) detailRows+=row("Service",q.service);
 detailRows+=row("Trip Date",q.startDate||"-");
 detailRows+=row("Pickup Point",q.pickup||"-");
 detailRows+=row("Destination",dests[dests.length-1]||"-");
 detailRows+=row("Return / Closing Point",q.returnPoint||"-");

 let fareRows="";
 fareRows+=row("Standard Rate (for comparison)",money(standardRaw.invalid?0:standardRaw.total));
 fareRows+=row("Base Rate (Selected / Agreed Plan)",money(r.base));
 if(r.incKm!=null){
  fareRows+=row("Included Coverage",r.incKm+" KM / "+r.incHours+" hrs");
  fareRows+=row("Actual Usage",km+" KM / "+h+" hrs");
  fareRows+=row("Additional KM Charge ("+money(r.addKm)+"/KM)",money(r.kmExtra||0));
  fareRows+=row("Additional Hour Charge ("+money(r.addHour)+"/hr)",money(r.hourExtra||0));
  fareRows+=row("Applicable Additional Charge (higher of the two)",money(r.extra||0),true);
 }
 if(saving>0) fareRows+=row("Customer Saving vs Standard","- "+money(saving));
 fareRows+=row("Subtotal (Base + Additional)",money(r.subtotal));
 if(r.discountAmount) fareRows+=row("Discount","- "+money(r.discountAmount));
 if(r.roundAdjustment) fareRows+=row("Round off",(r.roundAdjustment>=0?"+":"")+money(r.roundAdjustment));
 if(r.manualAdjustment) fareRows+=row("Manual Adjustment"+(r.manualAdjustmentNote?" ("+r.manualAdjustmentNote+")":""),(r.manualAdjustment>=0?"+":"")+money(r.manualAdjustment));

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
  <div style="color:#444;font-weight:bold;font-size:11px;text-align:right">${platformPhones}</div>
 </div>
 <div style="background:#e8f5f4;border:1px solid #148c76;border-radius:8px;padding:10px;text-align:center;margin:10px 0">
  <div style="font-weight:bold;font-size:19px;color:#0f5a55">${esc(db.business.name)}</div>
  ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
  ${db.business.address?`<div style="font-size:11px;color:#555">${esc(db.business.address)}</div>`:""}
  ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:14px;margin-top:3px">Contact: ${partnerPhones}</div>`:""}
 </div>
 <div style="display:flex;justify-content:space-between;align-items:baseline">
  <h3 style="color:#143c5a;margin:4px 0">FINAL TRIP BILL</h3>
  <span style="color:#888;font-size:11px">Bill printed on: ${esc(billDate)}</span>
 </div>
 <table style="width:100%;border-collapse:collapse;font-size:12.5px">${detailRows}</table>
 <p style="margin-top:8px"><b>Route:</b> ${[q.pickup,...dests,q.returnPoint].filter(Boolean).map(esc).join(" &rarr; ")}</p>
 <hr>
 <h3 style="margin:6px 0">Fare Details</h3>
 <table style="width:100%;border-collapse:collapse;font-size:12.5px">${fareRows}</table>
 <h2 style="text-align:right;margin:8px 0">FINAL BILL AMOUNT: ${money(r.final)}</h2>
 <div style="background:#fff8e8;border:1px solid #d2b478;border-radius:6px;padding:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
  <div>
   <b>PAYMENT INFORMATION</b><br>
   Final Bill Amount: ${money(r.final)}<br>
   Balance Due: <b>${balance>0?money(balance):"FULLY PAID"}</b>
  </div>
  ${qrHtml}
 </div>
 ${(t.payments||[]).length?`<h3 style="margin:8px 0 4px">Payments Received</h3><table style="width:100%;border-collapse:collapse;font-size:12.5px">${t.payments.map(p=>row(p.method+" ("+(p.at||"").slice(0,10)+")",money(p.amount))).join("")}${row("Total Paid",money(paid),true)}</table>`:""}
 <p style="text-align:center;color:#888;font-size:11px;margin-top:12px">Thank you for travelling with ${esc(db.business.name)}.</p>
 `);
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
 app().innerHTML=card("Vehicle Categories & Rate Master",`<p class="muted">Password-protected. Each rate (Standard, Competitive, Minimum Safety, Local) has its own Included KM/Hours and Additional KM/Hour charge.</p><div class="tablewrap"><table class="table"><thead><tr><th>Category</th><th>Standard</th><th>Competitive</th><th>Minimum Safety</th><th>Local Rate</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="actions"><button class="primary" onclick="addCat()">+ Add vehicle category</button><button onclick="exportRates()">Export rate sheet</button><button onclick="importRates()">Import rate sheet</button></div><hr><h3>Vehicles</h3><div class="grid"><label>Vehicle name<input id="vName"></label><label>Vehicle number<input id="vNo"></label><label>Category<select id="vCat">${db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("")}</select></label><label>Seats<input id="vSeats" type="number"></label></div><button class="primary" onclick="addVehicle()">Add Vehicle</button>${db.vehicles.map((v,i)=>`<div class="listitem">${esc(v.name)} • ${esc(v.no)} • ${esc(db.categories[v.cat]?.name||"")} • ${v.seats||""} seats</div>`).join("")}<hr><h3>Drivers</h3><div class="grid"><label>Name<input id="dName"></label><label>Mobile<input id="dMobile"></label><label>Vehicle<select id="dVehicle"><option value="">None</option>${db.vehicles.map((v,i)=>`<option value="${i}">${esc(v.name)} ${esc(v.no)}</option>`).join("")}</select></label></div><button class="primary" onclick="addDriver()">Add Driver</button>${db.drivers.map(d=>`<div class="listitem">${esc(d.name)} • ${esc(d.mobile)}</div>`).join("")}`);
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

/* ---------- EXPORT / IMPORT RATE SHEET ----------
   Lets the owner copy the current device's full rate table as text (e.g. via
   WhatsApp/Notes) and paste it into "Import rate sheet" on any other device
   running this app, so everyone ends up on the same rates without needing a
   fresh code deployment. */
function exportRates(){
 const text=JSON.stringify(db.categories,null,2);
 modal(`<h2>Export Rate Sheet</h2>
  <p class="muted">Copy this text and share it (WhatsApp, Notes, email). On another device, open "Import rate sheet" and paste it there to apply the same rates.</p>
  <textarea id="exportBox" rows="14" readonly>${esc(text)}</textarea>
  <div class="actions"><button class="primary" onclick="copyExport()">Copy</button></div>`);
}
function copyExport(){
 const box=document.querySelector("#exportBox");
 box.focus();box.select();box.setSelectionRange(0,999999);
 if(navigator.clipboard&&navigator.clipboard.writeText){
  navigator.clipboard.writeText(box.value).then(()=>toast("Copied — now paste it into WhatsApp or Notes")).catch(()=>toast("Text selected — use your keyboard's Copy option"));
 }else{
  toast("Text selected — use your keyboard's Copy option");
 }
}
function importRates(){ requireAdmin(openImportModal); }
function openImportModal(){
 modal(`<h2>Import Rate Sheet</h2>
  <p class="muted">Paste a rate sheet exported from another device. This replaces all vehicle categories and rates on THIS device.</p>
  <textarea id="importBox" rows="14" placeholder="Paste the exported rate sheet text here"></textarea>
  <div class="actions"><button class="primary" onclick="applyImport()">Apply</button></div>
  <div id="impErr" class="danger"></div>`);
}
function applyImport(){
 try{
  const parsed=JSON.parse(document.querySelector("#importBox").value);
  if(!Array.isArray(parsed)||!parsed.length||typeof parsed[0].standard!=="object") throw new Error("bad format");
  db.categories=parsed;
  save();
  closeModal();
  master();
  toast("Rate sheet imported successfully");
 }catch(e){
  document.querySelector("#impErr").textContent="Could not read this text — make sure the entire exported text was pasted, unedited.";
 }
}

function addVehicle(){db.vehicles.push({name:vName.value,no:vNo.value,cat:+vCat.value,seats:+vSeats.value||0});save();master();toast("Vehicle added")}
function addDriver(){db.drivers.push({name:dName.value,mobile:dMobile.value,vehicle:+dVehicle.value});save();master();toast("Driver added")}

function accounts(){const income=db.bills.reduce((a,b)=>a+b.amount,0),expense=db.expenses.reduce((a,e)=>a+e.amount,0);app().innerHTML=card("Accounts",`<div class="grid"><div class="metric">Recorded billing<b>${money(income)}</b></div><div class="metric">Expenses<b>${money(expense)}</b></div><div class="metric">Net before other adjustments<b>${money(income-expense)}</b></div></div><p class="muted">This is the foundation. GST, tax reports, driver payments, fuel, toll, parking and profit reports will use the same ledger.</p><div class="grid"><label>Expense category<input id="exCat"></label><label>Description<input id="exDesc"></label><label>Amount<input id="exAmt" type="number"></label></div><button class="primary" onclick="addExpense()">Add expense</button>`)}
function addExpense(){db.expenses.push({category:exCat.value,description:exDesc.value,amount:+exAmt.value||0,created:new Date().toISOString()});save();toast("Expense recorded");accounts()}

function admin(){
 const locked=db.settings.businessProfileLocked;
 app().innerHTML=card("Admin / Business Settings",`
 <div class="card" style="background:${locked?"#f5f5f5":"#f5fbfa"}">
  <h3>Your Travel Business Profile</h3>
  ${locked?`
   <div class="notice">🔒 <b>Locked.</b> The app owner must unlock this section (with the password) before a travel partner's name, contact numbers, or UPI ID can be entered or changed.</div>
   <button onclick="unlockBusinessProfile()">Unlock (password required)</button>
  `:`
   <div class="ok">🔓 <b>Unlocked</b> — this section can currently be edited without a password. Lock it again once the details are set.</div>
   <button onclick="lockBusinessProfile()">Lock now</button>
  `}
  <div class="grid" style="margin-top:8px">
   <label>Travel partner / business name<input id="bName" value="${esc(db.business.name)}" ${locked?"disabled":""}></label>
   <label>Tagline<input id="bTagline" value="${esc(db.business.tagline)}" ${locked?"disabled":""}></label>
   <label>Address<input id="bAddress" value="${esc(db.business.address)}" ${locked?"disabled":""}></label>
   <label>Office location (used to auto-fill "Return point" on new quotations)<input id="bOffice" value="${esc(db.business.officeLocation)}" ${locked?"disabled":""}></label>
   <label>Contact number 1<input id="bPhone" value="${esc(db.business.phone)}" ${locked?"disabled":""}></label>
   <label>Contact number 2<input id="bPhone2" value="${esc(db.business.phone2)}" ${locked?"disabled":""}></label>
   <label>GSTIN (optional)<input id="bGst" value="${esc(db.business.gstin)}" ${locked?"disabled":""}></label>
   <label>UPI ID (for payment QR)<input id="bUpi" value="${esc(db.business.upiId)}" ${locked?"disabled":""}></label>
   <label>UPI name<input id="bUpiName" value="${esc(db.business.upiName)}" ${locked?"disabled":""}></label>
  </div>
  <button class="primary" onclick="saveBusinessProfile()" ${locked?"disabled":""}>Save business profile</button>
 </div>
 <hr>
 <div class="card">
  <h3>Travel Connect Platform Settings <span class="muted">(owner only — always password protected)</span></h3>
  <div class="grid">
   <label>Platform name<input id="pName" value="${esc(db.platform.name)}"></label>
   <label>Platform tagline<input id="pTagline" value="${esc(db.platform.tagline)}"></label>
   <label>Platform address<input id="pAddress" value="${esc(db.platform.address)}"></label>
   <label>Contact number 1<input id="pPhone1" value="${esc(db.platform.phone1)}"></label>
   <label>Contact number 2<input id="pPhone2" value="${esc(db.platform.phone2)}"></label>
   <label>Support email<input id="pEmail" value="${esc(db.platform.email)}"></label>
   <label>Local maximum KM<input id="lKm" type="number" value="${db.settings.localMaxKm}"></label>
   <label>Local maximum hours<input id="lHr" type="number" value="${db.settings.localMaxHours}"></label>
  </div>
  <button class="primary" onclick="saveAdmin()">Save platform settings</button>
 </div>
 <hr><h3>Planned next phase</h3><p>Multi-device sync, driver network alerts, and user access control.</p>`);
}

/* The Business Profile section (partner name/contact/UPI) stays disabled until the owner
   unlocks it with the password — once unlocked, it can be filled in without re-entering the
   password each time, until locked again. Vehicle categories & rates remain separately
   password-gated at all times (via requireAdmin in editCat/addCat), regardless of this toggle. */
function unlockBusinessProfile(){ requireAdmin(()=>{ db.settings.businessProfileLocked=false; save(); toast("Business profile unlocked"); admin(); }); }
function lockBusinessProfile(){ db.settings.businessProfileLocked=true; save(); toast("Business profile locked"); admin(); }

function saveBusinessProfile(){
 if(db.settings.businessProfileLocked){ toast("Unlock this section first (password required)"); return; }
 Object.assign(db.business,{name:bName.value,tagline:bTagline.value,address:bAddress.value,officeLocation:bOffice.value,phone:bPhone.value,phone2:bPhone2.value,gstin:bGst.value,upiId:bUpi.value,upiName:bUpiName.value});
 save();toast("Business profile saved");admin();
}
function saveAdmin(){ requireAdmin(doSaveAdmin); }
function doSaveAdmin(){
 Object.assign(db.platform,{name:pName.value,tagline:pTagline.value,address:pAddress.value,phone1:pPhone1.value,phone2:pPhone2.value,email:pEmail.value});
 db.settings.localMaxKm=+lKm.value||50;db.settings.localMaxHours=+lHr.value||5;
 save();toast("Platform settings saved");admin();
}

function network(){app().innerHTML=card("Travel Connect Network",`<p class="muted">Network foundation: driver request, message, location and SOS. Live multi-user alerts will be connected to the Cloudflare backend in the next backend phase.</p><label>Message<textarea id="nMsg" rows="4" placeholder="Need a vehicle / driver / food / help..."></textarea></label><div class="actions"><button class="primary" onclick="getLocation()">Share current location</button><button onclick="sendNetwork()">Send request</button><button class="danger" onclick="sos()">🆘 SOS</button></div><div id="nStatus"></div>`)}
function getLocation(){if(!navigator.geolocation){nStatus.textContent="GPS not supported";return}navigator.geolocation.getCurrentPosition(p=>{window.tcLoc={lat:p.coords.latitude,lon:p.coords.longitude};nStatus.innerHTML=`<p class="ok">Location captured: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}</p><a target="_blank" href="https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}">Open in Maps</a>`},()=>nStatus.textContent="Location permission denied")}
function sendNetwork(){const p={message:nMsg.value,location:window.tcLoc||null,created:new Date().toISOString()};fetch("/api/network",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)}).catch(()=>{});toast("Network request submitted (not yet delivered to other devices — multi-user sync is a future phase)")}
function sos(){getLocation();setTimeout(()=>{const msg=`TRAVEL CONNECT SOS. I need urgent assistance. Location: ${window.tcLoc?`https://maps.google.com/?q=${window.tcLoc.lat},${window.tcLoc.lon}`:"Please check my live location."}`;navigator.share?.({title:"Travel Connect SOS",text:msg}).catch(()=>{});toast("SOS message prepared")},800)}

function modal(html){modalBody.innerHTML=html;document.querySelector("#modal").classList.remove("hidden")}
function closeModal(){document.querySelector("#modal").classList.add("hidden")}

window.onerror=function(msg){try{toast("Something went wrong: "+msg)}catch(e){}return false};

migrate();
render();
