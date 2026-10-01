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
/* Indian-style date/time formatting (DD-MM-YYYY, 12-hour AM/PM) used
   everywhere a stored date/timestamp is shown to the person, instead of
   the raw ISO string (YYYY-MM-DD) the database/JS naturally returns.
   Accepts a plain "YYYY-MM-DD" date, a full ISO timestamp, or a Date
   object; returns "" for anything missing/unparseable so callers can
   still show their own fallback text (e.g. "-"). */
function tcFormatDate(dateStr){
 if(!dateStr) return "";
 const d=(dateStr instanceof Date)?dateStr:new Date(dateStr.length===10?dateStr+"T00:00:00":dateStr);
 if(isNaN(d)) return "";
 const dd=String(d.getDate()).padStart(2,"0"), mm=String(d.getMonth()+1).padStart(2,"0"), yyyy=d.getFullYear();
 return dd+"-"+mm+"-"+yyyy;
}
function tcFormatDateTime(dateStr){
 if(!dateStr) return "";
 const d=(dateStr instanceof Date)?dateStr:new Date(dateStr);
 if(isNaN(d)) return "";
 let h=d.getHours(); const m=String(d.getMinutes()).padStart(2,"0"); const ampm=h>=12?"PM":"AM";
 h=h%12; if(h===0) h=12;
 return tcFormatDate(d)+", "+h+":"+m+" "+ampm;
}
/* ---------- LOCATION (shared by calls, WhatsApp, messages) ----------
   Every place that reads the phone's location used one high-accuracy GPS
   attempt with a 4-6 second wait and gave up silently, so it failed
   indoors or when GPS was slow - and never said why. This tries precise
   GPS first and, if that merely times out or can't fix a position, falls
   back to the phone's rough (network/Wi-Fi) location, which almost always
   works. Returns {lat,lon,accuracy} on success or {error:code} where code
   is 1 = permission blocked, 2 = position unavailable, 3 = timed out,
   0 = not supported. quick=true is for a call/WhatsApp tap: a single
   fast attempt (a recent cached location is fine) so dialling is never
   held up. */
function tcGetLocation(quick){
 const attempt=(high,timeout,maxAge)=>new Promise(resolve=>{
  if(!navigator.geolocation){ resolve({error:0}); return; }
  navigator.geolocation.getCurrentPosition(
   p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude,accuracy:p.coords.accuracy}),
   e=>resolve({error:(e&&e.code)||2}),
   {enableHighAccuracy:high,timeout:timeout,maximumAge:maxAge});
 });
 if(quick) return attempt(false,5000,300000);
 return attempt(true,8000,0).then(r=>(r.error===undefined||r.error===1||r.error===0)?r:attempt(false,10000,120000));
}
function tcLocationErrorText(code){
 if(code===1) return "Location is blocked for this app. Allow Location for it in your phone settings (Chrome: menu > Settings > Site settings > Location), then tick the box again.";
 if(code===0) return "This phone or browser does not support location.";
 if(code===3) return "Finding your location took too long. Make sure Location (GPS) is ON in your phone, move near a window or outdoors, then tick the box again.";
 return "The phone could not find your location. Turn ON Location (GPS) in your phone settings, then tick the box again.";
}

/* ---------- DD-MM-YYYY DATE ENTRY ----------
   The native <input type="date"> always shows dates in the phone's own
   language/region order (often month-day-year), which code cannot change.
   These date boxes are plain text boxes that always show DD-MM-YYYY
   (dashes are added automatically while typing), with a calendar button
   beside them that opens the phone's normal date picker and writes the
   chosen date back in DD-MM-YYYY. Everywhere else in the app the box still
   behaves like a date input: reading its .value gives the ISO date
   (YYYY-MM-DD) or "" and setting .value with an ISO date shows it as
   DD-MM-YYYY - done by wrapping the input "value" property only for
   elements marked data-tcdate, so no other input is affected and no
   existing code reading/writing these fields had to change. */
const _tcValueDesc=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
function tcRawValue(el){ return _tcValueDesc.get.call(el); }
function tcSetRaw(el,v){ _tcValueDesc.set.call(el,v); }
function tcParseDmy(str){
 const m=String(str||"").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
 if(!m) return null;
 const iso=m[3]+"-"+m[2]+"-"+m[1];
 const d=new Date(iso+"T00:00:00");
 if(isNaN(d)||d.getDate()!==+m[1]||d.getMonth()+1!==+m[2]) return null;
 return iso;
}
Object.defineProperty(HTMLInputElement.prototype,"value",{
 configurable:true,
 get(){
  const raw=_tcValueDesc.get.call(this);
  if(this.hasAttribute("data-tcdate")) return tcParseDmy(raw)||"";
  return raw;
 },
 set(v){
  if(this.hasAttribute("data-tcdate")){ _tcValueDesc.set.call(this,v?tcFormatDate(v):""); return; }
  _tcValueDesc.set.call(this,v);
 }
});
function tcDateInputHtml(id,isoValue){
 return `<span style="position:relative;display:flex;gap:6px;align-items:stretch">
  <input id="${id}" data-tcdate inputmode="numeric" maxlength="10" placeholder="DD-MM-YYYY" value="${esc(tcFormatDate(isoValue))}" oninput="tcAutoDashDate(this)" onblur="tcCheckDateInput(this)" style="flex:1;min-width:0">
  <button type="button" onclick="tcPickDate('${id}')" title="Pick from calendar" style="padding:0 12px">&#128197;</button>
  <input type="date" id="${id}__picker" tabindex="-1" aria-hidden="true" onchange="tcPickerChanged('${id}')" style="position:absolute;right:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0;padding:0">
 </span>`;
}
function tcAutoDashDate(el){
 const d=tcRawValue(el).replace(/\D/g,"").slice(0,8);
 let out=d;
 if(d.length>4) out=d.slice(0,2)+"-"+d.slice(2,4)+"-"+d.slice(4);
 else if(d.length>2) out=d.slice(0,2)+"-"+d.slice(2);
 tcSetRaw(el,out);
 el.style.border="";
}
function tcCheckDateInput(el){
 const raw=tcRawValue(el).trim();
 if(raw&&tcParseDmy(raw)===null){
  el.style.border="2px solid #c0392b";
  toast("Enter the date as DD-MM-YYYY, for example 25-12-2026");
 }else{
  el.style.border="";
 }
}
function tcPickDate(id){
 const txt=document.getElementById(id), p=document.getElementById(id+"__picker");
 if(!txt||!p) return;
 p.value=tcParseDmy(tcRawValue(txt))||"";
 try{ if(p.showPicker) p.showPicker(); else p.click(); }catch(e){ p.click(); }
}
function tcPickerChanged(id){
 const txt=document.getElementById(id), p=document.getElementById(id+"__picker");
 if(!txt||!p||!p.value) return;
 tcSetRaw(txt,tcFormatDate(p.value));
 txt.style.border="";
 txt.dispatchEvent(new Event("change",{bubbles:true}));
}
/* Returns "" if left blank, an ISO "YYYY-MM-DD" string if valid, or null if
   something was typed that is not a real date. */
function tcReadDateInput(id){
 const el=document.querySelector("#"+id);
 if(!el) return "";
 const raw=tcRawValue(el).trim();
 if(!raw) return "";
 return tcParseDmy(raw);
}
/* For a bare "HH:MM" (24-hour) value from an <input type="time">, with no
   date attached - e.g. Pickup Time / Closing Time on a quotation/bill. */
function tcFormatTime(timeStr){
 if(!timeStr) return "";
 const parts=timeStr.split(":");
 if(parts.length<2) return timeStr;
 let h=parseInt(parts[0],10), m=parts[1];
 if(isNaN(h)) return timeStr;
 const ampm=h>=12?"PM":"AM";
 h=h%12; if(h===0) h=12;
 return h+":"+m+" "+ampm;
}
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
/* No silent default - when nothing has been chosen yet (selected is
   null/undefined), a forced "-- Select --" placeholder is shown instead
   of quietly marking Taxi/Travel Agency as selected. This exact silent-
   default bug is what the login page's role/business-type fix earlier
   this session was meant to prevent - reintroducing it here for the
   business-type dropdown specifically defeats that fix, since
   submitLogin()'s "did they actually pick one" check relies on the
   dropdown genuinely having no value until the person chooses one. An
   EXISTING partner's own business type (editing their details) still
   shows correctly selected, since `selected` is a real value there. */
function tcBusinessTypeOptions(selected){
 const isKnown=selected==null||TC_BUSINESS_TYPES.hasOwnProperty(selected);
 let html=selected==null?`<option value="">-- Select --</option>`:"";
 html+=Object.entries(TC_BUSINESS_TYPES).map(([k,label])=>`<option value="${k}"${k===selected?" selected":""}>${label}</option>`).join("");
 html+=`<option value="other"${(selected!=null&&!isKnown)?" selected":""}>Other (please specify)</option>`;
 return html;
}
function tcBizLabel(businessType){
 if(tcLang()==="ml"&&TC_BUSINESS_TYPES_ML[businessType]) return TC_BUSINESS_TYPES_ML[businessType];
 return TC_BUSINESS_TYPES[businessType]||businessType||"Taxi / Travel Agency";
}
/* Only "Skilled Work" carries a parenthesised "(Plumber, Electrician,
   Carpenter etc.)" hint - genuinely useful in the registration dropdown
   (where someone is choosing a CATEGORY and needs examples of what
   belongs in it), but actively misleading once a specific person's own
   stated trade (business_subtype, e.g. "Tree cutting") is shown right
   next to it: "Skilled Work (Plumber, Electrician, Carpenter etc.) - Tree
   cutting" reads as if the examples are describing THIS person, when
   "Tree cutting" isn't even one of them. tcBizDisplayLabel is what every
   listing (directory, active board, admin lists) should use instead of
   tcBizLabel+subtype directly - it drops the parenthesised examples
   whenever a specific subtype is actually known, and falls back to the
   normal full label otherwise (and for every other category, which never
   had this problem to begin with). */
function tcBizLabelShort(businessType){
 if(businessType==="skilled_work") return tcLang()==="ml"?"സ്കിൽഡ് വർക്ക്":"Skilled Work";
 return tcBizLabel(businessType);
}
function tcBizDisplayLabel(businessType,subtype){
 if(subtype) return tcBizLabelShort(businessType)+" - "+subtype;
 return tcBizLabel(businessType);
}
function tcBizTypeFieldHtml(selectId,otherId,selected,skillId,selectedSkill){
 const isKnown=selected==null||TC_BUSINESS_TYPES.hasOwnProperty(selected);
 const otherValue=isKnown?"":selected;
 const skillPart=skillId?`
  <input id="${skillId}" placeholder="What kind of work? (e.g. Plumber, Electrician, Tree climbing/spraying, Carpenter)" value="${esc(selectedSkill||"")}" style="${selected==="skilled_work"?"":"display:none;"}margin-top:6px;width:100%;box-sizing:border-box">`:"";
 return `<select id="${selectId}" onchange="tcToggleOtherBizType('${selectId}','${otherId}'${skillId?",'"+skillId+"'":""})">${tcBusinessTypeOptions(selected)}</select>
  <input id="${otherId}" placeholder="Enter your business category" value="${esc(otherValue)}" style="${isKnown?"display:none;":""}margin-top:6px;width:100%;box-sizing:border-box">${skillPart}`;
}
function tcToggleOtherBizType(selectId,otherId,skillId){
 const sel=document.querySelector("#"+selectId), other=document.querySelector("#"+otherId);
 if(!sel||!other) return;
 other.style.display=sel.value==="other"?"":"none";
 if(skillId){
  const skill=document.querySelector("#"+skillId);
  if(skill) skill.style.display=sel.value==="skilled_work"?"":"none";
 }
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
 el.textContent = role==="customer"?tcT("login_intro_customer"):role==="owner"?tcT("login_intro_owner"):tcT("login_intro_default");
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
   <div style="color:#6a7a87;font-size:12px;margin-bottom:16px">${tcT("login_platform_tagline")}</div>
   <p id="loginIntro" style="color:#6a7a87;font-size:13px;margin:0 0 18px;text-align:left">${tcT("login_intro_default")}</p>
   <div style="text-align:left;margin-bottom:6px">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:6px;color:#172536">${tcT("login_role_label")}</label>
    <div style="display:flex;gap:8px">
     <label style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #c9d4dc;border-radius:9px;padding:10px;cursor:pointer;font-size:13px;font-weight:600"><input type="radio" name="loginRole" value="owner" onchange="tcUpdateLoginIntro();tcToggleLoginBizType()"> ${tcT("login_role_owner")}</label>
     <label style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #c9d4dc;border-radius:9px;padding:10px;cursor:pointer;font-size:13px;font-weight:600"><input type="radio" name="loginRole" value="customer" onchange="tcUpdateLoginIntro();tcToggleLoginBizType()"> ${tcT("login_role_customer")}</label>
    </div>
   </div>
   <div id="loginRoleWarn" style="color:#a12d2d;font-size:12px;min-height:16px;margin:4px 0 10px;text-align:left"></div>
   <div id="loginBizTypeWrap" style="display:none;text-align:left;margin-bottom:14px">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">${tcT("login_biztype_label")}</label>
    ${tcBizTypeFieldHtml("loginBizType","loginBizTypeOther")}
   </div>
   <div style="text-align:left">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">${tcT("login_name_label")}</label>
    <input id="loginName" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:12px;font-size:15px;box-sizing:border-box">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">${tcT("login_mobile_label")}</label>
    <input id="loginMobile" type="tel" onblur="tcLookupReturningUser()" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:12px;font-size:15px;box-sizing:border-box">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">${tcT("login_email_label")}</label>
    <input id="loginEmail" type="email" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:12px;font-size:15px;box-sizing:border-box">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">${tcT("login_location_label")}</label>
    <div style="display:flex;gap:6px;margin-bottom:12px">
     <input id="loginLocation" style="flex:1;padding:11px;border-radius:9px;border:1px solid #c9d4dc;font-size:15px;box-sizing:border-box">
     <button type="button" onclick="tcUseMyLocation()" title="Use my current location" style="padding:0 12px;border-radius:9px;border:1px solid #c9d4dc;background:#f5f8fa;font-size:16px">&#128205;</button>
    </div>
    <div id="loginLocStatus" style="font-size:11.5px;color:#6a7a87;margin:-8px 0 10px"></div>
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">${tcT("login_pincode_label")}</label>
    <input id="loginPincode" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:6px;font-size:15px;box-sizing:border-box">
   </div>
   <div id="loginError" style="color:#a12d2d;font-size:13px;min-height:18px;margin:6px 0 10px"></div>
   <button class="primary" onclick="submitLogin('${inviteToken}')" style="width:100%;padding:12px;border-radius:9px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:15px">${tcT("login_continue")}</button>
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
  <div style="color:#6a7a87;font-size:12px;margin-bottom:16px">${tcT("login_platform_tagline")}</div>`;
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
 const logoutItem=tcMenuItem('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',tcT("menu_logout"),"closeModal();logout()",true);
 modal(`
  <div style="text-align:center;margin-bottom:4px">
   ${logo?`<img src="${logo}" style="width:38px;height:38px;border-radius:9px;margin-bottom:6px">`:""}
   <div style="font-weight:800;letter-spacing:1.5px;color:#082b49;font-size:13px">${tcT("menu_title")}</div>
   <div style="color:#6a7a87;font-size:11.5px">${tcT("menu_sub")}</div>
   <div style="display:flex;justify-content:center;gap:6px;margin-top:10px" onclick="event.stopPropagation()">
    <button onclick="closeModal();tcSetLang('en')" style="padding:6px 14px;font-size:12px;border-radius:14px;border:1px solid #c9d4dc;background:${tcLang()==='en'?'#0b6b78':'#fff'};color:${tcLang()==='en'?'#fff':'#333'}">English</button>
    <button onclick="closeModal();tcSetLang('ml')" style="padding:6px 14px;font-size:12px;border-radius:14px;border:1px solid #c9d4dc;background:${tcLang()==='ml'?'#0b6b78':'#fff'};color:${tcLang()==='ml'?'#fff':'#333'}">മലയാളം</button>
   </div>
  </div>
  <div style="margin-top:8px">
  ${tcMenuItem('<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>',tcT("menu_rate_master"),"closeModal();tcMenuNavPending=true;view('master')")}
  ${tcMenuItem('<rect x="3" y="6" width="18" height="13" rx="2"></rect><path d="M3 10h18"></path><circle cx="17" cy="14.5" r="1.3" fill="#0b6b78" stroke="none"></circle>',tcT("menu_accounts"),"closeModal();tcMenuNavPending=true;view('accounts')")}
  ${tcMenuItem('<line x1="4" y1="6" x2="20" y2="6"></line><circle cx="8" cy="6" r="2" fill="#0b6b78" stroke="none"></circle><line x1="4" y1="12" x2="20" y2="12"></line><circle cx="16" cy="12" r="2" fill="#0b6b78" stroke="none"></circle><line x1="4" y1="18" x2="20" y2="18"></line><circle cx="10" cy="18" r="2" fill="#0b6b78" stroke="none"></circle>',tcT("menu_admin"),"closeModal();tcMenuNavPending=true;view('admin')")}
  ${tcMenuItem('<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>',tcT("menu_authorized_users"),"closeModal();tcMenuNavPending=true;tcAuthorizedUsersPage()")}
  ${tcMenuItem('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',tcT("menu_feedback"),"closeModal();tcMenuNavPending=true;tcOpenFeedbackAdmin()")}
  ${tcMenuItem('<circle cx="9" cy="7" r="4"></circle><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"></path><path d="M17 11l2 2 4-4"></path>',tcT("menu_partner_plans"),"closeModal();tcMenuNavPending=true;tcOpenPartnerPlans()")}
  ${tcMenuItem('<rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M9 9h6v6H9z"></path>',tcT("menu_all_partners"),"closeModal();tcMenuNavPending=true;tcOpenAllPartnersAdmin()")}
  ${tcMenuItem('<circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path><path d="M1 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path>',tcT("menu_all_users"),"closeModal();tcMenuNavPending=true;tcOpenAllUsersAdmin()")}
  ${tcMenuItem('<rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 3H8v4h8V3z"></path>',tcT("menu_all_vehicles"),"closeModal();tcMenuNavPending=true;tcOpenAllVehiclesAdmin()")}
  ${tcMenuItem('<path d="M9 12l2 2 4-4"></path><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2 0 3.85.66 5.34 1.77"></path>',tcT("menu_pending_approvals"),"closeModal();tcMenuNavPending=true;tcOpenPendingApprovals()")}
  ${tcMenuItem('<path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>',tcT("menu_emergency_contacts"),"closeModal();tcMenuNavPending=true;tcOpenEmergencyAdmin()")}
  ${tcMenuItem('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>',tcT("menu_useful_places"),"closeModal();tcMenuNavPending=true;tcOpenPlacesAdmin()")}
  ${tcMenuItem('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>',tcT("menu_preview_partner"),"closeModal();tcMenuNavPending=true;tcPreviewPartnerPage()")}
  ${tcMenuItem('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>',tcT("menu_preview_customer"),"closeModal();tcMenuNavPending=true;tcPreviewCustomerPage()")}
  ${logoutItem}
  </div>`);
}
/* ---------- MALAYALAM / ENGLISH TRANSLATION ----------
   One flat dictionary, used anywhere in the app via tcT("key") - returns
   the Malayalam text when the person has switched to Malayalam, English
   otherwise (and English itself if a key is somehow missing, so a typo
   here never shows a blank or a raw key name on screen). The choice is
   saved in localStorage (not sessionStorage) so it carries over the next
   time the app is opened, for both business owners and customers - the
   toggle itself lives in the header, reachable from every page.
   Deliberately scoped to navigation, buttons, and the pages/labels a
   Taxi/Travel Agency owner rarely needs to touch line-by-line - the
   Quotation/Billing/Rate Master FORMS themselves (rate figures, KM/hour
   fields, discount types etc.) stay in English by design: that owner
   already works in English there, and mistranslating a financial term
   risks real billing confusion. Non-taxi partners (Auto Rickshaw, Skilled
   Work, etc.) and customers get full coverage of their own pages instead,
   since they are the audience most likely to need it. */
const TC_STRINGS={
 tab_dashboard:{en:"Dashboard",ml:"ഡാഷ്ബോർഡ്"},
 tab_enquiries:{en:"Enquiries",ml:"അന്വേഷണങ്ങൾ"},
 tab_quotations:{en:"Quotations",ml:"ക്വട്ടേഷനുകൾ"},
 tab_trips:{en:"Trips",ml:"ട്രിപ്പുകൾ"},
 tab_billing:{en:"Billing",ml:"ബില്ലിംഗ്"},
 menu_rate_master:{en:"Rate Master",ml:"റേറ്റ് മാസ്റ്റർ"},
 menu_accounts:{en:"Accounts",ml:"അക്കൗണ്ട്സ്"},
 menu_admin:{en:"Admin",ml:"അഡ്മിൻ"},
 menu_authorized_users:{en:"Authorized Users (Login Allowlist)",ml:"അനുവദിച്ച നമ്പറുകൾ (ലോഗിൻ)"},
 menu_messages:{en:"Messages",ml:"സന്ദേശങ്ങൾ"},
 menu_feedback:{en:"Feedback / Suggestions",ml:"അഭിപ്രായം / നിർദ്ദേശം"},
 menu_partner_plans:{en:"Partner Plans (Free / Paid)",ml:"പാർട്ണർ പ്ലാനുകൾ"},
 menu_preview_partner:{en:"Preview: Partner Page",ml:"പ്രിവ്യൂ: പാർട്ണർ പേജ്"},
 menu_preview_customer:{en:"Preview: Customer Page",ml:"പ്രിവ്യൂ: കസ്റ്റമർ പേജ്"},
 menu_logout:{en:"Log out of this device",ml:"ഈ ഫോണിൽ നിന്ന് ലോഗ് ഔട്ട്"},
 menu_title:{en:"MENU",ml:"മെനു"},
 menu_sub:{en:"Owner / admin settings - password protected",ml:"ഉടമ / അഡ്മിൻ സെറ്റിംഗ്സ് - പാസ്‌വേഡ് സംരക്ഷിതം"},
 new_enquiry:{en:"New Enquiry",ml:"പുതിയ അന്വേഷണം"},
 new_quotation:{en:"New Quotation",ml:"പുതിയ ക്വട്ടേഷൻ"},
 quick_bill:{en:"Quick Bill",ml:"ക്വിക്ക് ബിൽ"},
 my_business_vehicles:{en:"My Business & Vehicles",ml:"എന്റെ ബിസിനസ് & വാഹനങ്ങൾ"},
 active_vehicles_board:{en:"Active Vehicles Board",ml:"ആക്ടീവ് വെഹിക്കിൾ ബോർഡ്"},
 local_directory:{en:"Local Directory (autos, restaurants, workshops...)",ml:"ലോക്കൽ ഡയറക്ടറി (ഓട്ടോ, ഹോട്ടൽ, വർക്ക്ഷോപ്പ്...)"},
 edit_business_details:{en:"Edit Business Details",ml:"ബിസിനസ് വിവരങ്ങൾ എഡിറ്റ് ചെയ്യുക"},
 drivers_metric:{en:"Drivers",ml:"ഡ്രൈവർമാർ"},
 vehicles_metric:{en:"Vehicles",ml:"വാഹനങ്ങൾ"},
 saved_quotations_metric:{en:"Saved Quotations",ml:"സൂക്ഷിച്ച ക്വട്ടേഷനുകൾ"},
 trips_metric:{en:"Trips",ml:"ട്രിപ്പുകൾ"},
 business_workflow_title:{en:"Business workflow",ml:"ബിസിനസ് നടപടിക്രമം"},
 business_workflow_text:{en:"Enquiry -> Quotation -> Confirmation -> Trip -> Final Bill -> Payment -> Accounts",ml:"അന്വേഷണം -> ക്വട്ടേഷൻ -> സ്ഥിരീകരണം -> ട്രിപ്പ് -> ഫൈനൽ ബിൽ -> പേയ്മെന്റ് -> അക്കൗണ്ട്സ്"},
 premium_notice:{en:"Premium - your own business name/contact shown on every bill & quotation",ml:"പ്രീമിയം - നിങ്ങളുടെ സ്വന്തം ബിസിനസ് പേരും നമ്പറും എല്ലാ ബില്ലിലും ക്വട്ടേഷനിലും കാണിക്കും"},
 free_notice:{en:"Free plan - bills currently show Travel Connect's contact details. Upgrade to Premium to show YOUR business name & contact prominently. Contact Travel Connect to upgrade.",ml:"ഫ്രീ പ്ലാൻ - ബില്ലുകളിൽ ഇപ്പോൾ Travel Connect-ന്റെ നമ്പർ ആണ് കാണിക്കുന്നത്. നിങ്ങളുടെ സ്വന്തം പേരും നമ്പറും കാണിക്കാൻ പ്രീമിയം ആക്കുക. Travel Connect-മായി ബന്ധപ്പെടുക."},
 search_local_directory:{en:"Search the Local Directory",ml:"ലോക്കൽ ഡയറക്ടറി സെർച്ച് ചെയ്യുക"},
 owner_label:{en:"Owner",ml:"ഉടമ"},
 edit_details:{en:"Edit Details",ml:"വിവരങ്ങൾ എഡിറ്റ് ചെയ്യുക"},
 available_now:{en:"Active now",ml:"ഇപ്പോൾ ആക്ടീവ്"},
 mark_as_active:{en:"Mark as Active",ml:"ആക്ടീവ് ആക്കുക"},
 available_sub_on:{en:"Customers searching nearby will see you as Active",ml:"അടുത്തുള്ള കസ്റ്റമേഴ്സ് നിങ്ങളെ ആക്ടീവ് ആയി കാണും"},
 available_sub_off:{en:"Turn on so customers can find you right now",ml:"കസ്റ്റമേഴ്സിന് ഇപ്പോൾ തന്നെ നിങ്ങളെ കണ്ടെത്താൻ ഓൺ ചെയ്യുക"},
 billing_details_title:{en:"Billing Details",ml:"ബില്ലിംഗ് വിവരങ്ങൾ"},
 billing_details_sub:{en:"the name/phone/UPI shown on YOUR bills",ml:"നിങ്ങളുടെ ബില്ലുകളിൽ കാണിക്കുന്ന പേര്/ഫോൺ/UPI"},
 add_vehicle:{en:"+ Add Vehicle",ml:"+ വാഹനം ചേർക്കുക"},
 my_vehicles:{en:"My Vehicles",ml:"എന്റെ വാഹനങ്ങൾ"},
 edit_vehicle_documents:{en:"Edit Vehicle / Documents",ml:"വാഹനം / രേഖകൾ എഡിറ്റ് ചെയ്യുക"},
 current_location_placeholder:{en:"Current location, if different from your registered garage (optional)",ml:"ഇപ്പോഴത്തെ സ്ഥലം, ഗാരേജിൽ നിന്ന് വ്യത്യസ്തമാണെങ്കിൽ (ഓപ്ഷണൽ)"},
 set_active_hours:{en:"Set this vehicle's own active hours (optional)",ml:"ഈ വാഹനത്തിന്റെ സ്വന്തം സമയം സെറ്റ് ചെയ്യുക (ഓപ്ഷണൽ)"},
 switch_business:{en:"Switch to another of my businesses",ml:"എന്റെ മറ്റൊരു ബിസിനസിലേക്ക് മാറുക"},
 pending_verification:{en:"(Pending admin verification)",ml:"(അഡ്മിൻ അംഗീകാരം കാത്തിരിക്കുന്നു)"},
 verified_badge:{en:"Verified",ml:"അംഗീകരിച്ചു"},
 messages_title:{en:"Messages",ml:"സന്ദേശങ്ങൾ"},
 messages_sub_owner:{en:"Customers' messages and your replies",ml:"കസ്റ്റമേഴ്സിന്റെ സന്ദേശങ്ങളും നിങ്ങളുടെ മറുപടിയും"},
 logout_confirm:{en:"Log out of Travel Connect on this device?",ml:"ഈ ഫോണിൽ നിന്ന് Travel Connect ലോഗ് ഔട്ട് ചെയ്യണോ?"},
 login_title:{en:"Welcome to Travel Connect",ml:"Travel Connect-ലേക്ക് സ്വാഗതം"},
 login_role_label:{en:"I am a...",ml:"ഞാൻ..."},
 login_role_owner:{en:"Business Owner",ml:"ബിസിനസ് ഉടമ"},
 login_role_customer:{en:"Customer",ml:"കസ്റ്റമർ"},
 login_biztype_label:{en:"What kind of business?",ml:"എന്ത് തരം ബിസിനസ്?"},
 login_name_label:{en:"Your name",ml:"നിങ്ങളുടെ പേര്"},
 login_mobile_label:{en:"Mobile number",ml:"മൊബൈൽ നമ്പർ"},
 login_continue:{en:"Continue",ml:"തുടരുക"},
 menu_all_partners:{en:"All Travel Partners",ml:"എല്ലാ ട്രാവൽ പാർട്ണർമാരും"},
 menu_all_users:{en:"All Users (business owners & customers)",ml:"എല്ലാ യൂസർമാരും (ബിസിനസ് ഉടമകളും കസ്റ്റമേഴ്സും)"},
 menu_all_vehicles:{en:"All Vehicles (documents, any status)",ml:"എല്ലാ വാഹനങ്ങളും (രേഖകൾ)"},
 menu_pending_approvals:{en:"Pending Approvals (Partners & Vehicles)",ml:"അംഗീകാരം കാത്തിരിക്കുന്നവ"},
 menu_emergency_contacts:{en:"Emergency Contacts",ml:"എമർജൻസി കോൺടാക്ടുകൾ"},
 menu_useful_places:{en:"Useful Places",ml:"ഉപകാരപ്രദമായ സ്ഥലങ്ങൾ"},
 login_platform_tagline:{en:"Connecting Everything",ml:"എല്ലാം ബന്ധിപ്പിക്കുന്നു"},
 login_intro_default:{en:"Your all-in-one local platform for travel, business and emergency help. Enter your name and mobile number to continue. Manage a business, or book a vehicle and check fare estimates for your own trips.",ml:"യാത്ര, ബിസിനസ്, എമർജൻസി സഹായം - എല്ലാം ഒരിടത്ത്. തുടരാൻ നിങ്ങളുടെ പേരും മൊബൈൽ നമ്പറും നൽകുക. ഒരു ബിസിനസ് നടത്താം, അല്ലെങ്കിൽ വാഹനം ബുക്ക് ചെയ്യാനും ചാർജ് അറിയാനും സാധിക്കും."},
 login_intro_customer:{en:"Your all-in-one local platform for travel, business and emergency help. Enter your name and mobile number to continue. Book a vehicle for your trip, or check estimated fares to your destination.",ml:"യാത്ര, ബിസിനസ്, എമർജൻസി സഹായം - എല്ലാം ഒരിടത്ത്. തുടരാൻ നിങ്ങളുടെ പേരും മൊബൈൽ നമ്പറും നൽകുക. നിങ്ങളുടെ യാത്രയ്ക്ക് വാഹനം ബുക്ക് ചെയ്യാം, അല്ലെങ്കിൽ ചാർജ് എത്രയാണെന്ന് അറിയാം."},
 login_intro_owner:{en:"Your all-in-one local platform for travel, business and emergency help. Enter your name and mobile number to continue. Manage enquiries, quotations, trips and billing for your travel business.",ml:"യാത്ര, ബിസിനസ്, എമർജൻസി സഹായം - എല്ലാം ഒരിടത്ത്. തുടരാൻ നിങ്ങളുടെ പേരും മൊബൈൽ നമ്പറും നൽകുക. നിങ്ങളുടെ ബിസിനസിന്റെ അന്വേഷണങ്ങൾ, ക്വട്ടേഷൻ, ട്രിപ്പ്, ബില്ലിംഗ് എല്ലാം നിയന്ത്രിക്കാം."},
 login_email_label:{en:"Email (optional)",ml:"ഇമെയിൽ (ഓപ്ഷണൽ)"},
 login_location_label:{en:"Location / town (optional)",ml:"സ്ഥലം / പട്ടണം (ഓപ്ഷണൽ)"},
 login_pincode_label:{en:"Pincode (optional)",ml:"പിൻകോഡ് (ഓപ്ഷണൽ)"},
 dashboard_title:{en:"Travel Connect Dashboard",ml:"ഡാഷ്ബോർഡ്"},
 your_business_name:{en:"Your Business Name",ml:"നിങ്ങളുടെ ബിസിനസ് പേര്"},
 useful_places_title:{en:"Useful Places",ml:"ഉപകാരപ്രദമായ സ്ഥലങ്ങൾ"},
 emergency_contacts_title:{en:"Emergency Contacts",ml:"എമർജൻസി കോൺടാക്ടുകൾ"},
 collect_payment_title:{en:"Collect Payment",ml:"പേയ്മെന്റ് സ്വീകരിക്കുക"},
 collect_payment_hint:{en:"Type the amount and show the QR on this screen for your customer to scan.",ml:"തുക ടൈപ്പ് ചെയ്ത് QR കോഡ് കസ്റ്റമറെ കാണിക്കുക, അവർ സ്കാൻ ചെയ്യട്ടെ."},
 collect_payment_amount_label:{en:"Amount",ml:"തുക"},
 generate_qr:{en:"Generate QR",ml:"QR ഉണ്ടാക്കുക"},
 set_upi_first:{en:"Set your UPI ID in Billing Details above first, then come back here to collect payments by QR.",ml:"ആദ്യം മുകളിലെ Billing Details-ൽ UPI ID ചേർക്കുക, എന്നിട്ട് ഇവിടെ തിരികെ വന്ന് QR വഴി പേയ്മെന്റ് സ്വീകരിക്കാം."},
 recent_contacts_title:{en:"Recent Contacts",ml:"അടുത്തിടെ വിളിച്ചവർ"},
 recent_contacts_sub:{en:"customers who called you through the app",ml:"ആപ്പ് വഴി നിങ്ങളെ വിളിച്ച കസ്റ്റമേഴ്സ്"},
 billing_sub_nontaxi:{en:"your UPI ID, used below to collect payments",ml:"നിങ്ങളുടെ UPI ID, താഴെ പേയ്മെന്റ് സ്വീകരിക്കാൻ ഉപയോഗിക്കും"},
 loading:{en:"Loading...",ml:"ലോഡ് ആകുന്നു..."},
 mark_as_active:{en:"Mark as Active",ml:"ആക്ടീവ് ആക്കുക"},
 mark_vehicle_active:{en:"Mark this vehicle Active",ml:"ഈ വാഹനം ആക്ടീവ് ആക്കുക"},
 local_directory_find:{en:"Local Directory - find a business",ml:"ലോക്കൽ ഡയറക്ടറി - ബിസിനസ് കണ്ടെത്തുക"},
 available_vehicles_now:{en:"Available Vehicles Right Now",ml:"ഇപ്പോൾ ലഭ്യമായ വാഹനങ്ങൾ"},
 fare_estimate_title:{en:"Fare Estimate",ml:"ചാർജ് എസ്റ്റിമേറ്റ്"},
 vehicle_category_label:{en:"Vehicle category",ml:"വാഹന വിഭാഗം"},
 trip_type_label:{en:"Trip type",ml:"യാത്രാ തരം"},
 select_placeholder:{en:"-- Select --",ml:"-- തിരഞ്ഞെടുക്കുക --"},
 trip_local:{en:"Local Trip",ml:"ലോക്കൽ ട്രിപ്പ്"},
 trip_oneday:{en:"One Day",ml:"ഒരു ദിവസം"},
 trip_round:{en:"Round Trip",ml:"റൗണ്ട് ട്രിപ്പ്"},
 trip_outstation:{en:"Outstation",ml:"ഔട്ട്സ്റ്റേഷൻ"},
 trip_drop:{en:"Drop",ml:"ഡ്രോപ്പ്"},
 pickup_point_label:{en:"Pickup point",ml:"പിക്കപ്പ് സ്ഥലം"},
 destination_label:{en:"Destination",ml:"ലക്ഷ്യസ്ഥാനം"},
 add_destination:{en:"+ Add another destination",ml:"+ വേറെ ലക്ഷ്യസ്ഥാനം ചേർക്കുക"},
 estimated_km_label:{en:"Estimated KM",ml:"ഏകദേശ കിലോമീറ്റർ"},
 estimated_hours_label:{en:"Estimated hours",ml:"ഏകദേശ മണിക്കൂർ"},
 open_route_maps:{en:"Open route in Google Maps (to check KM)",ml:"Google Maps-ൽ റൂട്ട് കാണുക (KM അറിയാൻ)"},
 more_options:{en:"More options (vehicle start/close point, days, rest hours)",ml:"കൂടുതൽ ഓപ്ഷനുകൾ (വാഹനം തുടങ്ങുന്ന/അവസാനിക്കുന്ന സ്ഥലം, ദിവസങ്ങൾ, രാത്രി വിശ്രമം)"},
 vehicle_start_label:{en:"Vehicle start point (garage)",ml:"വാഹനം തുടങ്ങുന്ന സ്ഥലം (ഗാരേജ്)"},
 vehicle_close_label:{en:"Vehicle closing point (usually same as start)",ml:"വാഹനം അവസാനിക്കുന്ന സ്ഥലം (സാധാരണ തുടങ്ങിയ സ്ഥലം തന്നെ)"},
 days_label:{en:"Number of days (outstation)",ml:"ദിവസങ്ങളുടെ എണ്ണം (ഔട്ട്സ്റ്റേഷൻ)"},
 rest_hours_label:{en:"Overnight rest hours",ml:"രാത്രി വിശ്രമ മണിക്കൂർ"},
 get_fare_estimate:{en:"Get Fare Estimate",ml:"ചാർജ് കാണുക"},
 calls_made_title:{en:"Calls I've Made",ml:"ഞാൻ വിളിച്ച കോളുകൾ"},
 feedback_title:{en:"Feedback / Suggestions",ml:"അഭിപ്രായം / നിർദ്ദേശം"},
 feedback_placeholder:{en:"Tell us what could be better...",ml:"എന്തെങ്കിലും മെച്ചപ്പെടുത്താൻ ഉണ്ടെങ്കിൽ പറയുക..."},
 send_feedback:{en:"Send Feedback",ml:"അഭിപ്രായം അയക്കുക"},
 about_travel_connect:{en:"About Travel Connect",ml:"Travel Connect-നെ കുറിച്ച്"},
 about_text:{en:"Travel Connect only connects customers with independent local partners - we don't own vehicles, fix final prices, or handle payments. Please confirm final fare and details directly with the partner.",ml:"Travel Connect കസ്റ്റമേഴ്സിനെ സ്വതന്ത്ര ലോക്കൽ പാർട്ണർമാരുമായി ബന്ധിപ്പിക്കുക മാത്രമാണ് ചെയ്യുന്നത് - വാഹനങ്ങൾ ഞങ്ങളുടേതല്ല, ചാർജ് ഞങ്ങൾ തീരുമാനിക്കുന്നില്ല, പേയ്മെന്റും ഞങ്ങൾ കൈകാര്യം ചെയ്യുന്നില്ല. അവസാന ചാർജും വിവരങ്ങളും പാർട്ണറുമായി നേരിട്ട് ഉറപ്പിക്കുക."},
 logout_device:{en:"Log out of this device",ml:"ഈ ഫോണിൽ നിന്ന് ലോഗ് ഔട്ട്"},
 local_directory_title:{en:"Local Directory",ml:"ലോക്കൽ ഡയറക്ടറി"},
 directory_search_hint:{en:"Search verified local businesses - taxis, autos, restaurants, workshops, skilled work and more.",ml:"അംഗീകരിച്ച ലോക്കൽ ബിസിനസുകൾ സെർച്ച് ചെയ്യുക - ടാക്സി, ഓട്ടോ, ഹോട്ടൽ, വർക്ക്ഷോപ്പ്, സ്കിൽഡ് വർക്ക് തുടങ്ങിയവ."},
 category_label:{en:"Category",ml:"വിഭാഗം"},
 all_types:{en:"All types",ml:"എല്ലാ വിഭാഗവും"},
 other_type:{en:"Other",ml:"മറ്റുള്ളവ"},
 business_search_label:{en:"Business name, town or pincode",ml:"ബിസിനസ് പേര്, സ്ഥലം അല്ലെങ്കിൽ പിൻകോഡ്"},
 no_matching_businesses:{en:"No matching businesses found.",ml:"പൊരുത്തപ്പെടുന്ന ബിസിനസ് ഒന്നും കണ്ടെത്തിയില്ല."},
 active_board_title:{en:"Active Vehicles Board",ml:"ആക്ടീവ് വെഹിക്കിൾ ബോർഡ്"},
 active_board_hint:{en:"Taxi vehicles currently marked ready for a trip.",ml:"ഇപ്പോൾ ട്രിപ്പിന് തയ്യാറായ ടാക്സി വാഹനങ്ങൾ."},
 active_board_search_label:{en:"Search by location, business name or category",ml:"സ്ഥലം, ബിസിനസ് പേര് അല്ലെങ്കിൽ വിഭാഗം വെച്ച് സെർച്ച് ചെയ്യുക"},
 no_matching_vehicles:{en:"No matching vehicles found.",ml:"പൊരുത്തപ്പെടുന്ന വാഹനം ഒന്നും കണ്ടെത്തിയില്ല."},
 network_error:{en:"Network error.",ml:"നെറ്റ്‌വർക്ക് പിശക്."},
 directions:{en:"Directions",ml:"വഴി"},
 emergency_sos_title:{en:"Emergency SOS",ml:"എമർജൻസി SOS"},
 sos_press_title:{en:"In an emergency, press the button",ml:"അടിയന്തര ഘട്ടത്തിൽ ഈ ബട്ടൺ അമർത്തുക"},
 sos_press_sub:{en:"This sends an alert with your name, phone number and current location to every Travel Connect partner, so they can call you and reach you.",ml:"ഇത് നിങ്ങളുടെ പേര്, ഫോൺ നമ്പർ, ഇപ്പോഴത്തെ സ്ഥലം എന്നിവ എല്ലാ Travel Connect പാർട്ണർമാർക്കും അയക്കും, അവർക്ക് നിങ്ങളെ വിളിച്ച് സഹായിക്കാൻ."},
 sos_send_button:{en:"SEND SOS ALERT",ml:"SOS അയക്കുക"},
 sos_message_label:{en:"Add a short message (optional)",ml:"ഒരു ചെറിയ സന്ദേശം ചേർക്കുക (ഓപ്ഷണൽ)"},
 sos_message_placeholder:{en:"e.g. Vehicle broke down near Vadakara, need help",ml:"ഉദാ: വാഹനം വടകരയ്ക്ക് അടുത്ത് കേടായി, സഹായം വേണം"},
 sos_what_happens_title:{en:"What happens when you press it",ml:"ഇത് അമർത്തിയാൽ എന്ത് സംഭവിക്കും"},
 sos_what_happens_1:{en:"You confirm once, so it is never sent by accident.",ml:"ഒരു തവണ confirm ചെയ്യണം, അബദ്ധത്തിൽ അയക്കപ്പെടില്ല."},
 sos_what_happens_2:{en:"Every partner's phone shows an alarm with your name and a Call button.",ml:"എല്ലാ പാർട്ണർമാരുടെയും ഫോണിൽ നിങ്ങളുടെ പേരും Call ബട്ടണും കാണിക്കും."},
 sos_what_happens_3:{en:"Your location opens in Google Maps for them.",ml:"നിങ്ങളുടെ സ്ഥലം Google Maps-ൽ അവർക്ക് കാണാം."},
 sos_what_happens_4:{en:"When you are safe, tap Mark Resolved in the history below.",ml:"സുരക്ഷിതരായാൽ, താഴെയുള്ള history-ൽ Mark Resolved അമർത്തുക."},
 sos_history_title:{en:"SOS History (last 48 hours)",ml:"SOS ചരിത്രം (കഴിഞ്ഞ 48 മണിക്കൂർ)"},
 sos_confirm_title:{en:"Send SOS alert?",ml:"SOS അയക്കണോ?"},
 sos_confirm_sub:{en:"Every Travel Connect partner will get your name, phone number and location right now. Use this only in a real emergency.",ml:"എല്ലാ Travel Connect പാർട്ണർമാർക്കും ഇപ്പോൾ തന്നെ നിങ്ങളുടെ പേരും നമ്പറും സ്ഥലവും കിട്ടും. യഥാർത്ഥ അടിയന്തര ഘട്ടത്തിൽ മാത്രം ഇത് ഉപയോഗിക്കുക."},
 sos_confirm_cancel:{en:"Cancel",ml:"വേണ്ട"},
 sos_confirm_yes:{en:"YES, SEND SOS",ml:"അതെ, SOS അയക്കുക"},
 sos_sending:{en:"Sending SOS...",ml:"SOS അയക്കുന്നു..."},
 sos_sent_title:{en:"SOS SENT",ml:"SOS അയച്ചു"},
 sos_sent_sub:{en:"Stay where you are. Partners will call you on",ml:"നിങ്ങൾ ഇപ്പോൾ ഉള്ള സ്ഥലത്ത് തന്നെ നിൽക്കുക. പാർട്ണർമാർ ഈ നമ്പറിൽ വിളിക്കും:"},
 sos_alerted_with_loc:{en:"Every partner has been alerted with your location.",ml:"എല്ലാ പാർട്ണർമാർക്കും നിങ്ങളുടെ സ്ഥലം സഹിതം അറിയിപ്പ് കിട്ടി."},
 sos_alerted_no_loc:{en:"Every partner has been alerted (your location could not be read).",ml:"എല്ലാ പാർട്ണർമാർക്കും അറിയിപ്പ് കിട്ടി (നിങ്ങളുടെ സ്ഥലം കിട്ടിയില്ല)."},
 call_112:{en:"Call 112 (emergency)",ml:"112-ൽ വിളിക്കുക (എമർജൻസി)"},
 share_whatsapp:{en:"Share on WhatsApp / other apps",ml:"WhatsApp / മറ്റ് ആപ്പുകളിൽ ഷെയർ ചെയ്യുക"},
 sos_failed_title:{en:"SOS could not be sent",ml:"SOS അയക്കാൻ കഴിഞ്ഞില്ല"},
 sos_failed_sub:{en:"Please check your internet connection and press the button again. If it is urgent, call 112 now.",ml:"ദയവായി ഇന്റർനെറ്റ് കണക്ഷൻ നോക്കി വീണ്ടും ബട്ടൺ അമർത്തുക. അടിയന്തരമാണെങ്കിൽ ഇപ്പോൾ തന്നെ 112-ൽ വിളിക്കുക."},
 toast_sos_sent:{en:"SOS sent",ml:"SOS അയച്ചു"},
 msg_card_title:{en:"Messages",ml:"സന്ദേശങ്ങൾ"},
 msg_card_sub_customer:{en:"Write to a business and see their replies",ml:"ഒരു ബിസിനസിന് എഴുതുക, അവരുടെ മറുപടി കാണുക"},
 msg_card_sub_owner:{en:"Customers' messages and your replies",ml:"കസ്റ്റമേഴ്സിന്റെ സന്ദേശങ്ങളും നിങ്ങളുടെ മറുപടിയും"},
 msg_new_count:{en:"You have {n} new message{s}",ml:"നിങ്ങൾക്ക് {n} പുതിയ സന്ദേശം ഉണ്ട്"},
 delete_for_me:{en:"Delete for me only",ml:"എനിക്ക് മാത്രം ഡിലീറ്റ് ചെയ്യുക"},
 call_label:{en:"Call",ml:"വിളിക്കുക"},
 msg_type_placeholder:{en:"Type a short message...",ml:"ഒരു ചെറിയ സന്ദേശം ടൈപ്പ് ചെയ്യുക..."},
 msg_share_location:{en:"Share my current location with this message",ml:"ഇപ്പോഴത്തെ സ്ഥലം ഈ സന്ദേശത്തോടൊപ്പം പങ്കുവെക്കുക"},
 send_label:{en:"Send",ml:"അയക്കുക"},
 msg_page_hint:{en:"Short messages between customers and businesses. Use the Message button on any business in the Local Directory or Active Vehicles Board to write to them.",ml:"കസ്റ്റമേഴ്സും ബിസിനസുകളും തമ്മിലുള്ള ചെറിയ സന്ദേശങ്ങൾ. Local Directory-യിലോ Active Vehicles Board-ലോ ഉള്ള ഏതെങ്കിലും ബിസിനസിന്റെ 'Message' ബട്ടൺ ഉപയോഗിച്ച് എഴുതാം."},
};
function tcMsgCountText(n){
 return tcLang()==="ml"?(`നിങ്ങൾക്ക് ${n} പുതിയ സന്ദേശം ഉണ്ട്`):(`You have ${n} new message${n>1?"s":""}`);
}
/* "Business hours: 09:00 - 18:00 (...)" - built the same way as the Local
   Trip notice, for the same reason (the times are the owner's own data,
   not fixed dictionary text). */
function tcBusinessHoursNoteText(open,close){
 return tcLang()==="ml"
  ?`&#128337; ബിസിനസ് സമയം: ${esc(open)} - ${esc(close)} (ആക്ടീവ് സ്റ്റാറ്റസ് ഇതിനനുസരിച്ച് തന്നെ മാറും)`
  :`&#128337; Business hours: ${esc(open)} - ${esc(close)} (Active status follows these automatically)`;
}
/* Builds the "Local Trip: maximum X KM AND Y hours..." notice with the
   numbers inserted into whichever language's sentence - a plain
   dictionary lookup can't hold a number that changes per owner's own
   settings. */
function tcLocalTripNotice(km,hours){
 return tcLang()==="ml"
  ?`<b>ലോക്കൽ ട്രിപ്പ്:</b> പരമാവധി ${km} KM, ${hours} മണിക്കൂർ. ഇതിൽ ഏതെങ്കിലും കൂടിയാൽ ഓട്ടോമാറ്റിക് ആയി വൺ ഡേ താരിഫ് ആയി മാറും.`
  :`<b>Local Trip:</b> maximum ${km} KM AND ${hours} hours. If either limit is exceeded, it automatically switches to a One Day tariff.`;
}
function tcLang(){ return localStorage.getItem("tc_app_lang")||"en"; }
function tcSetLang(lang){
 localStorage.setItem("tc_app_lang",lang);
 /* Re-draws whatever is actually on screen right now - normally that's
    just render() (which re-reads the URL hash and routes correctly), but
    an admin-only "Preview: Customer/Partner Page" (tcOpenMenuPage below)
    calls its target function DIRECTLY, bypassing render()'s own routing,
    and sets a hash render() has no case for ("#previewcustomer" etc). Had
    this always called render(), re-rendering FROM a preview page would
    fall through render()'s owner branch to its final else (the SOS page)
    instead of staying on the preview - window._tcLastRenderFn (updated by
    tcOpenMenuPage) is exactly "whichever function actually owns the
    current screen", so this always refreshes the right one. */
 (window._tcLastRenderFn||render)();
}
function tcT(key){
 const row=TC_STRINGS[key];
 if(!row) return key;
 return row[tcLang()]||row.en||key;
}
function tcLangToggleHtml(compact){
 const lang=tcLang();
 if(compact){
  return `<button onclick="tcSetLang('${lang==='en'?'ml':'en'}')" style="background:rgba(255,255,255,.14);color:#fff;border-radius:16px;padding:6px 12px;font-size:12px;font-weight:700;border:none">${lang==='en'?'മലയാളം':'English'}</button>`;
 }
 return `<div style="display:flex;gap:6px">
  <button onclick="tcSetLang('en')" style="padding:5px 12px;font-size:12px;border-radius:14px;border:1px solid #c9d4dc;background:${lang==='en'?'#0b6b78':'#fff'};color:${lang==='en'?'#fff':'#333'}">English</button>
  <button onclick="tcSetLang('ml')" style="padding:5px 12px;font-size:12px;border-radius:14px;border:1px solid #c9d4dc;background:${lang==='ml'?'#0b6b78':'#fff'};color:${lang==='ml'?'#fff':'#333'}">മലയാളം</button>
 </div>`;
}
/* Malayalam labels for the business-type dropdown/labels used throughout
   (registration, directory, dashboards) - kept alongside TC_BUSINESS_TYPES
   (defined earlier) rather than inside it, so the English-only places that
   already read TC_BUSINESS_TYPES directly (e.g. building <option> values)
   are completely unaffected; only tcBizLabel() below is language-aware. */
const TC_BUSINESS_TYPES_ML={
 taxi_travel:"ടാക്സി / ട്രാവൽ ഏജൻസി",
 auto_rickshaw:"ഓട്ടോ റിക്ഷ",
 pickup_goods:"പിക്കപ്പ് / ഗുഡ്സ് ക്യാരിയർ",
 restaurant:"ഹോട്ടൽ / ടീ ഷോപ്പ്",
 petrol_pump:"പെട്രോൾ പമ്പ്",
 workshop:"വർക്ക്ഷോപ്പ്",
 hospital:"ഹോസ്പിറ്റൽ",
 homestay:"ഹോംസ്റ്റേ / റിസോർട്ട് / ഹോട്ടൽ",
 skilled_work:"സ്കിൽഡ് വർക്ക് (പ്ലംബർ, ഇലക്ട്രീഷ്യൻ, കാർപെന്റർ etc.)"
};
/* Relabels the bottom tab bar and the Hamburger Menu card to the current
   language - the tabs are static HTML in index.html (so their text can't
   just be written once in whichever language), and the Menu is rebuilt
   fresh from tcOpenMenu() every time it's opened, so both need their own
   explicit re-apply call rather than relying on a one-time render. */
function tcApplyTabLabels(){
 const map={dashboard:"tab_dashboard",enquiries:"tab_enquiries",quotations:"tab_quotations",trips:"tab_trips",billing:"tab_billing"};
 document.querySelectorAll(".tabs button").forEach(b=>{
  const key=map[b.dataset.view];
  if(key) b.textContent=tcT(key);
 });
}

function tcBuildPremiumHeader(){
 const topEl=document.querySelector(".top");
 if(!topEl) return;
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 const user=getCurrentUser();
 const showSos=user&&user.role==="owner";
 topEl.innerHTML=`
  <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">
   ${logo?`<img src="${logo}" style="width:36px;height:36px;border-radius:8px;background:#fff;padding:3px;flex-shrink:0">`:""}
   <div style="min-width:0"><b style="white-space:nowrap">TRAVEL CONNECT</b><small style="display:block;line-height:1.3">${tcT("login_platform_tagline")}</small></div>
  </div>
  <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
   ${showSos?"":tcLangToggleHtml(true)}
   ${showSos?`<button id="networkBtn" aria-label="Emergency SOS" style="background:linear-gradient(135deg,#b03a2e,#e74c3c);color:#fff;border-radius:20px;padding:7px 12px;font-weight:900;font-size:12.5px;letter-spacing:.5px;border:none;display:flex;align-items:center;gap:4px;flex-shrink:0;animation:tcSosPulse 2.2s infinite"><span style="font-size:13px">&#128680;</span>SOS</button>`:""}
   ${showSos?`<button id="tcMenuBtn" aria-label="Menu" style="background:rgba(255,255,255,.14);color:#fff;border-radius:9px;width:38px;height:38px;font-size:18px;border:none;display:flex;align-items:center;justify-content:center;padding:0;line-height:1">&#9776;</button>`:""}
  </div>`;
 if(showSos){
  document.querySelector("#networkBtn").onclick=()=>network();
  document.querySelector("#tcMenuBtn").onclick=tcOpenMenu;
 }
}

/* ---------- NAVIGATION / RENDER ---------- */
function render(){
 /* Normal navigation always resets this back to render() itself - only a
    preview page (tcOpenMenuPage) overrides it, and only until the person
    leaves that preview via ordinary navigation (a tab, the Menu, Back),
    all of which call render() and land here. */
 window._tcLastRenderFn=render;
 if(!getCurrentUser()){
  const tabsEl=document.querySelector(".tabs");
  if(tabsEl) tabsEl.style.display="none";
  const menuBtn=document.querySelector("#tcMenuBtn"), sosBtn=document.querySelector("#networkBtn");
  if(menuBtn) menuBtn.style.display="none";
  if(sosBtn) sosBtn.style.display="none";
  renderLogin();
  return;
 }
 checkStillAllowed();
 const user=getCurrentUser();
 const tabsEl=document.querySelector(".tabs");
 tcBuildPremiumHeader();
 tcApplyTabLabels();
 if(typeof tcStartMsgPolling==="function") tcStartMsgPolling();
 if(user.role==="customer"){
  if(tabsEl) tabsEl.style.display="none";
  const v=location.hash.slice(1)||"";
  if(v==="activeboard") activeBoard();
  else if(v==="directory") tcRenderDirectory();
  else if(v==="messages") tcRenderMessages();
  else customerHome();
  return;
 }
 if(tabsEl) tabsEl.style.display="";
 tcHideAdminTabs();
 startSosPolling();
 const v=location.hash.slice(1)||"dashboard";
 if(v==="dashboard"){ dashboard(); if(typeof tcInjectDashboardMsgCard==="function") tcInjectDashboardMsgCard(); }
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
 else if(v==="messages") tcRenderMessages();
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
 window._tcLastRenderFn=renderFn;
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
