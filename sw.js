const CACHE_NAME='carica-kombat-fix043-v1';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('carica-kombat-')&&k!==CACHE_NAME).map(k=>caches.delete(k))))
  .then(()=>self.clients.claim())
));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.pathname.endsWith('/')||u.pathname.endsWith('/index.html')){
    e.respondWith(fetch(e.request).then(r=>{
      const c=r.clone(); caches.open(CACHE_NAME).then(x=>x.put(e.request,c)); return r;
    }).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{
    const c=r.clone(); caches.open(CACHE_NAME).then(x=>x.put(e.request,c)); return r;
  })));
});
