/* eslint-disable no-undef */
// Use compat in the SW context
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self?.env?.NEXT_PUBLIC_FIREBASE_API_KEY, // not available in SW; we inline constants below
  authDomain: "REPLACE",
  projectId: "REPLACE",
  storageBucket: "REPLACE",
  messagingSenderId: "REPLACE",
  appId: "REPLACE",
});

// Messaging instance
const messaging = firebase.messaging();

// Show background notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, click_action, tag } = payload?.notification || {};
  self.registration.showNotification(title || 'New message', {
    body: body,
    icon: icon || '/icon-192.png',
    data: { click_action, ...payload?.data },
    tag,
  });
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.click_action || '/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
