/* Wen Counter service worker: caches the app shell so the counter opens instantly and offline.
 * Payments always need the network; RPC calls are never cached. Apache-2.0. */
const CACHE = 'wen-counter-v10';
const SHELL = ['./', './index.html', './counter-core.js', './counter-i18n.js', './counter-deploy.js', './counter-app.js', './qrcode.js', './theme.css', './counter.css', './manifest.webmanifest', '../../assets/icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // RPC and explorers go straight to the network
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
