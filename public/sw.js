const CACHE = 'jinnahpark-static-v2';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jinnahpark-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
 const request = event.request, url = new URL(request.url);
 if (request.method !== 'GET' || url.origin !== self.location.origin || request.mode === 'navigate' || !/\.(?:png|jpg|svg|webp|css|woff2?)$/.test(url.pathname)) return;
 event.respondWith(fetch(request).then(response => { if (response.ok) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy))); } return response; }).catch(()=>caches.match(request).then(hit=>hit || Response.error())));
});
