/* ---------- ADMIN: ALL PARTNERS (edit category / details) ----------
   Once a partner is approved, they disappear from "Pending Travel
   Partners" - there was no way for the admin to find and fix a mistake
   (like a wrong business category) after that. Adds an "All Partners"
   admin section (same pattern as the existing "All Vehicles"), with an
   Edit button per partner that opens the same business-details form a
   partner uses on themselves, but admin-authorized instead of mobile-
   ownership-authorized. */
(function(){
 const orig=admin;
 admin=function(){
  orig();
  const container=document.querySelector(".card");
  if(container&&!document.querySelector("#allPartnersAdminCard")){
   const card=document.createElement("div");
   card.id="allPartnersAdminCard";
   card.className="card";
   card.innerHTML=`<h3>All Travel Partners <span class="muted">(owner only - password protected)</span></h3><p class="muted">Find and correct any partner's details, including business category, whether verified or not.</p><div class="actions"><button onclick="tcLoadAllPartnersAdmin()">Load all partners</button></div><div id="allPartnersAdminList"></div>`;
   container.appendChild(document.createElement("hr"));
   container.appendChild(card);
  }
 };
})();
async function tcLoadAllPartnersAdmin(){
 const box=document.querySelector("#allPartnersAdminList");
 box.innerHTML="<p class='muted'>Loading...</p>";
 try{
  const res=await fetch("/api/partners?action=all&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load.</p>"; return; }
  if(!data.partners.length){ box.innerHTML="<p class='muted'>No partners registered yet.</p>"; return; }
  box.innerHTML=data.partners.map(p=>`<div class="listitem">
   <b>${esc(p.business_name)}</b> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">Pending</span>'} <span class="muted">${esc(tcBizLabel(p.business_type))}</span><br>
   <span class="muted">${esc(p.owner_name)} - ${esc(p.mobile1)}${p.location?" - "+esc(p.location):""}</span>
   <div class="actions"><button onclick="tcOpenAdminEditPartner(${p.id})">Edit</button></div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
function tcOpenAdminEditPartner(id){ requireAdmin(()=>tcDoOpenAdminEditPartner(id)); }
async function tcDoOpenAdminEditPartner(id){
 try{
  const res=await fetch("/api/partners?action=all&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  const p=(data.partners||[]).find(x=>x.id===id);
  if(!p){ toast("Partner not found"); return; }
  modal(`<h2>Edit Partner (Admin)</h2>
   <div class="grid">
    <label>Business type<div>${tcBizTypeFieldHtml("adBizType","adBizTypeOther",p.business_type)}</div></label>
    <label>Business name<input id="adBizName" value="${esc(p.business_name)}"></label>
    <label>Owner name<input id="adOwnerName" value="${esc(p.owner_name)}"></label>
    <label>Mobile 2<input id="adMobile2" value="${esc(p.mobile2||"")}"></label>
    <label>Email<input id="adEmail" value="${esc(p.email||"")}"></label>
    <label>Location<input id="adLocation" value="${esc(p.location||"")}"></label>
    <label>Pincode<input id="adPincode" value="${esc(p.pincode||"")}"></label>
   </div>
   <button class="primary" onclick="tcSaveAdminEditPartner(${p.id})">Save</button>`);
 }catch(e){ toast("Network error"); }
}
async function tcSaveAdminEditPartner(id){
 const body={action:"admin_update",partner_id:id,token:adminToken(),
  business_type:tcResolveBizType("adBizType","adBizTypeOther"),
  business_name:document.querySelector("#adBizName").value,
  owner_name:document.querySelector("#adOwnerName").value,
  mobile2:document.querySelector("#adMobile2").value,
  email:document.querySelector("#adEmail").value,
  location:document.querySelector("#adLocation").value,
  pincode:document.querySelector("#adPincode").value};
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data=await res.json();
  if(!data.ok){ toast("Could not save: "+(data.error||"unknown error")); return; }
  toast("Partner updated");
  closeModal();
  tcLoadAllPartnersAdmin();
 }catch(e){ toast("Network error"); }
}

/* ---------- FIX: "Available now" toggle showing Network Error ----------
   Redefines tcTogglePartnerAvailable() from scratch, matching exactly what
   the backend's set_available action expects (mobile + partner_id +
   available) - this replaces whatever the previous version was doing,
   without needing to track down its exact old code, and shows the real
   server error if it still fails instead of a generic "Network error". */
async function tcTogglePartnerAvailable(partnerId,available){
 const user=getCurrentUser();
 if(!user){ toast("Please log in again"); return; }
 try{
  const res=await fetch("/api/partners",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"set_available",partner_id:partnerId,mobile:user.mobile,available})});
  const data=await res.json();
  if(!data.ok){ toast("Could not update: "+(data.error||"unknown error")); return; }
  toast(available?"Marked available":"Marked unavailable");
 }catch(e){ toast("Network error"); }
}
render();
