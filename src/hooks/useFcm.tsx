// hooks/useFcm.ts - FIXED VERSION
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
  const initializationRef = useRef<boolean>(false);
  const tokenRegistrationRef = useRef<boolean>(false);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
    const checkSupport = async () => {
      const isSupported = await isFcmSupported();
      setSupported(isSupported);
      console.log('🔍 FCM Support check:', isSupported);
    };
    checkSupport();
  }, []);

  // Register token with backend - Fixed with proper error handling
  const registerToken = useCallback(async (fcmToken: string): Promise<boolean> => {
    if (!isClient || !currentUserId || !fcmToken) {
      console.log('❌ Missing parameters for token registration:', {
        isClient, hasUserId: !!currentUserId, hasToken: !!fcmToken
      });
      return false;
    }

    // Avoid duplicate registrations
    if (tokenRegistrationRef.current) {
      console.log('⏳ Token registration already in progress');
      return true;
    }

    try {
      tokenRegistrationRef.current = true;
      
      // Dynamic import to avoid SSR issues
      const { default: Cookies } = await import('js-cookie');
      
      const authToken = Cookies.get('auth_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      if (!authToken) {
        throw new Error('No authentication token found');
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
    } finally {
      tokenRegistrationRef.current = false;
    }
  }, [isClient, currentUserId]);

  // Show notification toast
  const showNotification = useCallback((payload: FCMPayload) => {
    if (!isClient) return;

    const { notification, data } = payload;
    const { type, senderName, senderAvatar, chatId } = data || {};

    const title = notification?.title || senderName || 'New Message';
    const body = notification?.body || 'You have a new message';

    console.log('🔔 Showing notification:', { title, body, type });

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
        console.log('🔇 Could not play notification sound');
      });
    } catch (err) {
      console.log('🔇 Audio not available');
    }
  }, [isClient]);

  // Initialize FCM - PROPERLY SEPARATED
  useEffect(() => {
    if (!isClient || !currentUserId || !supported) {
      console.log('⏸️ FCM initialization skipped:', { 
        isClient, hasUserId: !!currentUserId, supported 
      });
      return;
    }

    // Avoid duplicate initialization
    if (initializationRef.current) {
      console.log('⏸️ FCM already initialized');
      return;
    }

    let isMounted = true;

    const initializeFCM = async () => {
      try {
        console.log('🚀 Starting FCM initialization...');
        initializationRef.current = true;
        setError(null);

        // Wait for app to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!isMounted) return;

        // Check notification permission
        if (Notification.permission === 'default') {
          console.log('📋 Requesting notification permission...');
          const permission = await Notification.requestPermission();
          
          if (!isMounted) return;
          
          if (permission !== 'granted') {
            setError('Notification permission denied');
            console.log('❌ Notification permission denied');
            return;
          }
        }

        if (Notification.permission !== 'granted') {
          setError('Notification permission required');
          console.log('❌ Notification permission required');
          return;
        }

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

    // Start initialization
    initializeFCM();

    return () => {
      isMounted = false;
    };
  }, [isClient, currentUserId, supported, registerToken]);

  // Setup foreground message listener - FIXED ASYNC HANDLING
  useEffect(() => {
    if (!ready || !isClient) {
      console.log('⏸️ Foreground listener setup skipped:', { ready, isClient });
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const setupMessageListener = async () => {
      try {
        console.log('🔊 Setting up FCM foreground message listener...');
        
        // ✅ FIXED: Properly handle the Promise
        const unsubscribeFunction = await onForegroundMessage((payload) => {
          console.log('📨 FCM foreground message received:', payload);
          console.log('📨 Notification data:', payload.notification);
          console.log('📨 Custom data:', payload.data);
          
          // Only show notification if app is in foreground and visible
          if (!document.hidden && isMounted) {
            showNotification(payload);
          } else {
            console.log('📱 App is hidden, skipping foreground notification');
          }
        });

        if (unsubscribeFunction && isMounted) {
          unsubscribe = unsubscribeFunction;
          console.log('✅ FCM foreground listener setup complete');
        }
      } catch (err) {
        console.error('❌ Error setting up FCM foreground listener:', err);
      }
    };

    setupMessageListener();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        console.log('🔄 Cleaning up FCM foreground listener');
        unsubscribe();
      }
    };
  }, [ready, isClient, showNotification]);

  // Token refresh on visibility change
  useEffect(() => {
    if (!ready || !isClient || !currentUserId) {
      return;
    }

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          // Refresh token when app becomes visible
          console.log('👁️ App became visible, checking token...');
          const newToken = await getFcmToken();
          if (newToken && newToken !== token) {
            console.log('🔄 Refreshing FCM token');
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

  // Reset when user changes
  useEffect(() => {
    console.log('👤 User changed, resetting FCM state');
    setReady(false);
    setToken(null);
    setError(null);
    initializationRef.current = false;
    tokenRegistrationRef.current = false;
  }, [currentUserId]);

  return { 
    ready, 
    token, 
    error, 
    supported,
    registerToken,
    isInitialized: initializationRef.current,
    // Debug info
    debugInfo: {
      isClient,
      hasUser: !!currentUserId,
      notificationPermission: typeof window !== 'undefined' ? Notification.permission : 'unknown'
    }
  };
};