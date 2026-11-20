/* ASSOCIATION BOOK part 3 - THE CLOUD BOOK (tc-assoc3.js, loaded right after tc-assoc2.js; server: /api/assoc, assoc.js).
   Owner 2026-11-20: "the book must not live on the treasurer's or secretary's phone; when they change, the app must know the new ones;
   office bearers and executive members must see the accounts and minutes any time, and lose it the day they leave the post;
   Premium Rs 1000 with cloud, Platinum Rs 3000, member limits by plan".
   - Premium: "Move this book to the cloud" (once) - then every change is queued (tc-assoc.js op()) and sent; the phone pulls
     the others' changes (on open, every minute while open, when back online). Receipt numbers come from the server.
   - Office bearers (Settings › "Office bearers"): post, member, mobile number, access (admin / edit / view), from - "End term" removes
     the access at once. The server always keeps one admin.
   - "Activity log": who added / changed / cancelled what, and when.
   - "My organisations" card: books where my mobile number holds a post (opens that organisation's book, not my own business).
   - "My membership" card (Platinum organisations): my own payments, receipts and dues - nothing about anybody else. */
(function(){
 if(window.__tcAssoc3) return;
 var X=window.__tcAs; if(!X) return;
 window.__tcAssoc3=1;
 var $=function(id){ return document.getElementById(id); }, E=X.E, T=X.T, money=X.money, dmy=X.dmy, v=X.v, chips=X.chips, chipVal=X.chipVal;
 function me(){ try{ return String((getCurrentUser()||{}).mobile||""); }catch(e){ return ""; } }
 function dev(){ try{ return typeof getDeviceToken==="function"?getDeviceToken():(localStorage.getItem("tc_device_token")||""); }catch(e){ return ""; } }
 function api(action,body){
  body=Object.assign({mobile:me(),device_token:dev()},body||{});
  return fetch("/api/assoc?action="+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
   .then(function(r){ return r.json().catch(function(){ return {ok:false,error:"bad_answer"}; }); },function(){ return {ok:false,error:"offline"}; });
 }
 function pidNum(){ var p=parseInt(X.pid(),10); return p>0?p:0; }
 var WHY={member_limit:["ഈ പ്ലാനിലെ മെമ്പർ പരിധി കഴിഞ്ഞു","The member limit of this plan is reached"],role_limit:["ഈ പ്ലാനിലെ ഭാരവാഹി പരിധി കഴിഞ്ഞു","The office-bearer limit of this plan is reached"],
  not_admin_role:["അഡ്മിൻ അനുമതിയുള്ള ഭാരവാഹിക്ക് മാത്രമേ കൈമാറാൻ പറ്റൂ","Hand over only to an office bearer with admin access"],read_only:["നിങ്ങൾക്ക് കാണാൻ മാത്രമേ അനുമതിയുള്ളൂ","You can only view this book"],
  plan:["പ്ലാൻ കഴിഞ്ഞു - കാണാം, മാറ്റാൻ പ്ലാൻ പുതുക്കണം","The plan has ended - you can view; renew to make changes"],no_access:["ഈ സംഘടനയുടെ പുസ്തകം കാണാൻ ഇനി അനുമതിയില്ല","You no longer have access to this book"],
  bad_phone:["ശരിയായ 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക","Enter a correct 10-digit mobile number"],out_of_scope:["ഇത് നിങ്ങളുടെ കമ്മിറ്റിക്ക് പുറത്താണ്","This is outside your committee"],
  bad_parent:["മേൽകമ്മിറ്റി ശരിയല്ല","The upper committee is not right"],com_limit:["കമ്മിറ്റികളുടെ പരിധി കഴിഞ്ഞു","Too many committees"]};
 function why(e){ var w=WHY[e]; return w?T(w[0],w[1]):T("സെർവറിൽ നിന്ന് മറുപടി കിട്ടിയില്ല","No answer from the server"); }

 /* ---------- sync ---------- */
 var busy=false, again=false, timer=0, every=0;
 function merge(a,recs){
  var KEY={member:"members",pay:"pays",led:"led",min:"mins",act:"acts",role:"roles",com:"coms"};
  if(!Array.isArray(a.roles)) a.roles=[];
  recs.forEach(function(r){
   var arr=a[KEY[r.kind]]; if(!arr) return;
   if((a.q||[]).some(function(o){ return o.kind===r.kind&&o.id===r.id; })) return;   /* my own unsent change wins until it is sent */
   var d=Object.assign({},r.data,{id:r.id}); if(r.del) d.del=d.del||"x"; else delete d.del;
   d._by=r.by; d._at=r.at;
   var i=-1; for(var k=0;k<arr.length;k++) if(arr[k].id===r.id){ i=k; break; }
   if(i>=0) arr[i]=d; else arr.push(d);
  });
 }
 function sync(){
  var d0=(typeof db!=="undefined")?db:null; if(!d0||!d0.assoc||!d0.assoc[X.pid()]) return Promise.resolve();   /* never make an empty book here */
  var a=X.A(), pid=pidNum(); if(!a||!a.cloud||!pid) return Promise.resolve();
  if(busy){ again=true; return Promise.resolve(); }
  busy=true;
  var q=(a.q||[]).slice(0,200);
  var push=q.length?api("push",{pid:pid,ops:q}):Promise.resolve(null), since=+a.rev||0;
  var sentOk=false;
  return push.then(function(r){
   if(r&&r.ok){ sentOk=q.length>0&&(r.results||[]).length>0;
    var errs=[];
    (r.results||[]).forEach(function(res){
     a.q=(a.q||[]).filter(function(o){ return !(o.kind===res.kind&&(o.id===res.id||res.kind==="cfg")); });
     if(res.kind==="pay"&&res.rc){ a.pays.forEach(function(p){ if(p.id===res.id) p.rc=res.rc; }); }
     if(!res.ok){ errs.push(res.error);
      if(res.kind==="member"||res.kind==="com"){ var K2=res.kind==="member"?"members":"coms"; a[K2]=(a[K2]||[]).filter(function(m){ return m.id!==res.id||m._by; }); }   /* refused new record: not kept */
     }
    });
    if(errs.length) X.say(why(errs[0]));
   }else if(r&&!r.ok&&r.error!=="offline"){ X.say(why(r.error)); if(r.error==="read_only"||r.error==="plan"||r.error==="no_access") a.q=[]; }
   since=+a.rev||0; return api("pull",{pid:pid,since:since});
  }).then(function(r){
   if(!r) return;
   if(r.ok&&r.cloud!==false&&r.scopeKey&&a.scopeKey!==r.scopeKey){
    /* my post moved to another committee (or to the whole organisation): start this phone's copy again from the cloud */
    var was=a.scopeKey; a.scopeKey=r.scopeKey; a.scope=r.scope||null;
    if(since>0&&(was!==undefined||r.scopeKey!=="*")){ ["members","pays","led","mins","acts","roles","coms"].forEach(function(k){ a[k]=(a[k]||[]).filter(function(x){ return !x._by; }); }); a.rev=0; X.sv(); setTimeout(sync,50); return; }
   }
   if(r.ok&&r.cloud!==false){
    merge(a,r.recs||[]); a.rev=r.rev; a.acc=r.access; a.title=r.title||""; a.scope=r.scope||null; a.scopeKey=r.scopeKey||"*"; a.limits=r.limits; a.level=r.level; a.synced=new Date().toISOString();
    var nc=r.cfg||{}; ["org","type","amt","per","start","areas","prefix","openCash","openBank","nextNo","nextRc","inclVeh","extraVeh"].forEach(function(k){ if(nc[k]!=null) a.cfg[k]=nc[k]; });
    X.sv(); if(X.isOpen()) X.render();
    if(r.more) setTimeout(sync,100);
   }else if(r.error==="no_access"){
    /* the term has ended (or the post was removed): the copy on this phone goes too */
    var d=(typeof db!=="undefined")?db:null; if(d&&d.assoc) delete d.assoc[X.pid()]; X.sv();
    if(X.isOpen()){ X.close(); } X.say(why("no_access"));
   }
  }).then(function(){ busy=false; if(again){ again=false; setTimeout(sync,300); } else if(sentOk&&(a.q||[]).length) setTimeout(sync,400); },function(){ busy=false; });   /* a big change (e.g. areas → units) goes 200 at a time */
 }
 window.__tcAsSync=sync;
 window.__tcAsSyncSoon=function(){ clearTimeout(timer); timer=setTimeout(sync,1200); };
 window.addEventListener("online",function(){ sync(); });
 setInterval(function(){ if(X.isOpen()) sync(); },60000);

 /* ---------- home: cloud banner + extra tiles ---------- */
 var stat={};
 function checkStatus(){
  var pid=pidNum(), a=X.A(); if(!pid||!a) return;
  if(a.cloud){ sync(); return; }
  if(!X.premOk()) return;
  api("status",{pid:pid}).then(function(r){ stat[pid]=r; if(r&&r.ok&&r.cloud){ a.cloud=true; a.rev=0; X.sv(); sync(); } else if(X.isOpen()) X.render(); });
 }
 window.__tcAsHomeExtra=function(){
  var a=X.A(), pid=pidNum(); if(!a) return "";
  if(a.cloud){
   var who=(a.title&&a.title!=="owner"?a.title:"")+(X.myRoot()?" · "+X.comName(X.myRoot()):""), acc={admin:T("അഡ്മിൻ","admin"),edit:T("മാറ്റാം","can edit"),view:T("കാണാൻ മാത്രം","view only")}[a.acc]||"";
   return '<div class="asM" style="margin:0 0 8px">&#9729;&#65039; '+E(T("ക്ലൗഡ് പുസ്തകം","Cloud book"))+(who||acc?' · '+E([who,acc].filter(Boolean).join(", ")):'')+(a.synced?' · '+E(T("സിങ്ക്","synced"))+' '+E(a.synced.slice(11,16)):'')+((a.q||[]).length?' · <b style="color:#a15c00">'+(a.q||[]).length+' '+E(T("അയക്കാനുണ്ട്","to send"))+'</b>':'')+'</div>';
  }
  var s=stat[pid];
  if(X.premOk()&&s&&s.ok&&s.access==="admin"&&!s.cloud) return '<div class="asC" style="background:#eef6ff"><b>&#9729;&#65039; '+E(T("ഈ പുസ്തകം ക്ലൗഡിലേക്ക് മാറ്റുക","Move this book to the cloud"))+'</b><div class="asM">'+E(T("അപ്പോൾ ഭാരവാഹികൾക്ക് അവരുടെ ഫോണിൽ കാണാം; ഫോൺ മാറിയാലും കണക്ക് പോകില്ല.","Then office bearers see it on their phones; nothing is lost when a phone changes."))+'</div><span class="asBtn" onclick="tcAsInit()">'+E(T("ക്ലൗഡിലേക്ക് മാറ്റുക","Move to the cloud"))+'</span></div>';
  return "";
 };
 window.__tcAsHomeTiles=function(){
  var a=X.A(); if(!a||!a.cloud) return "";
  return X.tile("&#127894;&#65039;",T("ഭാരവാഹികൾ","Office bearers"),"tcAsGo('roles')",(a.roles||[]).filter(function(r){ return !r.del&&!(r.to&&r.to<X.today()); }).length+"")+X.tile("&#128339;",T("മാറ്റങ്ങളുടെ രേഖ","Activity log"),"tcAsGo('log')");
 };
 window.tcAsInit=function(){
  var a=X.A(), pid=pidNum(); if(!a||!pid) return;
  if(!confirm(T("ഈ ഫോണിലെ സംഘടനാ പുസ്തകം ക്ലൗഡിലേക്ക് മാറ്റട്ടെ?","Move this phone's association book to the cloud?"))) return;
  X.say(T("ക്ലൗഡിലേക്ക് മാറ്റുന്നു...","Moving to the cloud..."));
  api("init",{pid:pid,book:{cfg:a.cfg,coms:a.coms||[],members:a.members,pays:a.pays,led:a.led,mins:a.mins,acts:a.acts}}).then(function(r){
   if(r&&r.ok){ a.cloud=true; a.rev=0; a.q=[]; X.sv(); X.say(T("ക്ലൗഡിലേക്ക് മാറ്റി ✓","Moved to the cloud ✓")); sync(); }
   else X.say(why(r&&r.error));
  });
 };
 /* the book opens: look at the cloud (own book: can it move? cloud book: sync) */
 var oldOpen=window.tcAssocOpen;
 window.tcAssocOpen=function(n,a2){ X.setPid(""); oldOpen(n,a2); checkStatus(); };

 /* ---------- office bearers ---------- */
 var POSTS=[["president","പ്രസിഡന്റ്","President","admin"],["vp","വൈസ് പ്രസിഡന്റ്","Vice President","view"],["secretary","സെക്രട്ടറി","Secretary","admin"],["jsec","ജോയിന്റ് സെക്രട്ടറി","Joint Secretary","edit"],["treasurer","ട്രഷറർ","Treasurer","edit"],["jtr","സഹ ട്രഷറർ","Joint Treasurer","view"],["exec","എക്സിക്യൂട്ടീവ് മെമ്പർ","Executive member","view"],["other","മറ്റ് സ്ഥാനം","Other post","view"]];
 function accTxt(x){ return {admin:T("അഡ്മിൻ (എല്ലാം)","Admin (all)"),edit:T("കണക്ക് ചേർക്കാം","Can add / edit"),view:T("കാണാൻ മാത്രം","View only")}[x]||x; }
 X.screen("roles",function(){
  var a=X.A(), rs=(a.roles||[]).filter(function(r){ return !r.del; }), act=rs.filter(function(r){ return !(r.to&&r.to<X.today()); }), past=rs.filter(function(r){ return r.to&&r.to<X.today(); });
  var row=function(r,isPast){ var m=X.memberById(r.mid)||{}; return '<div class="asR"'+(a.acc==="admin"&&!isPast?' onclick="tcAsGo(\'rform\',\''+r.id+'\')"':'')+'><div style="flex:1;min-width:0"><div style="font-weight:700">'+E(r.title||"")+' · '+E(m.name||r.name||"")+'</div><div class="asM">'+E((X.coms().length?X.comName(X.comOf(r))+" · ":"")+(r.ph||"")+" · "+accTxt(r.access)+" · "+dmy(r.from||"")+(r.to?" – "+dmy(r.to):""))+'</div></div></div>'; };
  var h='<div class="asC">'+(a.acc==="admin"?'<span class="asBtn" onclick="tcAsGo(\'rform\')">+ '+E(T("ഭാരവാഹിയെ ചേർക്കുക","Add office bearer"))+'</span>':'')+
   '<div class="asM" style="margin-top:6px">'+E(T("ഭാരവാഹിയുടെ മൊബൈൽ നമ്പറിൽ ലോഗിൻ ചെയ്താൽ ആപ്പ് അവരെ തിരിച്ചറിയും. കാലാവധി കഴിഞ്ഞാൽ \"കാലാവധി അവസാനിപ്പിക്കുക\" - അപ്പോൾ തന്നെ അനുമതി പോകും.","The app knows an office bearer by the mobile number they log in with. When the term ends, tap \"End term\" - the access goes at once."))+'</div>'+(a.acc==="admin"?'<div class="asM" style="margin-top:4px;color:#a15c00">'+E(T("കമ്മിറ്റി മാറുമ്പോൾ: പുതിയ ഭാരവാഹികളെ ചേർക്കുക, പഴയവരുടെ കാലാവധി അവസാനിപ്പിക്കുക, പിന്നെ \"സംഘടന കൈമാറുക\" വഴി പുതിയ സെക്രട്ടറിക്ക് (അഡ്മിൻ) കൈമാറുക - പ്ലാൻ പുതുക്കലും അവർക്ക് പോകും.","When the committee changes: add the new office bearers, end the old terms, then \"Hand over\" the organisation to the new secretary (admin) - plan renewals go to them too."))+'</div>'+(X.myRoot()?'':'<span class="asBtn l" onclick="tcAsHandover()">'+E(T("സംഘടന കൈമാറുക","Hand over the organisation"))+'</span>'):'')+'</div>'+
   '<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("ഇപ്പോഴത്തെ ഭാരവാഹികൾ","Current office bearers"))+'</div>'+(act.length?act.map(function(r){ return row(r,false); }).join(""):'<div class="asM">'+E(T("ഇതുവരെ ചേർത്തിട്ടില്ല","None yet"))+'</div>')+'</div>'+
   (past.length?'<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("മുൻ ഭാരവാഹികൾ","Past office bearers"))+'</div>'+past.map(function(r){ return row(r,true); }).join("")+'</div>':'');
  return {title:T("ഭാരവാഹികൾ","Office bearers"),html:h};
 });
 X.screen("rform",function(id){
  var a=X.A(), r=id?(a.roles||[]).filter(function(x){ return x.id===id; })[0]:null, ms=X.members().filter(function(m){ return m.status!=="l"; });
  var key=r?(POSTS.filter(function(p){ return p[2]===r.title||p[1]===r.title; })[0]||["other"])[0]:"secretary";
  var h='<div class="asC"><label>'+E(T("സ്ഥാനം","Post"))+'</label><div>'+chips("rpost",POSTS.map(function(p){ return [p[0],T(p[1],p[2])]; }),key)+'</div>'+
   '<div id="tcAsRoth"'+(key==="other"?'':' hidden')+'><label>'+E(T("സ്ഥാനത്തിന്റെ പേര്","Name of the post"))+'</label><input id="tcAsRt" value="'+E(r&&key==="other"?r.title:"")+'"></div>'+
   (X.coms().length?'<label>'+E(T("ഏത് കമ്മിറ്റിയിലെ സ്ഥാനം (അവർക്ക് ആ കമ്മിറ്റിയും അതിന് താഴെയുള്ളവയും മാത്രം കാണാം)","Post in which committee (they see only that committee and those below it)"))+'</label>'+X.comSelect("tcAsRc",r?(X.comOf(r)||"_"):(X.myRoot()||"_")):'')+
   '<label>'+E(T("മെമ്പർ","Member"))+'</label><select id="tcAsRm"><option value="">-</option>'+ms.map(function(m){ return '<option value="'+m.id+'" data-ph="'+E(m.ph||"")+'"'+(r&&r.mid===m.id?' selected':'')+'>'+E((m.no?m.no+". ":"")+m.name)+'</option>'; }).join("")+'</select>'+
   '<label>'+E(T("മൊബൈൽ നമ്പർ (ഇതിൽ ലോഗിൻ ചെയ്യണം)","Mobile number (they log in with it)"))+'</label><input id="tcAsRp" type="tel" value="'+E(r?r.ph:"")+'">'+
   '<label>'+E(T("അനുമതി","Access"))+'</label><div>'+chips("racc",[["admin",accTxt("admin")],["edit",accTxt("edit")],["view",accTxt("view")]],r?r.access:"admin")+'</div>'+
   '<label>'+E(T("മുതൽ","From"))+'</label><input id="tcAsRf" type="date" value="'+E(r?r.from:X.today())+'">'+
   '<span class="asBtn g" onclick="tcAsSaveRole(\''+(r?r.id:"")+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span>'+(r?'<span class="asBtn r" onclick="tcAsEndRole(\''+r.id+'\')">'+E(T("കാലാവധി അവസാനിപ്പിക്കുക","End term"))+'</span>':'')+'</div>';
  return {title:r?T("ഭാരവാഹി","Office bearer"):T("പുതിയ ഭാരവാഹി","New office bearer"),html:h,after:function(){
   window.tcAsChip_rpost=function(k){ var o=$("tcAsRoth"); if(o) o.hidden=k!=="other"; var p=POSTS.filter(function(x){ return x[0]===k; })[0]; if(p&&!id){ document.querySelectorAll('#tcAs .asCh[data-g="racc"]').forEach(function(e){ e.classList.toggle("on",e.getAttribute("data-v")===p[3]); }); } };
   var sel=$("tcAsRm"); if(sel) sel.onchange=function(){ var o=sel.options[sel.selectedIndex], ph=o&&o.getAttribute("data-ph"); if(ph&&!v("tcAsRp")) $("tcAsRp").value=ph; };
  }};
 });
 function sendRole(r,del){
  var a=X.A(); if(!Array.isArray(a.roles)) a.roles=[];
  var i=-1; a.roles.forEach(function(x,k){ if(x.id===r.id) i=k; }); if(i>=0) a.roles[i]=r; else a.roles.push(r);
  if(!Array.isArray(a.q)) a.q=[];
  a.q=a.q.filter(function(o){ return !(o.kind==="role"&&o.id===r.id); }); a.q.push({kind:"role",id:r.id,data:JSON.parse(JSON.stringify(r)),del:del?1:0});
  X.sv(); return sync();
 }
 window.tcAsSaveRole=function(id){
  var a=X.A(), k=chipVal("rpost")||"other", p=POSTS.filter(function(x){ return x[0]===k; })[0];
  var title=k==="other"?v("tcAsRt"):(p?p[2]:""); if(!title){ X.say(T("സ്ഥാനത്തിന്റെ പേര് നൽകുക","Enter the post")); return; }
  var ph=v("tcAsRp").replace(/\D/g,"").slice(-10); if(ph.length!==10){ X.say(why("bad_phone")); return; }
  var old=id?(a.roles||[]).filter(function(x){ return x.id===id; })[0]:null;
  var r=Object.assign({},old||{id:X.uid()},{title:title,mid:v("tcAsRm"),ph:ph,access:chipVal("racc")||"view",from:v("tcAsRf")||X.today()});
  if(X.coms().length) r.com=X.comVal("tcAsRc");
  delete r._by; delete r._at;
  sendRole(r,false).then(function(){ X.back(); });
 };
 window.tcAsEndRole=function(id){
  var a=X.A(), old=(a.roles||[]).filter(function(x){ return x.id===id; })[0]; if(!old) return;
  if(!confirm(T(old.title+" - കാലാവധി ഇന്ന് അവസാനിപ്പിക്കട്ടെ? അവരുടെ അനുമതി ഉടനെ പോകും.",old.title+" - end the term today? Their access goes at once."))) return;
  var y=new Date(Date.now()-86400000).toISOString().slice(0,10);
  var r=Object.assign({},old,{to:y}); delete r._by; delete r._at;
  sendRole(r,false).then(function(){ X.back(); });
 };

 window.tcAsHandover=function(){
  var a=X.A(), ad=(a.roles||[]).filter(function(r){ return !r.del&&!(r.to&&r.to<X.today())&&r.access==="admin"&&r.ph!==String(me()).slice(-10); });
  if(!ad.length){ X.say(T("ആദ്യം പുതിയ ആളെ \"അഡ്മിൻ\" അനുമതിയോടെ ഭാരവാഹിയായി ചേർക്കുക","First add the new person as an office bearer with \"Admin\" access")); return; }
  var list=ad.map(function(r,i){ return (i+1)+". "+r.title+" "+r.ph; }).join("\n");
  var n=prompt(T("ആർക്ക് കൈമാറണം? നമ്പർ ടൈപ്പ് ചെയ്യുക:\n","Hand over to whom? Type the number:\n")+list,"1"); if(n==null) return;
  var r=ad[(parseInt(n,10)||0)-1]; if(!r) return;
  if(!confirm(T(r.title+" ("+r.ph+")-ക്ക് സംഘടന കൈമാറട്ടെ? നിങ്ങൾക്ക് ഭാരവാഹി സ്ഥാനം ഇല്ലെങ്കിൽ നിങ്ങളുടെ അനുമതി പോകും.","Hand the organisation over to "+r.title+" ("+r.ph+")? If you hold no post, your access ends."))) return;
  api("handover",{pid:pidNum(),to:r.ph}).then(function(res){ if(res&&res.ok){ X.say(T("കൈമാറി ✓","Handed over ✓")); sync(); } else X.say(res&&res.error==="not_registered"?T("ആ നമ്പർ ഇതുവരെ ആപ്പിൽ ലോഗിൻ ചെയ്തിട്ടില്ല","That number has not logged in to the app yet"):why(res&&res.error)); });
 };

 /* ---------- activity log ---------- */
 X.screen("log",function(){
  var h='<div class="asC" id="tcAsLog"><div class="asM">'+E(T("ലോഡ് ചെയ്യുന്നു...","Loading..."))+'</div></div>';
  return {title:T("മാറ്റങ്ങളുടെ രേഖ","Activity log"),html:h,after:function(){
   api("log",{pid:pidNum()}).then(function(r){ var el=$("tcAsLog"); if(!el) return;
    if(!r||!r.ok){ el.innerHTML='<div class="asM">'+E(why(r&&r.error))+'</div>'; return; }
    var K={member:T("മെമ്പർ","Member"),pay:T("രസീത്","Receipt"),led:T("വരവ്-ചെലവ്","Ledger"),min:T("മിനിറ്റ്സ്","Minutes"),act:T("നടപടി","Action"),role:T("ഭാരവാഹി","Office bearer"),cfg:T("സെറ്റിംഗ്സ്","Settings"),book:T("പുസ്തകം","Book")};
    var A2={add:T("ചേർത്തു","added"),edit:T("മാറ്റി","changed"),cancel:T("റദ്ദാക്കി","cancelled"),init:T("ക്ലൗഡിലേക്ക്","to cloud")};
    var nm={}; X.members().forEach(function(m){ var p=String(m.ph||"").replace(/\D/g,"").slice(-10); if(p) nm[p]=m.name; }); (X.A().roles||[]).forEach(function(x){ if(x.ph&&!nm[x.ph]) nm[x.ph]=x.title; });
    var who=function(ph){ var p=String(ph||"").replace(/\D/g,"").slice(-10); return (nm[p]?nm[p]+" ":"")+(ph||""); };
    el.innerHTML=(r.log||[]).map(function(l){ return '<div class="asR"><div style="flex:1;min-width:0"><div><b>'+E(K[l.kind]||l.kind)+'</b> '+E(A2[l.action]||l.action)+' · '+E(l.summary||"")+'</div><div class="asM">'+E(dmy((l.at||"").slice(0,10))+" "+(l.at||"").slice(11,16)+" · "+who(l.by_mobile))+'</div></div></div>'; }).join("")||'<div class="asM">'+E(T("ഒന്നുമില്ല","Nothing yet"))+'</div>';
   });
  }};
 });

 /* ---------- "My organisations" + "My membership" ---------- */
 var mine=null;
 function loadMine(force){
  var m=me(); if(!m) return;
  var key="tc_assoc_mine:"+m, c=null; try{ c=JSON.parse(localStorage.getItem(key)||"null"); }catch(e){}
  if(c&&!force&&Date.now()-c.t<6*3600000){ mine=c.d; place(); return; }
  api("mine",{}).then(function(r){ if(!r||!r.ok) return; mine={orgs:r.orgs||[],member:r.member||[]}; try{ localStorage.setItem(key,JSON.stringify({t:Date.now(),d:mine})); }catch(e){} place(); });
 }
 function memberDues(x){ var paid={}; (x.pays||[]).forEach(function(p){ (p.periods||[]).forEach(function(q){ paid[q]=1; }); }); return X.duesC(x.cfg||{},x.member||{},paid); }
 function memberAmt(x){ return X.memAmtC(x.cfg||{},x.member||{}); }
 function place(){
  var c=$("tcAsMine"); if(!mine||(!mine.orgs.length&&!mine.member.length)){ if(c) c.remove(); return; }
  var anchor=$("tcPersCard"); if(!anchor||!anchor.parentNode){ if(c) c.remove(); return; }
  var orgs=mine.orgs.filter(function(o){ return !o.own; });
  if(!orgs.length&&!mine.member.length){ if(c) c.remove(); return; }
  if(!c){ c=document.createElement("div"); c.id="tcAsMine"; c.style.cssText="background:#fff;border-radius:16px;padding:10px 12px;margin:0 0 12px;box-shadow:0 1px 4px rgba(0,0,0,.08)"; }
  var h='';
  if(orgs.length) h+='<div style="font-weight:800;color:#0b4f5a;margin-bottom:4px">&#128101; '+E(T("എന്റെ സംഘടനകൾ","My organisations"))+'</div>'+orgs.map(function(o){ return '<div onclick="tcAssocOpenOrg('+(+o.pid)+')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #eef2f3;cursor:pointer"><div style="flex:1;min-width:0"><b>'+E(o.name)+'</b><div style="font-size:12px;color:#6b7c85">'+E(o.title||"")+'</div></div><span style="font-size:20px;color:#0b6f7d">&#8250;</span></div>'; }).join("");
  if(mine.member.length) h+='<div style="font-weight:800;color:#0b4f5a;margin:'+(orgs.length?'8px':'0')+' 0 4px">&#127915; '+E(T("എന്റെ അംഗത്വം","My membership"))+'</div>'+mine.member.map(function(x,i){ var d=memberDues(x); return '<div onclick="tcAsMyMember('+i+')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #eef2f3;cursor:pointer"><div style="flex:1;min-width:0"><b>'+E(x.org)+'</b><div style="font-size:12px;color:'+(d.length?"#a12d2d":"#1c6b2c")+'">'+E((x.member.no?T("നമ്പർ","No.")+" "+x.member.no+" · ":"")+(d.length?d.length+" "+T("ബാക്കി","due")+" · "+money(d.length*memberAmt(x)):T("ബാക്കിയില്ല ✓","no dues ✓")))+'</div></div><span style="font-size:20px;color:#0b6f7d">&#8250;</span></div>'; }).join("");
  if(c.getAttribute("data-h")!==h){ c.innerHTML=h; c.setAttribute("data-h",h); }
  if(c.previousElementSibling!==anchor) anchor.parentNode.insertBefore(c,anchor.nextSibling);
 }
 window.tcAssocOpenOrg=function(pid){
  var X2=window.__tcAs; X2.setPid(String(pid)); var a=X2.A(); if(a){ a.cloud=true; if(!a.rev) a.rev=0; }
  X2.open("home"); X2.setPid(String(pid)); sync();
 };
 window.tcAsMyMember=function(i){
  var x=mine&&mine.member[i]; if(!x) return;
  var d=memberDues(x), o=document.createElement("div"); o.id="tcAsMy";
  o.style.cssText="position:fixed;inset:0;z-index:9001;background:rgba(0,0,0,.45);display:flex;align-items:flex-end";
  o.innerHTML='<div style="background:#fff;width:100%;max-height:85vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px"><div style="display:flex;align-items:center"><b style="flex:1;font-size:17px">'+E(x.org)+'</b><button type="button" onclick="document.getElementById(\'tcAsMy\').remove()" style="border:0;background:#eef2f3;border-radius:10px;padding:6px 10px;margin:0;min-height:0">&#10005;</button></div>'+
   '<div style="color:#6b7c85;font-size:13px">'+E(x.member.name+(x.member.no?" · "+T("നമ്പർ","No.")+" "+x.member.no:"")+(x.member.area?" · "+x.member.area:""))+'</div>'+
   '<div style="margin:10px 0;padding:10px;border-radius:12px;background:'+(d.length?"#fdecec":"#eef8f0")+'"><b>'+E(d.length?T(X.TYc(x.cfg).sub[0]+" ബാക്കി",X.TYc(x.cfg).sub[1]+" due")+": "+d.length+" × "+money(memberAmt(x))+" = "+money(d.length*memberAmt(x)):T("ബാക്കിയില്ല ✓","No dues ✓"))+'</b>'+(d.length?'<div style="font-size:12.5px;margin-top:3px">'+E(d.map(X.perLabel).join(", "))+'</div>':'')+'</div>'+
   '<div style="font-weight:700;margin:6px 0">'+E(T("എന്റെ രസീതുകൾ","My receipts"))+'</div>'+((x.pays||[]).map(function(p){ return '<div style="display:flex;padding:6px 0;border-top:1px solid #eef2f3"><div style="flex:1">'+E((p.rc||"")+" · "+dmy(p.date))+'<div style="font-size:12px;color:#6b7c85">'+E((p.periods||[]).map(X.perLabel).join(", "))+'</div></div><b>'+money(p.amt)+'</b></div>'; }).join("")||'<div style="color:#6b7c85">'+E(T("ഇല്ല","None"))+'</div>')+'</div>';
  o.onclick=function(e){ if(e.target===o) o.remove(); };
  document.body.appendChild(o);
 };
 (function(){
  var tm=0, started=false;
  function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ if(!started&&me()){ started=true; loadMine(false); } place(); }catch(e){ if(window.console) console.error("tc-assoc3",e); } },400); }
  function start(){ var app=$("app"); if(!app||!window.MutationObserver) return; new MutationObserver(later).observe(app,{childList:true,subtree:true}); later(); }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 })();
 window.__tcAsMine=function(force){ loadMine(force); return mine; };
})();
