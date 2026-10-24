/* Menu clean-up (tc-menu.js, loaded by tc-regdocs.js just before tc-nav.js).
   Owner's wish 2026-10-24: the Menu must show only what the OPEN business needs, and everything for the app owner's admin work
   must sit behind ONE "Admin" entry that asks the admin password and then opens a page with all the admin items.
   1) ADMIN HUB. The 12 admin entries core.js puts in the Menu (Admin = platform settings, Authorized Users, Feedback, Partner Plans,
      All Partners, All Users, All Vehicles, Pending Approvals, Emergency Contacts, Useful Places, Preview Partner / Customer page) and
      "Security: device check" (tc-devhdr.js) are taken out of the open Menu. For the APP OWNER (tc_user.isAppOwner, set by the server at
      login) the Menu gets one "Admin" entry instead: tcAdminHub() = requireAdmin(...) then a pop-up list with those same entries, grouped.
      Everyone else sees no Admin entry at all. The pages themselves still ask the password and the server still checks it.
      The hub re-uses the Menu's own entries (icons, Malayalam / English labels, onclick) - copied from the open Menu each time.
   2) TAXI ENTRIES. While the open business is NOT Taxi / Travel (db.settings.myBusinessType, set by core when a business is opened),
      Rate Master, Trip & Accounts, Cloud Backup and Backup file are not shown (they belong to the taxi books of this phone).
      Unknown type (nothing opened yet) = nothing is hidden.
   window.__tcBizOnScreen() = type of the open business ("shop", "taxi_travel" ...) or "" (used by tc-shopui.js).
   core.js is not changed: entries are moved / removed in the open Menu. Nothing is stored. */
(function(){
 if(window.__tcMenuClean) return;
 window.__tcMenuClean=1;
 var GROUPS=[
  ["People & businesses","ആളുകളും ബിസിനസുകളും",["tcOpenPendingApprovals(","tcOpenAllUsersAdmin(","tcOpenAllPartnersAdmin(","tcOpenAllVehiclesAdmin(","tcOpenPartnerPlans(","tcAuthorizedUsersPage("]],
  ["Content & feedback","ഉള്ളടക്കവും അഭിപ്രായങ്ങളും",["tcOpenEmergencyAdmin(","tcOpenPlacesAdmin(","tcOpenFeedbackAdmin("]],
  ["Platform","പ്ലാറ്റ്ഫോം",["view('admin')","tcDevSecOpen"]],
  ["Preview pages","പ്രിവ്യൂ പേജുകൾ",["tcPreviewPartnerPage(","tcPreviewCustomerPage("]]
 ];
 var TAXI=["view('master')","view('accounts')","tcOpenBackupPage(","tcFbOpenPage("];
 var kept=[];          /* admin entries copied from the last open Menu: [{oc,html}] */
 function B(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } }
 function biz(){
  try{ var t=(typeof db!=="undefined"&&db&&db.settings)?db.settings.myBusinessType:""; return (t&&t!=="none")?String(t):""; }catch(e){ return ""; }
 }
 window.__tcBizOnScreen=biz;
 function isAdminOc(oc){ for(var g=0;g<GROUPS.length;g++) for(var k=0;k<GROUPS[g][2].length;k++) if(oc.indexOf(GROUPS[g][2][k])>=0) return true; return false; }
 function hasTaxi(oc){ for(var k=0;k<TAXI.length;k++) if(oc.indexOf(TAXI[k])>=0) return true; return false; }
 function entryEl(el){   /* the row itself: some modules wrap their row in a div (id="tc...Menu") */
  var p=el.parentNode; return (p&&p.id&&/^tc[A-Za-z]+Menu$/.test(p.id))?p:el;
 }
 function sorted(){
  var out=[];
  GROUPS.forEach(function(g){
   var rows=[]; g[2].forEach(function(pat){ kept.forEach(function(e){ if(e.oc.indexOf(pat)>=0&&rows.indexOf(e)<0) rows.push(e); }); });
   if(rows.length) out.push({title:B(g[0],g[1]),rows:rows});
  });
  return out;
 }
 window.tcAdminHub=function(){
  var open=function(){
   var h='<div style="text-align:center;margin-bottom:6px"><div style="font-weight:800;letter-spacing:1.5px;color:#082b49;font-size:13px">'+B("ADMIN","അഡ്മിൻ")+'</div>'+
    '<div style="color:#6a7a87;font-size:11.5px">'+B("Only for the app owner","ആപ്പ് ഉടമയ്ക്ക് മാത്രം")+'</div></div><div style="margin-top:4px">';
   sorted().forEach(function(g){
    h+='<div style="margin:12px 2px 0;font-size:11.5px;font-weight:800;letter-spacing:.8px;color:#0b6b78;text-transform:uppercase">'+g.title+'</div>';
    g.rows.forEach(function(e){ h+=e.html.replace(/onclick="closeModal\(\);/,'onclick="window.__tcFromHub=1;closeModal();'); });
   });
   h+='<div style="cursor:pointer;padding:14px 2px;color:#0b6b78;font-weight:700;font-size:14px" onclick="closeModal();tcOpenMenu()">&#8592; '+B("Back to Menu","മെനുവിലേക്ക് മടങ്ങുക")+'</div></div>';
   if(typeof modal==="function") modal(h);
  };
  if(typeof requireAdmin==="function") requireAdmin(open); else open();
 };
 /* Back from a page opened out of the hub: core reopens the Menu (popstate -> tcOpenMenu). Take the person back to the hub instead
    (no new password: the admin token of this session is still valid). window.__tcFromHub is set by the hub's rows and is
    cleared by every opening of the Menu and by a tap on the header Menu button, so it only ever acts on that one Back. */
 window.__tcFromHub=0;
 document.addEventListener("click",function(e){ try{ if(e.target&&e.target.closest&&e.target.closest("#tcMenuBtn")) window.__tcFromHub=0; }catch(x){} },true);
 var om=window.tcOpenMenu;
 if(typeof om!=="function") return;
 window.tcOpenMenu=function(){
  var fromHub=window.__tcFromHub; window.__tcFromHub=0;
  if(fromHub&&typeof adminToken==="function"&&adminToken()){ try{ var u0=JSON.parse(localStorage.getItem("tc_user")||"null"); if(u0&&u0.isAppOwner){ window.tcAdminHub(); return; } }catch(e){} }
  var r=om.apply(this,arguments);
  try{
   var u=JSON.parse(localStorage.getItem("tc_user")||"null"), owner=!!(u&&u.isAppOwner);
   var b=biz(), hideTaxi=!!b&&b!=="taxi_travel";
   var body=document.getElementById("modalBody"); if(!body) return r;
   var items=body.querySelectorAll("[onclick]"), first=null;
   kept=[];
   for(var i=0;i<items.length;i++){
    var oc=items[i].getAttribute("onclick")||"";
    if(isAdminOc(oc)){
     var row=entryEl(items[i]);
     if(!first&&row.parentNode){ first=document.createElement("span"); first.id="tcAdminMark"; row.parentNode.insertBefore(first,row); }
     if(owner&&kept.every(function(e){ return e.oc!==oc; })){
      var copy=row.cloneNode(true);
      if(oc.indexOf("view('admin')")>=0){ var lab=copy.querySelector("div:last-child"); if(lab) lab.textContent=B("Platform settings & limits","പ്ലാറ്റ്ഫോം സെറ്റിംഗ്സ്, പരിധികൾ"); }
      kept.push({oc:oc,html:copy.outerHTML});
     }
     if(row.parentNode) row.parentNode.removeChild(row);
    }else if(hideTaxi&&hasTaxi(oc)){
     if(items[i].parentNode) items[i].parentNode.removeChild(items[i]);
    }
   }
   if(owner&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcAdminMenu";
    wrap.innerHTML=tcMenuItem('<line x1="4" y1="6" x2="20" y2="6"></line><circle cx="8" cy="6" r="2" fill="#0b6b78" stroke="none"></circle><line x1="4" y1="12" x2="20" y2="12"></line><circle cx="16" cy="12" r="2" fill="#0b6b78" stroke="none"></circle><line x1="4" y1="18" x2="20" y2="18"></line><circle cx="10" cy="18" r="2" fill="#0b6b78" stroke="none"></circle>',
     (typeof tcT==="function"?tcT("menu_admin"):"Admin")+" &#128274;","tcAdminHub()");
    var at=first&&first.parentNode?first:body.querySelector('[onclick*="tcApplyUpdate"]');
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
   if(first&&first.parentNode) first.parentNode.removeChild(first);
  }catch(e){ if(window.console) console.error("tc-menu",e); }
  return r;
 };

 /* FIRST-OPEN BUG (owner's video 2026-10-24): core.js binds the header Menu button with  .onclick=tcOpenMenu  when the header is drawn,
    which can happen BEFORE this file (and tc-shopui.js, tc-acctsec.js ...) wrapped tcOpenMenu - so the very first tap opened core's
    ORIGINAL Menu (old list, no Shop row) and only a later opening (after Back, or any tap that called tcOpenMenu by name) showed the new one.
    Fix: the button always calls whatever window.tcOpenMenu is at click time. Re-checked whenever the page changes (the header is redrawn). */
 function bindBtn(){
  var b=document.getElementById("tcMenuBtn");
  if(b&&!b.__tcDyn){ b.__tcDyn=1; b.onclick=function(){ return window.tcOpenMenu.apply(window,arguments); }; }
 }
 var bt=null;
 function laterBind(){ clearTimeout(bt); bt=setTimeout(bindBtn,30); }
 bindBtn();
 try{ if(window.MutationObserver) new MutationObserver(laterBind).observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}
 window.addEventListener("load",function(){ bindBtn(); setTimeout(bindBtn,600); });
})();
