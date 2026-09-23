/* ---------- CRITICAL FIX: NON-OWNER PARTNERS COULD SEE/EDIT THE MAIN BUSINESS DATA ----------
   The top nav bar (Dashboard/Enquiries/Quotations/Trips/Billing/Master
   Data/Accounts/Admin) is static HTML in index.html - it was ALWAYS
   visible to every logged-in user, and none of enquiries()/quotations()/
   trips()/billing()/master()/accounts() checked WHO was viewing them.
   This meant ANY registered partner (an auto rickshaw driver, a resort,
   etc.) - or a Customer - could open the taxi business owner's actual
   Quotations, Bills, and Rate Master, and even edit/create entries there,
   just by tapping the visible nav buttons. Only a verified Taxi/Travel
   Agency OWNER (role=owner AND business_type=taxi_travel) should ever see
   this nav bar or reach these pages - everyone else gets redirected to
   their own dashboard()/customerHome(), which correctly shows only what's
   theirs. */
function tcIsTaxiOwner(){
 const user=getCurrentUser();
 if(!user||user.role==="customer") return false;
 return db.settings.myBusinessType==="taxi_travel";
}

(function(){
 const origRender=render;
 render=function(){
  const tabs=document.querySelector(".tabs");
  if(tabs) tabs.style.display=tcIsTaxiOwner()?"":"none";
  origRender();
 };
})();

/* Defense in depth: even if someone reaches one of these hashes directly
   (not just via the now-hidden nav button), redirect to their own
   dashboard instead of showing the business owner's data. */
["enquiries","quotations","trips","billing","master","accounts"].forEach(fnName=>{
 const orig=window[fnName];
 if(typeof orig!=="function") return;
 window[fnName]=function(...args){
  if(!tcIsTaxiOwner()){ dashboard(); return; }
  return orig.apply(this,args);
 };
});

render();
