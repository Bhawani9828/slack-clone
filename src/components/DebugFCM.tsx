// components/DebugFCM.tsx - FIXED VERSION
'use client';

import { useState } from 'react';
import { useFcm } from '@/hooks/useFcm';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import Cookies from "js-cookie";
// Type definitions for ServiceWorkerRegistration with sync
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
}

export const DebugFCM = () => {
  // FIXED: Correct Redux selector - user object directly from state
  const user = useSelector((state: RootState) => state.user.currentUser);
  const { ready, token, error, supported } = useFcm(user?._id);
  const [isVisible, setIsVisible] = useState(true);

  const testNotification = async () => {
    if (!user?._id) {
      alert('No user logged in');
      return;
    }
    
    try {
      const token = Cookies.get('auth_token');
      if (!token) {
        alert('No auth token found');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/test-fcm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log('Test result:', data);
      alert(`Test notification: ${data.success ? 'SUCCESS' : 'FAILED'}\n${data.message}`);
    } catch (error: any) {
      console.error('Test failed:', error);
      alert('Test failed: ' + error.message);
    }
  };

  const triggerBackgroundSync = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Type assertion for sync
        const syncRegistration = registration as ServiceWorkerRegistrationWithSync;
        
        if (syncRegistration.sync) {
          await syncRegistration.sync.register('test-sync');
          alert('Background sync triggered successfully');
        } else {
          alert('Background Sync API not supported in this browser');
        }
      } catch (syncError: any) {
        console.error('Background sync failed:', syncError);
        alert('Background sync failed: ' + syncError.message);
      }
    } else {
      alert('Service Workers not supported in this browser');
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded-full shadow-lg z-50"
      >
        🔧
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border text-xs max-w-xs z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">FCM Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 mb-3">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={ready ? 'text-green-600 font-bold' : 'text-red-600'}>
            {ready ? '✅ Ready' : '❌ Not ready'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Supported:</span>
          <span>{supported ? '✅ Yes' : '❌ No'}</span>
        </div>
        
        <div className="flex justify-between">
          <span>User:</span>
          <span>{user?._id ? '✅ Logged in' : '❌ No user'}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Permission:</span>
          <span>{typeof window !== 'undefined' ? Notification.permission : 'unknown'}</span>
        </div>
        
        {error && (
          <div className="text-red-500 text-xs">
            Error: {error.substring(0, 50)}...
          </div>
        )}
      </div>

      {token && (
        <div className="mb-3 p-2 bg-gray-100 rounded text-xs break-all">
          <div className="font-semibold mb-1">Token:</div>
          <div className="text-xs opacity-75">{token.substring(0, 25)}...</div>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={testNotification}
          className="w-full bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
          disabled={!ready || !user?._id}
        >
          Test Notification
        </button>

        <button
          onClick={triggerBackgroundSync}
          className="w-full bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
        >
          Trigger Sync
        </button>

        <button
          onClick={() => {
            if (typeof window !== 'undefined' && 'Notification' in window) {
              Notification.requestPermission().then(perm => {
                alert(`Notification permission: ${perm}`);
              });
            }
          }}
          className="w-full bg-yellow-500 text-white px-3 py-1 rounded text-xs hover:bg-yellow-600"
        >
          Request Permission
        </button>
      </div>
    </div>
  );
};