/* Date format (tc-datefmt.js, loaded FIRST by tc-regdocs.js).
   Owner's wish 2026-11-01: dates are mostly written day-month-year in India; the date boxes showed the phone's own order (11/01/2026).
   Every person can choose: Day-Month-Year (the start value), Month-Day-Year or Year-Month-Day. Menu > "Date format" (stored on this phone only: localStorage tc_datefmt).
   1) Dates written as text: window.tcDateFmt(iso) gives the chosen order (01-11-2026); core.js tcFormatDate / tcFormatDateTime (bills, lists, PDFs) are wrapped to follow
      it, and the shop / My Accounts / documents date helpers call tcDateFmt.
   2) Date boxes (<input type="date">): in Chrome-based browsers (Android Chrome, Samsung Internet, Edge, desktop) the box's own text is hidden and the chosen order is shown
      instead (CSS ::before from data-f); the value stays YYYY-MM-DD and tapping still opens the phone's calendar. Safari / iPhone keep the box as it is (its order follows the iPhone's
      region setting); texts still follow the choice. core.js and the other modules are not changed for this. Nothing is sent to the server. */
(function(){
 if(window.__tcDateFmt) return;
 window.__tcDateFmt=1;
 var K="tc_datefmt", FM=["dmy","mdy","ymd"];
 function B(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } }
 function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
 function get(){ try{ var v=localStorage.getItem(K); return FM.indexOf(v)>=0?v:"dmy"; }catch(e){ return "dmy"; } }
 function put(v){ try{ localStorage.setItem(K,v); }catch(e){} }
 function order(y,m,d,f){ f=f||get(); return f==="mdy"?m+"-"+d+"-"+y:f==="ymd"?y+"-"+m+"-"+d:d+"-"+m+"-"+y; }
 /* "2026-11-01" (or a longer ISO text) -> the chosen order; anything else comes back unchanged */
 function fmt(v,f){
  if(v instanceof Date){ if(isNaN(v)) return ""; var p2=function(n){ return (n<10?"0":"")+n; }; return order(String(v.getFullYear()),p2(v.getMonth()+1),p2(v.getDate()),f); }
  var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(v==null?"":v));
  return m?order(m[1],m[2],m[3],f):String(v==null?"":v);
 }
 window.tcDateFmt=fmt;
 window.tcDateFmtGet=get;

 /* texts from core.js: its tcFormatDate gives dd-mm-yyyy - re-order that */
 var orig=window.tcFormatDate;
 if(typeof orig==="function") window.tcFormatDate=function(s){
  var r=orig.apply(this,arguments), m=/^(\d\d)-(\d\d)-(\d{4})$/.exec(r);
  return m?order(m[3],m[2],m[1]):r;
 };

 /* date boxes */
 var CH=/(?:Chrome|Chromium|EdgA?|SamsungBrowser)\/\d/.test(navigator.userAgent)&&!/CriOS|FxiOS|OPiOS/.test(navigator.userAgent);
 function hint(){ var f=get(); return f==="mdy"?"mm-dd-yyyy":f==="ymd"?"yyyy-mm-dd":"dd-mm-yyyy"; }
 function refresh(el){
  if(!el||el.type!=="date") return;
  var v=el.value, t=v?fmt(v):hint();
  if(el.getAttribute("data-f")!==t) el.setAttribute("data-f",t);
  if(!!v===(el.getAttribute("data-e")==="1")) el.setAttribute("data-e",v?"0":"1");
 }
 function dec(el){
  if(!CH||!el||el.nodeType!==1||el.type!=="date") return;
  if(!el.classList.contains("tcDf")){ el.classList.add("tcDf"); el.addEventListener("input",function(){ refresh(el); }); el.addEventListener("change",function(){ refresh(el); }); }
  refresh(el);
 }
 function scan(root){ try{ if(root.nodeType!==1) return; if(root.tagName==="INPUT") dec(root); var L=root.querySelectorAll?root.querySelectorAll("input[type=date]"):[]; for(var i=0;i<L.length;i++) dec(L[i]); }catch(e){} }
 function all(){ var L=document.querySelectorAll("input.tcDf"); for(var i=0;i<L.length;i++) refresh(L[i]); }
 if(CH){
  var st=document.createElement("style");
  /* hide the box's own text in every way a browser draws it (desktop: datetime-edit fields; Android: date-and-time-value), keep its size, and draw ours */
  var PS=["datetime-edit","datetime-edit-fields-wrapper","datetime-edit-text","datetime-edit-month-field","datetime-edit-day-field","datetime-edit-year-field","date-and-time-value"];
  st.textContent="input.tcDf{position:relative;-webkit-text-fill-color:transparent}"+
   PS.map(function(p){ return "input.tcDf::-webkit-"+p+"{opacity:0}"; }).join("")+
   "input.tcDf::before{content:attr(data-f);position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);box-sizing:border-box;padding:inherit;padding-right:34px;text-align:inherit;white-space:nowrap;overflow:hidden;pointer-events:none;-webkit-text-fill-color:currentColor}input.tcDf[data-e=\"1\"]::before{color:#8a97a3}";
  (document.head||document.documentElement).appendChild(st);
  /* a value set by the code (el.value=...) does not fire an event: refresh in the setter */
  try{
   var d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value");
   if(d&&d.set) Object.defineProperty(HTMLInputElement.prototype,"value",{configurable:true,enumerable:d.enumerable,get:d.get,set:function(v){ d.set.call(this,v); if(this.type==="date"&&this.classList.contains("tcDf")) refresh(this); }});
  }catch(e){}
  try{
   new MutationObserver(function(ms){
    ms.forEach(function(m){
     if(m.type==="attributes"){ if(m.target.tagName==="INPUT") dec(m.target); }
     else for(var i=0;i<m.addedNodes.length;i++) scan(m.addedNodes[i]);
    });
   }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["type","value"]});
  }catch(e){}
  scan(document.documentElement);
 }

 /* Menu > Date format */
 window.tcDateFmtOpen=function(){
  var cur=get(), t=new Date(2026,10,1), ex={dmy:"01-11-2026",mdy:"11-01-2026",ymd:"2026-11-01"};
  var nm={dmy:B("Day - Month - Year","ദിവസം - മാസം - വർഷം"),mdy:B("Month - Day - Year","മാസം - ദിവസം - വർഷം"),ymd:B("Year - Month - Day","വർഷം - മാസം - ദിവസം")};
  var h='<h3 style="margin:0 0 6px">'+esc(B("Date format","തീയതി എഴുതുന്ന രീതി"))+'</h3><p class="muted" style="margin:0 0 8px">'+esc(B("How dates are shown on this phone (1 November 2026 as the example).","ഈ ഫോണിൽ തീയതി എങ്ങനെ കാണണം (ഉദാഹരണം: 2026 നവംബർ 1)."))+'</p>';
  FM.forEach(function(f){
   h+='<div id="tcDf_'+f+'" onclick="tcDateFmtSet(\''+f+'\')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:13px 12px;margin:6px 0;border-radius:12px;border:2px solid '+(f===cur?'#0b6b78':'#d5dde3')+';background:'+(f===cur?'#e8f5f4':'#fff')+'"><div><b>'+esc(nm[f])+'</b>'+(f==="dmy"?'<div class="muted" style="font-size:12px">'+esc(B("Usual in India","ഇന്ത്യയിൽ സാധാരണ"))+'</div>':'')+'</div><b style="font-size:17px">'+(f===cur?'&#10003; ':'')+ex[f]+'</b></div>';
  });
  if(!CH) h+='<p class="muted" style="font-size:12px;margin-top:8px">'+esc(B("On this browser the date boxes keep the phone's own order; written dates follow your choice.","ഈ ബ്രൗസറിൽ തീയതി ബോക്സ് ഫോണിന്റെ സ്വന്തം രീതിയിൽ തന്നെ കാണും; എഴുതിക്കാണിക്കുന്ന തീയതികൾ നിങ്ങളുടെ തിരഞ്ഞെടുപ്പ് പോലെ.")) +'</p>';
  h+='<button class="secondary" style="margin-top:8px;width:100%" onclick="closeModal()">'+esc(B("Close","അടയ്ക്കുക"))+'</button>';
  modal(h);
 };
 window.tcDateFmtSet=function(f){
  if(FM.indexOf(f)<0) return; put(f); all();
  try{ if(window.__tcShopUi&&window.__tcShopUi.isOpen&&window.__tcShopUi.isOpen()) window.__tcShopUi.render(); }catch(e){}
  try{ if(typeof render==="function") render(); }catch(e){}
  try{ window.tcDateFmtOpen(); }catch(e){}
 };
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var body=document.getElementById("modalBody");
   if(body&&!body.querySelector("#tcDateFmtMenu")&&typeof tcMenuItem==="function"){
    var wrap=document.createElement("div"); wrap.id="tcDateFmtMenu";
    wrap.innerHTML=tcMenuItem('<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path><path d="M8 3v4M16 3v4"></path>',B("Date format","തീയതി എഴുതുന്ന രീതി")+' <span style="font-weight:400;color:#5b6b7a">('+esc(fmt("2026-11-01"))+')</span>',"closeModal();setTimeout(tcDateFmtOpen,60)");
    var items=body.querySelectorAll('[onclick*="tcApplyUpdate"]'), at=items.length?items[0]:null;
    if(at&&at.parentNode) at.parentNode.insertBefore(wrap,at); else body.appendChild(wrap);
   }
  }catch(e){}
  return r;
 };
})();
