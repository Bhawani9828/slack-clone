// public/firebase-messaging-sw.js - Updated Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

console.log("🔹 Service Worker file loaded");

const firebaseConfig = {
  apiKey: "AIzaSyDvXxvp2AB5jU_exDIl9IqC46rzeYQhUCc",
  authDomain: "whats-web-app-51590.firebaseapp.com",
  projectId: "whats-web-app-51590",
  storageBucket: "whats-web-app-51590.firebasestorage.app",
  messagingSenderId: "461402838055",
  appId: "1:461402838055:web:ad1db99758a02ccd1c6a02"
};

let firebaseApp = null;
let messaging = null;

try {
  firebaseApp = firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized in Service Worker");
} catch (err) {
  console.error("❌ Error initializing Firebase in SW:", err);
}

try {
  messaging = firebase.messaging();
  console.log("✅ Messaging initialized in Service Worker");
} catch (err) {
  console.error("❌ Error initializing Messaging in SW:", err);
}

// Activate immediately
self.addEventListener('install', (event) => {
  console.log('🔹 Service Worker installing...');
  self.skipWaiting(); // Force activation
});

self.addEventListener('activate', (event) => {
  console.log('🔹 Service Worker activating...');
  event.waitUntil(
    clients.claim().then(() => {
      console.log('✅ Service Worker activated and claiming clients');
    })
  );
});

// Handle background messages
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('📩 Background Message received:', payload);

    const { title, body, icon, image } = payload.notification || {};
    const { type, senderId, senderName, chatId } = payload.data || {};

    const notificationTitle = title || 'New Message';
    const notificationOptions = {
      body: body || 'You have a new message',
      icon: icon || '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      image: image,
      tag: `chat-${chatId || senderId}`,
      requireInteraction: true,
      data: {
        type,
        senderId,
        senderName,
        chatId,
        url: chatId ? `/chat/${chatId}` : `/chat`,
      },
      actions: [
        { action: 'open_chat', title: 'Open Chat' },
        { action: 'mark_read', title: 'Mark as Read' }
      ]
    };

    console.log("🔹 Showing notification:", notificationTitle, notificationOptions);
    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn("⚠️ Messaging not initialized in Service Worker");
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);
  event.notification.close();

  const { action, notification } = event;
  const { type, chatId, senderId, url } = notification.data || {};

  if (action === 'mark_read') {
    console.log("🔹 Mark as Read clicked for chat:", chatId, "sender:", senderId);
    fetch('/api/messages/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, senderId })
    }).then(() => console.log("✅ Mark as read request sent"))
      .catch(err => console.error("❌ Error in mark-read fetch:", err));
    return;
  }

  const targetUrl = url || '/chat';
  console.log("🔹 Opening/focusing window at:", targetUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            console.log("✅ Focusing existing client:", client.url);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          console.log("✅ Opening new client window at:", targetUrl);
          return clients.openWindow(targetUrl);
        }
      })
  );
});