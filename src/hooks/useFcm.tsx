// hooks/useFcm.ts - COMPLETE FIXED VERSION
import { useEffect, useState, useCallback, useRef } from 'react';
import { getFcmToken, onForegroundMessage, isFcmSupported } from '@/lib/firebaseClient';
import { toast } from 'react-hot-toast';

interface FCMData {
  type?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  chatId?: string;
  callType?: string;
  title?: string;
  body?: string;
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
  const messageListenerRef = useRef<(() => void) | null>(null);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    console.log('🏠 Client detected');
  }, []);

  // Check FCM support
  useEffect(() => {
    if (!isClient) return;

    const checkSupport = async () => {
      try {
        const isFcmSupportedResult = await isFcmSupported();
        setSupported(isFcmSupportedResult);
        console.log('🔍 FCM Support:', isFcmSupportedResult);
      } catch (err) {
        console.error('❌ Error checking FCM support:', err);
        setSupported(false);
      }
    };

    checkSupport();
  }, [isClient]);

  // Register token with backend
  const registerToken = useCallback(async (fcmToken: string): Promise<boolean> => {
    if (!isClient || !currentUserId || !fcmToken) {
      console.log('❌ Missing parameters for token registration');
      return false;
    }

    try {
      const { default: Cookies } = await import('js-cookie');
      const authToken = Cookies.get('auth_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error('❌ API URL not configured');
        return false;
      }

      if (!authToken) {
        console.error('❌ No authentication token found');
        return false;
      }

      console.log('📤 Registering FCM token with backend...');

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
        console.log('✅ FCM token registered successfully:', responseData);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to register FCM token:', response.status, errorText);
        return false;
      }
    } catch (err) {
      console.error('❌ Error registering FCM token:', err);
      return false;
    }
  }, [isClient, currentUserId]);

  // Show notification
  const showNotification = useCallback((payload: FCMPayload) => {
    if (!isClient) return;

    console.log('🎯 Processing notification:', payload);

    const notification = payload.notification;
    const data = payload.data;
    
    const title = notification?.title || data?.title || 'New Message';
    const body = notification?.body || data?.body || 'You have a new message';
    const type = data?.type || 'message';

    console.log('🔔 Showing notification:', { title, body, type });

    // Show toast notification
    toast.custom((t) => (
      <div
        className={`flex items-center p-4 bg-white rounded-lg shadow-lg border transition-all duration-300 ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
        style={{ maxWidth: '400px' }}
      >
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
          <span className="text-white text-lg">
            {type === 'call' ? '📞' : '💬'}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">{title}</p>
          <p className="text-gray-600 text-xs mt-1">{body}</p>
        </div>
        {data?.chatId && (
          <button
            onClick={() => {
              toast.dismiss(t.id);
              window.location.href = `/chat/${data.chatId}`;
            }}
            className="ml-3 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            View
          </button>
        )}
      </div>
    ), {
      duration: type === 'call' ? 10000 : 5000,
      position: 'top-right',
    });

    // Play notification sound
    try {
      const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-3.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        console.log('🔇 Could not play notification sound');
      });
    } catch (err) {
      console.log('🔇 Audio not available');
    }
  }, [isClient]);

  // Initialize FCM
  useEffect(() => {
    if (!isClient || !currentUserId || !supported) {
      console.log('⏸️ FCM initialization skipped:', { 
        isClient, hasUserId: !!currentUserId, supported 
      });
      return;
    }

    let isMounted = true;

    const initializeFCM = async () => {
      try {
        console.log('🚀 Starting FCM initialization...');

        // Get FCM token
        console.log('🎯 Getting FCM token...');
        const fcmToken = await getFcmToken();
        
        if (!isMounted) return;

        if (!fcmToken) {
          setError('Failed to get FCM token');
          console.log('❌ Failed to get FCM token');
          return;
        }

        console.log('✅ FCM Token obtained successfully');
        setToken(fcmToken);

        // Register with backend
        console.log('📤 Registering token with backend...');
        const registered = await registerToken(fcmToken);
        
        if (!isMounted) return;

        if (registered) {
          setReady(true);
          console.log('✅ FCM fully initialized and ready');
        } else {
          setError('Failed to register token with backend');
          console.log('❌ Failed to register token with backend');
        }
      } catch (err) {
        console.error('❌ FCM initialization failed:', err);
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

  // Setup message listener
  useEffect(() => {
    if (!ready || !isClient) {
      console.log('⏸️ Message listener setup skipped:', { ready, isClient });
      return;
    }

    let isMounted = true;

    const setupMessageListener = async () => {
      try {
        console.log('🔊 Setting up FCM message listener...');
        
        const unsubscribe = await onForegroundMessage((payload) => {
          if (!isMounted) return;
          
          console.log('📨 FCM message received:', {
            notification: payload.notification,
            data: payload.data,
            messageId: payload.messageId
          });
          
          // Show notification only if app is visible
          if (!document.hidden) {
            showNotification(payload);
          } else {
            console.log('📱 App is hidden, notification will be shown by service worker');
          }
        });

        if (unsubscribe && isMounted) {
          messageListenerRef.current = unsubscribe;
          console.log('✅ FCM message listener setup complete');
        }
      } catch (err) {
        console.error('❌ Error setting up message listener:', err);
      }
    };

    setupMessageListener();

    return () => {
      isMounted = false;
      if (messageListenerRef.current) {
        console.log('🔄 Cleaning up message listener');
        messageListenerRef.current();
        messageListenerRef.current = null;
      }
    };
  }, [ready, isClient, showNotification]);

  return { 
    ready, 
    token, 
    error, 
    supported,
    registerToken 
  };
};