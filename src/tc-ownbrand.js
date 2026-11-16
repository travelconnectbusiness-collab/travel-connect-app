/* "My name only" bills (tc-ownbrand.js, loaded by tc-regdocs.js).
   Every bill, invoice and quotation carries the Travel Connect strip on top (logo, name, phone, site). A business that has PAID for Platinum - any kind of business,
   taxi / travel too - may switch that strip off and bill under its own name only. Owner's rule (2026-11-16): never in a free period (a shop's free year, a taxi's
   free months) and never on Plus / Premium; only while Platinum is really running on that business.
   - tcPaidPlatinum(): the answer of /api/upgrade?action=status for THIS business (tc-upgrade.js stores tc_pp:<partner id> = 1 only for plan premium + platinum, or the owner plan).
   - The switch: Menu > "Bill: my name only" (every business type), and on the bill sheets of the shop / documents (tcBrandToggleHtml).
   - What it does: printContent() pages (taxi bill, quotation, shop / work documents; print, picture) lose the strip; the taxi bill's jsPDF header skips the
     Travel Connect lines and logo; tdHtml (tc-docsprint.js) asks tcBillOwnName() for the PDF file.
   The choice is kept in db.business.noTcBrand; it only works while tcPaidPlatinum() is true, so it falls back by itself when Platinum ends. */
(function(){
 if(window.__tcOwnBrand) return;
 window.__tcOwnBrand=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 function say(m){ try{ toast(m); }catch(e){} }
 function DB(){ try{ return typeof db!=="undefined"&&db?db:null; }catch(e){ return null; } }
 function pid(){ var d=DB(); return d&&d.settings&&d.settings.myPartnerId!=null?String(d.settings.myPartnerId):""; }
 function paid(){ try{ var p=pid(); return !!p&&localStorage.getItem("tc_pp:"+p)==="1"; }catch(e){ return false; } }
 function wants(){ var d=DB(); return !!(d&&d.business&&d.business.noTcBrand); }
 function own(){ return wants()&&paid(); }
 window.tcPaidPlatinum=paid;
 window.tcBillOwnName=own;

 function setChk(v){ var c=document.querySelectorAll(".tcBrandChk"); for(var i=0;i<c.length;i++) c[i].checked=!!v; }
 function apply(on){
  var d=DB(); if(!d) return;
  d.business=d.business||{}; d.business.noTcBrand=on?1:0; try{ save(); }catch(e){}
  setChk(on);
  say(on?B("Bills now carry your name only","ഇനി ബില്ലിൽ നിങ്ങളുടെ പേര് മാത്രം"):B("Bills will show Travel Connect","ബില്ലിൽ Travel Connect കാണിക്കും"));
 }
 window.tcBrandToggle=function(on){
  if(!on){ apply(false); return; }
  if(paid()){ apply(true); return; }
  /* not known as paid Platinum on this phone: ask the server once before refusing */
  setChk(false);
  var done=function(){ if(paid()) apply(true); else say(B("Billing under your own name only needs a paid Platinum plan","സ്വന്തം പേര് മാത്രം വയ്ക്കാൻ പണമടച്ച Platinum പ്ലാൻ വേണം")); };
  try{ if(typeof window.tcPlanSync==="function"){ window.tcPlanSync(true).then(done,done); return; } }catch(e){}
  done();
 };
 window.tcBrandToggleHtml=function(){
  var p=paid(), on=own();
  return '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13.5px;flex-direction:row;font-weight:500;'+(p?'':'opacity:.75')+'"><input type="checkbox" class="tcBrandChk" '+(on?'checked ':'')+'onchange="tcBrandToggle(this.checked)" style="width:auto;margin:0;flex:none"> <span>'+E(B("Hide the Travel Connect name and logo on bills - my name only","ബില്ലിൽ Travel Connect പേരും ലോഗോയും കാണിക്കണ്ട - എന്റെ പേര് മാത്രം"))+(p?'':' <b>(Platinum)</b>')+'</span></label>';
 };
 window.tcBrandOpen=function(){
  try{ if(typeof window.tcPlanSync==="function") window.tcPlanSync(); }catch(e){}
  try{ modal('<h2>'+E(B("Bill: my name only","ബില്ല്: എന്റെ പേര് മാത്രം"))+'</h2><p class="muted" style="font-size:13px">'+E(B("Your bills, invoices and quotations show the Travel Connect name, logo and phone on top. With a paid Platinum plan you can switch that off, so only your own business name is printed.","നിങ്ങളുടെ ബില്ലുകളിലും ഇൻവോയ്സുകളിലും ക്വട്ടേഷനുകളിലും മുകളിൽ Travel Connect പേരും ലോഗോയും ഫോണും കാണിക്കും. പണമടച്ച Platinum പ്ലാൻ ഉണ്ടെങ്കിൽ അത് ഓഫ് ചെയ്യാം - അപ്പോൾ നിങ്ങളുടെ ബിസിനസ് പേര് മാത്രം പ്രിന്റ് ആകും."))+'</p>'+
   window.tcBrandToggleHtml()+'<div class="actions" style="margin-top:12px"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>'); }catch(e){}
 };

 /* ---- printed / picture pages: take the Travel Connect strip out of the page ---- */
 function strip(html){
  try{
   var t=document.createElement("template"); t.innerHTML=String(html==null?"":html);
   var d=DB(), nm=String((d&&d.platform&&d.platform.name)||"Travel Connect").toUpperCase(), L=t.content.querySelectorAll("div[style]");
   for(var i=0;i<L.length;i++){
    var st=(L[i].getAttribute("style")||"").replace(/\s+/g,"");
    if(st.indexOf("border-bottom:1pxsolid#ddd")>=0&&st.indexOf("padding-bottom:6px")>=0&&L[i].textContent.toUpperCase().indexOf(nm)>=0){ L[i].parentNode.removeChild(L[i]); return t.innerHTML; }
   }
  }catch(e){}
  return html;
 }
 window.tcOwnBrandStrip=strip;
 var op=window.printContent;
 if(typeof op==="function") window.printContent=function(title,html,asImage){ return op.call(this,title,own()?strip(html):html,asImage); };

 /* ---- the taxi bill / quotation PDF (jsPDF): skip the Travel Connect lines and logo of the header ---- */
 var oh=window.tcPdfBrandedHeader;
 if(typeof oh==="function") window.tcPdfBrandedHeader=function(doc){
  if(!own()||!doc) return oh.apply(this,arguments);
  var d=DB(), P=(d&&d.platform)||{}, site=""; try{ site=typeof TC_WEBSITE!=="undefined"?TC_WEBSITE:""; }catch(e){}
  var hide={}; [String(P.name||"Travel Connect").toUpperCase(),P.tagline,[P.email,site].filter(Boolean).join("   |   "),[P.phone1,P.phone2].filter(Boolean).join("  |  ")].forEach(function(s){ if(s) hide[s]=1; });
  var ot=doc.text, oi=doc.addImage, logo=""; try{ logo=typeof tcLogoUri==="function"?tcLogoUri():""; }catch(e){}
  doc.text=function(s){ if(typeof s==="string"&&hide[s]) return doc; return ot.apply(doc,arguments); };
  doc.addImage=function(img){ if(logo&&img===logo) return doc; return oi.apply(doc,arguments); };
  try{ return oh.apply(this,arguments); }finally{ doc.text=ot; doc.addImage=oi; }
 };

 /* ---- Menu entry (every business type; not for customers) ---- */
 function notCustomer(){ try{ var u=getCurrentUser(); return !!u&&u.role!=="customer"&&!!pid(); }catch(e){ return false; } }
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var body=$("modalBody");
   if(body&&notCustomer()&&!body.querySelector("#tcOwnBrandMenu")&&typeof tcMenuItem==="function"){
    var w=document.createElement("div"); w.id="tcOwnBrandMenu";
    w.innerHTML=tcMenuItem('<path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect>',B("Bill: my name only (Platinum)","ബില്ല്: എന്റെ പേര് മാത്രം (Platinum)"),"tcBrandOpen()");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(w,at); else body.appendChild(w);
   }
  }catch(e){}
  return r;
 };
})();
