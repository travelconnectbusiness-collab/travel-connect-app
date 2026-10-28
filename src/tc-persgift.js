/* Ceremony cover (gift money) ledger - part of "My Accounts" (tc-persgift.js, loaded by tc-regdocs.js right after tc-pers.js).
   Owner's request (2026-10-28): in Kerala a cover with money is given at weddings, panappayattu, housewarming ... and is expected back later,
   "the same or double". Record every cover I GAVE at somebody else's ceremony and every cover I RECEIVED at my own, with the person's
   name + address; when somebody invites me (or I invite him) look the person up and see what he gave / what I gave and the amount to return.
   DATA (db.persGifts, same rules as tc-pers.js - phone only, Premium Cloud Backup, backup file):
     {id, u, d, ts, w:'gave'|'got', p: name, ad: address / place, a: amount, ty: ceremony type code, nm: whose ceremony / name of the function, n: note}
   One PERSON = same name + same address (two men with one name in different places stay apart).
   Guidance shown for a person:  when I go to HIS ceremony -> what he gave me last time = "same" / "double";
                                 when HE comes to mine      -> what I gave him last time = what to expect back, "same" / "double". */
(function(){
 var P=window.__tcPers;
 if(!P||P.gifts) return;
 P.gifts=1;
 var B=P.B, E=P.E, K=P.K.g, S=P.S, SC=P.SC, $=P.$, mny=P.mny, dmy=P.dmy, norm=P.norm, enc=P.enc, oc=P.oc, val=P.val, num=P.num, say=P.say, cap=P.cap;
 var TYPES=[["wd","വിവാഹം","Wedding"],["en","വിവാഹ നിശ്ചയം","Engagement"],["pn","പണപ്പയറ്റ്","Panappayattu"],["gp","ഗൃഹപ്രവേശം","Housewarming"],["bd","ജന്മദിനം","Birthday"],["ot","മറ്റുള്ളവ","Other"]];
 function tyName(c){ for(var i=0;i<TYPES.length;i++) if(TYPES[i][0]===c) return B(TYPES[i][2],TYPES[i][1]); return B("Other","മറ്റുള്ളവ"); }
 function pk(r){ return norm(r.p)+"|"+norm(r.ad); }
 function people(){
  var m={};
  P.mine(K).forEach(function(r){
   if(!norm(r.p)) return;
   var k=pk(r), o=m[k]||(m[k]={k:k,name:r.p,ad:r.ad||"",gave:0,got:0,ng:0,nr:0,last:"",rows:[]});
   if(r.w==="gave"){ o.gave+=r.a; o.ng++; } else { o.got+=r.a; o.nr++; }
   o.rows.push(r); if((r.d||"")>=o.last){ o.last=r.d||""; o.name=r.p; o.ad=r.ad||o.ad; }
  });
  return Object.keys(m).map(function(k){ return m[k]; });
 }
 function lastOf(rows,w,skip){
  var b=null;
  rows.forEach(function(r){ if(r.w!==w||r.id===skip) return; if(!b||(r.d||"")>(b.d||"")||((r.d||"")===(b.d||"")&&(r.ts||0)>(b.ts||0))) b=r; });
  return b;
 }
 P.gPeople=people;
 /* the persons that match a typed name (+ address when typed) */
 function match(name,ad){
  var n=norm(name), a=norm(ad); if(!n) return [];
  return people().filter(function(p){ return norm(p.name)===n&&(!a||norm(p.ad)===a); });
 }

 /* ---------- list + look-up ---------- */
 var Q="";
 function rowsHtml(){
  var q=norm(Q), L=people().filter(function(p){ return !q||norm(p.name).indexOf(q)>=0||norm(p.ad).indexOf(q)>=0; });
  L.sort(function(a,b){ return (b.last||"")<(a.last||"")?-1:(b.last||"")>(a.last||"")?1:0; });
  if(!L.length) return '<div class="tpC tpM" style="text-align:center">'+E(q?B("No such person - add the cover with ➕","ഈ പേരിൽ ആരുമില്ല - ➕ അമർത്തി ചേർക്കൂ"):B("Nothing recorded yet","ഒന്നും ചേർത്തിട്ടില്ല"))+'</div>';
  return '<div class="tpC" style="padding:4px 14px">'+L.map(function(p){
   var lg=lastOf(p.rows,"got"), ex=lg?'<div style="font-size:13px;color:#8a5a00;font-weight:700">'+E(B("Return: same ","തിരിച്ചു കൊടുക്കാൻ: തുല്യം "))+mny(lg.a)+' · '+E(B("double ","ഇരട്ടി "))+mny(lg.a*2)+'</div>':"";
   return '<div class="tpRow" '+oc("tpgPerson",enc(p.k))+'><div style="min-width:0"><b>'+E(p.name)+'</b><div class="tpM">'+E(p.ad||"-")+'</div>'+
    '<div class="tpM">'+E(B("I gave ","ഞാൻ കൊടുത്തത് "))+mny(p.gave)+(p.ng>1?" ("+p.ng+")":"")+' · '+E(B("I got ","എനിക്ക് കിട്ടിയത് "))+mny(p.got)+(p.nr>1?" ("+p.nr+")":"")+'</div>'+ex+'</div><span style="font-size:22px;color:#5b7787">&rsaquo;</span></div>';
  }).join("")+'</div>';
 }
 SC.gifts=function(){
  $("tpBody").innerHTML=
   '<div class="tpG2"><button class="tpBtn out" onclick="tpgAdd(\'gave\')">➕ '+E(B("Cover I gave","ഞാൻ കൊടുത്ത കവർ"))+'</button><button class="tpBtn in" onclick="tpgAdd(\'got\')">➕ '+E(B("Cover I got","എനിക്ക് കിട്ടിയ കവർ"))+'</button></div>'+
   '<input id="tpgQ" placeholder="🔍 '+E(B("Search name / place","പേര് / സ്ഥലം തിരയുക"))+'" value="'+E(Q)+'" oninput="tpgSearch(this.value)" style="margin-top:12px">'+
   '<div id="tpgRows">'+rowsHtml()+'</div>'+
   '<button class="tpBtn g" onclick="tpGo(\'gevents\')">📅 '+E(B("Ceremony-wise totals","ചടങ്ങ് തിരിച്ചുള്ള കണക്ക്"))+'</button>'+
   '<button class="tpBtn g" onclick="tpCsv(\'g\')">📤 '+E(B("Export to Excel (CSV)","Excel-ലേക്ക് (CSV)"))+'</button>';
 };
 window.tpgSearch=function(v){ Q=v||""; var r=$("tpgRows"); if(r) r.innerHTML=rowsHtml(); };

 /* ---------- one person ---------- */
 window.tpgPerson=function(e){
  var k=decodeURIComponent(e), p=people().filter(function(x){ return x.k===k; })[0];
  if(p) P.go("gperson",{key:k,title:p.name});
 };
 function findP(k){ return people().filter(function(x){ return x.k===k; })[0]; }
 function adviceBox(cls,head,line){ return '<div class="tpC" style="'+cls+'"><b>'+E(head)+'</b><div style="margin-top:4px">'+line+'</div></div>'; }
 SC.gperson=function(prm){
  var p=findP(prm.key); if(!p){ P.go("gifts"); return; }
  var lg=lastOf(p.rows,"got"), lv=lastOf(p.rows,"gave"), rows=P.srt(p.rows), enck=enc(p.k);
  var h1, h2;
  if(lg) h1=adviceBox("background:#fdf0d4",B("If I go to HIS ceremony","ഇവരുടെ ചടങ്ങിന് ഞാൻ പോകുമ്പോൾ"),
    E(B("He gave me ","ഇവർ എനിക്ക് തന്നത് "))+'<b>'+mny(lg.a)+'</b> ('+E(tyName(lg.ty))+', '+E(dmy(lg.d))+')<div style="margin-top:6px">'+E(B("To return: ","തിരിച്ചു കൊടുക്കാൻ: "))+
    '<span class="tpChip" onclick="tpgAdd(\'gave\',\''+enck+'\','+lg.a+')">'+E(B("Same ","തുല്യം "))+mny(lg.a)+'</span><span class="tpChip" onclick="tpgAdd(\'gave\',\''+enck+'\','+(lg.a*2)+')">'+E(B("Double ","ഇരട്ടി "))+mny(lg.a*2)+'</span></div>');
  else h1=adviceBox("background:#fff",B("If I go to HIS ceremony","ഇവരുടെ ചടങ്ങിന് ഞാൻ പോകുമ്പോൾ"),'<span class="tpM">'+E(B("He has not given me a cover before.","ഇവർ എനിക്ക് മുമ്പ് കവർ തന്നിട്ടില്ല."))+'</span>');
  if(lv) h2=adviceBox("background:#e8f5f4",B("If HE comes to MY ceremony","ഇവർ എന്റെ ചടങ്ങിന് വരുമ്പോൾ"),
    E(B("I gave him ","ഞാൻ ഇവർക്ക് കൊടുത്തത് "))+'<b>'+mny(lv.a)+'</b> ('+E(tyName(lv.ty))+', '+E(dmy(lv.d))+')<div style="margin-top:6px">'+E(B("To expect back: ","തിരിച്ചു കിട്ടേണ്ടത്: "))+
    '<span class="tpChip" onclick="tpgAdd(\'got\',\''+enck+'\','+lv.a+')">'+E(B("Same ","തുല്യം "))+mny(lv.a)+'</span><span class="tpChip" onclick="tpgAdd(\'got\',\''+enck+'\','+(lv.a*2)+')">'+E(B("Double ","ഇരട്ടി "))+mny(lv.a*2)+'</span></div>');
  else h2="";
  $("tpBody").innerHTML=
   '<div class="tpC"><b style="font-size:19px">'+E(p.name)+'</b><div class="tpM">'+E(p.ad||"-")+'</div>'+
    '<div class="tpG2" style="margin-top:8px"><div><div class="tpM">'+E(B("I gave","ഞാൻ കൊടുത്തത്"))+'</div><div class="tpBig tpOut">'+mny(p.gave)+'</div></div><div><div class="tpM">'+E(B("I got","എനിക്ക് കിട്ടിയത്"))+'</div><div class="tpBig tpIn">'+mny(p.got)+'</div></div></div></div>'+h1+h2+
   '<div class="tpG2"><button class="tpBtn out" onclick="tpgAdd(\'gave\',\''+enck+'\')">➕ '+E(B("Cover I gave","ഞാൻ കൊടുത്ത കവർ"))+'</button><button class="tpBtn in" onclick="tpgAdd(\'got\',\''+enck+'\')">➕ '+E(B("Cover I got","എനിക്ക് കിട്ടിയ കവർ"))+'</button></div>'+
   '<div class="tpC" style="padding:4px 14px">'+rows.map(function(r){ return entryRow(r,false); }).join("")+'</div>';
 };
 function entryRow(r,showName){
  return '<div class="tpRow" '+oc("tpgEdit",r.id)+'><div style="min-width:0"><b>'+E(showName?r.p:(r.w==="gave"?B("I gave","ഞാൻ കൊടുത്തു"):B("I got","എനിക്ക് കിട്ടി")))+'</b><div class="tpM">'+E(tyName(r.ty))+(r.nm?" · "+E(r.nm):"")+" · "+E(dmy(r.d))+(showName&&r.ad?" · "+E(r.ad):"")+'</div></div><b class="'+(r.w==="gave"?"tpOut":"tpIn")+'">'+mny(r.a)+'</b></div>';
 }

 /* ---------- ceremony-wise totals ---------- */
 function events(){
  var m={};
  P.mine(K).forEach(function(r){
   var key=r.w+"|"+r.ty+"|"+(norm(r.nm)||(r.d||"").slice(0,4)), o=m[key]||(m[key]={k:key,w:r.w,ty:r.ty,nm:r.nm||"",n:0,tot:0,first:r.d||"",rows:[]});
   o.n++; o.tot+=r.a; o.rows.push(r); if((r.d||"")<o.first) o.first=r.d||"";
  });
  return Object.keys(m).map(function(k){ return m[k]; }).sort(function(a,b){ return (b.first<a.first)?-1:(b.first>a.first)?1:0; });
 }
 function evTitle(o){ return (o.w==="gave"?B("I gave: ","ഞാൻ കൊടുത്തത്: "):B("I got: ","എനിക്ക് കിട്ടിയത്: "))+tyName(o.ty)+(o.nm?" · "+o.nm:""); }
 SC.gevents=function(){
  var L=events();
  $("tpBody").innerHTML='<div class="tpC" style="padding:4px 14px">'+(L.length?L.map(function(o){
    return '<div class="tpRow" '+oc("tpgEvent",enc(o.k))+'><div style="min-width:0"><b>'+E(evTitle(o))+'</b><div class="tpM">'+o.n+' '+E(B("covers","കവർ"))+' · '+E(dmy(o.first))+'</div></div><b class="'+(o.w==="gave"?"tpOut":"tpIn")+'">'+mny(o.tot)+'</b></div>';
   }).join(""):'<div class="tpM" style="text-align:center;padding:16px 0">'+E(B("Nothing recorded yet","ഒന്നും ചേർത്തിട്ടില്ല"))+'</div>')+'</div>';
 };
 window.tpgEvent=function(e){ var k=decodeURIComponent(e), o=events().filter(function(x){ return x.k===k; })[0]; if(o) P.go("gevent",{key:k,title:evTitle(o)}); };
 SC.gevent=function(prm){
  var o=events().filter(function(x){ return x.k===prm.key; })[0]; if(!o){ P.go("gevents"); return; }
  $("tpBody").innerHTML='<div class="tpC"><div class="tpM">'+o.n+' '+E(B("covers","കവർ"))+'</div><div class="tpBig">'+mny(o.tot)+'</div></div><div class="tpC" style="padding:4px 14px">'+P.srt(o.rows).map(function(r){ return entryRow(r,true); }).join("")+'</div>';
 };

 /* ---------- add / edit ---------- */
 function sheetFor(r,w,key,amt){
  w=r?r.w:w;
  var p=key?findP(key):null, name=r?r.p:(p?p.name:""), ad=r?(r.ad||""):(p?p.ad:""), all=P.mine(K);
  P.sheet('<h3>'+E((r?B("Edit: ","മാറ്റുക: "):"")+(w==="gave"?B("Cover I gave","ഞാൻ കൊടുത്ത കവർ"):B("Cover I got","എനിക്ക് കിട്ടിയ കവർ")))+'</h3>'+
   P.fld("tpgN",B("Name","പേര്"),"text",name,'maxlength="60" list="tpgNames" autocomplete="off" oninput="tpgHint()" onchange="tpgFillAd();tpgHint()"')+P.dlist("tpgNames",P.uniq(all.map(function(x){ return x.p; })))+
   P.fld("tpgAd",B("Address / place","വിലാസം / സ്ഥലം"),"text",ad,'maxlength="80" list="tpgAds" autocomplete="off" oninput="tpgHint()"')+P.dlist("tpgAds",P.uniq(all.map(function(x){ return x.ad; })))+
   P.fld("tpgA",B("Amount (₹)","തുക (₹)"),"number",r?r.a:(amt||""),'inputmode="decimal" min="0" step="any"')+
   '<div id="tpgHint"></div>'+
   '<label class="tpL">'+E(B("Ceremony","ചടങ്ങ്"))+'<select id="tpgTy">'+TYPES.map(function(t){ return '<option value="'+t[0]+'"'+((r?r.ty:"wd")===t[0]?" selected":"")+'>'+E(B(t[2],t[1]))+'</option>'; }).join("")+'</select></label>'+
   P.fld("tpgNm",B("Whose ceremony / name (optional)","ആരുടെ ചടങ്ങ് (വേണമെങ്കിൽ)"),"text",r?r.nm:"",'maxlength="60" placeholder="'+E(B("e.g. Rajesh's wedding","ഉദാ: രാജേഷിന്റെ വിവാഹം"))+'"')+
   P.fld("tpgD",B("Date","തീയതി"),"date",r?r.d:P.today())+
   '<button class="tpBtn" onclick="tpgSave(\''+(r?r.id:"")+'\',\''+w+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   (r?'<button class="tpBtn r" onclick="tpDel(\''+K+'\',\''+r.id+'\')">'+E(B("Delete","ഡിലീറ്റ്"))+'</button>':"")+
   '<button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
  S.gsheet={w:w,skip:r?r.id:""}; tpgHint();
 }
 window.tpgAdd=function(w,e,amt){ sheetFor(null,w,e?decodeURIComponent(e):"",amt); };
 window.tpgEdit=function(id){ var r=P.rec(K,id); if(r) sheetFor(r); };
 window.tpgFillAd=function(){   /* a known name with only one address -> fill the address */
  var a=$("tpgAd"); if(!a||a.value.trim()) return;
  var m=match(val("tpgN"),""); if(m.length===1) a.value=m[0].ad;
 };
 window.tpgHint=function(){
  var box=$("tpgHint"); if(!box||!S.gsheet) return;
  var m=match(val("tpgN"),val("tpgAd")), w=S.gsheet.w, h="";
  if(m.length>1) h='<div class="tpNote">'+E(B("More than one person with this name - add the address too.","ഈ പേരിൽ ഒന്നിലധികം പേരുണ്ട് - വിലാസം കൂടി നൽകൂ."))+'</div>';
  else if(m.length===1){
   var x=w==="gave"?lastOf(m[0].rows,"got",S.gsheet.skip):lastOf(m[0].rows,"gave",S.gsheet.skip);
   if(x) h='<div class="tpNote">'+E(w==="gave"?B("He gave me ","ഇവർ എനിക്ക് തന്നത് "):B("I gave him ","ഞാൻ ഇവർക്ക് കൊടുത്തത് "))+'<b>'+mny(x.a)+'</b> ('+E(tyName(x.ty))+', '+E(dmy(x.d))+')'+
    '<div><span class="tpChip" onclick="tpgSet('+x.a+')">'+E(B("Same ","തുല്യം "))+mny(x.a)+'</span><span class="tpChip" onclick="tpgSet('+(x.a*2)+')">'+E(B("Double ","ഇരട്ടി "))+mny(x.a*2)+'</span></div></div>';
   else h='<div class="tpNote">'+E(w==="gave"?B("He has not given me a cover before.","ഇവർ എനിക്ക് മുമ്പ് കവർ തന്നിട്ടില്ല."):B("I have not given him a cover before.","ഞാൻ ഇവർക്ക് മുമ്പ് കവർ കൊടുത്തിട്ടില്ല."))+'</div>';
  }
  if(box.innerHTML!==h) box.innerHTML=h;
 };
 window.tpgSet=function(a){ var e=$("tpgA"); if(e) e.value=a; };
 window.tpgSave=function(id,w){
  var p=cap(val("tpgN"),60), ad=cap(val("tpgAd"),80), a=num(val("tpgA")), d=val("tpgD")||P.today(), ty=val("tpgTy")||"ot", nm=cap(val("tpgNm"),60);
  if(!p){ say(B("Enter the name","പേര് നൽകുക")); return; }
  if(!(a>0)||a>=1e9){ say(B("Enter the amount","തുക നൽകുക")); return; }
  if(!P.okDate(d)){ say(B("Check the date","തീയതി നോക്കുക")); return; }
  var dup=P.mine(K).filter(function(r){ return r.id!==id&&r.w===w&&norm(r.p)===norm(p)&&norm(r.ad)===norm(ad)&&r.d===d&&r.a===a; });
  if(dup.length&&!confirm(B("The same cover is already recorded. Save again?","ഇതേ കവർ നേരത്തേ ചേർത്തിട്ടുണ്ട്. വീണ്ടും ചേർക്കട്ടേ?"))) return;
  if(id){ var r=P.rec(K,id); if(!r) return; r.p=p; r.ad=ad; r.a=a; r.d=d; r.ty=ty; r.nm=nm; P.touch(r); }
  else P.put(K,{d:d,w:w,p:p,ad:ad,a:a,ty:ty,nm:nm});
  S.gsheet=null; P.closeSheet();
  var k=norm(p)+"|"+norm(ad);
  if(S.screen==="gperson"&&S.params.key!==k) P.go("gifts"); else if(S.screen==="gperson") P.go("gperson",{key:k,title:p}); else P.refresh();
  say(B("Saved","സേവ് ചെയ്തു"));
 };

 /* ---------- CSV ---------- */
 P.CSVS.g=function(){ return [["Date","Direction","Name","Address","Amount","Ceremony","Whose ceremony","Note"]].concat(P.srt(P.mine(K)).map(function(r){ return [r.d,r.w==="gave"?"I gave":"I received",r.p,r.ad||"",r.a,tyName(r.ty),r.nm||"",r.n||""]; })); };
})();
