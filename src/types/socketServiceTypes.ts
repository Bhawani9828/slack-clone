export interface DeleteOptions {
   isGroupChat?: boolean;
  groupId?: string;
  hard?: boolean;
  deletedAt?: number;
  reason?: string;
}

export interface UserStatusData {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
  // Extended to include all status types used in the application
  type?: 'connect' | 'disconnect' | 'heartbeat' | 'online' | 'offline' | 'status_response' | 'away' | 'busy';
}

export interface ChatGatewayEvents {
  // Message events
  'message:sent': (data: any) => void;
  'message:received': (data: any) => void;
  'message:delivered': (data: any) => void;
  'message:read': (data: any) => void;
  'message:deleted': (data: any) => void;
  'message:edited': (data: any) => void;
  'message:favorited': (data: any) => void;
  'message:forwarded': (data: any) => void;
  'message:copied': (data: any) => void;
  
  // Chat events
  'chat:joined': (data: any) => void;
  'chat:left': (data: any) => void;
  'chat:created': (data: any) => void;
  'chat:updated': (data: any) => void;
  'chat:deleted': (data: any) => void;
  
  // User events
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'user:typing': (data: any) => void;
  'user:stopped_typing': (data: any) => void;
  
  // Call events
  'call:incoming': (data: any) => void;
  'call:accepted': (data: any) => void;
  'call:rejected': (data: any) => void;
  'call:ended': (data: any) => void;
  'call:ice_candidate': (data: any) => void;
  
  // Group events
  'group:member_added': (data: any) => void;
  'group:member_removed': (data: any) => void;
  'group:admin_changed': (data: any) => void;
  'group:settings_updated': (data: any) => void;
  
  // Notification events
  'notification:new': (data: any) => void;
  'notification:read': (data: any) => void;
  
  // System events
  'system:maintenance': (data: any) => void;
  'system:update': (data: any) => void;
  'error': (error: any) => void;
}