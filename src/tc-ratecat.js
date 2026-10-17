/* Rate Master categories in "Find Nearby Vehicle" (tc-ratecat.js, loaded by tc-regdocs.js).
   CUSTOMER: after Motor Cab / Contract Carriage a list of vehicle categories from the Rate Master (name, passengers, AC, Premium
   tag, approximate charge for Local / Drop / Outstation, "Available nearby" or "Not available now"). Choosing one sends the request
   only to owners with a live-Verified vehicle of that category (server: trip_class.js / trip_alerts.js). "Any vehicle" = the old way.
   OWNER: vehicle Add/Edit form gets a "Rate Master category" box (filtered by the passenger seats); the vehicle list shows it; the owner's
   trip alert shows the requested category.
   ADMIN: Rate Master page > "Customer vehicle details" (passengers, AC, Premium/Luxury, hide, add 7-passenger versions); Pending
   Approvals / Pending Vehicles / All Vehicles show the category with a Change button.
   Category details (passengers, AC, tag) are kept on the server (/api/trip_alerts?action=rc_meta) and are first guessed from the category
   names; the Rate Master itself (names, rates) is the existing one. Categories are referred to by their NUMBER in the Rate Master list. */
(function(){
 if(window.__tcRateCat) return; window.__tcRateCat=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); };
 var say=function(m){ try{ toast(m); }catch(e){ alert(m); } };
 var BL=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var mny=function(n){ try{ return typeof money==="function"?money(n):"₹"+n; }catch(e){ return "₹"+n; } };
 var cats=function(){ return (typeof db!=="undefined"&&db&&db.categories)||[]; };

 /* ---------- disclaimers (always English + Malayalam) ---------- */
 var DISC_C_EN="These rates are only an approximate estimate from Travel Connect's Rate Master. The actual charge is fixed between you and the vehicle owner / driver - please confirm it with the driver before the trip. Travel Connect only connects customers with service providers; the app, its owners, admins and staff are not responsible for any dispute about charges or anything else.";
 var DISC_C_ML="ഈ നിരക്കുകൾ Travel Connect-ന്റെ Rate Master അടിസ്ഥാനമാക്കിയുള്ള ഏകദേശ കണക്ക് മാത്രമാണ്. യഥാർത്ഥ നിരക്ക് നിങ്ങളും വാഹന ഉടമ / ഡ്രൈവറും തമ്മിൽ തീരുമാനിക്കണം - യാത്രയ്ക്ക് മുൻപ് ഡ്രൈവറോട് ഉറപ്പാക്കുക. Travel Connect കസ്റ്റമർമാരെയും സേവനദാതാക്കളെയും തമ്മിൽ ബന്ധിപ്പിക്കുക മാത്രമാണ് ചെയ്യുന്നത്; നിരക്കിനെക്കുറിച്ചോ മറ്റേതെങ്കിലും കാര്യത്തെക്കുറിച്ചോ ഉള്ള തർക്കങ്ങൾക്ക് ആപ്പോ അതിന്റെ ഉടമകളോ അഡ്മിൻമാരോ ജീവനക്കാരോ ഉത്തരവാദികളല്ല.";
 var DISC_O_EN="The rates shown to customers are only approximate guides from the Rate Master. The final charge is agreed between the customer and you. Travel Connect only connects customers with service providers; the app, its owners, admins and staff are not responsible for any dispute about charges or anything else. By registering and using the app you accept this.";
 var DISC_O_ML="ഉപഭോക്താക്കൾക്ക് കാണിക്കുന്ന നിരക്കുകൾ Rate Master-ൽ നിന്നുള്ള ഏകദേശ മാർഗ്ഗനിർദ്ദേശം മാത്രമാണ്. അന്തിമ നിരക്ക് കസ്റ്റമറും നിങ്ങളും തമ്മിൽ തീരുമാനിക്കണം. Travel Connect കസ്റ്റമർമാരെയും സേവനദാതാക്കളെയും തമ്മിൽ ബന്ധിപ്പിക്കുക മാത്രമാണ് ചെയ്യുന്നത്; നിരക്കിനെക്കുറിച്ചോ മറ്റേതെങ്കിലും കാര്യത്തെക്കുറിച്ചോ ഉള്ള തർക്കങ്ങൾക്ക് ആപ്പോ അതിന്റെ ഉടമകളോ അഡ്മിൻമാരോ ജീവനക്കാരോ ഉത്തരവാദികളല്ല. രജിസ്റ്റർ ചെയ്ത് ആപ്പ് ഉപയോഗിക്കുന്നതിലൂടെ ഇത് നിങ്ങൾ അംഗീകരിക്കുന്നു.";
 var discBox=function(owner,id){
  return '<div'+(id?' id="'+id+'"':'')+' style="margin:10px 0;padding:9px 11px;border-radius:10px;background:#fff8e6;border:1px solid #ecd9a0;font-size:11.5px;line-height:1.5;color:#5b4a14"><b>&#9888;&#65039; '+E(owner?"Please note / ശ്രദ്ധിക്കുക":"Approximate rates only / ഏകദേശ നിരക്ക് മാത്രം")+'</b><br>'+E(owner?DISC_O_EN:DISC_C_EN)+'<br><span style="display:block;margin-top:4px">'+E(owner?DISC_O_ML:DISC_C_ML)+'</span></div>';
 };

 /* ---------- category details: guessed from the name, overridden by what the admin saved ---------- */
 var META_LS="tc_rcmeta_v1";
 var srv={}; try{ srv=JSON.parse(localStorage.getItem(META_LS)||"{}")||{}; }catch(e){ srv={}; }
 var metaAt=0;
 function loadMeta(force){
  if(!force&&Date.now()-metaAt<60000) return Promise.resolve(srv);
  return fetch("/api/trip_alerts?action=rc_meta").then(function(r){ return r.json(); }).then(function(d){
   if(d&&d.ok){ srv=d.meta||{}; metaAt=Date.now(); try{ localStorage.setItem(META_LS,JSON.stringify(srv)); }catch(e){} }
   return srv;
  }).catch(function(){ return srv; });
 }
 function infer(name){
  var n=String(name||""), m={}, x;
  if((x=n.match(/(\d{1,2})\s*&\s*(\d{1,2})\s*seat/i))){ m.lo=Math.min(+x[1],+x[2]); m.hi=Math.max(+x[1],+x[2]); }
  else if((x=n.match(/(\d{1,2})\s*pass/i))){ m.lo=m.hi=+x[1]; }
  else if((x=n.match(/(\d{1,2})\s*[- ]?\s*seat/i))){ m.lo=m.hi=+x[1]; }
  else if(/compact\s*suv/i.test(n)){ m.lo=m.hi=5; }
  else if(/mini|hatch|sedan/i.test(n)){ m.lo=m.hi=4; }
  else if(/jeep|muv|suv|innova|crysta|hycross|ertiga|marazzo|xylo|tavera/i.test(n)){ m.lo=m.hi=6; }
  if(/non[\s-]*a\/?c/i.test(n)) m.ac=0;
  else if(/(^|[^a-z])a\/c([^a-z]|$)/i.test(n)||/(^|[^a-z])ac([^a-z]|$)/i.test(n)||/urbania/i.test(n)) m.ac=1;
  m.t=(/premium|urbania/i.test(n)||/(^|[^a-z])f\s*a\/?c/i.test(n))?"p":"o";
  return m;
 }
 /* effective details of category i */
 function meta(i,c){
  var b=infer(c&&c.name), s=srv[String(i)]||{}, o={};
  ["lo","hi","ac","t"].forEach(function(k){ o[k]=(s[k]!==undefined&&s[k]!==null)?s[k]:b[k]; });
  if(o.lo&&!o.hi) o.hi=o.lo;
  o.h=s.h===1;
  return o;
 }
 var paxTxt=function(m){ return m.lo===m.hi?String(m.lo):m.lo+"-"+m.hi; };
 var classOfPax=function(p){ return p>=7?"carriage":"cab"; };
 var inClass=function(m,vclass){ return !!m.lo&&(vclass==="cab"?m.lo<=6:m.hi>=7); };
 var reqPax=function(m,vclass){ return vclass==="cab"?Math.min(m.hi,6):Math.max(m.lo,7); };
 var tierTag=function(m){ return m.t==="p"?"Premium":m.t==="l"?"Luxury":""; };
 var tierHtml=function(m){ var t=tierTag(m); return t?'<span style="display:inline-block;background:'+(m.t==="l"?'#4b2a7a':'#b8860b')+';color:#fff;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:800;margin-left:4px">'+t+'</span>':""; };
 var paxLine=function(m){ return paxTxt(m)+" "+BL("passengers","യാത്രക്കാർ")+(m.ac===1?" · AC":m.ac===0?" · Non-AC":""); };


 /* ---------- approximate charge for the trip type (never the Minimum Safety rate) ---------- */
 var rng=function(a,b){ return a===b?mny(a):mny(a)+" - "+mny(b); };
 function rateHtml(c,trip,days){
  try{
   if(trip==="local"||trip==="drop"){
    var R=c[trip]; if(!R||!(R.rate>0)) return "";
    return '<b>≈ '+mny(R.rate)+'</b> <span class="muted" style="font-size:12px">'+E(BL("up to "+R.incKm+" km / "+R.incHours+" hr, then "+mny(R.addKm)+"/km","ആദ്യ "+R.incKm+" കി.മീ / "+R.incHours+" മണിക്കൂർ വരെ, പിന്നീട് "+mny(R.addKm)+"/കി.മീ"))+'</span>';
   }
   /* One-day trip = one day of the outstation tariff; Multi-day = the same per-day tariff x the number of days (all from the Rate Master) */
   var st=c.standard, co=c.competitive; if(!st||!co||!(st.rate>0||co.rate>0)) return "";
   var n=trip==="multi"?Math.min(30,Math.max(2,parseInt(days,10)||2)):1;
   var lo=Math.min(st.rate,co.rate)*n, hi=Math.max(st.rate,co.rate)*n, kmTxt=rng(Math.min(st.addKm,co.addKm),Math.max(st.addKm,co.addKm));
   var bata=c.driverBata>0?c.driverBata:0, km=st.incKm, hr=st.incHours;
   var en="("+km+" km / "+hr+" hr a day"+(n>1?" - "+(km*n)+" km in all":"")+"), extra "+kmTxt+"/km"+(bata?", plus driver bata "+mny(bata)+"/day"+(n>1?" ("+mny(bata*n)+" for "+n+" days)":""):"");
   var ml="(ദിവസം "+km+" കി.മീ / "+hr+" മണിക്കൂർ"+(n>1?" - ആകെ "+(km*n)+" കി.മീ":"")+"), അധികം "+kmTxt+"/കി.മീ"+(bata?", കൂടാതെ ഡ്രൈവർ ബാറ്റ "+mny(bata)+"/ദിവസം"+(n>1?" ("+n+" ദിവസത്തേക്ക് "+mny(bata*n)+")":""):"");
   return '<b>≈ '+rng(lo,hi)+'</b> '+E(n===1?BL("for 1 day","ഒരു ദിവസത്തേക്ക്"):BL("for "+n+" days",n+" ദിവസത്തേക്ക്"))+' <span class="muted" style="font-size:12px">'+E(BL(en,ml))+'</span>';
  }catch(e){ return ""; }
 }
 var TRIPS=[["local","Local","ലോക്കൽ"],["drop","Drop","ഡ്രോപ്പ്"],["oneday","One-day trip","ഒറ്റ ദിവസ യാത്ര"],["multi","Multi-day","മൾട്ടി ഡേ"]];
 var TRIP_NAMES=TRIPS.concat([["outstation","Outstation / multi-day","ഔട്ട്സ്റ്റേഷൻ / മൾട്ടി ഡേ"]]); /* "outstation" = what the server stores for one-day and multi-day */
 var tripName=function(t){ var x=TRIP_NAMES.filter(function(a){ return a[0]===t; })[0]||TRIPS[0]; return BL(x[1],x[2]); };
 var ssGet=function(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } };
 var ssSet=function(k,v){ try{ sessionStorage.setItem(k,String(v)); }catch(e){} };
 var tripFull=function(t,days){ return t==="multi"?tripName(t)+" - "+days+BL(" days"," ദിവസം"):tripName(t); };

 /* ================= CUSTOMER: category picker ================= */
 var S=null; /* picker state: {vclass, items:[{i,c,m,pax}], avail:{i:n}|null, trip, loc} */
 var kindLabel=function(v){ return v==="carriage"?BL("Contract Carriage (7+ passengers + driver)","Contract Carriage (7+ യാത്രക്കാർ + ഡ്രൈവർ)"):BL("Motor Cab (up to 6 passengers + driver)","Motor Cab (6 യാത്രക്കാർ വരെ + ഡ്രൈവർ)"); };
 var oldStart=window.tcStartTripBroadcast;
 if(typeof oldStart==="function") window.tcStartTripBroadcast=function(bt,vclass){
  if(bt==="taxi_travel"&&(vclass==="cab"||vclass==="carriage")&&!window.__tcRcAny){ return window.tcRcOpenPicker(vclass); }
  window.__tcRcAny=false;
  return oldStart.apply(this,arguments);
 };
 window.tcRcAny=function(vclass){ window.__tcRcAny=true; window.tcStartTripBroadcast("taxi_travel",vclass); };


 window.tcRcOpenPicker=async function(vclass){
  RET=null;
  var user=(typeof getCurrentUser==="function")?getCurrentUser():null; if(!user) return;
  modal('<div style="text-align:center;padding:12px 0"><div style="font-size:15px;font-weight:700;margin-bottom:10px">'+E(BL("Finding vehicles near you...","നിങ്ങളുടെ അടുത്തുള്ള വാഹനങ്ങൾ നോക്കുന്നു..."))+'</div><div class="spinner" style="margin:0 auto"></div></div>');
  var trip=ssGet("tc_rc_trip")||"local"; if(trip==="outstation") trip="oneday"; if(!TRIPS.some(function(t){ return t[0]===trip; })) trip="local";
  var pax=parseInt(ssGet("tc_rc_pax"),10)||0, days=Math.min(30,Math.max(2,parseInt(ssGet("tc_rc_days"),10)||2));
  var loc=null; try{ loc=await tcGetLocation(true); if(loc.error!==undefined) loc=null; }catch(e){ loc=null; }
  try{ if(typeof syncConfigFromServer==="function"&&Date.now()-(window.__tcRcSync||0)>60000){ window.__tcRcSync=Date.now(); await syncConfigFromServer(); } }catch(e){}
  await loadMeta();
  var items=[];
  cats().forEach(function(c,i){ var m=meta(i,c); if(m.h||!inClass(m,vclass)) return; items.push({i:i,c:c,m:m,pax:reqPax(m,vclass)}); });
  var avail=null;
  if(items.length){
   try{
    var q="action=rc_avail&vclass="+vclass+"&cats="+items.map(function(x){ return x.i+":"+x.pax; }).join(",")+"&mobile="+encodeURIComponent(user.mobile||"")+(loc?"&lat="+loc.lat+"&lon="+loc.lon:"");
    var d=await (await fetch("/api/trip_alerts?"+q)).json();
    if(d&&d.ok) avail=d.counts||{};
   }catch(e){ avail=null; }
  }
  S={vclass:vclass,items:items,avail:avail,trip:trip,loc:loc,pax:pax,days:days,showAll:false};
  tcRcRender();
 };
 var isAvail=function(x){ return S.avail?(S.avail[x.i]>0):null; };
 var TIER_ORDER={o:0,p:1,l:2};
 /* the vehicle cards (re-drawn alone when the passengers / days change, so the typing box keeps focus) */
 function listHtml(){
  var P=S.pax, h="";
  var banner=function(msg,btn,v){ return '<div style="margin:8px 0;padding:9px 11px;border-radius:10px;background:#eef6f7;border:1px solid #cfe0e3;font-size:12.5px;line-height:1.5">'+E(msg)+'<div class="actions" style="margin-top:6px"><button type="button" onclick="tcRcSwitchClass(\''+v+'\')">'+E(btn)+'</button></div></div>'; };
  if(P>6&&S.vclass==="cab") return banner(BL(P+" passengers need a Contract Carriage (7 or more passengers).",P+" യാത്രക്കാർക്ക് Contract Carriage (7+ യാത്രക്കാർ) വേണം."),BL("Show Contract Carriage vehicles","Contract Carriage വാഹനങ്ങൾ കാണിക്കുക"),"carriage");
  if(P>0&&P<=6&&S.vclass==="carriage") h+=banner(BL("For "+P+" passengers a Motor Cab is enough, and usually cheaper.",P+" യാത്രക്കാർക്ക് Motor Cab മതിയാകും, സാധാരണ ചെലവും കുറവാണ്."),BL("Show Motor Cab vehicles","Motor Cab വാഹനങ്ങൾ കാണിക്കുക"),"cab");
  var fit=function(x){ return !P||x.m.hi>=P; };
  var arr=S.items.filter(function(x){ return fit(x)||S.showAll; });
  var hidden=S.items.filter(function(x){ return !fit(x); }).length;
  arr.sort(function(a,b){
   var fa=fit(a)?0:1, fb=fit(b)?0:1; if(fa!==fb) return fa-fb;
   var A=isAvail(a)===false?1:0, B=isAvail(b)===false?1:0; if(A!==B) return A-B;
   if(P){ if(a.m.hi!==b.m.hi) return a.m.hi-b.m.hi; var ta=TIER_ORDER[a.m.t]||0, tb=TIER_ORDER[b.m.t]||0; if(ta!==tb) return ta-tb; }
   return a.i-b.i;
  });
  var best=P?arr.filter(function(x){ return fit(x)&&isAvail(x)!==false; })[0]:null;
  if(!S.avail&&S.items.length) h+='<p class="muted" style="font-size:11.5px;margin:6px 0 0">'+E(BL("Availability could not be checked right now - you can still choose a vehicle.","ലഭ്യത ഇപ്പോൾ പരിശോധിക്കാൻ കഴിഞ്ഞില്ല - എങ്കിലും വാഹനം തിരഞ്ഞെടുക്കാം."))+'</p>';
  if(!S.items.length) h+='<p class="muted" style="margin:10px 0">'+E(BL("No vehicle categories are listed for this type yet. Please choose Any vehicle.","ഈ വിഭാഗത്തിൽ വാഹന കാറ്റഗറികൾ ഇതുവരെ ചേർത്തിട്ടില്ല. 'Any vehicle' തിരഞ്ഞെടുക്കുക."))+'</p>';
  else if(P&&!arr.length) h+='<p class="muted" style="margin:10px 0">'+E(BL("No vehicle in this list seats "+P+" passengers. Please choose Any vehicle.",P+" യാത്രക്കാരെ കൊള്ളുന്ന വാഹനം ഈ പട്ടികയിൽ ഇല്ല. 'Any vehicle' തിരഞ്ഞെടുക്കുക."))+'</p>';
  arr.forEach(function(x){
   var a=isAvail(x), grey=a===false, small=P&&x.m.hi<P;
   h+='<div onclick="tcRcTap('+x.i+')" style="cursor:pointer;border:1px solid '+(x===best?'#2e9d6a':grey?'#d5d9dc':'#bcd6da')+';border-radius:12px;padding:9px 11px;margin:8px 0;background:'+(grey?'#f1f2f3':'#fff')+(grey?';opacity:.65':'')+'">'+
    (x===best?'<div style="font-size:11.5px;font-weight:800;color:#177044;margin-bottom:2px">&#9733; '+E(BL("Best fit for "+P+" passengers",P+" യാത്രക്കാർക്ക് ഏറ്റവും അനുയോജ്യം"))+'</div>':'')+
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div style="font-weight:800;font-size:14.5px">'+E(x.c.name)+tierHtml(x.m)+'</div>'+
    (a===true?'<span style="font-size:11.5px;font-weight:800;color:#177044;white-space:nowrap">&#9679; '+E(BL("Available nearby","ലഭ്യമാണ്"))+'</span>':a===false?'<span style="font-size:11.5px;font-weight:800;color:#8a6d6d;white-space:nowrap">&#9679; '+E(BL("Not available now","ഇപ്പോൾ ലഭ്യമല്ല"))+'</span>':'')+'</div>'+
    '<div class="muted" style="font-size:12.5px">'+E(paxLine(x.m))+(small?' · <b style="color:#a05a00">'+E(BL("may be too small for "+P,P+" പേർക്ക് മതിയാകില്ല"))+'</b>':'')+'</div>'+
    '<div style="margin-top:3px;font-size:13px">'+(rateHtml(x.c,S.trip,S.days)||'<span class="muted">'+E(BL("Rate: ask the driver","നിരക്ക്: ഡ്രൈവറോട് ചോദിക്കുക"))+'</span>')+'</div></div>';
  });
  if(hidden>0&&!S.showAll&&P) h+='<p class="muted" style="font-size:12px;margin:6px 0">'+E(BL(hidden+" smaller vehicle"+(hidden===1?"":"s")+" hidden (too small for "+P+" passengers). ",hidden+" ചെറിയ വാഹനം മറച്ചിരിക്കുന്നു ("+P+" യാത്രക്കാർക്ക് മതിയാകില്ല). "))+'<a href="#" onclick="tcRcShowAll();return false" style="color:#0b6b78;font-weight:700">'+E(BL("Show all","എല്ലാം കാണിക്കുക"))+'</a></p>';
  return h;
 }
 function refreshList(){ var el=document.getElementById("tcRcList"); if(el) el.innerHTML=listHtml(); }
 function tcRcRender(){
  if(!S) return;
  var h='<h2>&#128663; '+E(BL("Choose your vehicle","വാഹനം തിരഞ്ഞെടുക്കുക"))+'</h2><p class="muted" style="margin:0 0 6px">'+E(kindLabel(S.vclass))+'</p>'+
   '<label style="display:block;margin:6px 0 2px;font-size:13px;font-weight:700">'+E(BL("How many passengers?","എത്ര യാത്രക്കാർ?"))+' <span class="muted" style="font-weight:400;font-size:12px">'+E(BL("(optional - we show the vehicles that fit)","(വേണമെങ്കിൽ - അനുയോജ്യമായ വാഹനങ്ങൾ കാണിക്കും)"))+'</span>'+
   '<input id="tcRcPax" type="number" inputmode="numeric" min="1" max="60" placeholder="e.g. 4" style="display:block;width:100%;box-sizing:border-box;margin-top:4px" value="'+(S.pax||"")+'" oninput="tcRcSetPax(this.value)"></label>'+
   '<div style="font-size:12px;font-weight:700;margin:8px 0 4px">'+E(BL("Type of trip:","യാത്രയുടെ തരം:"))+'</div><div style="display:flex;gap:6px;flex-wrap:wrap">'+
   TRIPS.map(function(t){ var on=S.trip===t[0]; return '<button type="button" onclick="tcRcSetTrip(\''+t[0]+'\')" style="padding:7px 11px;font-size:12.5px;border-radius:999px;'+(on?'background:#0b6b78;color:#fff':'')+'">'+E(BL(t[1],t[2]))+'</button>'; }).join("")+'</div>'+
   (S.trip==="multi"?'<div style="margin:8px 0 2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span style="font-size:12.5px;font-weight:700">'+E(BL("Number of days","എത്ര ദിവസം"))+'</span>'+
    '<button type="button" onclick="tcRcDays(-1)" style="padding:6px 14px;font-size:16px;border-radius:999px">&minus;</button>'+
    '<input id="tcRcDaysIn" type="number" inputmode="numeric" min="2" max="30" value="'+S.days+'" oninput="tcRcDaysSet(this.value)" style="width:70px;text-align:center">'+
    '<button type="button" onclick="tcRcDays(1)" style="padding:6px 14px;font-size:16px;border-radius:999px">+</button></div>':'')+
   '<div id="tcRcList">'+listHtml()+'</div>';
  h+='<div class="actions"><button class="primary" style="padding:13px" onclick="tcRcAny(\''+S.vclass+'\')">'+E(BL("Any vehicle","ഏത് വാഹനവും"))+' <span style="font-weight:400;font-size:12px">'+E(S.vclass==="carriage"?"(Contract Carriage)":"(Motor Cab)")+'</span></button></div>'+
   discBox(false)+'<div class="actions"><button onclick="closeModal()">'+E(BL("Close","അടയ്ക്കുക"))+'</button></div>';
  modal(h);
 }
 window.tcRcSetTrip=function(t){ if(!S) return; S.trip=t; ssSet("tc_rc_trip",t); tcRcRender(); };
 window.tcRcSetPax=function(v){ if(!S) return; var n=parseInt(v,10); S.pax=(n>=1&&n<=60)?n:0; S.showAll=false; ssSet("tc_rc_pax",S.pax||""); refreshList(); };
 window.tcRcDaysSet=function(v){ if(!S) return; var n=parseInt(v,10); if(!(n>=1)) return; S.days=Math.min(30,Math.max(2,n)); ssSet("tc_rc_days",S.days); refreshList(); };
 window.tcRcDays=function(d){ if(!S) return; S.days=Math.min(30,Math.max(2,S.days+d)); ssSet("tc_rc_days",S.days); var el=document.getElementById("tcRcDaysIn"); if(el) el.value=S.days; refreshList(); };
 window.tcRcShowAll=function(){ if(S){ S.showAll=true; refreshList(); } };
 window.tcRcSwitchClass=function(v){ window.tcRcOpenPicker(v); };
 window.tcRcTap=function(i){
  if(!S) return;
  var x=S.items.filter(function(y){ return y.i===i; })[0]; if(!x) return;
  if(isAvail(x)===false){ return tcRcNotAvailable(x); }
  tcRcBook(x);
 };
 /* greyed card: information only */
 function tcRcNotAvailable(x){
  var others=S.items.filter(function(y){ return y.i!==x.i&&isAvail(y)===true; });
  var h='<h2>'+E(x.c.name)+'</h2><div style="padding:10px 12px;border-radius:10px;background:#fdeeee;border:1px solid #efc4c4;color:#7a2222;font-weight:700">'+E(BL("This vehicle is not available nearby now.","ഈ വാഹനം ഇപ്പോൾ അടുത്ത് ലഭ്യമല്ല."))+'</div>';
  h+=otherHtml(others,S.vclass);
  h+=discBox(false)+'<div class="actions"><button onclick="tcRcRender()">&larr; '+E(BL("Back","തിരികെ"))+'</button></div>';
  modal(h);
 }
 function otherHtml(others,vclass){
  var h='';
  if(others.length){
   h+='<div style="font-size:13px;font-weight:700;margin:10px 0 4px">'+E(BL("Available nearby now:","ഇപ്പോൾ അടുത്ത് ലഭ്യമായവ:"))+'</div>';
   others.slice(0,8).forEach(function(y){ h+='<div onclick="tcRcPick('+y.i+')" style="cursor:pointer;border:1px solid #bcd6da;border-radius:10px;padding:7px 10px;margin:5px 0;background:#fff"><b>'+E(y.c.name)+'</b>'+tierHtml(y.m)+' <span class="muted" style="font-size:12px">'+E(paxLine(y.m))+'</span></div>'; });
  }
  h+='<div class="actions" style="margin-top:10px"><button class="primary" onclick="tcRcAny(\''+vclass+'\')">'+E(BL("Any vehicle","ഏത് വാഹനവും"))+'</button>'+
   '<button onclick="tcRcLeave(\'board\')">&#128663; '+E(BL("Active Vehicles Board","Active Vehicles Board"))+'</button>'+
   '<button onclick="tcRcLeave(\'dir\')">&#128222; '+E(BL("Call from Directory","ഡയറക്ടറിയിൽ നിന്ന് വിളിക്കാം"))+'</button></div>';
  return h;
 }

 /* Directory / Active Vehicles Board opened from the picker: the phone's Back button comes back to the same picker (not the dashboard) */
 var RET=null;
 window.tcRcLeave=function(kind){
  RET={v:S?S.vclass:"cab",hash:location.hash,t:Date.now()};
  closeModal();
  if(kind==="board") view("activeboard"); else tcOpenDirectory();
 };
 window.addEventListener("popstate",function(){
  if(!RET) return;
  var r=RET; if(Date.now()-r.t>20*60000){ RET=null; return; }
  setTimeout(function(){ if(RET!==r||location.hash!==r.hash) return; RET=null; try{ window.tcRcOpenPicker(r.v); }catch(e){} },160);
 });
 window.tcRcPick=function(i){ var x=S&&S.items.filter(function(y){ return y.i===i; })[0]; if(x) tcRcBook(x); };
 window.tcRcRender=tcRcRender;

 /* booking screen for a chosen category */
 var SEL=null;
 async function tcRcBook(x){
  var user=getCurrentUser(); if(!user) return;
  modal('<div style="text-align:center;padding:10px 0"><div style="font-size:15px;font-weight:700;margin-bottom:10px">'+E(BL("Getting your location...","നിങ്ങളുടെ ലൊക്കേഷൻ എടുക്കുന്നു..."))+'</div><div class="spinner" style="margin:0 auto"></div></div>');
  var loc=await tcGetLocation(false);
  if(loc.error!==undefined){
   modal('<h2>Location needed</h2><p class="muted">'+E(tcLocationErrorText(loc.error))+'</p><div class="actions"><button onclick="tcRcRender()">&larr; '+E(BL("Back","തിരികെ"))+'</button><button onclick="closeModal()">OK</button></div>');
   return;
  }
  var tag=tierTag(x.m);
  SEL={i:x.i,vclass:S.vclass,trip:S.trip,days:S.days,cpax:S.pax,pax:x.pax,lat:loc.lat,lon:loc.lon,label:(x.c.name+" - "+paxTxt(x.m)+" passengers"+(tag?" ("+tag+")":"")).slice(0,80),name:x.c.name};
  modal('<h2>&#128663; '+E(BL("Book Your Trip","ട്രിപ്പ് ബുക്ക് ചെയ്യുക"))+'</h2>'+
   '<div style="padding:9px 11px;border-radius:10px;background:#eef6f7;border:1px solid #cfe0e3"><div style="font-weight:800">'+E(x.c.name)+tierHtml(x.m)+'</div><div class="muted" style="font-size:12.5px">'+E(paxLine(x.m))+' · '+E(tripFull(S.trip,S.days))+(S.pax?' · '+E(BL(S.pax+" travelling",S.pax+" പേർ യാത്ര ചെയ്യുന്നു")):'')+'</div><div style="margin-top:3px;font-size:13px">'+(rateHtml(x.c,S.trip,S.days)||"")+'</div></div>'+
   '<div class="muted" style="font-size:11.5px;margin-top:4px">'+E(BL("Your trip type, number of days and passengers are sent to the driver along with your request.","യാത്രയുടെ തരം, ദിവസങ്ങളുടെ എണ്ണം, യാത്രക്കാരുടെ എണ്ണം എന്നിവ റിക്വസ്റ്റിനൊപ്പം ഡ്രൈവർക്ക് ലഭിക്കും."))+'</div>'+
   '<label style="margin-top:8px">'+E(BL("Pickup landmark (optional, helps drivers find you)","പിക്കപ്പ് ലാൻഡ്മാർക്ക് (വേണമെങ്കിൽ, ഡ്രൈവർക്ക് കണ്ടെത്താൻ സഹായിക്കും)"))+'<input id="tripPickupText" placeholder="e.g. Near Nadapuram bus stand"></label>'+
   '<div style="font-weight:650;font-size:13px;margin:8px 0 4px">'+E(BL("Where are you going? (optional, helps a driver decide)","എവിടേക്കാണ് പോകുന്നത്? (വേണമെങ്കിൽ)"))+'</div><div id="tripDestContainer"></div>'+
   '<div class="actions"><button type="button" onclick="tcAddTripDestField()">+ '+E(BL("Add a destination","ഒരു ലക്ഷ്യസ്ഥാനം ചേർക്കുക"))+'</button></div>'+
   '<label style="margin-top:8px">'+E(BL("Short note (optional)","ചെറിയ കുറിപ്പ് (വേണമെങ്കിൽ)"))+'<textarea id="tripNote" rows="2" placeholder="e.g. 3 people, one bag"></textarea></label>'+
   '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#f5f8fa;font-size:11.5px;color:#55666b;line-height:1.5">&#8505;&#65039; '+E(BL("The fare is normally charged from the vehicle's own starting point (garage) - not just your pickup point - and includes its return back there after the trip. The driver will confirm the exact fare with you.","വാഹനത്തിന്റെ സ്വന്തം സ്റ്റാർട്ടിംഗ് പോയിന്റിൽ (ഗാരേജ്) നിന്നാണ് സാധാരണ നിരക്ക് കണക്കാക്കുന്നത്, ട്രിപ്പിന് ശേഷം അവിടേക്കുള്ള മടക്കവും ഉൾപ്പെടും. കൃത്യമായ നിരക്ക് ഡ്രൈവർ നിങ്ങളോട് ഉറപ്പാക്കും."))+'</div>'+
   discBox(false)+
   '<div class="actions"><button class="primary" onclick="tcRcSend()">'+E(BL("Find a Vehicle","വാഹനം കണ്ടെത്തുക"))+'</button><button onclick="tcRcRender()">&larr; '+E(BL("Back","തിരികെ"))+'</button></div>');
 }
 window.tcRcSend=async function(){
  var user=getCurrentUser(); if(!user||!SEL) return;
  var pickupText=(document.querySelector("#tripPickupText")||{value:""}).value.trim();
  var note=(document.querySelector("#tripNote")||{value:""}).value.trim();
  /* trip type / days / passengers go to the driver in the message (the server stores one-day and multi-day as "outstation") */
  var det=[]; var tn=TRIP_NAMES.filter(function(a){ return a[0]===SEL.trip; })[0];
  if(tn) det.push(tn[1]+(SEL.trip==="multi"?", "+SEL.days+" days":"")+" ("+tn[2]+(SEL.trip==="multi"?", "+SEL.days+" ദിവസം":"")+")");
  if(SEL.cpax) det.push("Passengers: "+SEL.cpax+" (യാത്രക്കാർ: "+SEL.cpax+")");
  if(det.length) note=det.join(" · ")+(note?"\n"+note:"");
  var destinations=tcCollectTripDestinations();
  var sel=SEL;
  modal('<div style="text-align:center;padding:10px 0"><div class="spinner" style="margin:0 auto"></div></div>');
  try{
   var res=await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    action:"broadcast",business_type:"taxi_travel",vclass:sel.vclass,rate_cat:String(sel.i),rate_pax:sel.pax,rate_cat_label:sel.label,rate_trip:(sel.trip==='local'||sel.trip==='drop')?sel.trip:'outstation',
    customer_name:user.name,customer_mobile:user.mobile,device:(typeof getDeviceToken==="function"?getDeviceToken():""),lat:sel.lat,lon:sel.lon,pickup_text:pickupText,destinations:destinations,message:note})});
   var data=await res.json();
   if(!data.ok){
    var h,p;
    if(data.error==="rate_limited"){
     var n=data.retry_after_min||60;
     h=BL("Too many requests","വളരെയധികം റിക്വസ്റ്റുകൾ");
     p=BL("You have sent several trip requests recently. Please try again in about "+n+" minute"+(n===1?"":"s")+". If it is urgent, call a driver directly from the Active Vehicles Board or the Local Directory.","കുറച്ചുനേരത്തിനുള്ളിൽ ധാരാളം ട്രിപ്പ് റിക്വസ്റ്റുകൾ അയച്ചു. ഏകദേശം "+n+" മിനിറ്റിനു ശേഷം വീണ്ടും ശ്രമിക്കുക. അത്യാവശ്യമാണെങ്കിൽ Active Vehicles Board / Local Directory-യിൽ നിന്ന് ഡ്രൈവറെ നേരിട്ട് വിളിക്കാം.");
    }else if(data.error==="blocked"){
     h=BL("Trip requests not available","ട്രിപ്പ് റിക്വസ്റ്റ് ലഭ്യമല്ല");
     p=BL("Trip requests are not available for this number. Please contact the admin.","ഈ നമ്പറിൽ നിന്ന് ട്രിപ്പ് റിക്വസ്റ്റ് അയക്കാൻ കഴിയില്ല. അഡ്മിനെ ബന്ധപ്പെടുക.");
    }else{ h="Could not send"; p="Please check your connection and try again."; }
    modal('<h2>'+E(h)+'</h2><p class="muted">'+E(p)+'</p><div class="actions"><button onclick="closeModal()">OK</button></div>');
    return;
   }
   tcShowTripWaiting(data.alert_id,data.notified_count,"taxi_travel",sel.vclass);
   if(!(data.notified_count>0)) zeroNotice(sel);
  }catch(e){ modal('<h2>Network error</h2><p class="muted">Please check your connection and try again.</p><div class="actions"><button onclick="closeModal()">OK</button></div>'); }
 };
 /* the category was chosen but nobody has it nearby (it just went offline): say so clearly + show other available categories */
 function zeroNotice(sel){
  var w=document.querySelector("#tripWaitStatus"); if(!w) return;
  var others=(S&&S.items||[]).filter(function(y){ return y.i!==sel.i&&isAvail(y)!==false; });
  w.insertAdjacentHTML("beforebegin",'<div style="text-align:left;margin:10px 0;padding:10px 12px;border-radius:10px;background:#fdeeee;border:1px solid #efc4c4"><div style="color:#7a2222;font-weight:800">'+E(BL("This vehicle is not available nearby now.","ഈ വാഹനം ഇപ്പോൾ അടുത്ത് ലഭ്യമല്ല."))+'</div>'+
   (others.length?'<div style="font-size:13px;font-weight:700;margin:8px 0 3px">'+E(BL("Try another vehicle:","മറ്റൊരു വാഹനം നോക്കൂ:"))+'</div>'+others.slice(0,6).map(function(y){ return '<div onclick="tcRcSwitch('+y.i+')" style="cursor:pointer;border:1px solid #bcd6da;border-radius:10px;padding:6px 10px;margin:4px 0;background:#fff"><b>'+E(y.c.name)+'</b> <span class="muted" style="font-size:12px">'+E(paxLine(y.m))+'</span></div>'; }).join(""):"")+
   '<div class="actions" style="margin-top:6px"><button onclick="tcRcSwitch(-1)">'+E(BL("Any vehicle","ഏത് വാഹനവും"))+'</button></div></div>');
 }
 window.tcRcSwitch=async function(i){
  var u=getCurrentUser(), id=window._tcActiveTripAlertId;
  try{ clearInterval(_tcTripPollTimer); }catch(e){}
  window._tcActiveTripAlertId=null;
  if(u&&id){ try{ await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"cancel",alert_id:id,mobile:u.mobile})}); }catch(e){} }
  if(i<0){ return window.tcRcAny(S?S.vclass:"cab"); }
  window.tcRcPick(i);
 };

 /* ================= OWNER / ADMIN: choose a category for a vehicle ================= */
 var vclassForPax=function(p){ return classOfPax(p); };
 /* categories that suit a vehicle with p passengers: same class and within one seat of the category's passengers; none match = whole class */
 function suitable(p){
  var cl=vclassForPax(p), all=[], tight=[];
  cats().forEach(function(c,i){
   var m=meta(i,c); if(!m.lo||m.h&&false) return;
   var inCl=inClass(m,cl); if(!inCl) return;
   var o={i:i,c:c,m:m}; all.push(o);
   if(p>=m.lo-1&&p<=m.hi+1) tight.push(o);
  });
  return tight.length?tight:all;
 }
 var optLabel=function(o){ return o.c.name+" - "+paxTxt(o.m)+" pax"+(o.m.ac===1?" - AC":o.m.ac===0?" - Non-AC":"")+(tierTag(o.m)?" - "+tierTag(o.m):""); };
 function fillSelect(sel,p,current){
  var list=p>=1?suitable(p):[], h='<option value="">- '+E(BL("Not chosen / not listed","തിരഞ്ഞെടുത്തിട്ടില്ല / ലിസ്റ്റിലില്ല"))+' -</option>', seen=false;
  list.forEach(function(o){ if(String(o.i)===String(current)) seen=true; h+='<option value="'+o.i+'"'+(String(o.i)===String(current)?" selected":"")+'>'+E(optLabel(o))+'</option>'; });
  if(current!==""&&current!=null&&!seen){ var c=cats()[+current]; h+='<option value="'+E(current)+'" selected>'+E((c?c.name:"#"+current)+" ("+BL("current","നിലവിലെ")+")")+'</option>'; }
  sel.innerHTML=h;
 }
 function rcBoxHtml(selId,hintId){
  return '<div id="'+selId+'Box" style="border:1px solid #cfe0e3;border-radius:10px;padding:8px 10px;margin:8px 0;background:#f4fafb"><label>Rate Master category <span class="muted" style="font-weight:400">(customers search by this)</span><select id="'+selId+'"></select></label>'+
   '<div id="'+hintId+'" class="muted" style="font-size:11.5px;margin-top:3px">'+E(BL("Choose the category that matches your vehicle (it depends on the passenger seats you enter). Vehicles with a category get the requests for that category.","നിങ്ങളുടെ വാഹനത്തിന് ചേരുന്ന കാറ്റഗറി തിരഞ്ഞെടുക്കുക (നൽകുന്ന യാത്രക്കാരുടെ സീറ്റ് അനുസരിച്ച്). കാറ്റഗറി തിരഞ്ഞെടുത്ത വാഹനങ്ങൾക്ക് ആ കാറ്റഗറിയുടെ റിക്വസ്റ്റുകൾ ലഭിക്കും."))+'</div>'+discBox(true)+'</div>';
 }
 function wireForm(seatId,catId,selId,hintId,anchorEl,current){
  if(document.getElementById(selId)) return;
  anchorEl.insertAdjacentHTML("afterend",rcBoxHtml(selId,hintId));
  var sel=document.getElementById(selId), seat=document.getElementById(seatId);
  var redo=function(){ var p=parseInt(seat.value,10); fillSelect(sel,p>=1?p:0,sel.value||current||""); current=""; };
  redo();
  loadMeta().then(function(){ if(document.getElementById(selId)) redo(); });
  seat.addEventListener("input",redo);
 }
 var oldEditV=window.tcOpenEditVehicle;
 if(typeof oldEditV==="function") window.tcOpenEditVehicle=function(id){ window.__tcRcEditVid=id; return oldEditV.apply(this,arguments); };

 /* sends the chosen category together with the vehicle form */
 var oldFetch=window.fetch;
 var capture=window.__tcRcVeh=window.__tcRcVeh||{};
 window.fetch=function(input,init){
  var url="";
  try{ url=typeof input==="string"?input:(input&&input.url)||""; }catch(e){}
  try{
   if(init&&init.body&&typeof FormData!=="undefined"&&init.body instanceof FormData&&/\/api\/vehicles\?action=(register|update)/.test(url)){
    var s=document.getElementById("vRateCat")||document.getElementById("evRateCat");
    if(s){ var v=s.value, c=v!==""?cats()[+v]:null; init.body.set("rate_cat",v); init.body.set("rate_cat_name",c?c.name:""); }
   }
  }catch(e){}
  var p=oldFetch.apply(this,arguments);
  try{
   if(/\/api\/vehicles\?action=(pending|all)(&|$)/.test(url)){
    p.then(function(r){ return r.clone().json(); }).then(function(d){ if(d&&d.vehicles) d.vehicles.forEach(function(v){ capture[v.id]={rate_cat:v.rate_cat||"",rate_cat_name:v.rate_cat_name||"",seats:v.seats||0}; }); }).catch(function(){});
   }
  }catch(e){}
  return p;
 };

 /* ---- owner's vehicle list: show the category ---- */
 function decorateOwnerList(){
  var box=document.getElementById("myVehiclesList"); if(!box) return;
  var list=window._myVehicles||[]; if(!list.length) return;
  var taxi=((window._myPartner&&window._myPartner.business_type)||"taxi_travel")==="taxi_travel"; if(!taxi) return;
  box.querySelectorAll(".listitem").forEach(function(item){
   if(item.getAttribute("data-rc")) return;
   var b=item.querySelector("button[onclick^='tcOpenEditVehicle(']"); if(!b) return;
   var id=parseInt((b.getAttribute("onclick").match(/\((\d+)\)/)||[])[1],10), v=list.filter(function(x){ return x.id===id; })[0]; if(!v) return;
   item.setAttribute("data-rc","1");
   var html=v.rate_cat!=null&&v.rate_cat!==""?'<div style="margin:3px 0;font-size:12.5px"><span class="chip" style="background:#e3f3e8">Rate Master: <b>'+E(v.rate_cat_name||(cats()[+v.rate_cat]||{}).name||("#"+v.rate_cat))+'</b></span></div>'
    :'<div style="margin:3px 0;font-size:12.5px"><span class="chip" style="background:#fde8e8">'+E(BL("Choose the Rate Master category - tap Edit Vehicle","Rate Master കാറ്റഗറി തിരഞ്ഞെടുക്കുക - Edit Vehicle അമർത്തുക"))+'</span></div>';
   b.closest(".actions").insertAdjacentHTML("beforebegin",html);
  });
 }

 /* ---- admin: category on vehicle rows with a Change button ---- */
 function adminLine(vid,cat,name,seats){
  return '<div class="tcrc-adm" data-vid="'+vid+'" data-cat="'+E(cat)+'" data-catn="'+E(name)+'" data-seats="'+E(seats)+'" style="margin:3px 0;font-size:12.5px">'+adminLineInner(vid,cat,name,seats)+'</div>';
 }
 function adminLineInner(vid,cat,name,seats){
  return 'Rate Master: '+(cat!==""&&cat!=null?'<b>'+E(name||(cats()[+cat]||{}).name||("#"+cat))+'</b>':'<span style="color:#a12d2d">not chosen</span>')+' <button type="button" style="padding:3px 9px;font-size:12px" onclick="tcRcAdmEdit('+vid+')">'+(cat!==""&&cat!=null?"Change":"Set")+'</button>';
 }
 function decorateAdmin(){
  /* Pending Vehicles + All Vehicles (rows have Approve / Un-verify / Delete buttons that carry the vehicle number) */
  ["tcPendingVehicles","tcAllVehList"].forEach(function(cid){
   var box=document.getElementById(cid); if(!box) return;
   box.querySelectorAll(".listitem").forEach(function(item){
    if(item.getAttribute("data-rc")) return;
    var b=item.querySelector("button[onclick^='tcApproveVehicle('],button[onclick^='tcUnverifyVehicle('],button[onclick^='tcDeleteVehicle(']"); if(!b) return;
    var id=parseInt((b.getAttribute("onclick").match(/\((\d+)\)/)||[])[1],10), v=capture[id]; if(!v||!(v.seats>=2)) return; /* taxi/travel vehicles have seats */
    item.setAttribute("data-rc","1");
    var a=item.querySelector(".actions"); if(a) a.insertAdjacentHTML("beforebegin",adminLine(id,v.rate_cat,v.rate_cat_name,v.seats));
   });
  });
  /* Pending Approvals (tc-regdocs.js leaves an empty marker per vehicle) */
  document.querySelectorAll(".tcrc-mark:not([data-rc])").forEach(function(m){
   m.setAttribute("data-rc","1");
   m.innerHTML=adminLine(m.getAttribute("data-vid"),m.getAttribute("data-cat"),m.getAttribute("data-catn"),m.getAttribute("data-seats"));
  });
 }
 window.tcRcAdmEdit=function(vid){
  var row=document.querySelector('.tcrc-adm[data-vid="'+vid+'"]'); if(!row) return;
  var seats=parseInt(row.getAttribute("data-seats"),10), p=seats>=2?seats-1:0;
  row.innerHTML='Rate Master: <select id="tcrcA'+vid+'" style="max-width:100%"></select> <button type="button" class="primary" style="padding:3px 9px;font-size:12px" onclick="tcRcAdmSave('+vid+')">Save</button> <button type="button" style="padding:3px 9px;font-size:12px" onclick="tcRcAdmCancel('+vid+')">Cancel</button>';
  var sel=document.getElementById("tcrcA"+vid);
  loadMeta().then(function(){ fillSelect(sel,p,row.getAttribute("data-cat")); });
 };
 window.tcRcAdmCancel=function(vid){
  var row=document.querySelector('.tcrc-adm[data-vid="'+vid+'"]'); if(!row) return;
  row.innerHTML=adminLineInner(vid,row.getAttribute("data-cat"),row.getAttribute("data-catn"),row.getAttribute("data-seats"));
 };
 window.tcRcAdmSave=async function(vid){
  var row=document.querySelector('.tcrc-adm[data-vid="'+vid+'"]'), sel=document.getElementById("tcrcA"+vid); if(!row||!sel) return;
  var v=sel.value, c=v!==""?cats()[+v]:null;
  try{
   var d=await (await fetch("/api/vehicles?action=set_rate_cat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:adminToken(),vehicle_id:vid,rate_cat:v,rate_cat_name:c?c.name:""})})).json();
   if(!d.ok){ say("Could not save"); return; }
   row.setAttribute("data-cat",v); row.setAttribute("data-catn",c?c.name:"");
   if(capture[vid]){ capture[vid].rate_cat=v; capture[vid].rate_cat_name=c?c.name:""; }
   row.innerHTML=adminLineInner(vid,v,c?c.name:"",row.getAttribute("data-seats")); say("Saved");
  }catch(e){ say("Network error"); }
 };

 /* ---- owner's trip alert: show the requested category ---- */
 var oldAlert=window.tcOpenTripAlertModal;
 if(typeof oldAlert==="function") window.tcOpenTripAlertModal=async function(alertId){
  var r=await oldAlert.apply(this,arguments);
  try{
   var list=window._tcPendingTripAlerts||[], body=document.getElementById("modalBody");
   var tl=function(a){ return a.rate_cat_label?'<div style="margin:4px 0;padding:6px 9px;border-radius:9px;background:#fff3d6;border:1px solid #ecd9a0;font-size:13px;display:inline-block"><b>'+E(a.rate_cat_label)+'</b>'+(a.rate_trip?' · '+E(tripName(a.rate_trip)):'')+'</div>':""; };
   var single=alertId?list.filter(function(a){ return a.id===Number(alertId); })[0]:(list.length===1?list[0]:null);
   if(body&&single&&single.rate_cat_label){ var h=body.querySelector("h2"); if(h&&!body.querySelector(".tcrc-req")) h.insertAdjacentHTML("afterend",'<div class="tcrc-req" style="text-align:center">'+tl(single)+'</div>'); }
   else if(body&&!single){ var items=body.querySelectorAll(".listitem"); list.forEach(function(a,k){ if(items[k]&&a.rate_cat_label&&!items[k].querySelector(".tcrc-req")) items[k].insertAdjacentHTML("afterbegin",'<div class="tcrc-req">'+tl(a)+'</div>'); }); }
  }catch(e){}
  return r;
 };

 /* ================= ADMIN: Rate Master > Customer vehicle details ================= */
 window.tcRcAdmin=function(){ requireAdmin(function(){ modal('<div style="text-align:center;padding:12px"><div class="spinner" style="margin:0 auto"></div></div>'); loadMeta(true).then(tcRcAdminRender); }); };
 function tcRcAdminRender(){
  var h='<h2>Customer vehicle details</h2><p class="muted" style="font-size:12.5px">What customers see when they choose a vehicle category in Find Nearby Vehicle, and which seat counts the vehicle form offers. Passengers = passenger seats without the driver. Up to 6 passengers = Motor Cab, 7 or more = Contract Carriage. A category with no passengers set is not shown to customers. The rates themselves are changed with Edit in the Rate Master.</p>'+
   '<div class="actions"><button class="primary" onclick="tcRcAdminSave()">Save all</button><button onclick="tcRcSeven()">+ Add 7-passenger versions</button></div>';
  cats().forEach(function(c,i){
   var m=meta(i,c);
   h+='<div class="listitem" style="padding:8px 10px"><b>'+E(c.name)+'</b> <span class="muted" style="font-size:11.5px">#'+i+'</span>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">'+
    '<label style="font-size:12px">Passengers from<input id="rcLo'+i+'" type="number" min="1" max="60" value="'+E(m.lo||"")+'"></label>'+
    '<label style="font-size:12px">to<input id="rcHi'+i+'" type="number" min="1" max="60" value="'+E(m.hi||"")+'"></label>'+
    '<label style="font-size:12px">AC<select id="rcAc'+i+'"><option value=""'+(m.ac==null?" selected":"")+'>Not shown</option><option value="1"'+(m.ac===1?" selected":"")+'>AC</option><option value="0"'+(m.ac===0?" selected":"")+'>Non-AC</option></select></label>'+
    '<label style="font-size:12px">Tag<select id="rcT'+i+'"><option value="o"'+(m.t==="o"?" selected":"")+'>Ordinary</option><option value="p"'+(m.t==="p"?" selected":"")+'>Premium</option><option value="l"'+(m.t==="l"?" selected":"")+'>Luxury</option></select></label></div>'+
    '<label style="flex-direction:row;align-items:center;gap:6px;font-size:12.5px;margin-top:5px"><input type="checkbox" id="rcH'+i+'"'+(m.h?" checked":"")+'> Hide from customers</label></div>';
  });
  h+='<div class="actions"><button class="primary" onclick="tcRcAdminSave()">Save all</button><button onclick="closeModal()">Close</button></div>';
  modal(h);
 }
 window.tcRcAdminSave=async function(){
  var meta2={};
  cats().forEach(function(c,i){
   var lo=parseInt((document.getElementById("rcLo"+i)||{}).value,10), hi=parseInt((document.getElementById("rcHi"+i)||{}).value,10), ac=(document.getElementById("rcAc"+i)||{}).value, t=(document.getElementById("rcT"+i)||{}).value, hd=(document.getElementById("rcH"+i)||{}).checked;
   var o={};
   if(lo>=1){ o.lo=lo; o.hi=hi>=lo?hi:lo; }
   if(ac==="1"||ac==="0") o.ac=+ac;
   if(t==="p"||t==="l"||t==="o") o.t=t;
   if(hd) o.h=1;
   meta2[String(i)]=o;
  });
  try{
   var d=await (await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"rc_meta_set",token:adminToken(),meta:meta2})})).json();
   if(!d.ok){ say(d.error==="unauthorized"?"Admin password expired - open Customer vehicle details again":"Could not save"); return; }
   srv=meta2; metaAt=Date.now(); try{ localStorage.setItem(META_LS,JSON.stringify(srv)); }catch(e){}
   say("Saved - customers see the new details"); closeModal();
  }catch(e){ say("Network error"); }
 };
 /* copy 6-passenger categories into 7-passenger (Contract Carriage) versions with higher rates */
 window.tcRcSeven=function(){
  var cand=[];
  cats().forEach(function(c,i){
   var m=meta(i,c); if(m.lo!==6||m.hi!==6) return;
   var nm=c.name+" - 7 passengers"; if(cats().some(function(x){ return x.name===nm; })) return;
   cand.push({i:i,c:c,pre:/jeep|muv|suv|innova|crysta|hycross/i.test(c.name)});
  });
  var h='<h2>Add 7-passenger versions</h2><p class="muted" style="font-size:12.5px">A vehicle with 7 passengers + driver is a Contract Carriage and charges the higher rate. This adds a copy of each ticked category named "<i>name</i> - 7 passengers" at the END of the Rate Master (existing numbers do not change), with all rates raised by the percentage below. Check and edit the new rates afterwards with Edit.</p>';
  if(!cand.length) h+='<p class="muted">Nothing to add: no 6-passenger category without a 7-passenger version.</p>';
  else{
   h+='<label>Raise rates by (%)<input id="rcPct" type="number" value="10" min="0" max="100"></label>';
   cand.forEach(function(x){ h+='<label style="flex-direction:row;align-items:center;gap:7px;font-size:13px;margin-top:6px"><input type="checkbox" class="rcSev" data-i="'+x.i+'"'+(x.pre?" checked":"")+'> '+E(x.c.name)+'</label>'; });
   h+='<div class="actions"><button class="primary" onclick="tcRcSevenDo()">Add selected</button>';
  }
  h+='<button onclick="tcRcAdmin()">&larr; Back</button></div>';
  modal(h);
 };
 window.tcRcSevenDo=async function(){
  var pct=parseFloat((document.getElementById("rcPct")||{}).value)||0, picks=[].slice.call(document.querySelectorAll(".rcSev:checked")).map(function(e){ return +e.getAttribute("data-i"); });
  if(!picks.length){ say("Tick at least one category"); return; }
  var f=1+pct/100, up=function(r){ return {rate:Math.round(r.rate*f/10)*10,incKm:r.incKm,incHours:r.incHours,addKm:Math.round(r.addKm*f),addHour:Math.round(r.addHour*f)}; };
  var base=cats().length, add=[];
  picks.forEach(function(i){
   var c=cats()[i], n={name:c.name+" - 7 passengers",driverBata:c.driverBata||0};
   ["standard","competitive","safety","drop","local"].forEach(function(k){ n[k]=c[k]?up(c[k]):c[k]; });
   add.push({i:i,n:n});
  });
  var m2={}; var cur=srv||{};
  Object.keys(cur).forEach(function(k){ m2[k]=cur[k]; });
  add.forEach(function(x,k){
   var mm=meta(x.i,cats()[x.i]), idx=base+k;
   db.categories.push(x.n);
   var o={lo:7,hi:7,t:mm.t||"o"}; if(mm.ac===0||mm.ac===1) o.ac=mm.ac; m2[String(idx)]=o;
  });
  /* keep the guessed details of the existing categories too */
  cats().forEach(function(c,i){ if(!m2[String(i)]&&i<base){ var mm=meta(i,c), o={}; if(mm.lo){ o.lo=mm.lo; o.hi=mm.hi; } if(mm.ac===0||mm.ac===1) o.ac=mm.ac; o.t=mm.t||"o"; if(mm.h) o.h=1; m2[String(i)]=o; } });
  try{ save(); }catch(e){}
  try{ await pushConfigToServer(); }catch(e){}
  try{
   var d=await (await fetch("/api/trip_alerts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"rc_meta_set",token:adminToken(),meta:m2})})).json();
   if(d.ok){ srv=m2; metaAt=Date.now(); try{ localStorage.setItem(META_LS,JSON.stringify(srv)); }catch(e){} }
  }catch(e){}
  say(add.length+" categories added - now edit their rates in the Rate Master");
  tcRcAdminRender();
 };
 /* deleting renumbers the categories after it: ask twice and point to Hide */
 var oldDel=window.deleteCat;
 if(typeof oldDel==="function") window.deleteCat=function(i){
  if(!confirm("Warning: vehicles and customer searches use the category NUMBER, and deleting a category renumbers all the ones after it. Prefer 'Hide from customers' (Customer vehicle details). Delete anyway?")) return;
  return oldDel.apply(this,arguments);
 };

 /* ---- page-level bits that appear when screens open ---- */
 function inject(){
  /* vehicle forms (Taxi / Travel only: they have the passenger seats box) */
  var cn=document.getElementById("vCatNew"), vs=document.getElementById("vSeats");
  if(cn&&vs&&!document.getElementById("vRateCat")){ var prev=document.getElementById("vSeatsPrev"); wireForm("vSeats","vCatNew","vRateCat","vRateHint",prev||cn.closest(".grid"),""); }
  var ec=document.getElementById("evCat"), es=document.getElementById("evSeats");
  if(ec&&es&&!document.getElementById("evRateCat")){
   var vid=window.__tcRcEditVid, v=(window._myVehicles||[]).filter(function(x){ return x.id===vid; })[0];
   wireForm("evSeats","evCat","evRateCat","evRateHint",ec.closest(".grid"),v&&v.rate_cat!=null?v.rate_cat:"");
  }
  /* Rate Master page */
  var add=document.querySelector("button[onclick='addCat()']");
  if(add&&!document.getElementById("tcRcBtn")){ add.parentNode.insertAdjacentHTML("beforeend",'<button id="tcRcBtn" onclick="tcRcAdmin()">Customer vehicle details</button>'); }
  /* owner registration */
  var reg=document.querySelector("button[onclick='submitPartnerRegister()']");
  if(reg&&!document.getElementById("tcRcRegDisc")) reg.insertAdjacentHTML("beforebegin",discBox(true,"tcRcRegDisc"));
  decorateOwnerList(); decorateAdmin();
 }
 var timer=null;
 function later(){ clearTimeout(timer); timer=setTimeout(function(){ try{ inject(); }catch(e){} },80); }
 function start(){ if(!window.MutationObserver||!document.body) return; new MutationObserver(later).observe(document.body,{childList:true,subtree:true}); later(); loadMeta(); }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
