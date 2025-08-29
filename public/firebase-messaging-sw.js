// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "<?= process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?>",
  authDomain: "<?= process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?>",
  projectId: "<?= process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?>",
  storageBucket: "<?= process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?>",
  messagingSenderId: "<?= process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?>",
  appId: "<?= process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?>"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('📨 Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: payload.data || {},
    tag: `bg-${Date.now()}`,
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification);
  
  event.notification.close();

  if (event.action === 'open') {
    const urlToOpen = new URL('/', self.location.origin).href;
    
    event.waitUntil(
      clients.matchAll({type: 'window'}).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});