// Service Worker for Jujutsu Kaisen site — offline support
const CACHE_VERSION = 'jjk-cache-v1';
const CACHE_NAME = CACHE_VERSION;

// Base path — adjust if you move the site off the current sub-path.
const BASE = './';

// Core files needed for the app shell to work offline.
const CORE_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'index.css',
  BASE + 'manifest.json',
  BASE + 'movie.html',
  BASE + 'movie2.html',
  BASE + 'movie4.html',
  BASE + 'season1.html',
  BASE + 'season2.html',
  BASE + 'season3.html',
  BASE + 'season4.html',
  BASE + 'season5.html',
  BASE + 'season6.html',
  BASE + 'icons/icon-72x72.png',
  BASE + 'icons/icon-96x96.png',
  BASE + 'icons/icon-128x128.png',
  BASE + 'icons/icon-144x144.png',
  BASE + 'icons/icon-152x152.png',
  BASE + 'icons/icon-180x180.png',
  BASE + 'icons/icon-192x192.png',
  BASE + 'icons/icon-384x384.png',
  BASE + 'icons/icon-512x512.png'
];

// Character/logo images — cached lazily on first visit (see fetch handler),
// but listed here too in case you want them pre-cached on install.
const IMAGE_ASSETS = [
  'choso2.jpg','dagon.jpg','geto2.jpg','gojo2.jpg','hakari.jpg','hanami.jpg',
  'higuroma.jpg','jogo.jpg','kanjakus2.jpg','kashimo.jpg','kusakaba.jpg',
  'logo.jpg','logo1.jpg','logo10.jpg','logo2.jpg','logo3.jpg','logo5.jpg',
  'logo6.jpg','logo7.jpg','logo8.jpg','logo9.jpg','machamaru.jpg','mahito2.jpg',
  'maki3.jpg','megumi.jpg','meime0i.jpg','miguel.jpg','naiobito.jpg','nanami2.jpg',
  'naoya.jpg','nobara.jpg','ryu.jpg','shoko.jpg','sukuna.jpg','takaba.jpg',
  'todo.jpg','toji2.jpg','uraume.jpg','uro.jpg','utahime.jpg','yorozu.jpg',
  'yuji3.jpg','yuki.jpg','yuta4.jpg'
].map(name => BASE + 'images/' + name);

const PRECACHE_URLS = CORE_ASSETS.concat(IMAGE_ASSETS);

// --- Install: pre-cache the app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Add each file individually so one missing/renamed file
      // doesn't fail the whole install.
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('SW: failed to precache', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// --- Activate: clean up old caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Fetch: cache-first for same-origin assets, network falling back to cache ---
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin requests; let cross-origin (fonts, CDNs) pass through normally.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigation requests (loading a page): try network first, fall back to cache, then to index.html.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match(BASE + 'index.html'))
        )
    );
    return;
  }

  // Everything else (css, images, icons): cache-first, then network, and cache the result.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // Only cache valid responses.
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => {
          // Optional: return a fallback icon for failed image requests.
          if (req.destination === 'image') {
            return caches.match(BASE + 'icons/icon-192x192.png');
          }
        });
    })
  );
});
