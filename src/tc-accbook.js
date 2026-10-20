/* Trip & Accounts (tc-accbook.js, loaded by tc-regdocs.js).
   A vehicle-wise income / expense book for the taxi / travel owner. Replaces the old simple "Accounts" page
   (the menu entry now opens this book; the old expenses are copied into it once).
   DATA (inside the app's own saved data, written with save()):
     db.accVehicles  - the vehicle book: name, number, purchase date / price, down payment, loan, EMI
     db.accEntries   - every income (in) and expense (out): date, amount, category, vehicle, mode, note, litres
                       src = "manual" (typed), "bill" (made automatically from a bill payment / quotation advance),
                       "old" (copied once from the old Accounts page). Deleted entries stay as hidden records
                       (deleted:true) so an automatic entry is never made again and a backup restore never brings it back.
   AUTOMATIC ENTRIES: every payment recorded in Billing (db.trips[].payments) and every advance marked received on a
     Quotation becomes an income entry (key = bill payment). Undoing a payment removes the entry; an entry the owner
     has edited is kept. The owner can edit or delete any entry and add new ones.
   PLAN: Premium (and Owner Free) = unlimited. Everyone else: full use for 60 days from the first time the book is
     opened (db.settings.accStart, kept on the phone only), then view / export (CSV) only.
   Premium accounts: both lists are part of the automatic Cloud Backup (TC_BK_LISTS). */
(function(){
 if(window.__tcAccBook) return;
 window.__tcAccBook=1;
 var TRIAL_DAYS=60;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var $=function(id){ return document.getElementById(id); };
 var val=function(id){ var e=$(id); return e?String(e.value||"").trim():""; };
 var mny=function(n){ try{ return money(n); }catch(e){ return "Rs."+n; } };
 var origSave=(typeof window.save==="function")?window.save:null;
 function persist(){ try{ if(origSave) origSave(); else save(); }catch(e){} }
 function uid(){ try{ return crypto.randomUUID(); }catch(e){ return "ab"+Date.now()+Math.random().toString(16).slice(2); } }
 function p2(n){ return String(n).padStart(2,"0"); }
 function ymd(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
 function todayIso(){ return ymd(new Date()); }
 function localDate(iso){ var d=new Date(iso); return isNaN(d)?todayIso():ymd(d); }
 function nowIso(){ return new Date().toISOString(); }

 /* ---------- data ---------- */
 function VL(){ if(!Array.isArray(db.accVehicles)) db.accVehicles=[]; return db.accVehicles; }
 function EL(){ if(!Array.isArray(db.accEntries)) db.accEntries=[]; return db.accEntries; }
 function vehicles(){ return VL().filter(function(v){ return !v.deleted; }); }
 function entries(){ return EL().filter(function(e){ return !e.deleted; }); }
 function vById(id){ return id?vehicles().filter(function(v){ return v.id===id; })[0]||null:null; }
 function eById(id){ return EL().filter(function(e){ return e.id===id; })[0]||null; }
 function S0(){ if(!db.settings) db.settings={}; return db.settings; }

 var IN_CATS=[
  ["Trip income","ട്രിപ്പ് വരുമാനം"],["Trip balance","ട്രിപ്പ് ബാലൻസ് വരവ്"],["Advance","അഡ്വാൻസ്"],["Tip","ടിപ്പ് (വാഹനത്തിന്)"],["Tip (driver)","ടിപ്പ് (ഡ്രൈവർക്ക്)"],["Commission received","കമ്മീഷൻ കിട്ടിയത്"],
  ["Partner margin","പാർട്ണർ മാർജിൻ"],["Other income","മറ്റ് വരവ്"]
 ];
 var OUT_CATS=[
  ["Fuel","ഇന്ധനം"],["Driver wages / bata","ഡ്രൈവർ കൂലി / ബത്ത"],["Driver tip","ഡ്രൈവർ ടിപ്പ്"],["Toll","ടോൾ"],["Parking","പാർക്കിംഗ്"],
  ["Service / Repair","സർവീസ് / റിപ്പയർ"],["Tyre","ടയർ"],["Insurance","ഇൻഷുറൻസ്"],["Permit / Tax","പെർമിറ്റ് / ടാക്സ്"],
  ["Fitness / PUC","ഫിറ്റ്നസ് / PUC"],["EMI","EMI"],["Washing","കഴുകൽ"],["Commission paid","കമ്മീഷൻ കൊടുത്തത്"],
  ["Mobile / Internet","മൊബൈൽ / ഇന്റർനെറ്റ്"],["Other","മറ്റുള്ളവ"]
 ];
 var CAT_ML={};
 IN_CATS.concat(OUT_CATS).forEach(function(c){ CAT_ML[c[0]]=c[1]; });
 function catLabel(c){ return CAT_ML[c]?B(c,CAT_ML[c]):String(c||""); }
 function customCats(type){ var s=S0(); if(!s.accCats) s.accCats={in:[],out:[]}; if(!Array.isArray(s.accCats[type])) s.accCats[type]=[]; return s.accCats[type]; }
 function catList(type){
  var base=(type==="in"?IN_CATS:OUT_CATS).map(function(c){ return c[0]; });
  return base.concat(customCats(type).filter(function(c){ return base.indexOf(c)<0; }));
 }
 var MODES=["Cash","UPI","Bank","Credit"];
 var PRE=null;   /* details carried into a new expense made from a trip's income entry */

 /* ---------- plan: Premium unlimited, others 60 days from the first opening ---------- */
 function premium(){ try{ return typeof tcBkEligible==="function"&&!!tcBkEligible(); }catch(e){ return false; } }
 function plan(){
  if(premium()) return {mode:"premium",left:0};
  var st=S0().accStart;
  if(!st) return {mode:"trial",left:TRIAL_DAYS};
  var used=Math.floor((Date.now()-new Date(st).getTime())/86400000);
  var left=TRIAL_DAYS-(isNaN(used)?0:used);
  return left>0?{mode:"trial",left:left}:{mode:"expired",left:0};
 }
 function canWrite(){ return plan().mode!=="expired"; }
 function locked(){
  modal('<h2>&#127942; '+E(B("Keep going with Premium","Premium ഉപയോഗിച്ച് തുടരൂ"))+'</h2>'+
   '<p>'+E(B("You are managing your business like a pro! Continue adding entries without limits with Premium.","നിങ്ങൾ ബിസിനസ് ഒരു പ്രൊഫഷണലിനെപ്പോലെ നടത്തുന്നു! പരിധിയില്ലാതെ കണക്കുകൾ ചേർക്കാൻ Premium എടുക്കൂ."))+'</p>'+
   '<p class="muted" style="font-size:13px">'+E(B("Your records stay safe - you can always view them and export them as CSV.","നിങ്ങളുടെ കണക്കുകൾ സുരക്ഷിതമാണ് - എപ്പോഴും കാണാനും CSV ആയി എടുക്കാനും കഴിയും."))+'</p>'+
   '<div class="actions"><button class="primary" onclick="tcAbPremium()">'+E(B("Get Premium","Premium എടുക്കൂ"))+'</button><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>');
 }
 window.tcAbPremium=function(){
  try{ closeModal(); }catch(e){}
  if(typeof window.tcUpOpenUpgrade==="function") window.tcUpOpenUpgrade();
  else if(typeof tcShowUpgradePrompt==="function") tcShowUpgradePrompt("Premium");
 };

 /* ---------- vehicle matching ---------- */
 function nv(s){ return String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
 function matchVehicle(no,name){
  var list=vehicles(), i;
  if(nv(no)){ for(i=0;i<list.length;i++){ if(nv(list[i].no)===nv(no)) return list[i]; } }
  var n=String(name||"").trim().toLowerCase();
  if(n){ for(i=0;i<list.length;i++){ if(String(list[i].name||"").trim().toLowerCase()===n) return list[i]; } }
  return null;
 }
 function vehLabel(e){
  var v=vById(e.vehId);
  if(v) return v.name+(v.no?" ("+v.no+")":"");
  return e.vehNo||e.vehName||"";
 }

 /* ---------- automatic entries from bills ---------- */
 function routeOf(t,q){
  var p=t.pickup||q.pickup||"", d=t.dest||((q.destinations&&q.destinations.length)?q.destinations.join(", "):q.destination)||"";
  return [p,d].filter(Boolean).join(" → ");
 }
 function migrateOld(){
  var s=S0();
  if(s.accMigExp) return;
  s.accMigExp=1;
  (db.expenses||[]).forEach(function(x){
   if(!x) return;
   EL().push({id:uid(),type:"out",date:x.date||todayIso(),amount:+x.amount||0,cat:"Other",note:x.desc||"",src:"old",vehId:"",created:nowIso()});
  });
  persist();
 }
 function syncAuto(){
  if(!S0().accStart||!canWrite()) return false;
  var list=EL(), by={}, seen={}, changed=false, quotes={}, tripOfQuote={};
  list.forEach(function(e){ if(e.key) by[e.key]=e; });
  (db.quotes||[]).forEach(function(q){ if(q&&q.id) quotes[q.id]=q; });
  (db.trips||[]).forEach(function(t){ if(t&&t.quoteId) tripOfQuote[t.quoteId]=t; });
  function add(key,o){
   seen[key]=1;
   var old=by[key];
   if(old){
    if(old.removedBySource&&old.deleted){ old.deleted=false; old.removedBySource=false; changed=true; }
    /* an unedited automatic entry follows its payment: first payment = Trip income, later ones = Trip balance */
    if(!old.edited&&o.cat&&old.cat!==o.cat&&(old.cat==="Trip income"||old.cat==="Trip balance")&&(o.cat==="Trip income"||o.cat==="Trip balance")){ old.cat=o.cat; changed=true; }
    return;
   }
   var v=matchVehicle(o.vehNo,o.vehName);
   var rec={id:uid(),key:key,src:"bill",created:nowIso(),vehId:v?v.id:""};
   for(var k in o) rec[k]=o[k];
   list.push(rec); by[key]=rec; changed=true;
  }
  (db.trips||[]).forEach(function(t){
   if(!t) return;
   var q=quotes[t.quoteId]||{};
   var seq=(t.payments||[]).filter(function(p){ return p&&+p.amount>0&&p.method!=="Discount"; }).sort(function(a,b){ return String(a.at).localeCompare(String(b.at)); });
   seq.forEach(function(p,pi){
    if(!p||!(+p.amount>0)||p.method==="Discount") return;
    var isAdv=!!(q.advanceReceived&&q.advanceReceivedAt&&p.at===q.advanceReceivedAt);
    var key=isAdv?"adv:"+q.id:"pay:"+t.id+":"+p.at+":"+p.amount;
    add(key,{type:"in",date:localDate(p.at),amount:+p.amount,cat:(isAdv||p.method==="Advance")?"Advance":(pi>0?"Trip balance":"Trip income"),
     mode:(p.method==="Cash"||p.method==="UPI"||p.method==="Bank")?p.method:"",customer:t.customer||q.customer||"",route:routeOf(t,q),tripId:t.id,
     vehNo:q.vehicleNo||"",vehName:q.vehicle||""});
   });
  });
  (db.quotes||[]).forEach(function(q){
   if(!q||!q.advanceReceived||!(+q.advanceAmount>0)) return;
   var t=tripOfQuote[q.id];
   if(t){
    if((t.payments||[]).some(function(p){ return p&&p.at===q.advanceReceivedAt; })) return;
    if(!(new Date(q.advanceReceivedAt)>new Date(t.created))) return;
   }
   add("adv:"+q.id,{type:"in",date:localDate(q.advanceReceivedAt||q.created),amount:+q.advanceAmount,cat:"Advance",
    mode:(q.advanceMethod==="Cash"||q.advanceMethod==="UPI")?q.advanceMethod:"",customer:q.customer||"",route:routeOf({},q),
    vehNo:q.vehicleNo||"",vehName:q.vehicle||""});
  });
  list.forEach(function(e){
   if(e.src!=="bill"||!e.key||e.deleted) return;
   if(!seen[e.key]){
    if(e.edited){ e.src="manual"; e.key=""; e.note=(e.note?e.note+" · ":"")+B("bill payment was removed","ബിൽ പേയ്മെന്റ് നീക്കം ചെയ്തു"); }
    else { e.deleted=true; e.removedBySource=true; }
    changed=true;
   } else if(!vById(e.vehId)&&(e.vehNo||e.vehName)){
    var v=matchVehicle(e.vehNo,e.vehName);
    if(v){ e.vehId=v.id; changed=true; }
   }
  });
  if(changed) persist();
  return changed;
 }

 /* ---------- numbers ---------- */
 function periodRange(p){
  var n=new Date(), y=n.getFullYear(), m=n.getMonth();
  if(p==="month") return [y+"-"+p2(m+1)+"-01",y+"-"+p2(m+1)+"-31"];
  if(p==="last"){ var d=new Date(y,m-1,1); return [d.getFullYear()+"-"+p2(d.getMonth()+1)+"-01",d.getFullYear()+"-"+p2(d.getMonth()+1)+"-31"]; }
  if(p==="year") return [y+"-01-01",y+"-12-31"];
  return ["0000-00-00","9999-99-99"];
 }
 var ST={period:"month",veh:"all",tab:"entries",limit:40};
 function filtered(){
  var r=periodRange(ST.period);
  return entries().filter(function(e){
   if(e.date<r[0]||e.date>r[1]) return false;
   if(ST.veh==="all") return true;
   if(ST.veh==="none") return !e.vehId||!vById(e.vehId);
   return e.vehId===ST.veh;
  }).sort(function(a,b){ return (a.date<b.date?1:a.date>b.date?-1:String(b.created).localeCompare(String(a.created))); });
 }
 /* a tip given to the driver is the driver's money: shown, but not counted in income / profit */
 function isDrv(e){ return e.type==="in"&&e.cat==="Tip (driver)"; }
 function drvOwed(){ return entries().filter(function(e){ return isDrv(e)&&!e.drvPaid; }).reduce(function(a,e){ return a+(+e.amount||0); },0); }
 function sums(list){
  var i=0,o=0,d=0;
  list.forEach(function(e){ if(isDrv(e)){ d+=(+e.amount||0); return; } if(e.type==="in") i+=(+e.amount||0); else o+=(+e.amount||0); });
  return {inc:i,out:o,net:i-o,drv:d};
 }
 function vstats(v){
  var es=entries().filter(function(e){ return e.vehId===v.id; }), inc=0, out=0, lit=0, litAmt=0, first=null;
  es.forEach(function(e){
   if(isDrv(e)) return;
   if(e.type==="in") inc+=(+e.amount||0); else out+=(+e.amount||0);
   if(!first||e.date<first) first=e.date;
   if(e.cat==="Fuel"&&+e.litres>0){ lit+=(+e.litres); litAmt+=(+e.amount||0); }
  });
  var invested=(+v.loan>0)?(+v.down||0):(+v.price||0);
  var net=inc-out, start=v.purchaseDate||first||todayIso();
  var months=Math.max(1,(Date.now()-new Date(start+"T00:00:00").getTime())/(86400000*30.44));
  var remaining=invested-net, avg=net/months, left=null;
  if(remaining>0&&avg>0){ left=Math.ceil(remaining/avg); if(left>360) left=null; }
  return {inc:inc,out:out,net:net,invested:invested,remaining:remaining,left:left,lit:lit,perL:lit>0?litAmt/lit:0,count:es.length};
 }
 /* money still to be received on bills (balance = final bill - payments) */
 function pending(){
  var out=[];
  (db.trips||[]).slice(0,400).forEach(function(t){
   try{
    if(!t||!(t.status==="completed"||t.billNo)) return;
    var q=(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]; if(!q) return;
    var c=db.categories[q.categoryId]; if(!c) return;
    var fin=billFinalAmount(t,q,c).final;
    var paid=(t.payments||[]).reduce(function(a,p){ return a+(+p.amount||0); },0);
    var bal=Math.round((fin-paid)*100)/100;
    if(bal>0.5) out.push({id:t.id,customer:t.customer||q.customer||"",bal:bal,due:t.dueDate||""});
   }catch(e){}
  });
  return out;
 }

 /* ---------- the page ---------- */
 var sel=function(id,opts,cur,onch){
  return '<select id="'+id+'"'+(onch?' onchange="'+onch+'"':'')+'>'+opts.map(function(o){ return '<option value="'+E(o[0])+'"'+(String(o[0])===String(cur)?' selected':'')+'>'+E(o[1])+'</option>'; }).join("")+'</select>';
 };
 function bannerHtml(){
  var p=plan();
  if(p.mode==="premium") return '<div style="background:#eef7ee;border:1px solid #9fcba3;border-radius:10px;padding:7px 10px;font-size:12px;color:#1c5b27;margin-bottom:10px">&#9989; '+E(B("Premium: unlimited entries, saved in your Cloud Backup.","Premium: പരിധിയില്ലാത്ത എൻട്രികൾ, ക്ലൗഡ് ബാക്കപ്പിൽ സൂക്ഷിക്കുന്നു."))+'</div>';
  if(p.mode==="trial") return '<div style="background:#fff8e8;border:1px solid #d2b478;border-radius:10px;padding:7px 10px;font-size:12px;color:#7a5a1e;margin-bottom:10px">&#127942; '+E(B("Premium trial: "+p.left+" days left - enjoy all features. Saved on this phone only (Premium keeps a Cloud Backup).","Premium പരീക്ഷണം: "+p.left+" ദിവസം ബാക്കി - എല്ലാ സൗകര്യങ്ങളും ആസ്വദിക്കൂ. ഈ ഫോണിൽ മാത്രം സൂക്ഷിക്കുന്നു (Premium-ൽ ക്ലൗഡ് ബാക്കപ്പ് ഉണ്ട്)."))+'</div>';
  return '<div style="background:#fff3e6;border:2px solid #e0a526;border-radius:12px;padding:10px;margin-bottom:10px;font-size:13px"><b>&#127942; '+E(B("You are managing your business like a pro!","നിങ്ങൾ ബിസിനസ് ഒരു പ്രൊഫഷണലിനെപ്പോലെ നടത്തുന്നു!"))+'</b><br>'+E(B("Continue without limits with Premium. Your records stay safe - view and export them any time.","പരിധിയില്ലാതെ തുടരാൻ Premium എടുക്കൂ. നിങ്ങളുടെ കണക്കുകൾ സുരക്ഷിതമാണ് - എപ്പോഴും കാണാനും എടുക്കാനും കഴിയും."))+'<div class="actions" style="margin-top:6px"><button class="primary" onclick="tcAbPremium()">'+E(B("Get Premium","Premium എടുക്കൂ"))+'</button></div></div>';
 }
 function entryRowHtml(e){
  var isIn=e.type==="in", col=isIn?"#1c6b2c":"#a12d2d";
  var sub=[tcFormatDate(e.date)];
  var vl=vehLabel(e); if(vl) sub.push(vl);
  if(e.customer) sub.push(e.customer);
  if(e.route) sub.push(e.route.length>70?e.route.slice(0,70)+"…":e.route);
  if(e.note) sub.push(e.note);
  if(isDrv(e)){
   if(e.driver) sub.splice(1,0,B("Driver: ","ഡ്രൈവർ: ")+e.driver);
   sub.push(e.drvPaid?B("✅ given to driver "+tcFormatDate(e.drvPaid),"✅ ഡ്രൈവർക്ക് കൊടുത്തു "+tcFormatDate(e.drvPaid)):B("🔴 to give to the driver","🔴 ഡ്രൈവർക്ക് കൊടുക്കാനുണ്ട്"));
  }
  var h='<div class="listitem" onclick="tcAbEdit(\''+e.id+'\')" style="cursor:pointer">'+
   '<div style="display:flex;justify-content:space-between;gap:8px"><b>'+E(catLabel(e.cat))+(e.src==="bill"?' <span class="muted" style="font-size:11px;font-weight:600">&#9889; '+E(B("from bill","ബില്ലിൽ നിന്ന്"))+'</span>':'')+'</b><b style="color:'+col+'">'+(isIn?"+":"-")+mny(e.amount)+'</b></div>'+
   '<div class="muted" style="font-size:12px">'+E(sub.join(" · "))+'</div>';
  var acts='';
  if(canWrite()) acts+='<button onclick="event.stopPropagation();tcAbEdit(\''+e.id+'\')" style="font-size:12px;padding:4px 10px">&#9998; '+E(B("Edit","തിരുത്തുക"))+'</button>';
  if(!vById(e.vehId)&&vehicles().length) acts+='<button onclick="event.stopPropagation();tcAbAssign(\''+e.id+'\')" style="font-size:12px;padding:4px 10px">'+E(B("Choose vehicle","വാഹനം തിരഞ്ഞെടുക്കുക"))+'</button>';
  if(e.type==="in"&&e.src==="bill") acts+='<button onclick="event.stopPropagation();tcAbTripExp(\''+e.id+'\')" style="font-size:12px;padding:4px 10px">- '+E(B("Expense of this trip","ഈ ട്രിപ്പിന്റെ ചെലവ്"))+'</button>';
  if(isDrv(e)&&canWrite()) acts+='<button onclick="event.stopPropagation();tcAbDrvPaid(\''+e.id+'\')" style="font-size:12px;padding:4px 10px">'+E(e.drvPaid?B("Undo 'given'","'കൊടുത്തു' റദ്ദാക്കുക"):B("Given to driver","ഡ്രൈവർക്ക് കൊടുത്തു"))+'</button>';
  if(e.type==="in"&&e.src==="bill") acts+='<button onclick="event.stopPropagation();tcAbTip(\''+e.id+'\')" style="font-size:12px;padding:4px 10px">&#127873; '+E(B("+ Tip","+ ടിപ്പ്"))+'</button>';
  if(acts) h+='<div class="actions" style="margin-top:4px">'+acts+'</div>';
  return h+'</div>';
 }
 function vehCardHtml(v){
  var s=vstats(v);
  var h='<div class="listitem" onclick="tcAbVeh(\''+v.id+'\')" style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px"><b>&#128663; '+E(v.name)+'</b><span class="muted">'+E(v.no||"")+'</span></div>'+
   '<div style="font-size:13px;margin-top:3px">'+E(B("Income","വരവ്"))+' <b style="color:#1c6b2c">'+mny(s.inc)+'</b> &middot; '+E(B("Expense","ചെലവ്"))+' <b style="color:#a12d2d">'+mny(s.out)+'</b></div>'+
   '<div style="font-size:13px">'+E(B("Profit from running","ഓട്ടത്തിലെ ലാഭം"))+' <b style="color:'+(s.net>=0?'#1c6b2c':'#a12d2d')+'">'+mny(s.net)+'</b></div>';
  if(s.invested>0){
   h+='<div class="muted" style="font-size:12px">'+(s.remaining>0?E(B("Still to recover: ","ഇനി തിരിച്ചുകിട്ടാനുള്ളത്: "))+mny(s.remaining)+(s.left?" ("+E(B("about "+s.left+" months","ഏകദേശം "+s.left+" മാസം"))+")":""):'&#9989; '+E(B("Investment recovered","മുടക്ക് തിരിച്ചുകിട്ടി")))+'</div>';
  }
  return h+'</div>';
 }
 function pageHtml(){
  var list=filtered(), t=sums(list), vs=vehicles();
  var vopts=[["all",B("All vehicles","എല്ലാ വാഹനങ്ങളും")]].concat(vs.map(function(v){ return [v.id,v.name+(v.no?" ("+v.no+")":"")]; }));
  if(entries().some(function(e){ return !vById(e.vehId); })) vopts.push(["none",B("No vehicle chosen","വാഹനം തിരഞ്ഞെടുത്തിട്ടില്ല")]);
  var popts=[["month",B("This month","ഈ മാസം")],["last",B("Last month","കഴിഞ്ഞ മാസം")],["year",B("This year","ഈ വർഷം")],["all",B("All time","എല്ലാ കാലവും")]];
  var h=bannerHtml();
  h+='<div class="grid"><div class="metric" onclick="tcAbDrill(\'in\')" style="cursor:pointer">'+E(B("Income","വരവ്"))+'<b style="color:#1c6b2c">'+mny(t.inc)+'</b></div><div class="metric" onclick="tcAbDrill(\'out\')" style="cursor:pointer">'+E(B("Expense","ചെലവ്"))+'<b style="color:#a12d2d">'+mny(t.out)+'</b></div><div class="metric" onclick="tcAbDrill(\'net\')" style="cursor:pointer">'+E(B("Profit","ലാഭം"))+'<b style="color:'+(t.net>=0?'#1c6b2c':'#a12d2d')+'">'+mny(t.net)+'</b></div></div>';
  h+='<div class="grid" style="margin-top:8px"><label>'+E(B("Period","കാലയളവ്"))+sel("abPeriod",popts,ST.period,"tcAbSet('period',this.value)")+'</label><label>'+E(B("Vehicle","വാഹനം"))+sel("abVehF",vopts,ST.veh,"tcAbSet('veh',this.value)")+'</label></div>';
  h+='<div class="muted" style="font-size:11.5px;margin-top:4px">&#128073; '+E(B("Tap Income, Expense or Profit to see where it came from, with dates.","വരവ്, ചെലവ്, ലാഭം എന്നിവയിൽ തൊട്ടാൽ എവിടെ നിന്നാണെന്ന് തീയതി സഹിതം കാണാം."))+'</div>';
  var owed=drvOwed();
  if(t.drv>0||owed>0) h+='<div class="muted" style="font-size:12px;margin-top:6px">&#127873; '+E(B("Driver tips (not counted in income): ","ഡ്രൈവർ ടിപ്പ് (വരവിൽ കൂട്ടിയിട്ടില്ല): "))+(t.drv>0?E(B("this period ","ഈ കാലയളവിൽ "))+'<b>'+mny(t.drv)+'</b> ':'')+(owed>0?'&middot; <b style="color:#b3261e">'+E(B("still to give the driver: ","ഡ്രൈവർക്ക് കൊടുക്കാനുള്ളത്: "))+mny(owed)+'</b>':'')+'</div>';
  var pend=pending();
  if(pend.length){
   var tot=pend.reduce(function(a,x){ return a+x.bal; },0);
   h+='<details'+(pend.length<=5?' open':'')+' style="margin:8px 0;border:1px solid #e3d3a5;border-radius:10px;padding:6px 10px;background:#fffaf0"><summary style="cursor:pointer;font-size:13px"><b>'+E(B("To receive on bills: ","ബില്ലുകളിൽ കിട്ടാനുള്ളത്: "))+mny(tot)+'</b> ('+pend.length+')</summary>'+
    pend.slice(0,30).map(function(x){ return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0;font-size:13px"><span>'+E(x.customer)+(x.due?' <span class="muted" style="font-size:11px">'+(x.due<todayIso()?'&#128308; ':'')+E(B("promised ","തരാമെന്ന് പറഞ്ഞത് ")+tcFormatDate(x.due))+'</span>':'')+'</span><span><b>'+mny(x.bal)+'</b> <button onclick="tcAbReceive(\''+x.id+'\')" style="font-size:12px;padding:3px 8px">&#10004; '+E(B("Received","കിട്ടി"))+'</button> <button onclick="tcAbOpenBill(\''+x.id+'\')" style="font-size:12px;padding:3px 8px">'+E(B("Bill","ബിൽ"))+'</button></span></div>'; }).join("")+'</details>';
  }
  h+='<div class="actions" style="margin-top:8px"><button class="primary" style="background:#1c6b2c;border-color:#1c6b2c" onclick="tcAbAdd(\'in\')">+ '+E(B("Income","വരവ്"))+'</button><button class="primary" style="background:#a12d2d;border-color:#a12d2d" onclick="tcAbAdd(\'out\')">- '+E(B("Expense","ചെലവ്"))+'</button><button onclick="tcAbTip()">&#127873; '+E(B("Tip","ടിപ്പ്"))+'</button><button onclick="tcAbCsv()">&#128190; CSV ('+E(popts.filter(function(o){ return o[0]===ST.period; })[0][1])+')</button></div>';
  var un=entries().filter(function(e){ return !vById(e.vehId); }).length;
  if(!vs.length&&un) h+='<div class="muted" style="font-size:12px;margin-top:6px">&#128663; '+E(B("Add your vehicles (Vehicle Book tab, or choose one when editing an entry) to see profit vehicle-wise.","വാഹനം തിരിച്ചുള്ള ലാഭം കാണാൻ നിങ്ങളുടെ വാഹനങ്ങൾ ചേർക്കൂ (വാഹന ബുക്ക് ടാബിൽ, അല്ലെങ്കിൽ എൻട്രി തിരുത്തുമ്പോൾ വാഹനം തിരഞ്ഞെടുത്ത്)."))+'</div>';
  if(vs.length&&un) h+='<div class="muted" style="font-size:12px;margin-top:6px">'+E(B(un+" entries have no vehicle chosen - tap 'Choose vehicle' on them.",un+" എൻട്രികൾക്ക് വാഹനം തിരഞ്ഞെടുത്തിട്ടില്ല - അവയിലെ 'വാഹനം തിരഞ്ഞെടുക്കുക' അമർത്തുക."))+'</div>';
  h+='<div class="actions" style="margin-top:10px"><button class="'+(ST.tab==="entries"?"primary":"")+'" onclick="tcAbSet(\'tab\',\'entries\')">'+E(B("Entries","എൻട്രികൾ"))+' ('+list.length+')</button><button class="'+(ST.tab==="veh"?"primary":"")+'" onclick="tcAbSet(\'tab\',\'veh\')">&#128663; '+E(B("Vehicle Book","വാഹന ബുക്ക്"))+' ('+vs.length+')</button></div>';
  if(ST.tab==="veh"){
   h+='<div class="actions"><button class="primary" onclick="tcAbVehForm(\'\')">+ '+E(B("Add vehicle","വാഹനം ചേർക്കുക"))+'</button>'+((db.vehicles||[]).length?'<button onclick="tcAbImportVeh()">'+E(B("Add from my vehicles","എന്റെ വാഹനങ്ങളിൽ നിന്ന് ചേർക്കുക"))+'</button>':'')+'</div>';
   h+=vs.map(vehCardHtml).join("")||'<p class="muted">'+E(B("No vehicle in the book yet. Add each vehicle with its purchase details - every income and expense of that vehicle is then counted under it.","വാഹന ബുക്കിൽ ഇതുവരെ വാഹനമില്ല. ഓരോ വാഹനവും വാങ്ങിയ വിവരങ്ങളോടെ ചേർക്കൂ - ആ വാഹനത്തിന്റെ എല്ലാ വരവും ചെലവും അതിന്റെ കീഴിൽ കണക്കാകും."))+'</p>';
  }else{
   if(list.length&&canWrite()) h+='<p class="muted" style="font-size:12px;margin:6px 0">'+E(B("Tap an entry or its Edit button to change or delete it.","എൻട്രിയിൽ അല്ലെങ്കിൽ അതിലെ 'തിരുത്തുക' ബട്ടണിൽ അമർത്തിയാൽ തിരുത്താം / ഇല്ലാതാക്കാം."))+'</p>';
   h+=list.slice(0,ST.limit).map(entryRowHtml).join("")||'<p class="muted">'+E(B("No entries for this selection. Payments you record in Billing appear here by themselves.","ഈ തിരഞ്ഞെടുപ്പിൽ എൻട്രികളില്ല. ബില്ലിംഗിൽ രേഖപ്പെടുത്തുന്ന പേയ്മെന്റുകൾ ഇവിടെ സ്വയം വരും."))+'</p>';
   if(list.length>ST.limit) h+='<div class="actions"><button onclick="tcAbMore()">'+E(B("Show more","കൂടുതൽ കാണിക്കുക"))+'</button></div>';
  }
  return h;
 }
 function renderBook(){
  var s=S0();
  if(!s.accStart){ s.accStart=nowIso(); persist(); }
  migrateOld();
  syncAuto();
  app().innerHTML=card(B("Trip & Accounts","ട്രിപ്പ് & അക്കൗണ്ട്സ്"),pageHtml());
 }
 window.accounts=function(){ try{ renderBook(); }catch(e){ app().innerHTML=card("Trip & Accounts","<p class='muted'>Could not open: "+E(e&&e.message)+"</p>"); } };
 window.tcAbSet=function(k,v){ ST[k]=v; if(k!=="tab"&&k!=="limit") ST.limit=40; renderBook(); };
 window.tcAbMore=function(){ ST.limit+=40; renderBook(); };
 /* money received later for a bill: added to the bill's own payments, so Billing and the book always agree */
 window.tcAbReceive=function(tripId){
  if(typeof window.tcBlRecv==="function"){ window.tcBlRecv(tripId); return; }   /* the shared 'Money received' screen (tc-bills.js) */
  var row=pending().filter(function(x){ return x.id===tripId; })[0]; if(!row) return;
  if(!canWrite()){ locked(); return; }
  modal('<h2>'+E(B("Money received","പണം കിട്ടി"))+'</h2><p class="muted" style="font-size:13px">'+E(row.customer)+' &middot; '+E(B("Balance due","ബാക്കി"))+' <b>'+mny(row.bal)+'</b></p>'+
   '<div class="grid"><label>'+E(B("Amount received","കിട്ടിയ തുക"))+'<input id="abRecAmt" type="number" inputmode="decimal" min="0" value="'+row.bal+'"></label>'+
   '<label>'+E(B("Paid by","പേയ്മെന്റ് രീതി"))+sel("abRecMode",[["UPI","UPI"],["Cash","Cash"],["Other","Other"]],"UPI")+'</label></div>'+
   '<p class="muted" style="font-size:12px">'+E(B("This is also recorded as a payment on the bill.","ഇത് ബില്ലിലും പേയ്മെന്റായി രേഖപ്പെടുത്തും."))+'</p>'+
   '<div class="actions"><button class="primary" onclick="tcAbReceiveSave(\''+tripId+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>');
 };
 window.tcAbReceiveSave=function(tripId){
  var row=pending().filter(function(x){ return x.id===tripId; })[0];
  var t=(db.trips||[]).filter(function(x){ return x.id===tripId; })[0];
  var amt=parseFloat(val("abRecAmt"));
  if(!row||!t) return;
  if(!(amt>0)){ say(B("Enter the amount","തുക നൽകുക")); return; }
  if(amt>row.bal+0.5){ say(B("More than the balance due ("+mny(row.bal)+")","ബാക്കി തുകയേക്കാൾ കൂടുതൽ ("+mny(row.bal)+")")); return; }
  t.payments=t.payments||[];
  t.payments.push({amount:amt,method:val("abRecMode")||"UPI",at:nowIso()});
  persist(); syncAuto(); closeModal(); say(B("Saved - added to the bill and the book","സേവ് ചെയ്തു - ബില്ലിലും ബുക്കിലും ചേർത്തു")); renderBook();
 };
window.tcAbRefresh=function(){ try{ if($("abPeriod")) renderBook(); }catch(e){} };
 /* a tip made while marking money received on a bill (called from tc-bills.js); false when the book is not writable */
 window.tcAbAddTip=function(o){
  if(!canWrite()||!o||!(+o.amount>0)) return false;
  var t=(db.trips||[]).filter(function(x){ return x.id===o.tripId; })[0]; if(!t) return false;
  var q=(db.quotes||[]).filter(function(x){ return x.id===t.quoteId; })[0]||{};
  var v=matchVehicle(q.vehicleNo,q.vehicle);
  EL().push({id:uid(),type:"in",src:"manual",created:nowIso(),date:o.date||todayIso(),amount:Math.round(+o.amount*100)/100,cat:o.forDriver?"Tip (driver)":"Tip",
   vehId:v?v.id:"",vehNo:q.vehicleNo||"",vehName:q.vehicle||"",mode:o.mode||"",note:o.note||"",customer:t.customer||q.customer||"",route:routeOf(t,q),tripId:t.id,driver:t.driverName||""});
  persist(); return true;
 };
 window.tcAbDrvPaid=function(id){
  var e=eById(id); if(!e) return;
  if(!canWrite()){ locked(); return; }
  if(e.drvPaid){ if(!confirm(B("Mark this tip as NOT given to the driver yet?","ഈ ടിപ്പ് ഡ്രൈവർക്ക് ഇതുവരെ കൊടുത്തിട്ടില്ല എന്ന് മാറ്റട്ടേ?"))) return; e.drvPaid=""; }
  else e.drvPaid=todayIso();
  persist(); renderBook();
 };
 window.tcAbOpenBill=function(tripId){
  view("billing");
  setTimeout(function(){ var bt=document.querySelector("#billTrip"); if(bt){ bt.value=tripId; try{ loadBill(); }catch(e){} } },0);
 };


 /* ---------- tap Income / Expense / Profit: where it came from, with dates ---------- */
 function drvShort(r){ r=String(r||""); return r.length>40?r.slice(0,40)+"…":r; }
 function groupsOf(list){
  var m={}, a=[];
  list.forEach(function(e){ var g=m[e.cat]; if(!g){ g=m[e.cat]={cat:e.cat,sum:0,items:[]}; a.push(g); } g.sum+=(+e.amount||0); g.items.push(e); });
  return a.sort(function(x,y){ return y.sum-x.sum; });
 }
 function drillGroupsHtml(groups,total,col){
  if(!groups.length) return '<p class="muted" style="font-size:13px">'+E(B("Nothing in this period.","ഈ കാലയളവിൽ ഒന്നുമില്ല."))+'</p>';
  return groups.map(function(g){
   var rows=g.items.slice().sort(function(a,b){ return a.date<b.date?1:a.date>b.date?-1:0; }).map(function(e){
    var who=[e.customer,vehLabel(e),drvShort(e.route)].filter(Boolean).join(" · ");
    return '<div onclick="closeModal();tcAbEdit(\''+e.id+'\')" style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #eee;font-size:12.5px;cursor:pointer"><span><b>'+E(tcFormatDate(e.date))+'</b>'+(who?' &middot; '+E(who):'')+(e.mode?' &middot; '+E(e.mode):'')+(e.note?'<br><span class="muted">'+E(e.note)+'</span>':'')+'</span><b style="color:'+col+';white-space:nowrap">'+mny(e.amount)+'</b></div>';
   }).join("");
   return '<details style="border:1px solid #e1e1e1;border-radius:10px;padding:6px 10px;margin:6px 0"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:8px;font-size:14px"><span><b>'+E(catLabel(g.cat))+'</b> <span class="muted">('+g.items.length+')</span></span><span><b style="color:'+col+'">'+mny(g.sum)+'</b> <span class="muted" style="font-size:12px">'+(total>0?Math.round(g.sum*100/total):0)+'%</span></span></summary>'+rows+'</details>';
  }).join("");
 }
 window.tcAbDrill=function(kind){
  var list=filtered().filter(function(e){ return !isDrv(e); });
  var ins=list.filter(function(e){ return e.type==="in"; }), outs=list.filter(function(e){ return e.type!=="in"; });
  var ti=sums(list), perLabel=({month:B("This month","ഈ മാസം"),last:B("Last month","കഴിഞ്ഞ മാസം"),year:B("This year","ഈ വർഷം"),all:B("All time","എല്ലാ കാലവും")})[ST.period];
  var head=function(t){ return '<h2>'+t+'</h2><p class="muted" style="font-size:12px;margin:0 0 6px">'+E(perLabel)+(ST.veh!=="all"?' &middot; '+E(ST.veh==="none"?B("No vehicle chosen","വാഹനം തിരഞ്ഞെടുത്തിട്ടില്ല"):(vById(ST.veh)?vById(ST.veh).name:"")):'')+' &middot; '+E(B("Tap a line to edit it.","ഒരു വരിയിൽ തൊട്ടാൽ തിരുത്താം."))+'</p>'; };
  var h;
  if(kind==="in") h=head(E(B("Income","വരവ്"))+': <span style="color:#1c6b2c">'+mny(ti.inc)+'</span>')+drillGroupsHtml(groupsOf(ins),ti.inc,"#1c6b2c");
  else if(kind==="out") h=head(E(B("Expense","ചെലവ്"))+': <span style="color:#a12d2d">'+mny(ti.out)+'</span>')+drillGroupsHtml(groupsOf(outs),ti.out,"#a12d2d");
  else{
   h=head(E(B("Profit","ലാഭം"))+': <span style="color:'+(ti.net>=0?'#1c6b2c':'#a12d2d')+'">'+mny(ti.net)+'</span>')+
    '<h3 style="margin:8px 0 2px;font-size:15px">'+E(B("Income","വരവ്"))+' '+mny(ti.inc)+'</h3>'+drillGroupsHtml(groupsOf(ins),ti.inc,"#1c6b2c")+
    '<h3 style="margin:10px 0 2px;font-size:15px">'+E(B("Expense","ചെലവ്"))+' '+mny(ti.out)+'</h3>'+drillGroupsHtml(groupsOf(outs),ti.out,"#a12d2d")+
    '<div style="margin-top:10px;font-size:15px"><b>'+E(B("Profit","ലാഭം"))+' = '+mny(ti.inc)+' - '+mny(ti.out)+' = <span style="color:'+(ti.net>=0?'#1c6b2c':'#a12d2d')+'">'+mny(ti.net)+'</span></b></div>';
   if(ST.veh==="all"&&vehicles().length>1){
    h+='<h3 style="margin:10px 0 2px;font-size:15px">'+E(B("By vehicle","വാഹനം തിരിച്ച്"))+'</h3>'+vehicles().map(function(v){
     var s2=sums(list.filter(function(e){ return e.vehId===v.id; }));
     return '<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span>'+E(v.name+(v.no?" ("+v.no+")":""))+'</span><b style="color:'+(s2.net>=0?'#1c6b2c':'#a12d2d')+'">'+mny(s2.net)+'</b></div>';
    }).join("");
   }
   var pd=pending(); if(pd.length) h+='<p class="muted" style="font-size:12px;margin-top:8px">'+E(B("Not counted yet: still to receive on bills ","ഇതിൽ കൂട്ടിയിട്ടില്ല: ബില്ലുകളിൽ കിട്ടാനുള്ളത് "))+'<b>'+mny(pd.reduce(function(a,x){ return a+x.bal; },0))+'</b></p>';
  }
  modal(h+'<div class="actions"><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>');
 };

 /* ---------- add / edit an entry ---------- */
 function catSelectHtml(type,cur){
  var opts=catList(type).map(function(c){ return [c,catLabel(c)]; });
  if(cur&&catList(type).indexOf(cur)<0) opts.push([cur,cur]);
  opts.push(["__new__","+ "+B("New category","പുതിയ വിഭാഗം")]);
  return sel("abCat",opts,cur||opts[0][0],"tcAbCatChange('"+type+"')");
 }
/* a typed "new category" that is really a note (e.g. "left tyre air filling at mobile") is matched to the closest existing category */
 var CAT_RULES={
  out:[[/tyre|tire|puncture|air fill|nitrogen|ടയർ/i,"Tyre"],[/fuel|diesel|petrol|ഡീസൽ|ഇന്ധനം/i,"Fuel"],[/toll|ടോൾ/i,"Toll"],[/parking|പാർക്കിംഗ്/i,"Parking"],
   [/puc|pollution|fitness|ഫിറ്റ്നസ്/i,"Fitness / PUC"],[/insur|ഇൻഷുറൻസ്/i,"Insurance"],[/permit|tax|പെർമിറ്റ്/i,"Permit / Tax"],[/\bemi\b|loan/i,"EMI"],
   [/service|repair|garage|workshop|oil|സർവീസ്|റിപ്പയർ/i,"Service / Repair"],[/wash|കഴുക/i,"Washing"],[/bata|wage|salary|ബത്ത|കൂലി/i,"Driver wages / bata"],
   [/recharge|internet|mobile bill/i,"Mobile / Internet"],[/commission|കമ്മീഷൻ/i,"Commission paid"]],
  in:[[/tip|ടിപ്പ്/i,"Tip"],[/advance|അഡ്വാൻസ്/i,"Advance"],[/commission|കമ്മീഷൻ/i,"Commission received"],[/trip|ട്രിപ്പ്/i,"Trip income"]]
 };
 function catGuess(type,text){
  var low=text.toLowerCase(), list=catList(type), i;
  for(i=0;i<list.length;i++){ if(list[i].toLowerCase()===low||catLabel(list[i]).toLowerCase()===low) return {cat:list[i],note:""}; }
  var rules=CAT_RULES[type]||[];
  for(i=0;i<rules.length;i++){
   if(rules[i][0].test(text)&&list.indexOf(rules[i][1])>=0){
    var c=rules[i][1];
    if(confirm(B('"'+text+'" looks like the category "'+c+'". OK = use "'+c+'" (your words go into the Note). Cancel = make it a new category.','"'+text+'" എന്നത് "'+catLabel(c)+'" വിഭാഗമാണോ? OK = "'+catLabel(c)+'" ഉപയോഗിക്കും (നിങ്ങൾ എഴുതിയത് കുറിപ്പിൽ വരും). Cancel = പുതിയ വിഭാഗമായി ചേർക്കും.')))
     return {cat:c,note:text};
    return null;
   }
  }
  if(text.length>24){
   var o=type==="in"?"Other income":"Other";
   if(confirm(B('That looks like a note, not a category name. OK = category "'+o+'" and your words in the Note. Cancel = keep it as a new category.','ഇത് വിഭാഗത്തിന്റെ പേരിനേക്കാൾ ഒരു കുറിപ്പാണെന്ന് തോന്നുന്നു. OK = വിഭാഗം "'+catLabel(o)+'", നിങ്ങൾ എഴുതിയത് കുറിപ്പിൽ. Cancel = പുതിയ വിഭാഗമായി നിലനിർത്തും.'))) return {cat:o,note:text};
  }
  return null;
 }
 window.tcAbCatChange=function(type){
  var s=$("abCat"); if(!s) return;
  if(s.value==="__new__"){
   var n=(prompt(B("Name of the new category","പുതിയ വിഭാഗത്തിന്റെ പേര്"))||"").trim().slice(0,100), noteAdd="";
   if(n){ var gs=catGuess(type,n); if(gs){ n=gs.cat; noteAdd=gs.note; } }
   n=n.slice(0,40);
   if(n){ var l=customCats(type); if(l.indexOf(n)<0&&catList(type).indexOf(n)<0){ l.push(n); persist(); } }
   var cur=n||catList(type)[0];
   var host=s.parentNode; if(host){ host.innerHTML=E(B("Category","വിഭാഗം"))+catSelectHtml(type,cur); }
   if(noteAdd){ var nt=$("abNote"); if(nt&&!nt.value) nt.value=noteAdd; }
  }
  litToggle();
 };
 function litToggle(){
  var s=$("abCat"), r=$("abLitRow"); if(r&&s) r.style.display=(s.value==="Fuel")?"":"none";
 }
 /* vehicles to offer: the book's own, plus the ones seen in bills / in "my vehicles" that are not in the book yet
    (choosing one of those adds it to the book when the entry is saved) */
 var SUG=[];
 function suggestions(){
  var out=[], seen={};
  function add(no,name){
   name=String(name||"").trim(); no=String(no||"").trim();
   if(!name&&!no) return;
   if(matchVehicle(no,name)) return;
   var k=nv(no)||name.toLowerCase(); if(seen[k]) return; seen[k]=1;
   out.push({name:name||no,no:no.toUpperCase()});
  }
  (db.vehicles||[]).forEach(function(x){ if(x) add(x.no,x.name); });
  entries().forEach(function(e){ if(!vById(e.vehId)) add(e.vehNo,e.vehName); });
  return out.slice(0,12);
 }
 function vehSelectHtml(cur){
  SUG=suggestions();
  var opts=[["",B("- not chosen -","- തിരഞ്ഞെടുത്തിട്ടില്ല -")]].concat(vehicles().map(function(v){ return [v.id,v.name+(v.no?" ("+v.no+")":"")]; }));
  SUG.forEach(function(x,i){ opts.push(["sug:"+i,"+ "+x.name+(x.no?" ("+x.no+")":"")+" - "+B("add to book","ബുക്കിൽ ചേർക്കുക")]); });
  opts.push(["__new__","+ "+B("New vehicle (type name / number)","പുതിയ വാഹനം (പേര് / നമ്പർ ടൈപ്പ് ചെയ്യുക)")]);
  return sel("abVeh",opts,cur||"","tcAbVehChange()");
 }
 window.tcAbVehChange=function(){
  var s=$("abVeh"); if(!s||s.value!=="__new__") return;
  var nm=(prompt(B("Vehicle name (e.g. Innova Crysta)","വാഹനത്തിന്റെ പേര് (ഉദാ: Innova Crysta)"))||"").trim().slice(0,40);
  var no=(prompt(B("Vehicle number (e.g. KL 18 X 1234)","വാഹന നമ്പർ (ഉദാ: KL 18 X 1234)"))||"").trim().slice(0,20);
  var id="";
  if(nm||no){
   var ex=matchVehicle(no,nm);
   if(ex) id=ex.id; else { id=uid(); VL().push({id:id,name:nm||no,no:no.toUpperCase(),purchaseDate:"",price:"",down:"",loan:"",emi:"",emiDay:"",loanEnd:"",note:"",created:nowIso()}); persist(); }
  }
  var host=s.parentNode; if(host) host.innerHTML=E(B("Vehicle","വാഹനം"))+vehSelectHtml(id);
 };
 /* the chosen vehicle's id; a suggested vehicle is added to the book now */
 function vehVal(){
  var v=val("abVeh");
  if(v==="__new__") return "";
  if(v.indexOf("sug:")===0){
   var x=SUG[+v.slice(4)]; if(!x) return "";
   var ex=matchVehicle(x.no,x.name); if(ex) return ex.id;
   var id=uid(); VL().push({id:id,name:x.name,no:x.no,purchaseDate:"",price:"",down:"",loan:"",emi:"",emiDay:"",loanEnd:"",note:"",created:nowIso()});
   return id;
  }
  return v;
 }
 function entryForm(e,type,vehId){
  var isNew=!e, t=e?e.type:type, cur=e?e.cat:((PRE&&PRE.cat)||catList(t)[0]);
  var h='<h2>'+(isNew?(t==="in"?E(B("Add income","വരവ് ചേർക്കുക")):E(B("Add expense","ചെലവ് ചേർക്കുക"))):E(B("Edit entry","എൻട്രി തിരുത്തുക")))+'</h2>';
  if(e&&e.src==="bill") h+='<p class="muted" style="font-size:12px">&#9889; '+E(B("Made automatically from a bill. You can still change it.","ബില്ലിൽ നിന്ന് സ്വയം ഉണ്ടായത്. നിങ്ങൾക്ക് തിരുത്താം."))+'</p>';
  var info=e?e:(PRE||null);
  if(info&&(info.customer||info.route)) h+='<p class="muted" style="font-size:12.5px">'+(isNew?E(B("Expense of the trip: ","ട്രിപ്പിന്റെ ചെലവ്: ")):'')+E([info.customer,info.route].filter(Boolean).join(" · "))+'</p>';
  h+='<div class="grid">'+
   '<label>'+E(B("Date","തീയതി"))+tcDateInputHtml("abDate",e?e.date:((PRE&&PRE.date)||todayIso()))+'</label>'+
   '<label>'+E(B("Amount","തുക"))+'<input id="abAmt" type="number" inputmode="decimal" min="0" value="'+E(e?e.amount:"")+'"></label>'+
   '<label>'+E(B("Category","വിഭാഗം"))+catSelectHtml(t,cur)+'</label>'+
   '<label>'+E(B("Vehicle","വാഹനം"))+vehSelectHtml(e?(vById(e.vehId)?e.vehId:((matchVehicle(e.vehNo,e.vehName)||{}).id||"")):(vehId||(ST.veh!=="all"&&ST.veh!=="none"?ST.veh:(vehicles().length===1?vehicles()[0].id:""))))+'</label>'+
   '<label>'+E(B("Paid by","പേയ്മെന്റ് രീതി"))+sel("abMode",[["",B("- not noted -","- രേഖപ്പെടുത്തിയിട്ടില്ല -")]].concat(MODES.map(function(m){ return [m,m]; })),e?e.mode:"")+'</label>'+
   '<label id="abLitRow" style="display:'+(cur==="Fuel"?"":"none")+'">'+E(B("Fuel litres (optional)","ഇന്ധനം ലിറ്റർ (ഓപ്ഷണൽ)"))+'<input id="abLit" type="number" inputmode="decimal" min="0" value="'+E(e&&e.litres?e.litres:"")+'"></label>'+
   '<label>'+E(B("Note","കുറിപ്പ്"))+'<input id="abNote" value="'+E(e?e.note:"")+'"></label></div>'+
   '<div class="actions"><button class="primary" onclick="tcAbSave(\''+(e?e.id:"")+'\',\''+t+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button>'+(e&&e.type==="in"&&e.src==="bill"?'<button onclick="tcAbTripExp(\''+e.id+'\')">- '+E(B("Expense of this trip","ഈ ട്രിപ്പിന്റെ ചെലവ്"))+'</button>':'')+(e?'<button class="danger" onclick="tcAbDel(\''+e.id+'\')">'+E(B("Delete","ഇല്ലാതാക്കുക"))+'</button>':'')+'<button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>';
  modal(h);
 }
 window.tcAbAdd=function(type,vehId){ if(!canWrite()){ locked(); return; } PRE=null; entryForm(null,type,vehId); };
 window.tcAbTripExp=function(id){
  var e=eById(id); if(!e) return;
  if(!canWrite()){ locked(); return; }
  PRE={customer:e.customer||"",route:e.route||"",tripId:e.tripId||"",date:e.date,cat:"Fuel"};
  entryForm(null,"out",e.vehId||"-");   /* "-" = the trip's vehicle is not chosen: leave it empty (do not guess) */
 };

 /* ---------- tip: extra money a customer gives for the vehicle (owner's income) or for the driver ---------- */
 var TIPSRC=null;
 window.tcAbTip=function(fromId){
  if(!canWrite()){ locked(); return; }
  var e=fromId?eById(fromId):null;
  TIPSRC=e?{amt:+e.amount||0,driver:((db.trips||[]).filter(function(x){ return x.id===e.tripId; })[0]||{}).driverName||"",customer:e.customer||"",route:e.route||"",tripId:e.tripId||"",date:e.date,vehId:e.vehId||"",vehNo:e.vehNo||"",vehName:e.vehName||""}:null;
  var vid=e?e.vehId:(ST.veh!=="all"&&ST.veh!=="none"?ST.veh:(vehicles().length===1?vehicles()[0].id:""));
  modal('<h2>&#127873; '+E(B("Tip received","ടിപ്പ് കിട്ടി"))+'</h2>'+
   (e?'<p class="muted" style="font-size:12.5px">'+E([e.customer,e.route&&e.route.length>70?e.route.slice(0,70)+"…":e.route].filter(Boolean).join(" · "))+'</p>':'')+
   '<p class="muted" style="font-size:12px">'+E(B("Extra money the customer gave over the bill. It is NOT added to the bill.","ബില്ലിനേക്കാൾ കൂടുതലായി കസ്റ്റമർ തന്ന പണം. ഇത് ബില്ലിൽ ചേർക്കില്ല."))+'</p>'+
   '<div class="grid">'+
   '<label>'+E(B("Date","തീയതി"))+tcDateInputHtml("abTipDate",e?e.date:todayIso())+'</label>'+
   '<label>'+E(B("Tip amount - only the EXTRA money (e.g. 200)","ടിപ്പ് തുക - കൂടുതൽ തന്ന തുക മാത്രം (ഉദാ: 200)"))+'<input id="abTipAmt" type="number" inputmode="decimal" min="0"></label>'+
   '<label>'+E(B("Tip is for","ടിപ്പ് ആർക്ക്"))+sel("abTipFor",[["veh",B("The vehicle (my income)","വാഹനത്തിന് (എന്റെ വരവ്)")],["drv",B("The driver (his money)","ഡ്രൈവർക്ക് (ഡ്രൈവറുടെ പണം)")]],"veh")+'</label>'+
   '<label>'+E(B("Vehicle","വാഹനം"))+vehSelectHtml(vid||"")+'</label>'+
   '<label>'+E(B("Received by","എങ്ങനെ കിട്ടി"))+sel("abMode",[["",B("- not noted -","- രേഖപ്പെടുത്തിയിട്ടില്ല -")]].concat(MODES.map(function(m){ return [m,m]; })),"")+'</label>'+
   '<label>'+E(B("Note","കുറിപ്പ്"))+'<input id="abNote"></label></div>'+
   '<p class="muted" style="font-size:12px">'+E(B("Driver tips are shown separately and are not counted in your income or profit.","ഡ്രൈവർക്കുള്ള ടിപ്പ് പ്രത്യേകം കാണിക്കും; നിങ്ങളുടെ വരവിലോ ലാഭത്തിലോ കൂട്ടില്ല."))+'</p>'+
   '<div class="actions"><button class="primary" onclick="tcAbTipSave()">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>');
 };
 window.tcAbTipSave=function(){
  if(!canWrite()){ locked(); return; }
  var amt=parseFloat(val("abTipAmt"));
  if(!(amt>0)){ say(B("Enter the tip amount","ടിപ്പ് തുക നൽകുക")); return; }
  var d=tcReadDateInput("abTipDate");
  if(d===null){ say(B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക")); return; }
  if(!d) d=todayIso();
  if(TIPSRC&&TIPSRC.amt>0&&amt>=TIPSRC.amt){
   if(!confirm(B("This tip ("+mny(amt)+") is as big as the trip payment ("+mny(TIPSRC.amt)+"). The trip payment is already in the book - enter ONLY the extra money given over the bill. Save anyway?","ഈ ടിപ്പ് ("+mny(amt)+") ട്രിപ്പ് തുകയ്ക്ക് ("+mny(TIPSRC.amt)+") തുല്യമോ കൂടുതലോ ആണ്. ട്രിപ്പ് തുക ബുക്കിൽ ഇതിനകം ഉണ്ട് - ബില്ലിന് പുറമെ കൂടുതൽ തന്ന തുക മാത്രം നൽകുക. എന്നാലും സേവ് ചെയ്യട്ടേ?"))) return;
  }
  var o={id:uid(),type:"in",src:"manual",created:nowIso(),date:d,amount:Math.round(amt*100)/100,cat:val("abTipFor")==="drv"?"Tip (driver)":"Tip",
   vehId:vehVal(),mode:val("abMode"),note:val("abNote")};
  if(TIPSRC){ o.customer=TIPSRC.customer; o.route=TIPSRC.route; o.tripId=TIPSRC.tripId; if(TIPSRC.driver) o.driver=TIPSRC.driver; if(!o.vehId){ o.vehNo=TIPSRC.vehNo; o.vehName=TIPSRC.vehName; } }
  EL().push(o); TIPSRC=null; persist(); closeModal(); say(B("Tip saved","ടിപ്പ് സേവ് ചെയ്തു")); renderBook();
 };
 window.tcAbEdit=function(id){
  var e=eById(id); if(!e) return;
  if(!canWrite()){ locked(); return; }
  entryForm(e,e.type);
 };
 window.tcAbSave=function(id,type){
  if(!canWrite()){ locked(); return; }
  var amt=parseFloat(val("abAmt"));
  if(!(amt>0)){ say(B("Enter the amount","തുക നൽകുക")); return; }
  var d=tcReadDateInput("abDate");
  if(d===null){ say(B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക")); return; }
  if(!d) d=todayIso();
  var cat=val("abCat"); if(!cat||cat==="__new__") cat=catList(type)[0];
  var lit=parseFloat(val("abLit"));
  var o={date:d,amount:Math.round(amt*100)/100,cat:cat,vehId:vehVal()||((id&&eById(id)&&matchVehicle(eById(id).vehNo,eById(id).vehName))||{}).id||"",mode:val("abMode"),note:val("abNote"),litres:(cat==="Fuel"&&lit>0)?lit:""};
  var e=id?eById(id):null, others=0, key="";
  if(e){
   key=e.vehNo||e.vehName||"";
   var changedVeh=o.vehId&&o.vehId!==e.vehId;
   for(var k in o) e[k]=o[k];
   if(e.src==="bill"||e.key) e.edited=true;
   if(changedVeh&&key){
    others=entries().filter(function(x){ return x.id!==e.id&&!x.vehId&&(x.vehNo||x.vehName)===key; }).length;
    if(others&&confirm(B("Use this vehicle for the other "+others+" entries with the same vehicle name too?","ഇതേ വാഹനപ്പേരുള്ള മറ്റ് "+others+" എൻട്രികൾക്കും ഈ വാഹനം നൽകട്ടേ?"))){
     entries().forEach(function(x){ if(x.id!==e.id&&!x.vehId&&(x.vehNo||x.vehName)===key) x.vehId=o.vehId; });
    }
   }
  }else{
   o.id=uid(); o.type=type; o.src="manual"; o.created=nowIso();
   if(PRE){ o.customer=PRE.customer; o.route=PRE.route; o.tripId=PRE.tripId; }
   EL().push(o);
  }
  PRE=null; persist(); closeModal(); say(B("Saved","സേവ് ചെയ്തു")); renderBook();
 };
 window.tcAbDel=function(id){
  var e=eById(id); if(!e) return;
  if(!canWrite()){ locked(); return; }
  if(!confirm(B("Delete this entry?","ഈ എൻട്രി ഇല്ലാതാക്കട്ടേ?")+(e.src==="bill"?"\n"+B("(The payment stays in the bill - only this book entry is removed.)","(പേയ്മെന്റ് ബില്ലിൽ തന്നെ ഉണ്ടാകും - ഈ ബുക്ക് എൻട്രി മാത്രം നീക്കുന്നു.)"):""))) return;
  e.deleted=true; e.edited=true; persist(); closeModal(); renderBook();
 };
 window.tcAbAssign=function(id){
  var e=eById(id); if(!e) return;
  if(!canWrite()){ locked(); return; }
  var h='<h2>'+E(B("Choose vehicle","വാഹനം തിരഞ്ഞെടുക്കുക"))+'</h2><p class="muted" style="font-size:12.5px">'+E(vehLabel(e)||[e.customer,e.route].filter(Boolean).join(" · "))+'</p>'+
   '<label>'+E(B("Vehicle","വാഹനം"))+vehSelectHtml("")+'</label>'+
   '<div class="actions"><button class="primary" onclick="tcAbAssignSave(\''+id+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>';
  modal(h);
 };
 window.tcAbAssignSave=function(id){
  var e=eById(id), v=vehVal(); if(!e||!v){ say(B("Choose a vehicle","വാഹനം തിരഞ്ഞെടുക്കുക")); return; }
  var key=e.vehNo||e.vehName||"";
  e.vehId=v; if(e.src==="bill") e.edited=true;
  var others=key?entries().filter(function(x){ return x.id!==e.id&&!x.vehId&&(x.vehNo||x.vehName)===key; }):[];
  if(others.length&&confirm(B("Use this vehicle for the other "+others.length+" entries with the same vehicle name too?","ഇതേ വാഹനപ്പേരുള്ള മറ്റ് "+others.length+" എൻട്രികൾക്കും ഈ വാഹനം നൽകട്ടേ?"))) others.forEach(function(x){ x.vehId=v; });
  persist(); closeModal(); renderBook();
 };

 /* ---------- vehicle book ---------- */
 function vf(id,label,type,v,extra){ return '<label>'+E(label)+'<input id="'+id+'" type="'+(type||"text")+'" '+(type==="number"?'inputmode="decimal" min="0" ':'')+'value="'+E(v==null?"":v)+'"'+(extra||"")+'></label>'; }
 window.tcAbVehForm=function(id){
  if(!canWrite()){ locked(); return; }
  var v=id?vById(id):null;
  var h='<h2>'+E(v?B("Edit vehicle","വാഹനം തിരുത്തുക"):B("Add vehicle","വാഹനം ചേർക്കുക"))+'</h2><div class="grid">'+
   vf("avName",B("Vehicle name","വാഹനത്തിന്റെ പേര്"),"text",v&&v.name)+
   vf("avNo",B("Registration number","രജിസ്ട്രേഷൻ നമ്പർ"),"text",v&&v.no)+
   '<label>'+E(B("Purchase date","വാങ്ങിയ തീയതി"))+tcDateInputHtml("avDate",v&&v.purchaseDate||"")+'</label>'+
   vf("avPrice",B("Purchase price","വാങ്ങിയ വില"),"number",v&&v.price)+
   vf("avDown",B("Down payment (if loan)","ഡൗൺ പേയ്മെന്റ് (ലോൺ ഉണ്ടെങ്കിൽ)"),"number",v&&v.down)+
   vf("avLoan",B("Loan amount","ലോൺ തുക"),"number",v&&v.loan)+
   vf("avEmi",B("EMI amount","EMI തുക"),"number",v&&v.emi)+
   vf("avEmiDay",B("EMI day of month","EMI തീയതി (മാസത്തിൽ)"),"number",v&&v.emiDay)+
   '<label>'+E(B("Loan end date","ലോൺ അവസാനിക്കുന്ന തീയതി"))+tcDateInputHtml("avLoanEnd",v&&v.loanEnd||"")+'</label>'+
   vf("avNote",B("Note","കുറിപ്പ്"),"text",v&&v.note)+'</div>'+
   '<p class="muted" style="font-size:12px">'+E(B("With a loan, the money put in is the down payment and the EMI is entered as an expense. Without a loan, the whole price counts as the money put in.","ലോൺ ഉണ്ടെങ്കിൽ മുടക്ക് ഡൗൺ പേയ്മെന്റ് ആണ്, EMI ചെലവായി ചേർക്കണം. ലോൺ ഇല്ലെങ്കിൽ മുഴുവൻ വിലയും മുടക്കായി കണക്കാക്കും."))+'</p>'+
   '<div class="actions"><button class="primary" onclick="tcAbVehSave(\''+(v?v.id:"")+'\')">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="closeModal()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div>';
  modal(h);
 };
 window.tcAbVehSave=function(id){
  if(!canWrite()){ locked(); return; }
  var name=val("avName"); if(!name){ say(B("Enter the vehicle name","വാഹനത്തിന്റെ പേര് നൽകുക")); return; }
  var pd=tcReadDateInput("avDate"), le=tcReadDateInput("avLoanEnd");
  if(pd===null||le===null){ say(B("Enter the date as DD-MM-YYYY","തീയതി DD-MM-YYYY ആയി നൽകുക")); return; }
  var n=function(i){ var x=parseFloat(val(i)); return x>0?x:""; };
  var o={name:name,no:val("avNo").toUpperCase(),purchaseDate:pd,price:n("avPrice"),down:n("avDown"),loan:n("avLoan"),emi:n("avEmi"),emiDay:n("avEmiDay"),loanEnd:le,note:val("avNote")};
  var v=id?vById(id):null;
  if(v) for(var k in o) v[k]=o[k];
  else { o.id=uid(); o.created=nowIso(); VL().push(o); v=o; }
  syncAuto();
  persist(); closeModal(); say(B("Saved","സേവ് ചെയ്തു")); ST.tab="veh"; renderBook();
 };
 window.tcAbImportVeh=function(){
  if(!canWrite()){ locked(); return; }
  var added=0;
  (db.vehicles||[]).forEach(function(x){
   if(!x||!x.name) return;
   if(matchVehicle(x.no,x.name)) return;
   VL().push({id:uid(),name:x.name,no:String(x.no||"").toUpperCase(),purchaseDate:"",price:"",down:"",loan:"",emi:"",emiDay:"",loanEnd:"",note:"",created:nowIso()});
   added++;
  });
  syncAuto(); persist();
  say(added?B(added+" vehicle(s) added - open each to add purchase details",added+" വാഹനം ചേർത്തു - ഓരോന്നും തുറന്ന് വാങ്ങിയ വിവരങ്ങൾ ചേർക്കൂ"):B("All your vehicles are already in the book","നിങ്ങളുടെ എല്ലാ വാഹനങ്ങളും ബുക്കിൽ ഉണ്ട്"));
  ST.tab="veh"; renderBook();
 };
 window.tcAbVeh=function(id){
  var v=vById(id); if(!v) return;
  var s=vstats(v), es=entries().filter(function(e){ return e.vehId===id; }).sort(function(a,b){ return a.date<b.date?1:-1; });
  var row=function(l,x,c){ return '<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0"><span>'+E(l)+'</span><b'+(c?' style="color:'+c+'"':'')+'>'+x+'</b></div>'; };
  var h='<h2>&#128663; '+E(v.name)+'</h2><div class="muted" style="font-size:12.5px;margin-bottom:6px">'+E([v.no,v.purchaseDate?B("Bought ","വാങ്ങിയത് ")+tcFormatDate(v.purchaseDate):"",v.note].filter(Boolean).join(" · "))+'</div>'+
   '<div class="ratebox" style="font-size:13.5px">'+
   (v.price?row(B("Purchase price","വാങ്ങിയ വില"),mny(v.price)):"")+
   (+v.loan>0?row(B("Loan","ലോൺ"),mny(v.loan)+(v.emi?" / EMI "+mny(v.emi):"")):"")+
   row(B("Money put in","ആകെ മുടക്ക്"),mny(s.invested))+
   row(B("Income","വരവ്"),mny(s.inc),"#1c6b2c")+
   row(B("Expense","ചെലവ്"),mny(s.out),"#a12d2d")+
   row(B("Profit from running","ഓട്ടത്തിലെ ലാഭം"),mny(s.net),s.net>=0?"#1c6b2c":"#a12d2d")+
   (s.invested>0?row(s.remaining>0?B("Still to recover","ഇനി തിരിച്ചുകിട്ടാനുള്ളത്"):B("Recovered, extra profit","മുടക്ക് തിരിച്ചുകിട്ടി, അധിക ലാഭം"),mny(Math.abs(s.remaining)),s.remaining>0?"#a12d2d":"#1c6b2c"):"")+
   (s.left?row(B("Estimated time to recover","തിരിച്ചുകിട്ടാൻ ഏകദേശം"),s.left+" "+B("months","മാസം")):"")+
   (s.lit>0?row(B("Fuel bought","ഇന്ധനം"),Math.round(s.lit*10)/10+" L ("+mny(Math.round(s.perL*10)/10)+"/L)"):"")+
   '</div>'+
   '<div class="actions" style="margin-top:8px"><button class="primary" style="background:#1c6b2c;border-color:#1c6b2c" onclick="tcAbAdd(\'in\',\''+id+'\')">+ '+E(B("Income","വരവ്"))+'</button><button class="primary" style="background:#a12d2d;border-color:#a12d2d" onclick="tcAbAdd(\'out\',\''+id+'\')">- '+E(B("Expense","ചെലവ്"))+'</button></div>'+
   '<div class="actions"><button onclick="tcAbVehForm(\''+id+'\')">'+E(B("Edit vehicle","തിരുത്തുക"))+'</button><button class="danger" onclick="tcAbVehDel(\''+id+'\')">'+E(B("Remove from book","ബുക്കിൽ നിന്ന് നീക്കുക"))+'</button><button onclick="closeModal()">'+E(B("Close","അടയ്ക്കുക"))+'</button></div>'+
   '<h3 style="font-size:14px;margin:10px 0 4px">'+E(B("Latest entries","പുതിയ എൻട്രികൾ"))+'</h3>'+
   (es.slice(0,15).map(function(e){ return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:12.5px;padding:3px 0;border-bottom:1px solid #eee"><span>'+E(tcFormatDate(e.date)+" · "+catLabel(e.cat))+'</span><b style="color:'+(e.type==="in"?"#1c6b2c":"#a12d2d")+'">'+(e.type==="in"?"+":"-")+mny(e.amount)+'</b></div>'; }).join("")||'<p class="muted" style="font-size:12.5px">'+E(B("No entries yet.","എൻട്രികൾ ഇല്ല."))+'</p>');
  modal(h);
 };
 window.tcAbVehDel=function(id){
  var v=vById(id); if(!v) return;
  if(!canWrite()){ locked(); return; }
  var n=entries().filter(function(e){ return e.vehId===id; }).length;
  if(!confirm(B("Remove this vehicle from the book? Its "+n+" entries stay, with no vehicle chosen.","ഈ വാഹനം ബുക്കിൽ നിന്ന് നീക്കട്ടേ? അതിന്റെ "+n+" എൻട്രികൾ വാഹനം തിരഞ്ഞെടുക്കാതെ നിലനിൽക്കും."))) return;
  entries().forEach(function(e){ if(e.vehId===id){ e.vehNo=e.vehNo||v.no; e.vehName=e.vehName||v.name; e.vehId=""; } });
  v.deleted=true; if(ST.veh===id) ST.veh="all";
  persist(); closeModal(); renderBook();
 };

 /* ---------- CSV (always allowed, also after the free period) ---------- */
 function csvCell(x){ var s=String(x==null?"":x); return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
 window.tcAbCsv=async function(){
  var list=filtered().slice().sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:0; });
  if(!list.length){ say(B("Nothing to export for this selection","ഈ തിരഞ്ഞെടുപ്പിൽ എക്സ്പോർട്ട് ചെയ്യാൻ ഒന്നുമില്ല")); return; }
  var rows=[["Date","Type","Category","Amount","Vehicle","Vehicle No","Customer","Route","Paid by","Fuel litres","Note","Source"]];
  list.forEach(function(e){
   var v=vById(e.vehId);
   rows.push([e.date,e.type==="in"?"Income":"Expense",e.cat,e.amount,v?v.name:(e.vehName||""),v?v.no:(e.vehNo||""),e.customer||"",e.route||"",e.mode||"",e.litres||"",e.note||"",e.src==="bill"?"Bill":e.src==="old"?"Old Accounts":"Typed"]);
  });
  rows.push([]);
  var t=sums(list);
  rows.push(["Total income","","",t.inc]); rows.push(["Total expense","","",t.out]); rows.push(["Profit","","",t.net]); if(t.drv>0) rows.push(["Tips given to drivers (not counted above)","","",t.drv]);
  rows.push([]); rows.push(["For personal record keeping only - not GST/tax filing."]);
  var text="﻿"+rows.map(function(r){ return r.map(csvCell).join(","); }).join("\r\n");
  var name="TravelConnect_Accounts_"+todayIso()+".csv";
  try{
   var file=new File([text],name,{type:"text/csv"});
   if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:name}); return; }
  }catch(e){ if(e&&e.name==="AbortError") return; }
  try{
   var url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
   var a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click();
   setTimeout(function(){ try{ document.body.removeChild(a); URL.revokeObjectURL(url); }catch(e){} },1500);
   say(B("CSV saved to your downloads","CSV ഡൗൺലോഡ്സിൽ സേവ് ചെയ്തു"));
  }catch(e){ say(B("Could not export","എക്സ്പോർട്ട് ചെയ്യാൻ കഴിഞ്ഞില്ല")); }
 };

 /* ---------- dashboard card + menu name ---------- */
 function cardHtml(){
  var h='<h3 style="margin:0 0 6px;font-size:15px;color:#0b4f5a">&#128210; '+E(B("Trip & Accounts","ട്രിപ്പ് & അക്കൗണ്ട്സ്"))+'</h3>';
  if(S0().accStart){
   var r=periodRange("month"), t=sums(entries().filter(function(e){ return e.date>=r[0]&&e.date<=r[1]; }));
   h+='<div style="font-size:13px">'+E(B("This month","ഈ മാസം"))+': '+E(B("Income","വരവ്"))+' <b style="color:#1c6b2c">'+mny(t.inc)+'</b> &middot; '+E(B("Expense","ചെലവ്"))+' <b style="color:#a12d2d">'+mny(t.out)+'</b> &middot; '+E(B("Profit","ലാഭം"))+' <b>'+mny(t.net)+'</b></div>';
  }else{
   h+='<div class="muted" style="font-size:12.5px">'+E(B("Vehicle-wise income and expense book. Bills fill it automatically. Try it free for 2 months.","വാഹനം തിരിച്ചുള്ള വരവ്-ചെലവ് ബുക്ക്. ബില്ലുകൾ ഇതിൽ സ്വയം വരും. 2 മാസം സൗജന്യമായി പരീക്ഷിക്കൂ."))+'</div>';
  }
  h+='<div class="actions" style="margin-top:6px"><button class="primary" onclick="view(\'accounts\')">'+E(B("Open","തുറക്കുക"))+'</button></div>';
  return h;
 }
 function arrange(){
  var a=$("app"); if(!a) return;
  var h2=a.querySelector(".card>h2");
  if(!h2||!/Travel Connect Dashboard|ഡാഷ്ബോർഡ്/i.test(h2.textContent)) return;
  var c=$("tcAbCard");
  if(!c){
   c=document.createElement("div"); c.className="card"; c.id="tcAbCard";
   c.style.cssText="border:2px solid #3b7bbf;padding:10px 12px;margin:0 0 12px";
   c.innerHTML=cardHtml();
  }
  var live=$("tcLiveCard");
  if(live){ if(live.nextElementSibling!==c) live.parentNode.insertBefore(c,live.nextSibling); }
  else if(!c.parentNode) h2.parentNode.insertBefore(c,h2.nextSibling);
 }
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ arrange(); }catch(e){} },140); }
 function start(){
  var a=$("app"); if(!a||!window.MutationObserver) return;
  new MutationObserver(later).observe(a,{childList:true,subtree:true});
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
 try{ if(typeof TC_STRINGS!=="undefined"&&TC_STRINGS.menu_accounts) TC_STRINGS.menu_accounts={en:"Trip & Accounts",ml:"ട്രിപ്പ് & അക്കൗണ്ട്സ്"}; }catch(e){}

 /* ---------- bills fill the book by themselves: after every save, once things settle ---------- */
 var tsync=null;
 try{
  var prevSave=window.save;
  if(typeof prevSave==="function"){
   window.save=function(){
    var r=prevSave.apply(this,arguments);
    try{
     if(S0().accStart){ clearTimeout(tsync); tsync=setTimeout(function(){ try{ syncAuto(); }catch(e){} },1200); }
    }catch(e){}
    return r;
   };
  }
 }catch(e){}

 /* ---------- Premium cloud backup includes the book ---------- */
 try{
  ["accVehicles","accEntries"].forEach(function(k){
   if(typeof TC_BK_LISTS!=="undefined"&&TC_BK_LISTS.indexOf(k)<0) TC_BK_LISTS.push(k);
  });
 }catch(e){}
})();
