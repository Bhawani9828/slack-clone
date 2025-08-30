'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { useFcm } from '@/hooks/useFcm';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useSnackbar } from '@/hooks/use-snackbar';

interface FCMProviderProps {
  children?: ReactNode;
}

export const FCMProvider = ({ children }: FCMProviderProps) => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { ready, error, supported } = useFcm(currentUser?._id);
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const listenerAttached = useRef(false); 

  // Log FCM status
  useEffect(() => {
    console.log('📊 FCM Status:', { 
      ready, 
      supported, 
      error: error?.substring(0, 50),
      userId: currentUser?._id ? 'present' : 'missing'
    });
  }, [currentUser, ready, supported, error]);

  // Attach service worker listener once
  useEffect(() => {
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('Received SW message:', event.data);

      // Show snackbar once
      if (event.data?.type === 'NEW_NOTIFICATION') {
        showSnackbar(event.data.message || 'You have a new notification');
      }

      // Navigation
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
      listenerAttached.current = false;
    };
  }, [router, showSnackbar]);

  return <>{children}</>;
};
