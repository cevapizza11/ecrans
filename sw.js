// Service worker des écrans Moule & Smile
// Changer CACHE à chaque livraison du code pour forcer la mise à jour.
const CACHE = "ecrans-v2026-10-31-1230";

self.addEventListener("install", e => { self.skipWaiting(); });

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || e.request.method !== "GET") return;

  // Vidéos : depuis la mémoire d'abord (fonctionne hors ligne), avec gestion des "Range"
  if (url.pathname.endsWith(".mp4")) { e.respondWith(videoDepuisCache(e.request)); return; }

  // version.txt : réseau d'abord, gardé en mémoire (sans le ?t=) pour le hors ligne
  if (url.pathname.endsWith("version.txt")) {
    const cle = new Request(url.origin + url.pathname);
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(cle, c)); }
        return r;
      }).catch(() => caches.match(cle))
    );
    return;
  }

  // Page : réseau d'abord, mémoire si hors ligne
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); }
      return r;
    }).catch(() => caches.match(e.request))
  );
});

async function videoDepuisCache(req) {
  const cache = await caches.open(CACHE);
  const cle = new Request(req.url); // sans en-tête Range
  let rep = await cache.match(cle);
  if (!rep) {
    try {
      const reseau = await fetch(cle);
      if (!(reseau.ok && reseau.status === 200)) return reseau;
      // On retire les anciennes versions de cette même vidéo
      const chemin = new URL(req.url).pathname;
      for (const k of await cache.keys()) {
        const u = new URL(k.url);
        if (u.pathname === chemin && k.url !== req.url) await cache.delete(k);
      }
      await cache.put(cle, reseau.clone());
      rep = reseau;
    } catch (err) {
      // Hors ligne et version absente : on prend la dernière version connue de cette vidéo
      const chemin = new URL(req.url).pathname;
      for (const k of await cache.keys()) {
        if (new URL(k.url).pathname === chemin) { rep = await cache.match(k); break; }
      }
      if (!rep) return new Response("", { status: 503 });
    }
  }
  const range = req.headers.get("range");
  if (!range) return rep;
  const blob = await rep.clone().blob();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const debut = m && m[1] ? parseInt(m[1], 10) : 0;
  const fin = m && m[2] ? Math.min(parseInt(m[2], 10), blob.size - 1) : blob.size - 1;
  const morceau = blob.slice(debut, fin + 1);
  return new Response(morceau, {
    status: 206,
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes ${debut}-${fin}/${blob.size}`,
      "Content-Length": String(morceau.size),
      "Accept-Ranges": "bytes"
    }
  });
}
