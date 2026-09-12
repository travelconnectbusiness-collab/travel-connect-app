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

tcCheckPinLock();
