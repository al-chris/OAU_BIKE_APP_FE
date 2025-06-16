const CACHE_NAME = 'oau-bike-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install service worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});

// Activate service worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-location') {
        event.waitUntil(syncLocationUpdates());
    }
    if (event.tag === 'background-sync-emergency') {
        event.waitUntil(syncEmergencyAlerts());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New notification from OAU Bike App',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: '1'
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: '/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/xmark.png'
            },
        ]
    };

    event.waitUntil(
        self.registration.showNotification('OAU Campus Bike Alert', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Sync functions
async function syncLocationUpdates() {
    // Sync any pending location updates when back online
    try {
        const pendingUpdates = await getStoredLocationUpdates();
        for (const update of pendingUpdates) {
            await fetch('/api/location/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${update.token}`
                },
                body: JSON.stringify(update.data)
            });
        }
        await clearStoredLocationUpdates();
    } catch (error) {
        console.error('Failed to sync location updates:', error);
    }
}

async function syncEmergencyAlerts() {
    // Sync any pending emergency alerts when back online
    try {
        const pendingAlerts = await getStoredEmergencyAlerts();
        for (const alert of pendingAlerts) {
            await fetch('/api/emergency/alert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${alert.token}`
                },
                body: JSON.stringify(alert.data)
            });
        }
        await clearStoredEmergencyAlerts();
    } catch (error) {
        console.error('Failed to sync emergency alerts:', error);
    }
}

// IndexedDB helpers for offline storage
async function getStoredLocationUpdates() {
    // Implementation would use IndexedDB to retrieve stored updates
    return [];
}

async function clearStoredLocationUpdates() {
    // Implementation would clear stored updates from IndexedDB
}

async function getStoredEmergencyAlerts() {
    // Implementation would use IndexedDB to retrieve stored alerts
    return [];
}

async function clearStoredEmergencyAlerts() {
    // Implementation would clear stored alerts from IndexedDB
}