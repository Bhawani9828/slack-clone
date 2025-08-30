// components/UserAvatar.tsx - WhatsApp Style Online Status
'use client';

import { Avatar, Badge, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { formatLastSeen } from '@/lib/utils';

interface Props {
  userId: string;
  name: string;
  imageUrl?: string;
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
  size?: 'small' | 'medium' | 'large';
  lastSeen?: string;
  isOnline?: boolean;
}

const UserAvatar = ({
  userId,
  name,
  imageUrl,
  showOnlineStatus = true,
  showLastSeen = false,
  size = 'medium',
  lastSeen,
}: Props) => {

  // Get online status from Redux
  const onlineUsers = useSelector((state: RootState) => state.chat.onlineUsers || []);
  const chatUsers = useSelector((state: RootState) => state.user.chatusers || []);
  
  // Check if user is currently online
  const isCurrentlyOnline = onlineUsers.includes(userId);
  
  // Get user data for lastSeen
  const user = chatUsers.find(u => u.id === userId);
  const userLastSeen = (user as any)?.lastSeen || lastSeen;
  
  // Format last seen with online status
  const lastSeenInfo = formatLastSeen(userLastSeen, isCurrentlyOnline);

  const getAvatarSize = () => {
    switch (size) {
      case 'small': return { width: 32, height: 32, fontSize: 12 };
      case 'medium': return { width: 40, height: 40, fontSize: 14 };
      case 'large': return { width: 60, height: 60, fontSize: 16 };
      default: return { width: 40, height: 40, fontSize: 14 };
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small': return { height: '8px', minWidth: '8px' };
      case 'medium': return { height: '10px', minWidth: '10px' };
      case 'large': return { height: '12px', minWidth: '12px' };
      default: return { height: '10px', minWidth: '10px' };
    }
  };

  const avatarSize = getAvatarSize();
  const badgeSize = getBadgeSize();

  return (
    <div className="flex flex-col items-center">
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        variant="dot"
        color={lastSeenInfo.isOnline ? 'success' : 'default'}
        invisible={!showOnlineStatus}
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: lastSeenInfo.isOnline ? '#44b700' : 'transparent',
            color: lastSeenInfo.isOnline ? '#44b700' : 'transparent',
            boxShadow: lastSeenInfo.isOnline ? `0 0 0 2px white` : 'none',
            borderRadius: '50%',
            ...badgeSize,
          },
        }}
      >
        <Avatar
          alt={name}
          src={imageUrl}
          sx={{ ...avatarSize, transition: 'all 0.2s ease-in-out' }}
        >
          {name?.[0]?.toUpperCase()}
        </Avatar>
      </Badge>

      {/* WhatsApp style last seen text */}
   
    </div>
  );
};

export default UserAvatar;