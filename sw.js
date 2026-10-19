// Generated at build time by vite.config.js. App shell cache; models and wasm go to the network.
const CACHE = 'vastu-shell-4abb45389e';
const SHELL = ["./","./assets/pdf.worker.min-yatZIOMy.mjs","./assets/purush-handbook-sheet-xI9EdIJY.png","./assets/purush-DYv44yoI.png","./assets/purush-Cv389cAc.png","./assets/purush-Dsw7Za9i.png","./assets/purush-Cl70zXfu.png","./assets/purush-DhD9BoqG.png","./assets/fraunces-vietnamese-wght-normal-CnvboYUG.woff2","./assets/fraunces-latin-ext-wght-normal-Ca2vKHc0.woff2","./assets/dm-sans-latin-ext-wght-normal-BOFOeGcA.woff2","./assets/dm-sans-latin-wght-normal-Xz1IZZA0.woff2","./assets/noto-serif-devanagari-devanagari-500-normal-Dg6RpQsN.woff2","./assets/fraunces-latin-wght-normal-ukD16Tqj.woff2","./assets/noto-serif-devanagari-devanagari-500-normal-D7eCr4ZR.woff","./assets/index-itK1ODVY.css","./assets/index-Dv6mWat1.js","./assets/pdf-ksa_hnld.js","./assets/pdf.worker.min-DgRcL-GR.js","./assets/jspdf.es.min-DKCiPyIG.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('vastu-shell-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // model files (Hugging Face / CDN): straight to network
  if (/\.wasm$|transformers|autodetect/.test(url.pathname)) return; // big on-demand runtime: network + HTTP cache
  if (/\/config\.json$/.test(url.pathname)) return; // runtime config (plan API base URL): always from the network, never cached, so a new URL needs no rebuild
  if (req.mode === 'navigate') { // network-first so a new deploy is picked up; offline falls back to the cached shell
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./', cp)); return r; }).catch(() => caches.match('./', { ignoreSearch: true })));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => { if (r.ok && r.type === 'basic') { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })));
});
