/* Line icons for the whole app (tc-icons.js, loaded by tc-regdocs.js) - owner's request 2026-11-17:
   "switches, marks and symbols must be premium quality" - the coloured emoji stickers (🛒 📦 🔒 ✏ ...) look cheap.
   HOW: the screens keep writing their emoji as before (no other file is changed); this file swaps each known emoji, in the text that is
   SHOWN on screen, for a small line icon (SVG, stroke = the text colour, so it fits white buttons, coloured buttons and dark headers alike).
   - only text on screen: never inside input / textarea / select / option, code, or anything marked data-noicon or contenteditable;
     WhatsApp messages, PDFs made from strings, prints and saved data keep their text as it is.
   - an emoji that has no icon here (🐟, 🎉 ...) stays as it is.
   - new screens are handled by one MutationObserver on <body>: it looks only at what was ADDED, once per animation frame, and the
     icons it puts in contain no emoji, so it never triggers itself again (no flicker, no loop).
   - native check boxes / radio buttons / range sliders get the app's teal colour (accent-color) - one CSS line, no layout change.
   window.tcIconize(el) can be called to swap at once (e.g. before html2canvas). */
(function(){
 if(window.__tcIcons) return; window.__tcIcons=1;
 var P={
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M5 12.5l4.200 4.200L19 7"/>',
  okc:'<circle cx="12" cy="12" r="9"/><path d="M8 12.300l2.800 2.800L16.200 9.500"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  warn:'<path d="M12 4L2.800 19.500h18.400z"/><path d="M12 10v4.200M12 17.200v.1"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  box:'<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.500-2"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.500 2h-15z"/><path d="M10 20.500a2 2 0 0 0 4 0"/>',
  trash:'<path d="M4 7h16M9 7V4.500h6V7M6.500 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
  pen:'<path d="M4 20l1-4.500L15.500 5a2.100 2.100 0 0 1 3 3L8 18.500z"/><path d="M13.500 7l3 3"/>',
  mail:'<rect x="3" y="5.500" width="18" height="13" rx="2"/><path d="M3.500 7l8.500 6 8.500-6"/>',
  book:'<path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M9 9h6M9 13h6"/>',
  tag:'<path d="M3.500 12.500V4h8.500l8.500 8.500-8.500 8.500z"/><circle cx="8" cy="8.500" r="1.300"/>',
  bmark:'<path d="M6 3.500h12v17l-6-4-6 4z"/>',
  cart:'<path d="M4 5h2l2 10h9l2-7H7"/><circle cx="10" cy="19" r="1.400"/><circle cx="17" cy="19" r="1.400"/>',
  bulb:'<path d="M9 17h6M10 20.500h4"/><path d="M8.500 14a6 6 0 1 1 7 0c-.800.600-1 1.300-1 3h-5c0-1.700-.200-2.400-1-3z"/>',
  wrench:'<path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9"/><path d="M14 6l2-2 3 3-2 2"/>',
  shield:'<path d="M12 3l7.500 3v5.500c0 4.500-3.200 8-7.500 9.500C7.700 19.500 4.500 16 4.500 11.500V6z"/>',
  cal:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  down:'<path d="M12 4v10M7.500 9.500l4.500 4.500 4.500-4.500"/><path d="M4 15v3.500A1.500 1.500 0 0 0 5.500 20h13a1.500 1.500 0 0 0 1.500-1.500V15"/>',
  up:'<path d="M12 15V5M7.500 9.500L12 5l4.500 4.500"/><path d="M4 15v3.500A1.500 1.500 0 0 0 5.500 20h13a1.500 1.500 0 0 0 1.500-1.500V15"/>',
  car:'<path d="M4 16v-4l2-5h12l2 5v4z"/><path d="M4 12h16"/><circle cx="7.500" cy="17.500" r="1.500"/><circle cx="16.500" cy="17.500" r="1.500"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>',
  mobile:'<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  phone:'<path d="M5 4h3.500l1.500 4-2 1.300a11 11 0 0 0 6.700 6.700L16 14l4 1.500V19a1.500 1.500 0 0 1-1.600 1.500C10.500 20 4 13.500 3.500 5.600A1.500 1.500 0 0 1 5 4z"/>',
  chart:'<path d="M5 20V11M12 20V4M19 20v-6"/>',
  trendup:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  trenddn:'<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4.500 20.500a7.500 7.500 0 0 1 15 0"/>',
  users:'<circle cx="9" cy="8" r="3.500"/><path d="M2.500 20a6.500 6.500 0 0 1 13 0"/><path d="M16 4.700a3.500 3.500 0 0 1 0 6.600M18 14.200a6.500 6.500 0 0 1 3.500 5.800"/>',
  clock:'<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
  money:'<rect x="3" y="6.500" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.500"/><path d="M6.500 9.500v.1M17.500 14.500v.1"/>',
  card:'<rect x="3" y="5.500" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  minus:'<circle cx="12" cy="12" r="8.500"/><path d="M8.500 12h7"/>',
  flask:'<path d="M9.500 3.500h5M10 3.500v6L5 19a1.200 1.200 0 0 0 1 1.800h12A1.200 1.200 0 0 0 19 19l-5-9.500v-6"/><path d="M7.500 15h9"/>',
  file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  pin:'<path d="M12 21s-6.500-6-6.500-11a6.500 6.500 0 0 1 13 0c0 5-6.500 11-6.500 11z"/><circle cx="12" cy="10" r="2.300"/>',
  play:'<path d="M8 5.500v13l10-6.500z"/>',
  cloud:'<path d="M7 18.500a4.500 4.500 0 0 1-.500-9A6 6 0 0 1 18 9.500a4.500 4.500 0 0 1-.500 9z"/>',
  search:'<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>',
  bank:'<path d="M3 9.500L12 4l9 5.500z"/><path d="M5 10v8M9.500 10v8M14.500 10v8M19 10v8M3 20.500h18"/>',
  store:'<path d="M4 9.500L5.500 4h13L20 9.500"/><path d="M4 9.500a2.700 2.700 0 0 0 5.300 0 2.700 2.700 0 0 0 5.400 0 2.700 2.700 0 0 0 5.300 0"/><path d="M5.500 12v8.500h13V12M10 20.500v-5h4v5"/>',
  printer:'<path d="M7 9V3.500h10V9"/><rect x="3.500" y="9" width="17" height="8" rx="2"/><path d="M7 14.500h10V21H7z"/>',
  image:'<rect x="3.500" y="4.500" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.700"/><path d="M4 18l5.500-5 4 3.500 2.500-2 4 3.500"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8.500 12v.1M12 12v.1M15.500 12v.1M8.500 16v.1M12 16v.1M15.500 16v.1"/>',
  merge:'<path d="M6 4v5a5 5 0 0 0 5 5h7"/><path d="M6 20v-5M15 11l3 3-3 3"/>',
  gift:'<rect x="4" y="9" width="16" height="11" rx="1.500"/><path d="M3 9h18M12 9v11M12 9c-1.500-4-6-4-5.500-1.500S12 9 12 9zM12 9c1.500-4 6-4 5.500-1.500S12 9 12 9z"/>',
  save:'<path d="M5 3.500h11l3.500 3.500v13.500H5z"/><path d="M8 3.500v5h7v-5M8 20.500v-6h8v6"/>',
  link:'<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1"/><path d="M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/>',
  camera:'<path d="M4 8h3l1.500-2.500h7L17 8h3v11H4z"/><circle cx="12" cy="13.500" r="3.300"/>',
  refresh:'<path d="M19.500 12a7.500 7.500 0 1 1-2.200-5.300"/><path d="M19.500 4v4.500H15"/>',
  star:'<path d="M12 3.800l2.500 5.300 5.700.7-4.200 4 1.100 5.700-5.100-2.800-5.100 2.800 1.100-5.700-4.200-4 5.700-.7z"/>',
  info:'<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500M12 7.800v.1"/>',
  help:'<circle cx="12" cy="12" r="8.500"/><path d="M9.700 9.500a2.400 2.400 0 1 1 3.300 2.200c-.700.300-1 .800-1 1.500v.6M12 16.800v.1"/>',
  clip:'<rect x="5.500" y="4.500" width="13" height="16.500" rx="2"/><path d="M9 4.500V3h6v1.500M9 11h6M9 15h4"/>',
  home:'<path d="M4 11l8-6.500 8 6.500"/><path d="M6 9.500V20h12V9.500M10 20v-5.500h4V20"/>',
  fuel:'<path d="M5 20.500V5a1.500 1.500 0 0 1 1.500-1.500h6A1.500 1.500 0 0 1 14 5v15.500M3.500 20.500h12M5 10h9"/><path d="M14 8.500l3 2.500v6.500a1.500 1.500 0 0 0 3 0V9l-2.500-2.500"/>',
  road:'<path d="M8 3L4 21M16 3l4 18M12 4v3M12 10.500v3M12 17v3"/>',
  map:'<path d="M3.500 6.500l5.500-2 6 2 5.500-2v13l-5.500 2-6-2-5.500 2z"/><path d="M9 4.500v13M15 6.500v13"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.500 11a6.500 6.500 0 0 0 13 0M12 17.500V21"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l2.500 2.500M14.500 8.500l2 2"/>',
  truck:'<path d="M3 6.500h11v10H3zM14 10h4l3 3.500v3h-7"/><circle cx="7" cy="18" r="1.600"/><circle cx="17" cy="18" r="1.600"/>',
  plane:'<path d="M3 13.500l7-2.500V5a2 2 0 0 1 4 0v6l7 2.500v2l-7-1.500v4l2.500 2v1.500L12 20l-4.500 1.500V20l2.500-2v-4l-7 1.500z"/>',
  eye:'<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z"/><circle cx="12" cy="12" r="3"/>',
  mega:'<path d="M4 10v4h3l8 4.500v-13L7 10z"/><path d="M18.500 9.500a3.500 3.500 0 0 1 0 5"/>',
  globe:'<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c2.500 2.500 3.500 5.300 3.500 8.500s-1 6-3.500 8.500c-2.500-2.500-3.500-5.300-3.500-8.500s1-6 3.500-8.500z"/>',
  bag:'<rect x="3.500" y="7.500" width="17" height="12.500" rx="2"/><path d="M9 7.500V5h6v2.500M3.500 12.500h17"/>',
  scale:'<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-2.500 6a2.500 2.500 0 0 0 5 0zM19 7l-2.500 6a2.500 2.500 0 0 0 5 0z"/>',
  sparkle:'<path d="M12 3.500l1.800 5.200 5.200 1.800-5.200 1.800L12 17.500l-1.800-5.200L5 10.500l5.200-1.800z"/><path d="M18.500 15.500l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  ban:'<circle cx="12" cy="12" r="8.500"/><path d="M6 6l12 12"/>',
  hourglass:'<path d="M7 3.500h10M7 20.500h10M8 3.500c0 5 8 5 8 8.500s-8 3.500-8 8.500M16 3.500c0 5-8 5-8 8.500s8 3.500 8 8.500"/>',
  arrowr:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  siren:'<path d="M6 18v-5a6 6 0 0 1 12 0v5"/><path d="M4 18h16v2.500H4zM12 3v1.500M4.500 6l1 1M19.500 6l-1 1"/>',
  back:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10.500a5.500 5.500 0 0 1 0 11H11"/>'
 };
 /* emoji -> icon name (a trailing VS16 / FE0F is taken away together with the emoji) */
 var M={
  "➕":"plus","✔":"check","✓":"check","☑":"check","✅":"okc","✕":"x","✖":"x","❌":"x","⚠":"warn","🧾":"receipt","📦":"box",
  "🔒":"lock","🔐":"lock","🔓":"unlock","🔔":"bell","🗑":"trash","✏":"pen","✎":"pen","📝":"pen","✉":"mail","📧":"mail","📩":"mail","📨":"mail",
  "📒":"book","📓":"book","📔":"book","📕":"book","📗":"book","📘":"book","📙":"book","📚":"book","🔖":"tag","🏷":"tag","📑":"bmark",
  "🛒":"cart","💡":"bulb","🔧":"wrench","🛠":"wrench","🔨":"wrench","🧰":"wrench","🛡":"shield","📅":"cal","📆":"cal","🗓":"cal",
  "📥":"down","⬇":"down","📤":"up","⬆":"up","🚗":"car","🚕":"car","🚖":"car","🚙":"car","🚘":"car","⚙":"gear","📱":"mobile","📲":"mobile",
  "📞":"phone","☎":"phone","📊":"chart","📈":"trendup","📉":"trenddn","🧑":"user","👤":"user","👨":"user","👩":"user","👥":"users","👪":"users",
  "⏳":"hourglass","⌛":"hourglass","⏰":"clock","⏱":"clock","🕒":"clock","🕐":"clock","💰":"money","💵":"money","💸":"money","💴":"money","🪙":"money",
  "💳":"card","🏁":"flag","🚩":"flag","💀":"minus","🧪":"flask","📄":"file","📃":"file","🗂":"file","📁":"file","📂":"file","💬":"chat","🗨":"chat",
  "📍":"pin","📌":"pin","▶":"play","☁":"cloud","🔍":"search","🔎":"search","🏦":"bank","🏪":"store","🏬":"store","🖨":"printer","🖼":"image",
  "🧮":"calc","🔀":"merge","🎁":"gift","💾":"save","🔗":"link","📷":"camera","📸":"camera","🔄":"refresh","🔁":"refresh","⭐":"star","🌟":"star",
  "ℹ":"info","❓":"help","❔":"help","📋":"clip","🏠":"home","🏡":"home","⛽":"fuel","🛣":"road","🗺":"map","🎤":"mic","🎙":"mic","🔑":"key","🗝":"key",
  "🚚":"truck","🚛":"truck","✈":"plane","👁":"eye","👀":"eye","📢":"mega","📣":"mega","🌐":"globe","💼":"bag","⚖":"scale","✨":"sparkle","🚫":"ban","⛔":"ban",
  "➡":"arrowr","👉":"arrowr","🤝":"users","🚨":"siren","🆘":"siren","↩":"back"
 };
 var TINT={okc:"#15803d",warn:"#c2410c",ban:"#b91c1c"};
 var keys=Object.keys(M).sort(function(a,b){ return b.length-a.length; });
 var src="(?:"+keys.map(function(k){ return k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }).join("|")+")\\uFE0F?";
 var TEST=new RegExp(src), SPLIT=new RegExp("("+src+")","g");
 function svg(n){
  return '<svg class="tcI" viewBox="0 0 24 24" aria-hidden="true" focusable="false"'+(TINT[n]?' style="color:'+TINT[n]+'"':'')+'>'+P[n]+'</svg>';
 }
 var SKIP={INPUT:1,TEXTAREA:1,SELECT:1,OPTION:1,SCRIPT:1,STYLE:1,NOSCRIPT:1,CODE:1,PRE:1,TITLE:1,svg:1,SVG:1};
 function skip(el){
  for(var e=el; e&&e.nodeType===1; e=e.parentNode){
   if(SKIP[e.tagName]) return true;
   if(e.isContentEditable||(e.hasAttribute&&e.hasAttribute("data-noicon"))) return true;
  }
  return false;
 }
 function swap(t){
  var s=t.nodeValue, p=t.parentNode;
  if(!p||!s||!TEST.test(s)||skip(p)) return;
  var parts=s.split(SPLIT), f=document.createDocumentFragment();
  for(var i=0;i<parts.length;i++){
   var x=parts[i]; if(!x) continue;
   if(i%2===1){
    var n=M[x.replace(/️$/,"")];
    if(n){ var sp=document.createElement("span"); sp.className="tcIc"; sp.innerHTML=svg(n); f.appendChild(sp); continue; }
   }
   f.appendChild(document.createTextNode(x));
  }
  p.replaceChild(f,t);
 }
 function run(root){
  if(!root) return;
  if(root.nodeType===3){ swap(root); return; }
  if(root.nodeType!==1&&root.nodeType!==11) return;
  if(root.nodeType===1&&SKIP[root.tagName]) return;
  var w=document.createTreeWalker(root,4,null), list=[], n;
  while((n=w.nextNode())) if(n.nodeValue&&TEST.test(n.nodeValue)) list.push(n);
  for(var i=0;i<list.length;i++) swap(list[i]);
 }
 window.tcIconize=function(el){ try{ run(el||document.body); }catch(e){} };

 function css(){
  if(document.getElementById("tcIconCss")) return;
  var st=document.createElement("style"); st.id="tcIconCss";
  st.textContent=
   ".tcIc{display:inline-flex;vertical-align:-.18em;line-height:1}"+
   ".tcI{width:1.15em;height:1.15em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}"+
   "input[type=checkbox],input[type=radio],input[type=range],progress{accent-color:#0b6b78}";
  (document.head||document.documentElement).appendChild(st);
 }

 var queue=[], busy=false;
 function flush(){
  busy=false; var q=queue; queue=[];
  for(var i=0;i<q.length;i++){ var n=q[i]; if(n.isConnected) try{ run(n); }catch(e){} }
 }
 function start(){
  css(); run(document.body);
  if(!window.MutationObserver) return;
  new MutationObserver(function(ms){
   for(var i=0;i<ms.length;i++){
    var m=ms[i];
    if(m.type==="characterData"){ queue.push(m.target); continue; }
    for(var j=0;j<m.addedNodes.length;j++){ var a=m.addedNodes[j]; if(a.nodeType===1&&a.className==="tcIc") continue; queue.push(a); }
   }
   if(queue.length&&!busy){ busy=true; (window.requestAnimationFrame||setTimeout)(flush); }
  }).observe(document.body,{childList:true,subtree:true,characterData:true});
 }
 if(document.body) start(); else document.addEventListener("DOMContentLoaded",start);
})();
