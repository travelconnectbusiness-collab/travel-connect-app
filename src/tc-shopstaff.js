/* Shop book - STAFF phones (tc-shopstaff.js, loaded by tc-regdocs.js after tc-shopplan.js).
   OWNER: Home > "Staff phones": add a staff member (name + what he may do) and give him the 6-digit join code (valid 24 hours, one use).
          Sales only / Sales + purchases. The owner sees every entry with the staff name; staff never see profit, purchase cost or other money records and can not cancel or edit.
   STAFF: Menu > "Shop staff login": the shop's mobile number + the code. The phone is then tied to that staff member (one phone each).
   Everything is decided by the SERVER (functions/api/shop.js: staff_list / staff_save / staff_remove / staff_login); this file is only the screens.
   The staff's own login to the app is his own (his own mobile) - the join code does not give him the owner's account. */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi;
 if(!SH||!UI||window.__tcShopStaff) return;
 window.__tcShopStaff=1;
 var T=UI.T, E=UI.E, say=UI.say, $=function(id){ return document.getElementById(id); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var V={list:null,limit:2,err:""};

 function post(action,body){
  return fetch("/api/shop?action="+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body||{})}).then(function(r){
   return r.json().catch(function(){ return {ok:false,error:"http_"+r.status}; }).then(function(j){ if(!j.ok&&!j.error) j.error="http_"+r.status; return j; });
  });
 }
 var ERR={staff_limit:["സ്റ്റാഫിന്റെ എണ്ണം പരിധിയിലെത്തി (പ്ലാൻ അപ്ഗ്രേഡ് ചെയ്യുക)","Staff limit of your plan reached"],
  lock_on:["പാസ്‌വേഡ് ലോക്ക് ഓണാണ് - സ്റ്റാഫിനെ ചേർക്കാൻ അത് ഓഫ് ചെയ്യുക (സെറ്റിങ്സ്)","The password lock is ON - switch it off (Settings) to add staff"],
  staff_exist:["സ്റ്റാഫ് ഉള്ളപ്പോൾ പാസ്‌വേഡ് ലോക്ക് ഇടാൻ പറ്റില്ല","The password lock can not be used while staff exist"],
  bad_code:["കോഡ് തെറ്റാണ് അല്ലെങ്കിൽ കാലാവധി കഴിഞ്ഞു","Wrong or expired code"],slow_down:["കുറച്ച് കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക","Too many tries - wait a few minutes"],
  device_unverified:["ആദ്യം ആപ്പിൽ ലോഗിൻ ചെയ്യുക","Log in to the app first"],bad_request:["പേര് നൽകുക","Enter the name"]};
 function errTxt(j){ var e=ERR[j&&j.error]; return e?T(e[0],e[1]):T("ഇപ്പോൾ പറ്റിയില്ല","Could not do it now")+(j&&j.error?" ("+j.error+")":""); }
 function roleTxt(r){ return r==="stock"?T("വിൽപ്പന + വാങ്ങൽ","Sales + purchases"):T("വിൽപ്പന മാത്രം","Sales only"); }

 /* ---------------- owner: the Staff screen ---------------- */
 function load(){
  post("staff_list").then(function(j){
   if(j.ok){ V.list=j.staff||[]; V.limit=j.limit||2; V.err=""; } else { V.err=errTxt(j); if(!V.list) V.list=[]; }
   if(UI.screenName()==="staff") UI.render();
  }).catch(function(){ V.err=T("കണക്ഷൻ ഇല്ല","No connection"); if(!V.list) V.list=[]; if(UI.screenName()==="staff") UI.render(); });
 }
 UI.screen("staff",function(){
  if(V.list===null){ UI.body().innerHTML='<div class="tsC tsM" style="text-align:center">…</div>'; load(); return; }
  var act=V.list.filter(function(s){ return s.active; }).length;
  UI.body().innerHTML=
   '<div class="tsC"><div class="tsM" style="line-height:1.5">'+E(T("ജോലിക്കാർക്ക് സ്വന്തം ഫോണിൽ വിൽപ്പനയും വാങ്ങലും ചേർക്കാം. ലാഭം, വാങ്ങൽ വില, ചെലവ് എന്നിവ അവർ കാണില്ല; റദ്ദാക്കാനും കഴിയില്ല. നിങ്ങൾക്ക് എല്ലാം ഓരോരുത്തരുടെ പേരിൽ കാണാം.","Staff add sales and purchases on their own phone. They never see profit, purchase cost or expenses and can not cancel. You see every entry with the staff name."))+'</div>'+
   '<div class="tsM" style="margin-top:6px">'+act+' / '+V.limit+' '+E(T("സ്റ്റാഫ്","staff"))+'</div>'+(V.err?'<div class="tsM" style="color:#a12d2d">'+E(V.err)+'</div>':'')+
   '<button class="tsBtn" onclick="tcStaffAdd()">➕ '+E(T("സ്റ്റാഫിനെ ചേർക്കുക","Add staff"))+'</button></div>'+
   (V.list.length?'<div class="tsC">'+V.list.map(function(s){
     var st=!s.active?T("നിർത്തി","Stopped"):s.bound?T("ജോയിൻ ചെയ്തു ✔","Joined ✔"):s.pending?T("കോഡ് കാത്തിരിക്കുന്നു","Waiting for the code"):T("കോഡ് കഴിഞ്ഞു","Code expired");
     return '<div class="tsRow" style="align-items:flex-start"><div><b style="font-size:18px">'+E(s.name)+'</b><div class="tsM">'+E(roleTxt(s.role))+' · '+E(st)+'</div></div><div style="text-align:right">'+
      '<button class="tsBtn g s" onclick="tcStaffCode(\''+s.sid+'\')">'+E(T("പുതിയ കോഡ്","New code"))+'</button>'+
      '<button class="tsBtn g s" onclick="tcStaffToggle(\''+s.sid+'\')">'+E(s.active?T("നിർത്തുക","Stop"):T("തുടങ്ങുക","Start"))+'</button>'+
      '<button class="tsBtn r s" onclick="tcStaffDel(\''+s.sid+'\')">'+E(T("ഒഴിവാക്കുക","Remove"))+'</button></div></div>'; }).join("")+'</div>':'');
 },function(){ return "🧑 "+T("സ്റ്റാഫ് ഫോണുകൾ","Staff phones"); });
 function find(sid){ var r=null; (V.list||[]).forEach(function(s){ if(s.sid===sid) r=s; }); return r; }
 var ADD={role:"sale"};
 window.tcStaffAdd=function(){
  ADD.role="sale";
  UI.sheet('<h3 style="margin:0">➕ '+E(T("സ്റ്റാഫിനെ ചേർക്കുക","Add staff"))+'</h3><label>'+E(T("പേര്","Name"))+'</label><input id="sfN" maxlength="40" placeholder="'+E(T("ഉദാ: സീത","e.g. Sita"))+'">'+
   '<label>'+E(T("എന്ത് ചെയ്യാം?","What may he do?"))+'</label><div id="sfR"></div>'+
   '<button class="tsBtn" onclick="tcStaffSave()">'+E(T("കോഡ് ഉണ്ടാക്കുക","Make the code"))+'</button><button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
  roleChips();
 };
 function roleChips(){ var b=$("sfR"); if(!b) return; b.innerHTML=["sale","stock"].map(function(r){ return '<span class="tsChip'+(ADD.role===r?" on":"")+'" onclick="tcStaffRole(\''+r+'\')">'+E(roleTxt(r))+'</span>'; }).join(""); }
 window.tcStaffRole=function(r){ ADD.role=r; roleChips(); };
 window.tcStaffSave=function(){
  var n=($("sfN")&&$("sfN").value||"").replace(/\s+/g," ").trim();
  if(!n){ say(T("പേര് നൽകുക","Enter the name")); return; }
  post("staff_save",{name:n,role:ADD.role}).then(function(j){ if(!j.ok){ say(errTxt(j)); return; } V.list=null; codeSheet(n,j.code,j.hours); }).catch(function(){ say(T("കണക്ഷൻ ഇല്ല","No connection")); });
 };
 function myMobile(){ try{ return String(getCurrentUser().mobile||""); }catch(e){ return ""; } }
 function codeSheet(name,code,hours){
  var msg=T("Travel Connect ആപ്പിൽ ലോഗിൻ ചെയ്ത ശേഷം: Menu > ഷോപ്പ് സ്റ്റാഫ് ലോഗിൻ. ഷോപ്പ് നമ്പർ: ","In the Travel Connect app: Menu > Shop staff login. Shop number: ")+myMobile()+T(" · കോഡ്: "," · Code: ")+code;
  UI.sheet('<h3 style="margin:0">'+E(name)+'</h3><div class="tsM">'+E(T("ഈ കോഡ് സ്റ്റാഫിന് കൊടുക്കുക (","Give this code to the staff member ("))+hours+E(T(" മണിക്കൂർ, ഒരു തവണ മാത്രം)"," hours, one use only)"))+'</div>'+
   '<div class="tsTot" style="letter-spacing:6px;text-align:center;margin:10px 0">'+E(code)+'</div>'+
   '<div class="tsM" style="text-align:center">'+E(T("ഷോപ്പ് നമ്പർ","Shop number"))+': <b>'+E(myMobile())+'</b></div>'+
   '<a class="tsBtn" style="text-decoration:none;text-align:center;background:#1a8f4a" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(msg)+'">WhatsApp</a>'+
   '<button class="tsBtn g" onclick="tsCloseSheet();tcStaffReload()">'+E(T("അടയ്ക്കുക","Close"))+'</button>');
 }
 window.tcStaffReload=function(){ V.list=null; if(UI.screenName()==="staff") UI.render(); };
 window.tcStaffCode=function(sid){
  var s=find(sid); if(!s) return;
  if(!confirm(T("പുതിയ കോഡ് ഉണ്ടാക്കിയാൽ ഇപ്പോഴത്തെ ഫോൺ ഒഴിവാകും. തുടരട്ടേ?","A new code removes the phone that is joined now. Continue?"))) return;
  post("staff_save",{sid:sid,name:s.name,role:s.role,regen:true}).then(function(j){ if(!j.ok){ say(errTxt(j)); return; } V.list=null; codeSheet(s.name,j.code,j.hours); }).catch(function(){ say(T("കണക്ഷൻ ഇല്ല","No connection")); });
 };
 window.tcStaffToggle=function(sid){
  var s=find(sid); if(!s) return;
  post("staff_save",{sid:sid,name:s.name,role:s.role,active:s.active?0:1}).then(function(j){ if(!j.ok){ say(errTxt(j)); return; } V.list=null; if(!s.active&&j.code) codeSheet(s.name,j.code,j.hours); else UI.render(); }).catch(function(){ say(T("കണക്ഷൻ ഇല്ല","No connection")); });
 };
 window.tcStaffDel=function(sid){
  var s=find(sid); if(!s) return;
  if(!confirm(T("ഈ സ്റ്റാഫിനെ ഒഴിവാക്കട്ടേ? ഇതുവരെയുള്ള എൻട്രികൾ അതേപടി ഇരിക്കും.","Remove this staff member? His entries stay in the book.")+" "+s.name)) return;
  post("staff_remove",{sid:sid}).then(function(j){ if(!j.ok){ say(errTxt(j)); return; } V.list=null; UI.render(); }).catch(function(){ say(T("കണക്ഷൻ ഇല്ല","No connection")); });
 };

 /* ---------------- staff: login with the join code ---------------- */
 function loginBox(){
  var u=null; try{ u=getCurrentUser(); }catch(e){}
  if(!u||!u.mobile){ say(B("Log in to the app first","ആദ്യം ആപ്പിൽ ലോഗിൻ ചെയ്യുക")); return; }
  var h='<h3 style="margin:0 0 6px">'+B("Shop staff login","ഷോപ്പ് സ്റ്റാഫ് ലോഗിൻ")+'</h3><p class="muted" style="font-size:13px">'+B("Type the shop's mobile number and the 6-digit code the owner gave you.","ഷോപ്പ് ഉടമയുടെ മൊബൈൽ നമ്പറും ഉടമ തന്ന 6 അക്ക കോഡും നൽകുക.")+'</p>'+
   '<input id="sfOwn" inputmode="numeric" maxlength="15" placeholder="'+B("Shop mobile number","ഷോപ്പ് മൊബൈൽ നമ്പർ")+'" style="width:100%;box-sizing:border-box;font-size:18px;padding:10px;margin-bottom:8px">'+
   '<input id="sfCode" inputmode="numeric" maxlength="6" placeholder="------" style="width:100%;box-sizing:border-box;font-size:24px;letter-spacing:8px;text-align:center;padding:10px;margin-bottom:8px">'+
   '<div id="sfMsg" style="min-height:18px;color:#a12d2d;font-size:13px;margin-bottom:6px"></div>'+
   '<button class="primary" onclick="tcStaffGo()" style="width:100%;margin-bottom:6px">'+B("Join","ചേരുക")+'</button><button onclick="closeModal()" style="width:100%">'+B("Cancel","റദ്ദാക്കുക")+'</button>';
  try{ modal(h); }catch(e){}
 }
 window.tcStaffLogin=loginBox;
 window.tcStaffGo=function(){
  var own=($("sfOwn").value||"").replace(/\D/g,""), code=($("sfCode").value||"").replace(/\D/g,""), msg=$("sfMsg");
  if(own.length<6||code.length!==6){ msg.textContent=B("Check the number and the 6-digit code","നമ്പറും 6 അക്ക കോഡും ശരിയാണോ എന്ന് നോക്കുക"); return; }
  msg.textContent="…";
  post("staff_login",{owner:own,code:code}).then(function(j){
   if(!j.ok){ var e=ERR[j.error]; msg.textContent=e?B(e[1],e[0]):B("Could not join","ചേരാൻ പറ്റിയില്ല"); return; }
   var u=getCurrentUser();
   try{ localStorage.setItem("tc_shop_staff",JSON.stringify({owner:j.owner,sid:j.sid,name:j.name,role:j.role,mobile:String(u.mobile)})); }catch(e){}
   window.__tcStaffGone=0; try{ SH.reload(); }catch(e){}
   try{ closeModal(); }catch(e){}
   say(B("Joined as ","ചേർന്നു: ")+j.name);
   setTimeout(function(){ try{ tsOpen("home"); SH.sync(); }catch(e){} },450);
  }).catch(function(){ msg.textContent=B("No connection","കണക്ഷൻ ഇല്ല"); });
 };
 window.tcStaffLeave=function(){
  if(!confirm(T("ഈ ഫോണിലെ സ്റ്റാഫ് ലോഗിൻ ഒഴിവാക്കട്ടേ?","Leave the staff login on this phone?"))) return;
  try{ localStorage.removeItem("tc_shop_staff"); }catch(e){}
  try{ SH.reload(); }catch(e){}
  try{ UI.close(); }catch(e){}
 };

 /* a staff phone can not reach the owner's edit / cancel / product screens even from a leftover button */
 ["tsEntry","tsCancelBill","tsCancel","tsDyLoss","tsDySaleGo","tsDySale","tsDySaleEdit","tsDySaleDel","tsStEdit","tsStNew","tsSimple"].forEach(function(n){
  var f=window[n]; if(typeof f!=="function") return;
  window[n]=function(){ if(SH.isStaff()){ say(T("ഇത് ചെയ്യാൻ ഉടമയ്ക്ക് മാത്രമേ കഴിയൂ","Only the owner can do this")); return; } return f.apply(this,arguments); };
 });
 (function(){ var f=window.tsStAdj; if(typeof f!=="function") return; window.tsStAdj=function(){ if(SH.isStaff()&&SH.role()!=="stock"){ say(T("ഇത് ചെയ്യാൻ ഉടമയ്ക്ക് മാത്രമേ കഴിയൂ","Only the owner can do this")); return; } return f.apply(this,arguments); }; })();

 /* Menu: "Shop staff login" for everybody who is logged in; a joined phone gets "Open the shop" + "Leave" */
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var body=$("modalBody"), u=getCurrentUser();
   if(u&&u.mobile&&body&&!body.querySelector("#tcStaffMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcStaffMenu";
    var ic='<circle cx="9" cy="8" r="3.5"></circle><path d="M2 20c0-4 3-6 7-6s7 2 7 6"></path><path d="M17 11l2 2 3-4"></path>';
    wrap.innerHTML=SH.isStaff()?
     tcMenuItem(ic,B("Open the shop (staff)","ഷോപ്പ് തുറക്കുക (സ്റ്റാഫ്)"),"closeModal();tsOpen('home')")+tcMenuItem(ic,B("Leave staff login","സ്റ്റാഫ് ലോഗിൻ ഒഴിവാക്കുക"),"closeModal();tcStaffLeave()"):
     tcMenuItem(ic,B("Shop staff login","ഷോപ്പ് സ്റ്റാഫ് ലോഗിൻ"),"closeModal();setTimeout(tcStaffLogin,350)");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };
 window.__tcShopStaffApi={list:function(){ return V.list; }};
})();
