/* ============================================================
   TRAVEL CONNECT - PUBLIC LANDING PAGE (src/landing.js)

   What a first-time visitor sees at travelconnect.dev (from a poster,
   WhatsApp, Facebook, Instagram or Google) BEFORE the login screen:
   a SHORT page (rewritten 2026-11-16): what this is in one line, a clear note
   that this is the website and the app is not open yet, then two numbered
   steps - 1 Install (only the instruction for THIS phone is shown), 2 Open /
   Login. Everything else (business owners, how to register, questions) is
   folded. One language at a time (Malayalam first, English button).

   It is a full-screen layer on top of the app and is NOT shown to:
     - the installed app (standalone mode),
     - anyone already logged in on this browser (tc_user exists),
     - links that carry a #hash or ?query (notification taps, deep links),
     - someone who already tapped "Open the App" in this tab.
   Add ?home=1 to the address to force-preview the website any time.

   ADS / CONTENT - edit the three lists just below. Nothing else needs to
   change. Leave a list empty ([]) and that block simply falls back to
   its "advertise here" or hidden state.
   ============================================================ */

/* Ads shown in the "Featured" section, after the two built-in cards.
   { title:"", text:"", image:"/some-image.jpg", link:"https://...", phone:"9497077078", by:"Shop name" } */
const TC_SITE_ADS=[];

/* Posters shown in the gallery. { src:"/tc-poster.jpg", alt:"Travel Connect poster" } */
const TC_SITE_POSTERS=[{src:"/tc-poster.jpg",alt:"Travel Connect poster - Be Found. Stay Connected. Grow Together."}];

/* YouTube videos: just the video id (the part after v= in the link). */
const TC_SITE_VIDEOS=[];

(function(){
 const PHONE="9497077078", PHONE_SHOW="94970 77078", SITE="https://travelconnect.dev";
 let standalone=false, loggedIn=false, opened=false;
 try{ standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true; }catch(e){}
 try{ loggedIn=!!localStorage.getItem("tc_user"); }catch(e){}
 try{ opened=sessionStorage.getItem("tc_site_opened")==="1"; }catch(e){}
 const forced=/[?&]home=1/.test(location.search);
 /* Harmless tracking/share params (?v=2 for a fresh WhatsApp preview, utm_*, fbclid...) must NOT hide the website. */
 let realQuery=false;
 try{ new URLSearchParams(location.search).forEach((v,k)=>{ if(!/^(v|ref|src|share|home|fbclid|igshid|gclid|utm_[a-z]+)$/i.test(k)) realQuery=true; }); }catch(e){ realQuery=location.search.length>1; }
 if(!forced&&(standalone||loggedIn||opened||location.hash.length>1||realQuery)) return;

 const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const wa=txt=>"https://wa.me/91"+PHONE+"?text="+encodeURIComponent(txt);
 const shareLink="https://wa.me/?text="+encodeURIComponent("Travel Connect - നാട്ടിലെ സേവനങ്ങൾ ഒരൊറ്റ ആപ്പിൽ\nTaxi, auto, pickup, shops, hotels, skilled workers & blood donors near you.\n\n*Play Store-ൽ ഇല്ല.* Android: Chrome-ലും iPhone: Safari-യിലും ഈ ലിങ്ക് തുറന്ന് Install / Add to Home Screen ചെയ്യൂ:\n"+SITE);

 const css=`
#tcLanding{position:fixed;inset:0;z-index:9990;overflow-y:auto;overflow-x:hidden;background:#f2f5f8;color:#132436;font-family:Poppins,"Noto Sans Malayalam","Manjari",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5;-webkit-text-size-adjust:100%}
#tcLanding *{box-sizing:border-box}
#tcLanding a{color:inherit;text-decoration:none}
#tcLanding h1,#tcLanding h2,#tcLanding h3,#tcLanding p{margin:0;padding:0;border:0;background:none}
#tcLanding button{font:inherit;font-weight:700;cursor:pointer;border:0}
#tcLanding svg{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
.tcl-wrap{max-width:560px;margin:0 auto;padding:0 14px}
.tcl-nav{position:sticky;top:0;z-index:5;background:#082b49;color:#fff;padding:calc(10px + env(safe-area-inset-top,0px)) 0 10px}
.tcl-nav .tcl-wrap{display:flex;align-items:center;gap:10px}
.tcl-nav img{width:36px;height:36px;border-radius:10px}
.tcl-nav b{font-size:15px;letter-spacing:1.6px;flex:1}
.tcl-lang{background:rgba(255,255,255,.12);color:#fff;border-radius:999px;padding:7px 13px;font-size:13px}
.tcl-hero{background:#082b49;color:#fff;text-align:center;padding:14px 0 26px;border-radius:0 0 22px 22px}
.tcl-hero h1{font-size:23px;line-height:1.3;font-weight:800}
.tcl-hero p{font-size:14px;opacity:.85;margin-top:6px}
.tcl-note{display:flex;gap:9px;align-items:flex-start;text-align:left;background:#fff6dc;color:#5b4300;border-radius:14px;padding:11px 12px;font-size:13.5px;line-height:1.45;margin:-14px 0 12px;box-shadow:0 4px 14px rgba(8,43,73,.12)}
.tcl-note svg{color:#b07d00;margin-top:1px}
.tcl-card{background:#fff;border-radius:18px;padding:14px;margin:0 0 12px;box-shadow:0 1px 2px rgba(8,43,73,.05),0 6px 18px rgba(8,43,73,.06)}
.tcl-st{display:flex;gap:12px;align-items:flex-start}
.tcl-st>i{font-style:normal;width:30px;height:30px;border-radius:50%;background:#0b6b78;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none}
.tcl-st h2{font-size:17px;font-weight:800;line-height:1.3}
.tcl-st p{font-size:13.5px;color:#55687a;margin-top:2px}
.tcl-btn{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;border-radius:14px;padding:14px 16px;font-weight:800;font-size:16px;margin-top:12px}
.tcl-btn.p{background:#0b6b78;color:#fff;box-shadow:0 4px 12px rgba(11,107,120,.3)}
.tcl-btn.n{background:#082b49;color:#fff}
.tcl-btn.g{background:#1faa59;color:#fff}
.tcl-btn.s{background:#e9eff4;color:#16324a;font-size:14.5px;padding:11px 14px}
.tcl-how{background:#f3f8f9;border:1px solid #d5e6e9;border-radius:12px;padding:10px 12px;font-size:13.5px;margin-top:10px;line-height:1.5}
.tcl-how b{color:#0b4f5a}
.tcl-ok{background:#e8f6ee;border-color:#bfe3cd;color:#145c33}
.tcl-h{font-size:12px;font-weight:800;color:#657888;letter-spacing:1px;text-transform:uppercase;margin:18px 4px 8px}
.tcl-tags{display:flex;flex-wrap:wrap;gap:7px}
.tcl-tags span{background:#e7f2f3;color:#0b4f5a;border-radius:999px;padding:6px 12px;font-size:13.5px;font-weight:600}
.tcl-tags span.r{background:#fdecec;color:#a12d2d}
.tcl-fold{border-top:1px solid #e9eef2}
.tcl-fold:first-of-type{border-top:0}
.tcl-fold summary{list-style:none;display:flex;align-items:center;gap:10px;padding:13px 2px;font-weight:700;font-size:15px;cursor:pointer}
.tcl-fold summary::-webkit-details-marker{display:none}
.tcl-fold summary span{flex:1}
.tcl-fold summary svg{color:#a9b6c1;transition:transform .15s}
.tcl-fold[open] summary svg{transform:rotate(90deg)}
.tcl-fold .in{padding:0 2px 14px;font-size:14px;color:#3d4f60}
.tcl-fold ul,.tcl-fold ol{margin:0;padding-left:20px}
.tcl-fold li{margin:5px 0}
.tcl-ad{border:1px solid #e2e9ef;border-radius:14px;padding:12px;margin-top:10px;font-size:13.5px;color:#3d4f60}
.tcl-ad img{width:100%;border-radius:10px;margin-bottom:8px}
.tcl-ad small{display:block;font-size:11px;color:#8a98a5;letter-spacing:.5px;text-transform:uppercase}
.tcl-ad h3{font-size:15px;color:#132436;margin:2px 0}
.tcl-poster img{width:100%;border-radius:14px;display:block;margin-top:10px}
.tcl-vid{position:relative;padding-top:56.25%;margin-top:10px;border-radius:14px;overflow:hidden}
.tcl-vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.tcl-foot{text-align:center;font-size:12.5px;color:#657888;padding:8px 0 calc(28px + env(safe-area-inset-bottom,0px))}
.tcl-foot .links{display:flex;flex-wrap:wrap;gap:6px 16px;justify-content:center;margin:8px 0}
.tcl-foot a{color:#0b6b78;font-weight:700}
`;
 const CH='<svg width="18" height="18" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>';
 const IC={
  info:'<svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  down:'<svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
  go:'<svg width="20" height="20" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  wa:'<svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 20l1.500-4.500A8 8 0 1 1 8.500 18.500z"/></svg>'
 };
 const ua=navigator.userAgent||"";
 const IOS=/iPhone|iPad|iPod/i.test(ua), ANDROID=/Android/i.test(ua);
 const INAPP=/FBAN|FBAV|FB_IAB|Instagram|Snapchat|Line\/|Telegram|MiuiBrowser|; wv\)/i.test(ua);
 let lang="ml"; try{ if(localStorage.getItem("tc_site_lang")==="en") lang="en"; }catch(e){}
 const T=(ml,en)=>lang==="en"?en:ml;
 const adCard=a=>`<div class="tcl-ad">${a.image?`<img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy">`:""}<small>${T("പരസ്യം","Advertisement")}${a.by?" · "+esc(a.by):""}</small><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p>${a.link?`<a class="tcl-btn s" href="${esc(a.link)}" target="_blank" rel="noopener">${T("കൂടുതൽ അറിയാൻ","Know more")}</a>`:a.phone?`<a class="tcl-btn s" href="tel:+91${esc(a.phone)}">${T("വിളിക്കൂ","Call")} ${esc(a.phone)}</a>`:""}</div>`;

 /* the install instruction for THIS phone only */
 function howHtml(){
  if(INAPP) return T("ഇത് WhatsApp / Facebook / Instagram-നുള്ളിലെ ബ്രൗസർ ആണ്. <b>ഇവിടെ നിന്ന് ഇൻസ്റ്റാൾ ചെയ്യാൻ പറ്റില്ല.</b> ","You are inside the browser of WhatsApp / Facebook / Instagram. <b>The app cannot be installed from here.</b> ")+
   (IOS?T("താഴെയുള്ള <b>⋯</b> അമർത്തി <b>Open in Safari</b> തിരഞ്ഞെടുക്കൂ.","Tap <b>⋯</b> below and choose <b>Open in Safari</b>.")
       :T("മുകളിൽ വലതുവശത്തെ <b>⋮</b> അമർത്തി <b>Open in Chrome</b> തിരഞ്ഞെടുക്കൂ.","Tap <b>⋮</b> at the top right and choose <b>Open in Chrome</b>.")+`<a class="tcl-btn s" href="intent://travelconnect.dev/#Intent;scheme=https;package=com.android.chrome;end">${T("Chrome-ൽ തുറക്കൂ","Open in Chrome")}</a>`);
  if(IOS) return T("iPhone-ൽ: <b>Safari</b>-യിൽ ഈ പേജ് തുറക്കൂ → താഴെയുള്ള <b>Share</b> (⬆) → <b>Add to Home Screen</b>.","On iPhone: open this page in <b>Safari</b> → tap <b>Share</b> (⬆) → <b>Add to Home Screen</b>.");
  if(ANDROID) return T("മുകളിലെ ബട്ടൺ അമർത്തിയിട്ട് ഒന്നും വന്നില്ലെങ്കിൽ: Chrome-ൽ മുകളിൽ വലതുവശത്തെ <b>⋮</b> → <b>Install app</b> / <b>Add to Home screen</b>.","If nothing happens when you tap the button: in Chrome tap <b>⋮</b> at the top right → <b>Install app</b> / <b>Add to Home screen</b>.");
  return T("കമ്പ്യൂട്ടറിൽ: Chrome-ന്റെ അഡ്രസ് ബാറിലെ <b>Install</b> ചിഹ്നം അമർത്തൂ. ഫോണിൽ ഉപയോഗിക്കാൻ ഫോണിലെ Chrome / Safari-യിൽ <b>travelconnect.dev</b> തുറക്കൂ.","On a computer: click the <b>Install</b> icon in Chrome's address bar. For your phone, open <b>travelconnect.dev</b> in Chrome / Safari on the phone.");
 }
 function pageHtml(){
  const tags=[[T("ടാക്സി · ഓട്ടോ","Taxi · Auto")],[T("പിക്കപ്പ് · ചരക്ക് വാഹനം","Pickup · Goods")],[T("കടകൾ","Shops")],[T("ഹോട്ടൽ · ഹോംസ്റ്റേ","Hotels · Homestays")],[T("ഇലക്ട്രീഷ്യൻ · പ്ലംബർ · മെക്കാനിക്","Electrician · Plumber · Mechanic")],[T("വർക്ക്ഷോപ്പ്","Workshops")],[T("രക്തദാതാക്കൾ","Blood donors"),"r"]];
  const fold=(q,a,open)=>`<details class="tcl-fold"${open?" open":""}><summary><span>${q}</span>${CH}</summary><div class="in">${a}</div></details>`;
  return `
<div class="tcl-nav"><div class="tcl-wrap"><img src="/tc-icon-192.png" alt=""><b>TRAVEL CONNECT</b><button class="tcl-lang" data-lang>${lang==="en"?"മലയാളം":"English"}</button></div></div>
<header class="tcl-hero"><div class="tcl-wrap">
 <h1>${T("നാട്ടിലെ സേവനങ്ങൾ<br>ഒരൊറ്റ ആപ്പിൽ","Local services<br>in one app")}</h1>
 <p>${T("ടാക്സി, ഓട്ടോ, കടകൾ, തൊഴിലാളികൾ - നേരിട്ട് വിളിക്കാം. സൗജന്യം.","Taxi, auto, shops, workers - call them directly. Free.")}</p>
</div></header>
<div class="tcl-wrap">
 <div class="tcl-note">${IC.info}<div>${T("<b>ഇത് വെബ്സൈറ്റ് ആണ് - ആപ്പ് ഇതുവരെ തുറന്നിട്ടില്ല.</b> താഴെയുള്ള 2 ഘട്ടം മാത്രം.","<b>This is the website - the app is not open yet.</b> Just the 2 steps below.")}</div></div>

 <div class="tcl-card" id="tclInstall"><div class="tcl-st"><i>1</i><div><h2>${T("ഫോണിൽ ഇൻസ്റ്റാൾ ചെയ്യൂ","Install on your phone")}</h2><p>${T("Play Store-ൽ ഇല്ല - ഇവിടെ നിന്ന് തന്നെ ഇൻസ്റ്റാൾ ചെയ്യാം.","Not on Play Store - install it right here.")}</p></div></div>
  ${INAPP||IOS?"":`<button class="tcl-btn p" data-install>${IC.down}${T("ഇൻസ്റ്റാൾ ചെയ്യൂ","Install the app")}</button>`}
  <div class="tcl-how" id="tclHelp">${howHtml()}</div>
 </div>

 <div class="tcl-card"><div class="tcl-st"><i>2</i><div><h2>${T("ആപ്പ് തുറന്ന് ലോഗിൻ ചെയ്യൂ","Open the app and log in")}</h2><p>${T("ഇൻസ്റ്റാൾ ചെയ്യാതെയും ഇപ്പോൾ തന്നെ ഉപയോഗിക്കാം. മൊബൈൽ നമ്പറും ഇമെയിലും വേണം.","You can also use it right now without installing. You need your mobile number and e-mail.")}</p></div></div>
  <button class="tcl-btn n" data-open>${T("ആപ്പ് തുറക്കൂ","Open the app")}${IC.go}</button>
 </div>

 <div class="tcl-h">${T("ഇതിൽ കണ്ടെത്താം","What you can find")}</div>
 <div class="tcl-card"><div class="tcl-tags">${tags.map(t=>`<span class="${t[1]||""}">${t[0]}</span>`).join("")}</div></div>

 <div class="tcl-h">${T("കൂടുതൽ അറിയാൻ","More")}</div>
 <div class="tcl-card" style="padding:2px 14px">
  ${fold(T("ബിസിനസ് / വാഹന ഉടമകൾക്ക്","For business / vehicle owners"),`<ul>
   <li>${T("അടുത്തുള്ളവർ നിങ്ങളെ കണ്ടെത്തും - സൗജന്യ ലിസ്റ്റിംഗ്","People nearby find you - free listing")}</li>
   <li>${T("സ്വന്തം പേരിൽ ബില്ല്, ക്വട്ടേഷൻ, GST ബില്ല് - PDF, WhatsApp, പ്രിന്റ്","Bills, quotations and GST bills in your name - PDF, WhatsApp, print")}</li>
   <li>${T("കടയുടെ കണക്ക്: വിൽപ്പന, വാങ്ങൽ, സ്റ്റോക്ക്, കടം, ലാഭം, സ്റ്റാഫ്","Shop book: sales, purchases, stock, dues, profit, staff")}</li>
   <li>${T("ടാക്സി: ട്രിപ്പ്, വണ്ടി തിരിച്ചുള്ള വരവ്-ചെലവ്, അടുത്തുള്ള ട്രിപ്പ് അലർട്ട്, SOS","Taxi: trips, income and expense per vehicle, nearby trip alerts, SOS")}</li>
   <li>${T("ഇൻസൈറ്റ്, വോയിസ്, CA റിപ്പോർട്ട്, ക്ലൗഡ് ബാക്കപ്പ് (പ്ലാൻ അനുസരിച്ച്)","Insights, voice, CA report, cloud backup (by plan)")}</li></ul>
   <ol style="margin-top:10px"><li>${T("ആപ്പ് തുറന്ന് ലോഗിൻ ചെയ്യുക - മൊബൈൽ നമ്പറും ഇമെയിലും വേണം (ഇമെയിലിൽ വരുന്ന കോഡ് നൽകണം)","Open the app and log in - you need your mobile number and e-mail (enter the code sent to your e-mail)")}</li><li>${T("ബിസിനസ് റജിസ്റ്റർ ചെയ്ത് വിഭാഗവും വിവരങ്ങളും ചേർക്കുക - ഉടൻ ഉപയോഗിച്ചു തുടങ്ങാം","Register your business, choose the category and add your details - you can start using it at once")}</li><li>${T("അഡ്മിൻ പരിശോധിച്ചാൽ <b>Verified</b> അടയാളം കിട്ടും","After the admin checks, you get the <b>Verified</b> mark")}</li></ol>
   <p style="margin-top:8px;font-size:13px;color:#657888">${T("റജിസ്റ്റർ ചെയ്യുമ്പോൾ \"അനുമതി ഇല്ല\" എന്ന് കാണിച്ചാൽ മാത്രം അഡ്മിനെ WhatsApp-ൽ ബന്ധപ്പെടുക.","Only if registering says \"not authorised\", contact the admin on WhatsApp.")}</p>
   <a class="tcl-btn g" href="${wa("Hello, I have registered my business on Travel Connect. Please verify.\nName:\nMobile number:\nBusiness type:")}" target="_blank" rel="noopener">${IC.wa}${T("സംശയമുണ്ടെങ്കിൽ WhatsApp","Questions? WhatsApp")} ${PHONE_SHOW}</a>`)}
  ${fold(T("ഇത് സൗജന്യമാണോ?","Is it free?"),T("സേവനങ്ങൾ കണ്ടെത്താനും വിളിക്കാനും പൂർണ്ണമായും സൗജന്യം. ബിസിനസ് ലിസ്റ്റിംഗും സൗജന്യം. കൂടുതൽ സൗകര്യങ്ങൾക്ക് Plus, Premium, Platinum പ്ലാനുകൾ ഉണ്ട്.","Finding and calling services is completely free. A business listing is free too. Plus, Premium and Platinum plans add more tools."))}
  ${fold(T("Play Store-ൽ ഉണ്ടോ?","Is it on Play Store?"),T("<b>ഇല്ല.</b> Play Store-ൽ തിരഞ്ഞാൽ പേരിൽ സാമ്യമുള്ള വേറെ ആപ്പുകളാണ് കിട്ടുക. ആൻഡ്രോയിഡിൽ Chrome-ലും ഐഫോണിൽ Safari-യിലും <b>travelconnect.dev</b> തുറന്ന് ഇൻസ്റ്റാൾ ചെയ്യുക.","<b>No.</b> Searching Play Store shows other apps with a similar name. Open <b>travelconnect.dev</b> in Chrome (Android) or Safari (iPhone) and install from there."))}
  ${fold(T("രക്തദാതാവാകാൻ","Become a blood donor"),T("ആപ്പിൽ രക്തഗ്രൂപ്പും സ്ഥലവും നൽകി റജിസ്റ്റർ ചെയ്യാം. സ്വിച്ച് ON ആയിരിക്കുമ്പോൾ മാത്രമേ നിങ്ങളുടെ നമ്പർ മറ്റുള്ളവർ കാണൂ.","Register in the app with your blood group and place. Your number is visible only while your donor switch is ON."))}
  ${fold(T("ഏതൊക്കെ സ്ഥലങ്ങൾ?","Which places?"),T("വളയം, നാദാപുരം, വടകര, കുറ്റ്യാടി തുടങ്ങി കേരളം മുഴുവൻ. ","Valayam, Nadapuram, Vadakara, Kuttiady and across Kerala. ")+`<a href="/areas.html" style="color:#0b6b78;font-weight:700">${T("എല്ലാ സ്ഥലങ്ങളും","See all areas")}</a>`)}
  ${fold(T("പോസ്റ്റർ, പരസ്യങ്ങൾ","Posters and ads"),`<div class="tcl-poster">${TC_SITE_POSTERS.map(p=>`<img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">`).join("")}</div>
   ${TC_SITE_VIDEOS.map(v=>`<div class="tcl-vid"><iframe src="https://www.youtube.com/embed/${esc(v)}" title="Travel Connect video" loading="lazy" allowfullscreen></iframe></div>`).join("")}
   <div class="tcl-ad"><small>${T("പരസ്യം","Advertisement")} · Krishna Tours &amp; Travels</small><h3>Krishna Tours &amp; Travels, Valayam</h3><p>${T("ടാക്സി, ടൂർ, യാത്രാ സേവനങ്ങൾ.","Taxi, tours and travel.")}</p><a class="tcl-btn s" href="tel:+91${PHONE}">${T("വിളിക്കൂ","Call")} ${PHONE_SHOW}</a></div>
   ${TC_SITE_ADS.map(adCard).join("")}
   <div class="tcl-ad"><small>${T("നിങ്ങളുടെ പരസ്യം ഇവിടെ","Your ad here")}</small><p>${T("നിങ്ങളുടെ ബിസിനസിന്റെ പരസ്യം ഇവിടെ കൊടുക്കാം.","Advertise your business here.")}</p><a class="tcl-btn s" href="${wa("Hello, I want to advertise on Travel Connect.")}" target="_blank" rel="noopener">${T("WhatsApp-ൽ ചോദിക്കൂ","Ask on WhatsApp")}</a></div>
   <a class="tcl-btn g" href="${shareLink}" target="_blank" rel="noopener">${IC.wa}${T("WhatsApp-ൽ ഷെയർ ചെയ്യൂ","Share on WhatsApp")}</a>`)}
 </div>

 <div class="tcl-foot"><div class="links"><a href="tel:+91${PHONE}">${PHONE_SHOW}</a><a href="${wa("Hello, I have a question about Travel Connect.")}" target="_blank" rel="noopener">WhatsApp</a><a href="/privacy.html">${T("സ്വകാര്യത","Privacy")}</a><a href="/terms.html">${T("നിബന്ധനകൾ","Terms")}</a></div>© Krishna Tours &amp; Travels, Valayam, Kerala</div>
</div>`;
 }

 const st=document.createElement("style"); st.id="tcLandingCss"; st.textContent=css; document.head.appendChild(st);
 const box=document.createElement("div"); box.id="tcLanding"; box.innerHTML=pageHtml();
 document.body.appendChild(box);

 /* One-tap install: Chrome on Android gives a real install prompt (beforeinstallprompt). iPhone has none (Share -> Add to Home Screen),
    and the browser inside Facebook / Instagram / WhatsApp cannot install at all - those see their instruction in step 1 instead of a button. */
 let installEvt=null;
 addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installEvt=e; });
 addEventListener("appinstalled",()=>{ installEvt=null; showHelp(T("<b>ഇൻസ്റ്റാൾ ആയി.</b> ഇനി ഫോണിന്റെ ഹോം സ്ക്രീനിലെ Travel Connect ചിഹ്നം അമർത്തി തുറക്കൂ.","<b>Installed.</b> Now open Travel Connect from its icon on your home screen."),true); });
 function showHelp(h,ok){
  const el=document.getElementById("tclHelp"); if(!el) return;
  el.innerHTML=h; el.className="tcl-how"+(ok?" tcl-ok":"");
  el.scrollIntoView({behavior:"smooth",block:"center"});
 }
 async function doInstall(){
  if(installEvt){
   const ev=installEvt; installEvt=null;
   try{ ev.prompt(); await ev.userChoice; }catch(e){}
   return;
  }
  showHelp(howHtml()+"<br>"+T("ആ ഓപ്ഷൻ കാണുന്നില്ലെങ്കിൽ ആപ്പ് നേരത്തേ ഇൻസ്റ്റാൾ ആയിട്ടുണ്ടാകാം - ഹോം സ്ക്രീനിൽ നോക്കൂ.","If you do not see that option, the app may already be installed - look on your home screen."));
 }
 function openApp(){
  try{ sessionStorage.setItem("tc_site_opened","1"); }catch(e){}
  box.remove(); st.remove(); scrollTo(0,0);
 }
 box.addEventListener("click",e=>{
  const l=e.target.closest("[data-lang]"); if(l){ e.preventDefault(); lang=lang==="en"?"ml":"en"; try{ localStorage.setItem("tc_site_lang",lang); }catch(x){} box.innerHTML=pageHtml(); box.scrollTop=0; return; }
  const ins=e.target.closest("[data-install]"); if(ins){ e.preventDefault(); doInstall(); return; }
  const o=e.target.closest("[data-open]"); if(o){ e.preventDefault(); openApp(); return; }
 });
})();
