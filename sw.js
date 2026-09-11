/* Bag check — offline cache.
   Deliberately split: the shell goes network-first so a deploy actually lands,
   and the artwork and audio go cache-first because they never change without
   also changing name. Bump CACHE whenever you bump the ?v= in index.html. */
const CACHE = 'bagcheck-v33';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/style.css?v=33',
  './assets/items.js?v=33',
  './assets/game.js?v=33'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isAsset = url => /\.(png|jpe?g|mp3|webmanifest)$/i.test(url.pathname);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* fonts etc: leave alone */

  if (isAsset(url)) {
    /* cards, suitcases, foley: fetch once, keep forever */
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  /* html, css, js: take the network if it is there, fall back to the cache */
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
