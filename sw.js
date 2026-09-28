// ============ SERVICE WORKER - VERSIÓN OFFLINE COMPLETA ============
const CACHE_NAME = 'control-personal-v3-offline';

const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db.js',
    './auth.js',
    './rfid.js',
    './manifest.json',
    // ✅ LIBRERÍAS LOCALES
    './libs/xlsx.full.min.js',
    './libs/jszip.min.js',
    './libs/FileSaver.min.js'
];

// ============ INSTALAR ============
self.addEventListener('install', (e) => {
    console.log('📦 Instalando Service Worker...');
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cacheando archivos...');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('✅ Todos los archivos cacheados');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('❌ Error al cachear:', err);
            })
    );
});

// ============ ACTIVAR ============
self.addEventListener('activate', (e) => {
    console.log('🚀 Activando Service Worker...');
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('🗑️ Eliminando cache antiguo:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker activado');
            return self.clients.claim();
        })
    );
});

// ============ FETCH - ESTRATEGIA CACHE FIRST ============
self.addEventListener('fetch', (e) => {
    // Ignorar requests que no sean GET
    if (e.request.method !== 'GET') {
        return;
    }
    
    // Ignorar requests a otros dominios (ej: analíticas)
    const url = new URL(e.request.url);
    if (url.origin !== location.origin) {
        return;
    }
    
    e.respondWith(
        caches.match(e.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // ✅ Está en caché → devolverlo (funciona offline)
                    return cachedResponse;
                }
                
                // No está en caché → intentar descargar
                return fetch(e.request)
                    .then(networkResponse => {
                        // Guardar copia en caché para la próxima
                        if (networkResponse && networkResponse.status === 200) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(e.request, responseClone);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // ❌ Sin internet y no está en caché
                        // Fallback: devolver index.html
                        return caches.match('./index.html');
                    });
            })
    );
});

// ============ MENSAJES ============
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('🗑️ Caché limpiado');
        });
    }
});