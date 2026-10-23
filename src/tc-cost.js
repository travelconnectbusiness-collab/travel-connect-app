/* Profit check with cost settings (tc-cost.js, loaded by tc-regdocs.js after tc-odo.js).
   Under the fare box of the Quotation form and of Quick Bill a small "Profit check" box shows, before the trip is accepted:
     fare - estimated cost (fuel + driver share + maintenance + depreciation + permit/tax) = expected profit and margin %,
     a green / amber / red verdict against the owner's target margin, and the lowest fare that still gives that margin.
   COST SETTINGS (tap "Cost settings" in the box; kept in db.settings.cost, so they ride along with the normal backup):
     mileage km/L (default 12), diesel price Rs/L (95), driver share % of the fare (20), maintenance Rs/km (4.0),
     depreciation Rs/km (2.8), permit/tax Rs/km (1.0), target margin % (15), and an on/off switch.
   If the vehicle number typed in the form belongs to a vehicle with a real mileage from the Odometer module (tc-odo.js), that
   real km/L is used instead of the default and the box says so.
   DIESEL BY KM: if the vehicle (matched by number) has a real diesel cost per KM worked out by the Odometer module (tc-odo.js:
   between full-tank fills, using the odometer or - no meter needed - the trip KM of the bills), the fuel line is KM x that real
   Rs/km, so it does not matter on which day the tank was paid for.
   The same figure adds a line "Profit (diesel by KM)" to every Trip card and trip detail pop-up (tc-tripcards.js): the card's profit
   with the diesel entries linked to the trip taken out and KM x real Rs/km put in. The card's own profit is not changed.
   Uses the trip KM typed in the form (the running km, not the return empty km) and the fare WITHOUT GST. It is an estimate only;
   nothing is saved with the quote or the bill. */
(function(){
 if(window.__tcCost) return;
 window.__tcCost=1;
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 var $=function(id){ return document.getElementById(id); };
 var DEF={mileage:12,fuel:95,drv:20,maint:4,dep:2.8,permit:1,target:15};
 var HOSTS=[{res:"qCalc",km:"qKm",veh:"qVehicleNo",id:"tcPcQ"},{res:"qbResult",km:"qbKm",veh:"qbVehicleNo",id:"tcPcQb"}];
 var mny=function(n){ n=Math.round((+n||0)); try{ return (n<0?"-":"")+money(Math.abs(n)); }catch(e){ return "Rs."+n; } };
 var n1=function(n){ return String(Math.round((+n||0)*10)/10); };
 function pn(x,d){ var v=parseFloat(x); return isNaN(v)||v<0?d:v; }
 function cfg(){
  var c=(db&&db.settings&&db.settings.cost)||{};
  return {mileage:pn(c.mileage,DEF.mileage)||DEF.mileage,fuel:pn(c.fuel,DEF.fuel),drv:Math.min(90,pn(c.drv,DEF.drv)),maint:pn(c.maint,DEF.maint),dep:pn(c.dep,DEF.dep),permit:pn(c.permit,DEF.permit),target:Math.min(80,pn(c.target,DEF.target)),on:c.on!==false};
 }
 /* the pure arithmetic (also used by the test) */
 function calc(fare,km,mileage,c,perKm){
  var fuel=perKm>0?km*perKm:km/mileage*c.fuel, drv=fare*c.drv/100, fixed=km*(c.maint+c.dep+c.permit);
  var cost=fuel+drv+fixed, profit=fare-cost, margin=fare>0?profit/fare*100:0;
  var den=1-c.drv/100-c.target/100, minFare=den>0.01?(fuel+fixed)/den:0;
  return {fuel:fuel,drv:drv,fixed:fixed,cost:cost,profit:profit,margin:margin,minFare:minFare,perKm:km>0?cost/km:0};
 }
 window.tcCostCalc=function(fare,km,mileage,perKm){ return calc(+fare,+km,+mileage||cfg().mileage,cfg(),+perKm||0); };
 function fareOf(res){
  var t=res.querySelector(".total"); if(!t) return 0;
  var m=/([\d,]+(?:\.\d+)?)\s*$/.exec(t.textContent||""); var fare=m?parseFloat(m[1].replace(/,/g,"")):0;
  Array.prototype.forEach.call(res.children,function(d){
   var x=(d.textContent||"").trim();
   if(/^GST/i.test(x)){ var g=/\+\s*₹?\s*([\d,]+(?:\.\d+)?)\s*$/.exec(x); if(g) fare-=parseFloat(g[1].replace(/,/g,"")); }
  });
  return fare>0?fare:0;
 }
 function panelHtml(h,c){
  var res=h.resEl, fare=fareOf(res), km=parseFloat(($(h.km)||{}).value)||0;
  if(!(fare>0)||!(km>0)) return "";
  var vno=($(h.veh)||{}).value||"", real=0, rk=0;
  try{ var fu=(window.__tcOdoApi&&vno)?window.__tcOdoApi.fuel(vno):null; if(fu){ real=fu.avg; rk=fu.perKm; } }catch(e){}
  var mil=real>0?real:c.mileage, r=calc(fare,km,mil,c,rk);
  var col=r.profit<0?"#a12d2d":(r.margin<c.target?"#a15a00":"#1c6b2c");
  var bg=r.profit<0?"#fdeceb":(r.margin<c.target?"#fff6e5":"#eaf6ec");
  var verdict=r.profit<0?B("LOSS at this fare","ഈ തുകയ്ക്ക് നഷ്ടം"):(r.margin<c.target?B("Low profit (below your "+n1(c.target)+"% target)","ലാഭം കുറവ് (നിങ്ങളുടെ "+n1(c.target)+"% ലക്ഷ്യത്തിൽ താഴെ)"):B("Good profit","നല്ല ലാഭം"));
  var row=function(l,x){ return '<div style="display:flex;justify-content:space-between;gap:8px"><span>'+E(l)+'</span><span>'+x+'</span></div>'; };
  return '<div style="font-weight:700;color:'+col+'">&#128200; '+E(B("Profit check","ലാഭ പരിശോധന"))+' - '+E(verdict)+'</div>'+
   '<div style="font-size:13px;margin-top:4px">'+
   row(B("Fare (without GST)","തുക (GST ഇല്ലാതെ)"),mny(fare))+
   row(rk>0?B("Fuel ("+n1(km)+" km x "+mny(rk)+"/km, your real diesel cost)","ഇന്ധനം ("+n1(km)+" km x "+mny(rk)+"/km, യഥാർത്ഥ ഡീസൽ ചെലവ്)"):B("Fuel ("+n1(km)+" km at "+n1(mil)+" km/L)","ഇന്ധനം ("+n1(km)+" km, "+n1(mil)+" km/L)"),"- "+mny(r.fuel))+
   row(B("Driver share "+n1(c.drv)+"%","ഡ്രൈവർ വിഹിതം "+n1(c.drv)+"%"),"- "+mny(r.drv))+
   row(B("Maintenance + depreciation + permit","മെയിന്റനൻസ് + തേയ്മാനം + പെർമിറ്റ്"),"- "+mny(r.fixed))+
   '<div style="border-top:1px solid #ccc;margin-top:3px;padding-top:3px;font-weight:700;color:'+col+'">'+row(B("Expected profit","പ്രതീക്ഷിക്കുന്ന ലാഭം"),mny(r.profit)+" ("+n1(r.margin)+"%)")+'</div></div>'+
   (r.minFare>0&&r.profit<fare*c.target/100?'<div style="font-size:12.5px;margin-top:3px">'+E(B("Fare for "+n1(c.target)+"% profit: ","ലാഭം "+n1(c.target)+"% കിട്ടാൻ തുക: "))+'<b>'+mny(r.minFare)+'</b></div>':"")+
   '<div style="font-size:11.5px;margin-top:3px;color:#555">'+E(B("Estimate only. Cost per km "+mny(r.perKm)+". ","ഏകദേശ കണക്ക് മാത്രം. KM-ന് ചെലവ് "+mny(r.perKm)+". "))+'<a href="#" onclick="tcCostSettings();return false" style="color:#0b6b78;font-weight:700">&#9881; '+E(B("Cost settings","ചെലവ് സെറ്റിംഗ്സ്"))+'</a></div>';
 }
 function refresh(){
  var c=cfg();
  HOSTS.forEach(function(h){
   var res=$(h.res), pnl=$(h.id);
   if(!res){ if(pnl&&pnl.parentNode) pnl.parentNode.removeChild(pnl); return; }
   h.resEl=res;
   var html=c.on?panelHtml(h,c):"";
   if(!html){ if(pnl&&pnl.parentNode) pnl.parentNode.removeChild(pnl); return; }
   if(!pnl){
    pnl=document.createElement("div"); pnl.id=h.id; pnl.className="ratebox"; pnl.style.marginTop="8px";
    res.insertAdjacentElement("afterend",pnl);
   }
   var r=/(\-?\d+(?:\.\d+)?)%\)/.exec(html), loss=/LOSS|നഷ്ടം/.test(html), low=/Low profit|ലാഭം കുറവ്/.test(html);
   pnl.style.border="2px solid "+(loss?"#a12d2d":low?"#c9820d":"#1c6b2c");
   pnl.style.background=loss?"#fdeceb":low?"#fff6e5":"#eaf6ec";
   if(pnl.innerHTML!==html) pnl.innerHTML=html;
  });
 }
 /* ---- cost settings window (its own layer, so a Quick Bill form that is open underneath is not lost) ---- */
 window.tcCostSettings=function(){
  var old=$("tcPcSet"); if(old) old.parentNode.removeChild(old);
  var c=cfg(), o=document.createElement("div"); o.id="tcPcSet";
  o.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px";
  var f=function(id,l,v,st){ return '<label>'+E(l)+'<input id="'+id+'" type="number" inputmode="decimal" min="0" step="'+(st||"any")+'" value="'+E(v)+'"></label>'; };
  o.innerHTML='<div style="background:#fff;border-radius:12px;padding:14px;max-width:420px;width:100%"><h2 style="margin-top:0">&#9881; '+E(B("Cost settings","ചെലവ് സെറ്റിംഗ്സ്"))+'</h2>'+
   '<div class="muted" style="font-size:12.5px;margin-bottom:6px">'+E(B("Used only for the Profit check under the fare. A vehicle with a real mileage in the Odometer record uses that instead.","ഫെയറിന് താഴെയുള്ള ലാഭ പരിശോധനയ്ക്ക് മാത്രം. ഓഡോമീറ്റർ കണക്കിൽ യഥാർത്ഥ മൈലേജ് ഉള്ള വാഹനത്തിന് അതാണ് ഉപയോഗിക്കുക."))+'</div>'+
   '<div class="grid">'+f("pcMil",B("Mileage (km/L)","മൈലേജ് (km/L)"),c.mileage)+f("pcFuel",B("Diesel price (Rs/L)","ഡീസൽ വില (Rs/L)"),c.fuel)+f("pcDrv",B("Driver share (% of fare)","ഡ്രൈവർ വിഹിതം (% തുകയുടെ)"),c.drv)+
   f("pcMaint",B("Maintenance (Rs/km)","മെയിന്റനൻസ് (Rs/km)"),c.maint)+f("pcDep",B("Depreciation (Rs/km)","തേയ്മാനം (Rs/km)"),c.dep)+f("pcPermit",B("Permit / tax (Rs/km)","പെർമിറ്റ് / ടാക്സ് (Rs/km)"),c.permit)+
   f("pcTarget",B("Target profit (%)","ലക്ഷ്യ ലാഭം (%)"),c.target)+'</div>'+
   '<label style="flex-direction:row;display:flex;align-items:center;gap:8px;margin-top:6px"><input id="pcOn" type="checkbox" style="width:auto"'+(c.on?' checked':'')+'> '+E(B("Show the Profit check","ലാഭ പരിശോധന കാണിക്കുക"))+'</label>'+
   '<div class="actions"><button class="primary" onclick="tcCostSave()">'+E(B("Save","സേവ് ചെയ്യുക"))+'</button><button onclick="tcCostSettingsClose()">'+E(B("Cancel","റദ്ദാക്കുക"))+'</button></div></div>';
  document.body.appendChild(o);
 };
 window.tcCostSettingsClose=function(){ var o=$("tcPcSet"); if(o&&o.parentNode) o.parentNode.removeChild(o); };
 window.tcCostSave=function(){
  var g=function(id){ return parseFloat(($(id)||{}).value); };
  var mil=g("pcMil");
  if(!(mil>0)){ try{ toast(B("Mileage must be more than 0","മൈലേജ് 0-ൽ കൂടുതൽ വേണം")); }catch(e){} return; }
  db.settings=db.settings||{};
  db.settings.cost={mileage:mil,fuel:pn(g("pcFuel"),DEF.fuel),drv:Math.min(90,pn(g("pcDrv"),DEF.drv)),maint:pn(g("pcMaint"),DEF.maint),dep:pn(g("pcDep"),DEF.dep),permit:pn(g("pcPermit"),DEF.permit),target:Math.min(80,pn(g("pcTarget"),DEF.target)),on:!!($("pcOn")||{}).checked};
  try{ save(); }catch(e){}
  tcCostSettingsClose(); refresh();
  try{ toast(B("Saved","സേവ് ചെയ്തു")); }catch(e){}
 };
 /* ---- Trip cards: "Profit (diesel by KM)" ---- */
 function tripFigures(){
  var map={}; try{ ((window.__tcTrApi&&window.__tcTrApi.allTrips())||[]).forEach(function(x){ map[x.t.id]=x; }); }catch(e){}
  return map;
 }
 function dieselLine(x){
  try{
   var api=window.__tcOdoApi; if(!api) return "";
   var no=(x.q&&x.q.vehicleNo)||"", fu=api.fuel(x.vehId||"")||api.fuel(no); if(!fu) return "";
   var km=+x.t.actualKm||0; if(!(km>0)) return "";
   var linked=0; x.es.forEach(function(e){ if(e.type==="out"&&e.cat==="Fuel") linked+=(+e.amount||0); });
   var est=km*fu.perKm, p=x.profit+linked-est, col=p>=0?"#1c6b2c":"#a12d2d";
   return '<div class="tcPcDsl" style="font-size:12.5px;margin-top:3px;color:'+col+'">&#9981; '+E(B("Profit (diesel by KM)","ലാഭം (ഡീസൽ KM അനുസരിച്ച്)"))+': <b>'+mny(p)+'</b> <span class="muted" style="font-size:11.5px">'+E(B("diesel "+mny(est)+" = "+n1(km)+" km x "+mny(fu.perKm)+"/km","ഡീസൽ "+mny(est)+" = "+n1(km)+" km x "+mny(fu.perKm)+"/km"))+'</span></div>';
  }catch(e){ return ""; }
 }
 function tripCards(){
  var items=document.querySelectorAll('#app .listitem[onclick^="tcTrOpen("]'), map=null;
  Array.prototype.forEach.call(items,function(it){
   if(it.querySelector(".tcPcDsl")) return;
   var m=/tcTrOpen\('([^']+)'\)/.exec(it.getAttribute("onclick")||""); if(!m) return;
   if(!map) map=tripFigures();
   var x=map[m[1]]; if(!x) return;
   var h=dieselLine(x); if(h) it.insertAdjacentHTML("beforeend",h);
  });
  var mb=$("modalBody"), sh=mb&&mb.querySelector('button[onclick^="tcTrShare("]');
  if(mb&&sh&&!mb.querySelector(".tcPcDsl")){
   var id=(/tcTrShare\('([^']+)'\)/.exec(sh.getAttribute("onclick")||"")||[])[1];
   var tr=id?tripFigures()[id]:null;
   if(!tr){ var tt=(db.trips||[]).filter(function(t){ return t.id===id; })[0]; if(tt&&window.__tcTrApi&&window.__tcTrApi.one) tr=window.__tcTrApi.one(id); }
   var h2=tr?dieselLine(tr):"";
   var act=sh.parentNode;
   if(h2&&act) act.insertAdjacentHTML("beforebegin",'<div style="margin-top:8px">'+h2+'</div>');
  }
 }
 var t0=null;
 function later(){ clearTimeout(t0); t0=setTimeout(function(){ try{ refresh(); tripCards(); }catch(e){} },120); }
 function start(){
  var app=$("app"), mb=$("modalBody");
  if(window.MutationObserver){
   if(app) new MutationObserver(later).observe(app,{childList:true,subtree:true});
   if(mb) new MutationObserver(later).observe(mb,{childList:true,subtree:true});
  }
  document.addEventListener("input",function(e){ var t=e.target; if(t&&(t.id==="qKm"||t.id==="qbKm"||t.id==="qVehicleNo"||t.id==="qbVehicleNo")) later(); });
  later();
 }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
