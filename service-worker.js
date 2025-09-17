const CACHE_NAME = 'eldoria-ai-ide-cache-v1';
// List of assets to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx', // The source file will be requested by the browser module loader
  '/icon.svg',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap',
  'https://i.imgur.com/V9nB3tV.png', // Background image
  // Import map URLs
  'https://aistudiocdn.com/react@^19.1.1',
  'https://aistudiocdn.com/react-dom@^19.1.1',
  'https://aistudiocdn.com/@google/genai@^1.19.0',
  'https://aistudiocdn.com/@supabase/supabase-js@^2.45.0',
  'https://aistudiocdn.com/react-markdown@^9.0.1',
  'https://aistudiocdn.com/remark-gfm@^4.0.0',
  'https://aistudiocdn.com/react-syntax-highlighter@^15.5.0',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        const uniqueUrls = [...new Set(urlsToCache)];
        
        const requests = uniqueUrls.map(url => {
          if (new URL(url, self.location.origin).origin !== self.location.origin) {
            return new Request(url, { mode: 'no-cors' });
          }
          return url;
        });

        // Attempt to cache all essential assets; be robust to individual failures of external resources.
        const individualCachePromises = requests.map(request => 
            cache.add(request).catch(e => console.warn(`Failed to cache: ${request.url || request}`, e))
        );
        return Promise.all(individualCachePromises);
      })
      .then(() => {
        console.log('Service Worker: Installation complete.');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Activation complete.');
        return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Use a stale-while-revalidate strategy for performance and offline capability.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response to cache
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(err => {
            console.warn(`Service Worker: Fetch failed for ${event.request.url}.`, err);
        });

        // Return cached response immediately if available, otherwise wait for the network.
        return cachedResponse || fetchPromise;
      });
    })
  );
});
