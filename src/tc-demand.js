/* Demand report (tc-demand.js, loaded by tc-regdocs.js).  PHASE 3 of the enquiry / booking module.
   Page #demand (button "Demand report" on the Enquiries and Booking Schedule pages).
   Reads db.enquiries, db.bookings, db.quotes and the Trip & Accounts book - stores nothing except one flag:
     enquiry.allBusy = true  when, at the moment the enquiry was saved, EVERY own vehicle was already booked on the
     required date (= demand we could not serve with our own vehicles, even if a partner then took it).
   Shows for a chosen period (by the day the enquiry was entered):
     - totals: enquiries / booked / lost / open and conversion %
     - per Rate Master category: enquiries, booked, lost, open, conversion, revenue (quoted fare of booked trips), profit (from the book)
     - why enquiries were lost (reason counts)
     - UNMET DEMAND per category: lost because no vehicle was free + days when all own vehicles were busy, with an approximate
       value and a plain hint when a category keeps running short (= think of one more vehicle)
     - source: direct vs through someone (per person: enquiries, booked, commission to pay / paid)
     - which weekdays the customers want (by required date)
   Nothing here changes any record. */
(function(){
 if(window.__tcDemand) return;
 if(typeof window.render!=="function") return;
 window.__tcDemand=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var M=function(n){ try{ return money(n); }catch(e){ return "Rs."+n; } };
 function p2(n){ return String(n).padStart(2,"0"); }
 function ymd(d){ return d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate()); }
 function today(){ return ymd(new Date()); }
 function dF(x){ try{ return tcFormatDate(x); }catch(e){ return x||""; } }
 function enqDay(e){ return String(e.entryDate||e.created||"").slice(0,10); }
 var P={p:"month"};
 var REASONS={price:["Price too high","വില കൂടുതൽ"],busy:["Vehicle not free","വാഹനം ഒഴിവില്ല"],date:["Date mismatch","തീയതി ശരിയായില്ല"],cancel:["Customer cancelled","കസ്റ്റമർ ഒഴിവാക്കി"],other:["Other","മറ്റുള്ളവ"],none:["No reason noted","കാരണം രേഖപ്പെടുത്തിയിട്ടില്ല"]};

 function range(p){
  var n=new Date(), y=n.getFullYear(), m=n.getMonth();
  if(p==="month") return [ymd(new Date(y,m,1)),ymd(new Date(y,m+1,0))];
  if(p==="last") return [ymd(new Date(y,m-1,1)),ymd(new Date(y,m,0))];
  if(p==="3m") return [ymd(new Date(y,m-2,1)),ymd(new Date(y,m+1,0))];
  if(p==="year") return [y+"-01-01",y+"-12-31"];
  return ["0000-01-01","9999-12-31"];
 }
 function bkOf(e){ return (db.bookings||[]).filter(function(b){ return b.enquiryId===e.id&&b.status!=="cancelled"; })[0]||null; }
 function outcome(e){ return e.outcome||(bkOf(e)?"booked":"open"); }
 function catKey(e,b){
  var id=e.categoryId; if(id==null||id==="") id=b&&b.categoryId;
  if(id==null||id===""){ var q=(db.quotes||[]).filter(function(x){ return x.enquiryId===e.id; })[0]; if(q) id=q.categoryId; }
  return (id==null||id===""||!(db.categories||[])[+id])?"none":String(+id);
 }
 function catName(k){ return k==="none"?B("Category not set","വിഭാഗം രേഖപ്പെടുത്തിയിട്ടില്ല"):((db.categories||[])[+k]||{}).name||k; }
 function profitOf(b){
  try{
   var a=window.__tcAbApi; if(!a||!b||!b.tripId) return null;
   var inc=0,out=0,any=false;
   a.entries().forEach(function(x){ if(x.tripId!==b.tripId||a.isDrv(x)) return; any=true; if(x.type==="in") inc+=+x.amount||0; else out+=+x.amount||0; });
   return any?inc-out:null;
  }catch(e){ return null; }
 }
 function compute(){
  var r=range(P.p);
  var list=(db.enquiries||[]).filter(function(e){ var d=enqDay(e); return d>=r[0]&&d<=r[1]; });
  var T={n:list.length,booked:0,lost:0,open:0}, cats={}, reasons={}, src={direct:{n:0,booked:0},via:{}}, wd=[0,0,0,0,0,0,0], busyDays={};
  function C(k){ return cats[k]||(cats[k]={n:0,booked:0,lost:0,open:0,rev:0,revN:0,prof:0,profN:0,busyLost:0,allBusy:0}); }
  list.forEach(function(e){
   var o=outcome(e), b=bkOf(e), k=catKey(e,b), c=C(k);
   c.n++; T[o]++; c[o]++;
   if(o==="lost"){ var rs=e.lostReason||"none"; reasons[rs]=(reasons[rs]||0)+1; if(rs==="busy") c.busyLost++; }
   if(e.allBusy){ c.allBusy++; if(e.date) busyDays[e.date]=(busyDays[e.date]||0)+1; }
   if(b){
    var q=b.quoteId?(db.quotes||[]).filter(function(x){ return x.id===b.quoteId; })[0]:null;
    if(q&&+q.quotedAmount>0){ c.rev+=+q.quotedAmount; c.revN++; }
    var pf=profitOf(b); if(pf!==null){ c.prof+=pf; c.profN++; }
   }
   if(e.source==="via"){
    var nm=e.viaName||"?"; var g=src.via[nm]||(src.via[nm]={n:0,booked:0,comm:0,paid:0});
    g.n++; if(o==="booked") g.booked++;
    if(b){ g.paid+=(b.commPaid||[]).reduce(function(s,x){ return s+(+x.amount||0); },0); }
    var cm=+e.commAmount||0; if(!cm&&e.commPct>0&&b&&b.quoteId){ var q2=(db.quotes||[]).filter(function(x){ return x.id===b.quoteId; })[0]; if(q2&&q2.quotedAmount) cm=Math.round(q2.quotedAmount*e.commPct)/100; }
    if(o==="booked") g.comm+=cm;
   }else{ src.direct.n++; if(o==="booked") src.direct.booked++; }
   if(e.date){ try{ wd[new Date(e.date+"T12:00:00").getDay()]++; }catch(x){} }
  });
  return {T:T,cats:cats,reasons:reasons,src:src,wd:wd,busyDays:busyDays,r:r};
 }
 function pct(a,b){ return b>0?Math.round(a*100/b)+"%":"-"; }
 function th(t,al){ return '<th style="padding:5px 6px;font-size:11.5px;text-align:'+(al||"right")+';white-space:nowrap;border-bottom:2px solid #cfd8de">'+E(t)+'</th>'; }
 function td(t,al,st){ return '<td style="padding:5px 6px;font-size:12.5px;text-align:'+(al||"right")+';border-bottom:1px solid #eef1f3;'+(st||"")+'">'+t+'</td>'; }
 function box(title,inner){ return '<div style="border:1px solid #d7dfe4;border-radius:12px;padding:9px 10px;margin:10px 0;background:#fff"><div style="font-weight:800;font-size:14px;margin-bottom:6px">'+title+'</div>'+inner+'</div>'; }

 function html(){
  var d=compute(), T=d.T, h="";
  var opts=[["month",B("This month","ഈ മാസം")],["last",B("Last month","കഴിഞ്ഞ മാസം")],["3m",B("Last 3 months","കഴിഞ്ഞ 3 മാസം")],["year",B("This year","ഈ വർഷം")],["all",B("All","എല്ലാം")]];
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">'+opts.map(function(o){
   return '<button onclick="tcDemandSet(\''+o[0]+'\')" style="padding:5px 11px;font-size:12.5px;'+(P.p===o[0]?'background:#0b6b7a;color:#fff;border-color:#0b6b7a':'')+'">'+E(o[1])+'</button>';
  }).join("")+'</div><div class="muted" style="font-size:12px">'+E(B("By the day the enquiry was entered","എൻക്വയറി ചേർത്ത ദിവസം അനുസരിച്ച്"))+'</div>';
  /* totals */
  var tile=function(n,l,c){ return '<div style="flex:1 1 70px;text-align:center;border-radius:10px;background:'+c+';padding:7px 2px"><div style="font-size:20px;font-weight:800">'+n+'</div><div style="font-size:11.5px">'+E(l)+'</div></div>'; };
  h+='<div style="display:flex;gap:6px;margin:8px 0;flex-wrap:wrap">'+tile(T.n,B("Enquiries","എൻക്വയറി"),"#e8f1fb")+tile(T.booked,B("Booked","ബുക്ക്ഡ്"),"#e8f4ea")+tile(T.lost,B("Lost","നഷ്ടം"),"#fdecec")+tile(T.open,B("Open","തുറന്നത്"),"#fff4e0")+tile(pct(T.booked,T.n),B("Converted","ബുക്ക് ആയത്"),"#eef0f6")+'</div>';
  if(!T.n) return h+'<p class="muted">'+E(B("No enquiries in this period.","ഈ കാലയളവിൽ എൻക്വയറികൾ ഇല്ല."))+'</p>';
  /* categories */
  var keys=Object.keys(d.cats).sort(function(a,b){ return d.cats[b].n-d.cats[a].n; });
  var tb='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><tr>'+th(B("Category","വിഭാഗം"),"left")+th(B("Enq","എൻക്വ"))+th(B("Booked","ബുക്ക്ഡ്"))+th(B("Lost","നഷ്ടം"))+th("%")+th(B("Revenue","വരുമാനം"))+th(B("Profit","ലാഭം"))+'</tr>';
  keys.forEach(function(k){
   var c=d.cats[k];
   tb+='<tr>'+td('<b>'+E(catName(k))+'</b>',"left")+td(c.n)+td(c.booked)+td(c.lost)+td(pct(c.booked,c.n))+td(c.revN?M(c.rev):"-")+td(c.profN?M(c.prof):"-")+'</tr>';
  });
  tb+='</table></div><div class="muted" style="font-size:11.5px">'+E(B("Revenue = quoted fare of booked trips. Profit = from the Trip & Accounts book (only where the trip is linked).","വരുമാനം = ബുക്ക് ആയ ട്രിപ്പുകളുടെ ക്വട്ടേഷൻ തുക. ലാഭം = ട്രിപ്പ് & അക്കൗണ്ട്സ് ബുക്കിൽ നിന്ന് (ട്രിപ്പ് ബന്ധിപ്പിച്ചിടത്ത് മാത്രം)."))+'</div>';
  h+=box('🚖 '+E(B("By vehicle category (Rate Master)","വാഹന വിഭാഗം അനുസരിച്ച് (Rate Master)")),tb);
  /* unmet demand */
  var allRev=0,allRevN=0; keys.forEach(function(k){ allRev+=d.cats[k].rev; allRevN+=d.cats[k].revN; });
  var un="", hints="", any=false;
  keys.forEach(function(k){
   var c=d.cats[k], n=c.busyLost+c.allBusy; if(!n) return; any=true;
   var avg=c.revN?c.rev/c.revN:(allRevN?allRev/allRevN:0);
   un+='<tr>'+td('<b>'+E(catName(k))+'</b>',"left")+td(c.busyLost)+td(c.allBusy)+td(avg?"≈ "+M(Math.round(avg*n)):"-")+'</tr>';
   if(k!=="none"&&n>=3) hints+='<div style="margin-top:5px;padding:6px 8px;border-radius:8px;background:#fff4e0;font-size:12.5px">💡 <b>'+E(catName(k))+'</b>: '+E(B(n+" times customers wanted this category but no vehicle was free. If it keeps happening, another vehicle (or a regular partner) in this category would earn more.",n+" തവണ ഈ വിഭാഗത്തിലെ വാഹനം ആവശ്യപ്പെട്ടിട്ട് ഒഴിവുണ്ടായിരുന്നില്ല. ഇത് തുടരുന്നെങ്കിൽ ഈ വിഭാഗത്തിൽ ഒരു വാഹനം കൂടി (അല്ലെങ്കിൽ സ്ഥിരം പാർട്ണർ) കൂടുതൽ വരുമാനം തരും."))+'</div>';
  });
  var bd=Object.keys(d.busyDays).sort(function(a,b){ return d.busyDays[b]-d.busyDays[a]||a.localeCompare(b); }).slice(0,5);
  if(any){
   var ut='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><tr>'+th(B("Category","വിഭാഗം"),"left")+th(B("Lost: no vehicle","വാഹനം ഇല്ലാതെ നഷ്ടം"))+th(B("All busy that day","അന്ന് എല്ലാം ബുക്ക്"))+th(B("Approx. value","ഏകദേശ മൂല്യം"))+'</tr>'+un+'</table></div>';
   if(bd.length) ut+='<div style="font-size:12.5px;margin-top:6px">'+E(B("Days when all own vehicles were already booked: ","എല്ലാ സ്വന്തം വാഹനവും ബുക്ക് ആയിരുന്ന ദിവസങ്ങൾ: "))+bd.map(function(x){ return E(dF(x))+' ('+d.busyDays[x]+')'; }).join(", ")+'</div>';
   h+=box('⛔ '+E(B("Unmet demand - customers we could not serve","നമുക്ക് സേവിക്കാൻ കഴിയാത്ത ആവശ്യം")),ut+hints);
  }else{
   h+=box('⛔ '+E(B("Unmet demand","സേവിക്കാൻ കഴിയാത്ത ആവശ്യം")),'<div class="muted" style="font-size:12.5px">'+E(B("None in this period - no enquiry was lost for want of a vehicle. (An enquiry is counted when you mark it Lost with 'Vehicle not free', or when you save it for a day on which every own vehicle is already booked.)","ഈ കാലയളവിൽ വാഹനമില്ലാത്തതുകൊണ്ട് നഷ്ടമായ എൻക്വയറി ഇല്ല. ('വാഹനം ഒഴിവില്ല' എന്ന് Lost ആക്കുമ്പോഴോ, എല്ലാ സ്വന്തം വാഹനവും ബുക്ക് ആയ ദിവസത്തേക്ക് എൻക്വയറി സേവ് ചെയ്യുമ്പോഴോ ഇത് കണക്കാക്കും.)"))+'</div>');
  }
  /* reasons */
  var rk=Object.keys(d.reasons).sort(function(a,b){ return d.reasons[b]-d.reasons[a]; });
  if(rk.length){
   var mx=d.reasons[rk[0]];
   h+=box('✖ '+E(B("Why enquiries were lost","എൻക്വയറി നഷ്ടമായ കാരണങ്ങൾ")),rk.map(function(k){
    var l=REASONS[k]||[k,k];
    return '<div style="display:flex;align-items:center;gap:6px;margin:3px 0;font-size:12.5px"><div style="flex:0 0 120px">'+E(B(l[0],l[1]))+'</div><div style="flex:1;background:#f0f3f5;border-radius:6px;height:12px"><div style="width:'+Math.round(d.reasons[k]*100/mx)+'%;background:#d9777a;height:12px;border-radius:6px"></div></div><b style="flex:0 0 28px;text-align:right">'+d.reasons[k]+'</b></div>';
   }).join(""));
  }
  /* source */
  var vk=Object.keys(d.src.via).sort(function(a,b){ return d.src.via[b].n-d.src.via[a].n; });
  var st='<div style="font-size:12.5px">☎ '+E(B("Direct","നേരിട്ട്"))+': <b>'+d.src.direct.n+'</b> · '+E(B("booked","ബുക്ക്ഡ്"))+' '+d.src.direct.booked+' ('+pct(d.src.direct.booked,d.src.direct.n)+')</div>';
  if(vk.length){
   st+='<div style="overflow-x:auto;margin-top:4px"><table style="width:100%;border-collapse:collapse"><tr>'+th(B("Through","വഴി"),"left")+th(B("Enq","എൻക്വ"))+th(B("Booked","ബുക്ക്ഡ്"))+th(B("Commission due","കമ്മീഷൻ"))+th(B("Paid","കൊടുത്തത്"))+'</tr>'+vk.map(function(k){ var g=d.src.via[k]; return '<tr>'+td('👤 '+E(k),"left")+td(g.n)+td(g.booked)+td(g.comm?M(g.comm):"-")+td(g.paid?M(g.paid):"-")+'</tr>'; }).join("")+'</table></div>';
  }
  h+=box('🔀 '+E(B("Where enquiries come from","എൻക്വയറികൾ എവിടെ നിന്ന്")),st);
  /* weekdays */
  var names=B("Sun,Mon,Tue,Wed,Thu,Fri,Sat","ഞായർ,തിങ്കൾ,ചൊവ്വ,ബുധൻ,വ്യാഴം,വെള്ളി,ശനി").split(","), wmax=Math.max.apply(null,d.wd);
  if(wmax>0){
   h+=box('📅 '+E(B("Which days customers want (required date)","ഏത് ദിവസങ്ങളാണ് കസ്റ്റമർ ആവശ്യപ്പെടുന്നത്")),'<div style="display:flex;gap:4px;align-items:flex-end;height:80px">'+d.wd.map(function(n,i){
    return '<div style="flex:1;text-align:center;font-size:11px"><div style="font-weight:700">'+(n||"")+'</div><div style="background:'+(n===wmax?'#0b6b7a':'#9fc3cc')+';height:'+Math.max(2,Math.round(n*54/wmax))+'px;border-radius:4px 4px 0 0"></div>'+E(names[i])+'</div>';
   }).join("")+'</div>');
  }
  return h;
 }
 function page(){ app().innerHTML=card(B("Demand report","ഡിമാൻഡ് റിപ്പോർട്ട്"),'<div id="tcDemandBox">'+html()+'</div>'); }
 var origRender=window.render;
 window.render=function(){
  try{
   if(location.hash==="#demand"){
    var u=null; try{ u=getCurrentUser(); }catch(e){}
    if(u&&u.role==="owner"){ page(); return; }
   }
  }catch(e){}
  return origRender.apply(this,arguments);
 };
 window.tcDemand=function(){ view("demand"); };
 window.tcDemandSet=function(p){ P.p=p; var b=document.getElementById("tcDemandBox"); if(b) b.innerHTML=html(); else page(); };

 /* flag demand we could not serve with our own vehicles: every own vehicle already booked on the required date */
 ["saveEnquiry","saveQuickAsEnquiry"].forEach(function(n){
  var o=window[n]; if(typeof o!=="function") return;
  window[n]=function(){
   var before=(db.enquiries||[]).length;
   var r=o.apply(this,arguments);
   try{
    if((db.enquiries||[]).length>before){
     var e=db.enquiries[0], api=window.__tcEnqApi;
     if(e&&e.date&&api&&api.allBusyOn&&api.allBusyOn(e.date)){ e.allBusy=true; try{ save(); }catch(x){} }
    }
   }catch(er){}
   return r;
  };
 });
})();
