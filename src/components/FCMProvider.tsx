// components/FCMProvider.tsx - REDUX VERSION
'use client';

import { useEffect, useState } from 'react';
import { useFcm } from '@/hooks/useFcm';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

interface FCMProviderProps {
  children: React.ReactNode;
}

export const FCMProvider: React.FC<FCMProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { ready, error, supported } = useFcm(currentUser?._id);

  // Show error in development only
  useEffect(() => {
    if (error && process.env.NODE_ENV === 'development') {
      console.warn('FCM Error:', error);
    }
  }, [error]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '4px 8px',
            fontSize: '10px',
            backgroundColor: ready 
              ? '#10b981' 
              : !supported 
                ? '#f59e0b' 
                : error 
                  ? '#ef4444' 
                  : '#6b7280',
            color: 'white',
            borderRadius: '4px',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          FCM: {
            ready 
              ? 'Ready' 
              : !supported 
                ? 'Unsupported' 
                : error || 'Loading...'
          }
          {currentUser?._id && ` | User: ${currentUser._id.substring(0, 8)}...`}
        </div>
      )}
    </>
  );
};