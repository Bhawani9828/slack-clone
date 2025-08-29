// lib/firebaseClient.ts - COMPLETE FIXED VERSION
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getMessaging, 
  Messaging, 
  getToken, 
  onMessage, 
  isSupported,
  MessagePayload 
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
export const app: FirebaseApp = initializeApp(firebaseConfig);
let messaging: Messaging | null = null;

// Service Worker Registration
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined') return null;
  
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('✅ Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};

// Get Messaging Instance
export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;
  
  if (!messaging) {
    try {
      const supported = await isSupported();
      if (supported) {
        messaging = getMessaging(app);
        
        // Service worker registration
        await registerServiceWorker();
        
        console.log("✅ Messaging initialized successfully");
      } else {
        console.warn("⚠️ FCM not supported in this browser");
        return null;
      }
    } catch (error) {
      console.error("❌ Error initializing messaging:", error);
      return null;
    }
  }
  
  return messaging;
};

// Check FCM Support
export const isFcmSupported = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  
  try {
    const supported = await isSupported();
    console.log('✅ FCM support check:', supported);
    return supported;
  } catch (error) {
    console.error('❌ Error checking FCM support:', error);
    return false;
  }
};

// Get FCM Token
export const getFcmToken = async (): Promise<string | null> => {
  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) {
      console.log('❌ Messaging not available');
      return null;
    }

    // Check current permission
    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
      console.log('📋 Notification permission requested:', permission);
    } else {
      console.log('📋 Notification permission:', permission);
    }
    
    if (permission !== 'granted') {
      console.log('❌ Notification permission not granted');
      return null;
    }
    
    // Get token with service worker scope
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.ready
    });
    
    if (token) {
      console.log("🎯 FCM Token obtained successfully");
      return token;
    } else {
      console.log('❌ No registration token available');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

// Foreground Message Listener
export const onForegroundMessage = async (
  callback: (payload: MessagePayload) => void
): Promise<(() => void) | null> => {
  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) {
      console.log('❌ Cannot setup foreground listener - messaging not available');
      return null;
    }
    
    console.log('🔊 Setting up foreground message listener');
    
    const unsubscribe = onMessage(messagingInstance, (payload) => {
      console.log('📨 Foreground message received:', {
        notification: payload.notification,
        data: payload.data,
        from: payload.from,
        messageId: payload.messageId
      });
      
      callback(payload);
    });
    
    console.log('✅ Foreground message listener setup complete');
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up foreground listener:', error);
    return null;
  }
};

// Background message handler (for service worker)
export const onBackgroundMessage = (callback: (payload: any) => void): void => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'FCM_MESSAGE') {
        console.log('📨 Background message received in service worker:', event.data);
        callback(event.data.payload);
      }
    });
  }
};