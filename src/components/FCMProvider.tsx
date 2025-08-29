// components/FCMProvider.tsx
'use client';

import { useEffect, ReactNode } from 'react';
import { useFcm } from '@/hooks/useFcm';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

interface FCMProviderProps {
  children?: ReactNode; // accept optional children
}

export const FCMProvider = ({ children }: FCMProviderProps) => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const { ready, error, supported } = useFcm(currentUser?._id);

  useEffect(() => {
    console.log('📊 FCM Status:', { 
      ready, 
      supported, 
      error: error?.substring(0, 50),
      userId: currentUser?._id ? 'present' : 'missing'
    });
  }, [ready, supported, error, currentUser?._id]);

  return <>{children}</>; // render the children
};
