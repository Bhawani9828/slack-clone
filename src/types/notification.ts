// types/notification.ts - Notification Types
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  click_action?: string;
  data?: Record<string, any>;
}

export interface FcmTokenData {
  token: string;
  platform: 'web' | 'android' | 'ios';
  userId: string;
  deviceId?: string;
}

export interface MessageNotification {
  type: 'message';
  senderId: string;
  senderName: string;
  content: string;
  chatId: string;
  messageId: string;
  timestamp: string;
}

export interface CallNotification {
  type: 'call';
  callerId: string;
  callerName: string;
  callType: 'video' | 'audio';
  callId: string;
}