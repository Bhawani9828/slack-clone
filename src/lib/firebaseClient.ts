// src/lib/firebaseClient.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const getMessagingIfSupported = async (): Promise<Messaging | null> => {
  return (await isSupported()) ? getMessaging(app) : null;
};

// FCM: request token
export const getFcmToken = async (): Promise<string | null> => {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!,
    serviceWorkerRegistration: swReg,
  });
  return token || null;
};

// Foreground messages
export const onForegroundMessage = async (cb: (payload: any) => void) => {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  onMessage(messaging, cb);
};

// Phone Auth helpers
export const setupRecaptcha = (containerId: string) => {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible', // or 'normal'
  });
};
export const signInWithPhone = (phone: string, verifier: RecaptchaVerifier) => {
  return signInWithPhoneNumber(auth, phone, verifier);
};
