/* Emergency Contacts v2 - email column, edit, copy-all / paste-import, country chip.
   Loaded after the other scripts; overrides the older versions by name. */
(function(){
 var ecEditId=null, ecCache=[];
 var COUNTRY={National:{bg:"#e8f5e9",fg:"#1b5e20",txt:"India - National"},Kerala:{bg:"#fff3e0",fg:"#bf360c",txt:"Kerala"},Oman:{bg:"#e3f2fd",fg:"#0d47a1",txt:"Oman"}};
 function split(name){
  var m=/^(National|Kerala|Oman)\s*:\s*(.*)$/i.exec(name||"");
  if(!m) return {c:null,n:name||""};
  var k=m[1][0].toUpperCase()+m[1].slice(1).toLowerCase();
  return {c:k,n:m[2]};
 }
 function chip(c){ if(!c||!COUNTRY[c]) return ""; var o=COUNTRY[c];
  return '<span style="display:inline-block;background:'+o.bg+';color:'+o.fg+';border-radius:10px;padding:2px 8px;font-size:11px;font-weight:800;margin-right:6px">'+o.txt+'</span>'; }
 function get(){ return fetch("/api/emergency?action=list").then(function(r){return r.json();}); }
 function post(o){ o.token=adminToken(); return fetch("/api/emergency",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(o)}).then(function(r){return r.json();}); }

 /* ---------- customer list ---------- */
 window.tcRenderCustEmergencyContacts=async function(){
  var box=document.querySelector("#custEmergencyList"); if(!box) return;
  try{
   var data=await get();
   if(!data.ok||!data.contacts||!data.contacts.length){ box.innerHTML="<p class='muted'>No emergency contacts added yet.</p>"; return; }
   box.innerHTML=data.contacts.map(function(c){
    var s=split(c.name);
    var call=c.number?'<a href="tel:'+esc(c.number)+'" style="text-decoration:none"><button style="background:linear-gradient(135deg,#b03a2e,#e74c3c);color:#fff;border:none;border-radius:24px;padding:11px 18px;font-weight:900;font-size:15px;box-shadow:0 3px 8px rgba(176,58,46,.35)">&#128222; '+esc(c.number)+'</button></a>':"";
    var mail=c.email?'<a href="mailto:'+esc(c.email)+'" style="display:block;color:#1a5276;font-weight:700;font-size:13px;word-break:break-all;margin-top:4px">&#9993; '+esc(c.email)+'</a>':"";
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #f1d3cf"><div style="min-width:0">'+chip(s.c)+'<div style="font-weight:700;color:#7b241c;font-size:15px;margin-top:3px">'+esc(s.n)+'</div>'+mail+'</div>'+call+'</div>';
   }).join("");
  }catch(e){ box.innerHTML="<p class='danger'>Could not load emergency contacts.</p>"; }
 };

 /* ---------- admin page ---------- */
 window.tcRenderEmergencyAdmin=async function(){
  ecEditId=null;
  app().innerHTML=card("Emergency Contacts (Admin)",
   '<p class="muted" style="margin-top:0">Name tip: start with <b>National:</b>, <b>Kerala:</b> or <b>Oman:</b> - the country shows on the customer list. Phone or email (or both).</p>'+
   '<div class="grid"><label>Name<input id="ecName" placeholder="e.g. Oman: Indian Embassy"></label>'+
   '<label>Phone<input id="ecPhone" inputmode="tel"></label>'+
   '<label>Email<input id="ecEmail" type="email" inputmode="email" autocapitalize="off"></label></div>'+
   '<div class="actions"><button class="primary" id="ecSaveBtn" onclick="tcAddEmergencyContact()">Add Contact</button><button id="ecCancelBtn" style="display:none" onclick="tcRenderEmergencyAdmin()">Cancel edit</button></div>'+
   '<h3 style="margin:18px 0 6px">Copy all / Paste &amp; import</h3>'+
   '<p class="muted" style="margin:0 0 6px">One contact per line: <b>Name | Phone | Email</b>. "Copy all" fills this box with every contact. Paste a list here and press Import to add many at once (existing numbers/emails are not duplicated).</p>'+
   '<textarea id="ecBulk" rows="8" style="width:100%;box-sizing:border-box;font-size:13px" placeholder="National: Police | 112 |\nOman: Indian Embassy | 24684500 | cons.muscat@mea.gov.in"></textarea>'+
   '<div class="actions"><button onclick="tcCopyAllEmergency()">Copy all</button><button class="primary" onclick="tcImportEmergency()">Import pasted list</button></div>'+
   '<div id="ecList">Loading...</div>');
  tcLoadEmergencyAdmin();
 };
 window.tcLoadEmergencyAdmin=async function(){
  var box=document.querySelector("#ecList"); if(!box) return;
  try{
   var data=await get(); ecCache=data.ok?data.contacts:[];
   box.innerHTML=ecCache.map(function(c){
    return '<div class="listitem"><b>'+esc(c.name)+'</b>'+(c.number?' - '+esc(c.number):'')+(c.email?'<br><span style="font-size:13px;word-break:break-all">&#9993; '+esc(c.email)+'</span>':'')+
     '<div class="actions" style="margin-top:4px"><button onclick="tcEditEmergency('+c.id+')">Edit</button><button class="danger" onclick="tcDeleteEmergencyContact('+c.id+')">Delete</button></div></div>';
   }).join("")||"<p class='muted'>No contacts yet.</p>";
  }catch(e){ box.innerHTML="<p class='danger'>Network error.</p>"; }
 };
 window.tcEditEmergency=function(id){
  var c=ecCache.filter(function(x){return x.id===id;})[0]; if(!c) return;
  ecEditId=id;
  document.querySelector("#ecName").value=c.name; document.querySelector("#ecPhone").value=c.number||""; document.querySelector("#ecEmail").value=c.email||"";
  document.querySelector("#ecSaveBtn").textContent="Save changes"; document.querySelector("#ecCancelBtn").style.display="";
  document.querySelector("#ecName").scrollIntoView({behavior:"smooth",block:"center"});
 };
 window.tcAddEmergencyContact=async function(){
  var name=document.querySelector("#ecName").value.trim(), phone=document.querySelector("#ecPhone").value.trim(), email=document.querySelector("#ecEmail").value.trim();
  if(!name||(!phone&&!email)){ toast("Enter a name and a phone or email"); return; }
  try{
   var d=await post({action:ecEditId?"update":"add",id:ecEditId,name:name,number:phone,email:email});
   if(!d.ok){ toast(d.error==="bad_email"?"Email looks wrong":"Could not save ("+(d.error||"unknown")+")"); return; }
   toast(ecEditId?"Contact updated":"Contact added");
   ecEditId=null; tcRenderEmergencyAdmin();
  }catch(e){ toast("Network error"); }
 };
 window.tcDeleteEmergencyContact=async function(id){
  if(!confirm("Delete this contact?")) return;
  try{ await post({action:"delete",id:id}); toast("Contact deleted"); tcLoadEmergencyAdmin(); }catch(e){ toast("Network error"); }
 };

 /* ---------- copy all / import ---------- */
 window.tcCopyAllEmergency=async function(){
  try{ var d=await get(); ecCache=d.ok?d.contacts:[]; }catch(e){ toast("Network error"); return; }
  var txt=ecCache.map(function(c){ return [c.name,c.number||"",c.email||""].map(function(v){return String(v).replace(/\|/g,"/").replace(/\s+/g," ").trim();}).join(" | "); }).join("\n");
  var ta=document.querySelector("#ecBulk"); ta.value=txt;
  var done=false;
  try{ await navigator.clipboard.writeText(txt); done=true; }catch(e){}
  if(!done){ try{ ta.focus(); ta.select(); done=document.execCommand("copy"); }catch(e){} }
  toast(done?ecCache.length+" contacts copied":"Select the text in the box and copy it");
 };
 /* pure parser (also used by tests) */
 window.tcParseEmergencyText=function(text){
  var rows=[];
  String(text||"").split(/\r?\n/).forEach(function(line){
   line=line.trim(); if(!line) return;
   if(/^[\s|:\-]+$/.test(line)) return;                 /* markdown separator */
   var cells=line.split("|").map(function(s){return s.trim();});
   if(cells.length&&cells[0]==="") cells.shift();
   if(cells.length&&cells[cells.length-1]==="") cells.pop();
   if(!cells.length||!cells[0]) return;
   if(/^name$/i.test(cells[0])&&cells.slice(1).some(function(c){return /^(number|phone|email|mobile|contact|e-?mail)/i.test(c);})) return; /* header */
   var name=cells[0], phone="", email="";
   var rest=cells.slice(1);
   rest.forEach(function(c){ if(!c) return; if(c.indexOf("@")>-1){ if(!email) email=c.toLowerCase(); } else if(!phone){ phone=c; } });
   if(!phone&&!email) return;
   rows.push({name:name,number:phone,email:email});
  });
  return rows;
 };
 window.tcImportEmergency=async function(){
  var rows=tcParseEmergencyText(document.querySelector("#ecBulk").value);
  if(!rows.length){ toast("Nothing to import - use: Name | Phone | Email"); return; }
  if(!confirm("Import "+rows.length+" lines?")) return;
  try{
   var all={added:0,updated:0,skipped:0,invalid:0};
   for(var i=0;i<rows.length;i+=100){
    var d=await post({action:"bulk_add",rows:rows.slice(i,i+100)});
    if(!d.ok){ toast("Import failed ("+(d.error||"unknown")+")"); return; }
    ["added","updated","skipped","invalid"].forEach(function(k){all[k]+=d[k]||0;});
   }
   toast("Added "+all.added+", updated "+all.updated+", already there "+all.skipped+(all.invalid?", invalid "+all.invalid:""));
   document.querySelector("#ecBulk").value=""; tcLoadEmergencyAdmin();
  }catch(e){ toast("Network error"); }
 };
})();
