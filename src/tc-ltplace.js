/* Live Trip: a better place NAME for "Take my location" (tc-ltplace.js, loaded by tc-regdocs.js BEFORE tc-ltloc.js).
   Owner (Thalassery railway station, 2026-11-11): the location was taken at the railway station but the Place box got
   "Kuyyali, Thalassery" - OpenStreetMap's reverse lookup answers with the nearest ADDRESS object (a neighbourhood), and a
   station / bus stand / hospital that is a few metres away is not an address object, so it is never named.
   WHAT THIS DOES: it wraps window.fetch and only touches the ONE kind of request tc-ltloc.js already makes
   (https://nominatim.openstreetmap.org/reverse...). When the answer is NOT already a clearly named spot, it asks once more
   with layer=poi,railway (same position, same zoom / language) and, if that finds a well-known place close by
   (railway station, bus stand, airport, hospital, temple / mosque / church, college, school, petrol pump, hotel ...),
   hands that answer to tc-ltloc.js instead, so the Place box gets e.g. "Thalassery Railway Station, Kuyyali".
   A small shop, house or road a few metres away is NOT used (a wrong name on a bill is worse than the area name), and
   if the second request fails or finds nothing the original answer is returned untouched. tc-ltloc.js is not edited.
   MY OWN NAMES (owner 2026-11-12: his rented-house office is 1 km from Valayam town near a bridge, but the box said "Valayam, Kozhikode"):
   the GPS position itself is exact, the NAME comes from OpenStreetMap and in a village it may only know the village. So the app now also learns from
   the owner: every saved trip start / stop already keeps its coordinates and the place text he typed. When "Take my location" is used within 100 m of
   such a saved point, the name he typed there (nearest, most recent) is put in the Place box instead of the map's name. Nothing new is stored.
   Exported for tests: window.tcLtPlacePick(firstJson, secondJson, lat, lon) -> the answer to use; window.tcLtSavedName(lat, lon) -> saved name or "". */
(function(){
 if(window.__tcLtPlace) return;
 window.__tcLtPlace=1;
 var BAD=["highway","boundary","landuse","place"];   /* same rule as tc-ltloc.js: these are areas / roads, not a named spot */
 /* well-known kinds and how far away (metres) they may be: big places have a big footprint, the GPS point is often at the gate */
 var OK={
  railway:{station:150,halt:120},
  amenity:{bus_station:150,hospital:150,clinic:80,place_of_worship:100,college:120,university:150,school:100,ferry_terminal:150,fuel:70,courthouse:100,townhall:100,marketplace:100,police:80},
  public_transport:{station:150},
  tourism:{hotel:90,guest_house:80,resort:120,hostel:80,attraction:120,museum:100,viewpoint:100,theme_park:150,zoo:150},
  aeroway:{aerodrome:400,terminal:300},
  leisure:{stadium:150,park:100},
  office:{government:80}
 };
 function dist(a,b,c,d){   /* metres, haversine */
  var R=6371000, r=function(x){ return x*Math.PI/180; }, dl=r(c-a), dn=r(d-b);
  var h=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)*Math.sin(dn/2);
  return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
 }
 function named(j){ return !!(j&&j.name&&BAD.indexOf(j.category)<0); }
 /* the second answer is used only if it is a known kind of place, named, and close enough */
 function pick(first,second,lat,lon){
  if(named(first)) return first;
  if(!second||!second.name) return first;
  var lim=(OK[second.category]||{})[second.type];
  if(!lim) return first;
  var la=parseFloat(second.lat), lo=parseFloat(second.lon);
  if(isNaN(la)||isNaN(lo)) return first;
  if(dist(lat,lon,la,lo)>lim) return first;
  /* keep the small-area words of the first answer so the name can read "Place, Area" */
  if(first&&first.address&&second.address){
   var a=second.address, f=first.address;
   ["neighbourhood","suburb","hamlet","village","town","city","county","state_district","state"].forEach(function(k){ if(!a[k]&&f[k]) a[k]=f[k]; });
  }
  return second;
 }
 window.tcLtPlacePick=pick;
 /* nearest saved point (trip start / stop with coordinates) within 100 m -> the name the owner typed there */
 function savedName(lat,lon){
  var best=null, bd=1e9, bat="";
  try{
   (db.liveTrips||[]).forEach(function(t){
    var c=[{la:t.startLat,lo:t.startLon,n:t.startPlace,at:t.startAt}];
    (t.stops||[]).forEach(function(s){ c.push({la:s.lat,lo:s.lon,n:s.place,at:s.at}); });
    c.forEach(function(x){
     var la=parseFloat(x.la), lo=parseFloat(x.lo), n=String(x.n||"").trim();
     if(isNaN(la)||isNaN(lo)||!n||/^GPS\s/i.test(n)) return;
     var d=dist(lat,lon,la,lo); if(d>100) return;
     var at=String(x.at||"");
     if(d<bd-15||(Math.abs(d-bd)<=15&&at>bat)){ best=n; bd=d; bat=at; }
    });
   });
  }catch(e){}
  return best||"";
 }
 window.tcLtSavedName=savedName;
 /* after tc-ltloc.js has filled the Place box with the map's name, put the saved name there instead */
 function watchFill(name){
  var b=document.getElementById("modalBody"); if(!b) return;
  var snap=[].slice.call(b.querySelectorAll("input")).filter(function(i){ return !i.type||i.type==="text"; }).map(function(i){ return {el:i,v:i.value}; });
  var n=0, iv=setInterval(function(){
   n++;
   for(var k=0;k<snap.length;k++){
    var e=snap[k].el;
    if(e.value&&e.value!==snap[k].v){
     clearInterval(iv);
     if(e.value!==name){ e.value=name; try{ e.dispatchEvent(new Event("input",{bubbles:true})); e.dispatchEvent(new Event("change",{bubbles:true})); }catch(x){} }
     return;
    }
   }
   if(n>60) clearInterval(iv);
  },120);
 }
 var of=window.fetch;
 if(typeof of!=="function") return;
 window.fetch=function(u,o){
  var url="";
  try{ url=(typeof u==="string")?u:((u&&u.url)||String(u||"")); }catch(e){}
  if(!/^https:\/\/nominatim\.openstreetmap\.org\/reverse/.test(url)||/[?&]layer=/.test(url)) return of.apply(this,arguments);
  var self=this, args=arguments, la=url.match(/[?&]lat=(-?[\d.]+)/), lo=url.match(/[?&]lon=(-?[\d.]+)/);
  if(!la||!lo) return of.apply(this,arguments);
  var lat=parseFloat(la[1]), lon=parseFloat(lo[1]);
  var mine=savedName(lat,lon);
  if(mine) watchFill(mine);
  if(mine) return of.apply(self,args);   /* his own name wins: no second map request needed */
  return of.apply(self,args).then(function(r1){
   var keep=function(){ return r1; };
   try{
    if(!r1||!r1.ok) return r1;
    return r1.clone().json().then(function(j1){
     if(named(j1)) return r1;
     return of.call(self,url+"&layer=poi,railway",o).then(function(r2){ return r2.ok?r2.json():null; }).then(function(j2){
      var use=pick(j1,j2,lat,lon);
      if(use===j1) return r1;
      return new Response(JSON.stringify(use),{status:200,headers:{"Content-Type":"application/json"}});
     });
    }).catch(keep);
   }catch(e){ return r1; }
  });
 };
})();
