// hooks/useIsUserOnline.ts
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useMemo } from 'react';

export const useIsUserOnline = (userId: string): boolean => {
  const onlineUsers = useSelector((state: RootState) => state.chat.onlineUsers);
  
  const isOnline = useMemo(() => {
    const online = onlineUsers.includes(userId);
    console.log(`🔍 Checking online status for ${userId}:`, {
      online,
      onlineUsers,
      totalOnline: onlineUsers.length
    });
    return online;
  }, [onlineUsers, userId]);

  return isOnline;
};

export const useOnlineUsers = (): string[] => {
  return useSelector((state: RootState) => {
    console.log('👥 All online users:', state.chat.onlineUsers);
    return state.chat.onlineUsers;
  });
};

export const useOnlineUsersCount = (): number => {
  return useSelector((state: RootState) => state.chat.onlineUsers.length);
};