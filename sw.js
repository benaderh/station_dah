/* Station Pro — service worker : démarrage hors ligne
   - Met en cache la page, le manifest et les 2 bibliothèques CDN (Supabase JS, xlsx).
   - Ne touche JAMAIS aux requêtes vers *.supabase.co (les données passent par l'app : file d'attente).
   - Page : réseau d'abord (4 s max) puis cache → toujours la dernière version quand il y a du réseau.
   Pour forcer la mise à jour du cache après une modification de ce fichier : changer CACHE. */
const CACHE = "stationpro-shell-v2";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon_index.svg"];
const CDN = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all([
      ...SHELL.map(u => c.add(u).catch(() => { })),
      ...CDN.map(u => fetch(u, { mode: "no-cors" }).then(r => c.put(u, r)).catch(() => { }))
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("stationpro-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function pageNetworkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000))
    ]);
    if (res && res.ok) c.put("./index.html", res.clone());
    return res;
  } catch (e) {
    return (await c.match(req, { ignoreSearch: true })) || (await c.match("./index.html")) || (await c.match("./")) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE);
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
  if (url.hostname.endsWith(".supabase.co")) return; /* API Supabase : jamais interceptée */
  const isCDN = CDN.includes(req.url);
  if (!isCDN && url.origin !== self.location.origin) return;
  if (req.mode === "navigate") { e.respondWith(pageNetworkFirst(req)); return; }
  e.respondWith(staleWhileRevalidate(req));
});
