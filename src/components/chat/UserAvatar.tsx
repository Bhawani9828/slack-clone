// components/UserAvatar.tsx
import { Avatar, Badge } from '@mui/material';
import { useIsUserOnline } from '@/hooks/useIsUserOnline';


interface Props {
  userId: string;
  name: string;
  imageUrl?: string;
  showTypingIndicator?: boolean;
  showOnlineStatus?: boolean;
}

const UserAvatar = ({ 
  userId, 
  name, 
  imageUrl, 
  showTypingIndicator = false,
  showOnlineStatus = true 
}: Props) => {
  const isOnline = useIsUserOnline(userId);
 

  console.log(`👤 UserAvatar for ${name} (${userId}):`, {
    isOnline,
    
    showTypingIndicator,
    showOnlineStatus
  });

  return (
    <div className="flex flex-col items-center">
      <Badge
        overlap="circular"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        variant="dot"
        color={isOnline ? 'success' : 'default'}
        invisible={!showOnlineStatus} // Hide badge if showOnlineStatus is false
        sx={{
          '& .MuiBadge-badge': {
            backgroundColor: isOnline ? '#44b700' : '#888',
            color: isOnline ? '#44b700' : '#888',
            boxShadow: `0 0 0 2px white`,
            borderRadius: '50%',
            height: '10px',
            minWidth: '10px',
          },
        }}
      >
        <Avatar
          alt={name}
          src={imageUrl} // this must be a valid URL
          sx={{ width: 60, height: 60, fontSize: 16 }}
        >
          {name?.[0]?.toUpperCase()}
        </Avatar>
      </Badge>

      

   
    </div>
  );
};

export default UserAvatar;