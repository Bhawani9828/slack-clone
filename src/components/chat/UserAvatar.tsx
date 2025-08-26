// components/UserAvatar.tsx
import { Avatar, Badge } from '@mui/material';
import { useIsUserOnline } from '@/hooks/useIsUserOnline';

interface Props {
  userId: string;
  name: string;
  imageUrl?: string;
  showTypingIndicator?: boolean;
  showOnlineStatus?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const UserAvatar = ({ 
  userId = '', 
  name, 
  imageUrl, 
  showTypingIndicator = false,
  showOnlineStatus = true,
  size = 'medium'
}: Props) => {
  const isOnline = useIsUserOnline(userId);

  // Responsive sizes
  const getAvatarSize = () => {
    switch (size) {
      case 'small':
        return { width: 32, height: 32, fontSize: 12 };
      case 'medium':
        return { width: 40, height: 40, fontSize: 14 };
      case 'large':
        return { width: 60, height: 60, fontSize: 16 };
      default:
        return { width: 40, height: 40, fontSize: 14 };
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return { height: '8px', minWidth: '8px' };
      case 'medium':
        return { height: '10px', minWidth: '10px' };
      case 'large':
        return { height: '12px', minWidth: '12px' };
      default:
        return { height: '10px', minWidth: '10px' };
    }
  };

  console.log(`👤 UserAvatar for ${name} (${userId}):`, {
    isOnline,
    showTypingIndicator,
    showOnlineStatus,
    size
  });

  const avatarSize = getAvatarSize();
  const badgeSize = getBadgeSize();

  return (
    <div className="flex flex-col items-center">
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        variant="dot"
        color={isOnline ? 'success' : 'default'}
        invisible={!showOnlineStatus}
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: isOnline ? '#44b700' : '#888',
            color: isOnline ? '#44b700' : '#888',
            boxShadow: `0 0 0 2px white`,
            borderRadius: '50%',
            ...badgeSize,
          },
        }}
      >
        <Avatar
          alt={name}
          src={imageUrl}
          sx={{
            ...avatarSize,
            transition: 'all 0.2s ease-in-out', // Smooth transitions
          }}
        >
          {name?.[0]?.toUpperCase()}
        </Avatar>
      </Badge>
    </div>
  );
};

export default UserAvatar;