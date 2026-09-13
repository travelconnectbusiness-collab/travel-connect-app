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
  el.style.cssText = "position:fixed;inset:0;z-index:99999;background:#0f5a55;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:sans-serif";
  document.body.appendChild(el);
 }
 if (mode === "setup") {
  el.innerHTML = `
   <div style="font-size:40px;margin-bottom:8px">🔒</div>
   <h2 style="margin:0 0 6px">Set an App PIN</h2>
   <p style="opacity:.85;max-width:320px;margin:0 0 18px">Choose a 4-6 digit PIN. You'll need it every time you reopen this app on this device.</p>
   <input id="tcPinNew" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="New PIN" style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:8px;border:none;width:180px;margin-bottom:10px">
   <input id="tcPinConfirm" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="Confirm PIN" style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:8px;border:none;width:180px;margin-bottom:14px">
   <div id="tcPinErr" style="color:#ffd; min-height:20px;margin-bottom:10px"></div>
   <button onclick="tcSubmitPinSetup()" style="padding:10px 24px;border-radius:8px;border:none;background:#fff;color:#0f5a55;font-weight:bold;font-size:16px">Set PIN</button>
  `;
 } else {
  el.innerHTML = `
   <div style="font-size:40px;margin-bottom:8px">🔒</div>
   <h2 style="margin:0 0 6px">Enter PIN</h2>
   <input id="tcPinEntry" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="PIN" autofocus style="font-size:22px;text-align:center;letter-spacing:6px;padding:10px;border-radius:8px;border:none;width:180px;margin-bottom:10px" onkeydown="if(event.key==='Enter')tcSubmitPinEntry()">
   <div id="tcPinErr" style="color:#ffd;min-height:20px;margin-bottom:10px"></div>
   <button onclick="tcSubmitPinEntry()" style="padding:10px 24px;border-radius:8px;border:none;background:#fff;color:#0f5a55;font-weight:bold;font-size:16px;margin-bottom:16px">Unlock</button>
   <div><a href="#" onclick="tcForgotPin();return false" style="color:#fff;text-decoration:underline;font-size:13px">Forgot PIN?</a></div>
  `;
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
 app().innerHTML=card("Travel Connect Dashboard",`
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
 const errBox=document.querySelector("#loginError");
 if(!name||!mobile){ errBox.textContent="Enter your name and mobile number."; return; }
 try{
  const res=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"login",name,mobile,invite_token:inviteToken||undefined,device_token:getDeviceToken()})});
  const data=await res.json();
  if(!data.ok){
   if(data.error==="blocked") errBox.textContent="Access has been blocked for this number. Contact the app owner.";
   else if(data.error==="not_authorized") errBox.textContent="This mobile number is not authorized to use this app. Contact the app owner to be added.";
   else errBox.textContent="Login failed. Please try again.";
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
function tcOpenMenu(){
 modal(`<h2>Menu</h2>
  <p class="muted">Owner / admin settings — password protected.</p>
  <div class="listitem" style="cursor:pointer" onclick="closeModal();tcMenuNavPending=true;view('master')">&#128202; Rate Master</div>
  <div class="listitem" style="cursor:pointer" onclick="closeModal();tcMenuNavPending=true;view('accounts')">&#128176; Accounts</div>
  <div class="listitem" style="cursor:pointer" onclick="closeModal();tcMenuNavPending=true;view('admin')">&#9881;&#65039; Admin</div>
  <div class="listitem" style="cursor:pointer" onclick="closeModal();tcMenuNavPending=true;tcAuthorizedUsersPage()">&#128274; Authorized Users (Login Allowlist)</div>
  <hr>
  <div class="listitem" style="cursor:pointer;color:#a12d2d" onclick="closeModal();logout()">&#128682; Log out of this device</div>`);
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
}

tcHideAdminTabs();
tcInjectMenuButton();
tcBuildPremiumHeader();
