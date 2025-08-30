'use client';

import { useEffect, ReactNode } from 'react';
import { useFcm } from '@/hooks/useFcm';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useRouter } from 'next/navigation';

interface FCMProviderProps {
  children?: ReactNode; // optional children
}

export const FCMProvider = ({ children }: FCMProviderProps) => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { ready, error, supported } = useFcm(currentUser?._id);
  const router = useRouter();

  // Log FCM status
  useEffect(() => {
    console.log('📊 FCM Status:', { 
      ready, 
      supported, 
      error: error?.substring(0, 50),
      userId: currentUser?._id ? 'present' : 'missing'
    });
  }, [ready, supported, error, currentUser?._id]);

  // Navigation handler from service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('Received SW message:', event.data);

      if (event.data?.type === 'NAVIGATE_TO_CHAT') {
        const { chatId, url } = event.data;

        if (chatId) {
          console.log('Navigating to chat:', chatId);
          router.push(`/chat/${chatId}`);
        } else if (url) {
          console.log('Navigating to URL:', url);
          window.location.href = url;
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [router]);

  return <>{children}</>;
};
