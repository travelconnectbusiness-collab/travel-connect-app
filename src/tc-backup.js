/* ---------- CLOUD BACKUP (Premium) - phone side ----------
   Menu > "Cloud Backup": shows the date of the last backup, a Backup Now
   button and a Restore button. For Premium accounts a backup is also made
   automatically about 25 seconds after the last change (never more often
   than every 90 seconds, and never if nothing changed).
   Restore MERGES: records that are missing on this phone are added, nothing
   already here is removed or overwritten. Business details and rates are
   replaced only if the person agrees in a second question.
   Server side: functions/api/backup.js (R2, one latest + one previous). */
const TC_BK_LISTS=["vehicles","drivers","customers","enquiries","quotes","trips","bills","expenses"];
let tcBkTimer=null, tcBkBusy=false, tcBkLastRun=0, tcBkWarned=false;

function tcBkMl(){ return (typeof tcLang==="function"&&tcLang()==="ml"); }
function tcBkTxt(en,ml){ return tcBkMl()?ml:en; }

function tcBkEligible(){
 try{
  const u=getCurrentUser();
  if(!u||!u.mobile) return false;
  const p=db.settings&&db.settings.myPlan;
  if(p==="owner_free") return true;
  if(p!=="premium") return false;
  if(!db.settings.myPlanExpiresAt) return true;
  return new Date(db.settings.myPlanExpiresAt).getTime()>Date.now();
 }catch(e){ return false; }
}
function tcBkPayload(){
 const d={};
 TC_BK_LISTS.forEach(k=>{ d[k]=db[k]||[]; });
 d.categories=db.categories||[];
 d.business=db.business||{};
 d.billingByPartner=db.billingByPartner||{};
 return d;
}
function tcBkTotal(d){
 return TC_BK_LISTS.reduce((n,k)=>n+(Array.isArray(d[k])?d[k].length:0),0);
}
async function tcBkCall(action,extra){
 const u=getCurrentUser();
 const res=await fetch("/api/backup?action="+action,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body:JSON.stringify(Object.assign({mobile:u.mobile,device:getDeviceToken()},extra||{}))
 });
 let j=null; try{ j=await res.json(); }catch(e){}
 return j||{ok:false,error:"network"};
}
function tcBkFmt(iso){
 try{
  const d=new Date(iso);
  return tcFormatDate(iso)+" "+d.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit",hour12:true});
 }catch(e){ return iso||""; }
}
function tcBkHash(s){
 let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return String(h)+":"+s.length;
}

/* Run a backup. manual=true: shows messages, and may overwrite a bigger
   server copy only after the person confirms. */
async function tcBackupNow(manual){
 if(tcBkBusy) return;
 if(!tcBkEligible()){ if(manual) toast(tcBkTxt("Cloud backup is a Premium feature","ക്ലൗഡ് ബാക്കപ്പ് Premium സൗകര്യമാണ്")); return; }
 if(!navigator.onLine){ if(manual) toast(tcBkTxt("No internet","ഇന്റർനെറ്റ് ഇല്ല")); return; }
 tcBkBusy=true;
 try{
  const data=tcBkPayload();
  const hash=tcBkHash(JSON.stringify(data));
  if(!manual&&localStorage.getItem("tc_bk_hash")===hash) return;
  let r=await tcBkCall("put",{data});
  if(!r.ok&&r.error==="would_shrink"){
   if(!manual){
    if(!tcBkWarned){ tcBkWarned=true; toast(tcBkTxt("Backup on server has more records than this phone - open Menu > Cloud Backup","സർവറിലെ ബാക്കപ്പിൽ ഈ ഫോണിനേക്കാൾ കൂടുതൽ റെക്കോർഡുകൾ ഉണ്ട് - Menu > Cloud Backup നോക്കുക")); }
    return;
   }
   const ok=confirm(tcBkTxt(
    "The saved backup has "+r.server_total+" records but this phone has only "+r.local_total+". Replace the saved backup with this phone's data? (The previous one is kept once.) Choose Cancel and use Restore instead if you want to bring the saved data here.",
    "സേവ് ചെയ്ത ബാക്കപ്പിൽ "+r.server_total+" റെക്കോർഡുകൾ ഉണ്ട്, ഈ ഫോണിൽ "+r.local_total+" മാത്രം. ബാക്കപ്പ് ഈ ഫോണിലെ ഡാറ്റ കൊണ്ട് മാറ്റണോ? (പഴയത് ഒരു തവണ സൂക്ഷിക്കും.) സേവ് ചെയ്തത് ഇവിടേക്ക് കൊണ്ടുവരണമെങ്കിൽ Cancel അമർത്തി Restore ഉപയോഗിക്കുക."));
   if(!ok) return;
   r=await tcBkCall("put",{data,force:true});
  }
  if(r.ok){
   localStorage.setItem("tc_bk_hash",hash);
   localStorage.setItem("tc_bk_last",r.savedAt||new Date().toISOString());
   tcBkWarned=false;
   if(manual) toast(tcBkTxt("Backup saved","ബാക്കപ്പ് സേവ് ചെയ്തു"));
  }else if(manual){
   toast(r.error==="not_premium"?tcBkTxt("Not a Premium account","Premium അക്കൗണ്ട് അല്ല"):r.error==="too_big"?tcBkTxt("Data is too big to back up","ഡാറ്റ ബാക്കപ്പ് ചെയ്യാൻ കഴിയാത്തത്ര വലുതാണ്"):tcBkTxt("Backup failed - try again","ബാക്കപ്പ് പരാജയപ്പെട്ടു - വീണ്ടും ശ്രമിക്കുക"));
  }
 }catch(e){
  if(manual) toast(tcBkTxt("Backup failed - try again","ബാക്കപ്പ് പരാജയപ്പെട്ടു - വീണ്ടും ശ്രമിക്കുക"));
 }finally{
  tcBkBusy=false; tcBkLastRun=Date.now();
 }
}

/* Restore = merge by record id (nothing here is deleted or overwritten). */
async function tcRestoreBackup(){
 if(!tcBkEligible()) return;
 if(!navigator.onLine){ toast(tcBkTxt("No internet","ഇന്റർനെറ്റ് ഇല്ല")); return; }
 toast(tcBkTxt("Checking saved backup...","സേവ് ചെയ്ത ബാക്കപ്പ് നോക്കുന്നു..."));
 const r=await tcBkCall("get");
 if(!r.ok||!r.exists){ toast(r.ok?tcBkTxt("No backup saved yet","ബാക്കപ്പ് ഒന്നും സേവ് ചെയ്തിട്ടില്ല"):tcBkTxt("Could not read backup","ബാക്കപ്പ് വായിക്കാൻ കഴിഞ്ഞില്ല")); return; }
 const b=r.data||{};
 let add=0;
 const plan={};
 TC_BK_LISTS.forEach(k=>{
  const have=new Set((db[k]||[]).map(x=>x&&x.id));
  plan[k]=(Array.isArray(b[k])?b[k]:[]).filter(x=>x&&x.id&&!have.has(x.id));
  add+=plan[k].length;
 });
 if(!add){
  toast(tcBkTxt("Nothing new to restore - this phone already has everything in the backup","പുതിയതായി ഒന്നും ഇല്ല - ബാക്കപ്പിലുള്ളതെല്ലാം ഈ ഫോണിൽ ഉണ്ട്"));
 }else{
  if(!confirm(tcBkTxt(
   "Backup of "+tcBkFmt(r.savedAt)+" has "+add+" records not on this phone. Add them now? Nothing on this phone will be removed.",
   tcBkFmt(r.savedAt)+" ലെ ബാക്കപ്പിൽ ഈ ഫോണിൽ ഇല്ലാത്ത "+add+" റെക്കോർഡുകൾ ഉണ്ട്. ചേർക്കട്ടേ? ഈ ഫോണിലെ ഒന്നും നീക്കം ചെയ്യില്ല."))) return;
  TC_BK_LISTS.forEach(k=>{ if(plan[k].length) db[k]=(db[k]||[]).concat(plan[k]); });
 }
 if(b.business&&Object.keys(b.business).length&&confirm(tcBkTxt(
  "Also bring back your business details and rates from the backup? This REPLACES the business details and rates on this phone.",
  "ബാക്കപ്പിലെ ബിസിനസ് വിവരങ്ങളും റേറ്റുകളും കൂടി തിരികെ കൊണ്ടുവരണോ? ഇത് ഈ ഫോണിലെ ബിസിനസ് വിവരങ്ങളും റേറ്റുകളും മാറ്റും."))){
  db.business=Object.assign({},db.business,b.business);
  if(Array.isArray(b.categories)&&b.categories.length) db.categories=b.categories;
  if(b.billingByPartner) db.billingByPartner=Object.assign({},db.billingByPartner||{},b.billingByPartner);
 }
 save();
 localStorage.removeItem("tc_bk_hash");
 toast(tcBkTxt("Restored - reloading","തിരികെ ചേർത്തു - റീലോഡ് ചെയ്യുന്നു"));
 setTimeout(()=>location.reload(),900);
}

async function tcOpenBackupPage(){
 const elig=tcBkEligible();
 const mine=tcBkTotal(tcBkPayload());
 modal(`
  <h3 style="margin:0 0 6px">${tcBkTxt("Cloud Backup","ക്ലൗഡ് ബാക്കപ്പ്")}</h3>
  <p class="muted" style="font-size:13px;margin:0 0 10px">${tcBkTxt(
   "Keeps a safe copy of your bills, quotations, trips, customers and expenses on the server, so they are not lost if the app is uninstalled or you use another web address.",
   "നിങ്ങളുടെ ബില്ലുകൾ, കൊട്ടേഷനുകൾ, ട്രിപ്പുകൾ, കസ്റ്റമർമാർ, ചെലവുകൾ എന്നിവയുടെ സുരക്ഷിത പകർപ്പ് സർവറിൽ സൂക്ഷിക്കുന്നു. ആപ്പ് അൺഇൻസ്റ്റാൾ ചെയ്താലും മറ്റൊരു വിലാസത്തിൽ ഉപയോഗിച്ചാലും നഷ്ടപ്പെടില്ല.")}</p>
  ${elig?`<div id="tcBkStatus" class="muted" style="font-size:13px;margin-bottom:10px">${tcBkTxt("Checking...","നോക്കുന്നു...")}</div>
  <div class="muted" style="font-size:12.5px;margin-bottom:10px">${tcBkTxt("Records on this phone: ","ഈ ഫോണിലെ റെക്കോർഡുകൾ: ")}<b>${mine}</b></div>
  <button class="primary" onclick="tcBackupNow(true).then(tcBkRefreshStatus)" style="width:100%;margin-bottom:8px">${tcBkTxt("Backup Now","ഇപ്പോൾ ബാക്കപ്പ് എടുക്കുക")}</button>
  <button onclick="tcRestoreBackup()" style="width:100%;margin-bottom:8px">${tcBkTxt("Restore from backup","ബാക്കപ്പിൽ നിന്ന് തിരികെ ചേർക്കുക")}</button>
  <p class="muted" style="font-size:11.5px">${tcBkTxt("Automatic backup runs shortly after you make changes.","മാറ്റങ്ങൾ വരുത്തിയ ശേഷം ബാക്കപ്പ് സ്വയം എടുക്കും.")}</p>`
  :`<p style="color:#a12d2d;font-size:13.5px">${tcBkTxt("Cloud backup is available on the Premium plan.","ക്ലൗഡ് ബാക്കപ്പ് Premium പ്ലാനിൽ ലഭ്യമാണ്.")}</p>`}
  <button onclick="closeModal()" style="width:100%;margin-top:6px">${tcBkTxt("Close","അടയ്ക്കുക")}</button>
 `);
 if(elig) tcBkRefreshStatus();
}
async function tcBkRefreshStatus(){
 const el=document.querySelector("#tcBkStatus");
 if(!el) return;
 const r=await tcBkCall("info");
 if(!document.querySelector("#tcBkStatus")) return;
 if(!r.ok){ el.textContent=tcBkTxt("Could not check the saved backup","സേവ് ചെയ്ത ബാക്കപ്പ് പരിശോധിക്കാൻ കഴിഞ്ഞില്ല"); return; }
 el.innerHTML=r.exists
  ?tcBkTxt("Last backup: ","അവസാന ബാക്കപ്പ്: ")+"<b>"+esc(tcBkFmt(r.savedAt))+"</b> ("+r.total+" "+tcBkTxt("records","റെക്കോർഡുകൾ")+")"
  :tcBkTxt("No backup saved yet","ബാക്കപ്പ് ഒന്നും സേവ് ചെയ്തിട്ടില്ല");
}

/* Automatic backup: every save() schedules one, 25 s after the last change. */
function tcBkSchedule(){
 if(!tcBkEligible()) return;
 clearTimeout(tcBkTimer);
 const wait=Math.max(25000,90000-(Date.now()-tcBkLastRun));
 tcBkTimer=setTimeout(()=>tcBackupNow(false),wait);
}
(function(){
 if(typeof save!=="function") return;
 const origSave=save;
 save=function(){ const r=origSave.apply(this,arguments); try{ tcBkSchedule(); }catch(e){} return r; };
})();
