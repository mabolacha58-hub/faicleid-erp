const CACHE_NAME = 'faicleid-erp-v2';

const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Instalação ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_FILES).catch((err) => {
        console.warn('[SW] Cache estático falhou:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activação — limpar caches antigos ───────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch — NUNCA interceptar pedidos externos ──────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ✅ Ignorar completamente — deixar passar sem interceptar:
  // - Qualquer origem externa (supabase, googleapis, etc.)
  // - Pedidos que não sejam GET
  // - Pedidos de extensões do browser
  if (
    url.origin !== self.location.origin ||
    event.request.method !== 'GET' ||
    url.protocol === 'chrome-extension:'
  ) {
    return; // Não chamar event.respondWith — browser trata normalmente
  }

  // ── Navegação (HTML) — Network First ──────────────────
  // Garante que o index.html é sempre fresco, evitando servir HTML antigo
  // que referencia bundles inexistentes (ecrã em branco após deploy).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // ── Ficheiros estáticos locais — Cache First ──────────
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // Só fazer cache de respostas válidas de ficheiros estáticos
        if (
          response.ok &&
          (url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.ico') ||
           url.pathname === '/manifest.json')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});