// hooks/useFcm.ts - Fixed FCM Hook
import { useEffect, useState, useCallback } from 'react';
import { getFcmToken, onForegroundMessage, isFcmSupported } from '@/lib/firebaseClient';
import { toast } from 'react-hot-toast';

interface FCMData {
  type?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  chatId?: string;
  callType?: string;
}

interface FCMPayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: FCMData;
}

export const useFcm = (currentUserId?: string) => {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [isClient, setIsClient] = useState(false);
const [userIdLoaded, setUserIdLoaded] = useState(false);
  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    setSupported(isFcmSupported());
    
  }, []);

  useEffect(() => {
  if (currentUserId) {
    setUserIdLoaded(true);
  }
}, [currentUserId]);

  // Register token with backend - FIXED: Added proper error handling and logging
  const registerToken = useCallback(async (fcmToken: string): Promise<boolean> => {
     console.log('🟡 registerToken called with:', {
    isClient,
    hasCurrentUserId: !!currentUserId,
    hasFcmToken: !!fcmToken,
    fcmTokenLength: fcmToken?.length
  });
    if (!isClient || !currentUserId || !fcmToken) {
      console.log('❌ Missing required parameters for registerToken:', {
        isClient, currentUserId, hasToken: !!fcmToken
      });
      return false;
    }

    try {
      // Dynamic import to avoid SSR issues
      const { default: Cookies } = await import('js-cookie');
      
      const authToken = Cookies.get('auth_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        console.error('❌ API URL not configured');
        return false;
      }

      if (!authToken) {
        console.error('❌ No auth token found');
        return false;
      }

      console.log('🔹 Registering FCM token with backend...', {
        token: fcmToken.substring(0, 20) + '...',
        userId: currentUserId,
        apiUrl
      });

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

      console.log('🔹 Registration response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ FCM token registered with backend:', responseData);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to register token:', response.status, errorText);
        return false;
      }
    } catch (err) {
      console.error('❌ Error registering token:', err);
      return false;
    }
  }, [isClient, currentUserId]);

  // Show notification toast
  const showNotification = useCallback((payload: FCMPayload) => {
    if (!isClient) return;

    const { notification, data } = payload;
    const { type, senderName, senderAvatar, chatId } = data || {};

    const title = notification?.title || senderName || 'New Message';
    const body = notification?.body || 'You have a new message';

    if (type === 'message') {
      toast.custom((t) => (
        <div
          className={`flex items-center p-4 bg-white rounded-lg shadow-lg border transition-all duration-300 ${
            t.visible ? 'animate-enter' : 'animate-leave'
          }`}
          style={{ maxWidth: '400px' }}
        >
          <img
            src={senderAvatar || '/default-avatar.png'}
            alt={senderName || 'User'}
            className="w-10 h-10 rounded-full mr-3 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-avatar.png';
            }}
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900 text-sm">{title}</p>
            <p className="text-gray-600 text-xs mt-1">{body}</p>
          </div>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              if (chatId) {
                window.location.href = `/chat/${chatId}`;
              }
            }}
            className="ml-3 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            View
          </button>
        </div>
      ), {
        duration: 5000,
        position: 'top-right',
      });
    } else {
      // Simple toast for other types
      toast(body, {
        icon: type === 'call' ? '📞' : '💬',
        duration: type === 'call' ? 10000 : 4000,
        position: 'top-right',
      });
    }

    // Play notification sound
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        console.log('🔇 Could not play notification sound (user interaction required)');
      });
    } catch (err) {
      console.log('🔇 Audio not available');
    }
  }, [isClient]);

  // Initialize FCM - FIXED: Added better error handling and token registration
  useEffect(() => {
     console.log('🟡 FCM useEffect triggered', {
    isClient,
    currentUserId,
    supported
  });
    if (!isClient || !currentUserId) {
      console.log('⏳ Waiting for client initialization or user ID');
      return;
    }

    if (!supported) {
      setError('FCM not supported in this browser');
      console.log('❌ FCM not supported');
      return;
    }

    let isMounted = true;

    const initializeFCM = async () => {
      try {
        setError(null);
        console.log('🔹 Initializing FCM...');

        // Check notification permission
        if (Notification.permission === 'default') {
          console.log('🔹 Requesting notification permission...');
          const permission = await Notification.requestPermission();
          console.log('🔹 Notification permission:', permission);
          
          if (permission !== 'granted') {
            setError('Notification permission denied');
            console.log('❌ Notification permission denied');
            return;
          }
        }

        if (Notification.permission !== 'granted') {
          setError('Notification permission required');
          console.log('❌ Notification permission not granted');
          return;
        }

        // Get FCM token
        console.log('🔹 Getting FCM token...');
        const fcmToken = await getFcmToken();
        
        if (!isMounted) return;

        if (!fcmToken) {
          setError('Failed to get FCM token');
          console.log('❌ Failed to get FCM token');
          return;
        }

        console.log('✅ FCM Token obtained:', fcmToken.substring(0, 20) + '...');
        setToken(fcmToken);

        // Register with backend - FIXED: This is where registerToken should be called
        console.log('🔹 Registering token with backend...');
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

  // Setup foreground message listener
  useEffect(() => {
    if (!ready || !isClient) {
      return;
    }

    console.log('🔹 Setting up foreground message listener...');
    const unsubscribe = onForegroundMessage(showNotification);

    return () => {
      console.log('🔹 Cleaning up foreground message listener');
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [ready, isClient, showNotification]);

  // Refresh token on visibility change
  useEffect(() => {
    if (!ready || !isClient) {
      return;
    }

    const handleVisibilityChange = async () => {
      if (!document.hidden && currentUserId) {
        try {
          const newToken = await getFcmToken();
          if (newToken && newToken !== token) {
            console.log('🔄 Token refreshed');
            setToken(newToken);
            await registerToken(newToken);
          }
        } catch (err) {
          console.error('❌ Token refresh failed:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ready, isClient, currentUserId, token, registerToken]);

  return { 
    ready, 
    token, 
    error, 
    supported,
    registerToken // Exposing for manual registration if needed
  };
}; 