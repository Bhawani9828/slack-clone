// lib/firebaseClient.ts - SIMPLIFIED WITH TYPES
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app: FirebaseApp = initializeApp(firebaseConfig);
let messaging: Messaging | null = null;

try {
  messaging = getMessaging(app);
} catch (error) {
  console.warn('Firebase messaging initialization failed:', error);
}

export const isFcmSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  
  console.log('FCM basic support check passed');
  return true;
};

export const getFcmToken = async (): Promise<string | null> => {
  if (!messaging) {
    console.log('Messaging not available');
    return null;
  }
  
  try {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const onForegroundMessage = (callback: (payload: any) => void): (() => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};