/* Bills & reminders - part of "My Accounts" (tc-persbill.js, loaded by tc-regdocs.js right after tc-perschit.js).
   Owner's request (2026-10-29): regular payments of a household - school fee, school-vehicle fee, milk, newspaper, mobile recharge, EMI / loan
   instalments, electricity ... - to be added in the account book, with a "set" so that the next date is known and reminded.
   One bill = what is paid, how often, the NEXT due date. "Paid" writes the payment (amount, date, note) and moves the next due date on by one cycle;
   the amount can be changed at that moment (milk / newspaper / current bills are different every month). An EMI can carry a number of instalments:
   after the last one the bill is finished. The home card of My Accounts and the Menu entry show how many bills are overdue / due in 7 days
   (this phone shows it whenever the app is opened - a push message is NOT sent for personal accounts, they never leave the phone).
   "Add reminder to phone calendar" gives a .ics file (repeating, with an alert at 9 am the day before) that the phone's calendar app opens.
   DATA (phone only / Premium cloud backup / backup file - same rules as tc-pers.js; keys are added to P.K and TC_BK_LISTS here):
     db.persBills   {id,u,ts, nm: name, ty: type key, a: usual amount, cy: cycle, nx: NEXT due date ('' = finished), ad: day of month to keep, k: number of instalments (0 = no end), nt: note, rm: 1 = notification reminder ON (tc-persrem.js sends name + date only)}
     db.persBillPay {id,u,ts, b: bill id, d: date paid, a: amount, dd: the due date it covered, n: note}
   Cycles: w1 week, d28 28 days (recharge), m1 / m2 / m3 / m6 months (a 31st becomes the month end), y1 year, o once. Deleting a bill hides its payments too. */
(function(){
 var P=window.__tcPers;
 if(!P||P.bills) return;
 P.bills=1;
 var B=P.B, E=P.E, S=P.S, SC=P.SC, $=P.$, mny=P.mny, dmy=P.dmy, oc=P.oc, val=P.val, num=P.num, say=P.say, cap=P.cap, r2=P.r2;
 P.K.b="persBills"; P.K.bp="persBillPay";
 var KB=P.K.b, KP=P.K.bp;
 P.UP.bills="home"; P.UP.bill="bills";
 P.TITLE.bills=["Bills & reminders","ബില്ലുകൾ / ഓർമ്മപ്പെടുത്തൽ"]; P.TITLE.bill=["",""];
 try{ [KB,KP].forEach(function(k){ if(typeof TC_BK_LISTS!=="undefined"&&TC_BK_LISTS.indexOf(k)<0) TC_BK_LISTS.push(k); }); }catch(e){}

 var TYPES=[
  {k:"school",ic:"🎓",en:"School fee",ml:"സ്കൂൾ ഫീസ്",cy:"m1"},
  {k:"bus",ic:"🚌",en:"School vehicle fee",ml:"സ്കൂൾ വാഹന ഫീസ്",cy:"m1"},
  {k:"milk",ic:"🥛",en:"Milk",ml:"പാൽ",cy:"m1"},
  {k:"paper",ic:"📰",en:"Newspaper",ml:"പത്രം",cy:"m1"},
  {k:"rech",ic:"📱",en:"Mobile recharge",ml:"മൊബൈൽ റീചാർജ്",cy:"d28"},
  {k:"emi",ic:"🏦",en:"EMI / loan instalment",ml:"EMI / ലോൺ തവണ",cy:"m1"},
  {k:"power",ic:"💡",en:"Electricity / water",ml:"കറന്റ് / വെള്ളം",cy:"m2"},
  {k:"rent",ic:"🏠",en:"Rent",ml:"വാടക",cy:"m1"},
  {k:"ins",ic:"🛡",en:"Insurance / premium",ml:"ഇൻഷുറൻസ് / പ്രീമിയം",cy:"y1"},
  {k:"oth",ic:"🔔",en:"Other",ml:"മറ്റുള്ളവ",cy:"m1"}];
 var CYC=["w1","d28","m1","m2","m3","m6","y1","o"];
 var CY={w1:["Every week","എല്ലാ ആഴ്ചയും"],d28:["Every 28 days","28 ദിവസം കൂടുമ്പോൾ"],m1:["Every month","എല്ലാ മാസവും"],m2:["Every 2 months","2 മാസം കൂടുമ്പോൾ"],m3:["Every 3 months","3 മാസം കൂടുമ്പോൾ"],m6:["Every 6 months","6 മാസം കൂടുമ്പോൾ"],y1:["Every year","വർഷത്തിൽ ഒരിക്കൽ"],o:["Only once","ഒരു തവണ മാത്രം"]};
 function tyOf(k){ for(var i=0;i<TYPES.length;i++) if(TYPES[i].k===k) return TYPES[i]; return TYPES[TYPES.length-1]; }
 function cyName(c){ var x=CY[c]||CY.m1; return B(x[0],x[1]); }

 /* ---------- dates ---------- */
 function pad(n){ return (n<10?"0":"")+n; }
 function iso(y,m,d){ return y+"-"+pad(m+1)+"-"+pad(d); }
 function parts(d){ var p=String(d).split("-"); return {y:+p[0],m:+p[1]-1,d:+p[2]}; }
 function addDays(d,n){ var p=parts(d), t=new Date(p.y,p.m,p.d+n); return iso(t.getFullYear(),t.getMonth(),t.getDate()); }
 function addMonths(d,k,ad){
  var p=parts(d), y=p.y, m=p.m+k, day=ad||p.d;
  y+=Math.floor(m/12); m=((m%12)+12)%12;
  return iso(y,m,Math.min(day,new Date(y,m+1,0).getDate()));
 }
 function advance(d,cy,ad){
  if(!d||cy==="o") return "";
  if(cy==="w1") return addDays(d,7);
  if(cy==="d28") return addDays(d,28);
  var k={m1:1,m2:2,m3:3,m6:6,y1:12}[cy]||1;
  return addMonths(d,k,ad);
 }
 function diff(a,b){ var x=parts(a), y=parts(b); return Math.round((Date.UTC(y.y,y.m,y.d)-Date.UTC(x.y,x.m,x.d))/86400000); }

 /* ---------- data ---------- */
 function bills(){
  var pays=P.mine(KP);
  return P.mine(KB).map(function(b){
   var my=pays.filter(function(x){ return x.b===b.id; }), paid=0;
   my.forEach(function(x){ paid+=x.a; });
   return {b:b,rows:my,paid:r2(paid),cnt:my.length,done:!b.nx,left:b.k>0?Math.max(b.k-my.length,0):null};
  });
 }
 function find(id){ return bills().filter(function(x){ return x.b.id===id; })[0]; }
 function state(x,t){
  if(x.done) return {c:"#6b7c88",t:B("Finished","കഴിഞ്ഞു"),n:3};
  var dd=diff(t,x.b.nx);
  if(dd<0) return {c:"#b03a2e",t:"⚠ "+B(-dd+" day(s) late",-dd+" ദിവസം വൈകി"),n:0};
  if(dd===0) return {c:"#b36b00",t:B("Due today","ഇന്ന്"),n:1};
  if(dd<=7) return {c:"#b36b00",t:B("In "+dd+" day(s)",dd+" ദിവസത്തിനുള്ളിൽ"),n:1};
  return {c:"#12303f",t:"",n:2};
 }
 function dueInfo(){
  var t=P.today(), late=0, soon=0, sum=0;
  bills().forEach(function(x){
   if(x.done) return;
   var d=diff(t,x.b.nx);
   if(d<0){ late++; sum+=x.b.a; } else if(d<=7){ soon++; sum+=x.b.a; }
  });
  return {late:late,soon:soon,n:late+soon,sum:r2(sum)};
 }
 P.billDue=dueInfo;
 function dueText(){
  var d=dueInfo(); if(!d.n) return "";
  return d.late?B(d.late+" bill(s) overdue",d.late+" ബിൽ വൈകി"):B(d.soon+" bill(s) due soon",d.soon+" ബിൽ അടുത്ത്");
 }

 P.dueText=function(){ return dueText(); };

 /* ---------- My Accounts home card ---------- */
 P.homeCards=(P.homeCards||[]);
 P.homeCards.push(function(){
  var L=bills(), d=dueInfo();
  return '<div class="tpC" onclick="tpGo(\'bills\')" style="cursor:pointer"><b>🔔 '+E(B("Bills & reminders","ബില്ലുകൾ / ഓർമ്മപ്പെടുത്തൽ"))+'</b>'+
   (L.length?'<div class="tpG2"><div><div class="tpM">'+E(B("Overdue / due in 7 days","വൈകിയത് / 7 ദിവസത്തിനുള്ളിൽ"))+'</div><div class="tpBig" style="color:'+(d.late?"#b03a2e":"#12303f")+'">'+d.n+'</div></div>'+
    '<div><div class="tpM">'+E(B("Amount","തുക"))+'</div><div class="tpBig tpOut">'+mny(d.sum)+'</div></div></div>':
    '<div class="tpM">'+E(B("School fee, milk, newspaper, recharge, EMI ... tap to add","സ്കൂൾ ഫീസ്, പാല്, പത്രം, റീചാർജ്, EMI ... ചേർക്കാൻ തൊടുക"))+'</div>')+'</div>';
 });

 /* ---------- list ---------- */
 SC.bills=function(){
  var L=bills(), t=P.today();
  L.sort(function(a,b){ return (a.done-b.done)||((a.b.nx||"9")<(b.b.nx||"9")?-1:(a.b.nx||"9")>(b.b.nx||"9")?1:0); });
  var d=dueInfo();
  $("tpBody").innerHTML=
   '<button class="tpBtn in" style="margin-top:0" onclick="tpBAdd()">➕ '+E(B("New bill / reminder","പുതിയ ബിൽ / ഓർമ്മപ്പെടുത്തൽ"))+'</button>'+
   (d.n?'<div class="tpNote" style="background:#fff6df;color:#7a4f00">'+E(B("Overdue or due in 7 days: ","വൈകിയതോ 7 ദിവസത്തിനുള്ളിൽ വരുന്നതോ: "))+'<b>'+d.n+'</b> · '+mny(d.sum)+'</div>':"")+
   (L.length?L.map(function(x){
     var st=state(x,t), ty=tyOf(x.b.ty);
     return '<div class="tpC" '+oc("tpBill",x.b.id)+' style="cursor:pointer'+(x.done?";opacity:.65":"")+'"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:18px">'+ty.ic+' '+E(x.b.nm)+'</b><b>'+mny(x.b.a)+'</b></div>'+
      '<div class="tpM">'+E(cyName(x.b.cy))+(x.b.k>0?' · '+x.cnt+'/'+x.b.k:'')+'</div>'+
      (x.done?'<div class="tpM">✓ '+E(B("Finished","കഴിഞ്ഞു"))+'</div>':
       '<div style="margin-top:4px;font-weight:700;color:'+st.c+'">'+E(B("Next: ","അടുത്തത്: "))+E(dmy(x.b.nx))+(st.t?' · '+E(st.t):"")+'</div>')+'</div>';
    }).join(""):'<div class="tpC tpM" style="text-align:center">'+E(B("No bill added yet","ബിൽ ഒന്നും ചേർത്തിട്ടില്ല"))+'</div>')+
   '<button class="tpBtn g" onclick="tpBillCsv()">📤 '+E(B("Export to Excel (CSV)","Excel-ലേക്ക് (CSV)"))+'</button>';
 };
 window.tpBill=function(id){ var x=find(id); if(x) P.go("bill",{id:id,title:x.b.nm}); };

 /* ---------- one bill ---------- */
 SC.bill=function(prm){
  var x=find(prm.id); if(!x){ P.go("bills"); return; }
  var t=P.today(), st=state(x,t), ty=tyOf(x.b.ty), rows=P.srt(x.rows);
  $("tpBody").innerHTML=
   '<div class="tpC"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:19px">'+ty.ic+' '+E(x.b.nm)+'</b><button class="tpBtn g s" style="margin:0" onclick="tpBEdit(\''+x.b.id+'\')">✎ '+E(B("Edit","മാറ്റുക"))+'</button></div>'+
    '<div class="tpM">'+mny(x.b.a)+' · '+E(cyName(x.b.cy))+(x.b.k>0?' · '+x.cnt+'/'+x.b.k+' '+E(B("paid","അടച്ചു")):'')+'</div>'+
    (x.b.nt?'<div class="tpM">'+E(x.b.nt)+'</div>':"")+
    (x.b.rm===1&&!x.done?'<div class="tpM">🔔 '+E(B("Notification reminder is ON","നോട്ടിഫിക്കേഷൻ ഓർമ്മപ്പെടുത്തൽ ഓണാണ്"))+'</div>':"")+
    '<div class="tpG2" style="margin-top:8px"><div><div class="tpM">'+E(B("Paid so far","ഇതുവരെ അടച്ചത്"))+'</div><div class="tpBig tpOut">'+mny(x.paid)+'</div><div class="tpM">'+x.cnt+' '+E(B("time(s)","തവണ"))+'</div></div>'+
    '<div><div class="tpM">'+E(B("Next due","അടുത്ത തീയതി"))+'</div><div class="tpBig" style="font-size:20px;color:'+st.c+'">'+(x.done?"-":E(dmy(x.b.nx)))+'</div><div class="tpM" style="color:'+st.c+'">'+E(st.t)+'</div></div></div>'+
    (x.done?'<div style="margin-top:8px"><b>✓ '+E(B("Finished - nothing more to pay","കഴിഞ്ഞു - ഇനി അടയ്ക്കാനില്ല"))+'</b></div>':
     (x.left!=null?'<div style="margin-top:8px">'+E(B("Instalments left: ","ബാക്കി തവണകൾ: "))+'<b>'+x.left+'</b> (≈ '+mny(x.left*x.b.a)+')</div>':""))+'</div>'+
   (x.done?"":'<button class="tpBtn out" onclick="tpBPay(\''+x.b.id+'\')">✔ '+E(B("Paid","അടച്ചു"))+' - '+E(dmy(x.b.nx))+'</button>'+
    '<button class="tpBtn g" onclick="tpBillGcal(\''+x.b.id+'\')">📅 '+E(B("Add to phone calendar (Google Calendar)","ഫോൺ കലണ്ടറിൽ ചേർക്കുക (Google Calendar)"))+'</button>'+
    '<button class="tpBtn g s" onclick="tpBillIcs(\''+x.b.id+'\')">📁 '+E(B("Calendar file (.ics)","കലണ്ടർ ഫയൽ (.ics)"))+'</button>')+
   '<div class="tpC" style="padding:4px 14px">'+(rows.length?rows.map(function(r){
     return '<div class="tpRow" '+oc("tpBpEdit",r.id)+'><div style="min-width:0"><b>'+E(dmy(r.d))+'</b><div class="tpM">'+(r.dd?E(B("For ","തീയതി "))+E(dmy(r.dd)):"")+(r.n?" · "+E(r.n):"")+'</div></div><b class="tpOut">'+mny(r.a)+'</b></div>';
    }).join(""):'<div class="tpM" style="text-align:center;padding:16px 0">'+E(B("Nothing paid yet","ഒന്നും അടച്ചിട്ടില്ല"))+'</div>')+'</div>';
 };

 /* ---------- bill add / edit ---------- */
 var BS={ty:"oth",cy:"m1",prev:""};
 function setOn(sel,key){ var a=document.querySelectorAll(sel); for(var i=0;i<a.length;i++) a[i].classList.toggle("on",a[i].getAttribute("data-k")===key); }
 function chipK(cls,key,on,fn,txt){ return '<span class="tpChip'+(on?" on":"")+' '+cls+'" data-k="'+E(key)+'" onclick="'+fn+'(\''+key+'\')">'+E(txt)+'</span>'; }
 function billSheet(x){
  var b=x?x.b:null;
  BS={ty:b?b.ty:"oth",cy:b?b.cy:"m1",prev:""};
  P.sheet('<h3>'+E(b?B("Edit bill","ബിൽ മാറ്റുക"):B("New bill / reminder","പുതിയ ബിൽ / ഓർമ്മപ്പെടുത്തൽ"))+'</h3>'+
   (b?"":'<div class="tpM">'+E(B("Pick one, or type your own name","ഒന്ന് തിരഞ്ഞെടുക്കൂ, അല്ലെങ്കിൽ സ്വന്തം പേര് ടൈപ്പ് ചെയ്യൂ"))+'</div><div>'+
     TYPES.map(function(t){ return chipK("tpBTy",t.k,false,"tpBTy",t.ic+" "+B(t.en,t.ml)); }).join("")+'</div>')+
   P.fld("tpbN",B("Name","പേര്"),"text",b?b.nm:"",'maxlength="50" placeholder="'+E(B("e.g. Milk, Anu's school fee","ഉദാ: പാൽ, അനുവിന്റെ സ്കൂൾ ഫീസ്"))+'"')+
   P.fld("tpbA",B("Usual amount (₹) - can be changed when you pay","സാധാരണ തുക (₹) - അടയ്ക്കുമ്പോൾ മാറ്റാം"),"number",b?b.a:"",'inputmode="decimal" min="0" step="any"')+
   '<div class="tpM" style="margin-top:8px">'+E(B("How often","എത്ര ദിവസം കൂടുമ്പോൾ"))+'</div><div>'+
    CYC.map(function(c){ return chipK("tpBCy",c,c===BS.cy,"tpBCy",cyName(c)); }).join("")+'</div>'+
   ((b&&!b.nx)?'<div class="tpNote" style="margin-top:8px">'+E(B("This bill is finished.","ഈ ബിൽ കഴിഞ്ഞു."))+'</div>':
    P.fld("tpbD",b?B("Next due date","അടുത്ത തീയതി"):B("First / next due date","ആദ്യത്തെ / അടുത്ത തീയതി"),"date",b?b.nx:P.today()))+
   P.fld("tpbK",B("Number of instalments (EMI) - empty = no end","തവണകളുടെ എണ്ണം (EMI) - ഇല്ലെങ്കിൽ ഒഴിച്ചിടുക"),"number",b&&b.k>0?b.k:"",'inputmode="numeric" min="1" max="600" step="1"')+
   '<label class="tpL" style="display:flex;gap:8px;align-items:flex-start;margin-top:10px"><input type="checkbox" id="tpbR" style="width:auto;margin-top:3px"'+((!b||b.rm===1)?" checked":"")+'><span><b>🔔 '+E(B("Remind me by notification","നോട്ടിഫിക്കേഷൻ വഴി ഓർമ്മിപ്പിക്കുക"))+'</b><br><span class="tpM">'+E(B("The day before, on the day and once if late. Only the bill NAME and DATE go to our server for this (never the amount).","തലേന്ന്, അന്ന്, വൈകിയാൽ ഒരു തവണ. ഇതിനായി ബില്ലിന്റെ പേരും തീയതിയും മാത്രം സെർവറിലേക്ക് പോകും (തുക ഒരിക്കലും പോകില്ല)."))+'</span></span></label>'+
   (P.remHintHtml?P.remHintHtml():"")+
   P.fld("tpbT",B("Note (optional)","കുറിപ്പ് (വേണമെങ്കിൽ)"),"text",b?b.nt:"",'maxlength="80"')+
   '<button class="tpBtn" onclick="tpBSave(\''+(b?b.id:"")+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   (b?'<button class="tpBtn r" onclick="tpBDel(\''+b.id+'\')">'+E(B("Delete","ഡിലീറ്റ്"))+'</button>':"")+
   '<button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
 }
 window.tpBAdd=function(){ billSheet(null); };
 window.tpBEdit=function(id){ var x=find(id); if(x) billSheet(x); };
 window.tpBTy=function(k){
  var t=tyOf(k), n=$("tpbN"), old=BS.prev;
  BS.ty=k; setOn(".tpBTy",k);
  if(n&&(!n.value.trim()||n.value===old)&&k!=="oth"){ n.value=B(t.en,t.ml); }
  BS.prev=(k!=="oth")?B(t.en,t.ml):"";
  BS.cy=t.cy; setOn(".tpBCy",BS.cy);
 };
 window.tpBCy=function(c){ BS.cy=c; setOn(".tpBCy",c); };
 window.tpBSave=function(id){
  var nm=cap(val("tpbN"),50), a=num(val("tpbA")), d=val("tpbD"), k=Math.round(num(val("tpbK"))||0), nt=cap(val("tpbT"),80);
  var rc=$("tpbR"), rm=rc&&rc.checked?1:0;
  var b=id?P.rec(KB,id):null;
  var fin=!!(b&&!b.nx);
  if(!nm){ say(B("Enter the name","പേര് നൽകുക")); return; }
  if(!(a>0)||a>=1e9){ say(B("Enter the amount","തുക നൽകുക")); return; }
  if(!fin&&!P.okDate(d)){ say(B("Check the date","തീയതി നോക്കുക")); return; }
  if(!(k>=0&&k<=600)) k=0;
  if(BS.cy==="o") k=0;
  var cnt=b?bills().filter(function(y){ return y.b.id===id; })[0].cnt:0;
  if(k>0&&k<cnt){ say(B("Instalments cannot be fewer than the "+cnt+" already paid","ഇതുവരെ അടച്ച "+cnt+" തവണയിൽ കുറവ് പറ്റില്ല")); return; }
  var bid=id;
  if(b){
   b.nm=nm; b.a=a; b.cy=BS.cy; b.k=k; b.nt=nt; b.ty=BS.ty; b.rm=rm;
   if(!fin){ b.nx=d; b.ad=P.okDate(d)?+d.slice(8,10):b.ad; }
   P.touch(b);
  }else bid=P.put(KB,{nm:nm,ty:BS.ty,a:a,cy:BS.cy,nx:d,ad:+d.slice(8,10),k:k,nt:nt,rm:rm}).id;
  P.closeSheet(); P.go("bill",{id:bid,title:nm}); say(B("Saved","സേവ് ചെയ്തു"));
 };
 window.tpBDel=function(id){
  if(!confirm(B("Delete this bill with all its payments?","ഈ ബില്ലും അതിലെ എല്ലാ എൻട്രികളും ഡിലീറ്റ് ചെയ്യട്ടേ?"))) return;
  var b=P.rec(KB,id); if(b){ b.del=1; P.touch(b); }
  P.closeSheet(); P.go("bills");
 };

 /* ---------- paid ---------- */
 function paySheet(r,bid){
  var x=find(r?r.b:bid); if(!x) return;
  P.sheet('<h3>'+E((r?B("Edit: ","മാറ്റുക: "):"")+x.b.nm+" - "+B("Paid","അടച്ചു"))+'</h3>'+
   (!r?'<div class="tpM">'+E(B("For the due date ","തീയതി "))+E(dmy(x.b.nx))+'</div>':"")+
   P.fld("tpbpA",B("Amount paid (₹)","അടച്ച തുക (₹)"),"number",r?r.a:x.b.a,'inputmode="decimal" min="0" step="any"')+
   P.fld("tpbpD",B("Date paid","അടച്ച തീയതി"),"date",r?r.d:P.today())+
   P.fld("tpbpN",B("Note (optional)","കുറിപ്പ് (വേണമെങ്കിൽ)"),"text",r?r.n:"",'maxlength="80"')+
   '<button class="tpBtn" onclick="tpBpSave(\''+(r?r.id:"")+'\',\''+x.b.id+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+
   (r?'<button class="tpBtn r" onclick="tpBpDel(\''+r.id+'\')">'+E(B("Delete","ഡിലീറ്റ്"))+'</button>':"")+
   '<button class="tpBtn g" onclick="tpCloseSheet()">'+E(B("Cancel","വേണ്ട"))+'</button>');
 }
 window.tpBPay=function(id){ paySheet(null,id); };
 window.tpBpEdit=function(id){ var r=P.rec(KP,id); if(r) paySheet(r); };
 window.tpBpSave=function(id,bid){
  var x=find(bid); if(!x) return;
  var a=num(val("tpbpA")), d=val("tpbpD")||P.today(), n=cap(val("tpbpN"),80);
  if(!(a>0)||a>=1e9){ say(B("Enter the amount","തുക നൽകുക")); return; }
  if(!P.okDate(d)){ say(B("Check the date","തീയതി നോക്കുക")); return; }
  if(id){ var r=P.rec(KP,id); if(!r) return; r.a=a; r.d=d; r.n=n; P.touch(r); }
  else{
   if(x.done) return;
   var due=x.b.nx;
   P.put(KP,{b:bid,d:d,a:a,dd:due,n:n});
   var b=x.b, cnt=x.cnt+1;
   b.nx=(b.cy==="o"||(b.k>0&&cnt>=b.k))?"":advance(due,b.cy,b.ad);
   P.touch(b);
  }
  P.closeSheet(); P.refresh(); say(B("Saved","സേവ് ചെയ്തു"));
 };
 window.tpBpDel=function(id){
  if(!confirm(B("Delete this entry?","ഈ എൻട്രി ഡിലീറ്റ് ചെയ്യട്ടേ?"))) return;
  var r=P.rec(KP,id), b=r?P.rec(KB,r.b):null;
  if(r){
   if(b&&r.dd){
    var latest=P.mine(KP).filter(function(y){ return y.b===r.b&&y.id!==r.id; }).every(function(y){ return !y.dd||y.dd<r.dd; });
    if(latest){ b.nx=r.dd; P.touch(b); }      /* the last payment is taken back: the same due date is open again */
   }
   r.del=1; P.touch(r);
  }
  P.closeSheet(); P.refresh();
 };

 /* ---------- phone calendar (.ics) ---------- */
 function icsEsc(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g," "); }
 function ymd(d){ return d.replace(/-/g,""); }
 function ruleOf(x){
  var b=x.b, rule="";
  var map={w1:"FREQ=WEEKLY;INTERVAL=1",d28:"FREQ=DAILY;INTERVAL=28",m1:"FREQ=MONTHLY;INTERVAL=1",m2:"FREQ=MONTHLY;INTERVAL=2",m3:"FREQ=MONTHLY;INTERVAL=3",m6:"FREQ=MONTHLY;INTERVAL=6",y1:"FREQ=YEARLY;INTERVAL=1"};
  if(map[b.cy]){
   rule=map[b.cy];
   if(/^m/.test(b.cy)){ var ad=b.ad||+b.nx.slice(8,10); rule+=";BYMONTHDAY="+(ad<=28?ad:-1); }
   if(b.k>0) rule+=";COUNT="+Math.max(b.k-x.cnt,1);
  }
  return rule;
 }
 /* a ready-made "new event" page of Google Calendar (opens in the Calendar app or the browser; one tap on Save) */
 P.gcalUrl=function(x){
  var b=x.b, rule=ruleOf(x);
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent(b.nm+" - Rs "+b.a)+
   "&dates="+ymd(b.nx)+"/"+ymd(addDays(b.nx,1))+"&details="+encodeURIComponent("Bill reminder from Travel Connect > My Accounts")+(rule?"&recur="+encodeURIComponent("RRULE:"+rule):"");
 };
 P.icsOf=function(x){
  var b=x.b, rule=ruleOf(x);
  var st=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Travel Connect//My Accounts//EN","CALSCALE:GREGORIAN","BEGIN:VEVENT",
   "UID:"+b.id+"@travelconnect.dev","DTSTAMP:"+st,"DTSTART;VALUE=DATE:"+ymd(b.nx),"DTEND;VALUE=DATE:"+ymd(addDays(b.nx,1)),
   "SUMMARY:"+icsEsc(b.nm+" - Rs "+b.a)].concat(rule?["RRULE:"+rule]:[]).concat([
   "DESCRIPTION:"+icsEsc("Bill reminder from Travel Connect > My Accounts"),
   "BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsEsc(b.nm+" due tomorrow"),"TRIGGER;RELATED=START:-PT15H","END:VALARM","END:VEVENT","END:VCALENDAR"]).join("\r\n")+"\r\n";
 };
 window.tpBillGcal=function(id){
  var x=find(id); if(!x||x.done) return;
  try{ window.open(P.gcalUrl(x),"_blank"); }catch(e){ location.href=P.gcalUrl(x); }
 };
 window.tpBillIcs=function(id){
  var x=find(id); if(!x||x.done) return;
  var tm=new Date();   /* date + time in the name: Chrome asks "Download file again?" when the same file name is downloaded twice */
  P.dl("bill-"+(x.b.nm.replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"")||"reminder")+"-"+x.b.nx+"-"+pad(tm.getHours())+pad(tm.getMinutes())+pad(tm.getSeconds())+".ics","text/calendar",P.icsOf(x));
  say(B("Open the file to add it to your calendar","ഫയൽ തുറന്നാൽ കലണ്ടറിൽ ചേരും"));
 };

 /* ---------- CSV ---------- */
 P.CSVS.b=function(){
  var out=[["Bill","Cycle","Date paid","For due date","Amount","Note"]];
  bills().forEach(function(x){ P.srt(x.rows).forEach(function(r){ out.push([x.b.nm,CY[x.b.cy]?CY[x.b.cy][0]:x.b.cy,r.d,r.dd||"",r.a,r.n||""]); }); });
  return out;
 };
 window.tpBillCsv=function(){
  var d=new Date(), s=d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
  P.dl("bills-"+s+".csv","text/csv",P.csv(P.CSVS.b()));
 };

 /* ---------- a note on the Menu entry when something is due (the customer's home card asks P.dueText from tc-pers.js) ---------- */
 var om=window.tcOpenMenu;
 if(typeof om==="function") window.tcOpenMenu=function(){
  var r=om.apply(this,arguments);
  try{
   var m=document.getElementById("tcPersMenu"), d=dueInfo();
   if(m&&d.n&&!m.querySelector(".tpDueB")){
    var lab=m.querySelector('div[style*="font-weight:600"]');
    if(lab){ var s=document.createElement("span"); s.className="tpDueB"; s.style.cssText="margin-left:8px;background:#fde8e6;color:#a12d2d;border-radius:8px;padding:1px 7px;font-size:12px;font-weight:800"; s.textContent="🔔 "+d.n; lab.appendChild(s); }
   }
  }catch(e){}
  return r;
 };
})();
