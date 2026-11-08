/* Service worker Antheia Peduli — aplikasi tetap bisa dibuka saat sinyal lemah.
   Data & absensi selalu lewat internet ke Google Apps Script (tidak di-cache di sini). */
const CACHE = 'antheia-peduli-v1';
const APP = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(APP);
    await Promise.all(LIBS.map((u) => fetch(u, { mode: 'cors' }).then((r) => r.ok && c.put(u, r)).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                                   // simpan absensi: selalu ke server
  const url = new URL(req.url);
  if (/script\.google(usercontent)?\.com$/.test(url.hostname)) return; // data: selalu ke server
  if (url.origin === location.origin) {
    // halaman & ikon: ambil versi terbaru bila online, pakai cache bila offline
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
    return;
  }
  // pustaka QR & font: cache dulu
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && (url.hostname === 'cdn.jsdelivr.net' || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
