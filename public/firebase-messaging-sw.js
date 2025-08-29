// public/firebase-messaging-sw.js - FIXED VERSION
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

// Background message handler with deduplication
messaging.onBackgroundMessage((payload) => {
  console.log('📨 Background message received:', payload);
  
  // Deduplication - check if same notification was recently shown
  const messageId = payload.messageId || `${payload.data?.chatId}-${Date.now()}`;
  const lastNotificationKey = `lastNotif_${messageId}`;
  const lastNotificationTime = localStorage.getItem(lastNotificationKey);
  const currentTime = Date.now();

  if (lastNotificationTime && currentTime - parseInt(lastNotificationTime) < 3000) {
    console.log('🚫 Duplicate background notification ignored');
    return;
  }

  localStorage.setItem(lastNotificationKey, currentTime.toString());

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: payload.data || {},
    tag: messageId, // Deduplication tag
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App'
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

  if (event.action === 'open' || !event.action) {
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