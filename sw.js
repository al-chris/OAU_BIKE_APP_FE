const CACHE_NAME = 'oau-bike-app-v1';
const DB_NAME = 'OAUBikeAppDB';
const DB_VERSION = 1;
const LOCATION_STORE = 'locationUpdates';
const EMERGENCY_STORE = 'emergencyAlerts';
const SETTINGS_STORE = 'appSettings';

const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// IndexedDB Database Setup
let db = null;

async function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('Upgrading IndexedDB schema');

            // Create location updates store
            if (!db.objectStoreNames.contains(LOCATION_STORE)) {
                const locationStore = db.createObjectStore(LOCATION_STORE, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                // Indexes for efficient querying
                locationStore.createIndex('timestamp', 'timestamp', { unique: false });
                locationStore.createIndex('sessionId', 'sessionId', { unique: false });
                locationStore.createIndex('synced', 'synced', { unique: false });
                
                console.log('Created locationUpdates store');
            }

            // Create emergency alerts store
            if (!db.objectStoreNames.contains(EMERGENCY_STORE)) {
                const emergencyStore = db.createObjectStore(EMERGENCY_STORE, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                // Indexes for efficient querying
                emergencyStore.createIndex('timestamp', 'timestamp', { unique: false });
                emergencyStore.createIndex('sessionId', 'sessionId', { unique: false });
                emergencyStore.createIndex('synced', 'synced', { unique: false });
                emergencyStore.createIndex('alertType', 'alertType', { unique: false });
                
                console.log('Created emergencyAlerts store');
            }

            // Create app settings store
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                const settingsStore = db.createObjectStore(SETTINGS_STORE, {
                    keyPath: 'key'
                });
                
                console.log('Created appSettings store');
            }
        };
    });
}

// Location Updates Management
async function storeLocationUpdate(locationData, sessionToken) {
    try {
        await initDB();
        
        const transaction = db.transaction([LOCATION_STORE], 'readwrite');
        const store = transaction.objectStore(LOCATION_STORE);
        
        const updateRecord = {
            ...locationData,
            sessionToken,
            timestamp: new Date().getTime(),
            synced: false,
            retryCount: 0,
            createdAt: new Date().toISOString()
        };
        
        await new Promise((resolve, reject) => {
            const request = store.add(updateRecord);
            request.onsuccess = () => {
                console.log('Location update stored offline:', request.result);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
        
        // Clean up old entries (keep only last 100 unsynced)
        await cleanupOldLocationUpdates();
        
    } catch (error) {
        console.error('Failed to store location update:', error);
    }
}

async function getStoredLocationUpdates() {
    try {
        await initDB();
        
        const transaction = db.transaction([LOCATION_STORE], 'readonly');
        const store = transaction.objectStore(LOCATION_STORE);
        const index = store.index('synced');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(false); // Get unsynced records
            
            request.onsuccess = () => {
                const updates = request.result.map(record => ({
                    id: record.id,
                    token: record.sessionToken,
                    data: {
                        latitude: record.latitude,
                        longitude: record.longitude,
                        accuracy: record.accuracy,
                        timestamp: record.createdAt
                    },
                    retryCount: record.retryCount || 0
                }));
                
                console.log(`Retrieved ${updates.length} stored location updates`);
                resolve(updates);
            };
            
            request.onerror = () => {
                console.error('Failed to retrieve location updates:', request.error);
                reject(request.error);
            };
        });
        
    } catch (error) {
        console.error('Failed to get stored location updates:', error);
        return [];
    }
}

async function markLocationUpdateSynced(updateId) {
    try {
        await initDB();
        
        const transaction = db.transaction([LOCATION_STORE], 'readwrite');
        const store = transaction.objectStore(LOCATION_STORE);
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(updateId);
            
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.synced = true;
                    record.syncedAt = new Date().toISOString();
                    
                    const putRequest = store.put(record);
                    putRequest.onsuccess = () => {
                        console.log('Location update marked as synced:', updateId);
                        resolve();
                    };
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(); // Record not found, might have been deleted
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
        
    } catch (error) {
        console.error('Failed to mark location update as synced:', error);
    }
}

async function incrementLocationUpdateRetry(updateId) {
    try {
        await initDB();
        
        const transaction = db.transaction([LOCATION_STORE], 'readwrite');
        const store = transaction.objectStore(LOCATION_STORE);
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(updateId);
            
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.retryCount = (record.retryCount || 0) + 1;
                    record.lastRetry = new Date().toISOString();
                    
                    const putRequest = store.put(record);
                    putRequest.onsuccess = () => {
                        console.log('Location update retry count incremented:', updateId);
                        resolve(record.retryCount);
                    };
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(0);
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
        
    } catch (error) {
        console.error('Failed to increment retry count:', error);
        return 0;
    }
}

async function clearStoredLocationUpdates() {
    try {
        await initDB();
        
        const transaction = db.transaction([LOCATION_STORE], 'readwrite');
        const store = transaction.objectStore(LOCATION_STORE);
        const index = store.index('synced');
        
        return new Promise((resolve, reject) => {
            const request = index.getAllKeys(true); // Get synced record keys
            
            request.onsuccess = () => {
                const keys = request.result;
                let deletedCount = 0;
                
                if (keys.length === 0) {
                    resolve(0);
                    return;
                }
                
                keys.forEach((key, index) => {
                    const deleteRequest = store.delete(key);
                    
                    deleteRequest.onsuccess = () => {
                        deletedCount++;
                        if (deletedCount === keys.length) {
                            console.log(`Cleared ${deletedCount} synced location updates`);
                            resolve(deletedCount);
                        }
                    };
                    
                    deleteRequest.onerror = () => {
                        console.error('Failed to delete location update:', key);
                        deletedCount++;
                        if (deletedCount === keys.length) {
                            resolve(deletedCount);
                        }
                    };
                });
            };
            
            request.onerror = () => {
                console.error('Failed to get synced location updates for cleanup:', request.error);
                reject(request.error);
            };
        });
        
    } catch (error) {
        console.error('Failed to clear stored location updates:', error);
        return 0;
    }
}

async function cleanupOldLocationUpdates() {
    try {
        await initDB();
        
        const transaction = db.transaction([LOCATION_STORE], 'readwrite');
        const store = transaction.objectStore(LOCATION_STORE);
        const index = store.index('synced');
        
        // Keep only last 100 unsynced records
        const request = index.getAll(false);
        
        request.onsuccess = () => {
            const records = request.result;
            if (records.length > 100) {
                // Sort by timestamp and delete oldest
                records.sort((a, b) => a.timestamp - b.timestamp);
                const toDelete = records.slice(0, records.length - 100);
                
                toDelete.forEach(record => {
                    store.delete(record.id);
                });
                
                console.log(`Cleaned up ${toDelete.length} old location updates`);
            }
        };
        
    } catch (error) {
        console.error('Failed to cleanup old location updates:', error);
    }
}

// Emergency Alerts Management
async function storeEmergencyAlert(alertData, sessionToken) {
    try {
        await initDB();
        
        const transaction = db.transaction([EMERGENCY_STORE], 'readwrite');
        const store = transaction.objectStore(EMERGENCY_STORE);
        
        const alertRecord = {
            ...alertData,
            sessionToken,
            timestamp: new Date().getTime(),
            synced: false,
            retryCount: 0,
            createdAt: new Date().toISOString(),
            priority: 'high' // Emergency alerts have high priority
        };
        
        await new Promise((resolve, reject) => {
            const request = store.add(alertRecord);
            request.onsuccess = () => {
                console.log('Emergency alert stored offline:', request.result);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
        
    } catch (error) {
        console.error('Failed to store emergency alert:', error);
    }
}

async function getStoredEmergencyAlerts() {
    try {
        await initDB();
        
        const transaction = db.transaction([EMERGENCY_STORE], 'readonly');
        const store = transaction.objectStore(EMERGENCY_STORE);
        const index = store.index('synced');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(false); // Get unsynced records
            
            request.onsuccess = () => {
                const alerts = request.result.map(record => ({
                    id: record.id,
                    token: record.sessionToken,
                    data: {
                        latitude: record.latitude,
                        longitude: record.longitude,
                        alert_type: record.alert_type || record.alertType,
                        message: record.message,
                        timestamp: record.createdAt
                    },
                    retryCount: record.retryCount || 0,
                    priority: record.priority || 'high'
                }));
                
                // Sort by priority and timestamp (high priority first, then newest)
                alerts.sort((a, b) => {
                    if (a.priority === 'high' && b.priority !== 'high') return -1;
                    if (a.priority !== 'high' && b.priority === 'high') return 1;
                    return new Date(b.data.timestamp) - new Date(a.data.timestamp);
                });
                
                console.log(`Retrieved ${alerts.length} stored emergency alerts`);
                resolve(alerts);
            };
            
            request.onerror = () => {
                console.error('Failed to retrieve emergency alerts:', request.error);
                reject(request.error);
            };
        });
        
    } catch (error) {
        console.error('Failed to get stored emergency alerts:', error);
        return [];
    }
}

async function markEmergencyAlertSynced(alertId) {
    try {
        await initDB();
        
        const transaction = db.transaction([EMERGENCY_STORE], 'readwrite');
        const store = transaction.objectStore(EMERGENCY_STORE);
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(alertId);
            
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.synced = true;
                    record.syncedAt = new Date().toISOString();
                    
                    const putRequest = store.put(record);
                    putRequest.onsuccess = () => {
                        console.log('Emergency alert marked as synced:', alertId);
                        resolve();
                    };
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(); // Record not found
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
        
    } catch (error) {
        console.error('Failed to mark emergency alert as synced:', error);
    }
}

async function incrementEmergencyAlertRetry(alertId) {
    try {
        await initDB();
        
        const transaction = db.transaction([EMERGENCY_STORE], 'readwrite');
        const store = transaction.objectStore(EMERGENCY_STORE);
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(alertId);
            
            getRequest.onsuccess = () => {
                const record = getRequest.result;
                if (record) {
                    record.retryCount = (record.retryCount || 0) + 1;
                    record.lastRetry = new Date().toISOString();
                    
                    const putRequest = store.put(record);
                    putRequest.onsuccess = () => {
                        console.log('Emergency alert retry count incremented:', alertId);
                        resolve(record.retryCount);
                    };
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(0);
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
        
    } catch (error) {
        console.error('Failed to increment emergency alert retry count:', error);
        return 0;
    }
}

async function clearStoredEmergencyAlerts() {
    try {
        await initDB();
        
        const transaction = db.transaction([EMERGENCY_STORE], 'readwrite');
        const store = transaction.objectStore(EMERGENCY_STORE);
        const index = store.index('synced');
        
        return new Promise((resolve, reject) => {
            const request = index.getAllKeys(true); // Get synced record keys
            
            request.onsuccess = () => {
                const keys = request.result;
                let deletedCount = 0;
                
                if (keys.length === 0) {
                    resolve(0);
                    return;
                }
                
                keys.forEach((key) => {
                    const deleteRequest = store.delete(key);
                    
                    deleteRequest.onsuccess = () => {
                        deletedCount++;
                        if (deletedCount === keys.length) {
                            console.log(`Cleared ${deletedCount} synced emergency alerts`);
                            resolve(deletedCount);
                        }
                    };
                    
                    deleteRequest.onerror = () => {
                        console.error('Failed to delete emergency alert:', key);
                        deletedCount++;
                        if (deletedCount === keys.length) {
                            resolve(deletedCount);
                        }
                    };
                });
            };
            
            request.onerror = () => {
                console.error('Failed to get synced emergency alerts for cleanup:', request.error);
                reject(request.error);
            };
        });
        
    } catch (error) {
        console.error('Failed to clear stored emergency alerts:', error);
        return 0;
    }
}

// App Settings Management
async function storeAppSetting(key, value) {
    try {
        await initDB();
        
        const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE);
        
        const settingRecord = {
            key,
            value,
            timestamp: new Date().getTime(),
            updatedAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.put(settingRecord);
            request.onsuccess = () => {
                console.log('App setting stored:', key);
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
        
    } catch (error) {
        console.error('Failed to store app setting:', error);
    }
}

async function getAppSetting(key) {
    try {
        await initDB();
        
        const transaction = db.transaction([SETTINGS_STORE], 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE);
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            
            request.onerror = () => {
                console.error('Failed to get app setting:', request.error);
                reject(request.error);
            };
        });
        
    } catch (error) {
        console.error('Failed to get app setting:', error);
        return null;
    }
}

// Network Status Detection
let isOnline = navigator.onLine;

self.addEventListener('online', () => {
    isOnline = true;
    console.log('App is back online, attempting to sync data...');
    
    // Trigger background sync when back online
    self.registration.sync.register('background-sync-location');
    self.registration.sync.register('background-sync-emergency');
});

self.addEventListener('offline', () => {
    isOnline = false;
    console.log('App is offline, data will be stored locally');
});

// Enhanced Sync Functions
async function syncLocationUpdates() {
    try {
        console.log('Starting location updates sync...');
        const pendingUpdates = await getStoredLocationUpdates();
        
        if (pendingUpdates.length === 0) {
            console.log('No location updates to sync');
            return true;
        }
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const update of pendingUpdates) {
            try {
                // Check retry limit (max 5 retries)
                if (update.retryCount >= 5) {
                    console.log('Max retries reached for location update:', update.id);
                    await markLocationUpdateSynced(update.id); // Mark as synced to stop retrying
                    continue;
                }
                
                const response = await fetch('/api/location/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${update.token}`
                    },
                    body: JSON.stringify(update.data)
                });
                
                if (response.ok) {
                    await markLocationUpdateSynced(update.id);
                    successCount++;
                    console.log('Location update synced successfully:', update.id);
                } else {
                    await incrementLocationUpdateRetry(update.id);
                    failureCount++;
                    console.warn('Location update sync failed:', response.status, update.id);
                }
                
            } catch (error) {
                await incrementLocationUpdateRetry(update.id);
                failureCount++;
                console.error('Location update sync error:', error, update.id);
            }
            
            // Add small delay between requests to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`Location sync completed: ${successCount} success, ${failureCount} failed`);
        
        // Clean up successfully synced records
        if (successCount > 0) {
            await clearStoredLocationUpdates();
        }
        
        return successCount > 0 || failureCount === 0;
        
    } catch (error) {
        console.error('Failed to sync location updates:', error);
        return false;
    }
}

async function syncEmergencyAlerts() {
    try {
        console.log('Starting emergency alerts sync...');
        const pendingAlerts = await getStoredEmergencyAlerts();
        
        if (pendingAlerts.length === 0) {
            console.log('No emergency alerts to sync');
            return true;
        }
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const alert of pendingAlerts) {
            try {
                // Emergency alerts have higher retry limit (10 retries)
                if (alert.retryCount >= 10) {
                    console.log('Max retries reached for emergency alert:', alert.id);
                    await markEmergencyAlertSynced(alert.id);
                    continue;
                }
                
                const response = await fetch('/api/emergency/alert', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${alert.token}`
                    },
                    body: JSON.stringify(alert.data)
                });
                
                if (response.ok) {
                    await markEmergencyAlertSynced(alert.id);
                    successCount++;
                    console.log('Emergency alert synced successfully:', alert.id);
                    
                    // Show notification for successful emergency sync
                    self.registration.showNotification('Emergency Alert Sent', {
                        body: 'Your emergency alert has been successfully sent to authorities.',
                        icon: '/favicon/android-chrome-192x192.png',
                        badge: '/favicon/android-chrome-32x32.png',
                        tag: `emergency-sync-${alert.id}`,
                        vibrate: [200, 100, 200],
                        data: { type: 'emergency-synced', alertId: alert.id }
                    });
                    
                } else {
                    await incrementEmergencyAlertRetry(alert.id);
                    failureCount++;
                    console.warn('Emergency alert sync failed:', response.status, alert.id);
                }
                
            } catch (error) {
                await incrementEmergencyAlertRetry(alert.id);
                failureCount++;
                console.error('Emergency alert sync error:', error, alert.id);
            }
            
            // Shorter delay for emergency alerts
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log(`Emergency sync completed: ${successCount} success, ${failureCount} failed`);
        
        // Clean up successfully synced records
        if (successCount > 0) {
            await clearStoredEmergencyAlerts();
        }
        
        return successCount > 0 || failureCount === 0;
        
    } catch (error) {
        console.error('Failed to sync emergency alerts:', error);
        return false;
    }
}

// Service Worker Event Handlers
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            }),
            initDB()
        ])
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            initDB()
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Handle API requests differently based on whether we're online
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleAPIRequest(event.request));
    } else {
        // Standard caching strategy for static assets
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
        );
    }
});

async function handleAPIRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Try to make the request
        const response = await fetch(request);
        
        if (response.ok) {
            return response;
        } else {
            // If request fails but we're handling specific endpoints, store for later
            if (request.method === 'POST') {
                await handleFailedAPIRequest(request);
            }
            return response;
        }
        
    } catch (error) {
        console.log('API request failed, handling offline:', url.pathname);
        
        // Store POST requests for later sync
        if (request.method === 'POST') {
            await handleFailedAPIRequest(request);
            
            // Return a custom response indicating offline storage
            return new Response(
                JSON.stringify({ 
                    offline: true, 
                    message: 'Request stored for sync when online',
                    timestamp: new Date().toISOString()
                }),
                {
                    status: 202, // Accepted
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // For GET requests, try to return cached data or a generic offline response
        return new Response(
            JSON.stringify({ 
                error: 'Offline', 
                message: 'Unable to fetch data while offline' 
            }),
            {
                status: 503, // Service Unavailable
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

async function handleFailedAPIRequest(request) {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization');
    const sessionToken = authHeader ? authHeader.replace('Bearer ', '') : null;
    
    try {
        const requestData = await request.clone().json();
        
        if (url.pathname === '/api/location/update') {
            await storeLocationUpdate(requestData, sessionToken);
            console.log('Location update stored for offline sync');
            
        } else if (url.pathname === '/api/emergency/alert') {
            await storeEmergencyAlert(requestData, sessionToken);
            console.log('Emergency alert stored for offline sync');
            
            // Show immediate notification for offline emergency
            self.registration.showNotification('Emergency Alert Stored', {
                body: 'Your emergency alert has been stored and will be sent when connection is restored.',
                icon: '/favicon/android-chrome-192x192.png',
                badge: '/favicon/android-chrome-32x32.png',
                tag: 'emergency-offline',
                vibrate: [200, 100, 200, 100, 200],
                data: { type: 'emergency-offline' }
            });
        }
        
    } catch (error) {
        console.error('Failed to handle offline API request:', error);
    }
}

self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync-location') {
        event.waitUntil(syncLocationUpdates());
    }
    
    if (event.tag === 'background-sync-emergency') {
        event.waitUntil(syncEmergencyAlerts());
    }
    
    // Periodic sync for general cleanup
    if (event.tag === 'background-sync-cleanup') {
        event.waitUntil(performPeriodicCleanup());
    }
});

async function performPeriodicCleanup() {
    try {
        console.log('Performing periodic cleanup...');
        
        // Clean up old cached data
        await cleanupOldLocationUpdates();
        
        // Clean up old caches
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
            if (cacheName !== CACHE_NAME) {
                await caches.delete(cacheName);
                console.log('Deleted old cache:', cacheName);
            }
        }
        
        console.log('Periodic cleanup completed');
        
    } catch (error) {
        console.error('Periodic cleanup failed:', error);
    }
}

self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);
    
    const options = {
        body: event.data ? event.data.text() : 'New notification from OAU Bike App',
        icon: '/favicon/android-chrome-192x192.png',
        badge: '/favicon/android-chrome-32x32.png',
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

self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);
    
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Periodic sync registration (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('Periodic sync triggered:', event.tag);
    
    if (event.tag === 'oau-bike-sync') {
        event.waitUntil(
            Promise.all([
                syncLocationUpdates(),
                syncEmergencyAlerts(),
                performPeriodicCleanup()
            ])
        );
    }
});

// Message handling for communication with main app
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'GET_SYNC_STATUS') {
        event.ports[0].postMessage({
            type: 'SYNC_STATUS',
            isOnline,
            dbInitialized: db !== null
        });
    }
    
    if (event.data.type === 'FORCE_SYNC') {
        Promise.all([
            syncLocationUpdates(),
            syncEmergencyAlerts()
        ]).then(() => {
            event.ports[0].postMessage({
                type: 'SYNC_COMPLETE',
                success: true
            });
        }).catch((error) => {
            event.ports[0].postMessage({
                type: 'SYNC_COMPLETE',
                success: false,
                error: error.message
            });
        });
    }
});

console.log('OAU Bike App Service Worker loaded with complete IndexedDB functionality');