// public/firebase-messaging-sw.js - FIXED VERSION
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBTqhwIelZ_YkwdUwZ3oJC9sXrUzQKNbNI",
  authDomain: "slack-clone-black-nuvercel.firebaseapp.com",
  projectId: "slack-clone-black-nuvercel",
  storageBucket: "slack-clone-black-nuvercel.firebasestorage.app",
  messagingSenderId: "1085299777134",
  appId: "1:1085299777134:web:e9b2c0a9e8b1eabecaaa9a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 🔥 ADD: Track recent notifications to prevent duplicates
let recentNotifications = new Set();

// Clean up cache every 2 minutes
setInterval(() => {
  recentNotifications.clear();
  console.log('🧹 SW: Cleaned notification cache');
}, 2 * 60 * 1000);

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('📨 SW: Background message received:', payload);
  
  
  const notifId = payload.data?.notificationId || 
                  payload.data?.messageId || 
                  `${payload.data?.senderId}_${Date.now()}`;
  
  if (recentNotifications.has(notifId)) {
    console.log('🚫 SW: Duplicate notification prevented:', notifId);
    return; 
  }
  
  recentNotifications.add(notifId);
  console.log('✅ SW: Showing notification:', notifId);
  
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/01.png',
    badge: '/01.png',
    data: payload.data || {},
    tag: notifId, 
    requireInteraction: true,
    renotify: false, 
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
  console.log('🔔 SW: Notification clicked:', event.notification);
  
  event.notification.close();

  if (event.action === 'open' || event.action === undefined) {
    const chatId = event.notification.data?.chatId;
    const urlToOpen = chatId ? 
      new URL(`/`, self.location.origin).href :
      new URL('/', self.location.origin).href;
    
    event.waitUntil(
      clients.matchAll({type: 'window'}).then((windowClients) => {
        // Check if app is already open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window if app not open
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