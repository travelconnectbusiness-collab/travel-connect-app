/* app-updates-2.js — a SECOND, separate file loaded after app-updates.js.
   This is entirely new, self-contained code (an App PIN lock) that doesn't
   redefine any existing function from app.js/app-updates.js, so it's kept in
   its own file rather than growing app-updates.js further — see the comments
   in app-updates.js for why the file-splitting approach exists at all.

   How it works: after the user is already logged in (name+mobile, unchanged),
   this adds ONE MORE local, per-device gate — a short PIN — so a phone picked
   up by someone else can't just reopen the app and start using it. It's
   implemented as a full-screen overlay appended on top of everything else,
   so it never needs to touch render() or any of the view-routing logic. */

function tcPinHash(text){
 return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(buf =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("")
 );
}
function tcHasPinSet(){ return !!localStorage.getItem("tc_pin_hash"); }
function tcPinUnlockedThisSession(){ return sessionStorage.getItem("tc_pin_unlocked") === "1"; }

function tcShowPinOverlay(mode){
 let el = document.querySelector("#tcPinOverlay");
 if (!el) {
  el = document.createElement("div");
  el.id = "tcPinOverlay";
  el.style.cssText = "position:fixed;inset:0;z-index:99999;background:linear-gradient(160deg,#082b49,#0f5a55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  document.body.appendChild(el);
 }
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 const cardOpen=`<div style="background:#fff;border-radius:18px;max-width:340px;width:100%;padding:28px 24px;text-align:center;box-shadow:0 12px 32px rgba(0,0,0,.35)">
   ${logo?`<img src="${logo}" style="width:56px;height:56px;border-radius:12px;margin-bottom:10px">`:""}
   <div style="font-weight:800;letter-spacing:1.5px;color:#082b49;font-size:16px">TRAVEL CONNECT</div>
   <div style="color:#6a7a87;font-size:12px;margin-bottom:16px">Professional Travel Business Platform</div>`;
 const cardClose=`</div>`;
 if (mode === "setup") {
  el.innerHTML = cardOpen+`
   <div style="width:56px;height:56px;border-radius:50%;background:#e8f5f4;display:flex;align-items:center;justify-content:center;margin:6px auto"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0b6b78" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg></div>
   <h2 style="margin:0 0 6px;color:#172536">Set an App PIN</h2>
   <p style="color:#6a7a87;font-size:13px;margin:0 0 18px">This keeps your business data private on this device — choose a 4-6 digit PIN you'll enter each time you reopen the app here.</p>
   <input id="tcPinNew" autocomplete="off" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="New PIN" style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:9px;border:1px solid #c9d4dc;width:180px;margin-bottom:10px">
   <input id="tcPinConfirm" autocomplete="off" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="Confirm PIN" style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:9px;border:1px solid #c9d4dc;width:180px;margin-bottom:14px">
   <div id="tcPinErr" style="color:#a12d2d;min-height:20px;margin-bottom:6px;font-size:13px"></div>
   <button onclick="tcSubmitPinSetup()" style="padding:11px 24px;border-radius:9px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:15px;width:100%">Set PIN</button>
  `+cardClose;
 } else {
  el.innerHTML = cardOpen+`
   <div style="width:56px;height:56px;border-radius:50%;background:#e8f5f4;display:flex;align-items:center;justify-content:center;margin:6px auto"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0b6b78" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg></div>
   <h2 style="margin:0 0 6px;color:#172536">Welcome back</h2>
   <p style="color:#6a7a87;font-size:13px;margin:0 0 18px">Enter your PIN to continue.</p>
   <input id="tcPinEntry" autocomplete="off" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="PIN" autofocus style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:9px;border:1px solid #c9d4dc;width:180px;margin-bottom:10px" onkeydown="if(event.key==='Enter')tcSubmitPinEntry()">
   <div id="tcPinErr" style="color:#a12d2d;min-height:20px;margin-bottom:6px;font-size:13px"></div>
   <button onclick="tcSubmitPinEntry()" style="padding:11px 24px;border-radius:9px;border:none;background:#0b6b78;color:#fff;font-weight:700;font-size:15px;width:100%;margin-bottom:14px">Unlock</button>
   <div><a href="#" onclick="tcForgotPin();return false" style="color:#0b6b78;font-size:13px;font-weight:600">Forgot PIN?</a></div>
  `+cardClose;
  setTimeout(() => document.querySelector("#tcPinEntry")?.focus(), 50);
 }
}
function tcHidePinOverlay(){
 document.querySelector("#tcPinOverlay")?.remove();
}
async function tcSubmitPinSetup(){
 const a = document.querySelector("#tcPinNew").value.trim();
 const b = document.querySelector("#tcPinConfirm").value.trim();
 const err = document.querySelector("#tcPinErr");
 if (!/^\d{4,6}$/.test(a)) { err.textContent = "PIN must be 4-6 digits."; return; }
 if (a !== b) { err.textContent = "PINs don't match."; return; }
 const hash = await tcPinHash(a);
 localStorage.setItem("tc_pin_hash", hash);
 sessionStorage.setItem("tc_pin_unlocked", "1");
 tcHidePinOverlay();
}
async function tcSubmitPinEntry(){
 const entered = document.querySelector("#tcPinEntry").value.trim();
 const err = document.querySelector("#tcPinErr");
 const hash = await tcPinHash(entered);
 if (hash === localStorage.getItem("tc_pin_hash")) {
  sessionStorage.setItem("tc_pin_unlocked", "1");
  tcHidePinOverlay();
 } else {
  err.textContent = "Wrong PIN. Try again.";
  document.querySelector("#tcPinEntry").value = "";
 }
}
function tcForgotPin(){
 if (!confirm("Forgetting your PIN will also log you out of this device — you'll need to log in again with your name and mobile number, then set a new PIN. Continue?")) return;
 localStorage.removeItem("tc_pin_hash");
 localStorage.removeItem("tc_user");
 sessionStorage.removeItem("tc_pin_unlocked");
 location.reload();
}
function tcCheckPinLock(){
 let user = null;
 try { user = JSON.parse(localStorage.getItem("tc_user") || "null"); } catch (e) {}
 if (!user) return; /* not logged in yet — the normal login screen handles this, no PIN needed before that */
 if (tcPinUnlockedThisSession()) return;
 tcShowPinOverlay(tcHasPinSet() ? "entry" : "setup");
}

/* Redefines dashboard() again (it already lives in app-updates.js) purely to add
   one button — done here in app-updates-2.js instead of touching app-updates.js,
   keeping that file frozen as agreed. The later-loaded file's version wins, same
   principle as app-updates.js overriding app.js. */
function dashboard(){
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean).join(" / ");
 app().innerHTML=card("Travel Connect Dashboard",`
 <div style="background:#e8f5f4;border:2px solid #148c76;border-radius:10px;padding:14px;text-align:center;margin-bottom:14px">
  <div style="font-weight:800;font-size:19px;color:#0f5a55">${esc(db.business.name||"Your Business Name")}</div>
  ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
  ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
  ${db.business.email?`<div style="font-size:12px;color:#555">${esc(db.business.email)}</div>`:""}
  ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:14px;margin-top:4px">${esc(partnerPhones)}</div>`:""}
  <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Edit Business Details</button></div>
  ${(db.settings.myPlan==="paid"||db.settings.myPlan==="owner_free")?
   `<div style="margin-top:8px;font-size:11.5px;color:#0f5a55;font-weight:bold">&#11088; Premium — your own business name/contact shown on every bill & quotation</div>`:
   `<div style="margin-top:8px;background:#fff8e8;border:1px solid #d2b478;border-radius:8px;padding:8px;font-size:11.5px;color:#7a5a1e">&#128274; Free plan — bills currently show Travel Connect's contact details, with your name shown small. <b>Upgrade to Premium</b> to show YOUR business name & contact prominently on every bill/quotation. Contact Travel Connect to upgrade.</div>`}
 </div>
 <div class="actions">
  <button class="primary" style="background:#3b7bbf;border-color:#3b7bbf" onclick="view('enquiries')">New Enquiry</button>
  <button style="background:#148c76;color:#fff;border-color:#148c76" onclick="view('quotations')">New Quotation</button>
  <button style="background:#c9820d;color:#fff;border-color:#c9820d" onclick="goQuickBill()">&#9889; Quick Bill</button>
  <button style="background:#6b7280;color:#fff;border-color:#6b7280" onclick="view('master')">Rate Master</button>
 </div>
 <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Travel Partner / Vehicles</button><button onclick="view('activeboard')">Active Vehicles Board</button></div>
 <hr>
 <div class="grid">
 <div class="metric">Customers<b>${db.customers.length}</b></div><div class="metric">Drivers<b>${db.drivers.length}</b></div>
 <div class="metric">Vehicles<b>${db.vehicles.length}</b></div><div class="metric">Saved Quotations<b>${db.quotes.length}</b></div>
 </div><div class="card"><h3>Business workflow</h3><p>Enquiry → Quotation → Confirmation → Trip → Final Bill → Payment → Accounts</p>
 <div class="notice"><b>Local Trip:</b> maximum ${db.settings.localMaxKm} KM AND ${db.settings.localMaxHours} hours. If either limit is exceeded, it automatically switches to a One Day tariff.</div></div>
 `);
}

tcCheckPinLock();

/* ---------- ALLOWLIST LOGIN — Authorized Users management (admin panel) ----------
   Reachable from the Dashboard (a new button, since dashboard() is already known
   and safe to extend). Add/remove which mobile numbers are allowed to log in at
   all — matching is by mobile number only, not name, so a spelling difference
   never locks out someone whose number IS on the list. Actual enforcement at the
   login screen itself lives in auth.js (a separate change, since that file's
   current content isn't available here yet). */
function tcAuthorizedUsersPage(){
 /* Manages its own history entry the same way view() does — this page is
    reached only from the ☰ Menu, never from a tab, so it always marks
    fromMenu:true; Back from here correctly reopens the Menu. */
 if(!history.state||!history.state.tcPage){
  history.pushState({tcPage:true,fromMenu:true},"",location.pathname+location.search+"#authorized");
 }else{
  history.replaceState({tcPage:true,fromMenu:true},"",location.pathname+location.search+"#authorized");
 }
 tcCurrentIsFromMenu=true;
 tcMenuNavPending=false;
 requireAdmin(() => tcRenderAuthorizedUsersPage());
}
async function tcRenderAuthorizedUsersPage(){
 app().innerHTML = card("Authorized Users (Login Allowlist)", `
  <div class="card" style="background:#fff8e8;border:2px solid #d2b478">
   <h3 style="margin-top:0">&#128081; Owner Number</h3>
   <p class="muted">This one number can never be blocked and never needs to be on the list below — a safety net so you can never lock yourself out. Editing it still needs the admin password (already entered to reach this page).</p>
   <div id="tcOwnerBox">Loading...</div>
  </div>
  <hr>
  <p class="muted">Only mobile numbers added here can log in to this app. Matching is by mobile number only — the name is just a label to help you remember whose number it is.</p>
  <div class="grid">
   <label>Mobile number<input id="tcAuthMobile" type="tel"></label>
   <label>Name (optional label)<input id="tcAuthName"></label>
  </div>
  <div class="actions"><button class="primary" onclick="tcAddAuthorizedUser()">+ Add</button></div>
  <div id="tcAuthList">Loading...</div>
 `);
 tcLoadAuthorizedUsers();
 tcLoadOwner();
}
async function tcLoadOwner(){
 const box = document.querySelector("#tcOwnerBox");
 if (!box) return;
 try {
  const token = sessionStorage.getItem("tc_admin_token");
  const res = await fetch("/api/authorized?action=get_owner&token=" + encodeURIComponent(token));
  const data = await res.json();
  const owner = data.ok ? data.owner : null;
  box.innerHTML = `
   <div style="margin-bottom:8px">${owner ? `<b>${esc(owner.mobile)}</b>${owner.name ? " — " + esc(owner.name) : ""}` : "<span class='muted'>No owner number set yet.</span>"}</div>
   <div class="grid">
    <label>Owner mobile number<input id="tcOwnerMobile" type="tel" value="${owner ? esc(owner.mobile) : ""}"></label>
    <label>Owner name<input id="tcOwnerName" value="${owner ? esc(owner.name || "") : ""}"></label>
   </div>
   <div class="actions"><button class="primary" onclick="tcSaveOwner()">${owner ? "Update" : "Set"} Owner Number</button></div>
  `;
 } catch (e) { box.innerHTML = "<p class='danger'>Network error.</p>"; }
}
async function tcSaveOwner(){
 const mobile = document.querySelector("#tcOwnerMobile").value.trim();
 const name = document.querySelector("#tcOwnerName").value.trim();
 if (!mobile) { toast("Enter the owner's mobile number"); return; }
 const token = sessionStorage.getItem("tc_admin_token");
 await fetch("/api/authorized", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set_owner", mobile, name, token }) });
 toast("Owner number saved");
 tcLoadOwner();
}
async function tcLoadAuthorizedUsers(){
 const box = document.querySelector("#tcAuthList");
 if (!box) return;
 try {
  const token = sessionStorage.getItem("tc_admin_token");
  const res = await fetch("/api/authorized?action=list&token=" + encodeURIComponent(token));
  const data = await res.json();
  if (!data.ok) { box.innerHTML = "<p class='danger'>Could not load the list.</p>"; return; }
  box.innerHTML = (data.users || []).map(u => `
   <div class="listitem"><b>${esc(u.mobile)}</b>${u.name ? " — " + esc(u.name) : ""}
   <div class="actions"><button class="danger" onclick="tcRemoveAuthorizedUser('${esc(u.mobile)}')">Remove</button></div></div>
  `).join("") || "<p class='muted'>No numbers added yet — no one is currently allowed to log in.</p>";
 } catch (e) { box.innerHTML = "<p class='danger'>Network error.</p>"; }
}
async function tcAddAuthorizedUser(){
 const mobile = document.querySelector("#tcAuthMobile").value.trim();
 const name = document.querySelector("#tcAuthName").value.trim();
 if (!mobile) { toast("Enter a mobile number"); return; }
 const token = sessionStorage.getItem("tc_admin_token");
 await fetch("/api/authorized", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "add", mobile, name, token }) });
 document.querySelector("#tcAuthMobile").value = "";
 document.querySelector("#tcAuthName").value = "";
 toast("Added");
 tcLoadAuthorizedUsers();
}
async function tcRemoveAuthorizedUser(mobile){
 if (!confirm("Remove " + mobile + "? They will no longer be able to log in.")) return;
 const token = sessionStorage.getItem("tc_admin_token");
 await fetch("/api/authorized", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "remove", mobile, token }) });
 toast("Removed");
 tcLoadAuthorizedUsers();
}

/* Same reasoning as the trailing calls at the end of app-updates.js: this file
   loads AFTER app-updates.js, so app-updates.js's own trailing render() call
   already ran and painted the dashboard using the version of dashboard() that
   existed at THAT point — before this file's further override of it (adding the
   Authorized Users button) was even in place. Calling render() again here, now
   that this file's overrides are applied too, is what makes the button show up
   on the very first paint instead of only after navigating away and back. */
/* Redefines checkStillAllowed() (already in app.js) to ALSO log out a session
   whose mobile number has been removed from (or never added to) the allowlist —
   not just a blocked mobile/device as before. This is what makes removing
   someone's number actually end their current session, not just prevent a
   future login. */
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
   return;
  }
  if(data.ok && data.authorized===false){
   localStorage.removeItem("tc_user");
   toast("Your access has been removed. Please contact the app owner.");
   renderLogin();
   return;
  }
  /* Self-heals the isAppOwner flag for sessions that logged in before this
     flag existed, or if it's ever out of date — re-render if it just changed
     so the correct page (full dashboard vs partner-only page) shows without
     needing a fresh login. */
  if(data.ok && !!data.isOwner!==!!user.isAppOwner){
   localStorage.setItem("tc_user",JSON.stringify({...user,isAppOwner:!!data.isOwner}));
   render();
  }
 }catch(e){}
}

render();

/* Redefines submitLogin() (already in app.js) purely to give a specific,
   understandable message when the mobile number isn't on the allowlist —
   the previous generic "Login failed. Please try again." looked exactly like
   a network glitch, so someone blocked this way would just keep retrying
   forever instead of understanding they need to contact the owner. */
async function submitLogin(inviteToken){
 const name=document.querySelector("#loginName").value.trim();
 const mobile=document.querySelector("#loginMobile").value.trim();
 const email=document.querySelector("#loginEmail")?.value.trim()||"";
 const location_=document.querySelector("#loginLocation")?.value.trim()||"";
 const pincode=document.querySelector("#loginPincode")?.value.trim()||"";
 const role=document.querySelector('input[name="loginRole"]:checked')?.value||"owner";
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
  await syncConfigFromServer();
  location.hash="dashboard";
  render();
 }catch(e){
  errBox.textContent="Network error — check your connection and try again.";
 }
}

/* Highlights whichever top tab button matches the current page, so scrolling
   down (past the page title) doesn't lose the "which page am I on" cue. Added
   as its own hashchange listener rather than editing render() — multiple
   listeners for the same event are fine, and view() already changes the hash
   for every tab click, so this fires exactly when it needs to. */
function tcUpdateActiveTab(){
 const current=location.hash.slice(1)||"dashboard";
 document.querySelectorAll(".tabs button").forEach(b=>{
  b.classList.toggle("active", b.dataset.view===current);
 });
}
window.addEventListener("hashchange",tcUpdateActiveTab);
tcUpdateActiveTab();

/* Redefines view() again — one level deeper than the previous version. Rather
   than a flat "always replace" (which meant Back always exited the app
   immediately, from anywhere), this keeps exactly ONE level of depth:
   Dashboard is the base; any other page reached from Dashboard (by a tab OR a
   Menu item) pushes ONE history entry; switching sideways between other pages
   while already at that depth (e.g. Enquiries -> Quotations -> Billing) keeps
   REPLACING that same entry instead of stacking more. So Back from anywhere
   goes straight to Dashboard in one press — but a page opened via the ☰ Menu
   remembers that, and Back from there reopens the Menu instead, matching
   where the user actually came from. */
let tcCurrentIsFromMenu=false;
let tcMenuNavPending=false;

function view(v){
 if(v==="dashboard"){
  history.pushState({tcBase:true},"",location.pathname+location.search+"#dashboard");
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
/* Fires on the phone's/browser's own Back button. If a MODAL was open at that
   moment (see the modal()/closeModal() overrides below — every modal, in every
   feature, now pushes one history entry while it's open), just close the modal
   and stop there — this is what fixes Quick Bill (and any other modal-based
   form) so Back closes it one step at a time instead of jumping straight out
   of the app. Otherwise, fall through to the page-level logic: if the page
   being left was opened via the ☰ Menu, reopen that Menu once we land back on
   Dashboard — otherwise landing on Dashboard is the whole story. */
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
 if(wasFromMenu&&(location.hash.slice(1)||"dashboard")==="dashboard"){
  tcOpenMenu();
 }
});

/* Redefines modal()/closeModal() (already in app.js) purely to push one history
   entry while a modal is open, and cleanly undo it when closed — so the phone's
   Back button always closes whatever modal is open first, before it ever
   touches page-level navigation. closeModal() uses replaceState (synchronous)
   rather than history.back() (which fires its popstate on a later tick) so that
   code immediately following a closeModal() call — like a ☰ Menu item's own
   navigation — never races against a still-pending pop. */
let tcModalHistoryPushed=false;
let tcPreModalState=null;
let tcPreModalUrl=null;

function modal(html){
 modalBody.innerHTML=html;
 document.querySelector("#modal").classList.remove("hidden");
 if(!tcModalHistoryPushed){
  tcPreModalState=history.state;
  tcPreModalUrl=location.href;
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

/* ---------- HAMBURGER MENU (moves admin-only pages out of the main tabs) ----------
   Injected via JS rather than editing index.html directly — this app doesn't
   have that file's exact content available here, and doing it this way also
   keeps everything for this feature self-contained in one file. A normal user
   only ever needs Dashboard/Enquiries/Quotations/Trips/Billing day to day;
   Master Data (rates), Accounts, Admin and Authorized Users are all owner-only
   already (password-gated) — hiding them from the always-visible tab row too
   reduces clutter without changing any of that existing protection. */
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
   <div style="color:#6a7a87;font-size:11.5px">Owner / admin settings — password protected</div>
  </div>
  <div style="margin-top:8px">
  ${tcMenuItem('<line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line>',"Rate Master","closeModal();tcMenuNavPending=true;view('master')")}
  ${tcMenuItem('<rect x="3" y="6" width="18" height="13" rx="2"></rect><path d="M3 10h18"></path><circle cx="17" cy="14.5" r="1.3" fill="#0b6b78" stroke="none"></circle>',"Accounts","closeModal();tcMenuNavPending=true;view('accounts')")}
  ${tcMenuItem('<line x1="4" y1="6" x2="20" y2="6"></line><circle cx="8" cy="6" r="2" fill="#0b6b78" stroke="none"></circle><line x1="4" y1="12" x2="20" y2="12"></line><circle cx="16" cy="12" r="2" fill="#0b6b78" stroke="none"></circle><line x1="4" y1="18" x2="20" y2="18"></line><circle cx="10" cy="18" r="2" fill="#0b6b78" stroke="none"></circle>',"Admin","closeModal();tcMenuNavPending=true;view('admin')")}
  ${tcMenuItem('<rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path>',"Authorized Users (Login Allowlist)","closeModal();tcMenuNavPending=true;tcAuthorizedUsersPage()")}
  ${tcMenuItem('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',"Feedback / Suggestions","closeModal();tcMenuNavPending=true;tcOpenFeedbackAdmin()")}
  ${tcMenuItem('<circle cx="9" cy="7" r="4"></circle><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"></path><path d="M17 11l2 2 4-4"></path>',"Partner Plans (Free / Paid)","closeModal();tcMenuNavPending=true;tcOpenPartnerPlans()")}
  ${tcMenuItem('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>',"Preview: Partner Page","closeModal();tcMenuNavPending=true;tcPreviewPartnerPage()")}
  ${tcMenuItem('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"></path><circle cx="12" cy="12" r="3"></circle>',"Preview: Customer Page","closeModal();tcMenuNavPending=true;tcPreviewCustomerPage()")}
  ${logoutItem}
  </div>`);
}
function tcInjectMenuButton(){
 /* superseded by tcBuildPremiumHeader() below, which rebuilds the whole header
    (including the menu button) in one go — kept as a no-op stub only so any
    stray reference to it elsewhere doesn't throw. */
}

/* Rebuilds the header to match the same logo+name+tagline construction already
   used on the PDF/print headers, instead of plain text — and replaces the red
   "beacon" emoji SOS button and the circular ☰ button with a plainer, more
   standard pill button and icon button. Runs last, after relabelSosButton()
   (app-updates.js) and the old tcInjectMenuButton() (now a no-op above) have
   already run, since this simply rebuilds the whole header fresh regardless of
   whatever state either of those left it in. */
function tcBuildPremiumHeader(){
 const topEl=document.querySelector(".top");
 if(!topEl) return;
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 topEl.innerHTML=`
  <div style="display:flex;align-items:center;gap:10px">
   ${logo?`<img src="${logo}" style="width:36px;height:36px;border-radius:8px;background:#fff;padding:3px;flex-shrink:0">`:""}
   <div><b>TRAVEL CONNECT</b><small>Professional Travel Business Platform</small></div>
  </div>
  <div style="display:flex;align-items:center;gap:8px">
   <button id="networkBtn" style="background:#c0392b;color:#fff;border-radius:20px;padding:8px 16px;font-weight:800;font-size:13px;letter-spacing:.5px;border:none">SOS</button>
   <button id="tcMenuBtn" aria-label="Menu" style="background:rgba(255,255,255,.14);color:#fff;border-radius:9px;width:38px;height:38px;font-size:18px;border:none;display:flex;align-items:center;justify-content:center;padding:0;line-height:1">&#9776;</button>
  </div>`;
 document.querySelector("#networkBtn").onclick=()=>network();
 document.querySelector("#tcMenuBtn").onclick=tcOpenMenu;
 /* This function can run before OR after render() at page load, depending on
    script order — so it must apply the customer-hides-SOS/Menu rule itself
    too, instead of relying only on render() having already run. Customers
    aren't part of the partner SOS network, so the SOS button is hidden for
    them the same as the tabs/menu. */
 const user=getCurrentUser();
 if(user&&user.role==="customer"){
  document.querySelector("#networkBtn").style.display="none";
  document.querySelector("#tcMenuBtn").style.display="none";
 }
}

tcHideAdminTabs();
tcInjectMenuButton();
tcBuildPremiumHeader();

/* Redefines renderLogin() (already in app.js) with the same premium card
   style as the PIN screen — logo, name/tagline, a short intro line about the
   app, and cleanly styled inputs — instead of the plain default-styled card. */
function renderLogin(){
 const inviteToken=new URLSearchParams(location.search).get("invite")||"";
 const logo=(typeof LOGO_DATA_URI!=="undefined")?LOGO_DATA_URI:"";
 document.querySelector("#app").innerHTML=`
 <div style="display:flex;align-items:center;justify-content:center;padding:30px 16px">
  <div style="background:#fff;border-radius:18px;max-width:360px;width:100%;padding:30px 26px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.12)">
   ${logo?`<img src="${logo}" style="width:56px;height:56px;border-radius:12px;margin-bottom:10px">`:""}
   <div style="font-weight:800;letter-spacing:1.5px;color:#082b49;font-size:17px">TRAVEL CONNECT</div>
   <div style="color:#6a7a87;font-size:12px;margin-bottom:16px">Professional Travel Business Platform</div>
   <p id="loginIntro" style="color:#6a7a87;font-size:13px;margin:0 0 18px;text-align:left">Enter your name and mobile number to continue. Manage enquiries, quotations, trips and billing for your travel business — or book a vehicle and check fare estimates for your own trips.</p>
   <div style="text-align:left;margin-bottom:14px">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:6px;color:#172536">I am a...</label>
    <div style="display:flex;gap:8px">
     <label style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #c9d4dc;border-radius:9px;padding:10px;cursor:pointer;font-size:13px;font-weight:600"><input type="radio" name="loginRole" value="owner" checked onchange="tcUpdateLoginIntro()"> Business Owner</label>
     <label style="flex:1;display:flex;align-items:center;gap:6px;border:1px solid #c9d4dc;border-radius:9px;padding:10px;cursor:pointer;font-size:13px;font-weight:600"><input type="radio" name="loginRole" value="customer" onchange="tcUpdateLoginIntro()"> Customer</label>
    </div>
   </div>
   <div style="text-align:left">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">Your name</label>
    <input id="loginName" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:12px;font-size:15px;box-sizing:border-box">
    <label style="display:block;font-size:12px;font-weight:650;margin-bottom:4px;color:#172536">Mobile number</label>
    <input id="loginMobile" type="tel" style="width:100%;padding:11px;border-radius:9px;border:1px solid #c9d4dc;margin-bottom:12px;font-size:15px;box-sizing:border-box">
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

/* Redefines doLoadUsersList() (already in app.js) to also show each user's
   email/location/pincode (now collected at login, all optional) alongside
   what was already shown — used to look up who's near a given pickup point,
   e.g. for an SOS or an overflow trip. */
async function doLoadUsersList(){
 const box=document.querySelector("#usersList");
 box.innerHTML="<p class='muted'>Loading...</p>";
 try{
  const res=await fetch("/api/auth?action=users&token="+encodeURIComponent(adminToken()));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load users.</p>"; return; }
  if(!data.users.length){ box.innerHTML="<p class='muted'>No one has logged in yet.</p>"; return; }
  const customerCount=data.users.filter(u=>u.role==="customer").length;
  box.innerHTML=`<p class="muted">${data.users.length} total — ${customerCount} customers, ${data.users.length-customerCount} owners/partners.</p>`+
   data.users.map(u=>`<div class="listitem">
   <b>${esc(u.name)}</b> <span class="chip">${u.role==="customer"?"Customer":"Owner/Partner"}</span> ${u.blocked?'<span class="danger">(BLOCKED)</span>':''}<br>
   <a href="tel:${esc(u.mobile)}">&#128222; ${esc(u.mobile)}</a><br>
   ${u.email?`<span class="muted">${esc(u.email)}</span><br>`:""}
   ${(u.location||u.pincode)?`<span class="muted">${esc(u.location||"")} ${esc(u.pincode||"")}</span><br>`:""}
   <span class="muted">First: ${esc((u.first_login_at||"").slice(0,16).replace("T"," "))} • Last: ${esc((u.last_login_at||"").slice(0,16).replace("T"," "))} • Logins: ${u.login_count}</span>
   <div class="actions">${u.blocked?`<button onclick="setUserBlocked('${esc(u.mobile)}',false)">Unblock</button>`:`<button class="danger" onclick="setUserBlocked('${esc(u.mobile)}',true)">Block</button>`}</div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}

/* Captures precise GPS coordinates and looks up a human-readable place name +
   postcode for them (via OpenStreetMap's free Nominatim reverse-geocoding
   service — no API key needed) to auto-fill the Location/Pincode fields on
   the login form, instead of only allowing manual typing. The raw lat/lon are
   kept too (sent along at login) so partners can later be found by actual
   proximity, not just by matching typed town names. */
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
   const locEl=document.querySelector("#loginLocation");
   const pinEl=document.querySelector("#loginPincode");
   if(locEl&&combined) locEl.value=combined;
   if(pinEl&&a.postcode) pinEl.value=a.postcode;
   if(status) status.textContent="\u2705 Location added.";
  }catch(e){
   if(status) status.textContent="Got your location, but couldn't look up the address name — coordinates saved anyway.";
  }
 },()=>{
  if(status) status.textContent="Location permission denied — you can still type it in manually.";
 },{timeout:10000});
}

/* Redefines loadSosHistory() (already in app-updates.js) to add a "Mark
   Resolved" button per alert — instead of waiting the full 48 hours for an
   already-handled SOS to age out, anyone can clear it immediately once the
   person is confirmed safe. */
async function loadSosHistory(){
 const box=document.querySelector("#sosHistoryBox");
 if(!box) return;
 try{
  const res=await fetch("/api/sos?action=history");
  const data=await res.json();
  if(!data.ok||!data.alerts||!data.alerts.length){ box.innerHTML="<p class='muted'>No SOS alerts in the last 48 hours.</p>"; return; }
  const myMobile=(getCurrentUser()||{}).mobile;
  box.innerHTML=data.alerts.map(a=>{
   const when=new Date(a.created_at).toLocaleString();
   const mapLink=(a.lat!=null&&a.lon!=null)?`<a href="https://maps.google.com/?q=${a.lat},${a.lon}" target="_blank">View location</a>`:"";
   const callLink=a.sender_mobile?`<a href="tel:${esc(a.sender_mobile)}">${esc(a.sender_mobile)}</a>`:"-";
   const isMine=myMobile&&a.sender_mobile&&myMobile===a.sender_mobile;
   return `<div class="listitem"><b>&#128680; ${esc(a.sender_name||"A user")}</b> — ${esc(when)}<br>
   Mobile: ${callLink} ${mapLink?" &nbsp;|&nbsp; "+mapLink:""}
   ${a.message?`<div class="muted">"${esc(a.message)}"</div>`:""}
   ${isMine?`<div class="actions"><button class="primary" onclick="tcResolveSos(${a.id})">&#9989; Mark Resolved (I got help)</button></div>`:""}</div>`;
  }).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Could not load SOS history — check your connection.</p>"; }
}
async function tcResolveSos(id){
 try{
  const mobile=(getCurrentUser()||{}).mobile;
  const res=await fetch("/api/sos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"resolve",id,mobile})});
  const data=await res.json().catch(()=>({}));
  if(!data.ok){ toast("Could not mark resolved"); return; }
  toast("Marked resolved");
  loadSosHistory();
 }catch(e){ toast("Network error — try again"); }
}

/* ---------- OFFLINE SOS QUEUE ----------
   Redefines sos() (already in app-updates.js) so that if the POST to
   /api/sos fails (no network at that moment), the alert is saved locally
   instead of just failing silently — and gets sent automatically the moment
   connectivity returns, without the person needing to remember to press SOS
   again. Nothing about the actual SOS content or in-app alerting changes;
   this only adds a safety net for the "no signal right now" case. */
async function tcSendSos(payload){
 try{
  const res=await fetch("/api/sos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  return res.ok;
 }catch(e){ return false; }
}
function tcQueueSos(payload){
 const q=JSON.parse(localStorage.getItem("tc_sos_queue")||"[]");
 q.push(payload);
 localStorage.setItem("tc_sos_queue",JSON.stringify(q));
}
async function tcFlushSosQueue(){
 let q=JSON.parse(localStorage.getItem("tc_sos_queue")||"[]");
 if(!q.length) return;
 const remaining=[];
 for(const payload of q){
  const ok=await tcSendSos(payload);
  if(!ok) remaining.push(payload);
 }
 localStorage.setItem("tc_sos_queue",JSON.stringify(remaining));
 if(remaining.length<q.length){
  toast(remaining.length===0?"Queued SOS sent — you're back online.":"Some queued SOS messages sent — still retrying the rest.");
  loadSosHistory();
 }
}
window.addEventListener("online",tcFlushSosQueue);
setInterval(tcFlushSosQueue,20000); /* safety-net retry even if the 'online' event doesn't fire reliably */
tcFlushSosQueue(); /* in case a queue already exists from a previous offline session and we're already online now */

async function sos(){
 toast("Getting your location...");
 await getLocationForSos(5000);
 const user=getCurrentUser()||{};
 const typedMsg=(document.querySelector("#nMsg")?.value||"").trim();
 const msg=typedMsg?`SOS from ${user.name||"a user"}: ${typedMsg}`:`SOS from ${user.name||"a user"}. Needs urgent assistance.`;
 const payload={sender_name:user.name||"",sender_mobile:user.mobile||"",message:msg,lat:window.tcLoc?window.tcLoc.lat:null,lon:window.tcLoc?window.tcLoc.lon:null};
 const sent=await tcSendSos(payload);
 if(sent){
  toast(window.tcLoc?"SOS sent with your location — every logged-in user will be alerted":"SOS sent (no location — check location permission) — every logged-in user will be alerted");
  loadSosHistory();
 }else{
  tcQueueSos(payload);
  toast("No connection right now — SOS saved and will send automatically the moment you're back online.");
 }
 const shareMsg=`TRAVEL CONNECT SOS. I need urgent assistance. Location: ${window.tcLoc?`https://maps.google.com/?q=${window.tcLoc.lat},${window.tcLoc.lon}`:"Please check my live location."}`;
 navigator.share?.({title:"Travel Connect SOS",text:shareMsg}).catch(()=>{});
}

/* Swaps the login intro line to match whichever role is selected, so the
   page doesn't read as if it's only for business owners. */
function tcUpdateLoginIntro(){
 const el=document.querySelector("#loginIntro");
 if(!el) return;
 const role=document.querySelector('input[name="loginRole"]:checked')?.value||"owner";
 el.textContent = role==="customer"
  ? "Enter your name and mobile number to continue. Book a vehicle for your trip, or check estimated fares to your destination."
  : "Enter your name and mobile number to continue. Manage enquiries, quotations, trips and billing for your travel business.";
}

/* ---------- CUSTOMER-ONLY EXPERIENCE ----------
   Redefines render() (already in app.js) so a "customer" role ALWAYS sees
   their own simple page — never the business tabs (Enquiries/Quotations/
   Trips/Billing/Master/Accounts/Admin) — regardless of what hash is in the
   URL. Also hides the tabs bar and ☰ menu entirely for customers, since none
   of that is relevant to them. */
function render(){
 if(!getCurrentUser()){ renderLogin(); return; }
 checkStillAllowed();
 const user=getCurrentUser();
 const tabsEl=document.querySelector(".tabs");
 const menuBtn=document.querySelector("#tcMenuBtn");
 const sosBtn=document.querySelector("#networkBtn");
 if(user.role==="customer"){
  if(tabsEl) tabsEl.style.display="none";
  if(menuBtn) menuBtn.style.display="none";
  if(sosBtn) sosBtn.style.display="none";
  if((location.hash.slice(1)||"")==="activeboard") activeBoard();
  else customerHome();
  return;
 }
 if(sosBtn) sosBtn.style.display="";
 /* All "owner"-role users (the app owner and every other authorized travel
    partner) get the same full Dashboard/Enquiries/Quotations/Trips/Billing
    tools — a partner's own business identity is shown as a card at the top
    of dashboard() instead (see dashboard() below), so it feels like their
    own branded workspace while using the exact same underlying tools. */
 if(tabsEl) tabsEl.style.display="";
 if(menuBtn) menuBtn.style.display="";
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

function customerHome(){
 const cat=db.categories.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join("");
 app().innerHTML=card("Fare Estimate & Vehicle Booking",`
  <div class="notice">&#128161; <b>How to use this:</b> (1) Fill in your trip details and tap "Calculate Estimate" to see an approximate fare. (2) Tap "Browse Available Vehicles" and search by town/pincode to find and call a travel partner directly.</div>
  <div class="danger" style="background:#fdeceb;border:1px solid #e6b0aa;border-radius:8px;padding:10px;margin:10px 0;font-size:12.5px">&#9888;&#65039; <b>Please note:</b> Travel Connect only connects you with travel partners — it does not own vehicles, fix final prices, or handle payments. Charges, timing and any disputes are between you and the travel partner directly. Please confirm the fare and trip details by phone with the travel partner before starting your journey.</div>
  <p class="muted" style="font-size:11.5px">&#128736;&#65039; This app is under continuous development — you may occasionally notice small issues. Your feedback helps us improve it faster.</p>
  <p class="muted">Get a quick estimate for your trip, or browse vehicles ready for a trip right now.</p>
  <div class="grid">
   <label>Vehicle category<select id="custCat">${cat}</select></label>
   <label>Trip type<select id="custType" onchange="tcCustTypeChanged()">
     <option value="local">Local Trip</option>
     <option value="one_day">One Day</option>
     <option value="multiday">Multi-day</option>
     <option value="drop">Drop</option>
   </select></label>
   <label>Vehicle start point (garage)<input id="custVehicleStart" placeholder="e.g. Nadapuram"></label>
   <label>Pickup point<input id="custPickup" placeholder="e.g. Valayam"></label>
   <label>Destination 1<input id="custDest" placeholder="e.g. Vadakara"></label>
  </div>
  <div id="custStopsContainer"></div>
  <div class="actions"><button type="button" onclick="tcAddCustDestField()">+ Add another destination</button></div>
  <div class="grid">
   <label>Vehicle closing point (usually same as start)<input id="custVehicleClose" placeholder="e.g. Nadapuram"></label>
  </div>
  <div class="actions"><button type="button" onclick="tcOpenCustomerRoute()">&#128663; Open route in Google Maps (to check KM)</button></div>
  <div class="grid" style="margin-top:8px">
   <label>Estimated KM (total — garage to pickup, all destinations, and back to garage)<input id="custKm" type="number" value="80"></label>
   <label>Estimated hours<input id="custHours" type="number" value="8"></label>
   <label>Number of days<input id="custDays" type="number" value="1" min="1"></label>
  </div>
  <p class="muted" style="font-size:12px">&#8505;&#65039; Tip: Tap "Open route in Google Maps" above to check the actual distance, then enter that KM below for a more accurate estimate.</p>
  <div class="actions"><button class="primary" onclick="tcCalcCustomerFare()">Calculate Estimate</button></div>
  <div id="custFareResult" class="ratebox"></div>
  <hr>
  <div class="actions"><button onclick="view('activeboard')">&#128663; Browse Available Vehicles</button></div>
  <hr>
  <h3>&#128172; Feedback / Suggestions</h3>
  <p class="muted">Noticed an issue, or have an idea to make this better? Let us know.</p>
  <label>Your message<textarea id="custFeedback" rows="3"></textarea></label>
  <div class="actions"><button onclick="tcSendFeedback()">Send Feedback</button></div>
  <div class="actions" style="margin-top:10px"><button class="danger" onclick="logout()">Log out</button></div>
 `);
}
async function tcSendFeedback(){
 const msg=document.querySelector("#custFeedback").value.trim();
 if(!msg){ toast("Type a message first"); return; }
 const user=getCurrentUser()||{};
 try{
  await fetch("/api/feedback",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:user.name||"",mobile:user.mobile||"",message:msg})});
  document.querySelector("#custFeedback").value="";
  toast("Thank you — your feedback has been sent");
 }catch(e){ toast("Network error — try again"); }
}
function tcAddCustDestField(value=""){
 const c=document.querySelector("#custStopsContainer");
 if(!c) return;
 const row=document.createElement("div");
 row.className="grid";
 row.style.marginTop="4px";
 row.innerHTML=`<label style="flex:1">Additional destination<input class="cust-stop-input" value="${esc(value)}"></label><button type="button" onclick="this.parentElement.remove()" style="align-self:flex-end">✕ Remove</button>`;
 c.appendChild(row);
}
function tcOpenCustomerRoute(){
 const start=document.querySelector("#custVehicleStart").value;
 const pickup=document.querySelector("#custPickup").value;
 const stops=[document.querySelector("#custDest")?.value||"",...Array.from(document.querySelectorAll(".cust-stop-input")).map(i=>i.value)].map(v=>v.trim()).filter(Boolean);
 const closing=document.querySelector("#custVehicleClose").value||start;
 const points=[start,pickup,...stops,closing].map(v=>v.trim()).filter(Boolean);
 if(points.length<2){toast("Enter at least a pickup and destination first");return}
 const origin=points[0], destination=points[points.length-1], waypoints=points.slice(1,-1).join("|");
 let url="https://www.google.com/maps/dir/?api=1&origin="+encodeURIComponent(origin)+"&destination="+encodeURIComponent(destination);
 if(waypoints) url+="&waypoints="+encodeURIComponent(waypoints);
 window.open(url,"_blank");
}
function tcCustTypeChanged(){
 const type=document.querySelector("#custType").value;
 const daysField=document.querySelector("#custDays");
 if(daysField) daysField.disabled=(type==="local"||type==="drop");
 if(daysField&&(type==="local"||type==="drop")) daysField.value=1;
}
function tcCalcCustomerFare(){
 const c=db.categories[+document.querySelector("#custCat").value];
 const type=document.querySelector("#custType").value;
 const plan=type==="local"?"local":type==="drop"?"drop":"standard";
 const km=+document.querySelector("#custKm").value||0, h=+document.querySelector("#custHours").value||0;
 const days=(type==="local"||type==="drop")?1:(+document.querySelector("#custDays").value||1);
 const r=calcFare(c,plan,km,h,days,0);
 const box=document.querySelector("#custFareResult");
 if(r.invalid){ box.innerHTML=`<div class="danger">${esc(r.reason)}</div>`; return; }
 box.innerHTML=`
  ${days>1?`<div class="muted">${days} day trip</div>`:""}
  <div>Base fare: <b>${money(r.base)}</b></div>
  <div class="muted">Included: ${r.incKm} KM / ${r.incHours} hours</div>
  <div>Extra (if you exceed the above): ${money(r.addKm)}/KM or ${money(r.addHour)}/hr</div>
  <div class="total">Estimated fare: ${money(r.total)}</div>
  <div style="background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:12px;margin-top:12px">
   <div style="font-weight:bold;color:#7a5a1e">This is a standard estimate — actual offers may be lower.</div>
   <p class="muted" style="margin:6px 0">For the best price and to confirm your trip, contact us directly:</p>
   ${db.platform.phone1?`<div><a href="tel:${esc(db.platform.phone1)}">&#128222; ${esc(db.platform.phone1)}</a></div>`:""}
   ${db.platform.phone2?`<div><a href="tel:${esc(db.platform.phone2)}">&#128222; ${esc(db.platform.phone2)}</a></div>`:""}
   ${db.platform.email?`<div><a href="mailto:${esc(db.platform.email)}">&#9993;&#65039; ${esc(db.platform.email)}</a></div>`:""}
  </div>`;
}

/* Redefines activeBoard() (already in app.js) to add a location search box —
   customer or partner types a town/pincode ("Kozhikode") and the list filters
   to just vehicles whose partner registered that location, so the board is
   actually usable once there are vehicles from many different towns instead
   of one single scrollable list of everyone. */
let _tcActiveBoardVehicles=[];
async function activeBoard(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("Active Vehicles Board",`<p class="muted">Vehicles other travel partners have marked ready for a trip right now.</p>
 <label>Search by town / pincode<input id="tcBoardSearch" placeholder="e.g. Kozhikode, Vadakara, 673001" oninput="tcFilterActiveBoard()"></label>
 <div id="activeBoardList">Loading...</div>`);
 try{
  const res=await fetch("/api/vehicles?action=active");
  const data=await res.json();
  _tcActiveBoardVehicles=(data.ok&&data.vehicles)?data.vehicles:[];
  tcRenderActiveBoardList(_tcActiveBoardVehicles);
 }catch(e){document.querySelector("#activeBoardList").innerHTML="<p class='danger'>Network error.</p>"}
}
function tcRenderActiveBoardList(vehicles,append){
 const box=document.querySelector("#activeBoardList");
 if(!box) return;
 if(!vehicles.length){ if(!append) box.innerHTML="<p class='muted'>No matching vehicles found.</p>"; return; }
 const html=vehicles.map(v=>`<div class="listitem">
  <b>${esc(v.category||"Vehicle")}</b> — ${esc(v.vehicle_number)}<br>
  ${esc(v.business_name)}${v.location?` • ${esc(v.location)} ${esc(v.pincode||"")}`:""}
  <div class="actions">
   <a href="tel:${esc(v.mobile1)}"><button class="primary">&#128222; Call ${esc(v.mobile1)}</button></a>
   ${v.mobile2?`<a href="tel:${esc(v.mobile2)}"><button>&#128222; Call ${esc(v.mobile2)}</button></a>`:""}
  </div>
 </div>`).join("");
 if(append) box.innerHTML+=html; else box.innerHTML=html;
}
function tcFilterActiveBoard(){
 const q=(document.querySelector("#tcBoardSearch")?.value||"").trim().toLowerCase();
 const box=document.querySelector("#activeBoardList");
 if(!q){ tcRenderActiveBoardList(_tcActiveBoardVehicles); return; }
 const filtered=_tcActiveBoardVehicles.filter(v=>
  (v.location||"").toLowerCase().includes(q) ||
  (v.pincode||"").toLowerCase().includes(q) ||
  (v.business_name||"").toLowerCase().includes(q) ||
  (v.category||"").toLowerCase().includes(q)
 );
 if(!filtered.length&&_tcActiveBoardVehicles.length&&box){
  /* No partner registered in the searched area — say so clearly instead of
     just showing an empty list (which reads as "broken"), and fall back to
     showing the nearest/other currently-available vehicles plus a direct
     contact option, so the customer still has somewhere to go. */
  const contactLine=[db.platform.phone1?`<a href="tel:${esc(db.platform.phone1)}">&#128222; ${esc(db.platform.phone1)}</a>`:"",db.platform.email?`<a href="mailto:${esc(db.platform.email)}">&#9993;&#65039; ${esc(db.platform.email)}</a>`:""].filter(Boolean).join(" &nbsp;|&nbsp; ");
  box.innerHTML=`<div class="notice">No Travel Connect partners are registered in "${esc(document.querySelector("#tcBoardSearch").value)}" yet. Here are other currently available vehicles instead — or contact us directly: ${contactLine}</div>`;
  tcRenderActiveBoardList(_tcActiveBoardVehicles,true);
  return;
 }
 tcRenderActiveBoardList(filtered);
}

/* Admin-only feedback viewer — same history-management pattern as
   tcAuthorizedUsersPage() (this page is only ever reached from the ☰ Menu,
   so Back should reopen the Menu, not just land on Dashboard). */
function tcOpenFeedbackAdmin(){
 if(!history.state||!history.state.tcPage){
  history.pushState({tcPage:true,fromMenu:true},"",location.pathname+location.search+"#feedback");
 }else{
  history.replaceState({tcPage:true,fromMenu:true},"",location.pathname+location.search+"#feedback");
 }
 tcCurrentIsFromMenu=true;
 tcMenuNavPending=false;
 requireAdmin(()=>tcRenderFeedbackAdmin());
}
async function tcRenderFeedbackAdmin(){
 app().innerHTML=card("Feedback / Suggestions",`<div id="tcFeedbackList">Loading...</div>`);
 const box=document.querySelector("#tcFeedbackList");
 try{
  const token=sessionStorage.getItem("tc_admin_token");
  const res=await fetch("/api/feedback?action=list&token="+encodeURIComponent(token));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load feedback.</p>"; return; }
  if(!data.feedback.length){ box.innerHTML="<p class='muted'>No feedback yet.</p>"; return; }
  box.innerHTML=data.feedback.map(f=>`<div class="listitem">
   <b>${esc(f.name||"Anonymous")}</b> ${f.mobile?`— ${esc(f.mobile)}`:""}<br>
   <span class="muted">${esc((f.created_at||"").slice(0,16).replace("T"," "))}</span>
   <div style="margin-top:6px">${esc(f.message)}</div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}

/* Admin-only Partner Plans page — same history-management pattern as
   tcAuthorizedUsersPage()/tcOpenFeedbackAdmin() (reached only via the ☰ Menu,
   Back should reopen the Menu). Lets the owner mark each registered partner
   as free, paid, or owner_free (their own account / staff — permanently
   free) — this flag is what future print/PDF branding logic will read. */
function tcOpenPartnerPlans(){
 if(!history.state||!history.state.tcPage){
  history.pushState({tcPage:true,fromMenu:true},"",location.pathname+location.search+"#partnerplans");
 }else{
  history.replaceState({tcPage:true,fromMenu:true},"",location.pathname+location.search+"#partnerplans");
 }
 tcCurrentIsFromMenu=true;
 tcMenuNavPending=false;
 requireAdmin(()=>tcRenderPartnerPlans());
}
async function tcRenderPartnerPlans(){
 app().innerHTML=card("Partner Plans (Free / Paid)",`<p class="muted">Free = Travel Connect branding shown on their bills/quotations. Paid = their own business branding. Owner Free = your own account/staff — always free, full features.</p><div id="tcPlansList">Loading...</div>`);
 tcLoadPartnerPlans();
}
async function tcLoadPartnerPlans(){
 const box=document.querySelector("#tcPlansList");
 if(!box) return;
 try{
  const token=sessionStorage.getItem("tc_admin_token");
  const res=await fetch("/api/partner_plan?action=list&token="+encodeURIComponent(token));
  const data=await res.json();
  if(!data.ok){ box.innerHTML="<p class='danger'>Could not load partners.</p>"; return; }
  if(!data.partners.length){ box.innerHTML="<p class='muted'>No partners registered yet.</p>"; return; }
  box.innerHTML=data.partners.map(p=>`<div class="listitem">
   <b>${esc(p.business_name)}</b> ${p.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>'}<br>
   <span class="muted">${esc(p.owner_name)} • ${esc(p.mobile1)}${p.location?" • "+esc(p.location):""}</span>
   <div class="actions" style="margin-top:6px">
    <select id="plan_${p.id}">
     <option value="free" ${(!p.plan||p.plan==="free")?"selected":""}>Free</option>
     <option value="paid" ${p.plan==="paid"?"selected":""}>Paid</option>
     <option value="owner_free" ${p.plan==="owner_free"?"selected":""}>Owner Free</option>
    </select>
    <button class="primary" onclick="tcSetPartnerPlan(${p.id})">Save</button>
   </div>
  </div>`).join("");
 }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
}
async function tcSetPartnerPlan(partnerId){
 const plan=document.querySelector("#plan_"+partnerId).value;
 const token=sessionStorage.getItem("tc_admin_token");
 try{
  await fetch("/api/partner_plan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"set_plan",partner_id:partnerId,plan,token})});
  toast("Plan updated");
 }catch(e){ toast("Network error"); }
}

/* ---------- PLAN-BASED PRINT BRANDING ----------
   Redefines partnerView() to also remember this partner's plan (free/paid/
   owner_free) locally, and adds a shared branding-box builder used by both
   printQuoteObj() and printBill() below. Paid/owner_free partners see their
   own business name/contact prominently (unchanged from before). Free-plan
   partners' prints instead lead with Travel Connect's own contact details and
   a "book directly" prompt, with the partner's name shown small underneath —
   this is the incentive to upgrade. Actual logo upload/embedding is a larger
   feature (needs image upload + storage) left for a future update; this only
   changes which NAME/CONTACT details are shown prominently. */
async function partnerView(){
 if(!getCurrentUser()){renderLogin();return;}
 app().innerHTML=card("Travel Partner",`<div id="partnerBox">Loading...</div>`);
 const user=getCurrentUser();
 try{
  const res=await fetch("/api/partners?action=mine&mobile="+encodeURIComponent(user.mobile));
  const data=await res.json();
  if(!data.ok||!data.partner){ renderPartnerRegisterForm(); }
  else{
   window._myPartner=data.partner; window._myPartnerHasPassword=data.has_password;
   db.settings.myPlan=data.partner.plan||"free"; save();
   renderPartnerDashboard(data.partner);
  }
 }catch(e){
  document.querySelector("#partnerBox").innerHTML="<p class='danger'>Network error — check your connection and try again.</p>";
 }
}
function tcBrandingBox(partnerPhones){
 const isPaid=db.settings.myPlan==="paid"||db.settings.myPlan==="owner_free";
 if(isPaid){
  return `<div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
   <div style="font-weight:bold;font-size:21px;color:#0f5a55">${esc(db.business.name)}</div>
   ${db.business.tagline?`<div style="color:#555;font-size:12px">${esc(db.business.tagline)}</div>`:""}
   ${db.business.address?`<div style="font-size:12px;color:#555">${esc(db.business.address)}</div>`:""}
   ${db.business.gstin?`<div style="font-size:11px;color:#555">GSTIN: ${esc(db.business.gstin)}</div>`:""}
   ${partnerPhones?`<div style="font-weight:bold;color:#0f5a55;font-size:15px;margin-top:4px">Contact: ${partnerPhones}</div>`:""}
  </div>`;
 }
 return `<div style="background:#e8f5f4;border:2px solid #148c76;border-radius:8px;padding:12px;text-align:center;margin:10px 0">
  <div style="font-weight:bold;font-size:19px;color:#0f5a55">${esc(db.platform.name||"Travel Connect")}</div>
  <div style="color:#555;font-size:12px">Book your next trip directly — fast, reliable service</div>
  ${db.platform.phone1?`<div style="font-weight:bold;color:#0f5a55;font-size:14px;margin-top:4px">Call: ${esc(db.platform.phone1)}${db.platform.phone2?" / "+esc(db.platform.phone2):""}</div>`:""}
  ${db.platform.email?`<div style="font-size:12px;color:#555">${esc(db.platform.email)}</div>`:""}
  <div style="font-size:10.5px;color:#888;margin-top:6px">Trip arranged via ${esc(db.business.name)}${partnerPhones?" ("+partnerPhones+")":""}</div>
 </div>`;
}

function printQuoteObj(q){
 const dests=q.destinations&&q.destinations.length?q.destinations:[q.destination];
 const c=db.categories[q.categoryId];
 const platformPhones=[db.platform.phone1,db.platform.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const partnerPhones=[db.business.phone,db.business.phone2].filter(Boolean).join(" &nbsp;|&nbsp; ");
 const row=(label,value,big)=>`<tr><td style="padding:4px 0;color:#555;font-size:${big?"16px":"14px"}">${esc(label)}</td><td style="padding:4px 0;text-align:right;font-weight:bold;font-size:${big?"18px":"14px"}">${esc(value)}</td></tr>`;

 const offerRaw=calcFare(c,q.ratePlan,q.estimatedKm,q.estimatedHours,q.days||1,q.restHours||0,{addKm:q.overrideAddKm,addHour:q.overrideAddHour});
 const standardRaw=calcFare(c,"standard",q.estimatedKm,q.estimatedHours,q.days||1,q.restHours||0);
 const offerFareTotal=offerRaw.invalid?(q.subtotal??q.quotedAmount):offerRaw.total;
 const stdFareTotal=standardRaw.invalid?0:standardRaw.total;
 const rateSaving=(!standardRaw.invalid&&!offerRaw.invalid&&q.ratePlan!=="standard")?Math.max(0,stdFareTotal-offerFareTotal):0;
 const totalSavings=rateSaving+(q.discountAmount||0);
 const showCompare=!standardRaw.invalid&&!offerRaw.invalid&&q.ratePlan!=="standard";

 let advanceHtml="";
 if(q.advanceAmount>0){
  let qrImg="";
  if(db.business.upiId){
   const qrData=getQRDataURL(buildUpiLink(q.advanceAmount,"Advance "+q.no),160);
   if(qrData) qrImg=`<img src="${qrData}" style="width:110px;height:110px">`;
  }
  advanceHtml=`<div style="background:#fff8e8;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
   <div>
    <div style="font-weight:bold;font-size:15px;color:#7a5a1e">ADVANCE REQUESTED</div>
    <div style="font-size:22px;font-weight:bold">${money(q.advanceAmount)}</div>
    <div style="font-size:12px;color:#7a5a1e">${q.advanceReceived?"&#9989; Received":"Please pay in advance to confirm this trip"}</div>
   </div>
   ${!q.advanceReceived&&qrImg?`<div style="text-align:center"><b style="font-size:11px">SCAN &amp; PAY ADVANCE</b><br>${qrImg}</div>`:""}
  </div>`;
 }

 printContent("Quotation "+q.no,`
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
 ${tcBrandingBox(partnerPhones)}
 <h2 style="text-align:center;color:#143c5a;margin:10px 0;font-size:20px">QUOTATION ${esc(q.no)}</h2>
 <table>${row("Date",q.entryDate||(q.created||"").slice(0,10))}${row("Customer",q.customer)}${row("Mobile",q.mobile)}${row("Vehicle Category",q.category+" "+(q.vehicle||"")+" "+(q.vehicleNo||""))}</table>
 <div style="background:#fdf6e3;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:12px 0">
  <div style="font-weight:bold;font-size:15px;color:#7a5a1e;margin-bottom:6px">&#128663; ROUTE</div>
  <div style="font-size:15px;font-weight:600">${[q.vehicleStart,q.pickup,...dests,q.returnPoint].filter(Boolean).map(esc).join(" &rarr; ")}</div>
 </div>
 <table>
  ${row("Trip Type",q.type,true)}
  ${q.days>1?row("Number of days",q.days+" days",true):""}
  ${q.restHours>0?row("Overnight rest hours (excluded)",q.restHours+" hrs"):""}
  ${row("Estimated KM / Hours",q.estimatedKm+" KM / "+q.estimatedHours+" hrs",true)}
 </table>
 ${showCompare?`
 <h3 style="margin:12px 0 4px;font-size:15px;color:#143c5a">Standard vs Offer Rate</h3>
 <table>
  <tr style="color:#888;font-size:12px"><td></td><td style="text-align:right">Standard</td><td style="text-align:right">Offer</td></tr>
  <tr><td style="padding:3px 0">Fare</td><td style="text-align:right;padding:3px 0">${money(stdFareTotal)}</td><td style="text-align:right;padding:3px 0;font-weight:bold">${money(offerFareTotal)}</td></tr>
 </table>
 ${totalSavings>0?`<div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:10px;margin:8px 0;color:#1c6b2c">
  <div style="font-weight:bold;font-size:15px">&#127881; You save: ${money(totalSavings)}</div>
 </div>`:""}
 `:""}
 ${sumExtraCharges(q.extraCharges)>0?`<table><tr><td style="padding:3px 0;color:#555">Other Charges${extraChargesShortLabel(q.extraCharges)}</td><td style="text-align:right;padding:3px 0;font-weight:bold">+${money(sumExtraCharges(q.extraCharges))}</td></tr></table>`:""}
 ${q.gstAmount>0?`<table><tr><td style="padding:3px 0;color:#555">GST @ ${q.gstPct}%</td><td style="text-align:right;padding:3px 0;font-weight:bold">+${money(q.gstAmount)}</td></tr></table>`:""}
 <div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:14px;text-align:center;margin-top:14px">
  <div style="font-size:14px;color:#1c6b2c">QUOTED AMOUNT (ESTIMATE)</div>
  <div style="font-size:30px;font-weight:bold;color:#1c6b2c">${money(q.quotedAmount)}</div>
 </div>
 ${advanceHtml}
 <div style="background:#f2f2f2;border-radius:6px;padding:10px;margin-top:10px;font-size:11.5px;color:#555">
  &#8505;&#65039; This is an estimated fare based on the KM/hours entered above and rates in effect today${q.validUntil?`, valid until <b>${esc(q.validUntil)}</b>`:""}. The <b>final bill</b> is calculated only after the trip, based on actual KM/hours travelled${q.validUntil?", and rates may change after the validity date above":""}.
  ${extraChargesHtml(q.extraCharges)}
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
 detailRows+=row("Bill Entry Date",t.entryDate||(t.created||"").slice(0,10)||"-");
 detailRows+=row("Trip Date",q.startDate||"-");

 let usageRows="";
 usageRows+=row("Total KM / Total Hours",km+" KM / "+h+" hrs",true);
 if(r.days>1) usageRows+=row("Number of days",r.days+" days");
 if(r.restHours>0) usageRows+=row("Overnight rest hours (excluded)",r.restHours+" hrs");
 if(r.incKm!=null){
  usageRows+=row("Included Coverage",r.incKm+" KM / "+r.incHours+" hrs");
  usageRows+=row("Extra KM ("+money(r.addKm)+"/KM)",Math.max(0,km-r.incKm)+" KM = "+money(r.kmExtra||0));
  usageRows+=row("Extra Hours ("+money(r.addHour)+"/hr)",Math.max(0,h-r.incHours)+" hrs = "+money(r.hourExtra||0));
 }

 const stdBase=standardRaw.invalid?0:standardRaw.base, stdExtra=standardRaw.invalid?0:standardRaw.extra, stdTotal=standardRaw.invalid?0:standardRaw.total;
 const offBase=r.base, offExtra=r.extra||0, offTotal=r.base+(r.extra||0);
 const cmpRow=(label,sv,ov,bold)=>`<tr><td style="padding:3px 0;font-weight:${bold?"bold":"normal"};font-size:14px">${esc(label)}</td><td style="padding:3px 0;text-align:right;font-weight:${bold?"bold":"normal"};font-size:14px">${money(sv)}</td><td style="padding:3px 0;text-align:right;font-weight:${bold?"bold":"normal"};font-size:14px">${money(ov)}</td></tr>`;
 const compareTable=`<table>
  <tr style="color:#888;font-size:12px"><td></td><td style="text-align:right">Standard</td><td style="text-align:right">Offer</td></tr>
  ${cmpRow("Base Rate",stdBase,offBase)}
  ${cmpRow("Additional Charge",stdExtra,offExtra)}
  <tr style="border-top:2px solid #ccc">${cmpRow("Total",stdTotal,offTotal,true).replace(/<tr>|<\/tr>/g,"")}</tr>
 </table>`;

 const savingsHtml=totalSavings>0?`<div style="background:#e6f7e9;border:2px solid #2e9e44;border-radius:8px;padding:12px;margin:10px 0;color:#1c6b2c">
  <div style="font-weight:bold;font-size:18px">🎉 Your Total Savings: ${money(totalSavings)}</div>
  <div style="font-size:12px">${rateSaving?`Offer discount ${money(rateSaving)}`:""}${manualDiscount?`${rateSaving?" + ":""}Additional discount ${money(manualDiscount)}`:""}</div>
 </div>`:"";

 let summaryRows="";
 summaryRows+=row("Base Rate",money(r.base));
 summaryRows+=row("Additional Charge (higher of KM/Hour)",money(r.extra||0));
 if(r.driverBata) summaryRows+=row("Driver Bata",money(r.driverBata));
 if(manualDiscount) summaryRows+=row("Manual Discount","- "+money(manualDiscount));
 if(manualAddition) summaryRows+=row("Manual Addition","+ "+money(manualAddition));
 if(r.roundAdjustment) summaryRows+=row("Round off",(r.roundAdjustment>=0?"+":"")+money(r.roundAdjustment));
 if(r.extraTotal>0) summaryRows+=row("Other Charges"+extraChargesShortLabel(r.extraCharges),"+"+money(r.extraTotal));
 if(r.gstAmount>0) summaryRows+=row("GST @ "+r.gstPct+"%","+"+money(r.gstAmount));

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
 ${tcBrandingBox(partnerPhones)}
 <div style="display:flex;justify-content:space-between;align-items:baseline">
  <h2 style="color:#143c5a;margin:4px 0;font-size:20px">FINAL TRIP BILL</h2>
  <span style="color:#888;font-size:12px">Bill printed on: ${esc(billDate)}</span>
 </div>
 <table>${detailRows}</table>
 <div style="background:#fdf6e3;border:2px solid #d2b478;border-radius:8px;padding:12px;margin:10px 0">
  <div style="font-weight:bold;font-size:14px;color:#7a5a1e;margin-bottom:6px">&#128663; ROUTE</div>
  <div style="font-size:15px;font-weight:600">${[q.vehicleStart,q.pickup,...dests,q.returnPoint].filter(Boolean).map(esc).join(" &rarr; ")}</div>
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
 <div style="background:#f2f2f2;border-radius:6px;padding:10px;margin-top:10px;font-size:11px;color:#555">
  ${extraChargesHtml(r.extraCharges)}
 </div>
 <p style="text-align:center;color:#888;font-size:12px;margin-top:14px">Thank you for travelling with ${esc(db.business.name)}.</p>
 `);
}

/* Owner-only preview shortcuts — shows exactly what a regular Travel Partner
   or a Customer sees, without logging out and back in as a different role.
   Uses history the same way tcAuthorizedUsersPage()/tcOpenFeedbackAdmin() do
   (reached only from the Menu, so Back reopens the Menu). The existing
   "← Back to Dashboard" link on the previewed page returns to the owner's
   own dashboard normally. */
function tcPreviewPage(hashName,renderFn){
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
function tcPreviewPartnerPage(){ tcPreviewPage("previewpartner",partnerView); }
function tcPreviewCustomerPage(){ tcPreviewPage("previewcustomer",customerHome); }

/* Redefines openEditBillingIdentity()/saveBillingIdentity() (already in
   app.js) to add an Email field — used on the new dashboard identity card
   above, alongside the fields that already existed. */
function openEditBillingIdentity(){
 modal(`<h2>Edit Billing Details</h2>
  <p class="muted">Shown on your bills and quotations printed from this device.</p>
  <div class="grid">
   <label>Business name<input id="bizName" value="${esc(db.business.name)}"></label>
   <label>Tagline<input id="bizTagline" value="${esc(db.business.tagline||"")}"></label>
   <label>Address<input id="bizAddress" value="${esc(db.business.address||"")}"></label>
   <label>Email<input id="bizEmail" type="email" value="${esc(db.business.email||"")}"></label>
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
  email:document.querySelector("#bizEmail").value,
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

/* Redefines saveQuickBill() (already in app-updates.js) to fix a real crash:
   "billTrip.value=trip.id" relied on an implicit global (the #billTrip select
   element only exists as `window.billTrip` while the Billing page happens to
   be the one currently rendered) — if navigation landed anywhere else in
   between (e.g. a customer-role render intercepting it), this threw an
   uncaught ReferenceError that broke whatever ran right after it, which is
   what caused the erratic page-switching seen while testing. Using a proper
   querySelector with a null-check means this can never crash, regardless of
   what's currently on screen. */
function saveQuickBill(){
 const name=document.querySelector("#qbName").value, mobile=document.querySelector("#qbMobile").value;
 if(!name||!mobile){toast("Enter the customer's name and mobile number");return}
 const c=db.categories[+document.querySelector("#qbCat").value];
 const km=+document.querySelector("#qbKm").value||0, h=+document.querySelector("#qbHours").value||0;
 const days=+document.querySelector("#qbDays").value||1, restHours=+document.querySelector("#qbRestHours").value||0;
 const overrideAddKm=document.querySelector("#qbOverrideAddKm").value||"", overrideAddHour=document.querySelector("#qbOverrideAddHour").value||"";
 const ratePlan=document.querySelector("#qbRate").value;
 const r=calcFare(c,ratePlan,km,h,days,restHours,{addKm:overrideAddKm,addHour:overrideAddHour});
 if(r.invalid){toast("Correct Local Trip limits first");return}
 const qId=crypto.randomUUID();
 const quote={
  id:qId,no:"QTN-"+Date.now(),created:new Date().toISOString(),status:"billed",
  customer:name,mobile,type:document.querySelector("#qbType").value,category:c.name,categoryId:+document.querySelector("#qbCat").value,
  vehicle:document.querySelector("#qbVehicle").value,vehicleNo:document.querySelector("#qbVehicleNo").value,
  pickup:document.querySelector("#qbPickup").value,vehicleStart:document.querySelector("#qbVehicleStart").value,
  destinations:collectQuickBillDestinations(),destination:collectQuickBillDestinations()[0]||"",
  returnPoint:document.querySelector("#qbReturn").value,
  estimatedKm:km,estimatedHours:h,days,restHours,startDate:document.querySelector("#qbDate").value,
  ratePlan,overrideAddKm,overrideAddHour,
  discountType:"none",discountValue:0,roundOff:0,
  subtotal:r.total,quotedAmount:r.total,
  advanceAmount:0,advanceReceived:false,
  extraCharges:readExtraChargeFields("qbExtra"),
  gstOn:false,gstPct:0,gstAmount:0
 };
 db.quotes.unshift(quote);
 const trip={id:crypto.randomUUID(),quoteId:qId,customer:name,status:"completed",actualKm:km,actualHours:h,days,restHours,
  entryDate:new Date().toISOString().slice(0,10),startDate:document.querySelector("#qbDate").value,
  pickup:document.querySelector("#qbPickup").value,dest:collectQuickBillDestinations().join(", "),returnPoint:document.querySelector("#qbReturn").value,
  payments:[],extraCharges:quote.extraCharges,created:new Date().toISOString()};
 db.trips.unshift(trip);
 save();closeModal();toast("Bill created");
 view("billing");
 setTimeout(()=>{
  const bt=document.querySelector("#billTrip");
  if(bt){ bt.value=trip.id; loadBill(); }
 },0);
}

/* Redefines submitAddVehicle() (already in app.js) to make the document
   photos mandatory instead of optional — RC, Insurance, Permit, Fitness and
   PUC (plus the front photo showing the plate) must all be uploaded before
   the vehicle can be saved, since a partial submission just makes admin
   verification slower/harder later. */
async function submitAddVehicle(partnerId){
 const no=document.querySelector("#vNoNew").value.trim();
 const errBox=document.querySelector("#vAddErr");
 if(!no){errBox.textContent="Enter the vehicle number.";return}
 const requiredPhotos={vFrontPhoto:"Front photo",vRcPhoto:"RC photo",vInsPhoto:"Insurance photo",vPermitPhoto:"Permit photo",vFitnessPhoto:"Fitness photo",vPucPhoto:"PUC photo"};
 const missing=Object.entries(requiredPhotos).filter(([elId])=>{
  const el=document.querySelector("#"+elId);
  return !(el&&el.files&&el.files[0]);
 }).map(([,label])=>label);
 if(missing.length){
  errBox.textContent="Please upload: "+missing.join(", ")+" — all vehicle documents are required for verification.";
  return;
 }
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

/* Redefines openAddVehicle() (already in app.js) purely to mark the document
   fields as required (*) in the label text, matching the new validation. */
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
  <label>License photo (optional)<input id="vLicPhoto" type="file" accept="image/*"></label>
 </div>
 <h4>Vehicle documents — all required for verification</h4>
 <div class="grid">
  <label>Front photo * (vehicle number must be clearly visible)<input id="vFrontPhoto" type="file" accept="image/*"></label>
  <label>RC photo *<input id="vRcPhoto" type="file" accept="image/*"></label>
  <label>RC expiry<input id="vRcExp" type="date"></label>
  <label>Insurance photo *<input id="vInsPhoto" type="file" accept="image/*"></label>
  <label>Insurance expiry<input id="vInsExp" type="date"></label>
  <label>Permit photo *<input id="vPermitPhoto" type="file" accept="image/*"></label>
  <label>Permit expiry<input id="vPermitExp" type="date"></label>
  <label>Fitness photo *<input id="vFitnessPhoto" type="file" accept="image/*"></label>
  <label>Fitness expiry<input id="vFitnessExp" type="date"></label>
  <label>PUC photo *<input id="vPucPhoto" type="file" accept="image/*"></label>
  <label>PUC expiry<input id="vPucExp" type="date"></label>
 </div>
 <button class="primary" id="vSaveBtn" onclick="submitAddVehicle(${partnerId})">Save Vehicle</button>
 <div id="vAddErr" class="danger"></div>`);
}
