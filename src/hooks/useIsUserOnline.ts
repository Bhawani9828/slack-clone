// hooks/useIsUserOnline.ts
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

export const useIsUserOnline = (userId: string): boolean => {
  return useSelector((state: RootState) =>
    state.chat.onlineUsers.includes(userId)
  );
};
