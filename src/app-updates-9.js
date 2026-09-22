/* ---------- MAKE EMERGENCY CONTACTS / USEFUL PLACES COLLAPSIBLE ----------
   Both lists grow as more entries are added, pushing the actual business
   details/dashboard content further down the page. This retrofits the
   EXISTING boxes (already inserted by earlier wraps, found by their known
   IDs) into a tap-to-expand toggle - collapsed by default - instead of
   inserting new duplicate boxes. */
function tcMakeBoxCollapsible(boxId){
 const box=document.querySelector("#"+boxId);
 if(!box||box.dataset.tcCollapsible) return;
 box.dataset.tcCollapsible="1";
 const children=Array.from(box.children);
 if(children.length<2) return;
 const header=children[0], list=children[1];
 header.style.cursor="pointer";
 header.style.display="flex";
 header.style.justifyContent="space-between";
 header.style.alignItems="center";
 const arrow=document.createElement("span");
 arrow.innerHTML="&#9656;";
 header.appendChild(arrow);
 list.style.display="none";
 header.addEventListener("click",function(){
  const hidden=list.style.display==="none";
  list.style.display=hidden?"":"none";
  arrow.innerHTML=hidden?"&#9662;":"&#9656;";
 });
}

/* Wraps customerHome()/dashboard()/renderPartnerDashboard() again - after
   every earlier wrap has already inserted the Emergency Contacts / Useful
   Places boxes - to retrofit whichever of those boxes exist on each page. */
(function(){
 const orig=customerHome;
 customerHome=function(){
  orig();
  tcMakeBoxCollapsible("custEmergencyBox");
  tcMakeBoxCollapsible("custPlacesBox");
 };
})();
(function(){
 const orig=dashboard;
 dashboard=function(){
  orig();
  tcMakeBoxCollapsible("ownerEmergencyBox");
  tcMakeBoxCollapsible("ownerPlacesBox");
 };
})();
(function(){
 const orig=renderPartnerDashboard;
 renderPartnerDashboard=function(p){
  orig(p);
  tcMakeBoxCollapsible("ownerEmergencyBox");
  tcMakeBoxCollapsible("ownerPlacesBox");
 };
})();

render();
