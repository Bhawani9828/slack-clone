// lib/firebaseClient.ts
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, getToken, onMessage,isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
export const app: FirebaseApp = initializeApp(firebaseConfig); // 👈 export kar diya
let messaging: Messaging | null = null;



// ✅ check karo supported hai ya nahi
export const getMessagingInstance = async (): Promise<Messaging | null> => {
  if (typeof window === 'undefined') return null;
  
  if (!messaging) {
    try {
      const supported = await isSupported();
      if (supported) {
        messaging = getMessaging(app);
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

export const getFcmToken = async (): Promise<string | null> => {
  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) {
      console.log('❌ Messaging not available');
      return null;
    }

    // Request permission first
    const permission = await Notification.requestPermission();
    console.log('📋 Notification permission:', permission);
    
    if (permission !== 'granted') {
      console.log('❌ Notification permission denied');
      return null;
    }
    
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    
    console.log("🎯 FCM Token obtained:", token);
    return token;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

export const onForegroundMessage = async (callback: (payload: any) => void): Promise<(() => void) | null> => {
  try {
    const messagingInstance = await getMessagingInstance();
    if (!messagingInstance) {
      console.log('❌ Cannot setup foreground listener - messaging not available');
      return null;
    }
    
    console.log('🔊 Setting up foreground message listener');
    const unsubscribe = onMessage(messagingInstance, (payload) => {
      console.log('📨 Foreground message received:', payload);
      callback(payload);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up foreground listener:', error);
    return null;
  }
};
