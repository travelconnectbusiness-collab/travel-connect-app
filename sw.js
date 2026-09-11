const CACHE="tcp-v2-network-first";
const ASSETS=["/","/index.html","/src/app.css","/src/app.js","/manifest.webmanifest"];

self.addEventListener("install",e=>{
 self.skipWaiting();
 e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener("activate",e=>{
 e.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
   .then(()=>self.clients.claim())
 );
});

/* Network-first: always tries to fetch the latest version from the server.
   Only serves from cache if the network request fails (offline). This is what
   makes new deployments show up immediately instead of the old cached copy. */
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET") return;
 e.respondWith(
  fetch(e.request).then(res=>{
   const copy=res.clone();
   caches.open(CACHE).then(c=>c.put(e.request,copy));
   return res;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match("/index.html")))
 );
});

/* --- Web Push additions --- handles a push arriving while the app is closed /
   phone locked, and what happens when the user taps the resulting notification. */
self.addEventListener("push",(event)=>{
 let data={};
 try{ data=event.data?event.data.json():{}; }catch(e){}
 const title=data.title||"🚨 Travel Connect SOS";
 const options={
  body:data.body||"Needs urgent assistance.",
  tag:"tc-sos",
  renotify:true,
  requireInteraction:true,
  vibrate:[200,100,200,100,200],
  data:{mobile:data.mobile||"",lat:data.lat??null,lon:data.lon??null}
 };
 event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",(event)=>{
 event.notification.close();
 const d=event.notification.data||{};
 const url=(d.lat!=null&&d.lon!=null)?`https://maps.google.com/?q=${d.lat},${d.lon}`:"/#network";
 event.waitUntil(
  clients.matchAll({type:"window",includeUncontrolled:true}).then((list)=>{
   for(const c of list){ if("focus" in c) return c.focus(); }
   if(clients.openWindow) return clients.openWindow(url);
  })
 );
});
