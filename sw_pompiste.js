/* =====================================================================
   Service Worker — pompiste.html
   - Cache uniquement les fichiers de l'app pompiste
   - Ne touche JAMAIS aux requêtes Supabase
   - Réseau d'abord (4s max) puis cache
   Pour forcer la mise à jour : changer CACHE_VER
   ===================================================================== */
const CACHE_VER = "stationpro-pompiste-v1";
const SHELL = [
  "./pompiste.html",
  "./manifest_pompiste.json",
  "./icon_pompiste.svg"
];
const CDN = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js",
  "https://unpkg.com/html5-qrcode"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_VER);
    await Promise.all([
      ...SHELL.map(u => c.add(u).catch(() => {})),
      ...CDN.map(u => fetch(u, { mode: "no-cors" }).then(r => c.put(u, r)).catch(() => {}))
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    /* Supprimer uniquement les anciens caches du pompiste */
    await Promise.all(
      keys.filter(k => k.startsWith("stationpro-pompiste-") && k !== CACHE_VER)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function pageNetworkFirst(req) {
  const c = await caches.open(CACHE_VER);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))
    ]);
    if (res && res.ok) c.put("./pompiste.html", res.clone());
    return res;
  } catch (e) {
    return (await c.match(req, { ignoreSearch: true }))
        || (await c.match("./pompiste.html"))
        || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE_VER);
  const cached = await c.match(req);
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await net) || Response.error();
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith(".supabase.co")) return;
  const isCDN = CDN.includes(req.url);
  if (!isCDN && url.origin !== self.location.origin) return;
  if (req.mode === "navigate") { e.respondWith(pageNetworkFirst(req)); return; }
  e.respondWith(staleWhileRevalidate(req));
});
