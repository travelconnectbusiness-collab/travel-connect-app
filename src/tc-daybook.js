/* Day Book (tc-daybook.js, loaded by tc-regdocs.js).
   A "Day Book" tab inside Trip & Accounts, laid out like a cash book: pick a day, see at one glance
     OPENING balance (everything before that day) -> that day's IN and OUT -> CLOSING balance,
     the closing balance split into Cash / Online / mode not noted,
     and every entry of the day in two columns (OUT red, IN green) with what it is for.
   Balance = money received - expenses of the chosen vehicle (or all vehicles) up to that day.
   Driver tips (the driver's money) are shown greyed and are NOT in the balance.
   Reads the book through window.__tcAbApi (tc-accbook.js); stores nothing. */
(function(){
 if(window.__tcDayBook) return;
 window.__tcDayBook=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var mny=function(n){
  n=Math.round((+n||0)*100)/100;
  if(Number.isInteger(n)) { try{ return (n<0?"-":"")+money(Math.abs(n)); }catch(e){ return "Rs."+n; } }
  return (n<0?"-":"")+"₹"+Math.abs(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
 };
 var A=function(){ return window.__tcAbApi||null; };
 var D={day:""};
 function p2(n){ return String(n).padStart(2,"0"); }
 function iso(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
 function today(){ return iso(new Date()); }
 function shift(day,n){ var d=new Date(day+"T12:00:00"); d.setDate(d.getDate()+n); return iso(d); }
 function dFull(day){ try{ return tcFormatDate(day); }catch(e){ return day; } }
 function bucket(m){ return m==="Cash"?"cash":(m==="UPI"||m==="Bank")?"online":"unk"; }
 function short(s,n){ s=String(s||""); return s.length>n?s.slice(0,n)+"…":s; }

 function vehOk(e,a){
  var v=a.ST.veh;
  if(v==="all") return true;
  if(v==="none") return !e.vehId||!a.vById(e.vehId);
  return e.vehId===v;
 }
 function data(){
  var a=A(), day=D.day||today();
  var op={net:0,cash:0,online:0,unk:0}, dayIn=0, dayOut=0, rows=[], drv=[], dates={};
  a.entries().forEach(function(e){
   if(!vehOk(e,a)) return;
   var x=+e.amount||0;
   if(a.isDrv(e)){ if(e.date===day) drv.push(e); return; }
   dates[e.date]=1;
   var s=e.type==="in"?x:-x, b=bucket(e.mode);
   if(e.date<day){ op.net+=s; op[b]+=s; }
   else if(e.date===day){ if(e.type==="in") dayIn+=x; else dayOut+=x; rows.push(e); }
  });
  rows.sort(function(p,q){ return String(p.created||"").localeCompare(String(q.created||"")); });
  var cl={net:op.net+dayIn-dayOut,cash:op.cash,online:op.online,unk:op.unk};
  rows.forEach(function(e){ var s=e.type==="in"?+e.amount||0:-(+e.amount||0); cl[bucket(e.mode)]+=s; });
  return {day:day,op:op,cl:cl,dayIn:dayIn,dayOut:dayOut,rows:rows,drv:drv,dates:Object.keys(dates).sort().reverse()};
 }

 function rowHtml(e,a){
  var isIn=e.type==="in";
  var title=a.catLabel(e.cat)+(e.note?" – "+short(e.note,40):"");
  var sub=[];
  if(e.customer) sub.push(e.customer);
  if(e.route) sub.push(short(e.route,34));
  var v=a.vById(e.vehId); var vl=v?v.name:(e.vehName||"");
  if(vl) sub.push(vl);
  if(e.mode) sub.push(e.mode);
  if(e.src==="bill") sub.push("⚡"+B("bill","ബിൽ"));
  var tripBtn=(e.tripId&&typeof window.tcTrOpen==="function")?' <button onclick="event.stopPropagation();tcTrOpen(\''+e.tripId+'\')" style="font-size:11px;padding:1px 8px;margin-left:4px">&#129523; '+E(B("Trip","ട്രിപ്പ്"))+'</button>':'';
  return '<div onclick="tcAbEdit(\''+e.id+'\')" style="display:grid;grid-template-columns:1fr 74px 74px;border:1px solid #e1e6ea;border-radius:8px;margin:5px 0;overflow:hidden;background:#fff;cursor:pointer">'+
   '<div style="padding:7px 8px;min-width:0"><div style="font-weight:700;font-size:13.5px;word-break:break-word">'+E(title)+'</div>'+
   '<div class="muted" style="font-size:11.5px;word-break:break-word">'+E(sub.join(" · "))+tripBtn+'</div></div>'+
   '<div style="background:#fdf1f3;color:#a12d2d;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:flex-end;padding:0 6px">'+(isIn?'':mny(e.amount))+'</div>'+
   '<div style="background:#f0f8f1;color:#1c6b2c;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:flex-end;padding:0 6px">'+(isIn?mny(e.amount):'')+'</div></div>';
 }
 function neg(n){ return n<0?'#a12d2d':'#1c6b2c'; }

 window.tcDbHtml=function(){
  var a=A(); if(!a) return "";
  if(!D.day) D.day=today();
  var d=data(), h="";
  h+='<div style="display:flex;gap:6px;align-items:center;margin:8px 0">'+
   '<button onclick="tcDbSet(\''+shift(d.day,-1)+'\')" style="padding:8px 14px;font-size:16px">&#9664;</button>'+
   '<input type="date" id="dbDay" value="'+E(d.day)+'" onchange="tcDbSet(this.value)" style="flex:1;min-width:0;font-size:15px;font-weight:700;text-align:center">'+
   '<button onclick="tcDbSet(\''+shift(d.day,1)+'\')" style="padding:8px 14px;font-size:16px">&#9654;</button>'+
   (d.day!==today()?'<button onclick="tcDbSet(\''+today()+'\')" style="padding:8px 10px;font-size:12px">'+E(B("Today","ഇന്ന്"))+'</button>':'')+'</div>';
  if(d.dates.length){
   h+='<select onchange="if(this.value)tcDbSet(this.value)" style="width:100%;font-size:12.5px;margin-bottom:6px"><option value="">'+E(B("Jump to a day that has entries...","എൻട്രികളുള്ള ദിവസത്തിലേക്ക് പോവുക..."))+'</option>'+
    d.dates.slice(0,45).map(function(x){ return '<option value="'+x+'">'+E(dFull(x))+'</option>'; }).join("")+'</select>';
  }
  /* the balance card */
  var big='font-size:22px;font-weight:800';
  h+='<div style="border:1px solid #cfd8de;border-radius:12px;padding:10px;background:#f7fafc">'+
   '<div style="display:flex;justify-content:space-between;font-size:13.5px"><span>'+E(B("Opening balance","തുടക്കത്തിലെ ബാലൻസ്"))+' <span class="muted" style="font-size:11px">('+E(B("before this day","ഈ ദിവസത്തിന് മുൻപ്"))+')</span></span><b style="color:'+neg(d.op.net)+'">'+mny(d.op.net)+'</b></div>'+
   '<div style="display:flex;justify-content:space-between;font-size:13.5px;margin-top:3px"><span>&#10133; '+E(B("Today's IN","ഇന്നത്തെ വരവ്"))+'</span><b style="color:#1c6b2c">'+mny(d.dayIn)+'</b></div>'+
   '<div style="display:flex;justify-content:space-between;font-size:13.5px"><span>&#10134; '+E(B("Today's OUT","ഇന്നത്തെ ചെലവ്"))+'</span><b style="color:#a12d2d">'+mny(d.dayOut)+'</b></div>'+
   '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #cfd8de;margin-top:6px;padding-top:6px"><span style="font-weight:800">'+E(B("Closing balance","ദിവസാവസാന ബാലൻസ്"))+'</span><span style="'+big+';color:'+neg(d.cl.net)+'">'+mny(d.cl.net)+'</span></div>'+
   '<div class="muted" style="font-size:12px;margin-top:4px">'+E(B("Cash ","ക്യാഷ് "))+'<b>'+mny(d.cl.cash)+'</b> &middot; '+E(B("Online (UPI/Bank) ","ഓൺലൈൻ (UPI/ബാങ്ക്) "))+'<b>'+mny(d.cl.online)+'</b>'+(Math.abs(d.cl.unk)>0.5?' &middot; '+E(B("Mode not noted ","രീതി രേഖപ്പെടുത്തിയിട്ടില്ല "))+'<b>'+mny(d.cl.unk)+'</b>':'')+'</div></div>';
  /* the day's entries */
  h+='<div style="display:grid;grid-template-columns:1fr 74px 74px;margin-top:10px;font-size:11.5px;color:#666;font-weight:700"><div>'+dFull(d.day)+' &middot; '+d.rows.length+' '+E(B("entries","എൻട്രികൾ"))+'</div><div style="text-align:right;padding-right:6px">OUT</div><div style="text-align:right;padding-right:6px">IN</div></div>';
  h+=d.rows.map(function(e){ return rowHtml(e,a); }).join("")||'<p class="muted" style="margin:8px 0">'+E(B("No entries on this day.","ഈ ദിവസം എൻട്രികളില്ല."))+'</p>';
  if(d.drv.length){
   h+='<div class="muted" style="font-size:12px;margin-top:6px">&#127873; '+E(B("Driver tips this day (the driver's money - not in the balance): ","ഈ ദിവസത്തെ ഡ്രൈവർ ടിപ്പ് (ഡ്രൈവറുടെ പണം - ബാലൻസിൽ ഇല്ല): "))+d.drv.map(function(e){ return E((e.driver?e.driver+" ":"")+mny(e.amount)+(e.direct?" ("+B("direct","നേരിട്ട്")+")":"")); }).join(", ")+'</div>';
  }
  h+='<p class="muted" style="font-size:11.5px;margin-top:6px">'+E(B("Balance = money received - expenses, for the vehicle chosen above (all vehicles by default). Tap an entry to edit it.","ബാലൻസ് = കിട്ടിയ പണം - ചെലവ്, മുകളിൽ തിരഞ്ഞെടുത്ത വാഹനത്തിന് (സാധാരണ എല്ലാ വാഹനങ്ങളും). എൻട്രിയിൽ അമർത്തിയാൽ തിരുത്താം."))+'</p>';
  return h;
 };
 window.tcDbDay=function(){ return D.day||today(); };
 window.tcDbSet=function(day){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day||""))) return;
  D.day=day;
  try{ tcAbRefresh(); }catch(e){}
 };
})();
