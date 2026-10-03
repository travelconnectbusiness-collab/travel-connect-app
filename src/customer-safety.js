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
 /* The Emergency Contacts box is deliberately loud - solid red header, siren
    icon, an instruction line - so it reads as "emergency" at a glance. */
 if(id==="custEmergency"){
  return `<div class="card" id="${id}" style="padding:0;overflow:hidden;border:2px solid #c0392b;box-shadow:0 8px 18px rgba(192,57,43,.30)">
   <div style="cursor:pointer;display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(135deg,#922b21,#e74c3c);color:#fff" onclick="tcToggleCollapsible('${id}')">
    <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:23px;flex-shrink:0">&#128680;</div>
    <div style="flex:1;min-width:0">
     <div style="font-weight:900;font-size:16px;letter-spacing:.8px">EMERGENCY CONTACTS</div>
     <div style="font-size:12px;opacity:.95">Police, ambulance, fire and more. Tap here, then tap a number to call.</div>
    </div>
    <span id="${id}_arrow" style="font-size:20px">${startOpen?"\u25be":"\u25b8"}</span>
   </div>
   <div id="${id}_body" style="${startOpen?"":"display:none;"}padding:10px 14px;background:#fff5f4">${bodyHtml}</div>
  </div>`;
 }
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
/* ---------- NEARBY TRIP REQUEST (broadcast to all nearby Active drivers) ----------
   One tap sends the same request to every currently-Active, verified
   driver of the chosen category within range; whichever one accepts
   first gets it. Backend: functions/api/trip_alerts.js. */
let _tcTripPollTimer=null;
function tcOpenTripRequest(){
 modal(`<h2>&#128663; Request Nearby Vehicle</h2>
  <p class="muted">Sends one request to every Active driver nearby. Whoever accepts first gets your trip - you'll see their name and number here.</p>
  <div class="actions" style="flex-direction:column;gap:8px">
   <button class="primary" style="padding:14px" onclick="tcStartTripBroadcast('taxi_travel')">&#128663; Taxi / Travel</button>
   <button style="padding:14px" onclick="tcStartTripBroadcast('auto_rickshaw')">&#128664; Auto Rickshaw</button>
   <button style="padding:14px" onclick="tcStartTripBroadcast('pickup_goods')">&#128666; Pickup / Goods Carrier</button>
  </div>`);
}
async function tcStartTripBroadcast(businessType){
 const user=getCurrentUser();
 if(!user) return;
 modal(`<div style="text-align:center;padding:10px 0">
  <div style="font-size:15px;font-weight:700;margin-bottom:10px">Getting your location...</div>
  <div class="spinner" style="margin:0 auto"></div>
 </div>`);
 const loc=await tcGetLocation(false);
 if(loc.error!==undefined){
  modal(`<h2>Location needed</h2><p class="muted">${esc(tcLocationErrorText(loc.error))}</p><div class="actions"><button onclick="closeModal()">OK</button></div>`);
  return;
 }
 modal(`<h2>&#128663; Confirm Request</h2>
  <p class="muted">Category: <b>${esc(tcBizLabel(businessType))}</b></p>
  <label>Pickup landmark (optional, helps drivers find you)<input id="tripPickupText" placeholder="e.g. Near Nadapuram bus stand"></label>
  <label>Short note (optional)<textarea id="tripNote" rows="2" placeholder="e.g. 3 people, one bag"></textarea></label>
  <div class="actions"><button class="primary" onclick="tcSendTripBroadcast('${businessType}',${loc.lat},${loc.lon})">Send Request</button><button onclick="closeModal()">Cancel</button></div>`);
}
async function tcSendTripBroadcast(businessType,lat,lon){
 const user=getCurrentUser();
 if(!user) return;
 const pickupText=document.querySelector("#tripPickupText")?.value.trim()||"";
 const note=document.querySelector("#tripNote")?.value.trim()||"";
 modal(`<div style="text-align:center;padding:10px 0"><div class="spinner" style="margin:0 auto"></div></div>`);
 try{
  const res=await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   action:"broadcast",business_type:businessType,customer_name:user.name,customer_mobile:user.mobile,lat,lon,pickup_text:pickupText,message:note})});
  const data=await res.json();
  if(!data.ok){ modal(`<h2>Could not send</h2><p class="muted">Please check your connection and try again.</p><div class="actions"><button onclick="closeModal()">OK</button></div>`); return; }
  tcShowTripWaiting(data.alert_id,data.notified_count,businessType);
 }catch(e){ modal(`<h2>Network error</h2><p class="muted">Please check your connection and try again.</p><div class="actions"><button onclick="closeModal()">OK</button></div>`); }
}
function tcShowTripWaiting(alertId,notifiedCount,businessType){
 window._tcActiveTripAlertId=alertId;
 modal(`<div style="text-align:center;padding:6px 0">
  <div class="spinner" style="margin:0 auto 10px"></div>
  <h2 style="margin:4px 0">Waiting for a driver...</h2>
  <p class="muted">${notifiedCount>0?notifiedCount+" nearby "+esc(tcBizLabel(businessType))+(notifiedCount>1?" drivers":" driver")+" notified.":"No drivers are currently Active nearby for this category."}</p>
  <div id="tripWaitStatus" class="muted" style="font-size:12.5px;min-height:18px"></div>
  <div class="actions" style="margin-top:10px"><button onclick="tcCancelTripRequest(${alertId})">Cancel Request</button></div>
 </div>`);
 if(_tcTripPollTimer) clearInterval(_tcTripPollTimer);
 _tcTripPollTimer=setInterval(()=>tcPollTripStatus(alertId),4000);
 tcPollTripStatus(alertId);
}
async function tcPollTripStatus(alertId){
 const user=getCurrentUser();
 if(!user||window._tcActiveTripAlertId!==alertId){ clearInterval(_tcTripPollTimer); return; }
 try{
  const res=await fetch("/api/trip_alerts?action=status&alert_id="+alertId+"&mobile="+encodeURIComponent(user.mobile));
  const data=await res.json();
  if(!data.ok) return;
  if(data.status==="accepted"){
   clearInterval(_tcTripPollTimer);
   tcShowTripAccepted(data.partner);
  }else if(data.status==="expired"||data.status==="cancelled"){
   clearInterval(_tcTripPollTimer);
   if(document.querySelector("#tripWaitStatus")){
    modal(`<div style="text-align:center;padding:6px 0"><h2>No driver available</h2><p class="muted">Nobody accepted in time. You can try again, or browse the Active Vehicles Board / Local Directory directly.</p><div class="actions"><button class="primary" onclick="closeModal();tcOpenTripRequest()">Try Again</button><button onclick="closeModal()">Close</button></div></div>`);
   }
  }
 }catch(e){}
}
function tcShowTripAccepted(partner){
 window._tcActiveTripAlertId=null;
 modal(`<div style="text-align:center;padding:6px 0">
  <div style="font-size:40px">&#9989;</div>
  <h2 style="margin:6px 0;color:#1c6b2c">${esc(partner.business_name)} accepted!</h2>
  <p class="muted">Call them now to confirm your pickup.</p>
  <div class="actions" style="margin-top:10px"><a href="tel:${esc(partner.mobile1||partner.mobile2)}" style="text-decoration:none"><button class="primary" style="padding:14px;font-size:16px">&#128222; Call ${esc(partner.mobile1||partner.mobile2)}</button></a></div>
  <div class="actions"><button onclick="closeModal()">Close</button></div>
 </div>`);
}
async function tcCancelTripRequest(alertId){
 const user=getCurrentUser();
 if(!user) return;
 clearInterval(_tcTripPollTimer);
 window._tcActiveTripAlertId=null;
 try{
  await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"cancel",alert_id:alertId,mobile:user.mobile})});
 }catch(e){}
 closeModal();
 toast("Request cancelled");
}
function customerHome(){
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
 const user=getCurrentUser();
 app().innerHTML=`<section class="container"><div class="card">
  ${tcMessagesCardHtml()}
  <div onclick="tcOpenTripRequest()" style="cursor:pointer;display:flex;align-items:center;gap:14px;padding:16px;margin:2px 0 14px;border-radius:18px;color:#fff;background:linear-gradient(135deg,#b8860b,#e0a526 60%,#f0b94a);box-shadow:0 8px 18px rgba(184,134,11,.35)">
   <div style="width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.22);display:flex;align-items:center;justify-content:center;font-size:25px;flex-shrink:0">&#128663;</div>
   <div style="flex:1;min-width:0">
    <div style="font-weight:800;font-size:17px">Request Nearby Vehicle</div>
    <div style="font-size:12.5px;opacity:.95">Taxi, Auto or Pickup - alerts all nearby drivers at once</div>
   </div>
   <div style="font-size:26px;opacity:.9;line-height:1">&rsaquo;</div>
  </div>
  <div class="actions" style="margin-bottom:4px">
   <button class="primary" style="flex:1;font-size:15px;padding:14px" onclick="tcOpenDirectory()">&#128269; ${tcT("local_directory_find")}</button>
  </div>
  <div class="actions">
   <button style="flex:1" onclick="view('activeboard')">&#128663; ${tcT("available_vehicles_now")}</button>
  </div>

  <h2 style="margin-top:18px">${tcT("fare_estimate_title")}</h2>
  <div class="grid">
   <label>${tcT("vehicle_category_label")}<select id="cCat"><option value="">${tcT("select_placeholder")}</option>${cat}</select></label>
   <label>${tcT("trip_type_label")}<select id="cType">
     <option value="">${tcT("select_placeholder")}</option>
     <option value="local">${tcT("trip_local")}</option><option value="one_day">${tcT("trip_oneday")}</option>
     <option value="round">${tcT("trip_round")}</option><option value="outstation">${tcT("trip_outstation")}</option><option value="drop">${tcT("trip_drop")}</option>
   </select></label>
  </div>
  <div id="cTypeWarn" class="danger" style="min-height:16px"></div>
  <div class="grid">
   <label>${tcT("pickup_point_label")}<input id="cPickup"></label>
   <label>${tcT("destination_label")} 1<input id="cDest"></label>
  </div>
  <div id="custStopsContainer"></div>
  <div class="actions"><button type="button" onclick="tcAddCustDestField()">${tcT("add_destination")}</button></div>
  <div class="grid" style="margin-top:6px">
   <label>${tcT("estimated_km_label")}<input id="cKm" type="number" placeholder="e.g. 40"></label>
   <label>${tcT("estimated_hours_label")}<input id="cHours" type="number" placeholder="e.g. 4"></label>
  </div>
  <div class="actions"><button type="button" onclick="tcOpenCustomerRoute()">&#128663; ${tcT("open_route_maps")}</button></div>
  <details style="margin:6px 0">
   <summary style="cursor:pointer;font-size:12.5px;color:#0b6b78">${tcT("more_options")}</summary>
   <div class="grid" style="margin-top:6px">
    <label>${tcT("vehicle_start_label")}<input id="cVehicleStart" placeholder="e.g. Nadapuram"></label>
    <label>${tcT("vehicle_close_label")}<input id="cVehicleClose" placeholder="e.g. Nadapuram"></label>
    <label>${tcT("days_label")}<input id="cDays" type="number" value="1" min="1"></label>
    <label>${tcT("rest_hours_label")}<input id="cRestHours" type="number" value="0"></label>
   </div>
  </details>
  <div class="actions"><button class="primary" onclick="calcCustomerFare()">${tcT("get_fare_estimate")}</button></div>
  <div id="cResult" class="ratebox"></div>

  ${tcCollapsibleBox("custUsefulPlaces","&#128205; "+tcT("useful_places_title"),`<div id="custPlacesList">${tcT("loading")}</div>`,false)}
  ${tcCollapsibleBox("custEmergency","&#9888; "+tcT("emergency_contacts_title"),`<div id="custEmergencyList">${tcT("loading")}</div>`,false)}
  ${tcCollapsibleBox("custMyCalls","&#128222; "+tcT("calls_made_title"),`<div id="custCallsList">${tcT("loading")}</div>`,false)}

  <div class="card">
   <h3>${tcT("feedback_title")}</h3>
   <textarea id="custFeedback" rows="3" placeholder="${tcT("feedback_placeholder")}"></textarea>
   <div class="actions"><button class="primary" onclick="tcSubmitFeedback()">${tcT("send_feedback")}</button></div>
  </div>

  <div class="card">
   <details><summary style="cursor:pointer;font-size:12.5px;color:#6a7a87">${tcT("about_travel_connect")}</summary>
   <p class="muted" style="font-size:12px;margin-top:6px">${tcT("about_text")}</p>
   </details>
  </div>
  <div class="actions" style="margin-top:10px"><button onclick="logout()">${tcT("logout_device")}</button></div>
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
 const plan=(type==="local")?"local":(type==="drop")?"drop":"competitive";
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
   const when=tcFormatDateTime(c.created_at);
   return `<div class="listitem"><b>${esc(c.target_label||c.callee_mobile)}</b><br>
   <span class="muted">${(c.target_type||"").indexOf("whatsapp")===0?"You messaged":"You called"} ${esc(c.callee_mobile)} &bull; ${esc(when)}</span>
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
  box.innerHTML=data.contacts.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f1d3cf">
   <div style="font-weight:700;color:#7b241c;font-size:15px">${esc(c.name)}</div>
   <a href="tel:${esc(c.number)}" style="text-decoration:none"><button style="background:linear-gradient(135deg,#b03a2e,#e74c3c);color:#fff;border:none;border-radius:24px;padding:11px 18px;font-weight:900;font-size:15px;box-shadow:0 3px 8px rgba(176,58,46,.35)">&#128222; ${esc(c.number)}</button></a>
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
 app().innerHTML=card(tcT("emergency_sos_title"),`<div id="locPermNote"></div>
  <div style="background:linear-gradient(135deg,#7b241c,#c0392b 55%,#e74c3c);color:#fff;border-radius:18px;padding:20px 16px;text-align:center;box-shadow:0 10px 22px rgba(192,57,43,.38)">
   <div style="font-size:16px;font-weight:800;margin-bottom:6px">${tcT("sos_press_title")}</div>
   <div style="font-size:12.5px;opacity:.95;margin-bottom:16px;line-height:1.55">${tcT("sos_press_sub")}</div>
   <button id="sosBigBtn" onclick="tcConfirmSos()" style="width:100%;background:#fff;color:#c0392b;font-size:21px;font-weight:900;letter-spacing:1px;padding:20px 10px;border-radius:16px;border:none;box-shadow:0 5px 0 rgba(0,0,0,.2);animation:tcSosPulse 2.2s infinite">&#128680; ${tcT("sos_send_button")}</button>
   <div id="nStatus" style="margin-top:12px;font-size:12.5px;min-height:18px"></div>
  </div>
  <div id="sosResult"></div>
  <label style="margin-top:14px">${tcT("sos_message_label")}<textarea id="nMsg" rows="2" placeholder="${tcT("sos_message_placeholder")}"></textarea></label>
  <div id="pushPermNote" style="margin-top:12px"></div>
  <div style="margin-top:14px;padding:12px 14px;border-radius:14px;background:#f5f8fa;font-size:12.5px;line-height:1.6;color:#33475b">
   <b>${tcT("sos_what_happens_title")}</b><br>
   1. ${tcT("sos_what_happens_1")}<br>
   2. ${tcT("sos_what_happens_2")}<br>
   3. ${tcT("sos_what_happens_3")}<br>
   4. ${tcT("sos_what_happens_4")}
  </div>
  <hr><h3>&#128680; ${tcT("sos_history_title")}</h3><div id="sosHistoryBox">${tcT("loading")}</div>`);
 loadSosHistory();
 startSosHistoryAutoRefresh();
 checkLocationPermissionUI();
 updatePushNoteUI();
 tcPrepareSosLocation();
}
/* Gets the location as soon as the SOS page opens, so it is already ready
   (and any permission question already answered) at the moment it matters. */
async function tcPrepareSosLocation(){
 const st=document.querySelector("#nStatus");
 if(st) st.innerHTML="Getting your location...";
 const loc=await tcGetLocation(false);
 const box=document.querySelector("#nStatus");
 if(!box) return;
 if(loc.lat!==undefined){
  window.tcLoc={lat:loc.lat,lon:loc.lon};
  box.innerHTML="&#128205; Your location is ready and will be sent with the alert.";
 }else{
  box.innerHTML="Location is not available - the alert will still send your name and number.<br><span style=\"opacity:.9\">"+esc(tcLocationErrorText(loc.error))+"</span>";
 }
}
/* One confirmation before an SOS goes to everyone - too easy to press by
   accident otherwise. */
function tcConfirmSos(){
 modal(`<div style="text-align:center">
  <div style="font-size:46px">&#128680;</div>
  <h2 style="color:#c0392b;margin:6px 0">${tcT("sos_confirm_title")}</h2>
  <p class="muted">${tcT("sos_confirm_sub")}</p>
  <div class="actions"><button onclick="closeModal()" style="padding:14px">${tcT("sos_confirm_cancel")}</button><button onclick="closeModal();sos()" style="padding:14px;background:linear-gradient(135deg,#b03a2e,#e74c3c);color:#fff;font-weight:900">${tcT("sos_confirm_yes")}</button></div>
 </div>`);
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
  const myMobile=(getCurrentUser()||{}).mobile;
  box.innerHTML=data.alerts.map(a=>{
   const when=tcFormatDateTime(a.created_at);
   const mapLink=(a.lat!=null&&a.lon!=null)?`<a href="https://maps.google.com/?q=${a.lat},${a.lon}" target="_blank">View location</a>`:"";
   const callLink=a.sender_mobile?`<a href="tel:${esc(a.sender_mobile)}">${esc(a.sender_mobile)}</a>`:"-";
   const isMine=myMobile&&a.sender_mobile&&myMobile===a.sender_mobile;
   return `<div class="listitem"><b>&#128680; ${esc(a.sender_name||"A user")}</b> - ${esc(when)}<br>
   Mobile: ${callLink} ${mapLink?" &nbsp;|&nbsp; "+mapLink:""}
   ${a.message?`<div class="muted">"${esc(a.message)}"</div>`:""}
   ${isMine?`<div class="actions"><button class="primary" onclick="tcResolveSos(${a.id})">&#9989; Mark Resolved (I got help)</button></div>`:""}</div>`;
  }).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Could not load SOS history.</p>"; }
}
/* Lets the person who SENT an SOS clear it from everyone's history once
   they are safe - only them, so nobody else can silently dismiss someone
   else's still-active emergency. */
async function tcResolveSos(id){
 try{
  const mobile=(getCurrentUser()||{}).mobile;
  const res=await fetch("/api/sos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"resolve",id,mobile})});
  const data=await res.json().catch(()=>({}));
  if(!data.ok){ toast("Could not mark resolved"); return; }
  toast("Marked resolved");
  loadSosHistory();
 }catch(e){ toast("Network error - try again"); }
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
 const st=document.querySelector("#nStatus");
 if(st) st.innerHTML=tcT("sos_sending");
 /* Normally the location was already fetched when the page opened; if not,
    one quick attempt (a recent cached position is fine) so the alert is
    never held up. */
 if(!window.tcLoc){
  const loc=await tcGetLocation(true);
  if(loc.lat!==undefined) window.tcLoc={lat:loc.lat,lon:loc.lon};
 }
 const user=getCurrentUser()||{};
 const typedMsg=(document.querySelector("#nMsg")?.value||"").trim();
 const msg=typedMsg?`SOS from ${user.name||"a user"}: ${typedMsg}`:`SOS from ${user.name||"a user"}. Needs urgent assistance.`;
 const result=document.querySelector("#sosResult");
 try{
  const res=await fetch("/api/sos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sender_name:user.name||"",sender_mobile:user.mobile||"",message:msg,lat:window.tcLoc?window.tcLoc.lat:null,lon:window.tcLoc?window.tcLoc.lon:null})});
  const data=await res.json();
  if(!data.ok) throw new Error("not ok");
  if(st) st.innerHTML="";
  if(result) result.innerHTML=`<div style="margin-top:14px;padding:16px;border-radius:16px;background:#e9f7ee;border:2px solid #2e9e44;color:#1c6b2c">
   <div style="font-weight:900;font-size:17px">&#9989; ${tcT("sos_sent_title")}</div>
   <div style="margin-top:6px;font-size:13.5px;line-height:1.55">${window.tcLoc?tcT("sos_alerted_with_loc"):tcT("sos_alerted_no_loc")} ${tcT("sos_sent_sub")} <b>${esc(user.mobile||"your number")}</b>.</div>
   <div class="actions" style="margin-top:10px"><a href="tel:112" style="text-decoration:none"><button style="background:linear-gradient(135deg,#b03a2e,#e74c3c);color:#fff;font-weight:900">&#128222; ${tcT("call_112")}</button></a><button onclick="tcShareSos()">${tcT("share_whatsapp")}</button></div>
  </div>`;
  toast(tcT("toast_sos_sent"));
  loadSosHistory();
 }catch(e){
  if(st) st.innerHTML="";
  if(result) result.innerHTML=`<div style="margin-top:14px;padding:16px;border-radius:16px;background:#fdeceb;border:2px solid #c0392b;color:#7b241c">
   <div style="font-weight:900;font-size:16px">&#9888; ${tcT("sos_failed_title")}</div>
   <div style="margin-top:6px;font-size:13.5px">${tcT("sos_failed_sub")}</div>
   <div class="actions" style="margin-top:10px"><a href="tel:112" style="text-decoration:none"><button style="background:linear-gradient(135deg,#b03a2e,#e74c3c);color:#fff;font-weight:900">&#128222; ${tcT("call_112")}</button></a></div>
  </div>`;
 }
}
/* Optional extra step after an SOS, kept as an explicit button so the phone's
   share sheet never pops up unasked in the middle of an emergency. */
function tcShareSos(){
 const shareMsg=`TRAVEL CONNECT SOS. I need urgent assistance. Location: ${window.tcLoc?`https://maps.google.com/?q=${window.tcLoc.lat},${window.tcLoc.lon}`:"Please check my live location."}`;
 if(navigator.share) navigator.share({title:"Travel Connect SOS",text:shareMsg}).catch(()=>{});
 else toast("Sharing is not supported on this phone");
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
function tcPushWhat(){
 const u=getCurrentUser();
 return (u&&u.role==="customer")?"new messages":"new messages and SOS alerts";
}
function updatePushNoteUI(){
 const box=document.querySelector("#pushPermNote");
 if(!box) return;
 if(!("serviceWorker" in navigator)||!("PushManager" in window)){ box.innerHTML=`<div class="muted">Notifications aren't supported in this browser.</div>`; return; }
 if(Notification.permission==="denied"){ box.innerHTML=`<div class="danger">&#9888; Notifications are blocked for this site. Allow them in your phone or browser settings to get ${tcPushWhat()} when the app is closed.</div>`; return; }
 if(Notification.permission==="granted"&&localStorage.getItem("tc_push_confirmed")==="1"){
  box.innerHTML=`<div class="ok">&#9989; Notifications are on - you'll get ${tcPushWhat()} even if the app is closed.</div><div class="actions"><button onclick="enablePushNotifications()">Re-check / Re-subscribe</button></div>`;
  return;
 }
 if(Notification.permission==="granted"){
  box.innerHTML=`<div class="danger">&#9888; Notification permission granted, but not confirmed saved yet.</div><div class="actions"><button class="primary" onclick="enablePushNotifications()">Finish Notification Setup</button></div>`;
  return;
 }
 box.innerHTML=`<div style="padding:12px 14px;border-radius:14px;background:#fff8e8;border:1px solid #e2c27a;color:#7a5a1e;font-size:13px">&#128276; <b>Turn on notifications</b> to get ${tcPushWhat()} even when the app is closed.<div class="actions" style="margin-top:8px"><button class="primary" onclick="enablePushNotifications()">Turn on notifications</button></div></div>`;
}
/* A device's push subscription is stored against the mobile number that was
   logged in when it was created. When someone else logs in on the same phone
   (or a phone that subscribed before this was tracked), re-save it under the
   current number so notifications reach the right person. */
async function tcSyncPushSubscription(){
 try{
  const user=getCurrentUser();
  if(!user||!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)) return;
  if(Notification.permission!=="granted") return;
  if(localStorage.getItem("tc_push_mobile")===user.mobile) return;
  const reg=await navigator.serviceWorker.ready;
  const sub=await reg.pushManager.getSubscription();
  if(!sub) return;
  const res=await fetch("/api/push",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"subscribe",mobile:user.mobile||"",subscription:sub.toJSON()})});
  const data=await res.json().catch(()=>({}));
  if(data.ok){ localStorage.setItem("tc_push_mobile",user.mobile); localStorage.setItem("tc_push_confirmed","1"); }
 }catch(e){}
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
   localStorage.setItem("tc_push_mobile",user.mobile||"");
   toast("Notifications enabled");
   setTimeout(()=>{ updatePushNoteUI(); if(typeof tcPaintMsgPushHint==="function") tcPaintMsgPushHint(); },1200);
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
   const when=tcFormatDateTime(f.created_at);
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
