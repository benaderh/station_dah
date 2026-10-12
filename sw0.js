const CACHE_NAME="stationpro-shell-v2";
const SHELL_FILES=["./index.html","./manifest.json","./icon.svg"];

self.addEventListener("install",e=>{
 e.waitUntil(
  caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL_FILES)).then(()=>self.skipWaiting())
 );
});

self.addEventListener("activate",e=>{
 e.waitUntil(
  caches.keys().then(keys=>Promise.all(
   keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
  )).then(()=>self.clients.claim())
 );
});

self.addEventListener("fetch",e=>{
 const url=new URL(e.request.url);
 /* Uniquement l'app elle-même (même origine, GET) passe par le cache.
    Tout le reste (appels Supabase, autres domaines) va directement au
    réseau, sans interception — les données restent toujours en direct. */
 if(e.request.method!=="GET"||url.origin!==self.location.origin)return;

 e.respondWith(
  caches.match(e.request).then(cached=>{
   const network=fetch(e.request).then(resp=>{
    if(resp&&resp.ok){
     const copy=resp.clone();
     caches.open(CACHE_NAME).then(cache=>cache.put(e.request,copy));
    }
    return resp;
   }).catch(()=>cached);
   /* affiche le cache tout de suite si dispo (rapide, marche hors-ligne),
      met à jour le cache en arrière-plan dès que le réseau répond */
   return cached||network;
  })
 );
});
