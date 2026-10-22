/* Backup FILE on the phone (tc-filebk.js, loaded by tc-regdocs.js).
   Owner's idea (2026-10-22): before changing the phone, save everything as a file, and after installing the app on the new
   phone bring it back from that file. Works for every owner (Free too), nothing goes to the server.
   Menu > "Backup file (save to phone)":
     - Save backup file: one .json file with every list of records (bills, quotations, trips, customers, vehicles, drivers,
       expenses, accounts book, bookings, live trips, deleted-bill copies ...), business details, rates / categories and settings.
       Optional password: then the file is locked with AES-256-GCM (key from the password with PBKDF2, 200,000 rounds) and nobody
       can read it without the password - nobody can recover a forgotten password either.
       "Share" (WhatsApp / Drive / ...) is offered when the phone allows sharing a file.
     - Restore from file: choose the file (asks the password if it has one). Like the cloud restore it MERGES: records missing on
       this phone are added by id, nothing here is removed or overwritten; business details / rates / settings are replaced only if
       the person agrees in a second question.
   Dashboard reminder (card #tcFbCard, drawn by tc-home.js through window.tcFbReminderHtml): shown when there are at least 10 records
   and no backup file was saved for 30 days; "Later" hides it for 7 days. The date is kept on this phone only (localStorage). */
(function(){
 if(window.__tcFileBk) return;
 window.__tcFileBk=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var ml=function(){ try{ return tcLang()==="ml"; }catch(e){ return false; } };
 var T=function(en,m){ return ml()?m:en; };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var LS={
  get:function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set:function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
 };
 var pending=null;   /* parsed file waiting for a password / confirmation */

 /* ---- what goes into the file ---- */
 function lists(){
  var out={};
  Object.keys(db).forEach(function(k){
   var v=db[k];
   if(k==="categories"||!Array.isArray(v)) return;
   if(v.length&&!v.every(function(x){ return x&&typeof x==="object"; })) return;
   out[k]=v;
  });
  return out;
 }
 function settingsCopy(){
  var s={}, src=db.settings||{};
  Object.keys(src).forEach(function(k){ if(!/^my/.test(k)) s[k]=src[k]; });
  return s;
 }
 function build(){
  var L=lists(), n=0;
  Object.keys(L).forEach(function(k){ n+=L[k].length; });
  var u=null; try{ u=getCurrentUser(); }catch(e){}
  return {
   app:"travel-connect",kind:"phone-backup",version:1,savedAt:new Date().toISOString(),mobile:u&&u.mobile?u.mobile:"",total:n,
   data:{lists:L,business:db.business||{},categories:db.categories||[],billingByPartner:db.billingByPartner||{},settings:settingsCopy()}
  };
 }
 function total(){ var L=lists(),n=0; Object.keys(L).forEach(function(k){ n+=L[k].length; }); return n; }

 /* ---- password lock ---- */
 function b64(buf){
  var a=new Uint8Array(buf), s="", i;
  for(i=0;i<a.length;i+=8192) s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));
  return btoa(s);
 }
 function unb64(s){
  var bin=atob(s), a=new Uint8Array(bin.length), i;
  for(i=0;i<bin.length;i++) a[i]=bin.charCodeAt(i);
  return a;
 }
 function keyFrom(pw,salt,iter){
  var enc=new TextEncoder();
  return crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]).then(function(base){
   return crypto.subtle.deriveKey({name:"PBKDF2",salt:salt,iterations:iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
  });
 }
 function lock(obj,pw){
  var salt=crypto.getRandomValues(new Uint8Array(16)), iv=crypto.getRandomValues(new Uint8Array(12)), iter=200000;
  return keyFrom(pw,salt,iter).then(function(k){
   return crypto.subtle.encrypt({name:"AES-GCM",iv:iv},k,new TextEncoder().encode(JSON.stringify(obj)));
  }).then(function(ct){
   return {app:"travel-connect",kind:"phone-backup",version:1,encrypted:true,savedAt:obj.savedAt,iter:iter,salt:b64(salt),iv:b64(iv),ct:b64(ct)};
  });
 }
 function unlock(file,pw){
  return keyFrom(pw,unb64(file.salt),file.iter||200000).then(function(k){
   return crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(file.iv)},k,unb64(file.ct));
  }).then(function(buf){ return JSON.parse(new TextDecoder().decode(buf)); });
 }

 /* ---- save ---- */
 function fileName(){
  var d=new Date(), p=function(n){ return String(n).padStart(2,"0"); };
  return "TravelConnect-backup-"+d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+".json";
 }
 function makeBlob(){
  var pw=($("tcFbPw")||{}).value||"", pw2=($("tcFbPw2")||{}).value||"";
  if(pw||pw2){
   if(pw.length<6){ say(T("Password should be at least 6 characters","പാസ്‌വേഡ് കുറഞ്ഞത് 6 അക്ഷരം വേണം")); return Promise.resolve(null); }
   if(pw!==pw2){ say(T("The two passwords do not match","രണ്ട് പാസ്‌വേഡും ഒരുപോലെ അല്ല")); return Promise.resolve(null); }
   if(!(window.crypto&&crypto.subtle)){ say(T("Password lock is not available on this browser - save without a password","ഈ ബ്രൗസറിൽ പാസ്‌വേഡ് ലോക്ക് ലഭ്യമല്ല - പാസ്‌വേഡ് ഇല്ലാതെ സേവ് ചെയ്യുക")); return Promise.resolve(null); }
   return Promise.resolve().then(function(){ return lock(build(),pw); }).then(function(o){ return new Blob([JSON.stringify(o)],{type:"application/json"}); });
  }
  return Promise.resolve(new Blob([JSON.stringify(build())],{type:"application/json"}));
 }
 function done(){
  LS.set("tc_fb_last",new Date().toISOString());
  try{ localStorage.removeItem("tc_fb_snooze"); }catch(e){}
  var el=$("tcFbLast"); if(el) el.innerHTML=lastHtml();
 }
 window.tcFbSave=function(){
  makeBlob().then(function(blob){
   if(!blob) return;
   var url=URL.createObjectURL(blob), a=document.createElement("a");
   a.href=url; a.download=fileName(); a.style.display="none"; document.body.appendChild(a); a.click();
   setTimeout(function(){ try{ document.body.removeChild(a); URL.revokeObjectURL(url); }catch(e){} },4000);
   done();
   say(T("Backup file saved to your phone (Downloads). Keep a copy in Google Drive or send it to yourself on WhatsApp.","ബാക്കപ്പ് ഫയൽ ഫോണിൽ സേവ് ചെയ്തു (Downloads). ഒരു കോപ്പി Google Drive-ലോ സ്വന്തം WhatsApp-ലോ സൂക്ഷിക്കുക."));
  }).catch(function(e){ say(T("Could not make the backup file","ബാക്കപ്പ് ഫയൽ ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല")+" ["+(e&&e.message?e.message:"error")+"]"); });
 };
 window.tcFbShare=function(){
  makeBlob().then(function(blob){
   if(!blob) return;
   var f=new File([blob],fileName(),{type:"application/json"});
   if(!(navigator.canShare&&navigator.canShare({files:[f]}))){ say(T("Sharing is not possible here - use Save backup file","ഇവിടെ ഷെയർ ചെയ്യാൻ പറ്റില്ല - Save backup file ഉപയോഗിക്കുക")); return; }
   return navigator.share({files:[f],title:"Travel Connect backup"}).then(done,function(){});
  }).catch(function(){});
 };

 /* ---- restore ---- */
 window.tcFbPick=function(inp){
  var f=inp&&inp.files&&inp.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){
   var j=null; try{ j=JSON.parse(String(r.result)); }catch(e){}
   if(!j||j.app!=="travel-connect"||j.kind!=="phone-backup"){ say(T("This is not a Travel Connect backup file","ഇത് Travel Connect ബാക്കപ്പ് ഫയൽ അല്ല")); return; }
   pending=j;
   if(j.encrypted){
    modal('<h3 style="margin:0 0 6px">'+T("This backup file has a password","ഈ ബാക്കപ്പ് ഫയലിന് പാസ്‌വേഡ് ഉണ്ട്")+'</h3>'+
     '<input id="tcFbOpenPw" type="password" placeholder="'+T("Password","പാസ്‌വേഡ്")+'" style="width:100%;margin:6px 0">'+
     '<div class="actions"><button class="primary" onclick="tcFbOpen()">'+T("Open","തുറക്കുക")+'</button><button onclick="closeModal()">'+T("Cancel","റദ്ദാക്കുക")+'</button></div>');
   }else apply(j);
  };
  r.onerror=function(){ say(T("Could not read the file","ഫയൽ വായിക്കാൻ കഴിഞ്ഞില്ല")); };
  r.readAsText(f);
  inp.value="";
 };
 window.tcFbOpen=function(){
  var pw=($("tcFbOpenPw")||{}).value||"";
  if(!pending||!pw){ say(T("Enter the password","പാസ്‌വേഡ് നൽകുക")); return; }
  Promise.resolve().then(function(){ return unlock(pending,pw); }).then(function(o){ apply(o); },function(){ say(T("Wrong password","പാസ്‌വേഡ് തെറ്റാണ്")); });
 };
 function apply(o){
  if(!o||!o.data||!o.data.lists){ say(T("This backup file is damaged","ബാക്കപ്പ് ഫയൽ കേടാണ്")); return; }
  var b=o.data, plan={}, add=0;
  Object.keys(b.lists||{}).forEach(function(k){
   var src=Array.isArray(b.lists[k])?b.lists[k]:[];
   var have=new Set((Array.isArray(db[k])?db[k]:[]).map(function(x){ return x&&x.id; }));
   plan[k]=src.filter(function(x){ return x&&x.id&&!have.has(x.id); });
   add+=plan[k].length;
  });
  var cur=null; try{ cur=getCurrentUser(); }catch(e){}
  if(o.mobile&&cur&&cur.mobile&&o.mobile!==cur.mobile){
   if(!confirm(T("This backup was made for mobile "+o.mobile+" but you are logged in as "+cur.mobile+". Continue?","ഈ ബാക്കപ്പ് "+o.mobile+" എന്ന മൊബൈലിന്റേതാണ്, നിങ്ങൾ "+cur.mobile+" ആയാണ് ലോഗിൻ ചെയ്തിരിക്കുന്നത്. തുടരട്ടേ?"))) return;
  }
  if(!add){
   say(T("Nothing new to restore - this phone already has everything in the file","പുതിയതായി ഒന്നും ഇല്ല - ഫയലിലുള്ളതെല്ലാം ഈ ഫോണിൽ ഉണ്ട്"));
  }else{
   if(!confirm(T("The file (saved "+(o.savedAt?tcFormatDate(o.savedAt):"")+") has "+add+" records not on this phone. Add them now? Nothing on this phone will be removed.",
    "ഫയലിൽ (സേവ് ചെയ്തത് "+(o.savedAt?tcFormatDate(o.savedAt):"")+") ഈ ഫോണിൽ ഇല്ലാത്ത "+add+" റെക്കോർഡുകൾ ഉണ്ട്. ചേർക്കട്ടേ? ഈ ഫോണിലെ ഒന്നും നീക്കം ചെയ്യില്ല."))) return;
   Object.keys(plan).forEach(function(k){ if(plan[k].length) db[k]=(Array.isArray(db[k])?db[k]:[]).concat(plan[k]); });
  }
  var hasBiz=b.business&&Object.keys(b.business).length;
  if((hasBiz||(b.categories&&b.categories.length)||(b.settings&&Object.keys(b.settings).length))&&confirm(T(
   "Also bring back your business details, rates and settings from the file? This REPLACES the business details, rates and settings on this phone.",
   "ഫയലിലെ ബിസിനസ് വിവരങ്ങൾ, റേറ്റുകൾ, സെറ്റിംഗ്സ് എന്നിവയും തിരികെ കൊണ്ടുവരണോ? ഇത് ഈ ഫോണിലെ ബിസിനസ് വിവരങ്ങളും റേറ്റുകളും സെറ്റിംഗ്സും മാറ്റിസ്ഥാപിക്കും."))){
   if(hasBiz) db.business=Object.assign({},db.business,b.business);
   if(Array.isArray(b.categories)&&b.categories.length) db.categories=b.categories;
   if(b.billingByPartner) db.billingByPartner=Object.assign({},db.billingByPartner||{},b.billingByPartner);
   if(b.settings) db.settings=Object.assign({},db.settings||{},b.settings);
  }
  save();
  try{ localStorage.removeItem("tc_bk_hash"); }catch(e){}
  pending=null;
  say(T("Restored - reloading","തിരികെ ചേർത്തു - റീലോഡ് ചെയ്യുന്നു"));
  setTimeout(function(){ location.reload(); },900);
 }

 /* ---- the page ---- */
 function lastHtml(){
  var l=LS.get("tc_fb_last");
  return l?T("Last backup file saved on this phone: ","ഈ ഫോണിൽ അവസാനം ബാക്കപ്പ് ഫയൽ സേവ് ചെയ്തത്: ")+"<b>"+E(tcFormatDate(l))+"</b>":T("No backup file saved from this phone yet","ഈ ഫോണിൽ നിന്ന് ബാക്കപ്പ് ഫയൽ ഇതുവരെ സേവ് ചെയ്തിട്ടില്ല");
 }
 window.tcFbOpenPage=function(){
  var canShare=false;
  try{ canShare=!!(navigator.canShare&&navigator.canShare({files:[new File(["x"],"a.json",{type:"application/json"})]})); }catch(e){}
  modal('<h3 style="margin:0 0 6px">'+T("Backup file (save to phone)","ബാക്കപ്പ് ഫയൽ (ഫോണിൽ സൂക്ഷിക്കുക)")+'</h3>'+
   '<p class="muted" style="font-size:13px;margin:0 0 8px">'+T(
    "Saves all your bills, trips, customers, accounts and settings as one file. Before changing your phone, save the file, keep a copy in Google Drive or on WhatsApp, and on the new phone install the app, log in and choose Restore from file.",
    "നിങ്ങളുടെ ബില്ലുകൾ, ട്രിപ്പുകൾ, കസ്റ്റമർമാർ, കണക്കുകൾ, സെറ്റിംഗ്സ് എല്ലാം ഒരു ഫയലായി സേവ് ചെയ്യും. ഫോൺ മാറുന്നതിന് മുമ്പ് ഫയൽ സേവ് ചെയ്ത് Google Drive-ലോ WhatsApp-ലോ ഒരു കോപ്പി സൂക്ഷിക്കുക. പുതിയ ഫോണിൽ ആപ്പ് ഇൻസ്റ്റാൾ ചെയ്ത് ലോഗിൻ ചെയ്ത ശേഷം Restore from file തിരഞ്ഞെടുക്കുക.")+'</p>'+
   '<div id="tcFbLast" class="muted" style="font-size:13px;margin-bottom:6px">'+lastHtml()+'</div>'+
   '<div class="muted" style="font-size:12.5px;margin-bottom:8px">'+T("Records on this phone: ","ഈ ഫോണിലെ റെക്കോർഡുകൾ: ")+'<b>'+total()+'</b></div>'+
   '<div class="ratebox" style="margin-bottom:8px"><b>'+T("Password (optional)","പാസ്‌വേഡ് (ഓപ്ഷണൽ)")+'</b>'+
   '<input id="tcFbPw" type="password" autocomplete="new-password" placeholder="'+T("Leave empty for no password","പാസ്‌വേഡ് വേണ്ടെങ്കിൽ ഒഴിച്ചിടുക")+'" style="width:100%;margin:4px 0">'+
   '<input id="tcFbPw2" type="password" autocomplete="new-password" placeholder="'+T("Type the password again","പാസ്‌വേഡ് വീണ്ടും ടൈപ്പ് ചെയ്യുക")+'" style="width:100%;margin:4px 0">'+
   '<div class="muted" style="font-size:11.5px">'+T("With a password nobody can read the file without it - and nobody, including us, can recover a forgotten password. Write it down.","പാസ്‌വേഡ് ഉണ്ടെങ്കിൽ അത് ഇല്ലാതെ ആർക്കും ഫയൽ വായിക്കാനാകില്ല. മറന്നുപോയാൽ ആർക്കും, ഞങ്ങൾക്ക് പോലും, തിരിച്ചെടുക്കാനാകില്ല. എഴുതി സൂക്ഷിക്കുക.")+'</div></div>'+
   '<button class="primary" onclick="tcFbSave()" style="width:100%;margin-bottom:8px">'+T("Save backup file","ബാക്കപ്പ് ഫയൽ സേവ് ചെയ്യുക")+'</button>'+
   (canShare?'<button onclick="tcFbShare()" style="width:100%;margin-bottom:8px">'+T("Share (WhatsApp / Drive ...)","ഷെയർ ചെയ്യുക (WhatsApp / Drive ...)")+'</button>':'')+
   '<button onclick="document.getElementById(\'tcFbFile\').click()" style="width:100%;margin-bottom:8px">'+T("Restore from file","ഫയലിൽ നിന്ന് തിരികെ ചേർക്കുക")+'</button>'+
   '<input id="tcFbFile" type="file" accept=".json,application/json" style="display:none" onchange="tcFbPick(this)">'+
   '<button onclick="closeModal()" style="width:100%;margin-top:4px">'+T("Close","അടയ്ക്കുക")+'</button>');
 };

 /* ---- Menu entry ---- */
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var u=getCurrentUser();
   var body=$("modalBody");
   if(u&&u.role!=="customer"&&body&&!body.querySelector("#tcFbMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcFbMenu";
    wrap.innerHTML=tcMenuItem('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',T("Backup file (save to phone)","ബാക്കപ്പ് ഫയൽ (ഫോണിൽ സൂക്ഷിക്കുക)"),"tcFbOpenPage()");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };

 /* ---- Dashboard reminder (tc-home.js draws the card) ---- */
 window.tcFbReminderHtml=function(){
  try{
   if(total()<10) return "";
   var now=Date.now(), l=LS.get("tc_fb_last"), s=LS.get("tc_fb_snooze");
   if(l&&now-new Date(l).getTime()<30*86400000) return "";
   if(s&&now-new Date(s).getTime()<7*86400000) return "";
   return '<b>'+T("Save a backup file to your phone","ഒരു ബാക്കപ്പ് ഫയൽ ഫോണിൽ സേവ് ചെയ്യുക")+'</b><div class="muted" style="font-size:12.5px">'+
    (l?T("Last one: ","അവസാനത്തേത്: ")+E(tcFormatDate(l)):T("You have not saved one yet. Protects your bills and accounts if the phone is changed or lost.","ഇതുവരെ സേവ് ചെയ്തിട്ടില്ല. ഫോൺ മാറുമ്പോഴോ നഷ്ടപ്പെടുമ്പോഴോ നിങ്ങളുടെ ബില്ലുകളും കണക്കുകളും സുരക്ഷിതമാക്കും."))+
    '</div><div style="margin-top:6px"><button type="button" class="primary" onclick="event.stopPropagation();tcFbOpenPage()">'+T("Save now","ഇപ്പോൾ സേവ് ചെയ്യുക")+'</button> <button type="button" onclick="event.stopPropagation();tcFbLater()">'+T("Later","പിന്നീട്")+'</button></div>';
  }catch(e){ return ""; }
 };
 window.tcFbLater=function(){
  LS.set("tc_fb_snooze",new Date().toISOString());
  var c=$("tcFbCard"); if(c) c.remove();
 };
})();
