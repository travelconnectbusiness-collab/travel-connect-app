const CACHE="tcp-v4-network-first";
/* Only files that actually exist at these paths today. Each one is cached
   on its own and a missing file is ignored - cache.addAll() rejects the
   WHOLE install if even one file 404s (which is exactly what happens when
   an old file is deleted from the repo), and a service worker that fails to
   install also stops push notifications from working. */
const ASSETS=["/","/index.html","/app.css","/manifest.webmanifest"];

self.addEventListener("install",e=>{
 /* No automatic self.skipWaiting() here on purpose. A newly-installed
    worker used to activate itself immediately, which (once the page side
    was also checking for updates mid-session, not just on a fresh open)
    could force a reload on someone's phone at literally any moment,
    possibly wiping out a form they were halfway through filling in. Now
    it sits "waiting" until the person themselves taps "Reload Now" on the
    update banner or the Menu's "Reload App" - see the "message" handler
    below - skipWaiting only ever runs in response to that explicit tap. */
 e.waitUntil(
  caches.open(CACHE).then(c=>Promise.all(ASSETS.map(a=>c.add(a).catch(()=>{}))))
 );
});

self.addEventListener("message",(event)=>{
 if(event.data&&event.data.type==="SKIP_WAITING") self.skipWaiting();
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
   /* A backgrounded tab can keep reporting visibilityState "visible" for a
      while after the person has actually left the app (this is exactly
      what made message notifications only ever show while the app was
      still open, never after leaving it) - so a system notification is
      ALWAYS shown now, the same as SOS already does. Any open tab is still
      told to refresh in the background so its own badge/list is current
      the moment the person looks at it, but that is in addition to the
      notification below, never instead of it. */
   const wins=await clients.matchAll({type:"window",includeUncontrolled:true});
   wins.forEach(c=>c.postMessage({tcMsgPush:true}));
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

 if(data.type==="trip_alert"){
  /* Sent to every nearby Active partner of the matching category at once
     - first to tap Accept gets the trip, so this needs to be hard to
       miss (vibrate pattern, stays up until acted on) the same way SOS
       does, rather than something that quietly sits in the shade. */
  event.waitUntil(
   self.registration.showNotification(data.title||"\ud83d\ude95 New trip request nearby",{
    body:data.body||"",
    tag:data.tag||"tc-trip",
    renotify:true,
    requireInteraction:true,
    vibrate:[150,80,150,80,150],
    data:{type:"trip_alert",alert_id:data.alert_id,url:"/#trip_alert_"+data.alert_id}
   })
  );
  return;
 }

 if(data.type==="trip_alert_accepted"){
  event.waitUntil(
   self.registration.showNotification(data.title||"\u2705 A driver accepted your trip",{
    body:data.body||"",
    tag:data.tag||"tc-trip",
    vibrate:[150,80,150],
    data:{type:"trip_alert_accepted",alert_id:data.alert_id,url:"/#trip_alert_"+data.alert_id}
   })
  );
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

 /* Whichever kind of alert this is, tapping it must land the person
    somewhere that actually SHOWS the thing that happened - not just bring
    an existing tab to the front wherever it was last left (that was the
    other half of "I can only tell an SOS happened by going and checking
    manually" - the notification tap wasn't taking anyone there). Reusing
    an existing window still calls .navigate() on it (same-origin, so the
    service worker can do this directly) before focusing it; only a
    brand-new window falls back to opening the URL directly. */
 if(d.type==="message"){
  const dest=d.url||"/#messages";
  event.waitUntil(
   clients.matchAll({type:"window",includeUncontrolled:true}).then(async(list)=>{
    for(const c of list){
     if("focus" in c){
      c.postMessage({tcOpen:"messages"});
      try{ if("navigate" in c) await c.navigate(dest); }catch(e){}
      return c.focus();
     }
    }
    if(clients.openWindow) return clients.openWindow(dest);
   })
  );
  return;
 }

 if(d.type==="trip_alert"||d.type==="trip_alert_accepted"){
  const dest=d.url||"/";
  event.waitUntil(
   clients.matchAll({type:"window",includeUncontrolled:true}).then(async(list)=>{
    for(const c of list){
     if("focus" in c){
      c.postMessage({tcOpenTripAlert:d.alert_id});
      try{ if("navigate" in c) await c.navigate(dest); }catch(e){}
      return c.focus();
     }
    }
    if(clients.openWindow) return clients.openWindow(dest);
   })
  );
  return;
 }

 const dest=(d.lat!=null&&d.lon!=null)?`https://maps.google.com/?q=${d.lat},${d.lon}`:"/#network";
 event.waitUntil(
  clients.matchAll({type:"window",includeUncontrolled:true}).then(async(list)=>{
   for(const c of list){
    if("focus" in c){
     c.postMessage({tcOpen:"network"});
     if(d.lat==null){ try{ if("navigate" in c) await c.navigate(dest); }catch(e){} }
     const focused=await c.focus();
     if(d.lat!=null&&d.lon!=null){ try{ await clients.openWindow(dest); }catch(e){} }
     return focused;
    }
   }
   if(clients.openWindow) return clients.openWindow(d.lat!=null&&d.lon!=null?dest:"/#network");
  })
 );
});
