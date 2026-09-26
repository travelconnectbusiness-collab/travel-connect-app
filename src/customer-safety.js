/* ======================================================================
   TRAVEL CONNECT - customer-safety.js
   The Customer's own home page, Emergency Contacts, Useful Places, the
   SOS/Network page (Business Owners only), Feedback, and the Authorized
   Users admin allowlist. See core.js for render()'s routing and
   directory.js for tcOpenDirectory()/activeBoard()/tcCallButtonHtml()
   which this page links to.
   ====================================================================== */

/* ---------- COLLAPSIBLE BOX HELPER (Emergency Contacts / Useful Places) ----------
   Both boxes start collapsed so a long list never pushes the customer's
   actual content (fare estimate, directory) down the page - tapping the
   header expands/collapses in place. */
function tcCollapsibleBox(id,title,bodyHtml,startOpen){
 return `<div class="card" id="${id}">
  <div style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="tcToggleCollapsible('${id}')">
   <h3 style="margin:0">${title}</h3>
   <span id="${id}_arrow" style="font-size:13px;color:#6a7a87">${startOpen?"\u25be":"\u25b8"}</span>
  </div>
  <div id="${id}_body" style="${startOpen?"":"display:none"};margin-top:8px">${bodyHtml}</div>
 </div>`;
}
function tcToggleCollapsible(id){
 const body=document.querySelector("#"+id+"_body"), arrow=document.querySelector("#"+id+"_arrow");
 if(!body) return;
 const open=body.style.display!=="none";
 body.style.display=open?"none":"";
 if(arrow) arrow.textContent=open?"\u25b8":"\u25be";
}

/* ---------- CUSTOMER HOME PAGE ----------
   Local Directory is the FIRST thing on the page, always visible without
   scrolling - the customer asked for this specifically, since it was
   previously buried further down the page requiring a scroll to reach. */
function customerHome(){
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
 const user=getCurrentUser();
 app().innerHTML=`<section class="container"><div class="card">
  <div class="actions" style="margin-bottom:4px">
   <button class="primary" style="flex:1;font-size:15px;padding:14px" onclick="tcOpenDirectory()">&#128269; Local Directory - find a business</button>
  </div>
  <div class="actions">
   <button style="flex:1" onclick="view('activeboard')">&#128663; Available Vehicles Right Now</button>
  </div>

  <h2 style="margin-top:18px">Fare Estimate</h2>
  <div class="grid">
   <label>Vehicle category<select id="cCat"><option value="">-- Select --</option>${cat}</select></label>
   <label>Trip type<select id="cType">
     <option value="">-- Select --</option>
     <option value="local">Local Trip</option><option value="one_day">One Day</option>
     <option value="round">Round Trip</option><option value="outstation">Outstation</option><option value="drop">Drop</option>
   </select></label>
  </div>
  <div id="cTypeWarn" class="danger" style="min-height:16px"></div>
  <div class="grid">
   <label>Pickup point<input id="cPickup"></label>
   <label>Destination 1<input id="cDest"></label>
  </div>
  <div id="custStopsContainer"></div>
  <div class="actions"><button type="button" onclick="tcAddCustDestField()">+ Add another destination</button></div>
  <div class="grid" style="margin-top:6px">
   <label>Estimated KM<input id="cKm" type="number" placeholder="e.g. 40"></label>
   <label>Estimated hours<input id="cHours" type="number" placeholder="e.g. 4"></label>
  </div>
  <div class="actions"><button type="button" onclick="tcOpenCustomerRoute()">&#128663; Open route in Google Maps (to check KM)</button></div>
  <details style="margin:6px 0">
   <summary style="cursor:pointer;font-size:12.5px;color:#0b6b78">More options (vehicle start/close point, days, rest hours)</summary>
   <div class="grid" style="margin-top:6px">
    <label>Vehicle start point (garage)<input id="cVehicleStart" placeholder="e.g. Nadapuram"></label>
    <label>Vehicle closing point (usually same as start)<input id="cVehicleClose" placeholder="e.g. Nadapuram"></label>
    <label>Number of days (outstation)<input id="cDays" type="number" value="1" min="1"></label>
    <label>Overnight rest hours<input id="cRestHours" type="number" value="0"></label>
   </div>
  </details>
  <div class="actions"><button class="primary" onclick="calcCustomerFare()">Get Fare Estimate</button></div>
  <div id="cResult" class="ratebox"></div>

  ${tcCollapsibleBox("custUsefulPlaces","&#128205; Useful Places",`<div id="custPlacesList">Loading...</div>`,false)}
  ${tcCollapsibleBox("custEmergency","&#9888; Emergency Contacts",`<div id="custEmergencyList">Loading...</div>`,false)}
  ${tcCollapsibleBox("custMyCalls","&#128222; Calls I've Made",`<div id="custCallsList">Loading...</div>`,false)}

  <div class="card">
   <h3>Feedback / Suggestions</h3>
   <textarea id="custFeedback" rows="3" placeholder="Tell us what could be better..."></textarea>
   <div class="actions"><button class="primary" onclick="tcSubmitFeedback()">Send Feedback</button></div>
  </div>

  <div class="card">
   <details><summary style="cursor:pointer;font-size:12.5px;color:#6a7a87">About Travel Connect</summary>
   <p class="muted" style="font-size:12px;margin-top:6px">Travel Connect only connects customers with independent local partners - we don't own vehicles, fix final prices, or handle payments. Please confirm final fare and details directly with the partner.</p>
   </details>
  </div>
  <div class="actions" style="margin-top:10px"><button onclick="logout()">Log out of this device</button></div>
 </div></section>`;
 tcRenderCustEmergencyContacts();
 tcRenderCustUsefulPlaces();
 tcRenderMyCalls();
}
function tcAddCustDestField(value=""){
 const c=document.querySelector("#custStopsContainer");
 if(!c) return;
 const row=document.createElement("div");
 row.className="grid";
 row.style.marginTop="4px";
 row.innerHTML=`<label style="flex:1">Additional destination<input class="cust-stop-input" value="${esc(value)}"></label><button type="button" onclick="this.parentElement.remove()" style="align-self:flex-end">&#10005; Remove</button>`;
 c.appendChild(row);
}
function tcOpenCustomerRoute(){
 const start=document.querySelector("#cVehicleStart")?.value||"";
 const pickup=document.querySelector("#cPickup").value;
 const stops=[document.querySelector("#cDest")?.value||"",...Array.from(document.querySelectorAll(".cust-stop-input")).map(i=>i.value)].map(v=>v.trim()).filter(Boolean);
 const closing=document.querySelector("#cVehicleClose")?.value||start;
 const points=[start,pickup,...stops,closing].map(v=>v.trim()).filter(Boolean);
 if(points.length<2){toast("Enter at least a pickup and destination first");return}
 const origin=points[0], destination=points[points.length-1], waypoints=points.slice(1,-1).join("|");
 let url="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination);
 if(waypoints) url+="&waypoints="+encodeURIComponent(waypoints);
 window.open(url,"_blank");
}
function calcCustomerFare(){
 const catIdx=document.querySelector("#cCat").value, type=document.querySelector("#cType").value;
 const warnBox=document.querySelector("#cTypeWarn");
 if(catIdx===""||type===""){ warnBox.textContent="\u2b06\ufe0f Please select a vehicle category and trip type"; return; }
 warnBox.textContent="";
 const c=db.categories[+catIdx];
 const km=+document.querySelector("#cKm").value||0, h=+document.querySelector("#cHours").value||0;
 const days=+document.querySelector("#cDays").value||1, restHours=+document.querySelector("#cRestHours").value||0;
 const plan=(type==="local")?"local":"competitive";
 const r=calcFare(c,plan,km,h,days,restHours,{});
 const box=document.querySelector("#cResult");
 if(r.invalid){ box.innerHTML=`<div class="danger"><b>${esc(r.reason)}</b></div>`; return; }
 box.innerHTML=`<div class="total">Estimated Fare: ${money(r.total)}</div>
 <div class="muted" style="margin-top:6px">This is an estimate. Final fare is confirmed by the business you book with.</div>
 <div class="actions" style="margin-top:8px"><button onclick="tcOpenDirectory()">Find a partner to book</button></div>`;
}
async function tcSubmitFeedback(){
 const text=document.querySelector("#custFeedback").value.trim();
 if(!text){ toast("Type your feedback first"); return; }
 const user=getCurrentUser();
 try{
  await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:user?.name||"",mobile:user?.mobile||"",message:text})});
  toast("Thank you for your feedback!");
  document.querySelector("#custFeedback").value="";
 }catch(e){ toast("Network error - could not send"); }
}

/* ---------- CUSTOMER: "CALLS I'VE MADE" HISTORY ---------- */
async function tcRenderMyCalls(){
 const box=document.querySelector("#custCallsList");
 if(!box) return;
 const user=getCurrentUser();
 if(!user||!user.mobile){ box.innerHTML="<p class='muted'>No calls yet.</p>"; return; }
 try{
  const res=await fetch("/api/calls?action=made&mobile="+encodeURIComponent(user.mobile));
  const data=await res.json();
  if(!data.ok||!data.calls||!data.calls.length){ box.innerHTML="<p class='muted'>You haven't called anyone through the app yet.</p>"; return; }
  box.innerHTML=data.calls.map(c=>{
   const when=new Date(c.created_at).toLocaleString();
   return `<div class="listitem"><b>${esc(c.target_label||c.callee_mobile)}</b><br>
   <span class="muted">You called ${esc(c.callee_mobile)} &bull; ${esc(when)}</span>
   <div class="actions" style="margin-top:4px"><a href="tel:${esc(c.callee_mobile)}"><button>&#128222; Call again</button></a></div>
   </div>`;
  }).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Could not load your call history.</p>"; }
}

/* ---------- EMERGENCY CONTACTS (admin-curated, e.g. Police/Ambulance) ---------- */
async function tcRenderCustEmergencyContacts(){
 const box=document.querySelector("#custEmergencyList");
 if(!box) return;
 try{
  const res=await fetch("/api/emergency?action=list");
  const data=await res.json();
  if(!data.ok||!data.contacts||!data.contacts.length){ box.innerHTML="<p class='muted'>No emergency contacts added yet.</p>"; return; }
  box.innerHTML=data.contacts.map(c=>`<div class="listitem">
   <b>${esc(c.name)}</b><br>
   <a href="tel:${esc(c.number)}"><button class="primary">&#128222; ${esc(c.number)}</button></a>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Could not load emergency contacts.</p>"; }
}
function tcOpenEmergencyAdmin(){
 requireAdmin(()=>{ tcOpenMenuPage("emergencyadmin",tcRenderEmergencyAdmin); });
}
async function tcRenderEmergencyAdmin(){
 app().innerHTML=card("Emergency Contacts (Admin)",`
  <div class="grid"><label>Name<input id="ecName" placeholder="e.g. Police Control Room"></label><label>Phone<input id="ecPhone"></label></div>
  <div class="actions"><button class="primary" onclick="tcAddEmergencyContact()">Add Contact</button></div>
  <div id="ecList">Loading...</div>`);
 tcLoadEmergencyAdmin();
}
async function tcLoadEmergencyAdmin(){
 const box=document.querySelector("#ecList");
 if(!box) return;
 try{
  const res=await fetch("/api/emergency?action=list");
  const data=await res.json();
  box.innerHTML=(data.ok?data.contacts:[]).map(c=>`<div class="listitem">
   <b>${esc(c.name)}</b> - ${esc(c.number)}
   <div class="actions" style="margin-top:4px"><button class="danger" onclick="tcDeleteEmergencyContact(${c.id})">Delete</button></div>
  </div>`).join("")||"<p class='muted'>No contacts yet.</p>";
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function tcAddEmergencyContact(){
 const name=document.querySelector("#ecName").value.trim(), phone=document.querySelector("#ecPhone").value.trim();
 if(!name||!phone){ toast("Enter name and phone"); return; }
 try{
  const res=await fetch("/api/emergency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"add",name,number:phone,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not save ("+(data.error||"unknown")+")"); return; }
  toast("Contact added"); document.querySelector("#ecName").value=""; document.querySelector("#ecPhone").value="";
  tcLoadEmergencyAdmin();
 }catch(e){ toast("Network error"); }
}
async function tcDeleteEmergencyContact(id){
 if(!confirm("Delete this contact?")) return;
 try{
  await fetch("/api/emergency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"delete",id,token:adminToken()})});
  toast("Contact deleted"); tcLoadEmergencyAdmin();
 }catch(e){ toast("Network error"); }
}

/* ---------- USEFUL PLACES (admin-curated: petrol pumps, resorts etc.) ---------- */
const TC_PLACE_CATEGORIES=["Petrol Pump","Resort / Homestay","Restaurant","Tourist Spot","Hospital","Workshop","Other"];
async function tcRenderCustUsefulPlaces(){
 const box=document.querySelector("#custPlacesList");
 if(!box) return;
 try{
  const res=await fetch("/api/places?action=list");
  const data=await res.json();
  if(!data.ok||!data.places||!data.places.length){ box.innerHTML="<p class='muted'>No places added yet.</p>"; return; }
  box.innerHTML=data.places.map(p=>{
   const hasPin=p.lat!=null&&p.lon!=null;
   const mapsUrl=hasPin?"https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lon
    :"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([p.name,p.location].filter(Boolean).join(", "));
   return `<div class="listitem">
   <b>${esc(p.name)}</b> <span class="muted">${esc(p.category||"")}</span><br>
   ${p.location?`<span class="muted">${esc(p.location)}</span><br>`:""}
   <div class="actions">
    ${p.phone?`<a href="tel:${esc(p.phone)}"><button class="primary">&#128222; ${esc(p.phone)}</button></a>`:""}
    <a href="${mapsUrl}" target="_blank"><button>&#128205; Directions</button></a>
   </div></div>`;
  }).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Could not load places.</p>"; }
}
function tcOpenPlacesAdmin(){
 requireAdmin(()=>{ tcOpenMenuPage("placesadmin",tcRenderPlacesAdmin); });
}
async function tcRenderPlacesAdmin(){
 app().innerHTML=card("Useful Places (Admin)",`
  <div class="grid">
   <label>Name<input id="upName"></label>
   <label>Category<select id="upCategory">${TC_PLACE_CATEGORIES.map(c=>`<option>${c}</option>`).join("")}</select></label>
   <label>Location / address<div style="display:flex;gap:6px"><input id="upLocation" style="flex:1"><button type="button" onclick="tcGeocodePlace()">&#128269; Find</button></div></label>
   <label>Phone (optional)<input id="upPhone"></label>
  </div>
  <input type="hidden" id="upLat"><input type="hidden" id="upLon">
  <div id="upGeoStatus" class="muted" style="font-size:11.5px;margin:-6px 0 6px"></div>
  <div class="actions"><button class="primary" onclick="tcSavePlace()">Add Place</button></div>
  <div id="upList">Loading...</div>`);
 tcLoadPlacesAdmin();
}
async function tcGeocodePlace(){
 const q=document.querySelector("#upLocation").value.trim();
 const status=document.querySelector("#upGeoStatus");
 if(!q){ if(status) status.textContent="Type a name/address first."; return; }
 if(status) status.textContent="Searching...";
 try{
  const res=await fetch("https://nominatim.openstreetmap.org/search?format=json&q="+encodeURIComponent(q)+"&limit=1");
  const data=await res.json();
  if(!data.length){ if(status) status.textContent="Not found - try a more specific address."; return; }
  document.querySelector("#upLat").value=data[0].lat;
  document.querySelector("#upLon").value=data[0].lon;
  if(status) status.textContent="\u2705 Location found and pinned: "+data[0].display_name;
 }catch(e){ if(status) status.textContent="Search failed - check your connection."; }
}
async function tcSavePlace(){
 const name=document.querySelector("#upName").value.trim();
 if(!name){ toast("Enter a name"); return; }
 const body={action:"add",name,category:document.querySelector("#upCategory").value,
  location:document.querySelector("#upLocation").value.trim(),phone:document.querySelector("#upPhone").value.trim(),
  lat:document.querySelector("#upLat").value||null,lon:document.querySelector("#upLon").value||null,token:adminToken()};
 try{
  const res=await fetch("/api/places",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!data.ok){ toast("Could not save ("+(data.error||"unknown")+")"); return; }
  toast("Place added");
  document.querySelector("#upName").value="";document.querySelector("#upLocation").value="";document.querySelector("#upPhone").value="";
  document.querySelector("#upLat").value="";document.querySelector("#upLon").value="";document.querySelector("#upGeoStatus").textContent="";
  tcLoadPlacesAdmin();
 }catch(e){ toast("Network error"); }
}
async function tcLoadPlacesAdmin(){
 const box=document.querySelector("#upList");
 if(!box) return;
 try{
  const res=await fetch("/api/places?action=list");
  const data=await res.json();
  window._tcAllPlaces=(data.ok?data.places:[])||[];
  box.innerHTML=window._tcAllPlaces.map(p=>`<div class="listitem">
   <b>${esc(p.name)}</b> <span class="muted">${esc(p.category||"")}</span><br>
   <span class="muted">${esc(p.location||"")}${p.phone?" - "+esc(p.phone):""}</span>
   <div class="actions" style="margin-top:4px"><button onclick="tcEditPlace(${p.id})">Edit</button><button class="danger" onclick="tcDeletePlace(${p.id})">Delete</button></div>
  </div>`).join("")||"<p class='muted'>No places yet.</p>";
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
function tcEditPlace(id){
 const p=(window._tcAllPlaces||[]).find(x=>x.id===id);
 if(!p) return;
 modal(`<h2>Edit Place</h2>
  <div class="grid">
   <label>Name<input id="epName" value="${esc(p.name)}"></label>
   <label>Category<select id="epCategory">${TC_PLACE_CATEGORIES.map(c=>`<option ${p.category===c?"selected":""}>${c}</option>`).join("")}</select></label>
   <label>Location<div style="display:flex;gap:6px"><input id="epLocation" value="${esc(p.location||"")}" style="flex:1"><button type="button" onclick="tcGeocodePlaceEdit()">&#128269; Find</button></div></label>
   <label>Phone<input id="epPhone" value="${esc(p.phone||"")}"></label>
  </div>
  <input type="hidden" id="epLat" value="${p.lat||""}"><input type="hidden" id="epLon" value="${p.lon||""}">
  <div id="epGeoStatus" class="muted" style="font-size:11.5px;margin:-6px 0 6px">${p.lat?"\u2705 Location already pinned.":""}</div>
  <div class="actions"><button class="primary" onclick="tcSavePlaceEdit(${id})">Save</button></div>`);
}
async function tcGeocodePlaceEdit(){
 const q=document.querySelector("#epLocation").value.trim();
 const status=document.querySelector("#epGeoStatus");
 if(!q){ if(status) status.textContent="Type a name/address first."; return; }
 if(status) status.textContent="Searching...";
 try{
  const res=await fetch("https://nominatim.openstreetmap.org/search?format=json&q="+encodeURIComponent(q)+"&limit=1");
  const data=await res.json();
  if(!data.length){ if(status) status.textContent="Not found."; return; }
  document.querySelector("#epLat").value=data[0].lat; document.querySelector("#epLon").value=data[0].lon;
  if(status) status.textContent="\u2705 Location found: "+data[0].display_name;
 }catch(e){ if(status) status.textContent="Search failed."; }
}
async function tcSavePlaceEdit(id){
 const body={action:"update",id,name:document.querySelector("#epName").value.trim(),
  category:document.querySelector("#epCategory").value,location:document.querySelector("#epLocation").value.trim(),
  phone:document.querySelector("#epPhone").value.trim(),
  lat:document.querySelector("#epLat").value||null,lon:document.querySelector("#epLon").value||null,token:adminToken()};
 try{
  await fetch("/api/places",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  toast("Place updated"); closeModal(); tcLoadPlacesAdmin();
 }catch(e){ toast("Network error"); }
}
async function tcDeletePlace(id){
 if(!confirm("Delete this place?")) return;
 try{
  await fetch("/api/places",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"delete",id,token:adminToken()})});
  toast("Place deleted"); tcLoadPlacesAdmin();
 }catch(e){ toast("Network error"); }
}

/* ---------- SOS / NETWORK (Business Owners only - core.js's header hides
   the SOS button entirely for Customers, see tcBuildPremiumHeader()) ---------- */
let _sosHistoryTimer=null;
function network(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("Travel Connect Network / Emergency SOS",`<div id="locPermNote"></div><p class="muted">Network foundation: driver request, message, location and SOS.</p><div id="pushPermNote"></div><label>Message<textarea id="nMsg" rows="4" placeholder="Need a vehicle / driver / food / help..."></textarea></label><div class="actions"><button class="primary" onclick="getLocation()">Share current location</button><button onclick="sendNetwork()">Send request</button><button class="danger" onclick="sos()">&#128680; SOS</button></div><p class="muted">If location isn't available, SOS still sends your name, mobile number and message.</p><div id="nStatus"></div><hr><h3>&#128680; SOS History (last 48 hours)</h3><div id="sosHistoryBox">Loading...</div>`);
 loadSosHistory();
 startSosHistoryAutoRefresh();
 checkLocationPermissionUI();
 updatePushNoteUI();
}
function getLocation(){
 const status=document.querySelector("#nStatus");
 if(!navigator.geolocation){ if(status) status.textContent="Location isn't supported on this browser."; return; }
 if(status) status.textContent="Getting location...";
 navigator.geolocation.getCurrentPosition(pos=>{
  window.tcLoc={lat:pos.coords.latitude,lon:pos.coords.longitude};
  if(status) status.textContent="\u2705 Location captured - will be included if you send SOS or a request.";
 },()=>{ if(status) status.textContent="Location permission denied."; });
}
function sendNetwork(){
 const msg=(document.querySelector("#nMsg")?.value||"").trim();
 if(!msg){ toast("Type a message first"); return; }
 const user=getCurrentUser();
 fetch("/api/sos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sender_name:user.name||"",sender_mobile:user.mobile||"",message:"REQUEST from "+(user.name||"a user")+": "+msg,lat:window.tcLoc?window.tcLoc.lat:null,lon:window.tcLoc?window.tcLoc.lon:null})})
  .then(()=>{ toast("Request sent"); loadSosHistory(); })
  .catch(()=>toast("Network error"));
}
async function checkLocationPermissionUI(){
 const box=document.querySelector("#locPermNote");
 if(!box) return;
 if(!navigator.permissions||!navigator.permissions.query){ box.innerHTML=""; return; }
 try{
  const status=await navigator.permissions.query({name:"geolocation"});
  const render=()=>{
   if(!document.querySelector("#locPermNote")) return;
   if(status.state==="denied"){
    box.innerHTML=`<div class="danger">&#9888; Location is blocked for this site - SOS will still send your name/mobile/message, but not your location. Fix in your browser's site settings.</div>`;
   }else if(status.state==="prompt"){
    box.innerHTML=`<div class="muted">&#8505; This app only uses your location during an emergency (SOS). Please choose "Allow" if asked.</div>`;
   }else{ box.innerHTML=""; }
  };
  render(); status.onchange=render;
 }catch(e){ box.innerHTML=""; }
}
async function loadSosHistory(){
 const box=document.querySelector("#sosHistoryBox");
 if(!box) return;
 try{
  const res=await fetch("/api/sos?action=history");
  const data=await res.json();
  if(!data.ok||!data.alerts||!data.alerts.length){ box.innerHTML="<p class='muted'>No SOS alerts in the last 48 hours.</p>"; return; }
  box.innerHTML=data.alerts.map(a=>{
   const when=new Date(a.created_at).toLocaleString();
   const mapLink=(a.lat!=null&&a.lon!=null)?`<a href="https://maps.google.com/?q=${a.lat},${a.lon}" target="_blank">View location</a>`:"";
   const callLink=a.sender_mobile?`<a href="tel:${esc(a.sender_mobile)}">${esc(a.sender_mobile)}</a>`:"-";
   return `<div class="listitem"><b>&#128680; ${esc(a.sender_name||"A user")}</b> - ${esc(when)}<br>
   Mobile: ${callLink} ${mapLink?" &nbsp;|&nbsp; "+mapLink:""}
   ${a.message?`<div class="muted">"${esc(a.message)}"</div>`:""}</div>`;
  }).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Could not load SOS history.</p>"; }
}
function getLocationForSos(timeoutMs){
 return new Promise(resolve=>{
  if(!navigator.geolocation){ resolve(null); return; }
  let done=false;
  const timer=setTimeout(()=>{ if(!done){ done=true; resolve(null); } },timeoutMs);
  navigator.geolocation.getCurrentPosition(
   p=>{ if(done) return; done=true; clearTimeout(timer); window.tcLoc={lat:p.coords.latitude,lon:p.coords.longitude}; resolve(window.tcLoc); },
   ()=>{ if(done) return; done=true; clearTimeout(timer); resolve(null); },
   {timeout:timeoutMs}
  );
 });
}
async function sos(){
 toast("Getting your location...");
 await getLocationForSos(5000);
 const user=getCurrentUser()||{};
 const typedMsg=(document.querySelector("#nMsg")?.value||"").trim();
 const msg=typedMsg?`SOS from ${user.name||"a user"}: ${typedMsg}`:`SOS from ${user.name||"a user"}. Needs urgent assistance.`;
 try{
  await fetch("/api/sos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sender_name:user.name||"",sender_mobile:user.mobile||"",message:msg,lat:window.tcLoc?window.tcLoc.lat:null,lon:window.tcLoc?window.tcLoc.lon:null})});
  toast(window.tcLoc?"SOS sent with your location - every logged-in user will be alerted":"SOS sent (no location) - every logged-in user will be alerted");
  loadSosHistory();
 }catch(e){ toast("Could not send SOS - check your connection"); }
 const shareMsg=`TRAVEL CONNECT SOS. I need urgent assistance. Location: ${window.tcLoc?`https://maps.google.com/?q=${window.tcLoc.lat},${window.tcLoc.lon}`:"Please check my live location."}`;
 navigator.share?.({title:"Travel Connect SOS",text:shareMsg}).catch(()=>{});
}
function startSosPolling(){
 if(window._sosPollTimer) return;
 window._sosPollTimer=setInterval(async ()=>{
  try{
   const res=await fetch("/api/sos?action=latest");
   const data=await res.json();
   if(data.ok&&data.alert&&data.alert.id!==window._tcLastSosId){
    window._tcLastSosId=data.alert.id;
    if(window._tcSosBaseline!=null) showSosBanner(data.alert);
    window._tcSosBaseline=true;
   }
  }catch(e){}
 },10000);
}
function startSosHistoryAutoRefresh(){
 if(_sosHistoryTimer) clearInterval(_sosHistoryTimer);
 _sosHistoryTimer=setInterval(()=>{
  if(!document.querySelector("#sosHistoryBox")){ clearInterval(_sosHistoryTimer); _sosHistoryTimer=null; return; }
  loadSosHistory();
 },15000);
}
function showSosBanner(alert){
 playSosAlarm();
 const mapLink=(alert.lat&&alert.lon)?`https://maps.google.com/?q=${alert.lat},${alert.lon}`:null;
 const existing=document.querySelector("#sosBanner");
 if(existing) existing.remove();
 const div=document.createElement("div");
 div.id="sosBanner"; div.className="danger";
 div.style.cssText="position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;padding:14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.3)";
 div.innerHTML=`<b>&#128680; SOS: ${esc(alert.sender_name||"A user")} needs help!</b><br>
  ${alert.sender_mobile?`<a href="tel:${esc(alert.sender_mobile)}" style="color:#fff;text-decoration:underline">Call ${esc(alert.sender_mobile)}</a>`:""}
  ${mapLink?` &nbsp;|&nbsp; <a href="${mapLink}" target="_blank" style="color:#fff;text-decoration:underline">View location</a>`:""}
  &nbsp;|&nbsp; <a href="#" style="color:#fff;text-decoration:underline" onclick="this.closest('div').remove();return false">Dismiss</a>`;
 document.body.appendChild(div);
}
function playSosAlarm(){
 try{
  const ctx=new (window.AudioContext||window.webkitAudioContext)();
  const osc=ctx.createOscillator(), gain=ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value=880; osc.type="sine";
  gain.gain.setValueAtTime(0.3,ctx.currentTime);
  osc.start(); osc.stop(ctx.currentTime+0.8);
 }catch(e){}
}

/* ---------- WEB PUSH NOTIFICATIONS ---------- */
function urlBase64ToUint8Array(base64String){
 const padding="=".repeat((4-base64String.length%4)%4);
 const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
 const rawData=atob(base64);
 const out=new Uint8Array(rawData.length);
 for(let i=0;i<rawData.length;i++) out[i]=rawData.charCodeAt(i);
 return out;
}
function updatePushNoteUI(){
 const box=document.querySelector("#pushPermNote");
 if(!box) return;
 if(!("serviceWorker" in navigator)||!("PushManager" in window)){ box.innerHTML=`<div class="muted">Push notifications aren't supported in this browser.</div>`; return; }
 if(Notification.permission==="denied"){ box.innerHTML=`<div class="danger">&#9888; Push notifications are blocked for this site.</div>`; return; }
 if(Notification.permission==="granted"&&localStorage.getItem("tc_push_confirmed")==="1"){
  box.innerHTML=`<div class="ok">&#9989; Push notifications are on - you'll get an SOS alert even if the app is closed.</div><div class="actions"><button onclick="enablePushNotifications()">Re-check / Re-subscribe</button></div>`;
  return;
 }
 if(Notification.permission==="granted"){
  box.innerHTML=`<div class="danger">&#9888; Notification permission granted, but not confirmed saved yet.</div><div class="actions"><button class="primary" onclick="enablePushNotifications()">Finish Push Setup</button></div>`;
  return;
 }
 box.innerHTML=`<div class="muted">&#128276; Turn on push notifications to get an SOS alert even when the app is closed.</div><div class="actions"><button class="primary" onclick="enablePushNotifications()">Enable Push Notifications</button></div>`;
}
async function enablePushNotifications(){
 const box=document.querySelector("#pushPermNote");
 if(box) box.innerHTML=`<div class="muted" style="font-family:monospace;white-space:pre-wrap;font-size:11px" id="pushDebugLog"></div>`;
 const logBox=document.querySelector("#pushDebugLog");
 const log=(msg)=>{ if(logBox) logBox.textContent+=msg+"\n"; };
 try{
  log("Requesting permission...");
  const permission=await Notification.requestPermission();
  if(permission!=="granted"){ updatePushNoteUI(); return; }
  log("Registering service worker...");
  const reg=await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  log("Fetching key...");
  const keyRes=await fetch("/api/push?action=vapid_public_key");
  const keyData=await keyRes.json();
  if(!keyData.ok||!keyData.key){ log("Server key not available."); return; }
  log("Subscribing...");
  let sub=await reg.pushManager.getSubscription();
  if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(keyData.key)});
  log("Saving to server...");
  const user=getCurrentUser()||{};
  const postRes=await fetch("/api/push",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"subscribe",mobile:user.mobile||"",subscription:sub.toJSON()})});
  const postData=await postRes.json().catch(()=>({}));
  if(postData.ok){
   localStorage.setItem("tc_push_confirmed","1");
   toast("Push notifications enabled");
   setTimeout(updatePushNoteUI,1200);
  }else{
   log("Failed: "+JSON.stringify(postData));
   localStorage.removeItem("tc_push_confirmed");
  }
 }catch(e){
  log("Error: "+(e&&e.message?e.message:String(e)));
  localStorage.removeItem("tc_push_confirmed");
 }
}

/* ---------- MAIN ADMIN PAGE ---------- */
function admin(){
 app().innerHTML=card("Admin",`
 <div class="card">
  <h3>Platform Settings</h3>
  <div class="grid">
   <label>Platform name<input id="plName" value="${esc(db.platform.name||"")}"></label>
   <label>Tagline<input id="plTagline" value="${esc(db.platform.tagline||"")}"></label>
   <label>Phone 1<input id="plPhone1" value="${esc(db.platform.phone1||"")}"></label>
   <label>Phone 2<input id="plPhone2" value="${esc(db.platform.phone2||"")}"></label>
   <label>Email<input id="plEmail" value="${esc(db.platform.email||"")}"></label>
  </div>
  <div class="actions"><button class="primary" onclick="saveAdminPlatform()">Save Platform Settings</button></div>
 </div>
 <div class="card">
  <h3>Local Trip Limits</h3>
  <div class="grid">
   <label>Max KM<input id="admLocalKm" type="number" value="${db.settings.localMaxKm}"></label>
   <label>Max Hours<input id="admLocalHours" type="number" value="${db.settings.localMaxHours}"></label>
  </div>
  <div class="actions"><button class="primary" onclick="saveAdminLimits()">Save Limits</button></div>
 </div>
 <div class="card">
  <h3>Change Admin Password</h3>
  <div class="grid"><label>New password<input id="admNewPass" type="password"></label></div>
  <div class="actions"><button class="primary" onclick="changeAdminPassword()">Update Password</button></div>
 </div>
 <div class="actions"><button onclick="adminLogout()">End Admin Session on This Device</button></div>`);
}
function saveAdminPlatform(){
 Object.assign(db.platform,{name:document.querySelector("#plName").value,tagline:document.querySelector("#plTagline").value,phone1:document.querySelector("#plPhone1").value,phone2:document.querySelector("#plPhone2").value,email:document.querySelector("#plEmail").value});
 save(); pushConfigToServer(); toast("Platform settings saved");
}
function saveAdminLimits(){
 db.settings.localMaxKm=+document.querySelector("#admLocalKm").value||50;
 db.settings.localMaxHours=+document.querySelector("#admLocalHours").value||5;
 save(); pushConfigToServer(); toast("Limits saved");
}
async function changeAdminPassword(){
 const newPass=document.querySelector("#admNewPass").value;
 if(!newPass||newPass.length<4){ toast("Password must be at least 4 characters"); return; }
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"admin_change_password",new_password:newPass,token:adminToken()})});
  const data=await res.json();
  if(!data.ok){ toast("Could not change password"); return; }
  toast("Password updated"); document.querySelector("#admNewPass").value="";
 }catch(e){ toast("Network error"); }
}

/* ---------- AUTHORIZED USERS (login allowlist) ---------- */
function tcAuthorizedUsersPage(){
 requireAdmin(()=>{ tcOpenMenuPage("authorized",tcRenderAuthorizedUsers); });
}
async function tcRenderAuthorizedUsers(){
 app().innerHTML=card("Authorized Users",`<p class="muted">Only mobile numbers listed here can log in as a Business Owner. Each number can also be limited to specific business categories - leave a number's categories empty to allow it to register as any category.</p>
 <div class="grid"><label>Mobile number<input id="auMobile"></label><label>Name/Label (optional)<input id="auLabel" placeholder="e.g. Driver Rajan"></label></div>
 <div class="actions"><button class="primary" onclick="tcAddAuthorized()">Add Number</button></div>
 <div id="auList">Loading...</div>`);
 tcLoadAuthorized();
}
async function tcLoadAuthorized(){
 const box=document.querySelector("#auList");
 if(!box) return;
 try{
  const res=await fetch("/api/authorized?action=list&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  const users=data.ok?data.users:[];
  if(!users.length){ box.innerHTML="<p class='muted'>No authorized numbers yet.</p>"; return; }
  box.innerHTML=users.map(u=>`<div class="listitem">
   <b>${esc(u.mobile)}</b>${u.name?" - "+esc(u.name):""}
   <div id="auCats_${esc(u.mobile).replace(/[^0-9a-zA-Z]/g,"")}" class="muted" style="margin-top:4px">Loading categories...</div>
   <div class="actions" style="margin-top:6px;flex-wrap:wrap">
    <select id="auCatAdd_${esc(u.mobile).replace(/[^0-9a-zA-Z]/g,"")}">${tcBusinessTypeOptions()}</select>
    <button onclick="tcAddCategoryFor('${esc(u.mobile)}')">+ Grant Category</button>
    <button class="danger" onclick="tcRemoveAuthorized('${esc(u.mobile)}')">Remove Number</button>
   </div>
  </div>`).join("");
  users.forEach(u=>tcLoadCategoriesFor(u.mobile));
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function tcLoadCategoriesFor(mobile){
 const safeId=mobile.replace(/[^0-9a-zA-Z]/g,"");
 const box=document.querySelector("#auCats_"+safeId);
 if(!box) return;
 try{
  const res=await fetch("/api/authorized?action=list_categories&mobile="+encodeURIComponent(mobile));
  const data=await res.json();
  const cats=(data.ok&&data.categories)?data.categories:[];
  if(!cats.length){ box.innerHTML="No category limit set - can register as any business type."; return; }
  box.innerHTML="Allowed categories: "+cats.map(c=>`<span style="display:inline-block;background:#e8f5f4;border-radius:12px;padding:2px 8px;margin:2px;font-size:11px">${esc(tcBizLabel(c))} <a href="#" onclick="tcRemoveCategoryFor('${esc(mobile)}','${esc(c)}');return false" style="color:#a12d2d;text-decoration:none">&times;</a></span>`).join("");
 }catch(e){ box.innerHTML=""; }
}
async function tcAddCategoryFor(mobile){
 const safeId=mobile.replace(/[^0-9a-zA-Z]/g,"");
 const sel=document.querySelector("#auCatAdd_"+safeId);
 try{
  await fetch("/api/authorized",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"add_category",mobile,category:sel.value,token:adminToken()})});
  toast("Category granted"); tcLoadCategoriesFor(mobile);
 }catch(e){ toast("Network error"); }
}
async function tcRemoveCategoryFor(mobile,category){
 try{
  await fetch("/api/authorized",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"remove_category",mobile,category,token:adminToken()})});
  toast("Category removed"); tcLoadCategoriesFor(mobile);
 }catch(e){ toast("Network error"); }
}
async function tcAddAuthorized(){
 const mobile=document.querySelector("#auMobile").value.trim();
 if(!mobile){ toast("Enter a mobile number"); return; }
 try{
  await fetch("/api/authorized",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"add",mobile,name:document.querySelector("#auLabel").value.trim(),token:adminToken()})});
  toast("Number added"); document.querySelector("#auMobile").value=""; document.querySelector("#auLabel").value="";
  tcLoadAuthorized();
 }catch(e){ toast("Network error"); }
}
async function tcRemoveAuthorized(mobile){
 if(!confirm("Remove access for "+mobile+"?")) return;
 try{
  await fetch("/api/authorized",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"remove",mobile,token:adminToken()})});
  toast("Number removed"); tcLoadAuthorized();
 }catch(e){ toast("Network error"); }
}

/* ---------- FEEDBACK ADMIN ---------- */
function tcOpenFeedbackAdmin(){
 requireAdmin(()=>{ tcOpenMenuPage("feedbackadmin",tcRenderFeedbackAdmin); });
}
async function tcRenderFeedbackAdmin(){
 app().innerHTML=card("Feedback / Suggestions",`<div id="fbList">Loading...</div>`);
 try{
  const res=await fetch("/api/feedback?action=list&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  const box=document.querySelector("#fbList");
  if(!data.ok||!data.items||!data.items.length){ box.innerHTML="<p class='muted'>No feedback submitted yet.</p>"; return; }
  box.innerHTML=data.items.map(f=>{
   const when=new Date(f.created_at).toLocaleString();
   return `<div class="listitem"><b>${esc(f.name||"Anonymous")}</b> ${f.mobile?"- "+esc(f.mobile):""}<br>
   <span class="muted">${esc(when)}</span><div style="margin-top:4px">${esc(f.message)}</div></div>`;
  }).join("");
 }catch(e){ document.querySelector("#fbList").innerHTML="<p class='danger'>Network error.</p>"; }
}

/* ---------- BOOTSTRAP (part 2 - final) ----------
   The actual first render() call, deliberately placed here at the very
   end of the LAST-loading file - by this point every function from all
   four files (core.js, business.js, directory.js, customer-safety.js)
   is defined, so render() can safely call anything from any of them
   (dashboard(), customerHome(), startSosPolling(), etc.) without a
   "not defined yet" error, regardless of which of those functions the
   current page/role happens to need. */
render();
