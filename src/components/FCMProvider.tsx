'use client';

import { ReactNode, useEffect } from 'react';
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
  const { ready, error, supported, token } = useFcm(currentUser?._id);
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  // Log FCM status
  useEffect(() => {
    console.log('📊 FCM Status:', { 
      ready, 
      supported, 
      error: error?.substring(0, 50),
      userId: currentUser?._id ? 'present' : 'missing',
      token: token ? 'generated' : 'missing'
    });
  }, [ready, supported, error, token, currentUser?._id]);

  // Handle service worker messages for navigation and notifications
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('📨 SW message received:', event.data);

      const data = event.data;

      // Navigate to chat or URL
      if (data?.type === 'NAVIGATE_TO_CHAT') {
        const { chatId, url } = data;

        if (chatId) {
          console.log('Navigating to chat:', chatId);
          router.push(`/chat/${chatId}`);
        } else if (url) {
          console.log('Navigating to URL:', url);
          window.location.href = url;
        }
      }

      // Show snackbar for general notifications
      if (data?.type === 'SHOW_NOTIFICATION') {
        const { title, message } = data;
        showSnackbar({
          title: title || 'Notification',
          message: message || 'You have a new message',
         severity: "info",
  duration: 6000,
        });
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [router, showSnackbar]);

  return <>{children}</>;
};
