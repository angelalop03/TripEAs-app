// Service worker de TripEAs (versión web / PWA).
// Objetivo: que el navegador permita "instalar" la app y que el esqueleto
// cargue rápido. NO cachea datos del backend (otro dominio): los viajes,
// gastos, etc. siempre se piden en vivo a la API.
const CACHE = 'tripeas-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Borra cachés de versiones anteriores del service worker.
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo GET del propio dominio; la API de Render pasa directa a la red.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Los bundles de Expo y los assets llevan hash en el nombre: si existe en
  // caché, es exactamente el mismo archivo, así que se sirve desde ahí.
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (enCache) =>
          enCache ||
          fetch(request).then((respuesta) => {
            if (respuesta.ok) {
              const copia = respuesta.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copia));
            }
            return respuesta;
          })
      )
    );
    return;
  }

  // Páginas HTML: primero la red (para tener siempre la última versión);
  // si no hay conexión, la última copia guardada.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copia));
          }
          return respuesta;
        })
        .catch(() => caches.match(request).then((enCache) => enCache || caches.match('/')))
    );
  }
});
