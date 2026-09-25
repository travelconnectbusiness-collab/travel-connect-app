/* ======================================================================
   TRAVEL CONNECT - core.js
   Data model, login/authentication, navigation (render/view/history/
   modal), the hamburger menu, admin-session handling, App PIN lock, and
   shared helpers used by every other file (business.js, directory.js,
   customer-safety.js).

   This is a CONSOLIDATED rewrite (24 Sep 2026) replacing the previous
   app.js + app-updates.js + app-updates-2/3/4/5/6/9/10/11.js "layered
   redefinition" architecture with ONE clean definition per function. If
   something needs to change later, it lives in exactly one place here -
   search this file (or business.js / directory.js / customer-safety.js,
   whichever topic it belongs to) directly, no wrapper chain to trace.
   ====================================================================== */

/* ---------- DATA MODEL ---------- */
const KEY="tcp_v1";

function rateBlock(rate,incKm,incHours,addKm,addHour){
 return {rate:+rate,incKm:+incKm,incHours:+incHours,addKm:+addKm,addHour:+addHour};
}

const defaults={
 platform:{name:"Travel Connect",tagline:"Travel & Trip Management Platform",address:"",phone1:"",phone2:"",email:"travelconnect.business@gmail.com"},
 business:{name:"Your Business Name",tagline:"",address:"",officeLocation:"",phone:"",phone2:"",email:"",gstin:"",upiId:"",upiName:"",description:""},
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

function migrate(){
 let changed=false;
 (db.categories||[]).forEach(c=>{
  if(c.driverBata===undefined){ c.driverBata=0; changed=true; }
 });
 if(!db.settings) db.settings={localMaxKm:50,localMaxHours:5};
 (db.trips||[]).forEach(t=>{ if(!Array.isArray(t.payments)) t.payments=t.payment?[{...t.payment}]:[]; });
 (db.quotes||[]).forEach(q=>{ if(!Array.isArray(q.destinations)) q.destinations=q.destination?[q.destination]:[]; });
 if(db.business.officeLocation===undefined){db.business.officeLocation="";changed=true;}
 if(db.business.description===undefined){db.business.description="";changed=true;}
 if(db.settings.businessProfileLocked===undefined){db.settings.businessProfileLocked=true;changed=true;}
 if(!db.settings.visibleRates){db.settings.visibleRates={standard:true,competitive:true,safety:true,drop:true,local:true,custom:true};changed=true;}
 if(changed) save();
}

function save(){ localStorage.setItem(KEY,JSON.stringify(db)); }
function money(n){ return "\u20b9"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2}); }
function esc(v){ return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
function toast(s){ const e=document.querySelector("#toast"); e.textContent=s; e.style.display="block"; setTimeout(()=>e.style.display="none",2600); }
function app(){ return document.querySelector("#app"); }

function card(title,body){
 const isDashboard=(location.hash===""||location.hash==="#dashboard");
 const back=isDashboard?"":`<button class="backbtn" onclick="goBack()">&larr; Back to Dashboard</button>`;
 return `<section class="container"><div class="card">${back}<h2>${title}</h2>${body}</div></section>`;
}
function goBack(){ view("dashboard"); }

/* ---------- BUSINESS TYPES ----------
   "pickup_goods" (Pickup / Goods Carrier) and "skilled_work" (Plumber,
   Electrician, Carpenter etc.) are new categories - both use the exact
   same self-registration + admin-verification + Local Directory flow as
   every other non-taxi type, no separate system needed. Every business
   type's registration/edit form also now includes an optional free-text
   "description" field (business.js's Directory rendering shows this to
   customers, so they can read what a listing actually offers/does before
   calling - not just its name/category). */
const TC_BUSINESS_TYPES={
 taxi_travel:"Taxi / Travel Agency",
 auto_rickshaw:"Auto Rickshaw",
 pickup_goods:"Pickup / Goods Carrier",
 restaurant:"Restaurant / Tea Shop",
 petrol_pump:"Petrol Pump",
 workshop:"Workshop",
 hospital:"Hospital",
 homestay:"Homestay / Resort / Hotel",
 skilled_work:"Skilled Work (Plumber, Electrician, Carpenter etc.)"
};
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
 const sel=document.querySelector("#"+selectId), other=document.querySelector("#"+otherId);
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
function tcIsTaxiType(businessType){
 return (businessType||"taxi_travel")==="taxi_travel";
}

/* ---------- LOGIN / AUTHENTICATION ---------- */
function getCurrentUser(){
 try{ return JSON.parse(localStorage.getItem("tc_user")||"null"); }catch(e){ return null; }
}
function getDeviceToken(){
 let t=localStorage.getItem("tc_device_token");
 if(!t){ t=crypto.randomUUID(); localStorage.setItem("tc_device_token",t); }
 return t;
}

function tcUpdateLoginIntro(){
 const el=document.querySelector("#loginIntro");
 if(!el) return;
 const role=document.querySelector('input[name="loginRole"]:checked')?.value;
 el.textContent = role==="customer"
  ? "Enter your name and mobile number to continue. Book a vehicle for your trip, or check estimated fares to your destination."
  : role==="owner"
  ? "Enter your name and mobile number to continue. Manage enquiries, quotations, trips and billing for your travel business."
  : "Enter your name and mobile number to continue. Manage a business, or book a vehicle and check fare estimates for your own trips.";
}
function tcToggleLoginBizType(){
 const role=document.querySelector('input[name="loginRole"]:checked')?.value;
 const wrap=document.querySelector("#loginBizTypeWrap");
 if(wrap) wrap.style.display=(role==="owner")?"":"none";
}

function renderLogin(){
 const inviteToken=new URLSearchParams(location.search).get("invite")||"";
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 document.querySelector("#app").innerHTML=`
 <div style="display:flex;align-items:center;justify-content:center;padding:30px 16px">
  <div style="background:#fff;border-radius:18px;max-width:360px;width:100%;padding:30px 26px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.12)">
   ${logo?`<img src="${logo}" style="width:56px;height:56px;border-radius:12px;margin-bottom:10px">`:""}
   <div style="font-weight:800;letter-spacing:1.5px;color:#082b49;font-size:17px">TRAVEL CONNECT</div>
   <div style="color:#6a7a87;font-size:12px;margin-bottom:16px">Professional Travel Business Platform</div>
   <p id="loginIntro" style="color:#6a7a87;font-size:13px;margin:0 0 18px;text-align:left">Enter your name and mobile number to continue. Manage a business, or book a vehicle and check fare estimates for your own trips.</p>
   <div style="text-align:left;margin-bottom:6px">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:6px;color:#172536">I am a...</label>
    <div style="display:flex;gap:8px">
     <label style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #c9d4dc;border-radius:9px;padding:10px;cursor:pointer;font-size:13px;font-weight:600"><input type="radio" name="loginRole" value="owner" onchange="tcUpdateLoginIntro();tcToggleLoginBizType()"> Business Owner</label>
     <label style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #c9d4dc;border-radius:9px;padding:10px;cursor:pointer;font-size:13px;font-weight:600"><input type="radio" name="loginRole" value="customer" onchange="tcUpdateLoginIntro();tcToggleLoginBizType()"> Customer</label>
    </div>
   </div>
   <div id="loginRoleWarn" style="color:#a12d2d;font-size:12px;min-height:16px;margin:4px 0 10px;text-align:left"></div>
   <div id="loginBizTypeWrap" style="display:none;text-align:left;margin-bottom:14px">
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

async function submitLogin(inviteToken){
 const roleEl=document.querySelector('input[name="loginRole"]:checked');
 const warnEl=document.querySelector("#loginRoleWarn");
 if(!roleEl){
  if(warnEl) warnEl.textContent="\u2b06\ufe0f Please choose Business Owner or Customer";
  return;
 }
 const role=roleEl.value;
 if(role==="owner"){
  const bizSel=document.querySelector("#loginBizType");
  if(!bizSel||!bizSel.value){
   if(warnEl) warnEl.textContent="\u2b06\ufe0f Please select what kind of business you have";
   return;
  }
 }
 if(warnEl) warnEl.textContent="";
 const name=document.querySelector("#loginName").value.trim();
 const mobile=document.querySelector("#loginMobile").value.trim();
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
  errBox.textContent="Network error \u2014 check your connection and try again.";
 }
}

function logout(){
 if(!confirm("Log out of Travel Connect on this device?")) return;
 localStorage.removeItem("tc_user");
 location.hash="";
 renderLogin();
}

async function tcLookupReturningUser(){
 const mobile=document.querySelector("#loginMobile")?.value.trim();
 if(!mobile) return;
 try{
  const res=await fetch("/api/auth?action=lookup&mobile="+encodeURIComponent(mobile));
  const data=await res.json();
  if(!data.ok||!data.found) return;
  const nameEl=document.querySelector("#loginName"), locEl=document.querySelector("#loginLocation"), pinEl=document.querySelector("#loginPincode");
  if(nameEl&&!nameEl.value&&data.name) nameEl.value=data.name;
  if(locEl&&!locEl.value&&data.location) locEl.value=data.location;
  if(pinEl&&!pinEl.value&&data.pincode) pinEl.value=data.pincode;
  const status=document.querySelector("#loginLocStatus");
  if(status&&(data.location||data.pincode)) status.textContent="Filled in from your last login \u2014 tap \ud83d\udccd only if you're somewhere different right now.";
 }catch(e){}
}
async function tcUseMyLocation(){
 const status=document.querySelector("#loginLocStatus");
 if(!navigator.geolocation){ if(status) status.textContent="Location isn't supported on this browser."; return; }
 if(status) status.textContent="Getting your location...";
 navigator.geolocation.getCurrentPosition(async (pos)=>{
  const lat=pos.coords.latitude, lon=pos.coords.longitude;
  window.tcLoginCoords={lat,lon};
  if(status) status.textContent="Looking up address...";
  try{
   const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`);
   const data=await res.json();
   const a=data.address||{};
   const place=a.suburb||a.town||a.city||a.village||a.county||"";
   const district=a.state_district||a.county||"";
   const combined=[place,district].filter(Boolean).filter((v,i,arr)=>arr.indexOf(v)===i).join(", ");
   const locEl=document.querySelector("#loginLocation"), pinEl=document.querySelector("#loginPincode");
   if(locEl&&combined) locEl.value=combined;
   if(pinEl&&a.postcode) pinEl.value=a.postcode;
   if(status) status.textContent="\u2705 Location added.";
  }catch(e){
   if(status) status.textContent="Got your location, but couldn't look up the address name \u2014 coordinates saved anyway.";
  }
 },()=>{
  if(status) status.textContent="Location permission denied \u2014 you can still type it in manually.";
 },{timeout:10000});
}

/* ---------- SERVER CONFIG SYNC ---------- */
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
async function pushConfigToServer(){
 try{
  await fetch("/api/config",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:adminToken(),config:{categories:db.categories,platform:db.platform,settings:db.settings}})});
 }catch(e){}
}
async function checkStillAllowed(){
 const user=getCurrentUser();
 if(!user) return;
 try{
  const res=await fetch("/api/auth?action=check&mobile="+encodeURIComponent(user.mobile)+"&device="+encodeURIComponent(getDeviceToken()));
  const data=await res.json();
  if(data.ok&&data.blocked){
   localStorage.removeItem("tc_user");
   toast("Your access has been blocked. Please contact the app owner.");
   renderLogin();
   return;
  }
  if(data.ok&&data.authorized===false){
   localStorage.removeItem("tc_user");
   toast("Your access has been removed. Please contact the app owner.");
   renderLogin();
   return;
  }
  if(data.ok&&!!data.isOwner!==!!user.isAppOwner){
   localStorage.setItem("tc_user",JSON.stringify({...user,isAppOwner:!!data.isOwner}));
   render();
  }
 }catch(e){}
}

/* ---------- ADMIN SESSION ---------- */
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
  errBox.textContent="Network error \u2014 check your connection and try again.";
 }
}
function adminLogout(){
 sessionStorage.removeItem("tc_admin_token");
 toast("Admin session ended on this device");
 admin();
}

/* ---------- APP PIN LOCK (per-device, local only) ---------- */
function tcPinHash(text){
 return crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)).then(buf=>[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join(""));
}
function tcHasPinSet(){ return !!localStorage.getItem("tc_pin_hash"); }
function tcPinUnlockedThisSession(){ return sessionStorage.getItem("tc_pin_unlocked")==="1"; }
function tcShowPinOverlay(mode){
 let el=document.querySelector("#tcPinOverlay");
 if(!el){
  el=document.createElement("div");
  el.id="tcPinOverlay";
  el.style.cssText="position:fixed;inset:0;z-index:99999;background:linear-gradient(160deg,#082b49,#0f5a55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  document.body.appendChild(el);
 }
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 const cardOpen=`<div style="background:#fff;border-radius:18px;max-width:340px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 12px 32px rgba(0,0,0,.35)">
  ${logo?`<img src="${logo}" style="width:56px;height:56px;border-radius:12px;margin-bottom:10px">`:""}
  <div style="font-weight:800;letter-spacing:1.5px;color:#082b49;font-size:16px">TRAVEL CONNECT</div>
  <div style="color:#6a7a87;font-size:12px;margin-bottom:16px">Professional Travel Business Platform</div>`;
 const cardClose=`</div>`;
 if(mode==="setup"){
  el.innerHTML=cardOpen+`
   <h2 style="margin:0 0 6px;color:#172536">Set an App PIN</h2>
   <p style="color:#6a7a87;font-size:13px;margin:0 0 18px">This keeps your business data private on this device \u2014 choose a 4-6 digit PIN you'll enter each time you reopen the app here.</p>
   <input id="tcPinNew" autocomplete="off" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="New PIN" style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:9px;border:1px solid #c9d4dc;width:180px;margin-bottom:10px">
   <input id="tcPinConfirm" autocomplete="off" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="Confirm PIN" style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:9px;border:1px solid #c9d4dc;width:180px;margin-bottom:14px">
   <div id="tcPinErr" style="color:#a12d2d;min-height:20px;margin-bottom:6px;font-size:13px"></div>
   <button onclick="tcSubmitPinSetup()" style="padding:11px 24px;border-radius:9px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:15px;width:100%">Set PIN</button>
  `+cardClose;
 }else{
  el.innerHTML=cardOpen+`
   <h2 style="margin:0 0 6px;color:#172536">Welcome back</h2>
   <p style="color:#6a7a87;font-size:13px;margin:0 0 18px">Enter your PIN to continue.</p>
   <input id="tcPinEntry" autocomplete="off" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="PIN" autofocus style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:9px;border:1px solid #c9d4dc;width:180px;margin-bottom:10px" onkeydown="if(event.key==='Enter')tcSubmitPinEntry()">
   <div id="tcPinErr" style="color:#a12d2d;min-height:20px;margin-bottom:6px;font-size:13px"></div>
   <button onclick="tcSubmitPinEntry()" style="padding:11px 24px;border-radius:9px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:15px;width:100%;margin-bottom:14px">Unlock</button>
   <div><a href="#" onclick="tcForgotPin();return false" style="color:#0b6b78;font-size:13px;font-weight:600">Forgot PIN?</a></div>
  `+cardClose;
  setTimeout(()=>document.querySelector("#tcPinEntry")?.focus(),50);
 }
}
function tcHidePinOverlay(){ document.querySelector("#tcPinOverlay")?.remove(); }
async function tcSubmitPinSetup(){
 const a=document.querySelector("#tcPinNew").value.trim(), b=document.querySelector("#tcPinConfirm").value.trim();
 const err=document.querySelector("#tcPinErr");
 if(!/^\d{4,6}$/.test(a)){ err.textContent="PIN must be 4-6 digits."; return; }
 if(a!==b){ err.textContent="PINs don't match."; return; }
 localStorage.setItem("tc_pin_hash",await tcPinHash(a));
 sessionStorage.setItem("tc_pin_unlocked","1");
 tcHidePinOverlay();
}
async function tcSubmitPinEntry(){
 const entered=document.querySelector("#tcPinEntry").value.trim();
 const err=document.querySelector("#tcPinErr");
 if((await tcPinHash(entered))===localStorage.getItem("tc_pin_hash")){
  sessionStorage.setItem("tc_pin_unlocked","1");
  tcHidePinOverlay();
 }else{
  err.textContent="Wrong PIN. Try again.";
  document.querySelector("#tcPinEntry").value="";
 }
}
function tcForgotPin(){
 if(!confirm("Forgetting your PIN will also log you out of this device \u2014 you'll need to log in again with your name and mobile number, then set a new PIN. Continue?")) return;
 localStorage.removeItem("tc_pin_hash");
 localStorage.removeItem("tc_user");
 sessionStorage.removeItem("tc_pin_unlocked");
 location.reload();
}
function tcCheckPinLock(){
 const user=getCurrentUser();
 if(!user) return;
 if(tcPinUnlockedThisSession()) return;
 tcShowPinOverlay(tcHasPinSet()?"entry":"setup");
}

/* ---------- HEADER + HAMBURGER MENU ---------- */
const TC_MENU_ONLY_VIEWS=["master","accounts","admin"];
function tcHideAdminTabs(){
 TC_MENU_ONLY_VIEWS.forEach(v=>{
  const btn=document.querySelector(`.tabs button[data-view="${v}"]`);
  if(btn) btn.style.display="none";
 });
}
function tcMenuItem(iconPaths,label,onclick,danger){
 const color=danger?"#a12d2d":"#0b6b78";
 const icon=`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</svg>`;
 return `<div style="cursor:pointer;display:flex;align-items:center;gap:14px;padding:13px 2px;border-bottom:1px solid #eef1f4" onclick="${onclick}">
  <div style="width:40px;height:40px;border-radius:50%;background:${danger?"#fdeceb":"#e8f5f4"};display:flex;align-items:center;justify-content:center;flex-shrink:0">${icon}</div>
  <div style="font-weight:600;color:${danger?"#a12d2d":"#172536"};font-size:14.5px">${label}</div>
 </div>`;
}
function tcOpenMenu(){
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 const logoutItem=tcMenuItem('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',"Log out of this device","closeModal();logout()",true);
 modal(`
  <div style="text-align:center;margin-bottom:4px">
   ${logo?`<img src="${logo}" style="width:38px;height:38px;border-radius:9px;margin-bottom:6px">`:""}
   <div style="font-weight:800;letter-spacing:1.5px;color:#082b49;font-size:13px">MENU</div>
   <div style="color:#6a7a87;font-size:11.5px">Owner / admin settings \u2014 password protected</div>
  </div>
  <div style="margin-top:8px">
  ${tcMenuItem('<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>',"Rate Master","closeModal();tcMenuNavPending=true;view('master')")}
  ${tcMenuItem('<rect x="3" y="6" width="18" height="13" rx="2"></rect><path d="M3 10h18"></path><circle cx="17" cy="14.5" r="1.3" fill="#0b6b78" stroke="none"></circle>',"Accounts","closeModal();tcMenuNavPending=true;view('accounts')")}
  ${tcMenuItem('<line x1="4" y1="6" x2="20" y2="6"></line><circle cx="8" cy="6" r="2" fill="#0b6b78" stroke="none"></circle><line x1="4" y1="12" x2="20" y2="12"></line><circle cx="16" cy="12" r="2" fill="#0b6b78" stroke="none"></circle><line x1="4" y1="18" x2="20" y2="18"></line><circle cx="10" cy="18" r="2" fill="#0b6b78" stroke="none"></circle>',"Admin","closeModal();tcMenuNavPending=true;view('admin')")}
  ${tcMenuItem('<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>',"Authorized Users (Login Allowlist)","closeModal();tcMenuNavPending=true;tcAuthorizedUsersPage()")}
  ${tcMenuItem('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',"Feedback / Suggestions","closeModal();tcMenuNavPending=true;tcOpenFeedbackAdmin()")}
  ${tcMenuItem('<circle cx="9" cy="7" r="4"></circle><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"></path><path d="M17 11l2 2 4-4"></path>',"Partner Plans (Free / Paid / Premium)","closeModal();tcMenuNavPending=true;tcOpenPartnerPlans()")}
  ${tcMenuItem('<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M9 9h6v6H9z"></path>',"All Travel Partners","closeModal();tcMenuNavPending=true;tcOpenAllPartnersAdmin()")}
  ${tcMenuItem('<circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><path d="M1 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>',"All Users (business owners &amp; customers)","closeModal();tcMenuNavPending=true;tcOpenAllUsersAdmin()")}
  ${tcMenuItem('<rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 3H8v4h8V3z"></path>',"All Vehicles (documents, any status)","closeModal();tcMenuNavPending=true;tcOpenAllVehiclesAdmin()")}
  ${tcMenuItem('<path d="M9 12l2 2 4-4"></path><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2 0 3.85.66 5.34 1.77"></path>',"Pending Approvals (Partners &amp; Vehicles)","closeModal();tcMenuNavPending=true;tcOpenPendingApprovals()")}
  ${tcMenuItem('<path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>',"Emergency Contacts","closeModal();tcMenuNavPending=true;tcOpenEmergencyAdmin()")}
  ${tcMenuItem('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>',"Useful Places","closeModal();tcMenuNavPending=true;tcOpenPlacesAdmin()")}
  ${tcMenuItem('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>',"Preview: Partner Page","closeModal();tcMenuNavPending=true;tcPreviewPartnerPage()")}
  ${tcMenuItem('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>',"Preview: Customer Page","closeModal();tcMenuNavPending=true;tcPreviewCustomerPage()")}
  ${logoutItem}
  </div>`);
}
function tcBuildPremiumHeader(){
 const topEl=document.querySelector(".top");
 if(!topEl) return;
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 const user=getCurrentUser();
 const showSos=user&&user.role==="owner";
 topEl.innerHTML=`
  <div style="display:flex;align-items:center;gap:10px">
   ${logo?`<img src="${logo}" style="width:36px;height:36px;border-radius:8px;background:#fff;padding:3px;flex-shrink:0">`:""}
   <div><b>TRAVEL CONNECT</b><small>Professional Travel Business Platform</small></div>
  </div>
  <div style="display:flex;align-items:center;gap:8px">
   ${showSos?`<button id="networkBtn" style="background:#c0392b;color:#fff;border-radius:20px;padding:8px 16px;font-weight:800;font-size:13px;letter-spacing:.5px;border:none">SOS</button>`:""}
   ${showSos?`<button id="tcMenuBtn" aria-label="Menu" style="background:rgba(255,255,255,.14);color:#fff;border-radius:9px;width:38px;height:38px;font-size:18px;border:none;display:flex;align-items:center;justify-content:center;padding:0;line-height:1">&#9776;</button>`:""}
  </div>`;
 if(showSos){
  document.querySelector("#networkBtn").onclick=()=>network();
  document.querySelector("#tcMenuBtn").onclick=tcOpenMenu;
 }
}

/* ---------- NAVIGATION / RENDER ---------- */
function render(){
 if(!getCurrentUser()){ renderLogin(); return; }
 checkStillAllowed();
 const user=getCurrentUser();
 const tabsEl=document.querySelector(".tabs");
 tcBuildPremiumHeader();
 if(user.role==="customer"){
  if(tabsEl) tabsEl.style.display="none";
  const v=location.hash.slice(1)||"";
  if(v==="activeboard") activeBoard();
  else if(v==="directory") tcRenderDirectory();
  else customerHome();
  return;
 }
 if(tabsEl) tabsEl.style.display="";
 tcHideAdminTabs();
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
 else if(v==="directory") tcRenderDirectory();
 else network();
}
window.addEventListener("hashchange",render);

let tcCurrentIsFromMenu=false;
let tcMenuNavPending=false;
function view(v){
 const base=(getCurrentUser()?.role==="customer")?"":"dashboard";
 if(v===base||v===""){
  history.pushState({tcBase:true},"",location.pathname+location.search+"#"+(v||"dashboard"));
  tcCurrentIsFromMenu=false;
 }else{
  if(!history.state||!history.state.tcPage){
   history.pushState({tcPage:true,fromMenu:tcMenuNavPending},"",location.pathname+location.search+"#"+v);
  }else{
   history.replaceState({tcPage:true,fromMenu:tcMenuNavPending},"",location.pathname+location.search+"#"+v);
  }
  tcCurrentIsFromMenu=tcMenuNavPending;
 }
 tcMenuNavPending=false;
 render();
 tcUpdateActiveTab();
}
function tcUpdateActiveTab(){
 const current=location.hash.slice(1)||"dashboard";
 document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("active",b.dataset.view===current));
}
window.addEventListener("hashchange",tcUpdateActiveTab);

let tcModalHistoryPushed=false, tcPreModalState=null, tcPreModalUrl=null;
function modal(html){
 modalBody.innerHTML=html;
 document.querySelector("#modal").classList.remove("hidden");
 if(!tcModalHistoryPushed){
  tcPreModalState=history.state; tcPreModalUrl=location.href;
  history.pushState({tcModal:true},"",location.href);
  tcModalHistoryPushed=true;
 }
}
function closeModal(){
 document.querySelector("#modal").classList.add("hidden");
 if(tcModalHistoryPushed){
  tcModalHistoryPushed=false;
  history.replaceState(tcPreModalState,"",tcPreModalUrl);
 }
}
window.addEventListener("popstate",function(){
 if(tcModalHistoryPushed){
  tcModalHistoryPushed=false;
  document.querySelector("#modal")?.classList.add("hidden");
  return;
 }
 const wasFromMenu=tcCurrentIsFromMenu;
 tcCurrentIsFromMenu=false;
 render();
 tcUpdateActiveTab();
 if(wasFromMenu&&(location.hash.slice(1)||"dashboard")==="dashboard") tcOpenMenu();
});

function tcOpenMenuPage(hashName,renderFn){
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

/* ---------- SWIPE NAVIGATION + PAGE TRANSITIONS ---------- */
function setupSwipeNav(){
 if(window._swipeNavReady) return;
 window._swipeNavReady=true;
 const order=["dashboard","enquiries","quotations","trips","billing","master","accounts"];
 const el=document.querySelector("#app");
 let startX=null,startY=null,dragging=false,curDx=0;
 function setX(px,withTransition){
  el.style.transition=withTransition?"transform 0.2s ease-out":"none";
  el.style.transform="translateX("+px+"px)";
 }
 document.addEventListener("touchstart",e=>{
  if(e.touches.length!==1){startX=null;return}
  const tag=(e.target.tagName||"").toLowerCase();
  if(["input","textarea","select","button","a"].includes(tag)||e.target.closest("#modal")){startX=null;return}
  let scrollAncestor=e.target;
  while(scrollAncestor&&scrollAncestor!==document.body){
   if(scrollAncestor.scrollWidth>scrollAncestor.clientWidth+2){ startX=null; return; }
   scrollAncestor=scrollAncestor.parentElement;
  }
  startX=e.touches[0].clientX; startY=e.touches[0].clientY;
  dragging=false; curDx=0;
 },{passive:true});
 document.addEventListener("touchmove",e=>{
  if(startX==null) return;
  const dx=e.touches[0].clientX-startX, dy=e.touches[0].clientY-startY;
  if(!dragging){
   if(Math.abs(dx)<10&&Math.abs(dy)<10) return;
   if(Math.abs(dx)<=Math.abs(dy)*1.2){ startX=null; return; }
   dragging=true;
  }
  const idx=order.indexOf(location.hash.slice(1)||"dashboard");
  let clamped=dx;
  if(dx>0&&idx===0) clamped=dx*0.3;
  if(dx<0&&idx===order.length-1) clamped=dx*0.3;
  curDx=clamped;
  setX(clamped,false);
 },{passive:true});
 document.addEventListener("touchend",()=>{
  if(startX==null) return;
  const wasDragging=dragging;
  startX=null; dragging=false;
  if(!wasDragging) return;
  const dx=curDx;
  const idx=order.indexOf(location.hash.slice(1)||"dashboard");
  const threshold=70;
  if(dx<-threshold&&idx<order.length-1){
   setX(-Math.round(window.innerWidth*0.25),true);
   setTimeout(()=>{ setX(0,false); view(order[idx+1]); },180);
  }else if(dx>threshold&&idx>0){
   setX(Math.round(window.innerWidth*0.25),true);
   setTimeout(()=>{ setX(0,false); view(order[idx-1]); },180);
  }else{
   setX(0,true);
  }
 },{passive:true});
}
function setupPageTransitions(){
 if(window._pageTransReady) return;
 window._pageTransReady=true;
 const el=document.querySelector("#app");
 if(!el) return;
 const style=document.createElement("style");
 style.textContent=`@keyframes tcPageIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
 #app.tc-anim{animation:tcPageIn 0.22s ease-out}`;
 document.head.appendChild(style);
 const observer=new MutationObserver(()=>{
  el.classList.remove("tc-anim");
  void el.offsetWidth;
  el.classList.add("tc-anim");
 });
 observer.observe(el,{childList:true});
}

/* ---------- BOOTSTRAP (part 1) ----------
   Only what's SAFE to run before business.js/directory.js/customer-
   safety.js have loaded - none of these touch a function defined in
   those later files. The actual first render() call is deliberately
   NOT here - it needs dashboard()/customerHome()/startSosPolling() etc.
   from those other files, so it's the last line of customer-safety.js
   (the last of the four files to load) instead. Calling it here, before
   those files exist yet, is exactly the "loaded but not defined yet"
   bug this whole rewrite was meant to eliminate. */
migrate();
tcCheckPinLock();
setupSwipeNav();
setupPageTransitions();
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>view(b.dataset.view));
