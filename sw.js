// ═══════════════════════════════════════
// AMC Skrining — Service Worker v1.0
// Klinik Utama AMC · dr. Andi Fatimah Sp.KJ
// ═══════════════════════════════════════

const CACHE_NAME  = 'amc-skrining-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/amc_v5_final.html'
];

// ── INSTALL: cache semua aset ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      // Cache URL yang tersedia saja — tidak error jika 404
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => null))
      );
    })
  );
  self.skipWaiting(); // langsung aktif tanpa tunggu tab lama tutup
});

// ── ACTIVATE: hapus cache lama ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim(); // ambil alih semua tab yang terbuka
});

// ── FETCH: Cache First, fallback ke network ──
self.addEventListener('fetch', (event) => {
  // Hanya handle GET request
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', event.request.url);
        return cachedResponse;
      }

      // Tidak ada di cache — ambil dari network & simpan
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Offline fallback: kembalikan halaman utama dari cache
          console.log('[SW] Offline — serving fallback');
          return caches.match('/') || caches.match('/amc_v5_final.html');
        });
    })
  );
});

// ── MESSAGE: force update dari app ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
