/* ASSOCIATION BOOK part 4 - COMMITTEES (tc-assoc4.js, loaded right after tc-assoc3.js).
   Owner 2026-11-20: "organisations like the Kerala Taxi Drivers' Organisation have a state committee, district committees, zones, units;
   some are national, some have taluk and panchayat committees - how do we add all that?"
   - The organisation itself is the top committee. Under it any number of levels, with any names (state › district › zone › unit,
     CDS › ADS › neighbourhood group, ...). Members belong to a committee (usually a unit).
   - A post (Office bearers) can belong to a committee: that person sees and changes only that committee and those below it
     (the server checks it on every request - /api/assoc).
   - Each committee keeps its own book (ledger / reports: choose the committee). A committee can send a share (%) of its
     collection to the committee above it: "Send the share" - an expense below, an income above, one entry.
   - Roll-up: every committee shows members, dues and this year's collection of itself + everything below it; tap to go down.
   - "Make units from the areas": an existing book's areas become unit committees in one tap (members move with them). */
(function(){
 if(window.__tcAssoc4) return;
 var X=window.__tcAs; if(!X) return;
 window.__tcAssoc4=1;
 var $=function(id){ return document.getElementById(id); }, E=X.E, T=X.T, money=X.money, v=X.v, chips=X.chips, chipVal=X.chipVal;
 var LV={
  shg:[["ജില്ലാ മിഷൻ","District mission"],["സി.ഡി.എസ്","CDS"],["എ.ഡി.എസ്","ADS"],["അയൽക്കൂട്ടം","Neighbourhood group"]],
  club:[["ഏരിയ","Area"],["ബ്ലോക്ക്","Block"],["യൂണിറ്റ്","Unit"]],
  res:[["ബ്ലോക്ക്","Block"],["റോഡ് / ലെയ്ൻ","Road / lane"]],
  any:[["ദേശീയം","National"],["സംസ്ഥാനം","State"],["ജില്ല","District"],["താലൂക്ക്","Taluk"],["ഏരിയ / സോൺ","Area / zone"],["പഞ്ചായത്ത്","Panchayat"],["യൂണിറ്റ്","Unit"]]
 };
 function levels(){ var t=X.A().cfg.type; return (LV[t]||LV.any).map(function(x){ return T(x[0],x[1]); }); }
 function isAdmin(){ var a=X.A(); return !a.cloud||a.acc==="admin"; }
 function key(id){ return id==="_"||!id?"":id; }

 /* ---------- one pass over the book: own numbers of every committee, then rolled up the tree ---------- */
 function agg(){
  var a=X.A(), cm=X.comMap(), k=function(c){ return c&&cm[c]?c:""; }, yr=X.today().slice(0,4), own={};
  var b=function(x){ return own[x]||(own[x]={mem:0,dueN:0,due:0,col:0,sub:0,rin:0,rout:0,bal:0}); };
  b("").bal=(+a.cfg.openCash||0)+(+a.cfg.openBank||0);
  X.coms().forEach(function(c){ b(c.id).bal+=(+c.openCash||0)+(+c.openBank||0); });
  X.members().forEach(function(m){ if(m.status==="l") return; var o=b(k(m.com)); o.mem++; var d=X.dues(m).length; if(d){ o.dueN++; o.due+=d*X.memAmt(m); } });
  X.live(a.pays).forEach(function(p){ var o=b(k(p.com)), n=+p.amt||0; o.sub+=n; o.bal+=n; if(String(p.date).slice(0,4)===yr) o.col+=n; });
  X.live(a.led).forEach(function(l){ var n=+l.amt||0, f=b(k(l.com));
   if(l.cat==="remit"){ var t=b(k(l.to)); f.rout+=n; f.bal-=n; t.rin+=n; t.bal+=n; return; }
   f.bal+=l.t==="in"?n:-n; });
  var roll={}, sum=function(x){ if(roll[x]) return roll[x]; var o=b(x), r={mem:o.mem,dueN:o.dueN,due:o.due,col:o.col,bal:o.bal}; roll[x]=r;
   X.kidsOf(x).forEach(function(c){ var s=sum(c.id); r.mem+=s.mem; r.dueN+=s.dueN; r.due+=s.due; r.col+=s.col; r.bal+=s.bal; }); return r; };
  return {own:function(x){ return b(x); },roll:sum};
 }
 /* what this committee still has to send up: share % of (its receipts + shares it received) - what it already sent */
 function shareDue(G,id){ var c=X.comMap()[id]; if(!c||!(+c.share>0)) return null; var o=G.own(id), base=o.sub+o.rin, should=Math.round(base*(+c.share)/100); return {base:base,should:should,sent:o.rout,due:Math.max(0,should-o.rout)}; }

 /* ---------- the committees screen (drill-down) ---------- */
 function numbers(r){ return E(r.mem+" "+T("മെമ്പർ",r.mem===1?"member":"members")+" · "+T("ഈ വർഷം","this year")+" "+money(r.col)+(r.dueN?" · "+r.dueN+" "+T("പേർക്ക് ബാക്കി","with dues")+" "+money(r.due):"")); }
 X.screen("coms",function(arg){
  var a=X.A(), roots=X.myRoots(), cm=X.comMap(), id=arg==null?roots[0]:key(arg); if(id&&!cm[id]) id=roots[0];
  var node=cm[id]||null, G=agg(), R=G.roll(id), own=G.own(id), kids=X.kidsOf(id);
  var areas=[]; if(!X.coms().length){ (a.cfg.areas||[]).forEach(function(x){ if(x&&areas.indexOf(x)<0) areas.push(x); }); X.members().forEach(function(m){ if(m.area&&areas.indexOf(m.area)<0) areas.push(m.area); }); }
  var up=node&&roots.indexOf(id)<0?(node.parent||"_"):null;
  var h='';
  if(!X.coms().length) h+='<div class="asC" style="background:#eef6ff"><b>'+E(T("കമ്മിറ്റികൾ","Committees"))+'</b><div class="asM" style="margin-top:4px">'+E(T("വലിയ സംഘടനകൾക്ക്: സംസ്ഥാനം › ജില്ല › സോൺ › യൂണിറ്റ് (കുടുംബശ്രീക്ക് സി.ഡി.എസ് › എ.ഡി.എസ് › അയൽക്കൂട്ടം) എന്നിങ്ങനെ എത്ര തട്ടും ചേർക്കാം. ഓരോ കമ്മിറ്റിക്കും സ്വന്തം ഭാരവാഹികളും കണക്കും; അവർക്ക് സ്വന്തം കമ്മിറ്റിയും താഴെയുള്ളവയും മാത്രം കാണാം. ചെറിയ സംഘടനയ്ക്ക് ഇത് വേണ്ട.","For big organisations: add as many levels as you need - state › district › zone › unit (for Kudumbashree CDS › ADS › neighbourhood group). Each committee has its own office bearers and book; they see only their committee and those below it. A small organisation does not need this."))+'</div>'+
   (areas.length&&isAdmin()?'<span class="asBtn l" data-w="1" onclick="tcAsAreasToUnits()">'+E(T("ഇപ്പോഴത്തെ "+areas.length+" "+X.areaName()+" യൂണിറ്റുകളാക്കുക","Make the "+areas.length+" areas units"))+'</span>':'')+'</div>';
  h+='<div class="asC">'+(id?'<div class="asM">'+E(X.comPath(node.parent||"")||X.orgName())+'</div>':'')+'<div style="font-weight:800;font-size:17px">'+E(X.comName(id))+(node&&node.lvl?' <span class="asBd" style="background:#e9f3f4;color:#0b4f5a">'+E(node.lvl)+'</span>':'')+'</div>'+
   '<div style="display:flex;gap:8px;margin-top:10px;text-align:center">'+
   '<div style="flex:1;background:#f4f7f8;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:18px">'+R.mem+'</div><div class="asM">'+E(T("മെമ്പർമാർ","Members"))+'</div></div>'+
   '<div style="flex:1;background:#eef8f0;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:15px;color:#1c6b2c">'+money(R.col)+'</div><div class="asM">'+E(T("ഈ വർഷം പിരിഞ്ഞത്","Collected this year"))+'</div></div>'+
   '<div style="flex:1;background:#fdecec;border-radius:10px;padding:8px"><div style="font-weight:800;font-size:15px;color:#a12d2d">'+money(R.due)+'</div><div class="asM">'+E(R.dueN+" "+T("പേർക്ക് ബാക്കി","with dues"))+'</div></div></div>'+
   '<div class="asM" style="margin-top:8px">'+E(T("ഈ കമ്മിറ്റിയുടെ ബാക്കി","This committee's balance"))+': <b>'+money(own.bal)+'</b>'+(kids.length?' · '+E(T("താഴെയുള്ളവ ചേർത്ത്","with those below"))+': <b>'+money(R.bal)+'</b>':'')+'</div>'+
   '<span class="asBtn l" onclick="tcAsComMembers(\''+(id||"_")+'\')">'+E(T("മെമ്പർമാർ","Members"))+'</span>'+
   (node&&isAdmin()&&roots.indexOf(id)<0?'<span class="asBtn l" data-w="1" onclick="tcAsGo(\'cform\',\'e:'+id+'\')">'+E(T("മാറ്റുക","Edit"))+'</span>':'')+
   (kids.length?'<span class="asBtn l" onclick="tcAsPrintComs(\''+(id||"_")+'\')">'+E(T("പ്രിന്റ്","Print"))+'</span>':'')+'</div>';
  var sd=id?shareDue(G,id):null;
  if(sd) h+='<div class="asC"><div style="font-weight:700">'+E(T("മേൽകമ്മിറ്റിക്കുള്ള വിഹിതം","Share to the upper committee"))+' ('+E(node.share+"%")+' → '+E(X.comName(node.parent||""))+')</div>'+
   '<div class="asM">'+E(T("വരവ്","Income")+" "+money(sd.base)+" × "+node.share+"% = "+money(sd.should)+" · "+T("അയച്ചത്","sent")+" "+money(sd.sent))+'</div>'+
   '<div style="font-weight:700;margin-top:4px;color:'+(sd.due?"#a12d2d":"#1c6b2c")+'">'+E(sd.due?T("അയയ്ക്കാനുള്ളത്","To send")+" "+money(sd.due):T("ബാക്കിയില്ല ✓","Nothing to send ✓"))+'</div>'+
   '<span class="asBtn g" onclick="tcAsGo(\'lform\',\'r:'+id+':'+sd.due+'\')">'+E(T("വിഹിതം അയച്ചത് ചേർക്കുക","Record the share sent"))+'</span></div>';
  h+='<div class="asC"><div style="display:flex;align-items:center"><div style="font-weight:700;flex:1">'+E(T("താഴെയുള്ള കമ്മിറ്റികൾ","Committees below"))+' ('+kids.length+')</div>'+(isAdmin()?'<span class="asBtn" data-w="1" style="margin:0" onclick="tcAsGo(\'cform\',\'n:'+(id||"_")+'\')">+ '+E(T("ചേർക്കുക","Add"))+'</span>':'')+'</div>'+
   (kids.length?kids.map(function(c){ var r=G.roll(c.id), n=X.kidsOf(c.id).length; return '<div class="asR" onclick="tcAsGo(\'coms\',\''+c.id+'\')"><div style="flex:1;min-width:0"><div style="font-weight:700">'+E(c.name)+(c.lvl?' <span class="asM">· '+E(c.lvl)+'</span>':'')+'</div><div class="asM">'+numbers(r)+(n?" · "+n+" "+E(T("കീഴ്കമ്മിറ്റി","below")):"")+'</div></div><span style="font-size:20px;color:#0b6f7d">&#8250;</span></div>'; }).join(""):'<div class="asM">'+E(T("ഇല്ല","None"))+'</div>')+'</div>';
  if(up!=null) h+='<div class="asC"><span class="asBtn l" style="margin:0" onclick="tcAsGo(\'coms\',\''+up+'\')">&#8593; '+E(X.comName(key(up)))+'</span></div>';
  return {title:T("കമ്മിറ്റികൾ","Committees"),html:h};
 });
 window.tcAsComMembers=function(id){ X.mFilter.com=key(id); X.mFilter.area=""; X.go("members"); };
 window.tcAsPrintComs=function(id){
  id=key(id); var G=agg(), tr=function(c,r){ return '<tr><td>'+E(c)+'</td><td style="text-align:right">'+r.mem+'</td><td style="text-align:right">'+money(r.col)+'</td><td style="text-align:right">'+r.dueN+'</td><td style="text-align:right">'+money(r.due)+'</td><td style="text-align:right">'+money(r.bal)+'</td></tr>'; };
  var rows=X.kidsOf(id).map(function(c){ return tr(c.name+(c.lvl?" ("+c.lvl+")":""),G.roll(c.id)); }).join("");
  X.printHtml('<h2>'+E(X.orgName())+'</h2><h3>'+E(X.comPath(id)||X.comName(id))+' - '+E(T("കമ്മിറ്റി റിപ്പോർട്ട്","Committee report"))+' ('+E(X.dmy(X.today()))+')</h3><table style="width:100%;border-collapse:collapse;font-size:13px" border="1" cellpadding="5"><tr><th>'+E(T("കമ്മിറ്റി","Committee"))+'</th><th>'+E(T("മെമ്പർ","Members"))+'</th><th>'+E(T("ഈ വർഷം പിരിഞ്ഞത്","Collected this year"))+'</th><th>'+E(T("ബാക്കിയുള്ളവർ","With dues"))+'</th><th>'+E(T("ബാക്കി തുക","Dues"))+'</th><th>'+E(T("കയ്യിലുള്ളത്","Balance"))+'</th></tr>'+rows+tr(T("ആകെ","Total"),G.roll(id)).replace("<tr>",'<tr style="font-weight:700">')+'</table>');
 };

 /* ---------- add / edit a committee ---------- */
 X.screen("cform",function(arg){
  arg=String(arg||""); var ed=arg.indexOf("e:")===0?X.comMap()[arg.slice(2)]:null, parent=ed?(ed.parent||"_"):(arg.indexOf("n:")===0?arg.slice(2):(X.myRoot()||"_"));
  var pl=X.comMap()[key(parent)], L=levels(), nextLv=pl&&L.indexOf(pl.lvl)>=0?L[Math.min(L.length-1,L.indexOf(pl.lvl)+1)]:(key(parent)?"":L[0]);
  var lv=ed?ed.lvl:nextLv, bad=ed?X.subOf(ed.id):{};
  var opts=X.comChoices().filter(function(o){ return !bad[key(o[0])]; });
  var h='<div class="asC"><label>'+E(T("കമ്മിറ്റിയുടെ പേര് *","Name of the committee *"))+'</label><input id="tcAsCn" value="'+E(ed?ed.name:"")+'" placeholder="'+E(T("ഉദാ: കോഴിക്കോട് ജില്ല / വളയം യൂണിറ്റ്","e.g. Kozhikode district / Valayam unit"))+'">'+
   '<label>'+E(T("തട്ട്","Level"))+'</label><div>'+chips("clv",L.map(function(x){ return [x,x]; }),lv)+'</div><input id="tcAsCl" style="margin-top:6px" value="'+E(L.indexOf(lv)<0?lv:"")+'" placeholder="'+E(T("മറ്റൊരു പേര് (ഉണ്ടെങ്കിൽ)","Another name (if any)"))+'">'+
   '<label>'+E(T("മേൽകമ്മിറ്റി","Upper committee"))+'</label><select id="tcAsCp">'+opts.map(function(o){ return '<option value="'+E(o[0])+'"'+(o[0]===parent?' selected':'')+'>'+E(o[1])+'</option>'; }).join("")+'</select>'+
   '<label>'+E(T("വരവിന്റെ എത്ര % മേൽകമ്മിറ്റിക്ക് (വിഹിതം; ഇല്ലെങ്കിൽ 0)","Share of the income to the upper committee % (0 if none)"))+'</label><input id="tcAsCs" type="number" inputmode="decimal" value="'+E(ed&&+ed.share>0?ed.share:"")+'" placeholder="0">'+
   '<details><summary class="asM" style="margin-top:8px;cursor:pointer">'+E(T("കൂടുതൽ (തുടക്കത്തിലെ ബാക്കി)","More (opening balance)"))+'</summary><div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("കയ്യിൽ ₹","Cash ₹"))+'</label><input id="tcAsCc" type="number" value="'+E(ed&&ed.openCash||"")+'"></div><div style="flex:1"><label>'+E(T("ബാങ്കിൽ ₹","Bank ₹"))+'</label><input id="tcAsCb" type="number" value="'+E(ed&&ed.openBank||"")+'"></div></div></details>'+
   '<span class="asBtn g" onclick="tcAsSaveCom(\''+(ed?ed.id:"")+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span>'+(ed?'<span class="asBtn r" onclick="tcAsDelCom(\''+ed.id+'\')">'+E(T("ഒഴിവാക്കുക","Remove"))+'</span>':'')+'</div>';
  return {title:ed?T("കമ്മിറ്റി മാറ്റുക","Edit committee"):T("പുതിയ കമ്മിറ്റി","New committee"),html:h,after:function(){ window.tcAsChip_clv=function(){ var e=$("tcAsCl"); if(e) e.value=""; }; }};
 });
 window.tcAsSaveCom=function(id){
  var a=X.A(), name=v("tcAsCn").slice(0,60); if(!name){ X.say(T("കമ്മിറ്റിയുടെ പേര് നൽകുക","Enter the name of the committee")); return; }
  var parent=key(v("tcAsCp")), share=Math.min(100,Math.max(0,+v("tcAsCs")||0));
  if(id&&X.subOf(id)[parent]){ X.say(T("മേൽകമ്മിറ്റി ശരിയല്ല","The upper committee is not right")); return; }
  if(X.coms().some(function(c){ return c.id!==id&&(c.parent||"")===parent&&String(c.name).toLowerCase()===name.toLowerCase(); })){ X.say(T("ഈ പേരിൽ ഒരു കമ്മിറ്റി ഇവിടെ ഉണ്ട്","A committee with this name is already here")); return; }
  var c=id?X.comMap()[id]:null; if(!c){ c={id:X.uid()}; a.coms.push(c); }
  c.name=name; c.lvl=(v("tcAsCl")||chipVal("clv")||"").slice(0,30); c.parent=parent; c.share=share; c.openCash=+v("tcAsCc")||0; c.openBank=+v("tcAsCb")||0;
  delete c._by; delete c._at;
  X.members().forEach(function(m){ if(m.com===c.id&&m.area!==c.name){ m.area=c.name; } });   /* the name shown on old screens follows */
  X.op("com",c); X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
 };
 window.tcAsDelCom=function(id){
  var c=X.comMap()[id]; if(!c) return;
  if(X.kidsOf(id).length){ X.say(T("ആദ്യം താഴെയുള്ള കമ്മിറ്റികൾ മാറ്റുക / ഒഴിവാക്കുക","First move / remove the committees below it")); return; }
  if(X.members().some(function(m){ return X.comOf(m)===id; })){ X.say(T("ഈ കമ്മിറ്റിയിൽ മെമ്പർമാരുണ്ട് - ആദ്യം അവരെ മറ്റൊരു കമ്മിറ്റിയിലേക്ക് മാറ്റുക","This committee has members - move them to another committee first")); return; }
  if(!confirm(T(c.name+" - ഒഴിവാക്കട്ടെ? (പഴയ കണക്കുകൾ മുകളിലെ കമ്മിറ്റിയുടെ കണക്കിൽ കാണും)",c.name+" - remove? (its old entries show in the top committee's book)"))) return;
  c.del=X.today(); X.op("com",c,true); X.sv(); X.back(); X.back();
 };
 /* an existing book: every area becomes a unit committee under the top, and its members move into it */
 window.tcAsAreasToUnits=function(){
  var a=X.A(), areas=[]; (a.cfg.areas||[]).forEach(function(x){ if(x&&areas.indexOf(x)<0) areas.push(x); }); X.members().forEach(function(m){ if(m.area&&areas.indexOf(m.area)<0) areas.push(m.area); });
  if(!areas.length||!confirm(T(areas.length+" "+X.areaName()+" യൂണിറ്റ് കമ്മിറ്റികളാക്കട്ടെ? മെമ്പർമാർ അവരുടെ യൂണിറ്റിലേക്ക് മാറും.","Make the "+areas.length+" areas unit committees? Members move into their units."))) return;
  var lv=X.areaName(), map={};
  areas.forEach(function(x){ var c={id:X.uid(),name:String(x).slice(0,60),lvl:lv.slice(0,30),parent:"",share:0}; a.coms.push(c); map[x]=c.id; X.op("com",c); });
  X.members().forEach(function(m){ if(m.area&&map[m.area]){ m.com=map[m.area]; X.op("member",m); } });
  X.sv(); X.say(T("യൂണിറ്റുകൾ ഉണ്ടാക്കി ✓","Units made ✓")); X.render();
 };

 /* ---------- home tile ---------- */
 var oldTiles=window.__tcAsHomeTiles;
 window.__tcAsHomeTiles=function(){ var s=typeof oldTiles==="function"?oldTiles():""; return X.tile("&#127970;",T("കമ്മിറ്റികൾ","Committees"),"tcAsGo('coms')",X.coms().length?X.coms().length+"":"")+s; };
 window.__tcAsCom={agg:agg,shareDue:shareDue,levels:levels};
})();
