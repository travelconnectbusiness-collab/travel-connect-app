/* Admin "Download backup", "Request deletion of my data", and no Message button on the person's own listing (tc-admindata.js, loaded by tc-regdocs.js before tc-menu.js).
   Owner's Part 3 items (2026-10-19 list, built 2026-10-29). Server: functions/api/deletion.js and functions/api/admin_backup.js (routes in worker.js).
   1) REQUEST DELETION OF MY DATA - every login (business owner and customer): Menu entry for owners; a small link at the bottom of the customer home page
      (customers have no Menu button). A sheet explains, asks an optional reason, and POSTs /api/deletion?action=request. The app owner sees the list
      in Admin > "Data deletion requests", deletes the data by hand and taps Done. NOTHING is deleted automatically.
   2) ADMIN > "Download backup": asks /api/admin_backup table by table, page by page (200 rows), and saves ONE .json file
      {app, at, tables:{name:[rows]}, skipped:[names]}. Login codes, devices, push subscriptions and every token / hash / key column are never included.
   3) MESSAGE BUTTON: directory.js already hides it when the mobile number is the business's; this adds the business id (db.settings.myPartnerId),
      wrapping tcMessageButtonHtml (directory.js itself is not edited).
   Both admin rows are added to the Admin pop-up (tc-menu.js tcAdminHub) by a MutationObserver on #modalBody. */
(function(){
 if(window.__tcAdminData) return;
 window.__tcAdminData=1;
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var $=function(id){ return document.getElementById(id); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 function tok(){ try{ return adminToken(); }catch(e){ return ""; } }
 function post(url,body){
  return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){ return r.json().then(function(j){ return {s:r.status,j:j}; },function(){ return {s:r.status,j:{}}; }); });
 }
 function sessionEnded(){ try{ sessionStorage.removeItem("tc_admin_token"); }catch(e){} try{ closeModal(); }catch(e){} say(B("Admin session ended - open Admin again","അഡ്മിൻ സെഷൻ കഴിഞ്ഞു - വീണ്ടും അഡ്മിൻ തുറക്കുക")); }

 /* ---------- 3) no Message button on my own business ---------- */
 var omb=window.tcMessageButtonHtml;
 if(typeof omb==="function") window.tcMessageButtonHtml=function(partnerId){
  try{
   var mine=(typeof db!=="undefined"&&db&&db.settings)?db.settings.myPartnerId:null;
   if(partnerId!=null&&mine!=null&&String(partnerId)===String(mine)) return "";
  }catch(e){}
  return omb.apply(this,arguments);
 };

 /* ---------- 1) request deletion of my data ---------- */
 window.tcDelAsk=function(){
  var h='<h3 style="margin:0 0 8px">'+E(B("Request deletion of my data","എന്റെ ഡാറ്റ ഡിലീറ്റ് ചെയ്യാൻ അപേക്ഷ"))+'</h3>'+
   '<p class="muted" style="font-size:14px">'+E(B("You ask the app owner to delete your account and the data kept on the server. The owner checks and deletes it by hand - it is not instant, and it cannot be brought back. Your own phone is not touched: take a backup file of My Accounts first if you want to keep it.","നിങ്ങളുടെ അക്കൗണ്ടും സെർവറിൽ സൂക്ഷിച്ച ഡാറ്റയും ഡിലീറ്റ് ചെയ്യാൻ ആപ്പ് ഉടമയോട് അപേക്ഷിക്കുകയാണ്. ഉടമ പരിശോധിച്ച് കൈകൊണ്ട് ഡിലീറ്റ് ചെയ്യും - ഉടൻ നടക്കില്ല, ഡിലീറ്റ് ചെയ്താൽ തിരിച്ചെടുക്കാനും പറ്റില്ല. നിങ്ങളുടെ ഫോണിലെ ഡാറ്റ മാറില്ല: 'എന്റെ കണക്കുകൾ' സൂക്ഷിക്കണമെങ്കിൽ ആദ്യം ബാക്കപ്പ് ഫയൽ എടുക്കുക."))+'</p>'+
   '<label style="display:block;font-size:13px;font-weight:700;margin-top:8px">'+E(B("Reason (optional)","കാരണം (വേണമെങ്കിൽ)"))+'<input id="tcDelWhy" maxlength="200" style="width:100%;margin-top:4px"></label>'+
   '<div class="actions" style="margin-top:12px"><button id="tcDelBtn" style="background:#b03a2e;color:#fff" onclick="tcDelSend()">'+E(B("Send request","അപേക്ഷ അയക്കുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","വേണ്ട"))+'</button></div>';
  if(typeof modal==="function") modal(h);
 };
 window.tcDelSend=function(){
  var u=null; try{ u=getCurrentUser(); }catch(e){}
  var why=$("tcDelWhy")?String($("tcDelWhy").value||"").trim():"", btn=$("tcDelBtn");
  if(btn){ btn.disabled=true; btn.textContent="..."; }
  post("/api/deletion?action=request",{reason:why,name:(u&&u.name)||"",role:(u&&u.role)||""}).then(function(x){
   if(x.j&&x.j.ok){ closeModal(); say(x.j.already?B("Your request is already with the owner","നിങ്ങളുടെ അപേക്ഷ നേരത്തേ ഉടമയുടെ പക്കൽ ഉണ്ട്"):B("Request sent to the app owner","അപേക്ഷ ആപ്പ് ഉടമയ്ക്ക് അയച്ചു")); return; }
   if(btn){ btn.disabled=false; btn.textContent=B("Send request","അപേക്ഷ അയക്കുക"); }
   say(x.s===429?B("Too many tries - try later","കൂടുതൽ ശ്രമങ്ങൾ - പിന്നീട് നോക്കുക"):B("Could not send - check the internet and try again","അയക്കാൻ കഴിഞ്ഞില്ല - ഇന്റർനെറ്റ് നോക്കി വീണ്ടും ശ്രമിക്കുക"));
  },function(){
   if(btn){ btn.disabled=false; btn.textContent=B("Send request","അപേക്ഷ അയക്കുക"); }
   say(B("Could not send - check the internet and try again","അയക്കാൻ കഴിഞ്ഞില്ല - ഇന്റർനെറ്റ് നോക്കി വീണ്ടും ശ്രമിക്കുക"));
  });
 };
 /* Menu entry (business owners) */
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var body=$("modalBody");
   if(body&&!body.querySelector("#tcDelMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcDelMenu";
    wrap.innerHTML=tcMenuItem('<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path>',B("Request deletion of my data","എന്റെ ഡാറ്റ ഡിലീറ്റ് ചെയ്യാൻ അപേക്ഷ"),"closeModal();setTimeout(tcDelAsk,420)",true);
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };

 /* ---------- 2) admin: download backup + deletion requests ---------- */
 function stamp(){ var d=new Date(), p=function(n){ return (n<10?"0":"")+n; }; return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate()); }
 function saveFile(name,text){
  var blob=new Blob([text],{type:"application/json"}), a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=name; a.style.display="none"; document.body.appendChild(a); a.click();
  setTimeout(function(){ try{ URL.revokeObjectURL(a.href); a.remove(); }catch(e){} },4000);
 }
 window.__tcAdmBkBusy=0;
 window.tcAdmBackup=async function(){
  if(window.__tcAdmBkBusy) return;
  var t=tok(); if(!t){ sessionEnded(); return; }
  window.__tcAdmBkBusy=1;
  var stat=function(s){ var e=$("tcAdmBkStat"); if(e) e.textContent=s; };
  try{
   stat(B("Reading the table list...","ടേബിൾ ലിസ്റ്റ് വായിക്കുന്നു..."));
   var x=await post("/api/admin_backup",{token:t});
   if(x.s===401){ sessionEnded(); return; }
   if(!x.j||!x.j.ok) throw new Error("list");
   var out={app:"travelconnect-backup",v:1,at:new Date().toISOString(),tables:{},skipped:[]}, n=0;
   for(var i=0;i<x.j.tables.length;i++){
    var tb=x.j.tables[i];
    if(tb.skipped){ out.skipped.push(tb.name); continue; }
    var rows=[], off=0, guard=0;
    while(off!==null&&guard++<2000){
     stat(tb.name+" ("+(i+1)+"/"+x.j.tables.length+") "+rows.length+"/"+tb.rows);
     var p=await post("/api/admin_backup",{token:t,table:tb.name,offset:off});
     if(p.s===401){ sessionEnded(); return; }
     if(!p.j||!p.j.ok) throw new Error("page");
     rows=rows.concat(p.j.rows||[]); off=p.j.next==null?null:p.j.next;
    }
    out.tables[tb.name]=rows; n+=rows.length;
   }
   saveFile("travelconnect-backup-"+stamp()+".json",JSON.stringify(out));
   stat(B("Done - "+n+" rows in the file. Keep it safe: it has your users' details.","കഴിഞ്ഞു - ഫയലിൽ "+n+" വരികൾ. സൂക്ഷിച്ച് വയ്ക്കുക: ഉപയോക്താക്കളുടെ വിവരങ്ങൾ ഇതിലുണ്ട്."));
  }catch(e){
   stat(B("Could not finish - try again","പൂർത്തിയാക്കാൻ കഴിഞ്ഞില്ല - വീണ്ടും ശ്രമിക്കുക"));
  }finally{ window.__tcAdmBkBusy=0; }
 };
 window.tcAdmDel=function(){
  var t=tok(); if(!t){ sessionEnded(); return; }
  if(typeof modal==="function") modal('<h3 style="margin:0 0 6px">'+E(B("Data deletion requests","ഡാറ്റ ഡിലീറ്റ് അപേക്ഷകൾ"))+'</h3><p class="muted">...</p>');
  post("/api/deletion?action=list",{token:t}).then(function(x){
   if(x.s===401){ sessionEnded(); return; }
   var rows=(x.j&&x.j.rows)||[], pend=rows.filter(function(r){ return r.status==="pending"; }), done=rows.filter(function(r){ return r.status!=="pending"; });
   var one=function(r){
    return '<div style="border-bottom:1px solid #e3eef3;padding:9px 0"><b>'+E(r.name||"-")+'</b> · '+E(r.mobile)+' <span class="muted">('+E(r.role||"")+')</span>'+
     '<div class="muted" style="font-size:12.5px">'+E((r.requested_at||"").slice(0,10))+(r.reason?' · '+E(r.reason):"")+(r.status!=="pending"?' · ✓ '+E((r.done_at||"").slice(0,10)):"")+'</div>'+
     (r.status==="pending"?'<button style="margin-top:6px" onclick="tcAdmDelDone('+(+r.id)+')">✔ '+E(B("Deleted - mark Done","ഡിലീറ്റ് ചെയ്തു - Done"))+'</button>':"")+'</div>';
   };
   modal('<h3 style="margin:0 0 6px">'+E(B("Data deletion requests","ഡാറ്റ ഡിലീറ്റ് അപേക്ഷകൾ"))+'</h3>'+
    '<p class="muted" style="font-size:13px">'+E(B("Delete the person's data yourself first, then tap Done.","ആദ്യം ആ ആളുടെ ഡാറ്റ കൈകൊണ്ട് ഡിലീറ്റ് ചെയ്യുക, എന്നിട്ട് Done അമർത്തുക."))+'</p>'+
    (pend.length?pend.map(one).join(""):'<p class="muted">'+E(B("No pending requests","പുതിയ അപേക്ഷകൾ ഇല്ല"))+'</p>')+
    (done.length?'<div style="margin-top:12px;font-weight:800;font-size:12px;color:#0b6b78">'+E(B("DONE (last 50)","കഴിഞ്ഞവ (അവസാന 50)"))+'</div>'+done.map(one).join(""):"")+
    '<div class="actions" style="margin-top:12px"><button onclick="closeModal();tcAdminHub()">'+E(B("Back","പിന്നോട്ട്"))+'</button></div>');
  },function(){ say(B("Could not load","ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല")); });
 };
 window.tcAdmDelDone=function(id){
  var t=tok(); if(!t){ sessionEnded(); return; }
  if(!confirm(B("Mark this request as Done? (you have deleted the data)","ഈ അപേക്ഷ Done ആക്കട്ടേ? (ഡാറ്റ ഡിലീറ്റ് ചെയ്തു കഴിഞ്ഞു)"))) return;
  post("/api/deletion?action=done",{token:t,id:id}).then(function(x){ if(x.s===401){ sessionEnded(); return; } window.tcAdmDel(); });
 };
 /* rows inside the Admin pop-up */
 function hubRows(){
  var body=$("modalBody"); if(!body||body.querySelector("#tcAdmData")) return;
  var back=body.querySelector('[onclick*="closeModal();tcOpenMenu()"]');
  if(!back||!back.parentNode) return;
  var txt=body.textContent||"";
  if(txt.indexOf("Only for the app owner")<0&&txt.indexOf("ആപ്പ് ഉടമയ്ക്ക് മാത്രം")<0) return;
  if(typeof tcMenuItem!=="function") return;
  var w=document.createElement("div"); w.id="tcAdmData";
  w.innerHTML='<div style="margin:12px 2px 0;font-size:11.5px;font-weight:800;letter-spacing:.8px;color:#0b6b78;text-transform:uppercase">'+E(B("Data & privacy","ഡാറ്റ / സ്വകാര്യത"))+'</div>'+
   tcMenuItem('<path d="M12 3v12"></path><polyline points="7 10 12 15 17 10"></polyline><path d="M4 19h16"></path>',E(B("Download backup (all data, no secrets)","ബാക്കപ്പ് ഡൗൺലോഡ് (എല്ലാ ഡാറ്റയും, രഹസ്യ വിവരങ്ങൾ ഇല്ലാതെ)")),"tcAdmBackup()")+
   '<div id="tcAdmBkStat" class="muted" style="font-size:12.5px;padding:0 2px"></div>'+
   tcMenuItem('<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path>',E(B("Data deletion requests","ഡാറ്റ ഡിലീറ്റ് അപേക്ഷകൾ")),"tcAdmDel()");
  back.parentNode.insertBefore(w,back);
 }
 (function(){
  var tm=0;
  function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ hubRows(); }catch(e){ if(window.console) console.error("tc-admindata",e); } },80); }
  function start(){ var b=$("modalBody"); if(!b||!window.MutationObserver) return; new MutationObserver(later).observe(b,{childList:true,subtree:true}); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();

 /* ---------- customer home: small link at the bottom ---------- */
 (function(){
  var tm=0;
  function place(){
   var u=null; try{ u=getCurrentUser(); }catch(e){}
   var app=$("app"), c=$("tcDelLink"), card=app&&app.querySelector(".container>.card");
   if(!u||(u.role!=="customer"&&location.hash!=="#previewcustomer")||!card||!card.querySelector('button[onclick*="activeboard"]')){ if(c&&c.parentNode&&!(card&&card.contains(c))) c.remove(); return; }
   if(!c){
    c=document.createElement("div"); c.id="tcDelLink"; c.setAttribute("onclick","tcDelAsk()");
    c.style.cssText="text-align:center;margin:22px 0 6px;font-size:12.5px;color:#6a7a87;text-decoration:underline;cursor:pointer";
   }
   var t=B("Request deletion of my data","എന്റെ ഡാറ്റ ഡിലീറ്റ് ചെയ്യാൻ അപേക്ഷ");
   if(c.textContent!==t) c.textContent=t;
   if(card.lastElementChild!==c) card.appendChild(c);
  }
  function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ place(); }catch(e){ if(window.console) console.error("tc-admindata link",e); } },200); }
  function start(){
   var app=$("app"); if(!app||!window.MutationObserver) return;
   new MutationObserver(later).observe(app,{childList:true,subtree:true}); later();
   setInterval(function(){ try{ place(); }catch(e){} },1500);   /* safety net: the page may be redrawn by other modules without a change this observer sees */
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();
})();
