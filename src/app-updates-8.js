/* ---------- USEFUL PLACES (Petrol Pumps / Resorts / Tourist Spots / etc.) ----------
   A small, admin-curated directory (like Emergency Contacts) for places
   that would never self-register - petrol pumps, resorts, restaurants,
   tourist spots, hospitals the owner personally recommends. Location can
   be added even long after visiting: "Search location" geocodes a typed
   name/address via Nominatim (forward search), so no GPS visit is needed
   at add-time. */

const TC_PLACE_CATEGORIES=["Petrol Pump","Resort / Homestay","Restaurant","Tourist Spot","Hospital","Workshop","Other"];

/* Redefines admin() again to add a "Manage Useful Places" card. */
(function(){
 const orig=admin;
 admin=function(){
  orig();
  const container=document.querySelector(".card");
  if(container&&!document.querySelector("#usefulPlacesAdminCard")){
   const card=document.createElement("div");
   card.id="usefulPlacesAdminCard";
   card.className="card";
   card.innerHTML=`<h3>Useful Places</h3><p class="muted">Petrol pumps, resorts, restaurants, tourist spots and other places worth recommending - shown to everyone in the Local Directory.</p><div class="actions"><button onclick="tcOpenPlacesAdmin()">Manage Useful Places</button></div>`;
   container.appendChild(document.createElement("hr"));
   container.appendChild(card);
  }
 };
})();

function tcOpenPlacesAdmin(){ requireAdmin(tcRenderPlacesAdmin); }
function tcRenderPlacesAdmin(){
 const catOpts=TC_PLACE_CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("");
 modal(`<h2>Useful Places</h2>
  <div class="grid">
   <label>Name<input id="upName" placeholder="e.g. Indian Oil Petrol Pump"></label>
   <label>Category<select id="upCategory">${catOpts}</select></label>
   <label>Location / address<div style="display:flex;gap:6px"><input id="upLocation" placeholder="e.g. Marine Drive, Kochi" style="flex:1"><button type="button" onclick="tcSearchPlaceLocation()">&#128269;</button></div></label>
   <label>Phone (optional)<input id="upPhone"></label>
  </div>
  <input type="hidden" id="upLat"><input type="hidden" id="upLon">
  <div id="upSearchStatus" class="muted" style="font-size:11.5px;margin:-6px 0 6px">Type the name/address above and tap &#128269; to find its exact location - works even if you're adding this from somewhere else, days later.</div>
  <div class="actions"><button class="primary" onclick="tcAddPlace()">Add</button></div>
  <div id="upAdminList" style="margin-top:12px">Loading...</div>`);
 tcLoadPlacesAdmin();
}

/* Forward-geocodes whatever is typed in the location box (via the same
   Nominatim service already used elsewhere for reverse-geocoding) - shows
   the matched address so the person can confirm it found the right place
   before saving. */
async function tcSearchPlaceLocation(){
 const nameEl=document.querySelector("#upName");
 const locEl=document.querySelector("#upLocation");
 const status=document.querySelector("#upSearchStatus");
 const query=[nameEl.value,locEl.value].filter(Boolean).join(", ");
 if(!query){ status.textContent="Type at least a name or location first."; return; }
 status.textContent="Searching...";
 try{
  const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`);
  const data=await res.json();
  if(!data.length){ status.textContent="No match found - try a simpler search (just the town/area name), or add it without a precise pin."; return; }
  const hit=data[0];
  document.querySelector("#upLat").value=hit.lat;
  document.querySelector("#upLon").value=hit.lon;
  if(!locEl.value) locEl.value=hit.display_name;
  status.textContent="\u2705 Found: "+hit.display_name;
 }catch(e){ status.textContent="Search failed - check your connection."; }
}

async function tcLoadPlacesAdmin(){
 const box=document.querySelector("#upAdminList");
 if(!box) return;
 try{
  const res=await fetch("/api/places");
  const data=await res.json();
  if(!data.ok||!data.places.length){ box.innerHTML="<p class='muted'>No places added yet.</p>"; return; }
  box.innerHTML=data.places.map(p=>`<div class="listitem">
   <b>${esc(p.name)}</b> <span class="muted">(${esc(p.category||"-")})</span><br>
   <span class="muted">${esc(p.location||"")}${p.phone?" - "+esc(p.phone):""}</span>
   <div class="actions"><button class="danger" onclick="tcDeletePlace(${p.id})">Delete</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function tcAddPlace(){
 const name=document.querySelector("#upName").value.trim();
 if(!name){ toast("Enter a name"); return; }
 try{
  await fetch("/api/places",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
   action:"add",token:adminToken(),name,
   category:document.querySelector("#upCategory").value,
   location:document.querySelector("#upLocation").value.trim(),
   phone:document.querySelector("#upPhone").value.trim(),
   lat:document.querySelector("#upLat").value,
   lon:document.querySelector("#upLon").value
  })});
  toast("Place added");
  document.querySelector("#upName").value="";
  document.querySelector("#upLocation").value="";
  document.querySelector("#upPhone").value="";
  document.querySelector("#upLat").value="";
  document.querySelector("#upLon").value="";
  document.querySelector("#upSearchStatus").textContent="";
  tcLoadPlacesAdmin();
 }catch(e){ toast("Network error"); }
}
async function tcDeletePlace(id){
 if(!confirm("Delete this place?")) return;
 try{
  await fetch("/api/places",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"delete",id,token:adminToken()})});
  toast("Deleted");
  tcLoadPlacesAdmin();
 }catch(e){ toast("Network error"); }
}

/* Public display: a "Useful Places" card shown alongside Emergency
   Contacts, with a Directions button (precise pin if geocoded, else a
   text search fallback) - same pattern as the Local Directory. */
async function tcRenderUsefulPlaces(boxId){
 const box=document.querySelector("#"+boxId);
 if(!box) return;
 try{
  const res=await fetch("/api/places");
  const data=await res.json();
  if(!data.ok||!data.places.length){ box.innerHTML="<p class='muted' style='font-size:12px'>No places added yet.</p>"; return; }
  box.innerHTML=data.places.map(p=>{
   const hasPin=p.lat!=null&&p.lon!=null;
   const mapsUrl=hasPin
    ?"https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lon
    :"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([p.name,p.location].filter(Boolean).join(", "));
   return `<div style="padding:6px 0;border-bottom:1px solid #eee">
    <b>${esc(p.name)}</b> <span class="muted" style="font-size:11px">(${esc(p.category||"-")})</span><br>
    <span class="muted" style="font-size:12px">${esc(p.location||"")}</span>
    <div class="actions" style="margin-top:4px">
     ${p.phone?`<a href="tel:${esc(p.phone)}"><button class="primary">&#128222; ${esc(p.phone)}</button></a>`:""}
     <a href="${mapsUrl}" target="_blank"><button>&#128205; Directions</button></a>
    </div>
   </div>`;
  }).join("");
 }catch(e){ box.innerHTML="<p class='danger' style='font-size:12px'>Could not load places.</p>"; }
}

/* Adds the "Useful Places" box to the Customer page and the Owner/Partner
   pages, right after Emergency Contacts. */
(function(){
 const orig=customerHome;
 customerHome=function(){
  orig();
  const anchor=document.querySelector("#custEmergencyBox");
  if(anchor&&!document.querySelector("#custPlacesBox")){
   const box=document.createElement("div");
   box.id="custPlacesBox";
   box.style.cssText="background:#f5faf8;border:2px solid #2e9e6e;border-radius:8px;padding:10px;margin:10px 0";
   box.innerHTML=`<div style="font-weight:bold;color:#2e9e6e;font-size:13px;margin-bottom:4px">&#128205; Useful Places</div><div id="custPlacesList">Loading...</div>`;
   anchor.after(box);
   tcRenderUsefulPlaces("custPlacesList");
  }
 };
})();
(function(){
 const orig=dashboard;
 dashboard=function(){
  orig();
  const anchor=document.querySelector("#ownerEmergencyBox");
  if(anchor&&!document.querySelector("#ownerPlacesBox")){
   const box=document.createElement("div");
   box.id="ownerPlacesBox";
   box.style.cssText="background:#f5faf8;border:2px solid #2e9e6e;border-radius:8px;padding:10px;margin-bottom:14px";
   box.innerHTML=`<div style="font-weight:bold;color:#2e9e6e;font-size:13px;margin-bottom:4px">&#128205; Useful Places</div><div id="ownerPlacesList">Loading...</div>`;
   anchor.after(box);
   tcRenderUsefulPlaces("ownerPlacesList");
  }
 };
})();
(function(){
 const orig=renderPartnerDashboard;
 renderPartnerDashboard=function(p){
  orig(p);
  const anchor=document.querySelector("#ownerEmergencyBox");
  if(anchor&&!document.querySelector("#ownerPlacesBox")){
   const box=document.createElement("div");
   box.id="ownerPlacesBox";
   box.style.cssText="background:#f5faf8;border:2px solid #2e9e6e;border-radius:8px;padding:10px;margin-bottom:14px";
   box.innerHTML=`<div style="font-weight:bold;color:#2e9e6e;font-size:13px;margin-bottom:4px">&#128205; Useful Places</div><div id="ownerPlacesList">Loading...</div>`;
   anchor.after(box);
   tcRenderUsefulPlaces("ownerPlacesList");
  }
 };
})();

render();
