// app/fcm-test/page.tsx - Test page for FCM Token
'use client';

import { FCMTokenDebug } from '@/components/FCMTokenDebug';
import { Toaster } from 'react-hot-toast';

export default function FCMTestPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f5f5',
      padding: '20px'
    }}>
      <FCMTokenDebug />
      <Toaster />
      
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '120px'
      }}>
        <h1>🔥 FCM Token Test Page</h1>
        <p>This page will help you get and debug your FCM token.</p>
        
        <h2>Steps:</h2>
        <ol>
          <li>Click "Get FCM Token" button in the debug panel</li>
          <li>Grant notification permission when prompted</li>
          <li>Check the browser console for detailed logs</li>
          <li>The token will be displayed and copied to clipboard</li>
        </ol>
        
        <h2>Environment Variables Needed:</h2>
        <ul>
          <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
          <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
          <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
          <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
          <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
          <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
          <li>NEXT_PUBLIC_FIREBASE_VAPID_KEY</li>
        </ul>
        
        <h2>Requirements:</h2>
        <ul>
          <li>HTTPS (required for service workers)</li>
          <li>Modern browser with service worker support</li>
          <li>firebase-messaging-sw.js in public folder</li>
        </ul>
      </div>
    </div>
  );
}