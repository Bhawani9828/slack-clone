import { useEffect, useState } from 'react';
import { getFcmToken, onForegroundMessage } from '@/lib/firebaseClient';

export const useFcm = (currentUserId?: string) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;

    (async () => {
      if (Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
      const token = await getFcmToken();
      if (token) {
        // send to backend
        await fetch('/api/me/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform: 'web' }),
          credentials: 'include',
        });
        setReady(true);
      }
    })();

    // Foreground messages (toast, sound, etc.)
    onForegroundMessage((payload) => {
      // e.g., show a toast or badge
      console.log('Foreground FCM:', payload);
    });
  }, [currentUserId]);

  return { ready };
};
