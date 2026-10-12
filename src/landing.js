/* ============================================================
   TRAVEL CONNECT - PUBLIC LANDING PAGE (src/landing.js)

   What a first-time visitor sees at travelconnect.dev (from a poster,
   WhatsApp, Facebook, Instagram or Google) BEFORE the login screen:
   a proper website explaining what Travel Connect is, with an
   "Open the App" button that leads into the normal app/login.

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
 if(!forced&&(standalone||loggedIn||opened||location.hash.length>1||(location.search&&location.search.length>1))) return;

 const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const wa=txt=>"https://wa.me/91"+PHONE+"?text="+encodeURIComponent(txt);
 const shareLink="https://wa.me/?text="+encodeURIComponent("Travel Connect - നാട്ടിലെ സേവനങ്ങൾ ഒരൊറ്റ ആപ്പിൽ\nTaxi, auto, pickup, shops, hotels, skilled workers & blood donors near you.\n"+SITE);

 const css=`
#tcLanding{position:fixed;inset:0;z-index:9990;overflow-y:auto;overflow-x:hidden;background:#f3f7fa;color:#10283d;font-family:Poppins,"Noto Sans Malayalam","Manjari",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.5;-webkit-text-size-adjust:100%}
#tcLanding *{box-sizing:border-box}
#tcLanding a{color:inherit;text-decoration:none}
#tcLanding h1,#tcLanding h2,#tcLanding h3,#tcLanding p{margin:0;padding:0;border:0;background:none}
#tcLanding button{font:inherit;font-weight:700;cursor:pointer;border:0}
.tcl-wrap{max-width:980px;margin:0 auto;padding:0 18px}
.tcl-nav{position:sticky;top:0;z-index:5;background:rgba(8,43,73,.97);color:#fff;padding:calc(10px + env(safe-area-inset-top,0px)) 0 10px}
.tcl-nav .tcl-wrap{display:flex;align-items:center;gap:10px}
.tcl-nav img{width:38px;height:38px;border-radius:10px}
.tcl-nav b{font-size:17px;letter-spacing:.5px;flex:1}.tcl-nav b i{font-style:normal;color:#ffc928}
.tcl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:30px;padding:11px 22px;font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,.22)}
.tcl-btn.y{background:#ffc928;color:#082b49}.tcl-btn.g{background:#1faa59;color:#fff}.tcl-btn.w{background:rgba(255,255,255,.14);color:#fff;box-shadow:none;border:1.5px solid rgba(255,255,255,.5)}
.tcl-btn.sm{padding:8px 16px;font-size:13.5px}
.tcl-hero{background:radial-gradient(ellipse 600px 300px at 85% 0,rgba(63,124,235,.5),transparent 70%),linear-gradient(160deg,#071a46,#0c3a8a 70%,#0b4f9c);color:#fff;padding:34px 0 46px;text-align:center}
.tcl-chip{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:4px 14px;font-size:12.5px;font-weight:600;letter-spacing:.4px}
.tcl-hero img{width:104px;height:104px;border-radius:26px;margin:16px auto 8px;display:block;box-shadow:0 0 40px rgba(255,255,255,.3)}
.tcl-hero h1{font-size:clamp(30px,7.2vw,52px);font-weight:800;line-height:1.12;margin-top:6px}.tcl-hero h1 span{color:#ffc928}
.tcl-brand{font-weight:300;letter-spacing:3px;font-size:15px;opacity:.9;margin-top:8px}
.tcl-ml{color:#ffe28a;font-weight:700;font-size:clamp(17px,4.4vw,24px);margin-top:12px;line-height:1.5}
.tcl-hero p.s{max-width:620px;margin:14px auto 0;font-size:15.5px;opacity:.95}
.tcl-cta{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:22px}
.tcl-sec{padding:38px 0 6px}
.tcl-sec h2{font-size:clamp(22px,5vw,30px);font-weight:800;color:#082b49;text-align:center}
.tcl-sec .sub{text-align:center;color:#4d6270;font-weight:600;margin:4px 0 20px;font-size:15px}
.tcl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
@media(min-width:700px){.tcl-grid{grid-template-columns:repeat(4,1fr)}.tcl-g3{grid-template-columns:repeat(3,1fr)!important}}
.tcl-card{background:#fff;border-radius:18px;padding:16px 14px;box-shadow:0 2px 10px rgba(8,43,73,.09);text-align:center}
.tcl-card .ic{font-size:34px;line-height:1.2}
.tcl-card h3{font-size:15.5px;font-weight:700;margin-top:6px;color:#082b49}
.tcl-card p{font-size:13.5px;color:#4d6270;margin-top:3px;font-weight:500}
.tcl-card.red{border-top:4px solid #d62839}
.tcl-steps{display:grid;gap:12px}
@media(min-width:700px){.tcl-steps.c3{grid-template-columns:repeat(3,1fr)}}
.tcl-step{background:#fff;border-radius:18px;padding:16px;display:flex;gap:14px;align-items:flex-start;box-shadow:0 2px 10px rgba(8,43,73,.09)}
.tcl-step i{flex:none;width:34px;height:34px;border-radius:50%;background:#ffc928;color:#082b49;font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center}
.tcl-step b{display:block;font-size:15.5px;color:#082b49}.tcl-step span{font-size:13.5px;color:#4d6270;font-weight:500}
.tcl-band{background:linear-gradient(135deg,#0b3d91,#1565d8);color:#fff;border-radius:22px;padding:22px 18px;margin-top:6px}
.tcl-band h3{font-size:19px;font-weight:800}.tcl-band ul{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:9px}
.tcl-band li{font-size:14.5px;font-weight:600;padding-left:26px;position:relative}.tcl-band li:before{content:"\\2714";position:absolute;left:0;color:#ffc928}
.tcl-band li small{display:block;font-weight:500;opacity:.85;font-size:12.5px}
@media(min-width:700px){.tcl-band ul{grid-template-columns:1fr 1fr}}
.tcl-blood{background:#fff;border-left:6px solid #d62839;border-radius:18px;padding:18px;display:flex;gap:14px;box-shadow:0 2px 10px rgba(8,43,73,.09)}
.tcl-blood .ic{font-size:42px}.tcl-blood h3{font-size:18px;color:#a3121f;font-weight:800}.tcl-blood p{font-size:14px;color:#4d6270;font-weight:500;margin-top:4px}
.tcl-inst{display:grid;gap:12px}@media(min-width:700px){.tcl-inst{grid-template-columns:1fr 1fr}}
.tcl-inst .tcl-step{align-items:center}.tcl-url{display:inline-block;background:#ffc928;color:#082b49;font-weight:800;padding:2px 12px;border-radius:8px;margin:6px 0}
.tcl-poster{display:flex;gap:14px;overflow-x:auto;padding:4px 2px 12px;scroll-snap-type:x mandatory}
.tcl-poster img{height:420px;width:auto;border-radius:16px;box-shadow:0 3px 14px rgba(8,43,73,.2);scroll-snap-align:center;flex:none;max-width:90%}
.tcl-vid{position:relative;padding-top:56.25%;border-radius:16px;overflow:hidden;background:#000;margin-top:12px}.tcl-vid iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.tcl-ad{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 10px rgba(8,43,73,.09);display:flex;flex-direction:column}
.tcl-ad img{width:100%;height:150px;object-fit:cover}.tcl-ad .b{padding:14px;flex:1;display:flex;flex-direction:column;gap:6px}
.tcl-ad small{color:#7a8a96;font-weight:600;font-size:11.5px;letter-spacing:.6px;text-transform:uppercase}
.tcl-ad h3{font-size:16.5px;font-weight:800;color:#082b49}.tcl-ad p{font-size:13.5px;color:#4d6270;font-weight:500;flex:1}
.tcl-ad .tcl-btn{align-self:flex-start;margin-top:6px}
.tcl-ad.dash{background:transparent;border:2px dashed #9fb3c2;box-shadow:none}
.tcl-faq details{background:#fff;border-radius:14px;padding:13px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(8,43,73,.07)}
.tcl-faq summary{font-weight:700;cursor:pointer;color:#082b49;font-size:15px}.tcl-faq details p{margin-top:8px;font-size:14px;color:#4d6270;font-weight:500}
.tcl-foot{background:#071a2e;color:#cfe0ee;margin-top:40px;padding:28px 0 calc(28px + env(safe-area-inset-bottom,0px));text-align:center;font-size:13.5px}
.tcl-foot b{color:#fff;font-size:16px}.tcl-foot a{color:#ffc928;font-weight:700}
.tcl-foot .links{margin:12px 0;display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
`;

 const services=[["🚕","Taxi & Auto","ടാക്സി · ഓട്ടോ"],["🛻","Pickup & Goods","പിക്കപ്പ് · ചരക്ക് വാഹനങ്ങൾ"],["🏪","Shops & Businesses","കടകൾ · ബിസിനസുകൾ"],["🏨","Hotels & Homestays","ഹോട്ടൽ · ഹോംസ്റ്റേ"],["🔧","Skilled Workers","ഇലക്ട്രീഷ്യൻ · പ്ലംബർ · മെക്കാനിക്"],["🩸","Blood Donors","രക്തദാതാക്കൾ","red"],["🧭","Trip Requests","യാത്ര ആവശ്യപ്പെടാം"],["💬","and More","കൂടുതൽ സേവനങ്ങൾ"]];
 const adCard=a=>`<div class="tcl-ad">${a.image?`<img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy">`:""}<div class="b"><small>Advertisement${a.by?" · "+esc(a.by):""}</small><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p>${a.link?`<a class="tcl-btn y sm" href="${esc(a.link)}" target="_blank" rel="noopener">Know more</a>`:a.phone?`<a class="tcl-btn y sm" href="tel:+91${esc(a.phone)}">📞 Call</a>`:""}</div></div>`;

 const html=`
<div class="tcl-nav"><div class="tcl-wrap"><img src="/tc-icon-192.png" alt=""><b>TRAVEL <i>CONNECT</i></b><button class="tcl-btn y sm" data-open>Login · ലോഗിൻ</button></div></div>

<header class="tcl-hero"><div class="tcl-wrap">
 <span class="tcl-chip">FREE LOCAL DIRECTORY · KERALA</span>
 <img src="/tc-icon-512.png" alt="Travel Connect logo">
 <h1>Be Found.<br>Stay Connected.<br><span>Grow Together.</span></h1>
 <div class="tcl-brand">CONNECTING EVERYTHING</div>
 <div class="tcl-ml">നിങ്ങളെ മറ്റുള്ളവർ കണ്ടെത്തട്ടെ. ബന്ധങ്ങൾ വളരട്ടെ.<br>നമുക്കൊന്നിച്ച് മുന്നേറാം.</div>
 <p class="s">Taxi, auto, pickup, shops, hotels, skilled workers and blood donors near you - all in one app. Call them directly, no middlemen.<br><b>നാട്ടിലെ സേവനങ്ങൾ ഒരൊറ്റ ആപ്പിൽ - നേരിട്ട് വിളിക്കാം, ഇടനിലക്കാരില്ല.</b></p>
 <div class="tcl-cta"><button class="tcl-btn y" data-open>Open the App · ആപ്പ് തുറക്കൂ</button><a class="tcl-btn w" href="#tclInstall" data-go="tclInstall">How to install ↓</a></div>
</div></header>

<section class="tcl-sec"><div class="tcl-wrap"><h2>What you can find</h2><div class="sub">എന്തൊക്കെ കിട്ടും</div>
 <div class="tcl-grid">${services.map(s=>`<div class="tcl-card ${s[3]||""}"><div class="ic">${s[0]}</div><h3>${s[1]}</h3><p>${s[2]}</p></div>`).join("")}</div></div></section>

<section class="tcl-sec"><div class="tcl-wrap"><h2>For customers</h2><div class="sub">സേവനം വേണ്ടവർക്ക്</div>
 <div class="tcl-steps c3">
  <div class="tcl-step"><i>1</i><div><b>Open the app</b><span>ആപ്പ് തുറക്കൂ</span></div></div>
  <div class="tcl-step"><i>2</i><div><b>Find who is nearby</b><span>അടുത്തുള്ളവരെ കണ്ടെത്തൂ - ദൂരവും ഏകദേശ യാത്രാ ദൂരവും അറിയാം</span></div></div>
  <div class="tcl-step"><i>3</i><div><b>Call them directly</b><span>ഒറ്റ ടച്ചിൽ നേരിട്ട് വിളിക്കൂ</span></div></div>
 </div></div></section>

<section class="tcl-sec"><div class="tcl-wrap"><h2>For business owners</h2><div class="sub">ബിസിനസ് ഉടമകൾക്ക്</div>
 <div class="tcl-band"><h3>List your business free · ഫ്രീയായി ലിസ്റ്റ് ചെയ്യൂ</h3><ul>
  <li>Be found by people nearby<small>അടുത്തുള്ളവർ നിങ്ങളെ കണ്ടെത്തും</small></li>
  <li>Bills &amp; quotations in your name<small>സ്വന്തം പേരിൽ ബിൽ, ക്വട്ടേഷൻ</small></li>
  <li>Own UPI QR on your bills (Plus / Premium)<small>ബില്ലിൽ സ്വന്തം UPI QR</small></li>
  <li>Trip requests reach nearby vehicles<small>വാഹന ഉടമകൾക്ക് സമീപത്തെ ട്രിപ്പ് അലർട്ട്</small></li>
  <li>SOS alert for vehicle owners (taxi / auto / pickup)<small>വാഹന ഉടമകൾക്ക് മാത്രം SOS</small></li>
  <li>Cloud backup of your data (Premium)<small>ഡാറ്റ ക്ലൗഡ് ബാക്കപ്പ്</small></li></ul></div>
 <h3 style="margin:22px 0 10px;text-align:center;color:#082b49;font-size:18px">How to register · റജിസ്റ്റർ ചെയ്യാൻ</h3>
 <div class="tcl-steps">
  <div class="tcl-step"><i>1</i><div><b>WhatsApp your name, mobile number &amp; business type to Admin</b><span>പേര്, മൊബൈൽ നമ്പർ, ബിസിനസ് തരം അഡ്മിന് അയക്കുക</span></div></div>
  <div class="tcl-step"><i>2</i><div><b>After authorisation, register in the app</b><span>അനുമതി ലഭിച്ചാൽ ആപ്പിൽ റജിസ്റ്റർ ചെയ്യുക</span></div></div>
  <div class="tcl-step"><i>3</i><div><b>Choose your category (or "Other" and add yours)</b><span>വിഭാഗം തിരഞ്ഞെടുക്കുക</span></div></div>
  <div class="tcl-step"><i>4</i><div><b>Add business / vehicle / service details</b><span>ബിസിനസ് / വാഹന വിവരങ്ങൾ ചേർക്കുക</span></div></div>
  <div class="tcl-step"><i>5</i><div><b>Admin verifies - then you are visible to customers</b><span>അഡ്മിൻ പരിശോധിച്ചാൽ എല്ലാവർക്കും കാണാം</span></div></div>
 </div>
 <div class="tcl-cta"><a class="tcl-btn g" href="${wa("Hello, I want to register my business on Travel Connect.\nName:\nMobile number:\nBusiness type:")}" target="_blank" rel="noopener">WhatsApp ${PHONE_SHOW}</a></div></div></section>

<section class="tcl-sec"><div class="tcl-wrap"><div class="tcl-blood"><div class="ic">🩸</div><div><h3>Become a blood donor · രക്തദാതാവാകാം</h3><p>Register with your blood group and place. Your phone number is visible only while your donor switch is ON. People in need can search by blood group and call you directly.<br>രക്തഗ്രൂപ്പും സ്ഥലവും നൽകി റജിസ്റ്റർ ചെയ്യൂ. സ്വിച്ച് ON ആയിരിക്കുമ്പോൾ മാത്രമേ നിങ്ങളുടെ നമ്പർ കാണൂ.</p></div></div></div></section>

<section class="tcl-sec" id="tclInstall"><div class="tcl-wrap"><h2>Install the app</h2><div class="sub">ഇൻസ്റ്റാൾ ചെയ്യാം - Play Store വേണ്ട</div>
 <div class="tcl-inst">
  <div class="tcl-step"><i style="background:#3DDC84"><svg width="20" height="20" fill="#fff" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.44 5.559q-1.015 1.748-2.028 3.498-.055-.023-.111-.043a12.098 12.098 0 0 0-8.68.033C7.537 8.897 5.868 6.026 5.6 5.56a1 1 0 0 0-.141-.19 1.104 1.104 0 0 0-1.768 1.298c1.947 3.37-.096-.216 1.948 3.36.017.03-.495.263-1.393 1.017C2.9 12.176.452 14.772 0 18.99h24a11.7 11.7 0 0 0-.746-3.068 12.1 12.1 0 0 0-2.74-4.184 12 12 0 0 0-2.131-1.687c.66-1.122 1.312-2.256 1.965-3.385a1.11 1.11 0 0 0-.008-1.12 1.1 1.1 0 0 0-.852-.532c-.522-.054-.939.313-1.049.545m-.04 8.46c.395.593.324 1.331-.156 1.65-.48.32-1.188.1-1.582-.493s-.324-1.33.156-1.65c.473-.316 1.182-.11 1.582.494m-11.193-.492c.48.32.55 1.058.156 1.65-.394.593-1.103.815-1.584.495-.48-.32-.55-1.058-.156-1.65.4-.603 1.109-.811 1.584-.495"/></svg></i><div><b>Android</b><span>Open <span class="tcl-url">travelconnect.dev</span> in Chrome → ⋮ Menu → <b style="display:inline">Install app</b> / Add to Home screen<br>Chrome-ൽ തുറക്കൂ → ⋮ → Install app</span></div></div>
  <div class="tcl-step"><i style="background:#111"><svg width="20" height="20" fill="#fff" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg></i><div><b>iPhone</b><span>Open in Safari → Share → <b style="display:inline">Add to Home Screen</b><br>Safari-യിൽ തുറക്കൂ → Share → Add to Home Screen</span></div></div>
 </div></div></section>

<section class="tcl-sec"><div class="tcl-wrap"><h2>Posters &amp; videos</h2><div class="sub">പോസ്റ്ററുകളും വീഡിയോകളും</div>
 <div class="tcl-poster">${TC_SITE_POSTERS.map(p=>`<img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy">`).join("")}</div>
 ${TC_SITE_VIDEOS.map(v=>`<div class="tcl-vid"><iframe src="https://www.youtube.com/embed/${esc(v)}" title="Travel Connect video" loading="lazy" allowfullscreen></iframe></div>`).join("")}
 <div class="tcl-cta"><a class="tcl-btn g" href="${shareLink}" target="_blank" rel="noopener">Share on WhatsApp · ഷെയർ ചെയ്യൂ</a></div></div></section>

<section class="tcl-sec"><div class="tcl-wrap"><h2>Featured</h2><div class="sub">പരസ്യങ്ങൾ</div>
 <div class="tcl-grid tcl-g3" style="grid-template-columns:1fr">
  <div class="tcl-ad"><div class="b"><small>Travel Connect</small><h3>Need a taxi, auto or pickup?</h3><p>Open the app, enter pickup and drop - nearby vehicles are alerted and tell you how far they are.<br>ടാക്സി, ഓട്ടോ, പിക്കപ്പ് വേണോ? ആപ്പ് തുറന്ന് ട്രിപ്പ് അയക്കൂ.</p><button class="tcl-btn y sm" data-open>Open the App</button></div></div>
  <div class="tcl-ad"><div class="b"><small>Advertisement · Krishna Tours &amp; Travels</small><h3>Krishna Tours &amp; Travels, Valayam</h3><p>Taxi, tours and travel across Kerala and beyond.<br>ടാക്സി, ടൂർ, യാത്രാ സേവനങ്ങൾ.</p><a class="tcl-btn y sm" href="tel:+91${PHONE}">📞 ${PHONE_SHOW}</a></div></div>
  ${TC_SITE_ADS.map(adCard).join("")}
  <div class="tcl-ad dash"><div class="b"><small>Your ad here</small><h3>Advertise your business</h3><p>Premium members and local businesses can feature here.<br>നിങ്ങളുടെ ബിസിനസിന്റെ പരസ്യം ഇവിടെ.</p><a class="tcl-btn g sm" href="${wa("Hello, I want to advertise on Travel Connect.")}" target="_blank" rel="noopener">Ask on WhatsApp</a></div></div>
 </div></div></section>

<section class="tcl-sec tcl-faq"><div class="tcl-wrap"><h2>Questions</h2><div class="sub">സംശയങ്ങൾ</div>
 <details><summary>Is it free? · ഇത് സൗജന്യമാണോ?</summary><p>Finding and calling local services is free. Business owners get a free listing; Plus and Premium plans add your own branding, UPI QR and more.</p></details>
 <details><summary>Do I have to install it from Play Store? · Play Store വേണോ?</summary><p>No. Open travelconnect.dev and add it to your home screen - it works like an app.</p></details>
 <details><summary>Who can use SOS? · SOS ആർക്ക്?</summary><p>SOS alerts are only for registered vehicle owners (taxi, auto, pickup). Customers do not use it.</p></details>
 <details><summary>Which places are covered? · ഏതൊക്കെ സ്ഥലങ്ങൾ?</summary><p>Valayam, Nadapuram, Vadakara, Kuttiady and across Kerala. Any business can join. <a href="/areas.html" style="color:#0b6b78;font-weight:700">See all areas</a></p></details>
</div></section>

<footer class="tcl-foot"><div class="tcl-wrap"><b>TRAVEL CONNECT</b><br>Connecting Everything<div class="links"><a href="tel:+91${PHONE}">📞 ${PHONE_SHOW}</a><a href="${wa("Hello, I have a question about Travel Connect.")}" target="_blank" rel="noopener">WhatsApp</a><a href="/areas.html">Areas</a></div><button class="tcl-btn y" data-open>Open the App · ആപ്പ് തുറക്കൂ</button><div style="margin-top:16px;opacity:.7">© Krishna Tours &amp; Travels, Valayam, Kerala</div></div></footer>`;

 const st=document.createElement("style"); st.id="tcLandingCss"; st.textContent=css; document.head.appendChild(st);
 const box=document.createElement("div"); box.id="tcLanding"; box.innerHTML=html;
 document.body.appendChild(box);
 function openApp(){
  try{ sessionStorage.setItem("tc_site_opened","1"); }catch(e){}
  box.remove(); st.remove(); scrollTo(0,0);
 }
 box.addEventListener("click",e=>{
  const o=e.target.closest("[data-open]"); if(o){ e.preventDefault(); openApp(); return; }
  const g=e.target.closest("[data-go]"); if(g){ e.preventDefault(); const t=document.getElementById(g.getAttribute("data-go")); if(t) t.scrollIntoView({behavior:"smooth",block:"start"}); }
 });
})();
