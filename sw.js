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
