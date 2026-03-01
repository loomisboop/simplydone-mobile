// Service Worker for SDAPWA v1.3.3 (with FCM)
// Provides offline support, asset caching, and background notifications

// Try to import Firebase Messaging (may not work on all platforms)
let firebaseMessagingAvailable = false;
let messaging = null;

try {
    importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');
    
    // Firebase configuration (must match your app config)
    firebase.initializeApp({
        apiKey: "AIzaSyDKmj5YhwFNK90dLq3Um-nMkqqU9Yu5R0E",
        authDomain: "simplydonesync.firebaseapp.com",
        projectId: "simplydonesync",
        storageBucket: "simplydonesync.firebasestorage.app",
        messagingSenderId: "389712724470",
        appId: "1:389712724470:web:0a3f48dde195c1de29c7d7"
    });
    
    // Initialize Firebase Messaging
    messaging = firebase.messaging();
    firebaseMessagingAvailable = true;
    console.log('[SW] Firebase Messaging initialized successfully');
    
    // Handle background messages (when app is closed or in background)
    messaging.onBackgroundMessage((payload) => {
        console.log('[SW] Background message received:', payload);
        
        const { notification, data } = payload;
        
        const options = {
            body: notification?.body || 'You have a task update',
            icon: '/assets/icons/icon-192.png',
            badge: '/assets/icons/icon-96.png',
            vibrate: [200, 100, 200],
            tag: data?.type || 'fcm-background',
            requireInteraction: data?.type === 'task_start' || data?.type === 'bmde_warning',
            data: data || {}
        };
        
        return self.registration.showNotification(
            notification?.title || 'SimplyDone',
            options
        );
    });
} catch (e) {
    console.warn('[SW] Firebase Messaging not available:', e.message);
    // Continue without FCM - basic service worker functionality will still work
}

const CACHE_NAME = 'sdapwa-v1.3.3-fcm';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/css/components.css',
    '/css/screens.css',
    '/css/animations.css',
    '/js/app.js',
    '/js/auth.js',
    '/js/firebase-config.js',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v1.3.3...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v1.3.3...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip Firebase and external requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    // Skip Nominatim API requests
    if (event.request.url.includes('nominatim.openstreetmap.org')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request).then((fetchResponse) => {
                    // Cache successful responses
                    if (fetchResponse && fetchResponse.status === 200) {
                        const responseToCache = fetchResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return fetchResponse;
                });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Push notification event - handle incoming push messages
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);
    
    let data = {
        title: 'SimplyDone',
        body: 'You have a task update',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-96.png'
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || '/assets/icons/icon-192.png',
        badge: data.badge || '/assets/icons/icon-96.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'simplydone-notification',
        requireInteraction: data.requireInteraction || false,
        data: data.data || {}
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event - handle user interaction with notifications
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    
    event.notification.close();
    
    // Focus or open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.focus();
                        // Send message to navigate to relevant screen
                        if (event.notification.data && event.notification.data.taskId) {
                            client.postMessage({
                                type: 'NOTIFICATION_CLICK',
                                data: event.notification.data
                            });
                        }
                        return;
                    }
                }
                // If app is not open, open it
                if (clients.openWindow) {
                    return clients.openWindow('/');
                }
            })
    );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notification closed:', event.notification.tag);
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    // Handle scheduled notification request from app
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { title, body, delay, tag, data } = event.data;
        
        setTimeout(() => {
            self.registration.showNotification(title, {
                body,
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-96.png',
                vibrate: [200, 100, 200],
                tag: tag || 'scheduled-notification',
                requireInteraction: true,
                data: data || {}
            });
        }, delay);
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync:', event.tag);
    
    if (event.tag === 'check-tasks') {
        event.waitUntil(checkTasksInBackground());
    }
});

// Check tasks in background (for future use with Background Sync API)
async function checkTasksInBackground() {
    console.log('[SW] Checking tasks in background...');
    // This will be used when Background Sync is fully supported
    // For now, the main app handles task checking
}

console.log('[SW] Service Worker v1.3.3 loaded');
