// DiceTech · service worker (red primero; la caché solo para usar sin conexión)
const CACHE = 'dicetech-v1';
const ARCHIVOS = ['./', 'index.html', 'app.js', 'fisica.js', 'dados.js', 'lib/three.min.js', 'lib/cannon-es.min.js',
  'fonts/cinzel-700.woff2', 'fonts/imfell-sc.woff2', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-32.png'];
const BASE = new URL('./', self.location).href;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  // el sitio se comparte con los contadores y con LudoTech: solo se borran las cachés propias
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('dicetech-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || !r.url.startsWith(BASE)) return;      // solo lo de esta carpeta
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});
