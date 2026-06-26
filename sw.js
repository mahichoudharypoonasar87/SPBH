/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Service Worker
 * =====================================================
 * File: /sw.js
 * Description: Caches static assets for offline support 
 * and faster load times. Uses Cache-First strategy for 
 * static files and Network-First for dynamic Firebase calls.
 * =====================================================
 */

const CACHE_NAME = 'spb-handloom-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/profile.html',
  '/cart.html',
  '/product.html',
  '/orders.html',
  '/admin.html',
  '/css/style.css',
  '/css/responsive.css',
  '/css/animation.css',
  '/css/admin.css',
  '/js/firebase.js',
  '/js/utils.js',
  '/js/app.js',
  '/js/auth.js',
  '/js/cart.js',
  '/js/products.js',
  '/js/product.js',
  '/js/profile.js',
  '/js/order.js',
  '/js/admin.js',
  '/manifest.json'
  // Note: External CDNs (Fonts, FontAwesome) are cached on-the-fly below
];

// Install Event: Cache Core Files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching offline shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[SW] Pre-cache failed', error);
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate Event: Clean Old Caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all clients immediately
});

// Fetch Event: Serve from Cache, fallback to Network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Strategy 1: Network First for Firebase APIs (Auth, Firestore, Storage)
  // We don't want to serve cached user data or products, we want real-time data
  if (requestUrl.hostname.includes('googleapis.com') || requestUrl.hostname.includes('firebaseio.com') || requestUrl.hostname.includes('google.com')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Optional: Cache successful API responses for offline fallback later if needed
          return response;
        })
        .catch(() => {
          // If offline, we could serve a fallback UI here if desired
          return new Response(JSON.stringify({ error: 'You are offline' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Strategy 2: Cache First for Static Assets (CSS, JS, HTML, Images, Fonts)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return cached version
      }
      
      // If not in cache, fetch from network and then cache it
      return fetch(event.request).then((networkResponse) => {
        // Only cache GET requests that are successful
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for HTML pages if offline and not cached
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});