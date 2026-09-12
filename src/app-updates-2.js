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
 app().innerHTML=card("Travel Connect Dashboard",`<div class="grid">
 <div class="metric">Customers<b>${db.customers.length}</b></div><div class="metric">Drivers<b>${db.drivers.length}</b></div>
 <div class="metric">Vehicles<b>${db.vehicles.length}</b></div><div class="metric">Saved Quotations<b>${db.quotes.length}</b></div>
 </div><div class="card"><h3>Business workflow</h3><p>Enquiry → Quotation → Confirmation → Trip → Final Bill → Payment → Accounts</p>
 <div class="notice"><b>Local Trip:</b> maximum ${db.settings.localMaxKm} KM AND ${db.settings.localMaxHours} hours. If either limit is exceeded, it automatically switches to a One Day tariff.</div></div>
 <div class="actions">
  <button class="primary" style="background:#3b7bbf;border-color:#3b7bbf" onclick="view('enquiries')">New Enquiry</button>
  <button style="background:#148c76;color:#fff;border-color:#148c76" onclick="view('quotations')">New Quotation</button>
  <button style="background:#c9820d;color:#fff;border-color:#c9820d" onclick="goQuickBill()">&#9889; Quick Bill</button>
  <button style="background:#6b7280;color:#fff;border-color:#6b7280" onclick="view('master')">Rate Master</button>
 </div>
 <div class="actions" style="margin-top:8px"><button onclick="view('partner')">Travel Partner / Vehicles</button><button onclick="view('activeboard')">Active Vehicles Board</button></div>
 <div class="actions" style="margin-top:8px"><button onclick="tcAuthorizedUsersPage()">&#128274; Authorized Users (Login Allowlist)</button></div>
 <div class="actions" style="margin-top:10px"><button onclick="logout()">Log out of this device</button></div>`);
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
 requireAdmin(() => tcRenderAuthorizedUsersPage());
}
async function tcRenderAuthorizedUsersPage(){
 app().innerHTML = card("Authorized Users (Login Allowlist)", `
  <p class="muted">Only mobile numbers added here can log in to this app. Matching is by mobile number only — the name is just a label to help you remember whose number it is.</p>
  <div class="grid">
   <label>Mobile number<input id="tcAuthMobile" type="tel"></label>
   <label>Name (optional label)<input id="tcAuthName"></label>
  </div>
  <div class="actions"><button class="primary" onclick="tcAddAuthorizedUser()">+ Add</button></div>
  <div id="tcAuthList">Loading...</div>
 `);
 tcLoadAuthorizedUsers();
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
