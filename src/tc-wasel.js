/* Which WhatsApp app opens (tc-wasel.js, loaded second by tc-regdocs.js).
   Owner's wish 2026-11-02: he has WhatsApp on his main number and WhatsApp Business on his second number. Every "send on WhatsApp" button in the app
   (customer reminder, bill / quotation share, trip report, invite...) opens a wa.me link and Android hands that to ONE of the two apps (the one set as the default),
   so the message always left from the second number.
   Menu > "WhatsApp to use" lets this phone choose: "Phone decides" (the start value - nothing changes), "Choose each time" (the phone's share list, like sharing a file: WhatsApp, Business, Facebook...), "WhatsApp" or "WhatsApp Business".
   For the last two, a wa.me link opened by the app is turned into an Android intent that names the app (com.whatsapp / com.whatsapp.w4b), with the normal wa.me
   link as the fall-back when that app is not installed. Only on Android; iPhone and computers keep the normal link. Stored on this phone only (localStorage tc_wapkg).
   The code that sends is not changed: window.open is wrapped here. */
(function(){
 if(window.__tcWaSel) return;
 window.__tcWaSel=1;
 var K="tc_wapkg", PK={w:"com.whatsapp",b:"com.whatsapp.w4b"};
 var AND=/Android/i.test(navigator.userAgent||"");
 function B(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } }
 function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
 function get(){ try{ var v=localStorage.getItem(K); return (v==="w"||v==="b"||v==="s")?v:""; }catch(e){ return ""; } }
 function put(v){ try{ if(v) localStorage.setItem(K,v); else localStorage.removeItem(K); }catch(e){} }
 /* "https://wa.me/9198...?text=..." -> intent://send?phone=9198...&text=...#Intent;scheme=whatsapp;package=...;S.browser_fallback_url=...;end ; anything else -> "" */
 function toIntent(url,pref){
  var m=/^https?:\/\/wa\.me\/(\d*)(?:\?(.*))?$/i.exec(String(url||"")); if(!m||!PK[pref]) return "";
  var q=[]; if(m[1]) q.push("phone="+m[1]); if(m[2]) q.push(m[2]);
  return "intent://send"+(q.length?"?"+q.join("&"):"")+"#Intent;scheme=whatsapp;package="+PK[pref]+";S.browser_fallback_url="+encodeURIComponent(url)+";end";
 }
 window.tcWaIntent=toIntent;
 window.tcWaPrefGet=get;
 var ow=window.open;
 if(typeof ow==="function") window.open=function(url){
  try{
   var p=get();
   if(p==="s"){   /* the phone's own share list: pick WhatsApp, WhatsApp Business, Facebook ... */
    var sm=/^https?:\/\/wa\.me\/\d*\?(?:.*&)?text=([^&]*)/i.exec(String(url||""));
    if(sm&&typeof navigator.share==="function"){
     var tx=""; try{ tx=decodeURIComponent(sm[1]); }catch(e){ tx=sm[1]; }
     navigator.share({text:tx}).catch(function(er){ if(!er||er.name!=="AbortError") ow.call(window,url,"_blank"); });
     return null;
    }
   }else if(AND&&p){ var it=toIntent(url,p); if(it){ window.location.href=it; return null; } }
  }catch(e){}
  return ow.apply(this,arguments);
 };

 window.tcWaSelOpen=function(){
  var cur=get(), AN=AND;
  var rows=[["",B("Phone decides","ഫോൺ തീരുമാനിക്കും"),B("What the phone has set as its WhatsApp app","ഫോണിൽ സെറ്റ് ചെയ്തിരിക്കുന്ന ആപ്പ്")],
            ["s",B("Choose each time (share list)","ഓരോ തവണയും തിരഞ്ഞെടുക്കാം (ഷെയർ ലിസ്റ്റ്)"),B("The phone's share list opens: tap WhatsApp, Business, Facebook... then the person","ഫോണിന്റെ ഷെയർ ലിസ്റ്റ് തുറക്കും: WhatsApp / Business / Facebook... തൊടുക, പിന്നെ ആളെ തിരഞ്ഞെടുക്കുക")],
            ["w","WhatsApp",B("Your normal WhatsApp (main number)","സാധാരണ WhatsApp (മെയിൻ നമ്പർ)")],
            ["b","WhatsApp Business",B("The Business app (second number)","ബിസിനസ് ആപ്പ് (രണ്ടാമത്തെ നമ്പർ)")]];
  var h='<h3 style="margin:0 0 6px">'+esc(B("WhatsApp to use","ഏത് WhatsApp ആപ്പ്"))+'</h3><p class="muted" style="margin:0 0 8px">'+esc(B("Reminders, bills and other messages open in this app (on this phone).","ഓർമ്മപ്പെടുത്തൽ, ബിൽ തുടങ്ങിയ സന്ദേശങ്ങൾ ഈ ആപ്പിൽ തുറക്കും (ഈ ഫോണിൽ)."))+'</p>';
  rows.forEach(function(r){
   var on=r[0]===cur;
   h+='<div id="tcWa_'+(r[0]||"x")+'" onclick="tcWaSelSet(\''+r[0]+'\')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 12px;margin:6px 0;border-radius:12px;border:2px solid '+(on?'#0b6b78':'#d5dde3')+';background:'+(on?'#e8f5f4':'#fff')+'"><div><b>'+esc(r[1])+'</b><div class="muted" style="font-size:12px">'+esc(r[2])+'</div></div><b style="font-size:17px">'+(on?'&#10003;':'')+'</b></div>';
  });
  if(!AN) h+='<p class="muted" style="font-size:12px;margin-top:8px">'+esc(B("WhatsApp / WhatsApp Business choice works on Android phones only.","WhatsApp / WhatsApp Business തിരഞ്ഞെടുപ്പ് ആൻഡ്രോയിഡ് ഫോണിൽ മാത്രം."))+'</p>';
  h+='<button class="secondary" style="margin-top:8px;width:100%" onclick="closeModal()">'+esc(B("Close","അടയ്ക്കുക"))+'</button>';
  modal(h);
 };
 window.tcWaSelSet=function(v){
  put(v==="w"||v==="b"||v==="s"?v:"");
  try{ window.tcWaSelOpen(); }catch(e){}
 };
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var body=document.getElementById("modalBody");
   if(body&&!body.querySelector("#tcWaSelMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcWaSelMenu";
    var cur=get(), nm=cur==="w"?"WhatsApp":cur==="b"?"WhatsApp Business":cur==="s"?B("choose each time","ഓരോ തവണയും"):B("phone decides","ഫോൺ തീരുമാനിക്കും");
    wrap.innerHTML=tcMenuItem('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"></path>',B("WhatsApp to use","ഏത് WhatsApp ആപ്പ്")+' <span style="font-weight:400;color:#5b6b7a">('+esc(nm)+')</span>',"closeModal();setTimeout(tcWaSelOpen,60)");
    var dm=body.querySelector("#tcDateFmtMenu");
    if(dm&&dm.parentNode) dm.parentNode.insertBefore(wrap,dm.nextSibling);
    else{ var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null; if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap); }
   }
  }catch(e){}
  return r;
 };
})();
