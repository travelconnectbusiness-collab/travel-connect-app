/* ASSOCIATION BOOK part 2 (tc-assoc2.js, loaded by tc-regdocs.js right after tc-assoc.js):
   ledger (വരവ്-ചെലവ് - subscriptions come in by themselves from the receipts), minutes book + actions on members,
   reports (month / year statement: on screen, Print = PDF, Excel), settings, and the voice answers
   ("വരിസംഖ്യ അടയ്ക്കാത്തവർ ആരൊക്കെ", "ഈ മാസം എത്ര പിരിഞ്ഞു", "ബാക്കി എത്ര", "എത്ര മെമ്പർമാർ"). */
(function(){
 if(window.__tcAssoc2) return;
 var X=window.__tcAs; if(!X) return;
 window.__tcAssoc2=1;
 var $=function(id){ return document.getElementById(id); }, E=X.E, T=X.T, money=X.money, dmy=X.dmy, v=X.v, chips=X.chips, chipVal=X.chipVal;
 var INC=[["don",["സംഭാവന","Donation"]],["fine",["പിഴ","Fine"]],["fund",["ക്ഷേമനിധി","Welfare fund"]],["oth",["മറ്റ് വരവ്","Other income"]]];
 var EXP=[["meet",["യോഗം","Meeting"]],["help",["സഹായം","Help / welfare"]],["office",["ഓഫീസ്","Office"]],["travel",["യാത്ര","Travel"]],["oth",["മറ്റ് ചെലവ്","Other expense"]]];
 function catName(t,k){ if(k==="sub") return X.subName(); if(k==="remit") return T("മേൽകമ്മിറ്റിക്ക് വിഹിതം","Share to upper committee"); if(k==="remitin") return T("കീഴ്കമ്മിറ്റിയിൽ നിന്ന് വിഹിതം","Share from a lower committee"); var L=t==="in"?INC:EXP; for(var i=0;i<L.length;i++) if(L[i][0]===k) return T(L[i][1][0],L[i][1][1]); return k||""; }
 /* every money line: the ledger + the subscription receipts (cash / UPI count as 'cash in hand' unless Bank).
    Phase 4: each committee keeps its own book. set = {committee id: 1} ("" = the top), or null = the whole book in this phone.
    A share sent up ("remit") is an expense of the sender and an income of the upper committee; when both are in the set it cancels out. */
 function lines(set){
  var a=X.A(), out=[], cm=X.comMap(), key=function(c){ return c&&cm[c]?c:""; };
  X.live(a.pays).forEach(function(p){ var k=key(p.com); if(set&&!set[k]) return; var m=X.memberById(p.mid); out.push({id:p.id,pay:1,t:"in",amt:+p.amt||0,cat:"sub",mode:p.mode==="b"?"b":"c",date:p.date,com:k,note:(m?m.name:"")+" · "+(p.periods||[]).map(X.perLabel).join(", ")+" · "+(p.rc||"")}); });
  X.live(a.led).forEach(function(l){ var k=key(l.com), base={id:l.id,amt:+l.amt||0,mode:l.mode==="b"?"b":"c",date:l.date};
   if(l.cat==="remit"){ var to=key(l.to), inC=!set||set[k], inT=!set||set[to]; if(inC&&inT) return;
    if(inC) out.push(Object.assign({t:"out",cat:"remit",com:k,note:X.comName(to)+(l.note?" · "+l.note:"")},base));
    if(inT) out.push(Object.assign({t:"in",cat:"remitin",com:to,note:X.comName(k)+(l.note?" · "+l.note:"")},base)); return; }
   if(set&&!set[k]) return; out.push(Object.assign({t:l.t,cat:l.cat,com:k,note:l.note||""},base)); });
  return out.sort(function(x,y){ return x.date<y.date?1:(x.date>y.date?-1:0); });
 }
 function opening(set){ var c=X.A().cfg, b={cash:0,bank:0}; if(!set||set[""]){ b.cash+=+c.openCash||0; b.bank+=+c.openBank||0; } X.coms().forEach(function(k){ if(!set||set[k.id]){ b.cash+=+k.openCash||0; b.bank+=+k.openBank||0; } }); return b; }
 function balTo(before,set){   /* balance of everything dated before 'before' (or all when empty) */
  var b=opening(set);
  lines(set).forEach(function(l){ if(before&&l.date>=before) return; var s=l.t==="in"?1:-1; if(l.mode==="b") b.bank+=s*l.amt; else b.cash+=s*l.amt; });
  return b;
 }
 /* which book: null = my own committee, "*" = mine and all below it combined, else a committee ("_" = the top) */
 function setFor(sel){ if(!X.coms().length) return null; if(sel==="*") return X.scopeSet(); var k=sel==null?X.myRoot():(sel==="_"?"":sel), o={}; o[k]=1; return o; }
 function bookPick(id,sel){ if(!X.coms().length) return ""; return '<div style="margin-bottom:8px">'+X.comSelect(id,sel==null?(X.myRoot()||"_"):sel,[["*",T("എല്ലാം ചേർത്ത് (കീഴ്കമ്മിറ്റികളും)","All together (with lower committees)")]])+'</div>'; }
 function bookName(sel){ if(!X.coms().length) return ""; if(sel==="*") return X.comName(X.myRoot())+" + "+T("കീഴ്കമ്മിറ്റികൾ","lower committees"); return X.comName(sel==null?X.myRoot():(sel==="_"?"":sel)); }
 window.__tcAsBal=function(){ return balTo("",setFor(null)); };
 window.__tcAsBook={lines:lines,balTo:balTo,opening:opening,setFor:setFor,catName:catName};

 /* ---------- ledger ---------- */
 var lMon="", lCom=null;
 X.screen("ledger",function(){
  if(!lMon) lMon=X.today().slice(0,7);
  var set=setFor(lCom), all=lines(set).filter(function(l){ return l.date.slice(0,7)===lMon; }), inn=0, out=0;
  all.forEach(function(l){ if(l.t==="in") inn+=l.amt; else out+=l.amt; });
  var b=balTo("",set), y=+lMon.slice(0,4), m=+lMon.slice(5,7);
  var h='<div class="asC">'+bookPick("tcAsLcom",lCom)+'<div style="display:flex;align-items:center;gap:8px"><span class="asBtn l" style="margin:0" onclick="tcAsLm(-1)">&#9664;</span><b style="flex:1;text-align:center">'+E(X.perLabel(lMon))+'</b><span class="asBtn l" style="margin:0" onclick="tcAsLm(1)">&#9654;</span></div>'+
   '<div style="display:flex;gap:8px;margin-top:8px;text-align:center"><div style="flex:1;background:#eef8f0;border-radius:10px;padding:7px"><b style="color:#1c6b2c">'+money(inn)+'</b><div class="asM">'+E(T("വരവ്","Income"))+'</div></div>'+
   '<div style="flex:1;background:#fdecec;border-radius:10px;padding:7px"><b style="color:#a12d2d">'+money(out)+'</b><div class="asM">'+E(T("ചെലവ്","Expense"))+'</div></div></div>'+
   '<div class="asM" style="margin-top:6px">'+E(T("ഇപ്പോഴത്തെ ബാക്കി","Balance now"))+': <b>'+money(b.cash+b.bank)+'</b> ('+E(T("കയ്യിൽ","cash"))+' '+money(b.cash)+' · '+E(T("ബാങ്ക്","bank"))+' '+money(b.bank)+')</div>'+
   '<span class="asBtn g" data-w="1" onclick="tcAsGo(\'lform\',\'in\')">+ '+E(T("വരവ്","Income"))+'</span><span class="asBtn r" data-w="1" onclick="tcAsGo(\'lform\',\'out\')">- '+E(T("ചെലവ്","Expense"))+'</span></div><div class="asC">'+
   (all.length?all.map(function(l){ return '<div class="asR"'+(l.pay?' onclick="tcAsGo(\'receipt\',\''+l.id+'\')"':' onclick="tcAsGo(\'lform\',\'e:'+l.id+'\')"')+'><div style="flex:1;min-width:0"><div style="font-weight:600">'+E(catName(l.t,l.cat))+'</div><div class="asM">'+E(dmy(l.date)+" · "+(l.mode==="b"?T("ബാങ്ക്","Bank"):T("കയ്യിൽ","Cash"))+(lCom==="*"&&X.coms().length?" · "+X.comName(l.com):"")+(l.note?" · "+l.note:""))+'</div></div><b style="color:'+(l.t==="in"?"#1c6b2c":"#a12d2d")+'">'+(l.t==="in"?"+":"-")+money(l.amt)+'</b></div>'; }).join(""):'<div class="asM">'+E(T("ഈ മാസം ഒന്നുമില്ല","Nothing this month"))+'</div>')+'</div>';
  return {title:T("വരവ്-ചെലവ്","Ledger"),html:h,after:function(){ var e=$("tcAsLcom"); if(e) e.onchange=function(){ lCom=e.value; X.render(); }; }};
 });
 window.tcAsLm=function(d){ var y=+lMon.slice(0,4), m=+lMon.slice(5,7)+d; if(m<1){ m=12; y--; } if(m>12){ m=1; y++; } lMon=y+"-"+("0"+m).slice(-2); X.render(); };
 X.screen("lform",function(arg){
  var a=X.A(), ed=null, t=arg, pre=null;
  if(String(arg).indexOf("e:")===0){ var id=arg.slice(2); ed=a.led.filter(function(l){ return l.id===id; })[0]; t=ed?ed.t:"in"; }
  if(String(arg).indexOf("r:")===0){ var pr=String(arg).split(":"); pre={com:pr[1]||"_",amt:+pr[2]||""}; t="out"; }   /* "send the share up" from a committee */
  var L=t==="in"?INC:EXP.concat(X.coms().length?[["remit",["മേൽകമ്മിറ്റിക്ക് വിഹിതം","Share to upper committee"]]]:[]);
  var cur=ed?(X.comOf(ed)||"_"):(pre?pre.com:(lCom&&lCom!=="*"?lCom:(X.myRoot()||"_")));
  var h='<div class="asC">'+(X.coms().length?'<label>'+E(T("ഏത് കമ്മിറ്റിയുടെ കണക്ക്","Whose book (committee)"))+'</label>'+X.comSelect("tcAsLc",cur):'')+'<label>'+E(T("തുക","Amount"))+'</label><input id="tcAsLa" type="number" inputmode="decimal" value="'+E(ed?ed.amt:(pre?pre.amt:""))+'">'+
   '<label>'+E(T("ഇനം","Category"))+'</label><div>'+chips("lcat",L.map(function(x){ return [x[0],T(x[1][0],x[1][1])]; }),ed?ed.cat:(pre?"remit":L[0][0]))+'</div>'+
   '<label>'+E(T("എങ്ങനെ","Paid by"))+'</label><div>'+chips("lmd",[["c",T("കയ്യിൽ (കാഷ് / UPI)","Cash / UPI")],["b",T("ബാങ്ക്","Bank")]],ed?ed.mode:"c")+'</div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തീയതി","Date"))+'</label><input id="tcAsLd" type="date" value="'+E(ed?ed.date:X.today())+'"></div></div>'+
   '<label>'+E(T("കുറിപ്പ്","Note"))+'</label><input id="tcAsLn" value="'+E(ed?ed.note:"")+'">'+
   '<span class="asBtn g" onclick="tcAsSaveLed(\''+t+'\',\''+(ed?ed.id:"")+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span>'+(ed?'<span class="asBtn r" onclick="tcAsDelLed(\''+ed.id+'\')">'+E(T("ഒഴിവാക്കുക","Delete"))+'</span>':'')+'</div>';
  return {title:t==="in"?T("വരവ് ചേർക്കുക","Add income"):T("ചെലവ് ചേർക്കുക","Add expense"),html:h};
 });
 window.tcAsSaveLed=function(t,id){
  var a=X.A(), amt=+v("tcAsLa"); if(!(amt>0)){ X.say(T("തുക നൽകുക","Enter the amount")); return; }
  var cat=chipVal("lcat")||"oth", com=X.coms().length?X.comVal("tcAsLc"):"";
  if(cat==="remit"&&!com){ X.say(T("മുകളിലെ കമ്മിറ്റിക്ക് മേൽകമ്മിറ്റിയില്ല","The top committee has no upper committee")); return; }
  var l=id?a.led.filter(function(x){ return x.id===id; })[0]:null; if(!l){ l={id:X.uid(),t:t}; a.led.push(l); }
  l.amt=Math.round(amt*100)/100; l.cat=cat; l.mode=chipVal("lmd")||"c"; l.date=v("tcAsLd")||X.today(); l.note=v("tcAsLn").slice(0,200);
  if(X.coms().length) l.com=com; if(cat==="remit"){ l.t="out"; l.to=(X.comMap()[com]||{}).parent||""; } else delete l.to;
  X.op("led",l); X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
 };
 window.tcAsDelLed=function(id){ var l=X.A().led.filter(function(x){ return x.id===id; })[0]; if(!l||!confirm(T("ഈ എൻട്രി ഒഴിവാക്കട്ടെ?","Delete this entry?"))) return; l.del=X.today(); X.op("led",l,true); X.sv(); X.back(); };

 /* ---------- minutes + actions ---------- */
 X.screen("minutes",function(){
  var a=X.A(), ms=X.live(a.mins).sort(function(x,y){ return x.date<y.date?1:-1; }), acts=X.live(a.acts).sort(function(x,y){ return x.date<y.date?1:-1; });
  var h='<div class="asC"><span class="asBtn" data-w="1" onclick="tcAsGo(\'mnform\')">+ '+E(T("യോഗം / മിനിറ്റ്സ്","Meeting / minutes"))+'</span><span class="asBtn l" data-w="1" onclick="tcAsGo(\'aform\')">+ '+E(T("നടപടി","Action"))+'</span></div>'+
   '<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("യോഗങ്ങൾ","Meetings"))+'</div>'+(ms.length?ms.map(function(x){ return '<div class="asR" onclick="tcAsGo(\'mnform\',\''+x.id+'\')"><div style="flex:1;min-width:0"><div style="font-weight:600">'+E(dmy(x.date)+(x.place?" · "+x.place:"")+(X.coms().length?" · "+X.comName(X.comOf(x)):""))+'</div><div class="asM" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+E(x.dec||"")+'</div></div></div>'; }).join(""):'<div class="asM">'+E(T("ഇല്ല","None"))+'</div>')+'</div>'+
   '<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("നടപടികൾ","Actions on members"))+'</div>'+(acts.length?acts.map(function(x){ var m=X.memberById(x.mid)||{name:"?"}; return '<div class="asR" onclick="tcAsGo(\'member\',\''+x.mid+'\')"><div style="flex:1"><div style="font-weight:600">'+E(m.name+" · "+X.actTxt(x.type)+(x.amt>0?" "+money(x.amt):""))+'</div><div class="asM">'+E(dmy(x.date)+(x.note?" · "+x.note:""))+'</div></div></div>'; }).join(""):'<div class="asM">'+E(T("ഇല്ല","None"))+'</div>')+'</div>';
  return {title:T("മിനിറ്റ്സ് / നടപടി","Minutes & actions"),html:h};
 });
 X.screen("mnform",function(id){
  var x=id?X.A().mins.filter(function(y){ return y.id===id; })[0]:null;
  var h='<div class="asC"><div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തീയതി","Date"))+'</label><input id="tcAsNd" type="date" value="'+E(x?x.date:X.today())+'"></div><div style="flex:1"><label>'+E(T("സ്ഥലം","Place"))+'</label><input id="tcAsNp" value="'+E(x?x.place:"")+'"></div></div>'+
   (X.coms().length?'<label>'+E(T("ഏത് കമ്മിറ്റിയുടെ യോഗം","Meeting of which committee"))+'</label>'+X.comSelect("tcAsNc",x?(X.comOf(x)||"_"):(X.myRoot()||"_")):'')+
   '<label>'+E(T("പങ്കെടുത്തവർ (പേരുകൾ / എണ്ണം)","Present (names / number)"))+'</label><input id="tcAsNa" value="'+E(x?x.present:"")+'">'+
   '<label>'+E(T("തീരുമാനങ്ങൾ / ചർച്ച (25 പേജ് വരെ എഴുതാം)","Decisions / discussion (up to about 25 pages)"))+'</label><textarea id="tcAsNdec" rows="10" maxlength="50000">'+E(x?x.dec:"")+'</textarea>'+
   '<span class="asBtn g" onclick="tcAsSaveMin(\''+(x?x.id:"")+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span>'+(x?'<span class="asBtn l" onclick="tcAsPrintMin(\''+x.id+'\')">'+E(T("പ്രിന്റ്","Print"))+'</span><span class="asBtn r" onclick="tcAsDelMin(\''+x.id+'\')">'+E(T("ഒഴിവാക്കുക","Delete"))+'</span>':'')+'</div>';
  return {title:T("യോഗം / മിനിറ്റ്സ്","Meeting / minutes"),html:h};
 });
 window.tcAsSaveMin=function(id){
  var a=X.A(), dec=v("tcAsNdec"); if(!dec){ X.say(T("തീരുമാനങ്ങൾ എഴുതുക","Write the decisions")); return; }
  var x=id?a.mins.filter(function(y){ return y.id===id; })[0]:null; if(!x){ x={id:X.uid()}; a.mins.push(x); }
  x.date=v("tcAsNd")||X.today(); x.place=v("tcAsNp").slice(0,80); x.present=v("tcAsNa").slice(0,400); x.dec=dec.slice(0,50000); if(X.coms().length) x.com=X.comVal("tcAsNc"); X.op("min",x); X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
 };
 window.tcAsDelMin=function(id){ var x=X.A().mins.filter(function(y){ return y.id===id; })[0]; if(!x||!confirm(T("ഈ മിനിറ്റ്സ് ഒഴിവാക്കട്ടെ?","Delete these minutes?"))) return; x.del=X.today(); X.op("min",x,true); X.sv(); X.back(); };
 window.tcAsPrintMin=function(id){ var x=X.A().mins.filter(function(y){ return y.id===id; })[0]; if(!x) return;
  X.printHtml('<h2>'+E(X.orgName())+'</h2>'+(X.comOf(x)?'<h3>'+E(X.comPath(X.comOf(x)))+'</h3>':'')+'<h3>'+E(T("യോഗ മിനിറ്റ്സ്","Minutes of the meeting"))+'</h3><p>'+E(T("തീയതി","Date"))+': '+E(dmy(x.date))+(x.place?' &nbsp; '+E(T("സ്ഥലം","Place"))+': '+E(x.place):'')+'</p><p>'+E(T("പങ്കെടുത്തവർ","Present"))+': '+E(x.present||"")+'</p><pre style="font:15px/1.6 sans-serif;white-space:pre-wrap">'+E(x.dec)+'</pre><p style="margin-top:40px">'+E(T("സെക്രട്ടറി","Secretary"))+'</p>'); };
 X.screen("aform",function(mid){
  var ms=X.members(), opts=ms.map(function(m){ return '<option value="'+m.id+'"'+(m.id===mid?' selected':'')+'>'+E((m.no?m.no+". ":"")+m.name)+'</option>'; }).join("");
  var h='<div class="asC"><label>'+E(T("മെമ്പർ","Member"))+'</label><select id="tcAsAm">'+opts+'</select>'+
   '<label>'+E(T("നടപടി","Action"))+'</label><div>'+chips("atp",[["warn",T("താക്കീത്","Warning")],["fine",T("പിഴ","Fine")],["susp",T("സസ്പെൻഷൻ","Suspension")],["other",T("മറ്റുള്ളവ","Other")]],"warn")+'</div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തീയതി","Date"))+'</label><input id="tcAsAd" type="date" value="'+X.today()+'"></div><div style="flex:1"><label>'+E(T("പിഴ തുക (ഉണ്ടെങ്കിൽ)","Fine amount (if any)"))+'</label><input id="tcAsAa" type="number" inputmode="numeric"></div></div>'+
   '<label style="display:flex;align-items:center;gap:8px;font-weight:500"><input type="checkbox" id="tcAsAp" style="width:auto"> '+E(T("പിഴ ഇപ്പോൾ അടച്ചു (വരവിൽ ചേർക്കുക)","Fine paid now (add to income)"))+'</label>'+
   '<label>'+E(T("കാരണം / കുറിപ്പ്","Reason / note"))+'</label><input id="tcAsAn">'+
   '<span class="asBtn g" onclick="tcAsSaveAct()">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span></div>';
  return {title:T("നടപടി ചേർക്കുക","Add action"),html:ms.length?h:'<div class="asC">'+E(T("ആദ്യം മെമ്പർമാരെ ചേർക്കുക.","Add members first."))+'</div>'};
 });
 window.tcAsSaveAct=function(){
  var a=X.A(), mid=v("tcAsAm"), m=X.memberById(mid); if(!m) return;
  var t=chipVal("atp")||"warn", amt=+v("tcAsAa")||0, d=v("tcAsAd")||X.today(), note=v("tcAsAn").slice(0,300);
  var ac={id:X.uid(),mid:mid,type:t,date:d,amt:amt,note:note,com:X.comOf(m)}; a.acts.push(ac); X.op("act",ac);
  if(t==="susp"){ m.status="s"; X.op("member",m); }
  if(amt>0&&$("tcAsAp")&&$("tcAsAp").checked){ var fl={id:X.uid(),t:"in",amt:amt,cat:"fine",mode:"c",date:d,note:m.name+(note?" · "+note:""),com:X.comOf(m)}; a.led.push(fl); X.op("led",fl); }
  X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
 };

 /* ---------- reports ---------- */
 var rMode="m", rPer="", rCom=null;
 function memSet(){ if(!X.coms().length) return null; return rCom==="*"?X.scopeSet():X.subOf(rCom==null?X.myRoot():(rCom==="_"?"":rCom)); }
 function repMembers(){ var s=memSet(); return X.members().filter(function(m){ return !s||s[X.comOf(m)]; }); }
 function statement(from,to){   /* from / to = YYYY-MM-DD inclusive */
  var set=setFor(rCom), open=balTo(from,set), inc={}, exp={}, ti=0, te=0, close={cash:open.cash,bank:open.bank};
  lines(set).forEach(function(l){ if(l.date<from||l.date>to) return; var k=catName(l.t,l.cat); if(l.t==="in"){ inc[k]=(inc[k]||0)+l.amt; ti+=l.amt; } else { exp[k]=(exp[k]||0)+l.amt; te+=l.amt; } var s=l.t==="in"?1:-1; if(l.mode==="b") close.bank+=s*l.amt; else close.cash+=s*l.amt; });
  return {open:open,inc:inc,exp:exp,ti:ti,te:te,close:close};
 }
 function range(){ if(rMode==="y") return [rPer+"-01-01",rPer+"-12-31"]; return [rPer+"-01",rPer+"-31"]; }
 X.screen("reports",function(){
  if(!rPer) rPer=rMode==="y"?X.today().slice(0,4):X.today().slice(0,7);
  var r=range(), s=statement(r[0],r[1]), c=X.A().cfg;
  var rm=repMembers(), inR={}; rm.forEach(function(m){ inR[m.id]=1; });
  var subs=X.live(X.A().pays).filter(function(p){ return inR[p.mid]&&p.date>=r[0]&&p.date<=r[1]; }), payers={}; subs.forEach(function(p){ payers[p.mid]=1; });
  var act=rm.filter(function(m){ return m.status!=="l"; }), withDue=act.filter(function(m){ return X.dues(m).length; });
  var row=function(k,val,col){ return '<div style="display:flex;padding:3px 0"><span style="flex:1">'+E(k)+'</span><b style="color:'+(col||"#222")+'">'+money(val)+'</b></div>'; };
  var h='<div class="asC">'+bookPick("tcAsRcom",rCom)+'<div>'+chips("rmd",[["m",T("മാസം","Month")],["y",T("വർഷം","Year")]],rMode)+'</div><div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span class="asBtn l" style="margin:0" onclick="tcAsRp(-1)">&#9664;</span><b style="flex:1;text-align:center">'+E(X.perLabel(rPer))+'</b><span class="asBtn l" style="margin:0" onclick="tcAsRp(1)">&#9654;</span></div></div>'+
   '<div class="asC">'+row(T("തുടക്ക ബാക്കി","Opening balance"),s.open.cash+s.open.bank)+'<div style="font-weight:700;margin-top:6px;color:#1c6b2c">'+E(T("വരവ്","Income"))+'</div>'+Object.keys(s.inc).map(function(k){ return row("  "+k,s.inc[k]); }).join("")+row(T("ആകെ വരവ്","Total income"),s.ti,"#1c6b2c")+
   '<div style="font-weight:700;margin-top:6px;color:#a12d2d">'+E(T("ചെലവ്","Expense"))+'</div>'+Object.keys(s.exp).map(function(k){ return row("  "+k,s.exp[k]); }).join("")+row(T("ആകെ ചെലവ്","Total expense"),s.te,"#a12d2d")+
   '<div style="border-top:1px solid #ddd;margin-top:6px;padding-top:4px">'+row(T("അവസാന ബാക്കി","Closing balance"),s.close.cash+s.close.bank,"#0b4f5a")+'<div class="asM">'+E(T("കയ്യിൽ","Cash")+" "+money(s.close.cash)+" · "+T("ബാങ്ക്","Bank")+" "+money(s.close.bank))+'</div></div></div>'+
   '<div class="asC"><div class="asM">'+E(T(X.TY().sub[0]+" അടച്ചവർ (ഈ കാലയളവിൽ)","Paid "+X.TY().sub[1].toLowerCase()+" (this period)"))+': <b>'+Object.keys(payers).length+'</b> / '+act.length+' · '+E(T("ഇപ്പോൾ ബാക്കിയുള്ളവർ","With dues now"))+': <b>'+withDue.length+'</b></div>'+
   '<span class="asBtn" onclick="tcAsXlsx()">Excel</span><span class="asBtn l" onclick="tcAsPrintRep()">'+E(T("പ്രിന്റ് / PDF","Print / PDF"))+'</span></div>';
  return {title:T("റിപ്പോർട്ട്","Reports"),html:h,after:function(){ window.tcAsChip_rmd=function(x){ rMode=x; rPer=x==="y"?X.today().slice(0,4):X.today().slice(0,7); X.render(); }; var e=$("tcAsRcom"); if(e) e.onchange=function(){ rCom=e.value; X.render(); }; }};
 });
 window.tcAsRp=function(d){ if(rMode==="y"){ rPer=String(+rPer+d); } else { var y=+rPer.slice(0,4), m=+rPer.slice(5,7)+d; if(m<1){ m=12; y--; } if(m>12){ m=1; y++; } rPer=y+"-"+("0"+m).slice(-2); } X.render(); };
 window.tcAsPrintRep=function(){
  var r=range(), s=statement(r[0],r[1]), tr=function(k,val,b){ return '<tr><td>'+E(k)+'</td><td style="text-align:right">'+(b?'<b>':'')+money(val)+(b?'</b>':'')+'</td></tr>'; };
  X.printHtml('<h2>'+E(X.orgName())+'</h2>'+(bookName(rCom)?'<h3>'+E(bookName(rCom))+'</h3>':'')+'<h3>'+E(T("വരവ്-ചെലവ് കണക്ക്","Statement of accounts"))+' - '+E(X.perLabel(rPer))+'</h3><table style="width:100%;border-collapse:collapse;font-size:14px" border="1" cellpadding="6">'+
   tr(T("തുടക്ക ബാക്കി","Opening balance"),s.open.cash+s.open.bank,1)+Object.keys(s.inc).map(function(k){ return tr(T("വരവ്","Income")+": "+k,s.inc[k]); }).join("")+tr(T("ആകെ വരവ്","Total income"),s.ti,1)+
   Object.keys(s.exp).map(function(k){ return tr(T("ചെലവ്","Expense")+": "+k,s.exp[k]); }).join("")+tr(T("ആകെ ചെലവ്","Total expense"),s.te,1)+tr(T("അവസാന ബാക്കി","Closing balance"),s.close.cash+s.close.bank,1)+
   tr(T("കയ്യിൽ","Cash in hand"),s.close.cash)+tr(T("ബാങ്കിൽ","In bank"),s.close.bank)+'</table><p style="margin-top:40px">'+E(T("ട്രഷറർ","Treasurer"))+' &nbsp; &nbsp; &nbsp; &nbsp; '+E(T("സെക്രട്ടറി","Secretary"))+'</p>');
 };
 window.tcAsXlsx=async function(){
  var wb=window.__tcXlsxWorkbook; if(typeof wb!=="function"){ X.say(T("Excel തയ്യാറായിട്ടില്ല","Excel is not ready")); return; }
  var r=range(), s=statement(r[0],r[1]), c=function(val,st){ return {v:val,s:st||{border:1}}; }, H={b:true,bg:"0B6F7D",color:"FFFFFF",border:1}, M={border:1,fmt:"#,##0"};
  var sum=[[c(X.orgName(),{b:true,sz:14})]].concat(bookName(rCom)?[[c(T("കമ്മിറ്റി","Committee")),c(bookName(rCom))]]:[]).concat([[c(T("കാലയളവ്","Period")),c(X.perLabel(rPer))],[]]).concat([[c(T("ഇനം","Item"),H),c(T("തുക","Amount"),H)],[c(T("തുടക്ക ബാക്കി","Opening balance")),c(s.open.cash+s.open.bank,M)]]);
  Object.keys(s.inc).forEach(function(k){ sum.push([c(T("വരവ്","Income")+": "+k),c(s.inc[k],M)]); }); sum.push([c(T("ആകെ വരവ്","Total income"),{b:true,border:1}),c(s.ti,{b:true,border:1,fmt:"#,##0"})]);
  Object.keys(s.exp).forEach(function(k){ sum.push([c(T("ചെലവ്","Expense")+": "+k),c(s.exp[k],M)]); }); sum.push([c(T("ആകെ ചെലവ്","Total expense"),{b:true,border:1}),c(s.te,{b:true,border:1,fmt:"#,##0"})]);
  sum.push([c(T("അവസാന ബാക്കി","Closing balance"),{b:true,border:1}),c(s.close.cash+s.close.bank,{b:true,border:1,fmt:"#,##0"})],[c(T("കയ്യിൽ","Cash")),c(s.close.cash,M)],[c(T("ബാങ്ക്","Bank")),c(s.close.bank,M)]);
  var led=[[c(T("തീയതി","Date"),H),c(T("വരവ് / ചെലവ്","In / out"),H),c(T("ഇനം","Category"),H),c(T("തുക","Amount"),H),c(T("കാഷ് / ബാങ്ക്","Cash / bank"),H),c(T("കുറിപ്പ്","Note"),H)]];
  lines(setFor(rCom)).filter(function(l){ return l.date>=r[0]&&l.date<=r[1]; }).reverse().forEach(function(l){ led.push([c(dmy(l.date)),c(l.t==="in"?T("വരവ്","In"):T("ചെലവ്","Out")),c(catName(l.t,l.cat)),c(l.amt,M),c(l.mode==="b"?T("ബാങ്ക്","Bank"):T("കാഷ്","Cash")),c(l.note)]); });
  var mem=[[c(T("നമ്പർ","No."),H),c(T("പേര്","Name"),H),c(T("ഫോൺ","Phone"),H),c(T("ഏരിയ","Area"),H),c(T("നില","Status"),H),c(T("ഈ കാലയളവിൽ അടച്ചത്","Paid this period"),H),c(T("ബാക്കി (എണ്ണം)","Due (count)"),H),c(T("ബാക്കി തുക","Due amount"),H)].concat(X.TY().save?[c(T("ആകെ നിക്ഷേപം","Total saved"),H)]:[]).concat(X.TY().veh?[c(T("വണ്ടികൾ","Vehicles"),H)]:[]).concat(X.TY().house?[c(T("വീട്","House"),H)]:[])];
  repMembers().forEach(function(m){ var pd=X.live(X.A().pays).filter(function(p){ return p.mid===m.id&&p.date>=r[0]&&p.date<=r[1]; }).reduce(function(t,p){ return t+(+p.amt||0); },0), d=X.dues(m).length;
   var row=[c(m.no||""),c(m.name),c(m.ph||""),c(X.areaOf(m)),c(m.status==="s"?T("സസ്പെൻഡ്","Suspended"):(m.status==="l"?T("ഒഴിവായി","Left"):T("സജീവം","Active"))),c(pd,M),c(d),c(d*X.memAmt(m),M)];
   if(X.TY().save) row.push(c(X.saved(m.id),M)); if(X.TY().veh) row.push(c(X.vehs(m).join(", "))); if(X.TY().house) row.push(c(m.hno||""));
   mem.push(row); });
  var bytes; try{ bytes=wb([{name:"Summary",rows:sum,widths:[34,16]},{name:"Ledger",rows:led,widths:[12,10,18,12,10,50],freeze:"A2"},{name:"Members",rows:mem,widths:[7,24,13,14,11,16,11,13,16,30],freeze:"C2"}]); }catch(e){ X.say(T("Excel ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല","Could not make the Excel")); return; }
  var name="Association_"+rPer+"_made_"+X.today()+".xlsx", type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  window.__tcAsLastX={name:name,bytes:bytes};
  try{ var file=new File([bytes],name,{type:type}); if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); return; } }catch(e){ if(e&&e.name==="AbortError") return; }
  try{ var url=URL.createObjectURL(new Blob([bytes],{type:type})), l=document.createElement("a"); l.href=url; l.download=name; document.body.appendChild(l); l.click(); setTimeout(function(){ try{ document.body.removeChild(l); URL.revokeObjectURL(url); }catch(e){} },1500); X.say(T("ഡൗൺലോഡ്സിൽ സേവ് ചെയ്തു","Saved to downloads")); }catch(e){ X.say(T("എക്സ്പോർട്ട് ചെയ്യാൻ കഴിഞ്ഞില്ല","Could not export")); }
 };

 /* ---------- settings ---------- */
 X.screen("settings",function(){
  var c=X.A().cfg, ty=c.type||"other", TT=X.TYPES;
  var perOpts=function(k){ return (TT[k]||TT.other).pers.map(function(p){ return [p,p==="w"?T("ആഴ്ച","Week"):(p==="y"?T("വർഷം","Year"):T("മാസം","Month"))]; }); };
  var curPer=(TT[ty]||TT.other).pers.indexOf(c.per)>=0?c.per:(TT[ty]||TT.other).pers[0];
  var h='<div class="asC"><label>'+E(T("സംഘടനയുടെ തരം","Kind of organisation"))+'</label><div>'+chips("stype",Object.keys(TT).map(function(k){ return [k,T(TT[k].ml,TT[k].en)]; }),ty)+'</div>'+
   '<label>'+E(T("സംഘടനയുടെ പേര് (രസീതിൽ)","Name of the organisation (on receipts)"))+'</label><input id="tcAsSo" value="'+E(c.org||"")+'" placeholder="'+E(X.orgName())+'">'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label id="tcAsSaL">'+E(X.subName()+" ₹")+'</label><input id="tcAsSa" type="number" inputmode="numeric" value="'+E(c.amt||"")+'"></div><div style="flex:1"><label>'+E(T("ഓരോ","Every"))+'</label><div id="tcAsSperBox">'+chips("sper",perOpts(ty),curPer)+'</div></div></div>'+
   '<div id="tcAsVehBox"'+((TT[ty]||{}).veh?'':' hidden')+'><div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("ഈ തുകയിൽ എത്ര വണ്ടി വരെ","Vehicles included in it"))+'</label><input id="tcAsSiv" type="number" inputmode="numeric" value="'+E(c.inclVeh||"")+'" placeholder="2"></div><div style="flex:1"><label>'+E(T("അധികമുള്ള ഓരോ വണ്ടിക്കും ₹","Each extra vehicle ₹"))+'</label><input id="tcAsSev" type="number" inputmode="numeric" value="'+E(c.extraVeh||"")+'" placeholder="50"></div></div></div>'+
   '<label>'+E(T("കണക്ക് തുടങ്ങുന്ന മാസം (ഇതിന് മുമ്പുള്ളത് ബാക്കിയായി കാണിക്കില്ല)","Book starts in (nothing before it shows as due)"))+'</label><input id="tcAsSs" type="month" value="'+E(c.start&&c.start.length===7?c.start:(c.start?c.start+"-01":X.today().slice(0,7)))+'">'+
   '<div'+(X.coms().length?' hidden':'')+'><label id="tcAsSarL">'+E(X.areaName()+" "+T("(കോമ ഇട്ട്)","(comma separated)"))+'</label><input id="tcAsSar" value="'+E((c.areas||[]).join(", "))+'"></div>'+
   '<div style="display:flex;gap:8px"'+(X.A().cloud?' hidden':'')+'><div style="flex:1"><label>'+E(T("രസീത് തുടക്കം","Receipt prefix"))+'</label><input id="tcAsSp" value="'+E(c.prefix||"R")+'"></div><div style="flex:1"><label>'+E(T("അടുത്ത രസീത് നമ്പർ","Next receipt no."))+'</label><input id="tcAsSn" type="number" value="'+E(c.nextRc||1)+'"></div></div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തുടക്കത്തിൽ കയ്യിലുള്ളത് ₹","Opening cash ₹"))+'</label><input id="tcAsSc" type="number" value="'+E(c.openCash||"")+'"></div><div style="flex:1"><label>'+E(T("തുടക്കത്തിൽ ബാങ്കിൽ ₹","Opening bank ₹"))+'</label><input id="tcAsSb" type="number" value="'+E(c.openBank||"")+'"></div></div>'+
   '<span class="asBtn g" onclick="tcAsSaveCfg()">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span></div>'+
   '<div class="asC asM">'+E(X.premOk()?T("പ്ലാൻ: മെമ്പർ പരിധി പ്ലാൻ അനുസരിച്ച്.","Plan: member limit as per the plan."):T(X.freeLimit()+" മെമ്പർ വരെ സൗജന്യം. കൂടുതലിന് Premium / Platinum (Menu › Verification & Plan).","Free up to "+X.freeLimit()+" members. More: Premium / Platinum (Menu › Verification & Plan)."))+'<br>'+E(T("ഒരു മെമ്പർക്ക് വേറെ നിരക്ക് (ഇളവ്) വേണമെങ്കിൽ ആ മെമ്പറുടെ \"മാറ്റുക › കൂടുതൽ\"-ൽ.","A special rate (concession) for one member: that member's \"Edit › More\"."))+'</div>';
  if(X.myRoot()) h='<div class="asC" style="background:#fff6df;color:#7a4f00">'+E(T("സെറ്റിംഗ്സ് മാറ്റുന്നത് സംഘടനയുടെ (മുകളിലെ കമ്മിറ്റിയുടെ) അഡ്മിൻ ആണ്.","Settings are changed by the admin of the whole organisation (the top committee)."))+'</div><div class="asC asM">'+E(X.TYc(c).ml+" · "+X.subName()+" "+money(c.amt)+" / "+X.perWord(c.per))+'</div>';
  return {title:T("സെറ്റിംഗ്സ്","Settings"),html:h,after:function(){ if(!$("tcAsSperBox")) return;
   window.tcAsChip_stype=function(k){
    var t=TT[k]||TT.other, cur=chipVal("sper"), keep=t.pers.indexOf(cur)>=0?cur:t.pers[0];
    $("tcAsSperBox").innerHTML=chips("sper",perOpts(k),keep);
    $("tcAsVehBox").hidden=!t.veh;
    $("tcAsSaL").textContent=T(t.sub[0],t.sub[1])+" ₹"; $("tcAsSarL").textContent=T(t.area[0],t.area[1])+" "+T("(കോമ ഇട്ട്)","(comma separated)");
   };
  }};
 });
 window.tcAsSaveCfg=function(){
  var c=X.A().cfg, amt=+v("tcAsSa"); if(!(amt>0)){ X.say(T(X.subName()+" തുക നൽകുക","Enter the "+X.subName().toLowerCase()+" amount")); return; }
  var oldPer=c.per;
  c.type=chipVal("stype")||c.type||"other"; c.org=v("tcAsSo").slice(0,80); c.amt=amt; c.per=chipVal("sper")||"m";
  c.inclVeh=Math.max(0,parseInt(v("tcAsSiv"),10)||0); c.extraVeh=Math.max(0,+v("tcAsSev")||0);
  if(oldPer&&oldPer!==c.per&&X.live(X.A().pays).length) X.say(T("കാലയളവ് മാറ്റി - പഴയ രസീതുകൾ പഴയ കാലയളവിൽ തന്നെ കാണും.","Period changed - old receipts stay in the old periods.")); var st=v("tcAsSs")||X.today().slice(0,7); c.start=c.per==="y"?st.slice(0,4):st;   /* weekly books keep the month; the first week of it counts */
  if(!X.coms().length) c.areas=v("tcAsSar").split(",").map(function(x){ return x.trim().slice(0,40); }).filter(Boolean).filter(function(x,i,arr){ return arr.indexOf(x)===i; }).slice(0,60);
  c.prefix=(v("tcAsSp")||"R").slice(0,8); c.nextRc=Math.max(1,parseInt(v("tcAsSn"),10)||1); c.openCash=+v("tcAsSc")||0; c.openBank=+v("tcAsSb")||0;
  X.op("cfg",c); X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
 };

 /* ---------- voice answers (tc-voice.js asks this first on an association page) ---------- */
 function has(s,L){ for(var i=0;i<L.length;i++) if(s.indexOf(L[i])>=0) return true; return false; }
 window.tcAssocAnswer=function(s){
  if(X.biz()!==X.TYPE) return null;
  s=" "+String(s||"").toLowerCase()+" ";
  var a=X.A(), c=a.cfg, ms=X.members().filter(function(m){ return m.status!=="l"; });
  var A=function(ml,en){ return {kind:"answer",ml:ml,en:en}; };
  if(has(s,["അടയ്ക്കാത്ത","അടക്കാത്ത","അടച്ചിട്ടില്ല","ബാക്കിയുള്ള","കുടിശ്ശിക"," due","dues","not paid","pending","adakkatha"])||(has(s,["ബാക്കി","baakki","balance"])&&has(s,["ആര്","ആർ","who","വരിസംഖ്യ","subscription","മെമ്പർ","member"]))){
   var list=ms.map(function(m){ return {m:m,d:X.dues(m)}; }).filter(function(x){ return x.d.length; }).sort(function(x,y){ return y.d.length-x.d.length; });
   var SB=X.TY().sub; if(!list.length) return A("ആർക്കും "+SB[0]+" ബാക്കിയില്ല ✓","Nobody has "+SB[1].toLowerCase()+" dues ✓");
   var tot=list.reduce(function(t,x){ return t+x.d.length*X.memAmt(x.m); },0), names=list.slice(0,10).map(function(x){ return x.m.name+" ("+x.d.length+")"; }).join(", ");
   return {kind:"open",fn:function(){ window.tcAssocOpen("dues"); },ml:list.length+" പേർക്ക് "+SB[0]+" ബാക്കി, ആകെ "+money(tot)+": "+names+(list.length>10?" …":"")+". ലിസ്റ്റ് തുറക്കുന്നു.",en:list.length+" members have dues, total "+money(tot)+": "+names+(list.length>10?" …":"")+". Opening the list."};
  }
  var mon=X.today().slice(0,7), yr=X.today().slice(0,4), yearQ=has(s,["ഈ വർഷം","this year","varsham"]);
  if(has(s,["നിക്ഷേപ","thrift","ഫീസ്"," fee","savings","പിരിഞ്ഞ","പിരിച്ച","കിട്ടിയ","വരിസംഖ്യ","collected","collection","subscription","piriv","pirich"])){
   var pays=X.live(a.pays).filter(function(p){ return yearQ?p.date.slice(0,4)===yr:p.date.slice(0,7)===mon; }), sum=pays.reduce(function(t,p){ return t+(+p.amt||0); },0), who={}; pays.forEach(function(p){ who[p.mid]=1; });
   return A((yearQ?"ഈ വർഷം":"ഈ മാസം")+" "+X.TY().sub[0]+" കിട്ടിയത് "+money(sum)+" ("+Object.keys(who).length+" പേർ, "+pays.length+" രസീത്).",(yearQ?"This year":"This month")+" "+X.TY().sub[1].toLowerCase()+" collected: "+money(sum)+" ("+Object.keys(who).length+" members, "+pays.length+" receipts).");
  }
  if(has(s,["ബാക്കി","ബാലൻസ്","കയ്യിൽ","ബാങ്കിൽ","balance","cash in hand","fund"])){
   var b=balTo("",setFor(null)); return A("ഇപ്പോൾ ബാക്കി "+money(b.cash+b.bank)+" - കയ്യിൽ "+money(b.cash)+", ബാങ്കിൽ "+money(b.bank)+".","Balance now "+money(b.cash+b.bank)+" - cash "+money(b.cash)+", bank "+money(b.bank)+".");
  }
  if(has(s,["എത്ര മെമ്പർ","മെമ്പർമാർ","അംഗങ്ങൾ","എത്ര വീട്","വീടുകൾ","houses","how many members","members","membermar"])){
   var areas={}; ms.forEach(function(m){ var ar=X.areaOf(m); if(ar) areas[ar]=(areas[ar]||0)+1; });
   var ar=Object.keys(areas).map(function(k){ return k+" "+areas[k]; }).join(", ");
   return A(ms.length+" മെമ്പർമാർ"+(ar?" ("+ar+")":"")+".",ms.length+" members"+(ar?" ("+ar+")":"")+".");
  }
  return null;
 };
})();
