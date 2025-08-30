// hooks/useFcm.ts - COMPLETE FIX (Only background notifications)
import { useEffect, useState, useCallback, useRef } from 'react';
import { getFcmToken, isFcmSupported } from '@/lib/firebaseClient';

interface FCMData {
  type?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  chatId?: string;
  callType?: string;
  title?: string;
  body?: string;
  messageId?: string;
  notificationId?: string;
}

interface FCMPayload {
  notification?: {
    title?: string;
    body?: string;
    image?: string;
  };
  data?: FCMData;
  from?: string;
  messageId?: string;
}

export const useFcm = (currentUserId?: string) => {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    console.log('Client detected');
  }, []);

  // Check FCM support
  useEffect(() => {
    if (!isClient) return;

    const checkSupport = async () => {
      try {
        const isFcmSupportedResult = await isFcmSupported();
        setSupported(isFcmSupportedResult);
        console.log('FCM Support:', isFcmSupportedResult);
      } catch (err) {
        console.error('Error checking FCM support:', err);
        setSupported(false);
      }
    };

    checkSupport();
  }, [isClient]);

  // Register token with backend
  const registerToken = useCallback(async (fcmToken: string): Promise<boolean> => {
    if (!isClient || !currentUserId || !fcmToken) {
      console.log('Missing parameters for token registration');
      return false;
    }

    try {
      const { default: Cookies } = await import('js-cookie');
      const authToken = Cookies.get('auth_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error('API URL not configured');
        return false;
      }

      if (!authToken) {
        console.error('No authentication token found');
        return false;
      }

      console.log('Registering FCM token with backend...');

      const response = await fetch(`${apiUrl}/auth/fcm-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: fcmToken,
          platform: 'web',
          userId: currentUserId,
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('FCM token registered successfully:', responseData);
        return true;
      } else {
        const errorText = await response.text();
        console.error('Failed to register FCM token:', response.status, errorText);
        return false;
      }
    } catch (err) {
      console.error('Error registering FCM token:', err);
      return false;
    }
  }, [isClient, currentUserId]);

  // Initialize FCM (WITHOUT foreground message listener)
  useEffect(() => {
    if (!isClient || !currentUserId || !supported) {
      console.log('FCM initialization skipped:', { 
        isClient, hasUserId: !!currentUserId, supported 
      });
      return;
    }

    let isMounted = true;

    const initializeFCM = async () => {
      try {
        console.log('Starting FCM initialization...');

        // Get FCM token
        console.log('Getting FCM token...');
        const fcmToken = await getFcmToken();
        
        if (!isMounted) return;

        if (!fcmToken) {
          setError('Failed to get FCM token');
          console.log('Failed to get FCM token');
          return;
        }

        console.log('FCM Token obtained successfully');
        setToken(fcmToken);

        // Register with backend
        console.log('Registering token with backend...');
        const registered = await registerToken(fcmToken);
        
        if (!isMounted) return;

        if (registered) {
          setReady(true);
          console.log('FCM fully initialized and ready');
        } else {
          setError('Failed to register token with backend');
          console.log('Failed to register token with backend');
        }
      } catch (err) {
        console.error('FCM initialization failed:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'FCM initialization failed');
        }
      }
    };

    initializeFCM();

    return () => {
      isMounted = false;
    };
  }, [isClient, currentUserId, supported, registerToken]);

 

  return { 
    ready, 
    token, 
    error, 
    supported,
    registerToken 
  };
};