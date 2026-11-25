/* ROAD KM FROM GOOGLE + ROUTE MAP + NAVIGATION (tc-roadkm.js, loaded by tc-regdocs.js before tc-ltextra.js).
   Owner 2026-11-19: "the km should come from Google inside our app, and show the route on a map in the app".
   Premium / Platinum only (tcIsPremiumPlan); the server (/api/roadkm) checks the plan again, keeps the Google key secret,
   has a daily limit per phone and a monthly budget, and remembers a route for 30 days (the same route again costs nothing).
   Whenever Google cannot answer (limit, offline, place not found) the screens fall back to the free map as before.
     window.tcRoadKm(list)          list = [{lat,lon} | {q:"place"} | "place"]  -> Promise {km,min,poly,pts}  (rejects {error})
     window.tcRkTools(el,r,list,o)  under el: "Route map" + "Open in Google Maps" buttons; the map opens inside the app
     window.tcRouteMap(el,r,list)   draws the route line on a small map (OpenStreetMap tiles, no key, no cost)
     window.tcNavUrl(list,fromHere) Google Maps directions link (opens the Google Maps app = turn-by-turn navigation)
   QUOTATION (taxi): a "Road KM (Google)" button next to "Open route in Google Maps": garage -> pickup -> destinations -> closing point,
   fills Estimated KM (and Estimated hours when empty); the boxes stay editable. core.js / business.js are NOT edited. */
(function(){
 if(window.__tcRoadKm) return;
 window.__tcRoadKm=1;
 var $=function(id){ return document.getElementById(id); };
 var E=function(v){ return typeof esc==="function"?esc(v):String(v==null?"":v).replace(/[&<>"']/g,function(m){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]; }); };
 var B=function(en,ml){ try{ return typeof tcBl==="function"?tcBl(en,ml):en; }catch(e){ return en; } };
 function premium(){ try{ return typeof tcIsPremiumPlan==="function"&&!!tcIsPremiumPlan(); }catch(e){ return false; } }
 function me(){ try{ return String((getCurrentUser()||{}).mobile||""); }catch(e){ return ""; } }
 function dev(){ try{ return typeof getDeviceToken==="function"?getDeviceToken():(localStorage.getItem("tc_device_token")||""); }catch(e){ return ""; } }

 /* ---------- points ---------- */
 var GPS=/^GPS\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i;
 function norm(p){
  if(typeof p==="string") p={q:p};
  if(!p) return null;
  var la=+p.lat, lo=+p.lon;
  if(p.lat!=null&&p.lon!=null&&p.lat!==""&&!isNaN(la)&&!isNaN(lo)) return {lat:Math.round(la*1e5)/1e5,lon:Math.round(lo*1e5)/1e5};
  var q=String(p.q!=null?p.q:(p.text||"")).replace(/\s+/g," ").trim();
  var g=GPS.exec(q); if(g) return {lat:+g[1],lon:+g[2]};
  return q.length>=2?{q:q.slice(0,120)}:null;
 }
 function asText(p){ return p.q!=null?p.q:(p.lat+","+p.lon); }

 /* ---------- Google road km through our server ---------- */
 var memo={}, off="";   /* off: a reason Google is not used again in this session (limit reached / not set up) */
 var STOP={day_limit:1,month_limit:1,no_key:1,google_denied:1,plan:1,nomaps:1,unauthorized:1};
 window.tcRoadKm=function(list){
  var pts=(list||[]).map(norm);
  if(pts.length<2||pts.some(function(p){ return !p; })) return Promise.reject({error:"bad_points"});
  if(pts.length>11) return Promise.reject({error:"too_many_points"});
  if(!premium()) return Promise.reject({error:"plan"});
  try{ if(localStorage.getItem("tc_nomaps")==="1") return Promise.reject({error:"nomaps"}); }catch(e){}   /* yearly vehicle plan: no Google Maps (owner 2026-11-25) */
  if(off) return Promise.reject({error:off});
  var k=JSON.stringify(pts); if(memo[k]) return Promise.resolve(memo[k]);
  var ctl=(typeof AbortController==="function")?new AbortController():null, tm=ctl?setTimeout(function(){ try{ ctl.abort(); }catch(e){} },20000):0;
  return fetch("/api/roadkm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mobile:me(),device_token:dev(),pts:pts}),signal:ctl?ctl.signal:undefined})
   .then(function(r){ clearTimeout(tm); return r.json().catch(function(){ return {ok:false,error:"bad_answer"}; }); },function(){ clearTimeout(tm); return {ok:false,error:"offline"}; })
   .then(function(j){
    if(!j||!j.ok||!(j.km>=0)){ var er=(j&&j.error)||"error"; if(STOP[er]) off=er; throw {error:er,limit:j&&j.limit}; }
    var r={km:+j.km,min:+j.min||0,poly:String(j.poly||""),pts:Array.isArray(j.pts)?j.pts:[],src:"google"};
    memo[k]=r; return r;
   });
 };
 window.tcRoadKmWhy=function(er){
  er=(er&&er.error)||er||"";
  if(er==="day_limit") return B("Today's Google road km limit is used up - the free map is used until tomorrow.","ഇന്നത്തെ Google റോഡ് KM പരിധി കഴിഞ്ഞു - നാളെ വരെ സൗജന്യ മാപ്പ് ഉപയോഗിക്കുന്നു.");
  if(er==="month_limit") return B("This month's Google road km is used up - the free map is used.","ഈ മാസത്തെ Google റോഡ് KM കഴിഞ്ഞു - സൗജന്യ മാപ്പ് ഉപയോഗിക്കുന്നു.");
  if(er==="place_not_found") return B("Google could not find a place - write it with the town name (e.g. Kuttiady, Kozhikode).","ഒരു സ്ഥലം Google-ന് കണ്ടെത്താനായില്ല - ടൗണിന്റെ പേര് കൂടി എഴുതുക (ഉദാ: കുറ്റ്യാടി, കോഴിക്കോട്).");
  if(er==="too_many_points") return B("Up to 11 places (start, 9 stops, end) can be sent to Google at once.","ഒരേസമയം 11 സ്ഥലം വരെ (പുറപ്പാട്, 9 സ്റ്റോപ്പ്, അവസാനം) മാത്രം.");
  if(er==="plan") return B("Road km from Google is a Premium feature.","Google റോഡ് KM പ്രീമിയം സൗകര്യമാണ്.");
  if(er==="nomaps") return B("Your yearly plan has no Google Maps - Google road km comes with the monthly Premium / Platinum. The free map is used.","നിങ്ങളുടെ വർഷ പ്ലാനിൽ Google Maps ഇല്ല - Google റോഡ് KM മാസ Premium / Platinum-ൽ ആണ്. സൗജന്യ മാപ്പ് ഉപയോഗിക്കുന്നു.");
  if(er==="offline") return B("No internet - try again.","ഇന്റർനെറ്റ് ഇല്ല - വീണ്ടും ശ്രമിക്കുക.");
  return B("Google could not give the distance now.","Google-ൽ നിന്ന് ഇപ്പോൾ ദൂരം കിട്ടിയില്ല.");
 };
 function hm(min){ min=Math.round(+min||0); var h=Math.floor(min/60), m=min%60; return h?(h+" "+B("h","മ")+(m?" "+m+" "+B("min","മി"):"")):(m+" "+B("min","മി")); }
 window.tcRoadKmHm=hm;

 /* ---------- Google Maps link (opens the Google Maps app: turn-by-turn navigation) ---------- */
 window.tcNavUrl=function(list,fromHere){
  var pts=(list||[]).map(norm).filter(Boolean); if(!pts.length) return "";
  var u="https://www.google.com/maps/dir/?api=1&travelmode=driving&destination="+encodeURIComponent(asText(pts[pts.length-1]));
  if(!fromHere&&pts.length>1){
   u+="&origin="+encodeURIComponent(asText(pts[0]));
   var mid=pts.slice(1,-1).slice(0,9).map(asText); if(mid.length) u+="&waypoints="+encodeURIComponent(mid.join("|"));
  }else if(fromHere&&pts.length>1){ u+="&dir_action=navigate"; }
  return u;
 };

 /* ---------- route map (OpenStreetMap tiles + our own line; no key, no cost) ---------- */
 function decode(s){
  var out=[], i=0, lat=0, lng=0;
  while(i<s.length){
   var b, sh=0, r=0; do{ b=s.charCodeAt(i++)-63; r|=(b&31)<<sh; sh+=5; }while(b>=32&&i<s.length); lat+=(r&1)?~(r>>1):(r>>1);
   sh=0; r=0; do{ b=s.charCodeAt(i++)-63; r|=(b&31)<<sh; sh+=5; }while(b>=32&&i<s.length); lng+=(r&1)?~(r>>1):(r>>1);
   out.push([lat/1e5,lng/1e5]);
  }
  return out;
 }
 window.tcRkDecode=decode;
 function px(lat,lon,z){ var s=256*Math.pow(2,z), si=Math.sin(lat*Math.PI/180); return [(lon+180)/360*s,(0.5-Math.log((1+si)/(1-si))/(4*Math.PI))*s]; }
 window.tcRouteMap=function(el,r,list){
  if(!el||!r) return;
  var line=r.poly?decode(r.poly):[];
  var marks=(r.pts||[]).filter(function(p){ return p&&isFinite(p[0])&&isFinite(p[1]); });
  if(!line.length) line=marks.slice();
  if(line.length<2){ el.innerHTML='<div class="muted" style="font-size:12.5px">'+E(B("No route line to show.","കാണിക്കാൻ റൂട്ട് ഇല്ല."))+'</div>'; return; }
  var W=Math.max(240,Math.min(560,el.clientWidth||(el.parentNode&&el.parentNode.clientWidth)||340)), H=Math.round(W*0.68), pad=26;
  var la1=90,la2=-90,lo1=180,lo2=-180; line.concat(marks).forEach(function(p){ la1=Math.min(la1,p[0]); la2=Math.max(la2,p[0]); lo1=Math.min(lo1,p[1]); lo2=Math.max(lo2,p[1]); });
  var z=16; for(;z>3;z--){ var a=px(la2,lo1,z), b=px(la1,lo2,z); if(b[0]-a[0]<=W-2*pad&&b[1]-a[1]<=H-2*pad) break; }
  var tl=px(la2,lo1,z), br=px(la1,lo2,z), ox=(tl[0]+br[0])/2-W/2, oy=(tl[1]+br[1])/2-H/2;
  var n=Math.pow(2,z), tiles="";
  for(var tx=Math.floor(ox/256);tx<=Math.floor((ox+W)/256);tx++) for(var ty=Math.floor(oy/256);ty<=Math.floor((oy+H)/256);ty++){
   if(ty<0||ty>=n) continue; var wx=((tx%n)+n)%n;
   tiles+='<img alt="" draggable="false" src="https://tile.openstreetmap.org/'+z+'/'+wx+'/'+ty+'.png" onerror="this.style.visibility=\'hidden\'" style="position:absolute;left:'+Math.round(tx*256-ox)+'px;top:'+Math.round(ty*256-oy)+'px;width:256px;height:256px;max-width:none;border:0;padding:0;margin:0">';
  }
  var step=Math.max(1,Math.floor(line.length/1500)), d="";
  for(var i=0;i<line.length;i+=step){ var q=px(line[i][0],line[i][1],z); d+=(d?"L":"M")+(q[0]-ox).toFixed(1)+" "+(q[1]-oy).toFixed(1); }
  var last=px(line[line.length-1][0],line[line.length-1][1],z); d+="L"+(last[0]-ox).toFixed(1)+" "+(last[1]-oy).toFixed(1);
  var dots=marks.map(function(p,k){
   var q=px(p[0],p[1],z), first=k===0, end=k===marks.length-1;
   return '<circle cx="'+(q[0]-ox).toFixed(1)+'" cy="'+(q[1]-oy).toFixed(1)+'" r="'+(first||end?7:5)+'" fill="'+(first?"#1c8c3a":end?"#d93025":"#fff")+'" stroke="'+(first||end?"#fff":"#1a73e8")+'" stroke-width="2.5"/>';
  }).reverse().join("");   /* start drawn last = on top (a round trip ends where it started) */
  el.innerHTML='<div class="tcRkMap" data-noicon="1" style="position:relative;overflow:hidden;width:100%;max-width:'+W+'px;height:'+H+'px;border-radius:12px;background:#e8eef0;border:1px solid #cfdde0;margin-top:6px">'+tiles+
   '<svg width="'+W+'" height="'+H+'" style="position:absolute;left:0;top:0;pointer-events:none"><path d="'+d+'" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/><path d="'+d+'" fill="none" stroke="#1a73e8" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>'+dots+'</svg>'+
   '<div style="position:absolute;right:0;bottom:0;background:rgba(255,255,255,.85);font-size:10px;padding:1px 5px;border-top-left-radius:6px;color:#333">&copy; OpenStreetMap</div></div>';
 };

 /* ---------- buttons under a result: Route map + Open in Google Maps ---------- */
 var lastR={};
 window.tcRkTools=function(el,r,list,o){
  if(!el||!el.parentNode) return;
  o=o||{}; var id=(el.id||"tcRk")+"_rk", box=$(id);
  if(!box){ box=document.createElement("div"); box.id=id; box.style.cssText="margin:4px 0 2px"; el.parentNode.insertBefore(box,el.nextSibling); }
  lastR[id]={r:r,list:list};
  var nav=window.tcNavUrl(list,!!o.fromHere);
  box.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:6px">'+
   (r&&(r.poly||(r.pts||[]).length>1)?'<button type="button" onclick="tcRkMapToggle(\''+id+'\')" style="flex:none;padding:4px 11px;min-height:0;font-size:12.5px;border-radius:999px">&#128506; '+E(B("Route map","റൂട്ട് മാപ്പ്"))+'</button>':'')+
   (nav?'<a href="'+E(nav)+'" target="_blank" rel="noopener" style="flex:none;display:inline-block;padding:4px 11px;font-size:12.5px;border-radius:999px;background:#1a73e8;color:#fff;text-decoration:none;font-weight:700">&#10148; '+E(o.fromHere?B("Navigate (Google Maps)","നാവിഗേഷൻ (Google Maps)"):B("Open in Google Maps","Google Maps-ൽ തുറക്കുക"))+'</a>':'')+
   '</div><div class="tcRkMapHold"></div>';
  if(o.openMap) window.tcRkMapToggle(id);
 };
 window.tcRkMapToggle=function(id){
  var box=$(id), x=lastR[id]; if(!box||!x) return;
  var h=box.querySelector(".tcRkMapHold"); if(!h) return;
  if(h.innerHTML){ h.innerHTML=""; return; }
  window.tcRouteMap(h,x.r,x.list);
 };

 /* ---------- quotation: Road KM (Google) ---------- */
 function v(id){ var e=$(id); return e?String(e.value||"").trim():""; }
 function qList(){
  var dest=[]; try{ dest=typeof collectDestinations==="function"?collectDestinations():[v("qDest")]; }catch(e){ dest=[v("qDest")]; }
  return [v("qVehicleStart"),v("qPickup")].concat(dest,[v("qReturn")]).filter(Boolean);
 }
 window.tcRkQuote=function(){
  var msg=$("tcRkQMsg"); if(!msg) return;
  var list=qList();
  if(list.length<2){ msg.style.color="#a12d2d"; msg.textContent=B("Enter at least the pickup and the destination first.","ആദ്യം പിക്കപ്പും ഡെസ്റ്റിനേഷനും എങ്കിലും നൽകുക."); return; }
  if(!premium()){ msg.style.color="#a12d2d"; msg.textContent=B("Road km from Google is a Premium feature. You can still use \"Open route in Google Maps\".","Google റോഡ് KM പ്രീമിയം സൗകര്യമാണ്. \"Open route in Google Maps\" ഉപയോഗിക്കാം."); return; }
  msg.style.color=""; msg.textContent=B("Getting the road km from Google...","Google-ൽ നിന്ന് റോഡ് KM എടുക്കുന്നു...");
  var old=$("tcRkQMsg_rk"); if(old) old.innerHTML="";
  window.tcRoadKm(list).then(function(r){
   var k=$("qKm"); if(k){ k.value=r.km; try{ if(typeof handleLocalCheck==="function") handleLocalCheck(); }catch(e){} }
   var h=$("qHours"), hf=false; if(h&&!String(h.value||"").trim()&&r.min>0){ h.value=Math.ceil(r.min/30)/2; hf=true; try{ if(typeof handleLocalCheck==="function") handleLocalCheck(); }catch(e){} }
   msg.style.color="#1c6b2c";
   msg.innerHTML='<b>'+r.km+' km</b> · '+E(B("about","ഏകദേശം"))+' '+E(hm(r.min))+' '+E(B("by road (Google), ","റോഡ് വഴി (Google), "))+E(list.length)+' '+E(B("places","സ്ഥലങ്ങൾ"))+'<br>'+
    E(hf?B("Filled in Estimated KM and hours - you can change them.","Estimated KM-ഉം മണിക്കൂറും നിറച്ചു - മാറ്റാം."):B("Filled in Estimated KM - you can change it.","Estimated KM നിറച്ചു - മാറ്റാം."));
   window.tcRkTools(msg,r,list,{});
  }).catch(function(e){ msg.style.color="#a12d2d"; msg.textContent=window.tcRoadKmWhy(e); });
 };
 function qPlace(){
  var ob=document.querySelector('#app button[onclick="openRoute()"]'); if(!ob||$("tcRkQBtn")) return;
  var b=document.createElement("button"); b.type="button"; b.id="tcRkQBtn"; b.setAttribute("onclick","tcRkQuote()");
  b.innerHTML='&#128739; '+E(B("Road KM (Google)","റോഡ് KM (Google)"));
  ob.parentNode.insertBefore(b,ob.nextSibling);
  var row=ob.closest?ob.closest(".actions"):null, m=document.createElement("div"); m.id="tcRkQMsg"; m.style.cssText="font-size:12.5px;margin:2px 0 6px";
  (row&&row.parentNode?row:ob.parentNode).parentNode.insertBefore(m,(row&&row.parentNode?row:ob.parentNode).nextSibling);
 }
 var tm=0;
 function later(){ clearTimeout(tm); tm=setTimeout(function(){ try{ qPlace(); }catch(e){ if(window.console) console.error("tc-roadkm",e); } },120); }
 function start(){ var a=$("app"); if(!a||!window.MutationObserver) return; new MutationObserver(later).observe(a,{childList:true,subtree:true}); later(); }
 if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start); else start();
})();
