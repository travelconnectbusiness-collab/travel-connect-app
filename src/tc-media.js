/* ============================================================================
   tc-media.js  -  "Shop window" for businesses (server: /api/partners, partner_media.js)
     Plus and above, shop / store : ONE shop photo
     Premium, every category      : TWO small ad posts (picture + short text) and links to the business's
                                    Instagram, Facebook, YouTube and Google page (no video files - a video is just a link)
   - adds a "Shop window" card to the owner dashboard (below the Verification & Plan card)
   - shows the photo, ad posts and link buttons inside every Directory listing (only what the plan allows)
   Pictures are shrunk on the phone first (tc-img.js). Replacing or removing a picture deletes the old file from the
   storage at once (done by the server), so the free storage never fills with old posters.
   Loaded by the loader at the end of tc-regdocs.js, so index.html never changes.
   ========================================================================== */
(function(){
"use strict";
if(window.__tcMedia) return; window.__tcMedia=true;

const bl=(en,ml)=>(typeof tcBl==="function"?tcBl(en,ml):en);
const E=(v)=>(typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])));
const say=(m)=>{ try{ toast(m); }catch(e){ alert(m); } };
const API="/api/partners";
const LINKS=[["instagram","Instagram","&#128247;"],["facebook","Facebook","&#128101;"],["youtube","YouTube","&#9654;"],["google","Google","&#128269;"]];
const imgUrl=(pid,kind,n,v)=>API+"?action=media_image&partner_id="+encodeURIComponent(pid)+"&kind="+kind+(n?"&n="+n:"")+"&v="+encodeURIComponent(v||1);

function ownerCreds(){
 let u=null; try{ u=getCurrentUser(); }catch(e){}
 const pid=(typeof db!=="undefined"&&db.settings)?db.settings.myPartnerId:null;
 if(!u||!pid) return null;
 return {partner_id:pid,mobile:u.mobile,role:u.role};
}
async function getJson(url){
 try{ const r=await fetch(url); return (await r.json())||{ok:false,error:"bad_response"}; }
 catch(e){ return {ok:false,error:"network"}; }
}
async function send(action,body){
 try{
  const isForm=(typeof FormData!=="undefined"&&body instanceof FormData);
  const r=await fetch(API+"?action="+action,isForm?{method:"POST",body:body}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  return (await r.json())||{ok:false,error:"bad_response"};
 }catch(e){ return {ok:false,error:"network"}; }
}
function errText(d){
 const m={
  not_plus:bl("Shop photo needs a Plus or Premium plan.","ഷോപ്പ് ഫോട്ടോയ്ക്ക് പ്ലസ് അല്ലെങ്കിൽ പ്രീമിയം പ്ലാൻ വേണം."),
  not_premium:bl("This needs a Premium plan.","ഇതിന് പ്രീമിയം പ്ലാൻ വേണം."),
  too_big:bl("Picture is too big. Choose a smaller one.","ചിത്രം വളരെ വലുതാണ്. ചെറിയ ചിത്രം തിരഞ്ഞെടുക്കുക."),
  not_image:bl("Only JPG, PNG or WebP pictures.","JPG, PNG, WebP ചിത്രങ്ങൾ മാത്രം."),
  add_picture_first:bl("Add the picture first.","ആദ്യം ചിത്രം ചേർക്കുക."),
  no_file:bl("Choose a picture first.","ആദ്യം ഒരു ചിത്രം തിരഞ്ഞെടുക്കുക."),
  bad_link:bl("This link does not look right for "+(d&&d.field?d.field:"that site")+". Paste the full link.",(d&&d.field?d.field:"")+" ലിങ്ക് ശരിയല്ല. മുഴുവൻ ലിങ്ക് പേസ്റ്റ് ചെയ്യുക."),
  network:bl("No internet. Try again.","ഇന്റർനെറ്റ് ഇല്ല. വീണ്ടും ശ്രമിക്കുക."),
  unauthorized:bl("Not allowed for this login.","ഈ ലോഗിന് അനുവാദമില്ല.")
 };
 return m[d&&d.error]||bl("Could not save. Try again.","സേവ് ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കുക.");
}

/* ======================================================================
   1) OWNER SIDE - the "Shop window" card
   ====================================================================== */
let st=null, stPid=null;

function injectCard(){
 const c=ownerCreds(); if(!c||c.role==="customer") return;
 const cur=document.querySelector("#tcMediaCard");
 if(cur){ if(String(cur.getAttribute("data-pid"))!==String(c.partner_id)) loadCard(); return; }
 const anchor=document.querySelector("#tcUpCard"); if(!anchor) return;
 anchor.insertAdjacentHTML("afterend",'<div class="card" id="tcMediaCard" data-pid="'+E(c.partner_id)+'"><h3>&#128444; '+bl("Shop window","ഷോപ്പ് വിൻഡോ")+'</h3><p class="muted">'+bl("Loading...","ലോഡ് ചെയ്യുന്നു...")+'</p></div>');
 loadCard();
}
async function loadCard(){
 const box=document.querySelector("#tcMediaCard"); if(!box) return;
 const c=ownerCreds(); if(!c){ box.remove(); return; }
 box.setAttribute("data-pid",c.partner_id);
 const d=await getJson(API+"?action=media_mine&partner_id="+encodeURIComponent(c.partner_id)+"&mobile="+encodeURIComponent(c.mobile));
 if(!d.ok){ box.remove(); return; }   /* e.g. admin previewing a page */
 st=d; stPid=c.partner_id;
 render();
}
function thumb(kind,n,has){
 const c=ownerCreds(); if(!c||!has) return "";
 return '<img src="'+imgUrl(c.partner_id,kind,n,st.v)+'" alt="" style="width:100%;max-height:170px;object-fit:cover;border-radius:10px;margin:6px 0;background:#eee">';
}
function render(){
 const box=document.querySelector("#tcMediaCard"); if(!box||!st) return;
 const d=st; let h='<h3>&#128444; '+bl("Shop window","ഷോപ്പ് വിൻഡോ")+'</h3>';
 if(!d.can_photo&&!d.can_extras){
  h+='<p class="muted" style="font-size:12.5px">'+bl(
   "Premium businesses can show 2 ad posts (picture + short text) and their Instagram, Facebook, YouTube and Google links to customers in the Directory. Shops with Plus can add a shop photo.",
   "പ്രീമിയം ബിസിനസ്സുകൾക്ക് 2 പരസ്യ പോസ്റ്റുകളും (ചിത്രം + ചെറിയ വാചകം) ഇൻസ്റ്റാഗ്രാം, ഫേസ്ബുക്ക്, യൂട്യൂബ്, ഗൂഗിൾ ലിങ്കുകളും ഡയറക്ടറിയിൽ കസ്റ്റമർമാരെ കാണിക്കാം. പ്ലസ് ഉള്ള ഷോപ്പുകൾക്ക് ഷോപ്പ് ഫോട്ടോ ചേർക്കാം.")+'</p>';
  box.innerHTML=h; return;
 }
 if(d.can_photo){
  h+='<div style="margin-top:6px"><b>'+bl("Shop photo","ഷോപ്പ് ഫോട്ടോ")+'</b>'+thumb("photo",0,d.photo)
   +'<div class="actions"><input type="file" id="tcMdPhoto" accept="image/*" style="display:none" onchange="tcMediaPick(\'photo\')">'
   +'<button class="primary" onclick="document.getElementById(\'tcMdPhoto\').click()">'+(d.photo?bl("Change photo","ഫോട്ടോ മാറ്റുക"):bl("Add shop photo","ഷോപ്പ് ഫോട്ടോ ചേർക്കുക"))+'</button>'
   +(d.photo?'<button onclick="tcMediaRemove(\'photo\')">'+bl("Remove","ഒഴിവാക്കുക")+'</button>':"")+'</div></div>';
 }else if(d.business_type==="shop"){
  h+='<p class="muted" style="font-size:12.5px">'+bl("Shop photo is available from the Plus plan.","ഷോപ്പ് ഫോട്ടോ പ്ലസ് പ്ലാൻ മുതൽ ലഭ്യമാണ്.")+'</p>';
 }
 if(d.can_extras){
  h+='<hr><b>'+bl("Ad posts (picture + short text)","പരസ്യ പോസ്റ്റുകൾ (ചിത്രം + ചെറിയ വാചകം)")+'</b>';
  d.posts.forEach(p=>{
   const k="post"+p.n;
   h+='<div style="border:1px solid #e3e3e3;border-radius:10px;padding:8px;margin-top:8px"><b>'+bl("Post ","പോസ്റ്റ് ")+p.n+'</b>'+thumb("post",p.n,p.has)
    +'<input type="file" id="tcMd_'+k+'" accept="image/*" style="display:none" onchange="tcMediaPick(\''+k+'\')">'
    +'<input type="text" id="tcMdCap_'+k+'" maxlength="120" value="'+E(p.text)+'" placeholder="'+bl("Short text (max 120 letters)","ചെറിയ വാചകം (120 അക്ഷരം വരെ)")+'" style="width:100%;box-sizing:border-box;margin-top:6px">'
    +'<div class="actions"><button class="primary" onclick="document.getElementById(\'tcMd_'+k+'\').click()">'+(p.has?bl("Change picture","ചിത്രം മാറ്റുക"):bl("Add picture","ചിത്രം ചേർക്കുക"))+'</button>'
    +(p.has?'<button onclick="tcMediaCaption(\''+k+'\')">'+bl("Save text","വാചകം സേവ്")+'</button><button onclick="tcMediaRemove(\''+k+'\')">'+bl("Remove","ഒഴിവാക്കുക")+'</button>':"")+'</div></div>';
  });
  h+='<hr><b>'+bl("Social links","സോഷ്യൽ ലിങ്കുകൾ")+'</b><p class="muted" style="font-size:12px;margin:2px 0 6px">'+bl("Paste the page / channel link. Leave empty to remove.","പേജ് / ചാനൽ ലിങ്ക് പേസ്റ്റ് ചെയ്യുക. ഒഴിവാക്കാൻ ശൂന്യമാക്കുക.")+'</p>';
  LINKS.forEach(l=>{
   h+='<label style="display:block;font-size:12.5px;margin-top:4px">'+l[2]+' '+l[1]+'</label><input type="url" id="tcMdLn_'+l[0]+'" value="'+E(d.links[l[0]]||"")+'" placeholder="https://" style="width:100%;box-sizing:border-box">';
  });
  h+='<div class="actions"><button class="primary" onclick="tcMediaSaveLinks()">'+bl("Save links","ലിങ്കുകൾ സേവ് ചെയ്യുക")+'</button></div>';
 }
 box.innerHTML=h;
}
async function afterChange(d,okMsg){
 if(d.ok){ say(okMsg); await loadCard(); } else say(errText(d));
}
window.tcMediaPick=async function(kind){
 const c=ownerCreds(); if(!c) return;
 const inp=document.getElementById(kind==="photo"?"tcMdPhoto":"tcMd_"+kind); const f=inp&&inp.files&&inp.files[0];
 if(!f) return;
 const fd=new FormData();
 fd.append("partner_id",c.partner_id); fd.append("mobile",c.mobile); fd.append("kind",kind);
 const cap=document.getElementById("tcMdCap_"+kind); if(cap) fd.append("caption",cap.value);
 fd.append("media_image",f,f.name||"photo.jpg");   /* tc-img.js shrinks it on the phone before it is sent */
 say(bl("Uploading...","അപ്‌ലോഡ് ചെയ്യുന്നു..."));
 const d=await send("media_upload",fd);
 if(inp) inp.value="";
 await afterChange(d,bl("Saved","സേവ് ചെയ്തു"));
};
window.tcMediaCaption=async function(kind){
 const c=ownerCreds(); if(!c) return;
 const cap=document.getElementById("tcMdCap_"+kind); if(!cap) return;
 const fd=new FormData();
 fd.append("partner_id",c.partner_id); fd.append("mobile",c.mobile); fd.append("kind",kind); fd.append("caption",cap.value);
 await afterChange(await send("media_upload",fd),bl("Text saved","വാചകം സേവ് ചെയ്തു"));
};
window.tcMediaRemove=async function(kind){
 const c=ownerCreds(); if(!c) return;
 if(!confirm(bl("Remove this picture?","ഈ ചിത്രം ഒഴിവാക്കട്ടെ?"))) return;
 await afterChange(await send("media_remove",{partner_id:c.partner_id,mobile:c.mobile,kind:kind}),bl("Removed","ഒഴിവാക്കി"));
};
window.tcMediaSaveLinks=async function(){
 const c=ownerCreds(); if(!c) return;
 const b={partner_id:c.partner_id,mobile:c.mobile};
 LINKS.forEach(l=>{ const e=document.getElementById("tcMdLn_"+l[0]); if(e) b[l[0]]=e.value.trim(); });
 await afterChange(await send("media_links",b),bl("Links saved","ലിങ്കുകൾ സേവ് ചെയ്തു"));
};

/* ======================================================================
   2) CUSTOMER SIDE - show it inside every Directory listing
   ====================================================================== */
function safeLink(u){ return /^https:\/\//i.test(u||"")?u:""; }
window.tcMediaView=function(src){
 const o=document.createElement("div");
 o.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99999;display:flex;align-items:center;justify-content:center;padding:10px";
 o.onclick=function(){ o.remove(); };
 o.innerHTML='<img src="'+E(src)+'" alt="" style="max-width:100%;max-height:100%;border-radius:8px">';
 document.body.appendChild(o);
};
function mediaHtml(p){
 const m=p.media; if(!m) return "";
 let h="";
 if(m.photo){ const s=imgUrl(p.id,"photo",0,m.photo); h+='<img src="'+E(s)+'" loading="lazy" alt="" onclick="tcMediaView(this.src)" style="width:100%;max-height:190px;object-fit:cover;border-radius:10px;margin-top:6px;background:#eee">'; }
 if(m.posts&&m.posts.length){
  h+='<div style="display:flex;gap:8px;margin-top:6px">'+m.posts.map(x=>{
   const s=imgUrl(p.id,"post",x.n,x.v);
   return '<div style="flex:1;min-width:0"><img src="'+E(s)+'" loading="lazy" alt="" onclick="tcMediaView(this.src)" style="width:100%;height:110px;object-fit:cover;border-radius:8px;background:#eee">'
    +(x.text?'<div style="font-size:12px;margin-top:2px;color:#333">'+E(x.text)+'</div>':"")+'</div>';
  }).join("")+'</div>';
 }
 if(m.links){
  const ch=LINKS.filter(l=>safeLink(m.links[l[0]])).map(l=>'<a href="'+E(safeLink(m.links[l[0]]))+'" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin:6px 6px 0 0;padding:4px 10px;border-radius:14px;border:1px solid #cfd8e3;background:#f5f8fc;color:#0b4f8a;font-size:12.5px;text-decoration:none">'+l[2]+' '+l[1]+'</a>').join("");
  if(ch) h+='<div>'+ch+'</div>';
 }
 return h;
}
function wrapDirectory(){
 if(typeof window.tcRenderDirectoryList!=="function"||window.tcRenderDirectoryList.__tcMedia) return;
 const orig=window.tcRenderDirectoryList;
 const w=function(entries){
  const r=orig.apply(this,arguments);
  try{
   const box=document.querySelector("#tcDirList"); if(!box||!entries) return r;
   const items=box.querySelectorAll(":scope > .listitem");
   entries.forEach((p,i)=>{
    const it=items[i]; if(!it||!p||!p.media||it.querySelector(".tcMediaBox")) return;
    const html=mediaHtml(p); if(!html) return;
    const act=it.querySelector(".actions");
    const wrap=document.createElement("div"); wrap.className="tcMediaBox"; wrap.innerHTML=html;
    if(act) it.insertBefore(wrap,act); else it.appendChild(wrap);
   });
  }catch(e){}
  return r;
 };
 w.__tcMedia=true;
 window.tcRenderDirectoryList=w;
}
wrapDirectory();

/* ======================================================================
   3) keep the owner card present
   ====================================================================== */
(function(){
 let t=null;
 function chk(){ try{ injectCard(); wrapDirectory(); }catch(e){} }
 function start(){
  const app=document.getElementById("app"); if(!app||!window.MutationObserver) return;
  new MutationObserver(()=>{ clearTimeout(t); t=setTimeout(chk,200); }).observe(app,{childList:true,subtree:true});
  chk();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
})();
