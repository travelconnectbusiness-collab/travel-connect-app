/* Menu clean-up (tc-menu.js, loaded by tc-regdocs.js just before tc-nav.js).
   Reason (owner, 2026-10-24): every owner and every shop saw the admin entries of the Menu (Authorized Users, All Users,
   Pending Approvals, Partner Plans ...). They are password protected, but nobody except the app owner needs to see them.
   Now they are shown only when the logged-in user is the app owner (tc_user.isAppOwner, set by the server at login - the same
   flag that already shows "Security: device check"). Everyone else keeps: Rate Master, Accounts, Reload App, Log out,
   Share / Privacy / Terms and their own entries. The pages themselves still ask the admin password and the server still
   checks it - this only hides the doors. Nothing is stored. core.js is not changed: the entries are removed from the open Menu. */
(function(){
 if(window.__tcMenuClean) return;
 window.__tcMenuClean=1;
 var ADMIN=["tcAuthorizedUsersPage","tcOpenFeedbackAdmin","tcOpenPartnerPlans","tcOpenAllPartnersAdmin","tcOpenAllUsersAdmin","tcOpenAllVehiclesAdmin","tcOpenPendingApprovals","tcOpenEmergencyAdmin","tcOpenPlacesAdmin","tcPreviewPartnerPage","tcPreviewCustomerPage"];
 var om=window.tcOpenMenu;
 if(typeof om!=="function") return;
 window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var u=JSON.parse(localStorage.getItem("tc_user")||"null");
   if(u&&u.isAppOwner) return r;
   var body=document.getElementById("modalBody"); if(!body) return r;
   var items=body.querySelectorAll("[onclick]");
   for(var i=0;i<items.length;i++){
    var oc=items[i].getAttribute("onclick")||"";
    for(var k=0;k<ADMIN.length;k++){
     if(oc.indexOf(ADMIN[k]+"(")>=0){ if(items[i].parentNode) items[i].parentNode.removeChild(items[i]); break; }
    }
   }
  }catch(e){}
  return r;
 };
})();
