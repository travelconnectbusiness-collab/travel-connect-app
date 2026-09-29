const CACHE="tcp-v4-network-first";
/* Only files that actually exist at these paths today. Each one is cached
   on its own and a missing file is ignored - cache.addAll() rejects the
   WHOLE install if even one file 404s (which is exactly what happens when
   an old file is deleted from the repo), and a service worker that fails to
   install also stops push notifications from working. */
const ASSETS=["/","/index.html","/app.css","/manifest.webmanifest"];

self.addEventListener("install",e=>{
 self.skipWaiting();
 e.waitUntil(
  caches.open(CACHE).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>{}))))
 );
});

self.addEventListener("activate",e=>{
 e.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
   .then(()=>self.clients.claim())
 );
});

/* Network-first: always tries to fetch the latest version from the server.
   Only serves from cache if the network request fails (offline). {cache:
   "no-store"} is essential here - without it, fetch() still consults the
   BROWSER's own HTTP cache (separate from this Service Worker's Cache API
   storage), which could silently return a stale copy even though this code
   correctly went to the network first. */
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET") return;
 e.respondWith(
  fetch(e.request,{cache:"no-store"}).then(res=>{
   const copy=res.clone();
   caches.open(CACHE).then(c=>c.put(e.request,copy));
   return res;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match("/index.html")))
 );
});

/* --- Web Push --- handles a push arriving while the app is closed / phone
   locked, and what happens when the user taps the resulting notification.
   Two kinds: an SOS alert (unchanged) and a chat "message". */
self.addEventListener("push",(event)=>{
 let data={};
 try{ data=event.data?event.data.json():{}; }catch(e){}

 if(data.type==="message"){
  event.waitUntil((async()=>{
   /* The number on the app icon (where the phone supports it) = total
      unread messages, sent by the server with every push. */
   try{
    if(self.navigator&&navigator.setAppBadge&&data.count!=null) await navigator.setAppBadge(data.count);
   }catch(e){}
   /* If the app is open and on screen right now, it already shows the
      message itself (with its own sound) - just tell it to refresh
      instead of also popping a system notification on top. */
   const wins=await clients.matchAll({type:"window",includeUncontrolled:true});
   const visible=wins.filter(c=>c.visibilityState==="visible");
   if(visible.length){
    visible.forEach(c=>c.postMessage({tcMsgPush:true}));
    return;
   }
   await self.registration.showNotification(data.title||"\u2709 New message",{
    body:data.body||"",
    tag:data.tag||"tc-msg",
    icon:"/icon-192.png",
    badge:"/icon-192.png",
    vibrate:[150,80,150,80,250],
    silent:false,
    data:{type:"message",url:data.url||"/#messages"}
   });
  })());
  return;
 }

 const title=data.title||"\ud83d\udea8 Travel Connect SOS";
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

 if(d.type==="message"){
  event.waitUntil(
   clients.matchAll({type:"window",includeUncontrolled:true}).then((list)=>{
    for(const c of list){
     if("focus" in c){
      c.postMessage({tcOpen:"messages"});
      return c.focus();
     }
    }
    if(clients.openWindow) return clients.openWindow(d.url||"/#messages");
   })
  );
  return;
 }

 const url=(d.lat!=null&&d.lon!=null)?`https://maps.google.com/?q=${d.lat},${d.lon}`:"/#network";
 event.waitUntil(
  clients.matchAll({type:"window",includeUncontrolled:true}).then((list)=>{
   for(const c of list){ if("focus" in c) return c.focus(); }
   if(clients.openWindow) return clients.openWindow(url);
  })
 );
});
