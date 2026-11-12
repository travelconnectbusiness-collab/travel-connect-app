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
   '<div class="tsC"><label style="margin-top:0">'+E(T("ഷോപ്പിന്റെ പേര്","Shop name"))+'</label><input id="stN" value="'+E(ST.name)+'" placeholder="'+E((ST.kind==="aquarium"?T("ഉദാ: ഗ്രീൻ അക്വേറിയം","e.g. Green Aquarium"):ST.kind==="workshop"?T("ഉദാ: ശ്രീ ഓട്ടോ വർക്ക്സ്","e.g. Sri Auto Works"):T("ഉദാ: ന്യൂ സ്റ്റോർ","e.g. New Store")))+'">'+
   '<label>'+E(T("ഷോപ്പിന്റെ തരം","Kind of shop"))+'</label><div>'+chip(aq,"tsStSet('kind','aquarium')","🐠 "+T("അക്വേറിയം / വളർത്തുമൃഗങ്ങൾ","Aquarium / pets"))+chip(ST.kind==='general',"tsStSet('kind','general')","🏪 "+T("മറ്റ് കട","Another shop"))+chip(ST.kind==='workshop',"tsStSet('kind','workshop')","🔧 "+T("വർക്ക്ഷോപ്പ് / സ്പെയർ പാർട്സ്","Workshop / spare parts"))+'</div>'+
   '<div class="tsM">'+E(T("അക്വേറിയം തിരഞ്ഞാൽ മീൻ വിഭാഗവും ചത്തത് എന്ന കാരണവും കാണിക്കും.","Aquarium shows the Fish section and 'Died' as a loss reason."))+'</div></div>'+
   '<div class="tsC"><b>'+E(T("കൂലി (ജോലിക്കാർക്ക്)","Wage (for the one who sells)"))+'</b><div>'+chip(ST.wageOn,"tsStSet('wageOn',1)",T("വേണം","On"))+chip(!ST.wageOn,"tsStSet('wageOn',0)",T("വേണ്ട","Off"))+'</div>'+
   (ST.wageOn?'<div class="tsM" style="line-height:1.5">'+E(T("ഓരോ ജോലിക്കാരനും: മാസശമ്പളം ഉണ്ടെങ്കിൽ അത്, കൂടാതെ/അല്ലെങ്കിൽ ഷോപ്പിന്റെ വിൽപ്പനയിൽ 100 രൂപയ്ക്ക് ഇത്ര രൂപ.","For each person: a monthly salary, and/or Rs. per Rs.100 of the shop's sales."))+'</div>'+
    SH.staff().map(function(p){ return '<div class="tsRow" onclick="tsStStaff(\''+E(p.id)+'\')"><div><b>'+E(p.n||T("കൂലി","Wage"))+'</b><div class="tsM">'+(p.sal>0?E(T("ശമ്പളം ₹","Salary Rs."))+p.sal:"")+(p.sal>0&&p.pc>0?" · ":"")+(p.pc>0?E(T("100-ന് ₹","Rs. per 100: "))+p.pc:"")+(!(p.sal>0||p.pc>0)?E(T("തുക വെച്ചിട്ടില്ല","no amount set")):"")+(p.e?" · "+E(T("നിർത്തി ","left "))+E(UI.dmy(p.e)):"")+'</div></div><b>✎</b></div>'; }).join("")+
    '<button class="tsBtn g" onclick="tsStStaff(\'\')">➕ '+E(T("ജോലിക്കാരനെ ചേർക്കുക","Add a person"))+'</button>':'')+'</div>'+
   '<div class="tsC"><b>'+E(T("വില നിർദേശം","Suggested price"))+'</b><label>'+E(T("സാധാരണ ലാഭ % (വാങ്ങൽ വിലയുടെ മുകളിൽ)","Usual profit % on the cost"))+'</label><input id="stM" type="number" inputmode="decimal" value="'+E(ST.mgdef)+'"></div>'+
   '<div class="tsC"><b>GST</b><div>'+chip(ST.gst,"tsStSet('gst',1)",T("ഉണ്ട്","On"))+chip(!ST.gst,"tsStSet('gst',0)",T("ഇല്ല","Off"))+'</div>'+
   (ST.gst?'<label>GSTIN</label><input id="stG" value="'+E(ST.gstin)+'" maxlength="20"><div class="tsM" style="line-height:1.5">'+E(T("ഓരോ ഇനത്തിനും GST % കൊടുക്കുക (ഇനം മാറ്റുക > കൂടുതൽ ഓപ്ഷനുകൾ). വിലകൾ GST ഉൾപ്പെടെയാണെന്ന് കണക്കാക്കും. 'ഇന്നത്തെ കണക്ക്' ലും Excel ലും GST കാണാം. ഇത് കണക്ക് നോക്കാനുള്ള സഹായം മാത്രമാണ്; റിട്ടേൺ നൽകാൻ അക്കൗണ്ടന്റിനെ കാണുക.","Give each item a GST % (edit item > More options). Prices are taken as GST-inclusive. GST shows in Today's account and Excel. This only helps you see the figures - ask an accountant for returns."))+'</div>':'<div class="tsM">'+E(T("GST ഇല്ലാത്ത കടയ്ക്ക് ഇത് ഇല്ല എന്ന് വെച്ചാൽ മതി. പിന്നീട് മാറ്റാം.","A shop without GST can leave this off. It can be switched on later."))+'</div>')+'</div>'+
   (window.__tcPers&&window.__tcPers.lock&&window.__tcPers.lock.line?window.__tcPers.lock.line():"")+
   '<button class="tsBtn" onclick="tsStSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>';
 }
 UI.screen("settings",function(){
  ST={ kind:SH.kind()||"general", name:SH.cfg("name",""), wageOn:SH.wageOn(),
   mgdef:SH.cfg("mgdef",SH.kind()==="aquarium"?50:30), gst:SH.cfg("gst","0")==="1", gstin:SH.cfg("gstin","") };
  draw();
 },function(){ return "⚙ "+T("സെറ്റിങ്സ്","Settings"); });
 function grab(){ var g=function(i){ var e=$(i); return e?e.value:null; }; var n=g("stN"); if(n!=null) ST.name=n.replace(/\s+/g," ").trim(); if(g("stM")!=null) ST.mgdef=g("stM"); if(g("stG")!=null) ST.gstin=g("stG").trim(); }
 window.tsStSet=function(k,v){ grab(); ST[k]=(k==="kind")?v:!!v; draw(); };
 /* a person of the staff: opens on its own sheet and saves the whole list straight away (the Settings Save button is for the rest) */
 var SF=null;
 window.tsStStaff=function(id){
  grab(); var L=SH.staff(), p=null; L.forEach(function(q){ if(q.id===id) p=q; }); SF={id:p?p.id:"",L:L};
  p=p||{n:"",sal:"",pc:"",s:"",e:"",b:L.length?"own":""}; SF.b=p.b||"";
  UI.sheet('<h3 style="margin:0">'+E(id?T("ജോലിക്കാരൻ","Person"):T("പുതിയ ജോലിക്കാരൻ","New person"))+'</h3>'+
   '<label>'+E(T("പേര്","Name"))+'</label><input id="sfN" maxlength="30" value="'+E(p.n)+'">'+
   '<label>'+E(T("മാസശമ്പളം ₹ (ഉണ്ടെങ്കിൽ)","Monthly salary Rs. (if any)"))+'</label><input id="sfS" type="number" inputmode="decimal" value="'+E(+p.sal>0?p.sal:"")+'" placeholder="'+E(T("ഉദാ: 8000","e.g. 8000"))+'">'+
   '<label>'+E(T("വിൽപ്പനയിൽ നിന്ന്: 100 രൂപയ്ക്ക് എത്ര രൂപ (ഇല്ലെങ്കിൽ ഒഴിച്ചിടുക)","Share of sales: Rs. per Rs.100 (empty if none)"))+'</label><input id="sfP" type="number" inputmode="decimal" value="'+E(+p.pc>0?p.pc:"")+'" placeholder="'+E(T("ഉദാ: 5","e.g. 5"))+'">'+
   '<div id="sfB"><span class="tsChip'+(p.b==="own"?"":" on")+'" data-m="" onclick="tsStB(\'\')">'+E(T("ഷോപ്പിന്റെ ആകെ വിൽപ്പന","All the shop's sales"))+'</span><span class="tsChip'+(p.b==="own"?" on":"")+'" data-m="own" onclick="tsStB(\'own\')">'+E(T("ഇദ്ദേഹം വിറ്റത് മാത്രം","Only what this person sold"))+'</span></div>'+
   '<div class="tsM">'+E(T("'ഇദ്ദേഹം വിറ്റത്' എടുക്കുമ്പോൾ വിൽപ്പന ചേർക്കുമ്പോൾ \"ആര് വിറ്റു\" തിരഞ്ഞെടുക്കണം.","For 'only what this person sold', pick \"Sold by\" on each sale."))+'</div>'+
   '<details style="margin-top:8px"'+(p.s||p.e?' open':'')+'><summary style="font-weight:800;padding:6px 0">'+E(T("ചേർന്ന / നിർത്തിയ തീയതി (ഓപ്ഷണൽ)","Joined / left date (optional)"))+'</summary>'+
   '<label>'+E(T("ചേർന്ന തീയതി","Joined"))+'</label><input id="sfF" type="date" value="'+E(p.s||"")+'"><label>'+E(T("നിർത്തിയ തീയതി","Left"))+'</label><input id="sfT" type="date" value="'+E(p.e||"")+'"></details>'+
   '<button class="tsBtn" onclick="tsStStaffSave()">✔ '+E(T("സേവ് ചെയ്യുക","Save"))+'</button>'+
   (id?'<button class="tsBtn r" onclick="tsStStaffDel()">🗑 '+E(T("ഒഴിവാക്കുക (പഴയ കണക്ക് മാറും)","Remove (past months change)"))+'</button>':'')+
   '<button class="tsBtn g" onclick="tsCloseSheet()">'+E(T("റദ്ദാക്കുക","Cancel"))+'</button>');
 };
 window.tsStB=function(v){ if(SF) SF.b=v; UI.mchipSet("sfB",v); };
 window.tsStStaffSave=function(){
  if(!SF) return; var L=SF.L.slice(), n=($("sfN").value||"").replace(/\s+/g," ").trim(), s=parseFloat($("sfS").value), pc=parseFloat($("sfP").value);
  var o={id:SF.id||SH.H.uid(),n:n,sal:s>0?s:0,pc:pc>0?pc:0,s:$("sfF").value||"",e:$("sfT").value||"",b:SF.b==="own"?"own":""};
  if(o.s&&o.e&&o.e<o.s){ say(T("നിർത്തിയ തീയതി ചേർന്ന തീയതിക്ക് മുമ്പാണ്","'Left' is before 'Joined'")); return; }
  var k=-1; L.forEach(function(q,i){ if(q.id===o.id) k=i; }); if(k>=0) L[k]=o; else L.push(o);
  SH.setStaff(L); SF=null; UI.closeSheet(); say(T("സേവ് ചെയ്തു","Saved")); draw();
 };
 window.tsStStaffDel=function(){
  if(!SF||!SF.id) return; if(!confirm(T("ഈ ജോലിക്കാരനെ ഒഴിവാക്കട്ടേ? പഴയ മാസങ്ങളിലെ കൂലി കണക്കിൽ നിന്ന് ഇദ്ദേഹം പോകും. (ജോലി നിർത്തിയെങ്കിൽ 'നിർത്തിയ തീയതി' വെക്കുന്നതാണ് നല്ലത്.)","Remove this person? Their wage disappears from past months too. (If they left, set a 'Left' date instead.)"))) return;
  SH.setStaff(SF.L.filter(function(q){ return q.id!==SF.id; })); SF=null; UI.closeSheet(); draw();
 };
 window.tsStSave=function(){
  grab();
  function put(k,v){ v=String(v==null?"":v); if(String(SH.cfg(k,""))!==v) SH.setCfg(k,v); }
  put("kind",ST.kind); put("name",ST.name); put("wageOn",ST.wageOn?"1":"0");
  if(String(ST.mgdef)!=="") put("mgdef",Math.max(0,parseFloat(ST.mgdef)||0));
  put("gst",ST.gst?"1":"0"); put("gstin",ST.gstin);
  say(T("സേവ് ചെയ്തു","Saved")); if(window.tsBack) window.tsBack(); else UI.go("home");
 };
})();
