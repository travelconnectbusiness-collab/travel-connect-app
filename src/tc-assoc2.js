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
 function catName(t,k){ if(k==="sub") return T("വരിസംഖ്യ","Subscription"); var L=t==="in"?INC:EXP; for(var i=0;i<L.length;i++) if(L[i][0]===k) return T(L[i][1][0],L[i][1][1]); return k||""; }
 /* every money line: the ledger + the subscription receipts (cash / UPI count as 'cash in hand' unless Bank) */
 function lines(){
  var a=X.A(), out=[];
  X.live(a.pays).forEach(function(p){ var m=X.memberById(p.mid); out.push({id:p.id,pay:1,t:"in",amt:+p.amt||0,cat:"sub",mode:p.mode==="b"?"b":"c",date:p.date,note:(m?m.name:"")+" · "+(p.periods||[]).map(X.perLabel).join(", ")+" · "+(p.rc||"")}); });
  X.live(a.led).forEach(function(l){ out.push({id:l.id,t:l.t,amt:+l.amt||0,cat:l.cat,mode:l.mode==="b"?"b":"c",date:l.date,note:l.note||""}); });
  return out.sort(function(x,y){ return x.date<y.date?1:(x.date>y.date?-1:0); });
 }
 function balTo(before){   /* balance of everything dated before 'before' (or all when empty) */
  var c=X.A().cfg, b={cash:+c.openCash||0,bank:+c.openBank||0};
  lines().forEach(function(l){ if(before&&l.date>=before) return; var s=l.t==="in"?1:-1; if(l.mode==="b") b.bank+=s*l.amt; else b.cash+=s*l.amt; });
  return b;
 }
 window.__tcAsBal=function(){ return balTo(""); };

 /* ---------- ledger ---------- */
 var lMon="";
 X.screen("ledger",function(){
  if(!lMon) lMon=X.today().slice(0,7);
  var all=lines().filter(function(l){ return l.date.slice(0,7)===lMon; }), inn=0, out=0;
  all.forEach(function(l){ if(l.t==="in") inn+=l.amt; else out+=l.amt; });
  var b=balTo(""), y=+lMon.slice(0,4), m=+lMon.slice(5,7);
  var h='<div class="asC"><div style="display:flex;align-items:center;gap:8px"><span class="asBtn l" style="margin:0" onclick="tcAsLm(-1)">&#9664;</span><b style="flex:1;text-align:center">'+E(X.perLabel(lMon))+'</b><span class="asBtn l" style="margin:0" onclick="tcAsLm(1)">&#9654;</span></div>'+
   '<div style="display:flex;gap:8px;margin-top:8px;text-align:center"><div style="flex:1;background:#eef8f0;border-radius:10px;padding:7px"><b style="color:#1c6b2c">'+money(inn)+'</b><div class="asM">'+E(T("വരവ്","Income"))+'</div></div>'+
   '<div style="flex:1;background:#fdecec;border-radius:10px;padding:7px"><b style="color:#a12d2d">'+money(out)+'</b><div class="asM">'+E(T("ചെലവ്","Expense"))+'</div></div></div>'+
   '<div class="asM" style="margin-top:6px">'+E(T("ഇപ്പോഴത്തെ ബാക്കി","Balance now"))+': <b>'+money(b.cash+b.bank)+'</b> ('+E(T("കയ്യിൽ","cash"))+' '+money(b.cash)+' · '+E(T("ബാങ്ക്","bank"))+' '+money(b.bank)+')</div>'+
   '<span class="asBtn g" onclick="tcAsGo(\'lform\',\'in\')">+ '+E(T("വരവ്","Income"))+'</span><span class="asBtn r" onclick="tcAsGo(\'lform\',\'out\')">- '+E(T("ചെലവ്","Expense"))+'</span></div><div class="asC">'+
   (all.length?all.map(function(l){ return '<div class="asR"'+(l.pay?' onclick="tcAsGo(\'receipt\',\''+l.id+'\')"':' onclick="tcAsGo(\'lform\',\'e:'+l.id+'\')"')+'><div style="flex:1;min-width:0"><div style="font-weight:600">'+E(catName(l.t,l.cat))+'</div><div class="asM">'+E(dmy(l.date)+" · "+(l.mode==="b"?T("ബാങ്ക്","Bank"):T("കയ്യിൽ","Cash"))+(l.note?" · "+l.note:""))+'</div></div><b style="color:'+(l.t==="in"?"#1c6b2c":"#a12d2d")+'">'+(l.t==="in"?"+":"-")+money(l.amt)+'</b></div>'; }).join(""):'<div class="asM">'+E(T("ഈ മാസം ഒന്നുമില്ല","Nothing this month"))+'</div>')+'</div>';
  return {title:T("വരവ്-ചെലവ്","Ledger"),html:h};
 });
 window.tcAsLm=function(d){ var y=+lMon.slice(0,4), m=+lMon.slice(5,7)+d; if(m<1){ m=12; y--; } if(m>12){ m=1; y++; } lMon=y+"-"+("0"+m).slice(-2); X.render(); };
 X.screen("lform",function(arg){
  var a=X.A(), ed=null, t=arg;
  if(String(arg).indexOf("e:")===0){ var id=arg.slice(2); ed=a.led.filter(function(l){ return l.id===id; })[0]; t=ed?ed.t:"in"; }
  var L=t==="in"?INC:EXP;
  var h='<div class="asC"><label>'+E(T("തുക","Amount"))+'</label><input id="tcAsLa" type="number" inputmode="decimal" value="'+E(ed?ed.amt:"")+'">'+
   '<label>'+E(T("ഇനം","Category"))+'</label><div>'+chips("lcat",L.map(function(x){ return [x[0],T(x[1][0],x[1][1])]; }),ed?ed.cat:L[0][0])+'</div>'+
   '<label>'+E(T("എങ്ങനെ","Paid by"))+'</label><div>'+chips("lmd",[["c",T("കയ്യിൽ (കാഷ് / UPI)","Cash / UPI")],["b",T("ബാങ്ക്","Bank")]],ed?ed.mode:"c")+'</div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തീയതി","Date"))+'</label><input id="tcAsLd" type="date" value="'+E(ed?ed.date:X.today())+'"></div></div>'+
   '<label>'+E(T("കുറിപ്പ്","Note"))+'</label><input id="tcAsLn" value="'+E(ed?ed.note:"")+'">'+
   '<span class="asBtn g" onclick="tcAsSaveLed(\''+t+'\',\''+(ed?ed.id:"")+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span>'+(ed?'<span class="asBtn r" onclick="tcAsDelLed(\''+ed.id+'\')">'+E(T("ഒഴിവാക്കുക","Delete"))+'</span>':'')+'</div>';
  return {title:t==="in"?T("വരവ് ചേർക്കുക","Add income"):T("ചെലവ് ചേർക്കുക","Add expense"),html:h};
 });
 window.tcAsSaveLed=function(t,id){
  var a=X.A(), amt=+v("tcAsLa"); if(!(amt>0)){ X.say(T("തുക നൽകുക","Enter the amount")); return; }
  var l=id?a.led.filter(function(x){ return x.id===id; })[0]:null; if(!l){ l={id:X.uid(),t:t}; a.led.push(l); }
  l.amt=Math.round(amt*100)/100; l.cat=chipVal("lcat")||"oth"; l.mode=chipVal("lmd")||"c"; l.date=v("tcAsLd")||X.today(); l.note=v("tcAsLn").slice(0,200);
  X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
 };
 window.tcAsDelLed=function(id){ var l=X.A().led.filter(function(x){ return x.id===id; })[0]; if(!l||!confirm(T("ഈ എൻട്രി ഒഴിവാക്കട്ടെ?","Delete this entry?"))) return; l.del=X.today(); X.sv(); X.back(); };

 /* ---------- minutes + actions ---------- */
 X.screen("minutes",function(){
  var a=X.A(), ms=X.live(a.mins).sort(function(x,y){ return x.date<y.date?1:-1; }), acts=X.live(a.acts).sort(function(x,y){ return x.date<y.date?1:-1; });
  var h='<div class="asC"><span class="asBtn" onclick="tcAsGo(\'mnform\')">+ '+E(T("യോഗം / മിനിറ്റ്സ്","Meeting / minutes"))+'</span><span class="asBtn l" onclick="tcAsGo(\'aform\')">+ '+E(T("നടപടി","Action"))+'</span></div>'+
   '<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("യോഗങ്ങൾ","Meetings"))+'</div>'+(ms.length?ms.map(function(x){ return '<div class="asR" onclick="tcAsGo(\'mnform\',\''+x.id+'\')"><div style="flex:1;min-width:0"><div style="font-weight:600">'+E(dmy(x.date)+(x.place?" · "+x.place:""))+'</div><div class="asM" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+E(x.dec||"")+'</div></div></div>'; }).join(""):'<div class="asM">'+E(T("ഇല്ല","None"))+'</div>')+'</div>'+
   '<div class="asC"><div style="font-weight:700;margin-bottom:4px">'+E(T("നടപടികൾ","Actions on members"))+'</div>'+(acts.length?acts.map(function(x){ var m=X.memberById(x.mid)||{name:"?"}; return '<div class="asR" onclick="tcAsGo(\'member\',\''+x.mid+'\')"><div style="flex:1"><div style="font-weight:600">'+E(m.name+" · "+X.actTxt(x.type)+(x.amt>0?" "+money(x.amt):""))+'</div><div class="asM">'+E(dmy(x.date)+(x.note?" · "+x.note:""))+'</div></div></div>'; }).join(""):'<div class="asM">'+E(T("ഇല്ല","None"))+'</div>')+'</div>';
  return {title:T("മിനിറ്റ്സ് / നടപടി","Minutes & actions"),html:h};
 });
 X.screen("mnform",function(id){
  var x=id?X.A().mins.filter(function(y){ return y.id===id; })[0]:null;
  var h='<div class="asC"><div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തീയതി","Date"))+'</label><input id="tcAsNd" type="date" value="'+E(x?x.date:X.today())+'"></div><div style="flex:1"><label>'+E(T("സ്ഥലം","Place"))+'</label><input id="tcAsNp" value="'+E(x?x.place:"")+'"></div></div>'+
   '<label>'+E(T("പങ്കെടുത്തവർ (പേരുകൾ / എണ്ണം)","Present (names / number)"))+'</label><input id="tcAsNa" value="'+E(x?x.present:"")+'">'+
   '<label>'+E(T("തീരുമാനങ്ങൾ","Decisions"))+'</label><textarea id="tcAsNdec" rows="6">'+E(x?x.dec:"")+'</textarea>'+
   '<span class="asBtn g" onclick="tcAsSaveMin(\''+(x?x.id:"")+'\')">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span>'+(x?'<span class="asBtn l" onclick="tcAsPrintMin(\''+x.id+'\')">'+E(T("പ്രിന്റ്","Print"))+'</span><span class="asBtn r" onclick="tcAsDelMin(\''+x.id+'\')">'+E(T("ഒഴിവാക്കുക","Delete"))+'</span>':'')+'</div>';
  return {title:T("യോഗം / മിനിറ്റ്സ്","Meeting / minutes"),html:h};
 });
 window.tcAsSaveMin=function(id){
  var a=X.A(), dec=v("tcAsNdec"); if(!dec){ X.say(T("തീരുമാനങ്ങൾ എഴുതുക","Write the decisions")); return; }
  var x=id?a.mins.filter(function(y){ return y.id===id; })[0]:null; if(!x){ x={id:X.uid()}; a.mins.push(x); }
  x.date=v("tcAsNd")||X.today(); x.place=v("tcAsNp").slice(0,80); x.present=v("tcAsNa").slice(0,400); x.dec=dec.slice(0,4000); X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
 };
 window.tcAsDelMin=function(id){ var x=X.A().mins.filter(function(y){ return y.id===id; })[0]; if(!x||!confirm(T("ഈ മിനിറ്റ്സ് ഒഴിവാക്കട്ടെ?","Delete these minutes?"))) return; x.del=X.today(); X.sv(); X.back(); };
 window.tcAsPrintMin=function(id){ var x=X.A().mins.filter(function(y){ return y.id===id; })[0]; if(!x) return;
  X.printHtml('<h2>'+E(X.orgName())+'</h2><h3>'+E(T("യോഗ മിനിറ്റ്സ്","Minutes of the meeting"))+'</h3><p>'+E(T("തീയതി","Date"))+': '+E(dmy(x.date))+(x.place?' &nbsp; '+E(T("സ്ഥലം","Place"))+': '+E(x.place):'')+'</p><p>'+E(T("പങ്കെടുത്തവർ","Present"))+': '+E(x.present||"")+'</p><pre style="font:15px/1.6 sans-serif;white-space:pre-wrap">'+E(x.dec)+'</pre><p style="margin-top:40px">'+E(T("സെക്രട്ടറി","Secretary"))+'</p>'); };
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
  a.acts.push({id:X.uid(),mid:mid,type:t,date:d,amt:amt,note:note});
  if(t==="susp") m.status="s";
  if(amt>0&&$("tcAsAp")&&$("tcAsAp").checked) a.led.push({id:X.uid(),t:"in",amt:amt,cat:"fine",mode:"c",date:d,note:m.name+(note?" · "+note:"")});
  X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
 };

 /* ---------- reports ---------- */
 var rMode="m", rPer="";
 function statement(from,to){   /* from / to = YYYY-MM-DD inclusive */
  var open=balTo(from), inc={}, exp={}, ti=0, te=0, close={cash:open.cash,bank:open.bank};
  lines().forEach(function(l){ if(l.date<from||l.date>to) return; var k=catName(l.t,l.cat); if(l.t==="in"){ inc[k]=(inc[k]||0)+l.amt; ti+=l.amt; } else { exp[k]=(exp[k]||0)+l.amt; te+=l.amt; } var s=l.t==="in"?1:-1; if(l.mode==="b") close.bank+=s*l.amt; else close.cash+=s*l.amt; });
  return {open:open,inc:inc,exp:exp,ti:ti,te:te,close:close};
 }
 function range(){ if(rMode==="y") return [rPer+"-01-01",rPer+"-12-31"]; return [rPer+"-01",rPer+"-31"]; }
 X.screen("reports",function(){
  if(!rPer) rPer=rMode==="y"?X.today().slice(0,4):X.today().slice(0,7);
  var r=range(), s=statement(r[0],r[1]), c=X.A().cfg;
  var subs=X.live(X.A().pays).filter(function(p){ return p.date>=r[0]&&p.date<=r[1]; }), payers={}; subs.forEach(function(p){ payers[p.mid]=1; });
  var act=X.members().filter(function(m){ return m.status!=="l"; }), withDue=act.filter(function(m){ return X.dues(m).length; });
  var row=function(k,val,col){ return '<div style="display:flex;padding:3px 0"><span style="flex:1">'+E(k)+'</span><b style="color:'+(col||"#222")+'">'+money(val)+'</b></div>'; };
  var h='<div class="asC"><div>'+chips("rmd",[["m",T("മാസം","Month")],["y",T("വർഷം","Year")]],rMode)+'</div><div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span class="asBtn l" style="margin:0" onclick="tcAsRp(-1)">&#9664;</span><b style="flex:1;text-align:center">'+E(X.perLabel(rPer))+'</b><span class="asBtn l" style="margin:0" onclick="tcAsRp(1)">&#9654;</span></div></div>'+
   '<div class="asC">'+row(T("തുടക്ക ബാക്കി","Opening balance"),s.open.cash+s.open.bank)+'<div style="font-weight:700;margin-top:6px;color:#1c6b2c">'+E(T("വരവ്","Income"))+'</div>'+Object.keys(s.inc).map(function(k){ return row("  "+k,s.inc[k]); }).join("")+row(T("ആകെ വരവ്","Total income"),s.ti,"#1c6b2c")+
   '<div style="font-weight:700;margin-top:6px;color:#a12d2d">'+E(T("ചെലവ്","Expense"))+'</div>'+Object.keys(s.exp).map(function(k){ return row("  "+k,s.exp[k]); }).join("")+row(T("ആകെ ചെലവ്","Total expense"),s.te,"#a12d2d")+
   '<div style="border-top:1px solid #ddd;margin-top:6px;padding-top:4px">'+row(T("അവസാന ബാക്കി","Closing balance"),s.close.cash+s.close.bank,"#0b4f5a")+'<div class="asM">'+E(T("കയ്യിൽ","Cash")+" "+money(s.close.cash)+" · "+T("ബാങ്ക്","Bank")+" "+money(s.close.bank))+'</div></div></div>'+
   '<div class="asC"><div class="asM">'+E(T("വരിസംഖ്യ അടച്ചവർ (ഈ കാലയളവിൽ)","Members who paid (this period)"))+': <b>'+Object.keys(payers).length+'</b> / '+act.length+' · '+E(T("ഇപ്പോൾ ബാക്കിയുള്ളവർ","With dues now"))+': <b>'+withDue.length+'</b></div>'+
   '<span class="asBtn" onclick="tcAsXlsx()">Excel</span><span class="asBtn l" onclick="tcAsPrintRep()">'+E(T("പ്രിന്റ് / PDF","Print / PDF"))+'</span></div>';
  return {title:T("റിപ്പോർട്ട്","Reports"),html:h,after:function(){ window.tcAsChip_rmd=function(x){ rMode=x; rPer=x==="y"?X.today().slice(0,4):X.today().slice(0,7); X.render(); }; }};
 });
 window.tcAsRp=function(d){ if(rMode==="y"){ rPer=String(+rPer+d); } else { var y=+rPer.slice(0,4), m=+rPer.slice(5,7)+d; if(m<1){ m=12; y--; } if(m>12){ m=1; y++; } rPer=y+"-"+("0"+m).slice(-2); } X.render(); };
 window.tcAsPrintRep=function(){
  var r=range(), s=statement(r[0],r[1]), tr=function(k,val,b){ return '<tr><td>'+E(k)+'</td><td style="text-align:right">'+(b?'<b>':'')+money(val)+(b?'</b>':'')+'</td></tr>'; };
  X.printHtml('<h2>'+E(X.orgName())+'</h2><h3>'+E(T("വരവ്-ചെലവ് കണക്ക്","Statement of accounts"))+' - '+E(X.perLabel(rPer))+'</h3><table style="width:100%;border-collapse:collapse;font-size:14px" border="1" cellpadding="6">'+
   tr(T("തുടക്ക ബാക്കി","Opening balance"),s.open.cash+s.open.bank,1)+Object.keys(s.inc).map(function(k){ return tr(T("വരവ്","Income")+": "+k,s.inc[k]); }).join("")+tr(T("ആകെ വരവ്","Total income"),s.ti,1)+
   Object.keys(s.exp).map(function(k){ return tr(T("ചെലവ്","Expense")+": "+k,s.exp[k]); }).join("")+tr(T("ആകെ ചെലവ്","Total expense"),s.te,1)+tr(T("അവസാന ബാക്കി","Closing balance"),s.close.cash+s.close.bank,1)+
   tr(T("കയ്യിൽ","Cash in hand"),s.close.cash)+tr(T("ബാങ്കിൽ","In bank"),s.close.bank)+'</table><p style="margin-top:40px">'+E(T("ട്രഷറർ","Treasurer"))+' &nbsp; &nbsp; &nbsp; &nbsp; '+E(T("സെക്രട്ടറി","Secretary"))+'</p>');
 };
 window.tcAsXlsx=async function(){
  var wb=window.__tcXlsxWorkbook; if(typeof wb!=="function"){ X.say(T("Excel തയ്യാറായിട്ടില്ല","Excel is not ready")); return; }
  var r=range(), s=statement(r[0],r[1]), c=function(val,st){ return {v:val,s:st||{border:1}}; }, H={b:true,bg:"0B6F7D",color:"FFFFFF",border:1}, M={border:1,fmt:"#,##0"};
  var sum=[[c(X.orgName(),{b:true,sz:14})],[c(T("കാലയളവ്","Period")),c(X.perLabel(rPer))],[],[c(T("ഇനം","Item"),H),c(T("തുക","Amount"),H)],[c(T("തുടക്ക ബാക്കി","Opening balance")),c(s.open.cash+s.open.bank,M)]];
  Object.keys(s.inc).forEach(function(k){ sum.push([c(T("വരവ്","Income")+": "+k),c(s.inc[k],M)]); }); sum.push([c(T("ആകെ വരവ്","Total income"),{b:true,border:1}),c(s.ti,{b:true,border:1,fmt:"#,##0"})]);
  Object.keys(s.exp).forEach(function(k){ sum.push([c(T("ചെലവ്","Expense")+": "+k),c(s.exp[k],M)]); }); sum.push([c(T("ആകെ ചെലവ്","Total expense"),{b:true,border:1}),c(s.te,{b:true,border:1,fmt:"#,##0"})]);
  sum.push([c(T("അവസാന ബാക്കി","Closing balance"),{b:true,border:1}),c(s.close.cash+s.close.bank,{b:true,border:1,fmt:"#,##0"})],[c(T("കയ്യിൽ","Cash")),c(s.close.cash,M)],[c(T("ബാങ്ക്","Bank")),c(s.close.bank,M)]);
  var led=[[c(T("തീയതി","Date"),H),c(T("വരവ് / ചെലവ്","In / out"),H),c(T("ഇനം","Category"),H),c(T("തുക","Amount"),H),c(T("കാഷ് / ബാങ്ക്","Cash / bank"),H),c(T("കുറിപ്പ്","Note"),H)]];
  lines().filter(function(l){ return l.date>=r[0]&&l.date<=r[1]; }).reverse().forEach(function(l){ led.push([c(dmy(l.date)),c(l.t==="in"?T("വരവ്","In"):T("ചെലവ്","Out")),c(catName(l.t,l.cat)),c(l.amt,M),c(l.mode==="b"?T("ബാങ്ക്","Bank"):T("കാഷ്","Cash")),c(l.note)]); });
  var mem=[[c(T("നമ്പർ","No."),H),c(T("പേര്","Name"),H),c(T("ഫോൺ","Phone"),H),c(T("ഏരിയ","Area"),H),c(T("നില","Status"),H),c(T("ഈ കാലയളവിൽ അടച്ചത്","Paid this period"),H),c(T("ബാക്കി (എണ്ണം)","Due (count)"),H),c(T("ബാക്കി തുക","Due amount"),H)]], amt=+X.A().cfg.amt||0;
  X.members().forEach(function(m){ var pd=X.live(X.A().pays).filter(function(p){ return p.mid===m.id&&p.date>=r[0]&&p.date<=r[1]; }).reduce(function(t,p){ return t+(+p.amt||0); },0), d=X.dues(m).length;
   mem.push([c(m.no||""),c(m.name),c(m.ph||""),c(m.area||""),c(m.status==="s"?T("സസ്പെൻഡ്","Suspended"):(m.status==="l"?T("ഒഴിവായി","Left"):T("സജീവം","Active"))),c(pd,M),c(d),c(d*amt,M)]); });
  var bytes; try{ bytes=wb([{name:"Summary",rows:sum,widths:[34,16]},{name:"Ledger",rows:led,widths:[12,10,18,12,10,50],freeze:"A2"},{name:"Members",rows:mem,widths:[7,24,13,14,11,16,11,13],freeze:"C2"}]); }catch(e){ X.say(T("Excel ഉണ്ടാക്കാൻ കഴിഞ്ഞില്ല","Could not make the Excel")); return; }
  var name="Association_"+rPer+"_made_"+X.today()+".xlsx", type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  window.__tcAsLastX={name:name,bytes:bytes};
  try{ var file=new File([bytes],name,{type:type}); if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); return; } }catch(e){ if(e&&e.name==="AbortError") return; }
  try{ var url=URL.createObjectURL(new Blob([bytes],{type:type})), l=document.createElement("a"); l.href=url; l.download=name; document.body.appendChild(l); l.click(); setTimeout(function(){ try{ document.body.removeChild(l); URL.revokeObjectURL(url); }catch(e){} },1500); X.say(T("ഡൗൺലോഡ്സിൽ സേവ് ചെയ്തു","Saved to downloads")); }catch(e){ X.say(T("എക്സ്പോർട്ട് ചെയ്യാൻ കഴിഞ്ഞില്ല","Could not export")); }
 };

 /* ---------- settings ---------- */
 X.screen("settings",function(){
  var c=X.A().cfg;
  var h='<div class="asC"><label>'+E(T("സംഘടനയുടെ പേര് (രസീതിൽ)","Name of the organisation (on receipts)"))+'</label><input id="tcAsSo" value="'+E(c.org||"")+'" placeholder="'+E(X.orgName())+'">'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("വരിസംഖ്യ തുക ₹","Subscription ₹"))+'</label><input id="tcAsSa" type="number" inputmode="numeric" value="'+E(c.amt||"")+'"></div><div style="flex:1"><label>'+E(T("ഓരോ","Every"))+'</label><div>'+chips("sper",[["m",T("മാസം","Month")],["y",T("വർഷം","Year")]],c.per||"m")+'</div></div></div>'+
   '<label>'+E(T("കണക്ക് തുടങ്ങുന്ന മാസം (ഇതിന് മുമ്പുള്ളത് ബാക്കിയായി കാണിക്കില്ല)","Book starts in (nothing before it shows as due)"))+'</label><input id="tcAsSs" type="month" value="'+E(c.start&&c.start.length===7?c.start:(c.start?c.start+"-01":X.today().slice(0,7)))+'">'+
   '<label>'+E(T("ഏരിയകൾ / യൂണിറ്റുകൾ (കോമ ഇട്ട്)","Areas / units (comma separated)"))+'</label><input id="tcAsSar" value="'+E((c.areas||[]).join(", "))+'">'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("രസീത് തുടക്കം","Receipt prefix"))+'</label><input id="tcAsSp" value="'+E(c.prefix||"R")+'"></div><div style="flex:1"><label>'+E(T("അടുത്ത രസീത് നമ്പർ","Next receipt no."))+'</label><input id="tcAsSn" type="number" value="'+E(c.nextRc||1)+'"></div></div>'+
   '<div style="display:flex;gap:8px"><div style="flex:1"><label>'+E(T("തുടക്കത്തിൽ കയ്യിലുള്ളത് ₹","Opening cash ₹"))+'</label><input id="tcAsSc" type="number" value="'+E(c.openCash||"")+'"></div><div style="flex:1"><label>'+E(T("തുടക്കത്തിൽ ബാങ്കിൽ ₹","Opening bank ₹"))+'</label><input id="tcAsSb" type="number" value="'+E(c.openBank||"")+'"></div></div>'+
   '<span class="asBtn g" onclick="tcAsSaveCfg()">'+E(T("സേവ് ചെയ്യുക","Save"))+'</span></div>'+
   '<div class="asC asM">'+E(X.premOk()?T("പ്ലാൻ: മെമ്പർ പരിധി ഇല്ല.","Plan: no member limit."):T(X.freeLimit()+" മെമ്പർ വരെ സൗജന്യം. കൂടുതലിന് Premium / Platinum (Menu › Verification & Plan).","Free up to "+X.freeLimit()+" members. More: Premium / Platinum (Menu › Verification & Plan)."))+'<br>'+E(T("ഈ പുസ്തകം ഈ ഫോണിലാണ് - My Accounts › Backup / ആപ്പിന്റെ ബാക്കപ്പിൽ ഇതും ഉണ്ടാകും.","This book is kept on this phone - the app's backup includes it."))+'</div>';
  return {title:T("സെറ്റിംഗ്സ്","Settings"),html:h};
 });
 window.tcAsSaveCfg=function(){
  var c=X.A().cfg, amt=+v("tcAsSa"); if(!(amt>0)){ X.say(T("വരിസംഖ്യ തുക നൽകുക","Enter the subscription amount")); return; }
  c.org=v("tcAsSo").slice(0,80); c.amt=amt; c.per=chipVal("sper")||"m"; var st=v("tcAsSs")||X.today().slice(0,7); c.start=c.per==="y"?st.slice(0,4):st;
  c.areas=v("tcAsSar").split(",").map(function(x){ return x.trim().slice(0,40); }).filter(Boolean).filter(function(x,i,arr){ return arr.indexOf(x)===i; }).slice(0,60);
  c.prefix=(v("tcAsSp")||"R").slice(0,8); c.nextRc=Math.max(1,parseInt(v("tcAsSn"),10)||1); c.openCash=+v("tcAsSc")||0; c.openBank=+v("tcAsSb")||0;
  X.sv(); X.say(T("സേവ് ചെയ്തു","Saved")); X.back();
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
   if(!list.length) return A("ആർക്കും വരിസംഖ്യ ബാക്കിയില്ല ✓","Nobody has subscription dues ✓");
   var tot=list.reduce(function(t,x){ return t+x.d.length*(+c.amt||0); },0), names=list.slice(0,10).map(function(x){ return x.m.name+" ("+x.d.length+")"; }).join(", ");
   return {kind:"open",fn:function(){ window.tcAssocOpen("dues"); },ml:list.length+" പേർക്ക് വരിസംഖ്യ ബാക്കി, ആകെ "+money(tot)+": "+names+(list.length>10?" …":"")+". ലിസ്റ്റ് തുറക്കുന്നു.",en:list.length+" members have dues, total "+money(tot)+": "+names+(list.length>10?" …":"")+". Opening the list."};
  }
  var mon=X.today().slice(0,7), yr=X.today().slice(0,4), yearQ=has(s,["ഈ വർഷം","this year","varsham"]);
  if(has(s,["പിരിഞ്ഞ","പിരിച്ച","കിട്ടിയ","വരിസംഖ്യ","collected","collection","subscription","piriv","pirich"])){
   var pays=X.live(a.pays).filter(function(p){ return yearQ?p.date.slice(0,4)===yr:p.date.slice(0,7)===mon; }), sum=pays.reduce(function(t,p){ return t+(+p.amt||0); },0), who={}; pays.forEach(function(p){ who[p.mid]=1; });
   return A((yearQ?"ഈ വർഷം":"ഈ മാസം")+" വരിസംഖ്യ പിരിഞ്ഞത് "+money(sum)+" ("+Object.keys(who).length+" പേർ, "+pays.length+" രസീത്).",(yearQ?"This year":"This month")+" subscription collected: "+money(sum)+" ("+Object.keys(who).length+" members, "+pays.length+" receipts).");
  }
  if(has(s,["ബാക്കി","ബാലൻസ്","കയ്യിൽ","ബാങ്കിൽ","balance","cash in hand","fund"])){
   var b=balTo(""); return A("ഇപ്പോൾ ബാക്കി "+money(b.cash+b.bank)+" - കയ്യിൽ "+money(b.cash)+", ബാങ്കിൽ "+money(b.bank)+".","Balance now "+money(b.cash+b.bank)+" - cash "+money(b.cash)+", bank "+money(b.bank)+".");
  }
  if(has(s,["എത്ര മെമ്പർ","മെമ്പർമാർ","അംഗങ്ങൾ","how many members","members","membermar"])){
   var areas={}; ms.forEach(function(m){ if(m.area) areas[m.area]=(areas[m.area]||0)+1; });
   var ar=Object.keys(areas).map(function(k){ return k+" "+areas[k]; }).join(", ");
   return A(ms.length+" മെമ്പർമാർ"+(ar?" ("+ar+")":"")+".",ms.length+" members"+(ar?" ("+ar+")":"")+".");
  }
  return null;
 };
})();
