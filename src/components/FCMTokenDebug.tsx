// components/FCMTokenDebug.tsx
'use client';

import { useEffect, useState } from 'react';
import { isFcmSupported } from '@/lib/firebaseClient';

export const FCMTokenDebug = () => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupported(isFcmSupported());
      setPermission(Notification.permission);
    }
  }, []);

  const getFcmTokenWithRetry = async (maxRetries = 3): Promise<string | null> => {
    const { getFcmToken } = await import('@/lib/firebaseClient');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔹 Token attempt ${attempt}/${maxRetries}`);
      try {
        const token = await getFcmToken();
        if (token) return token;

        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err) {
        console.error(`❌ Attempt ${attempt} error:`, err);
        if (attempt === maxRetries) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    return null;
  };

  const manualServiceWorkerSetup = async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const r of registrations) {
        await r.unregister();
      }
      await new Promise(r => setTimeout(r, 1000));
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      return !!registration;
    } catch (err) {
      console.error('SW setup failed', err);
      return false;
    }
  };

  const requestPermissionAndGetToken = async () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);

    try {
      if (!isFcmSupported()) throw new Error('FCM not supported');

      let currentPermission = Notification.permission;
      if (currentPermission === 'default') {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);
      }
      if (currentPermission !== 'granted') throw new Error(`Notification permission ${currentPermission}`);

      const swReady = await manualServiceWorkerSetup();
      if (!swReady) throw new Error('Service worker setup failed');

      const fcmToken = await getFcmTokenWithRetry(3);
      if (!fcmToken) throw new Error('Failed to get FCM token');

      setToken(fcmToken);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fcmToken);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = async () => {
    if (token && navigator.clipboard) {
      await navigator.clipboard.writeText(token);
      alert('Token copied to clipboard!');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 9999, background: 'white', border: '2px solid #333', borderRadius: 8, padding: 16 }}>
      <h3>🔥 FCM Token Debug</h3>
      <div>📱 Supported: {supported ? '✅' : '❌'}</div>
      <div>🔔 Permission: {permission}</div>
      <button onClick={requestPermissionAndGetToken} disabled={loading}>
        {loading ? 'Getting Token...' : '🔄 Get FCM Token'}
      </button>

      {error && <div style={{ color: 'red' }}>❌ {error}</div>}

      {token && (
        <div>
          <div>✅ Token Retrieved!</div>
          <div style={{ wordBreak: 'break-all' }}>{token}</div>
          <button onClick={copyToken}>📋 Copy Token</button>
        </div>
      )}
    </div>
  );
};
