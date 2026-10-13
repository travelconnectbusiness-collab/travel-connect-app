/* ============================================================================
   tc-upgrade.js  -  email verification, "request verification" and
   "Plus / Premium" upgrade, for business owners; request lists, prices and
   edit/delete tools for the admin.

   Loaded AFTER directory.js / customer-safety.js, so it can extend them
   without editing those big files:
     - adds a "Verification & Plan" card to every owner dashboard
     - adds a small "Email verified" chip next to the badges customers see
     - adds "Verification requests" and "Plan requests" to the admin's
       Pending Approvals page
     - adds "Prices & UPI" to the admin's Partner Plans page
     - adds an Email box to the admin's partner edit form
   Server: /api/upgrade (upgrade.js).
   ========================================================================== */
(function(){
"use strict";

const bl=(en,ml)=>(typeof tcBl==="function"?tcBl(en,ml):en);
const E=(v)=>(typeof esc==="function"?esc(v):String(v==null?"":v));
const say=(m)=>{ try{ toast(m); }catch(e){ alert(m); } };

/* ------------------------------------------------------------------ utils */
function ownerCreds(){
 let u=null; try{ u=getCurrentUser(); }catch(e){}
 const pid=(typeof db!=="undefined"&&db.settings)?db.settings.myPartnerId:null;
 if(!u||!pid) return null;
 return {partner_id:pid,mobile:u.mobile,device_token:getDeviceToken(),role:u.role};
}
/* Every call returns {ok:false,error:...} instead of throwing, so a bad
   network never leaves a button stuck or an unhandled error. */
async function getJson(url){
 try{ const r=await fetch(url); return (await r.json())||{ok:false,error:"bad_response"}; }
 catch(e){ return {ok:false,error:"network"}; }
}
async function postJson(action,body){
 try{
  const r=await fetch("/api/upgrade?action="+action,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  return (await r.json())||{ok:false,error:"bad_response"};
 }catch(e){ return {ok:false,error:"network"}; }
}
async function postForm(action,fd){
 try{
  const r=await fetch("/api/upgrade?action="+action,{method:"POST",body:fd});
  return (await r.json())||{ok:false,error:"bad_response"};
 }catch(e){ return {ok:false,error:"network"}; }
}
/* Phone photos are often 4-8 MB: shrink to <= 1400px JPEG before upload. */
function shrinkImage(file){
 return new Promise((resolve)=>{
  if(!file||!/^image\//.test(file.type)||!window.createImageBitmap){ resolve(file); return; }
  createImageBitmap(file).then(bmp=>{
   const max=1400, k=Math.min(1,max/Math.max(bmp.width,bmp.height));
   const c=document.createElement("canvas"); c.width=Math.round(bmp.width*k); c.height=Math.round(bmp.height*k);
   c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
   c.toBlob(b=>resolve(b?new File([b],"doc.jpg",{type:"image/jpeg"}):file),"image/jpeg",0.82);
  }).catch(()=>resolve(file));
 });
}
const ERR={
 unauthorized:["Please log in again.","വീണ്ടും ലോഗിൻ ചെയ്യുക."],
 network:["No internet connection. Please try again.","ഇന്റർനെറ്റ് ലഭ്യമല്ല. വീണ്ടും ശ്രമിക്കുക."],
 bad_email:["That email address does not look right.","ഇമെയിൽ വിലാസം ശരിയല്ല."],
 wait:["Please wait a minute before asking for another code.","അടുത്ത കോഡിന് ഒരു മിനിറ്റ് കാത്തിരിക്കുക."],
 too_many:["Too many codes asked. Try again after an hour.","കോഡുകൾ കൂടുതൽ ചോദിച്ചു. ഒരു മണിക്കൂറിനു ശേഷം ശ്രമിക്കുക."],
 email_not_configured:["Email service is not set up yet. Please tell the admin.","ഇമെയിൽ സേവനം ഇതുവരെ സജ്ജമാക്കിയിട്ടില്ല. അഡ്മിനെ അറിയിക്കുക."],
 email_send_failed:["Could not send the email. Check the address and try again.","ഇമെയിൽ അയയ്ക്കാൻ കഴിഞ്ഞില്ല. വിലാസം പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക."],
 no_code:["Ask for a code first.","ആദ്യം കോഡ് ആവശ്യപ്പെടുക."],
 expired:["The code has expired. Ask for a new one.","കോഡിന്റെ സമയം കഴിഞ്ഞു. പുതിയത് ആവശ്യപ്പെടുക."],
 too_many_attempts:["Too many wrong tries. Ask for a new code.","തെറ്റായ ശ്രമങ്ങൾ കൂടി. പുതിയ കോഡ് ആവശ്യപ്പെടുക."],
 wrong_code:["Wrong code.","കോഡ് തെറ്റാണ്."],
 email_not_verified:["Verify your email first.","ആദ്യം ഇമെയിൽ വെരിഫൈ ചെയ്യുക."],
 already_verified:["Already verified.","ഇതിനകം വെരിഫൈഡ് ആണ്."],
 already_pending:["A request is already waiting for the admin.","ഒരു അപേക്ഷ അഡ്മിന്റെ പരിശോധനയ്ക്കായി ഇതിനകം ഉണ്ട്."],
 docs_required:["Please add a photo of your ID / business proof.","തിരിച്ചറിയൽ / ബിസിനസ് രേഖയുടെ ഫോട്ടോ ചേർക്കുക."],
 image_too_big:["A photo is too big. Try a smaller one.","ഒരു ഫോട്ടോ വളരെ വലുതാണ്. ചെറുത് ഉപയോഗിക്കുക."],
 bad_utr:["Enter the UPI reference / UTR number (letters and digits, 8-30).","UPI റഫറൻസ് / UTR നമ്പർ ശരിയായി നൽകുക (അക്കങ്ങളും അക്ഷരങ്ങളും, 8-30)."],
 utr_used:["This UTR number was already used.","ഈ UTR നമ്പർ മുമ്പ് ഉപയോഗിച്ചതാണ്."],
 payment_not_set:["Payment is not set up yet. Please contact the admin.","പണമടയ്ക്കൽ ഇതുവരെ സജ്ജമാക്കിയിട്ടില്ല. അഡ്മിനെ ബന്ധപ്പെടുക."],
 price_not_set:["Price is not set yet. Please contact the admin.","വില ഇതുവരെ നിശ്ചയിച്ചിട്ടില്ല. അഡ്മിനെ ബന്ധപ്പെടുക."],
 owner_plan:["This business already has an owner plan.","ഈ ബിസിനസിന് ഓണർ പ്ലാൻ ഉണ്ട്."],
};
function errText(d){
 const e=ERR[d&&d.error];
 if(e) return bl(e[0],e[1])+((d.error==="wrong_code"&&d.attempts_left!=null)?" ("+d.attempts_left+")":"");
 return bl("Something went wrong. Please try again.","എന്തോ പിഴവ് സംഭവിച്ചു. വീണ്ടും ശ്രമിക്കുക.");
}
function fmtDate(iso){
 try{ return (typeof tcFormatDate==="function")?tcFormatDate(String(iso).slice(0,10)):String(iso).slice(0,10); }catch(e){ return String(iso).slice(0,10); }
}
const PLAN_NAME={free:["Free","ഫ്രീ"],paid:["Plus","പ്ലസ്"],premium:["Premium","പ്രീമിയം"],owner_plus:["Owner Plus","ഓണർ പ്ലസ്"],owner_free:["Owner Premium","ഓണർ പ്രീമിയം"]};
const planName=(p)=>{ const n=PLAN_NAME[p||"free"]||PLAN_NAME.free; return bl(n[0],n[1]); };

/* ======================================================================
   1) CUSTOMER SIDE - "Email verified" chip next to the badges
   ====================================================================== */
if(typeof window.tcListBadgesHtml==="function"){
 const origBadges=window.tcListBadgesHtml;
 window.tcListBadgesHtml=function(p){
  const html=origBadges.apply(this,arguments);
  if(!p||!p.email_verified) return html;
  const chip='<span style="display:inline-block;margin:3px 6px 0 0;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:#eef1f8;color:#33407a;border:1px solid #c5cbe6">&#9993; '+bl("Email verified","ഇമെയിൽ വെരിഫൈഡ്")+'</span>';
  return html.replace(/<\/div>\s*$/,chip+"</div>");
 };
}

/* ======================================================================
   2) OWNER SIDE - "Verification & Plan" card on the owner dashboard
   ====================================================================== */
let upState=null;

function injectOwnerCard(){
 if(document.querySelector("#tcUpCard")) return;
 const c=ownerCreds(); if(!c||c.role==="customer") return;
 const anchor=document.querySelector("#tcBloodCard")||document.querySelector("#tcMsgCard");
 if(!anchor) return;
 anchor.insertAdjacentHTML("afterend",'<div class="card" id="tcUpCard"><h3>&#9989; '+bl("Verification & Plan","വെരിഫിക്കേഷനും പ്ലാനും")+'</h3><p class="muted">'+bl("Loading...","ലോഡ് ചെയ്യുന്നു...")+'</p></div>');
 loadOwnerCard();
}
async function loadOwnerCard(){
 const box=document.querySelector("#tcUpCard"); if(!box) return;
 const c=ownerCreds(); if(!c){ box.remove(); return; }
 const d=await getJson("/api/upgrade?action=status&partner_id="+encodeURIComponent(c.partner_id)+"&mobile="+encodeURIComponent(c.mobile)+"&device="+encodeURIComponent(c.device_token));
 if(!d.ok){ box.remove(); return; }   /* e.g. admin previewing a page - nothing to show */
 upState=d;
 /* keep the cached partner in step so later "save" buttons never overwrite the verified email with an old copy */
 try{
  if(window._myPartner&&String(window._myPartner.id)===String(d.partner.id)){
   window._myPartner.email=d.partner.email; window._myPartner.email_verified=d.partner.email_verified; window._myPartner.verified=d.partner.verified;
  }
 }catch(e){}
 renderOwnerCard();
}
function planLine(p){
 const plan=p.plan||"free", exp=p.plan_expires_at;
 if(plan==="owner_free"||plan==="owner_plus") return '<b>'+planName(plan)+'</b> <span class="muted">('+bl("no expiry","കാലാവധി ഇല്ല")+')</span>';
 if(plan==="free") return '<b>'+planName("free")+'</b>';
 const days=exp?Math.ceil((new Date(exp).getTime()-Date.now())/86400000):null;
 if(days!=null&&days<0) return '<b>'+planName("free")+'</b> <span class="danger">('+bl("your "+planName(plan)+" plan expired on ","നിങ്ങളുടെ "+planName(plan)+" പ്ലാൻ കഴിഞ്ഞത് ")+E(fmtDate(exp))+')</span>';
 return '<b>'+planName(plan)+'</b> '+(exp?'<span class="'+(days<=7?"danger":"muted")+'">('+bl("valid until ","കാലാവധി ")+E(fmtDate(exp))+(days<=7?", "+days+bl(" days left"," ദിവസം ബാക്കി"):"")+')</span>':"");
}
function renderOwnerCard(){
 const box=document.querySelector("#tcUpCard"); if(!box||!upState) return;
 const d=upState, p=d.partner, vr=d.verify, ur=d.upgrade;
 const isOwnerPlan=p.plan==="owner_free"||p.plan==="owner_plus";
 let h='<h3>&#9989; '+bl("Verification & Plan","വെരിഫിക്കേഷനും പ്ലാനും")+'</h3>';
 /* verified line */
 if(p.verified) h+='<div style="margin:4px 0"><span class="ok">&#10003; '+bl("Verified by Travel Connect","Travel Connect വെരിഫൈ ചെയ്തു")+'</span></div>';
 else if(vr&&vr.status==="pending") h+='<div style="margin:4px 0" class="muted">&#9203; '+bl("Verification request sent - waiting for the admin.","വെരിഫിക്കേഷൻ അപേക്ഷ അയച്ചു - അഡ്മിന്റെ പരിശോധനയ്ക്കായി കാത്തിരിക്കുന്നു.")+'</div>';
 else h+='<div style="margin:4px 0" class="muted">'+bl("Not verified yet. Customers see \"Not verified\" next to your name.","ഇതുവരെ വെരിഫൈഡ് അല്ല. ഉപഭോക്താക്കൾ നിങ്ങളുടെ പേരിനടുത്ത് \"Not verified\" കാണും.")+'</div>';
 if(!p.verified&&vr&&vr.status==="rejected") h+='<div class="danger" style="margin:4px 0;font-size:12.5px">'+bl("Your last request was not approved","നിങ്ങളുടെ കഴിഞ്ഞ അപേക്ഷ അംഗീകരിച്ചില്ല")+(vr.admin_note?": "+E(vr.admin_note):"")+'</div>';
 /* email line */
 if(p.email_verified) h+='<div style="margin:4px 0">&#9993; '+E(p.email)+' <span class="ok">&#10003; '+bl("verified","വെരിഫൈഡ്")+'</span></div>';
 else h+='<div style="margin:4px 0" class="muted">&#9993; '+(p.email?E(p.email)+" - ":"")+bl("email not verified","ഇമെയിൽ വെരിഫൈ ചെയ്തിട്ടില്ല")+'</div>';
 /* plan line */
 h+='<div style="margin:4px 0">'+bl("Plan: ","പ്ലാൻ: ")+planLine(p)+'</div>';
 /* pending / rejected plan request */
 if(ur&&ur.status==="pending") h+='<div style="margin:6px 0;padding:6px 8px;background:#fff8e1;border-radius:8px;font-size:12.5px">&#9203; '+bl("Your ","നിങ്ങളുടെ ")+planName(ur.plan)+bl(" request (Rs "," അപേക്ഷ (Rs ")+E(ur.amount)+bl(", UTR ",", UTR ")+E(ur.utr)+bl(") is waiting for the admin to check the payment.",") പണമടച്ചത് അഡ്മിൻ പരിശോധിക്കാൻ കാത്തിരിക്കുന്നു.")+'</div>';
 else if(ur&&ur.status==="rejected") h+='<div class="danger" style="margin:6px 0;font-size:12.5px">'+bl("Your last plan request was not approved","നിങ്ങളുടെ കഴിഞ്ഞ പ്ലാൻ അപേക്ഷ അംഗീകരിച്ചില്ല")+(ur.admin_note?": "+E(ur.admin_note):"")+'</div>';
 /* buttons */
 let b="";
 if(!p.email_verified) b+='<button class="primary" onclick="tcUpOpenEmail()">&#9993; '+bl("Verify email","ഇമെയിൽ വെരിഫൈ ചെയ്യുക")+'</button>';
 if(!p.verified&&!(vr&&vr.status==="pending")) b+='<button onclick="tcUpOpenVerify()">&#128737; '+bl("Request verification","വെരിഫിക്കേഷന് അപേക്ഷിക്കുക")+'</button>';
 if(!isOwnerPlan&&!(ur&&ur.status==="pending")) b+='<button onclick="tcUpOpenUpgrade()" style="background:#e0a100;color:#fff;border-color:#e0a100">&#11088; '+bl((p.plan==="paid"||p.plan==="premium")?"Renew / Upgrade":"Get Plus / Premium",(p.plan==="paid"||p.plan==="premium")?"പുതുക്കുക / അപ്ഗ്രേഡ്":"Plus / Premium എടുക്കുക")+'</button>';
 if(b) h+='<div class="actions" style="margin-top:8px;flex-wrap:wrap">'+b+'</div>';
 box.innerHTML=h;
}

/* ---------------- email modal ---------------- */
let afterEmail=null;
window.tcUpOpenEmail=function(next){
 afterEmail=(typeof next==="function")?next:null;
 const cur=(upState&&upState.partner.email)||"";
 modal('<h2>&#9993; '+bl("Verify your email","ഇമെയിൽ വെരിഫൈ ചെയ്യുക")+'</h2>'+
  '<p class="muted">'+bl("We will send a 6-digit code to your email. Enter it here to confirm the email is yours.","നിങ്ങളുടെ ഇമെയിലിലേക്ക് 6 അക്ക കോഡ് അയയ്ക്കും. ഇമെയിൽ നിങ്ങളുടേതാണെന്ന് ഉറപ്പിക്കാൻ അത് ഇവിടെ നൽകുക.")+'</p>'+
  (upState&&!upState.email_ready?'<p class="danger" style="font-size:12.5px">'+bl("Email service is not set up yet - code cannot be sent. Please tell the admin.","ഇമെയിൽ സേവനം ഇതുവരെ സജ്ജമാക്കിയിട്ടില്ല - കോഡ് അയയ്ക്കാൻ കഴിയില്ല. അഡ്മിനെ അറിയിക്കുക.")+'</p>':"")+
  '<label>'+bl("Email","ഇമെയിൽ")+'<input id="tcUpEmail" type="email" inputmode="email" autocomplete="email" value="'+E(cur)+'"></label>'+
  '<div class="actions"><button class="primary" id="tcUpSendBtn" onclick="tcUpSendOtp()">'+bl("Send code","കോഡ് അയയ്ക്കുക")+'</button></div>'+
  '<div id="tcUpOtpBox" style="display:none;margin-top:8px"><label>'+bl("6-digit code","6 അക്ക കോഡ്")+'<input id="tcUpCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>'+
  '<div class="actions"><button class="primary" id="tcUpVerBtn" onclick="tcUpVerifyOtp()">'+bl("Verify","വെരിഫൈ ചെയ്യുക")+'</button></div>'+
  '<p class="muted" style="font-size:12px">'+bl("Did not get it? Check Spam, or wait a minute and press Send code again.","കിട്ടിയില്ലേ? Spam ഫോൾഡർ നോക്കുക, അല്ലെങ്കിൽ ഒരു മിനിറ്റ് കഴിഞ്ഞ് വീണ്ടും അയയ്ക്കുക.")+'</p></div>'+
  '<div id="tcUpEmailMsg" class="danger" style="font-size:12.5px;margin-top:6px"></div>');
};
window.tcUpSendOtp=async function(){
 const c=ownerCreds(); if(!c) return;
 const email=(document.querySelector("#tcUpEmail").value||"").trim();
 const msg=document.querySelector("#tcUpEmailMsg"), btn=document.querySelector("#tcUpSendBtn");
 msg.textContent=""; btn.disabled=true;
 const d=await postJson("email_send_otp",{partner_id:c.partner_id,mobile:c.mobile,device_token:c.device_token,email});
 btn.disabled=false;
 if(!d.ok){ msg.textContent=errText(d)+(d.detail?" ["+d.detail.slice(0,120)+"]":""); return; }
 document.querySelector("#tcUpOtpBox").style.display="";
 say(bl("Code sent - check your email","കോഡ് അയച്ചു - ഇമെയിൽ നോക്കുക"));
 document.querySelector("#tcUpCode").focus();
};
window.tcUpVerifyOtp=async function(){
 const c=ownerCreds(); if(!c) return;
 const email=(document.querySelector("#tcUpEmail").value||"").trim();
 const code=(document.querySelector("#tcUpCode").value||"").trim();
 const msg=document.querySelector("#tcUpEmailMsg"), btn=document.querySelector("#tcUpVerBtn");
 msg.textContent=""; btn.disabled=true;
 const d=await postJson("email_verify_otp",{partner_id:c.partner_id,mobile:c.mobile,device_token:c.device_token,email,code});
 btn.disabled=false;
 if(!d.ok){ msg.textContent=errText(d); return; }
 say(bl("Email verified","ഇമെയിൽ വെരിഫൈ ചെയ്തു"));
 closeModal();
 await loadOwnerCard();
 const n=afterEmail; afterEmail=null; if(n) setTimeout(n,200);
};

/* ---------------- request verification modal ---------------- */
function docFieldsHtml(){
 return '<label>'+bl("ID / business proof (photo) *","തിരിച്ചറിയൽ / ബിസിനസ് രേഖ (ഫോട്ടോ) *")+'<input id="tcUpDoc1" type="file" accept="image/*"></label>'+
  '<div class="muted" style="font-size:11.5px;margin:-4px 0 6px">'+bl("e.g. shop licence, driving licence, RC, GST, ID card. If it shows an Aadhaar number, cover it.","ഉദാ: ഷോപ്പ് ലൈസൻസ്, ഡ്രൈവിങ് ലൈസൻസ്, RC, GST, ഐഡി കാർഡ്. ആധാർ നമ്പർ ഉണ്ടെങ്കിൽ മറച്ച് വയ്ക്കുക.")+'</div>'+
  '<label>'+bl("Photo of your shop / vehicle (optional)","കടയുടെ / വാഹനത്തിന്റെ ഫോട്ടോ (ഓപ്ഷണൽ)")+'<input id="tcUpDoc2" type="file" accept="image/*"></label>'+
  '<label>'+bl("Note for the admin (optional)","അഡ്മിനുള്ള കുറിപ്പ് (ഓപ്ഷണൽ)")+'<input id="tcUpNote" maxlength="300"></label>';
}
async function appendDocs(fd){
 const f1=document.querySelector("#tcUpDoc1")?.files[0], f2=document.querySelector("#tcUpDoc2")?.files[0];
 if(f1) fd.set("doc1",await shrinkImage(f1),"doc1.jpg");
 if(f2) fd.set("doc2",await shrinkImage(f2),"doc2.jpg");
 const note=document.querySelector("#tcUpNote")?.value||""; if(note) fd.set("note",note);
 return !!f1;
}
function baseForm(c){
 const fd=new FormData(); fd.set("partner_id",c.partner_id); fd.set("mobile",c.mobile); fd.set("device_token",c.device_token); return fd;
}
window.tcUpOpenVerify=function(){
 if(!upState) return;
 if(!upState.partner.email_verified){ say(bl("Verify your email first","ആദ്യം ഇമെയിൽ വെരിഫൈ ചെയ്യുക")); tcUpOpenEmail(tcUpOpenVerify); return; }
 modal('<h2>&#128737; '+bl("Request verification","വെരിഫിക്കേഷന് അപേക്ഷ")+'</h2>'+
  '<p class="muted">'+bl("Send a proof photo. The admin checks it and marks your business Verified. Free of cost.","രേഖയുടെ ഫോട്ടോ അയയ്ക്കുക. അഡ്മിൻ പരിശോധിച്ച് നിങ്ങളുടെ ബിസിനസ് Verified ആക്കും. സൗജന്യം.")+'</p>'+
  docFieldsHtml()+
  '<div id="tcUpMsg" class="danger" style="font-size:12.5px"></div>'+
  '<div class="actions"><button class="primary" id="tcUpSubmitBtn" onclick="tcUpSubmitVerify()">'+bl("Send request","അപേക്ഷ അയയ്ക്കുക")+'</button></div>');
};
window.tcUpSubmitVerify=async function(){
 const c=ownerCreds(); if(!c) return;
 const msg=document.querySelector("#tcUpMsg"), btn=document.querySelector("#tcUpSubmitBtn");
 msg.textContent=""; btn.disabled=true; btn.textContent=bl("Sending...","അയയ്ക്കുന്നു...");
 const fd=baseForm(c); const has=await appendDocs(fd);
 if(!has){ msg.textContent=errText({error:"docs_required"}); btn.disabled=false; btn.textContent=bl("Send request","അപേക്ഷ അയയ്ക്കുക"); return; }
 const d=await postForm("verify_request",fd);
 btn.disabled=false; btn.textContent=bl("Send request","അപേക്ഷ അയയ്ക്കുക");
 if(!d.ok){ msg.textContent=errText(d); return; }
 say(bl("Request sent to the admin","അപേക്ഷ അഡ്മിന് അയച്ചു")); closeModal(); loadOwnerCard();
};

/* ---------------- upgrade modal ---------------- */
let upPlan="paid";
window.tcUpOpenUpgrade=function(){
 if(!upState) return;
 if(!upState.partner.email_verified){ say(bl("Verify your email first","ആദ്യം ഇമെയിൽ വെരിഫൈ ചെയ്യുക")); tcUpOpenEmail(tcUpOpenUpgrade); return; }
 const d=upState, per=d.period==="month"?bl("month","മാസം"):bl("year","വർഷം");
 const payReady=d.upi&&d.upi.id&&d.prices.paid>0&&d.prices.premium>0;
 const vr=d.verify; const needDocs=!d.partner.verified&&!(vr&&vr.status==="pending");
 upPlan="paid";
 const planCard=(key,title,price,points)=>'<label id="tcUpPlan_'+key+'" style="display:block;border:2px solid #ccc;border-radius:10px;padding:8px 10px;margin:6px 0;cursor:pointer"><input type="radio" name="tcUpPlan" value="'+key+'" onchange="tcUpPickPlan(\''+key+'\')" style="width:auto;margin-right:6px"><b>'+title+'</b> - Rs '+price+' / '+per+'<div class="muted" style="font-size:12px;margin-top:3px">'+points+'</div></label>';
 modal('<h2>&#11088; '+bl("Get Plus / Premium","Plus / Premium എടുക്കുക")+'</h2>'+
  '<p class="muted">'+(d.period==="month"?bl("Vehicle businesses pay monthly.","വാഹന ബിസിനസുകൾക്ക് മാസം തോറും."):bl("Shops, hotels and other businesses pay yearly.","കട, ഹോട്ടൽ തുടങ്ങിയ ബിസിനസുകൾക്ക് വർഷം തോറും."))+'</p>'+
  planCard("paid",'<span style="color:#1d9bf0">&#10003;</span> Plus',d.prices.paid,bl("Blue tick badge, your own business name & UPI QR on bills, tagline in the directory, listed above Free.","നീല ടിക്ക് ബാഡ്ജ്, ബില്ലിൽ സ്വന്തം ബിസിനസ് പേരും UPI QR-ഉം, ഡയറക്ടറിയിൽ ടാഗ്‌ലൈൻ, ഫ്രീയേക്കാൾ മുകളിൽ ലിസ്റ്റിങ്."))+
  planCard("premium",'<span style="color:#e0a100">&#9812;</span> Premium',d.prices.premium,bl("Everything in Plus + gold Premium badge, your logo, colours & fonts, top of the list, cloud backup.","Plus-ലെ എല്ലാം + സ്വർണ്ണ Premium ബാഡ്ജ്, സ്വന്തം ലോഗോ, നിറങ്ങൾ, ഫോണ്ടുകൾ, ലിസ്റ്റിൽ ഏറ്റവും മുകളിൽ, ക്ലൗഡ് ബാക്കപ്പ്."))+
  (payReady?
   '<div id="tcUpPay" style="margin-top:10px"></div>'+
   (needDocs?'<hr><p><b>'+bl("Your documents (first time only)","നിങ്ങളുടെ രേഖകൾ (ആദ്യതവണ മാത്രം)")+'</b></p>'+docFieldsHtml():"")+
   '<label>'+bl("After paying, enter the UPI reference / UTR number","പണമടച്ച ശേഷം UPI റഫറൻസ് / UTR നമ്പർ നൽകുക")+'<input id="tcUpUtr" inputmode="text" maxlength="30" placeholder="e.g. 4123 4567 8901"></label>'+
   '<div id="tcUpMsg" class="danger" style="font-size:12.5px"></div>'+
   '<div class="actions"><button class="primary" id="tcUpSubmitBtn" onclick="tcUpSubmitUpgrade()">'+bl("I have paid - send request","ഞാൻ പണമടച്ചു - അപേക്ഷ അയയ്ക്കുക")+'</button></div>'+
   '<p class="muted" style="font-size:12px">'+bl("The admin checks the payment and then switches your plan on.","അഡ്മിൻ പണം ലഭിച്ചെന്ന് പരിശോധിച്ച് നിങ്ങളുടെ പ്ലാൻ ആക്റ്റീവ് ആക്കും.")+'</p>'
  :'<p class="danger">'+bl("Payment is not set up yet. Please contact the admin.","പണമടയ്ക്കൽ ഇതുവരെ സജ്ജമാക്കിയിട്ടില്ല. അഡ്മിനെ ബന്ധപ്പെടുക.")+'</p>'));
 if(payReady) tcUpPickPlan("paid");
};
window.tcUpPickPlan=function(key){
 upPlan=key;
 ["paid","premium"].forEach(k=>{
  const el=document.querySelector("#tcUpPlan_"+k); if(!el) return;
  el.style.borderColor=(k===key)?"#0f5a55":"#ccc"; el.style.background=(k===key)?"#eef7f6":"";
  const r=el.querySelector("input"); if(r) r.checked=(k===key);
 });
 const d=upState, amt=d.prices[key];
 const note="Travel Connect "+(key==="premium"?"Premium":"Plus")+" "+d.partner.id;
 const link="upi://pay?pa="+encodeURIComponent(d.upi.id)+"&pn="+encodeURIComponent(d.upi.name||"Travel Connect")+"&am="+encodeURIComponent(amt)+"&cu=INR&tn="+encodeURIComponent(note);
 const pay=document.querySelector("#tcUpPay"); if(!pay) return;
 pay.innerHTML='<p><b>'+bl("Pay Rs ","പണമടയ്ക്കുക Rs ")+E(amt)+'</b> '+bl("to","ഇതിലേക്ക്")+' <b>'+E(d.upi.id)+'</b></p>'+
  '<div class="actions"><a href="'+E(link)+'"><button type="button" class="primary">&#128241; '+bl("Pay with UPI app","UPI ആപ്പ് വഴി അടയ്ക്കുക")+'</button></a></div>'+
  '<div id="tcUpQr" style="margin:8px 0;text-align:center"></div><div class="muted" style="font-size:11.5px;text-align:center">'+bl("Paying from another phone? Scan this QR.","മറ്റൊരു ഫോണിൽ നിന്നാണോ? ഈ QR സ്കാൻ ചെയ്യുക.")+'</div>';
 try{ if(typeof QRCode!=="undefined") new QRCode(document.querySelector("#tcUpQr"),{text:link,width:170,height:170}); }catch(e){}
};
window.tcUpSubmitUpgrade=async function(){
 const c=ownerCreds(); if(!c||!upState) return;
 const msg=document.querySelector("#tcUpMsg"), btn=document.querySelector("#tcUpSubmitBtn");
 const label=bl("I have paid - send request","ഞാൻ പണമടച്ചു - അപേക്ഷ അയയ്ക്കുക");
 msg.textContent="";
 const utr=(document.querySelector("#tcUpUtr").value||"").replace(/\s+/g,"");
 if(!/^[A-Za-z0-9]{8,30}$/.test(utr)){ msg.textContent=errText({error:"bad_utr"}); return; }
 btn.disabled=true; btn.textContent=bl("Sending...","അയയ്ക്കുന്നു...");
 const fd=baseForm(c); fd.set("plan",upPlan); fd.set("utr",utr);
 await appendDocs(fd);
 const d=await postForm("upgrade_request",fd);
 btn.disabled=false; btn.textContent=label;
 if(!d.ok){ msg.textContent=errText(d); return; }
 say(bl("Request sent - the admin will check the payment","അപേക്ഷ അയച്ചു - അഡ്മിൻ പണം പരിശോധിക്കും")); closeModal(); loadOwnerCard();
};

/* ======================================================================
   3) ADMIN SIDE
   ====================================================================== */
function bizLabel(r){ try{ return (typeof tcBizDisplayLabel==="function")?tcBizDisplayLabel(r.business_type,r.business_subtype):(r.business_type||""); }catch(e){ return r.business_type||""; } }
function adminHeader(r){
 return '<b>'+E(r.business_name)+'</b> <span class="muted">'+E(bizLabel(r))+'</span> '+(r.verified?'<span class="ok">Verified</span>':'<span class="muted">Not verified</span>')+'<br>'+
  '<span class="muted">'+E(r.owner_name)+' - '+E(r.mobile1)+'</span><br>'+
  '<span class="muted">&#9993; '+(r.email?E(r.email)+(r.email_verified?' <span class="ok">&#10003; verified</span>':" (not verified)"):"no email")+'</span>';
}
window.tcAdLoadRequests=async function(){
 const vbox=document.querySelector("#tcAdVr"), ubox=document.querySelector("#tcAdUr");
 if(!vbox&&!ubox) return;
 const d=await getJson("/api/upgrade?action=admin_list&token="+encodeURIComponent(adminToken()));
 if(!d.ok){ if(vbox) vbox.innerHTML="<p class='danger'>Could not load.</p>"; if(ubox) ubox.innerHTML="<p class='danger'>Could not load.</p>"; return; }
 if(vbox){
  vbox.innerHTML=d.verify_requests.length?d.verify_requests.map(r=>
   '<div class="listitem">'+adminHeader(r)+
   (r.note?'<div style="font-size:12.5px;margin-top:3px">&ldquo;'+E(r.note)+'&rdquo;</div>':"")+
   '<div class="actions" style="margin-top:6px;flex-wrap:wrap">'+
    (r.doc1_key?'<button onclick="tcAdViewDoc(\''+E(r.doc1_key)+'\')">ID / proof</button>':"")+
    (r.doc2_key?'<button onclick="tcAdViewDoc(\''+E(r.doc2_key)+'\')">Photo</button>':"")+
   '</div>'+
   '<div class="actions" style="margin-top:6px;flex-wrap:wrap"><button class="primary" onclick="tcAdVerifyDecision('+r.id+',\'approve\')">Approve - mark Verified</button><button onclick="tcAdVerifyDecision('+r.id+',\'reject\')">Reject</button><button class="danger" onclick="tcAdDeleteReq(\'verify\','+r.id+')">Delete</button></div></div>'
  ).join(""):"<p class='muted'>No verification requests waiting.</p>";
 }
 if(ubox){
  ubox.innerHTML=d.upgrade_requests.length?d.upgrade_requests.map(r=>
   '<div class="listitem">'+adminHeader(r)+'<br>'+
   '<b>'+(r.plan==="premium"?"Premium":"Plus")+'</b> &middot; Rs '+E(r.amount)+' / '+E(r.period)+' &middot; UTR <b>'+E(r.utr)+'</b>'+
   '<br><span class="muted">Current plan: '+E(r.current_plan||"free")+'</span>'+
   (!r.verified?'<div class="muted" style="font-size:12px">Not verified yet - see Verification requests above.</div>':"")+
   '<div class="actions" style="margin-top:6px;flex-wrap:wrap;align-items:center">'+
    '<input id="tcAdDays_'+r.id+'" type="number" min="1" value="'+(r.period==="month"?30:365)+'" style="width:70px"> days '+
    '<button class="primary" onclick="tcAdUpgradeDecision('+r.id+',\'approve\')">Payment received - Activate</button>'+
   '</div><div class="actions" style="margin-top:6px;flex-wrap:wrap"><button onclick="tcAdUpgradeDecision('+r.id+',\'reject\')">Reject</button><button onclick="tcAdEditUpgrade('+r.id+','+E(JSON.stringify(r.plan))+','+Number(r.amount)+','+E(JSON.stringify(r.utr))+')">Edit</button><button class="danger" onclick="tcAdDeleteReq(\'upgrade\','+r.id+')">Delete</button></div></div>'
  ).join(""):"<p class='muted'>No plan requests waiting.</p>";
 }
};
window.tcAdViewDoc=async function(key){
 try{
  const r=await fetch("/api/upgrade?action=file&token="+encodeURIComponent(adminToken())+"&key="+encodeURIComponent(key));
  if(!r.ok){ say("Could not open the photo."); return; }
  const url=URL.createObjectURL(await r.blob());
  modal('<img src="'+url+'" style="max-width:100%;border-radius:8px"><div class="actions"><button onclick="closeModal()">Close</button></div>');
 }catch(e){ say("Network error"); }
};
window.tcAdVerifyDecision=async function(id,decision){
 let note="";
 if(decision==="reject"){ const n=prompt("Reason (the owner will see this):",""); if(n===null) return; note=n; }
 else if(!confirm("Mark this business as Verified?")) return;
 const d=await postJson("admin_verify_decision",{token:adminToken(),id,decision,admin_note:note});
 say(d.ok?(decision==="approve"?"Business verified":"Request rejected"):"Could not save"); tcAdLoadRequests();
};
window.tcAdUpgradeDecision=async function(id,decision){
 let note="", days;
 if(decision==="reject"){ const n=prompt("Reason (the owner will see this):",""); if(n===null) return; note=n; }
 else{
  days=parseInt(document.querySelector("#tcAdDays_"+id).value,10)||0;
  if(!confirm("Payment received? Activate the plan for "+days+" days.")) return;
 }
 const d=await postJson("admin_upgrade_decision",{token:adminToken(),id,decision,admin_note:note,days});
 if(d.ok) say(decision==="approve"?"Plan activated":"Request rejected");
 else say(d.error==="owner_plan"?"This business has an Owner plan - not changed":"Could not save");
 tcAdLoadRequests();
};
window.tcAdDeleteReq=async function(kind,id){
 if(!confirm("Delete this request?"+(kind==="verify"?" Its photos are deleted too.":""))) return;
 const d=await postJson("admin_delete",{token:adminToken(),kind,id});
 say(d.ok?"Deleted":"Could not delete"); tcAdLoadRequests();
};
window.tcAdEditUpgrade=function(id,plan,amount,utr){
 modal('<h2>Edit plan request</h2><div class="grid">'+
  '<label>Plan<select id="tcAdEPlan"><option value="paid"'+(plan==="paid"?" selected":"")+'>Plus</option><option value="premium"'+(plan==="premium"?" selected":"")+'>Premium</option></select></label>'+
  '<label>Amount (Rs)<input id="tcAdEAmt" type="number" min="0" value="'+amount+'"></label>'+
  '<label>UTR<input id="tcAdEUtr" value="'+E(utr)+'"></label></div>'+
  '<div class="actions"><button class="primary" onclick="tcAdSaveUpgrade('+id+')">Save</button><button onclick="closeModal()">Cancel</button></div>');
};
window.tcAdSaveUpgrade=async function(id){
 const d=await postJson("admin_update_upgrade",{token:adminToken(),id,plan:document.querySelector("#tcAdEPlan").value,amount:document.querySelector("#tcAdEAmt").value,utr:document.querySelector("#tcAdEUtr").value.trim()});
 say(d.ok?"Saved":"Could not save - check the values"); if(d.ok){ closeModal(); tcAdLoadRequests(); }
};

/* ---- Pending Approvals page: add the two request lists ---- */
if(typeof window.tcRenderPendingApprovals==="function"){
 const orig=window.tcRenderPendingApprovals;
 window.tcRenderPendingApprovals=async function(){
  const r=await orig.apply(this,arguments);
  const pv=document.querySelector("#tcPendingVehicles");
  if(pv&&!document.querySelector("#tcAdVr")){
   pv.insertAdjacentHTML("afterend",'<hr><h3>Verification requests</h3><div id="tcAdVr">Loading...</div><hr><h3>Plan requests (Plus / Premium)</h3><div id="tcAdUr">Loading...</div>');
  }
  tcAdLoadRequests();
  return r;
 };
}

/* ---- Partner Plans page: prices & UPI ---- */
window.tcAdLoadPriceBox=async function(){
 const box=document.querySelector("#tcPriceBox"); if(!box) return;
 const d=await getJson("/api/upgrade?action=settings&token="+encodeURIComponent(adminToken()));
 if(!d.ok){ box.innerHTML="<p class='danger'>Could not load prices.</p>"; return; }
 const s=d.settings;
 box.innerHTML='<div class="card"><h3>Prices & UPI</h3>'+
  '<p class="muted" style="font-size:12.5px">What owners see when they press "Get Plus / Premium". Vehicles (Taxi, Auto, Pickup) pay per MONTH; every other business pays per YEAR.</p>'+
  '<div class="grid"><label>Vehicles: Plus (Rs / month)<input id="tcAdP1" type="number" min="0" value="'+E(s.price_plus_month)+'"></label>'+
  '<label>Vehicles: Premium (Rs / month)<input id="tcAdP2" type="number" min="0" value="'+E(s.price_premium_month)+'"></label>'+
  '<label>Shops, hotels, others: Plus (Rs / year)<input id="tcAdP3" type="number" min="0" value="'+E(s.price_plus_year)+'"></label>'+
  '<label>Shops, hotels, others: Premium (Rs / year)<input id="tcAdP4" type="number" min="0" value="'+E(s.price_premium_year)+'"></label>'+
  '<label>Your UPI ID (where owners pay)<input id="tcAdUpi" value="'+E(s.upi_id)+'" placeholder="name@bank"></label>'+
  '<label>Name shown in the UPI app<input id="tcAdUpiName" value="'+E(s.upi_name)+'"></label></div>'+
  '<div class="actions"><button class="primary" onclick="tcAdSavePrices()">Save prices</button></div>'+
  '<p class="muted" style="font-size:12px">Email service: '+(d.email_ready?'<span class="ok">connected</span>':'<span class="danger">not set up (RESEND_API_KEY missing) - email codes cannot be sent</span>')+'</p></div>';
};
window.tcAdSavePrices=async function(){
 const g=(i)=>document.querySelector(i).value.trim();
 const d=await postJson("save_settings",{token:adminToken(),settings:{price_plus_month:g("#tcAdP1"),price_premium_month:g("#tcAdP2"),price_plus_year:g("#tcAdP3"),price_premium_year:g("#tcAdP4"),upi_id:g("#tcAdUpi"),upi_name:g("#tcAdUpiName")}});
 say(d.ok?"Saved":(d.error==="bad_upi"?"UPI ID looks wrong (name@bank)":"Could not save - prices must be whole numbers"));
};
if(typeof window.tcRenderPartnerPlans==="function"){
 const orig=window.tcRenderPartnerPlans;
 window.tcRenderPartnerPlans=async function(){
  const r=await orig.apply(this,arguments);
  const list=document.querySelector("#tcPlansList");
  if(list&&!document.querySelector("#tcPriceBox")) list.insertAdjacentHTML("beforebegin",'<div id="tcPriceBox"></div>');
  tcAdLoadPriceBox();
  return r;
 };
}

/* ---- Admin "Edit Partner" form: email + verified switch ---- */
if(typeof window.tcOpenAdminEditPartner==="function"){
 const orig=window.tcOpenAdminEditPartner;
 window.tcOpenAdminEditPartner=function(id){
  const r=orig.apply(this,arguments);
  const p=(window._tcAllPartners||[]).find(x=>x.id===id);
  const body=document.querySelector("#modalBody"); if(!p||!body||body.querySelector("#aeEmail")) return r;
  const actions=body.querySelector(".actions"); if(!actions) return r;
  actions.insertAdjacentHTML("beforebegin",
   '<div class="grid" style="margin-top:6px"><label>Email<input id="aeEmail" value="'+E(p.email||"")+'"></label>'+
   '<label style="display:flex;gap:8px;align-items:center"><input id="aeEmailVer" type="checkbox" style="width:auto"'+(p.email_verified?" checked":"")+'> Email verified</label></div>'+
   '<div class="actions"><button onclick="tcAdSaveEmail('+id+')">Save email</button></div>');
  return r;
 };
}
window.tcAdSaveEmail=async function(id){
 const d=await postJson("admin_set_email",{token:adminToken(),partner_id:id,email:document.querySelector("#aeEmail").value.trim(),verified:document.querySelector("#aeEmailVer").checked?1:0});
 if(d.ok){
  const p=(window._tcAllPartners||[]).find(x=>x.id===id);
  if(p){ p.email=document.querySelector("#aeEmail").value.trim().toLowerCase()||null; p.email_verified=(p.email&&document.querySelector("#aeEmailVer").checked)?1:0; }
 }
 say(d.ok?"Email saved":(d.error==="bad_email"?"Email looks wrong":"Could not save"));
};

/* ======================================================================
   4) keep the owner card present on owner dashboards
   ====================================================================== */
(function(){
 let t=null;
 function chk(){ try{ injectOwnerCard(); }catch(e){} }
 function start(){
  const app=document.getElementById("app"); if(!app||!window.MutationObserver) return;
  new MutationObserver(()=>{ clearTimeout(t); t=setTimeout(chk,150); }).observe(app,{childList:true,subtree:true});
  chk();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();

})();
