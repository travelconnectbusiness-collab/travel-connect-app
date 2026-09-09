const KEY="tcp_v1";

/* ---------- DEFAULT DATA ---------- */
function rateBlock(rate,incKm,incHours,addKm,addHour){
 return {rate:+rate,incKm:+incKm,incHours:+incHours,addKm:+addKm,addHour:+addHour};
}

const defaults={
 platform:{name:"Travel Connect",tagline:"Travel & Trip Management Platform",address:"",phone1:"",phone2:"",email:"travelconnect.business@gmail.com"},
 business:{name:"Krishna Tours & Travels",tagline:"Your Best Travel Partner",address:"",officeLocation:"",phone:"",phone2:"",gstin:"",upiId:"",upiName:"Krishna Tours & Travels"},
 categories:[
  {name:"Mini / Hatchback",driverBata:0,
   standard:rateBlock(2200,80,8,18,220), competitive:rateBlock(1900,80,8,18,220),
   safety:rateBlock(2050,80,8,18,220),   local:rateBlock(1500,10,1,20,220),
   drop:rateBlock(1500,10,1,20,220)},
  {name:"Sedan",driverBata:0,
   standard:rateBlock(2500,80,8,21,250), competitive:rateBlock(2200,80,8,21,250),
   safety:rateBlock(2350,80,8,21,250),   local:rateBlock(1700,10,1,21,250),
   drop:rateBlock(1700,10,1,21,250)},
  {name:"Taxi Jeep / Off-road",driverBata:0,
   standard:rateBlock(2800,80,8,22,250), competitive:rateBlock(2400,80,8,22,250),
   safety:rateBlock(2600,80,8,22,250),   local:rateBlock(1900,10,1,22,250),
   drop:rateBlock(1900,10,1,22,250)},
  {name:"Standard MUV",driverBata:0,
   standard:rateBlock(3000,80,8,22,300), competitive:rateBlock(2600,80,8,22,300),
   safety:rateBlock(2800,80,8,22,300),   local:rateBlock(2100,10,1,22,300),
   drop:rateBlock(2100,10,1,22,300)},
  {name:"Premium MUV",driverBata:0,
   standard:rateBlock(3200,80,8,24,300), competitive:rateBlock(2800,80,8,24,300),
   safety:rateBlock(3000,80,8,24,300),   local:rateBlock(2300,10,1,24,300),
   drop:rateBlock(2300,10,1,24,300)},
  {name:"Compact SUV",driverBata:0,
   standard:rateBlock(3300,80,8,24,300), competitive:rateBlock(2900,80,8,24,300),
   safety:rateBlock(3100,80,8,24,300),   local:rateBlock(2500,10,1,24,300),
   drop:rateBlock(2500,10,1,24,300)},
  {name:"Premium SUV",driverBata:0,
   standard:rateBlock(4800,80,8,30,400), competitive:rateBlock(4300,80,8,30,400),
   safety:rateBlock(4550,80,8,30,400),   local:rateBlock(3600,10,1,30,400),
   drop:rateBlock(3600,10,1,30,400)},
  {name:"49 Seat A/C",driverBata:500,
   standard:rateBlock(14000,80,8,60,780), competitive:rateBlock(12600,80,8,60,780),
   safety:rateBlock(13300,80,8,60,780),   drop:rateBlock(7700,10,1,60,780),
   local:rateBlock(7700,10,1,60,780)},
  {name:"49 Seat Non A/C",driverBata:500,
   standard:rateBlock(10500,80,8,50,650), competitive:rateBlock(9450,80,8,50,650),
   safety:rateBlock(9980,80,8,50,650),   drop:rateBlock(5780,10,1,50,650),
   local:rateBlock(5780,10,1,50,650)},
  {name:"45 Seat Bharat Benz (F A/C)",driverBata:500,
   standard:rateBlock(16500,80,8,70,910), competitive:rateBlock(14850,80,8,70,910),
   safety:rateBlock(15680,80,8,70,910),   drop:rateBlock(9080,10,1,70,910),
   local:rateBlock(9080,10,1,70,910)},
  {name:"35 Seat Bharat Benz",driverBata:500,
   standard:rateBlock(12500,80,8,50,650), competitive:rateBlock(11250,80,8,50,650),
   safety:rateBlock(11880,80,8,50,650),   drop:rateBlock(6880,10,1,50,650),
   local:rateBlock(6880,10,1,50,650)},
  {name:"34 Seat A/C",driverBata:500,
   standard:rateBlock(12000,80,8,50,650), competitive:rateBlock(10800,80,8,50,650),
   safety:rateBlock(11400,80,8,50,650),   drop:rateBlock(6600,10,1,50,650),
   local:rateBlock(6600,10,1,50,650)},
  {name:"34 Seat Non A/C",driverBata:500,
   standard:rateBlock(9000,80,8,40,520), competitive:rateBlock(8100,80,8,40,520),
   safety:rateBlock(8550,80,8,40,520),   drop:rateBlock(4950,10,1,40,520),
   local:rateBlock(4950,10,1,40,520)},
  {name:"27 Seat A/C",driverBata:500,
   standard:rateBlock(9500,80,8,40,520), competitive:rateBlock(8550,80,8,40,520),
   safety:rateBlock(9020,80,8,40,520),   drop:rateBlock(5220,10,1,40,520),
   local:rateBlock(5220,10,1,40,520)},
  {name:"27 Seat Non A/C",driverBata:500,
   standard:rateBlock(8000,80,8,35,460), competitive:rateBlock(7200,80,8,35,460),
   safety:rateBlock(7600,80,8,35,460),   drop:rateBlock(4400,10,1,35,460),
   local:rateBlock(4400,10,1,35,460)},
  {name:"26 Seat A/C",driverBata:300,
   standard:rateBlock(8500,80,8,40,520), competitive:rateBlock(7650,80,8,40,520),
   safety:rateBlock(8080,80,8,40,520),   drop:rateBlock(4680,10,1,40,520),
   local:rateBlock(4680,10,1,40,520)},
  {name:"26 Seat Non A/C",driverBata:300,
   standard:rateBlock(7500,80,8,35,460), competitive:rateBlock(6750,80,8,35,460),
   safety:rateBlock(7120,80,8,35,460),   drop:rateBlock(4120,10,1,35,460),
   local:rateBlock(4120,10,1,35,460)},
  {name:"24 Seat A/C",driverBata:300,
   standard:rateBlock(8500,80,8,40,520), competitive:rateBlock(7650,80,8,40,520),
   safety:rateBlock(8080,80,8,40,520),   drop:rateBlock(4680,10,1,40,520),
   local:rateBlock(4680,10,1,40,520)},
  {name:"24 Seat Non A/C",driverBata:300,
   standard:rateBlock(7500,80,8,35,460), competitive:rateBlock(6750,80,8,35,460),
   safety:rateBlock(7120,80,8,35,460),   drop:rateBlock(4120,10,1,35,460),
   local:rateBlock(4120,10,1,35,460)},
  {name:"20 Seat A/C",driverBata:300,
   standard:rateBlock(7000,80,8,35,460), competitive:rateBlock(6300,80,8,35,460),
   safety:rateBlock(6650,80,8,35,460),   drop:rateBlock(3850,10,1,35,460),
   local:rateBlock(3850,10,1,35,460)},
  {name:"20 Seat Non A/C",driverBata:300,
   standard:rateBlock(6000,80,8,30,390), competitive:rateBlock(5400,80,8,30,390),
   safety:rateBlock(5700,80,8,30,390),   drop:rateBlock(3300,10,1,30,390),
   local:rateBlock(3300,10,1,30,390)},
  {name:"17 Seat Urbania",driverBata:300,
   standard:rateBlock(8000,80,8,40,520), competitive:rateBlock(7200,80,8,40,520),
   safety:rateBlock(7600,80,8,40,520),   drop:rateBlock(4400,10,1,40,520),
   local:rateBlock(4400,10,1,40,520)},
  {name:"14 Seat Urbania",driverBata:300,
   standard:rateBlock(7500,80,8,35,460), competitive:rateBlock(6750,80,8,35,460),
   safety:rateBlock(7120,80,8,35,460),   drop:rateBlock(4120,10,1,35,460),
   local:rateBlock(4120,10,1,35,460)},
  {name:"17 Seat A/C",driverBata:300,
   standard:rateBlock(6500,80,8,30,390), competitive:rateBlock(5850,80,8,30,390),
   safety:rateBlock(6180,80,8,30,390),   drop:rateBlock(3580,10,1,30,390),
   local:rateBlock(3580,10,1,30,390)},
  {name:"17 Seat Non A/C",driverBata:300,
   standard:rateBlock(5500,80,8,27,350), competitive:rateBlock(4950,80,8,27,350),
   safety:rateBlock(5220,80,8,27,350),   drop:rateBlock(3030,10,1,27,350),
   local:rateBlock(3030,10,1,27,350)},
  {name:"12 & 14 Seat A/C",driverBata:300,
   standard:rateBlock(6000,80,8,27,350), competitive:rateBlock(5400,80,8,27,350),
   safety:rateBlock(5700,80,8,27,350),   drop:rateBlock(3300,10,1,27,350),
   local:rateBlock(3300,10,1,27,350)},
  {name:"12 & 14 Seat Non A/C",driverBata:300,
   standard:rateBlock(5000,80,8,25,320), competitive:rateBlock(4500,80,8,25,320),
   safety:rateBlock(4750,80,8,25,320),   drop:rateBlock(2750,10,1,25,320),
   local:rateBlock(2750,10,1,25,320)},
  {name:"Innova / Crysta",driverBata:300,
   standard:rateBlock(3500,80,8,25,320), competitive:rateBlock(3150,80,8,25,320),
   safety:rateBlock(3320,80,8,25,320),   drop:rateBlock(1930,10,1,25,320),
   local:rateBlock(1930,10,1,25,320)}
 ],
 settings:{localMaxKm:50,localMaxHours:5,businessProfileLocked:true,
  visibleRates:{standard:true,competitive:true,safety:true,drop:true,local:true,custom:true}}
};

let db=JSON.parse(localStorage.getItem(KEY)||"null")||{...defaults,vehicles:[],drivers:[],customers:[],enquiries:[],quotes:[],trips:[],bills:[],expenses:[]};

/* ---------- MIGRATION ---------- */
function migrate(){
 let changed=false;
 (db.categories||[]).forEach(c=>{
  if(c.local&&!c.drop){
   c.drop=rateBlock(c.local.rate,c.local.incKm,c.local.incHours,c.local.addKm,c.local.addHour);
   changed=true;
  }
  if(c.driverBata===undefined){ c.driverBata=0; changed=true; }
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
 if(!db.settings.visibleRates){db.settings.visibleRates={standard:true,competitive:true,safety:true,drop:true,local:true,custom:true};changed=true;}
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

function getCurrentUser(){
 try{ return JSON.parse(localStorage.getItem("tc_user")||"null"); }catch(e){ return null; }
}

/* A random ID generated once per browser/device and kept in localStorage. Sent along
   with every login so that blocking a mobile number can also block this specific
   device — closing the loophole where a blocked person just re-registers with a new
   name/mobile from the same phone. Clearing browser data resets this, but that is not
   something an ordinary user does by accident. */
function getDeviceToken(){
 let t=localStorage.getItem("tc_device_token");
 if(!t){ t=crypto.randomUUID(); localStorage.setItem("tc_device_token",t); }
 return t;
}

/* Every device using this app link must "log in" with a name and mobile number before
   seeing anything else. This is NOT SMS-verified (no OTP) — it's a self-declared identity
   check, recorded centrally in D1, so misuse can be traced back to a name/mobile and that
   number can be blocked. render() enforces this on every navigation, not just on load. */
function renderLogin(){
 const inviteToken=new URLSearchParams(location.search).get("invite")||"";
 document.querySelector("#app").innerHTML=`<section class="container"><div class="card">
  <h2>Welcome to Travel Connect</h2>
  <p class="muted">Please enter your name and mobile number to continue.</p>
  <div class="grid">
   <label>Your name<input id="loginName"></label>
   <label>Mobile number<input id="loginMobile" type="tel"></label>
  </div>
  <div id="loginError" class="danger"></div>
  <button class="primary" onclick="submitLogin('${inviteToken}')">Continue</button>
 </div></section>`;
}

async function submitLogin(inviteToken){
 const name=document.querySelector("#loginName").value.trim();
 const mobile=document.querySelector("#loginMobile").value.trim();
 const errBox=document.querySelector("#loginError");
 if(!name||!mobile){ errBox.textContent="Enter your name and mobile number."; return; }
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"login",name,mobile,invite_token:inviteToken||undefined,device_token:getDeviceToken()})});
  const data=await res.json();
  if(!data.ok){
   errBox.textContent=data.error==="blocked"?"Access has been blocked for this number. Contact the app owner.":"Login failed. Please try again.";
   return;
  }
  localStorage.setItem("tc_user",JSON.stringify({name,mobile}));
  await syncConfigFromServer();
  location.hash="dashboard";
  render();
 }catch(e){
  errBox.textContent="Network error — check your connection and try again.";
 }
}

function logout(){
 if(!confirm("Log out of Travel Connect on this device?")) return;
 localStorage.removeItem("tc_user");
 location.hash="";
 renderLogin();
}

/* Pulls the shared rates/platform config (set by the owner) and applies it locally,
   so a rate change made on one device shows up here too. Silently does nothing if
   offline or the backend isn't reachable — the app still works from local data. */
async function syncConfigFromServer(){
 try{
  const res=await fetch("/api/config");
  const data=await res.json();
  if(data.ok&&data.config){
   if(data.config.categories) db.categories=data.config.categories;
   if(data.config.platform) db.platform=data.config.platform;
   if(data.config.settings) Object.assign(db.settings,data.config.settings);
   save();
  }
 }catch(e){}
}
/* Pushes the current rates/platform config to the server so every other device picks
   it up. Called right after the owner saves rates or platform settings. Uses the admin
   session token (not the password) — see requireAdmin()/adminToken(). */
async function pushConfigToServer(){
 try{
  await fetch("/api/config",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:adminToken(),config:{categories:db.categories,platform:db.platform,settings:db.settings}})});
 }catch(e){}
}

/* Silently checks with the server on every page view whether this mobile number has
   been blocked meanwhile — if so, logs the device out immediately instead of waiting
   for the person to log in again. */
async function checkStillAllowed(){
 const user=getCurrentUser();
 if(!user) return;
 try{
  const res=await fetch("/api/auth?action=check&mobile="+encodeURIComponent(user.mobile)+"&device="+encodeURIComponent(getDeviceToken()));
  const data=await res.json();
  if(data.ok && data.blocked){
   localStorage.removeItem("tc_user");
   toast("Your access has been blocked. Please contact the app owner.");
   renderLogin();
  }
 }catch(e){}
}

function render(){
 if(!getCurrentUser()){ renderLogin(); return; }
 checkStillAllowed();
 startSosPolling();
 const v=location.hash.slice(1)||"dashboard";
 if(v==="dashboard") dashboard();
 else if(v==="enquiries") enquiries();
 else if(v==="quotations") quotations();
 else if(v==="trips") trips();
 else if(v==="billing") billing();
 else if(v==="master") master();
 else if(v==="accounts") accounts();
 else if(v==="admin") requireAdmin(admin);
 else if(v==="partner") partnerView();
 else if(v==="activeboard") activeBoard();
 else network();
}
/* Makes the phone's/browser's own Back button work correctly inside the app too. */
window.addEventListener("hashchange",render);

/* ---------- ADMIN AUTHENTICATION ----------
   The password itself is now a Cloudflare Secret and never sent to or stored in the
   browser. Entering it correctly gets a short-lived session token from the server
   (12 hours), which is what's actually stored (in sessionStorage) and sent along with
   every subsequent admin action. Opening the Admin tab itself now requires this too —
   not just individual actions inside it. */
function adminToken(){ return sessionStorage.getItem("tc_admin_token")||""; }

function requireAdmin(action){
 if(adminToken()){ action(); return; }
 window._pendingAdminAction=action;
 modal(`<h2>Admin Password Required</h2>
  <p class="muted">Enter the admin password to continue.</p>
  <input id="apPass" type="password" placeholder="Password" onkeydown="if(event.key==='Enter')verifyAdmin()">
  <div class="actions"><button class="primary" onclick="verifyAdmin()">Unlock</button></div>
  <div id="apErr" class="danger"></div>`);
}
async function verifyAdmin(){
 const pass=document.querySelector("#apPass").value;
 const errBox=document.querySelector("#apErr");
 errBox.textContent="";
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"admin_login",password:pass})});
  const data=await res.json();
  if(!data.ok){ errBox.textContent="Incorrect password."; return; }
  sessionStorage.setItem("tc_admin_token",data.token);
  closeModal();
  const action=window._pendingAdminAction; window._pendingAdminAction=null;
  if(action) action(); else render();
 }catch(e){
  errBox.textContent="Network error — check your connection and try again.";
 }
}

function dashboard(){
 app().innerHTML=card("Travel Connect Dashboard",`<div class="grid">
 <div class="metric">Customers<b>${db.customers.length}</b></div><div class="metric">Drivers<b>${db.drivers.length}</b></div>
 <div class="metric">Vehicles<b>${db.vehicles.length}</b></div><div class="metric">Saved Quotations<b>${db.quotes.length}</b></div>
 </div><div class="card"><h3>Business workflow</h3><p>Enquiry → Quotation → Confirmation → Trip → Final Bill → Payment → Accounts</p>
 <div class="notice"><b>Local Trip:</b> maximum ${db.settings.localMaxKm} KM AND ${db.settings.localMaxHours} hours. If either limit is exceeded, it automatically switches to a One Day tariff.</div></div>
 <div class="actions"><button class="primary" onclick="view('enquiries')">New Enquiry</button><button onclick="view('quotations')">New Quotation</button><button onclick="view('master')">Rate Master</button></div>
 <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Travel Partner / Vehicles</button><button onclick="view('activeboard')">Active Vehicles Board</button></div>
 <div class="actions" style="margin-top:10px"><button onclick="logout()">Log out of this device</button></div>`);
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
 </div>
 <div class="actions"><button class="primary" onclick="calcQuote()">Calculate</button><button onclick="saveQuote()">Save Quotation</button></div><div id="qCalc" class="ratebox"></div>`;
}

/* Only rate types the owner has switched ON appear here — this is what travel
   partners/customers can actually see and pick when creating a quotation. */
function rateOptions(){
 const labels={standard:"Standard Rate",competitive:"Competitive Rate",safety:"Minimum Safety Rate",drop:"Drop Rate",local:"Local Rate",custom:"Custom / Manual Amount"};
 const v=db.settings.visibleRates||{};
 let opts=Object.keys(labels).filter(k=>v[k]!==false).map(k=>`<option value="${k}"${k==="competitive"?" selected":""}>${labels[k]}</option>`).join("");
 if(!opts) opts=`<option value="custom">Custom / Manual Amount</option>`;
 return opts;
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
/* Estimated Hours is never auto-derived from Start/Closing time by default (they can
   differ from what actually gets billed) — this button lets the user fill it in from the
   dates/times on demand, instead of leaving the "8" default unnoticed. */
function calcHoursFromTimes(){
 if(!qStart.value||!qStartTime.value||!qClose.value||!qCloseTime.value){
  toast("Fill in start date/time and closing date/time first");return;
 }
 const startDt=new Date(qStart.value+"T"+qStartTime.value);
 const closeDt=new Date(qClose.value+"T"+qCloseTime.value);
 const diffHours=(closeDt-startDt)/3600000;
 if(isNaN(diffHours)||diffHours<=0){toast("Closing time must be after start time");return;}
 qHours.value=Math.round(diffHours*100)/100;
 toast("Estimated hours set to "+qHours.value);
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
  qRate.value="drop";
 }else if(qRate.value==="local"||qRate.value==="drop"){
  qRate.value="competitive";
 }
 if(qBataOn.checked&&qBata.dataset.auto!=="0") qBata.value=c.driverBata||0;
 handleLocalCheck();
 calcQuote();
}
/* Driver Bata is off by default — an owner switches it on per-trip when it actually applies
   (larger contract vehicles in town, per the union rate sheet), rather than it being forced
   onto every quotation. */
function toggleBata(){
 const c=db.categories[+qCat.value];
 if(qBataOn.checked){
  qBata.disabled=false;
  if(!qBata.value||qBata.value==="0"){ qBata.value=c.driverBata||0; qBata.dataset.auto="1"; }
 }else{
  qBata.disabled=true;
 }
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
 const bata=(document.querySelector("#qBataOn")?.checked)?(+qBata.value||0):0;
 const preDiscount=r.total+bata;
 const dr=applyDiscountRound(preDiscount,qDiscType.value,+qDiscValue.value||0,+qRound.value||0);
 qCalc.innerHTML=`<div>Base: <b>${money(r.base)}</b></div>
 ${r.incKm!=null?`<div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours</div>`:""}
 <div>Extra KM: ${money(r.kmExtra||0)}</div><div>Extra Hour: ${money(r.hourExtra||0)}</div>
 <div>Applicable extra (higher): <b>${money(r.extra||0)}</b></div>
 <div>Fare Subtotal: ${money(r.total)}</div>
 ${bata?`<div>Driver Bata: ${money(bata)}</div>`:""}
 <div>Subtotal: ${money(preDiscount)}</div>
 ${dr.discountAmount?`<div>Discount: -${money(dr.discountAmount)}</div>`:""}
 ${dr.roundAdjustment?`<div>Round off: ${dr.roundAdjustment>=0?"+":""}${money(dr.roundAdjustment)}</div>`:""}
 <div class="total">Final quoted fare: ${money(dr.final)}</div>`;
 return {...r,...dr,driverBata:bata};
}

function saveQuote(){
 const r=calcQuote();if(r.invalid){toast("Correct Local Trip limits first");return}
 const c=db.categories[+qCat.value];
 const q={id:crypto.randomUUID(),no:"QTN-"+Date.now(),customer:qName.value,mobile:qMobile.value,type:qType.value,category:c.name,categoryId:+qCat.value,vehicle:qVehicle.value,vehicleNo:qVehicleNo.value,
  pickup:qPickup.value,destinations:collectDestinations(),destination:collectDestinations()[0]||"",returnPoint:qReturn.value,
  estimatedKm:+qKm.value||0,estimatedHours:+qHours.value||0,startDate:qStart.value,startTime:qStartTime.value,closeDate:qClose.value,closeTime:qCloseTime.value,
  service:qService.value,ratePlan:qRate.value,baseRate:r.base,kmRate:r.addKm,hourRate:r.addHour,includedKm:r.incKm,includedHours:r.incHours,
  driverBata:r.driverBata||0,
  discountType:qDiscType.value,discountValue:+qDiscValue.value||0,discountAmount:r.discountAmount,roundOff:+qRound.value||0,roundAdjustment:r.roundAdjustment,
  subtotal:r.total+(r.driverBata||0),quotedAmount:r.final,created:new Date().toISOString(),status:"quoted"};
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
  qBataOn.checked=!!(q.driverBata); qBata.value=q.driverBata||0; qBata.disabled=!qBataOn.checked;
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
 const fareSubtotal=r.invalid?(q.subtotal??q.quotedAmount):r.total;
 const bata=q.driverBata||0;
 const subtotal=fareSubtotal+bata;
 const dr=applyDiscountRound(subtotal,q.discountType||"none",q.discountValue||0,q.roundOff||0);
 const adjAmount=(t.adjustment&&Number(t.adjustment.amount))||0;
 const finalAdjusted=Math.max(0,dr.final+adjAmount);
 return {...r,subtotal,driverBata:bata,...dr,final:finalAdjusted,manualAdjustment:adjAmount,manualAdjustmentNote:(t.adjustment&&t.adjustment.note)||""};
}

/* Lets the owner manually correct a bill's final amount after the fact — e.g. a rate-sheet
   mistake discovered later, or a goodwill adjustment — without reopening the quotation or
   category rates. Stored on the trip, applied on top of the normal calculation everywhere
   (screen, PDF, print) so it always stays visible and reversible. */
function openAdjustBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 const adj=t.adjustment||{amount:0,note:""};
 const adjType=adj.amount<0?"discount":"addition";
 modal(`<h2>Adjust Final Bill Amount</h2>
  <p class="muted">This adds to or subtracts from the automatically calculated amount — it does not replace the calculation.</p>
  <label>This adjustment is a<select id="adjType">
   <option value="discount" ${adjType==="discount"?"selected":""}>Discount (reduces the bill)</option>
   <option value="addition" ${adjType==="addition"?"selected":""}>Addition (increases the bill)</option>
  </select></label>
  <label>Amount (always enter as positive)<input id="adjAmt" type="number" value="${Math.abs(adj.amount||0)}"></label>
  <label>Reason / note<input id="adjNote" value="${esc(adj.note||"")}" placeholder="e.g. Corrected rate sheet mistake"></label>
  <div class="actions"><button class="primary" onclick="saveAdjustBill('${tripId}')">Apply Adjustment</button>${adj.amount?`<button onclick="clearAdjustBill('${tripId}')">Remove Adjustment</button>`:""}</div>`);
}
function saveAdjustBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 const rawAmt=+document.querySelector("#adjAmt").value||0;
 const isDiscount=document.querySelector("#adjType").value==="discount";
 const amt=isDiscount?-Math.abs(rawAmt):Math.abs(rawAmt);
 const note=document.querySelector("#adjNote").value;
 t.adjustment=rawAmt?{amount:amt,note}:null;
 save();closeModal();toast("Bill amount adjusted");loadBill();
}
function clearAdjustBill(tripId){
 const t=db.trips.find(x=>x.id===tripId);
 t.adjustment=null;
 save();closeModal();toast("Adjustment removed");loadBill();
}

/* Builds the 4-section bill breakdown (Usage / Standard-vs-Offer / Savings / Payment Summary)
   shared by the on-screen view, the PDF, and the Print output — so all three always agree. */
function billBreakdown(t,q,c){
 const km=t.actualKm||q.estimatedKm, h=t.actualHours||q.estimatedHours;
 const standardRaw=calcFare(c,"standard",km,h);
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
  <div class="actions"><button onclick="editTrip('${t.id}')">Edit trip details (KM / hours / dates)</button><button onclick="openAdjustBill('${t.id}')">Adjust Final Bill Amount</button></div>

  <h3>1. Usage Details</h3>
  <div>Total KM: <b>${km}</b> &nbsp; Total Hours: <b>${h}</b></div>
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
  <div class="total">FINAL BILL AMOUNT: ${money(final)}</div>

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
 y+=2;
 doc.setFillColor(15,90,85);
 doc.rect(15,y,180,20,"F");
 doc.setTextColor(255,255,255);
 doc.setFont(undefined,"normal");doc.setFontSize(9);
 doc.text("QUOTED AMOUNT",105,y+7,{align:"center"});
 doc.setFont(undefined,"bold");doc.setFontSize(16);
 doc.text(pdfMoney(q.quotedAmount),105,y+16,{align:"center"});
 doc.setTextColor(0);doc.setFont(undefined,"normal");doc.setFontSize(10);
 y+=26;
 doc.save("Quotation-"+q.no+".pdf");
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

 /* SECTION 1: Usage Details */
 y=pdfDivider(doc,y);
 doc.setFont(undefined,"bold");doc.text("1. Usage Details",15,y);y+=6;doc.setFont(undefined,"normal");
 y=pdfRow(doc,y,"Total KM / Total Hours",km+" KM / "+h+" hrs");
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
/* Prints via a hidden same-page iframe instead of window.open() — opening a separate
   tab/window causes some mobile browsers (notably Chrome on Android) to show a reduced
   print dialog without the full printer/destination chooser. A same-page iframe reliably
   shows the complete native print sheet, including nearby Bluetooth/USB printers. */
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
function printQuote(id){
 const q=db.quotes.find(x=>x.id===id);if(!q)return;
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const c=db.categories[q.categoryId];
 const platformPhones=[db.platform.phone1,db.platform.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const row=(label,value,big)=>`<tr><td style="padding:4px 0;color:#555;font-size:${big?"16px":"14px"}">${esc(label)}</td><td style="padding:4px 0;text-align:right;font-weight:bold;font-size:${big?"18px":"14px"}">${esc(value)}</td></tr>`;
 printContent("Quotation "+q.no,`
 <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd;padding-bottom:6px">
  <div style="display:flex;align-items:center;gap:8px">
   <img src="${LOGO_DATA_URI}" style="width:28px;height:28px">
   <div style="font-weight:bold;color:#444;font-size:13px">${esc((db.platform.name||"Travel Connect").toUpperCase())}</div>
  </div>
  <div style="color:#444;font-weight:bold;font-size:12px;text-align:right">${platformPhones}</div>
 </div>
 <div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
  <div style="font-weight:bold;font-size:21px;color:#0f5a55">${esc(db.business.name)}</div>
  ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
  ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
 </div>
 <h2 style="text-align:center;color:#143c5a;margin:10px 0;font-size:20px">QUOTATION ${esc(q.no)}</h2>
 <table>${row("Customer",q.customer)}${row("Mobile",q.mobile)}${row("Vehicle Category",q.category+" "+(q.vehicle||"")+" "+(q.vehicleNo||""))}</table>
 <div style="background:#fdf6e3;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:12px 0">
  <div style="font-weight:bold;font-size:15px;color:#7a5a1e;margin-bottom:6px">&#128663; ROUTE</div>
  <div style="font-size:15px;font-weight:600">${[q.pickup,...dests,q.returnPoint].filter(Boolean).map(esc).join(" &rarr; ")}</div>
 </div>
 <table>
  ${row("Trip Type",q.type,true)}
  ${row("Estimated KM / Hours",q.estimatedKm+" KM / "+q.estimatedHours+" hrs",true)}
 </table>
 <div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:14px;text-align:center;margin-top:14px">
  <div style="font-size:14px;color:#1c6b2c">QUOTED AMOUNT</div>
  <div style="font-size:30px;font-weight:bold;color:#1c6b2c">${money(q.quotedAmount)}</div>
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
 detailRows+=row("Trip Date",q.startDate||"-");

 /* SECTION 1: Usage Details */
 let usageRows="";
 usageRows+=row("Total KM / Total Hours",km+" KM / "+h+" hrs",true);
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
  ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
 </div>
 <div style="display:flex;justify-content:space-between;align-items:baseline">
  <h2 style="color:#143c5a;margin:4px 0;font-size:20px">FINAL TRIP BILL</h2>
  <span style="color:#888;font-size:12px">Bill printed on: ${esc(billDate)}</span>
 </div>
 <table>${detailRows}</table>
 <div style="background:#fdf6e3;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:10px 0">
  <div style="font-weight:bold;font-size:14px;color:#7a5a1e;margin-bottom:6px">&#128663; ROUTE</div>
  <div style="font-size:15px;font-weight:600">${[q.pickup,...dests,q.returnPoint].filter(Boolean).map(esc).join(" &rarr; ")}</div>
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
 <p style="text-align:center;color:#888;font-size:12px;margin-top:14px">Thank you for travelling with ${esc(db.business.name)}.</p>
 `);
}

/* ---------- MASTER RATE TABLE (password protected) ---------- */
function master(){
 const rows=db.categories.map((c,i)=>`<tr>
  <td>${esc(c.name)}</td>
  <td>${c.driverBata?money(c.driverBata):"—"}</td>
  <td>${money(c.standard.rate)}</td>
  <td>${money(c.competitive.rate)}</td>
  <td>${money(c.safety.rate)}</td>
  <td>${money(c.drop.rate)}</td>
  <td>${money(c.local.rate)}</td>
  <td><button onclick="editCat(${i})">Edit</button></td>
 </tr>`).join("");
 app().innerHTML=card("Vehicle Categories & Rate Master",`<p class="muted">Password-protected. Each rate (Standard, Competitive, Minimum Safety, Local) has its own Included KM/Hours and Additional KM/Hour charge.</p><div class="tablewrap"><table class="table"><thead><tr><th>Category</th><th>Driver Bata</th><th>Standard</th><th>Competitive</th><th>Minimum Safety</th><th>Drop</th><th>Local Rate</th><th></th></tr></thead><tbody>${rows}</tbody></table></div><div class="actions"><button class="primary" onclick="addCat()">+ Add vehicle category</button><button onclick="exportRates()">Export rate sheet</button><button onclick="importRates()">Import rate sheet</button></div><hr><h3>Vehicles</h3><div class="grid"><label>Vehicle name<input id="vName"></label><label>Vehicle number<input id="vNo"></label><label>Category<select id="vCat">${db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("")}</select></label><label>Seats<input id="vSeats" type="number"></label></div><button class="primary" onclick="addVehicle()">Add Vehicle</button>${db.vehicles.map((v,i)=>`<div class="listitem">${esc(v.name)} • ${esc(v.no)} • ${esc(db.categories[v.cat]?.name||"")} • ${v.seats||""} seats</div>`).join("")}<hr><h3>Drivers</h3><div class="grid"><label>Name<input id="dName"></label><label>Mobile<input id="dMobile"></label><label>Vehicle<select id="dVehicle"><option value="">None</option>${db.vehicles.map((v,i)=>`<option value="${i}">${esc(v.name)} ${esc(v.no)}</option>`).join("")}</select></label></div><button class="primary" onclick="addDriver()">Add Driver</button>${db.drivers.map(d=>`<div class="listitem">${esc(d.name)} • ${esc(d.mobile)}</div>`).join("")}`);
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
  <label>Driver Bata (₹, optional per-trip charge — 0 = not applicable)<input id="ec_bata" type="number" value="${c.driverBata||0}"></label>
  ${rateFields("ec_std","Standard Rate",c.standard)}
  ${rateFields("ec_comp","Competitive Rate",c.competitive)}
  ${rateFields("ec_saf","Minimum Safety Rate",c.safety)}
  ${rateFields("ec_drop","Drop Rate (its own formula — no cliff, applies at any distance)",c.drop)}
  ${rateFields("ec_loc","Local Rate (capped at "+db.settings.localMaxKm+" KM / "+db.settings.localMaxHours+" hrs)",c.local)}
  <button class="primary" onclick="saveCat(${i})">Save Rate</button>`);
}
/* Every rate save also pushes the whole rate/platform config to the server (see
   pushConfigToServer) so it appears on every other device the next time they open
   the app or log in — this is what makes "I changed a rate here" propagate. */
function saveCat(i){
 const c=db.categories[i];
 c.name=document.querySelector("#ec_name").value;
 c.driverBata=+document.querySelector("#ec_bata").value||0;
 c.standard=readRateFields("ec_std");
 c.competitive=readRateFields("ec_comp");
 c.safety=readRateFields("ec_saf");
 c.drop=readRateFields("ec_drop");
 c.local=readRateFields("ec_loc");
 save();closeModal();master();toast("Rate updated");
 pushConfigToServer();
}

function addCat(){ requireAdmin(openAddCatModal); }
function openAddCatModal(){
 const blank=rateBlock(0,80,8,0,0), blankLocal=rateBlock(0,40,4,0,0);
 modal(`<h2>New Vehicle Category</h2>
  <label>Category name<input id="nc_name"></label>
  <label>Driver Bata (₹, optional per-trip charge — 0 = not applicable)<input id="nc_bata" type="number" value="0"></label>
  ${rateFields("nc_std","Standard Rate",blank)}
  ${rateFields("nc_comp","Competitive Rate",blank)}
  ${rateFields("nc_saf","Minimum Safety Rate",blank)}
  ${rateFields("nc_drop","Drop Rate (its own formula — no cliff, applies at any distance)",blankLocal)}
  ${rateFields("nc_loc","Local Rate (capped at "+db.settings.localMaxKm+" KM / "+db.settings.localMaxHours+" hrs)",blankLocal)}
  <button class="primary" onclick="saveNewCat()">Add Category</button>`);
}
function saveNewCat(){
 const c={
  name:document.querySelector("#nc_name").value,
  driverBata:+document.querySelector("#nc_bata").value||0,
  standard:readRateFields("nc_std"),
  competitive:readRateFields("nc_comp"),
  safety:readRateFields("nc_saf"),
  drop:readRateFields("nc_drop"),
  local:readRateFields("nc_loc")
 };
 db.categories.push(c);save();closeModal();master();toast("Category added");
 pushConfigToServer();
}

/* ---------- EXPORT / IMPORT RATE SHEET ----------
   Lets the owner copy the current device's full rate table as text (e.g. via
   WhatsApp/Notes) and paste it into "Import rate sheet" on any other device
   running this app, so everyone ends up on the same rates without needing a
   fresh code deployment. Kept as a manual fallback alongside the automatic
   server sync above. */
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
  pushConfigToServer();
 }catch(e){
  document.querySelector("#impErr").textContent="Could not read this text — make sure the entire exported text was pasted, unedited.";
 }
}

function addVehicle(){db.vehicles.push({name:vName.value,no:vNo.value,cat:+vCat.value,seats:+vSeats.value||0});save();master();toast("Vehicle added")}
function addDriver(){db.drivers.push({name:dName.value,mobile:dMobile.value,vehicle:+dVehicle.value});save();master();toast("Driver added")}

function accounts(){const income=db.bills.reduce((a,b)=>a+b.amount,0),expense=db.expenses.reduce((a,e)=>a+e.amount,0);app().innerHTML=card("Accounts",`<div class="grid"><div class="metric">Recorded billing<b>${money(income)}</b></div><div class="metric">Expenses<b>${money(expense)}</b></div><div class="metric">Net before other adjustments<b>${money(income-expense)}</b></div></div><p class="muted">This is the foundation. GST, tax reports, driver payments, fuel, toll, parking and profit reports will use the same ledger.</p><div class="grid"><label>Expense category<input id="exCat"></label><label>Description<input id="exDesc"></label><label>Amount<input id="exAmt" type="number"></label></div><button class="primary" onclick="addExpense()">Add expense</button>`)}
function addExpense(){db.expenses.push({category:exCat.value,description:exDesc.value,amount:+exAmt.value||0,created:new Date().toISOString()});save();toast("Expense recorded");accounts()}

/* Admin page itself is now behind the same password gate as everything inside it
   (see render(): else if(v==="admin") requireAdmin(admin);) — opening the tab at
   all requires the password, not just individual actions inside the page. */
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
  <h4>Rate types visible to travel partners / customers</h4>
  <p class="muted">Switch off any rate type you don't want offered right now — it disappears from the "Rate" choice on every quotation, without deleting its numbers. Useful in peak season when you don't need to offer a discounted rate.</p>
  <div class="grid">
   ${(()=>{const labels={standard:"Standard Rate",competitive:"Competitive Rate",safety:"Minimum Safety Rate",drop:"Drop Rate",local:"Local Rate",custom:"Custom / Manual Amount"};const v=db.settings.visibleRates||{};return Object.keys(labels).map(k=>`<label><input type="checkbox" id="vis_${k}" ${v[k]!==false?"checked":""}> ${labels[k]}</label>`).join("");})()}
  </div>
  <button class="primary" onclick="saveAdmin()">Save platform settings</button>
 </div>
 <hr>
 <div class="card">
  <h3>Logged-in Users <span class="muted">(owner only — password protected)</span></h3>
  <p class="muted">Everyone who has opened this app link and logged in. Not SMS-verified — this is what they typed in.</p>
  <div class="actions"><button onclick="loadUsersList()">Load list</button><button onclick="openCreateInvite()">+ Generate one-time invite link</button></div>
  <div id="usersList"></div>
 </div>
 <hr>
 <div class="card">
  <h3>This device</h3>
  <p class="muted">Logged in as: <b>${esc((getCurrentUser()||{}).name||"-")}</b> (${esc((getCurrentUser()||{}).mobile||"-")})</p>
  <button onclick="logout()">Log out on this device</button>
  <button onclick="adminLogout()">End admin session on this device</button>
 </div>
 <hr>
 <div class="card">
  <h3>Pending Travel Partners <span class="muted">(owner only — password protected)</span></h3>
  <div class="actions"><button onclick="loadPendingPartners()">Load pending partners</button></div>
  <div id="pendingPartnersList"></div>
 </div>
 <hr>
 <div class="card">
  <h3>Pending Vehicles <span class="muted">(owner only — password protected)</span></h3>
  <p class="muted">Tap a document link to view the photo before approving.</p>
  <div class="actions"><button onclick="loadPendingVehicles()">Load pending vehicles</button></div>
  <div id="pendingVehiclesList"></div>
 </div>
 <hr>
 <div class="card">
  <h3>All Vehicles (Documents) <span class="muted">(owner only — password protected)</span></h3>
  <p class="muted">Look up any vehicle's documents any time — including already-verified ones, e.g. to re-check before a renewal reminder.</p>
  <div class="actions"><button onclick="loadAllVehiclesAdmin()">Load all vehicles</button></div>
  <div id="allVehiclesList"></div>
 </div>
 <hr><h3>Planned next phase</h3><p>Structured enquiry/booking workflow, vehicle-wise ledger.</p>`);
}
/* Ends just the admin session (rate/settings editing access) without logging the
   regular app user out — the next admin action will ask for the password again. */
function adminLogout(){
 sessionStorage.removeItem("tc_admin_token");
 toast("Admin session ended on this device");
 admin();
}

/* Owner-only: lists everyone who has ever logged in, with a Block/Unblock action per row. */
function loadUsersList(){ requireAdmin(doLoadUsersList); }
async function doLoadUsersList(){
 const box=document.querySelector("#usersList");
 box.innerHTML="<p class='muted'>Loading...</p>";
 try{
  const res=await fetch("/api/auth?action=users&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load users.</p>"; return; }
  if(!data.users.length){ box.innerHTML="<p class='muted'>No one has logged in yet.</p>"; return; }
  box.innerHTML=data.users.map(u=>`<div class="listitem">
   <b>${esc(u.name)}</b> — ${esc(u.mobile)} ${u.blocked?'<span class="danger">(BLOCKED)</span>':''}<br>
   <span class="muted">First: ${esc((u.first_login_at||"").slice(0,16).replace("T"," "))} • Last: ${esc((u.last_login_at||"").slice(0,16).replace("T"," "))} • Logins: ${u.login_count}</span>
   <div class="actions">${u.blocked?`<button onclick="setUserBlocked('${esc(u.mobile)}',false)">Unblock</button>`:`<button class="danger" onclick="setUserBlocked('${esc(u.mobile)}',true)">Block</button>`}</div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function setUserBlocked(mobile,blocked){
 if(!confirm((blocked?"Block ":"Unblock ")+mobile+"?")) return;
 try{
  await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:blocked?"block":"unblock",mobile,token:adminToken()})});
  toast(blocked?"User blocked":"User unblocked");
  doLoadUsersList();
 }catch(e){ toast("Network error"); }
}

/* Owner-only: creates a one-time invite link tied to a specific recipient. The link
   still works like a normal login the first time it's opened, but the server records
   who used it and when, closing the loop on "who did I send this to". */
function openCreateInvite(){ requireAdmin(doOpenCreateInvite); }
function doOpenCreateInvite(){
 modal(`<h2>Generate Invite Link</h2>
  <p class="muted">Optional — helps you know exactly who a link was sent to.</p>
  <label>Recipient name (optional)<input id="invName"></label>
  <label>Recipient mobile (optional)<input id="invMobile"></label>
  <div class="actions"><button class="primary" onclick="doCreateInvite()">Generate</button></div>
  <div id="invResult"></div>`);
}
async function doCreateInvite(){
 const name=document.querySelector("#invName").value;
 const mobile=document.querySelector("#invMobile").value;
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"create_invite",recipient_name:name,recipient_mobile:mobile,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ document.querySelector("#invResult").innerHTML="<p class='danger'>Could not create invite.</p>"; return; }
  const link=location.origin+"/?invite="+data.token;
  document.querySelector("#invResult").innerHTML=`<p><b>Share this link:</b></p><textarea rows="3" readonly onclick="this.select()">${esc(link)}</textarea>`;
 }catch(e){ document.querySelector("#invResult").innerHTML="<p class='danger'>Network error.</p>"; }
}

/* Owner-only: approve travel partners and vehicles before their vehicles can appear as
   verified/active anywhere else in the app. Document photos are only viewable through
   these admin-only, token-protected links — never public. */
function loadPendingPartners(){ requireAdmin(doLoadPendingPartners); }
async function doLoadPendingPartners(){
 const box=document.querySelector("#pendingPartnersList");
 box.innerHTML="<p class='muted'>Loading...</p>";
 try{
  const res=await fetch("/api/partners?action=pending&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
  if(!data.partners.length){ box.innerHTML="<p class='muted'>No pending partners.</p>"; return; }
  box.innerHTML=data.partners.map(p=>`<div class="listitem">
   <b>${esc(p.business_name)}</b> — ${esc(p.owner_name)} — ${esc(p.mobile1)}${p.mobile2?" / "+esc(p.mobile2):""}<br>
   ${p.email?`${esc(p.email)}<br>`:""}${p.location?`${esc(p.location)} ${esc(p.pincode||"")}`:""}
   <div class="actions"><button class="primary" onclick="approvePartner(${p.id})">Approve</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function approvePartner(id){
 try{
  await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"verify",partner_id:id,verified:1,token:adminToken()})});
  toast("Partner approved");
  doLoadPendingPartners();
 }catch(e){ toast("Network error"); }
}

function loadPendingVehicles(){ requireAdmin(doLoadPendingVehicles); }
async function doLoadPendingVehicles(){
 const box=document.querySelector("#pendingVehiclesList");
 box.innerHTML="<p class='muted'>Loading...</p>";
 try{
  const res=await fetch("/api/vehicles?action=pending&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
  if(!data.vehicles.length){ box.innerHTML="<p class='muted'>No pending vehicles.</p>"; return; }
  box.innerHTML=data.vehicles.map(v=>`<div class="listitem">
   <b>${esc(v.vehicle_number)}</b> ${esc(v.category||"")} — ${esc(v.business_name)} (${esc(v.owner_name)})<br>
   ${v.driver_name?`Driver: ${esc(v.driver_name)}<br>`:""}
   <div class="muted">Documents:
    ${docLink("Front",v.front_photo_key)}${docLink("RC",v.rc_photo_key)}${docLink("Insurance",v.insurance_photo_key)}${docLink("Permit",v.permit_photo_key)}${docLink("Fitness",v.fitness_photo_key)}${docLink("PUC",v.puc_photo_key)}${docLink("License",v.driver_license_photo_key)}
   </div>
   <div class="actions"><button class="primary" onclick="approveVehicle(${v.id})">Approve</button><button class="danger" onclick="deleteVehicleAdmin(${v.id})">Delete</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
function docLink(label,key){
 if(!key) return "";
 const url="/api/vehicles?action=file&key="+encodeURIComponent(key)+"&token="+encodeURIComponent(adminToken());
 return `<a href="${url}" target="_blank">[${esc(label)}]</a> `;
}
async function approveVehicle(id){
 try{
  await fetch("/api/vehicles?action=verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:id,verified:1,token:adminToken()})});
  toast("Vehicle approved");
  doLoadPendingVehicles();
 }catch(e){ toast("Network error"); }
}
async function deleteVehicleAdmin(id){
 if(!confirm("Delete this vehicle entry? This cannot be undone.")) return;
 try{
  await fetch("/api/vehicles?action=delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:id,token:adminToken()})});
  toast("Vehicle deleted");
  doLoadPendingVehicles();
 }catch(e){ toast("Network error"); }
}

/* Owner-only: browse every vehicle (verified or not) to re-check its documents any
   time — this is the only place documents remain reachable once a vehicle has
   already been approved and dropped off the Pending list. */
function loadAllVehiclesAdmin(){ requireAdmin(doLoadAllVehiclesAdmin); }
async function doLoadAllVehiclesAdmin(){
 const box=document.querySelector("#allVehiclesList");
 box.innerHTML="<p class='muted'>Loading...</p>";
 try{
  const res=await fetch("/api/vehicles?action=all&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
  if(!data.vehicles.length){ box.innerHTML="<p class='muted'>No vehicles yet.</p>"; return; }
  box.innerHTML=data.vehicles.map(v=>`<div class="listitem">
   <b>${esc(v.vehicle_number)}</b> ${esc(v.category||"")} — ${esc(v.business_name)} ${v.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>'}<br>
   <div class="muted">Documents:
    ${docLink("Front",v.front_photo_key)}${docLink("RC",v.rc_photo_key)}${docLink("Insurance",v.insurance_photo_key)}${docLink("Permit",v.permit_photo_key)}${docLink("Fitness",v.fitness_photo_key)}${docLink("PUC",v.puc_photo_key)}${docLink("License",v.driver_license_photo_key)}
   </div>
   <div class="muted">RC exp: ${esc(v.rc_expiry||"-")} • Insurance exp: ${esc(v.insurance_expiry||"-")} • Permit exp: ${esc(v.permit_expiry||"-")} • Fitness exp: ${esc(v.fitness_expiry||"-")} • PUC exp: ${esc(v.puc_expiry||"-")}</div>
   <div class="actions">${v.verified?`<button onclick="unverifyVehicle(${v.id})">Un-verify</button>`:`<button class="primary" onclick="approveVehicle(${v.id});setTimeout(doLoadAllVehiclesAdmin,400)">Approve</button>`}</div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function unverifyVehicle(id){
 if(!confirm("Remove verification from this vehicle? It will stop showing on the Active Board until re-approved.")) return;
 try{
  await fetch("/api/vehicles?action=verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:id,verified:0,token:adminToken()})});
  toast("Verification removed");
  doLoadAllVehiclesAdmin();
 }catch(e){ toast("Network error"); }
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
 ["standard","competitive","safety","drop","local","custom"].forEach(k=>{
  const el=document.querySelector("#vis_"+k);
  if(el) db.settings.visibleRates[k]=el.checked;
 });
 db.settings.localMaxKm=+lKm.value||50;db.settings.localMaxHours=+lHr.value||5;
 save();toast("Platform settings saved");admin();
 pushConfigToServer();
}

/* ---------- TRAVEL PARTNER + VEHICLE REGISTRATION ---------- */
/* Any logged-in user can register their travel business as a "Partner", tied to their
   own mobile number (mobile1). Vehicles are added under that partner, each with its
   own documents (RC/Insurance/Permit/Fitness/PUC/Driving License) and photos stored in
   R2. Nothing shows as verified/active until the admin approves it — self-registration
   only creates the record, it never grants trust by itself. */
async function partnerView(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("Travel Partner",`<div id="partnerBox">Loading...</div>`);
 const user=getCurrentUser();
 try{
  const res=await fetch("/api/partners?action=mine&mobile="+encodeURIComponent(user.mobile));
  const data=await res.json();
  if(!data.ok||!data.partner){ renderPartnerRegisterForm(); }
  else{ window._myPartner=data.partner; window._myPartnerHasPassword=data.has_password; renderPartnerDashboard(data.partner); }
 }catch(e){
  document.querySelector("#partnerBox").innerHTML="<p class='danger'>Network error — check your connection and try again.</p>";
 }
}
function renderPartnerRegisterForm(){
 const user=getCurrentUser();
 document.querySelector("#partnerBox").innerHTML=`
 <p class="muted">Register your travel business to add vehicles and use the Active Vehicles Board. An admin will verify your details before your vehicles can be marked active.</p>
 <div class="grid">
  <label>Business name<input id="pBizName"></label>
  <label>Owner name<input id="pOwnerName" value="${esc(user.name)}"></label>
  <label>Mobile 1<input id="pMobile1" value="${esc(user.mobile)}"></label>
    <label>Mobile 2 (optional)<input id="pMobile2"></label>
  <label>Email (optional)<input id="pEmail"></label>
  <label>Location<input id="pLocation" placeholder="Town / area"></label>
  <label>Pincode<input id="pPincode"></label>
 </div>
 <button class="primary" onclick="submitPartnerRegister()">Register as Travel Partner</button>
 <div id="pRegErr" class="danger"></div>`;
}
async function submitPartnerRegister(){
 const business_name=document.querySelector("#pBizName").value.trim();
 const owner_name=document.querySelector("#pOwnerName").value.trim();
 const mobile1=document.querySelector("#pMobile1").value.trim();
 const errBox=document.querySelector("#pRegErr");
 if(!business_name||!owner_name||!mobile1){errBox.textContent="Fill in business name, owner name and mobile number.";return}
 const body={action:"register",business_name,owner_name,mobile1,
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
  toast("Registered — waiting for admin verification");
  partnerView();
 }catch(e){errBox.textContent="Network error — check your connection and try again.";}
}
function renderPartnerDashboard(p){
 document.querySelector("#partnerBox").innerHTML=`
 <div class="card">
  <h3>${esc(p.business_name)} ${p.verified?'<span class="ok">&#9989; Verified</span>':'<span class="muted">(Pending admin verification)</span>'}</h3>
  <div class="muted">Owner: ${esc(p.owner_name)} • ${esc(p.mobile1)}${p.mobile2?" / "+esc(p.mobile2):""}</div>
  ${p.email?`<div class="muted">${esc(p.email)}</div>`:""}
  ${p.location?`<div class="muted">${esc(p.location)} ${esc(p.pincode||"")}</div>`:""}
 </div>
 <div class="card" id="billingIdentityCard">
  <h3>Billing Details <span class="muted">(the name/phone/UPI shown on YOUR bills — protected by your own password, not the owner's admin password)</span></h3>
  <div id="billingIdentityBody"></div>
 </div>
 <div class="actions"><button class="primary" onclick="openAddVehicle(${p.id})">+ Add Vehicle</button></div>
 <h3>My Vehicles</h3>
 <div id="myVehiclesList">Loading...</div>`;
 renderBillingIdentitySection(p);
 loadMyVehicles(p.id);
}

/* ---------- PARTNER'S OWN BILLING IDENTITY (name/phone/UPI on their bills) ----------
   This is intentionally separate from the owner's admin password. A partner sets
   their own password once — but that password only becomes usable once the owner
   has verified this partner (checked server-side in action=verify_password), so a
   partner cannot self-approve their own billing identity without the owner's
   oversight. Once unlocked, the fields write directly into db.business, which is
   already per-device/local and exactly what appears on this device's bills — the
   Travel Connect platform settings are a completely separate object this section
   never touches. */
function renderBillingIdentitySection(p){
 const box=document.querySelector("#billingIdentityBody");
 if(!p.verified){
  box.innerHTML=`<p class="muted">Your registration is pending owner verification. Once approved, you'll be able to set a password and enter your own business name/phone/UPI here.</p>`;
  return;
 }
 if(!window._myPartnerHasPassword){
  box.innerHTML=`
  <p class="muted">Set a password (choose your own — the owner does not need to know it) to control your billing details on this device.</p>
  <label>Choose a password (min 4 characters)<input id="bizPassNew" type="password"></label>
  <button class="primary" onclick="submitSetPartnerPassword(${p.id})">Set Password</button>
  <div id="bizPassErr" class="danger"></div>`;
  return;
 }
 box.innerHTML=`
 <div class="muted">Currently showing on your bills: <b>${esc(db.business.name||"-")}</b> ${db.business.phone?"• "+esc(db.business.phone):""}</div>
 <button onclick="openUnlockBillingIdentity(${p.id})">Unlock to edit (your password)</button>`;
}
async function submitSetPartnerPassword(partnerId){
 const pass=document.querySelector("#bizPassNew").value;
 const errBox=document.querySelector("#bizPassErr");
 if(!pass||pass.length<4){errBox.textContent="Password must be at least 4 characters.";return}
 const user=getCurrentUser();
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"set_password",partner_id:partnerId,mobile:user.mobile,password:pass})});
  const data=await res.json();
  if(!data.ok){errBox.textContent="Could not set password. Please try again.";return}
  window._myPartnerHasPassword=true;
  toast("Password set");
  renderBillingIdentitySection(window._myPartner);
 }catch(e){errBox.textContent="Network error.";}
}
function openUnlockBillingIdentity(partnerId){
 modal(`<h2>Unlock Billing Details</h2>
  <p class="muted">Enter your own billing password (not the owner's admin password).</p>
  <input id="bizUnlockPass" type="password" placeholder="Your password" onkeydown="if(event.key==='Enter')submitUnlockBillingIdentity(${partnerId})">
  <div class="actions"><button class="primary" onclick="submitUnlockBillingIdentity(${partnerId})">Unlock</button></div>
  <div id="bizUnlockErr" class="danger"></div>`);
}
async function submitUnlockBillingIdentity(partnerId){
 const pass=document.querySelector("#bizUnlockPass").value;
 const errBox=document.querySelector("#bizUnlockErr");
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"verify_password",partner_id:partnerId,password:pass})});
  const data=await res.json();
  if(!data.ok){errBox.textContent="Incorrect password.";return}
  closeModal();
  openEditBillingIdentity();
 }catch(e){errBox.textContent="Network error.";}
}
function openEditBillingIdentity(){
 modal(`<h2>Edit Billing Details</h2>
  <p class="muted">Shown on your bills and quotations printed from this device.</p>
  <div class="grid">
   <label>Business name<input id="bizName" value="${esc(db.business.name)}"></label>
   <label>Tagline<input id="bizTagline" value="${esc(db.business.tagline||"")}"></label>
   <label>Address<input id="bizAddress" value="${esc(db.business.address||"")}"></label>
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
    <input type="checkbox" ${v.active?"checked":""} onchange="toggleVehicleActive(${v.id},this.checked)"> Active Now (ready for a trip)
   </label>
  </div>`).join("");
 }catch(e){box.innerHTML="<p class='danger'>Network error.</p>"}
}
/* Warns the owner directly on their own vehicle list when any document is within 30
   days of expiring (or already expired) — a simple client-side check against the
   dates they entered, no separate reminder system yet. */
function vehicleExpiryWarnings(v){
 const docs=[["RC",v.rc_expiry],["Insurance",v.insurance_expiry],["Permit",v.permit_expiry],["Fitness",v.fitness_expiry],["PUC",v.puc_expiry],["Driving License",v.driver_license_expiry]];
 const soon=docs.filter(([label,d])=>d&&isExpiringSoon(d));
 if(!soon.length) return "";
 return `<div class="danger">&#9888; Expiring soon: ${soon.map(([l,d])=>`${l} (${esc(d)})`).join(", ")}</div>`;
}
function isExpiringSoon(dateStr){
 const d=new Date(dateStr);
 if(isNaN(d)) return false;
 return (d-new Date())/86400000<30;
}
/* Only the vehicle's own partner (matched by mobile, same ownership check as elsewhere
   in this app) can flip this — not the admin, since only the owner/driver actually
   knows whether the vehicle is free for a trip right now. */
async function toggleVehicleActive(vehicleId,active){
 const user=getCurrentUser();
 try{
  await fetch("/api/vehicles?action=toggle_active",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehicle_id:vehicleId,mobile:user.mobile,active})});
  toast(active?"Marked Active Now":"Marked inactive");
 }catch(e){toast("Network error");}
}
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
  <label>License photo<input id="vLicPhoto" type="file" accept="image/*"></label>
 </div>
 <h4>Vehicle documents</h4>
 <div class="grid">
  <label>Front photo (vehicle number must be clearly visible)<input id="vFrontPhoto" type="file" accept="image/*"></label>
  <label>RC photo<input id="vRcPhoto" type="file" accept="image/*"></label>
  <label>RC expiry<input id="vRcExp" type="date"></label>
  <label>Insurance photo<input id="vInsPhoto" type="file" accept="image/*"></label>
  <label>Insurance expiry<input id="vInsExp" type="date"></label>
  <label>Permit photo<input id="vPermitPhoto" type="file" accept="image/*"></label>
  <label>Permit expiry<input id="vPermitExp" type="date"></label>
  <label>Fitness photo<input id="vFitnessPhoto" type="file" accept="image/*"></label>
  <label>Fitness expiry<input id="vFitnessExp" type="date"></label>
  <label>PUC photo<input id="vPucPhoto" type="file" accept="image/*"></label>
  <label>PUC expiry<input id="vPucExp" type="date"></label>
 </div>
 <button class="primary" id="vSaveBtn" onclick="submitAddVehicle(${partnerId})">Save Vehicle</button>
 <div id="vAddErr" class="danger"></div>`);
}
async function submitAddVehicle(partnerId){
 const no=document.querySelector("#vNoNew").value.trim();
 const errBox=document.querySelector("#vAddErr");
 if(!no){errBox.textContent="Enter the vehicle number.";return}
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

/* ---------- ACTIVE VEHICLES BOARD ----------
   Shows ONLY category + vehicle number + partner business name + location + a Call
   button for vehicles the owner has marked Active Now — verified vehicles from
   verified partners only. No customers, rates, quotations or bills are ever shown
   here; this is intentionally the one shared, cross-partner view in the app. */
async function activeBoard(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("Active Vehicles Board",`<p class="muted">Vehicles other travel partners have marked ready for a trip right now.</p><div id="activeBoardList">Loading...</div>`);
 try{
  const res=await fetch("/api/vehicles?action=active");
  const data=await res.json();
  const box=document.querySelector("#activeBoardList");
  if(!data.ok||!data.vehicles.length){box.innerHTML="<p class='muted'>No vehicles are marked active right now.</p>";return}
  box.innerHTML=data.vehicles.map(v=>`<div class="listitem">
   <b>${esc(v.category||"Vehicle")}</b> — ${esc(v.vehicle_number)}<br>
   ${esc(v.business_name)}${v.location?` • ${esc(v.location)} ${esc(v.pincode||"")}`:""}
   <div class="actions">
    <a href="tel:${esc(v.mobile1)}"><button class="primary">&#128222; Call ${esc(v.mobile1)}</button></a>
    ${v.mobile2?`<a href="tel:${esc(v.mobile2)}"><button>&#128222; Call ${esc(v.mobile2)}</button></a>`:""}
   </div>
  </div>`).join("");
 }catch(e){document.querySelector("#activeBoardList").innerHTML="<p class='danger'>Network error.</p>"}
}

function network(){if(!getCurrentUser()){renderLogin();return;}app().innerHTML=card("Travel Connect Network",`<p class="muted">Network foundation: driver request, message, location and SOS. Live multi-user alerts will be connected to the Cloudflare backend in the next backend phase.</p><label>Message<textarea id="nMsg" rows="4" placeholder="Need a vehicle / driver / food / help..."></textarea></label><div class="actions"><button class="primary" onclick="getLocation()">Share current location</button><button onclick="sendNetwork()">Send request</button><button class="danger" onclick="sos()">🆘 SOS</button></div><div id="nStatus"></div>`)}
function getLocation(){if(!navigator.geolocation){nStatus.textContent="GPS not supported";return}navigator.geolocation.getCurrentPosition(p=>{window.tcLoc={lat:p.coords.latitude,lon:p.coords.longitude};nStatus.innerHTML=`<p class="ok">Location captured: ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}</p><a target="_blank" href="https://maps.google.com/?q=${p.coords.latitude},${p.coords.longitude}">Open in Maps</a>`},()=>nStatus.textContent="Location permission denied")}
function sendNetwork(){const p={message:nMsg.value,location:window.tcLoc||null,created:new Date().toISOString()};fetch("/api/network",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(p)}).catch(()=>{});toast("Network request submitted (not yet delivered to other devices — multi-user sync is a future phase)")}
function sos(){
 getLocation();
 setTimeout(async ()=>{
  const user=getCurrentUser()||{};
  const msg=`SOS from ${user.name||"a user"}. Needs urgent assistance.`;
  try{
   await fetch("/api/sos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sender_name:user.name||"",sender_mobile:user.mobile||"",message:msg,lat:window.tcLoc?window.tcLoc.lat:null,lon:window.tcLoc?window.tcLoc.lon:null})});
   toast("SOS sent — every logged-in user will be alerted");
  }catch(e){ toast("Could not send SOS — check your connection"); }
  const shareMsg=`TRAVEL CONNECT SOS. I need urgent assistance. Location: ${window.tcLoc?`https://maps.google.com/?q=${window.tcLoc.lat},${window.tcLoc.lon}`:"Please check my live location."}`;
  navigator.share?.({title:"Travel Connect SOS",text:shareMsg}).catch(()=>{});
 },800);
}

/* ---------- IN-APP SOS ALERTS ----------
   While the app is open, every logged-in device polls periodically for new SOS
   alerts and, on finding one, plays an alarm sound and shows a banner with the
   sender's name and a Call button. This only works while a tab is open — a true
   push notification (working even with the app closed) is a separate, larger
   feature for later. */
let _sosLastSeen=null, _sosPollTimer=null;
function startSosPolling(){
 if(_sosPollTimer) return;
 _sosLastSeen=new Date().toISOString(); /* don't alert for anything before this session started */
 _sosPollTimer=setInterval(checkForSosAlerts,15000);
}
async function checkForSosAlerts(){
 if(!getCurrentUser()) return;
 try{
  const res=await fetch("/api/sos?action=latest&since="+encodeURIComponent(_sosLastSeen));
  const data=await res.json();
  if(data.ok&&data.alerts&&data.alerts.length){
   data.alerts.forEach(a=>showSosBanner(a));
   _sosLastSeen=data.alerts[data.alerts.length-1].created_at;
  }
 }catch(e){}
}
function playSosAlarm(){
 try{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  let t=ctx.currentTime;
  for(let i=0;i<4;i++){
   const osc=ctx.createOscillator(), gain=ctx.createGain();
   osc.frequency.value=880; osc.type="square";
   gain.gain.setValueAtTime(0.3,t); gain.gain.exponentialRampToValueAtTime(0.001,t+0.3);
   osc.connect(gain); gain.connect(ctx.destination);
   osc.start(t); osc.stop(t+0.3);
   t+=0.4;
  }
 }catch(e){}
}
function showSosBanner(alert){
 playSosAlarm();
 const mapLink=(alert.lat&&alert.lon)?`https://maps.google.com/?q=${alert.lat},${alert.lon}`:null;
 const div=document.createElement("div");
 div.className="danger";
 div.style.cssText="position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;padding:14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3)";
 div.innerHTML=`<b>&#128680; SOS: ${esc(alert.sender_name||"A user")} needs help!</b><br>
  ${alert.sender_mobile?`<a href="tel:${esc(alert.sender_mobile)}" style="color:#fff;text-decoration:underline">Call ${esc(alert.sender_mobile)}</a>`:""}
  ${mapLink?` &nbsp;|&nbsp; <a href="${mapLink}" target="_blank" style="color:#fff;text-decoration:underline">View location</a>`:""}
  &nbsp;|&nbsp; <a href="#" style="color:#fff;text-decoration:underline" onclick="this.closest('div').remove();return false">Dismiss</a>`;
 document.body.appendChild(div);
 setTimeout(()=>{ if(div.parentNode) div.remove(); },30000);
}

function modal(html){modalBody.innerHTML=html;document.querySelector("#modal").classList.remove("hidden")}
function closeModal(){document.querySelector("#modal").classList.add("hidden")}

window.onerror=function(msg,src,line,col,err){alert("DEBUG ERROR: "+msg+" | line:"+line+" col:"+col);try{toast("Something went wrong: "+msg)}catch(e){}return false};

migrate();
render();
