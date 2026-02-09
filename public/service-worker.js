// Service Worker for Web Push Notifications
// This file handles push notifications and notification clicks

const CACHE_NAME = 'horizon-notifications-v1';
const FRONTEND_URL = self.location.origin;

// Install event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting(); // Activate immediately
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(self.clients.claim());
});

// Push event - Receive and display notification
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');
  
  if (!event.data) {
    console.warn('[Service Worker] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, badge, url, data: customData } = data;

    const options = {
      body: body,
      icon: icon || '/icon-192.png',
      badge: badge || '/badge-72.png',
      data: {
        url: url || FRONTEND_URL,
        ...customData,
      },
      requireInteraction: false, // Auto-dismiss after a while
      vibrate: [200, 100, 200], // Vibration pattern
      tag: customData?.notification_type || 'horizon-notification', // Group similar notifications
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();

  const url = event.notification.data?.url || FRONTEND_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open with this URL
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event (optional analytics)
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed', event.notification.tag);
  
  // Could send analytics event here if needed
});

// Message event - Communication from the main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
