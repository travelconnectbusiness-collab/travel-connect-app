const KEY="tcp_v1";
const defaults={
 business:{name:"Krishna Tours & Travels",phone:"",gstin:"",upiId:"",upiName:"Krishna Tours & Travels"},
 categories:[
  {name:"Mini / Hatchback",standard:2200,competitive:1900,safety:2050,local:1500,incKm:80,incHours:8,addKm:18,addHour:220},
  {name:"Sedan",standard:2500,competitive:2200,safety:2350,local:1700,incKm:80,incHours:8,addKm:21,addHour:250},
  {name:"Taxi Jeep / Off-road",standard:2800,competitive:2400,safety:2600,local:1900,incKm:80,incHours:8,addKm:22,addHour:250},
  {name:"Standard MUV",standard:3000,competitive:2600,safety:2800,local:2100,incKm:80,incHours:8,addKm:22,addHour:300},
  {name:"Premium MUV",standard:3200,competitive:2800,safety:3000,local:2300,incKm:80,incHours:8,addKm:24,addHour:300},
  {name:"Innova Crysta / Innova Hycross",standard:3800,competitive:3400,safety:3600,local:2800,incKm:80,incHours:8,addKm:26,addHour:350},
  {name:"Compact SUV",standard:3300,competitive:2900,safety:3100,local:2500,incKm:80,incHours:8,addKm:24,addHour:300},
  {name:"Premium SUV",standard:4800,competitive:4300,safety:4550,local:3600,incKm:80,incHours:8,addKm:30,addHour:400}
 ],
 settings:{localMaxKm:50,localMaxHours:5}
};
let db=JSON.parse(localStorage.getItem(KEY)||"null")||{...defaults,vehicles:[],drivers:[],customers:[],enquiries:[],quotes:[],trips:[],bills:[],expenses:[]};
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function toast(s){let e=document.querySelector("#toast");e.textContent=s;e.style.display="block";setTimeout(()=>e.style.display="none",2200)}
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
function dashboard(){
 app().innerHTML=card("Travel Connect Dashboard",`<div class="grid">
 <div class="metric">Customers<b>${db.customers.length}</b></div><div class="metric">Drivers<b>${db.drivers.length}</b></div>
 <div class="metric">Vehicles<b>${db.vehicles.length}</b></div><div class="metric">Saved Quotations<b>${db.quotes.length}</b></div>
 </div><div class="card"><h3>Business workflow</h3><p>Enquiry → Quotation → Confirmation → Trip → Final Bill → Payment → Accounts</p>
 <div class="notice"><b>Local Trip:</b> maximum ${db.settings.localMaxKm} KM AND ${db.settings.localMaxHours} hours. If either limit is exceeded, it is not a Local Trip.</div></div>
 <div class="actions"><button class="primary" onclick="view('enquiries')">New Enquiry</button><button onclick="view('quotations')">New Quotation</button><button onclick="view('master')">Rate Master</button></div>`);
}
function enquiries(){
 app().innerHTML=card("Enquiry Management",`<div class="grid">
 <label>Customer name<input id="enqName"></label><label>Mobile<input id="enqMobile"></label>
 <label>Pickup<input id="enqPickup"></label><label>Destination<input id="enqDest"></label>
 <label>Trip type<select id="enqType"><option>Local Trip</option><option>One Day</option><option>Round Trip</option><option>Outstation</option></select></label>
 <label>Required date<input id="enqDate" type="date"></label></div>
 <div class="actions"><button class="primary" onclick="saveEnquiry()">Save Enquiry</button></div>
 <div id="enqList">${db.enquiries.map(e=>`<div class="listitem"><b>${esc(e.name)}</b> • ${esc(e.mobile)}<br>${esc(e.pickup)} → ${esc(e.dest)}<br><span class="muted">${esc(e.type)} • ${esc(e.date)}</span></div>`).join("")||"<p class='muted'>No enquiries.</p>"}</div>`);
}
function saveEnquiry(){db.enquiries.unshift({id:crypto.randomUUID(),name:enqName.value,mobile:enqMobile.value,pickup:enqPickup.value,dest:enqDest.value,type:enqType.value,date:enqDate.value,status:"new",created:new Date().toISOString()});save();toast("Enquiry saved");enquiries()}
function quoteForm(){
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
 return `<div class="grid">
 <label>Customer name<input id="qName"></label><label>Customer mobile<input id="qMobile"></label>
 <label>Trip type<select id="qType"><option value="local">Local Trip</option><option value="one_day">One Day</option><option value="round">Round Trip</option><option value="outstation">Outstation</option></select></label>
 <label>Vehicle category<select id="qCat">${cat}</select></label>
 <label>Vehicle<input id="qVehicle"></label><label>Vehicle number<input id="qVehicleNo"></label>
 <label>Pickup<input id="qPickup"></label><label>Destination<input id="qDest"></label>
 <label>Return / closing point<input id="qReturn"></label><label>Estimated KM<input id="qKm" type="number" value="80"></label>
 <label>Estimated hours<input id="qHours" type="number" value="8"></label><label>Start date<input id="qStart" type="date"></label>
 <label>Start time<input id="qStartTime" type="time"></label><label>Closing date<input id="qClose" type="date"></label>
 <label>Closing time<input id="qCloseTime" type="time"></label>
 <label>Rate<select id="qRate"><option value="standard">Standard Rate</option><option value="competitive" selected>Competitive Rate</option><option value="safety">Minimum Safety Rate</option><option value="local">Local Rate</option><option value="custom">Custom</option></select></label>
 <label>Custom amount<input id="qCustom" type="number"></label></div>
 <div class="actions"><button class="primary" onclick="calcQuote()">Calculate</button><button onclick="saveQuote()">Save Quotation</button></div><div id="qCalc" class="ratebox"></div>`;
}
function calcFare(c,plan,km,h){
 if(plan==="local"){
  if(km>db.settings.localMaxKm||h>db.settings.localMaxHours)return {invalid:true,reason:`Local limit exceeded: maximum ${db.settings.localMaxKm} KM and ${db.settings.localMaxHours} hours.`};
  return {base:c.local,extra:0,total:c.local,kmExtra:0,hourExtra:0};
 }
 const base=plan==="custom"?Number(qCustom.value||0):c[plan];
 const kmExtra=Math.max(0,km-c.incKm)*c.addKm;
 const hourExtra=Math.max(0,h-c.incHours)*c.addHour;
 const extra=Math.max(kmExtra,hourExtra);
 return {base,extra,kmExtra,hourExtra,total:base+extra};
}
function calcQuote(){
 const c=db.categories[+qCat.value],r=calcFare(c,qRate.value,+qKm.value||0,+qHours.value||0);
 qCalc.innerHTML=r.invalid?`<div class="danger"><b>${esc(r.reason)}</b><br>Select another trip type/rate.</div>`:
 `<div>Base: <b>${money(r.base)}</b></div><div>Extra KM: ${money(r.kmExtra||0)}</div><div>Extra Hour: ${money(r.hourExtra||0)}</div><div>Applicable extra (higher): <b>${money(r.extra||0)}</b></div><div class="total">Estimated fare: ${money(r.total)}</div>`;
 return r;
}
function saveQuote(){
 const r=calcQuote();if(r.invalid){toast("Correct Local Trip limits first");return}
 const c=db.categories[+qCat.value];const q={id:crypto.randomUUID(),no:"QTN-"+Date.now(),customer:qName.value,mobile:qMobile.value,type:qType.value,category:c.name,categoryId:+qCat.value,vehicle:qVehicle.value,vehicleNo:qVehicleNo.value,pickup:qPickup.value,destination:qDest.value,returnPoint:qReturn.value,estimatedKm:+qKm.value||0,estimatedHours:+qHours.value||0,startDate:qStart.value,startTime:qStartTime.value,closeDate:qClose.value,closeTime:qCloseTime.value,ratePlan:qRate.value,baseRate:r.base,kmRate:c.addKm,hourRate:c.addHour,includedKm:c.incKm,includedHours:c.incHours,quotedAmount:r.total,created:new Date().toISOString(),status:"quoted"};
 db.quotes.unshift(q);save();toast("Quotation saved: "+q.no);quotations();
}
function quotations(){
 app().innerHTML=card("Quotations",`${quoteForm()}<hr><h3>Saved Quotations</h3>${db.quotes.map(q=>`<div class="listitem"><b>${esc(q.no)}</b> — ${esc(q.customer)} — ${money(q.quotedAmount)}<br>${esc(q.pickup)} → ${esc(q.destination)}<div class="actions"><button onclick="openQuote('${q.id}')">Open / Edit</button><button onclick="convertTrip('${q.id}')">Confirm & Create Trip</button></div></div>`).join("")||"<p class='muted'>No quotations saved.</p>"}`);
}
function openQuote(id){const q=db.quotes.find(x=>x.id===id);if(!q)return;view("quotations");setTimeout(()=>{qName.value=q.customer;qMobile.value=q.mobile;qType.value=q.type;qCat.value=q.categoryId;qVehicle.value=q.vehicle;qVehicleNo.value=q.vehicleNo;qPickup.value=q.pickup;qDest.value=q.destination;qReturn.value=q.returnPoint;qKm.value=q.estimatedKm;qHours.value=q.estimatedHours;qStart.value=q.startDate;qStartTime.value=q.startTime;qClose.value=q.closeDate;qCloseTime.value=q.closeTime;qRate.value=q.ratePlan;qCustom.value=q.quotedAmount;calcQuote()},0)}
function convertTrip(id){const q=db.quotes.find(x=>x.id===id);db.trips.unshift({id:crypto.randomUUID(),quoteId:id,customer:q.customer,status:"confirmed",actualKm:0,actualHours:0,created:new Date().toISOString()});q.status="confirmed";save();toast("Trip confirmed");trips()}
function trips(){
 app().innerHTML=card("Trip Management",`${db.trips.map(t=>{const q=db.quotes.find(x=>x.id===t.quoteId)||{};return `<div class="listitem"><b>${esc(q.no||"Trip")}</b> — ${esc(t.customer)}<br>Status: <b>${esc(t.status)}</b><div class="actions"><button onclick="editTrip('${t.id}')">Open Trip</button><button onclick="makeBillFromTrip('${t.id}')">Final Bill</button></div></div>`}).join("")||"<p class='muted'>Confirm a quotation to create a trip.</p>"}`);
}
function editTrip(id){const t=db.trips.find(x=>x.id===id);const q=db.quotes.find(x=>x.id===t.quoteId);modal(`<h2>Actual Trip Details</h2><div class="grid"><label>Actual start date<input id="aStart" type="date" value="${t.startDate||q.startDate||""}"></label><label>Actual start time<input id="aTime" type="time" value="${t.startTime||q.startTime||""}"></label><label>Actual closing date<input id="aClose" type="date" value="${t.closeDate||q.closeDate||""}"></label><label>Actual closing time<input id="aCloseTime" type="time"></label><label>Actual start point<input id="aPickup" value="${esc(t.pickup||q.pickup)}"></label><label>Actual destinations<input id="aDest" value="${esc(t.dest||q.destination)}"></label><label>Actual closing point<input id="aReturn" value="${esc(t.returnPoint||q.returnPoint)}"></label><label>Actual KM<input id="aKm" type="number" value="${t.actualKm||0}"></label><label>Actual Hours<input id="aHours" type="number" value="${t.actualHours||0}"></label></div><button class="primary" onclick="saveTrip('${id}')">Save Actual Trip</button>`)}
function saveTrip(id){const t=db.trips.find(x=>x.id===id);Object.assign(t,{startDate:aStart.value,startTime:aTime.value,closeDate:aClose.value,closeTime:aCloseTime.value,pickup:aPickup.value,dest:aDest.value,returnPoint:aReturn.value,actualKm:+aKm.value||0,actualHours:+aHours.value||0,status:"completed"});save();closeModal();toast("Trip updated")}
function makeBillFromTrip(id){view("billing");setTimeout(()=>{billTrip.value=id;loadBill()},0)}
function billing(){
 app().innerHTML=card("Final Billing",`<label>Trip<select id="billTrip">${db.trips.map(t=>`<option value="${t.id}">${esc(t.customer)} — ${esc(t.id.slice(0,8))}</option>`).join("")}</select></label><div class="actions"><button class="primary" onclick="loadBill()">Calculate Final Bill</button></div><div id="billBox"></div>`);
}
function loadBill(){
 const t=db.trips.find(x=>x.id===billTrip.value);if(!t)return;const q=db.quotes.find(x=>x.id===t.quoteId),c=db.categories[q.categoryId];
 const km=t.actualKm||q.estimatedKm,h=t.actualHours||q.estimatedHours,r=calcFare(c,q.ratePlan,km,h);
 const base=r.invalid?q.quotedAmount:r.base,extra=r.invalid?0:r.extra,final=base+extra;
 billBox.innerHTML=`<div class="ratebox"><div>Standard rate: ${money(c.standard)}</div><div>Selected rate: ${money(base)}</div><div>Included: ${c.incKm} KM / ${c.incHours} hours</div><div>Additional KM: ${money(c.addKm)}/KM</div><div>Additional Hour: ${money(c.addHour)}/hour</div><div>Applicable extra: ${money(extra)}</div><div class="total">FINAL BILL: ${money(final)}</div><div class="actions"><button onclick="settle('${t.id}',${final},'paid')">Paid & Settled</button><button onclick="settle('${t.id}',${final},'balance')">Customer Balance</button><button onclick="settle('${t.id}',${final},'discount')">Discount Given</button><button onclick="settle('${t.id}',${final},'discount_settled')">Discount & Settled</button></div></div>`;
}
function settle(id,amount,type){const t=db.trips.find(x=>x.id===id);t.payment={amount,type,at:new Date().toISOString()};db.bills.unshift({id:crypto.randomUUID(),tripId:id,amount,settlement:type,created:new Date().toISOString()});save();toast(type==="paid"||type==="discount_settled"?"Bill settled":"Settlement recorded")}
function master(){
 const rows=db.categories.map((c,i)=>`<tr><td>${esc(c.name)}</td><td>${money(c.standard)}</td><td>${money(c.competitive)}</td><td>${money(c.safety)}</td><td>${money(c.local)}</td><td>${c.incKm}/${c.incHours}</td><td>${money(c.addKm)}</td><td>${money(c.addHour)}</td><td><button onclick="editCat(${i})">Edit</button></td></tr>`).join("");
 app().innerHTML=card("Vehicle Categories & Rate Master",`<p class="muted">Owner-editable. Local Rate is shown directly below Minimum Safety Rate.</p><div class="tablewrap"><table class="table"><thead><tr><th>Category</th><th>Standard</th><th>Competitive</th><th>Minimum Safety</th><th>Local Rate</th><th>Included KM/Hr</th><th>Extra KM</th><th>Extra Hr</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="actions"><button class="primary" onclick="addCat()">+ Add vehicle category</button></div><hr><h3>Vehicles</h3><div class="grid"><label>Vehicle name<input id="vName"></label><label>Vehicle number<input id="vNo"></label><label>Category<select id="vCat">${db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("")}</select></label><label>Seats<input id="vSeats" type="number"></label></div><button class="primary" onclick="addVehicle()">Add Vehicle</button>${db.vehicles.map((v,i)=>`<div class="listitem">${esc(v.name)} • ${esc(v.no)} • ${esc(db.categories[v.cat]?.name||"")} • ${v.seats||""} seats</div>`).join("")}<hr><h3>Drivers</h3><div class="grid"><label>Name<input id="dName"></label><label>Mobile<input id="dMobile"></label><label>Vehicle<select id="dVehicle"><option value="">None</option>${db.vehicles.map((v,i)=>`<option value="${i}">${esc(v.name)} ${esc(v.no)}</option>`).join("")}</select></label></div><button class="primary" onclick="addDriver()">Add Driver</button>${db.drivers.map(d=>`<div class="listitem">${esc(d.name)} • ${esc(d.mobile)}</div>`).join("")}`);
}
function editCat(i){const c=db.categories[i];modal(`<h2>Edit Rate: ${esc(c.name)}</h2><div class="grid">${["name","standard","competitive","safety","local","incKm","incHours","addKm","addHour"].map(k=>`<label>${k}<input id="ec_${k}" value="${esc(c[k])}" type="${k==="name"?"text":"number"}"></label>`).join("")}</div><button class="primary" onclick="saveCat(${i})">Save Rate</button>`)}
function saveCat(i){const c=db.categories[i];["name","standard","competitive","safety","local","incKm","incHours","addKm","addHour"].forEach(k=>c[k]=k==="name"?document.querySelector("#ec_"+k).value:+document.querySelector("#ec_"+k).value);save();closeModal();master();toast("Rate updated")}
function addCat(){modal(`<h2>New Vehicle Category</h2><div class="grid">${["name","standard","competitive","safety","local","incKm","incHours","addKm","addHour"].map(k=>`<label>${k}<input id="nc_${k}" type="${k==="name"?"text":"number"}></label>`).join("")}</div><button class="primary" onclick="saveNewCat()">Add Category</button>`)}
function saveNewCat(){let c={};["name","standard","competitive","safety","local","incKm","incHours","addKm","addHour"].forEach(k=>c[k]=k==="name"?document.querySelector("#nc_"+k).value:+document.querySelector("#nc_"+k).value);db.categories.push(c);save();closeModal();master()}
function addVehicle(){db.vehicles.push({name:vName.value,no:vNo.value,cat:+vCat.value,seats:+vSeats.value||0});save();master();toast("Vehicle added")}
function addDriver(){db.drivers.push({name:dName.value,mobile:dMobile.value,vehicle:+dVehicle.value});save();master();toast("Driver added")}
function accounts(){const income=db.bills.reduce((a,b)=>a+b.amount,0),expense=db.expenses.reduce((a,e)=>a+e.amount,0);app().innerHTML=card("Accounts",`<div class="grid"><div class="metric">Recorded billing<b>${money(income)}</b></div><div class="metric">Expenses<b>${money(expense)}</b></div><div class="metric">Net before other adjustments<b>${money(income-expense)}</b></div></div><p class="muted">This is the foundation. GST, tax reports, driver payments, fuel, toll, parking and profit reports will use the same ledger.</p><div class="grid"><label>Expense category<input id="exCat"></label><label>Description<input id="exDesc"></label><label>Amount<input id="exAmt" type="number"></label></div><button class="primary" onclick="addExpense()">Add expense</button>`)}
function addExpense(){db.expenses.push({category:exCat.value,description:exDesc.value,amount:+exAmt.value||0,created:new Date().toISOString()});save();toast("Expense recorded");accounts()}
function admin(){app().innerHTML=card("Admin / Business Settings",`<div class="grid"><label>Business name<input id="bName" value="${esc(db.business.name)}"></label><label>Business phone<input id="bPhone" value="${esc(db.business.phone)}"></label><label>GSTIN (optional)<input id="bGst" value="${esc(db.business.gstin)}"></label><label>UPI ID<input id="bUpi" value="${esc(db.business.upiId)}"></label><label>UPI name<input id="bUpiName" value="${esc(db.business.upiName)}"></label><label>Local maximum KM<input id="lKm" type="number" value="${db.settings.localMaxKm}"></label><label>Local maximum hours<input id="lHr" type="number" value="${db.settings.localMaxHours}"></label></div><button class="primary" onclick="saveAdmin()">Save settings</button><hr><h3>Future-ready modules</h3><p>GST / tax integration • subscription • commission • flight • train • hotel • visa • partner network • push notifications • cloud backup • Play Store packaging.</p>`)}
function saveAdmin(){Object.assign(db.business,{name:bName.value,phone:bPhone.value,gstin:bGst.value,upiId:bUpi.value,upiName:bUpiName.value});db.settings.localMaxKm=+lKm.value||50;db.settings.localMaxHours=+lHr.value||5;save();toast("Settings saved")}
function network(){app().innerHTML=card("Travel Connect Network — S",`<p class="muted">Network foundation: driver request, message, location and SOS. Live multi-user alerts will be connected to the Cloudflare backend in the next backend phase.</p><label>Message<textarea id="nMsg" rows="4" placeholder="Need a vehicle / driver / food / help..."></textarea></label><div class="actions"><button class="primary" onclick="getLocation()">Share current location</button><button onclick="sendNetwork()">Send request</button><button class="danger" onclick="sos()">🆘 SOS</button></div><div id="nStatus"></div>`)}
function getLocation(){if(!navigator.geolocation){nStatus.textContent="GPS not supported";return}navigator.geolocation.getCurrentPosition(p=>{window.tcLoc={lat:p.coords.latitude,lon:p.coords.longitude};nStatus.innerHTML=`<p class="ok">Location captured: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}</p><a target="_blank" href="https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}">Open in Maps</a>`},()=>nStatus.textContent="Location permission denied")}
function sendNetwork(){const p={message:nMsg.value,location:window.tcLoc||null,created:new Date().toISOString()};fetch("/api/network",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)}).catch(()=>{});toast("Network request submitted")}
function sos(){getLocation();setTimeout(()=>{const msg=`TRAVEL CONNECT SOS. I need urgent assistance. Location: ${window.tcLoc?`https://maps.google.com/?q=${window.tcLoc.lat},${window.tcLoc.lon}`:"Please check my live location."}`;navigator.share?.({title:"Travel Connect SOS",text:msg}).catch(()=>{});toast("SOS message prepared")},800)}
function modal(html){modalBody.innerHTML=html;document.querySelector("#modal").classList.remove("hidden")}
function closeModal(){document.querySelector("#modal").classList.add("hidden")}
render();
