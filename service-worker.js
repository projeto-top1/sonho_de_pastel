
const CACHE_NAME = 'entregas-v3-cache-v3';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  // Adicionar mais recursos para garantir funcionamento offline
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-brands-400.woff2'
];

// URLs essenciais que devem estar sempre disponíveis offline
const ESSENTIAL_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Ignorar requisições não-http
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Estratégia: Cache First para recursos essenciais, Network First para outros
  const isEssential = ESSENTIAL_URLS.some(url => 
    event.request.url.includes(url) || event.request.url.endsWith(url)
  );
  
  if (isEssential) {
    // Cache First para recursos essenciais
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            // Tentar atualizar em background
            fetch(event.request)
              .then((fetchResponse) => {
                if (fetchResponse && fetchResponse.status === 200) {
                  caches.open(CACHE_NAME)
                    .then((cache) => {
                      cache.put(event.request, fetchResponse.clone());
                    });
                }
              })
              .catch(() => {
                // Falha silenciosa para atualização em background
              });
            
            return response;
          }

          // Se não estiver no cache, buscar da rede
          return fetch(event.request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return response;
            })
            .catch(() => {
              // Fallback para página principal
              return caches.match('./index.html');
            });
        })
    );
  } else {
    // Network First para outros recursos
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Se a rede falhar, tentar o cache
          return caches.match(event.request)
            .then((response) => {
              if (response) {
                return response;
              }
              // Fallback final
              return caches.match('./index.html');
            });
        })
    );
  }
});

// Notificação quando há novo conteúdo disponível
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync para sincronização de dados quando voltar online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-entregas') {
    event.waitUntil(sincronizarDados());
  }
});

async function sincronizarDados() {
  try {
    console.log('🔄 Sincronizando dados em background...');
    // Aqui você pode implementar lógica de sincronização com servidor
    // Por enquanto, apenas log
    console.log('✅ Sincronização concluída');
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    throw error;
  }
}

// Notificações push (preparação para futuras funcionalidades)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || './manifest.json',
      badge: './manifest.json',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Clique em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
