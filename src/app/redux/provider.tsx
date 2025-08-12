// src/app/providers.tsx
'use client';

import { AppStore, makeStore } from '@/lib/store';
import { useRef } from 'react';
import { Provider } from 'react-redux';


export function Providers({ children }: { children: React.ReactNode }) {
  // Initialize the store reference with null and type it as AppStore | null
  const storeRef = useRef<AppStore | null>(null);
  
  // Only create the store once
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  // Type guard to ensure store exists
  if (!storeRef.current) {
    throw new Error('Store initialization failed');
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}