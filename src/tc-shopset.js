/* Shop book - Settings screen (tc-shopset.js, loaded by tc-regdocs.js after tc-shopcr.js).
   Home > Settings: shop name, kind of shop (aquarium / pets, or another shop), wage on/off and rate, default profit % for suggested prices,
   GST on/off + GSTIN. Everything is saved as setting records (k:'c') in the book, so it follows the shop's login to every phone.
   GST is OFF unless switched on: then every item can carry a GST % (item form > More options); sales and purchases remember the rate,
   and Today's account / Excel show GST on sales, GST on purchases and what is left to pay (prices are taken as GST-inclusive). */
(function(){
 var SH=window.__tcShop, UI=window.__tcShopUi; if(!SH||!UI||window.__tcShopSet) return;
 window.__tcShopSet=1;
 var T=UI.T, E=UI.E, say=UI.say, $=function(id){ return document.getElementById(id); };
 var ST=null;
 function chip(on,fn,txt){ return '<span class="tsChip'+(on?" on":"")+'" onclick="'+fn+'">'+E(txt)+'</span>'; }
 function draw(){
  var aq=ST.kind==="aquarium";
  $("tsBody").innerHTML=
   '<div class="tsC"><label style="margin-top:0">'+E(T("ഷോപ്പിന്റെ പേര്","Shop name"))+'</label><input id="stN" value="'+E(ST.name)+'" placeholder="'+E(T("ഉദാ: മൃതസഞ്ജീവനി","e.g. My Shop"))+'">'+
   '<label>'+E(T("ഷോപ്പിന്റെ തരം","Kind of shop"))+'</label><div>'+chip(aq,"tsStSet('kind','aquarium')","🐠 "+T("അക്വേറിയം / വളർത്തുമൃഗങ്ങൾ","Aquarium / pets"))+chip(!aq,"tsStSet('kind','general')","🏪 "+T("മറ്റ് കട","Another shop"))+'</div>'+
   '<div class="tsM">'+E(T("അക്വേറിയം തിരഞ്ഞാൽ മീൻ വിഭാഗവും ചത്തത് എന്ന കാരണവും കാണിക്കും.","Aquarium shows the Fish section and 'Died' as a loss reason."))+'</div></div>'+
   '<div class="tsC"><b>'+E(T("കൂലി (ജോലിക്കാർക്ക്)","Wage (for the one who sells)"))+'</b><div>'+chip(ST.wageOn,"tsStSet('wageOn',1)",T("വേണം","On"))+chip(!ST.wageOn,"tsStSet('wageOn',0)",T("വേണ്ട","Off"))+'</div>'+
   (ST.wageOn?'<label>'+E(T("100 രൂപ വിൽപ്പനയ്ക്ക് എത്ര രൂപ കൂലി","Wage per Rs.100 sold"))+'</label><input id="stW" type="number" inputmode="decimal" value="'+E(+ST.wage>0?ST.wage:"")+'" placeholder="'+E(T("ഉദാ: 10","e.g. 10"))+'">'+
    '<label>'+E(T("കൂലിയുടെ പേര് (ഇഷ്ടമുള്ളത്)","Name for it (optional)"))+'</label><input id="stWn" value="'+E(ST.wageName)+'" maxlength="30" placeholder="'+E(T("ഉദാ: ജോലിക്കാരുടെ കൂലി","e.g. Staff wage"))+'">':'')+'</div>'+
   '<div class="tsC"><b>'+E(T("വില നിർദേശം","Suggested price"))+'</b><label>'+E(T("സാധാരണ ലാഭ % (വാങ്ങൽ വിലയുടെ മുകളിൽ)","Usual profit % on the cost"))+'</label><input id="stM" type="number" inputmode="decimal" value="'+E(ST.mgdef)+'"></div>'+
   '<div class="tsC"><b>GST</b><div>'+chip(ST.gst,"tsStSet('gst',1)",T("ഉണ്ട്","On"))+chip(!ST.gst,"tsStSet('gst',0)",T("ഇല്ല","Off"))+'</div>'+
   (ST.gst?'<label>GSTIN</label><input id="stG" value="'+E(ST.gstin)+'" maxlength="20"><div class="tsM" style="line-height:1.5">'+E(T("ഓരോ ഇനത്തിനും GST % കൊടുക്കുക (ഇനം മാറ്റുക > കൂടുതൽ ഓപ്ഷനുകൾ). വിലകൾ GST ഉൾപ്പെടെയാണെന്ന് കണക്കാക്കും. 'ഇന്നത്തെ കണക്ക്' ലും Excel ലും GST കാണാം. ഇത് കണക്ക് നോക്കാനുള്ള സഹായം മാത്രമാണ്; റിട്ടേൺ നൽകാൻ അക്കൗണ്ടന്റിനെ കാണുക.","Give each item a GST % (edit item > More options). Prices are taken as GST-inclusive. GST shows in Today's account and Excel. This only helps you see the figures - ask an accountant for returns."))+'</div>':'<div class="tsM">'+E(T("GST ഇല്ലാത്ത കടയ്ക്ക് ഇത് ഇല്ല എന്ന് വെച്ചാൽ മതി. പിന്നീട് മാറ്റാം.","A shop without GST can leave this off. It can be switched on later."))+'</div>')+'</div>'+
   (window.__tcPers&&window.__tcPers.lock&&window.__tcPers.lock.line?window.__tcPers.lock.line():"")+
   '<button class="tsBtn" onclick="tsStSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>';
 }
 UI.screen("settings",function(){
  ST={ kind:SH.kind()||"general", name:SH.cfg("name",""), wageOn:SH.wageOn(), wage:SH.wageRate(), wageName:SH.cfg("wageName",""),
   mgdef:SH.cfg("mgdef",SH.kind()==="aquarium"?50:30), gst:SH.cfg("gst","0")==="1", gstin:SH.cfg("gstin","") };
  draw();
 },function(){ return "⚙ "+T("സെറ്റിങ്സ്","Settings"); });
 function grab(){ var g=function(i){ var e=$(i); return e?e.value:null; }; var n=g("stN"); if(n!=null) ST.name=n.replace(/\s+/g," ").trim(); if(g("stW")!=null) ST.wage=g("stW"); if(g("stWn")!=null) ST.wageName=g("stWn").replace(/\s+/g," ").trim(); if(g("stM")!=null) ST.mgdef=g("stM"); if(g("stG")!=null) ST.gstin=g("stG").trim(); }
 window.tsStSet=function(k,v){ grab(); ST[k]=(k==="kind")?v:!!v; draw(); };
 window.tsStSave=function(){
  grab();
  function put(k,v){ v=String(v==null?"":v); if(String(SH.cfg(k,""))!==v) SH.setCfg(k,v); }
  put("kind",ST.kind); put("name",ST.name); put("wageOn",ST.wageOn?"1":"0");
  if(ST.wageOn&&String(ST.wage)!=="") put("wage",Math.max(0,parseFloat(ST.wage)||0));
  if(ST.wageOn) put("wageName",ST.wageName);
  if(String(ST.mgdef)!=="") put("mgdef",Math.max(0,parseFloat(ST.mgdef)||0));
  put("gst",ST.gst?"1":"0"); put("gstin",ST.gstin);
  say(T("സേവ് ചെയ്തു","Saved")); if(window.tsBack) window.tsBack(); else UI.go("home");
 };
})();
