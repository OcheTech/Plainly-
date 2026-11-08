// Plainly service worker: caches the app so it works offline after the first visit.
const CACHE = "plainly-v2";
const SHELL = ["./", "index.html", "styles.css", "icon.svg", "manifest.webmanifest",
  "js/kb.js", "js/i18n.js", "js/engine.js", "js/checks.js", "js/nlm.js", "js/translate.js", "js/mt-worker.js",
  "js/exporters.js", "js/reconcile.js", "js/writer.js", "js/samples.js", "js/app.js"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // App files: network first (fresh when online), cache when offline
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
    return;
  }
  // Libraries and fonts from CDNs: cache first (versioned URLs)
  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })));
  }
});
